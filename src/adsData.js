// Publicidade paga e promoções do Shop e do Food (demonstração).
//
// Formatos de anúncio pago, do mais caro ao mais barato:
// - Vitrine (spotlight): banner grande no topo, passa sozinho. Mede visualizações e toques.
// - Clipes: vídeo curto do produto. Quem assiste até o fim ganha pontos Realys
//   (é o que faz o cliente QUERER ver o anúncio, em vez de pular).
// - Produto patrocinado: entra no meio da grade "Destaques para você" com o selo.
//
// Promoções ficam num setor separado (aba Promoções dentro do Shop e do Food):
// ofertas relâmpago com contagem regressiva, cupons para pegar e combos "leve mais, pague menos".
const photo = (seed, w = 800, h = 450) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Pontos por assistir um clipe até o fim (uma vez por clipe).
export const CLIP_POINTS = 2;
// Quanto dura o clipe na demonstração (ms).
export const CLIP_MS = 7000;

// ---------- SHOP ----------
export const SHOP_SPOTLIGHT = [
  { id: 'ad-s1', storeId: 'e4', productId: 'p13', title: 'Smartwatch Fit 2', sub: 'Pré-venda com frete grátis só no Realys', cta: 'Garantir o meu', tint: '#2F74D0', photo: photo('realys-ad-watch') },
  { id: 'ad-s2', storeId: 'e3', productId: 'p14', title: 'Coleção Verão Moda Brasil', sub: 'Jaquetas e camisetas a partir de R$ 69,90', cta: 'Ver coleção', tint: '#C2255C', photo: photo('realys-ad-moda') },
  { id: 'ad-s3', storeId: 'e4', productId: 'p11', title: 'Carregador Turbo 30W', sub: 'Do zero a 50% em 20 minutos · Tech Center', cta: 'Comprar agora', tint: '#1F2A44', photo: photo('realys-ad-carregador') },
];

export const SHOP_CLIPS = [
  { id: 'clip-s1', storeId: 'e4', productId: 'p10', title: 'Fone Pro: 30 h de bateria', views: 12400, likes: 1830, photo: photo('realys-clip-fone', 400, 640) },
  { id: 'clip-s2', storeId: 'e3', productId: 'p9', title: 'Tênis casual: conforto o dia todo', views: 8700, likes: 960, photo: photo('realys-clip-tenis', 400, 640) },
  { id: 'clip-s3', storeId: 'e3', productId: 'p14', title: 'Jaqueta jeans: 3 jeitos de usar', views: 5300, likes: 712, photo: photo('realys-clip-jaqueta', 400, 640) },
  { id: 'clip-s4', storeId: 'e4', productId: 'p11', title: 'Carrega 50% em 20 min', views: 4100, likes: 388, photo: photo('realys-clip-carregador', 400, 640) },
];

// Produtos patrocinados que entram na grade de destaques.
export const SHOP_SPONSORED_PRODUCTS = ['p13', 'p9', 'p11'];

// Ofertas relâmpago: `hours` = janela da oferta (termina no próximo múltiplo dessas horas).
// `sold` = quanto do lote promocional já foi vendido (0 a 1).
export const SHOP_FLASH = [
  { id: 'fl-s1', productId: 'p10', off: 30, hours: 2, sold: 0.72, limit: 'Máx. 2 por pessoa' },
  { id: 'fl-s2', productId: 'p8', off: 40, hours: 2, sold: 0.55 },
  { id: 'fl-s3', productId: 'p9', off: 25, hours: 6, sold: 0.38 },
  { id: 'fl-s4', productId: 'p14', off: 20, hours: 6, sold: 0.81, limit: 'Últimas unidades' },
  { id: 'fl-s5', productId: 'p11', off: 35, hours: 24, sold: 0.2 },
  { id: 'fl-s6', productId: 'p13', off: 10, hours: 24, sold: 0.64, limit: 'Pré-venda' },
];

// Cupons: viram crédito promocional da loja e descontam sozinhos no carrinho.
export const SHOP_COUPONS = [
  { id: 'cp-s1', storeId: 'e4', value: 20, title: 'R$ 20 em eletrônicos', rule: 'Compras na Tech Center', sponsored: true },
  { id: 'cp-s2', storeId: 'e3', value: 15, title: 'R$ 15 em moda', rule: 'Compras na Moda Brasil' },
];

// Leve mais, pague menos. off: 'cheapest' (o mais barato sai de graça), 'halfCheapest'
// (o mais barato pela metade) ou um número = % de desconto no kit.
export const SHOP_COMBOS = [
  { id: 'cb-s2', storeId: 'e4', title: 'Kit celular turbinado', items: ['p10', 'p11'], deal: '-15% no kit', off: 15 },
  { id: 'cb-s3', storeId: 'e3', title: 'Look completo', items: ['p8', 'p9', 'p14'], deal: '-10% no look', off: 10 },
];

// ---------- FOOD ----------
export const FOOD_SPOTLIGHT = [
  { id: 'ad-f1', storeId: 'e2', productId: 'p15', title: 'Pizza de Costela com Catupiry', sub: 'Sabor novo da Pizzaria da Praça · chega em 30 min', cta: 'Pedir agora', tint: '#E8590C', photo: photo('realys-ad-pizza') },
  { id: 'ad-f2', storeId: 'e6', productId: 'p18', title: 'Happy hour no Boteco do Alemão', sub: 'Balde de long neck + porção, hoje das 17h às 20h', cta: 'Ver cardápio', tint: '#B7791F', photo: photo('realys-ad-boteco') },
  { id: 'ad-f3', storeId: 'e7', productId: 'p21', title: 'Temaki novo no Sushi Kento', sub: 'Salmão completo, recheado até a ponta', cta: 'Experimentar', tint: '#C92A2A', photo: photo('realys-ad-sushi') },
];

export const FOOD_CLIPS = [
  { id: 'clip-f1', storeId: 'e2', productId: 'p6', title: 'Saindo do forno a lenha 🔥', views: 21500, likes: 3400, photo: photo('realys-clip-pizza', 400, 640) },
  { id: 'clip-f2', storeId: 'e5', productId: 'p12', title: 'O X-Burguer mais suculento', views: 15800, likes: 2210, photo: photo('realys-clip-burger', 400, 640) },
  { id: 'clip-f3', storeId: 'e8', productId: 'p22', title: 'Bolo de pote montado na hora', views: 9900, likes: 1650, photo: photo('realys-clip-bolo', 400, 640) },
  { id: 'clip-f4', storeId: 'e7', productId: 'p20', title: 'Combinado de 30 peças', views: 7600, likes: 1020, photo: photo('realys-clip-sushi', 400, 640) },
];

export const FOOD_FLASH = [
  { id: 'fl-f1', productId: 'p12', off: 40, hours: 1, sold: 0.66, limit: 'Só no almoço' },
  { id: 'fl-f2', productId: 'p6', off: 30, hours: 2, sold: 0.48 },
  { id: 'fl-f3', productId: 'p20', off: 25, hours: 3, sold: 0.59 },
  { id: 'fl-f4', productId: 'p18', off: 35, hours: 3, sold: 0.77, limit: 'Happy hour' },
  { id: 'fl-f5', productId: 'p23', off: 20, hours: 6, sold: 0.31 },
  { id: 'fl-f6', productId: 'p19', off: 15, hours: 6, sold: 0.22 },
];

export const FOOD_COUPONS = [
  { id: 'cp-f1', storeId: 'e2', value: 12, title: 'R$ 12 na pizza', rule: 'Pedidos na Pizzaria da Praça', sponsored: true },
  { id: 'cp-f2', storeId: 'e5', value: 10, title: 'R$ 10 no lanche', rule: 'Pedidos no Burguer do Zé' },
  { id: 'cp-f3', storeId: 'e7', value: 15, title: 'R$ 15 no japonês', rule: 'Pedidos no Sushi Kento' },
  { id: 'cp-f4', storeId: 'e6', value: 10, title: 'R$ 10 no boteco', rule: 'Pedidos no Boteco do Alemão' },
];

export const FOOD_COMBOS = [
  { id: 'cb-f1', storeId: 'e2', title: 'Noite da pizza', items: ['p6', 'p7'], deal: '2ª pizza com 50%', off: 'halfCheapest' },
  { id: 'cb-f2', storeId: 'e6', title: 'Mesa do boteco', items: ['p17', 'p18', 'p19'], deal: '-20% na mesa', off: 20 },
  { id: 'cb-f3', storeId: 'e8', title: 'Café da tarde a dois', items: ['p22', 'p23'], deal: '-15% no combo', off: 15 },
];

// Quanto o combo desconta (vira crédito promocional da loja, que sai sozinho no carrinho).
export function comboOff(combo, prices) {
  if (!prices.length) return 0;
  const cheapest = Math.min(...prices);
  const sum = prices.reduce((s, v) => s + v, 0);
  const v = combo.off === 'cheapest' ? cheapest : combo.off === 'halfCheapest' ? cheapest / 2 : (sum * combo.off) / 100;
  return +v.toFixed(2);
}

// ---------- MERCADO (aba do Food) ----------
// Mercado é comida: fica no Food, nunca no Shop.
export const MERCADO_SPOTLIGHT = [
  { id: 'ad-m1', storeId: 'e1', productId: 'p16', title: 'Café Especial do Sul de Minas', sub: 'Lote limitado no Mercadinho Bom Preço', cta: 'Comprar agora', tint: '#7A5806', photo: photo('realys-ad-cafe') },
  { id: 'ad-m2', storeId: 'e1', productId: 'p1', title: 'Compra do mês sem sair de casa', sub: 'Arroz, feijão, leite e mais · entrega no mesmo dia', cta: 'Montar carrinho', tint: '#2E8B57', photo: photo('realys-ad-mercado') },
];
export const MERCADO_CLIPS = [
  { id: 'clip-m1', storeId: 'e1', productId: 'p3', title: 'Do grão à xícara em 1 minuto', views: 5300, likes: 712, photo: photo('realys-clip-cafe', 400, 640) },
  { id: 'clip-m2', storeId: 'e1', productId: 'p4', title: 'Leite fresquinho chegou hoje', views: 2900, likes: 301, photo: photo('realys-clip-leite', 400, 640) },
];
export const MERCADO_FLASH = [
  { id: 'fl-m1', productId: 'p3', off: 20, hours: 6, sold: 0.81, limit: 'Últimas unidades' },
  { id: 'fl-m2', productId: 'p1', off: 15, hours: 24, sold: 0.64 },
  { id: 'fl-m3', productId: 'p4', off: 10, hours: 24, sold: 0.4, limit: 'Máx. 12 por pessoa' },
];
export const MERCADO_COUPONS = [
  { id: 'cp-m1', storeId: 'e1', value: 8, title: 'R$ 8 no mercado', rule: 'Compras no Mercadinho Bom Preço', sponsored: true },
];
export const MERCADO_COMBOS = [
  { id: 'cb-m1', storeId: 'e1', title: 'Cesta da semana', items: ['p1', 'p2', 'p4', 'p5'], deal: 'Leve 4, pague 3', off: 'cheapest' },
];
// Corredores do mercado (palavras no nome do produto).
export const MERCADO_AISLES = [
  { key: 'todos', label: 'Tudo', ion: 'basket-outline', color: '#2E8B57' },
  { key: 'mercearia', label: 'Mercearia', ion: 'cube-outline', color: '#B7791F', words: ['arroz', 'feijão', 'farinha', 'açúcar', 'óleo', 'macarrão'] },
  { key: 'cafe', label: 'Café', ion: 'cafe-outline', color: '#7A5806', words: ['café'] },
  { key: 'laticinios', label: 'Laticínios', ion: 'water-outline', color: '#2F74D0', words: ['leite', 'queijo', 'iogurte', 'manteiga'] },
];

// Todos os anúncios pagos, para o Painel da empresa mostrar o desempenho de cada um.
export const ALL_ADS = [
  ...SHOP_SPOTLIGHT.map((a) => ({ ...a, format: 'Vitrine do Shop' })),
  ...FOOD_SPOTLIGHT.map((a) => ({ ...a, format: 'Vitrine do Food' })),
  ...MERCADO_SPOTLIGHT.map((a) => ({ ...a, format: 'Vitrine do Mercado (Food)' })),
  ...MERCADO_CLIPS.map((a) => ({ ...a, format: 'Clipe do Mercado (Food)' })),
  ...SHOP_CLIPS.map((a) => ({ ...a, format: 'Clipe do Shop' })),
  ...FOOD_CLIPS.map((a) => ({ ...a, format: 'Clipe do Food' })),
];

// Fim da janela da oferta: próximo múltiplo de `hours` horas no dia (ex.: 2 h → 10h, 12h, 14h...).
export function flashEndsAt(hours, now = Date.now()) {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const span = hours * 3600000;
  return start + Math.ceil((now - start + 1) / span) * span;
}

export const countdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export const shortNum = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' mil' : String(n));
