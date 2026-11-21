// Eventos e ingressos de verdade pelo servidor do Realyz.
// - Eventos publicados por empresas aparecem em Eventos, junto com os de demonstração.
// - Comprar ingresso: o valor sai da carteira do servidor; cada ingresso tem um código (QR na portaria).
// - Empresa: publica eventos, vê as vendas e confere os ingressos na entrada (ServerEventsPanel).
import { api, API_URL } from './api';
import { brl } from './theme';
import { SRV, conectado, carregarCarteira } from './serverShop';

export const eventFromServer = (e) => ({
  id: SRV + e.id,
  serverId: e.id,
  group: 'festa-promo',
  title: e.title,
  detail: e.detail || e.place,
  when: e.when,
  price: e.price ? brl(e.price) : 'Grátis',
  priceValue: e.price,
  deal: e.left <= 20 && e.left > 0 ? `Últimos ${e.left}` : 'Realyz',
  cta: e.status === 'esgotado' ? 'Esgotado' : 'Comprar ingresso',
  place: [e.place, e.city].filter(Boolean).join(', '),
  who: e.company,
  photo: e.cover ? (e.cover.startsWith('/') ? API_URL + e.cover : e.cover) : null,
  left: e.left,
  status: e.status,
  real: true,
});

export async function carregarEventos(dispatch) {
  const list = await api('GET', '/events');
  dispatch({ type: 'SERVER_EVENTS', events: list.map(eventFromServer) });
}

// Comprar ingressos de um evento do servidor. Devolve { ok, message, codes }.
export async function comprarIngresso(state, dispatch, e, qty = 1) {
  if (!conectado(state)) return { ok: false, message: 'Para comprar ingressos de verdade, entre com a sua conta (cadastro com senha e biometria).' };
  try {
    const r = await api('POST', `/events/${e.serverId}/tickets`, { qty });
    for (const code of r.codes) {
      dispatch({ type: 'BUY_TICKET', ticket: { id: SRV + code, code, eventId: e.id, title: e.title, name: e.who, price: 0, paid: e.priceValue, real: true } });
    }
    carregarCarteira(dispatch).catch(() => {});
    carregarEventos(dispatch).catch(() => {});
    return { ok: true, codes: r.codes };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
