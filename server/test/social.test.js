// Posts entre contas reais: o amigo vê no feed, curte e comenta; o autor é avisado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
const avisos = [];
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-soc-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  const send = app.hub.send.bind(app.hub);
  app.hub.send = (u, type, data) => (avisos.push({ u, type, data }), send(u, type, data));
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
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });

test('post do amigo: aparece no feed e no perfil, curtir e comentar', async () => {
  const eva = await pessoa('Evandro Q', '52998224725', 'evandrohq');
  const edu = await pessoa('Eduardo H', '11144477735', 'eduardo_ph');
  await call('POST', `/friends/${edu.user.id}`, eva.accessToken);
  await call('POST', `/friends/${eva.user.id}`, edu.accessToken);
  const p = await call('POST', '/posts', edu.accessToken, { text: 'Churrasco no domingo!', visibility: 'amigos' });
  const st = await call('POST', '/posts', edu.accessToken, { kind: 'story', text: 'Bom dia' });
  const feed = await call('GET', '/feed', eva.accessToken);
  assert.equal(feed[0].id, p.id);
  assert.equal(feed[0].likes, 0);
  const stories = await call('GET', '/stories', eva.accessToken);
  assert.equal(stories[0].items[0].id, st.id);

  assert.deepEqual(await call('POST', `/posts/${p.id}/curtir`, eva.accessToken), { liked: true, likes: 1 });
  const c = await call('POST', `/posts/${p.id}/comentarios`, eva.accessToken, { text: 'Tô dentro!' });
  assert.equal(c.author.name, 'Evandro Q');
  assert.ok(avisos.some((a) => a.u === edu.user.id && a.type === 'comentario'));
  const [f2] = await call('GET', '/feed', eva.accessToken);
  assert.equal(f2.liked, true);
  assert.equal(f2.comments, 1);
  const perfil = await call('GET', `/users/${edu.user.id}`, eva.accessToken);
  assert.equal(perfil.posts[0].likes, 1);
  assert.deepEqual(await call('POST', `/posts/${p.id}/curtir`, eva.accessToken), { liked: false, likes: 0 });
  assert.equal((await call('GET', `/posts/${p.id}/comentarios`, edu.accessToken)).length, 1);
  // O dono do post apaga o comentário.
  await call('DELETE', `/comentarios/${c.id}`, edu.accessToken);
  assert.equal((await call('GET', `/posts/${p.id}/comentarios`, eva.accessToken)).length, 0);

  // Quem não é amigo não vê post só para amigos.
  const ana = await pessoa('Ana S', '39053344705', 'anas');
  assert.ok(!(await call('GET', '/feed', ana.accessToken)).some((x) => x.id === p.id));
  await assert.rejects(call('POST', `/posts/${p.id}/curtir`, ana.accessToken), /404/);
});
