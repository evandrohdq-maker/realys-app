// Páginas no servidor: criar, seguir, postar com música, e "Publicar como" (curtir, comentar,
// responder e mandar depoimento como página). Página anônima nunca revela o dono.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-paginas-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body) {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error}`);
  return data;
}
const conta = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });

test('página: seguir, post com música, curtir e comentar como página, depoimentos de e para página', async () => {
  const ana = await conta('Ana Souza', '52998224725', 'anasouza');
  const edu = await conta('Eduardo Horveler', '11144477735', 'eduardo_ph');
  const A = ana.accessToken;
  const E = edu.accessToken;

  // Ana cria uma página assinada e uma anônima.
  const receitas = await call('POST', '/paginas', A, { name: 'Receitas da Vó Ana', about: 'Receitas de família', category: 'receitas' });
  assert.equal(receitas.handle, 'receitasdavoana');
  assert.equal(receitas.owner.id, ana.user.id);
  assert.equal(receitas.plano.paga, false, 'a primeira página é grátis');
  // A segunda custa R$ 14,90 por mês, do saldo: sem saldo, não cria.
  assert.equal((await call('GET', '/me/paginas/preco', A)).valor, 14.9);
  await assert.rejects(call('POST', '/paginas', A, { name: 'Achados PF', about: 'Achados e perdidos', anon: true }), /402/);
  app.wallet.move(ana.user.id, 'saldo', 5000, 'Depósito', 'teste');
  const anon = await call('POST', '/paginas', A, { name: 'Achados PF', about: 'Achados e perdidos', anon: true });
  assert.equal(anon.plano.paga, true);
  assert.equal(app.wallet.get(ana.user.id).balance, 5000 - 1490);
  assert.equal(anon.owner, null, 'página anônima não mostra o dono');
  await assert.rejects(call('POST', '/paginas', A, { name: 'Prefeitura Oficial', anon: true }), /400/);
  assert.equal((await call('GET', '/me/paginas', A)).length, 2);

  // Post da página com foto e música.
  const musica = { id: 't1', title: 'Canção', artist: 'Artista', url: 'https://api.realyz.com.br/media/md_musica.mp3', start: 12, len: 15 };
  const { id: postId } = await call('POST', `/paginas/${receitas.id}/posts`, A, { text: 'Cuca de uva', media: '/media/md_cuca', musica });
  await assert.rejects(call('POST', `/paginas/${receitas.id}/posts`, E, { text: 'invasão' }), /404/);

  // Eduardo ainda não segue: o post não aparece no feed dele, mas aparece na página.
  assert.ok(!(await call('GET', '/feed', E)).some((p) => p.id === postId));
  const daPagina = await call('GET', `/paginas/${receitas.id}/posts`, E);
  assert.equal(daPagina[0].author.name, 'Receitas da Vó Ana');
  assert.equal(daPagina[0].author.pagina, true);
  assert.equal(daPagina[0].musica.title, 'Canção');
  assert.equal(daPagina[0].seguindo, false);

  // Seguir: o post entra no feed com o botão "Seguindo".
  const seg = await call('POST', `/paginas/${receitas.id}/seguir`, E);
  assert.deepEqual(seg, { seguindo: true, seguidores: 1 });
  const feed = await call('GET', '/feed', E);
  const noFeed = feed.find((p) => p.id === postId);
  assert.ok(noFeed);
  assert.equal(noFeed.seguindo, true);
  // O post da página não aparece no perfil pessoal da Ana (não mistura, e nunca revela página anônima).
  assert.ok(!(await call('GET', `/users/${ana.user.id}`, E)).posts.some((p) => p.id === postId));

  // Eduardo posta; Ana curte como ela e como a página: duas curtidas.
  const post = await call('POST', '/posts', E, { text: 'Fiz a cuca da receita!' });
  await call('POST', `/posts/${post.id}/curtir`, A, {});
  const c2 = await call('POST', `/posts/${post.id}/curtir`, A, { comoPagina: receitas.id });
  assert.equal(c2.likes, 2);
  assert.deepEqual(c2.likedPaginas, [receitas.id]);
  // Não dá para usar a página de outra pessoa.
  await assert.rejects(call('POST', `/posts/${post.id}/curtir`, E, { comoPagina: receitas.id }), /403/);

  // Comentário como página (anônima) e resposta do Eduardo, que fica agrupada embaixo.
  const cm = await call('POST', `/posts/${post.id}/comentarios`, A, { text: 'Ficou linda!', comoPagina: anon.id });
  assert.equal(cm.author.name, 'Achados PF');
  assert.notEqual(cm.author.id, ana.user.id, 'comentário de página anônima não leva o id da dona');
  const resp = await call('POST', `/posts/${post.id}/comentarios`, E, { text: 'Obrigado', parentId: cm.id });
  const resp2 = await call('POST', `/posts/${post.id}/comentarios`, E, { text: 'De novo', parentId: resp.id });
  assert.equal(resp.parentId, cm.id);
  assert.equal(resp2.parentId, cm.id, 'resposta de resposta sobe para o comentário principal');
  // Curtir o comentário como pessoa e como página.
  await call('POST', `/comentarios/${cm.id}/curtir`, E, {});
  const lc = await call('POST', `/comentarios/${resp.id}/curtir`, A, { comoPagina: receitas.id });
  assert.equal(lc.actor, 'pg:' + receitas.id);
  const lista = await call('GET', `/posts/${post.id}/comentarios`, E);
  assert.equal(lista.find((c) => c.id === cm.id).likes, 1);
  assert.deepEqual(lista.find((c) => c.id === cm.id).likedBy, [edu.user.id]);
  assert.equal(lista.find((c) => c.id === cm.id).mine, false);
  assert.equal(lista.find((c) => c.id === resp.id).mine, true);

  // Depoimento da página para o Eduardo: chega com o nome da página.
  await call('POST', '/testimonials', A, { toId: edu.user.id, text: 'Ótimo cozinheiro, recomendo!', comoPagina: receitas.id });
  const pend = await call('GET', '/testimonials/pending', E);
  assert.equal(pend[0].fromName, 'Receitas da Vó Ana');
  assert.equal(pend[0].fromPagina, true);
  await call('POST', `/testimonials/${pend[0].id}/aceitar`, E);
  const perfilEdu = await call('GET', `/users/${edu.user.id}`, A);
  assert.equal(perfilEdu.testimonials[0].fromId, receitas.id);

  // Depoimento do Eduardo para a página: a Ana aprova e aparece na página.
  await call('POST', '/testimonials', E, { toPaginaId: receitas.id, text: 'Melhores receitas da cidade!' });
  await assert.rejects(call('POST', '/testimonials', A, { toPaginaId: receitas.id, text: 'Minha própria página' }), /400/);
  const pendAna = await call('GET', '/testimonials/pending', A);
  assert.equal(pendAna[0].toPagina, true);
  await call('POST', `/testimonials/${pendAna[0].id}/aceitar`, A);
  const deps = await call('GET', `/paginas/${receitas.id}/depoimentos`, E);
  assert.equal(deps[0].fromName, 'Eduardo Horveler');

  // Mensalidade vencida sem saldo: a página paga não posta até pagar; com saldo, volta.
  app.db.prepare('UPDATE paginas SET pago_ate = ? WHERE id = ?').run(Date.now() - 1000, anon.id);
  app.wallet.move(ana.user.id, 'saldo', -app.wallet.get(ana.user.id).balance, 'Saque', 'teste');
  await assert.rejects(call('POST', `/paginas/${anon.id}/posts`, A, { text: 'Achei uma chave' }), /402/);
  app.wallet.move(ana.user.id, 'saldo', 2000, 'Depósito', 'teste');
  const pago = await call('POST', `/paginas/${anon.id}/pagar`, A);
  assert.equal(pago.plano.status, 'ok');
  assert.equal(app.wallet.get(ana.user.id).balance, 2000 - 1490);
  await call('POST', `/paginas/${anon.id}/posts`, A, { text: 'Achei uma chave' });

  // Editar e apagar a página (os posts somem junto).
  const ed = await call('PATCH', `/paginas/${receitas.id}`, A, { about: 'Receitas testadas', style: { accent: '#B8860B', layout: 'revista' } });
  assert.equal(ed.style.layout, 'revista');
  await call('DELETE', `/paginas/${receitas.id}`, A);
  assert.ok(!(await call('GET', '/feed', E)).some((p) => p.id === postId));
  await assert.rejects(call('GET', `/paginas/${receitas.id}`, E), /404/);
  // Apagou a gratuita: a outra página vira a gratuita da conta.
  assert.equal((await call('GET', '/me/paginas', A))[0].plano.paga, false);
});
