// Músicas no Re@lys (Stream › Músicas), no estilo dos apps de música:
// - Galeria: tudo que os artistas publicam fica disponível para ouvir de graça, com propaganda.
// - O artista põe as músicas à venda: ele diz quanto quer receber e o Re@lys soma R$ 0,99 por download (src/taxas.js).
// - Baixar: só quem comprou a música do artista.
// - Playlists: o ouvinte monta e guarda as suas.
// - Plano Premium: sem propaganda; os 3 primeiros meses são gratuitos.
// Na demonstração tudo fica salvo no celular; as faixas de exemplo são áudios públicos de teste.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAXAS } from './taxas';
import { playRadio, stopRadio, setOnEnded, radioNow } from './radio';

export const MUSIC_FEE = TAXAS.musicaVenda.valor; // R$ 0,99 do Re@lys por download, somado ao valor do artista
export const MUSIC_ARTIST_MIN = TAXAS.musicaVenda.artistaMinimo;
export const MUSIC_ARTIST_SUGGESTED = TAXAS.musicaVenda.artistaSugerido;
export const MUSIC_PLAN_PRICE = TAXAS.musicaPremium.valor;
export const MUSIC_PLAN_FREE_MONTHS = TAXAS.musicaPremium.gratisMeses;
export const ADS_EVERY = 3; // sem o plano: uma propaganda a cada 3 músicas
export const MUSIC_GENRES = ['Sertanejo', 'Gospel', 'MPB', 'Rock', 'Pop', 'Rap', 'Eletrônica', 'Pagode', 'Forró', 'Instrumental'];
const r2 = (n) => Math.round(n * 100) / 100;
// Preço da música = o que o artista quer receber + R$ 0,99 do Re@lys.
export const priceFor = (artistValue) => r2(artistValue + MUSIC_FEE);
export const artistGets = (price) => r2(Math.max(0, price - MUSIC_FEE));

const T = (n) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
// Faixas de exemplo (artistas inventados; o áudio é de teste).
const SEED = [
  { id: 'mu1', title: 'Estrada de Chão', artist: 'Duda Ferraz', genre: 'Sertanejo', emoji: '🤠', price: 2.99, plays: 18400, url: T(1), example: true },
  { id: 'mu2', title: 'Luz do Amanhecer', artist: 'Ministério Aliança', genre: 'Gospel', emoji: '🙌', price: 1.99, plays: 32100, url: T(2), example: true },
  { id: 'mu3', title: 'Ijexá da Lua', artist: 'Lia Moreno', genre: 'MPB', emoji: '🌙', price: 3.49, plays: 9700, url: T(3), example: true },
  { id: 'mu4', title: 'Rua 15', artist: 'Banda Volts', genre: 'Rock', emoji: '🎸', price: 2.49, plays: 6200, url: T(4), example: true },
  { id: 'mu5', title: 'Coração no Modo Avião', artist: 'Bela Nunes', genre: 'Pop', emoji: '✈️', price: 2.99, plays: 27800, url: T(5), example: true },
  { id: 'mu6', title: 'Quebrada de Ouro', artist: 'MC Tavin', genre: 'Rap', emoji: '🎤', price: 1.99, plays: 41500, url: T(6), example: true },
  { id: 'mu7', title: 'Neon Sul', artist: 'DJ Karu', genre: 'Eletrônica', emoji: '🎧', price: 3.99, plays: 12900, url: T(7), example: true },
  { id: 'mu8', title: 'Domingo no Quintal', artist: 'Grupo Sem Pressa', genre: 'Pagode', emoji: '🥁', price: 2.49, plays: 15300, url: T(8), example: true },
].map((t) => ({ ...t, cover: `https://picsum.photos/seed/realys-cd-${t.id}/400/400` })); // capa do CD/da música

const KEY = 'realys.music.v1';
let data = { mine: [], playlists: [], plan: null, sales: 0, earned: 0, heard: 0 };
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
const set = (patch) => {
  data = { ...data, ...patch };
  save();
  emit();
};

export function useMusic() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (raw) {
            data = { ...data, ...JSON.parse(raw) };
            emit();
          }
        })
        .catch(() => {});
    }
    return () => subs.delete(fn);
  }, []);
  return data;
}

export const allTracks = () => [...data.mine, ...SEED];
export const trackById = (id) => allTracks().find((t) => t.id === id) || null;

// ---------- Artista ----------
export function publishTrack({ title, artist, genre, price, url, emoji, cover }) {
  const t = { id: 'my' + Date.now(), title, artist, genre, emoji: emoji || '🎵', cover: cover || null, price: r2(price), plays: 0, url: String(url).trim(), mine: true };
  set({ mine: [t, ...data.mine] });
  return t;
}
export const removeTrack = (id) => set({ mine: data.mine.filter((t) => t.id !== id), playlists: data.playlists.map((p) => ({ ...p, tracks: p.tracks.filter((x) => x !== id) })) });
// Na demonstração: registra uma venda de uma música minha (o artista recebe o valor menos a parte do Re@lys).
export const registerSale = (price) => set({ sales: data.sales + 1, earned: r2(data.earned + artistGets(price)) });

// ---------- Playlists ----------
export function createPlaylist(name) {
  const p = { id: 'pl' + Date.now(), name, tracks: [] };
  set({ playlists: [p, ...data.playlists] });
  return p;
}
export const removePlaylist = (id) => set({ playlists: data.playlists.filter((p) => p.id !== id) });
export const togglePlaylistTrack = (pid, tid) =>
  set({ playlists: data.playlists.map((p) => (p.id !== pid ? p : { ...p, tracks: p.tracks.includes(tid) ? p.tracks.filter((x) => x !== tid) : [...p.tracks, tid] })) });

// ---------- Plano Premium (sem propaganda) ----------
const MONTH = 30 * 86400000;
export const subscribePlan = () => set({ plan: { since: Date.now() } });
export const cancelPlan = () => set({ plan: null });
export function planInfo(at = Date.now()) {
  if (!data.plan) return { on: false };
  const freeUntil = data.plan.since + MUSIC_PLAN_FREE_MONTHS * MONTH;
  return { on: true, free: at < freeUntil, freeUntil };
}

// ---------- Ouvir offline (pacote especial do Premium) ----------
// Diferente da compra: a comprada é do cliente para sempre (pode baixar). A offline fica guardada
// protegida dentro do Re@lys, só toca no app e só enquanto o Premium estiver pago. Cancelou ou
// parou de pagar: as offline ficam bloqueadas (voltam ao assinar de novo). Para conferir o plano,
// o app precisa entrar na internet pelo menos 1 vez a cada 30 dias. Os plays offline contam para
// o artista e sobem quando a internet volta.
// Na demonstração só marca as músicas; os áudios de verdade são baixados quando estiverem no servidor.
export const OFFLINE_CHECK_DAYS = 30;
export const markOnline = () => set({ lastOnline: Date.now() });
export function offlineInfo(at = Date.now()) {
  const saved = data.offline || {};
  const count = Object.keys(saved).filter((id) => trackById(id)).length;
  if (!planInfo(at).on) return { allowed: false, reason: 'plano', count };
  if (data.lastOnline && at - data.lastOnline > OFFLINE_CHECK_DAYS * 86400000) return { allowed: false, reason: 'internet', count };
  return { allowed: true, count };
}
export const isOffline = (id) => !!(data.offline || {})[id];
export function toggleOffline(id) {
  const saved = { ...(data.offline || {}) };
  if (saved[id]) delete saved[id];
  else if (planInfo().on) saved[id] = Date.now();
  set({ offline: saved });
}
// Salva a playlist inteira para ouvir offline.
export function savePlaylistOffline(pl) {
  if (!planInfo().on) return;
  const saved = { ...(data.offline || {}) };
  pl.tracks.forEach((id) => (saved[id] = saved[id] || Date.now()));
  set({ offline: saved });
}
export const offlineTracks = () => Object.keys(data.offline || {}).map(trackById).filter(Boolean);

// Músicas compradas tocam sem propaganda e não entram na conta (a tela de Músicas informa quais são).
let owned = {};
export const setOwnedTracks = (map) => (owned = map || {});
// Propaganda que ficou devendo (a vez dela chegou com a tela de Músicas fechada): entra na próxima chance.
let adDue = false;

// Conta as músicas ouvidas (Galeria, playlists do ouvinte, qualquer fila) e diz se agora é hora da
// propaganda: uma a cada 3 músicas, só para quem não tem o plano.
export function countPlay(t) {
  if (planInfo().on) return (adDue = false);
  if (t && (owned[t.id] || t.mine)) return false;
  const heard = data.heard + 1;
  set({ heard });
  if (heard % ADS_EVERY === 0) adDue = true;
  return adDue;
}

// ---------- Tocar e passar para a próxima sozinho ----------
// A fila é a lista em que a pessoa tocou a música (Galeria, uma playlist, Compradas). Quando a faixa
// termina, entra a seguinte; no fim da lista, volta para a primeira.
let queue = [];
let adHook = null; // a tela de Músicas mostra a propaganda (quando está aberta)
export const setAdHook = (fn) => (adHook = fn);
// A capa do CD/da música vai junto: aparece no mini player, na janelinha e na barra de notificações.
const toRadio = (t) => ({ id: t.id, name: t.title, url: t.url, emoji: t.emoji, logo: t.cover || null, track: true, artist: t.artist });

// ---------- Perfil do artista ----------
// Tocar no nome do artista (mini player, lista de músicas) abre a página dele com as músicas.
export const artistTracks = (name) => allTracks().filter((t) => t.artist === name);
let artistOpen = null;
const asubs = new Set();
export const openArtist = (name) => {
  artistOpen = name || null;
  asubs.forEach((fn) => fn(artistOpen));
};
export const closeArtist = () => openArtist(null);
export function useArtistOpen() {
  const [a, setA] = useState(artistOpen);
  useEffect(() => {
    asubs.add(setA);
    return () => asubs.delete(setA);
  }, []);
  return a;
}
export const startTrack = (t) => playRadio(toRadio(t));
// Toca a faixa (com a propaganda antes, quando é a vez dela e a tela de Músicas está aberta).
export function playTrack(t, list) {
  if (list && list.length) queue = list.map((x) => x.id);
  if (countPlay(t) && adHook) {
    adDue = false;
    stopRadio();
    return adHook(t);
  }
  startTrack(t);
}
export function nextTrack(current) {
  if (radioNow().status === 'parado') return; // fechou a música: não passa para a próxima
  const ids = queue.filter((id) => trackById(id));
  if (!ids.length) return;
  const i = ids.indexOf(current && current.id);
  const next = trackById(ids[(i + 1) % ids.length]);
  if (next) playTrack(next);
}
setOnEnded(nextTrack);
