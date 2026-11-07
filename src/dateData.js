// Date (estilo Happn): pessoas que cruzaram com você pelo GPS. Cada uma tem o histórico de
// cruzamentos (quantas vezes, quando e onde, sempre aproximado), mais fotos e um ponto no mapa.
// Na versão real isso vem do servidor, com as posições aproximadas de quem está com o radar ligado.
import { encounterPeople } from './homeData';

const photo = (seed, w = 600, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Lugares do mapa de cruzamentos (x e y de 0 a 1 no desenho do mapa).
export const DATE_SPOTS = [
  { key: 'paulista', label: 'Av. Paulista', x: 0.52, y: 0.42 },
  { key: 'ibira', label: 'Parque Ibirapuera', x: 0.58, y: 0.72 },
  { key: 'vila', label: 'Vila Madalena', x: 0.22, y: 0.34 },
  { key: 'villa', label: 'Parque Villa-Lobos', x: 0.12, y: 0.6 },
  { key: 'norte', label: 'Shopping Center Norte', x: 0.66, y: 0.1 },
  { key: 'pinheiros', label: 'Pinheiros', x: 0.3, y: 0.55 },
  { key: 'centro', label: 'Centro', x: 0.78, y: 0.3 },
  { key: 'moema', label: 'Moema', x: 0.8, y: 0.76 },
];
const spotOf = (place) => {
  const t = String(place || '').toLowerCase();
  return (
    DATE_SPOTS.find((s) => t.includes(s.label.toLowerCase().replace(/^(av\. |parque |shopping )/, '').split(' ')[0])) || DATE_SPOTS[0]
  );
};

// Mais gente no radar (todas adultas, solteiras, divorciadas ou viúvas, e que aceitaram os termos).
const MORE = [
  { id: 'e-9', name: 'Beatriz', age: 24, gender: 'f', status: 'solteiro', optIn: true, km: 0.5, place: 'na Vila Madalena', when: 'há 25 min', job: 'Designer', bio: 'Café coado, museu no domingo e playlist pra tudo.', tags: ['☕ Café', '🎨 Arte', '🎶 MPB'], looking: 'Namoro', likesYou: true, details: { estudo: 'Superior', bebida: 'Socialmente', encontro: 'Café ou sorvete', pets: 'Tenho gato' } },
  { id: 'e-10', name: 'Thiago', age: 32, gender: 'm', status: 'solteiro', optIn: true, km: 1.1, place: 'perto da Av. Paulista', when: 'hoje às 8h40', job: 'Advogado', bio: 'Trilha no fim de semana e churrasco com os amigos.', tags: ['⛰️ Trilha', '🍖 Churrasco', '⚽ Futebol'], looking: 'Relacionamento sério', likesYou: false, details: { altura: '1,81 a 1,90 m', religiao: 'Católica', filhos: 'Quero ter', exercicio: 'Algumas vezes por semana', encontro: 'Jantar' } },
  { id: 'e-11', name: 'Larissa', age: 28, gender: 'f', status: 'divorciado', optIn: true, km: 1.6, place: 'em Pinheiros', when: 'ontem às 19h', job: 'Enfermeira', bio: 'Mãe do Theo, louca por praia e por uma boa conversa.', tags: ['🏖️ Praia', '🍣 Japonesa', '🙏 Fé'], looking: 'Namoro', likesYou: true, details: { filhos: 'Tenho filhos', religiao: 'Evangélica', bebida: 'Não bebo', encontro: 'Parque ou trilha' } },
  { id: 'e-12', name: 'Gustavo', age: 36, gender: 'm', status: 'viuvo', optIn: true, km: 2.8, place: 'em Moema', when: 'ontem às 12h', job: 'Empresário', bio: 'Recomeçando. Gosto de cozinhar e de viajar sem roteiro.', tags: ['🍝 Cozinhar', '✈️ Viagem', '💼 Empreender'], looking: 'Relacionamento sério', likesYou: true, details: { filhos: 'Tenho filhos', estudo: 'Pós-graduação', pets: 'Tenho cachorro' } },
  { id: 'e-13', name: 'Fernanda', age: 33, gender: 'f', status: 'solteiro', optIn: true, km: 0.8, place: 'perto do Parque Ibirapuera', when: 'hoje às 7h15', job: 'Personal trainer', bio: 'Corro no Ibira toda manhã. Bora tomar um açaí depois?', tags: ['🏃 Corrida', '🏋️ Academia', '🥗 Saudável'], looking: 'Namoro', likesYou: false, details: { exercicio: 'Todo dia', bebida: 'Socialmente', cigarro: 'Não fumo', signo: 'Áries' } },
  { id: 'e-14', name: 'Diego', age: 25, gender: 'm', status: 'solteiro', optIn: true, km: 3.4, place: 'no Centro', when: 'há 2 h', job: 'Músico', bio: 'Toco violão na igreja e samba no fim de semana.', tags: ['🥁 Samba e pagode', '🎶 Gospel', '🍕 Pizza'], looking: 'Amizade', likesYou: false, details: { religiao: 'Evangélica', encontro: 'Cinema ou show' } },
  { id: 'e-15', name: 'Renata', age: 38, gender: 'f', status: 'solteiro', optIn: true, km: 2.1, place: 'perto do Parque Villa-Lobos', when: 'sábado às 16h', job: 'Veterinária', bio: 'Duas cachorras, uma bike e muita vontade de conhecer gente boa.', tags: ['🐶 Pets', '🚲 Bike', '📚 Leitura'], looking: 'Relacionamento sério', likesYou: true, details: { pets: 'Tenho cachorro', filhos: 'Ainda não sei', estudo: 'Pós-graduação', exercicio: 'Algumas vezes por semana' } },
  { id: 'e-16', name: 'Matheus', age: 29, gender: 'm', status: 'solteiro', optIn: true, km: 1.4, place: 'no Shopping Center Norte', when: 'sábado às 20h', job: 'Desenvolvedor', bio: 'Games, café e séries. Topo um cinema?', tags: ['🎮 Games', '📺 Séries', '🎬 Cinema'], looking: 'Namoro', likesYou: false, details: { estudo: 'Superior', bebida: 'Socialmente', encontro: 'Cinema ou show' } },
];

// Há quanto tempo (em minutos, aproximado) foi um cruzamento: ordena do mais recente para o mais antigo.
export const minutesAgo = (when) => {
  const t = String(when || '').toLowerCase();
  const n = parseInt((t.match(/\d+/) || [0])[0], 10) || 0;
  if (/min/.test(t)) return n;
  if (/há \d+ ?h/.test(t)) return n * 60;
  if (/hoje/.test(t)) return 300 + (24 - n) * 10;
  if (/ontem/.test(t)) return 1440 + (24 - n) * 10;
  if (/s[aá]bado/.test(t)) return 2880 + (24 - n) * 10;
  if (/sexta/.test(t)) return 4320 + (24 - n) * 10;
  return 6000;
};

// Horários de cruzamentos anteriores (sempre mais antigos que o último).
const TIMES = ['hoje às 14h20', 'hoje às 9h05', 'ontem às 18h40', 'ontem às 12h10', 'sábado às 21h', 'sexta às 17h30'];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function enrich(p) {
  const h = hash(p.id);
  const count = 1 + (h % 5); // cruzaram de 1 a 5 vezes
  const spot = spotOf(p.place);
  const other = DATE_SPOTS[(h >> 3) % DATE_SPOTS.length];
  const crossings = [{ when: p.when, place: p.place, spot: spot.key }];
  const older = TIMES.filter((t) => minutesAgo(t) > minutesAgo(p.when));
  for (let i = 1; i < count && i - 1 < older.length; i++) {
    const s = i % 2 ? spot : other;
    crossings.push({ when: older[(h + i) % older.length], place: `perto de ${s.label}`, spot: s.key });
  }
  // sem horários repetidos, do mais recente para o mais antigo
  const seen = {};
  const list = crossings.filter((c) => (seen[c.when] ? false : (seen[c.when] = true))).sort((a, b) => minutesAgo(a.when) - minutesAgo(b.when));
  const seed = String(p.photo || '').match(/seed\/([^/]+)/);
  const base = seed ? seed[1] : 'realys-date-' + p.id;
  return {
    tags: [],
    details: {},
    ...p,
    photo: p.photo || photo(base),
    photos: [p.photo || photo(base), photo(base + '-2'), photo(base + '-3')],
    crossings: list,
    spot: spot.key,
  };
}

export const datePeople = [...encounterPeople, ...MORE].map(enrich);
export const datePerson = (id) => datePeople.find((p) => p.id === id);

// Charmes por dia (curtida especial: a pessoa é avisada na hora).
export const CHARMS_PER_DAY = 3;
