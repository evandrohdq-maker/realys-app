// Pontos Realys: o cliente ganha pontos a cada avaliação e troca por créditos promocionais
// fechados em parceria com as empresas, restaurantes, fornecedores e prestadores do app.
//
// - Cada nota dada (loja, restaurante, motoboy, prestador): +10 pontos.
// - Com comentário de pelo menos 15 letras: +5 pontos a mais.
// - Os pontos são trocados no catálogo de parceiros por um crédito promocional daquele parceiro.
// - Crédito de loja ou restaurante é descontado sozinho na próxima compra lá. Crédito de serviço
//   vale no próximo serviço daquele tipo. Não vira dinheiro e não pode ser sacado.

export const POINTS_PER_RATING = 10;
export const POINTS_COMMENT_BONUS = 5;

export const pointsFor = (items) =>
  items.filter((it) => it.stars > 0).reduce((n, it) => n + POINTS_PER_RATING + ((it.text || '').trim().length >= 15 ? POINTS_COMMENT_BONUS : 0), 0);

// Catálogo de parceiros (demonstração). kind: loja = desconto na loja · servico = no tipo de serviço.
export const PARTNER_OFFERS = [
  { id: 'po1', kind: 'loja', partnerId: 'e2', partner: 'Pizzaria da Praça', icon: '🍕', title: 'R$ 10 na sua próxima pizza', value: 10, points: 100 },
  { id: 'po2', kind: 'loja', partnerId: 'e1', partner: 'Mercadinho Bom Preço', icon: '🛒', title: 'R$ 15 nas compras do mês', value: 15, points: 150 },
  { id: 'po3', kind: 'loja', partnerId: 'e8', partner: 'Doce Encanto Café', icon: '🧁', title: 'R$ 8 em doces e cafés', value: 8, points: 80 },
  { id: 'po4', kind: 'loja', partnerId: 'e5', partner: 'Burguer do Zé', icon: '🍔', title: 'R$ 12 no combo da casa', value: 12, points: 120 },
  { id: 'po5', kind: 'loja', partnerId: 'e4', partner: 'Tech Center', icon: '📱', title: 'R$ 30 em acessórios', value: 30, points: 300 },
  { id: 'po6', kind: 'servico', service: 'motorista', partner: 'Motoristas Realys', icon: '🚗', title: 'R$ 10 na próxima corrida', value: 10, points: 100 },
  { id: 'po7', kind: 'servico', service: 'eletricista', partner: 'Eletricistas parceiros', icon: '⚡', title: 'R$ 20 na próxima visita', value: 20, points: 200 },
  { id: 'po8', kind: 'loja', partnerId: 's1', partner: 'Fornecedores do Agro', icon: '🌱', title: 'R$ 25 em sementes e insumos', value: 25, points: 250, supplier: true },
];

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
  return { off: +off.toFixed(2), used };
}
