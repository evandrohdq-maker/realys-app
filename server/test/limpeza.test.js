// Limpeza mensal das conversas: aviso a partir do dia 24, limpeza no dia 1º, exportar antes,
// e as conversas de pedido recente ou com preservação ficam.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';
import { makeLimpezaConversas } from '../src/limpezaConversas.js';

let app, base, dir;
const avisos = [];
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-limp-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body) {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error}`);
  return data;
}
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });

test('limpeza mensal: avisa, deixa exportar, apaga o mês passado e respeita as exceções', async () => {
  const a = await pessoa('Ana A', '52998224725', 'anaa');
  const b = await pessoa('Beto B', '11144477735', 'betob');
  const c = await pessoa('Caio C', '39053344705', 'caioc');
  const db = app.db;
  const outubro = Date.parse('2026-10-10T15:00:00Z');
  const novembro = Date.parse('2026-11-10T15:00:00Z');
  const ins = db.prepare('INSERT INTO messages (id, from_id, to_id, text, created_at) VALUES (?,?,?,?,?)');
  ins.run('m1', a.user.id, b.user.id, 'oi Beto (outubro)', outubro);
  ins.run('m2', b.user.id, a.user.id, 'oi Ana (novembro)', novembro);
  ins.run('m3', a.user.id, c.user.id, 'Caio, preservada', outubro);
  db.prepare('INSERT INTO preservacoes (id, user_a, user_b, motivo, ate, created_at) VALUES (?,?,?,?,?,?)').run('pv1', a.user.id, c.user.id, 'ordem judicial', Date.now() + 86400000, Date.now());

  const avisos = [];
  const l = makeLimpezaConversas({ db, hub: { send: (u, t, d) => avisos.push({ u, t, d }) } });
  // Dia 20 de outubro: ainda não avisa.
  assert.equal(l.avisar(Date.parse('2026-10-20T15:00:00Z')).avisados, 0);
  // Dia 25 de outubro: avisa Ana e Beto (Caio está preservado), uma vez só.
  const av = l.avisar(Date.parse('2026-10-25T15:00:00Z'));
  assert.equal(av.avisados, 2);
  assert.equal(av.data, '01/11/2026');
  assert.equal(l.avisar(Date.parse('2026-10-26T15:00:00Z')).avisados, 0, 'uma vez por mês');
  // Exportar antes de apagar.
  const ex = await call('GET', '/conversas/exportar', a.accessToken);
  assert.match(ex.texto, /oi Beto \(outubro\)/);
  assert.equal(ex.conversas, 2);
  // 1º de dezembro: apaga o que é de antes de dezembro (outubro e novembro), menos a preservada.
  const r = l.limpar(Date.parse('2026-12-01T12:00:00Z'));
  assert.equal(r.apagadas, 2);
  assert.deepEqual(db.prepare('SELECT id FROM messages ORDER BY id').all().map((m) => m.id), ['m3']);
  assert.equal(l.limpar(Date.parse('2026-12-02T12:00:00Z')).apagadas, 0, 'uma vez por mês');
  const info = await call('GET', '/conversas/limpeza', a.accessToken);
  assert.ok(info.proxima > Date.now());
});
