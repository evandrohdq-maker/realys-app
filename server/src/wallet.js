// Carteira: três "bolsos" por pessoa, todos em centavos.
//  - saldo:   moeda Realys (RLS). Entra por depósito, vendas, serviços e conversão de lives. Pode sacar.
//  - presente: créditos de presente. Só servem para comprar no Realys; usados primeiro nas compras.
//  - live:     créditos de live (presentes recebidos transmitindo). Viram saldo quando a pessoa converte.
// Toda mudança fica no extrato (ledger). Use sempre dentro de tx() para não deixar nada pela metade.
import { newId, now, fail } from './http.js';

const COLUMN = { saldo: 'balance', presente: 'gift_credits', live: 'live_credits' };

export function makeWallet(db, cfg) {
  const ensure = (userId) => db.prepare('INSERT OR IGNORE INTO wallets (user_id) VALUES (?)').run(userId);

  const get = (userId) => {
    ensure(userId);
    return db.prepare('SELECT balance, gift_credits, live_credits FROM wallets WHERE user_id = ?').get(userId);
  };

  // Lança um movimento (positivo entra, negativo sai). Recusa se o bolso ficaria negativo.
  const move = (userId, bucket, amount, cat, description, ref = null) => {
    if (!amount) return;
    ensure(userId);
    const col = COLUMN[bucket];
    const r = db.prepare(`UPDATE wallets SET ${col} = ${col} + ? WHERE user_id = ? AND ${col} + ? >= 0`).run(amount, userId, amount);
    if (!r.changes) fail(402, bucket === 'saldo' ? 'Saldo insuficiente.' : bucket === 'presente' ? 'Créditos de presente insuficientes.' : 'Créditos de live insuficientes.', 'saldo_insuficiente');
    db.prepare('INSERT INTO ledger (id, user_id, bucket, amount, cat, description, ref, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
      newId('lg'), userId, bucket, amount, cat, description, ref, now()
    );
  };

  // Taxa do Realys sobre presentes: 5%, mínimo R$ 0,50.
  const giftFee = (cents) => (cents > 0 ? Math.max(Math.round(cfg.giftFeeMin * 100), Math.round((cents * cfg.giftFeePct) / 100)) : 0);

  // Paga uma compra: créditos de presente primeiro, depois o saldo. Devolve quanto saiu de cada.
  const pay = (userId, total, cat, description, ref) => {
    const w = get(userId);
    if (w.gift_credits + w.balance < total) fail(402, 'Saldo insuficiente para esta compra.', 'saldo_insuficiente');
    const fromGift = Math.min(w.gift_credits, total);
    const fromWallet = total - fromGift;
    move(userId, 'presente', -fromGift, cat, description, ref);
    move(userId, 'saldo', -fromWallet, cat, description, ref);
    return { fromGift, fromWallet };
  };

  return { get, move, giftFee, pay, ensure };
}
