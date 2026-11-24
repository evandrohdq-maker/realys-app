// Depoimentos das contas reais (servidor), como no Orkut: quem escreve manda para o amigo, o amigo
// aceita ou recusa, e só os aceitos aparecem no perfil e no feed embaixo das bolinhas de Stories.
import { useEffect, useState } from 'react';
import { api, serverOn, connectEvents, API_URL } from './api';
import { quando } from './serverSocial';

const full = (u) => (u && u.startsWith('/') ? API_URL + u : u || null);

let data = { feed: [], pending: [], loaded: false };
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
let loading = null;
let events = null;

const view = (t) => ({
  id: 'srvdp_' + t.id,
  serverId: t.id,
  server: true,
  text: t.text,
  fromId: t.fromId,
  fromName: t.fromName,
  fromPhoto: full(t.fromPhoto),
  toId: t.toId || null,
  toName: t.toName || null,
  // Depoimento de página ou para página ("Publicar como"): o toque abre a página, não um perfil.
  fromPagina: !!t.fromPagina,
  toPagina: !!t.toPagina,
  at: t.createdAt,
  time: quando(t.createdAt),
});

export function refreshTestimonials() {
  if (!serverOn()) return Promise.resolve(data);
  if (loading) return loading;
  loading = Promise.all([
    api('GET', '/testimonials/feed').catch(() => null),
    api('GET', '/testimonials/pending').catch(() => null),
  ])
    .then(([feed, pending]) => {
      data = {
        feed: feed ? feed.map(view) : data.feed,
        pending: pending ? pending.map(view) : data.pending,
        loaded: true,
      };
      emit();
      return data;
    })
    .finally(() => (loading = null));
  return loading;
}

// on: a conta está ligada ao servidor (conectado(state)).
export function useServerTestimonials(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (on) {
      refreshTestimonials();
      if (!events) events = connectEvents((e) => e.type === 'testimonial' && refreshTestimonials());
    }
    return () => subs.delete(fn);
  }, [on]);
  return on ? data : { feed: [], pending: [], loaded: false };
}

export const sendTestimonial = (toId, text) => api('POST', '/testimonials', { toId, text });
export const decideTestimonial = (serverId, aceitar) =>
  api('POST', `/testimonials/${serverId}/${aceitar ? 'aceitar' : 'recusar'}`).then((r) => (refreshTestimonials(), r));
