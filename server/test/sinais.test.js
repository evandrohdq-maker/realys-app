// Sinais da mensagem (pétalas da Lotus): enviada → entregue → lida.
// Base copiada do robô das duas contas: faz tudo o que duas pessoas fazem uma com a outra no Realyz, do jeito que o
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-sinais-'));
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

test('sinais: cadastro das duas contas', async () => {
  await ok('cadastrar a Ana', 'POST', '/auth/signup', { body: conta('Ana Teste', 'anateste', '529.982.247-25') });
  await ok('cadastrar o Beto', 'POST', '/auth/signup', { body: conta('Beto Teste', 'betoteste', '111.444.777-35') });
  keep('ana', await ok('Ana entrar com usuário e senha', 'POST', '/auth/login', { body: { login: 'anateste', password: 'senha1234' } }));
  keep('beto', await ok('Beto entrar com usuário e senha', 'POST', '/auth/login', { body: { login: 'betoteste', password: 'senha1234' } }));
});


test('sinais: enviada, entregue e lida', async () => {
  const m = await ok('Ana mandar mensagem', 'POST', '/messages', { who: 'ana', body: { toId: S.beto.id, text: 'Oi Beto, tudo bem?', clientId: 'cli-ana-0001' } });
  assert.equal(m.deliveredAt, null, 'Beto está com o app fechado: ainda não foi entregue');
  assert.equal(m.readAt, null);
  const de_novo = await ok('a fila manda a mesma mensagem de novo', 'POST', '/messages', { who: 'ana', body: { toId: S.beto.id, text: 'Oi Beto, tudo bem?', clientId: 'cli-ana-0001' } });
  assert.equal(de_novo.id, m.id, 'mesma mensagem não duplica');
  let h = await ok('Ana ver a conversa', 'GET', `/messages/${S.beto.id}`, { who: 'ana' });
  assert.equal(h.length, 1, 'só uma mensagem na conversa');
  assert.equal(h[0].clientId, 'cli-ana-0001');
  await ok('Beto abrir a lista de conversas', 'GET', '/conversations', { who: 'beto' });
  h = await ok('Ana ver a conversa', 'GET', `/messages/${S.beto.id}`, { who: 'ana' });
  assert.ok(h[0].deliveredAt, 'entregue depois que o Beto abriu o app');
  assert.equal(h[0].readAt, null, 'mas ainda não lida');
  await ok('Beto abrir a conversa', 'GET', `/messages/${S.ana.id}`, { who: 'beto' });
  h = await ok('Ana ver a conversa', 'GET', `/messages/${S.beto.id}`, { who: 'ana' });
  assert.ok(h[0].readAt, 'lida depois que o Beto abriu a conversa');
  const cs = await ok('Ana ver a lista de conversas', 'GET', '/conversations', { who: 'ana' });
  assert.ok(cs[0].last.readAt, 'a lista também mostra que foi lida');
});
