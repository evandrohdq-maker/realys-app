// Espaço das conversas: canais de grupo (limite de mensagens e limpeza mensal com aviso),
// conversas particulares guardadas (só as mídias saem quando passam do limite, depois do aviso),
// limpar para mim e exportar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';
import { makeLimpezaConversas, MAX_MSGS_GRUPO } from '../src/limpezaConversas.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-limp-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body, headers) {
  const raw = Buffer.isBuffer(body);
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) }, body: raw ? body : body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error}`);
  return data;
}
const pessoa = (name, doc, username) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@t.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });

test('grupos: canal real, limite de mensagens, aviso no dia 24 e limpeza no dia 1º', async () => {
  const a = await pessoa('Ana A', '52998224725', 'anaa');
  const b = await pessoa('Beto B', '11144477735', 'betob');
  await call('POST', '/grupos/arena:sv1:c1/msgs', a.accessToken, { text: 'bora jogar?' });
  const lista = await call('GET', '/grupos/arena:sv1:c1/msgs', b.accessToken);
  assert.equal(lista[0].text, 'bora jogar?');
  assert.equal(lista[0].who, 'Ana A');
  await assert.rejects(call('POST', '/grupos/qualquer/msgs', a.accessToken, { text: 'x' }), /400/);

  const db = app.db;
  const avisos = [];
  const l = makeLimpezaConversas({ db, hub: { send: (u, t, d) => avisos.push({ u, t, d }) }, cfg: { dataDir: dir, conversaLimiteMb: 1 } });
  // Limite de mensagens por canal.
  const ins = db.prepare('INSERT INTO grupo_msgs (id, grupo, user_id, text, created_at) VALUES (?,?,?,?,?)');
  for (let i = 0; i < MAX_MSGS_GRUPO + 5; i++) ins.run('g' + i, 'hub:s1:c1', a.user.id, 'm' + i, 1000 + i);
  assert.equal(l.limitarGrupo('hub:s1:c1'), 5);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM grupo_msgs WHERE grupo = 'hub:s1:c1'").get().n, MAX_MSGS_GRUPO);
  // Aviso e limpeza mensal (datas simuladas).
  db.prepare("DELETE FROM grupo_msgs WHERE grupo = 'hub:s1:c1'").run();
  ins.run('old', 'arena:sv2:c1', b.user.id, 'outubro', Date.parse('2026-10-10T15:00:00Z'));
  assert.equal(l.avisarGrupos(Date.parse('2026-10-20T15:00:00Z')).avisados, 0);
  assert.ok(l.avisarGrupos(Date.parse('2026-10-25T15:00:00Z')).avisados >= 1);
  assert.ok(avisos.some((x) => x.u === b.user.id && x.t === 'limpeza_grupos'));
  const exp = await call('GET', '/grupos/arena:sv2:c1/exportar?nome=geral', b.accessToken);
  assert.match(exp.texto, /outubro/);
  const r = l.limparGrupos(Date.parse('2026-11-01T12:00:00Z'));
  assert.ok(r.apagadas >= 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM grupo_msgs WHERE id = 'old'").get().n, 0);
});

test('particular: fica guardada; com anexos acima do limite avisa e depois tira só as mídias; limpar para mim', async () => {
  const a = await pessoa('Caio C', '39053344705', 'caioc');
  const b = await pessoa('Duda D', '12345678909', 'dudad');
  // Anexo privado (foto) mandado na conversa.
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8ffbf1e0005fe02fe0dc9e0f20000000049454e44ae426082', 'hex');
  const up = await call('PUT', '/media?uso=privado', a.accessToken, png, { 'Content-Type': 'image/png' });
  const msg = await call('POST', '/messages', a.accessToken, { toId: b.user.id, media: up.url });
  assert.equal(msg.media, up.url);
  await call('POST', '/messages', a.accessToken, { toId: b.user.id, text: 'texto fica' });
  const hist = await call('GET', `/messages/${a.user.id}`, b.accessToken);
  assert.equal(hist[0].media, up.url);

  const db = app.db;
  db.prepare('UPDATE messages SET media_size = ? WHERE id = ?').run(2 * 1024 * 1024, msg.id); // finge 2 MB
  const avisos = [];
  const l = makeLimpezaConversas({ db, hub: { send: (u, t, d) => avisos.push({ u, t, d }) }, cfg: { dataDir: dir, conversaLimiteMb: 1 } });
  assert.equal(l.espacoParticulares().avisados, 2, 'as duas pessoas são avisadas');
  assert.equal(l.espacoParticulares().avisados, 0, 'aviso uma vez');
  assert.ok(existsSync(join(dir, 'media', up.id)), 'antes do prazo, nada sai');
  db.prepare('UPDATE avisos_espaco SET apagar_em = ?').run(Date.now() - 1);
  assert.equal(l.espacoParticulares().liberadoMb, 2);
  assert.ok(!existsSync(join(dir, 'media', up.id)), 'a mídia saiu');
  const depois = await call('GET', `/messages/${a.user.id}`, b.accessToken);
  assert.equal(depois.length, 2, 'as mensagens (texto) ficam');
  assert.match(depois[0].text, /mídia apagada/);

  // Exportar a conversa e limpar para mim.
  const ex = await call('GET', `/messages/${b.user.id}/exportar`, a.accessToken);
  assert.match(ex.texto, /texto fica/);
  await call('POST', `/messages/${b.user.id}/limpar`, a.accessToken);
  assert.equal((await call('GET', `/messages/${b.user.id}`, a.accessToken)).length, 0, 'sumiu para mim');
  assert.equal((await call('GET', `/messages/${a.user.id}`, b.accessToken)).length, 2, 'a outra pessoa ainda vê');
  const r = await call('POST', `/messages/${a.user.id}/limpar`, b.accessToken);
  assert.equal(r.apagadasDoServidor, 2, 'os dois limparam: sai do servidor');
});
