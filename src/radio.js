// Rádios no Realyz: cada rádio (empresa com CNPJ) indexa a URL do próprio streaming
// (MP3, AAC ou HLS .m3u8; também aceita listas .pls e .m3u) e ela toca na página da rádio
// e no diretório de Rádios. Um player só no app inteiro: tocar uma rádio para a outra.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'realys.radios';

// Rádios de exemplo para a demonstração (streams públicos de rádios na internet).
const SEED = [
  // Rádio principal do Realyz (destaque no topo do Stream).
  {
    id: 'rd-skyplus', name: 'Sky Plus', city: 'Rádio online', genre: 'Rádio online', cat: 'comunitaria', emoji: '📻',
    logo: require('../assets/radios/skyplus.jpg'), featured: true, verified: true,
    url: 'https://stm1.voxpainel.com.br:7004/stream', desc: 'A rádio principal do Realyz. Ao vivo 24 horas.',
  },
  {
    id: 'rd-exemplo-1', name: 'Groove Salad (SomaFM)', city: 'San Francisco, EUA', genre: 'Eletrônica ambiente', emoji: '🎧',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3', example: true, cat: 'eletronica', desc: 'Rádio de exemplo: mostra como fica uma rádio indexada no Realyz.',
  },
  {
    id: 'rd-exemplo-2', name: 'Bossa Beyond (SomaFM)', city: 'San Francisco, EUA', genre: 'Bossa nova e MPB', emoji: '🎷',
    url: 'https://ice2.somafm.com/bossa-128-mp3', example: true, cat: 'mpb', desc: 'Rádio de exemplo com bossa nova.',
  },
];

let radios = SEED;
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export async function loadRadios() {
  if (loaded) return radios;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const mine = raw ? JSON.parse(raw) : [];
    radios = [...mine, ...SEED.filter((s) => !mine.some((m) => m.id === s.id))];
  } catch (e) {}
  emit();
  return radios;
}
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(radios.filter((r) => !r.example && !SEED.some((x) => x.id === r.id)))).catch(() => {});

export const allRadios = () => [...radios].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
export const radioById = (id) => radios.find((r) => r.id === id) || null;
export const radioOf = (storeId) => radios.find((r) => r.storeId === storeId) || null;
export function onRadios(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

// Confere se parece uma URL de streaming.
export function checkUrl(url) {
  const u = String(url || '').trim();
  if (!/^https?:\/\/[^\s/]+\.[^\s]+/i.test(u)) return 'Cole o endereço completo, começando com http:// ou https://';
  if (/\.(html?|php|aspx?)(\?|$)/i.test(u)) return 'Esse endereço é de uma página, não do áudio. Use o link do streaming (MP3, AAC, .m3u8, .pls ou .m3u).';
  return null;
}

// Listas .pls/.m3u são arquivos de texto com o endereço do áudio dentro: pega o primeiro.
export async function resolveStream(url) {
  const u = String(url || '').trim();
  if (!/\.(pls|m3u)(\?|$)/i.test(u)) return u;
  try {
    const txt = await (await fetch(u)).text();
    const m = txt.match(/https?:\/\/[^\s"']+/);
    return m ? m[0] : u;
  } catch (e) {
    return u;
  }
}

// Indexa (ou atualiza) a rádio de uma empresa.
export function saveRadio(r) {
  const i = radios.findIndex((x) => x.id === r.id || (r.storeId && x.storeId === r.storeId));
  const item = { ...r, id: r.id || 'rd-' + Date.now(), url: String(r.url).trim(), updatedAt: Date.now() };
  radios = i >= 0 ? radios.map((x, k) => (k === i ? { ...x, ...item, id: x.id } : x)) : [item, ...radios];
  save();
  emit();
  return item;
}
export function removeRadio(id) {
  radios = radios.filter((r) => r.id !== id);
  save();
  emit();
}

// ---------- Player único ----------
// O RadioHost (montado no App) ouve estes pedidos e toca de verdade.
let now = { radio: null, status: 'parado', error: null }; // status: parado | carregando | tocando | erro
const psubs = new Set();
const pemit = () => psubs.forEach((fn) => fn(now));
export const radioNow = () => now;
export function onRadioNow(fn) {
  psubs.add(fn);
  return () => psubs.delete(fn);
}
export function setRadioNow(patch) {
  now = { ...now, ...patch };
  pemit();
}
export const playRadio = (radio) => setRadioNow({ radio, status: 'carregando', error: null, req: Date.now() });
export const stopRadio = () => setRadioNow({ status: 'parado', error: null, req: Date.now() });
// Quem cuida do fim de uma faixa (músicas: passa para a próxima). Definido em src/music.js.
let endedHandler = null;
export const setOnEnded = (fn) => (endedHandler = fn);
export const radioEnded = () => endedHandler && endedHandler(radioNow().radio);

// ---------- Seguir estações (rádios e TVs) ----------
// Quem segue vê os posts da estação no feed e recebe o aviso quando ela entra ao vivo (com o servidor).
const FKEY = 'realys.stations.following';
let following = {};
AsyncStorage.getItem(FKEY).then((raw) => raw && ((following = { ...JSON.parse(raw), ...following }), emit())).catch(() => {});
export const isFollowing = (id) => !!following[id];
export function toggleFollow(id) {
  following = { ...following, [id]: !following[id] };
  if (!following[id]) delete following[id];
  AsyncStorage.setItem(FKEY, JSON.stringify(following)).catch(() => {});
  emit();
  return !!following[id];
}
// Link para divulgar a estação fora do app (abre o perfil dela no Realyz).
export const stationLink = (s, kind = 'radio') => `https://realys.app/${kind}/${s.id}`;
