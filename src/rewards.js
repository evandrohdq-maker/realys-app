// Pontos Realys: o cliente ganha pontos a cada avaliação e troca por créditos promocionais
// fechados em parceria com as empresas, restaurantes, fornecedores e prestadores do app.
//
// - Cada nota dada (loja, restaurante, motoboy, prestador): +10 pontos.
// - Com comentário de pelo menos 15 letras: +5 pontos a mais.
// - Também ganha assistindo lives e clipes (com limite por dia) e comprando.
// - Os pontos são trocados só por serviços do Realys: boosts e anúncios (POINT_SHOP abaixo).

export const POINTS_PER_RATING = 10;
export const POINTS_COMMENT_BONUS = 5;

// Quem manda presentes ganha pontos a cada presente: 1 ponto por real enviado (mínimo 1)
// e, a cada GIFT_STREAK_EVERY presentes enviados, um bônus de repetição.
// Os pontos só valem em serviços do Realys (boosts e anúncios), então não saem do caixa.
export const GIFT_POINTS_PER_REAL = 1;
export const GIFT_STREAK_EVERY = 10;
export const GIFT_STREAK_BONUS = 50;
export function giftPoints(amount, sentBefore) {
  const base = Math.max(1, Math.floor(amount * GIFT_POINTS_PER_REAL));
  const bonus = (sentBefore + 1) % GIFT_STREAK_EVERY === 0 ? GIFT_STREAK_BONUS : 0;
  return { base, bonus, total: base + bonus };
}

export const pointsFor = (items) =>
  items.filter((it) => it.stars > 0).reduce((n, it) => n + POINTS_PER_RATING + ((it.text || '').trim().length >= 15 ? POINTS_COMMENT_BONUS : 0), 0);

// Pontos Realys valem SÓ em serviços da própria plataforma (boosts e anúncios), para não sair
// dinheiro do caixa: não viram saldo, não sacam, não transferem e não pagam produtos, serviços
// de terceiros, taxas ou presentes. Quem quiser, paga o mesmo boost em dinheiro (R$, do saldo).
// O boost pago tem prioridade; o boost com pontos entra no espaço que sobra (não tira venda).
export const POINT_RULES = {
  watchDailyCap: 100, // máximo de pontos por dia assistindo lives e clipes (anti-farm)
  validityMonths: 12, // pontos vencem 12 meses depois de ganhos
};

// target: onde o boost age. hours: quanto tempo dura (anúncio passa por análise antes de ir ao ar).
export const POINT_SHOP = [
  { id: 'bp1', target: 'prestador', icon: '⚡', title: 'Boost de prestador 1 h', desc: 'Seu perfil no topo das indicações da sua região', hours: 1, points: 300, money: 4.9 },
  { id: 'bp2', target: 'prestador', icon: '🌅', title: 'Boost de prestador 4 h', desc: 'A manhã inteira no topo para pegar mais trabalho', hours: 4, points: 900, money: 14.9 },
  { id: 'bd1', target: 'date', icon: '💘', title: 'Boost no Date 30 min', desc: 'Seu perfil aparece primeiro para quem está perto', hours: 0.5, points: 250, money: 3.9 },
  { id: 'bd2', target: 'date', icon: '✨', title: '+3 charmes hoje', desc: 'A pessoa vê que você curtiu antes de decidir', hours: 0, points: 150, money: 2.9 },
  { id: 'bv1', target: 'produto', icon: '🛍️', title: 'Boost de produto 24 h', desc: 'Seu produto em destaque no Shop e nas buscas', hours: 24, points: 600, money: 9.9 },
  { id: 'bv2', target: 'produto', icon: '🚀', title: 'Boost de produto 7 dias', desc: 'Destaque contínuo na vitrine da categoria', hours: 168, points: 3000, money: 49.9 },
  { id: 'bc1', target: 'post', icon: '📣', title: 'Boost de publicação 24 h', desc: 'Sua publicação aparece para mais gente na Community', hours: 24, points: 200, money: 2.9 },
  { id: 'bl1', target: 'live', icon: '🔴', title: 'Boost de live 30 min', desc: 'Sua live no "Em destaque" da classe', hours: 0.5, points: 300, money: 4.9 },
  { id: 'ba1', target: 'anuncio', icon: '📺', title: 'Anúncio de 30 s · horário padrão', desc: 'Entre os clipes do Shop e do Food, horário comercial', hours: 24, points: 1000, money: 19.9 },
  { id: 'ba2', target: 'anuncio', icon: '🌟', title: 'Anúncio de 30 s · horário nobre', desc: 'Das 18h às 22h, quando mais gente está no app', hours: 24, points: 2500, money: 49.9 },
];
export const BOOST_TARGETS = {
  prestador: 'Prestador de serviço',
  date: 'Date',
  produto: 'Empresas e produtos',
  post: 'Community',
  live: 'Lives',
  anuncio: 'Anúncios',
};
export const pointOffer = (id) => POINT_SHOP.find((o) => o.id === id);
// Boost ainda valendo para este alvo (o mais longo).
export const activeBoost = (state, target) =>
  (state.boosts || []).filter((b) => b.target === target && b.until && b.until > Date.now()).sort((a, b) => b.until - a.until)[0] || null;
// Pontos ganhos hoje assistindo (lives e clipes), para o limite diário.
export const watchedToday = (log) => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return (log || []).filter((l) => l.at >= start && l.points > 0 && (l.desc || '').startsWith('Assistiu')).reduce((n, l) => n + l.points, 0);
};

export const initialPoints = 60; // pontos de avaliações anteriores (demonstração)

// Quanto dos créditos promocionais vale no carrinho agora: { off, used: { [creditId]: valor } }.
export function promoDiscount(state, lines) {
  const used = {};
  let off = 0;
  const left = {};
  lines.forEach((l) => (left[l.product.storeId] = (left[l.product.storeId] || 0) + l.product.price * l.qty));
  (state.promoCredits || [])
    .filter((pc) => pc.kind === 'loja' && !pc.used)
    .forEach((pc) => {
      const v = Math.min(pc.value, left[pc.partnerId] || 0);
      if (v > 0) {
        used[pc.id] = v;
        left[pc.partnerId] -= v;
        off += v;
      }
    });
  // Cupom do Clube Realys (vale em qualquer parceiro): um por pedido, depois dos créditos de loja.
  const rest = Object.values(left).reduce((a, b) => a + b, 0);
  const cupom = (state.promoCredits || []).find((pc) => pc.kind === 'cupom' && !pc.used);
  if (cupom && rest >= (cupom.minOrder || 0)) {
    const v = +Math.min(cupom.cap, (rest * cupom.pct) / 100).toFixed(2);
    if (v > 0) {
      used[cupom.id] = v;
      off += v;
    }
  }
  return { off: +off.toFixed(2), used };
}
