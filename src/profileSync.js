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
  };
  // Muito grande (muitas criações com imagens embutidas): guarda o essencial do perfil.
  if (JSON.stringify(data).length > 850 * 1024) {
    delete data.creations;
    delete data.mural;
  }
  return data;
}

export async function pullProfile() {
  return api('GET', '/me/dados'); // { data, updatedAt }
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
