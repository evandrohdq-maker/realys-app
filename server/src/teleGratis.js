// Primeira tele grátis (Food) contada no servidor. Mesmas regras do app (src/teleGratis.js):
// só no primeiro pedido de comida da pessoa, pedido mínimo de R$ 30 e orçamento do mês (padrão R$ 3 mil).
// Acabou o orçamento, a promoção pausa sozinha até o mês seguinte. Uma por pessoa (a biometria garante
// uma conta por rosto). O motoboy sempre recebe a tele cheia; aqui fica o registro do custo do Realyz.
import { newId, now } from './http.js';

export const TELE_PADRAO_CENTS = 800;
export const MINIMO_PEDIDO_CENTS = 3000;
const mesDe = (ts = now()) => new Date(ts - 3 * 3600 * 1000).toISOString().slice(0, 7);

export function makeTeleGratis(db, cfg = {}) {
  const orcamento = () => Math.round((cfg.teleGratisOrcamento ?? 3000) * 100);
  const gastoDoMes = (mes = mesDe()) => db.prepare('SELECT COALESCE(SUM(valor), 0) v, COUNT(*) n FROM tele_gratis WHERE mes = ?').get(mes);
  const jaPediuComida = (userId) =>
    !!db.prepare(`SELECT 1 FROM orders o WHERE o.buyer_id = ? AND NOT EXISTS (SELECT 1 FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = o.id AND p.classe IS NULL) LIMIT 1`).get(userId) ||
    !!db.prepare('SELECT 1 FROM tele_gratis WHERE user_id = ?').get(userId);
  const restante = () => Math.max(0, orcamento() - gastoDoMes().v);
  // A pessoa ainda pode ganhar a primeira tele grátis?
  const status = (userId) => ({ elegivel: !jaPediuComida(userId) && restante() >= TELE_PADRAO_CENTS, minimoPedido: MINIMO_PEDIDO_CENTS / 100, tele: TELE_PADRAO_CENTS / 100, pausada: restante() < TELE_PADRAO_CENTS });
  // Chamado dentro do pedido (antes de gravar): se valer, registra o custo e devolve true.
  const usar = (userId, orderId, subtotalCents) => {
    if (subtotalCents < MINIMO_PEDIDO_CENTS || jaPediuComida(userId) || restante() < TELE_PADRAO_CENTS) return false;
    db.prepare('INSERT INTO tele_gratis (id, mes, user_id, order_id, valor, created_at) VALUES (?,?,?,?,?,?)').run(newId('tg'), mesDe(), userId, orderId, TELE_PADRAO_CENTS, now());
    return true;
  };
  const painel = () => {
    const g = gastoDoMes();
    return { mes: mesDe(), gasto: g.v / 100, pedidos: g.n, orcamento: orcamento() / 100, restante: restante() / 100, pausada: restante() < TELE_PADRAO_CENTS };
  };
  return { status, usar, painel };
}
