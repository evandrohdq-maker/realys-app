// Compra de ponta a ponta como o app faz (src/serverAuth.js e src/serverShop.js):
// cadastro com os campos do app, depósito, produto da loja, pedido com taxa de proteção,
// loja mudando o status e cancelamento devolvendo tudo.
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
  dir = mkdtempSync(join(tmpdir(), 'realys-compra-'));
  // Primeiro teste na VPS: sem o serviço biométrico, as ações não pedem a conferência do rosto.
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status, code: data.code });
  return data;
}

test('cadastro do app, compra com taxa de proteção, status da loja e cancelamento', async () => {
  // Mesmo formato de cadastrarNoServidor (data de nascimento DD/MM/AAAA, como no app).
  const cli = await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Clara Teste', doc: '52998224725', username: 'clara', email: 'clara@teste.com', phone: '54999990000', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO, about: '' });
  const loja = await call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name: 'Loja Passo Fundo', doc: '11222333000181', username: 'lojapf', email: 'loja@teste.com', phone: '', password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO, about: '' });
  // Entrar de novo (login do app) funciona com CPF.
  const again = await call('POST', '/auth/login', null, { login: '529.982.247-25', password: 'senha1234', device: 'Android', deviceKey: 'aparelho-1' });
  assert.equal(again.user.id, cli.user.id);

  const p = await call('POST', '/products', loja.accessToken, { name: 'Camiseta', category: 'Vestuário', price: 49.9, stock: 3 });
  const catalogo = await call('GET', '/products');
  assert.ok(catalogo.some((x) => x.id === p.id && x.companyId));

  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 60, method: 'pix' });
  const r = await call('POST', '/orders', cli.accessToken, { items: [{ productId: p.id, qty: 1 }] });
  assert.equal(r.orders[0].total, 49.9);
  assert.equal(r.orders[0].protection, 0.99);
  assert.equal((await call('GET', '/wallet', cli.accessToken)).balance, 9.11); // 60 - 49,90 - 0,99

  // A loja vê e avança (sem serviço biométrico na fase de testes).
  const vendas = await call('GET', '/companies/me/orders', loja.accessToken);
  assert.equal(vendas[0].buyer, 'Clara Teste');
  await call('PATCH', `/orders/${r.orders[0].id}`, loja.accessToken, { status: 'Preparando' });
  assert.equal((await call('GET', '/orders', cli.accessToken))[0].status, 'Preparando');

  // Cancelou: o cliente recebe produto + proteção de volta.
  await call('PATCH', `/orders/${r.orders[0].id}`, loja.accessToken, { status: 'Cancelado' });
  assert.equal((await call('GET', '/wallet', cli.accessToken)).balance, 60);
});
