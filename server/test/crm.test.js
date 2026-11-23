// CRM de verdade: cliente escreve para a loja → atendimento novo; loja responde → em conversa;
// cliente compra pelo app → venda fechada; lembrete de retorno vira aviso.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-crm-'));
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

test('CRM: conversa abre o atendimento, resposta passa para em conversa, compra fecha', async () => {
  const cli = (await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Carla Cliente', doc: '529.982.247-25', username: 'carlacli', email: 'carla@t.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO })).data;
  const loja = (await call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Dono da Loja', titularCpf: '11144477735', name: 'Loja do Bairro', doc: '11.222.333/0001-81', username: 'lojabairro', email: 'loja@t.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO, segment: 'Mercado' })).data;
  assert.ok(cli.accessToken, JSON.stringify(cli));
  assert.ok(loja.accessToken, JSON.stringify(loja));
  const m = await call('POST', '/messages', cli.accessToken, { toId: loja.user.id, text: 'Oi, vocês têm arroz integral?', origem: 'Shop' });
  assert.equal(m.status, 201, JSON.stringify(m.data));
  let leads = (await call('GET', '/crm/leads', loja.accessToken)).data;
  assert.equal(leads.length, 1);
  assert.equal(leads[0].stage, 'novo');
  assert.equal(leads[0].origin, 'Shop');
  assert.equal(leads[0].client, 'Carla Cliente');
  assert.equal(leads[0].unread, 1);
  await call('POST', '/messages', loja.accessToken, { toId: cli.user.id, text: 'Temos sim, R$ 8,90 o pacote.' });
  leads = (await call('GET', '/crm/leads', loja.accessToken)).data;
  assert.equal(leads[0].stage, 'conversa');
  assert.equal(leads[0].messages.length, 2);
  // Outra conta não vê nem muda o atendimento da loja.
  assert.equal((await call('GET', '/crm/leads', cli.accessToken)).data.length, 0);
  assert.equal((await call('PATCH', `/crm/leads/${leads[0].id}`, cli.accessToken, { stage: 'perdido' })).status, 404);
  // Lembrete de retorno vencido vira aviso (uma vez).
  await call('PATCH', `/crm/leads/${leads[0].id}`, loja.accessToken, { followUp: Date.now() - 1000, note: 'Ligar de volta' });
  assert.equal(app.crm.lembretes(), 1);
  assert.equal(app.crm.lembretes(), 0);
  // Compra pelo app fecha a etapa.
  const p = (await call('POST', '/products', loja.accessToken, { name: 'Arroz integral', price: 8.9, stock: 10 })).data;
  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 50, method: 'pix' });
  const o = await call('POST', '/orders', cli.accessToken, { items: [{ productId: p.id, qty: 2 }] });
  assert.equal(o.status, 201, JSON.stringify(o.data));
  leads = (await call('GET', '/crm/leads', loja.accessToken)).data;
  assert.equal(leads[0].stage, 'fechado');
  assert.equal(leads[0].value, 17.8);
});
