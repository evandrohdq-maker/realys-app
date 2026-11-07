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
    const mov = /MOV=([\d.]+)/.exec(s);
    if (s.includes('ROSTO-A')) return Float32Array.from([1, mov ? Number(mov[1]) : 0, 0, 0]); // MOV = movimento entre fotos do scan
    if (s.includes('ROSTO-B')) return Float32Array.from([0, 1, mov ? Number(mov[1]) : 0, 0]);
    if (s.includes('ROSTO-C')) return Float32Array.from([0.99, 0.05, 0, 0]); // quase igual ao A: duplicado
    if (s.includes('ROSTO-D')) return Float32Array.from([0, 0, 1, mov ? Number(mov[1]) : 0]); // outra pessoa, sem parecido com as demais
    return null;
  },
  async liveness(buf) {
    return buf.toString().includes('FOTO-IMPRESSA') ? { live: false, score: 0.1 } : { live: true, score: 0.97 };
  },
  async scan({ videos, photos }) {
    const txt = photos.map((p) => p.toString()).join(' ');
    const live = !txt.includes('IMPRESSA');
    const movement = !videos.some((v) => v.toString().includes('PARADA'));
    const e = await this.embed(photos[0]);
    const e2 = await this.embed(photos[1]);
    const media = e && e2 ? Array.from(e).map((x, i) => (x + e2[i]) / 2) : null;
    return { live, movement, embedding: media, faces: 2 };
  },
  async docQuality(buf) {
    const t = buf.toString();
    if (t.includes('DOC-BORRADO')) return { legivel: false, motivo: 'Foto do documento borrada.' };
    if (t.includes('DOC-REFLEXO')) return { legivel: false, motivo: 'Há reflexo sobre o documento.' };
    return { legivel: true, motivo: null };
  },
  async health() { return { ok: true, model: 'fake', device: 'cpu' }; },
};

// Scan: 2 vídeos de 3 s + 2 fotos (aproximado e afastado), em base64, como o app envia.
const b64 = (t) => Buffer.from(t).toString('base64');
const scanBody = (tag, { parada = false, impressa = false } = {}) => ({
  videos: [b64(parada ? `${tag} PARADA` : `${tag} MOVIMENTO`), b64(parada ? `${tag} PARADA` : `${tag} MOVIMENTO`)],
  photos: [b64(`${tag} MOV=0.1${impressa ? ' IMPRESSA' : ''}`), b64(`${tag} MOV=0.3${impressa ? ' IMPRESSA' : ''}`)],
});

let app, base, dir;
const S = {};

const DOC = { tipo: 'cnh', emissao: '2024-01-10', validade: '2034-01-10' };
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
  const d = await api('POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Pessoa ' + key, doc: cpf, username, email: `${username}@realys.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2' } });
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

test('foto do documento borrada ou com reflexo é recusada e o cadastro continua pendente', async () => {
  const selfie = await upload('ana', 'ROSTO-A selfie');
  const borrada = await upload('ana', 'ROSTO-A DOC-BORRADO');
  const r1 = await api('POST', '/biometria/envio', { who: 'ana', body: { selfie, doc: borrada, documento: DOC } });
  assert.equal(r1.status, 400);
  assert.equal(r1.data.code, 'documento_ilegivel');
  const refl = await upload('ana', 'ROSTO-A DOC-REFLEXO');
  const r2 = await api('POST', '/biometria/envio', { who: 'ana', body: { selfie, doc: refl, documento: DOC } });
  assert.equal(r2.data.code, 'documento_ilegivel');
  assert.match(r2.data.error, /reflexo/);
});

test('cadastro verdadeiro é aprovado, guardado cifrado e as fotos são apagadas', async () => {
  const selfie = await upload('ana', 'ROSTO-A selfie');
  const doc = await upload('ana', 'ROSTO-A documento');
  const r = await api('POST', '/biometria/envio', { who: 'ana', body: { selfie, doc, documento: DOC } });
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
  const r = await api('POST', '/biometria/envio', { who: 'bia', body: { selfie, doc, documento: DOC } });
  assert.equal(r.data.status, 'em_analise');
  assert.match(r.data.reason, /duplicado/);
});

test('rosto que não bate com o documento vai para revisão', async () => {
  await person('caio', CPFS[2], 'caio');
  await api('POST', '/biometria/consentimento', { who: 'caio', body: { version: CONSENT_VERSION } });
  const selfie = await upload('caio', 'ROSTO-B selfie');
  const doc = await upload('caio', 'ROSTO-A documento');
  const r = await api('POST', '/biometria/envio', { who: 'caio', body: { selfie, doc, documento: DOC } });
  assert.equal(r.data.status, 'em_analise');
  assert.match(r.data.reason, /não bate/);
});

test('foto de foto impressa é recusada pela prova de vida', async () => {
  await person('dani', CPFS[3], 'dani');
  await api('POST', '/biometria/consentimento', { who: 'dani', body: { version: CONSENT_VERSION } });
  const selfie = await upload('dani', 'ROSTO-A FOTO-IMPRESSA');
  const doc = await upload('dani', 'ROSTO-A documento');
  const r = await api('POST', '/biometria/envio', { who: 'dani', body: { selfie, doc, documento: DOC } });
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
  const comp = await api('POST', '/auth/signup', { body: { kind: 'empresa', name: 'Mercadinho Teste', doc: '11.222.333/0001-81', username: 'mercadinho', email: 'loja@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2', segment: 'Mercado de bairro' } });
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

test('verificação do dia a dia: aceite, finalização e checagem a cada 2 h para quem roda em transporte', async () => {
  // Motorista aprovado e sem verificação recente: não fica disponível.
  await person('moto', '000.000.001-91', 'motorista');
  await api('PUT', '/providers/me', { who: 'moto', body: { service: 'motorista', functions: ['Corridas'], price: 8, priceUnit: 'corrida' } });
  const cadastro = await api('POST', '/biometria/consentimento', { who: 'moto', body: { version: CONSENT_VERSION } });
  assert.equal(cadastro.status, 200);
  const selfie = await upload('moto', 'ROSTO-A selfie');
  const doc = await upload('moto', 'ROSTO-A documento');
  assert.equal((await api('POST', '/biometria/envio', { who: 'moto', body: { selfie, doc, documento: DOC } })).data.status, 'aprovado');

  const sem = await api('POST', '/providers/me/location', { who: 'moto', body: { lat: -23.55, lng: -46.63 } });
  assert.equal(sem.status, 403);
  assert.equal(sem.data.code, 'verificacao_periodica');

  // Verificação com a foto de quem é o cadastro: libera.
  const v = await api('POST', '/biometria/verificar?purpose=periodica', { who: 'moto', raw: Buffer.from('ROSTO-A agora'), type: 'image/jpeg' });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal((await api('POST', '/providers/me/location', { who: 'moto', body: { lat: -23.55, lng: -46.63 } })).status, 200);

  // Foto de outra pessoa: recusada, e nenhuma verificação é criada.
  const outro = await api('POST', '/biometria/verificar?purpose=aceite&callId=x', { who: 'moto', raw: Buffer.from('ROSTO-B'), type: 'image/jpeg' });
  assert.equal(outro.status, 403);
  assert.equal(outro.data.code, 'rosto_nao_confere');

  // Foto impressa: recusada pela prova de vida.
  const impressa = await api('POST', '/biometria/verificar?purpose=periodica', { who: 'moto', raw: Buffer.from('ROSTO-A FOTO-IMPRESSA'), type: 'image/jpeg' });
  assert.equal(impressa.status, 403);

  // Verificação vencida (mais de 2 h): fica indisponível de novo.
  app.db.prepare('UPDATE biometria SET last_verified_at = ? WHERE user_id = ?').run(Date.now() - 3 * 3600000, S.moto.id);
  const vencida = await api('POST', '/providers/me/location', { who: 'moto', body: { lat: -23.55, lng: -46.63 } });
  assert.equal(vencida.data.code, 'verificacao_periodica');
  assert.equal(app.db.prepare('SELECT available FROM providers WHERE user_id = ?').get(S.moto.id).available, 0);

  // Aceite: uma verificação vale uma vez só e só para o chamado indicado.
  await api('POST', '/biometria/verificar?purpose=periodica', { who: 'moto', raw: Buffer.from('ROSTO-A'), type: 'image/jpeg' });
  await api('POST', '/providers/me/location', { who: 'moto', body: { lat: -23.55, lng: -46.63 } });
  await person('cli', '222.333.444-05', 'cliente');
  const chamado = await api('POST', '/calls', { who: 'cli', body: { providerId: S.moto.id, address: 'Av. Paulista, 1000' } });
  assert.equal(chamado.status, 201, JSON.stringify(chamado.data));
  const semAceite = await api('PATCH', `/calls/${chamado.data.id}`, { who: 'moto', body: { status: 'Aceito' } });
  assert.equal(semAceite.status, 403);
  assert.equal(semAceite.data.code, 'verificacao_facial');
  const va = await api('POST', `/biometria/verificar?purpose=aceite&callId=${chamado.data.id}`, { who: 'moto', raw: Buffer.from('ROSTO-A'), type: 'image/jpeg' });
  assert.equal(va.status, 200);
  assert.equal((await api('PATCH', `/calls/${chamado.data.id}`, { who: 'moto', body: { status: 'Aceito' } })).status, 200);
  assert.equal((await api('PATCH', `/calls/${chamado.data.id}`, { who: 'moto', body: { status: 'Concluído' } })).status, 403); // finalização exige a sua verificação
  await api('POST', `/biometria/verificar?purpose=finalizacao&callId=${chamado.data.id}`, { who: 'moto', raw: Buffer.from('ROSTO-A'), type: 'image/jpeg' });
  assert.equal((await api('PATCH', `/calls/${chamado.data.id}`, { who: 'moto', body: { status: 'Concluído' } })).status, 200);
});

test('limiar de 80%: abaixo disso recusa, a partir disso aprova (cosseno)', async () => {
  const { similarity } = await import('../src/biometria/matcher.js');
  const a = Float32Array.from([1, 0]);
  assert.ok(similarity(a, Float32Array.from([0.85, 0.5268])) >= 0.8);  // 85% aprova
  assert.ok(similarity(a, Float32Array.from([0.75, 0.6614])) < 0.8);   // 75% reprova
});

test('aparelho novo: confere o rosto (sem refazer cadastro) antes da senha; saque exige checagem', async () => {
  // Usuário já cadastrado (motorista de teste) entra num aparelho novo.
  const login = await api('POST', '/auth/login', { body: { login: 'motorista', password: 'senha1234', deviceKey: 'aparelho-novo-1', device: 'Celular novo' } });
  assert.equal(login.status, 403);
  assert.equal(login.data.code, 'biometria_aparelho');

  // Rosto errado: não libera.
  const errado = await api('POST', '/auth/aparelho/verificar?login=motorista&deviceKey=aparelho-novo-1', { raw: Buffer.from('ROSTO-B'), type: 'image/jpeg' });
  assert.equal(errado.status, 403);

  // Rosto certo: devolve código; login com código entra e registra o aparelho.
  const certo = await api('POST', '/auth/aparelho/verificar?login=motorista&deviceKey=aparelho-novo-1', { raw: Buffer.from('ROSTO-A'), type: 'image/jpeg' });
  assert.equal(certo.status, 200, JSON.stringify(certo.data));
  const entrou = await api('POST', '/auth/login', { body: { login: 'motorista', password: 'senha1234', deviceKey: 'aparelho-novo-1', device: 'Celular novo', aparelhoToken: certo.data.aparelhoToken } });
  assert.equal(entrou.status, 200, JSON.stringify(entrou.data));
  // O código vale uma vez.
  const reuso = await api('POST', '/auth/login', { body: { login: 'motorista', password: 'senha1234', deviceKey: 'aparelho-novo-2', aparelhoToken: certo.data.aparelhoToken } });
  assert.equal(reuso.status, 403);
  // Aparelho já conhecido: entra só com usuário e senha.
  const conhecido = await api('POST', '/auth/login', { body: { login: 'motorista', password: 'senha1234', deviceKey: 'aparelho-novo-1' } });
  assert.equal(conhecido.status, 200);

  // Saque: sem checagem do rosto, recusado.
  const saque = await api('POST', '/wallet/withdraw', { who: 'moto', body: { amount: 10, pixKey: '000.000.001-91' } });
  assert.equal(saque.status, 403);
  assert.equal(saque.data.code, 'verificacao_facial');
});

test('documento: só identidade válida; vencido e emitido há mais de 10 anos são recusados', async () => {
  await person('eva', '321.654.987-91', 'eva');
  await api('POST', '/biometria/consentimento', { who: 'eva', body: { version: CONSENT_VERSION } });
  const selfie = await upload('eva', 'ROSTO-A selfie');
  const doc = await upload('eva', 'ROSTO-A documento');
  const tipoErrado = await api('POST', '/biometria/envio', { who: 'eva', body: { selfie, doc, documento: { tipo: 'comprovante', emissao: '2024-01-10' } } });
  assert.equal(tipoErrado.data.code, 'documento_invalido');
  const vencido = await api('POST', '/biometria/envio', { who: 'eva', body: { selfie, doc, documento: { tipo: 'cnh', emissao: '2020-01-10', validade: '2021-01-10' } } });
  assert.equal(vencido.data.code, 'documento_vencido');
  const antigo = await api('POST', '/biometria/envio', { who: 'eva', body: { selfie, doc, documento: { tipo: 'rg', emissao: '2010-01-10' } } });
  assert.equal(antigo.data.code, 'documento_antigo');
  // Carteira de conselho profissional (ex.: CRM) vale como documento próprio.
  const crm = await api('POST', '/biometria/envio', { who: 'eva', body: { selfie, doc, documento: { tipo: 'conselho', emissao: '2025-03-01', validade: '2030-03-01' } } });
  assert.equal(crm.status, 200, JSON.stringify(crm.data));
});

test('scan do dia a dia: movimento e rosto certo verificam; vídeo parado e rosto errado não', async () => {
  const ok1 = await api('POST', '/biometria/verificar-scan?purpose=periodica', { who: 'moto', body: scanBody('ROSTO-A') });
  assert.equal(ok1.status, 200, JSON.stringify(ok1.data));
  const r2 = await api('POST', '/biometria/verificar-scan?purpose=periodica', { who: 'moto', body: scanBody('ROSTO-A', { parada: true }) });
  assert.equal(r2.data.code, 'prova_de_vida');
  const impressa = await api('POST', '/biometria/verificar-scan?purpose=periodica', { who: 'moto', body: scanBody('ROSTO-A', { impressa: true }) });
  assert.equal(impressa.data.code, 'prova_de_vida');
  const r3 = await api('POST', '/biometria/verificar-scan?purpose=periodica', { who: 'moto', body: scanBody('ROSTO-B') });
  assert.equal(r3.data.code, 'rosto_nao_confere');
  const incompleto = await api('POST', '/biometria/verificar-scan?purpose=periodica', { who: 'moto', body: { videos: [b64('x')], photos: [b64('y')] } });
  assert.equal(incompleto.status, 400);
});

test('termo de adesão: publicado, e o cadastro exige o aceite', async () => {
  const t = await api('GET', '/termos/adesao');
  assert.equal(t.status, 200);
  assert.equal(t.data.versao, '2026-11-adesao-v2');
  const semAceite = await api('POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Sem Termo', doc: '000.000.001-91', username: 'semtermo', email: 's@realys.com', password: 'senha1234' } });
  assert.equal(semAceite.status, 400);
  assert.equal(semAceite.data.code, 'termos');
});

test('cadastro por scan: o scan não é guardado; cadastro aprovado com documento compatível', async () => {
  await person('gil', '555.666.777-20', 'gilmar');
  await api('POST', '/biometria/consentimento', { who: 'gil', body: { version: CONSENT_VERSION } });
  const doc = await upload('gil', 'ROSTO-D documento');
  const r = await api('POST', '/biometria/envio-scan', { who: 'gil', body: { ...scanBody('ROSTO-D'), doc, documento: DOC } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.status, 'aprovado');
  assert.equal((await api('GET', `/media/${doc}`)).status, 404); // documento apagado depois da decisão
});
