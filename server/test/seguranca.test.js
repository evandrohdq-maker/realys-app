import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

let app, base, dir;
const T = {};
const api = async (m, p, { who, body } = {}) => {
  const h = { 'Content-Type': 'application/json' };
  if (who) h.Authorization = `Bearer ${T[who]}`;
  const r = await fetch(base + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-seg-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x', adminPassword: 'admin12345', adminUsername: 'admin', mail: { ready: true, send: async () => ({ sent: true }) }, conselhos: { ready: false, check: async () => ({ status: 'manual' }) } }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const mk = async (k, name, doc, username) => {
    const s = await api('POST', '/auth/signup', { body: { kind: 'pessoa', name, doc, username, email: `${username}@realys.com`, password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v13' } });
    T[k] = s.data.accessToken;
  };
  await mk('vitima', 'Carla Dias', '529.982.247-25', 'carladias');
  await mk('pm', 'Rui Costa', '111.444.777-35', 'ruicosta');
  T.admin = (await api('POST', '/auth/login', { body: { login: 'admin', password: 'admin12345' } })).data.accessToken;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('plantão: só com carteira aprovada; o policial mais perto é avisado; chamada falsa bloqueia a conta', async () => {
  assert.equal((await api('POST', '/plantao', { who: 'pm', body: { on: true, lat: -30.03, lon: -51.22 } })).status, 403);
  const c = await api('POST', '/credenciais', { who: 'pm', body: { prof: 'policial', numero: '777', uf: 'RS', orgao: 'Brigada Militar' } });
  await api('POST', `/admin/credenciais/${c.data.id}/aprovar`, { who: 'admin' });
  await api('POST', `/credenciais/${c.data.id}/casos`, { who: 'pm', body: { on: true } });
  assert.equal((await api('POST', '/plantao', { who: 'pm', body: { on: true, lat: -30.03, lon: -51.22 } })).data.on, true);

  const a = await api('POST', '/alertas', { who: 'vitima', body: { kind: 'perigo', tipo: 'Pessoa em perigo agora', lat: -30.031, lon: -51.221, endereco: 'Rua A, 10 · Centro · Porto Alegre - RS' } });
  assert.equal(a.status, 201);
  assert.equal(a.data.profissionalAvisado, true);

  const casos = await api('GET', '/casos', { who: 'pm' });
  assert.equal(casos.data.items.length, 1);
  assert.equal(casos.data.items[0].quem, undefined); // nunca o nome de quem pediu
  assert.equal((await api('POST', `/casos/${a.data.id}/acompanhar`, { who: 'pm' })).status, 200);

  const fila = await api('GET', '/admin/alertas', { who: 'admin' });
  assert.equal(fila.data.items[0].status, 'em_acompanhamento');
  const f = await api('POST', `/admin/alertas/${a.data.id}/falso`, { who: 'admin', body: {} });
  assert.equal(f.data.contaBloqueada, true);
  assert.notEqual((await api('GET', '/wallet', { who: 'vitima' })).status, 200); // sessão encerrada
  const login = await api('POST', '/auth/login', { body: { login: 'carladias', password: 'senha1234' } });
  assert.notEqual(login.status, 200); // conta bloqueada
});
