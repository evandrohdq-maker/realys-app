import { orderFee } from './fees';
// Contato com a loja dentro do pedido, quando a entrega passou do prazo.
// - Só por mensagens (sem ligação nem vídeo), para esclarecer a dúvida do cliente e registrar a reclamação.
// - Telefone na conversa (de qualquer lado) bloqueia a conversa na hora; o caso fica para o suporte do Realyz.
// - Não resolveu: a Garantia Realyz continua valendo no pedido.

// Prazo de entrega padrão: comida em 60 min; compras do Shop em 7 dias.
export const ORDER_DEADLINE = { food: 60 * 60000, shop: 7 * 86400000 };

const DONE = ['Entregue', 'Reembolsado', 'Cancelado'];

export const orderDeadline = (o) => o.deadline || (o.at ? o.at + (o.food ? ORDER_DEADLINE.food : ORDER_DEADLINE.shop) : null);
export const orderLate = (o, now = Date.now()) => !DONE.includes(o.status) && !!orderDeadline(o) && now > orderDeadline(o);

export const BLOCK_TEXT = 'Conversa bloqueada: passar número de telefone não é permitido. O caso foi enviado para o suporte do Realyz.';

// Food: atraso de mais de 1 hora além do prazo → o cliente pede e o dinheiro volta
// na hora para a carteira. O valor é cobrado do restaurante (descontado da venda), não do caixa do Realyz.
// Food: passou 30 min do prazo → o cliente ganha o contato (mensagens) com o restaurante;
// passou 1 hora → "atrasou demais", pode pedir o dinheiro de volta.
export const FOOD_LATE_CONTACT_MIN = 30;
export const FOOD_LATE_REFUND_MIN = 60;
export const lateMinutes = (o, now = Date.now()) => (orderLate(o, now) ? Math.floor((now - orderDeadline(o)) / 60000) : 0);
export const foodLateRefund = (o, now = Date.now()) => !!o.food && lateMinutes(o, now) >= FOOD_LATE_REFUND_MIN;
// Contato com a loja pelo pedido: Food só depois de 30 min de atraso; Shop assim que passa o prazo.
export const lateContact = (o, now = Date.now()) => orderLate(o, now) && (!o.food || lateMinutes(o, now) >= FOOD_LATE_CONTACT_MIN);

// Cancelar: só enquanto a loja não começou a preparar. Quem cancela paga as taxas
// (comissão do Realyz e taxa de proteção); volta o resto. A loja devolve o que recebeu.
export const canCancel = (o) => o.status === 'Pagamento protegido';
export function cancelInfo(o) {
  const items = (o.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const fees = +(orderFee(items, !!o.food) + (o.protectionFee || 0)).toFixed(2);
  return { fees, back: +Math.max(0, (o.total || 0) - fees).toFixed(2) };
}
