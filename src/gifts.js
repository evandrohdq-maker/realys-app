// Presentes em créditos Realys: de cliente para cliente, de cliente para prestador de serviço e
// de empresa para cliente.
//
// Como funciona:
// - Quem presenteia paga com o saldo da carteira: o valor do presente + a taxa do Realys.
// - Quem recebe não precisa aceitar: é presente, entra na hora como "créditos de presente".
// - Créditos de presente NÃO podem ser sacados. Servem só para comprar produtos dentro do Realys
//   (lojas, Food, Shop, Tecnologia e Agro). Na compra eles são usados primeiro, antes do saldo.

export const GIFT_FEE_PCT = 5; // taxa do Realys sobre o valor do presente
export const GIFT_FEE_MIN = 0.5;
export const GIFT_MIN = 5;
export const GIFT_MAX = 2000;
export const GIFT_AMOUNTS = [10, 20, 50, 100];

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
