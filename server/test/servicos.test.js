// Serviços como o app faz: taxa de visita retida, devolvida quando o prestador recusa,
// liberada (com os 15% do Realyz) quando o cliente confirma a visita, e corrida com 18% do Realyz.
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
  dir = mkdtempSync(join(tmpdir(), 'realys-serv-'));
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
const signup = (name, doc, username) =>
  call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const saldo = async (t) => (await call('GET', '/wallet', t)).balance;

test('visita: retida, devolvida na recusa e liberada com 15% do Realyz', async () => {
  const cli = await signup('Clara Cliente', '52998224725', 'clara');
  const ele = await signup('Edu Eletricista', '11144477735', 'edu');
  await call('PUT', '/providers/me', ele.accessToken, { service: 'eletricista', functions: ['Tomadas', 'Chuveiro'], price: 120, priceUnit: 'visita' });
  await call('POST', '/providers/me/location', ele.accessToken, { lat: -28.26, lng: -52.4 });
  const perto = await call('GET', `/providers/nearby?lat=-28.26&lng=-52.41&service=eletricista`, cli.accessToken);
  assert.equal(perto[0].visitFee, 120);

  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 300 });
  // 1º pedido: o prestador recusa e a taxa volta.
  const c1 = await call('POST', '/calls', cli.accessToken, { providerId: ele.user.id, problem: 'Chuveiro queimou', address: 'Rua A, 1' });
  assert.equal(c1.visitState, 'retida');
  assert.equal(await saldo(cli.accessToken), 180);
  await call('PATCH', `/calls/${c1.id}`, ele.accessToken, { status: 'Recusado' });
  assert.equal(await saldo(cli.accessToken), 300);

  // 2º pedido: aceita, o cliente confirma a visita e o prestador recebe 85%.
  const c2 = await call('POST', '/calls', cli.accessToken, { providerId: ele.user.id, problem: 'Tomada solta' });
  await call('PATCH', `/calls/${c2.id}`, ele.accessToken, { status: 'Aceito' });
  const ok = await call('POST', `/calls/${c2.id}/confirmar-visita`, cli.accessToken);
  assert.equal(ok.visitState, 'liberada');
  assert.equal(await saldo(cli.accessToken), 180);
  assert.equal(await saldo(ele.accessToken), 102); // 120 - 15%
  await assert.rejects(call('POST', `/calls/${c2.id}/confirmar-visita`, cli.accessToken), /409/);

  // 3º pedido: aceitou e não veio: a taxa volta.
  const c3 = await call('POST', '/calls', cli.accessToken, { providerId: ele.user.id, problem: 'Disjuntor' });
  await call('PATCH', `/calls/${c3.id}`, ele.accessToken, { status: 'Aceito' });
  await call('POST', `/calls/${c3.id}/nao-compareceu`, cli.accessToken);
  assert.equal(await saldo(cli.accessToken), 180);
});

test('corrida: o Realyz fica com 18% e o motorista com o resto', async () => {
  const cli = await signup('Rita Passageira', '39053344705', 'rita');
  const mot = await signup('Mauro Motorista', '15350946056', 'mauro');
  await call('PUT', '/providers/me', mot.accessToken, { service: 'motorista', functions: ['Corridas na cidade'], price: 3, priceUnit: 'km' });
  const c = await call('POST', '/calls', cli.accessToken, { providerId: mot.user.id, when: 'agora mesmo' });
  assert.equal(c.visitState, null); // corrida não tem taxa de visita
  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 50 });
  const pago = await call('POST', `/calls/${c.id}/pay`, cli.accessToken, { amount: 50 });
  assert.equal(pago.fee, 9);
  assert.equal(await saldo(mot.accessToken), 41);
});

test('ingressos: empresa publica, cliente compra, Realyz fica com 8% (mín. R$ 1,99) e a portaria confere', async () => {
  const bar = await call('POST', '/auth/signup', null, { kind: 'empresa', name: 'Casa Noturna PF', doc: '11222333000181', username: 'casapf', email: 'casa@teste.com', password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO });
  const cli = await signup('Bia Baladeira', '93541134780', 'bia');
  const ev = await call('POST', '/events', bar.accessToken, { title: 'Sertanejo ao vivo', when: 'Sáb · 22h', place: 'Centro, Passo Fundo', price: 40, capacity: 2 });
  assert.ok((await call('GET', '/events')).some((e) => e.id === ev.id));
  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 100 });
  const r = await call('POST', `/events/${ev.id}/tickets`, cli.accessToken, { qty: 2 });
  assert.equal(r.codes.length, 2);
  assert.equal(await saldo(cli.accessToken), 20);
  assert.equal(await saldo(bar.accessToken), 73.6); // 80 - 2 × 3,20
  assert.equal(r.event.status, 'esgotado');
  await assert.rejects(call('POST', `/events/${ev.id}/tickets`, cli.accessToken, { qty: 1 }), /404/);
  const meus = await call('GET', '/tickets', cli.accessToken);
  assert.equal(meus.length, 2);
  const ok = await call('POST', `/tickets/${r.codes[0]}/entrada`, bar.accessToken);
  assert.equal(ok.buyer, 'Bia Baladeira');
  await assert.rejects(call('POST', `/tickets/${r.codes[0]}/entrada`, bar.accessToken), /409/);
});

test('músicas: artista recebe 100% do valor dele, Realyz soma R$ 0,99 e ninguém paga duas vezes', async () => {
  const art = await signup('Duda Cantora', '71428793860', 'duda');
  const fa = await signup('Fã Fiel', '86288366757', 'fafiel');
  const t = await call('POST', '/tracks', art.accessToken, { title: 'Estrada de Chão', genre: 'Sertanejo', artistValue: 2, url: '/media/abc' });
  assert.equal(t.price, 2.99);
  assert.ok((await call('GET', '/tracks')).some((x) => x.id === t.id));
  await call('POST', '/wallet/deposit', fa.accessToken, { amount: 10 });
  const r = await call('POST', '/tracks/comprar', fa.accessToken, { ids: [t.id] });
  assert.deepEqual(r.bought, [t.id]);
  assert.equal(await saldo(fa.accessToken), 7.01);
  assert.equal(await saldo(art.accessToken), 2);
  const r2 = await call('POST', '/tracks/comprar', fa.accessToken, { ids: [t.id] });
  assert.deepEqual(r2.bought, []); // já é dela
  assert.deepEqual(await call('GET', '/tracks/minhas', fa.accessToken), [t.id]);
  const area = await call('GET', '/tracks/artista', art.accessToken);
  assert.equal(area.sales, 1);
  assert.equal(area.earned, 2);
});
