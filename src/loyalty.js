// Clube Realys: política de fidelidade, bônus e descontos.
//
// Referências de mercado usadas para calibrar (consultadas em nov/2026):
// - Clube iFood: cupons de 25% com teto de R$ 10, ou R$ 10 em pedidos acima de R$ 60.
// - Cartão fidelidade de restaurante: "compre 10 pizzas, ganhe 1"; hamburgueria "5 combos, ganhe
//   batata + refri"; validade de 6 a 12 meses. Na prática, devolve uns 10% do que o cliente gastou.
// - Cashback (Méliuz e parecidos): de 3% a 10% nas lojas, média perto de 5%, pago pela loja parceira.
// - Regra de ouro: o brinde por pedido tem que custar menos que a margem que o pedido deixa.
//
// Como o Realys aplica:
// 1. Selo por loja: cada pedido entregue numa loja ou restaurante parceiro vale 1 selo. Com 10 selos,
//    o cliente ganha crédito de 10% do que gastou nesses 10 pedidos (teto R$ 30), para usar na
//    MESMA loja. Quem paga é a loja (é a fidelidade dela). Validade: 12 meses.
// 2. Bônus Realys a cada 20 pedidos (em qualquer empresa): cupom de 15% (teto R$ 25, pedido mínimo
//    R$ 30) no próximo pedido em QUALQUER parceiro, ou na mesma. Quem paga é o Realys, com a taxa
//    dos pedidos. Validade: 90 dias, 1 uso.
// 3. Pontos por compra: 1 ponto a cada R$ 10 gastos (100 pontos = R$ 10 em parceiros, ≈ 1% de volta),
//    somados aos pontos de avaliação. O nível aumenta os pontos.
// 4. Teto de custo: os benefícios somados não passam de ~3% do que o cliente gasta no ano, para não
//    comer a margem das empresas (conta no painel do administrador).

export const STAMPS_FOR_REWARD = 10;
export const STAMP_BACK_PCT = 10;
export const STAMP_CAP = 30;
export const ORDERS_FOR_BONUS = 20;
export const BONUS = { pct: 15, cap: 25, minOrder: 30, days: 90 };
export const POINTS_PER_REAIS = 10; // 1 ponto a cada R$ 10

export const LEVELS = [
  { key: 'bronze', label: 'Bronze', min: 0, mult: 1, icon: '🥉' },
  { key: 'prata', label: 'Prata', min: 10, mult: 1.1, icon: '🥈' },
  { key: 'ouro', label: 'Ouro', min: 30, mult: 1.25, icon: '🥇' },
  { key: 'diamante', label: 'Diamante', min: 60, mult: 1.5, icon: '💎' },
];
export const levelOf = (orders) => [...LEVELS].reverse().find((l) => orders >= l.min) || LEVELS[0];
export const nextLevel = (orders) => LEVELS.find((l) => l.min > orders) || null;

// Histórico da demonstração: 17 pedidos entregues e 8 selos na Pizzaria da Praça.
export const initialLoyalty = { orders: 17, spent: 812.4, stamps: { e2: { count: 8, spent: 431.2 }, e1: { count: 4, spent: 210.5 } }, benefits: 0 };

export const LOYALTY_RULES = [
  { icon: 'ribbon-outline', title: `Selo por loja: ${STAMPS_FOR_REWARD} pedidos = ${STAMP_BACK_PCT}% de volta`, text: `Cada pedido entregue vale 1 selo naquela loja. Com ${STAMPS_FOR_REWARD} selos o cliente ganha ${STAMP_BACK_PCT}% do que gastou nesses pedidos (até R$ ${STAMP_CAP}) para usar na mesma loja. Pago pela loja · validade 12 meses. Igual ao "compre 10, ganhe 1" das pizzarias.` },
  { icon: 'gift-outline', title: `A cada ${ORDERS_FOR_BONUS} pedidos: ${BONUS.pct}% no próximo`, text: `Em qualquer empresa do Realys. Cupom de ${BONUS.pct}% (até R$ ${BONUS.cap}, pedido mínimo de R$ ${BONUS.minOrder}) para o próximo pedido em qualquer parceiro. Pago pelo Realys · ${BONUS.days} dias · 1 uso. Na linha do Clube iFood (25% até R$ 10).` },
  { icon: 'trophy-outline', title: `Pontos: 1 a cada R$ ${POINTS_PER_REAIS} + avaliações`, text: '100 pontos = R$ 10 em créditos de parceiros (cerca de 1% de volta, abaixo da média de 5% do cashback de mercado). Nível Prata, Ouro e Diamante dá 10%, 25% e 50% a mais de pontos.' },
  { icon: 'calculator-outline', title: 'Teto de ~3% do gasto do cliente', text: 'Selos (~1% para quem completa) + bônus de 20 pedidos (≤ R$ 25 a cada 20, ≈ 2,5% num ticket de R$ 50) + pontos (~1%) ficam perto de 3%. O brinde de cada pedido tem que custar menos que a margem que ele deixa.' },
];

// Pedido entregue: conta pedido, selos, pontos por compra e libera os bônus.
// Devolve { loyalty, credits: [novos créditos], points, notes: [mensagens] }.
export function onDelivered(state, order) {
  const base = state.loyalty || initialLoyalty;
  const loyalty = { ...base, stamps: { ...base.stamps } };
  const credits = [];
  const notes = [];
  loyalty.orders += 1;
  loyalty.spent = +(loyalty.spent + order.total).toFixed(2);
  const names = String(order.store || '').split(', ');
  const stores = names.map((n) => (state.stores || []).find((s) => s.name === n)).filter(Boolean);
  stores.forEach((s) => {
    const st = { ...(loyalty.stamps[s.id] || { count: 0, spent: 0 }) };
    st.count += 1;
    st.spent = +(st.spent + order.total / stores.length).toFixed(2);
    if (st.count >= STAMPS_FOR_REWARD) {
      const value = +Math.min(STAMP_CAP, (st.spent * STAMP_BACK_PCT) / 100).toFixed(2);
      credits.push({ kind: 'loja', partnerId: s.id, partner: s.name, icon: s.logo, title: `Selos completos: ${STAMP_BACK_PCT}% de volta`, value, source: 'selos' });
      notes.push(`Você completou ${STAMPS_FOR_REWARD} selos em ${s.name} e ganhou R$ ${value.toFixed(2).replace('.', ',')} para usar lá.`);
      st.count = 0;
      st.spent = 0;
    }
    loyalty.stamps[s.id] = st;
  });
  if (loyalty.orders % ORDERS_FOR_BONUS === 0) {
    credits.push({ kind: 'cupom', pct: BONUS.pct, cap: BONUS.cap, minOrder: BONUS.minOrder, partner: 'Qualquer parceiro', icon: '🎉', title: `${BONUS.pct}% no próximo pedido (até R$ ${BONUS.cap})`, value: BONUS.cap, source: 'bonus' });
    notes.push(`Parabéns: ${loyalty.orders} pedidos! Você ganhou ${BONUS.pct}% de desconto no próximo pedido em qualquer parceiro.`);
  }
  const lvl = levelOf(loyalty.orders);
  const points = Math.floor((Math.floor(order.total / POINTS_PER_REAIS) || 0) * lvl.mult);
  const before = levelOf(base.orders);
  if (lvl.key !== before.key) notes.push(`Você subiu para o nível ${lvl.label} ${lvl.icon}: ganha ${Math.round((lvl.mult - 1) * 100)}% a mais de pontos.`);
  return { loyalty, credits, points, notes };
}
