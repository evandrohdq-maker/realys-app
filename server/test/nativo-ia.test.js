// Realyz nativo de IA: planos (limite do atendente), Proteção Realyz (golpe e fake news na fila do
// administrador) e painel de inteligência (buscas em alta, demanda escondida, preço contra o mercado).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { makeIA } from '../src/ia/index.js';
import { pontuarGolpe, pontuarFake, BARRA, FILA } from '../src/protecao.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-nativo-'));
  const cfg = loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true, iaUrl: 'http://modelo.teste' });
  // Modelo falso: dá parecer de fake news e responde clientes.
  cfg.ia = makeIA(cfg, {
    send: async (path, body) => {
      const sis = body.messages[0].content;
      if (/notícias falsas/.test(sis)) return { message: { content: 'Provável falso: não existe cura comprovada para essa doença.' } };
      return { message: { content: 'Temos sim! Quer ver o catálogo no app?' } };
    },
  });
  app = createApp(cfg);
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
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status, code: data.code });
  return data;
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// CPF e CNPJ válidos para cada conta de teste.
function cpf(n) {
  const b = String(100000000 + n).slice(0, 9).split('').map(Number);
  const dv = (arr, peso) => {
    const s = arr.reduce((t, d, i) => t + d * (peso - i), 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  b.push(dv(b, 10));
  b.push(dv(b, 11));
  return b.join('');
}
function cnpj(n) {
  const b = String(10000000 + n).slice(0, 8).split('').map(Number).concat([0, 0, 0, 1]);
  const dv = (arr) => {
    const pesos = arr.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = arr.reduce((t, d, i) => t + d * pesos[i], 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  b.push(dv(b));
  b.push(dv(b));
  return b.join('');
}
let seq = 0;
const pessoa = (nome) => {
  seq++;
  return call('POST', '/auth/signup', null, { kind: 'pessoa', name: nome, doc: cpf(seq * 7919), username: `p${seq}x`, email: `p${seq}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
};
const loja = (nome) => {
  seq++;
  return call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: cpf(seq * 104729), name: nome, doc: cnpj(seq * 3571), username: `l${seq}x`, email: `l${seq}@teste.com`, password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO });
};
const admin = () => call('POST', '/auth/login', null, { login: 'chefe', password: 'Admin12345' });

test('sinais de golpe e de fake news', () => {
  assert.ok(pontuarGolpe('Parabéns você ganhou! Pague a taxa para liberar o seu prêmio e confirme seus dados').pontos >= BARRA);
  assert.ok(pontuarGolpe('Renda extra garantida, clique no link').pontos >= FILA);
  assert.equal(pontuarGolpe('Pizza grande com borda recheada, entregamos no Centro').pontos, 0);
  assert.ok(pontuarFake('URGENTE: compartilhe antes que apaguem, cura do câncer que a mídia não mostra').pontos >= FILA);
  assert.equal(pontuarFake('Hoje tem promoção de pastel na feira').pontos, 0);
});

test('planos: teste de 30 dias, pedido e ativação pelo administrador', async () => {
  const pub = await call('GET', '/planos');
  assert.deepEqual(pub.planos.map((p) => p.id), ['gratis', 'realyz', 'pro']);
  assert.equal(pub.planos[1].mensal, 49.9);
  assert.equal(pub.planos[2].anual, 809.1);

  const l = await loja('Loja dos Planos');
  let meu = await call('GET', '/planos/meu', l.accessToken);
  assert.equal(meu.atual.status, 'teste');
  assert.equal(meu.atual.id, 'pro');

  meu = await call('POST', '/planos/pedir', l.accessToken, { plano: 'realyz', ciclo: 'anual' });
  assert.equal(meu.atual.pedido.plano, 'realyz');
  const p = await pessoa('Cliente Comum');
  await assert.rejects(call('POST', '/planos/pedir', p.accessToken, { plano: 'pro' }), /empresas e prestadores/);

  const a = await admin();
  const pedidos = await call('GET', '/admin/planos', a.accessToken);
  assert.ok(pedidos.some((x) => x.userId === l.user.id && x.planoId === 'realyz'));
  await call('POST', `/admin/planos/${l.user.id}`, a.accessToken, { plano: 'realyz', ciclo: 'anual' });
  meu = await call('GET', '/planos/meu', l.accessToken);
  assert.equal(meu.atual.status, 'ativo');
  assert.equal(meu.atual.id, 'realyz');
  assert.equal(meu.uso.limite, 3000);
});

test('atendente: acabou o limite do plano, a conversa vai para a equipe', async () => {
  const l = await loja('Lanchonete Limite');
  const c = await pessoa('Cliente do Limite');
  await call('PUT', '/ia/ficha', l.accessToken, { ligado: true, horario: '18h às 23h' });
  // Conta antiga (passou o teste) no plano Grátis, já com as 150 respostas do mês usadas.
  const db = app.db;
  db.prepare('UPDATE users SET created_at = ? WHERE id = ?').run(Date.now() - 60 * 86400000, l.user.id);
  const ins = db.prepare('INSERT INTO messages (id, from_id, to_id, text, created_at, ia) VALUES (?,?,?,?,?,1)');
  for (let i = 0; i < 150; i++) ins.run(`m_lim_${i}`, l.user.id, c.user.id, `resposta ${i}`, Date.now() - 1000 + i);
  const f = await call('GET', '/ia/ficha', l.accessToken);
  assert.equal(f.plano.id, 'gratis');
  assert.equal(f.uso.respostas, 150);

  await call('POST', '/messages', c.accessToken, { toId: l.user.id, text: 'Vocês abrem hoje?' });
  await espera(150);
  const conv = await call('GET', '/ia/conversas', l.accessToken);
  assert.equal(conv[0].estado, 'humano');
  assert.match(conv[0].motivo, /Acabaram as respostas/);
  // No Grátis não tem copiloto.
  await assert.rejects(call('POST', '/ia/sugestao', l.accessToken, { clientId: c.user.id }), /planos Realyz e Pro/);
});

test('proteção: golpe escancarado é barrado; suspeitas vão para a fila com o parecer da IA', async () => {
  const p = await pessoa('Golpista Teste');
  const vitima = await pessoa('Vítima Teste');
  await assert.rejects(
    call('POST', '/posts', p.accessToken, { text: 'Parabéns você ganhou um Pix premiado! Pague a taxa para liberar o seu prêmio e confirme seus dados' }),
    (e) => e.code === 'golpe'
  );
  await assert.rejects(
    call('POST', '/messages', p.accessToken, { toId: vitima.user.id, text: 'Você ganhou! Pague a taxa para liberar o seu prêmio e me passa o código de verificação' }),
    (e) => e.code === 'golpe'
  );
  const fake = await call('POST', '/posts', p.accessToken, { text: 'URGENTE: compartilhe antes que apaguem! Chá caseiro é a cura do câncer e a mídia não mostra' });
  await espera(150);

  const a = await admin();
  const fila = await call('GET', '/admin/protecao', a.accessToken);
  const alerta = fila.find((x) => x.alvoId === fake.id);
  assert.equal(alerta.tipo, 'fake');
  assert.equal(alerta.origem, 'robo');
  assert.match(alerta.parecer, /^Provável falso/);
  assert.ok(fila.some((x) => x.alvoTipo === 'user' && x.alvoId === p.user.id && x.tipo === 'golpe'));

  // Uma pessoa também denuncia: entra junto, e a decisão resolve as duas.
  await call('POST', '/reports', vitima.accessToken, { targetKind: 'post', targetId: fake.id, reason: 'fake news' });
  const fila2 = await call('GET', '/admin/protecao', a.accessToken);
  assert.equal(fila2.find((x) => x.id === alerta.id).denuncias, 1);

  // Antes da decisão o post aparece no feed; procedente: some do feed (informação falsa).
  assert.ok((await call('GET', '/feed', vitima.accessToken)).some((x) => x.id === fake.id));
  await call('POST', `/admin/protecao/${alerta.id}/procedente`, a.accessToken);
  assert.ok(!(await call('GET', '/feed', vitima.accessToken)).some((x) => x.id === fake.id));
  const abertas = await call('GET', '/admin/protecao', a.accessToken);
  assert.ok(!abertas.some((x) => x.alvoId === fake.id));
});

test('proteção: produto com preço muito abaixo do normal e bloqueio da conta', async () => {
  const lojas = [];
  for (let i = 0; i < 5; i++) {
    const l = await loja(`Loja Celular ${i}`);
    await call('POST', '/products', l.accessToken, { name: `Celular modelo ${i}`, price: 1500 + i * 100, stock: 3, category: 'Eletrônicos' });
    lojas.push(l);
  }
  const suspeita = await loja('Loja Barata Demais');
  const prod = await call('POST', '/products', suspeita.accessToken, { name: 'Celular novo lacrado', price: 199, stock: 50, category: 'Eletrônicos' });
  const a = await admin();
  const fila = await call('GET', '/admin/protecao', a.accessToken + '');
  const alerta = fila.find((x) => x.alvoTipo === 'product' && x.alvoId === prod.id);
  assert.ok(alerta);
  assert.match(alerta.motivo, /abaixo do normal/);
  await call('POST', `/admin/protecao/${alerta.id}/bloquear`, a.accessToken);
  await assert.rejects(call('GET', '/planos/meu', suspeita.accessToken), /Sessão expirada/);
  const prods = await call('GET', '/products?q=lacrado');
  assert.ok(!prods.some((x) => x.id === prod.id));
});

test('painel de inteligência: buscas em alta, demanda escondida e preço contra o mercado', async () => {
  const l = await loja('Mercado do Painel');
  for (let i = 0; i < 4; i++) {
    const o = await loja(`Concorrente ${i}`);
    await call('POST', '/products', o.accessToken, { name: `Pão francês ${i}`, price: 10 + i, stock: 10, category: 'Padaria' });
  }
  await call('POST', '/products', l.accessToken, { name: 'Pão francês da casa', price: 15, stock: 10, category: 'Padaria' });
  await call('GET', '/products?q=pao%20frances');
  await call('GET', '/products?q=pao%20frances');
  await call('GET', '/products?q=cuca%20de%20uva');

  const painel = await call('GET', '/inteligencia/painel?dias=90', l.accessToken);
  assert.equal(painel.plano.id, 'pro'); // teste de 30 dias = tudo do Pro
  assert.equal(painel.dias, 90);
  assert.equal(painel.buscasEmAlta[0].termo, 'pao frances');
  assert.ok(painel.demandaEscondida.some((x) => x.termo === 'cuca de uva'));
  const pao = painel.precoMercado.find((x) => x.nome === 'Pão francês da casa');
  assert.equal(pao.mercado, 11.5);
  assert.equal(pao.diferencaPct, 30);
  assert.equal(painel.pico.buscas.length, 24);

  // Plano Grátis: 7 dias e sem as partes do Realyz e do Pro.
  app.db.prepare('UPDATE users SET created_at = ? WHERE id = ?').run(Date.now() - 60 * 86400000, l.user.id);
  const gratis = await call('GET', '/inteligencia/painel?dias=90', l.accessToken);
  assert.equal(gratis.dias, 7);
  assert.equal(gratis.buscasEmAlta, undefined);
  assert.deepEqual(gratis.bloqueado.map((b) => b.parte), ['buscas', 'mercado', 'pico']);
});

test('contas de teste de empresa e de prestador, criadas pelo administrador', async () => {
  const a = await admin();
  const emp = await call('POST', '/admin/contas-teste', a.accessToken, { name: 'Loja Teste', username: 'lojateste', password: 'senha1234', tipo: 'empresa' });
  const pre = await call('POST', '/admin/contas-teste', a.accessToken, { name: 'Prestador Teste', username: 'prestateste', password: 'senha1234', tipo: 'prestador' });
  const lista = await call('GET', '/admin/contas-teste', a.accessToken);
  assert.equal(lista.find((x) => x.id === emp.id).tipo, 'empresa');
  assert.equal(lista.find((x) => x.id === pre.id).tipo, 'prestador');
  const le = await call('POST', '/auth/login', null, { login: 'lojateste', password: 'senha1234' });
  assert.equal((await call('GET', '/companies/me', le.accessToken)).name, 'Loja Teste');
  assert.equal((await call('GET', '/planos/meu', le.accessToken)).atual.id, 'pro');
  const lp = await call('POST', '/auth/login', null, { login: 'prestateste', password: 'senha1234' });
  // Preço "a combinar" (0) com taxa de visita.
  const p = await call('PUT', '/providers/me', lp.accessToken, { service: 'marceneiro', functions: ['Móveis planejados'], price: '', priceUnit: 'projeto', visitFee: 60 });
  assert.equal(p.price, 0);
  assert.ok((await call('GET', '/inteligencia/painel', lp.accessToken)).chamados);
});
