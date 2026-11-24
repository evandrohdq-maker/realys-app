// Leituras com etiqueta (ETag): se nada mudou, o servidor responde 304 sem dados.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir, token;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-etag-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const r = await fetch(base + '/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'pessoa', name: 'Etiqueta', doc: '529.982.247-25', username: 'etiqueta', email: 'etiqueta@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v21' }) });
  const d = await r.json();
  assert.ok(r.status < 300, JSON.stringify(d));
  token = d.accessToken;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('GET devolve ETag e responde 304 quando nada mudou', async () => {
  const h = { Authorization: `Bearer ${token}` };
  const a = await fetch(base + '/me', { headers: h });
  assert.equal(a.status, 200);
  const etag = a.headers.get('etag');
  assert.ok(etag, 'sem ETag');
  const corpo = await a.json();
  const b = await fetch(base + '/me', { headers: { ...h, 'If-None-Match': etag } });
  assert.equal(b.status, 304);
  assert.equal((await b.text()).length, 0);
  // Etiqueta que o Caddy marca ao comprimir (sufixo -gzip) também vale.
  const c = await fetch(base + '/me', { headers: { ...h, 'If-None-Match': etag.replace(/"$/, '-gzip"') } });
  assert.equal(c.status, 304);
  // Etiqueta velha: vem a resposta inteira de novo.
  const d = await fetch(base + '/me', { headers: { ...h, 'If-None-Match': 'W/"velha"' } });
  assert.equal(d.status, 200);
  assert.deepEqual(await d.json(), corpo);
});

test('preflight do site aceita If-None-Match e expõe o ETag', async () => {
  const r = await fetch(base + '/me', { method: 'OPTIONS', headers: { Origin: 'https://realyz.com.br', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,if-none-match' } });
  assert.ok(r.status < 300);
  assert.match(r.headers.get('access-control-allow-headers') || '', /If-None-Match/);
  assert.match(r.headers.get('access-control-expose-headers') || '', /ETag/);
});
