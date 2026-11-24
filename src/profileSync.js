// Perfil da conta igual no app e no site: o que a pessoa preenche (foto, capa, sobre, página,
// agenda, Estúdio...) vai para o servidor e volta em qualquer aparelho onde ela entrar.
// Fotos que estão só no aparelho (file://, content://, blob:, data:) sobem antes de salvar.
import { api, serverOn, uploadMedia } from './api';

const isLocal = (u) => typeof u === 'string' && /^(file|content|blob|data|ph|assets-library):/i.test(u);
const mimeOf = (u) => {
  const m = /^data:([^;,]+)/.exec(u);
  if (m) return m[1];
  if (/\.png(\?|$)/i.test(u)) return 'image/png';
  if (/\.webp(\?|$)/i.test(u)) return 'image/webp';
  return 'image/jpeg';
};

export const canSync = (user) => serverOn() && !!(user && user.serverId);

// O que vai para a conta (o mesmo que fica salvo no aparelho).
export function payloadOf(state) {
  const data = {
    myProfile: state.myProfile,
    privacy: state.privacy,
    myPage: state.myPage,
    myUserPages: (state.userPages || []).filter((p) => p.ownerId === 'me'),
    followingPages: state.followingPages,
    myBusiness: state.myBusiness,
    agenda: state.agenda,
    workHours: state.workHours,
    autoHorario: state.autoHorario,
    agendaRemind: state.agendaRemind,
    chatLists: state.chatLists,
    chatMeta: state.chatMeta,
    creations: state.creations,
    mural: state.mural,
    // Galeria (fotos, vídeos, destaques): os amigos veem pelo perfil. Os exemplos de demonstração não sobem.
    myGallery: galeriaReal(state.myGallery),
    gamer: state.gamer || undefined,
    // Stories salvos: só o dono vê (o servidor não devolve isto no perfil dos outros).
    storyArchive: (state.storyArchive || []).slice(0, 200),
    extraPerfil: state.extraPerfil,
    // Etiquetas das rádios e canais (mesmas no app e no site).
    etiquetas: state.etiquetas,
  };
  // Muito grande (muitas criações com imagens embutidas): guarda o essencial do perfil.
  if (JSON.stringify(data).length > 850 * 1024) {
    delete data.creations;
  }
  if (JSON.stringify(data).length > 850 * 1024) delete data.storyArchive;
  if (JSON.stringify(data).length > 850 * 1024) delete data.mural;
  return data;
}

// desde: versão que o aparelho já tem. Se nada mudou, o servidor responde { igual: true } sem o perfil.
export async function pullProfile(desde) {
  return api('GET', desde > 0 ? `/me/dados?desde=${desde}` : '/me/dados'); // { data, updatedAt, igual? }
}

// Sobe as fotos locais do perfil; devolve as trocas { photo, cover } (ou null se não tinha nada).
export async function uploadLocalPhotos(profile) {
  const patch = {};
  for (const k of ['photo', 'cover']) {
    const u = profile && profile[k];
    if (!isLocal(u)) continue;
    // Foto que já não existe mais no aparelho (ex.: endereço blob: de uma visita antiga ao site):
    // não tem como subir; tira do perfil para a pessoa escolher de novo, em vez de ficar quebrada.
    let alive = true;
    try {
      const r = await fetch(u);
      alive = !!r && r.ok !== false;
    } catch (e) {
      alive = false;
    }
    if (!alive) {
      patch[k] = null;
      continue;
    }
    try {
      patch[k] = await uploadMedia(u, mimeOf(u));
    } catch (e) {
      // Sem internet ou foto recusada: tenta de novo na próxima alteração.
    }
  }
  return Object.keys(patch).length ? patch : null;
}

// Só o que a pessoa adicionou (os itens de exemplo começam com "me-").
const real = (x) => x && !String(x.id || '').startsWith('me-');
export function galeriaReal(g) {
  if (!g) return undefined;
  return {
    photos: (g.photos || []).filter(real),
    videos: (g.videos || []).filter(real),
    highlights: (g.highlights || []).filter(real),
  };
}

// Sobe um arquivo do aparelho; sem internet ou recusado, devolve null (tenta na próxima alteração).
const mimeVideo = (u) => (/\.(mov)(\?|$)/i.test(u) ? 'video/quicktime' : 'video/mp4');
async function subir(u, video) {
  if (!isLocal(u)) return null;
  try {
    return await uploadMedia(u, video ? mimeVideo(u) : mimeOf(u));
  } catch (e) {
    return null;
  }
}

// Galeria: troca os endereços do aparelho pelos do servidor. Devolve a galeria nova ou null se nada mudou.
export async function uploadLocalGallery(g) {
  if (!g) return null;
  let mudou = false;
  const troca = async (item, key, video) => {
    const url = await subir(item[key], video);
    if (!url) return item;
    mudou = true;
    return { ...item, [key]: url, local: false };
  };
  const photos = [];
  for (const p of g.photos || []) photos.push(real(p) ? await troca(p, 'uri') : p);
  const videos = [];
  for (const v of g.videos || []) {
    let x = v;
    if (real(v)) {
      x = await troca(x, 'uri', true);
      if (x.video) x = await troca(x, 'video', true);
      if (x.thumb) x = await troca(x, 'thumb');
    }
    videos.push(x);
  }
  const highlights = [];
  for (const h of g.highlights || []) {
    if (!real(h)) {
      highlights.push(h);
      continue;
    }
    let x = h.cover ? await troca(h, 'cover') : h;
    const items = [];
    for (const i of x.items || []) {
      let y = i.image ? await troca(i, 'image') : i;
      if (y.video) y = await troca(y, 'video', true);
      items.push(y);
    }
    highlights.push({ ...x, items });
  }
  return mudou ? { ...g, photos, videos, highlights } : null;
}

// Mural: fotos que estão só no aparelho sobem. Devolve o mural novo ou null se nada mudou.
export async function uploadLocalMural(m) {
  if (!m || !Array.isArray(m.items)) return null;
  let mudou = false;
  const items = [];
  for (const it of m.items) {
    let x = it;
    const url = it && it.type === 'foto' ? await subir(it.uri) : null;
    if (url) x = { ...x, uri: url };
    // Atalho de post/story/reel no mural: a imagem/vídeo do original também precisa estar no servidor.
    const img = it && it.type === 'post' ? await subir(it.image) : null;
    if (img) x = { ...x, image: img };
    const vid = it && it.type === 'post' ? await subir(it.video, true) : null;
    if (vid) x = { ...x, video: vid };
    if (x !== it) mudou = true;
    items.push(x);
  }
  return mudou ? { ...m, items } : null;
}

export async function pushProfile(data) {
  return api('PUT', '/me/dados', { data });
}

// Quanto do perfil está preenchido: na primeira sincronização (aparelho sem data salva) vale o
// lado mais completo, para um aparelho quase vazio não apagar o que a pessoa preencheu no outro.
export function richness(d) {
  if (!d) return 0;
  const p = d.myProfile || {};
  const campos = ['photo', 'cover', 'bio', 'city', 'profession', 'handle', 'links'].filter((k) => p[k]).length;
  return campos * 3 + (p.social ? 2 : 0) + ((d.creations || []).length) + (d.myPage ? 2 : 0) + ((d.myUserPages || []).length) + ((d.mural || []).length);
}
