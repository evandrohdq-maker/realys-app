// Taxa dos Pioneiros: motoboy na tele-entrega (1º mês grátis, 10% até 6 meses, depois 15%) e
// motorista nas corridas (15% por 6 meses). Quem não é pioneiro paga a tabela normal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { makeTaxaPioneiro } from '../src/taxaPioneiro.js';

const DIA = 86400000;
test('taxa pioneiro: fases do motoboy e do motorista', () => {
  const db = openDb(':memory:');
  const t0 = Date.now();
  const user = (id) => db.prepare(`INSERT INTO users (id, kind, name, username, roles, created_at) VALUES (?, 'pessoa', ?, ?, '[]', ?)`).run(id, id, id, t0);
  ['loja', 'moto1', 'carro1', 'comum'].forEach(user);
  const pion = (id, area, uid) => db.prepare(`INSERT INTO pioneiros (id, area, nome, responsavel, whatsapp, status, numero, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, '54999990000', 'fechado', ?, ?, ?, ?)`).run(id, area, uid, uid, Math.floor(Math.random() * 1e6), uid, t0, t0);
  pion('p1', 'motoboy', 'moto1');
  pion('p2', 'motorista', 'carro1');
  const tx = makeTaxaPioneiro(db);

  assert.equal(tx.pct('comum', 18), null, 'quem não é pioneiro: tabela normal');
  assert.equal(tx.pct('moto1', 18), 0, 'primeira entrega do motoboy: taxa zero');
  db.prepare(`INSERT INTO entregas (id, tipo, loja_id, coleta, destino, veiculo, valor, taxa_pct, codigo, status, entregador_id, created_at, updated_at) VALUES ('e1','pedido','loja','A','B','moto',800,18,'1234','entregue','moto1',?,?)`).run(t0, t0);
  assert.equal(tx.pct('moto1', 18, { agora: t0 + 29 * DIA }), 0, 'ainda no 1º mês: zero');
  assert.equal(tx.pct('moto1', 18, { agora: t0 + 31 * DIA }), 10, 'do 2º ao 6º mês: 10%');
  assert.equal(tx.pct('moto1', 18, { agora: t0 + 200 * DIA }), 15, 'depois de 6 meses: 15%');
  assert.equal(tx.pct('moto1', 18, { tipo: 'corrida' }), null, 'a regra do motoboy é só da tele-entrega');
  assert.equal(tx.pct('carro1', 18, { tipo: 'corrida' }), 15, 'motorista pioneiro: 15% nas corridas');
  assert.equal(tx.pct('carro1', 18, { tipo: 'entrega' }), null, 'a regra do motorista é só das corridas');
});
