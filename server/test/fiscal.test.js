// Módulo fiscal: cálculo de impostos, DPS assinada, envio ao Sistema Nacional (simulado) e cancelamento.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { tx } from '../src/db.js';
import { aliquotaSimples, impostosPresumido, situacaoMei, resumoMensal, fatorR, tetoMei } from '../src/fiscal/impostos.js';
import { montarDps, idDps, NS_NFSE, ungz64 } from '../src/fiscal/nfseNacional.js';
import { assinar, conferirAssinatura } from '../src/fiscal/xml.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
const certPem = '-----BEGIN CERTIFICATE-----\nTESTE\n-----END CERTIFICATE-----\n';

test('Simples Nacional: alíquota efetiva do Anexo III', () => {
  assert.equal(aliquotaSimples(0, 'III').efetiva, 6);
  const a = aliquotaSimples(300000 * 100, 'III'); // R$ 300 mil nos últimos 12 meses
  assert.equal(a.faixa, 2);
  assert.equal(a.efetiva, 8.08); // (300.000 × 11,2% − 9.360) ÷ 300.000
  assert.equal(a.iss, 2.59); // 32% da alíquota efetiva
  assert.equal(aliquotaSimples(3600000 * 100, 'III').iss, 5); // ISS limitado a 5%
  assert.equal(aliquotaSimples(5000000 * 100, 'III').foraDoSimples, true);
  assert.equal(aliquotaSimples(4000000 * 100, 'III').issForaDoSimples, true); // acima do sublimite
});

test('Fator R: intermediação vai para o Anexo III com folha de 28% da receita', () => {
  assert.equal(fatorR({ folha12Cents: 0, rbt12Cents: 100000 * 100 }).anexo, 'V');
  assert.equal(fatorR({ folha12Cents: 28000 * 100, rbt12Cents: 100000 * 100 }).anexo, 'III');
  assert.equal(fatorR({ folha12Cents: 27999 * 100, rbt12Cents: 100000 * 100 }).anexo, 'V');
});

test('Teto do MEI pela LC 238/2026', () => {
  assert.equal(tetoMei(2026), 81000);
  assert.equal(tetoMei(2027), 110000);
  assert.equal(tetoMei(2030), 140000);
  assert.equal(situacaoMei(90000 * 100, { ano: 2027 }).nivel, 'atencao');
});

test('Lucro Presumido: presunção maior acima de R$ 5 milhões no ano (LC 224/2025)', () => {
  const normal = impostosPresumido(100000 * 100);
  const acima = impostosPresumido(100000 * 100, { receitaAnoAntesCents: 5000000 * 100 });
  assert.equal(acima.csll, Math.round(100000 * 100 * 0.352 * 0.09));
  assert.ok(acima.total > normal.total);
});

test('Lucro Presumido: impostos de um mês de serviços', () => {
  const p = impostosPresumido(100000 * 100, { issPct: 5 }); // R$ 100 mil no mês
  assert.equal(p.irpj, 6000 * 100); // 15% de 32 mil + 10% de 12 mil
  assert.equal(p.csll, 2880 * 100);
  assert.equal(p.total, 17530 * 100);
  assert.equal(p.efetiva, 17.53);
});

test('MEI: aviso ao chegar perto do teto e ao passar', () => {
  assert.equal(situacaoMei(50000 * 100).nivel, 'ok');
  assert.equal(situacaoMei(70000 * 100).nivel, 'atencao');
  assert.equal(situacaoMei(90000 * 100).nivel, 'excedeu');
  assert.equal(situacaoMei(100000 * 100).nivel, 'desenquadrado');
});

test('Resumo do mês avisa quando a receita não cobre custos e impostos', () => {
  const r = resumoMensal({ receitaCents: 1000 * 100, rbt12Cents: 0, custosCents: 2000 * 100 });
  assert.equal(r.prejuizo, true);
  assert.equal(r.impostos, 60 * 100);
  assert.ok(r.receitaParaEmpatar > 2000 * 100);
});

test('DPS: Id com 45 caracteres e assinatura digital que confere', () => {
  const emitente = { cnpj: '12.345.678/0001-90', municipio: '4314100', opSimpNac: 3 };
  const nota = { serie: 1, numero: 7, emitidaEm: Date.UTC(2026, 10, 9, 15), valorCents: 99, descricao: 'Taxa de proteção Realys & garantia <teste>', cTribNac: '100501', tomador: { doc: '123.456.789-09', nome: 'Ana' } };
  const { id, xml } = montarDps({ ambiente: 2, emitente, nota });
  assert.equal(id, idDps({ municipio: '4314100', cnpj: '12345678000190', serie: 1, numero: 7 }));
  assert.equal(id.length, 45);
  assert.match(xml, /<vServ>0\.99<\/vServ>/);
  assert.match(xml, /&amp; garantia &lt;teste&gt;/);
  assert.match(xml, /<CPF>12345678909<\/CPF>/);
  assert.match(xml, /versao="1\.01"/);
  const assinado = assinar(xml, { tag: 'infDPS', id, nsDoElemento: NS_NFSE, keyPem, certPem });
  assert.ok(conferirAssinatura(assinado, { tag: 'infDPS', nsDoElemento: NS_NFSE, publicKeyPem: pubPem }));
  // Qualquer mudança no valor quebra a assinatura.
  assert.equal(conferirAssinatura(assinado.replace('0.99', '9.99'), { tag: 'infDPS', nsDoElemento: NS_NFSE, publicKeyPem: pubPem }), false);
});

// ---------- Emissão de ponta a ponta com o Sistema Nacional simulado ----------
let app, dir, sefin;
const recebidas = [];
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-fiscal-'));
  writeFileSync(join(dir, 'cert.pem'), certPem);
  writeFileSync(join(dir, 'key.pem'), keyPem);
  // Sistema Nacional de mentira: confere a assinatura e devolve uma chave de acesso.
  sefin = createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const body = JSON.parse(b);
      const xml = ungz64(body.dpsXmlGZipB64 || body.pedidoRegistroEventoXmlGZipB64);
      const tag = body.dpsXmlGZipB64 ? 'infDPS' : 'infPedReg';
      const ok = conferirAssinatura(xml, { tag, nsDoElemento: NS_NFSE, publicKeyPem: pubPem });
      recebidas.push({ url: req.url, xml, ok });
      res.writeHead(ok ? 201 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ok ? { chaveAcesso: '43141002123456780001900000000000000126110000000001', idDps: 'x' } : { erros: [{ Codigo: 'E0714', Descricao: 'Assinatura inválida' }] }));
    });
  });
  await new Promise((r) => sefin.listen(0, '127.0.0.1', r));
  app = createApp(loadConfig({
    dataDir: dir, jwtSecret: 'segredo', fiscalAtivo: true, fiscalCnpj: '12345678000190', fiscalRegime: 'simples',
    fiscalCertPem: join(dir, 'cert.pem'), fiscalKeyPem: join(dir, 'key.pem'),
    fiscalNfseUrl: `http://127.0.0.1:${sefin.address().port}/SefinNacional`, fiscalCustosMensais: 0,
  }));
  app.db.prepare(`INSERT INTO users (id, kind, name, username, roles, doc, email, created_at) VALUES ('u_ana','pessoa','Ana Souza','ana','["usuario"]','12345678909','ana@ex.com',?)`).run(Date.now());
});
after(async () => {
  await app.close();
  await new Promise((r) => sefin.close(r));
  rmSync(dir, { recursive: true, force: true });
});

test('Taxa do Realys vira nota emitida e depois é cancelada no estorno', async () => {
  const { db, fiscal } = app;
  tx(db, () => fiscal.registrar({ origem: 'taxa_protecao', ref: 'o_1', tomadorId: 'u_ana', valorCents: 99 }));
  const r = await fiscal.processar();
  assert.equal(r.ok, true);
  assert.equal(r.emitidas, 1);
  const n = db.prepare("SELECT * FROM fiscal_notas WHERE tipo = 'nfse'").get();
  assert.equal(n.status, 'emitida');
  assert.equal(n.numero, 1);
  assert.equal(n.imposto_estimado, 15); // sem folha: Anexo V, 15,5% de R$ 0,99
  assert.match(n.link, /consultapublica\?chave=/);
  assert.ok(recebidas[0].ok);
  assert.match(recebidas[0].xml, /<xNome>Ana Souza<\/xNome>/);

  tx(db, () => fiscal.estornar('o_1', 'Pedido cancelado pelo cliente'));
  assert.equal(db.prepare('SELECT status FROM fiscal_notas WHERE id = ?').get(n.id).status, 'cancelamento');
  const r2 = await fiscal.processar();
  assert.equal(r2.canceladas, 1);
  assert.equal(db.prepare('SELECT status FROM fiscal_notas WHERE id = ?').get(n.id).status, 'cancelada');
  assert.match(recebidas[1].url, /\/eventos$/);
  assert.match(recebidas[1].xml, /<e101101>/);
});

test('Estorno antes de emitir: a receita sai da fila e nenhuma nota é enviada', async () => {
  const { db, fiscal } = app;
  const antes = recebidas.length;
  tx(db, () => fiscal.registrar({ origem: 'taxa_presente', ref: 'gf_2', tomadorId: 'u_ana', valorCents: 50 }));
  tx(db, () => fiscal.estornar('gf_2'));
  await fiscal.processar();
  assert.equal(recebidas.length, antes);
  assert.equal(db.prepare("SELECT status FROM fiscal_receitas WHERE ref = 'gf_2'").get().status, 'cancelada');
});

test('Resumo do administrador mostra receita, imposto e lucro do mês', () => {
  tx(app.db, () => app.fiscal.registrar({ origem: 'plano', ref: 'pl_1', tomadorId: 'u_ana', valorCents: 10000 }));
  const s = app.fiscal.resumo();
  assert.equal(s.emissaoLigada, true);
  assert.ok(s.receita >= 100);
  assert.equal(s.anexo, 'V');
  assert.equal(s.aliquota, 15.5);
  assert.ok(s.avisos.some((a) => a.includes('Fator R')));
  assert.ok(s.receitaPorOrigem.some((o) => o.origem === 'plano'));
});

test('Sem CNPJ e certificado, nada é enviado e o painel diz o que falta', async () => {
  const d2 = mkdtempSync(join(tmpdir(), 'realys-fiscal2-'));
  const a2 = createApp(loadConfig({ dataDir: d2, jwtSecret: 'segredo', fiscalAtivo: false, fiscalCnpj: '', fiscalCertPem: '', fiscalKeyPem: '' }));
  try {
    tx(a2.db, () => a2.fiscal.registrar({ origem: 'outro', valorCents: 500 }));
    const r = await a2.fiscal.processar();
    assert.equal(r.ok, false);
    assert.ok(r.faltaConfigurar.some((f) => f.includes('FISCAL_CNPJ')));
    assert.equal(a2.db.prepare('SELECT status FROM fiscal_receitas').get().status, 'pendente');
  } finally {
    await a2.close();
    rmSync(d2, { recursive: true, force: true });
  }
});
