// APK servido pelo próprio servidor: versão e download (com "Range").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realyz-baixar-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', publicUrl: 'https://api.exemplo' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('sem APK publicado: 404; com APK: versão e download inteiro e em pedaços', async () => {
  assert.equal((await fetch(base + '/app/versao')).status, 404);
  mkdirSync(join(dir, 'baixar'), { recursive: true });
  writeFileSync(join(dir, 'baixar', 'realyz.apk'), Buffer.from('0123456789'));
  writeFileSync(join(dir, 'baixar', 'versao.json'), JSON.stringify({ build: 412, notes: 'novidade' }));
  const v = await (await fetch(base + '/app/versao')).json();
  assert.equal(v.build, 412);
  assert.equal(v.url, 'https://api.exemplo/baixar/realyz.apk');
  assert.equal(v.size, 10);
  const tudo = await fetch(base + '/baixar/realyz.apk');
  assert.equal(await tudo.text(), '0123456789');
  const parte = await fetch(base + '/baixar/realyz.apk', { headers: { Range: 'bytes=4-' } });
  assert.equal(parte.status, 206);
  assert.equal(await parte.text(), '456789');
});
