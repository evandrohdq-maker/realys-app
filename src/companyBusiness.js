// Página empresarial: onde cada empresa atua, os segmentos de cada área, onde atende,
// vitrine, depoimentos de quem comprou e vídeos de propaganda.
// Tudo fictício, para demonstração. A minha empresa (MY_COMPANY_ID) edita na aba Página.
import { MY_COMPANY_ID } from './data';

const pic = (seed, w = 640, h = 360) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Áreas de atuação e os segmentos que a empresa escolhe para se descrever.
export const SECTORS = [
  { key: 'alimentacao', label: 'Alimentação', icon: 'restaurant-outline', segments: ['Restaurante', 'Pizzaria', 'Hamburgueria', 'Comida japonesa', 'Lanchonete', 'Bar e boteco', 'Cafeteria', 'Doceria', 'Padaria', 'Sorveteria e açaí', 'Delivery', 'Dark kitchen', 'Food truck', 'Marmitas', 'Eventos e buffet'] },
  { key: 'mercado', label: 'Mercado e conveniência', icon: 'cart-outline', segments: ['Mercado de bairro', 'Supermercado', 'Hortifrúti', 'Açougue', 'Peixaria', 'Empório', 'Bebidas e adega', 'Produtos naturais', 'Conveniência 24h', 'Atacado'] },
  { key: 'moda', label: 'Moda e acessórios', icon: 'shirt-outline', segments: ['Feminino', 'Masculino', 'Infantil', 'Calçados', 'Fitness', 'Moda praia', 'Joias e bijuterias', 'Ótica', 'Plus size', 'Sob medida'] },
  { key: 'varejo', label: 'Varejo em geral', icon: 'bag-outline', segments: ['Eletrônicos', 'Eletrodomésticos', 'Cosméticos e perfumaria', 'Esporte e lazer', 'Papelaria e livraria', 'Brinquedos', 'Presentes', 'Loja online', 'Vários'] },
  { key: 'tecnologia', label: 'Tecnologia e IA', icon: 'hardware-chip-outline', segments: ['Celulares', 'Informática', 'Games', 'Casa inteligente', 'Assistência técnica', 'Software e apps', 'Inteligência artificial', 'Automação e agentes de IA', 'Cibersegurança', 'Startup', 'Provedor de internet', 'Robótica'] },
  { key: 'agro', label: 'Agro', icon: 'leaf-outline', segments: ['Grãos', 'Café', 'Pecuária', 'Hortifrúti', 'Leite', 'Cooperativa', 'Agroindústria', 'Insumos', 'Máquinas', 'Agricultura de precisão', 'Veterinária rural'] },
  { key: 'saude', label: 'Saúde e beleza', icon: 'heart-outline', segments: ['Hospital', 'Clínica', 'Laboratório', 'Farmácia', 'Odontologia', 'Psicologia', 'Estética', 'Salão e barbearia', 'Estúdio de tatuagem', 'Academia', 'Nutrição', 'Bem-estar'] },
  { key: 'casa', label: 'Casa e construção', icon: 'hammer-outline', segments: ['Material de construção', 'Móveis', 'Decoração', 'Utensílios', 'Eletrodomésticos', 'Reformas', 'Jardinagem', 'Iluminação'] },
  { key: 'imobiliario', label: 'Imobiliário', icon: 'home-outline', segments: ['Imobiliária: venda', 'Imobiliária: locação', 'Construtora', 'Incorporadora', 'Arquitetura e engenharia', 'Administração de condomínios'] },
  { key: 'servicos', label: 'Serviços profissionais', icon: 'construct-outline', segments: ['Entrega e frete', 'Limpeza', 'Manutenção', 'Consultoria', 'Contabilidade', 'Advocacia', 'Marketing e publicidade', 'RH e recrutamento', 'Seguros', 'Fotografia', 'Gráfica'] },
  { key: 'transporte', label: 'Transporte e logística', icon: 'bus-outline', segments: ['Transportadora', 'Ônibus municipal', 'Ônibus intermunicipal', 'Ônibus interestadual', 'Frota de entregas', 'Mudanças', 'Locadora de veículos', 'Locação de máquinas'] },
  { key: 'automotivo', label: 'Automotivo', icon: 'car-sport-outline', segments: ['Concessionária', 'Oficina mecânica', 'Funilaria e pintura', 'Lava-rápido e estética', 'Autopeças', 'Pneus'] },
  { key: 'turismo', label: 'Hotelaria e turismo', icon: 'bed-outline', segments: ['Hotel', 'Pousada', 'Hostel', 'Resort', 'Agência de viagens', 'Passeios', 'Aluguel de temporada', 'Transfer'] },
  { key: 'eventos', label: 'Eventos e entretenimento', icon: 'sparkles-outline', segments: ['Casa noturna', 'Casa de shows', 'Espaço de eventos', 'Buffet', 'Produtora de eventos', 'Cinema e teatro', 'Parque e lazer'] },
  { key: 'educacao', label: 'Educação', icon: 'school-outline', segments: ['Escola', 'Faculdade', 'Faculdade online', 'Cursos livres', 'Cursos online', 'Idiomas', 'Reforço escolar', 'Profissionalizante', 'Autoescola', 'Música e artes'] },
  { key: 'midia', label: 'Mídia e cultura', icon: 'film-outline', segments: ['Gravadora e selo musical', 'Produtora audiovisual', 'Editora', 'Rádio e TV', 'Portal de notícias', 'Agência de artistas', 'Agência de influenciadores'] },
  { key: 'industria', label: 'Indústria e B2B', icon: 'business-outline', segments: ['Alimentos e bebidas', 'Têxtil e confecção', 'Móveis', 'Metalurgia e máquinas', 'Química e cosméticos', 'Plásticos e embalagens', 'Gráfica', 'Eletrônicos', 'Matéria-prima', 'Distribuição', 'Importação', 'Exportação'] },
  { key: 'pet', label: 'Pet', icon: 'paw-outline', segments: ['Pet shop', 'Veterinário', 'Banho e tosa', 'Ração', 'Adestramento', 'Hotel pet'] },
  { key: 'institucional', label: 'Institucional', icon: 'people-circle-outline', segments: ['Órgão público', 'ONG e projeto social', 'Igreja e instituição religiosa', 'Associação', 'Sindicato', 'Clube'] },
];

// Papel na cadeia: o que a empresa faz no comércio entre empresas do Re@lys.
// Uma empresa pode ter mais de um (ex.: fabrica e também vende direto ao usuário).
export const ROLES = [
  { key: 'fabricante', label: 'Fabricante', icon: 'cog-outline', hint: 'Compra matéria-prima, produz e anuncia' },
  { key: 'fornecedor', label: 'Fornecedor', icon: 'cube-outline', hint: 'Destaca produtos e envia propostas para empresas' },
  { key: 'distribuidor', label: 'Distribuidor e atacado', icon: 'git-network-outline', hint: 'Compra de fabricantes e revende para lojas com a sua margem' },
  { key: 'varejista', label: 'Varejista', icon: 'storefront-outline', hint: 'Vende ao usuário final no Shop ou no Food' },
  { key: 'prestadora', label: 'Prestadora de serviço', icon: 'hand-left-outline', hint: 'Atende pela aba Serviços' },
  { key: 'institucional', label: 'Institucional', icon: 'people-circle-outline', hint: 'Informa e atende a população' },
];
export const roleByKey = (k) => ROLES.find((x) => x.key === k);

export const sectorByKey = (k) => SECTORS.find((s) => s.key === k);

// Como a empresa atende.
export const SERVE_MODES = [
  { key: 'loja', label: 'Loja física', icon: 'storefront-outline' },
  { key: 'entrega', label: 'Entrega', icon: 'bicycle-outline' },
  { key: 'retirada', label: 'Retirada', icon: 'bag-handle-outline' },
  { key: 'online', label: 'Online', icon: 'globe-outline' },
  { key: 'brasil', label: 'Envia para todo o Brasil', icon: 'airplane-outline' },
];

// Galeria empresarial: só fotos da empresa. Nada de foto pessoal ou de "se exibir":
// a página da empresa é um perfil empresarial, aberto aos usuários, mas não é um perfil social.
export const GALLERY_TYPES = [
  { key: 'equipe', label: 'Equipe', icon: 'people-outline' },
  { key: 'produtos', label: 'Produtos', icon: 'cube-outline' },
  { key: 'estrutura', label: 'Estrutura', icon: 'business-outline' },
];
const g = (id, type, seed, caption) => ({ id, type, photo: pic(seed, 600, 600), caption });

// Depoimento de quem comprou: who = membro do Re@lys (src/people.js), product = o que comprou.
const r = (id, who, stars, product, time, text, shown = true) => ({ id, who, stars, product, time, text, shown, verified: true });

const BUSINESS = {
  e1: {
    legalName: 'Bom Preço Comércio de Alimentos Ltda.',
    cnpj: '12.345.678/0001-90',
    team: '18 colaboradores',
    address: 'Rua Domingos de Morais, 1200 · Vila Mariana, São Paulo - SP',
    contact: 'Seg a sáb, 7h às 21h · (11) 4000-1001',
    gallery: [g('g11', 'estrutura', 'realys-g-mercado-loja', 'Nossa loja na Vila Mariana'), g('g12', 'equipe', 'realys-g-mercado-equipe', 'Equipe do caixa e da entrega'), g('g13', 'produtos', 'realys-g-mercado-horti', 'Hortifrúti que chega toda manhã'), g('g14', 'produtos', 'realys-g-mercado-cafe', 'Café especial do Sul de Minas')],
    roles: ['varejista'],
    tagline: 'O mercado do bairro, agora na palma da mão',
    sectors: { mercado: ['Mercado de bairro', 'Hortifrúti', 'Açougue', 'Bebidas'], alimentacao: ['Padaria', 'Delivery'] },
    serves: 'Vila Mariana, Moema e Saúde · entrega em até 1 h',
    modes: ['loja', 'entrega', 'retirada'],
    since: 2009,
    showcase: ['p16', 'p3', 'p1'],
    reviews: [
      r('rv1', 'u1', 5, 'Café Especial Torra Média', 'há 2 dias', 'Chegou em 40 minutos, bem embalado e com nota fiscal no app. O café especial é maravilhoso!'),
      r('rv2', 'u4', 5, 'Compra do mês', 'semana passada', 'Preço justo de verdade. Faço a compra do mês aqui pelo Re@lys e economizo o tempo da fila.'),
      r('rv3', 'u3', 4, 'Hortifrúti', 'há 2 semanas', 'Frutas fresquinhas e o entregador super educado. Só queria mais opções de orgânicos.'),
      r('rv4', 'u2', 5, 'Leite e pães', 'há 3 semanas', 'Atendimento de bairro com tecnologia de loja grande. Pago com saldo Re@lys e pronto.', false),
    ],
    ads: [
      { id: 'ad1', title: 'Quarta do hortifrúti: até 30% off', length: '0:30', views: 18400, cover: pic('realys-ad-horti') },
      { id: 'ad2', title: 'Entrega em 1 hora no seu bairro', length: '0:15', views: 9600, cover: pic('realys-ad-entrega') },
      { id: 'ad3', title: 'Café especial do Sul de Minas chegou', length: '0:20', views: 5200, cover: pic('realys-ad-cafe') },
    ],
  },
  e2: {
    legalName: 'Pizzaria da Praça Ltda.',
    cnpj: '23.456.789/0001-01',
    team: '24 colaboradores',
    address: 'Praça da Árvore, 45 · Saúde, São Paulo - SP',
    contact: 'Todos os dias, 18h às 23h30 · (11) 4000-1002',
    gallery: [g('g21', 'estrutura', 'realys-g-pizza-forno', 'Forno a lenha no salão'), g('g22', 'equipe', 'realys-g-pizza-equipe', 'Pizzaiolos da casa'), g('g23', 'produtos', 'realys-g-pizza-marg', 'Margherita de fermentação natural')],
    roles: ['varejista'],
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
    legalName: 'Moda Brasil Confecções S.A.',
    cnpj: '34.567.890/0001-12',
    team: '62 colaboradores',
    address: 'Av. Afonso Pena, 3000 · Funcionários, Belo Horizonte - MG',
    contact: 'Loja online 24h · (31) 4000-1003',
    gallery: [g('g31', 'estrutura', 'realys-g-moda-loja', 'Loja de Belo Horizonte'), g('g32', 'equipe', 'realys-g-moda-atelie', 'Nosso ateliê de costura'), g('g33', 'produtos', 'realys-g-moda-colecao', 'Coleção Verão Brasil')],
    roles: ['fabricante', 'varejista'],
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
    legalName: 'Tech Center Eletrônicos Ltda.',
    cnpj: '45.678.901/0001-23',
    team: '31 colaboradores',
    address: 'Rua XV de Novembro, 800 · Centro, Curitiba - PR',
    contact: 'Seg a sex, 9h às 19h · (41) 4000-1004',
    gallery: [g('g41', 'estrutura', 'realys-g-tech-loja', 'Loja e assistência técnica'), g('g42', 'equipe', 'realys-g-tech-tecnicos', 'Técnicos certificados'), g('g43', 'produtos', 'realys-g-tech-notes', 'Notebooks com garantia')],
    roles: ['distribuidor', 'varejista'],
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
    legalName: 'Burguer do Zé Lanches ME',
    cnpj: '56.789.012/0001-34',
    team: '9 colaboradores',
    address: 'Rua dos Pinheiros, 550 · Pinheiros, São Paulo - SP',
    contact: 'Ter a dom, 18h às 0h · (11) 4000-1005',
    gallery: [g('g51', 'estrutura', 'realys-g-burger-casa', 'Nossa chapa'), g('g52', 'produtos', 'realys-g-burger-smash', 'Smash duplo')],
    roles: ['varejista'],
    tagline: 'Hambúrguer artesanal de verdade',
    sectors: { alimentacao: ['Hamburgueria', 'Delivery'] },
    serves: 'Pinheiros e Vila Madalena · delivery em até 35 min',
    modes: ['loja', 'entrega'],
    since: 2019,
    reviews: [r('rv40', 'u4', 5, 'Smash duplo', 'há 5 dias', 'Pão macio, carne suculenta e a batata rústica é viciante.')],
    ads: [{ id: 'ad40', title: 'Combo da sexta: burger + batata + refri', length: '0:20', views: 15800, cover: pic('realys-ad-burger') }],
  },
  e6: {
    legalName: 'Boteco do Alemão Bar e Restaurante Ltda.',
    cnpj: '67.890.123/0001-45',
    team: '14 colaboradores',
    address: 'Rua Aspicuelta, 220 · Vila Madalena, São Paulo - SP',
    contact: 'Seg a sáb, 17h às 1h · (11) 4000-1006',
    gallery: [g('g61', 'estrutura', 'realys-g-boteco-salao', 'Salão e palco do samba'), g('g62', 'produtos', 'realys-g-boteco-chope', 'Chope e petiscos')],
    roles: ['varejista'],
    tagline: 'Chope gelado e petisco de boteco raiz',
    sectors: { alimentacao: ['Bar e boteco', 'Eventos e buffet'] },
    serves: 'Vila Madalena · música ao vivo de quinta a sábado',
    modes: ['loja'],
    since: 2008,
    reviews: [r('rv50', 'u6', 5, 'Happy hour', 'ontem', 'Chope no ponto, porção caprichada e o samba de sexta é imperdível.')],
    ads: [{ id: 'ad50', title: 'Happy hour: chope em dobro até as 20h', length: '0:15', views: 22400, cover: pic('realys-ad-boteco') }],
  },
  e7: {
    legalName: 'Kento Culinária Japonesa Ltda.',
    cnpj: '78.901.234/0001-56',
    team: '16 colaboradores',
    address: 'Rua Galvão Bueno, 300 · Liberdade, São Paulo - SP',
    contact: 'Ter a dom, 11h às 23h · (11) 4000-1007',
    gallery: [g('g71', 'equipe', 'realys-g-sushi-mestre', 'Mestre Kento e equipe'), g('g72', 'produtos', 'realys-g-sushi-combo', 'Combinado da casa')],
    roles: ['varejista'],
    tagline: 'Sushi feito na hora pelo mestre Kento',
    sectors: { alimentacao: ['Comida japonesa', 'Delivery', 'Eventos e buffet'] },
    serves: 'Liberdade e Paraíso · delivery em até 45 min',
    modes: ['loja', 'entrega'],
    since: 2015,
    reviews: [r('rv60', 'u1', 5, 'Combinado 30 peças', 'há 1 semana', 'Peixe fresquíssimo e apresentação linda. Virou nosso lugar de comemorar.')],
    ads: [{ id: 'ad60', title: 'Rodízio premium de quinta', length: '0:30', views: 12900, cover: pic('realys-ad-sushi') }],
  },
  e8: {
    legalName: 'Doce Encanto Café e Confeitaria ME',
    cnpj: '89.012.345/0001-67',
    team: '7 colaboradores',
    address: 'Av. Ibirapuera, 2100 · Moema, São Paulo - SP',
    contact: 'Seg a sáb, 8h às 20h · (11) 4000-1008',
    gallery: [g('g81', 'estrutura', 'realys-g-doce-vitrine', 'Nossa vitrine de doces'), g('g82', 'produtos', 'realys-g-doce-bolo', 'Bolos de festa sob encomenda')],
    roles: ['fabricante', 'varejista'],
    tagline: 'Doces de vitrine e café coado na hora',
    sectors: { alimentacao: ['Doceria', 'Cafeteria', 'Eventos e buffet'] },
    serves: 'Moema · encomendas para festas',
    modes: ['loja', 'retirada', 'entrega'],
    since: 2017,
    reviews: [r('rv70', 'u10', 5, 'Bolo de aniversário', 'há 3 dias', 'O bolo foi o sucesso da festa. Lindo, saboroso e entregue no horário.')],
    ads: [{ id: 'ad70', title: 'Encomende o bolo da sua festa', length: '0:20', views: 8700, cover: pic('realys-ad-doce') }],
  },
  // Exemplos de outras classes empresariais.
  e9: {
    legalName: 'Nexa Inteligência Artificial e Robótica Ltda.',
    cnpj: '90.123.456/0001-78',
    team: '32 colaboradores',
    address: 'Rua Pedro Ivo, 870 · Centro, Curitiba - PR',
    contact: 'Seg a sex, 9h às 18h · (41) 4000-1009',
    gallery: [g('g91', 'equipe', 'realys-g-nexa-time', 'Time de IA e engenharia'), g('g92', 'produtos', 'realys-g-nexa-robo', 'Kit de robótica educacional'), g('g93', 'estrutura', 'realys-g-nexa-lab', 'Nosso laboratório')],
    roles: ['fabricante', 'fornecedor', 'varejista'],
    tagline: 'IA e robótica para quem quer crescer',
    sectors: { tecnologia: ['Inteligência artificial', 'Automação e agentes de IA', 'Robótica', 'Software e apps'], educacao: ['Cursos online'] },
    serves: 'Todo o Brasil · assistentes de IA para lojas e kits de robótica',
    modes: ['online', 'brasil'],
    since: 2021,
    reviews: [r('rv90', 'u28', 5, 'Kit de Robótica Educacional', 'há 4 dias', 'Montei com meus alunos em uma tarde. Manual claro e peças de qualidade.'), r('rv91', 'u2', 5, 'Assistente de IA para lojas', 'há 2 semanas', 'Ligamos no atendimento da loja e as respostas ficaram rápidas e certas.')],
    ads: [{ id: 'ad90', title: 'Sua loja atendendo 24h com IA', length: '0:30', views: 31200, cover: pic('realys-ad-nexa') }],
  },
  e10: {
    legalName: 'Fazenda Serra Verde Agroindústria Ltda.',
    cnpj: '01.234.567/0001-89',
    team: '45 colaboradores',
    address: 'Estrada da Serra Verde, km 12 · Zona Rural, Varginha - MG',
    contact: 'Seg a sáb, 7h às 17h · (35) 4000-1010',
    gallery: [g('g101', 'estrutura', 'realys-g-serra-cafezal', 'Cafezal a 1.100 m de altitude'), g('g102', 'equipe', 'realys-g-serra-colheita', 'Equipe da colheita'), g('g103', 'produtos', 'realys-g-serra-graos', 'Grãos selecionados')],
    roles: ['fabricante', 'fornecedor', 'varejista'],
    tagline: 'Café especial do pé até a sua xícara',
    sectors: { agro: ['Café', 'Agroindústria', 'Agricultura de precisão'], industria: ['Alimentos e bebidas', 'Exportação'] },
    serves: 'Vende para cafeterias e mercados do Re@lys e envia para todo o Brasil',
    modes: ['online', 'brasil'],
    since: 1988,
    reviews: [r('rv100', 'u8', 5, 'Café especial em grãos', 'há 1 semana', 'Aroma incrível. Dá para ver no app de qual talhão veio o café.')],
    ads: [{ id: 'ad100', title: 'Da fazenda para a sua cafeteria', length: '0:30', views: 7400, cover: pic('realys-ad-serra') }],
  },
};

const EMPTY = { tagline: '', sectors: {}, roles: [], serves: '', modes: [], showcase: [], reviews: [], ads: [], gallery: [], legalName: '', cnpj: '', team: '', address: '', contact: '' };

// Página empresarial da empresa, já com o que a minha empresa editou (state.myBusiness).
export function businessOf(state, id) {
  const def = { ...EMPTY, ...(BUSINESS[id] || {}) };
  const base = { ...def, reviews: [...((state.companyReviews || {})[id] || []), ...def.reviews] };
  if (id !== MY_COMPANY_ID || !state.myBusiness) return base;
  const mine = state.myBusiness;
  const reviews = base.reviews.map((rv) =>
    mine.reviewShown && rv.id in mine.reviewShown ? { ...rv, shown: mine.reviewShown[rv.id] } : rv,
  );
  return {
    ...base,
    ...mine,
    reviews,
    ads: [...(mine.newAds || []), ...base.ads].filter((ad) => !(mine.removedAds || {})[ad.id]),
    gallery: [...(mine.newPhotos || []), ...base.gallery].filter((ph) => !(mine.removedPhotos || {})[ph.id]),
  };
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
