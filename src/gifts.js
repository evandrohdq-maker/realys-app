// Presentes em créditos Realys: de cliente para cliente, de cliente para prestador de serviço e
// de empresa para cliente.
//
// Como funciona:
// - Quem presenteia paga só o valor do presente. A taxa do Realys (10%) sai de dentro do presente:
//   num presente de R$ 500, quem dá paga R$ 500, quem recebe fica com R$ 450 e o Realys com R$ 50.
// - Quem recebe não precisa aceitar: é presente, entra na hora como "créditos de presente".
// - Créditos de presente NÃO podem ser sacados. Servem só para comprar produtos dentro do Realys
//   (lojas, Food, Shop, Tecnologia e Agro) e contratar serviços (taxa de visita). São usados primeiro, antes do saldo.
// - A taxa do Realys (10%) fica retida no Realys; o valor do presente já está no caixa, por isso pode virar compra.

export const GIFT_FEE_PCT = 10; // taxa do Realys sobre o valor do presente (fica retida no Realys)
export const GIFT_FEE_MIN = 0; // sempre 10%, sem valor mínimo
export const GIFT_MIN = 5;
export const GIFT_MAX = 2000;
export const GIFT_AMOUNTS = [10, 20, 50, 100];

// Quanto chega para quem recebe (valor menos a taxa).
export const giftNet = (amount) => +(amount - giftFee(amount)).toFixed(2);
export const giftFee = (amount) => (amount > 0 ? +Math.max(GIFT_FEE_MIN, (amount * GIFT_FEE_PCT) / 100).toFixed(2) : 0);

export const OCCASIONS = {
  pessoa: ['Aniversário', 'Obrigado', 'Parabéns', 'Só porque sim'],
  prestador: ['Obrigado pelo serviço', 'Caixinha', 'Trabalho caprichado', 'Boas festas'],
  empresa: ['Cliente fiel', 'Boas-vindas', 'Desculpe o atraso', 'Aniversário'],
  gorjeta: ['Gorjeta pela entrega', 'Entrega rápida', 'Comida quentinha', 'Obrigado'],
};

// Créditos de presente que o usuário da demonstração já recebeu.
const daysAgo = (d) => Date.now() - d * 86400000;
export const initialGifts = [
  { id: 'gf1', dir: 'recebido', from: { name: 'Mercadinho Bom Preço', kind: 'empresa', logo: '🛒' }, amount: 20, occasion: 'Cliente fiel', message: 'Obrigado por comprar com a gente todo mês! 💛', at: daysAgo(3) },
  { id: 'gf2', dir: 'recebido', from: { name: 'Ana Paula', kind: 'pessoa', id: 'u1' }, amount: 15, occasion: 'Obrigado', message: 'Valeu pela indicação do eletricista!', at: daysAgo(6) },
];
export const initialGiftCredits = 35;

// ── Presentes nas lives ────────────────────────────────────────────────────────────────────
// Quem assiste envia presentes animados para quem está transmitindo (usuário, artista, empresa,
// prestador, fornecedor). Paga com o saldo da carteira: valor do presente + a mesma taxa do Realys.
// Quem transmite junta "créditos de live" e pode convertê-los em moeda Realys (RLS) na carteira,
// 1 crédito = 1 RLS. Depois de convertido, vira saldo normal: compra, presenteia e segue as regras
// de saque da carteira.
export const LIVE_GIFTS = [
  { key: 'rosa', emoji: '🌹', name: 'Rosa', value: 1 },
  { key: 'coracao', emoji: '💛', name: 'Coração', value: 2 },
  { key: 'aplauso', emoji: '👏', name: 'Aplausos', value: 5 },
  { key: 'estrela', emoji: '🌟', name: 'Estrela', value: 10 },
  { key: 'coroa', emoji: '👑', name: 'Coroa', value: 50 },
  { key: 'foguete', emoji: '🚀', name: 'Foguete', value: 100 },
  { key: 'diamante', emoji: '💎', name: 'Diamante', value: 300 },
  // A Flor de Lótus é a própria flor dourada da Lotus (imagem). O emoji 🌸 só aparece em textos.
  { key: 'lotus', emoji: '🌸', image: 'lotus', name: 'Flor de Lótus', value: 500 },
];
export const LIVE_GIFT_QTY = [1, 5, 10];
export const LIVE_CONVERT_MIN = 10; // mínimo de créditos de live para converter em moeda Realys

// Saque do que a pessoa RECEBEU de presente (créditos de presente + créditos de live).
// Cada R$ 1 recebido = 100 pontos de saque. Libera a partir de 50.000 pontos (R$ 500) e o Realys fica
// com 10% do saque. Pontos que a PLATAFORMA dá (avaliar, assistir, comprar, mandar presente) nunca
// viram saque: só servem dentro do Realys.
export const CASHOUT_POINTS_PER_REAL = 100;
export const CASHOUT_MIN_POINTS = 50000;
export const CASHOUT_FEE_PCT = 10;
export const receivedPool = (state) => +((state.giftCredits || 0) + (state.liveCredits || 0)).toFixed(2);
export const cashoutPoints = (state) => Math.floor(receivedPool(state) * CASHOUT_POINTS_PER_REAL);
export const cashoutQuote = (state) => {
  const gross = receivedPool(state);
  const fee = +((gross * CASHOUT_FEE_PCT) / 100).toFixed(2);
  return { points: cashoutPoints(state), gross, fee, net: +(gross - fee).toFixed(2), ok: cashoutPoints(state) >= CASHOUT_MIN_POINTS };
};
export const liveGiftOf = (key) => LIVE_GIFTS.find((g) => g.key === key) || LIVE_GIFTS[0];
export const liveGiftCost = (gift, qty = 1) => {
  const value = +(gift.value * qty).toFixed(2);
  const fee = giftFee(value);
  // total = o que sai de quem envia (só o valor); net = o que chega para quem recebe.
  return { value, fee, total: value, net: +(value - fee).toFixed(2) };
};

// Créditos de live que o usuário da demonstração já ganhou em lives anteriores.
export const initialLiveCredits = 64;
export const initialLiveGifts = [
  { id: 'lg1', from: 'Diego Santos', gift: 'coroa', qty: 1, value: 50, live: 'Bate-papo com a comunidade', at: daysAgo(2) },
  { id: 'lg2', from: 'Lívia Moraes', gift: 'aplauso', qty: 2, value: 10, live: 'Bate-papo com a comunidade', at: daysAgo(2) },
  { id: 'lg3', from: 'Paula Reis', gift: 'coracao', qty: 2, value: 4, live: 'Bate-papo com a comunidade', at: daysAgo(2) },
];
