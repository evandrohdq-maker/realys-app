// Músicas no Re@lys (Stream › Músicas), no estilo dos apps de música:
// - Galeria: tudo que os artistas publicam fica disponível para ouvir de graça, com propaganda.
// - O artista põe as músicas à venda; o Re@lys fica com uma porcentagem da venda (src/taxas.js).
// - Baixar: só quem comprou a música do artista.
// - Playlists: o ouvinte monta e guarda as suas.
// - Plano Premium: sem propaganda; os 3 primeiros meses são gratuitos.
// Na demonstração tudo fica salvo no celular; as faixas de exemplo são áudios públicos de teste.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAXAS } from './taxas';

export const MUSIC_FEE_PCT = TAXAS.musicaVenda.pct; // % do Re@lys sobre cada venda
export const MUSIC_PLAN_PRICE = TAXAS.musicaPremium.valor;
export const MUSIC_PLAN_FREE_MONTHS = TAXAS.musicaPremium.gratisMeses;
export const ADS_EVERY = 3; // sem o plano: uma propaganda a cada 3 músicas
export const MUSIC_GENRES = ['Sertanejo', 'Gospel', 'MPB', 'Rock', 'Pop', 'Rap', 'Eletrônica', 'Pagode', 'Forró', 'Instrumental'];
const r2 = (n) => Math.round(n * 100) / 100;
export const artistGets = (price) => r2(price * (1 - MUSIC_FEE_PCT / 100));

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
];

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
export function publishTrack({ title, artist, genre, price, url, emoji }) {
  const t = { id: 'my' + Date.now(), title, artist, genre, emoji: emoji || '🎵', price: r2(price), plays: 0, url: String(url).trim(), mine: true };
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

// Conta as músicas ouvidas e diz se agora é hora da propaganda (só para quem não tem o plano).
export function countPlay() {
  const heard = data.heard + 1;
  set({ heard });
  return !planInfo().on && heard % ADS_EVERY === 0;
}
