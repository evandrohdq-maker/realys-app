// Acordo de Pioneiro: cadastro pelo link do vendedor, link do titular, assinatura com o rosto,
// lançamento, fatura mensal paga pela carteira, suspensão por atraso e saída.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-acordo-'));
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

const keep = (who, d) => (S[who] = { token: d.accessToken, id: d.user.id });
const DIA = 86400000;
const bio = (userId, status) => app.db.prepare("INSERT INTO biometria (id, user_id, status, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = excluded.status").run('bio-' + userId, userId, status, Date.now());

test('acordo de pioneiro: do cadastro à fatura', async () => {
  const e = await ok('pizzaria se cadastrar', 'POST', '/auth/signup', { body: { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name: 'Pizzaria da Praça', doc: '11.222.333/0001-81', username: 'pizzaria', email: 'contato@pizzaria.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO, segment: 'Restaurante' } });
  keep('emp', e);
  let s = await ok('entrar como pioneira pelo link do vendedor', 'POST', '/pioneiros/entrar', { who: 'emp', body: { area: 'food', vendedor: 'Joao', titularWhatsapp: '54999990000' } });
  assert.equal(s.pioneiro.area, 'food');
  assert.equal(s.assinado, null);
  assert.match(s.acordo.texto, /R\$ 99,90 por mês/);
  assert.match(s.acordo.texto, /não dá participação/i);

  const semRosto = await api('POST', '/pioneiros/meu/assinar', { who: 'emp', body: {} });
  assert.equal(semRosto.status, 403, 'sem o rosto não assina');

  const link = await ok('gerar o link do titular', 'POST', '/pioneiros/meu/link-titular', { who: 'emp', body: {} });
  assert.match(link.whatsappUrl, /wa\.me\/5554999990000/);
  const token = link.url.split('titular=')[1];
  const tit = await ok('titular abrir o link', 'POST', '/auth/titular', { body: { token } });
  assert.equal(tit.user.id, S.emp.id);
  const de_novo = await api('POST', '/auth/titular', { body: { token } });
  assert.equal(de_novo.status, 410, 'o link vale uma vez só');

  bio(S.emp.id, 'em_analise'); // o titular enviou o rosto e o documento
  S.tit = { token: tit.accessToken, id: tit.user.id };
  s = await ok('titular assinar', 'POST', '/pioneiros/meu/assinar', { who: 'tit', body: { aparelho: 'celular do titular' } });
  assert.ok(s.assinado && s.assinado.codigo, 'assinado, com código de conferência');
  assert.equal(s.pioneiro.numero, 1);
  assert.equal(s.pioneiro.status, 'fechado');
  assert.match(s.acordo.texto, /Pioneiro nº 001/);
  const conf = await ok('conferir o documento', 'GET', `/documentos/${s.assinado.codigo}/confere?hash=${s.assinado.hash}`);
  assert.equal(conf.confere, true);
  assert.equal(s.faturas.length, 0, 'antes do lançamento, nada é cobrado');

  const adm = await ok('admin entrar', 'POST', '/auth/login', { body: { login: 'chefe', password: 'Admin12345' } });
  S.adm = { token: adm.accessToken };
  const hoje = new Date(Date.now() - 31 * DIA).toISOString().slice(0, 10);
  await ok('admin marcar o lançamento (há 31 dias)', 'POST', '/admin/pioneiros/lancamento', { who: 'adm', body: { data: hoje } });
  s = await ok('ver a fatura do 1º mês', 'GET', '/pioneiros/meu', { who: 'emp' });
  assert.equal(s.faturas.length, 1);
  assert.equal(s.faturas[0].valor, 99.9);
  assert.equal(s.beneficiosAtivos, true);
  const sair = await api('POST', '/pioneiros/meu/encerrar', { who: 'emp' });
  assert.equal(sair.status, 409, 'só sai depois de pagar o 1º mês');

  app.db.prepare('UPDATE pioneiro_faturas SET vence_em = ? WHERE user_id = ?').run(Date.now() - 11 * DIA, S.emp.id);
  s = await ok('fatura atrasada', 'GET', '/pioneiros/meu', { who: 'emp' });
  assert.equal(s.suspenso, true, '10 dias de atraso: benefícios suspensos');
  const semSaldo = await api('POST', `/pioneiros/faturas/${s.faturas[0].id}/pagar`, { who: 'emp' });
  assert.equal(semSaldo.status, 402);
  app.wallet.move(S.emp.id, 'saldo', 9990, 'Teste', 'depósito Pix', 'x');
  s = await ok('pagar a fatura', 'POST', `/pioneiros/faturas/${s.faturas[0].id}/pagar`, { who: 'emp' });
  assert.equal(s.faturas[0].status, 'paga');
  assert.equal(s.suspenso, false, 'pagou: volta tudo');
  s = await ok('encerrar depois do 1º mês pago', 'POST', '/pioneiros/meu/encerrar', { who: 'emp' });
  assert.ok(s.encerrado, 'encerrado no fim do mês pago');
  const lista = await ok('admin ver a lista', 'GET', '/admin/pioneiros', { who: 'adm' });
  assert.ok(lista.lista[0].acordoCodigo);
});
