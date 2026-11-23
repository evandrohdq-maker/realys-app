// Perfil de trabalho com CNPJ do próprio CPF: sem ele, nada de prestar serviço nem vender como artista.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir, token;
const receita = {
  '11222333000181': { razao_social: '11.222.333 ANA TRABALHO', descricao_situacao_cadastral: 'ATIVA', qsa: [] },
  '11444777000161': { razao_social: 'OUTRA PESSOA LTDA', descricao_situacao_cadastral: 'ATIVA', qsa: [{ nome_socio: 'FULANO', cnpj_cpf_do_socio: '***111111**' }] },
};
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realyz-trab-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', exigirCnpjTrabalho: true, consultaCnpj: async (c) => receita[c] || { naoExiste: true } }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const api = async (method, path, body) => {
  const h = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

test('sem CNPJ não vira prestador; CNPJ de outra pessoa é recusado; o próprio libera', async () => {
  token = (await api('POST', '/auth/signup', { kind: 'pessoa', name: 'Ana Trabalho', doc: '529.982.247-25', username: 'anatrab', email: 'anatrab@x.com', password: 'senha1234', nascimento: '1990-01-01', aceiteTermos: TERMO_ADESAO_VERSAO })).data.accessToken;
  const prov = { service: 'eletricista', functions: ['tomadas'], price: 80, priceUnit: 'visita' };
  assert.equal((await api('PUT', '/providers/me', prov)).data.code, 'sem_cnpj', 'FALHOU: virou prestador sem CNPJ');
  assert.equal((await api('POST', '/me/trabalho', { tipo: 'prestador', cnpj: '11.444.777/0001-61', nome: 'Ana Elétrica' })).data.code, 'cnpj_outro_titular', 'FALHOU: aceitou CNPJ de outra pessoa');
  const ok = await api('POST', '/me/trabalho', { tipo: 'prestador', cnpj: '11.222.333/0001-81', nome: 'Ana Elétrica' });
  assert.equal(ok.status, 201);
  assert.equal(ok.data[0].status, 'ativo');
  assert.ok((await api('PUT', '/providers/me', prov)).status < 300, 'FALHOU: com o CNPJ certo ainda não virou prestador');
  assert.equal((await api('POST', '/tracks', { title: 'x' })).data.code, 'sem_cnpj', 'FALHOU: publicou música sem perfil de artista');
});
