// Visualização única e em duas vezes: quem recebe abre o número de vezes escolhido por quem mandou,
// o endereço do arquivo não aparece na conversa e, quando acabam as vezes, o arquivo é apagado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-vistas-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function req(method, path, token, body, headers) {
  const raw = Buffer.isBuffer(body);
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) }, body: raw ? body : body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}
async function call(method, path, token, body, headers) {
  const r = await req(method, path, token, body, headers);
  if (r.status >= 400) throw new Error(`${r.status} ${r.data.error}`);
  return r.data;
}
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const foto = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1500, n)]);
const subir = (token, n) => call('PUT', '/media?uso=privado', token, foto(n), { 'Content-Type': 'image/jpeg' });

let ana, beto;
test('visualização única: abre uma vez e o arquivo some', async () => {
  ana = await pessoa('Ana Vista', '52998224725', 'anavista');
  beto = await pessoa('Beto Vista', '11144477735', 'betovista');
  await call('POST', `/friends/${beto.user.id}`, ana.accessToken);
  await call('POST', `/friends/${ana.user.id}`, beto.accessToken);

  const up = await subir(ana.accessToken, 1);
  const msg = await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: up.url, mediaType: 'foto', visualizacao: 'unica' });
  assert.equal(msg.media, null, 'quem manda não recebe o endereço de volta');
  assert.deepEqual(msg.efemera, { max: 1, vistas: 0, restam: 1 });

  // Na conversa (dos dois lados) o endereço não aparece.
  const lista = await call('GET', `/messages/${ana.user.id}`, beto.accessToken);
  const m = lista.find((x) => x.id === msg.id);
  assert.equal(m.media, null);
  assert.equal(m.efemera.restam, 1);
  assert.equal(m.mediaType, 'foto');

  // Quem mandou não pode abrir.
  assert.equal((await req('POST', `/messages/${msg.id}/abrir`, ana.accessToken)).status, 404);

  const aberta = await call('POST', `/messages/${msg.id}/abrir`, beto.accessToken);
  assert.equal(aberta.media, up.url);
  assert.equal(aberta.efemera.restam, 0);
  // Arquivo sem cópia no cache do celular.
  const arq = await req('GET', up.url);
  assert.equal(arq.status, 200);
  assert.match(arq.headers.get('cache-control'), /no-store/);

  // Segunda vez: não abre.
  assert.equal((await req('POST', `/messages/${msg.id}/abrir`, beto.accessToken)).status, 410);

  // Fechou a tela: o arquivo é apagado do servidor.
  const f = await call('POST', `/messages/${msg.id}/fechar`, beto.accessToken);
  assert.equal(f.apagada, true);
  assert.equal(existsSync(join(dir, 'media', up.id)), false);
  assert.equal((await req('GET', up.url)).status, 404);
  const depois = (await call('GET', `/messages/${beto.user.id}`, ana.accessToken)).find((x) => x.id === msg.id);
  assert.deepEqual(depois.efemera, { max: 1, vistas: 1, restam: 0 });

  // Lista de conversas mostra o rótulo.
  const conv = await call('GET', '/conversations', ana.accessToken);
  assert.match(conv[0].last.text, /visualização única/);
});

test('duas vezes: abre duas, apaga na segunda; sem limite continua como antes', async () => {
  const up = await subir(ana.accessToken, 2);
  const msg = await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: up.url, mediaType: 'foto', visualizacao: 'duas' });
  const v1 = await call('POST', `/messages/${msg.id}/abrir`, beto.accessToken);
  assert.equal(v1.efemera.restam, 1);
  assert.equal((await call('POST', `/messages/${msg.id}/fechar`, beto.accessToken)).apagada, false);
  assert.ok(existsSync(join(dir, 'media', up.id)), 'ainda falta uma vista');
  const v2 = await call('POST', `/messages/${msg.id}/abrir`, beto.accessToken);
  assert.equal(v2.efemera.restam, 0);
  await call('POST', `/messages/${msg.id}/fechar`, beto.accessToken);
  assert.equal(existsSync(join(dir, 'media', up.id)), false);

  // Sem limite: o endereço vai na conversa, como sempre foi.
  const up3 = await subir(ana.accessToken, 3);
  const livre = await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: up3.url, mediaType: 'foto', visualizacao: 'livre' });
  assert.equal(livre.media, up3.url);
  assert.equal(livre.efemera, undefined);
});

test('última vista sem fechar a tela: o arquivo some pelo prazo', async () => {
  const up = await subir(ana.accessToken, 4);
  const msg = await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: up.url, mediaType: 'foto', visualizacao: 'unica' });
  await call('POST', `/messages/${msg.id}/abrir`, beto.accessToken);
  app.db.prepare('UPDATE messages SET apagar_em = ? WHERE id = ?').run(Date.now() - 1, msg.id);
  await call('GET', `/messages/${ana.user.id}`, beto.accessToken);
  assert.equal(existsSync(join(dir, 'media', up.id)), false);
});

test('não dá para usar visualização única com arquivo de outra pessoa ou já usado', async () => {
  const deBeto = await subir(beto.accessToken, 5);
  const r1 = await req('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: deBeto.url, mediaType: 'foto', visualizacao: 'unica' });
  assert.equal(r1.status, 400);
  const up = await subir(ana.accessToken, 6);
  await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: up.url, mediaType: 'foto' });
  const r2 = await req('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: up.url, mediaType: 'foto', visualizacao: 'unica' });
  assert.equal(r2.status, 400);
  assert.ok(existsSync(join(dir, 'media', up.id)), 'a foto já enviada sem limite continua guardada');
});

test('foto repetida: apagar a de visualização única não apaga a cópia guardada por outra mensagem', async () => {
  const igual = foto(7);
  const a = await call('PUT', '/media?uso=privado', beto.accessToken, igual, { 'Content-Type': 'image/jpeg' });
  await call('POST', '/messages', beto.accessToken, { toId: ana.user.id, media: a.url, mediaType: 'foto' });
  const b = await call('PUT', '/media?uso=privado', ana.accessToken, igual, { 'Content-Type': 'image/jpeg' });
  assert.equal(b.repetido, true);
  const msg = await call('POST', '/messages', ana.accessToken, { toId: beto.user.id, media: b.url, mediaType: 'foto', visualizacao: 'unica' });
  await call('POST', `/messages/${msg.id}/abrir`, beto.accessToken);
  await call('POST', `/messages/${msg.id}/fechar`, beto.accessToken);
  assert.equal((await req('GET', a.url)).status, 200, 'a outra mensagem continua com a foto');
});
