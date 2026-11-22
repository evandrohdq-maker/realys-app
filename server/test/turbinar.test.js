// Turbinar: paga na hora, cobra só o entregue (R$ 12 por mil visualizações ou R$ 0,60 por clique) e devolve o resto.
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
  dir = mkdtempSync(join(tmpdir(), 'realys-tb-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body, okStatus = true) {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (okStatus && !res.ok) throw new Error(`${res.status} ${data.error}`);
  return okStatus ? data : { status: res.status, data };
}
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const saldo = async (t) => (await call('GET', '/wallet', t)).balance;

test('turbinar: valores, cobrança pelo entregue e devolução', async () => {
  const v = await call('GET', '/turbinar/valores');
  assert.equal(v.cpm, 12);
  assert.equal(v.minDia, 5);
  const dono = await pessoa('Dona do Reel', '52998224725', 'donareel');
  const fa = await pessoa('Fã Um', '11144477735', 'fa1');
  await call('POST', '/wallet/deposit', dono.accessToken, { amount: 100 });

  assert.equal((await call('POST', '/turbinar', dono.accessToken, { alvo: 'reel1', objetivo: 'seguidores', porDia: 2, dias: 1 }, false)).status, 400); // abaixo do mínimo
  const b = await call('POST', '/turbinar', dono.accessToken, { alvo: 'reel1', alvoTipo: 'reel', objetivo: 'seguidores', porDia: 5, dias: 1 });
  assert.equal(b.total, 5);
  assert.equal(b.estimativa.visualizacoes, 416);
  assert.equal(await saldo(dono.accessToken), 95);

  const lista = await call('GET', '/turbinados?tipo=reel', fa.accessToken);
  assert.equal(lista.length, 1);
  await call('POST', `/turbinar/${b.id}/evento`, fa.accessToken, { tipo: 'view' });
  await call('POST', `/turbinar/${b.id}/evento`, fa.accessToken, { tipo: 'view' }); // repetido não conta
  await call('POST', `/turbinar/${b.id}/evento`, fa.accessToken, { tipo: 'seguidor' });
  const meus = await call('GET', '/turbinar', dono.accessToken);
  assert.equal(meus[0].views, 1);
  assert.equal(meus[0].seguidores, 1);

  // Parar: 1 visualização custou R$ 0,012 (1,2 centavo) → arredonda para 2 centavos; volta R$ 4,98.
  const parado = await call('POST', `/turbinar/${b.id}/parar`, dono.accessToken);
  assert.equal(parado.status, 'parado');
  assert.equal(parado.devolvido, 4.98);
  assert.equal(await saldo(dono.accessToken), 99.98);
});
