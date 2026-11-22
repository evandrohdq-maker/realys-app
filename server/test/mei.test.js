// Valores do MEI: calculados do salário mínimo, atualizados pelo Banco Central e com o limite pela data.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-mei-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('MEI: DAS e limite se atualizam sozinhos', async () => {
  const v = await (await fetch(base + '/mei/valores')).json();
  assert.equal(v.inss, 81.05);
  assert.deepEqual(v.das, { servico: 86.05, comercio: 82.05, misto: 87.05 });
  // Limite pela data: 2026 = 81 mil; 2027 = 110 mil; 2028 = 140 mil.
  assert.equal(app.meiValores.valores(new Date(2026, 5, 1)).limiteAno, 81000);
  assert.equal(app.meiValores.valores(new Date(2027, 0, 2)).limiteAno, 110000);
  assert.equal(app.meiValores.valores(new Date(2028, 0, 2)).limiteAno, 140000);
  // Banco Central com salário mínimo novo: o DAS muda junto.
  const bc = async () => ({ ok: true, json: async () => [{ data: '01/01/2027', valor: '1700.00' }] });
  const r = await app.meiValores.atualizar(bc);
  assert.equal(r.ok, true);
  assert.equal(app.meiValores.valores().inss, 85);
  assert.equal(app.meiValores.valores().das.servico, 90);
  // Resposta estranha não estraga nada.
  const lixo = async () => ({ ok: true, json: async () => [{ data: 'x', valor: '12' }] });
  assert.equal((await app.meiValores.atualizar(lixo)).ok, false);
  assert.equal(app.meiValores.valores().salarioMinimo, 1700);
});
