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
  { key: 'hotel', label: 'Hotéis e pousadas', icon: 'bed-outline' },
  { key: 'evento', label: 'Festas, eventos e noite', icon: 'musical-notes-outline' },
  { key: 'curso', label: 'Cursos e faculdades online', icon: 'school-outline' },
];

// Texto do botão principal de cada tipo de anúncio.
export const LISTING_CTA = {
  'imovel-venda': 'Agendar visita',
  'imovel-aluguel': 'Agendar visita',
  'carro-aluguel': 'Reservar',
  'maquina-aluguel': 'Reservar',
  hotel: 'Reservar diária',
  evento: 'Comprar ingresso',
  curso: 'Inscrever-se',
};

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
  { id: 'l13', kind: 'hotel', title: 'Hotel Vista Mar · quarto casal', detail: 'Café da manhã, piscina e Wi-Fi · check-in 14h', price: 'R$ 380/diária', place: 'Balneário Camboriú - SC', who: 'Hotel Vista Mar', sponsored: true, photo: photo('realys-hotel1') },
  { id: 'l14', kind: 'hotel', title: 'Pousada Recanto da Serra', detail: 'Chalé com lareira · aceita pet', price: 'R$ 290/diária', place: 'Campos do Jordão - SP', who: 'Pousada Recanto da Serra', sponsored: false, photo: photo('realys-pousada') },
  { id: 'l15', kind: 'hotel', title: 'Hotel Executivo Centro', detail: 'Perto do metrô · sala de reunião', price: 'R$ 240/diária', place: 'Centro, São Paulo - SP', who: 'Rede Conforto Hotéis', sponsored: false, photo: photo('realys-hotel2') },
  { id: 'l16', kind: 'evento', title: 'Sexta Eletrônica · Club Neon', detail: 'Casa noturna · DJs convidados · a partir das 23h', price: 'R$ 60 ingresso', cta: 'Comprar ingresso', place: 'Vila Olímpia, São Paulo - SP', who: 'Club Neon', sponsored: true, photo: photo('realys-balada') },
  { id: 'l17', kind: 'evento', title: 'Samba no Quintal ao vivo', detail: 'Sábado · open bar opcional', price: 'R$ 45 ingresso', cta: 'Comprar ingresso', place: 'Lapa, Rio de Janeiro - RJ', who: 'Quintal do Samba', sponsored: false, photo: photo('realys-samba') },
  { id: 'l18', kind: 'evento', title: 'Salão de festas para 150 pessoas', detail: 'Cozinha, som e estacionamento', price: 'R$ 2.800/data', cta: 'Reservar data', place: 'Guarulhos - SP', who: 'Espaço Celebrar', sponsored: false, photo: photo('realys-salao') },
  { id: 'l19', kind: 'evento', title: 'Festival de Food Trucks', detail: 'Domingo · entrada gratuita · música ao vivo', price: 'Grátis', cta: 'Confirmar presença', place: 'Parque Central, Curitiba - PR', who: 'Prefeitura em Movimento', sponsored: false, photo: photo('realys-foodtruck') },
  { id: 'l20', kind: 'curso', title: 'Excel do básico ao avançado', detail: 'Curso online · 40h · certificado', price: 'R$ 197', place: '100% online', who: 'Escola Digital Pro', sponsored: true, photo: photo('realys-excel') },
  { id: 'l21', kind: 'curso', title: 'Graduação EAD em Administração', detail: 'Faculdade online · 4 anos · reconhecida pelo MEC', price: 'R$ 249/mês', place: 'Online, com polos presenciais', who: 'Faculdade Horizonte Digital', sponsored: false, photo: photo('realys-faculdade') },
  { id: 'l22', kind: 'curso', title: 'Pós-graduação em Marketing Digital', detail: 'Online · 12 meses · aulas ao vivo', price: 'R$ 189/mês', place: '100% online', who: 'Faculdade Horizonte Digital', sponsored: false, photo: photo('realys-pos') },
  { id: 'l23', kind: 'curso', title: 'Inglês conversação em grupo', detail: 'Aulas ao vivo 2x por semana', price: 'R$ 129/mês', place: 'Online ao vivo', who: 'Prof. Rafael Inglês', sponsored: false, photo: photo('realys-ingles') },
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
  { id: 'v5', title: 'Aula ao vivo: matemática para o Enem', host: 'Profa. Helena Matos', viewers: 412, sponsored: false, photo: photo('realys-live-aula', 800, 500), tag: 'Aula ao vivo', aula: true },
  { id: 'v6', title: 'Aula aberta: introdução à Administração', host: 'Faculdade Horizonte Digital', viewers: 865, sponsored: true, photo: photo('realys-live-facul', 800, 500), tag: 'Faculdade online', aula: true },
  { id: 'v7', title: 'Treino funcional em casa (30 min)', host: 'Thais Personal', viewers: 230, sponsored: false, photo: photo('realys-live-treino', 800, 500), tag: 'Aula ao vivo', aula: true },
  { id: 'v8', title: 'Esquenta de sexta direto do Club Neon', host: 'Club Neon', viewers: 640, sponsored: false, photo: photo('realys-live-balada', 800, 500), tag: 'Noite e eventos' },
];

export const liveComments = [
  'Que top! 🔥', 'Tem cupom?', 'Professor, pode repetir?', 'Entendi agora! 🙌', 'Chegou agora, o que perdi?', 'Quero esse!', 'Entrega em Campinas?', 'Muito bom 👏', 'Qual o preço?', 'Já comprei pelo app!',
];

// Stories do Início: o dia a dia, o lazer e as novidades de quem está no Realys.
// Somem em 24 h na versão real. contactId liga o story à conversa (para responder).
const storyPhoto = (seed) => photo(seed, 720, 1280);
export const stories = [
  {
    id: 's1', contactId: 'u1', name: 'Ana Paula', avatar: photo('realys-u-ana', 200, 200),
    items: [
      { id: 's1a', image: storyPhoto('realys-st-praia'), caption: 'Fim de tarde na praia 🌅', time: 'há 20 min' },
      { id: 's1b', image: storyPhoto('realys-st-acai'), caption: 'Açaí pedido pelo Realys, chegou geladinho 😋', time: 'há 15 min' },
    ],
  },
  {
    id: 's2', contactId: 'u2', name: 'Diego Santos', avatar: photo('realys-u-diego', 200, 200),
    items: [
      { id: 's2a', image: storyPhoto('realys-st-trilha'), caption: 'Trilha de domingo ⛰️', time: 'há 1 h' },
      { id: 's2b', image: storyPhoto('realys-st-cachoeira'), caption: 'Valeu a caminhada!', time: 'há 50 min' },
      { id: 's2c', image: storyPhoto('realys-st-churras'), caption: 'E o churrasco depois 🔥', time: 'há 30 min' },
    ],
  },
  {
    id: 's3', contactId: 'u5', name: 'Pizzaria da Praça', avatar: photo('realys-u-pizza', 200, 200), business: true, sponsored: true,
    cta: 'Pedir agora', ctaTo: { top: 'promo' },
    items: [{ id: 's3a', image: storyPhoto('realys-st-pizza'), caption: 'Hoje: pizza grande com 20% off só pelo Realys 🍕', time: 'patrocinado' }],
  },
  {
    id: 's4', contactId: 'u3', name: 'Lívia Martins', avatar: photo('realys-u-livia', 200, 200),
    items: [{ id: 's4a', image: storyPhoto('realys-st-show'), caption: 'Show incrível ontem 🎶', time: 'há 2 h' }],
  },
  {
    id: 's5', contactId: 'u4', name: 'Rogério Teixeira', avatar: photo('realys-u-rogerio', 200, 200),
    items: [
      { id: 's5a', image: storyPhoto('realys-st-pesca'), caption: 'Pescaria com os amigos 🎣', time: 'há 3 h' },
      { id: 's5b', image: storyPhoto('realys-st-lago'), caption: 'Que paz…', time: 'há 3 h' },
    ],
  },
  {
    id: 's6', contactId: 'st-club', name: 'Club Neon', avatar: photo('realys-u-club', 200, 200), business: true,
    cta: 'Comprar ingresso', ctaTo: { top: 'anuncios', kind: 'evento' },
    items: [{ id: 's6a', image: storyPhoto('realys-st-balada'), caption: 'Sexta tem DJ convidado. Lista VIP pelo app!', time: 'há 4 h' }],
  },
  {
    id: 's7', contactId: 'st-thais', name: 'Thais Personal', avatar: photo('realys-u-thais', 200, 200),
    items: [{ id: 's7a', image: storyPhoto('realys-st-treino'), caption: 'Treino de hoje concluído 💪', time: 'há 5 h' }],
  },
];

// Cores de fundo para quem publica um story só com texto.
export const STORY_BACKGROUNDS = ['#A8790A', '#2F74D0', '#6C5CE7', '#1E9E63', '#D9534F', '#1F2A44'];
// Fotos de exemplo para o story (na versão real vem da câmera ou da galeria).
export const STORY_SAMPLE_PHOTOS = [storyPhoto('realys-st-meu1'), storyPhoto('realys-st-meu2'), storyPhoto('realys-st-meu3')];

// Encontros: pessoas que cruzaram com você (radar com GPS). Tudo fictício.
// Só aparecem quem aceitou os termos E está com status disponível (solteiro, divorciado, viúvo).
// As duas pessoas "casada" e "namorando" estão aqui de propósito: o filtro do app tira elas da lista.
export const encounterPeople = [
  { id: 'e-1', name: 'Juliana', age: 29, gender: 'f', status: 'solteiro', optIn: true, km: 0.3, place: 'perto do Parque Ibirapuera', when: 'há 5 min', bio: 'Amo trilha, café coado e show ao vivo. Procurando alguém para dividir as aventuras.', tags: ['Trilhas', 'Música ao vivo', 'Café'], looking: 'Namoro', likesYou: true, photo: photo('realys-enc-juliana', 600, 800) },
  { id: 'e-2', name: 'Rafael', age: 33, gender: 'm', status: 'divorciado', optIn: true, km: 0.6, place: 'perto da Av. Paulista', when: 'há 12 min', bio: 'Pai de pet, cozinheiro de fim de semana e torcedor sofredor.', tags: ['Cozinhar', 'Futebol', 'Cachorros'], looking: 'Relacionamento sério', likesYou: false, photo: photo('realys-enc-rafael', 600, 800) },
  { id: 'e-3', name: 'Camila', age: 26, gender: 'f', status: 'solteiro', optIn: true, km: 0.9, place: 'no Shopping Center Norte', when: 'há 20 min', bio: 'Fotógrafa, viciada em pôr do sol e em série de suspense.', tags: ['Fotografia', 'Séries', 'Praia'], looking: 'Amizade', likesYou: true, photo: photo('realys-enc-camila', 600, 800) },
  { id: 'e-4', name: 'Bruno', age: 30, gender: 'm', status: 'solteiro', optIn: true, km: 1.2, place: 'perto do Mercado Municipal', when: 'há 35 min', bio: 'Engenheiro de dia, guitarrista de noite. Bora num samba?', tags: ['Samba', 'Violão', 'Viagens'], looking: 'Namoro', likesYou: true, photo: photo('realys-enc-bruno', 600, 800) },
  { id: 'e-5', name: 'Patrícia', age: 41, gender: 'f', status: 'viuvo', optIn: true, km: 1.8, place: 'perto da Vila Madalena', when: 'há 1 h', bio: 'Professora, leitora e dançarina de forró nas horas vagas.', tags: ['Forró', 'Livros', 'Teatro'], looking: 'Relacionamento sério', likesYou: false, photo: photo('realys-enc-patricia', 600, 800) },
  { id: 'e-6', name: 'Lucas', age: 27, gender: 'm', status: 'solteiro', optIn: true, km: 2.4, place: 'perto do Parque Villa-Lobos', when: 'há 1 h', bio: 'Corredor amador e fã de comida japonesa.', tags: ['Corrida', 'Comida japonesa', 'Games'], looking: 'Amizade', likesYou: false, photo: photo('realys-enc-lucas', 600, 800) },
  { id: 'e-7', name: 'Mariana', age: 35, gender: 'f', status: 'casado', optIn: false, km: 0.4, place: 'perto da Av. Paulista', when: 'há 3 min', bio: '', tags: [], looking: '', likesYou: false, photo: photo('realys-enc-x1', 600, 800) },
  { id: 'e-8', name: 'Felipe', age: 31, gender: 'm', status: 'namorando', optIn: true, km: 0.7, place: 'perto do Ibirapuera', when: 'há 8 min', bio: '', tags: [], looking: '', likesYou: true, photo: photo('realys-enc-x2', 600, 800) },
];
