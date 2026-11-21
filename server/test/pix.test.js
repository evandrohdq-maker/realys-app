// Depósito por Pix de verdade (API Pix do banco), com o banco simulado:
// cria a cobrança, o app pergunta o andamento, o cliente paga e o saldo entra uma vez só.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { makePix } from '../src/pagamentos/pix.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

// Banco falso: guarda as cobranças e deixa "pagar" uma delas.
const banco = { cobs: new Map(), calls: [] };
const send = async (method, url, headers, body) => {
  banco.calls.push([method, url]);
  if (url.endsWith('/oauth/token')) return { status: 200, json: { access_token: 'tok', expires_in: 300 } };
  const txid = url.split('/cob/')[1];
  if (method === 'PUT') {
    const b = JSON.parse(body);
    banco.cobs.set(txid, { txid, status: 'ATIVA', valor: b.valor.original });
    return { status: 201, json: { txid, status: 'ATIVA', pixCopiaECola: `000201PIX${txid}` } };
  }
  const c = banco.cobs.get(txid);
  return { status: 200, json: c.status === 'CONCLUIDA' ? { ...c, pix: [{ valor: c.valor }] } : c };
};

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-pix-'));
  const cfg = loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: false, pixProvider: 'santander', pixClientId: 'id', pixClientSecret: 'seg', pixChave: '12345678000199', pixBaseUrl: 'https://banco.teste', pixApiPath: '/api/v1' });
  cfg.pix = makePix(cfg, { send });
  app = createApp(cfg);
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
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status });
  return data;
}

test('depósito por Pix: cobrança no banco, saldo só entra depois de pago e uma vez só', async () => {
  const u = await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Pedro Pix', doc: '52998224725', username: 'pedropix', email: 'p@teste.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  const d = await call('POST', '/wallet/deposit', u.accessToken, { amount: 25.5, method: 'pix' });
  assert.equal(d.status, 'pendente');
  assert.match(d.pix.copiaECola, /^000201PIX/);
  assert.equal((await call('GET', `/wallet/deposits/${d.id}`, u.accessToken)).status, 'pendente');
  assert.equal((await call('GET', '/wallet', u.accessToken)).balance, 0);
  // O cliente paga no banco.
  const txid = d.pix.copiaECola.replace('000201PIX', '');
  banco.cobs.get(txid).status = 'CONCLUIDA';
  assert.equal((await call('GET', `/wallet/deposits/${d.id}`, u.accessToken)).status, 'confirmado');
  await app.pix.conferirDepositos(); // a conferência automática não credita de novo
  assert.equal((await call('GET', `/wallet/deposits/${d.id}`, u.accessToken)).wallet.balance, 25.5);
  assert.ok(banco.calls.some(([m, url]) => m === 'PUT' && url.startsWith('https://banco.teste/api/v1/cob/')));
});
