// Páginas no servidor (todos veem e seguem) e o "Publicar como": a pessoa escolhe se curte, comenta
// ou manda depoimento como ela mesma ou como uma das páginas dela. A escolha vale para o app todo
// até ela trocar (fica guardada no aparelho).
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_URL, serverOn, uploadMedia } from './api';

export const full = (u) => (u && typeof u === 'string' && u.startsWith('/') ? API_URL + u : u || null);
const isLocal = (u) => typeof u === 'string' && /^(file|content|blob|data|ph|assets-library):/i.test(u);

// Sobe uma foto ou vídeo do aparelho e devolve o caminho do servidor ("/media/...").
export async function subirMidia(uri, video) {
  if (!uri) return null;
  if (!isLocal(uri)) return uri.startsWith(API_URL) ? uri.slice(API_URL.length) : uri;
  const url = await uploadMedia(uri, video ? 'video/mp4' : /\.png(\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg');
  return url.slice(API_URL.length);
}

// ---------- Minhas páginas e a identidade escolhida ----------
let minhas = [];
let comoId = null; // null = eu mesmo
let carregado = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const COMO_KEY = 'realyz.publicarComo';

export function recarregarMinhas() {
  if (!serverOn()) return Promise.resolve([]);
  return api('GET', '/me/paginas')
    .then((l) => {
      minhas = l || [];
      if (comoId && !minhas.some((p) => p.id === comoId)) comoId = null; // página apagada: volta a ser eu
      carregado = true;
      emit();
      return minhas;
    })
    .catch(() => minhas);
}
export const minhasPaginas = () => minhas;
export const paginaComo = () => (comoId ? minhas.find((p) => p.id === comoId) || null : null);
export const comoPaginaId = () => (paginaComo() ? comoId : null);
export function escolherComo(id) {
  comoId = id || null;
  AsyncStorage.setItem(COMO_KEY, comoId || '').catch(() => {});
  emit();
}

// Hook: { paginas, como (página escolhida ou null), escolher }
export function usePublicarComo(on = true) {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (on && !carregado) {
      AsyncStorage.getItem(COMO_KEY)
        .then((v) => {
          if (v) comoId = v;
        })
        .catch(() => {})
        .finally(() => recarregarMinhas());
    }
    return () => subs.delete(fn);
  }, [on]);
  return { paginas: minhas, como: paginaComo(), escolher: escolherComo };
}

// ---------- Página aberta por cima de qualquer tela ----------
let aberta = null;
const subsAberta = new Set();
export function abrirPagina(id) {
  aberta = id ? { id, at: Date.now() } : null;
  subsAberta.forEach((fn) => fn());
}
export const fecharPagina = () => abrirPagina(null);
export function usePaginaAberta() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subsAberta.add(fn);
    return () => subsAberta.delete(fn);
  }, []);
  return aberta;
}

// ---------- Chamadas ----------
export const pagina = (id) => api('GET', `/paginas/${encodeURIComponent(id)}`);
export const postsDaPagina = (id) => api('GET', `/paginas/${encodeURIComponent(id)}/posts`);
export const depoimentosDaPagina = (id) => api('GET', `/paginas/${encodeURIComponent(id)}/depoimentos`);
export const buscarPaginas = (q, categoria) => api('GET', `/paginas?q=${encodeURIComponent(q || '')}${categoria ? `&categoria=${categoria}` : ''}`);
export const paginasSeguidas = () => api('GET', '/me/paginas-seguidas');
export const seguirPagina = (id) => api('POST', `/paginas/${encodeURIComponent(id)}/seguir`);
// Mensalidade: a 1ª página é grátis; da 2ª em diante, R$ 14,90 por mês do saldo.
export const precoProximaPagina = () => api('GET', '/me/paginas/preco');
export const pagarPagina = (id) => api('POST', `/paginas/${encodeURIComponent(id)}/pagar`).then((pg) => (recarregarMinhas(), pg));

export async function criarPagina(dados) {
  const cover = dados.cover ? await subirMidia(dados.cover) : undefined;
  const photo = dados.photo ? await subirMidia(dados.photo) : undefined;
  const pg = await api('POST', '/paginas', { ...dados, cover, photo });
  await recarregarMinhas();
  return pg;
}
export async function editarPagina(id, patch) {
  const p = { ...patch };
  if (p.cover) p.cover = await subirMidia(p.cover);
  if (p.photo) p.photo = await subirMidia(p.photo);
  const pg = await api('PATCH', `/paginas/${encodeURIComponent(id)}`, p);
  recarregarMinhas();
  return pg;
}
export async function apagarPagina(id) {
  await api('DELETE', `/paginas/${encodeURIComponent(id)}`);
  return recarregarMinhas();
}
// Post da página: texto + foto ou vídeo + música (opcional).
export async function postarNaPagina(id, { text, uri, video, musica }) {
  const media = uri ? await subirMidia(uri, video) : undefined;
  return api('POST', `/paginas/${encodeURIComponent(id)}/posts`, { text: text || '', media, musica: musica || undefined });
}

// Curtir / comentar / depoimento com a identidade escolhida (ou a passada).
const como = (pid) => (pid === undefined ? comoPaginaId() : pid) || undefined;
export const curtirPost = (postId, pid) => api('POST', `/posts/${postId}/curtir`, { comoPagina: como(pid) });
export const comentariosDoPost = (postId) => api('GET', `/posts/${postId}/comentarios`);
export const comentarPost = (postId, text, { parentId, pid } = {}) => api('POST', `/posts/${postId}/comentarios`, { text, parentId: parentId || undefined, comoPagina: como(pid) });
export const curtirComentario = (id, pid) => api('POST', `/comentarios/${id}/curtir`, { comoPagina: como(pid) });
export const apagarComentario = (id) => api('DELETE', `/comentarios/${id}`);
export const mandarDepoimento = ({ toId, toPaginaId, text, pid }) => api('POST', '/testimonials', { toId: toId || undefined, toPaginaId: toPaginaId || undefined, text, comoPagina: como(pid) });

// Quem eu sou agora para curtidas e comentários: 'eu' ou 'pg:<id>' (igual ao servidor).
export const atorAtual = (meuId) => (comoPaginaId() ? 'pg:' + comoPaginaId() : meuId);
