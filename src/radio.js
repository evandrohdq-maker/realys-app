// Rádios no Realyz: cada rádio (empresa com CNPJ) indexa a URL do próprio streaming
// (MP3, AAC ou HLS .m3u8; também aceita listas .pls e .m3u) e ela toca na página da rádio
// e no diretório de Rádios. Um player só no app inteiro: tocar uma rádio para a outra.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'realys.radios';

// Rádios reais e gratuitas, com conteúdo para todas as idades:
// - Sky Plus: a rádio principal do Realyz.
// - Rádio Câmara e Rádio Senado: rádios públicas do Congresso. O conteúdo é público e gratuito, e as
//   duas liberam a retransmissão ao vivo pelos links oficiais (Câmara: licença Creative Commons BY).
// - SomaFM: rádio independente, sem comerciais, mantida pelos ouvintes (San Francisco, EUA).
// Rádio comercial brasileira só entra com autorização da própria rádio (ela indexa pelo app).
const SOMA = (id) => `https://ice2.somafm.com/${id}-128-mp3`;
const SEED = [
  // Rádio principal do Realyz (destaque no topo do Stream).
  {
    id: 'rd-skyplus', name: 'Sky Plus', city: 'Rádio online', genre: 'Rádio online', cat: 'comunitaria', emoji: '📻',
    logo: require('../assets/radios/skyplus.jpg'), featured: true, verified: true,
    url: 'https://stm1.voxpainel.com.br:7004/stream', desc: 'A rádio principal do Realyz. Ao vivo 24 horas.',
  },
  {
    id: 'rd-camara', name: 'Rádio Câmara', city: 'Brasília · 96,9 FM', genre: 'Notícias e cidadania', cat: 'noticias', emoji: '🏛️', verified: true, public: true,
    url: 'https://stream3.camara.leg.br/radiocamara1t64',
    desc: 'Rádio pública da Câmara dos Deputados: jornalismo, sessões ao vivo, música brasileira e A Voz do Brasil.',
  },
  {
    id: 'rd-senado', name: 'Rádio Senado', city: 'Brasília · 91,7 FM', genre: 'Notícias e música brasileira', cat: 'noticias', emoji: '🏛️', verified: true, public: true,
    url: 'http://radioaovivo.senado.leg.br/fm.mp3',
    desc: 'Rádio pública do Senado Federal: votações ao vivo, entrevistas, programas culturais e música brasileira.',
  },
  { id: 'rd-exemplo-2', name: 'Bossa Beyond', city: 'SomaFM · San Francisco, EUA', genre: 'Bossa nova e MPB', cat: 'mpb', emoji: '🎷', url: SOMA('bossa'), desc: 'Bossa nova, samba-jazz e MPB, sem comerciais.' },
  { id: 'rd-exemplo-1', name: 'Groove Salad', city: 'SomaFM · San Francisco, EUA', genre: 'Eletrônica ambiente', cat: 'eletronica', emoji: '🎧', url: SOMA('groovesalad'), desc: 'Batidas leves e eletrônica tranquila, sem comerciais.' },
  { id: 'rd-soma-lush', name: 'Lush', city: 'SomaFM · San Francisco, EUA', genre: 'Pop suave com vocais', cat: 'pop', emoji: '🌸', url: SOMA('lush'), desc: 'Vozes suaves e pop eletrônico calmo, sem comerciais.' },
  { id: 'rd-soma-folk', name: 'Folk Forward', city: 'SomaFM · San Francisco, EUA', genre: 'Folk e indie acústico', cat: 'rock', emoji: '🪕', url: SOMA('folkfwd'), desc: 'Folk, indie e acústico, sem comerciais.' },
  { id: 'rd-soma-agent', name: 'Secret Agent', city: 'SomaFM · San Francisco, EUA', genre: 'Jazz e lounge instrumental', cat: 'mpb', emoji: '🕶️', url: SOMA('secretagent'), desc: 'Lounge e jazz instrumental com clima de cinema, sem comerciais.' },
  { id: 'rd-soma-drone', name: 'Drone Zone', city: 'SomaFM · San Francisco, EUA', genre: 'Ambiente para relaxar', cat: 'classica', emoji: '🌌', url: SOMA('dronezone'), desc: 'Música ambiente sem batida, para relaxar, estudar ou dormir.' },
  { id: 'rd-soma-space', name: 'Deep Space One', city: 'SomaFM · San Francisco, EUA', genre: 'Eletrônica espacial', cat: 'eletronica', emoji: '🚀', url: SOMA('deepspaceone'), desc: 'Eletrônica ambiente com clima espacial, sem comerciais.' },
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
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(radios.filter((r) => !r.example && !r.server && !SEED.some((x) => x.id === r.id)))).catch(() => {});

// Estações do servidor (contas de verdade): troca as que vieram do servidor pela lista nova.
export function mergeServerRadios(list) {
  radios = [...list, ...radios.filter((r) => !r.server)];
  emit();
}

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
export const isFollowing = (id) => {
  if (id in following) return !!following[id];
  const r = radios.find((x) => x.id === id);
  return !!(r && r.seguindo);
};
export function toggleFollow(id) {
  // Estação do servidor: seguir fica guardado lá (e o aviso de ao vivo chega no celular).
  if (String(id || '').startsWith('es_')) {
    const { api } = require('./api');
    api('POST', `/estacoes/${id}/seguir`).catch(() => {});
  }
  following = { ...following, [id]: !following[id] };
  if (!following[id]) delete following[id];
  AsyncStorage.setItem(FKEY, JSON.stringify(following)).catch(() => {});
  emit();
  return !!following[id];
}
// Link para divulgar a estação fora do app (abre o perfil dela no Realyz).
export const stationLink = (s, kind = 'radio') => `https://realys.app/${kind}/${s.id}`;
