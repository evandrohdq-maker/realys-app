// Convites de chamada por link: gerar, página pública, cadastro de quem não tinha o app e entrada na sala.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
const S = {};
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-conv-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', publicUrl: 'https://realys.exemplo' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function api(method, path, { who, body } = {}) {
  const h = {};
  if (who) h.Authorization = `Bearer ${S[who]}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, data, type: res.headers.get('content-type') };
}
const signup = async (who, name, doc, username) => {
  const r = await api('POST', '/auth/signup', { body: { kind: 'pessoa', name, doc, username, email: `${username}@realys.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO } });
  assert.ok(r.status < 300, JSON.stringify(r.data));
  S[who] = r.data.accessToken;
};

test('convite de chamada: link por fora do app, cadastro e entrada na sala', async () => {
  await signup('ana', 'Ana Paula Souza', '529.982.247-25', 'ana');
  const inv = await api('POST', '/convites/chamada', { who: 'ana', body: { sid: 'sv-realys', cid: 'v1', server: 'Realyz Gamers', room: 'Squad' } });
  assert.equal(inv.status, 201);
  assert.match(inv.data.code, /^[A-Z2-9]{6}$/);
  assert.equal(inv.data.url, `https://realys.exemplo/c/${inv.data.code}`);

  // Precisa de conta para gerar.
  assert.equal((await api('POST', '/convites/chamada', { body: { sid: 'a', cid: 'b' } })).status, 401);

  // Página pública: só o primeiro nome de quem chamou, a sala, abrir no app e baixar.
  const page = await api('GET', `/c/${inv.data.code}`);
  assert.equal(page.status, 200);
  assert.match(page.type, /text\/html/);
  assert.match(page.data, /Ana te chamou/);
  assert.doesNotMatch(page.data, /Souza/);
  assert.match(page.data, /Squad/);
  assert.match(page.data, /intent:\/\/chamada\//);
  assert.match(page.data, /baixar\/realyz\.apk/);
  assert.equal((await api('GET', '/c/ZZZZZZ')).status, 404);

  const info = await api('GET', `/convites/${inv.data.code.toLowerCase()}`);
  assert.equal(info.data.host, 'Ana');
  assert.equal(info.data.expired, false);

  // Quem não tinha o app se cadastra e entra na chamada.
  assert.equal((await api('POST', `/convites/${inv.data.code}/entrar`, { body: {} })).status, 401);
  await signup('caio', 'Caio Novo', '111.444.777-35', 'caio');
  const entrou = await api('POST', `/convites/${inv.data.code}/entrar`, { who: 'caio', body: {} });
  assert.equal(entrou.status, 200);
  assert.deepEqual({ sid: entrou.data.sid, cid: entrou.data.cid, room: entrou.data.room }, { sid: 'sv-realys', cid: 'v1', room: 'Squad' });
  assert.equal(entrou.data.host, 'Ana Paula Souza');

  // Expirado: não entra mais.
  app.db.prepare('UPDATE call_invites SET expires_at = 1 WHERE code = ?').run(inv.data.code);
  assert.equal((await api('POST', `/convites/${inv.data.code}/entrar`, { who: 'caio', body: {} })).status, 410);
  assert.equal((await api('GET', `/c/${inv.data.code}`)).status, 404);
});
