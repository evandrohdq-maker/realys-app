// Taxas do Realys e para onde vai cada uma (caixa). Mudou um percentual? Muda só aqui.
//
// - Pedidos: o Realys tira um percentual do vendedor sobre a venda (Shop 10%, Food 11%, com pagamento incluído).
// - Contratação de serviços: o prestador define a taxa de visita e o Realys fica com 15% dela
//   (REALYS_FEE_PCT em serviceVisits.js). O valor final do serviço é negociado entre cliente e prestador.
// - Presentes: 10% de taxa (GIFT_FEE_PCT em gifts.js). Essa taxa é dividida em duas partes:
//   uma vai para o fundo de doações (projetos sociais) e a outra para os projetos e o lucro do Realys.
import { GIFT_FEE_PCT } from './gifts';
import { REALYS_FEE_PCT } from './serviceVisits';
import { TAXAS } from './taxas';

// Serviços prestados pelo governo (SUS, UPA, UBS, hospitais públicos, Bombeiros, Defesa Civil, SAMU,
// polícia): sem nenhuma taxa do Realys, nem para o cidadão nem para o órgão.
export const PUBLIC_SERVICE_FEE_PCT = 0;
export const ORDER_FEE_PCT = TAXAS.shop.pct; // Shop: sobre cada pedido, descontado do vendedor (o cliente não paga a mais)
export const FOOD_FEE_PCT = TAXAS.food.pct; // Food: restaurantes, bares e mercado
export const SERVICE_FEE_PCT = REALYS_FEE_PCT; // sobre a taxa de visita da contratação de serviço
export { GIFT_FEE_PCT };

// Divisão da taxa de presentes (soma 100).
export const GIFT_FUND_SPLIT = {
  doacoes: 30, // fundo de doações para projetos sociais (de parceiros e do Realys)
  realys: 70, // projetos do Realys e margem de lucro do caixa
};

const r2 = (n) => Math.round(n * 100) / 100;
export const orderFee = (total, isFood = false) => r2(((total || 0) * (isFood ? FOOD_FEE_PCT : ORDER_FEE_PCT)) / 100);
// Ingresso: 8%, no mínimo R$ 1,99 por ingresso.
export const ticketFee = (price) => (price > 0 ? r2(Math.max(TAXAS.ingresso.minimo, (price * TAXAS.ingresso.pct) / 100)) : 0);
export const splitGiftFees = (fees) => {
  const doacoes = r2((fees * GIFT_FUND_SPLIT.doacoes) / 100);
  return { doacoes, realys: r2(fees - doacoes) };
};
