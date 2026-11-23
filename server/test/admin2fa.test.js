// Administrador: o painel só abre com o Google Authenticator ligado (ADMIN_2FA, ligado em produção).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { codigoEm } from '../src/totp.js';

let app, base, dir, token;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realyz-2fa-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', admin2fa: true }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const api = async (method, path, body) => {
  const h = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

test('admin sem Authenticator não abre o painel; com ele, abre e o login pede o código', async () => {
  token = (await api('POST', '/auth/login', { login: 'chefe', password: 'Admin12345' })).data.accessToken;
  assert.ok(token);
  assert.equal((await api('GET', '/admin/stats')).data.code, 'ativar_2fa', 'FALHOU: painel abriu sem a verificação em duas etapas');
  const ini = (await api('POST', '/me/2fa/iniciar')).data;
  assert.equal((await api('POST', '/me/2fa/ativar', { codigo: codigoEm(ini.segredo) })).status, 200);
  assert.equal((await api('GET', '/admin/stats')).status, 200, 'FALHOU: com o Authenticator ligado o painel continuou travado');
  assert.equal((await api('POST', '/me/2fa/desativar', { codigo: codigoEm(ini.segredo) })).status, 400, 'FALHOU: admin conseguiu desligar');
  token = null;
  assert.equal((await api('POST', '/auth/login', { login: 'chefe', password: 'Admin12345' })).data.code, 'codigo_2fa');
});
