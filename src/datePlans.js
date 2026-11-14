// Assinatura do Date (Re@lys Date+). Preços abaixo dos concorrentes desde o começo.
// Quem assina: ganha charmes a mais todo dia e pode chamar e entrar em chamada de vídeo
// (a "live a dois" por convite) com quem já é crush e está online.
// Pago com saldo ou com pontos (1 ponto = R$ 0,01). Pontos de presente da plataforma também valem aqui,
// porque é compra dentro do app.

export const DATE_PLANS = [
  { id: 'semanal', title: 'Semanal', days: 7, price: 9.9, hint: 'Pra testar sem compromisso' },
  { id: 'mensal', title: 'Mensal', days: 30, price: 14.9, hint: 'O mais escolhido', best: true },
  { id: 'semestral', title: 'Semestral', days: 182, price: 59.9, hint: 'Sai por R$ 9,98 por mês' },
  { id: 'anual', title: 'Anual', days: 365, price: 89.9, hint: 'Sai por R$ 7,49 por mês' },
];

export const DATE_PLAN_PERKS = [
  'Chamada de vídeo com seus crushes online, sem toque nem bip',
  'Entrar em chamada pelo convite: "Entrar agora" ou "Recusar"',
  '+3 charmes todo dia',
  'Selo Date+ no seu perfil',
];

// Referência de mercado (Brasil, 2026, preço cheio por mês na loja). Usado na tela de planos e no painel.
export const DATE_COMPETITORS = [
  { name: 'Tinder Gold', semana: null, mes: 28.9 },
  { name: 'Tinder Platinum', semana: null, mes: 49.9 },
  { name: 'Happn Premium', semana: null, mes: 69.9, semestre: 199.9, ano: 299.9 },
  { name: 'Bumble Premium', semana: 42.9, mes: 84.9 },
];

export const datePlan = (id) => DATE_PLANS.find((p) => p.id === id) || null;
export const planPoints = (p) => Math.round(p.price * 100);
export const perMonth = (p) => +((p.price / p.days) * 30).toFixed(2);

// Assinatura valendo agora?
export function dateSub(state, now = Date.now()) {
  const s = state && state.encontros && state.encontros.sub;
  return s && s.until > now ? s : null;
}
export const isDateSubscriber = (state, now) => !!dateSub(state, now);

// Nova assinatura: se ainda tiver uma valendo, os dias somam no fim dela.
export function subscribeQuote(state, planId, pay, now = Date.now()) {
  const p = datePlan(planId);
  if (!p) return { ok: false, why: 'Plano não encontrado.' };
  const cost = pay === 'pontos' ? planPoints(p) : p.price;
  const has = pay === 'pontos' ? state.points || 0 : state.wallet || 0;
  if (has < cost) return { ok: false, why: pay === 'pontos' ? 'Pontos insuficientes.' : 'Saldo insuficiente.' };
  const cur = dateSub(state, now);
  const start = cur ? cur.until : now;
  return { ok: true, plan: p, cost, start, until: start + p.days * 86400000 };
}

// Status online (no app real vem do servidor; na demonstração, metade das pessoas está online).
export function isOnline(p, presence) {
  if (!p) return false;
  if (p.serverId && presence) return !!presence[p.serverId];
  if (typeof p.online === 'boolean') return p.online;
  return false;
}
