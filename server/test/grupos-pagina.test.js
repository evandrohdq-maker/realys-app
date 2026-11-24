// Grupos de página: até 1000 pessoas, convite para seguidores, modo moderado (aprovar mensagens),
// modo avisos (só moderadores falam), moderadores e silenciar.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-grpag-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const call = async (method, path, token, body) => {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const conta = async (name, doc, username) => (await call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO })).data;

test('grupo de página: convite, moderação, avisos, moderador e silenciar', async () => {
  const dono = await conta('Ana Mentora', '52998224725', 'anamentora');
  const aluno = await conta('Bruno Aluno', '11144477735', 'brunoaluno');
  const estranho = await conta('Caio Fora', '39053344705', 'caiofora');
  const D = dono.accessToken, B = aluno.accessToken, C = estranho.accessToken;

  const pg = await call('POST', '/paginas', D, { name: 'Curso de Vendas', about: 'Estratégias de venda', category: 'cursos' });
  assert.equal(pg.status < 300, true, JSON.stringify(pg.data));
  const pid = pg.data.id;
  await call('POST', `/paginas/${pid}/seguir`, B);

  // Só o dono da página cria grupo.
  assert.equal((await call('POST', `/paginas/${pid}/grupos`, B, { name: 'Turma 1' })).status, 403);
  const g = await call('POST', `/paginas/${pid}/grupos`, D, { name: 'Turma 1', descricao: 'Aulas e propostas', modo: 'moderado' });
  assert.equal(g.status, 201, JSON.stringify(g.data));
  const gid = g.data.id;

  // Convite: seguidor da página recebe; quem não segue nem é amigo, não.
  const cv = await call('POST', `/grupos/${gid}/convites`, D, { userIds: [aluno.user.id, estranho.user.id] });
  assert.equal(cv.data.enviados, 1);
  assert.equal((await call('POST', `/grupos/${gid}/entrar`, C)).status, 403);
  const meus = await call('GET', '/grupos/convites', B);
  assert.equal(meus.data.length, 1);
  assert.equal(meus.data[0].pagina.name, 'Curso de Vendas');
  assert.equal((await call('POST', `/grupos/${gid}/entrar`, B)).status, 200);
  assert.equal((await call('GET', '/grupos/convites', B)).data.length, 0);

  const lista = await call('GET', `/paginas/${pid}/grupos`, B);
  assert.equal(lista.data[0].membros, 2);
  assert.equal(lista.data[0].max, 1000);
  assert.equal(lista.data[0].souMembro, true);

  // Moderado: mensagem do aluno espera aprovação; o dono vê e aprova.
  const m = await call('POST', `/grupos/${gid}/msgs`, B, { text: 'Professora, como faço a proposta?' });
  assert.equal(m.data.status, 'pendente');
  const vistaDono = await call('GET', `/grupos/${gid}`, D);
  assert.equal(vistaDono.data.pendentes, 1);
  assert.ok(vistaDono.data.msgs.some((x) => x.id === m.data.id && x.status === 'pendente'));
  assert.equal((await call('POST', `/grupos/${gid}/msgs/${m.data.id}/moderar`, B, { acao: 'aprovar' })).status, 403);
  assert.equal((await call('POST', `/grupos/${gid}/msgs/${m.data.id}/moderar`, D, { acao: 'aprovar' })).data.status, 'ok');
  const m2 = await call('POST', `/grupos/${gid}/msgs`, B, { text: 'Outra pergunta' });
  await call('POST', `/grupos/${gid}/msgs/${m2.data.id}/moderar`, D, { acao: 'recusar' });
  const vistaAluno = await call('GET', `/grupos/${gid}`, B);
  assert.ok(vistaAluno.data.msgs.some((x) => x.id === m.data.id));
  assert.ok(!vistaAluno.data.msgs.some((x) => x.id === m2.data.id));

  // Avisos: só moderadores falam.
  await call('PATCH', `/grupos/${gid}`, D, { modo: 'avisos' });
  assert.equal((await call('POST', `/grupos/${gid}/msgs`, B, { text: 'oi' })).status, 403);
  assert.equal((await call('POST', `/grupos/${gid}/msgs`, D, { text: 'Aula amanhã às 20h' })).data.status, 'ok');

  // Dono põe o aluno como moderador: aí ele fala; tira, e volta a não falar.
  await call('POST', `/grupos/${gid}/moderadores`, D, { userId: aluno.user.id, moderador: true });
  assert.equal((await call('POST', `/grupos/${gid}/msgs`, B, { text: 'Material no link da página' })).status, 201);
  await call('POST', `/grupos/${gid}/moderadores`, D, { userId: aluno.user.id, moderador: false });

  // Silenciar no modo livre.
  await call('PATCH', `/grupos/${gid}`, D, { modo: 'livre' });
  await call('POST', `/grupos/${gid}/silenciar`, D, { userId: aluno.user.id, horas: 2 });
  assert.equal((await call('POST', `/grupos/${gid}/msgs`, B, { text: 'oi' })).status, 403);
  await call('POST', `/grupos/${gid}/silenciar`, D, { userId: aluno.user.id, horas: 0 });
  assert.equal((await call('POST', `/grupos/${gid}/msgs`, B, { text: 'voltei' })).data.status, 'ok');
});
