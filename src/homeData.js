// Dados de demonstração das abas do Início (Shop, Promoções, Anúncios, Comunidade, Lives).
// Tudo fictício, para apresentação.
const photo = (seed, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Promoções: desconto sobre o preço "de"; o preço final é o preço atual do produto.
export const promos = [
  { productId: 'p6', off: 20, until: 'hoje até 23h' },
  { productId: 'p12', off: 15, until: 'só hoje' },
  { productId: 'p9', off: 25, until: 'até domingo' },
  { productId: 'p10', off: 18, until: 'até sexta' },
  { productId: 'p3', off: 10, until: 'esta semana' },
  { productId: 'p8', off: 30, until: 'enquanto durar o estoque' },
];

// Anúncios classificados: imóveis (venda e locação) e aluguel de veículos e máquinas.
export const LISTING_KINDS = [
  { key: 'todos', label: 'Todos', icon: 'apps-outline' },
  { key: 'imovel-venda', label: 'Imóveis à venda', icon: 'home-outline' },
  { key: 'imovel-aluguel', label: 'Imóveis para alugar', icon: 'key-outline' },
  { key: 'carro-aluguel', label: 'Aluguel de carros', icon: 'car-sport-outline' },
  { key: 'maquina-aluguel', label: 'Aluguel de máquinas', icon: 'construct-outline' },
];

export const listings = [
  { id: 'l1', kind: 'imovel-venda', title: 'Apartamento 2 quartos com varanda', detail: '68 m² · 1 vaga · condomínio com lazer', price: 'R$ 420.000', place: 'Vila Mariana, São Paulo - SP', who: 'Imobiliária Horizonte', sponsored: true, photo: photo('realys-ap1') },
  { id: 'l2', kind: 'imovel-venda', title: 'Casa térrea 3 quartos', detail: '150 m² · quintal · 2 vagas', price: 'R$ 690.000', place: 'Campinas - SP', who: 'Roberto A. (proprietário)', sponsored: false, photo: photo('realys-casa1') },
  { id: 'l3', kind: 'imovel-venda', title: 'Sala comercial no centro', detail: '42 m² · banheiro · ótima para escritório', price: 'R$ 260.000', place: 'Centro, Curitiba - PR', who: 'Imobiliária Horizonte', sponsored: false, photo: photo('realys-sala1') },
  { id: 'l4', kind: 'imovel-aluguel', title: 'Kitnet mobiliada perto do metrô', detail: '30 m² · contas inclusas', price: 'R$ 1.650/mês', place: 'Bela Vista, São Paulo - SP', who: 'Aluga Fácil Imóveis', sponsored: true, photo: photo('realys-kit1') },
  { id: 'l5', kind: 'imovel-aluguel', title: 'Casa 2 quartos com garagem', detail: '90 m² · aceita pet', price: 'R$ 2.300/mês', place: 'Santo André - SP', who: 'Marta L. (proprietária)', sponsored: false, photo: photo('realys-casa2') },
  { id: 'l6', kind: 'imovel-aluguel', title: 'Galpão logístico', detail: '800 m² · doca e pé-direito alto', price: 'R$ 18.000/mês', place: 'Guarulhos - SP', who: 'Aluga Fácil Imóveis', sponsored: false, photo: photo('realys-galpao') },
  { id: 'l7', kind: 'carro-aluguel', title: 'Hatch econômico automático', detail: 'Ar, direção, seguro incluso', price: 'R$ 119/dia', place: 'Retirada em São Paulo - SP', who: 'Locadora Rota Certa', sponsored: true, photo: photo('realys-carro1') },
  { id: 'l8', kind: 'carro-aluguel', title: 'SUV 7 lugares', detail: 'Ideal para viagem em família', price: 'R$ 289/dia', place: 'Retirada em Belo Horizonte - MG', who: 'Locadora Rota Certa', sponsored: false, photo: photo('realys-suv1') },
  { id: 'l9', kind: 'carro-aluguel', title: 'Van 15 lugares com motorista', detail: 'Eventos e excursões', price: 'R$ 950/dia', place: 'Rio de Janeiro - RJ', who: 'Trans Vip Turismo', sponsored: false, photo: photo('realys-van1') },
  { id: 'l10', kind: 'maquina-aluguel', title: 'Retroescavadeira com operador', detail: 'Terraplanagem e valas', price: 'R$ 1.400/dia', place: 'Região de Campinas - SP', who: 'Máquinas Forte', sponsored: true, photo: photo('realys-retro') },
  { id: 'l11', kind: 'maquina-aluguel', title: 'Betoneira 400 litros', detail: 'Entrega e retirada na obra', price: 'R$ 90/dia', place: 'São Paulo - SP', who: 'Aluga Obra', sponsored: false, photo: photo('realys-betoneira') },
  { id: 'l12', kind: 'maquina-aluguel', title: 'Andaimes (kit 10 peças)', detail: 'Montagem orientada', price: 'R$ 320/semana', place: 'Osasco - SP', who: 'Aluga Obra', sponsored: false, photo: photo('realys-andaime') },
];

// Comunidade: posts de clientes (pessoas reais, verificadas).
export const communityPosts = [
  { id: 'c1', author: 'Ana Paula', text: 'Alguém indica um bom eletricista na zona sul? Contratei o Pedro pelo Realys e foi rápido demais! ⚡', image: null, likes: 48, comments: 12, time: 'há 12 min' },
  { id: 'c2', author: 'Diego Santos', text: 'Primeira compra no Mercadinho Bom Preço pelo app. Chegou em 30 minutos 👏', image: photo('realys-com-mercado', 800, 600), likes: 131, comments: 24, time: 'há 40 min' },
  { id: 'c3', author: 'Lívia Martins', text: 'Procurando apartamento para alugar perto do metrô. Vi uns ótimos em Anúncios!', image: null, likes: 22, comments: 9, time: 'há 1 h' },
  { id: 'c4', author: 'Rogério Teixeira', text: 'Domingo de pizza com a família 🍕 Valeu, Pizzaria da Praça!', image: photo('realys-com-pizza', 800, 600), likes: 210, comments: 31, time: 'há 3 h' },
];

export const contacts = [
  { id: 'u1', name: 'Ana Paula', status: 'online', photo: photo('realys-u-ana', 200, 200) },
  { id: 'u2', name: 'Diego Santos', status: 'online', photo: photo('realys-u-diego', 200, 200) },
  { id: 'u3', name: 'Lívia Martins', status: 'visto há 20 min', photo: photo('realys-u-livia', 200, 200) },
  { id: 'u4', name: 'Rogério Teixeira', status: 'visto ontem', photo: photo('realys-u-rogerio', 200, 200) },
  { id: 'u5', name: 'Pizzaria da Praça', status: 'empresa verificada', photo: photo('realys-u-pizza', 200, 200), business: true },
];

export const conversations = [
  {
    id: 'm1', contactId: 'u1', unread: 2,
    messages: [
      { from: 'them', text: 'Oi! Viu a promoção da pizza hoje?', time: '18:02' },
      { from: 'me', text: 'Vi sim! Vou pedir mais tarde 😄', time: '18:05' },
      { from: 'them', text: 'Pede a calabresa, é a melhor', time: '18:06' },
      { from: 'them', text: 'Vamos fazer uma chamada de vídeo depois?', time: '18:07' },
    ],
  },
  {
    id: 'm2', contactId: 'u5', unread: 0,
    messages: [
      { from: 'me', text: 'Boa noite, vocês entregam no Jardim Paulista?', time: 'ontem' },
      { from: 'them', text: 'Entregamos sim! Em até 40 minutos pelo Realys.', time: 'ontem' },
    ],
  },
  {
    id: 'm3', contactId: 'u3', unread: 0,
    messages: [
      { from: 'them', text: 'Achei aquele apê para alugar que te falei', time: 'seg' },
      { from: 'me', text: 'Manda o link do anúncio!', time: 'seg' },
    ],
  },
];

export const lives = [
  { id: 'v1', title: 'Desfile coleção verão + cupom ao vivo', host: 'Moda Brasil', viewers: 1240, sponsored: true, photo: photo('realys-live-moda', 800, 500), tag: 'Compras ao vivo' },
  { id: 'v2', title: 'Pizza na pedra: assista a montagem', host: 'Pizzaria da Praça', viewers: 380, sponsored: false, photo: photo('realys-live-pizza', 800, 500), tag: 'Gastronomia' },
  { id: 'v3', title: 'Tour pelo apartamento à venda na Vila Mariana', host: 'Imobiliária Horizonte', viewers: 96, sponsored: false, photo: photo('realys-live-ap', 800, 500), tag: 'Imóveis' },
  { id: 'v4', title: 'Bate-papo: dicas para economizar no mercado', host: 'Ana Paula', viewers: 57, sponsored: false, photo: photo('realys-live-ana', 800, 500), tag: 'Comunidade' },
];

export const liveComments = [
  'Que top! 🔥', 'Tem cupom?', 'Chegou agora, o que perdi?', 'Quero esse!', 'Entrega em Campinas?', 'Muito bom 👏', 'Qual o preço?', 'Já comprei pelo app!',
];
