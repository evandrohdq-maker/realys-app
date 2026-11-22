// Streamers favoritos: favoritar, ligar o sininho e receber o aviso quando ele entra ao vivo.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir;
const S = {};

async function api(method, path, { who, body } = {}) {
  const h = {};
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const signup = (who, doc, username) =>
  api('POST', '/auth/signup', { body: { kind: 'pessoa', name: who, doc, username, email: `${username}@realys.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v21' } }).then((r) => {
    assert.ok(r.status < 300, JSON.stringify(r.data));
    S[who] = { token: r.data.accessToken, id: r.data.user.id };
  });
const listen = (who) =>
  new Promise((resolve, reject) => {
    const events = [];
    const ws = new WebSocket(`${base.replace('http', 'ws')}/ws?token=${S[who].token}`);
    ws.onmessage = (m) => {
      const e = JSON.parse(m.data);
      events.push(e);
      if (e.type === 'ready') resolve({ ws, events });
    };
    ws.onerror = reject;
  });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-fav-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  await signup('Streamer', '529.982.247-25', 'streamer');
  await signup('Fã', '111.444.777-35', 'fanzoca');
  await signup('Curioso', '390.533.447-05', 'curioso');
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('favoritar streamer: com sininho recebe o aviso da live, sem sininho não', async () => {
  // Fã favorita e liga o sininho; Curioso só favorita.
  const a = await api('PUT', `/streamers/${S.Streamer.id}/favorito`, { who: 'Fã', body: { notify: true } });
  assert.equal(a.status, 200);
  assert.deepEqual(a.data, { hostId: S.Streamer.id, favorito: true, notify: true });
  assert.equal((await api('PUT', `/streamers/${S.Streamer.id}/favorito`, { who: 'Curioso', body: { notify: false } })).status, 200);
  // Não dá para favoritar a si mesmo nem quem não existe.
  assert.equal((await api('PUT', `/streamers/${S.Streamer.id}/favorito`, { who: 'Streamer', body: {} })).status, 400);
  assert.equal((await api('PUT', '/streamers/nao-existe/favorito', { who: 'Fã', body: {} })).status, 404);

  const fas = await api('GET', '/streamers/me/fas', { who: 'Streamer' });
  assert.deepEqual(fas.data, { favoritaram: 2, recebemAviso: 1 });

  const fa = await listen('Fã');
  const cu = await listen('Curioso');
  const live = (await api('POST', '/lives', { who: 'Streamer', body: { title: 'Ranqueada hoje', cat: 'gamers' } })).data;
  await wait(150);
  const aviso = fa.events.find((e) => e.type === 'live-favorito');
  assert.ok(aviso, 'o fã com sininho recebe o aviso');
  assert.equal(aviso.data.id, live.id);
  assert.equal(aviso.data.host, 'Streamer');
  assert.ok(!cu.events.some((e) => e.type === 'live-favorito'), 'sem sininho, sem aviso');

  // A lista mostra quem está ao vivo.
  const mine = (await api('GET', '/streamers/favoritos', { who: 'Fã' })).data;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].liveId, live.id);
  assert.equal(mine[0].notify, true);

  // Desligar o sininho e desfavoritar.
  await api('PUT', `/streamers/${S.Streamer.id}/favorito`, { who: 'Fã', body: { notify: false } });
  assert.deepEqual((await api('GET', '/streamers/me/fas', { who: 'Streamer' })).data, { favoritaram: 2, recebemAviso: 0 });
  await api('DELETE', `/streamers/${S.Streamer.id}/favorito`, { who: 'Fã' });
  assert.equal((await api('GET', '/streamers/favoritos', { who: 'Fã' })).data.length, 0);
  fa.ws.close();
  cu.ws.close();
});
