// Tele grátis no Food, com travas para o Realys nunca entrar no prejuízo.
//
// Quem paga a tele (o motoboy SEMPRE recebe o valor cheio, em dinheiro):
//  1. Restaurante que liga "Tele grátis" na página dele: ele paga a tele dos pedidos acima do mínimo que
//     escolheu e ganha o selo "Tele grátis" com destaque no Food. Custo zero para o Realys.
//  2. Primeira tele do usuário: o Realys paga, como custo de marketing (traz o cliente já comprando).
//     Travas: só no primeiro pedido de comida da pessoa, pedido mínimo e orçamento máximo por mês;
//     acabou o orçamento, a promoção pausa sozinha até o mês seguinte. A biometria garante uma conta por
//     rosto, então ninguém cria contas falsas para ganhar a tele de novo.
//  3. Nos outros pedidos, o cliente paga a tele, mostrada no carrinho antes de confirmar.
import { TARIFFS } from './pricing';

export const TELE_PADRAO = TARIFFS.motoboy.minimo; // R$ 8: saída do motoboy até 3 km
export const PRIMEIRA_TELE = { minimoPedido: 30, orcamentoMes: 3000 };
export const LOJA_MINIMO_PADRAO = 40;

const mesAtual = (ts = Date.now()) => new Date(ts - 3 * 3600 * 1000).toISOString().slice(0, 7);

// Quanto o Realys já gastou com a primeira tele grátis neste mês.
export const gastoDoMes = (state) => (state.teleGratisMes && state.teleGratisMes.mes === mesAtual() ? state.teleGratisMes.gasto : 0);
export const orcamentoRestante = (state) => Math.max(0, PRIMEIRA_TELE.orcamentoMes - gastoDoMes(state));

// A pessoa já fez algum pedido de comida antes?
const jaPediuComida = (state) => (state.orders || []).some((o) => o.food);

// Decide a tele do carrinho. foodStores = lojas de comida do carrinho; subtotal = valor dos itens.
export function teleDoCarrinho(state, foodStores, subtotal) {
  if (!foodStores.length) return null;
  const tele = TELE_PADRAO;
  const loja = foodStores.find((s) => s.teleGratis && subtotal >= (s.teleGratisMin || LOJA_MINIMO_PADRAO));
  if (loja) return { tele, cliente: 0, pagaLoja: tele, pagaRealys: 0, motivo: 'loja', texto: `Tele grátis por conta de ${loja.name}` };
  if (!jaPediuComida(state) && subtotal >= PRIMEIRA_TELE.minimoPedido && orcamentoRestante(state) >= tele) {
    return { tele, cliente: 0, pagaLoja: 0, pagaRealys: tele, motivo: 'primeira', texto: 'Primeira tele grátis: presente do Realys' };
  }
  const aviso = foodStores.find((s) => s.teleGratis);
  return {
    tele, cliente: tele, pagaLoja: 0, pagaRealys: 0, motivo: 'cliente',
    texto: aviso ? `Faltam ${(Math.max(0, (aviso.teleGratisMin || LOJA_MINIMO_PADRAO) - subtotal)).toFixed(2).replace('.', ',')} para a tele grátis de ${aviso.name}` : 'Tele do motoboy',
  };
}

// Atualiza o gasto do mês depois de um pedido com a primeira tele grátis.
export const somarGasto = (state, valor) => {
  const mes = mesAtual();
  const atual = state.teleGratisMes && state.teleGratisMes.mes === mes ? state.teleGratisMes.gasto : 0;
  return { mes, gasto: +(atual + valor).toFixed(2) };
};
