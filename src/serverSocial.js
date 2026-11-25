// Posts e stories das contas reais (servidor): o que eu publico vai para o servidor (amigos veem),
// e o feed e a faixa de stories mostram o que os amigos publicaram. Curtir e comentar também.
import { useEffect, useState } from 'react';
import { api, apiOuFila, onFila, API_URL, uploadMedia, serverOn, respostaGuardada } from './api';
import { aCada } from './ritmo';

const full = (u) => (u && u.startsWith('/') ? API_URL + u : u);
const isVideo = (u, tipo) => tipo === 'video' || /\.(mp4|mov|webm|m3u8)(\?|$)/i.test(u || '');
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
  image: p.media && !isVideo(p.media, p.mediaType) ? full(p.media) : null,
  video: p.media && isVideo(p.media, p.mediaType) ? full(p.media) : null,
  likes: p.likes || 0,
  liked: !!p.liked,
  // Curtidas das minhas páginas ("curtir como página") e post de página (botão Seguir no topo).
  likedPaginas: p.likedPaginas || [],
  pagina: p.pagina || null,
  seguindo: !!p.seguindo,
  minhaPagina: !!p.minhaPagina,
  musica: p.musica ? { ...p.musica, url: full(p.musica.url), cover: full(p.musica.cover) } : null,
  comments: p.comments || 0,
  time: quando(p.createdAt),
  at: p.createdAt,
});

// Feed (um só no app inteiro).
let feed = [];
let stories = [];
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
// Primeira vez: o feed guardado no aparelho aparece na hora, enquanto busca o novo.
let feedMostrado = false;
async function feedGuardado() {
  if (feedMostrado) return;
  feedMostrado = true;
  const [l, st] = await Promise.all([respostaGuardada('/feed'), respostaGuardada('/stories')]).catch(() => []);
  if (feed.length || !Array.isArray(l) || !l.length) return;
  try {
    feed = l.map(postLocal);
    if (Array.isArray(st)) stories = st;
    emit();
  } catch (e) {}
}
// Curtidas e "Seguir" feitos sem internet foram enviados: busca o feed de novo com os números certos.
onFila((n, enviou) => enviou && refreshFeed());
export function refreshFeed() {
  if (!serverOn()) return Promise.resolve();
  feedGuardado();
  let amigos = [];
  let estacoes = [];
  return Promise.all([
    api('GET', '/feed').then((l) => (amigos = (l || []).map(postLocal))).catch(() => (amigos = feed.filter((p) => !p.station))),
    // Posts das rádios e TVs que eu sigo (com o botão de ouvir/assistir no feed).
    api('GET', '/estacoes/feed')
      .then((l) => (estacoes = (l || []).map((p) => ({ id: 'ep_' + p.id, author: p.station.name, text: p.text, image: null, likes: 0, comments: 0, time: quando(p.at), at: p.at, station: { kind: p.station.kind, id: p.station.id } }))))
      .catch(() => {}),
    api('GET', '/stories').then((l) => (stories = l || [])).catch(() => {}),
  ])
    .then(() => {
      feed = [...amigos, ...estacoes].sort((x, y) => (y.at || 0) - (x.at || 0));
      // O botão "Ouvir agora" do post precisa da estação carregada no app.
      if (estacoes.length) {
        const { syncStations } = require('./serverStations');
        const kinds = new Set(estacoes.map((p) => p.station.kind));
        kinds.forEach((k) => syncStations(k));
      }
    })
    .then(emit);
}
export function useServerFeed(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (on) refreshFeed();
    const t = on ? aCada(refreshFeed, 60000) : null;
    return () => {
      subs.delete(fn);
      if (t) t.parar();
    };
  }, [on]);
  return on ? { posts: feed, stories } : { posts: [], stories: [] };
}

// Um story do servidor no formato do visualizador.
const storyItem = (s) => ({
  id: 'srv_' + s.id,
  serverId: s.id,
  image: s.media && !isVideo(s.media, s.mediaType) ? full(s.media) : null,
  video: s.media && isVideo(s.media, s.mediaType) ? full(s.media) : null,
  text: s.text || '',
  bg: s.bg || undefined,
  time: quando(s.createdAt),
  at: s.createdAt,
  expiresAt: s.expiresAt,
});

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
      items: g.items.map(storyItem),
    }));

// Os meus stories que estão no servidor (das últimas 24 h): aparecem no "seu story" mesmo depois
// de fechar o app ou trocar de celular. Junta com os deste aparelho sem repetir.
export const myServerStories = (groups, myId, local = []) => {
  const g = (groups || []).find((x) => x.author && x.author.id === myId);
  const doServidor = g ? g.items.map(storyItem) : [];
  const ids = new Set(doServidor.map((x) => x.serverId));
  const agora = Date.now();
  const locais = (local || []).filter((x) => x && !(x.serverId && ids.has(x.serverId)) && !(x.at && agora - x.at > 86400000));
  return [...doServidor, ...locais].sort((a, b) => (a.at || 0) - (b.at || 0));
};

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
  const p = await api('POST', '/posts', { kind, text: String(item.text || item.caption || '').slice(0, 2200), media: media || undefined, bg: !media && item.bg ? item.bg : undefined, visibility: item.visibility === 'amigos' ? 'amigos' : 'todos' });
  refreshFeed();
  return p.id;
}

// pid: undefined = quem estou agora ("Publicar como"); null = eu; id = essa página minha.
export const curtir = (serverId, pid) => {
  const { comoPaginaId } = require('./serverPaginas');
  const como = (pid === undefined ? comoPaginaId() : pid) || undefined;
  return apiOuFila('POST', `/posts/${serverId}/curtir`, { comoPagina: como }, { alternar: true }).then((r) => {
    // Sem internet: o coração muda na hora e a curtida vai quando a internet voltar.
    if (r && r.pendente) {
      const p0 = feed.find((p) => p.serverId === serverId);
      if (!p0) return r;
      const pags = p0.likedPaginas || [];
      const tinha = como ? pags.includes(como) : p0.liked;
      r = {
        pendente: true,
        liked: como ? p0.liked : !tinha,
        likedPaginas: como ? (tinha ? pags.filter((x) => x !== como) : [...pags, como]) : pags,
        likes: Math.max(0, (p0.likes || 0) + (tinha ? -1 : 1)),
      };
    }
    feed = feed.map((p) => (p.serverId === serverId ? { ...p, liked: r.liked, likedPaginas: r.likedPaginas || [], likes: r.likes } : p));
    emit();
    return r;
  });
};
// Comentário novo ou apagado pela folha de comentários: atualiza o número no feed.
export function contarComentario(serverId, d) {
  feed = feed.map((p) => (p.serverId === serverId ? { ...p, comments: Math.max(0, (p.comments || 0) + d) } : p));
  emit();
}
// Seguir / deixar de seguir a página de um post do feed (todos os posts daquela página mudam juntos).
export function seguirPaginaDoPost(paginaId) {
  return apiOuFila('POST', `/paginas/${encodeURIComponent(paginaId)}/seguir`, undefined, { alternar: true }).then((r) => {
    // Sem internet: o botão muda na hora e o "Seguir" vai quando a internet voltar.
    if (r && r.pendente) {
      const p0 = feed.find((p) => p.pagina && p.pagina.id === paginaId);
      r = { pendente: true, seguindo: !(p0 && p0.seguindo) };
    }
    feed = feed.map((p) => (p.pagina && p.pagina.id === paginaId ? { ...p, seguindo: r.seguindo } : p));
    emit();
    return r;
  });
}
export const comentarios = (serverId) => api('GET', `/posts/${serverId}/comentarios`);
export const comentar = (serverId, text) => api('POST', `/posts/${serverId}/comentarios`, { text }).then((c) => {
  feed = feed.map((p) => (p.serverId === serverId ? { ...p, comments: p.comments + 1 } : p));
  emit();
  return c;
});
