// Negócios: anunciar, interesse (grátis para quem procura), liberar a conversa (pago ou pelo plano)
// e devolução quando o interessado não responde em 48 horas.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-neg-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const call = async (method, path, token, body) => {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const conta = async (name, doc, username) => (await call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO })).data;

test('Negócios: anúncio, interesse, liberar pago e devolução em 48 h; plano libera de graça', async () => {
  const dono = await conta('Roberto Dono', '529.982.247-25', 'robertodono');
  const cli = await conta('Ana Procura', '111.444.777-35', 'anaprocura');
  const ad = await call('POST', '/negocios/anuncios', dono.accessToken, { kind: 'imovel-venda', title: 'Casa 3 quartos no Centro', price: 'R$ 450.000', place: 'Passo Fundo' });
  assert.equal(ad.status, 200, JSON.stringify(ad.data));
  const lista = await call('GET', '/negocios/anuncios?kinds=imovel-venda', cli.accessToken);
  assert.equal(lista.data[0].title, 'Casa 3 quartos no Centro');
  assert.equal((await call('POST', `/negocios/anuncios/${ad.data.id}/interesse`, cli.accessToken)).data.status, 'aguardando');
  assert.equal((await call('POST', `/negocios/anuncios/${ad.data.id}/interesse`, dono.accessToken)).status, 400); // o próprio anúncio
  let meus = (await call('GET', '/negocios/meus', dono.accessToken)).data;
  assert.equal(meus.ads[0].leads[0].name, 'Interessado verificado'); // nome só depois de liberar
  assert.equal(meus.ads[0].custo, 9.9);
  const lead = meus.ads[0].leads[0];
  assert.equal((await call('POST', `/negocios/leads/${lead.id}/liberar`, dono.accessToken)).status, 402); // sem saldo
  await call('POST', '/wallet/deposit', dono.accessToken, { amount: 150, method: 'pix' });
  const lib = await call('POST', `/negocios/leads/${lead.id}/liberar`, dono.accessToken);
  assert.equal(lib.data.paid, 9.9);
  assert.equal((await call('GET', '/negocios/interesses', cli.accessToken)).data[0].status, 'liberado');
  meus = (await call('GET', '/negocios/meus', dono.accessToken)).data;
  assert.equal(meus.ads[0].leads[0].name, 'Ana Procura');
  // 48 horas sem resposta: o valor volta.
  app.db.prepare('UPDATE neg_leads SET unlocked_at = ? WHERE id = ?').run(Date.now() - 49 * 3600000, lead.id);
  const antes = (await call('GET', '/wallet', dono.accessToken)).data.balance;
  assert.equal(app.negocios.reembolsos(), 1);
  assert.equal(app.negocios.reembolsos(), 0);
  assert.equal(Math.round(((await call('GET', '/wallet', dono.accessToken)).data.balance - antes) * 100), 990);
  // Com o plano Imobiliária, a conversa sai de graça.
  assert.equal((await call('POST', '/negocios/plano', dono.accessToken, { planId: 'imob10' })).status, 200);
  const outro = await conta('Beto Curioso', '390.533.447-05', 'betocurioso');
  await call('POST', `/negocios/anuncios/${ad.data.id}/interesse`, outro.accessToken);
  meus = (await call('GET', '/negocios/meus', dono.accessToken)).data;
  assert.equal(meus.ads[0].custo, 0);
  assert.equal(meus.plano.nome, 'Imobiliária');
  const l2 = meus.ads[0].leads.find((l) => !l.unlocked);
  assert.equal((await call('POST', `/negocios/leads/${l2.id}/liberar`, dono.accessToken)).data.paid, 0);
});
