// Indicação de produto: Realyz cobra 10%; quem indicou ganha 2% (o Realyz fica com 8%) quando o pedido é
// entregue; com o bônus da loja ligado, mais 5% pagos pela loja. Cancelado não paga.
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
  dir = mkdtempSync(join(tmpdir(), 'realys-ind-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false, orderFeePct: 10 }));
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
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const saldo = async (t) => (await call('GET', '/wallet', t)).balance;
const marcaVenda = (uid, oid) => app.db.prepare("INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?, ?, 'venda', ?, ?)").run('ck' + Math.random(), uid, oid, Date.now());

test('indicação: 2% do Realyz + 5% opcional da loja, só quando entrega', async () => {
  const loja = await call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name: 'Loja Tech', doc: '11.222.333/0001-81', username: 'lojatech', email: 'lt@t.com', password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO, segment: 'Eletrônicos' });
  const cli = await pessoa('Cliente Um', '52998224725', 'cliente1');
  const ind = await pessoa('Quem Indicou', '11144477735', 'indicou1');
  const p = await call('POST', '/products', loja.accessToken, { name: 'Fone Bluetooth', price: 100, stock: 10, category: 'Eletrônicos' });
  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 1000 });

  // 1) Sem bônus da loja: 2% de R$ 100 = R$ 2, quando entrega.
  const o1 = (await call('POST', '/orders', cli.accessToken, { items: [{ productId: p.id, qty: 1 }], ref: ind.user.id })).orders[0];
  assert.equal(await saldo(ind.accessToken), 0); // ainda não entregou
  marcaVenda(loja.user.id, o1.id);
  await call('PATCH', `/orders/${o1.id}`, loja.accessToken, { status: 'Entregue' });
  assert.equal(await saldo(ind.accessToken), 2);
  assert.equal(await saldo(loja.accessToken), 90); // loja recebe 90% (Realyz 10%, e desses 2% foram pra quem indicou)

  // 2) Loja liga o bônus: +5% (R$ 5) pago pela loja.
  await call('PATCH', '/companies/me', loja.accessToken, { indicacaoExtra: true });
  const o2 = (await call('POST', '/orders', cli.accessToken, { items: [{ productId: p.id, qty: 1 }], ref: ind.user.id })).orders[0];
  const lojaAntes = await saldo(loja.accessToken);
  marcaVenda(loja.user.id, o2.id);
  await call('PATCH', `/orders/${o2.id}`, loja.accessToken, { status: 'Entregue' });
  assert.equal(await saldo(ind.accessToken), 9); // 2 + 2 + 5
  assert.equal(await saldo(loja.accessToken), lojaAntes - 5);

  // 3) Cancelado não paga; indicar a si mesmo não vale.
  const o3 = (await call('POST', '/orders', cli.accessToken, { items: [{ productId: p.id, qty: 1 }], ref: ind.user.id })).orders[0];
  marcaVenda(loja.user.id, o3.id);
  await call('PATCH', `/orders/${o3.id}`, loja.accessToken, { status: 'Cancelado' });
  assert.equal(await saldo(ind.accessToken), 9);
  const o4 = (await call('POST', '/orders', cli.accessToken, { items: [{ productId: p.id, qty: 1 }], ref: cli.user.id })).orders[0];
  assert.equal(app.db.prepare('SELECT ref_id FROM orders WHERE id = ?').get(o4.id).ref_id, null);
});
