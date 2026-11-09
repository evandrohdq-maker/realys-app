import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { isGovEmail, sameName } from '../src/routes/credentials.js';

let app, base, dir, token, admin;
const sent = [];
async function api(method, path, { body, tk } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (tk) h.Authorization = `Bearer ${tk}`;
  const r = await fetch(base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-cred-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x', adminPassword: 'admin12345', adminUsername: 'admin', mail: { ready: true, send: async (m) => (sent.push(m), { sent: true }) }, cfm: { ready: false, check: async () => ({ status: 'nao_configurado' }) }, conselhos: { ready: true, check: async ({ numero }) => (numero === '06/12345' ? { status: 'ativo', nome: 'Ana Paula Souza', situacao: 'Ativo' } : numero === '06/99999' ? { status: 'ativo', nome: 'Outra Pessoa' } : { status: 'nao_encontrado' }) } }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const s = await api('POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Ana Paula Souza', doc: '529.982.247-25', username: 'anapaula', email: 'ana@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v14' } });
  token = s.data.accessToken;
  const a = await api('POST', '/auth/login', { body: { login: 'admin', password: 'admin12345' } });
  admin = a.data.accessToken;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('regras: e-mail institucional e nome', () => {
  assert.ok(isGovEmail('ana.souza@bm.rs.gov.br'));
  assert.ok(isGovEmail('fulano@tjsp.jus.br'));
  assert.ok(!isGovEmail('ana@gmail.com'));
  assert.ok(!isGovEmail('ana@gov.br.com'));
  assert.ok(sameName('ANA PAULA SOUZA', 'Ana Paula Souza'));
  assert.ok(!sameName('Maria Souza', 'Ana Paula Souza'));
});

test('carteira de policial: e-mail institucional com código e aprovação do administrador', async () => {
  const c = await api('POST', '/credenciais', { tk: token, body: { prof: 'policial', numero: '12345', uf: 'RS', orgao: 'Brigada Militar', nomeCarteira: 'Ana Paula Souza' } });
  assert.equal(c.status, 201);
  assert.equal(c.data.nomeConfere, true);
  assert.equal(c.data.gov, true);
  assert.equal(c.data.discreto, true); // servidor público começa em sigilo
  assert.equal((await api('POST', `/credenciais/${c.data.id}/email`, { tk: token, body: { email: 'ana@gmail.com' } })).status, 400);
  assert.equal((await api('POST', `/credenciais/${c.data.id}/email`, { tk: token, body: { email: 'ana.souza@bm.rs.gov.br' } })).status, 200);
  const code = sent[sent.length - 1].text.match(/\d{6}/)[0];
  assert.equal((await api('POST', `/credenciais/${c.data.id}/email/confirmar`, { tk: token, body: { codigo: '000000' === code ? '111111' : '000000' } })).status, 400);
  const ok = await api('POST', `/credenciais/${c.data.id}/email/confirmar`, { tk: token, body: { codigo: code } });
  assert.equal(ok.data.emailOk, true);
  assert.equal((await api('POST', `/credenciais/${c.data.id}/casos`, { tk: token, body: { on: true } })).status, 403); // ainda em análise
  const fila = await api('GET', '/admin/credenciais', { tk: admin });
  assert.equal(fila.data.items.length, 1);
  assert.equal((await api('POST', `/admin/credenciais/${c.data.id}/aprovar`, { tk: admin })).data.status, 'aprovado');
  assert.equal((await api('POST', `/credenciais/${c.data.id}/casos`, { tk: token, body: { on: true } })).data.recebeCasos, true);
  const pub = await api('GET', `/users/${c.data.id.replace(/.*/, '')}x/credenciais`, { tk: token });
  assert.equal(pub.status, 200);
});

test('psicólogo: consulta no conselho devolve positivo, negativo ou nome diferente', async () => {
  const ok = await api('POST', '/credenciais', { tk: token, body: { prof: 'psicologo', numero: '06/12345', uf: 'SP' } });
  assert.equal(ok.data.conselho, 'ativo');
  const no = await api('POST', '/credenciais', { tk: token, body: { prof: 'psicologo', numero: '06/00000', uf: 'SP' } });
  assert.equal(no.data.conselho, 'nao_encontrado');
  const other = await api('POST', '/credenciais', { tk: token, body: { prof: 'psicologo', numero: '06/99999', uf: 'SP' } });
  assert.equal(other.data.conselho, 'nome_diferente');
});
