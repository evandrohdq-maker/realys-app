// Perfil da conta no servidor: o que a pessoa preenche no site aparece no app (e vice-versa).
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
  dir = mkdtempSync(join(tmpdir(), 'realys-dados-'));
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

test('perfil salvo num aparelho volta igual no outro, e foto/sobre vão para o perfil público', async () => {
  const ana = await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Ana Souza', doc: '52998224725', username: 'anasouza', email: 'ana@teste.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  const vazio = await call('GET', '/me/dados', ana.accessToken);
  assert.equal(vazio.data, null);
  const data = { myProfile: { bio: 'Cantora de Passo Fundo', city: 'Passo Fundo', photo: 'https://api.realyz.com.br/media/md_abc123', cover: '/media/md_capa1' }, workHours: { seg: '9-18' } };
  const r = await call('PUT', '/me/dados', ana.accessToken, { data });
  assert.ok(r.updatedAt > 0);
  const volta = await call('GET', '/me/dados', ana.accessToken);
  assert.deepEqual(volta.data, data);
  const me = await call('GET', '/me', ana.accessToken);
  assert.equal(me.user.photo, '/media/md_abc123');
  assert.equal(me.user.about, 'Cantora de Passo Fundo');
  // Foto que ficou só no celular (file://) não vira foto pública.
  await call('PUT', '/me/dados', ana.accessToken, { data: { myProfile: { photo: 'file:///data/foto.jpg' } } });
  assert.equal((await call('GET', '/me', ana.accessToken)).user.photo, '/media/md_abc123');
  await assert.rejects(call('PUT', '/me/dados', ana.accessToken, { data: [] }), /400/);
});
