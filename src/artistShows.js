// Contratação de artistas (classe Artistas: músicos, DJs, bandas, artes cênicas e artes visuais).
//
// O artista monta, no Estúdio Realyz, a vitrine de contratação:
//  - Cachês: pacotes de show (nome, duração, valor e o que inclui).
//  - Onde atende: só na cidade dele, na região (até X km) ou viajando pelo Brasil, com o valor do
//    deslocamento por km. Viajando, hospedagem e transporte podem ficar por conta de quem contrata.
//  - Agenda: dias da semana em que toca, até quando a agenda está aberta e os dias bloqueados.
//    Os shows fechados ocupam o dia sozinhos.
//  - Vitrine: frase de chamada, vídeos ao vivo e fotos (a "publicidadezinha" dele), tipos de evento
//    e a estrutura que leva (som, luz...).
//
// Quem quer contratar tem três botões:
//  - Contratar: escolhe o pacote e um dia livre e paga. O valor fica retido (Garantia Realyz) até o
//    show acontecer. O artista aceita ou recusa; recusou, o dinheiro volta na hora.
//  - Fazer orçamento: conta o evento (tipo, data, cidade, público). O artista responde com o valor e
//    o cliente paga para fechar.
//  - Entrar em contato: conversa dentro do pedido, no Realyz. Telefone e rede social por fora são
//    bloqueados (regra anti-desvio): fora do app não tem garantia.
//
// Divulgação: com o show fechado, o app gera a arte do show com a marca do artista (story pronto) e
// os dois lados assumem o compromisso de divulgar nos stories: o artista posta o anúncio e o
// "é hoje"; quem contratou posta pelo menos um. O cartão do pedido mostra o que já foi postado.
//
// Taxa: o Realyz fica com 10% do cachê (src/taxas.js › show), cobrado do artista, só quando o show
// acontece. Quem contrata não paga taxa. Deslocamento vai inteiro para o artista.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { TAXAS } from './taxas';
import { distanceKm } from './geo';

export const SHOW_FEE_PCT = TAXAS.show.pct;
// Classes de perfil que podem ser contratadas (ids de src/socialClasses.js).
export const ARTIST_CLASSES = ['musico', 'cenicas', 'artista'];
export const isArtistClass = (social) => !!social && ARTIST_CLASSES.includes(social.cls);

// Como o artista cobra cada opção (o mesmo do servidor: server/src/routes/shows.js › COBRANCAS).
//  - show: valor fechado pelo show (com duração);
//  - hora: valor por hora, quem contrata escolhe quantas horas;
//  - servico: um trabalho (arte, gravação de jingle, pintura de mural, ensaio…);
//  - publicidade: divulga a marca de quem contrata (reels, stories, presença). Não ocupa a agenda.
export const COBRANCAS = [
  { key: 'show', label: 'Por show', unit: 'por show', icon: 'mic-outline' },
  { key: 'hora', label: 'Por hora', unit: 'por hora', icon: 'time-outline' },
  { key: 'servico', label: 'Por serviço', unit: 'por serviço', icon: 'construct-outline' },
  { key: 'publicidade', label: 'Publicidade', unit: 'por publi', icon: 'megaphone-outline' },
];
export const cobrancaOf = (p) => COBRANCAS.find((c) => c.key === (p && p.cobranca)) || COBRANCAS[0];
export const isPubli = (p) => !!p && p.cobranca === 'publicidade';
// Valor do que foi escolhido (por hora multiplica pelas horas).
export const valorDo = (p, horas = 1) => (!p ? null : Math.round(p.valor * (cobrancaOf(p).key === 'hora' ? Math.max(1, horas || 1) : 1) * 100) / 100);

export const EVENT_TYPES = ['Casa de show', 'Bar e restaurante', 'Casamento', 'Aniversário', 'Formatura', 'Empresa', 'Igreja', 'Festa particular', 'Evento público'];
export const ATENDE = [
  { key: 'cidade', label: 'Só na minha cidade', icon: 'home-outline' },
  { key: 'regiao', label: 'Cidade e região', icon: 'navigate-circle-outline' },
  { key: 'viaja', label: 'Viajo pelo Brasil', icon: 'airplane-outline' },
];
export const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const STATUS = {
  aguardando: { label: 'Aguardando o artista', color: '#B7791F', icon: 'hourglass-outline' },
  proposta: { label: 'Orçamento respondido', color: '#2F74D0', icon: 'pricetag-outline' },
  confirmado: { label: 'Show fechado', color: '#2E8B57', icon: 'checkmark-circle-outline' },
  realizado: { label: 'Show realizado', color: '#2E8B57', icon: 'star-outline' },
  recusado: { label: 'Recusado', color: '#B42318', icon: 'close-circle-outline' },
  cancelado: { label: 'Cancelado', color: '#64748B', icon: 'close-circle-outline' },
  conversa: { label: 'Conversa', color: '#6B5CE7', icon: 'chatbubbles-outline' },
};
// Compromisso de divulgação nos stories.
export const DIVULGA = { artista: 2, contratante: 1 };
export const CANCEL_DAYS = 7; // quem contratou cancela com estorno total até 7 dias antes do show

const r2 = (n) => Math.round(n * 100) / 100;
export const showFee = (cache) => r2((cache * SHOW_FEE_PCT) / 100);
export const artistGets = (cache, desloc = 0) => r2(cache - showFee(cache) + desloc);

// ---------- Cidades (para calcular o deslocamento) ----------
// Sem geocodificação no app: as cidades mais usadas ficam aqui. Cidade fora da lista → orçamento.
export const CITIES = {
  'Passo Fundo - RS': [-28.262, -52.408], 'Marau - RS': [-28.449, -52.2], 'Carazinho - RS': [-28.283, -52.786], 'Erechim - RS': [-27.634, -52.274],
  'Soledade - RS': [-28.818, -52.51], 'Lagoa Vermelha - RS': [-28.209, -51.526], 'Cruz Alta - RS': [-28.639, -53.606], 'Santa Maria - RS': [-29.684, -53.807],
  'Caxias do Sul - RS': [-29.168, -51.179], 'Porto Alegre - RS': [-30.033, -51.23], 'Chapecó - SC': [-27.101, -52.615], 'Florianópolis - SC': [-27.595, -48.548],
  'Curitiba - PR': [-25.428, -49.273], 'São Paulo - SP': [-23.55, -46.633], 'Rio de Janeiro - RJ': [-22.907, -43.173], 'Belo Horizonte - MG': [-19.917, -43.934],
  'Goiânia - GO': [-16.686, -49.264], 'Salvador - BA': [-12.971, -38.501], 'Ouro Preto - MG': [-20.385, -43.503], 'Brasília - DF': [-15.793, -47.882],
};
const normCity = (c) => String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*-\s*/g, ' - ').trim();
export const findCity = (c) => Object.keys(CITIES).find((k) => normCity(k) === normCity(c) || normCity(k).split(' - ')[0] === normCity(c).split(' - ')[0]) || null;
export function kmBetween(a, b) {
  const ka = findCity(a);
  const kb = findCity(b);
  if (!ka || !kb) return null;
  if (ka === kb) return 0;
  const [la, lo] = CITIES[ka];
  const [lb, lob] = CITIES[kb];
  return Math.round(distanceKm(la, lo, lb, lob) * 1.25); // estrada é ~25% mais longa que a linha reta
}

// O artista atende nessa cidade? Devolve { ok, km, desloc, why }.
export function coverage(p, city) {
  const at = p.atende || { modo: 'cidade' };
  if (!city) return { ok: false, why: 'Informe a cidade do evento.' };
  const km = kmBetween(p.cidade, city);
  if (km === 0) return { ok: true, km: 0, desloc: 0 };
  if (km == null) return { ok: at.modo !== 'cidade', km: null, desloc: null, orcamento: true, why: at.modo === 'cidade' ? `${first(p.nome)} só atende em ${cityName(p.cidade)}.` : 'Essa cidade não está na tabela de distâncias: peça um orçamento e o artista informa o deslocamento.' };
  if (at.modo === 'cidade') return { ok: false, km, why: `${first(p.nome)} só atende em ${cityName(p.cidade)}.` };
  if (at.modo === 'regiao' && km > (at.raioKm || 0)) return { ok: false, km, why: `${cityName(city)} fica a ${km} km. ${first(p.nome)} atende até ${at.raioKm} km de ${cityName(p.cidade)}.` };
  return { ok: true, km, desloc: r2(km * 2 * (at.porKm || 0)) }; // ida e volta
}
export const cityName = (c) => String(c || '').split(' - ')[0];
const first = (n) => String(n || '').split(' ')[0];
export function atendeText(p) {
  const at = p.atende || { modo: 'cidade' };
  if (at.modo === 'cidade') return { title: `Atende só em ${cityName(p.cidade)}`, sub: 'Shows dentro da cidade, sem deslocamento' };
  if (at.modo === 'regiao') return { title: `Atende ${cityName(p.cidade)} e região`, sub: `até ${at.raioKm} km de distância${at.porKm ? ` · deslocamento R$ ${String(at.porKm).replace('.', ',')}/km` : ''}` };
  return { title: 'Viaja para todo o Brasil', sub: `${at.porKm ? `deslocamento R$ ${String(at.porKm).replace('.', ',')}/km` : 'deslocamento no orçamento'}${at.hospedagem ? ' · hospedagem por conta do contratante' : ''}` };
}

// ---------- Agenda ----------
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
export const keyLabel = (k) => {
  const d = new Date(fromKey(k));
  return `${WEEK[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const openUntil = (p) => (p.agendaAte ? fromKey(p.agendaAte + (p.agendaAte.length === 7 ? '-28' : '')) + 4 * 86400000 : Infinity);
// Situação de um dia na agenda do artista: livre, show (fechado), bloqueado, fora (não toca nesse
// dia da semana ou além da agenda aberta) ou passado.
export function dayState(p, key, pedidos = [], now = Date.now()) {
  const t = fromKey(key);
  if (t < fromKey(dayKey(now))) return 'passado';
  if ((p.ocupados || []).includes(key) || pedidos.some((x) => x.artistaId === p.id && x.data === key && ['confirmado', 'realizado'].includes(x.status))) return 'show';
  if ((p.bloqueados || []).includes(key)) return 'bloqueado';
  if (t > openUntil(p)) return 'fora';
  const wd = new Date(t).getDay();
  if (p.diasSemana && p.diasSemana.length && !p.diasSemana.includes(wd)) return 'fora';
  return 'livre';
}
export function nextFreeDays(p, pedidos = [], n = 8, now = Date.now()) {
  const out = [];
  for (let i = 1; i < 240 && out.length < n; i++) {
    const k = dayKey(now + i * 86400000);
    if (dayState(p, k, pedidos, now) === 'livre') out.push(k);
  }
  return out;
}
export function monthDays(year, month) {
  const firstWd = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstWd }, () => null);
  for (let d = 1; d <= count; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export const agendaText = (p) => {
  const dias = (p.diasSemana || []).length && p.diasSemana.length < 7 ? p.diasSemana.map((d) => WEEK[d]).join(', ') : 'todos os dias';
  const ate = p.agendaAte ? `Agenda aberta até ${p.agendaAte.length === 7 ? `${p.agendaAte.slice(5)}/${p.agendaAte.slice(0, 4)}` : keyLabel(p.agendaAte)}` : 'Agenda aberta';
  return { title: ate, sub: `${(p.eventos || []).slice(0, 3).join(', ').toLowerCase() || 'shows e eventos'} · ${dias}` };
};
export const fromPrice = (p) => ((p.pacotes || []).length ? Math.min(...p.pacotes.map((x) => x.valor)) : null);

// ---------- Artistas de exemplo ----------
const pic = (seed, w = 900, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const pk = (id, nome, duracao, valor, desc, cobranca = 'show') => ({ id, nome, duracao, valor, desc, cobranca });
export const SEED_ARTISTS = [
  {
    id: 'a2', ref: { company: 'a2' }, nome: 'Duda Viola', genero: 'Sertanejo', cidade: 'Goiânia - GO', logo: '🎸', foto: pic('realys-art-viola'),
    frase: 'Voz e viola pra fazer o seu evento cantar junto', eventos: ['Bar e restaurante', 'Casamento', 'Aniversário', 'Evento público'],
    pacotes: [pk('p1', 'Voz e viola', 120, 1200, 'Repertório sertanejo raiz e universitário'), pk('p2', 'Banda completa', 180, 3800, 'Banda com 4 músicos, som e luz')],
    atende: { modo: 'viaja', porKm: 2.5, hospedagem: true }, diasSemana: [4, 5, 6, 0], agendaAte: '2027-06', estrutura: 'Levo som para até 300 pessoas.',
    vitrine: [{ kind: 'video', titulo: 'Ao vivo no Rodeio', capa: pic('realys-clipe2', 600, 340) }, { kind: 'video', titulo: 'Saudade de Goiás (acústico)', capa: pic('realys-viola-v2', 600, 340) }],
    rating: 4.8, shows: 64, ativo: true,
  },
  {
    id: 'a1', ref: { company: 'a1' }, nome: 'Banda Louvor Vivo', genero: 'Gospel', cidade: 'São Paulo - SP', logo: '🎤', foto: pic('realys-art-louvor'),
    frase: 'Louvor ao vivo para igrejas, casamentos e eventos', eventos: ['Igreja', 'Casamento', 'Evento público'],
    pacotes: [pk('p1', 'Culto ou celebração', 90, 1800, 'Banda com 5 integrantes'), pk('p2', 'Cerimônia de casamento', 60, 2400, 'Entrada, cerimônia e saída dos noivos')],
    atende: { modo: 'regiao', raioKm: 150, porKm: 2 }, diasSemana: [], agendaAte: '2027-12', estrutura: 'Instrumentos próprios. Som do local ou locado à parte.',
    vitrine: [{ kind: 'video', titulo: 'Clipe oficial · Luz do Amanhecer', capa: pic('realys-clipe1', 600, 340) }],
    rating: 4.9, shows: 112, ativo: true,
  },
  {
    id: 'a3', ref: { company: 'a3' }, nome: 'DJ Nexo', genero: 'Eletrônica', cidade: 'Curitiba - PR', logo: '🎧', foto: pic('realys-art-dj'),
    frase: 'Sets autorais pra pista não parar', eventos: ['Casa de show', 'Festa particular', 'Formatura', 'Empresa'],
    pacotes: [pk('p1', 'Set de 3 horas', 180, 1500, 'Equipamento de DJ incluso'), pk('p2', 'Festa completa', 300, 3200, 'DJ, som e iluminação para até 250 pessoas')],
    atende: { modo: 'viaja', porKm: 2, hospedagem: true }, diasSemana: [5, 6], agendaAte: '2027-12', estrutura: 'Controladora, caixas e iluminação próprias.',
    vitrine: [{ kind: 'video', titulo: 'Nexo Sunset Mix ao vivo', capa: pic('realys-dj-v1', 600, 340) }],
    rating: 4.7, shows: 38, ativo: true,
  },
  {
    id: 'u42', ref: { member: 'u42' }, nome: 'Kelly Martins', genero: 'DJ de festas', cidade: 'São Paulo - SP', logo: '🎧', foto: pic('realys-dj-kelly'),
    frase: 'DJ de casamento e 15 anos com a pista lotada', eventos: ['Casamento', 'Aniversário', 'Formatura', 'Festa particular'],
    pacotes: [pk('p1', 'Pista de 4 horas', 240, 1900, 'DJ e equipamento'), pk('p2', 'Pista + cerimônia', 300, 2600, 'Trilha da cerimônia e festa')],
    atende: { modo: 'regiao', raioKm: 100, porKm: 2 }, diasSemana: [5, 6], agendaAte: '2027-03', estrutura: 'Som e luz para até 200 pessoas.',
    vitrine: [{ kind: 'video', titulo: 'Casamento na serra', capa: pic('realys-kelly-v1', 600, 340) }],
    rating: 4.9, shows: 85, ativo: true,
  },
  {
    id: 'u35', ref: { member: 'u35' }, nome: 'Eduardo Nascimento', genero: 'Stand-up', cidade: 'São Paulo - SP', logo: '🎙️', foto: pic('realys-standup'),
    frase: 'Stand-up limpo, para empresa e para a família', eventos: ['Empresa', 'Casa de show', 'Bar e restaurante'],
    pacotes: [pk('p1', 'Show de 50 min', 50, 2500, 'Comédia sem palavrão para eventos de empresa')],
    atende: { modo: 'viaja', porKm: 1.8, hospedagem: true }, diasSemana: [], agendaAte: '2027-12', estrutura: 'Precisa de um microfone e luz no palco.',
    vitrine: [{ kind: 'video', titulo: 'Trecho novo: o grupo da família', capa: pic('realys-standup-v1', 600, 340) }],
    rating: 4.8, shows: 51, ativo: true,
  },
  // Cidade-piloto: artista de exemplo em Passo Fundo.
  {
    id: 'pf1', ref: null, nome: 'MC Vento Sul', genero: 'Rap e trap', cidade: 'Passo Fundo - RS', logo: '🎤', foto: pic('realys-rap-pf'),
    frase: 'Rap do interior com palco de cidade grande', eventos: ['Casa de show', 'Formatura', 'Evento público', 'Festa particular'],
    pacotes: [pk('p1', 'Show de 1 hora', 60, 900, 'MC e DJ, 12 músicas'), pk('p2', 'Show de 1h30 com banda', 90, 1800, 'MC, DJ e baterista')],
    atende: { modo: 'regiao', raioKm: 30, porKm: 2 }, diasSemana: [5, 6], agendaAte: '2027-12', estrutura: 'DJ e pick-ups próprios. Som do local.',
    vitrine: [
      { kind: 'video', titulo: 'Ao vivo na Praça Tamandaré', capa: pic('realys-rap-v1', 600, 340) },
      { kind: 'video', titulo: 'Fim do filme (ao vivo)', capa: pic('realys-rap-v2', 600, 340) },
      { kind: 'video', titulo: 'Formatura 2026', capa: pic('realys-rap-v3', 600, 340) },
    ],
    rating: 4.9, shows: 27, ativo: true,
  },
];

// ---------- Dados salvos no celular ----------
const KEY = 'realys.shows.v1';
// mine: a vitrine do artista dono da conta. pedidos: pedidos feitos (lado cliente) e recebidos (lado artista).
let data = { mine: null, pedidos: [], server: [] };
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const save = () => AsyncStorage.setItem(KEY, JSON.stringify({ mine: data.mine, pedidos: data.pedidos })).catch(() => {});
const set = (patch) => {
  data = { ...data, ...patch };
  save();
  emit();
};
export function loadShows() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const old = JSON.parse(raw);
      data = { ...data, mine: old.mine || data.mine, pedidos: [...data.pedidos, ...(old.pedidos || []).filter((p) => !data.pedidos.some((x) => x.id === p.id))] };
      emit();
    })
    .catch(() => {});
}
export function useShows() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    loadShows();
    return () => subs.delete(fn);
  }, []);
  return data;
}
export const getShows = () => data;

export const allArtists = () => [...(data.mine && data.mine.ativo ? [data.mine] : []), ...(data.server || []), ...SEED_ARTISTS.filter((a) => !(data.server || []).some((s) => s.id === a.id))];
export const artistById = (id) => allArtists().find((a) => a.id === id) || (data.mine && data.mine.id === id ? data.mine : null);
export const artistByRef = (kind, id) => allArtists().find((a) => a.ref && a.ref[kind] === id) || null;
export const setServerArtists = (list) => set({ server: list || [] });
// Pedidos vindos do servidor substituem as cópias antigas deles; os do celular ficam.
export const replaceServerPedidos = (list) => set({ pedidos: [...(list || []), ...data.pedidos.filter((p) => !p.serverId)] });

// Vitrine nova (artista que ainda não montou a dele).
export function blankProfile({ nome, cidade, genero, foto }) {
  return {
    id: 'me', ref: { member: 'me' }, nome: nome || 'Meu nome artístico', genero: genero || '', cidade: cidade || 'Passo Fundo - RS', logo: '🎤', foto: foto || null,
    frase: '', eventos: ['Bar e restaurante', 'Aniversário'], pacotes: [pk('p1', 'Show de 1 hora', 60, 500, '')],
    atende: { modo: 'regiao', raioKm: 30, porKm: 2, hospedagem: false }, diasSemana: [5, 6], agendaAte: `${new Date().getFullYear() + 1}-12`, bloqueados: [], estrutura: '',
    vitrine: [], rating: null, shows: 0, ativo: false,
  };
}
export const saveMine = (mine) => set({ mine: { ...mine, id: 'me', updatedAt: Date.now() } });
export function toggleBlock(key) {
  const m = data.mine;
  if (!m) return;
  const b = m.bloqueados || [];
  saveMine({ ...m, bloqueados: b.includes(key) ? b.filter((x) => x !== key) : [...b, key] });
}

// ---------- Pedidos ----------
const newId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const snap = (a) => ({ id: a.id, nome: a.nome, foto: a.foto, logo: a.logo, genero: a.genero, cidade: a.cidade });
// lado: 'cliente' (eu pedi) ou 'artista' (pediram para mim). Na demonstração os dois lados ficam no mesmo celular.
export function createPedido({ artista, tipo, pacote: pk0, horas = null, data: dia, hora, evento, local, cidade, publico, mensagem, cliente, desloc = 0, km = null, fromGift = 0 }) {
  const pacote = pk0 && cobrancaOf(pk0).key === 'hora' ? { ...pk0, horas: Math.max(1, horas || 1) } : pk0;
  const valor = pacote ? valorDo(pacote, pacote.horas) : null;
  const p = {
    id: newId('sh'), artistaId: artista.id, artista: snap(artista), lado: artista.id === 'me' ? 'artista' : 'cliente', cliente: cliente || 'Você',
    tipo, status: tipo === 'contato' ? 'conversa' : 'aguardando', pacote: pacote || null, data: dia || null, hora: hora || '', evento: evento || '', local: local || '',
    cidade: cidade || '', publico: publico || null, km, desloc: desloc || 0, valor, total: valor != null ? r2(valor + (desloc || 0)) : null,
    pago: tipo === 'contratacao', fromGift, msgs: mensagem ? [{ de: 'cliente', text: mensagem, at: Date.now() }] : [], divulgacao: { artista: [], contratante: [] }, at: Date.now(),
  };
  set({ pedidos: [p, ...data.pedidos] });
  return p;
}
export const pedidoById = (id) => data.pedidos.find((x) => x.id === id) || null;
const patch = (id, fn) => set({ pedidos: data.pedidos.map((x) => (x.id === id ? { ...x, ...fn(x) } : x)) });
// Artista responde. Contratação: aceita (fecha o show) ou recusa (o dinheiro volta).
// Orçamento: responde com o valor (cachê + deslocamento) ou recusa.
export function respond(id, { aceitar, valor, desloc = 0, nota = '' }) {
  patch(id, (x) => {
    const msgs = nota ? [...x.msgs, { de: 'artista', text: nota, at: Date.now() }] : x.msgs;
    if (!aceitar) return { status: 'recusado', msgs };
    if (x.tipo === 'contratacao') return { status: 'confirmado', msgs, fechadoEm: Date.now() };
    return { status: 'proposta', valor: r2(valor), desloc: r2(desloc), total: r2(valor + desloc), msgs };
  });
}
export const markPaid = (id, fromGift = 0) => patch(id, () => ({ status: 'confirmado', pago: true, fromGift, fechadoEm: Date.now() }));
export const markCanceled = (id, por) => patch(id, () => ({ status: 'cancelado', canceladoPor: por }));
export const markDone = (id) => patch(id, () => ({ status: 'realizado', realizadoEm: Date.now() }));
export const addMsg = (id, de, text) => patch(id, (x) => ({ msgs: [...x.msgs, { de, text, at: Date.now() }] }));
export const markStory = (id, lado) => patch(id, (x) => ({ divulgacao: { ...x.divulgacao, [lado]: [...(x.divulgacao[lado] || []), Date.now()] } }));
export const rate = (id, nota) => patch(id, () => ({ nota }));

// Cancelamento por quem contratou: estorno total até 7 dias antes do show; depois, só pelo suporte.
export function canCancel(p, now = Date.now()) {
  if (['aguardando', 'proposta'].includes(p.status)) return true;
  if (p.status !== 'confirmado' || !p.data) return false;
  return fromKey(p.data) - now >= CANCEL_DAYS * 86400000;
}
// Show já passou da data (libera o "o show aconteceu").
export const showPassed = (p, now = Date.now()) => !!p.data && fromKey(p.data) <= now;
export const storyDone = (p, lado) => (p.divulgacao[lado] || []).length >= DIVULGA[lado];

// Conteúdo do story de divulgação (a arte do show com a marca do artista).
export function storyCard(artista, pedido) {
  const a = atendeText(artista);
  const ag = agendaText(artista);
  const videos = (artista.vitrine || []).filter((v) => v.kind === 'video').length;
  return {
    nome: artista.nome, genero: artista.genero, cidade: cityName(artista.cidade), foto: artista.foto, logo: artista.logo,
    show: pedido && pedido.data ? { quando: keyLabel(pedido.data) + (pedido.hora ? ` · ${pedido.hora}` : ''), onde: [pedido.local, cityName(pedido.cidade)].filter(Boolean).join(' · '), evento: pedido.evento } : null,
    itens: [
      videos ? { icon: 'videocam-outline', tint: '#FDE8E8', ink: '#C81E1E', title: `${videos} vídeo${videos > 1 ? 's' : ''} ao vivo no perfil`, sub: 'dá pra ouvir antes de contratar' } : null,
      { icon: 'location-outline', tint: '#E6EEFB', ink: '#2F74D0', ...a },
      { icon: 'calendar-outline', tint: '#EFEAFF', ink: '#6B5CE7', ...ag },
    ].filter(Boolean),
    link: `realyz.com.br/artistas/${slug(artista.nome)}`,
  };
}
export const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
