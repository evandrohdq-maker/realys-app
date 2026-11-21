// Favoritos do Realyz: o coraçãozinho que aparece nos players e nas listas.
// Dá para favoritar rádios, canais de TV, streamers (quem faz live) e músicas.
// Fica salvo no celular, por tipo; a aba Stream e a aba Lives mostram os favoritos no topo.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, serverOn } from './api';

const KEY = 'realys.favorites.v1';
export const FAV_KINDS = ['radio', 'tv', 'streamer', 'music'];
export const FAV_LABEL = { radio: 'Rádio', tv: 'TV', streamer: 'Streamer', music: 'Música' };

// { radio: { [id]: item }, tv: {…}, streamer: {…}, music: {…} }
let favs = { radio: {}, tv: {}, streamer: {}, music: {} };
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(favs)).catch(() => {});

export function loadFavs() {
  if (loaded) return Promise.resolve(favs);
  loaded = true;
  return AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return favs;
      const old = JSON.parse(raw) || {};
      // O que foi marcado antes de terminar de carregar continua valendo.
      FAV_KINDS.forEach((k) => (favs[k] = { ...(old[k] || {}), ...favs[k] }));
      emit();
      return favs;
    })
    .catch(() => favs);
}
loadFavs();

// Streamer não tem id fixo em todas as lives de exemplo: usa o perfil dele ou o nome.
export const streamerKey = (l) => (l && (l.hostId && l.hostId !== 'me' ? `${l.hostType || 'usuario'}:${l.hostId}` : `nome:${l.host}`)) || null;

// Guarda só o necessário para mostrar o favorito (logo, nome) e abrir de novo.
function snapshot(kind, it) {
  if (kind === 'streamer') return { id: streamerKey(it), host: it.host, hostId: it.hostId, hostType: it.hostType, photo: it.hostPhoto || null, cat: it.cat || null };
  if (kind === 'music') return { id: it.id, title: it.title || it.name, artist: it.artist, cover: it.cover || null, emoji: it.emoji || '🎵' };
  return { id: it.id, name: it.name, emoji: it.emoji || null, logo: typeof it.logo === 'string' ? it.logo : null, cat: it.cat || null };
}
const idOf = (kind, it) => (kind === 'streamer' ? streamerKey(it) : it && it.id);

export const isFav = (kind, itOrId) => {
  const id = typeof itOrId === 'string' ? itOrId : idOf(kind, itOrId);
  return !!(id && favs[kind] && favs[kind][id]);
};

// Liga/desliga. Devolve true se ficou favoritado.
export function toggleFav(kind, it) {
  const id = idOf(kind, it);
  if (!id || !favs[kind]) return false;
  const list = { ...favs[kind] };
  if (list[id]) delete list[id];
  else list[id] = { ...snapshot(kind, it), at: Date.now() };
  favs = { ...favs, [kind]: list };
  save();
  emit();
  if (kind === 'streamer') syncStreamer(it.hostId, list[id] ? { notify: !!list[id].notify } : null);
  return !!list[id];
}

// ---------- Avisos dos streamers favoritos ----------
// Favoritar e receber aviso são coisas separadas: o sininho só aparece depois do coração,
// e a pessoa escolhe se quer ser avisada quando aquele streamer entrar ao vivo.
export const wantsNotify = (l) => {
  const f = favs.streamer[streamerKey(l)];
  return !!(f && f.notify);
};
export function setStreamerNotify(l, on) {
  const id = streamerKey(l);
  const cur = favs.streamer[id];
  if (!cur) return false;
  favs = { ...favs, streamer: { ...favs.streamer, [id]: { ...cur, notify: !!on } } };
  save();
  emit();
  syncStreamer(cur.hostId, { notify: !!on });
  return !!on;
}

// Com o servidor no ar, o favorito também vai para lá: é o servidor que avisa quando a live abre.
// Streamers de exemplo (sem conta no servidor) ficam só no celular.
function syncStreamer(hostId, fav) {
  if (!serverOn() || !hostId || hostId === 'me') return;
  const path = `/streamers/${encodeURIComponent(hostId)}/favorito`;
  (fav ? api('PUT', path, { notify: fav.notify }) : api('DELETE', path)).catch(() => {});
}

// Lives que abriram de quem a pessoa quer ser avisada (vindas do servidor, com o app aberto).
// A Notificações (sininho) mostra estas e também as lives de exemplo dos favoritos.
let liveAlerts = [];
export const favLiveAlerts = () => liveAlerts;
export function pushLiveAlert(live) {
  if (!live || liveAlerts.some((x) => x.id === live.id)) return;
  liveAlerts = [{ ...live, at: Date.now() }, ...liveAlerts].slice(0, 20);
  emit();
}

// Lista do tipo, do mais recente para o mais antigo.
export const favList = (kind) => Object.values(favs[kind] || {}).sort((a, b) => (b.at || 0) - (a.at || 0));

export function onFavs(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

// Atualiza a tela quando algum favorito muda.
export function useFavs() {
  const [, tick] = useState(0);
  useEffect(() => onFavs(() => tick((n) => n + 1)), []);
  return favs;
}
