// Registro dos pedidos concluídos nos últimos 7 dias úteis (Pedidos › Concluídos).
// Depois que o pedido ou serviço termina, ele fica aqui por 7 dias úteis para o cliente ainda poder:
//   - dar gorjeta (ex.: estava sem saldo na hora e quer dar depois) para o motoboy, motorista ou prestador;
//   - avaliar, se não avaliou na hora.
// Vale para comida, compras, serviços chamados e serviços por visita.
import { orderTargets, callTargets } from './ratings';

export const TIP_DAYS = 7; // dias úteis

// Soma dias úteis (pula sábado e domingo).
export function addBusinessDays(ts, days) {
  const d = new Date(ts);
  let n = 0;
  while (n < days) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
  }
  return d.getTime();
}

const tipTargetOf = (targets) => targets.find((t) => t.type === 'motoboy' || t.type === 'motorista' || t.type === 'prestador') || null;

// Lista: { key, kind ('pedido' | 'servico' | 'visita'), refId, icon, title, sub, doneAt, until, rated, tipTo, tipped }
export function recentDone(state, now = Date.now()) {
  const tippedIds = new Set((state.gifts || []).filter((g) => g.to && g.to.orderId).map((g) => g.to.orderId));
  const rows = [];
  (state.orders || [])
    .filter((o) => o.status === 'Entregue')
    .forEach((o) => {
      const targets = orderTargets(state, o);
      rows.push({
        key: 'o' + o.id,
        kind: 'pedido',
        refId: o.id,
        icon: o.courierId || o.courier ? '🍽️' : '📦',
        title: (o.items || []).map((i) => i.name).join(', ') || o.store,
        sub: o.store,
        doneAt: o.deliveredAt || o.at || 0,
        rated: !!o.rated,
        tipTo: tipTargetOf(targets),
        tipped: tippedIds.has(o.id),
      });
    });
  (state.rides || [])
    .filter((r) => r.provider && r.done && !r.noShow)
    .forEach((r) => {
      rows.push({
        key: 'r' + r.id,
        kind: 'servico',
        refId: r.id,
        icon: r.icon || '🧑‍🔧',
        title: r.serviceLabel,
        sub: r.provider.name,
        doneAt: r.doneAt || r.acceptedAt || 0,
        rated: !!r.rated,
        tipTo: tipTargetOf(callTargets(r)),
        tipped: tippedIds.has(r.id),
      });
    });
  (state.visits || [])
    .filter((v) => v.status === 'concluida' && v.provider)
    .forEach((v) => {
      rows.push({
        key: 'v' + v.id,
        kind: 'visita',
        refId: v.id,
        icon: '🧰',
        title: v.serviceLabel || 'Serviço',
        sub: v.provider.name,
        doneAt: v.doneAt || v.createdAt || 0,
        rated: !!v.rated,
        tipTo: tipTargetOf(callTargets(v)),
        tipped: tippedIds.has(v.id),
      });
    });
  return rows
    .map((r) => ({ ...r, until: addBusinessDays(r.doneAt, TIP_DAYS) }))
    .filter((r) => r.doneAt && now <= r.until)
    .sort((a, b) => b.doneAt - a.doneAt);
}
