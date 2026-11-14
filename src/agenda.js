// Agenda do prestador: próximos trabalhos, trabalhos já feitos, horários de trabalho e folgas.
// Junta numa linha do tempo só:
//   - compromissos da própria agenda (state.agenda): os de exemplo, os que o prestador marca
//     na mão (cliente particular) e os bloqueios (folga, almoço, médico…);
//   - visitas aceitas pelo Re@lys (state.myVisits), que entram sozinhas quando o prestador aceita;
//   - corridas/serviços aceitos agora (state.rides).
// Sem dependências do React Native, para poder ser testado no computador.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// De onde veio o compromisso.
export const ORIGIN = {
  realys: { label: 'Pelo Re@lys', icon: 'shield-checkmark-outline' },
  visita: { label: 'Visita pelo Re@lys', icon: 'home-outline' },
  corrida: { label: 'Pedido pelo Re@lys', icon: 'navigate-outline' },
  particular: { label: 'Cliente particular', icon: 'person-outline' },
  bloqueio: { label: 'Horário bloqueado', icon: 'lock-closed-outline' },
};

// Situação de cada compromisso (cor e texto).
export const STATUS = {
  agendado: { label: 'Agendado', color: '#A8790A' },
  confirmado: { label: 'Confirmado', color: '#2F74D0' },
  andamento: { label: 'Em andamento', color: '#6C5CE7' },
  feito: { label: 'Concluído', color: '#1E9E63' },
  cancelado: { label: 'Cancelado', color: '#D9534F' },
  bloqueio: { label: 'Bloqueado', color: '#6E7891' },
};

export const DURATIONS = [
  { min: 30, label: '30 min' },
  { min: 60, label: '1 h' },
  { min: 90, label: '1h30' },
  { min: 120, label: '2 h' },
  { min: 180, label: '3 h' },
  { min: 240, label: '4 h' },
  { min: 480, label: 'Dia todo' },
];

export const REMINDERS = [0, 15, 30, 60, 120];
export const reminderText = (m) => (!m ? 'Sem aviso' : m < 60 ? `${m} min antes` : `${m / 60} h antes`);

// Horário de trabalho padrão: segunda a sexta 8h–18h, sábado 8h–12h, domingo de folga.
export const DEFAULT_HOURS = [
  { on: false, from: 8, to: 12 }, // domingo
  { on: true, from: 8, to: 18 },
  { on: true, from: 8, to: 18 },
  { on: true, from: 8, to: 18 },
  { on: true, from: 8, to: 18 },
  { on: true, from: 8, to: 18 },
  { on: true, from: 8, to: 12 }, // sábado
];

// ---------- datas ----------
export const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const at = (dayTs, h, m = 0) => {
  const d = new Date(dayTs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
export const addDays = (ts, n) => {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
export const sameDay = (a, b) => startOfDay(a) === startOfDay(b);
export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (ts) => {
  const d = new Date(ts);
  return d.getMinutes() ? `${d.getHours()}h${pad(d.getMinutes())}` : `${d.getHours()}h`;
};
export const ddmm = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
export const durText = (min) => {
  if (min >= 480) return 'dia todo';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${pad(m)}` : `${h} h`;
};

// "Hoje", "Amanhã", "Ontem" ou "Sábado, 09/11".
export function dayLabel(ts, now = Date.now()) {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY_MS);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return `${WEEKDAYS[new Date(ts).getDay()]}, ${ddmm(ts)}`;
}

// Quanto falta: "agora", "em 25 min", "em 2h 10min", "amanhã às 9h", "em 3 dias".
export function untilText(ts, now = Date.now()) {
  const min = Math.round((ts - now) / 60000);
  if (min <= 0) return 'agora';
  if (min < 60) return `em ${min} min`;
  if (min < 12 * 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `em ${h}h ${m}min` : `em ${h}h`;
  }
  const days = Math.round((startOfDay(ts) - startOfDay(now)) / DAY_MS);
  if (days <= 1) return `${days === 0 ? 'hoje' : 'amanhã'} às ${hhmm(ts)}`;
  return `em ${days} dias`;
}

// Converte o "quando" dos pedidos de visita ("Hoje, 15h", "Amanhã, 9h", "Sábado, 10h",
// "Hoje à tarde", "Assim que possível"…) num horário de verdade.
export function parseWhen(text, now = Date.now()) {
  const t = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const hm = t.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/);
  let h = hm ? parseInt(hm[1], 10) : null;
  const m = hm && hm[2] ? parseInt(hm[2], 10) : 0;
  if (h == null) {
    if (/manha/.test(t)) h = 9;
    else if (/tarde/.test(t)) h = 15;
    else if (/noite/.test(t)) h = 19;
  }
  let day = startOfDay(now);
  if (/amanha/.test(t)) day = addDays(day, 1);
  else if (/fim de semana/.test(t)) {
    const wd = new Date(day).getDay();
    day = addDays(day, wd === 6 || wd === 0 ? 0 : 6 - wd);
    if (h == null) h = 10;
  } else {
    const idx = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].findIndex((w) => t.includes(w));
    if (idx >= 0) {
      const wd = new Date(day).getDay();
      day = addDays(day, (idx - wd + 7) % 7 || 7);
    }
  }
  if (h == null) {
    // "Assim que possível": próxima hora cheia.
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    return next.getTime() + 60 * 60 * 1000;
  }
  return at(day, h, m);
}

// ---------- exemplos da demonstração ----------
// Datas sempre relativas a hoje, para a agenda nunca parecer vazia nem velha.
export function sampleAgenda(now = Date.now()) {
  const d0 = startOfDay(now);
  const D = (n) => addDays(d0, n);
  const job = (id, day, h, m, dur, extra) => ({ id, start: at(day, h, m), dur, origin: 'realys', status: 'agendado', ...extra });
  return [
    // Já feitos (histórico)
    job('ag1', D(-24), 9, 0, 120, { client: 'Diego Santos', service: 'Instalação elétrica da cozinha', address: 'Rua Haddock Lobo, 220', value: 180, status: 'feito', stars: 5, review: 'Muito caprichoso, deixou tudo limpo.' }),
    job('ag2', D(-20), 14, 0, 60, { client: 'Marina Lopes', service: 'Troca de disjuntor', address: 'Av. Rebouças, 880', value: 90, status: 'feito', stars: 5 }),
    job('ag3', D(-16), 8, 30, 180, { client: 'Padaria Pão de Ouro', service: 'Revisão do quadro de luz', address: 'Rua Teodoro Sampaio, 1010', value: 260, status: 'feito', stars: 4, review: 'Bom serviço, atrasou um pouco.' }),
    job('ag4', D(-12), 10, 0, 60, { client: 'Seu Antônio', service: 'Tomadas da sala', address: 'Rua Cardeal Arcoverde, 77', value: 70, status: 'feito', origin: 'particular' }),
    job('ag5', D(-9), 15, 0, 90, { client: 'Juliana Prado', service: 'Instalação de chuveiro', address: 'Rua Oscar Freire, 1500', value: 120, status: 'feito', stars: 5, review: 'Rápido e educado. Recomendo!' }),
    job('ag6', D(-6), 9, 0, 240, { client: 'Clínica Bem Viver', service: 'Iluminação da recepção', address: 'Av. Paulista, 2001', value: 420, status: 'feito', stars: 5 }),
    job('ag7', D(-3), 16, 0, 60, { client: 'Rafael Costa', service: 'Ventilador de teto', address: 'Rua Augusta, 950', value: 110, status: 'feito', stars: 4 }),
    job('ag8', D(-2), 11, 0, 60, { client: 'Lúcia Ferreira', service: 'Orçamento de reforma', address: 'Rua Pamplona, 300', value: 0, status: 'cancelado', note: 'Cliente desmarcou.' }),
    job('ag9', D(-1), 13, 30, 90, { client: 'Mercadinho Bom Preço', service: 'Troca de lâmpadas e reatores', address: 'Rua das Flores, 45', value: 150, status: 'feito', stars: 5 }),
    // Próximos
    job('ag10', D(0), 17, 0, 60, { client: 'Fernanda Alves', service: 'Instalar luminárias', address: 'Rua Bela Cintra, 640', value: 130, status: 'confirmado' }),
    job('ag11', D(1), 8, 0, 120, { client: 'Escritório Lima & Souza', service: 'Revisão elétrica preventiva', address: 'Av. Faria Lima, 3100', value: 300, status: 'confirmado' }),
    job('ag12', D(1), 12, 0, 60, { origin: 'bloqueio', status: 'bloqueio', service: 'Almoço' }),
    job('ag13', D(2), 14, 0, 90, { client: 'Paulo Henrique', service: 'Chuveiro e tomada do banheiro', address: 'Rua Frei Caneca, 410', value: 140, origin: 'particular' }),
    job('ag14', D(4), 9, 30, 180, { client: 'Restaurante Sabor da Casa', service: 'Instalação da coifa e tomadas industriais', address: 'Rua Consolação, 2200', value: 380, status: 'confirmado' }),
    job('ag15', D(6), 8, 0, 480, { origin: 'bloqueio', status: 'bloqueio', service: 'Folga: aniversário da filha' }),
    job('ag16', D(8), 10, 0, 120, { client: 'Condomínio Jardins', service: 'Iluminação da garagem', address: 'Alameda Santos, 1800', value: 520 }),
  ];
}

// ---------- montagem da agenda ----------
const VISIT_TO_STATUS = { aceita: 'confirmado', confirmada: 'andamento', concluida: 'feito', faltou: 'cancelado', cancelada: 'cancelado' };

export function buildAgenda({ agenda = [], myVisits = [], rides = [] }, now = Date.now()) {
  const fromVisits = myVisits.map((v) => ({
    id: `visita-${v.id}`,
    visitId: v.id,
    start: v.start || parseWhen(v.when, v.acceptedAt || now),
    dur: 60,
    origin: 'visita',
    status: VISIT_TO_STATUS[v.status] || 'confirmado',
    client: v.client,
    service: v.problem,
    address: v.address,
    value: v.split ? v.split.provider : 0,
    valueNote: 'Taxa de visita (sua parte). O serviço você combina direto.',
    clientStars: v.clientStars,
    visitStatus: v.status,
  }));
  const fromRides = rides
    .filter((r) => !r.provider)
    .map((r) => ({
      id: `corrida-${r.id}`,
      rideId: r.id,
      start: r.acceptedAt || now,
      dur: 45,
      origin: 'corrida',
      status: r.done ? 'feito' : 'andamento',
      client: r.client,
      service: r.service,
      address: r.to ? `${r.from} → ${r.to}` : r.from,
      value: Number(r.price) || 0,
    }));
  return [...agenda, ...fromVisits, ...fromRides].sort((a, b) => a.start - b.start);
}

export const isBlock = (it) => it.origin === 'bloqueio';
export const endOf = (it) => it.start + it.dur * 60000;
const openStatus = (s) => s !== 'feito' && s !== 'cancelado';

// Próximos: ainda não terminaram (inclui o que está acontecendo agora).
export const upcoming = (items, now = Date.now()) => items.filter((it) => openStatus(it.status) && endOf(it) >= now);
// Feitos: concluídos e cancelados, do mais recente para o mais antigo.
export const history = (items) => items.filter((it) => !openStatus(it.status)).sort((a, b) => b.start - a.start);
// Pendentes: horário já passou e ninguém marcou como concluído.
export const overdue = (items, now = Date.now()) => items.filter((it) => !isBlock(it) && openStatus(it.status) && endOf(it) < now);

export const onDay = (items, day) => items.filter((it) => sameDay(it.start, day)).sort((a, b) => a.start - b.start);

// Próximo trabalho de verdade (sem contar bloqueio).
export const nextJob = (items, now = Date.now()) => upcoming(items, now).find((it) => !isBlock(it)) || null;

// Agrupa por dia: [{ day, items }]
export function groupByDay(items) {
  const map = new Map();
  items.forEach((it) => {
    const k = startOfDay(it.start);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  });
  return [...map.entries()].map(([day, list]) => ({ day, items: list }));
}

// Conflito: outro compromisso aberto no mesmo horário.
export function conflicts(items, start, dur, ignoreId) {
  const end = start + dur * 60000;
  return items.filter((it) => it.id !== ignoreId && openStatus(it.status) && it.start < end && endOf(it) > start);
}

// Horários livres do dia dentro do expediente: [{ from, to }] (timestamps). Pula o que já passou.
export function freeSlots(items, day, hours = DEFAULT_HOURS, now = Date.now(), minMin = 60) {
  const wh = hours[new Date(day).getDay()];
  if (!wh || !wh.on) return [];
  let cursor = Math.max(at(day, wh.from), sameDay(day, now) ? Math.ceil(now / 1800000) * 1800000 : 0);
  const end = at(day, wh.to);
  const busy = onDay(items, day).filter((it) => openStatus(it.status));
  const out = [];
  busy.forEach((it) => {
    if (it.start - cursor >= minMin * 60000 && cursor < end) out.push({ from: cursor, to: Math.min(it.start, end) });
    cursor = Math.max(cursor, endOf(it));
  });
  if (end - cursor >= minMin * 60000) out.push({ from: cursor, to: end });
  return out;
}

// Ocupação do expediente do dia (0 a 1), para o mapa de calor do calendário.
export function dayLoad(items, day, hours = DEFAULT_HOURS) {
  const wh = hours[new Date(day).getDay()];
  const total = wh && wh.on ? (wh.to - wh.from) * 60 : 8 * 60;
  const used = onDay(items, day)
    .filter((it) => it.status !== 'cancelado')
    .reduce((s, it) => s + Math.min(it.dur, total), 0);
  return Math.min(1, used / total);
}

// Números do topo e do histórico.
export function agendaStats(items, now = Date.now()) {
  const jobs = items.filter((it) => !isBlock(it));
  const today = onDay(jobs, now).filter((it) => it.status !== 'cancelado');
  const weekEnd = addDays(startOfDay(now), 7);
  const week = upcoming(jobs, now).filter((it) => it.start < weekEnd);
  const m = new Date(now);
  const monthStart = new Date(m.getFullYear(), m.getMonth(), 1).getTime();
  const doneMonth = jobs.filter((it) => it.status === 'feito' && it.start >= monthStart && it.start <= now);
  const done = jobs.filter((it) => it.status === 'feito');
  const rated = done.filter((it) => it.stars);
  const toReceive = week.reduce((s, it) => s + (Number(it.value) || 0), 0);
  return {
    today: today.length,
    week: week.length,
    toReceive,
    monthEarned: doneMonth.reduce((s, it) => s + (Number(it.value) || 0), 0),
    monthDone: doneMonth.length,
    totalDone: done.length,
    avgStars: rated.length ? rated.reduce((s, it) => s + it.stars, 0) / rated.length : null,
    ratedCount: rated.length,
  };
}

// Filtro do histórico: este mês, mês passado ou tudo.
export function historyFilter(items, period, now = Date.now()) {
  const d = new Date(now);
  const thisM = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const lastM = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  if (period === 'mes') return items.filter((it) => it.start >= thisM);
  if (period === 'passado') return items.filter((it) => it.start >= lastM && it.start < thisM);
  return items;
}

// Grade do mês (semanas começando no domingo): [[ts|null x7], ...]
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let dd = 1; dd <= days; dd++) cells.push(new Date(year, month, dd).getTime());
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Horários de início que dá para escolher no formulário (de 30 em 30 min, 6h às 22h).
export const TIME_OPTIONS = Array.from({ length: 33 }, (_, i) => ({ h: 6 + Math.floor(i / 2), m: (i % 2) * 30 }));
