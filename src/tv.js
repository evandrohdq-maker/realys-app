// TV online no Re@lys: cada canal (empresa com CNPJ) indexa a URL do próprio streaming de vídeo
// (HLS .m3u8 ou MP4) e passa a aparecer na aba Stream, ao lado das rádios.
// Funciona igual às rádios (src/radio.js): a URL é do sinal ao vivo, não do site do canal.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'realys.tvs';

// Canais de exemplo para a demonstração (streams públicos de teste, sem programação de verdade).
const SEED = [
  {
    id: 'tv-exemplo-1', name: 'Canal Demonstração 1', city: 'Sinal de teste', genre: 'Animação', emoji: '📺',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', example: true, cat: 'filmes',
    desc: 'Canal de exemplo: mostra como fica uma TV indexada no Re@lys.',
  },
  {
    id: 'tv-exemplo-2', name: 'Canal Demonstração 2', city: 'Sinal de teste', genre: 'Barras de teste', emoji: '🎬',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8', example: true, cat: 'local',
    desc: 'Canal de exemplo com sinal de teste.',
  },
];

let tvs = SEED;
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export async function loadTvs() {
  if (loaded) return tvs;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const mine = raw ? JSON.parse(raw) : [];
    tvs = [...mine, ...SEED.filter((s) => !mine.some((m) => m.id === s.id))];
  } catch (e) {}
  emit();
  return tvs;
}
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(tvs.filter((t) => !t.example))).catch(() => {});

export const allTvs = () => tvs;
export const tvById = (id) => tvs.find((t) => t.id === id) || null;
export const tvOf = (storeId) => tvs.find((t) => t.storeId === storeId) || null;
export function onTvs(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

// Confere se parece uma URL de streaming de vídeo.
export function checkTvUrl(url) {
  const u = String(url || '').trim();
  if (!/^https?:\/\/[^\s/]+\.[^\s]+/i.test(u)) return 'Cole o endereço completo, começando com http:// ou https://';
  if (/\.(html?|php|aspx?)(\?|$)/i.test(u)) return 'Esse endereço é de uma página, não do vídeo. Use o link do streaming (.m3u8 ou .mp4).';
  if (/(youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com)/i.test(u)) return 'Links de redes sociais não tocam aqui. Use o link do sinal (.m3u8) que o seu provedor de streaming fornece.';
  return null;
}

export function saveTv(t) {
  const item = { ...t, id: t.id || 'tv-' + Date.now(), example: false };
  tvs = tvs.some((x) => x.id === item.id) ? tvs.map((x) => (x.id === item.id ? item : x)) : [item, ...tvs];
  save();
  emit();
  return item;
}

export function removeTv(id) {
  tvs = tvs.filter((t) => t.id !== id);
  save();
  emit();
}

// ---------- Canal no ar ----------
// O vídeo toca numa janela flutuante por cima do app (src/components/FloatPlayers.js), um canal
// por vez. A aba Stream só pede o canal; a janela continua quando a pessoa muda de tela.
let now = { channel: null, req: 0 };
const psubs = new Set();
export const tvNow = () => now;
export function onTvNow(fn) {
  psubs.add(fn);
  return () => psubs.delete(fn);
}
const pemit = () => psubs.forEach((fn) => fn(now));
export function playTv(channel) {
  now = { channel, req: Date.now() };
  pemit();
}
export function stopTv() {
  if (!now.channel) return;
  now = { channel: null, req: Date.now() };
  pemit();
}
