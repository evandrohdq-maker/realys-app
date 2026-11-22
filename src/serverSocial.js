// Posts e stories das contas reais (servidor): o que eu publico vai para o servidor (amigos veem),
// e o feed e a faixa de stories mostram o que os amigos publicaram. Curtir e comentar também.
import { useEffect, useState } from 'react';
import { api, API_URL, uploadMedia, serverOn } from './api';

const full = (u) => (u && u.startsWith('/') ? API_URL + u : u);
const isVideo = (u) => /\.(mp4|mov|webm|m3u8)(\?|$)/i.test(u || '') || /video/i.test(u || '');
const isLocal = (u) => typeof u === 'string' && /^(file|content|blob|data|ph|assets-library):/i.test(u);
export const quando = (t) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return new Date(t).toLocaleDateString('pt-BR');
};

// Post do servidor no formato do feed do app.
export const postLocal = (p) => ({
  id: 'srv_' + p.id,
  serverId: p.id,
  server: true,
  author: p.author.name,
  authorId: p.author.id,
  authorPhoto: full(p.author.photo),
  text: p.text || '',
  image: p.media && !isVideo(p.media) ? full(p.media) : null,
  video: p.media && isVideo(p.media) ? full(p.media) : null,
  likes: p.likes || 0,
  liked: !!p.liked,
  comments: p.comments || 0,
  time: quando(p.createdAt),
  at: p.createdAt,
});

// Feed (um só no app inteiro).
let feed = [];
let stories = [];
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
export function refreshFeed() {
  if (!serverOn()) return Promise.resolve();
  return Promise.all([
    api('GET', '/feed').then((l) => (feed = (l || []).map(postLocal))).catch(() => {}),
    api('GET', '/stories').then((l) => (stories = l || [])).catch(() => {}),
  ]).then(emit);
}
export function useServerFeed(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (on) refreshFeed();
    const t = on ? setInterval(refreshFeed, 60000) : null;
    return () => {
      subs.delete(fn);
      if (t) clearInterval(t);
    };
  }, [on]);
  return on ? { posts: feed, stories } : { posts: [], stories: [] };
}

// Grupos de stories no formato da faixa do app (sem os meus, que já aparecem no "seu story").
export const storyGroups = (groups, myId) =>
  (groups || [])
    .filter((g) => g.author.id !== myId)
    .map((g) => ({
      id: 'srvst_' + g.author.id,
      server: true,
      authorId: g.author.id,
      name: g.author.name,
      avatar: full(g.author.photo),
      items: g.items.map((s) => ({ id: 'srv_' + s.id, image: s.media && !isVideo(s.media) ? full(s.media) : null, video: s.media && isVideo(s.media) ? full(s.media) : null, text: s.text || '', caption: s.text || '', time: quando(s.createdAt) })),
    }));

async function subir(uri, video) {
  if (!uri) return null;
  if (!isLocal(uri)) return uri.startsWith(API_URL) ? uri.slice(API_URL.length) : /^\/media\//.test(uri) ? uri : null;
  const url = await uploadMedia(uri, video ? 'video/mp4' : /\.png(\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg');
  return url.slice(API_URL.length);
}

// Publica no servidor (post ou story). Devolve o id do servidor.
export async function publicar(kind, item) {
  const media = await subir(item.video || item.image, !!item.video);
  if (!media && !String(item.text || item.caption || '').trim()) return null;
  const p = await api('POST', '/posts', { kind, text: String(item.text || item.caption || '').slice(0, 2200), media: media || undefined, visibility: item.visibility === 'amigos' ? 'amigos' : 'todos' });
  refreshFeed();
  return p.id;
}

export const curtir = (serverId) => api('POST', `/posts/${serverId}/curtir`).then((r) => {
  feed = feed.map((p) => (p.serverId === serverId ? { ...p, liked: r.liked, likes: r.likes } : p));
  emit();
  return r;
});
export const comentarios = (serverId) => api('GET', `/posts/${serverId}/comentarios`);
export const comentar = (serverId, text) => api('POST', `/posts/${serverId}/comentarios`, { text }).then((c) => {
  feed = feed.map((p) => (p.serverId === serverId ? { ...p, comments: p.comments + 1 } : p));
  emit();
  return c;
});
