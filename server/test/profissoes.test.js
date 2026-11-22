// Profissões no banco: todas gravadas ao subir; busca pelo que a pessoa digita (até 4) e MEI certo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-prof-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const get = async (p) => (await fetch(base + p)).json();

test('profissões: banco, busca e MEI', async () => {
  const todas = await get('/profissoes');
  assert.ok(todas.length >= 150);
  const ele = await get('/profissoes?q=eletri');
  assert.equal(ele[0].key, 'eletricista');
  assert.ok(ele.length <= 4);
  assert.equal(ele[0].mei.cnae, '4321-5/00');
  assert.equal(ele[0].atende, 'visita');
  const adv = await get('/profissoes/advogado');
  assert.equal(adv.mei, false);
  assert.match(adv.exige, /OAB/);
  const cantora = await get('/profissoes?q=cant');
  assert.ok(cantora.some((p) => p.key === 'cantor'));
});
