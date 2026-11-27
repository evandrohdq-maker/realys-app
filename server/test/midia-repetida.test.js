// Foto ou vídeo repetido: o servidor guarda uma vez só (os dois endereços funcionam) e apagar
// um não apaga o outro.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-dedup-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body, headers) {
  const raw = Buffer.isBuffer(body);
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) }, body: raw ? body : body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  if (!res.ok) throw new Error(`${res.status} ${data.error}`);
  return data;
}
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(2000, 7)]);

test('arquivo repetido é guardado uma vez só', async () => {
  const a = await pessoa('Ana A', '52998224725', 'anaa');
  const b = await pessoa('Beto B', '11144477735', 'betob');
  const m1 = await call('PUT', '/media', a.accessToken, mp3, { 'Content-Type': 'audio/mpeg' });
  const m2 = await call('PUT', '/media', b.accessToken, mp3, { 'Content-Type': 'audio/mpeg' });
  assert.equal(m1.repetido, false);
  assert.equal(m2.repetido, true);
  assert.notEqual(m1.id, m2.id);
  const f1 = join(dir, 'media', m1.id);
  const f2 = join(dir, 'media', m2.id);
  assert.equal(statSync(f1).ino, statSync(f2).ino, 'mesmo arquivo no disco');
  // Apagar o primeiro não apaga o segundo.
  rmSync(f1);
  const got = await call('GET', `/media/${m2.id}`);
  assert.equal(got.length, mp3.length);

  // Arquivos antigos iguais (sem impressão digital) são juntados pela manutenção.
  const db = app.db;
  const c = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(3000, 9)]);
  for (const id of ['old1', 'old2']) {
    writeFileSync(join(dir, 'media', id), c);
    db.prepare("INSERT INTO media (id, owner_id, mime, size, created_at, uso, moderacao) VALUES (?,?,?,?,?,'publico','liberado')").run(id, a.user.id, 'audio/mpeg', c.length, Date.now());
  }
  const r = await app.maintenance.run('midias-repetidas');
  assert.equal(r.result.juntados, 1);
  assert.equal(statSync(join(dir, 'media', 'old1')).ino, statSync(join(dir, 'media', 'old2')).ino);
});
