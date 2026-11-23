// Atendente IA: responde pela ficha e pelo catálogo, passa para uma pessoa quando precisa,
// não responde mais depois que a equipe assume e sugere respostas para quem fecha a venda.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { makeIA, respostaLeve, precisaHumano, intencaoSimples } from '../src/ia/index.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
let modeloLigado = false;
const pedidos = [];
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-ia-'));
  const cfg = loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, iaUrl: 'http://modelo.teste' });
  // Modelo falso: responde só quando "ligado"; desligado, falha e entra a IA leve.
  cfg.ia = makeIA(cfg, {
    send: async (path, body) => {
      pedidos.push(body);
      if (!modeloLigado) throw new Error('fora do ar');
      return { message: { content: 'Temos a pizza grande por R$ 45,00. Quer que eu explique como pedir pelo app?' } };
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
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status });
  return data;
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

test('regras da IA leve', () => {
  const r = respostaLeve({ texto: 'vocês entregam no centro?', ficha: { entrega: 'Entregamos em todo o Centro, até 5 km.', faq: [] }, produtos: [], empresa: 'Pizzaria', primeira: true });
  assert.match(r, /assistente virtual da Pizzaria/);
  assert.match(r, /até 5 km/);
  assert.ok(precisaHumano('quero falar com um atendente', {}));
  assert.ok(precisaHumano('faz um desconto?', {}));
  assert.equal(precisaHumano('faz um desconto?', { ia_negocia: true }), null);
});

test('atendente IA na conversa: catálogo, passagem para a equipe e copiloto', async () => {
  const loja = await call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name: 'Pizzaria da Praça', doc: '11222333000181', username: 'pizzapraca', email: 'pz@teste.com', password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO });
  const cli = await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Carla Cliente', doc: '52998224725', username: 'carla', email: 'c@teste.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  await call('POST', '/products', loja.accessToken, { name: 'Pizza grande calabresa', price: 45, stock: 10, category: 'Food' });
  const f = await call('PUT', '/ia/ficha', loja.accessToken, { ligado: true, horario: 'Todos os dias, das 18h às 23h', entrega: 'Entregamos no Centro', faq: [{ q: 'Vocês têm opção sem glúten?', a: 'Temos massa sem glúten às sextas.' }] });
  assert.equal(f.ligado, true);

  // IA leve (modelo fora do ar): acha a pizza no catálogo.
  await call('POST', '/messages', cli.accessToken, { toId: loja.user.id, text: 'Oi, quanto custa a pizza calabresa?' });
  await espera(150);
  let msgs = await call('GET', `/messages/${loja.user.id}`, cli.accessToken);
  const r1 = msgs[msgs.length - 1];
  assert.equal(r1.ia, 1);
  assert.match(r1.text, /Pizza grande calabresa por R\$ 45,00/);

  // Com o modelo aberto ligado, a resposta vem dele (com a ficha e o catálogo nas instruções).
  modeloLigado = true;
  await call('POST', '/messages', cli.accessToken, { toId: loja.user.id, text: 'E que horas vocês abrem?' });
  await espera(150);
  msgs = await call('GET', `/messages/${loja.user.id}`, cli.accessToken);
  assert.match(msgs[msgs.length - 1].text, /pizza grande por R\$ 45,00/);
  assert.match(pedidos[pedidos.length - 1].messages[0].content, /das 18h às 23h/);

  // Pediu desconto: vai para a equipe e a IA para de responder.
  await call('POST', '/messages', cli.accessToken, { toId: loja.user.id, text: 'Faz um desconto pra mim?' });
  await espera(150);
  let conv = await call('GET', '/ia/conversas', loja.accessToken);
  assert.equal(conv[0].estado, 'humano');
  const antes = (await call('GET', `/messages/${loja.user.id}`, cli.accessToken)).length;
  await call('POST', '/messages', cli.accessToken, { toId: loja.user.id, text: 'Alô?' });
  await espera(150);
  assert.equal((await call('GET', `/messages/${loja.user.id}`, cli.accessToken)).length, antes + 1); // só a do cliente

  // Copiloto: sugestão para o vendedor.
  const s = await call('POST', '/ia/sugestao', loja.accessToken, { clientId: cli.user.id });
  assert.ok(s.sugestao.length > 10);
  // Devolver para a IA.
  await call('POST', `/ia/conversas/${cli.user.id}/devolver`, loja.accessToken);
  conv = await call('GET', '/ia/conversas', loja.accessToken);
  assert.equal(conv[0].estado, 'ia');
  // Testar a IA pelo painel.
  const t = await call('POST', '/ia/testar', loja.accessToken, { texto: 'tem opção sem glúten?' });
  assert.ok(t.resposta.length > 5);
});

test('atendente não fica em looping: tchau, não e mensagem repetida', async () => {
  assert.equal(intencaoSimples('Tchau'), 'despedida');
  assert.equal(intencaoSimples('valeu, era só isso'), 'despedida');
  assert.equal(intencaoSimples('Não'), 'recusa');
  assert.equal(intencaoSimples('nenhuma dessas'), 'recusa');
  assert.equal(intencaoSimples('outro dia'), 'recusa');
  assert.equal(intencaoSimples('obrigado, vocês entregam no centro?'), null);
  modeloLigado = false;
  const loja = await call('POST', '/auth/signup', null, { kind: 'empresa', titularNome: 'Titular Teste', titularCpf: '52998224725', name: 'Loja do Bairro', doc: '11444777000161', username: 'lojabairro', email: 'lb@teste.com', password: 'senha1234', aceiteTermos: TERMO_ADESAO_VERSAO });
  const cli = await call('POST', '/auth/signup', null, { kind: 'pessoa', name: 'Davi Cliente', doc: '39053344705', username: 'davicli', email: 'd@teste.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  await call('PUT', '/ia/ficha', loja.accessToken, { ligado: true });
  const manda = async (text) => {
    await call('POST', '/messages', cli.accessToken, { toId: loja.user.id, text });
    await espera(120);
    return call('GET', `/messages/${loja.user.id}`, cli.accessToken);
  };
  // Tchau: despede uma vez; tchau de novo, fica quieto.
  let m = await manda('Tchau');
  assert.match(m[m.length - 1].text, /Até mais/);
  const n = m.length;
  m = await manda('Bye');
  assert.equal(m.length, n + 1); // só a do cliente
  // Não: aceita e pergunta o que fica melhor; não de novo: chama a equipe (sem repetir).
  m = await manda('Não');
  assert.match(m[m.length - 1].text, /o que fica melhor/);
  m = await manda('nenhuma dessas');
  assert.match(m[m.length - 1].text, /pessoa da nossa equipe/);
  const conv = await call('GET', '/ia/conversas', loja.accessToken);
  assert.equal(conv[0].estado, 'humano'); // a única conversa desta loja
});
