// Lojas no Realyz: confiança, ranking e conversa com o cliente.
//
// Ranking e selos (igual aos prestadores, src/serviceVisits.js):
//  - Cada venda fechada e entregue PELO REALYZ, com boa avaliação, sobe a loja nas buscas do Shop e
//    do Food e vai dando selos de confiança. Venda feita por fora não conta.
//  - Patrocinadas continuam aparecendo primeiro, marcadas como "Patrocinado"; o resto é por mérito.
//
// Conversa (para o cliente não levar a loja para fora da plataforma):
//  - O cliente SEGUE a loja (não adiciona como amigo e não manda mensagem solta para ela).
//  - O cliente conversa com a loja só dentro de um pedido em andamento, até ele ser finalizado.
//  - A loja pode chamar o cliente (ex.: reativar quem não fechou, pelo CRM). Se fechar, o Realyz
//    cobra a taxa normal da venda (src/crm.js › crmFee).

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
};
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Pedido que já acabou: a conversa com a loja fecha.
const DONE = ['entregue', 'concluido', 'cancelado', 'recusado', 'estornado'];
const isDone = (o) => DONE.some((d) => norm(o.status).startsWith(d));

// Pedidos do cliente com essa loja (o pedido guarda o nome da loja; vários nomes separados por vírgula).
const ordersWith = (state, store) =>
  (state.orders || []).filter((o) => String(o.store || '').split(',').some((n) => norm(n) === norm(store.name)));

// Vendas fechadas e entregues pelo Realyz. Nos exemplos, um número fixo por loja; o que acontece no app soma em cima.
export function storeSales(store, state) {
  const base = store.salesDone != null ? store.salesDone : 15 + (hash(store.id + 'vendas') % 480);
  const mine = state ? ordersWith(state, store).filter((o) => norm(o.status).startsWith('entregue')).length : 0;
  return base + mine;
}

// Selos de confiança, do mais alto para o mais baixo.
export const TRUST_LEVELS = [
  { key: 'referencia', label: 'Referência Realyz', min: 500, rating: 4.8, icon: 'trophy-outline' },
  { key: 'muito', label: 'Muito confiável', min: 100, rating: 4.6, icon: 'shield-checkmark' },
  { key: 'confiavel', label: 'Loja confiável', min: 20, rating: 4.3, icon: 'shield-checkmark-outline' },
];

export function storeTrust(store, state) {
  const sales = storeSales(store, state);
  const rating = Number(store.rating) || 0;
  const level = TRUST_LEVELS.find((l) => sales >= l.min && rating >= l.rating) || null;
  // Qualidade pesa mais que quantidade: 300 vendas com nota 3 não passam de 80 vendas com nota 5.
  const quality = Math.min(1, Math.max(0, (rating - 3) / 2));
  const volume = Math.min(1, sales / 300);
  // Reembolso cobrado da loja (atraso, pedido errado...) derruba a posição: qualidade no atendimento.
  const refunds = state ? (state.disputes || []).filter((d) => d.outcome === 'reembolsado' && norm(d.debitFrom) === norm(store.name)).length : 0;
  const score = quality * 0.6 + volume * 0.4 - refunds * 0.1;
  return { sales, rating, level: refunds >= 3 ? null : level, score, refunds };
}

// Ordem das lojas nas buscas e listas: patrocinadas primeiro, depois por confiança (mérito).
export const byStoreTrust = (state) => (a, b) =>
  (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || storeTrust(b, state).score - storeTrust(a, state).score;

// O cliente pode escrever para a loja agora?
export function storeChat(state, store) {
  if (!store) return { open: true };
  const active = ordersWith(state, store).find((o) => !isDone(o));
  if (active) return { open: true, order: active };
  if (state.storeReached && state.storeReached[store.id]) return { open: true, reached: true };
  return {
    open: false,
    why: 'Com lojas, a conversa acontece dentro dos pedidos. Faça um pedido ou peça um orçamento na página da loja.',
  };
}

// Acha a loja de um contato de conversa (pelo id ou pelo nome).
export const storeOfContact = (state, contact) =>
  contact ? (state.stores || []).find((s) => s.id === contact.id || s.id === contact.storeId || norm(s.name) === norm(contact.name)) || null : null;
