// Cardápio de comida: classe, subclasse, modos de atendimento (entrega e retirada no local) e filtros.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir, token, db;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-card-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const res = await fetch(base + '/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'empresa', name: 'Sushi Ya', doc: '11.222.333/0001-81', username: 'sushiya', email: 'contato@sushiya.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v11', segment: 'Comida japonesa' }),
  });
  token = (await res.json()).accessToken;
  db = app.db;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function api(method, path, { body, auth = true } = {}) {
  const h = {};
  if (auth) h.Authorization = `Bearer ${token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test('produto de comida guarda classe, subclasse, modos e maioridade', async () => {
  const r = await api('POST', '/products', { body: { name: 'Rodízio japonês', price: 74.9, stock: 99, classe: 'japonesa', subclasse: 'rodizio_japones', modos: ['retirada'] } });
  assert.equal(r.status, 201);
  assert.equal(r.data.classe, 'japonesa');
  assert.equal(r.data.subclasse, 'rodizio_japones');
  assert.deepEqual(r.data.modos, ['retirada']);
  assert.equal(r.data.maioridade, false);

  const bebida = await api('POST', '/products', { body: { name: 'Chope Pilsen 300ml', price: 12, stock: 50, classe: 'bar', subclasse: 'chope', modos: ['entrega', 'retirada'], maioridade: true } });
  assert.equal(bebida.data.maioridade, true);
});

test('sem modos informados, o produto vale para entrega e retirada', async () => {
  const r = await api('POST', '/products', { body: { name: 'Temaki de salmão', price: 19, stock: 20, classe: 'japonesa', subclasse: 'sushi' } });
  assert.deepEqual(r.data.modos, ['entrega', 'retirada']);
  assert.equal(r.data.maioridade, false);
});

test('classe, modo e subclasse inválidos são recusados', async () => {
  assert.equal((await api('POST', '/products', { body: { name: 'X', price: 1, classe: 'eletronicos' } })).status, 400);
  assert.equal((await api('POST', '/products', { body: { name: 'X', price: 1, classe: 'lanches', modos: ['drone'] } })).status, 400);
  assert.equal((await api('POST', '/products', { body: { name: 'X', price: 1, classe: 'lanches', modos: [] } })).status, 400);
});

test('filtros do cardápio: por classe, por subclasse e por modo', async () => {
  const japonesa = await api('GET', '/products?classe=japonesa', { auth: false });
  assert.ok(japonesa.data.length >= 2);
  assert.ok(japonesa.data.every((p) => p.classe === 'japonesa'));

  const soRetirada = await api('GET', '/products?modo=retirada', { auth: false });
  assert.ok(soRetirada.data.some((p) => p.name === 'Rodízio japonês'));
  assert.ok(soRetirada.data.every((p) => p.modos.includes('retirada')));
  assert.ok(!soRetirada.data.some((p) => p.name === 'Temaki de salmão' && !p.modos.includes('retirada')));

  const sushi = await api('GET', '/products?subclasse=sushi', { auth: false });
  assert.deepEqual(sushi.data.map((p) => p.name), ['Temaki de salmão']);

  assert.equal((await api('GET', '/products?modo=drone', { auth: false })).status, 400);
});

test('editar classe e modos pelo PATCH', async () => {
  const lista = await api('GET', '/products?classe=japonesa', { auth: false });
  const id = lista.data.find((p) => p.name === 'Temaki de salmão').id;
  const r = await api('PATCH', `/products/${id}`, { body: { modos: ['entrega'], classe: 'lanches', subclasse: 'sanduiche' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.modos, ['entrega']);
  assert.equal(r.data.classe, 'lanches');
});

async function signupPessoa(username, nascimento = '1990-05-10', doc = '529.982.247-25') {
  const r = await fetch(base + '/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'pessoa', name: 'Pessoa ' + username, doc, username, email: username + '@realys.com', password: 'senha1234', nascimento, aceiteTermos: '2026-11-adesao-v11' }),
  });
  return { status: r.status, data: await r.json() };
}

test('cadastro: data de nascimento obrigatória e menor de 18 anos recusado', async () => {
  const sem = await signupPessoa('semdata', null);
  assert.equal(sem.status, 400);
  assert.match(sem.data.error, /data de nascimento/);
  const menor = await signupPessoa('menor1', '2012-03-01');
  assert.equal(menor.status, 400);
  assert.match(menor.data.error, /menores de 18/);
  assert.equal(db.prepare('SELECT 1 FROM users WHERE username = ?').get('menor1'), undefined, 'menor não é gravado');
  assert.equal((await signupPessoa('dataruim', '31/02/1990')).status, 400);
  const adulto = await signupPessoa('adulto1', '10/05/1990');
  assert.equal(adulto.status, 201);
  const linha = db.prepare('SELECT nascimento, maior_idade FROM users WHERE username = ?').get('adulto1');
  assert.equal(linha.nascimento, '1990-05-10');
  assert.equal(linha.maior_idade, 1);
});

test('bebida alcoólica tem maioridade marcada pelo servidor, mesmo se o cliente mandar false', async () => {
  const lista = await api('GET', '/products?classe=bar', { auth: false });
  const chope = lista.data.find((p) => p.name === 'Chope Pilsen 300ml');
  assert.equal(chope.maioridade, true);
  const r = await api('POST', '/products', { body: { name: 'Vinho tinto', price: 60, stock: 5, classe: 'bar', subclasse: 'vinhos', maioridade: false } });
  assert.equal(r.data.maioridade, true);
  const suco = await api('POST', '/products', { body: { name: 'Suco de laranja', price: 8, stock: 5, classe: 'bebidas', subclasse: 'refrigerantes', maioridade: true } });
  assert.equal(suco.data.maioridade, false, 'maioridade só vale para bebida alcoólica');
});

test('pedido de bebida alcoólica é recusado sem maioridade confirmada', async () => {
  const lista = await api('GET', '/products?classe=bar', { auth: false });
  const chope = lista.data.find((p) => p.name === 'Chope Pilsen 300ml');
  const comprador = await signupPessoa('comprador1', '1990-05-10', '111.444.777-35');
  const tok = comprador.data.accessToken;
  const pedir = () =>
    fetch(base + '/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ items: [{ productId: chope.id, qty: 1 }] }) });
  db.prepare('UPDATE users SET maior_idade = 0 WHERE username = ?').run('comprador1');
  const recusado = await pedir();
  assert.equal(recusado.status, 403);
  assert.match((await recusado.json()).error, /maiores de 18/);
  db.prepare('UPDATE users SET maior_idade = 1 WHERE username = ?').run('comprador1');
  const liberado = await pedir();
  assert.notEqual(liberado.status, 403, 'com maioridade confirmada, o bloqueio não se aplica');
});
