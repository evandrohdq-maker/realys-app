// Categorias de transmissão do Stream (rádios e TVs).
// A rádio/TV escolhe a categoria ao indexar; se não escolher, o Re@lys descobre pelo estilo escrito.
// tint = cor da categoria (chips e capa do perfil quando a estação não mandou capa).

export const RADIO_CATS = [
  { key: 'sertaneja', label: 'Sertaneja', icon: 'musical-notes-outline', emoji: '🤠', tint: '#C8892B', words: ['sertanej', 'modao', 'modão', 'caipira', 'moda de viola', 'universitario'] },
  { key: 'gospel', label: 'Gospel', icon: 'heart-outline', emoji: '⛪', tint: '#7C5CBF', words: ['gospel', 'evangel', 'catolic', 'católic', 'crist', 'louvor', 'religios', 'igreja'] },
  { key: 'gaucha', label: 'Gaúcha e nativista', icon: 'leaf-outline', emoji: '🧉', tint: '#2F7D4F', words: ['gaucha', 'gaúcha', 'nativis', 'tradicionalis', 'vanera', 'vanerão', 'chamame', 'chamamé', 'bailao', 'bailão'] },
  { key: 'pop', label: 'Pop e hits', icon: 'flash-outline', emoji: '🎤', tint: '#E0457B', words: ['pop', 'hits', 'top', 'jovem', 'adulto contemporaneo'] },
  { key: 'rock', label: 'Rock', icon: 'flame-outline', emoji: '🎸', tint: '#3B3B44', words: ['rock', 'metal', 'punk', 'indie'] },
  { key: 'samba', label: 'Samba, pagode e funk', icon: 'happy-outline', emoji: '🥁', tint: '#E8590C', words: ['samba', 'pagode', 'funk', 'axe', 'axé', 'forro', 'forró', 'brega', 'arrocha', 'piseiro'] },
  { key: 'mpb', label: 'MPB e bossa', icon: 'sunny-outline', emoji: '🎷', tint: '#1C8C8C', words: ['mpb', 'bossa', 'brasileira', 'jazz', 'blues', 'soul'] },
  { key: 'eletronica', label: 'Eletrônica', icon: 'pulse-outline', emoji: '🎧', tint: '#3B6FE0', words: ['eletron', 'eletrôn', 'electronic', 'house', 'techno', 'trance', 'ambiente', 'lounge', 'chill'] },
  { key: 'noticias', label: 'Notícias e talk', icon: 'newspaper-outline', emoji: '📰', tint: '#1B1B1F', words: ['noticia', 'notícia', 'jornal', 'news', 'talk', 'entrevista', 'informa', 'am '] },
  { key: 'esportes', label: 'Esportes', icon: 'football-outline', emoji: '⚽', tint: '#2FB463', words: ['esport', 'futebol', 'jogo', 'narra', 'gremio', 'grêmio', 'inter'] },
  { key: 'classica', label: 'Clássica e instrumental', icon: 'musical-note-outline', emoji: '🎻', tint: '#8B6F47', words: ['classic', 'clássic', 'erudit', 'instrumental', 'orquestra', 'piano'] },
  { key: 'comunitaria', label: 'Comunitária e local', icon: 'people-outline', emoji: '📻', tint: '#B8860B', words: ['comunitar', 'comunitár', 'local', 'regional', 'variedade', 'ecletic', 'eclétic'] },
];

export const TV_CATS = [
  { key: 'noticias', label: 'Notícias', icon: 'newspaper-outline', emoji: '📰', tint: '#1B1B1F', words: ['noticia', 'notícia', 'jornal', 'news', 'jornalismo'] },
  { key: 'esportes', label: 'Esportes', icon: 'football-outline', emoji: '⚽', tint: '#2FB463', words: ['esport', 'futebol', 'jogo', 'campeonato', 'luta'] },
  { key: 'religiosa', label: 'Religiosa e gospel', icon: 'heart-outline', emoji: '⛪', tint: '#7C5CBF', words: ['gospel', 'evangel', 'catolic', 'católic', 'religios', 'igreja', 'crist'] },
  { key: 'variedades', label: 'Variedades', icon: 'sparkles-outline', emoji: '🎬', tint: '#E0457B', words: ['variedade', 'entretenimento', 'auditorio', 'auditório', 'reality', 'humor'] },
  { key: 'filmes', label: 'Filmes e séries', icon: 'film-outline', emoji: '🍿', tint: '#3B3B44', words: ['filme', 'serie', 'série', 'cinema', 'novela', 'animac', 'animaç', 'desenho'] },
  { key: 'musica', label: 'Música e clipes', icon: 'musical-notes-outline', emoji: '🎵', tint: '#E8590C', words: ['musica', 'música', 'clipe', 'show', 'sertanej'] },
  { key: 'infantil', label: 'Infantil', icon: 'balloon-outline', emoji: '🧸', tint: '#F2A93B', words: ['infantil', 'kids', 'criança', 'crianca'] },
  { key: 'educacao', label: 'Educação e cultura', icon: 'school-outline', emoji: '🎓', tint: '#1C7ED6', words: ['educa', 'cultura', 'document', 'ciencia', 'ciência', 'universit', 'aula'] },
  { key: 'rural', label: 'Rural e agro', icon: 'leaf-outline', emoji: '🌾', tint: '#2F7D4F', words: ['rural', 'agro', 'campo', 'pecuar', 'leilao', 'leilão'] },
  { key: 'local', label: 'Canais locais', icon: 'location-outline', emoji: '📺', tint: '#B8860B', words: ['local', 'regional', 'comunitar', 'municip', 'camara', 'câmara', 'teste'] },
];

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Descobre a categoria pelo estilo/nome escrito (quando a estação não escolheu).
export function guessCat(kind, text) {
  const cats = kind === 'tv' ? TV_CATS : RADIO_CATS;
  const t = ` ${fold(text)} `;
  const hit = cats.find((c) => c.words.some((w) => t.includes(fold(w))));
  return hit ? hit.key : kind === 'tv' ? 'local' : 'comunitaria';
}
export const catsOf = (kind) => (kind === 'tv' ? TV_CATS : RADIO_CATS);
export const catOf = (kind, key) => catsOf(kind).find((c) => c.key === key) || catsOf(kind)[catsOf(kind).length - 1];
// Categoria da estação (a escolhida ou a descoberta pelo estilo).
export const stationCat = (kind, s) => catOf(kind, (s && s.cat) || guessCat(kind, `${s && s.genre} ${s && s.name}`));

// ---------- Abrir o perfil de uma estação de qualquer lugar (cartão, player, post do feed) ----------
let openSt = null; // { kind: 'radio' | 'tv', id }
const stSubs = new Set();
export const openStation = (kind, id) => {
  openSt = id ? { kind, id } : null;
  stSubs.forEach((fn) => fn(openSt));
};
export const closeStation = () => openStation(null, null);
export const stationOpen = () => openSt;
export function onStationOpen(fn) {
  stSubs.add(fn);
  return () => stSubs.delete(fn);
}
