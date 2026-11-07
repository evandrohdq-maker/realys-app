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
  { id: 'l13', kind: 'hotel', km: 690, title: 'Hotel Vista Mar · quarto casal', detail: 'Café da manhã, piscina e Wi-Fi · check-in 14h', price: 'R$ 380/diária', place: 'Balneário Camboriú - SC', who: 'Hotel Vista Mar', sponsored: true, photo: photo('realys-hotel1') },
  { id: 'l14', kind: 'hotel', km: 180, title: 'Pousada Recanto da Serra', detail: 'Chalé com lareira · aceita pet', price: 'R$ 290/diária', place: 'Campos do Jordão - SP', who: 'Pousada Recanto da Serra', sponsored: false, photo: photo('realys-pousada') },
  { id: 'l15', kind: 'hotel', km: 1.8, title: 'Hotel Executivo Centro', detail: 'Perto do metrô · sala de reunião', price: 'R$ 240/diária', place: 'Centro, São Paulo - SP', who: 'Rede Conforto Hotéis', sponsored: false, photo: photo('realys-hotel2') },
  { id: 'l24', kind: 'hotel', km: 0.7, title: 'Hotel Paulista Plaza · quarto duplo', detail: 'Café da manhã, academia e Wi-Fi · a 2 quadras da Av. Paulista', price: 'R$ 320/diária', place: 'Bela Vista, São Paulo - SP', who: 'Hotel Paulista Plaza', sponsored: true, photo: photo('realys-hotel-paulista') },
  { id: 'l25', kind: 'hotel', km: 4.2, title: 'Ibirapuera Park Hotel', detail: 'Piscina aquecida, spa e estacionamento · aceita pet', price: 'R$ 410/diária', place: 'Moema, São Paulo - SP', who: 'Ibirapuera Park Hotel', sponsored: false, photo: photo('realys-hotel-ibira') },
  { id: 'l26', kind: 'hotel', km: 5.0, title: 'Hostel Vila Madalena', detail: 'Quartos compartilhados e privativos · café incluso', price: 'R$ 89/diária', place: 'Vila Madalena, São Paulo - SP', who: 'Hostel Vila Madalena', sponsored: false, photo: photo('realys-hostel') },
  { id: 'l27', kind: 'hotel', km: 72, title: 'Hotel Orla Santos', detail: 'Vista para o mar e piscina · praia do Gonzaga', price: 'R$ 300/diária', place: 'Gonzaga, Santos - SP', who: 'Hotel Orla Santos', sponsored: false, photo: photo('realys-hotel-santos') },
  { id: 'l28', kind: 'hotel', km: 230, title: 'Pousada Maré Mansa', detail: 'Pé na areia · café caiçara e redário', price: 'R$ 260/diária', place: 'Ubatuba - SP', who: 'Pousada Maré Mansa', sponsored: false, photo: photo('realys-pousada-ubatuba') },
  { id: 'l16', kind: 'evento', title: 'Sexta Eletrônica · Club Neon', detail: 'Casa noturna · DJs convidados · a partir das 23h', price: 'R$ 60 ingresso', cta: 'Comprar ingresso', place: 'Vila Olímpia, São Paulo - SP', who: 'Club Neon', sponsored: true, photo: photo('realys-balada') },
  { id: 'l17', kind: 'evento', title: 'Samba no Quintal ao vivo', detail: 'Sábado · open bar opcional', price: 'R$ 45 ingresso', cta: 'Comprar ingresso', place: 'Lapa, Rio de Janeiro - RJ', who: 'Quintal do Samba', sponsored: false, photo: photo('realys-samba') },
  { id: 'l18', kind: 'evento', title: 'Salão de festas para 150 pessoas', detail: 'Cozinha, som e estacionamento', price: 'R$ 2.800/data', cta: 'Reservar data', place: 'Guarulhos - SP', who: 'Espaço Celebrar', sponsored: false, photo: photo('realys-salao') },
  { id: 'l19', kind: 'evento', title: 'Festival de Food Trucks', detail: 'Domingo · entrada gratuita · música ao vivo', price: 'Grátis', cta: 'Confirmar presença', place: 'Parque Central, Curitiba - PR', who: 'Prefeitura em Movimento', sponsored: false, photo: photo('realys-foodtruck') },
  { id: 'l20', kind: 'curso', title: 'Excel do básico ao avançado', detail: 'Curso online · 40h · certificado', price: 'R$ 197', place: '100% online', who: 'Escola Digital Pro', sponsored: true, photo: photo('realys-excel') },
  { id: 'l21', kind: 'curso', title: 'Graduação EAD em Administração', detail: 'Faculdade online · 4 anos · reconhecida pelo MEC', price: 'R$ 249/mês', place: 'Online, com polos presenciais', who: 'Faculdade Horizonte Digital', sponsored: false, photo: photo('realys-faculdade') },
  { id: 'l22', kind: 'curso', title: 'Pós-graduação em Marketing Digital', detail: 'Online · 12 meses · aulas ao vivo', price: 'R$ 189/mês', place: '100% online', who: 'Faculdade Horizonte Digital', sponsored: false, photo: photo('realys-pos') },
  { id: 'l23', kind: 'curso', title: 'Inglês conversação em grupo', detail: 'Aulas ao vivo 2x por semana', price: 'R$ 129/mês', place: 'Online ao vivo', who: 'Prof. Rafael Inglês', sponsored: false, photo: photo('realys-ingles') },
];

// Eventos (aba ao lado do Shop). Os dois primeiros subgrupos ficam em destaque:
// festas promocionais e anúncios de promoções.
export const EVENT_GROUPS = [
  { key: 'destaques', label: 'Destaques', icon: 'star-outline' },
  { key: 'festa-promo', label: 'Festas promocionais', icon: 'sparkles-outline', highlight: true },
  { key: 'promo-anuncio', label: 'Anúncios de promoções', icon: 'megaphone-outline', highlight: true },
  { key: 'shows', label: 'Shows e noite', icon: 'musical-notes-outline' },
  { key: 'espacos', label: 'Salões e espaços', icon: 'home-outline' },
  { key: 'gratis', label: 'Gratuitos', icon: 'gift-outline' },
];

export const events = [
  // Festas promocionais
  { id: 'e1', group: 'festa-promo', days: [5], start: 23, end: 5, km: 4.8, title: 'Open bar pela metade até 0h', detail: 'Sexta · Club Neon · DJs convidados', when: 'Sex · 23h', price: 'R$ 60', from: 'R$ 120', deal: '-50%', cta: 'Garantir ingresso', place: 'Vila Olímpia, São Paulo - SP', who: 'Club Neon', sponsored: true, photo: photo('realys-ev-openbar') },
  { id: 'e2', group: 'festa-promo', days: [6], start: 22, end: 5, km: 3.1, title: 'Aniversariante não paga', detail: 'Leve 5 amigos e ganhe camarote com espumante', when: 'Sáb · 22h', price: 'Grátis', from: 'R$ 80', deal: 'Aniversário', cta: 'Colocar nome na lista', place: 'Pinheiros, São Paulo - SP', who: 'Vibe House', sponsored: true, photo: photo('realys-ev-niver') },
  { id: 'e3', group: 'festa-promo', days: [6], start: 23, end: 5, km: 580, title: 'Lista VIP grátis até 23h30', detail: 'Festa Anos 2000 · nome na lista pelo app', when: 'Sáb · 23h', price: 'Grátis', from: 'R$ 50', deal: 'Lista VIP', cta: 'Colocar nome na lista', place: 'Savassi, Belo Horizonte - MG', who: 'Garagem Bar & Club', sponsored: false, photo: photo('realys-ev-2000') },
  { id: 'e4', group: 'festa-promo', days: [5], start: 22, end: 4, km: 900, title: 'Compre 1, leve 2 ingressos', detail: 'Baile Sertanejo com banda ao vivo', when: 'Sex · 22h', price: 'R$ 70', from: 'R$ 140', deal: '2 por 1', cta: 'Garantir ingresso', place: 'Goiânia - GO', who: 'Rancho Sertanejo', sponsored: false, photo: photo('realys-ev-sertanejo') },
  // Anúncios de promoções
  { id: 'e5', group: 'promo-anuncio', title: 'Happy hour em dobro', detail: 'Chopp e drinks em dobro de seg a qui, 17h às 20h', when: 'Seg a Qui', price: 'Em dobro', deal: 'Happy hour', cta: 'Ver promoção', place: 'Centro, Curitiba - PR', who: 'Bar do Alemão', sponsored: true, photo: photo('realys-ev-happy') },
  { id: 'e6', group: 'promo-anuncio', title: 'Rodízio pela metade às terças', detail: 'Pizza e massa à vontade · válido pelo Realys', when: 'Toda terça', price: 'R$ 39,90', from: 'R$ 79,90', deal: '-50%', cta: 'Reservar mesa', place: 'Moema, São Paulo - SP', who: 'Cantina Bella Nonna', sponsored: false, photo: photo('realys-ev-rodizio') },
  { id: 'e7', group: 'promo-anuncio', title: 'Combo balada: 4 drinks por R$ 50', detail: 'Pagando com saldo Realys na entrada', when: 'Fins de semana', price: 'R$ 50', from: 'R$ 88', deal: 'Combo', cta: 'Ver promoção', place: 'Lapa, Rio de Janeiro - RJ', who: 'Quintal do Samba', sponsored: false, photo: photo('realys-ev-combo') },
  { id: 'e8', group: 'promo-anuncio', title: 'Pacote festa infantil com 20% off', detail: 'Salão + buffet + decoração para 60 crianças', when: 'Datas em dezembro', price: 'R$ 3.200', from: 'R$ 4.000', deal: '-20%', cta: 'Pedir orçamento', place: 'Guarulhos - SP', who: 'Espaço Celebrar', sponsored: false, photo: photo('realys-ev-infantil') },
  // Outros eventos
  { id: 'e9', group: 'shows', days: [5], start: 23, end: 6, km: 4.8, title: 'Sexta Eletrônica · Club Neon', detail: 'Casa noturna · DJs convidados', when: 'Sex · 23h', price: 'R$ 60', cta: 'Comprar ingresso', place: 'Vila Olímpia, São Paulo - SP', who: 'Club Neon', sponsored: false, photo: photo('realys-balada') },
  { id: 'e10', group: 'shows', days: [6], start: 18, end: 24, km: 430, title: 'Samba no Quintal ao vivo', detail: 'Open bar opcional', when: 'Sáb · 18h', price: 'R$ 45', cta: 'Comprar ingresso', place: 'Lapa, Rio de Janeiro - RJ', who: 'Quintal do Samba', sponsored: false, photo: photo('realys-samba') },
  { id: 'e11', group: 'shows', days: [0], start: 19, end: 22, km: 2.5, title: 'Noite de Louvor ao vivo', detail: 'Banda Louvor Vivo · entrada solidária', when: 'Dom · 19h', price: 'R$ 20', cta: 'Comprar ingresso', place: 'São Paulo - SP', who: 'Banda Louvor Vivo', sponsored: false, photo: photo('realys-ev-louvor') },
  { id: 'e12', group: 'espacos', title: 'Salão de festas para 150 pessoas', detail: 'Cozinha, som e estacionamento', when: 'Escolha a data', price: 'R$ 2.800/data', cta: 'Reservar data', place: 'Guarulhos - SP', who: 'Espaço Celebrar', sponsored: false, photo: photo('realys-salao') },
  { id: 'e13', group: 'espacos', title: 'Chácara com piscina para eventos', detail: 'Até 80 pessoas · churrasqueira', when: 'Fins de semana', price: 'R$ 1.500/dia', cta: 'Reservar data', place: 'Atibaia - SP', who: 'Chácara Bem-Te-Vi', sponsored: false, photo: photo('realys-ev-chacara') },
  { id: 'e14', group: 'gratis', days: [0], start: 11, end: 18, km: 400, title: 'Festival de Food Trucks', detail: 'Entrada gratuita · música ao vivo', when: 'Dom · 11h', price: 'Grátis', cta: 'Confirmar presença', place: 'Parque Central, Curitiba - PR', who: 'Prefeitura em Movimento', sponsored: false, photo: photo('realys-foodtruck') },
  // Abertos quase toda noite (para a Lotus achar "a festa mais próxima aberta agora").
  { id: 'e15', group: 'shows', days: [0, 1, 2, 3, 4, 5, 6], start: 18, end: 2, km: 0.9, title: 'Pagode da Vila ao vivo', detail: 'Roda de samba e pagode · toda noite', when: 'Todo dia · 18h às 2h', price: 'R$ 25', cta: 'Comprar ingresso', place: 'Bela Vista, São Paulo - SP', who: 'Bar da Vila', sponsored: false, photo: photo('realys-ev-pagode') },
  { id: 'e16', group: 'festa-promo', days: [3, 4, 5, 6], start: 21, end: 4, km: 1.6, title: 'Aurora Lounge · DJ e drinks em dobro', detail: 'Festa com DJ residente · drinks em dobro até 23h', when: 'Qua a Sáb · 21h às 4h', price: 'R$ 40', from: 'R$ 60', deal: 'Drinks em dobro', cta: 'Garantir ingresso', place: 'Consolação, São Paulo - SP', who: 'Aurora Lounge', sponsored: true, photo: photo('realys-ev-aurora') },
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

// Lives: cat = assunto (src/liveData.js) · hostType/hostId = quem transmite e o perfil que abre.
export const lives = [
  { id: 'v1', sub: 'moda', gifts: 34, cat: 'compras', hostType: 'empresa', hostId: 'e3', title: 'Desfile coleção verão + cupom ao vivo', host: 'Moda Brasil', viewers: 1240, sponsored: true, photo: photo('realys-live-moda', 800, 500), tag: 'Compras ao vivo' },
  { id: 'v2', sub: 'restaurantes', cat: 'compras', hostType: 'empresa', hostId: 'e2', title: 'Pizza na pedra: assista a montagem', host: 'Pizzaria da Praça', viewers: 380, sponsored: false, photo: photo('realys-live-pizza', 800, 500), tag: 'Gastronomia' },
  { id: 'v3', sub: 'imoveis', cat: 'compras', hostType: 'empresa', hostId: null, title: 'Tour pelo apartamento à venda na Vila Mariana', host: 'Imobiliária Horizonte', viewers: 96, sponsored: false, photo: photo('realys-live-ap', 800, 500), tag: 'Imóveis' },
  { id: 'v4', sub: 'dicas', cat: 'comunidade', hostType: 'usuario', hostId: 'u1', title: 'Bate-papo: dicas para economizar no mercado', host: 'Ana Paula', viewers: 57, sponsored: false, photo: photo('realys-live-ana', 800, 500), tag: 'Comunidade' },
  { id: 'v5', sub: 'enem', cat: 'cursos', hostType: 'usuario', hostId: null, title: 'Aula ao vivo: matemática para o Enem', host: 'Profa. Helena Matos', viewers: 412, sponsored: false, photo: photo('realys-live-aula', 800, 500), tag: 'Aula ao vivo', aula: true },
  { id: 'v6', sub: 'aulas', cat: 'faculdades', hostType: 'empresa', hostId: null, title: 'Aula aberta: introdução à Administração', host: 'Faculdade Horizonte Digital', viewers: 865, sponsored: true, photo: photo('realys-live-facul', 800, 500), tag: 'Faculdade online', aula: true },
  { id: 'v7', sub: 'treino', cat: 'saude', hostType: 'prestador', hostId: 'v22', title: 'Treino funcional em casa (30 min)', host: 'Thais Personal', viewers: 230, sponsored: false, photo: photo('realys-live-treino', 800, 500), tag: 'Aula ao vivo', aula: true },
  { id: 'v8', sub: 'esquenta', cat: 'noite', hostType: 'empresa', hostId: null, title: 'Esquenta de sexta direto do Club Neon', host: 'Club Neon', viewers: 640, sponsored: false, photo: photo('realys-live-balada', 800, 500), tag: 'Noite e eventos' },
  // Gamers
  { id: 'v9', sub: 'futebol', gifts: 120, likes: 8000, cat: 'gamers', hostType: 'empresa', hostId: 'e4', title: 'Torneio Realys de futebol virtual: a grande final', host: 'Tech Center', viewers: 5420, sponsored: true, photo: photo('realys-live-torneio', 800, 500), tag: 'Campeonato' },
  { id: 'v10', sub: 'battle', gifts: 55, cat: 'gamers', hostType: 'usuario', hostId: 'u2', title: 'Ranqueada valendo vaga no campeonato', host: 'Diego Santos', viewers: 2310, sponsored: false, photo: photo('realys-live-ranked', 800, 500), tag: 'Gameplay' },
  // Artistas
  { id: 'v11', sub: 'gospel', gifts: 70, cat: 'artistas', hostType: 'artista', hostId: 'a1', title: 'Ensaio aberto: louvor ao vivo', host: 'Banda Louvor Vivo', viewers: 3100, sponsored: false, photo: photo('realys-live-louvor', 800, 500), tag: 'Show ao vivo' },
  { id: 'v12', sub: 'pedidos', gifts: 40, cat: 'artistas', hostType: 'artista', hostId: 'a2', title: 'Voz e viola: pedidos dos fãs', host: 'Duda Viola', viewers: 1180, sponsored: false, photo: photo('realys-live-viola', 800, 500), tag: 'Show ao vivo' },
  // Cursos e faculdades
  { id: 'v13', sub: 'oficinas', cat: 'cursos', hostType: 'prestador', hostId: 'v4', title: 'Oficina: troca de chuveiro com segurança', host: 'Pedro Alves', viewers: 340, sponsored: false, photo: photo('realys-live-eletrica', 800, 500), tag: 'Oficina', aula: true },
  { id: 'v14', sub: 'aulas', cat: 'faculdades', hostType: 'empresa', hostId: null, title: 'Aula aberta: Direito Digital e redes sociais', host: 'Universidade Aberta Brasil Sul', viewers: 920, sponsored: false, photo: photo('realys-live-direito', 800, 500), tag: 'Faculdade', aula: true },
  // Tecnologia
  { id: 'v15', sub: 'ia', cat: 'tecnologia', hostType: 'empresa', hostId: null, title: 'IA para pequenos negócios: na prática', host: 'NeuralBR Soluções', viewers: 760, sponsored: true, photo: photo('realys-live-ia', 800, 500), tag: 'Tecnologia' },
  { id: 'v16', sub: 'pc', gifts: 12, cat: 'tecnologia', hostType: 'empresa', hostId: 'e4', title: 'Montando um PC gamer do zero', host: 'Tech Center', viewers: 1450, sponsored: false, photo: photo('realys-live-pc', 800, 500), tag: 'Tecnologia' },
  // Noticiários (só canais verificados; a IA verificadora acompanha)
  { id: 'v17', sub: 'jornal', cat: 'noticias', hostType: 'empresa', hostId: null, title: 'Jornal da manhã: as notícias do dia', host: 'Realys Notícias', viewers: 4200, sponsored: false, photo: photo('realys-live-jornal', 800, 500), tag: 'Noticiário', verifiedNews: true },
  { id: 'v18', sub: 'agro', cat: 'noticias', hostType: 'empresa', hostId: null, title: 'Boletim do agro: cotações e clima', host: 'Canal Campo Hoje', viewers: 610, sponsored: false, photo: photo('realys-live-agro', 800, 500), tag: 'Noticiário', verifiedNews: true },
  // Podcasts
  { id: 'v19', sub: 'negocios', cat: 'podcasts', hostType: 'empresa', hostId: 'e1', title: 'Podcast Negócio de Bairro #42', host: 'Mercadinho Bom Preço', viewers: 380, sponsored: false, photo: photo('realys-live-podcast1', 800, 500), tag: 'Podcast' },
  { id: 'v20', sub: 'cotidiano', cat: 'podcasts', hostType: 'prestador', hostId: 'v2', title: 'Papo de Motoboy: a vida nas entregas', host: 'Marcos Silva', viewers: 520, sponsored: false, photo: photo('realys-live-podcast2', 800, 500), tag: 'Podcast' },
  { id: 'v21', sub: 'fe', cat: 'podcasts', hostType: 'usuario', hostId: 'u1', title: 'Fé e Família: conversa de domingo', host: 'Ana Paula', viewers: 290, sponsored: false, photo: photo('realys-live-podcast3', 800, 500), tag: 'Podcast' },
  // Fornecedores
  { id: 'v22', sub: 'atacado', cat: 'compras', hostType: 'fornecedor', hostId: 's2', title: 'Degustação e lote de café para cafeterias', host: 'Atacadão do Café', viewers: 210, sponsored: false, photo: photo('realys-live-cafe', 800, 500), tag: 'Atacado ao vivo' },
  { id: 'v23', sub: 'atacado', cat: 'compras', hostType: 'fornecedor', hostId: 's1', title: 'Feira virtual de atacado: preços para empresas', host: 'Distribuidora Real Alimentos', viewers: 330, sponsored: true, photo: photo('realys-live-atacado', 800, 500), tag: 'Atacado ao vivo' },
  // Mais Gamers
  { id: 'v24', sub: 'fps', gifts: 30, cat: 'gamers', hostType: 'usuario', hostId: null, title: 'Mira afiada: treino de FPS com os inscritos', host: 'Lucas Pro', viewers: 1870, sponsored: false, photo: photo('realys-live-fps', 800, 500), tag: 'Gameplay' },
  { id: 'v25', sub: 'mobile', cat: 'gamers', hostType: 'usuario', hostId: null, title: 'Jogos de celular: testando os lançamentos da semana', host: 'Bia Mobile', viewers: 940, sponsored: false, photo: photo('realys-live-mobile', 800, 500), tag: 'Gameplay' },
  { id: 'v26', sub: 'setup', cat: 'gamers', hostType: 'empresa', hostId: null, title: 'Setup gamer completo com desconto ao vivo', host: 'GameZone', viewers: 1320, sponsored: true, photo: photo('realys-live-setup', 800, 500), tag: 'Setup gamer' },
  { id: 'v27', sub: 'retro', cat: 'gamers', hostType: 'usuario', hostId: null, title: 'Zerando um clássico dos anos 90', host: 'Rafa Retrô', viewers: 610, sponsored: false, photo: photo('realys-live-retro', 800, 500), tag: 'Retrô' },
  // Esportes
  { id: 'v28', sub: 'futebol', cat: 'esportes', hostType: 'empresa', hostId: null, title: 'Final da Copa da Várzea: Unidos x Vila Nova', host: 'Liga Amadora da Zona Sul', viewers: 2780, sponsored: false, gifts: 45, photo: photo('realys-live-varzea', 800, 500), tag: 'Várzea ao vivo' },
  { id: 'v29', sub: 'lutas', cat: 'esportes', hostType: 'prestador', hostId: null, title: 'Treino aberto de jiu-jítsu', host: 'Academia Leão', viewers: 430, sponsored: false, photo: photo('realys-live-jiu', 800, 500), tag: 'Lutas' },
  // Saúde e bem-estar
  { id: 'v30', sub: 'yoga', cat: 'saude', hostType: 'prestador', hostId: null, title: 'Yoga para começar o dia (20 min)', host: 'Clara Yoga', viewers: 380, sponsored: false, photo: photo('realys-live-yoga', 800, 500), tag: 'Yoga' },
  // Fé
  { id: 'v31', sub: 'cultos', cat: 'fe', hostType: 'empresa', hostId: null, title: 'Culto de celebração ao vivo', host: 'Igreja Nova Aliança', viewers: 3650, sponsored: false, gifts: 20, photo: photo('realys-live-culto', 800, 500), tag: 'Culto' },
  { id: 'v32', sub: 'oracao', cat: 'fe', hostType: 'usuario', hostId: null, title: 'Círculo de oração: mande seu pedido', host: 'Pra. Marta Lima', viewers: 820, sponsored: false, photo: photo('realys-live-oracao', 800, 500), tag: 'Oração' },
  // Agro
  { id: 'v33', sub: 'leiloes', cat: 'agro', hostType: 'empresa', hostId: null, title: 'Leilão de gado nelore: lances pelo app', host: 'Leilões Campo Forte', viewers: 1540, sponsored: true, photo: photo('realys-live-leilao', 800, 500), tag: 'Leilão' },
  { id: 'v34', sub: 'cafe', cat: 'agro', hostType: 'fornecedor', hostId: 's2', title: 'Colheita do café: do pé à xícara', host: 'Atacadão do Café', viewers: 290, sponsored: false, photo: photo('realys-live-colheita', 800, 500), tag: 'Café' },
  // Negócios
  { id: 'v35', sub: 'rodadas', cat: 'negocios', hostType: 'fornecedor', hostId: 's1', title: 'Rodada de negócios: fornecedores x mercados', host: 'Distribuidora Real Alimentos', viewers: 410, sponsored: false, photo: photo('realys-live-rodada', 800, 500), tag: 'Rodada de negócios' },
  { id: 'v36', sub: 'mei', cat: 'negocios', hostType: 'usuario', hostId: null, title: 'MEI: como vender mais pelo Realys', host: 'Carla Empreende', viewers: 560, sponsored: false, photo: photo('realys-live-mei', 800, 500), tag: 'MEI' },
  // Culinária
  { id: 'v37', sub: 'churrasco', cat: 'culinaria', hostType: 'usuario', hostId: null, title: 'Costela fogo de chão ao vivo', host: 'Churrasqueiro Beto', viewers: 1090, sponsored: false, gifts: 25, photo: photo('realys-live-costela', 800, 500), tag: 'Churrasco' },
  { id: 'v38', sub: 'confeitaria', cat: 'culinaria', hostType: 'empresa', hostId: 'e8', title: 'Bolo de pote passo a passo', host: 'Doce Encanto Café', viewers: 470, sponsored: false, photo: photo('realys-live-bolo', 800, 500), tag: 'Confeitaria' },
  // Beleza e moda
  { id: 'v39', sub: 'maquiagem', cat: 'beleza', hostType: 'prestador', hostId: null, title: 'Make para festa em 15 minutos', host: 'Jéssica Make', viewers: 880, sponsored: false, photo: photo('realys-live-make', 800, 500), tag: 'Maquiagem' },
  { id: 'v40', sub: 'barbearia', cat: 'beleza', hostType: 'prestador', hostId: null, title: 'Degradê navalhado: técnica ao vivo', host: 'Barbearia do Neto', viewers: 520, sponsored: false, photo: photo('realys-live-barba', 800, 500), tag: 'Barbearia' },
  // Arte e criação
  { id: 'v41', sub: 'tatuagem', cat: 'arte', hostType: 'prestador', hostId: null, title: 'Tatuagem fine line do começo ao fim', host: 'Estúdio Traço Fino', viewers: 640, sponsored: false, photo: photo('realys-live-tattoo', 800, 500), tag: 'Tatuagem' },
  { id: 'v42', sub: 'desenho', cat: 'arte', hostType: 'artista', hostId: null, title: 'Pintando um retrato a óleo', host: 'Marina Arte', viewers: 350, sponsored: false, photo: photo('realys-live-pintura', 800, 500), tag: 'Pintura' },
  // Humor
  { id: 'v43', sub: 'standup', cat: 'humor', hostType: 'artista', hostId: null, title: 'Stand-up: histórias de motorista de app', host: 'Tiago Risada', viewers: 1720, sponsored: false, gifts: 38, photo: photo('realys-live-standup', 800, 500), tag: 'Stand-up' },
];

// Agenda de lives (para lembrar). O aviso chega quando a live começa.
export const upcomingLives = [
  { id: 'up1', cat: 'gamers', sub: 'campeonatos', title: 'Copa Realys de Battle Royale: rodada 2', host: 'Tech Center', hostType: 'empresa', hostId: 'e4', when: 'Hoje · 20h', photo: photo('realys-up-copa', 400, 250), prize: 'Prêmio de R$ 2.000 em créditos' },
  { id: 'up2', cat: 'gamers', sub: 'lancamentos', title: 'Primeiras horas do lançamento do mês', host: 'Diego Santos', hostType: 'usuario', hostId: 'u2', when: 'Amanhã · 19h', photo: photo('realys-up-lanc', 400, 250) },
  { id: 'up3', cat: 'artistas', sub: 'sertanejo', title: 'Live sertaneja: voz e violão', host: 'Duda Viola', hostType: 'artista', hostId: 'a2', when: 'Sáb · 21h', photo: photo('realys-up-sert', 400, 250) },
  { id: 'up4', cat: 'compras', sub: 'lancamentos', title: 'Lançamento: novo smartphone 5G com cupom', host: 'TechMais Celulares', hostType: 'empresa', hostId: null, when: 'Hoje · 18h', photo: photo('realys-up-cel', 400, 250), prize: 'Cupom só para quem assistir' },
  { id: 'up5', cat: 'fe', sub: 'cultos', title: 'Culto de domingo', host: 'Igreja Nova Aliança', hostType: 'empresa', hostId: null, when: 'Dom · 19h', photo: photo('realys-up-culto', 400, 250) },
  { id: 'up6', cat: 'esportes', sub: 'futebol', title: 'Semifinal da Copa da Várzea', host: 'Liga Amadora da Zona Sul', hostType: 'empresa', hostId: null, when: 'Dom · 10h', photo: photo('realys-up-semi', 400, 250) },
  { id: 'up7', cat: 'agro', sub: 'leiloes', title: 'Leilão de novilhas', host: 'Leilões Campo Forte', hostType: 'empresa', hostId: null, when: 'Qua · 14h', photo: photo('realys-up-novilha', 400, 250) },
  { id: 'up8', cat: 'cursos', sub: 'concursos', title: 'Aulão para concursos: português', host: 'Profa. Helena Matos', hostType: 'usuario', hostId: null, when: 'Amanhã · 20h', photo: photo('realys-up-aulao', 400, 250) },
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
    cta: 'Comprar ingresso', ctaTo: { top: 'eventos', group: 'festa-promo' },
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
  { id: 'e-1', job: 'Arquiteta', details: { altura: '1,61 a 1,70 m', religiao: 'Católica', filhos: 'Quero ter', estudo: 'Pós-graduação', bebida: 'Socialmente', cigarro: 'Não fumo', exercicio: 'Algumas vezes por semana', pets: 'Tenho gato', signo: 'Libra', encontro: 'Café ou sorvete' }, name: 'Juliana', age: 29, gender: 'f', status: 'solteiro', optIn: true, km: 0.3, place: 'perto do Parque Ibirapuera', when: 'há 5 min', bio: 'Amo trilha, café coado e show ao vivo. Procurando alguém para dividir as aventuras.', tags: ['Trilhas', 'Música ao vivo', 'Café'], looking: 'Namoro', likesYou: true, photo: photo('realys-enc-juliana', 600, 800) },
  { id: 'e-2', job: 'Chef de cozinha', details: { altura: '1,81 a 1,90 m', religiao: 'Evangélica', filhos: 'Tenho filhos', estudo: 'Técnico', bebida: 'Não bebo', cigarro: 'Não fumo', exercicio: 'De vez em quando', pets: 'Tenho cachorro', encontro: 'Jantar' }, name: 'Rafael', age: 33, gender: 'm', status: 'divorciado', optIn: true, km: 0.6, place: 'perto da Av. Paulista', when: 'há 12 min', bio: 'Pai de pet, cozinheiro de fim de semana e torcedor sofredor.', tags: ['Cozinhar', 'Futebol', 'Cachorros'], looking: 'Relacionamento sério', likesYou: false, photo: photo('realys-enc-rafael', 600, 800) },
  { id: 'e-3', job: 'Fotógrafa', details: { estudo: 'Superior', pets: 'Não tenho, mas gosto' }, name: 'Camila', age: 26, gender: 'f', status: 'solteiro', optIn: true, km: 0.9, place: 'no Shopping Center Norte', when: 'há 20 min', bio: 'Fotógrafa, viciada em pôr do sol e em série de suspense.', tags: ['Fotografia', 'Séries', 'Praia'], looking: 'Amizade', likesYou: true, photo: photo('realys-enc-camila', 600, 800) },
  { id: 'e-4', job: 'Engenheiro', details: { altura: '1,71 a 1,80 m', religiao: 'Sem religião', filhos: 'Ainda não sei', estudo: 'Superior', bebida: 'Socialmente', cigarro: 'Não fumo', exercicio: 'Algumas vezes por semana', pets: 'Não tenho, mas gosto', signo: 'Leão', encontro: 'Cinema ou show' }, name: 'Bruno', age: 30, gender: 'm', status: 'solteiro', optIn: true, km: 1.2, place: 'perto do Mercado Municipal', when: 'há 35 min', bio: 'Engenheiro de dia, guitarrista de noite. Bora num samba?', tags: ['Samba', 'Violão', 'Viagens'], looking: 'Namoro', likesYou: true, photo: photo('realys-enc-bruno', 600, 800) },
  { id: 'e-5', job: 'Professora', details: { altura: 'Até 1,60 m', religiao: 'Evangélica', filhos: 'Tenho filhos', estudo: 'Pós-graduação', bebida: 'Não bebo', cigarro: 'Não fumo', exercicio: 'De vez em quando', pets: 'Tenho gato', signo: 'Peixes', encontro: 'Culto ou missa' }, name: 'Patrícia', age: 41, gender: 'f', status: 'viuvo', optIn: true, km: 1.8, place: 'perto da Vila Madalena', when: 'há 1 h', bio: 'Professora, leitora e dançarina de forró nas horas vagas.', tags: ['Forró', 'Livros', 'Teatro'], looking: 'Relacionamento sério', likesYou: false, photo: photo('realys-enc-patricia', 600, 800) },
  { id: 'e-6', details: { exercicio: 'Todo dia' }, name: 'Lucas', age: 27, gender: 'm', status: 'solteiro', optIn: true, km: 2.4, place: 'perto do Parque Villa-Lobos', when: 'há 1 h', bio: 'Corredor amador e fã de comida japonesa.', tags: ['Corrida', 'Comida japonesa', 'Games'], looking: 'Amizade', likesYou: false, photo: photo('realys-enc-lucas', 600, 800) },
  { id: 'e-7', name: 'Mariana', age: 35, gender: 'f', status: 'casado', optIn: false, km: 0.4, place: 'perto da Av. Paulista', when: 'há 3 min', bio: '', tags: [], looking: '', likesYou: false, photo: photo('realys-enc-x1', 600, 800) },
  { id: 'e-8', name: 'Felipe', age: 31, gender: 'm', status: 'namorando', optIn: true, km: 0.7, place: 'perto do Ibirapuera', when: 'há 8 min', bio: '', tags: [], looking: '', likesYou: true, photo: photo('realys-enc-x2', 600, 800) },
];
