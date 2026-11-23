// Central de entregas, rota inteligente, cargas com proposta e ofertas de fornecedores.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
const avisos = [];
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-log-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  const send = app.hub.send.bind(app.hub);
  app.hub.send = (u, type, data) => (avisos.push({ u, type, data }), send(u, type, data));
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
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status, code: data.code });
  return data;
}
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const empresa = (name, doc, username, segment) => call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO, segment });
const saldo = async (t) => (await call('GET', '/wallet', t)).balance;
const depositar = (t, v) => call('POST', '/wallet/deposit', t, { amount: v });
// Rosto conferido agora (entregador e transportadora precisam da verificação a cada 6 h).
const rosto = (u) => app.db.prepare(`INSERT INTO biometria (id, user_id, status, updated_at, last_verified_at) VALUES (?, ?, 'aprovado', ?, ?)`).run('bio_' + u.id, u.id, Date.now(), Date.now());

test('entrega: oferta ao motoboy perto, rota inteligente, código e pagamento', async () => {
  const loja = await empresa('Pizzaria Bella', '11.222.333/0001-81', 'bella', 'Pizzaria');
  const cli = await pessoa('Clara Cliente', '52998224725', 'claracli');
  const moto = await pessoa('Mário Moto', '11144477735', 'mariomoto');
  const moto2 = await pessoa('Nina Moto', '39053344705', 'ninamoto');
  await call('PATCH', '/companies/me', loja.accessToken, { address: 'Av. Brasil, 450', lat: -28.2628, lng: -52.4067 });
  for (const m of [moto, moto2]) {
    rosto(m.user);
    await call('PUT', '/providers/me', m.accessToken, { service: 'motoboy', functions: ['Entregas'], price: 8, priceUnit: 'corrida' });
    await call('POST', '/providers/me/location', m.accessToken, { lat: -28.263, lng: -52.407, available: true });
  }
  await call('PUT', '/products', null).catch(() => {});
  const prod = await call('POST', '/products', loja.accessToken, { name: 'Pizza grande', price: 50, stock: 10 });
  await depositar(cli.accessToken, 200);
  await depositar(loja.accessToken, 50);
  const { orders: [o] } = await call('POST', '/orders', cli.accessToken, { items: [{ productId: prod.id, qty: 1 }], address: 'Rua Teixeira Soares, 1200', destLat: -28.242, destLng: -52.385 });
  const antesLoja = await saldo(loja.accessToken);
  const e = await call('POST', `/entregas/pedido/${o.id}`, loja.accessToken, { veiculo: 'moto' });
  assert.ok(e.valor >= 8 && e.codigo.length === 4);
  assert.equal(await saldo(loja.accessToken), +(antesLoja - e.valor).toFixed(2), 'a loja paga a entrega (retida)');
  assert.ok(avisos.some((a) => a.u === moto.user.id && a.type === 'entrega_oferta'), 'motoboy perto recebe a oferta');
  const codigoCliente = avisos.find((a) => a.u === cli.user.id && a.type === 'entrega').data.codigo;
  assert.equal(codigoCliente, e.codigo, 'o cliente recebe o código');

  await call('POST', `/entregas/${e.id}/aceitar`, moto.accessToken);
  await assert.rejects(call('POST', `/entregas/${e.id}/aceitar`, moto2.accessToken), /409/, 'só um leva');

  // Segunda entrega no mesmo caminho: Mário recebe a oferta de rota inteligente.
  const cli2 = await pessoa('Davi Dois', '12345678909', 'davidois');
  await depositar(cli2.accessToken, 200);
  const { orders: [o2] } = await call('POST', '/orders', cli2.accessToken, { items: [{ productId: prod.id, qty: 1 }], address: 'Rua Paissandu, 1800', destLat: -28.245, destLng: -52.388 });
  const e2 = await call('POST', `/entregas/pedido/${o2.id}`, loja.accessToken, {});
  assert.ok(avisos.some((a) => a.u === moto.user.id && a.type === 'entrega_rota' && a.data.id === e2.id), 'oferta de rota inteligente');
  const ofertas = await call('GET', '/entregas/ofertas', moto.accessToken);
  const r2 = ofertas.find((x) => x.id === e2.id);
  assert.ok(r2.rota && r2.rota.taxaPct === 25);
  await call('POST', `/entregas/${e2.id}/aceitar`, moto.accessToken);

  // Entregar: sem o código certo não libera.
  const antesMoto = await saldo(moto.accessToken);
  await assert.rejects(call('POST', `/entregas/${e.id}/entregue`, moto.accessToken, { codigo: '0000' }), /400/);
  const r = await call('POST', `/entregas/${e.id}/entregue`, moto.accessToken, { codigo: e.codigo });
  assert.equal(r.recebeu, +(e.valor * 0.82).toFixed(2), 'motoboy fica com 82%');
  const r2b = await call('POST', `/entregas/${e2.id}/entregue`, moto.accessToken, { codigo: e2.codigo });
  assert.equal(r2b.recebeu, +(e2.valor * 0.75).toFixed(2), 'rota inteligente: 75%');
  assert.equal(await saldo(moto.accessToken), +(antesMoto + r.recebeu + r2b.recebeu).toFixed(2));
  const pedidos = await call('GET', '/orders', cli.accessToken);
  assert.equal(pedidos.find((x) => x.id === o.id).status, 'Entregue');
});

test('carga: transportadora manda proposta e a empresa escolhe', async () => {
  const loja = await empresa('Móveis Casa Nova', '45.723.174/0001-10', 'casanova', 'Loja de móveis');
  const trans = await pessoa('Tito Transportes', '98765432100', 'titotrans');
  rosto(trans.user);
  await call('PUT', '/providers/me', trans.accessToken, { service: 'frete', functions: ['Mudanças'], price: 100, priceUnit: 'frete' });
  await call('POST', '/providers/me/location', trans.accessToken, { lat: -28.26, lng: -52.4, available: true });
  await depositar(loja.accessToken, 1000);
  const c = await call('POST', '/cargas', loja.accessToken, { coleta: 'Loja, Centro', destino: 'Carazinho - RS', descricao: '3 sofás e 1 guarda-roupa', valor: 300, veiculo: 'caminhao', coletaLat: -28.26, coletaLng: -52.4 });
  assert.ok(avisos.some((a) => a.u === trans.user.id && a.type === 'carga_oferta'));
  const lista = await call('GET', '/cargas', trans.accessToken);
  assert.equal(lista[0].id, c.id);
  await call('POST', `/cargas/${c.id}/proposta`, trans.accessToken, { valor: 350, prazo: 'amanhã de manhã' });
  const minhas = await call('GET', '/entregas/minhas', loja.accessToken);
  const prop = minhas.loja.find((x) => x.id === c.id).propostas[0];
  assert.equal(prop.valor, 350);
  const antes = await saldo(loja.accessToken);
  await call('POST', `/cargas/${c.id}/escolher`, loja.accessToken, { propostaId: prop.id });
  assert.equal(await saldo(loja.accessToken), antes - 50, 'paga a diferença');
  const r = await call('POST', `/entregas/${c.id}/entregue`, trans.accessToken, { codigo: c.codigo });
  assert.equal(r.recebeu, 315, 'transportadora fica com 90%');
});

test('fornecedor: oferta chega aos restaurantes perto e o pedido fica retido até receber', async () => {
  const forn = await empresa('Distribuidora Sul', '04.252.011/0001-10', 'distsul', 'Distribuidora de alimentos');
  const rest = await empresa('Churrascaria Gaúcha', '60.701.190/0001-04', 'churras', 'Churrascaria');
  const loja = await empresa('Ótica Visão', '33.000.167/0001-01', 'otica', 'Ótica');
  await call('PATCH', '/companies/me', forn.accessToken, { lat: -28.26, lng: -52.4 });
  await call('PATCH', '/companies/me', rest.accessToken, { lat: -28.27, lng: -52.41 });
  const of = await call('POST', '/ofertas-fornecedor', forn.accessToken, { produto: 'Picanha resfriada', preco: 59.9, unidade: 'kg', minimo: 10, segmentos: ['alimentacao'], raioKm: 50 });
  assert.ok(avisos.some((a) => a.u === rest.user.id && a.type === 'oferta_fornecedor'), 'restaurante avisado');
  assert.ok(!avisos.some((a) => a.u === loja.user.id && a.type === 'oferta_fornecedor'), 'ótica não');
  assert.equal((await call('GET', '/ofertas-fornecedor', rest.accessToken)).length >= 1, true);
  assert.equal((await call('GET', '/ofertas-fornecedor', loja.accessToken)).length, 0);
  await depositar(rest.accessToken, 1000);
  await assert.rejects(call('POST', `/ofertas-fornecedor/${of.id}/pedir`, rest.accessToken, { qtd: 5 }), /400/, 'abaixo do mínimo');
  const p = await call('POST', `/ofertas-fornecedor/${of.id}/pedir`, rest.accessToken, { qtd: 10 });
  assert.equal(p.total, 599);
  await assert.rejects(call('POST', `/pedidos-fornecedor/${p.id}/recebi`, rest.accessToken), /409/, 'antes de confirmar');
  await call('POST', `/pedidos-fornecedor/${p.id}/confirmar`, forn.accessToken);
  const antes = await saldo(forn.accessToken);
  await call('POST', `/pedidos-fornecedor/${p.id}/recebi`, rest.accessToken);
  assert.equal(await saldo(forn.accessToken), +(antes + 599 * 0.95).toFixed(2), 'fornecedor recebe 95%');
});
