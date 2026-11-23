// Rádios e TVs no servidor: cadastrar com logo, aparecer para todos, seguir e avisar quem segue.
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
  dir = mkdtempSync(join(tmpdir(), 'realyz-est-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const call = async (method, path, token, body) => {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const conta = async (name, doc, username) => (await call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO })).data.accessToken;

test('estações: cadastrar, listar para todos, seguir e avisar ao vivo', async () => {
  const dono = await conta('Julio Rádio', '529.982.247-25', 'julioradio');
  const fa = await conta('Fã Ouvinte', '111.444.777-35', 'faouvinte');
  assert.equal((await call('POST', '/estacoes', dono, { kind: 'radio', name: 'Rádio X', url: 'https://site.com/pagina.html' })).status, 400); // página, não áudio
  const e = await call('POST', '/estacoes', dono, { kind: 'radio', name: 'Sky Plus', url: 'https://stm1.voxpainel.com.br:7004/stream', genre: 'Variedades', logo: 'https://api.realyz.com.br/media/abc123.jpg' });
  assert.equal(e.status, 200, JSON.stringify(e.data));
  assert.equal(e.data.logo, '/media/abc123.jpg');
  const lista = await call('GET', '/estacoes?kind=radio', fa);
  assert.equal(lista.data[0].name, 'Sky Plus');
  assert.equal(lista.data[0].mine, false);
  assert.equal((await call('POST', '/estacoes', fa, { id: e.data.id, kind: 'radio', name: 'Roubada', url: 'https://x.com/s' })).status, 403); // não é dono
  assert.equal((await call('POST', `/estacoes/${e.data.id}/seguir`, fa)).data.seguindo, true);
  const av = await call('POST', `/estacoes/${e.data.id}/aovivo`, dono, { texto: 'Programa da tarde no ar' });
  assert.equal(av.data.avisados, 1);
  assert.equal((await call('POST', `/estacoes/${e.data.id}/aovivo`, dono)).status, 429); // de novo logo em seguida, não
  assert.equal((await call('DELETE', `/estacoes/${e.data.id}`, dono)).status, 200);
  assert.equal((await call('GET', '/estacoes?kind=radio', fa)).data.length, 0);
});
