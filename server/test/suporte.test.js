// Suporte: o usuário abre o chamado, a equipe vê na fila, responde e o usuário recebe.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-sup-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', admin2fa: false }));
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
export { call };

test('suporte: chamado vai do usuário para a equipe e a resposta volta', async () => {
  const ana = (await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Ana Suporte', doc: '529.982.247-25', username: 'anasup', email: 'anasup@t.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO })).data;
  assert.ok(ana.accessToken, JSON.stringify(ana));
  const adm = (await call('POST', '/auth/login', null, { login: 'chefe', password: 'Admin12345' })).data;
  const t = ana.accessToken;
  const novo = await call('POST', '/suporte/chamados', t, { topic: 'pagamento', text: 'Meu Pix não caiu na carteira', lotusTried: true });
  assert.equal(novo.status, 200, JSON.stringify(novo.data));
  assert.equal(novo.data.urgent, true);
  assert.equal(novo.data.messages[0].text, 'Meu Pix não caiu na carteira');
  // Outra pessoa não vê nem responde o chamado da Ana; só a equipe.
  assert.equal((await call('GET', '/admin/suporte', t)).status, 403);
  const fila = await call('GET', '/admin/suporte', adm.accessToken);
  assert.equal(fila.status, 200, JSON.stringify(fila.data));
  assert.equal(fila.data[0].id, novo.data.id);
  assert.equal(fila.data[0].userName, 'Ana Suporte');
  const resp = await call('POST', `/admin/suporte/${novo.data.id}/msg`, adm.accessToken, { text: 'Conferimos e o valor entrou.' });
  assert.equal(resp.data.status, 'respondido');
  const meus = await call('GET', '/suporte/chamados', t);
  assert.equal(meus.data[0].unreadUser, 1);
  assert.equal(meus.data[0].messages.at(-1).from, 'team');
  await call('POST', `/suporte/chamados/${novo.data.id}/lido`, t);
  await call('POST', `/suporte/chamados/${novo.data.id}/msg`, t, { text: 'Obrigada!' });
  assert.equal((await call('GET', '/suporte/chamados', t)).data[0].status, 'aberto');
  assert.equal((await call('POST', `/suporte/chamados/${novo.data.id}/fechar`, t)).data.status, 'resolvido');
  assert.equal((await call('POST', `/suporte/chamados/${novo.data.id}/nota`, t, { stars: 5 })).data.rating, 5);
});
