// Reels no servidor: empresa publica na área dela, todo mundo vê, apagar o próprio.
// Base copiada do robô das duas contas: faz tudo o que duas pessoas fazem uma com a outra no Realyz, do jeito que o
// app e o site fazem (mesmos endereços do servidor). Se algo quebrar, o relatório diz em português
// qual passo falhou, para corrigir antes de ir para o servidor.
//   npm test   (roda sozinho no GitHub a cada mudança no servidor)
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
const enviados = []; // e-mails que o servidor mandaria (código do esqueci a senha)

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realyz-reels-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true, mail: { ready: true, send: async (m) => enviados.push(m) } }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function api(method, path, { who, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, data };
}
// passo: o que a pessoa estava fazendo (aparece no relatório se falhar).
const ok = async (passo, ...a) => {
  const r = await api(...a);
  assert.ok(r.status < 300, `FALHOU: ${passo} → ${a[0]} ${a[1]} respondeu ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data;
};

const keep = (who, d) => (S[who] = { token: d.accessToken, id: d.user.id });
test('reels: empresa publica no Food e o cliente vê', async () => {
  keep('emp', await ok('empresa se cadastrar', 'POST', '/auth/signup', { body: { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name: 'Pizzaria da Praça', doc: '11.222.333/0001-81', username: 'pizzaria', email: 'contato@pizzaria.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO, segment: 'Restaurante' } }));
  keep('cli', await ok('cliente se cadastrar', 'POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Ana Teste', doc: '529.982.247-25', username: 'anateste', email: 'ana@realyz.com.br', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO } }));
  const up = await ok('subir o vídeo', 'PUT', '/media', { who: 'emp', raw: Buffer.from('video-de-teste-0123456789'), headers: { 'Content-Type': 'video/mp4' } });
  const video = up.url;
  const semVideo = await api('POST', '/reels', { who: 'emp', body: { titulo: 'x' } });
  assert.equal(semVideo.status, 400);
  const rl = await ok('publicar o Reel no Food', 'POST', '/reels', { who: 'emp', body: { video, titulo: 'Saindo do forno', area: 'food' } });
  assert.equal(rl.area, 'food');
  assert.equal(rl.anuncio, true);
  const l = await ok('cliente ver os Reels do Food', 'GET', '/reels?area=food', { who: 'cli' });
  assert.equal(l.length, 1);
  assert.equal(l[0].autor.nome, 'Pizzaria da Praça');
  const pessoa = await ok('pessoa publicar (vai para a Comunidade)', 'POST', '/reels', { who: 'cli', body: { video, titulo: 'Meu dia', area: 'food' } });
  assert.equal(pessoa.area, 'comunidade');
  await ok('contar visualização', 'POST', `/reels/${rl.id}/visto`, { who: 'cli' });
  const outro = await api('DELETE', `/reels/${rl.id}`, { who: 'cli' });
  assert.equal(outro.status, 404, 'só o dono apaga');
  await ok('empresa apagar', 'DELETE', `/reels/${rl.id}`, { who: 'emp' });
  assert.equal((await ok('lista depois de apagar', 'GET', '/reels?area=food', { who: 'cli' })).length, 0);
});
