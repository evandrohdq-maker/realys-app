// Pedidos específicos da Lotus, que não podem cair na busca geral:
// 1) "festa mais próxima", "tem balada aberta agora?" → festas abertas ou que abrem logo mais,
//    pela distância (e não aluguel de salão de festa).
// 2) "abre o perfil da Ana" → abre o perfil da pessoa (ou a página da empresa).
import { events, contacts } from './homeData';
import { members } from './people';
import { artists } from './extraData';
import { norm, soundKey } from './wakeMatch';
import { findNavigation } from './voiceNav';

const words = (s) => norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);

// ---------- Festas e eventos ----------

const PARTY = /\b(festas?|baladas?|balda|night|noitada|role|roles|curtir|sair hoje|o que fazer|o que (tem )?(pra|para) fazer|pra onde ir|shows?|pagode|samba|sertanej[oa]|eletronica|funk|forro|louvor|musica ao vivo|ao vivo|boate|club|casa noturna|evento|eventos)\b/;
// Isso é organizar a própria festa (aluguel, salão, buffet...), não sair para uma festa.
const RENTAL = /\b(alug\w*|loca\w*|salao|saloes|espaco|espacos|chacara|buffet|decorac\w*|infantil|aniversario do|organizar|fazer (uma|a|minha) festa|minha festa|dj para|fotograf\w*|reservar data|orcamento)\b/;
const PARTY_GROUPS = new Set(['festa-promo', 'shows', 'gratis']);
// Estilo pedido: raiz da palavra → como a Lotus fala ("festa sertaneja" acha o Baile Sertanejo).
const GENRES = { pagode: 'de pagode', samba: 'de samba', sertanej: 'sertaneja', eletronic: 'eletrônica', louvor: 'de louvor', funk: 'de funk', forro: 'de forró', 'open bar': 'com open bar' };

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const hourText = (h) => (h === 24 || h === 0 ? 'meia-noite' : `${h}h`);
export const kmText = (km) =>
  km < 1 ? `${Math.round(km * 1000 / 50) * 50} metros` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`;

// Situação do evento agora: aberto (até que horas) ou quanto falta para abrir.
export function eventStatus(e, now = new Date()) {
  if (!e.days || e.start == null) return null;
  const cur = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  const WEEK = 7 * 24 * 60;
  const len = ((e.end === 24 ? 24 : e.end) - e.start + 24) % 24 || 24;
  let best = null;
  for (const d of e.days) {
    const startAt = d * 24 * 60 + e.start * 60;
    // Aberto agora? (inclui o que começou ontem e passa da meia-noite)
    for (const shift of [0, -WEEK, WEEK]) {
      const s = startAt + shift;
      if (cur >= s && cur < s + len * 60) return { open: true, minutes: 0, until: e.end, endsIn: s + len * 60 - cur };
    }
    let ahead = startAt - cur;
    if (ahead < 0) ahead += WEEK;
    if (!best || ahead < best.minutes) best = { open: false, minutes: ahead, day: d };
  }
  return best;
}

function whenText(st, e, now) {
  if (st.open) return `aberta agora, até ${hourText(e.end)}`;
  const today = now.getDay();
  if (st.minutes < 60) return `abre em ${st.minutes} minutos`;
  if (st.day === today && st.minutes < 24 * 60) return `abre hoje às ${hourText(e.start)}`;
  if (st.day === (today + 1) % 7) return `abre amanhã às ${hourText(e.start)}`;
  return `abre ${DAY_NAMES[st.day]} às ${hourText(e.start)}`;
}

// Sinais de que a pessoa quer saber onde ir agora (e não só abrir a aba Eventos).
const CUE = /\b(proxim\w*|perto|abert\w*|agora|hoje|hj|logo mais|noite|tem|onde|qual|quais|rolando|sair|curtir|fazer)\b/;
export const hasPartyCue = (text) => CUE.test(norm(text));

export function isPartyQuery(text) {
  const t = norm(text);
  return PARTY.test(t) && !RENTAL.test(t);
}

// "festa mais próxima" → { reply, results } com as festas abertas primeiro, depois as que abrem logo.
export function partyReply(text, now = new Date()) {
  const t = norm(text);
  const genre = Object.keys(GENRES).find((g) => t.includes(g));
  const onlyNow = /\b(agora|aberta|abertas|aberto|abertos|rolando|neste momento)\b/.test(t);
  const tonight = /\b(hoje|hj|essa noite|esta noite|hoje a noite|logo mais)\b/.test(t);
  let list = events
    .filter((e) => PARTY_GROUPS.has(e.group) && e.days)
    .filter((e) => !genre || norm(`${e.title} ${e.detail} ${e.who}`).includes(genre))
    .map((e) => ({ e, st: eventStatus(e, now) }))
    .filter((x) => x.st);
  if (onlyNow) list = list.filter((x) => x.st.open);
  else if (tonight) list = list.filter((x) => x.st.open || x.st.minutes <= 18 * 60);
  // Abertas primeiro (a mais perto ganha); depois as que abrem antes, desempatando pela distância.
  // Festas a mais de 50 km vão para o fim: não adianta indicar festa em outra cidade.
  const far = (x) => (x.e.km > 50 ? 1 : 0);
  list.sort((a, b) => far(a) - far(b) || (b.st.open ? 1 : 0) - (a.st.open ? 1 : 0) || (a.st.open ? a.e.km - b.e.km : a.st.minutes - b.st.minutes || a.e.km - b.e.km));

  const what = genre ? `${GENRES[genre]} ` : '';
  if (!list.length) {
    return {
      reply: onlyNow
        ? `Não tem festa ${what}aberta agora perto de você. Quer que eu mostre as que abrem logo mais? É só dizer "festa hoje".`
        : `Não encontrei festa ${what}perto de você nos próximos dias.`,
      results: [],
    };
  }
  const results = list.slice(0, 6).map(({ e, st }) => ({
    id: 'fx-' + e.id,
    section: st.open ? '● Aberta agora' : 'Festa · logo mais',
    icon: '🎉',
    title: e.title,
    subtitle: `${e.who} · ${e.place.split(',')[0]} · a ${kmText(e.km)} · ${whenText(st, e, now)}`,
    price: e.price,
    photo: e.photo,
    sponsored: e.sponsored,
    go: { tab: 'home', top: 'eventos', group: e.group },
  }));
  const first = list[0];
  const second = list.find((x) => x !== first && !far(x));
  let reply = far(first)
    ? `Perto de você não tem festa ${what}agora. A mais perto é ${first.e.title}, no ${first.e.who}, em ${first.e.place.split(', ').pop()}, a ${kmText(first.e.km)}. Ela ${whenText(first.st, first.e, now)}.`
    : first.st.open
    ? `A festa aberta mais perto de você é ${first.e.title}, no ${first.e.who}, em ${first.e.place.split(',')[0]}, a ${kmText(first.e.km)}. Está aberta até ${hourText(first.e.end)}, entrada ${first.e.price}.`
    : `A próxima festa perto de você é ${first.e.title}, no ${first.e.who}, a ${kmText(first.e.km)}. Ela ${whenText(first.st, first.e, now)}, entrada ${first.e.price}.`;
  if (second) reply += ` Também tem ${second.e.title}, a ${kmText(second.e.km)}, ${second.st.open ? `aberta até ${hourText(second.e.end)}` : `que ${whenText(second.st, second.e, now)}`}.`;
  reply += ' Toque numa festa para ver os ingressos.';
  return { reply, results };
}

// ---------- Abrir perfil de pessoa ou página de empresa ----------

// "abre o perfil da Ana", "mostra o perfil do Diego Santos", "página da Pizzaria da Praça".
const PROFILE_RE = /\b(?:perfil|perfis|pagina|conta|instagram)\s+(?:d[aoe]s?|of)\s+(.+)$/;
const NOT_NAMES = new Set(['mim', 'minha', 'meu', 'empresa', 'minha empresa', 'loja', 'usuario', 'cliente', 'socorro', 'inicio', 'agro', 'tecnologia']);
const TAIL = /\b(por favor|pra mim|para mim|agora|ai|aqui|rapido|logo)\b.*$/;

const sameWord = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && soundKey(a) === soundKey(b));

function nameScore(asked, name) {
  const want = words(asked).filter((w) => !['a', 'o', 'da', 'do', 'de', 'dos', 'das', 'e'].includes(w));
  const have = words(name);
  if (!want.length) return 0;
  const hits = want.filter((w) => have.some((h) => sameWord(w, h))).length;
  if (hits < want.length) return 0; // todas as palavras ditas precisam estar no nome
  return hits * 10 + (have.length === want.length ? 5 : 0);
}

// Devolve null (não é pedido de perfil), { open } (abrir já), { ask, options } (mais de um) ou { notFound }.
// Tipo de ação para abrir o resultado (pessoa, empresa ou página de usuário).
export const openAction = (o) => ({ type: o.kind === 'company' ? 'OPEN_COMPANY' : o.kind === 'page' ? 'OPEN_USER_PAGE' : 'OPEN_PROFILE', id: o.id });
const PAGE_RE = /\bpaginas?\s+(?!d[aoe]s?\b)(.+)$/;

export function findProfile(text, state) {
  const t = norm(text).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const m = t.match(PROFILE_RE) || t.match(PAGE_RE);
  if (!m) return null;
  const asked = m[1].replace(TAIL, '').trim();
  // "página do Agro", "página da empresa": é navegação, não perfil.
  if (!asked || NOT_NAMES.has(asked) || findNavigation(asked)) return null;

  const friendIds = new Set(contacts.filter((c) => !c.business).map((c) => c.id));
  const people = members.map((p) => ({ kind: 'person', id: p.id, name: p.name, sub: `@${p.handle} · ${p.city}`, photo: p.photo, friend: friendIds.has(p.id) || !!(state.friends && state.friends[p.id] === 'amigo'), mutual: p.mutual || 0 }));
  const companies = [
    ...(state.stores || []).map((s) => ({ kind: 'company', id: s.id, name: s.name, sub: `${s.category} · ${s.city}`, photo: s.cover, friend: false, mutual: 0 })),
    ...artists.map((a) => ({ kind: 'company', id: a.id, name: a.name, sub: `${a.genre} · ${a.city}`, photo: a.cover, friend: false, mutual: 0 })),
    // Páginas de usuários (assinadas ou anônimas): a Lotus abre pelo nome.
    ...(state.userPages || []).map((p) => ({ kind: 'page', id: p.id, name: p.name, sub: `Página · ${p.anon ? 'anônima' : p.ownerName}`, photo: p.cover, friend: p.ownerId === 'me', mutual: 0 })),
  ];
  const scored = [...people, ...companies]
    .map((c) => ({ ...c, score: nameScore(asked, c.name) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (b.friend ? 1 : 0) - (a.friend ? 1 : 0) || b.mutual - a.mutual);
  if (!scored.length) return { notFound: asked };
  const top = scored.filter((c) => c.score === scored[0].score);
  // Um só com esse nome, ou só um deles é seu contato: abre direto.
  const friends = top.filter((c) => c.friend);
  if (top.length === 1 || friends.length === 1) {
    const pick = top.length === 1 ? top[0] : friends[0];
    return { open: pick, others: top.filter((c) => c !== pick) };
  }
  return { ask: asked, options: top.slice(0, 5) };
}

// Escolha depois de "Encontrei duas Anas": "a Ana Souza", "Souza", "a primeira", "a segunda".
export function pickOption(text, options) {
  const t = norm(text);
  const ord = [/\b(primeir[ao]|1)\b/, /\b(segund[ao]|2)\b/, /\b(terceir[ao]|3)\b/, /\b(quart[ao]|4)\b/, /\b(quint[ao]|5)\b/];
  const i = ord.findIndex((r) => r.test(t));
  if (i >= 0 && options[i]) return options[i];
  const scored = options.map((o) => ({ o, s: words(t).filter((w) => w.length > 2 && words(o.name).some((h) => sameWord(w, h))).length }));
  const best = scored.sort((a, b) => b.s - a.s)[0];
  return best && best.s > 0 && scored.filter((x) => x.s === best.s).length === 1 ? best.o : null;
}

const article = (o) => (o.kind === 'company' ? 'a página de' : o.kind === 'page' ? 'a página' : 'o perfil de');
export const openReply = (o, others = []) =>
  `Abrindo ${article(o)} ${o.name}.` + (others.length ? ` Também tem ${others.map((x) => x.name).join(' e ')}; se for outra pessoa, é só pedir.` : '');
export const askReply = (asked, options) =>
  `Encontrei ${options.length} com o nome ${asked.replace(/\b\w/g, (c) => c.toUpperCase())}: ${options.map((o) => o.name).join(', ')}. Qual delas você quer abrir?`;
export const toResult = (o) => ({
  id: 'pf-' + o.kind + o.id,
  section: o.kind === 'page' ? 'Página' : o.kind === 'company' ? 'Empresa' : o.friend ? 'Pessoa · seu contato' : 'Pessoa',
  icon: o.kind === 'page' ? '📄' : o.kind === 'company' ? '🏪' : '👤',
  title: o.name,
  subtitle: o.sub,
  photo: o.photo,
  ...(o.kind === 'company' ? { companyId: o.id } : o.kind === 'page' ? { pageId: o.id } : { profileId: o.id }),
});
