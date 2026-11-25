// Notificações com o app fechado: o aparelho registra o código, a mensagem para quem está offline
// vira notificação no Firebase (aqui um Firebase de mentira) e o código vencido é apagado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const sent = [];
const fakeFetch = async (url, opts) => {
  if (url.includes('oauth2')) return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
  const body = JSON.parse(opts.body);
  sent.push(body.message);
  if (body.message.token.startsWith('velho')) return { ok: false, status: 404, json: async () => ({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }) };
  return { ok: true, status: 200, json: async () => ({ name: 'x' }) };
};

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-push-'));
  const conta = JSON.stringify({ project_id: 'realyz-teste', client_email: 'bot@realyz-teste.iam.gserviceaccount.com', private_key: privateKey });
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false, firebaseServiceAccount: conta, pushFetch: fakeFetch }));
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
const signup = (name, doc, username) =>
  call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const wait = () => new Promise((r) => setTimeout(r, 150));

test('push: mensagem para quem está com o app fechado vira notificação', async () => {
  const ana = await signup('Ana Souza', '52998224725', 'anasouza');
  const beto = await signup('Beto Lima', '11144477735', 'betolima');
  const r = await call('POST', '/push/token', beto.accessToken, { token: 'aparelho-do-beto-0123456789' });
  assert.equal(r.ligado, true);
  await call('POST', '/push/token', beto.accessToken, { token: 'velho-aparelho-0123456789' });

  await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, text: 'Oi Beto, tudo bem?' });
  await wait();
  const msg = sent.find((m) => m.token === 'aparelho-do-beto-0123456789');
  assert.ok(msg, 'a notificação saiu');
  assert.equal(msg.notification.title, 'Ana Souza');
  assert.equal(msg.notification.body, 'Oi Beto, tudo bem?');
  assert.equal(JSON.parse(msg.data.go).chat.userId, ana.user.id);
  assert.equal(msg.android.notification.channel_id, 'realyz');
  // O código vencido foi apagado.
  assert.deepEqual(app.db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(beto.user.id).map((x) => x.token), ['aparelho-do-beto-0123456789']);

  // Saiu da conta: não recebe mais.
  await call('POST', '/push/token/sair', beto.accessToken, { token: 'aparelho-do-beto-0123456789' });
  sent.length = 0;
  await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, text: 'Outra' });
  await wait();
  assert.equal(sent.length, 0);
});

test('push: aparelho com app novo recebe o recibo silencioso e a mensagem vira entregue', async () => {
  const caio = await signup('Caio Dias', '39053344705', 'caiodias');
  const duda = await signup('Duda Reis', '15350946056', 'dudareis');
  await call('POST', '/push/token', duda.accessToken, { token: 'aparelho-da-duda-0123456789', recibo: true });
  sent.length = 0;
  const m = await call('POST', '/messages', caio.accessToken, { toId: duda.user.id, text: 'Oi Duda' });
  await wait();
  const doAparelho = sent.filter((x) => x.token === 'aparelho-da-duda-0123456789');
  assert.ok(doAparelho.some((x) => x.notification), 'a notificação normal continua indo');
  const rec = doAparelho.find((x) => x.data && x.data.tipo === 'recibo');
  assert.ok(rec && !rec.notification, 'e o aviso silencioso do recibo também');
  assert.equal(rec.data.m, m.id);
  await call('POST', '/messages/recibo', null, { m: rec.data.m, u: rec.data.u, r: rec.data.r });
  const h = await call('GET', `/messages/${duda.user.id}`, caio.accessToken);
  assert.ok(h.find((x) => x.id === m.id).deliveredAt, 'Caio vê a 2ª pétala');
});
