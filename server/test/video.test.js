// Vídeo: passes das lives, conferência do MediaMTX e chamadas 1 para 1.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

const SECRET = 'segredo-do-video';
let app, base, dir, off, offBase, offDir;
const S = {};

async function api(b, method, path, { who, body } = {}) {
  const h = {};
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(b + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await res.text();
  let data;
  try {
    data = JSON.parse(t);
  } catch (e) {
    data = t;
  }
  return { status: res.status, data };
}
const signup = (b, who, doc, username) =>
  api(b, 'POST', '/auth/signup', { body: { kind: 'pessoa', name: who, doc, username, email: `${username}@realys.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v18' } }).then((r) => {
    assert.ok(r.status < 300, JSON.stringify(r.data));
    S[who] = { token: r.data.accessToken, id: r.data.user.id };
  });

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-video-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x', videoUrl: 'https://video.teste', videoSecret: SECRET, turnUrl: 'turn:video.teste:3478', turnSecret: 'turn-segredo' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  offDir = mkdtempSync(join(tmpdir(), 'realys-video-off-'));
  off = createApp(loadConfig({ dataDir: offDir, jwtSecret: 'x', videoUrl: '', videoSecret: '' }));
  await new Promise((r) => off.server.listen(0, '127.0.0.1', r));
  offBase = `http://127.0.0.1:${off.server.address().port}`;
});
after(async () => {
  await app.close();
  await off.close();
  rmSync(dir, { recursive: true, force: true });
  rmSync(offDir, { recursive: true, force: true });
});

test('live: só quem abriu transmite; todos os logados assistem; o MediaMTX confere o passe', async () => {
  await signup(base, 'Streamer', '529.982.247-25', 'streamer');
  await signup(base, 'Fã', '111.444.777-35', 'fanzoca');
  const live = (await api(base, 'POST', '/lives', { who: 'Streamer', body: { title: 'Jogando hoje', cat: 'gamers' } })).data;

  const pub = await api(base, 'POST', `/lives/${live.id}/stream`, { who: 'Streamer' });
  assert.equal(pub.status, 200);
  assert.equal(pub.data.whip, `https://video.teste/live/${live.id}/whip`);
  assert.equal((await api(base, 'POST', `/lives/${live.id}/stream`, { who: 'Fã' })).status, 403);

  const watch = await api(base, 'GET', `/lives/${live.id}/watch`, { who: 'Fã' });
  assert.equal(watch.status, 200);
  assert.ok(watch.data.iceServers.some((s) => String(s.urls).includes('turn:')));
  assert.equal((await api(base, 'GET', `/lives/${live.id}/watch`)).status, 401); // sem login não assiste

  const auth = (body, k = SECRET) => api(base, 'POST', `/video/auth?k=${k}`, { body });
  const path = `live/${live.id}`;
  assert.equal((await auth({ action: 'publish', path, token: pub.data.token })).status, 200);
  assert.equal((await auth({ action: 'read', path, token: watch.data.token })).status, 200);
  assert.equal((await auth({ action: 'read', path, query: `token=${encodeURIComponent(watch.data.token)}` })).status, 200); // HLS
  assert.equal((await auth({ action: 'publish', path, token: watch.data.token })).status, 401); // passe de assistir não transmite
  assert.equal((await auth({ action: 'read', path: 'live/outra', token: watch.data.token })).status, 401); // outra live
  assert.equal((await auth({ action: 'read', path, token: watch.data.token + 'x' })).status, 401); // passe adulterado
  assert.equal((await auth({ action: 'read', path, token: watch.data.token }, 'chave-errada')).status, 401); // não é o MediaMTX

  await api(base, 'POST', `/lives/${live.id}/end`, { who: 'Streamer' });
  assert.equal((await auth({ action: 'publish', path, token: pub.data.token })).status, 401); // live encerrada
  assert.equal((await api(base, 'GET', `/lives/${live.id}/watch`, { who: 'Fã' })).status, 410);
});

test('chamada 1 para 1: tocar, atender, sinalizar e encerrar', async () => {
  const c = await api(base, 'POST', '/video-calls', { who: 'Fã', body: { to: S.Streamer.id, kind: 'video' } });
  assert.equal(c.status, 200);
  assert.equal((await api(base, 'POST', `/video-calls/${c.data.id}/answer`, { who: 'Fã', body: { accept: true } })).status, 403); // quem ligou não atende
  assert.equal((await api(base, 'POST', `/video-calls/${c.data.id}/answer`, { who: 'Streamer', body: { accept: true } })).data.status, 'em_andamento');
  assert.equal((await api(base, 'POST', `/video-calls/${c.data.id}/signal`, { who: 'Fã', body: { data: { sdp: 'v=0' } } })).status, 200);
  assert.equal((await api(base, 'POST', `/video-calls/${c.data.id}/end`, { who: 'Streamer' })).status, 200);
  assert.equal((await api(base, 'POST', `/video-calls/${c.data.id}/signal`, { who: 'Fã', body: { data: {} } })).status, 404);
  const ice = await api(base, 'GET', '/video-calls/ice', { who: 'Fã' });
  const turn = ice.data.iceServers.find((s) => String(s.urls).includes('turn:'));
  assert.match(turn.username, /^\d+:/);
});

test('Date: só chama quem está online; offline não chega no celular', async () => {
  const r = await api(base, 'POST', '/video-calls', { who: 'Fã', body: { to: S.Streamer.id, kind: 'video', ctx: 'date' } });
  assert.equal(r.status, 409); // ninguém conectado no teste: a pessoa está offline
});

test('sem servidor de vídeo contratado: avisa e o app segue na demonstração', async () => {
  assert.deepEqual((await api(offBase, 'GET', '/video/status')).data.on, false);
  await signup(offBase, 'Solo', '529.982.247-25', 'solo');
  const live = (await api(offBase, 'POST', '/lives', { who: 'Solo', body: { title: 'Teste' } })).data;
  const r = await api(offBase, 'POST', `/lives/${live.id}/stream`, { who: 'Solo' });
  assert.equal(r.status, 503);
  assert.equal(r.data.code, 'video_off');
});

test('tela na sala: só os convidados assistem; o dono tira alguém e o passe para de valer', async () => {
  await signup(base, 'Gamer', '390.533.447-05', 'gamer_tela');
  await signup(base, 'Colega', '935.411.347-80', 'colega_tela');
  await signup(base, 'Intruso', '153.509.460-56', 'intruso_tela');
  const pub = await api(base, 'POST', '/salas/tela', { who: 'Gamer', body: { sala: 'arena:sv-realys:v1', para: [S.Colega.id] } });
  assert.equal(pub.status, 200, JSON.stringify(pub.data));
  assert.equal(pub.data.whip, `https://video.teste/tela/${pub.data.id}/whip`);
  const auth = (token, action) => api(base, 'POST', `/video/auth?k=${SECRET}`, { body: { token, path: `tela/${pub.data.id}`, action } });
  assert.equal((await auth(pub.data.token, 'publish')).status, 200);

  const ver = await api(base, 'GET', `/salas/tela/${pub.data.id}/watch`, { who: 'Colega' });
  assert.equal(ver.status, 200);
  assert.equal((await auth(ver.data.token, 'read')).status, 200);
  assert.equal((await api(base, 'GET', `/salas/tela/${pub.data.id}/watch`, { who: 'Intruso' })).status, 403);
  // Só o dono muda quem assiste ou para.
  assert.equal((await api(base, 'POST', `/salas/tela/${pub.data.id}/para`, { who: 'Colega', body: { para: [] } })).status, 403);
  assert.equal((await api(base, 'POST', `/salas/tela/${pub.data.id}/para`, { who: 'Gamer', body: { para: [] } })).status, 200);
  assert.equal((await auth(ver.data.token, 'read')).status, 401); // tirado da sala: o passe antigo não abre mais
  assert.equal((await api(base, 'POST', `/salas/tela/${pub.data.id}/end`, { who: 'Gamer' })).status, 200);
  assert.equal((await auth(pub.data.token, 'publish')).status, 401);
  // Sem servidor de vídeo: avisa e o app fica na demonstração.
  assert.equal((await api(offBase, 'POST', '/salas/tela', { who: undefined, body: { sala: 'x' } })).status, 401);
});
