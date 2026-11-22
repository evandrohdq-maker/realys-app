// Anti-desvio nas conversas: contato e pagamento ficam no Realyz; quem vende só manda o pedido de contato.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { antiDesvio } from '../src/moderacaoTexto.js';

let app, base, dir;
const S = {};
async function api(method, path, { who, body } = {}) {
  const h = {};
  if (who) h.Authorization = `Bearer ${S[who].token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await res.text();
  let data;
  try {
    data = JSON.parse(t);
  } catch (e) {
    data = t;
  }
  return { status: res.status, data };
}
const signup = async (who, extra) => {
  const r = await api('POST', '/auth/signup', { body: { password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v20', ...extra } });
  assert.ok(r.status < 300, JSON.stringify(r.data));
  S[who] = { token: r.data.accessToken, id: r.data.user.id };
};

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-desvio-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'x' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  await signup('ana', { kind: 'pessoa', name: 'Ana', doc: '529.982.247-25', username: 'ana_d', email: 'ana_d@realys.com' });
  await signup('beto', { kind: 'pessoa', name: 'Beto', doc: '111.444.777-35', username: 'beto_d', email: 'beto_d@realys.com' });
  await signup('loja', { kind: 'empresa', name: 'Loja Teste', doc: '11.222.333/0001-81', username: 'loja_d', email: 'loja_d@realys.com', segment: 'Loja' });
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('detecta telefone, Pix, WhatsApp e "por fora", sem barrar conversa normal', () => {
  for (const t of ['me chama no zap', '(54) 99999-1234', 'paga por fora', 'manda um pix na minha chave', 'ana@gmail.com', 'https://wa.me/5554'])
    assert.equal(antiDesvio(t).ok, false, t);
  for (const t of ['Quero orçamento para pintar a casa', 'R$ 150 a visita, amanhã às 14h', 'Rua 7 de Setembro 1500']) assert.equal(antiDesvio(t).ok, true, t);
});

test('conversa: sem contato aceito não passa telefone; empresa só manda o pedido de contato', async () => {
  const msg = (who, to, text) => api('POST', '/messages', { who, body: { toId: S[to].id, text } });
  assert.equal((await msg('ana', 'beto', 'Me chama no zap (54) 99999-1234')).status, 422);
  assert.equal((await msg('ana', 'beto', 'Oi Beto!')).status, 201);
  // Empresa vendendo para quem não aceitou o contato: só a primeira mensagem.
  assert.equal((await msg('loja', 'ana', 'Olá! Temos promoção hoje no Realyz.')).status, 201);
  const seg = await msg('loja', 'ana', 'Viu a promoção?');
  assert.equal(seg.status, 403);
  assert.equal(seg.data.code || seg.data.kind || 'contato_pendente', 'contato_pendente');
  // A cliente respondeu: a conversa abre, mas contato/pagamento por fora continua barrado (é negócio).
  assert.equal((await msg('ana', 'loja', 'Quero ver!')).status, 201);
  assert.equal((await msg('loja', 'ana', 'Claro, veja o catálogo')).status, 201);
  assert.equal((await msg('loja', 'ana', 'Faz um pix direto pra mim que sai mais barato')).status, 422);
  // Amigos que aceitaram o contato: conversa livre.
  assert.ok((await api('POST', `/friends/${S.beto.id}`, { who: 'ana' })).status < 300);
  assert.ok((await api('POST', `/friends/${S.ana.id}`, { who: 'beto' })).status < 300);
  assert.equal((await msg('ana', 'beto', 'Meu número novo é (54) 99999-1234')).status, 201);
  // Amiga de uma empresa: virar amigo não libera o número (um dos dois vende).
  assert.ok((await api('POST', `/friends/${S.loja.id}`, { who: 'ana' })).status < 300);
  assert.ok((await api('POST', `/friends/${S.ana.id}`, { who: 'loja' })).status < 300);
  assert.equal((await msg('loja', 'ana', 'Me chama no zap (54) 99999-1234')).status, 422);
});
