// Taxas do Realys e para onde vai cada uma (caixa). Mudou um percentual? Muda só aqui.
//
// - Pedidos (Shop, Food, lojas): o Realys tira um percentual do vendedor sobre a venda.
// - Contratação de serviços: o prestador define a taxa de visita e o Realys fica com 10% dela
//   (REALYS_FEE_PCT em serviceVisits.js). O valor final do serviço é negociado entre cliente e prestador.
// - Presentes: 10% de taxa (GIFT_FEE_PCT em gifts.js). Essa taxa é dividida em duas partes:
//   uma vai para o fundo de doações (projetos sociais) e a outra para os projetos e o lucro do Realys.
import { GIFT_FEE_PCT } from './gifts';
import { REALYS_FEE_PCT } from './serviceVisits';

// Serviços prestados pelo governo (SUS, UPA, UBS, hospitais públicos, Bombeiros, Defesa Civil, SAMU,
// polícia): sem nenhuma taxa do Realys, nem para o cidadão nem para o órgão.
export const PUBLIC_SERVICE_FEE_PCT = 0;
export const ORDER_FEE_PCT = 10; // sobre cada pedido, descontado do vendedor (o cliente não paga a mais)
export const SERVICE_FEE_PCT = REALYS_FEE_PCT; // sobre a taxa de visita da contratação de serviço
export { GIFT_FEE_PCT };

// Divisão da taxa de presentes (soma 100).
export const GIFT_FUND_SPLIT = {
  doacoes: 30, // fundo de doações para projetos sociais (de parceiros e do Realys)
  realys: 70, // projetos do Realys e margem de lucro do caixa
};

const r2 = (n) => Math.round(n * 100) / 100;
export const orderFee = (total) => r2(((total || 0) * ORDER_FEE_PCT) / 100);
export const splitGiftFees = (fees) => {
  const doacoes = r2((fees * GIFT_FUND_SPLIT.doacoes) / 100);
  return { doacoes, realys: r2(fees - doacoes) };
};
