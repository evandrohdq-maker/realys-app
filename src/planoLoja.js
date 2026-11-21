// Plano da loja (Shop e Food).
// Regra do negócio:
// - Cadastrar a loja e montar a vitrine é grátis. A loja só entra no plano quando aceita o
//   primeiro pedido que chega pelo Realyz.
// - Para aceitar esse pedido, ela escolhe: plano mensal (R$ 49,90) ou plano anual, que sai por
//   75% do valor de 12 mensalidades.
// - O primeiro mês é gratuito nos dois: a cobrança começa 30 dias depois do primeiro pedido.
// - Fora o plano, o Realyz fica com 10% do valor de cada venda.
import { TAXAS } from './taxas';

const r2 = (n) => Math.round(n * 100) / 100;
export const LOJA_MENSAL = TAXAS.planoEmpresa.valor; // 49,90
export const LOJA_ANUAL_PCT = TAXAS.planoEmpresa.anualPct; // 75 (% do valor de 12 meses)
export const LOJA_ANUAL = r2((LOJA_MENSAL * 12 * LOJA_ANUAL_PCT) / 100); // 449,10
export const LOJA_ANUAL_ECONOMIA = r2(LOJA_MENSAL * 12 - LOJA_ANUAL); // 149,70
export const LOJA_GRATIS_DIAS = TAXAS.planoEmpresa.gratisDias; // 30
export const LOJA_COMISSAO_PCT = TAXAS.shop.pct; // 10

export const LOJA_PLANOS = [
  { id: 'mensal', nome: 'Mensal', valor: LOJA_MENSAL, periodo: 'por mês', nota: 'Sem fidelidade: cancela quando quiser.' },
  { id: 'anual', nome: 'Anual', valor: LOJA_ANUAL, periodo: 'por ano', nota: `Você paga 75% do valor: economia de R$ ${LOJA_ANUAL_ECONOMIA.toFixed(2).replace('.', ',')}.` },
];
export const lojaPlano = (id) => LOJA_PLANOS.find((p) => p.id === id) || null;

const DIA = 86400000;
// Situação do plano: 'livre' (ainda sem pedido) · 'escolher' (chegou o 1º pedido) · 'gratis' (mês grátis) · 'ativo'
export function lojaStatus(sp, now = Date.now()) {
  const s = sp || {};
  if (!s.plan) return s.pendingOrder ? 'escolher' : 'livre';
  return now < s.since + LOJA_GRATIS_DIAS * DIA ? 'gratis' : 'ativo';
}
export const lojaPrimeiraCobranca = (sp) => (sp && sp.since ? sp.since + LOJA_GRATIS_DIAS * DIA : null);
