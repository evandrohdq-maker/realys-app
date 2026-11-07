// Testes do cadastro biométrico, da criptografia e da manutenção (com um serviço de IA falso).
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { makeCipher, parseKeys } from '../src/crypto.js';
import { CONSENT_VERSION } from '../src/biometria/service.js';

const K1 = randomBytes(32).toString('hex');
const K2 = randomBytes(32).toString('hex');

// Serviço de IA falso: o "rosto" é descoberto pelo texto dentro da imagem.
const fakeMatcher = {
  ready: true,
  async embed(buf) {
    const s = buf.toString();
    if (s.includes('ROSTO-A')) return Float32Array.from([1, 0, 0, 0]);
    if (s.includes('ROSTO-B')) return Float32Array.from([0, 1, 0, 0]);
    if (s.includes('ROSTO-C')) return Float32Array.from([0.99, 0.05, 0, 0]); // quase igual ao A: duplicado
    return null;
  },
  async liveness(buf) {
    return buf.toString().includes('FOTO-IMPRESSA') ? { live: false, score: 0.1 } : { live: true, score: 0.97 };
  },
  async health() { return { ok: true, model: 'fake', device: 'cpu' }; },
};

let app, base, dir;
const S = {};

const CPFS = ['529.982.247-25', '111.444.777-35', '123.456.789-09', '987.654.321-00'];

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-bio-'));
  app = createApp(loadConfig({
    dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345',
    biometricKeys: `1:${K1}`, matcher: fakeMatcher, backupDir: join(dir, 'backups'),
  }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function api(method, path, { who, body, raw, type } = {}) {
  const h = {};
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (type) h['Content-Type'] = type;
  const res = await fetch(base + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data };
}

async function person(key, cpf, username) {
  const d = await api('POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Pessoa ' + key, doc: cpf, username, email: `${username}@realys.com`, password: 'senha1234' } });
  assert.equal(d.status, 201, JSON.stringify(d.data));
  S[key] = { token: d.data.accessToken, id: d.data.user.id };
}

async function upload(who, content) {
  const r = await api('PUT', '/media', { who, raw: Buffer.from(content), type: 'image/jpeg' });
  assert.ok(r.status < 300, JSON.stringify(r.data));
  return r.data.id;
}

test('criptografia: ida e volta, e detecta chave trocada', () => {
  const c = makeCipher(parseKeys(`1:${K1}`));
  const sealed = c.seal(Buffer.from('vetor secreto'));
  assert.ok(!sealed.includes('vetor secreto'));
  assert.equal(c.open(sealed).toString(), 'vetor secreto');
  assert.equal(c.needsRewrap(sealed), false);
  const c2 = makeCipher(parseKeys(`1:${K1},2:${K2}`));
  assert.equal(c2.needsRewrap(sealed), true);
  assert.equal(c2.open(sealed).toString(), 'vetor secreto');
  assert.throws(() => makeCipher(parseKeys(`1:${K1}`)).open(makeCipher(parseKeys(`9:${K2}`)).seal(Buffer.from('x'))));
  assert.throws(() => parseKeys('1:curta'));
});

test('consentimento é obrigatório e precisa da versão atual do termo', async () => {
  await person('ana', CPFS[0], 'ana');
  const sem = await api('POST', '/biometria/envio', { who: 'ana', body: { selfie: 'x', doc: 'y' } });
  assert.equal(sem.status, 403);
  const velho = await api('POST', '/biometria/consentimento', { who: 'ana', body: { version: '1999' } });
  assert.equal(velho.status, 400);
  const ok = await api('POST', '/biometria/consentimento', { who: 'ana', body: { version: CONSENT_VERSION } });
  assert.equal(ok.data.status, 'pendente');
});

test('cadastro verdadeiro é aprovado, guardado cifrado e as fotos são apagadas', async () => {
  const selfie = await upload('ana', 'ROSTO-A selfie');
  const doc = await upload('ana', 'ROSTO-A documento');
  const r = await api('POST', '/biometria/envio', { who: 'ana', body: { selfie, doc } });
  assert.equal(r.data.status, 'aprovado', JSON.stringify(r.data));
  assert.equal((await api('GET', `/media/${selfie}`)).status, 404);
  assert.equal((await api('GET', `/media/${doc}`)).status, 404);
  const row = app.db.prepare('SELECT template FROM biometria WHERE user_id = ?').get(S.ana.id);
  assert.ok(row.template.startsWith('v1.1.'));
});

test('mesmo rosto em outro cadastro vai para revisão (possível duplicado)', async () => {
  await person('bia', CPFS[1], 'bia');
  await api('POST', '/biometria/consentimento', { who: 'bia', body: { version: CONSENT_VERSION } });
  const selfie = await upload('bia', 'ROSTO-C selfie');
  const doc = await upload('bia', 'ROSTO-C documento');
  const r = await api('POST', '/biometria/envio', { who: 'bia', body: { selfie, doc } });
  assert.equal(r.data.status, 'em_analise');
  assert.match(r.data.reason, /duplicado/);
});

test('rosto que não bate com o documento vai para revisão', async () => {
  await person('caio', CPFS[2], 'caio');
  await api('POST', '/biometria/consentimento', { who: 'caio', body: { version: CONSENT_VERSION } });
  const selfie = await upload('caio', 'ROSTO-B selfie');
  const doc = await upload('caio', 'ROSTO-A documento');
  const r = await api('POST', '/biometria/envio', { who: 'caio', body: { selfie, doc } });
  assert.equal(r.data.status, 'em_analise');
  assert.match(r.data.reason, /não bate/);
});

test('foto de foto impressa é recusada pela prova de vida', async () => {
  await person('dani', CPFS[3], 'dani');
  await api('POST', '/biometria/consentimento', { who: 'dani', body: { version: CONSENT_VERSION } });
  const selfie = await upload('dani', 'ROSTO-A FOTO-IMPRESSA');
  const doc = await upload('dani', 'ROSTO-A documento');
  const r = await api('POST', '/biometria/envio', { who: 'dani', body: { selfie, doc } });
  assert.equal(r.data.status, 'recusado');
});

test('equipe revisa a fila e decide; recusa exige motivo', async () => {
  const adm = await api('POST', '/auth/login', { body: { login: 'chefe', password: 'Admin12345' } });
  S.adm = { token: adm.data.accessToken };
  const fila = await api('GET', '/admin/biometria?status=em_analise', { who: 'adm' });
  assert.equal(fila.data.length, 2);
  const bia = fila.data.find((x) => x.name === 'Pessoa bia');
  assert.equal((await api('POST', `/admin/biometria/${bia.id}/recusar`, { who: 'adm', body: {} })).status, 400);
  assert.equal((await api('POST', `/admin/biometria/${bia.id}/recusar`, { who: 'adm', body: { reason: 'Documento e rosto de pessoas diferentes' } })).status, 200);
  assert.equal((await api('POST', `/admin/biometria/${bia.id}/aprovar`, { who: 'adm', body: {} })).status, 409);
});

test('revogação apaga o vetor e a pessoa pode cadastrar de novo', async () => {
  const r = await api('DELETE', '/biometria', { who: 'ana' });
  assert.equal(r.data.status, 'revogado');
  const row = app.db.prepare('SELECT template FROM biometria WHERE user_id = ?').get(S.ana.id);
  assert.equal(row.template, null);
  const outra = app.biometria.approvedTemplates('x').length;
  assert.equal(outra, 0);
});

test('manutenção: integridade, backup, retenção e rotação de chave', async () => {
  const m = app.maintenance;
  const integ = await m.run('integridade');
  assert.equal(integ.ok, true, JSON.stringify(integ));
  const bk = await m.run('backup');
  assert.equal(bk.ok, true);
  assert.ok(readdirSync(join(dir, 'backups')).some((f) => f.endsWith('.db')));
  assert.equal((await m.run('retencao')).ok, true);
  const rot = await m.run('rotacao-chaves');
  assert.equal(rot.ok, true);
  assert.equal((await m.run('servico-biometria')).result.modelo, 'fake');
  assert.equal((await m.run('nao-existe').catch((e) => e)).status, 404);
  const hist = await api('GET', '/admin/manutencao', { who: 'adm' });
  assert.ok(hist.data.length >= 5);
});

test('produtos do mercado: seção validada, filtrada e editável', async () => {
  const comp = await api('POST', '/auth/signup', { body: { kind: 'empresa', name: 'Mercadinho Teste', doc: '11.222.333/0001-81', username: 'mercadinho', email: 'loja@realys.com', password: 'senha1234', segment: 'Mercado de bairro' } });
  assert.equal(comp.status, 201, JSON.stringify(comp.data));
  S.loja = { token: comp.data.accessToken, id: comp.data.user.id };
  const bad = await api('POST', '/products', { who: 'loja', body: { name: 'Coisa', price: 5, secao: 'eletronicos' } });
  assert.equal(bad.status, 400);
  const ok = await api('POST', '/products', { who: 'loja', body: { name: 'Tomate 1kg', price: 7.9, stock: 10, secao: 'hortifruti' } });
  assert.equal(ok.status, 201, JSON.stringify(ok.data));
  assert.equal(ok.data.secao, 'hortifruti');
  const id = ok.data.id;
  await api('PATCH', `/products/${id}`, { who: 'loja', body: { secao: 'frios' } });
  const list = await api('GET', '/products?secao=frios');
  assert.ok(list.data.some((p) => p.id === id));
  assert.ok(!(await api('GET', '/products?secao=hortifruti')).data.some((p) => p.id === id));
});
