// Reels no servidor: publicar (o vídeo sobe e vai para todos) e buscar os Reels de cada área.
// Sem servidor (demonstração), o Reel fica só no aparelho, como antes.
import { useEffect, useState } from 'react';
import { api, serverOn, uploadMedia, mediaUrl, API_URL } from './api';

// Reel do servidor no formato dos Reels do app.
const KIND = { food: 'food', mercado: 'food', shop: 'shop', servicos: 'servicos', negocios: 'negocios', comunidade: 'user' };
export const reelLocal = (r) => ({
  id: 'srv_' + r.id,
  serverId: r.id,
  title: r.titulo || '',
  video: mediaUrl(r.video),
  poster: r.poster ? mediaUrl(r.poster) : null,
  user: r.autor && r.autor.nome,
  userId: r.autor && r.autor.id,
  kind: KIND[r.area] || 'user',
  area: r.area,
  ad: !!r.anuncio,
  turbinado: !!r.turbinado,
  views: r.views || 0,
  likes: 0,
});

// Publica: sobe o vídeo e cria o Reel. area: shop | food | mercado | servicos | negocios (empresa).
export async function publicarReel(reel, area) {
  if (!serverOn() || !reel || !reel.video) return reel;
  const v = typeof reel.video === 'string' ? reel.video : null;
  if (!v) return reel;
  const url = /^https?:/.test(v) && v.startsWith(API_URL) ? v : await uploadMedia(v, 'video/mp4');
  const r = await api('POST', '/reels', { video: url.replace(API_URL, ''), titulo: reel.title || '', area });
  return { ...reel, ...reelLocal(r) };
}

// Reels do servidor de uma área (ou todas, sem área). Atualiza a cada abertura da tela.
export function useServerReels(area) {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    if (!serverOn()) return undefined;
    let vivo = true;
    api('GET', area ? `/reels?area=${area}` : '/reels')
      .then((l) => vivo && setLista((l || []).map(reelLocal)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [area]);
  return lista;
}
