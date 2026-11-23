// Trava da biometria: conta sem biometria aprovada é só perfil social (não compra nem contrata).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir, token, userId;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-bio-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true, exigirBiometria: true }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function api(method, path, body) {
  const h = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = await res.text();
  try { data = JSON.parse(data); } catch (e) {}
  return { status: res.status, data };
}

test('sem biometria: navega e interage, mas não compra, não contrata e não usa a carteira', async () => {
  const s = await api('POST', '/auth/signup', { kind: 'pessoa', name: 'Caio Social', doc: '529.982.247-25', username: 'caio', email: 'caio@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO });
  assert.equal(s.status < 300, true, JSON.stringify(s.data));
  token = s.data.accessToken;
  userId = s.data.user.id;

  const me = await api('GET', '/me');
  assert.equal(me.data.podeComprar, false);
  assert.equal(me.data.exigeBiometria, true);

  // Navegar e interagir: liberado.
  assert.equal((await api('GET', '/products')).status, 200);
  assert.equal((await api('GET', '/companies')).status, 200);
  assert.notEqual((await api('POST', '/posts', { text: 'Olá, Realyz!' })).data.code, 'biometria');

  // Comprar, contratar e carteira: recusado com o aviso de biometria.
  for (const [m, p, b] of [
    ['POST', '/orders', { items: [] }],
    ['POST', '/calls', {}],
    ['POST', '/wallet/deposit', { amount: 50 }],
    ['POST', '/wallet/withdraw', { amount: 10 }],
    ['POST', '/gifts', {}],
    ['PUT', '/providers/me', {}],
  ]) {
    const r = await api(m, p, b);
    assert.equal(r.status, 403, `${m} ${p} → ${r.status}`);
    assert.equal(r.data.code, 'biometria');
    assert.match(r.data.error, /Biometria não cadastrada/);
  }
});

test('com a biometria aprovada a trava some', async () => {
  const t = Date.now();
  const has = app.db.prepare('SELECT id FROM biometria WHERE user_id = ?').get(userId);
  if (has) app.db.prepare(`UPDATE biometria SET status = 'aprovado', updated_at = ? WHERE user_id = ?`).run(t, userId);
  else app.db.prepare(`INSERT INTO biometria (id, user_id, status, updated_at) VALUES (?,?,'aprovado',?)`).run('bio_teste', userId, t);
  assert.equal((await api('GET', '/me')).data.podeComprar, true);
  const dep = await api('POST', '/wallet/deposit', { amount: 50 });
  assert.notEqual(dep.data.code, 'biometria');
  assert.equal(dep.status < 300, true, JSON.stringify(dep.data));
  assert.notEqual((await api('POST', '/orders', { items: [] })).data.code, 'biometria');
});

test('trocou a senha pelo "Esqueci a senha": confirma o rosto de novo antes de comprar', async () => {
  app.db.prepare('UPDATE users SET rosto_pendente = 1 WHERE id = ?').run(userId);
  const dep = await api('POST', '/wallet/deposit', { amount: 10 });
  assert.equal(dep.status, 403);
  assert.equal(dep.data.code, 'biometria_reconferir', 'FALHOU: depois da troca de senha comprou sem conferir o rosto');
  app.db.prepare('UPDATE users SET rosto_pendente = 0 WHERE id = ?').run(userId);
  assert.notEqual((await api('POST', '/wallet/deposit', { amount: 10 })).data.code, 'biometria_reconferir');
});

test('7 dias sem biometria: depois do prazo só a biometria e a conta abrem', async () => {
  app.db.prepare(`UPDATE biometria SET status = 'sem_consentimento' WHERE user_id = ?`).run(userId);
  app.db.prepare('UPDATE users SET prazo_bio = ? WHERE id = ?').run(Date.now() + 86400000, userId);
  assert.notEqual((await api('GET', '/feed')).status, 403, 'FALHOU: travou antes do prazo');
  app.db.prepare('UPDATE users SET prazo_bio = ? WHERE id = ?').run(Date.now() - 1000, userId);
  const feed = await api('GET', '/feed');
  assert.equal(feed.data.code, 'biometria_prazo', 'FALHOU: depois dos 7 dias ainda navega sem biometria');
  const me = await api('GET', '/me');
  assert.equal(me.status, 200, 'FALHOU: travou até a conta (o app precisa dela para mostrar a biometria)');
  assert.equal(me.data.prazoVencido, true);
  assert.notEqual((await api('GET', '/biometria')).data.code, 'biometria_prazo', 'FALHOU: travou a própria tela da biometria');
  app.db.prepare(`UPDATE biometria SET status = 'em_analise' WHERE user_id = ?`).run(userId);
  assert.notEqual((await api('GET', '/feed')).data.code, 'biometria_prazo', 'FALHOU: biometria enviada (em análise) continuou travada');
  app.db.prepare(`UPDATE biometria SET status = 'aprovado' WHERE user_id = ?`).run(userId);
});
