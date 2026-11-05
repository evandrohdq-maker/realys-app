// Página empresarial: onde cada empresa atua, os segmentos de cada área, onde atende,
// vitrine, depoimentos de quem comprou e vídeos de propaganda.
// Tudo fictício, para demonstração. A minha empresa (MY_COMPANY_ID) edita na aba Página.
import { MY_COMPANY_ID } from './data';

const pic = (seed, w = 640, h = 360) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Áreas de atuação e os segmentos que a empresa escolhe para se descrever.
export const SECTORS = [
  { key: 'alimentacao', label: 'Alimentação', icon: 'restaurant-outline', segments: ['Restaurante', 'Pizzaria', 'Hamburgueria', 'Comida japonesa', 'Lanchonete', 'Bar e boteco', 'Cafeteria', 'Doceria', 'Padaria', 'Delivery', 'Marmitas', 'Eventos e buffet'] },
  { key: 'mercado', label: 'Mercado e conveniência', icon: 'cart-outline', segments: ['Mercado de bairro', 'Hortifrúti', 'Açougue', 'Empório', 'Bebidas', 'Produtos naturais', 'Conveniência 24h', 'Atacado'] },
  { key: 'moda', label: 'Moda e acessórios', icon: 'shirt-outline', segments: ['Feminino', 'Masculino', 'Infantil', 'Calçados', 'Fitness', 'Moda praia', 'Joias e bijuterias', 'Plus size', 'Sob medida'] },
  { key: 'tecnologia', label: 'Tecnologia', icon: 'hardware-chip-outline', segments: ['Celulares', 'Informática', 'Games', 'Casa inteligente', 'Assistência técnica', 'Software e apps', 'Inteligência artificial', 'Robótica'] },
  { key: 'agro', label: 'Agro', icon: 'leaf-outline', segments: ['Grãos', 'Café', 'Pecuária', 'Hortifrúti', 'Leite', 'Insumos', 'Máquinas', 'Agricultura de precisão'] },
  { key: 'saude', label: 'Saúde e beleza', icon: 'heart-outline', segments: ['Farmácia', 'Clínica', 'Odontologia', 'Estética', 'Salão e barbearia', 'Academia', 'Nutrição', 'Bem-estar'] },
  { key: 'casa', label: 'Casa e construção', icon: 'hammer-outline', segments: ['Material de construção', 'Móveis', 'Decoração', 'Utensílios', 'Eletrodomésticos', 'Reformas', 'Jardinagem', 'Iluminação'] },
  { key: 'servicos', label: 'Serviços', icon: 'construct-outline', segments: ['Entrega e frete', 'Limpeza', 'Manutenção', 'Consultoria', 'Contabilidade', 'Marketing', 'Fotografia', 'Gráfica'] },
  { key: 'turismo', label: 'Hotelaria e turismo', icon: 'bed-outline', segments: ['Hotel', 'Pousada', 'Agência de viagens', 'Passeios', 'Aluguel de temporada', 'Transfer'] },
  { key: 'educacao', label: 'Educação', icon: 'school-outline', segments: ['Cursos livres', 'Idiomas', 'Reforço escolar', 'Cursos online', 'Profissionalizante', 'Música e artes'] },
  { key: 'industria', label: 'Indústria e B2B', icon: 'business-outline', segments: ['Fabricação', 'Distribuição', 'Embalagens', 'Matéria-prima', 'Importação', 'Exportação'] },
  { key: 'pet', label: 'Pet', icon: 'paw-outline', segments: ['Pet shop', 'Veterinário', 'Banho e tosa', 'Ração', 'Adestramento', 'Hotel pet'] },
];

export const sectorByKey = (k) => SECTORS.find((s) => s.key === k);

// Como a empresa atende.
export const SERVE_MODES = [
  { key: 'loja', label: 'Loja física', icon: 'storefront-outline' },
  { key: 'entrega', label: 'Entrega', icon: 'bicycle-outline' },
  { key: 'retirada', label: 'Retirada', icon: 'bag-handle-outline' },
  { key: 'online', label: 'Online', icon: 'globe-outline' },
  { key: 'brasil', label: 'Envia para todo o Brasil', icon: 'airplane-outline' },
];

// Depoimento de quem comprou: who = membro do Realys (src/people.js), product = o que comprou.
const r = (id, who, stars, product, time, text, shown = true) => ({ id, who, stars, product, time, text, shown, verified: true });

const BUSINESS = {
  e1: {
    tagline: 'O mercado do bairro, agora na palma da mão',
    sectors: { mercado: ['Mercado de bairro', 'Hortifrúti', 'Açougue', 'Bebidas'], alimentacao: ['Padaria', 'Delivery'] },
    serves: 'Vila Mariana, Moema e Saúde · entrega em até 1 h',
    modes: ['loja', 'entrega', 'retirada'],
    since: 2009,
    showcase: ['p16', 'p3', 'p1'],
    reviews: [
      r('rv1', 'u1', 5, 'Café Especial Torra Média', 'há 2 dias', 'Chegou em 40 minutos, bem embalado e com nota fiscal no app. O café especial é maravilhoso!'),
      r('rv2', 'u4', 5, 'Compra do mês', 'semana passada', 'Preço justo de verdade. Faço a compra do mês aqui pelo Realys e economizo o tempo da fila.'),
      r('rv3', 'u3', 4, 'Hortifrúti', 'há 2 semanas', 'Frutas fresquinhas e o entregador super educado. Só queria mais opções de orgânicos.'),
      r('rv4', 'u2', 5, 'Leite e pães', 'há 3 semanas', 'Atendimento de bairro com tecnologia de loja grande. Pago com saldo Realys e pronto.', false),
    ],
    ads: [
      { id: 'ad1', title: 'Quarta do hortifrúti: até 30% off', length: '0:30', views: 18400, cover: pic('realys-ad-horti') },
      { id: 'ad2', title: 'Entrega em 1 hora no seu bairro', length: '0:15', views: 9600, cover: pic('realys-ad-entrega') },
      { id: 'ad3', title: 'Café especial do Sul de Minas chegou', length: '0:20', views: 5200, cover: pic('realys-ad-cafe') },
    ],
  },
  e2: {
    tagline: 'Forno a lenha, massa de 48 horas',
    sectors: { alimentacao: ['Pizzaria', 'Delivery', 'Eventos e buffet'] },
    serves: 'Zona Sul de São Paulo · delivery em até 40 min',
    modes: ['loja', 'entrega', 'retirada'],
    since: 2014,
    reviews: [
      r('rv10', 'u4', 5, 'Pizza Margherita', 'ontem', 'A melhor pizza de domingo da família. Chegou quentinha e a massa é leve demais.'),
      r('rv11', 'u6', 5, 'Rodízio para aniversário', 'há 1 semana', 'Fizeram o buffet do aniversário do meu filho e todo mundo pediu o contato.'),
      r('rv12', 'u2', 4, 'Calabresa', 'há 2 semanas', 'Muito boa, só demorou um pouco mais na sexta à noite.'),
    ],
    ads: [
      { id: 'ad10', title: 'Do forno a lenha para a sua mesa', length: '0:30', views: 42100, cover: pic('realys-ad-pizza') },
      { id: 'ad11', title: 'Terça em dobro: 2 pizzas pelo preço de 1', length: '0:15', views: 27800, cover: pic('realys-ad-pizza2') },
    ],
  },
  e3: {
    tagline: 'Moda brasileira que veste o Brasil inteiro',
    sectors: { moda: ['Feminino', 'Masculino', 'Fitness', 'Plus size'] },
    serves: 'Loja em Belo Horizonte · envia para todo o Brasil',
    modes: ['loja', 'online', 'brasil'],
    since: 2016,
    reviews: [
      r('rv20', 'u3', 5, 'Vestido midi', 'há 3 dias', 'Tecido de qualidade e o caimento ficou perfeito. Chegou em São Paulo em 4 dias.'),
      r('rv21', 'u10', 4, 'Conjunto fitness', 'há 1 semana', 'Lindo e confortável. Troquei o tamanho sem burocracia nenhuma.'),
    ],
    ads: [
      { id: 'ad20', title: 'Coleção Verão Brasil', length: '0:45', views: 63500, cover: pic('realys-ad-moda') },
      { id: 'ad21', title: 'Frete grátis para todo o país', length: '0:15', views: 21300, cover: pic('realys-ad-moda2') },
    ],
  },
  e4: {
    tagline: 'Tecnologia com garantia e assistência própria',
    sectors: { tecnologia: ['Celulares', 'Informática', 'Games', 'Assistência técnica'] },
    serves: 'Curitiba e região · envia para todo o Brasil',
    modes: ['loja', 'online', 'brasil', 'retirada'],
    since: 2012,
    reviews: [
      r('rv30', 'u2', 5, 'Notebook', 'há 4 dias', 'Nota fiscal, garantia e ainda configuraram tudo pra mim. Atendimento nota 10.'),
      r('rv31', 'u11', 5, 'Conserto de celular', 'há 2 semanas', 'Trocaram a tela no mesmo dia. Preço honesto.'),
    ],
    ads: [{ id: 'ad30', title: 'Semana gamer: consoles e acessórios', length: '0:30', views: 35700, cover: pic('realys-ad-tech') }],
  },
  e5: {
    tagline: 'Hambúrguer artesanal de verdade',
    sectors: { alimentacao: ['Hamburgueria', 'Delivery'] },
    serves: 'Pinheiros e Vila Madalena · delivery em até 35 min',
    modes: ['loja', 'entrega'],
    since: 2019,
    reviews: [r('rv40', 'u4', 5, 'Smash duplo', 'há 5 dias', 'Pão macio, carne suculenta e a batata rústica é viciante.')],
    ads: [{ id: 'ad40', title: 'Combo da sexta: burger + batata + refri', length: '0:20', views: 15800, cover: pic('realys-ad-burger') }],
  },
  e6: {
    tagline: 'Chope gelado e petisco de boteco raiz',
    sectors: { alimentacao: ['Bar e boteco', 'Eventos e buffet'] },
    serves: 'Vila Madalena · música ao vivo de quinta a sábado',
    modes: ['loja'],
    since: 2008,
    reviews: [r('rv50', 'u6', 5, 'Happy hour', 'ontem', 'Chope no ponto, porção caprichada e o samba de sexta é imperdível.')],
    ads: [{ id: 'ad50', title: 'Happy hour: chope em dobro até as 20h', length: '0:15', views: 22400, cover: pic('realys-ad-boteco') }],
  },
  e7: {
    tagline: 'Sushi feito na hora pelo mestre Kento',
    sectors: { alimentacao: ['Comida japonesa', 'Delivery', 'Eventos e buffet'] },
    serves: 'Liberdade e Paraíso · delivery em até 45 min',
    modes: ['loja', 'entrega'],
    since: 2015,
    reviews: [r('rv60', 'u1', 5, 'Combinado 30 peças', 'há 1 semana', 'Peixe fresquíssimo e apresentação linda. Virou nosso lugar de comemorar.')],
    ads: [{ id: 'ad60', title: 'Rodízio premium de quinta', length: '0:30', views: 12900, cover: pic('realys-ad-sushi') }],
  },
  e8: {
    tagline: 'Doces de vitrine e café coado na hora',
    sectors: { alimentacao: ['Doceria', 'Cafeteria', 'Eventos e buffet'] },
    serves: 'Moema · encomendas para festas',
    modes: ['loja', 'retirada', 'entrega'],
    since: 2017,
    reviews: [r('rv70', 'u10', 5, 'Bolo de aniversário', 'há 3 dias', 'O bolo foi o sucesso da festa. Lindo, saboroso e entregue no horário.')],
    ads: [{ id: 'ad70', title: 'Encomende o bolo da sua festa', length: '0:20', views: 8700, cover: pic('realys-ad-doce') }],
  },
};

const EMPTY = { tagline: '', sectors: {}, serves: '', modes: [], showcase: [], reviews: [], ads: [] };

// Página empresarial da empresa, já com o que a minha empresa editou (state.myBusiness).
export function businessOf(state, id) {
  const def = { ...EMPTY, ...(BUSINESS[id] || {}) };
  const base = { ...def, reviews: [...((state.companyReviews || {})[id] || []), ...def.reviews] };
  if (id !== MY_COMPANY_ID || !state.myBusiness) return base;
  const mine = state.myBusiness;
  const reviews = base.reviews.map((rv) =>
    mine.reviewShown && rv.id in mine.reviewShown ? { ...rv, shown: mine.reviewShown[rv.id] } : rv,
  );
  return { ...base, ...mine, reviews, ads: [...(mine.newAds || []), ...base.ads].filter((ad) => !(mine.removedAds || {})[ad.id]) };
}

// Vitrine: os produtos escolhidos pela empresa (ou os em destaque, se ela não escolheu).
export function showcaseOf(state, id) {
  const b = businessOf(state, id);
  const products = state.products.filter((p) => p.storeId === id);
  const chosen = (b.showcase || []).map((pid) => products.find((p) => p.id === pid)).filter(Boolean);
  if (chosen.length) return chosen;
  return products.filter((p) => p.featured || p.launch).slice(0, 4);
}

export const ratingOf = (reviews) => {
  const list = reviews.filter((x) => x.shown);
  if (!list.length) return null;
  return +(list.reduce((s, x) => s + x.stars, 0) / list.length).toFixed(1);
};
