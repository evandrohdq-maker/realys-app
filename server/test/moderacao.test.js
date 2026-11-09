import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { splitJpegs } from '../src/moderacaoImagem.js';

// IA de mentira: imagem com "NUDEZ" bloqueia, "PRAIA" vai para revisão, o resto passa.
const fakeMod = {
  ready: true,
  image: async (buf) => (buf.includes('NUDEZ') ? { nudez: 0.99, decisao: 'bloquear' } : buf.includes('PRAIA') ? { nudez: 0.6, decisao: 'revisar' } : { nudez: 0.02, decisao: 'liberar' }),
  frames: async () => ({ nudez: 0.01, decisao: 'liberar' }),
  grab: async () => [],
};
let app, base, dir, token, admin;
async function up(body, uso) {
  const r = await fetch(base + '/media' + (uso ? `?uso=${uso}` : ''), { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body });
  return { status: r.status, data: await r.json() };
}
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-mod-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x', adminPassword: 'admin12345', adminUsername: 'admin', imageModerator: fakeMod }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const j = (m, p, b) => fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  token = (await j('POST', '/auth/signup', { kind: 'pessoa', name: 'Bia Lima', doc: '529.982.247-25', username: 'bialima', email: 'bia@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v13' })).accessToken;
  admin = (await j('POST', '/auth/login', { login: 'admin', password: 'admin12345' })).accessToken;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('foto pública com nudez é recusada; praia vai para revisão; conversa privada não passa pela regra', async () => {
  const bad = await up('foto NUDEZ');
  assert.equal(bad.status, 422);
  assert.equal(bad.data.code, 'nudez');
  const beach = await up('foto PRAIA');
  assert.equal(beach.data.moderacao, 'revisao');
  assert.equal((await fetch(base + beach.data.url)).status, 404); // escondida até a equipe liberar
  const ok = await up('foto gato');
  assert.equal((await fetch(base + ok.data.url)).status, 200);
  const priv = await up('foto NUDEZ', 'privado');
  assert.equal(priv.status, 201); // conversa entre duas pessoas: fica só entre elas
  const fila = await (await fetch(base + '/admin/moderacao', { headers: { Authorization: `Bearer ${admin}` } })).json();
  assert.equal(fila.items.length, 1);
  await fetch(base + `/admin/moderacao/${beach.data.id}/liberar`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` } });
  assert.equal((await fetch(base + beach.data.url)).status, 200);
});

test('quadros do ffmpeg: separa os JPEGs colados', () => {
  const a = Buffer.from([0xff, 0xd8, 1, 2, 0xff, 0xd9]);
  const b = Buffer.from([0xff, 0xd8, 3, 0xff, 0xd9]);
  assert.equal(splitJpegs(Buffer.concat([a, b])).length, 2);
});
