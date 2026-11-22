// Sugestões de amizade: quem abre o seu perfil aparece (sem dizer que viu); amigo não aparece.
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
  dir = mkdtempSync(join(tmpdir(), 'realys-sug-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste' }));
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
const signup = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });

test('sugestões vêm de quem abre o perfil', async () => {
  const eu = await signup('Evandro Teste', '52998224725', 'evandrot');
  const a = await signup('Alice Vê', '11144477735', 'alicev');
  const b = await signup('Bruno Vê', '39053344705', 'brunov');
  await call('GET', `/users/${eu.user.id}`, a.accessToken);
  await call('GET', `/users/${eu.user.id}`, b.accessToken);
  await call('GET', `/users/${eu.user.id}`, b.accessToken);
  await call('GET', `/users/${eu.user.id}`, eu.accessToken); // a própria visita não conta
  let s = await call('GET', '/me/sugestoes', eu.accessToken);
  assert.deepEqual(s.map((x) => x.id), [b.user.id, a.user.id]); // quem viu mais vezes primeiro
  // Virou amigo: sai das sugestões.
  await call('POST', `/friends/${b.user.id}`, eu.accessToken);
  await call('POST', `/friends/${eu.user.id}`, b.accessToken);
  s = await call('GET', '/me/sugestoes', eu.accessToken);
  assert.deepEqual(s.map((x) => x.id), [a.user.id]);
});
