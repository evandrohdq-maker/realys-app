// Testes de ponta a ponta: sobe um servidor de verdade (banco temporário) e usa a API como o app usaria.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app, base, dir;
const S = {}; // sessões: { token, session, id }

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true }));
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
let ckSeq = 0;
const newCkId = () => 'ck_t' + ++ckSeq;
const ok = async (...a) => {
  const r = await api(...a);
  assert.ok(r.status < 300, `${a[0]} ${a[1]} → ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
};
const keep = (who, d) => (S[who] = { token: d.accessToken, session: d.sessionToken, id: d.user.id });

test('cadastro: usuário (CPF) e empresa (CNPJ), com validações', async () => {
  keep('ana', await ok('POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Ana Paula', doc: '529.982.247-25', username: '@Ana', email: 'ana@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2' } }));
  keep('beto', await ok('POST', '/auth/signup', { body: { kind: 'pessoa', name: 'Beto Motorista', doc: '111.444.777-35', username: 'beto', email: 'beto@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2' } }));
  const e = await ok('POST', '/auth/signup', { body: { kind: 'empresa', name: 'Pizzaria da Praça', doc: '11.222.333/0001-81', username: 'pizzaria', email: 'contato@pizzaria.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2', segment: 'Restaurante' } });
  keep('pizza', e);
  assert.deepEqual(e.user.roles, ['empresa', 'fornecedor', 'usuario']);

  assert.equal((await api('POST', '/auth/signup', { body: { name: 'X', doc: '123.456.789-00', username: 'xx1', email: 'x@x.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2' } })).status, 400); // CPF inválido
  assert.equal((await api('POST', '/auth/signup', { body: { name: 'Outra', doc: '123.456.789-09', username: 'ana', email: 'o@x.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: '2026-11-adesao-v2' } })).status, 409); // usuário em uso
  assert.equal((await api('POST', '/auth/signup', { body: { name: 'Outra', doc: '123.456.789-09', username: 'outra', email: 'o@x.com', password: 'curta' } })).status, 400); // senha fraca
});

test('entrar com usuário, CPF ou CNPJ; sessão do aparelho; sair', async () => {
  assert.equal((await ok('POST', '/auth/login', { body: { login: 'ana', password: 'senha1234' } })).user.username, 'ana');
  assert.equal((await ok('POST', '/auth/login', { body: { login: '529.982.247-25', password: 'senha1234' } })).user.username, 'ana');
  assert.equal((await ok('POST', '/auth/login', { body: { login: '11222333000181', password: 'senha1234' } })).user.username, 'pizzaria');
  assert.equal((await api('POST', '/auth/login', { body: { login: 'ana', password: 'errada123' } })).status, 401);

  const d = await ok('POST', '/auth/login', { body: { login: 'beto', password: 'senha1234', device: 'celular da empresa' } });
  const ref = await ok('POST', '/auth/refresh', { body: { sessionToken: d.sessionToken } });
  assert.ok(ref.accessToken);
  await ok('POST', '/auth/logout', { who: 'beto', body: { sessionToken: d.sessionToken } });
  assert.equal((await api('POST', '/auth/refresh', { body: { sessionToken: d.sessionToken } })).status, 401);
  assert.equal((await api('GET', '/me')).status, 401);
  assert.equal((await ok('GET', '/me', { who: 'pizza' })).company.name, 'Pizzaria da Praça');
});

test('carteira e presentes: taxa de 5%, entra como crédito de presente, não saca', async () => {
  await ok('POST', '/wallet/deposit', { who: 'ana', body: { amount: 100, method: 'pix' } });
  const g = await ok('POST', '/gifts', { who: 'ana', body: { toId: S.beto.id, amount: 20, occasion: 'Obrigado', message: 'Valeu!' } });
  assert.equal(g.fee, 1);
  assert.equal(g.wallet.balance, 79);
  const wb = await ok('GET', '/wallet', { who: 'beto' });
  assert.equal(wb.giftCredits, 20);
  assert.equal(wb.balance, 0);
  // Crédito de presente não pode ser sacado nem usado para presentear.
  app.db.prepare(`INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?, ?, 'saque', NULL, ?)`).run(newCkId(), S.beto.id, Date.now());
  assert.equal((await api('POST', '/wallet/withdraw', { who: 'beto', body: { amount: 15, pixKey: 'beto@pix.com' } })).status, 402);
  assert.equal((await api('POST', '/gifts', { who: 'beto', body: { toId: S.ana.id, amount: 10 } })).status, 402);
  assert.equal((await api('POST', '/gifts', { who: 'ana', body: { toId: S.ana.id, amount: 10 } })).status, 400);
  assert.equal((await api('POST', '/gifts', { who: 'ana', body: { toId: S.beto.id, amount: 2 } })).status, 400); // mínimo R$ 5
});

test('loja e pedidos: preço do servidor, presente primeiro, estoque, cancelamento devolve', async () => {
  const p = await ok('POST', '/products', { who: 'pizza', body: { name: 'Pizza Margherita', price: 15, stock: 3, category: 'Food' } });
  assert.equal((await api('POST', '/products', { who: 'ana', body: { name: 'X', price: 1 } })).status, 403); // não é empresa
  await ok('POST', '/wallet/deposit', { who: 'beto', body: { amount: 50 } });

  const o = await ok('POST', '/orders', { who: 'beto', body: { items: [{ productId: p.id, qty: 2 }], address: 'Rua A, 10' } });
  assert.equal(o.orders[0].total, 30);
  assert.equal(o.orders[0].fromGift, 20);
  assert.equal(o.orders[0].fromWallet, 10);
  assert.equal((await ok('GET', '/wallet', { who: 'pizza' })).balance, 30);
  assert.equal((await api('POST', '/orders', { who: 'beto', body: { items: [{ productId: p.id, qty: 5 }] } })).status, 409); // sem estoque

  const sold = await ok('GET', '/companies/me/orders', { who: 'pizza' });
  assert.equal(sold.length, 1);
  app.db.prepare(`INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?, ?, 'venda', ?, ?)`).run(newCkId(), S.pizza.id, o.orders[0].id, Date.now());
  await ok('PATCH', `/orders/${o.orders[0].id}`, { who: 'pizza', body: { status: 'Cancelado' } });
  const wb = await ok('GET', '/wallet', { who: 'beto' });
  assert.equal(wb.giftCredits, 20);
  assert.equal(wb.balance, 50);
  assert.equal((await ok('GET', '/wallet', { who: 'pizza' })).balance, 0);
  assert.equal((await ok('GET', `/companies/${(await ok('GET', '/me', { who: 'pizza' })).company.id}`)).products[0].stock, 3);

  // Entregue → o cliente avalia.
  const o2 = await ok('POST', '/orders', { who: 'beto', body: { items: [{ productId: p.id, qty: 1 }] } });
  assert.equal((await api('POST', '/ratings', { who: 'beto', body: { targetKind: 'order', targetId: o2.orders[0].id, stars: 5 } })).status, 409);
  app.db.prepare(`INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?, ?, 'venda', ?, ?)`).run(newCkId(), S.pizza.id, o2.orders[0].id, Date.now());
  await ok('PATCH', `/orders/${o2.orders[0].id}`, { who: 'pizza', body: { status: 'Entregue' } });
  await ok('POST', '/ratings', { who: 'beto', body: { targetKind: 'order', targetId: o2.orders[0].id, stars: 5, comment: 'Quentinha!' } });
});

test('lives: presente ao vivo vira crédito de live e depois moeda Realys', async () => {
  const live = await ok('POST', '/lives', { who: 'pizza', body: { hostType: 'empresa', cat: 'compras', title: 'Pizza na pedra' } });
  assert.equal(live.host, 'Pizzaria da Praça');
  assert.equal((await ok('GET', '/lives?cat=compras')).length, 1);
  const before = (await ok('GET', '/wallet', { who: 'ana' })).balance;
  const g = await ok('POST', `/lives/${live.id}/gifts`, { who: 'ana', body: { gift: 'coroa', qty: 1 } });
  assert.equal(g.total, 52.5);
  assert.equal((await ok('GET', '/wallet', { who: 'ana' })).balance, +(before - 52.5).toFixed(2));
  assert.equal((await api('POST', `/lives/${live.id}/gifts`, { who: 'pizza', body: { gift: 'rosa' } })).status, 400); // própria live
  const w = await ok('GET', '/wallet', { who: 'pizza' });
  assert.equal(w.liveCredits, 50);
  const c = await ok('POST', '/wallet/convert-live', { who: 'pizza', body: {} });
  assert.equal(c.converted, 50);
  assert.equal(c.wallet.liveCredits, 0);
  assert.equal(c.wallet.balance, w.balance + 50);
  await ok('POST', `/lives/${live.id}/end`, { who: 'pizza' });
  assert.equal((await api('POST', `/lives/${live.id}/gifts`, { who: 'ana', body: { gift: 'rosa' } })).status, 404);
});

test('social: amizade, depoimento aceito, mensagens com aviso em tempo real', async () => {
  // Beto conecta o WebSocket para receber avisos.
  const events = [];
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws?token=${S.beto.token}`);
  await new Promise((r, j) => {
    ws.onmessage = (m) => {
      const e = JSON.parse(m.data);
      events.push(e);
      if (e.type === 'ready') r();
    };
    ws.onerror = j;
  });

  assert.equal((await ok('POST', `/friends/${S.beto.id}`, { who: 'ana' })).status, 'enviado');
  assert.equal((await ok('POST', `/friends/${S.ana.id}`, { who: 'beto' })).status, 'amigos');
  assert.equal((await ok('GET', '/friends', { who: 'ana' }))[0].friend, 'amigos');

  const t = await ok('POST', '/testimonials', { who: 'ana', body: { toId: S.beto.id, text: 'Motorista nota 10, super educado!' } });
  assert.equal((await ok('GET', `/users/${S.beto.id}`, { who: 'ana' })).testimonials.length, 0); // ainda pendente
  await ok('POST', `/testimonials/${t.id}/aceitar`, { who: 'beto' });
  assert.equal((await ok('GET', `/users/${S.beto.id}`, { who: 'ana' })).testimonials.length, 1);

  await ok('POST', '/messages', { who: 'ana', body: { toId: S.beto.id, text: 'Oi Beto, tá livre amanhã?' } });
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(events.some((e) => e.type === 'message' && e.data.text.includes('amanhã')), 'Beto recebeu a mensagem na hora');
  assert.ok(events.some((e) => e.type === 'friend_request'));
  const conv = await ok('GET', '/conversations', { who: 'beto' });
  assert.equal(conv[0].unread, 1);
  assert.equal((await ok('GET', `/messages/${S.ana.id}`, { who: 'beto' })).length, 1);
  assert.equal((await ok('GET', '/conversations', { who: 'beto' }))[0].unread, 0);
  ws.close();

  const post = await ok('POST', '/posts', { who: 'ana', body: { text: 'Bom dia, Realys!' } });
  await ok('POST', '/posts', { who: 'ana', body: { kind: 'story', text: 'Café ☕' } });
  assert.equal((await ok('GET', '/feed', { who: 'beto' }))[0].id, post.id);
  assert.equal((await ok('GET', '/stories', { who: 'beto' }))[0].items.length, 1);
  assert.equal((await ok('GET', '/users?q=ana', { who: 'beto' }))[0].username, 'ana');
});

test('prestadores: GPS, mais próximos, chamado, pagamento e avaliação', async () => {
  await ok('PUT', '/providers/me', { who: 'beto', body: { service: 'motorista', functions: ['Corridas na cidade', 'Aeroporto'], price: 8, priceUnit: 'corrida', vehicle: 'Onix prata' } });
  // Verificação facial (sem serviço de IA nos testes): cadastro aprovado e verificação recente.
  app.db.prepare(`INSERT INTO biometria (id, user_id, status, updated_at, last_verified_at) VALUES ('bio_beto', ?, 'aprovado', ?, ?)`).run(S.beto.id, Date.now(), Date.now());
  await ok('POST', '/providers/me/location', { who: 'beto', body: { lat: -23.5505, lng: -46.6333 } });
  const near = await ok('GET', '/providers/nearby?service=motorista&lat=-23.56&lng=-46.64', { who: 'ana' });
  assert.equal(near[0].name, 'Beto Motorista');
  assert.ok(near[0].distanceKm > 0 && near[0].distanceKm < 3);
  assert.ok((await ok('GET', '/me', { who: 'beto' })).user.roles.includes('prestador'));

  const call = await ok('POST', '/calls', { who: 'ana', body: { providerId: S.beto.id, address: 'Rua Augusta, 1200' } });
  assert.equal((await api('PATCH', `/calls/${call.id}`, { who: 'ana', body: { status: 'Concluído' } })).status, 403);
  assert.equal((await api('PATCH', `/calls/${call.id}`, { who: 'beto', body: { status: 'Aceito' } })).status, 403); // sem verificação do aceite
  app.db.prepare(`INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES ('ck_aceite', ?, 'aceite', ?, ?)`).run(S.beto.id, call.id, Date.now());
  await ok('PATCH', `/calls/${call.id}`, { who: 'beto', body: { status: 'Aceito' } });
  assert.equal((await api('PATCH', `/calls/${call.id}`, { who: 'beto', body: { status: 'Concluído' } })).status, 403); // sem verificação da finalização
  app.db.prepare(`INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES ('ck_final', ?, 'finalizacao', ?, ?)`).run(S.beto.id, call.id, Date.now());
  await ok('PATCH', `/calls/${call.id}`, { who: 'beto', body: { status: 'Concluído' } });
  const before = (await ok('GET', '/wallet', { who: 'beto' })).balance;
  await ok('POST', `/calls/${call.id}/pay`, { who: 'ana', body: { amount: 18 } });
  assert.equal((await ok('GET', '/wallet', { who: 'beto' })).balance, before + 18);
  await ok('POST', '/ratings', { who: 'ana', body: { targetKind: 'call', targetId: call.id, stars: 4 } });
  assert.equal((await ok('GET', `/providers/${S.beto.id}`)).ratingCount, 1);
  assert.equal((await api('POST', '/ratings', { who: 'ana', body: { targetKind: 'call', targetId: call.id, stars: 5 } })).status, 409); // só uma vez
});

test('mídia: envio de foto e leitura em pedaços (vídeo/música)', async () => {
  const bytes = Buffer.from('fake-jpeg-bytes-0123456789');
  const m = await ok('PUT', '/media', { who: 'ana', raw: bytes, headers: { 'Content-Type': 'image/jpeg' } });
  const full = await fetch(base + m.url);
  assert.equal(full.headers.get('content-type'), 'image/jpeg');
  assert.equal(Buffer.from(await full.arrayBuffer()).toString(), bytes.toString());
  const part = await fetch(base + m.url, { headers: { Range: 'bytes=0-3' } });
  assert.equal(part.status, 206);
  assert.equal(await part.text(), 'fake');
  assert.equal((await api('PUT', '/media', { who: 'ana', raw: Buffer.from('x'), headers: { 'Content-Type': 'application/zip' } })).status, 415);
});

test('administrador: visão geral, denúncia procedente e bloqueio de conta', async () => {
  const d = await ok('POST', '/auth/login', { body: { login: 'chefe', password: 'Admin12345' } });
  S.admin = { token: d.accessToken, id: d.user.id };
  assert.equal((await api('GET', '/admin/stats', { who: 'ana' })).status, 403);
  const st = await ok('GET', '/admin/stats', { who: 'admin' });
  assert.equal(st.users, 3); // ana, beto e o administrador
  assert.equal(st.companies, 1);
  assert.ok(st.revenue > 0); // taxas de presentes

  const post = (await ok('GET', '/feed', { who: 'beto' }))[0];
  const rep = await ok('POST', '/reports', { who: 'beto', body: { targetKind: 'post', targetId: post.id, reason: 'Notícia falsa' } });
  await ok('POST', `/admin/reports/${rep.id}/procedente`, { who: 'admin' });
  assert.equal((await ok('GET', '/feed', { who: 'beto' })).length, 0); // marcado como falso some do feed

  await ok('POST', `/admin/users/${S.beto.id}/bloquear`, { who: 'admin' });
  assert.equal((await api('GET', '/wallet', { who: 'beto' })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { login: 'beto', password: 'senha1234' } })).status, 403);
});

test('saque: sai do saldo e fica pendente até o administrador pagar', async () => {
  app.db.prepare(`INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?, ?, 'saque', NULL, ?)`).run(newCkId(), S.pizza.id, Date.now());
  const w = await ok('POST', '/wallet/withdraw', { who: 'pizza', body: { amount: 20, pixKey: '11.222.333/0001-81' } });
  assert.equal(w.status, 'pendente');
  const list = await ok('GET', '/admin/withdrawals', { who: 'admin' });
  assert.equal(list.length, 1);
  await ok('POST', `/admin/withdrawals/${list[0].id}/recusar`, { who: 'admin' });
  assert.equal((await ok('GET', '/wallet', { who: 'pizza' })).balance, w.wallet.balance + 20);
});
