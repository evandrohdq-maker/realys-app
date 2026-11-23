// Conversa em grupo: criar só com amigos, mandar mensagem, não lidas, pôr e tirar gente, sair.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-grp-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste' }));
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
const amizade = async (a, b) => {
  await call('POST', `/friends/${b.user.id}`, a.accessToken);
  await call('POST', `/friends/${a.user.id}`, b.accessToken);
};

test('grupo: só com amigos, mensagens, não lidas, adicionar, remover e sair', async () => {
  const eva = await conta('Evandro Grupo', '529.982.247-25', 'evagrupo');
  const pai = await conta('Julio Grupo', '111.444.777-35', 'juliogrupo');
  const ana = await conta('Ana Grupo', '390.533.447-05', 'anagrupo');
  await amizade(eva, pai);
  assert.equal((await call('POST', '/grupos', eva.accessToken, { name: 'Família', membros: [pai.user.id, ana.user.id] })).status, 403); // Ana não é amiga
  await amizade(eva, ana);
  const g = await call('POST', '/grupos', eva.accessToken, { name: 'Família', membros: [pai.user.id] });
  assert.equal(g.status, 200, JSON.stringify(g.data));
  const m = await call('POST', `/grupos/${g.data.id}/msgs`, pai.accessToken, { text: 'Oi família! 😊' });
  assert.equal(m.status, 201, JSON.stringify(m.data));
  const lista = (await call('GET', '/grupos', eva.accessToken)).data;
  assert.equal(lista[0].unread, 1);
  assert.equal(lista[0].last.fromName, 'Julio Grupo');
  const det = (await call('GET', `/grupos/${g.data.id}`, eva.accessToken)).data;
  assert.equal(det.membros.length, 2);
  assert.equal((await call('GET', '/grupos', eva.accessToken)).data[0].unread, 0); // abriu: leu
  assert.equal((await call('GET', `/grupos/${g.data.id}`, ana.accessToken)).status, 404); // não é do grupo
  assert.equal((await call('POST', `/grupos/${g.data.id}/membros`, pai.accessToken, { userId: ana.user.id })).status, 403); // pai não é admin
  assert.equal((await call('POST', `/grupos/${g.data.id}/membros`, eva.accessToken, { userId: ana.user.id })).status, 200);
  assert.equal((await call('GET', `/grupos/${g.data.id}`, ana.accessToken)).data.membros.length, 3);
  await call('DELETE', `/grupos/${g.data.id}/membros/${eva.user.id}`, eva.accessToken); // o admin sai
  const depois = (await call('GET', `/grupos/${g.data.id}`, pai.accessToken)).data;
  assert.equal(depois.membros.length, 2);
  assert.ok(depois.membros.some((x) => x.admin)); // alguém virou administrador
});
