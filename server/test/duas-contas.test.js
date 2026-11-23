// Robô das duas contas: faz tudo o que duas pessoas fazem uma com a outra no Realyz, do jeito que o
// app e o site fazem (mesmos endereços do servidor). Se algo quebrar, o relatório diz em português
// qual passo falhou, para corrigir antes de ir para o servidor.
//   npm test   (roda sozinho no GitHub a cada mudança no servidor)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
const S = {};
const enviados = []; // e-mails que o servidor mandaria (código do esqueci a senha)

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realyz-duas-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true, mail: { ready: true, send: async (m) => enviados.push(m) } }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function api(method, path, { who, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, data };
}
// passo: o que a pessoa estava fazendo (aparece no relatório se falhar).
const ok = async (passo, ...a) => {
  const r = await api(...a);
  assert.ok(r.status < 300, `FALHOU: ${passo} → ${a[0]} ${a[1]} respondeu ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data;
};
const conta = (nome, user, doc) => ({ kind: 'pessoa', name: nome, doc, username: user, email: `${user}@realyz.com.br`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO });
const keep = (who, d) => (S[who] = { token: d.accessToken, id: d.user.id });

test('duas contas: cadastro e entrada com senha', async () => {
  await ok('cadastrar a Ana', 'POST', '/auth/signup', { body: conta('Ana Teste', 'anateste', '529.982.247-25') });
  await ok('cadastrar o Beto', 'POST', '/auth/signup', { body: conta('Beto Teste', 'betoteste', '111.444.777-35') });
  keep('ana', await ok('Ana entrar com usuário e senha', 'POST', '/auth/login', { body: { login: 'anateste', password: 'senha1234' } }));
  keep('beto', await ok('Beto entrar com usuário e senha', 'POST', '/auth/login', { body: { login: 'betoteste', password: 'senha1234' } }));
});

test('duas contas: perfil e foto gravam no servidor e voltam', async () => {
  const foto = await ok('Ana subir a foto do perfil', 'PUT', '/media', { who: 'ana', raw: Buffer.from('foto-da-ana-0123456789'), headers: { 'Content-Type': 'image/jpeg' } });
  await ok('Ana salvar o perfil', 'PUT', '/me/dados', { who: 'ana', body: { data: { myProfile: { photo: base + foto.url, bio: 'Oi, sou a Ana' } } } });
  const volta = await ok('Ana buscar o próprio perfil (outro aparelho)', 'GET', '/me/dados', { who: 'ana' });
  assert.equal(volta.data.myProfile.bio, 'Oi, sou a Ana', 'FALHOU: o perfil salvo não voltou do servidor');
  const pub = await ok('Beto abrir o perfil da Ana', 'GET', `/users/${S.ana.id}`, { who: 'beto' });
  assert.equal(pub.photo, foto.url, 'FALHOU: a foto da Ana não aparece para o Beto');
  assert.equal(pub.about, 'Oi, sou a Ana', 'FALHOU: o "sobre" da Ana não aparece para o Beto');
});

test('duas contas: pesquisa pelo nome e pelo *usuário', async () => {
  const porNome = await ok('Beto pesquisar "Ana"', 'GET', '/users?q=Ana', { who: 'beto' });
  assert.ok(porNome.some((u) => u.id === S.ana.id), 'FALHOU: pesquisa pelo nome não achou a Ana');
  const porUser = await ok('Ana pesquisar "*betoteste"', 'GET', `/users?q=${encodeURIComponent('*betoteste')}`, { who: 'ana' });
  assert.equal(porUser[0] && porUser[0].id, S.beto.id, 'FALHOU: pesquisa pelo *usuário não trouxe o Beto primeiro');
});

test('duas contas: sugestões de amizade mostram a outra pessoa', async () => {
  const l = await ok('Ana ver sugestões', 'GET', '/me/sugestoes', { who: 'ana' });
  assert.ok(l.some((u) => u.id === S.beto.id), 'FALHOU: o Beto não aparece nas sugestões da Ana');
  assert.ok(!l.some((u) => u.id === S.ana.id), 'FALHOU: a Ana aparece nas próprias sugestões');
});

test('duas contas: pedido de amizade, aceitar e ver como amigos', async () => {
  assert.equal((await ok('Beto adicionar a Ana', 'POST', `/friends/${S.ana.id}`, { who: 'beto' })).status, 'enviado');
  const pedidos = await ok('Ana ver os pedidos', 'GET', '/friends', { who: 'ana' });
  assert.ok(pedidos.some((u) => u.id === S.beto.id && u.friend === 'recebido'), 'FALHOU: o pedido do Beto não chegou para a Ana');
  assert.equal((await ok('Ana aceitar o Beto', 'POST', `/friends/${S.beto.id}`, { who: 'ana' })).status, 'amigos');
  const perfil = await ok('Ana abrir o perfil do Beto', 'GET', `/users/${S.beto.id}`, { who: 'ana' });
  assert.equal(perfil.friend, 'amigos', 'FALHOU: depois de aceitar, não aparecem como amigos');
  assert.equal(perfil.visible, true, 'FALHOU: amiga não consegue ver o perfil social');
});

test('duas contas: post aparece no perfil e no feed do amigo', async () => {
  const p = await ok('Beto publicar', 'POST', '/posts', { who: 'beto', body: { text: 'Primeiro post do Beto', visibility: 'amigos' } });
  const perfil = await ok('Ana ver o perfil do Beto', 'GET', `/users/${S.beto.id}`, { who: 'ana' });
  assert.ok(perfil.posts.some((x) => x.id === p.id), 'FALHOU: o post do Beto não aparece no perfil dele para a Ana');
  const feed = await ok('Ana abrir o feed', 'GET', '/feed', { who: 'ana' });
  assert.ok(feed.some((x) => x.id === p.id), 'FALHOU: o post do Beto não aparece no feed da Ana');
  await ok('Ana curtir', 'POST', `/posts/${p.id}/curtir`, { who: 'ana' });
  await ok('Ana comentar', 'POST', `/posts/${p.id}/comentarios`, { who: 'ana', body: { text: 'Que legal!' } });
});

test('duas contas: depoimento (precisa ser aceito para aparecer)', async () => {
  const d = await ok('Ana deixar depoimento', 'POST', '/testimonials', { who: 'ana', body: { toId: S.beto.id, text: 'Pessoa muito prestativa!' } });
  let perfil = await ok('Ver perfil do Beto antes de aceitar', 'GET', `/users/${S.beto.id}`, { who: 'ana' });
  assert.ok(!perfil.testimonials.some((t) => t.id === d.id), 'FALHOU: depoimento apareceu antes de ser aceito');
  await ok('Beto aceitar o depoimento', 'POST', `/testimonials/${d.id}/aceitar`, { who: 'beto' });
  perfil = await ok('Ver perfil do Beto depois de aceitar', 'GET', `/users/${S.beto.id}`, { who: 'ana' });
  assert.ok(perfil.testimonials.some((t) => t.id === d.id), 'FALHOU: depoimento aceito não aparece no perfil');
});

test('duas contas: conversa com histórico', async () => {
  await ok('Ana mandar mensagem', 'POST', '/messages', { who: 'ana', body: { toId: S.beto.id, text: 'Oi Beto, tudo bem?' } });
  await ok('Beto responder', 'POST', '/messages', { who: 'beto', body: { toId: S.ana.id, text: 'Tudo ótimo!' } });
  const conversas = await ok('Beto ver as conversas', 'GET', '/conversations', { who: 'beto' });
  assert.ok(conversas.some((c) => c.with.id === S.ana.id), 'FALHOU: a conversa com a Ana não aparece na lista do Beto');
  const hist = await ok('Ana ver o histórico', 'GET', `/messages/${S.beto.id}`, { who: 'ana' });
  const textos = JSON.stringify(hist);
  assert.ok(textos.includes('Oi Beto') && textos.includes('Tudo ótimo'), 'FALHOU: o histórico da conversa não tem as duas mensagens');
});

test('duas contas: prestador pode ser adicionado, mas o contato por fora é bloqueado', async () => {
  // O Beto vira prestador (motorista).
  app.db.prepare(`INSERT INTO providers (user_id, service, functions, price, price_unit, updated_at) VALUES (?, 'motorista', '[]', 2000, 'corrida', ?)`).run(S.beto.id, Date.now());
  const perfil = await ok('Ana abrir o perfil do Beto prestador', 'GET', `/users/${S.beto.id}`, { who: 'ana' });
  assert.equal(perfil.friend, 'amigos', 'FALHOU: virar prestador desfez a amizade');
  assert.equal(perfil.negocio, true, 'FALHOU: o perfil não marca o Beto como prestador');
  await ok('Conversa normal com prestador amigo', 'POST', '/messages', { who: 'ana', body: { toId: S.beto.id, text: 'Bom dia!' } });
  for (const [o, texto] of [['telefone', 'me liga 54 99999-1234'], ['zap', 'me chama no zap'], ['e-mail', 'manda em beto@gmail.com']]) {
    const r = await api('POST', '/messages', { who: 'beto', body: { toId: S.ana.id, text: texto } });
    assert.equal(r.status, 422, `FALHOU: prestador conseguiu passar ${o} na conversa ("${texto}")`);
  }
});

test('esqueci a senha: código por e-mail troca a senha e desconecta os aparelhos', async () => {
  const pedido = await ok('Beto pedir código', 'POST', '/auth/esqueci', { body: { login: 'betoteste' } });
  assert.ok(pedido.para && pedido.para.includes('@'), 'FALHOU: não disse para qual e-mail mandou');
  const codigo = (enviados.at(-1).text.match(/\b(\d{6})\b/) || [])[1];
  assert.ok(codigo, 'FALHOU: o e-mail não tem o código');
  const errado = await api('POST', '/auth/esqueci/confirmar', { body: { login: 'betoteste', codigo: codigo === '000000' ? '111111' : '000000', senha: 'novaSenha123' } });
  assert.equal(errado.status, 400, 'FALHOU: código errado foi aceito');
  await ok('Beto trocar a senha com o código', 'POST', '/auth/esqueci/confirmar', { body: { login: 'betoteste', codigo, senha: 'novaSenha123' } });
  assert.equal((await api('POST', '/auth/login', { body: { login: 'betoteste', password: 'senha1234' } })).status, 401, 'FALHOU: a senha antiga ainda entra');
  await ok('Beto entrar com a senha nova', 'POST', '/auth/login', { body: { login: 'betoteste', password: 'novaSenha123' } });
  const reuso = await api('POST', '/auth/esqueci/confirmar', { body: { login: 'betoteste', codigo, senha: 'outraSenha123' } });
  assert.equal(reuso.status, 400, 'FALHOU: o mesmo código serviu duas vezes');
  const ninguem = await ok('Pedir código de conta que não existe', 'POST', '/auth/esqueci', { body: { login: 'naoexiste99' } });
  assert.ok(!ninguem.para, 'FALHOU: a resposta revela que a conta não existe');
});

test('confirmar e-mail: código chega no cadastro e confirma a conta', async () => {
  const msg = [...enviados].reverse().find((m) => m.to === 'anateste@realyz.com.br' && /confirme/.test(m.subject));
  assert.ok(msg, 'FALHOU: o cadastro não mandou o código de confirmação');
  assert.equal((await ok('Ana ver a conta', 'GET', '/me', { who: 'ana' })).user.emailOk, false, 'FALHOU: e-mail aparece confirmado sem código');
  const errado = await api('POST', '/me/email/confirmar', { who: 'ana', body: { codigo: '000000' } });
  assert.equal(errado.status, 400, 'FALHOU: código errado foi aceito');
  // Pede outro código (o anterior pode ter sido o 000000 por azar) e confirma com ele.
  await ok('Ana pedir código de novo', 'POST', '/me/email/enviar', { who: 'ana', body: {} });
  const codigo = enviados.at(-1).text.match(/\b(\d{6})\b/)[1];
  await ok('Ana confirmar o e-mail', 'POST', '/me/email/confirmar', { who: 'ana', body: { codigo } });
  assert.equal((await ok('Ana ver a conta', 'GET', '/me', { who: 'ana' })).user.emailOk, true, 'FALHOU: e-mail não ficou confirmado');
  const semSenha = await api('POST', '/me/email/enviar', { who: 'beto', body: { email: 'outro@realyz.com.br' } });
  assert.equal(semSenha.data.code, 'senha_email', 'FALHOU: trocou o e-mail sem pedir a senha');
  const troca = await api('POST', '/me/email/enviar', { who: 'beto', body: { email: 'anateste@realyz.com.br', senha: 'novaSenha123' } });
  assert.equal(troca.status, 409, 'FALHOU: deixou usar o e-mail de outra conta');
  await ok('Beto trocar o e-mail com a senha', 'POST', '/me/email/enviar', { who: 'beto', body: { email: 'beto.novo@realyz.com.br', senha: 'novaSenha123' } });
  assert.ok(enviados.some((m) => m.to === 'betoteste@realyz.com.br' && /trocado/.test(m.subject)), 'FALHOU: o e-mail antigo não foi avisado da troca');
});

test('Google Authenticator: liga, pede o código no login e não entra sem ele', async () => {
  const { codigoEm } = await import('../src/totp.js');
  const ini = await ok('Ana iniciar o Authenticator', 'POST', '/me/2fa/iniciar', { who: 'ana' });
  assert.ok(ini.link.startsWith('otpauth://totp/'), 'FALHOU: link do Authenticator');
  assert.equal((await api('POST', '/me/2fa/ativar', { who: 'ana', body: { codigo: '000000' === codigoEm(ini.segredo) ? '111111' : '000000' } })).status, 400, 'FALHOU: ativou com código errado');
  await ok('Ana ativar com o código certo', 'POST', '/me/2fa/ativar', { who: 'ana', body: { codigo: codigoEm(ini.segredo) } });
  const sem = await api('POST', '/auth/login', { body: { login: 'anateste', password: 'senha1234' } });
  assert.equal(sem.data.code, 'codigo_2fa', 'FALHOU: entrou só com a senha');
  const errado = await api('POST', '/auth/login', { body: { login: 'anateste', password: 'senha1234', codigo2fa: codigoEm(ini.segredo, Date.now() + 300000) } });
  assert.equal(errado.status, 401, 'FALHOU: entrou com código velho/errado');
  keep('ana', await ok('Ana entrar com senha + código', 'POST', '/auth/login', { body: { login: 'anateste', password: 'senha1234', codigo2fa: codigoEm(ini.segredo) } }));
  assert.equal((await ok('Ana ver a conta', 'GET', '/me', { who: 'ana' })).user.duasEtapas, true);
  await ok('Ana desligar', 'POST', '/me/2fa/desativar', { who: 'ana', body: { codigo: codigoEm(ini.segredo) } });
  keep('ana', await ok('Ana entrar só com a senha de novo', 'POST', '/auth/login', { body: { login: 'anateste', password: 'senha1234' } }));
});


test('empresa: cadastro exige nome e CPF do titular do CNPJ', async () => {
  const base = { kind: 'empresa', name: 'Loja Teste', doc: '11.222.333/0001-81', username: 'lojateste', email: 'loja@realyz.com.br', password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO };
  assert.equal((await api('POST', '/auth/signup', { body: base })).status, 400, 'FALHOU: empresa cadastrou sem o titular');
  assert.equal((await api('POST', '/auth/signup', { body: { ...base, titularNome: 'Titular Teste', titularCpf: '111.111.111-11' } })).status, 400, 'FALHOU: aceitou CPF do titular inválido');
  await ok('cadastrar empresa com o titular', 'POST', '/auth/signup', { body: { ...base, titularNome: 'Titular Teste', titularCpf: '529.982.247-25' } });
});
