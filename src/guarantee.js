// Garantia Realys: se der problema numa compra ou num serviço pago pelo Realys, o dinheiro volta.
//
// Como funciona:
// 1. Todo pagamento fica retido no Realys até o cliente confirmar a entrega ou a visita.
// 2. Depois de confirmado, o valor daquela venda fica mais GUARANTEE_DAYS dias na reserva de
//    garantia do vendedor (é dinheiro do vendedor, não do caixa do Realys).
// 3. Nesse tempo, o cliente abre um caso: o Realys olha o chat, o GPS da entrega, o QR Code e as fotos.
// 4. Resolvido a favor do cliente: o valor volta para a carteira. O vendedor perde pontos no Score;
//    quem age de má-fé de novo é banido, e com a biometria não consegue criar outra conta.
// 5. Quem abre caso falso também perde Score.
// Só vale o que foi pago DENTRO do Realys. Valores combinados e pagos por fora não têm garantia.

export const GUARANTEE_DAYS = 7;
export const GUARANTEE_ANSWER_HOURS = 48;

export const GUARANTEE_REASONS = {
  pedido: [
    { key: 'nao-recebi', label: 'Não recebi o pedido', icon: 'cube-outline' },
    { key: 'diferente', label: 'Veio diferente do anunciado', icon: 'swap-horizontal-outline' },
    { key: 'defeito', label: 'Veio com defeito ou danificado', icon: 'construct-outline' },
    { key: 'golpe', label: 'Suspeita de golpe', icon: 'warning-outline' },
  ],
  visita: [
    { key: 'nao-veio', label: 'O prestador não veio', icon: 'person-remove-outline' },
    { key: 'nao-fez', label: 'Veio, mas não fez a visita', icon: 'close-circle-outline' },
    { key: 'conduta', label: 'Conduta inadequada', icon: 'hand-left-outline' },
    { key: 'golpe', label: 'Suspeita de golpe', icon: 'warning-outline' },
  ],
};

export const GUARANTEE_RULES = [
  'Seu pagamento fica retido e só é liberado quando você confirma que recebeu.',
  `Depois de confirmar, você ainda tem ${GUARANTEE_DAYS} dias para abrir um caso.`,
  `O Realys responde em até ${GUARANTEE_ANSWER_HOURS} horas, olhando o chat, o GPS, o QR Code da entrega e as fotos.`,
  'Deu razão a você: o dinheiro volta para a sua carteira.',
  'Quem age de má-fé é banido, e com a biometria não volta com outra conta.',
  'Vale só o que você pagou pelo Realys. Não pague por fora.',
];

const DAY = 864e5;
// Ainda dá para abrir um caso? (pedido em andamento ou entregue há menos de GUARANTEE_DAYS dias)
export function orderCovered(o) {
  if (!o || o.status === 'Reembolsado') return false;
  if (o.status !== 'Entregue') return true;
  return !o.deliveredAt || Date.now() - o.deliveredAt < GUARANTEE_DAYS * DAY;
}
export function visitCovered(v) {
  if (!v || ['aguardando', 'recusada', 'faltou', 'reembolsada'].includes(v.status)) return false;
  return !v.confirmedAt || Date.now() - v.confirmedAt < GUARANTEE_DAYS * DAY;
}
export const daysLeft = (ts) => Math.max(0, Math.ceil((ts + GUARANTEE_DAYS * DAY - Date.now()) / DAY));
