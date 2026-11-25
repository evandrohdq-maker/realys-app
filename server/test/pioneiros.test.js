// Pioneiros do piloto: vagas no site, interesse sem login e o administrador fechando.
// Base copiada do robô das duas contas: faz tudo o que duas pessoas fazem uma com a outra no Realyz, do jeito que o
// app e o site fazem (mesmos endereços do servidor). Se algo quebrar, o relatório diz em português
// qual passo falhou, para corrigir antes de ir para o servidor.
//   npm test   (roda sozinho no GitHub a cada mudança no servidor)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
const S = {};
const enviados = []; // e-mails que o servidor mandaria (código do esqueci a senha)

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realyz-pioneiros-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true, mail: { ready: true, send: async (m) => enviados.push(m) } }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function api(method, path, { who, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, data };
}
// passo: o que a pessoa estava fazendo (aparece no relatório se falhar).
const ok = async (passo, ...a) => {
  const r = await api(...a);
  assert.ok(r.status < 300, `FALHOU: ${passo} → ${a[0]} ${a[1]} respondeu ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data;
};

test('pioneiros: site mostra as vagas, recebe o interesse e o admin fecha com número', async () => {
  let v = await ok('site ver as vagas', 'GET', '/pioneiros/vagas');
  assert.equal(v.empresas.meta, 100);
  assert.equal(v.entregadores.meta, 50);
  assert.equal(v.empresas.meta + v.entregadores.meta, 150, '150 pioneiros no total');
  const food = await ok('restaurante pedir a vaga', 'POST', '/pioneiros/interesse', { body: { area: 'food', nome: 'Cantina da Praça', responsavel: 'Maria', cnpj: '11.222.333/0001-81', whatsapp: '(54) 99999-0000', vendedor: 'Evandro', aceite: true } });
  const de_novo = await ok('mesmo CNPJ de novo', 'POST', '/pioneiros/interesse', { body: { area: 'food', nome: 'Cantina da Praça Ltda', responsavel: 'Maria', cnpj: '11222333000181', whatsapp: '54999990000', aceite: true } });
  assert.equal(de_novo.id, food.id, 'não duplica');
  await ok('motoboy pedir a vaga (sem CNPJ obrigatório)', 'POST', '/pioneiros/interesse', { body: { area: 'motoboy', nome: 'João Moto', whatsapp: '54988887777', aceite: true } });
  const sem = await api('POST', '/pioneiros/interesse', { body: { area: 'food', nome: 'Sem CNPJ', responsavel: 'X', whatsapp: '54988887777', aceite: true } });
  const semAceite = await api('POST', '/pioneiros/interesse', { body: { area: 'motorista', nome: 'Ana Carro', whatsapp: '54977776666' } });
  assert.equal(semAceite.status, 400, 'sem aceitar as condições não entra');
  assert.match(v.aviso, /não dá participação/i, 'o site mostra que o título não dá participação');
  assert.equal(sem.status, 400, 'empresa sem CNPJ é recusada');
  const semLogin = await api('GET', '/admin/pioneiros');
  assert.equal(semLogin.status, 401, 'lista só para o admin');
  const adm = await ok('admin entrar', 'POST', '/auth/login', { body: { login: 'chefe', password: 'Admin12345' } });
  S.adm = { token: adm.accessToken };
  const l = await ok('admin ver a lista', 'GET', '/admin/pioneiros', { who: 'adm' });
  assert.equal(l.lista.length, 2);
  const f = await ok('admin fechar o restaurante', 'POST', `/admin/pioneiros/${food.id}`, { who: 'adm', body: { status: 'fechado' } });
  assert.equal(f.numero, 1, 'Pioneiro nº 001');
  v = await ok('site ver as vagas de novo', 'GET', '/pioneiros/vagas');
  assert.equal(v.areas.find((a) => a.id === 'food').restantes, 17);
  assert.ok(!JSON.stringify(v).includes('Cantina'), 'o site não mostra nome de ninguém');
});
