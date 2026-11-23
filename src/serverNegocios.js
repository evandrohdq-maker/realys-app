// Negócios de verdade (servidor, server/src/routes/negocios.js): anúncios de todos, "Tenho interesse",
// liberar a conversa e o plano do anunciante. Na demonstração tudo continua no celular.
import { useEffect, useState } from 'react';
import { api, mediaUrl, connectEvents } from './api';

let data = { ads: [], interesses: {}, meus: [], plano: null };
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
let ouvindo = null;

export async function refreshNegocios() {
  const [ads, ints, meus] = await Promise.all([
    api('GET', '/negocios/anuncios').catch(() => null),
    api('GET', '/negocios/interesses').catch(() => null),
    api('GET', '/negocios/meus').catch(() => null),
  ]);
  const fix = (a) => ({ ...a, photo: mediaUrl(a.photo) });
  data = {
    ads: ads ? ads.map(fix) : data.ads,
    interesses: ints ? Object.fromEntries(ints.map((i) => [i.adId, i])) : data.interesses,
    meus: meus ? meus.ads.map(fix) : data.meus,
    plano: meus ? meus.plano : data.plano,
  };
  emit();
}

// on = conta ligada ao servidor (conectado(state)).
export function useNegocios(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (on) {
      refreshNegocios();
      if (!ouvindo) ouvindo = connectEvents((e) => /^neg-/.test(e.type) && refreshNegocios());
    }
    return () => subs.delete(fn);
  }, [on]);
  return on ? data : null;
}

export const anunciar = (ad) => api('POST', '/negocios/anuncios', ad).then((r) => (refreshNegocios(), r));
export const tirarDoAr = (id) => api('DELETE', `/negocios/anuncios/${id}`).then(refreshNegocios);
export const tenhoInteresse = (id) => api('POST', `/negocios/anuncios/${id}/interesse`).then((r) => (refreshNegocios(), r));
export const liberarConversa = (leadId) => api('POST', `/negocios/leads/${leadId}/liberar`).then((r) => (refreshNegocios(), r));
export const assinarPlano = (planId) => api('POST', '/negocios/plano', { planId }).then((r) => (refreshNegocios(), r));
