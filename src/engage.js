// Engajamento entre os lados do Re@lys (cliente, prestador, empresa, fornecedor).
// 1. Produto + serviço: comprou algo que precisa instalar → prestador verificado perto.
// 2. Score Re@lys: uma reputação só, que vale em todos os lados e libera benefícios.
// 3. Pedido ao contrário: a pessoa posta o que precisa e recebe propostas.
// 4. Compra coletiva: pequenos comerciantes juntam pedidos para ter preço de atacado.
// 5. Demanda escondida: o que procuraram perto e não acharam (para prestador e empresa).
// 6. Assinaturas: serviços e produtos que se repetem (diarista, gás, água, marmita).
// 7. Lotus avisa antes: lembretes do que está para acabar ou vencer.
// 8. Selo de origem: a cadeia fornecedor → empresa → cliente no produto.
// 9. Painel de inteligência: dados juntos e anônimos do bairro para empresas (plano pago).
// Tudo de demonstração. Na versão real, os números vêm do servidor.

const photo = (seed, w = 400, h = 260) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ───────────── 1. Produto + serviço ─────────────
export const INSTALL_RULES = [
  { service: 'eletricista', label: 'Instalação elétrica', words: ['chuveiro', 'ducha', 'tomada', 'disjuntor', 'luminaria', 'lustre', 'ventilador de teto', 'interruptor'] },
  { service: 'encanador', label: 'Instalação hidráulica', words: ['torneira', 'filtro de agua', 'purificador', 'caixa d', 'sifao', 'valvula', 'vaso sanitario'] },
  { service: 'arcond', label: 'Instalação de ar-condicionado', words: ['ar-condicionado', 'ar condicionado', 'split'] },
  { service: 'antenista', label: 'Instalar TV na parede', words: ['smart tv', 'tv 4k', 'tv 55', 'tv 50', 'tv 43', 'suporte de tv', 'antena'] },
  { service: 'eletrodom', label: 'Instalação do eletrodoméstico', words: ['lava-louca', 'lava louca', 'lavadora', 'maquina de lavar', 'cooktop', 'forno de embutir', 'coifa'] },
  { service: 'montador', label: 'Montagem do móvel', words: ['guarda-roupa', 'guarda roupa', 'armario', 'estante', 'rack', 'cama box', 'escrivaninha', 'comoda', 'painel para tv'] },
  { service: 'tecnico', label: 'Configuração e instalação', words: ['notebook', 'pc gamer', 'computador', 'impressora', 'roteador'] },
];
export function installFor(name) {
  const n = norm(name);
  return INSTALL_RULES.find((r) => r.words.some((w) => n.includes(norm(w)))) || null;
}

// ───────────── 2. Score Re@lys ─────────────
export const SCORE_TIERS = [
  { min: 850, key: 'diamante', label: 'Diamante', color: '#2F74D0', icon: 'diamond' },
  { min: 700, key: 'ouro', label: 'Ouro', color: '#A8790A', icon: 'medal' },
  { min: 500, key: 'prata', label: 'Prata', color: '#6E7891', icon: 'ribbon' },
  { min: 0, key: 'bronze', label: 'Bronze', color: '#B0703A', icon: 'shield-half' },
];
export const tierOf = (score) => SCORE_TIERS.find((t) => score >= t.min);
// O que cada nível libera, por perfil. Os benefícios de prazo/parcelar são pagos pelo vendedor
// ou pelo fornecedor que oferecer (o Re@lys só garante a reputação).
export const SCORE_BENEFITS = {
  usuario: { bronze: 'Compras à vista e Pix', prata: 'Parcelar em até 2x no saldo Re@lys', ouro: 'Parcelar em até 3x e "Pague depois" de 7 dias', diamante: 'Parcelar em até 6x e "Pague depois" de 15 dias' },
  prestador: { bronze: 'Aparece nas buscas normais', prata: 'Selo "Confiável" no perfil', ouro: 'Selo Ouro e +5% de posição nas indicações', diamante: 'Selo Diamante, +10% de posição e saque em 1 dia' },
  empresa: { bronze: 'Compras de fornecedor à vista', prata: 'Prazo de 15 dias com fornecedores', ouro: 'Prazo de 30 dias com fornecedores', diamante: 'Prazo de 45 dias e entrada nas compras coletivas sem sinal' },
  fornecedor: { bronze: 'Propostas normais', prata: 'Selo "Entrega garantida"', ouro: 'Propostas em destaque para empresas', diamante: 'Topo do catálogo atacado' },
};
// Score de 0 a 1000. Cada perfil pesa o que faz sentido para ele.
export function scoreOf(state, role) {
  const r = role || 'usuario';
  const orders = (state.orders || []).filter((o) => o.status === 'Entregue').length;
  const ratingsGiven = (state.ratings || []).length;
  const visits = state.visits || [];
  const visitsOk = visits.filter((v) => v.status === 'confirmada').length;
  const myVisitsDone = (state.myVisits || []).filter((v) => v.status === 'confirmada' || v.done).length;
  const base = 520;
  const factors = [
    { label: 'Identidade verificada por biometria', pts: 120, ok: true },
  ];
  if (r === 'usuario') {
    factors.push(
      { label: `Pedidos recebidos e confirmados (${orders})`, pts: Math.min(120, 40 + orders * 15), ok: true },
      { label: `Avaliações feitas (${ratingsGiven})`, pts: Math.min(60, 20 + ratingsGiven * 10), ok: true },
      { label: `Visitas confirmadas (${visitsOk})`, pts: Math.min(60, visitsOk * 20), ok: visitsOk > 0 },
      { label: 'Nenhum pagamento estornado', pts: 40, ok: true },
    );
  } else if (r === 'prestador') {
    factors.push(
      { label: `Serviços finalizados (${36 + myVisitsDone})`, pts: 110, ok: true },
      { label: 'Nota média 4,8', pts: 90, ok: true },
      { label: 'Responde em menos de 10 min', pts: 40, ok: true },
      { label: 'Faltou em 1 visita aceita', pts: -40, ok: false },
    );
  } else if (r === 'empresa') {
    factors.push(
      { label: 'Entregas no prazo (96%)', pts: 110, ok: true },
      { label: 'Pagou fornecedores em dia (12 de 12)', pts: 90, ok: true },
      { label: 'Nota da loja 4,7', pts: 60, ok: true },
      { label: '2 reclamações resolvidas', pts: -10, ok: false },
    );
  } else {
    factors.push(
      { label: 'Entregas para empresas no prazo (98%)', pts: 120, ok: true },
      { label: 'Propostas aceitas (61%)', pts: 60, ok: true },
      { label: 'Nota de fornecedor 4,8', pts: 60, ok: true },
    );
  }
  const score = Math.max(0, Math.min(1000, base + factors.reduce((n, f) => n + f.pts, 0) - 120));
  return { score, tier: tierOf(score), factors, benefit: SCORE_BENEFITS[r][tierOf(score).key], next: SCORE_TIERS.slice().reverse().find((t) => t.min > score) || null };
}

// ───────────── 3. Pedido ao contrário ─────────────
export const REVERSE_KINDS = {
  servico: { label: 'Serviço', icon: 'construct-outline', ask: 'Ex.: trocar 3 tomadas e instalar um chuveiro', who: 'prestadores' },
  produto: { label: 'Produto', icon: 'cube-outline', ask: 'Ex.: bolo de aniversário para 30 pessoas', who: 'lojas' },
  b2b: { label: 'Para a empresa', icon: 'business-outline', ask: 'Ex.: 200 kg de farinha de trigo por mês', who: 'fornecedores' },
};
// Pedidos de outras pessoas, para prestador e fornecedor responderem.
export const OPEN_REQUESTS = [
  { id: 'rq1', kind: 'servico', service: 'eletricista', who: 'Mariana', area: 'Vila Mariana · 1,4 km', text: 'Trocar 3 tomadas queimadas e instalar um chuveiro novo', deadline: 'Até amanhã', budget: 250, offers: 2 },
  { id: 'rq2', kind: 'servico', service: 'encanador', who: 'Roberto', area: 'Moema · 2,2 km', text: 'Vazamento embaixo da pia da cozinha', deadline: 'Hoje', budget: null, offers: 1 },
  { id: 'rq3', kind: 'servico', service: 'diarista', who: 'Cláudia', area: 'Saúde · 3,0 km', text: 'Faxina pós-obra em apartamento de 2 quartos', deadline: 'Sábado', budget: 300, offers: 4 },
  { id: 'rq4', kind: 'b2b', who: 'Padaria Pão Nosso', area: 'São Paulo - SP', text: '200 kg de farinha de trigo por mês, entrega semanal', deadline: 'Esta semana', budget: null, offers: 1 },
  { id: 'rq5', kind: 'b2b', who: 'Café Ponto Doce', area: 'Campinas - SP', text: '30 kg de café torrado em grãos, torra média', deadline: 'Até sexta', budget: 1100, offers: 0 },
];
// Propostas que chegam (demonstração) para o pedido que a pessoa postou.
export function sampleOffers(kind, text) {
  const t = norm(text);
  if (kind === 'b2b')
    return [
      { from: 'Distribuidora Real Alimentos', fromType: 'fornecedor', price: 980, eta: 'Entrega em 2 dias', note: 'Preço de atacado, frete grátis' },
      { from: 'Atacadão do Café', fromType: 'fornecedor', price: 1040, eta: 'Entrega em 3 dias', note: 'Pagamento em 30 dias para Score Ouro' },
    ];
  if (kind === 'produto')
    return [
      { from: 'Doce Encanto Café', fromType: 'empresa', price: 189, eta: 'Pronto em 2 dias', note: 'Inclui topo personalizado' },
      { from: 'Mercadinho Bom Preço', fromType: 'empresa', price: 165, eta: 'Retirada amanhã', note: 'Sem decoração' },
    ];
  const svc = t.includes('vaza') || t.includes('pia') || t.includes('cano') ? 'Encanador' : t.includes('faxina') || t.includes('limpeza') ? 'Diarista' : 'Eletricista';
  return [
    { from: 'Pedro Alves', fromType: 'prestador', price: 180, eta: 'Hoje às 15h', note: `${svc} · nota 4,9 · abate a visita no serviço` },
    { from: 'Ana Ribeiro', fromType: 'prestador', price: 220, eta: 'Amanhã cedo', note: `${svc} · nota 4,8 · garantia de 90 dias` },
    { from: 'Faz Tudo Rápido', fromType: 'prestador', price: 150, eta: 'Amanhã à tarde', note: `${svc} · nota 4,6` },
  ];
}

// ───────────── 4. Compra coletiva ─────────────
// Cada faixa: a partir de tantas unidades no total, o preço cai para todo mundo do grupo.
export const GROUP_BUYS = [
  { id: 'gb1', supplier: 'Distribuidora Real Alimentos', supplierId: 's1', item: 'Farinha de Trigo 1kg', emoji: '🌾', unit: 'pacote', price: 3.9, tiers: [{ qty: 300, price: 3.55 }, { qty: 600, price: 3.25 }], total: 410, members: 7, minEach: 20, closes: 'Sexta, 18h', area: 'Zona Sul - SP' },
  { id: 'gb2', supplier: 'Atacadão do Café', supplierId: 's2', item: 'Café Torrado 500g', emoji: '☕', unit: 'pacote', price: 12.2, tiers: [{ qty: 200, price: 11.3 }, { qty: 400, price: 10.6 }], total: 168, members: 5, minEach: 12, closes: 'Domingo, 20h', area: 'Campinas e região' },
  { id: 'gb3', supplier: 'Distribuidora Real Alimentos', supplierId: 's1', item: 'Óleo de Soja 900ml', emoji: '🫗', unit: 'garrafa', price: 6.8, tiers: [{ qty: 240, price: 6.3 }, { qty: 480, price: 5.9 }], total: 95, members: 3, minEach: 12, closes: 'Quarta, 12h', area: 'Zona Sul - SP' },
];
export function groupPrice(g, total) {
  let p = g.price;
  g.tiers.forEach((t) => {
    if (total >= t.qty) p = t.price;
  });
  return p;
}

// ───────────── 5. Demanda escondida ─────────────
// Buscas sem resposta perto (últimas 24 h), por profissão e por produto.
export const UNMET_SERVICES = [
  { service: 'encanador', label: 'Encanador', count: 32, area: 'até 3 km de você', peak: '7h às 10h' },
  { service: 'eletricista', label: 'Eletricista', count: 21, area: 'até 3 km de você', peak: '8h às 11h' },
  { service: 'diarista', label: 'Diarista', count: 18, area: 'até 5 km de você', peak: 'fim de semana' },
  { service: 'montador', label: 'Montador de móveis', count: 14, area: 'até 5 km de você', peak: 'sábado' },
  { service: 'arcond', label: 'Técnico de ar-condicionado', count: 11, area: 'até 8 km de você', peak: 'tarde' },
];
export const UNMET_PRODUCTS = [
  { term: 'Pão de fermentação natural', count: 41, trend: '+18%' },
  { term: 'Leite sem lactose', count: 27, trend: '+9%' },
  { term: 'Carvão para churrasco', count: 24, trend: '+31% (fim de semana)' },
  { term: 'Água mineral 20 L', count: 19, trend: '+6%' },
];

// ───────────── 6. Assinaturas ─────────────
export const SUB_PLANS = [
  { id: 'sp1', kind: 'servico', icon: '🧹', title: 'Diarista a cada 15 dias', who: 'Cláudia Faxinas · nota 4,9', price: 160, every: 15, off: 10 },
  { id: 'sp2', kind: 'produto', icon: '🔥', title: 'Gás de cozinha P13 todo mês', who: 'Gás Rápido Zona Sul', price: 112, every: 30, off: 8 },
  { id: 'sp3', kind: 'produto', icon: '💧', title: 'Água mineral 20 L toda semana', who: 'Água Pura Delivery', price: 18, every: 7, off: 10 },
  { id: 'sp4', kind: 'food', icon: '🍱', title: 'Marmita da semana (5 almoços)', who: 'Cozinha da Dona Rosa', price: 95, every: 7, off: 12 },
  { id: 'sp5', kind: 'produto', icon: '☕', title: 'Café do mês (1 kg)', who: 'Mercadinho Bom Preço', price: 46, every: 30, off: 10 },
  { id: 'sp6', kind: 'servico', icon: '🌿', title: 'Jardineiro todo mês', who: 'Verde Vivo Jardins', price: 140, every: 30, off: 10 },
  { id: 'sp7', kind: 'produto', icon: '🐶', title: 'Ração do pet (15 kg) todo mês', who: 'Pet Amigo', price: 189, every: 30, off: 8 },
];
export const subPrice = (p) => +(p.price * (1 - p.off / 100)).toFixed(2);
export const subPlan = (id) => SUB_PLANS.find((p) => p.id === id);

// ───────────── 7. Lotus avisa antes ─────────────
// Lembretes que a Lotus monta com o histórico da pessoa (demonstração).
export const LOTUS_NUDGES = [
  { id: 'n-gas', kind: 'produto', icon: '🔥', title: 'Seu gás deve acabar essa semana', text: 'O último botijão foi há 52 dias. Em média dura 55.', cta: 'Assinar o gás todo mês', go: { tab: 'pedidos', seg: 'assinaturas' }, plan: 'sp2' },
  { id: 'n-oleo', kind: 'servico', icon: '🚗', title: 'Faz 6 meses da troca de óleo', text: 'Mecânicos perto de você com horário hoje.', cta: 'Ver mecânicos', go: { tab: 'servicos', service: 'mecanico' } },
  { id: 'n-filtro', kind: 'servico', icon: '💧', title: 'O filtro de água vence em 10 dias', text: 'Troque o refil e peça a instalação junto.', cta: 'Chamar encanador', go: { tab: 'servicos', service: 'encanador' } },
  { id: 'n-ar', kind: 'servico', icon: '❄️', title: 'Limpeza do ar-condicionado', text: 'A última foi há 11 meses. O verão está chegando.', cta: 'Ver técnicos', go: { tab: 'servicos', service: 'arcond' } },
  { id: 'n-agua', kind: 'produto', icon: '🥤', title: 'Água de 20 L acabando?', text: 'Você pediu 3 vezes este mês. Assine e ganhe 10%.', cta: 'Assinar a água', go: { tab: 'pedidos', seg: 'assinaturas' }, plan: 'sp3' },
];

// ───────────── 8. Selo de origem ─────────────
// A cadeia de cada produto: de onde vem → quem fornece → quem vende.
export const ORIGINS = {
  p1: { from: '🌾 Lavoura em Itaqui - RS', supplierId: 's1' },
  p2: { from: '🫘 Produtor em Unaí - MG', supplierId: 's1' },
  p3: { from: '☕ Fazenda Boa Vista, Sul de Minas', supplierId: 's2', note: 'Torrado em Franca - SP' },
  p5: { from: '🌾 Moinho em Ponta Grossa - PR', supplierId: 's1' },
  p6: { from: '🧀 Muçarela de laticínio em Minas', supplierId: 's1', note: 'Farinha e queijo do fornecedor Re@lys' },
  p7: { from: '🍅 Tomates de Holambra - SP', supplierId: 's1' },
  p16: { from: '☕ Fazenda Boa Vista, Sul de Minas', supplierId: 's2', note: 'Torra média, lote da semana' },
  p23: { from: '☕ Fazenda Boa Vista, Sul de Minas', supplierId: 's2' },
};

// ───────────── 9. Painel de inteligência ─────────────
export const INTEL_PLAN = { name: 'Inteligência Re@lys', price: 39.9 };
export const INTEL = {
  area: 'Vila Mariana e região (3 km)',
  topSearches: [
    { term: 'Pizza', count: 1240, trend: '+12%' },
    { term: 'Café especial', count: 610, trend: '+22%' },
    { term: 'Pão de fermentação natural', count: 540, trend: '+18%' },
    { term: 'Açaí', count: 498, trend: '+4%' },
    { term: 'Hortifrúti orgânico', count: 377, trend: '+27%' },
    { term: 'Carvão e churrasco', count: 352, trend: '+31%' },
  ],
  hours: [
    { label: '8h', value: 42 }, { label: '11h', value: 88 }, { label: '13h', value: 64 }, { label: '17h', value: 71 }, { label: '19h', value: 120 }, { label: '21h', value: 96 },
  ],
  ticket: { area: 52.4, mine: 47.9 },
  audience: [
    { label: '25 a 34 anos', pct: 38 }, { label: '35 a 44 anos', pct: 27 }, { label: '18 a 24 anos', pct: 19 }, { label: '45+', pct: 16 },
  ],
  tips: [
    'Café especial cresceu 22% no bairro: vale um combo de café + pão de queijo de manhã.',
    'Pico às 19h: um boost de produto entre 18h e 20h rende mais.',
    'Seu ticket médio está R$ 4,50 abaixo da região: ofereça um item extra no carrinho.',
  ],
};

export const photoFor = photo;
