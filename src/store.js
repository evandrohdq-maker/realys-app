import { subscribeQuote } from './datePlans';
import { moderateAction } from './moderation';
import { MANDADOS_DEMO } from './empresaDemo';
import { Alert } from 'react-native';
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkText, claimOf } from './lm/factCheck';
import * as SecureStore from 'expo-secure-store';
import * as D from './data';
import { initialFriends } from './people';
import { brl } from './theme';
import { initialGifts, initialGiftCredits, giftFee, giftNet, GIFT_MIN, GIFT_MAX, liveGiftOf, liveGiftCost, initialLiveCredits, initialLiveGifts, LIVE_CONVERT_MIN, cashoutQuote } from './gifts';
import { INTEL_PLAN, subPlan } from './engage';
import { fareQuote, TARIFFS, surgeText } from './pricing';
import { protectionFee } from './guarantee';
import { pointsFor, pointOffer, giftPoints, initialPoints, promoDiscount, POINT_RULES, watchedToday } from './rewards';
import { initialLoyalty, onDelivered } from './loyalty';
import { conversations as initialConversations, communityPosts as initialCommunityPosts } from './homeData';
import * as J from './jobsData';
import { initialTestimonials, myInitialGallery } from './testimonialsData';
import { visitFee, visitDiscount, providerStats, splitFee, SAMPLE_VISIT_REQUESTS, HIGHLIGHT_PLAN } from './serviceVisits';
import { sampleAgenda, DEFAULT_HOURS, parseWhen } from './agenda';

const StoreContext = createContext(null);

let seq = 100;
const newId = (prefix) => `${prefix}${++seq}`;
const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Extrato da carteira Realys: depósitos, gastos, valores recebidos (serviços prestados) e saques.
// O saldo inicial da demonstração (R$ 750) é a soma deste histórico.
const daysAgo = (n, h = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d.getTime();
};
const initialWalletTx = [
  { id: 'w1', ts: daysAgo(27, 9), kind: 'deposito', cat: 'Depósito', desc: 'Depósito por Pix', amount: 400 },
  { id: 'w2', ts: daysAgo(22, 20), kind: 'gasto', cat: 'Food', desc: 'Pizzaria da Praça', amount: 62.9 },
  { id: 'w3', ts: daysAgo(18, 15), kind: 'recebido', cat: 'Serviço prestado', desc: 'Instalação elétrica para Diego Santos', amount: 180 },
  { id: 'w4', ts: daysAgo(15, 8), kind: 'gasto', cat: 'Transporte', desc: 'Passagem de ônibus (QR)', amount: 4.4 },
  { id: 'w5', ts: daysAgo(12, 17), kind: 'saque', cat: 'Saque', desc: 'Saque por Pix para sua conta', amount: 150 },
  { id: 'w6', ts: daysAgo(9, 11), kind: 'deposito', cat: 'Depósito', desc: 'Depósito por cartão', amount: 300 },
  { id: 'w7', ts: daysAgo(6, 19), kind: 'gasto', cat: 'Compras', desc: 'Mercadinho Bom Preço', amount: 96.4 },
  { id: 'w8', ts: daysAgo(4, 14), kind: 'recebido', cat: 'Serviço prestado', desc: 'Troca de chuveiro para Ana Paula', amount: 120 },
  { id: 'w9', ts: daysAgo(2, 21), kind: 'gasto', cat: 'Transporte', desc: 'Corrida de carro pelo Realys', amount: 23.7 },
  { id: 'w10', ts: daysAgo(1, 13), kind: 'recebido', cat: 'Transferência', desc: 'Recebido de Rogério Teixeira', amount: 87.4 },
];

// Que tipo de gasto cada ação do app gera no extrato (quando mexe no saldo).
const WALLET_CAT = {
  CHECKOUT: ['Compras', () => 'Compra nas lojas do Realys'],
  BUY_MEDIA: ['Artistas', () => 'Compra de música ou obra'],
  MEDIA_UPLOAD: ['Servidor', (a) => `Servidor Realys - ${(a.item && a.item.file) || 'arquivo'}`],
  MEDIA_PLAN: ['Servidor', () => 'Plano Artista Pro'],
  VENUE_ORDER: ['Food', (a) => `Pedido na mesa: ${a.items.map((it) => `${it.qty} ${it.name}`).join(', ')}`],
  BUY_TICKET: ['Eventos e passagens', (a) => (a.ticket && (a.ticket.title || a.ticket.name)) || 'Ingresso ou passagem'],
  SECTOR_ORDER: ['Compras', (a) => (a.item && a.item.title) || 'Compra'],
  // Módulo de Serviços (src/serviceVisits.js)
  VISIT_REQUEST: ['Serviços', (a) => `Taxa de visita retida: ${a.provider.name}`],
  VISIT_RESPOND: ['Serviços', () => 'Taxa de visita devolvida (pedido recusado)'],
  VISIT_NO_SHOW: ['Serviços', () => 'Taxa de visita devolvida (prestador não veio)'],
  PROVIDER_VISIT_CONFIRMED: ['Serviço prestado', (a) => `Taxa de visita liberada (sua parte)${a.client ? ` - ${a.client}` : ''}`],
  SET_HIGHLIGHT: ['Serviços', () => `Plano ${HIGHLIGHT_PLAN.name} (mensal)`],
};

const initialState = {
  ready: false, // vira true depois de ler a sessão salva (evita piscar a tela de login)
  user: null, // { name, roles: [], cnpj }
  panicAlerts: [], // alertas da chave de segurança dos motoristas (painel do administrador)
  documents: [], // contratos e receitas (src/documents.js)
  // Serviço público (src/publicServices.js): perfil aberto, publicações e horários novos dos órgãos.
  publicOpen: null, // { id, tab, at }
  publicPosts: [],
  publicEdits: {},
  publicSlots: [],
  // SUS do cidadão: Cartão Nacional de Saúde no próprio perfil e consultas agendadas pelo Realys.
  sus: null, // { cns, name, birth, unit }
  videoCall: null, // chamada de vídeo de saída: { to, name, kind, at } (src/components/LiveVideo.js)
  susBookings: [],
  docsOpen: null, // { mode: 'lista' | 'contrato' | 'receita', draft? } — tela de contratos e receitas
  activeRole: null,
  wallet: 750, // saldo em moeda Realys (1 RLS = R$ 1,00 na demonstração)
  walletTx: initialWalletTx, // extrato da carteira
  // Créditos de presente: chegam sem precisar aceitar, não podem ser sacados e só servem para
  // comprar produtos no Realys (ver src/gifts.js). gifts = presentes recebidos, enviados e usados.
  giftCredits: initialGiftCredits,
  gifts: initialGifts,
  giftOpen: null, // janela de presentear aberta: { to?, asCompany? }
  giftFees: 0, // taxas de presente que ficaram para o Realys nesta sessão
  // Presentes nas lives: créditos que ganhei transmitindo (viram moeda Realys quando eu converto).
  liveCredits: initialLiveCredits,
  liveGifts: initialLiveGifts, // presentes recebidos nas minhas lives
  spendLimit: 400, // limite de gastos do mês, definido pelo próprio usuário
  stores: D.stores,
  products: D.products,
  posts: D.posts,
  providers: D.providers,
  suppliers: D.suppliers,
  supplierItems: D.supplierItems,
  salesByDay: D.salesByDay,
  finance: D.finance,
  bills: D.upcomingBills,
  proposals: D.initialProposals,
  offers: D.initialOffers, // propostas que o fornecedor envia para as empresas
  conversations: initialConversations, // Comunidade › Mensagens (também recebe respostas de stories)
  storySeen: {},
  friends: initialFriends, // amizades: { id: 'amigo' | 'enviado' | 'recebido' }
  viewProfile: null, // id do membro cujo perfil está aberto (abre por cima de qualquer tela)
  myStories: [], // stories que o próprio usuário publicou
  communityPosts: initialCommunityPosts, // feed da Comunidade (na página de Stories)
  // Informações verificadas como falsas: saem da plataforma e do conhecimento da Lotus,
  // e ficam só marcadas como falsas para ela avisar quem perguntar (ver src/lm/factCheck.js).
  falseKnowledge: [
    { id: 'fk0', claim: 'Pix vai ser taxado em 10% a partir de segunda', reason: 'anuncia taxa sem fonte oficial', score: 96, source: 'Moderação', at: 'semana passada' },
  ],
  testimonials: initialTestimonials, // depoimentos (pendente → aprovado/recusado/oculto)
  tLiked: {}, // depoimentos que o usuário curtiu
  myGallery: myInitialGallery, // fotos, vídeos e destaques do próprio perfil
  // Encontros: só funciona depois que a pessoa aceita os termos e informa um status disponível.
  encontros: {
    accepted: false,
    termsVersion: null,
    status: null, // solteiro, divorciado, viuvo, namorando, uniao, casado
    looking: 'Namoro',
    interest: 'todos', // f, m, todos
    maxKm: 3,
    bio: '',
    job: '', // perfil de namoro (opcional): profissão, estilo de vida e gostos
    details: {},
    interests: [],
    radar: false, // GPS ligado para encontrar quem passa perto
    invisible: false,
    liked: {},
    passed: {},
    matches: [], // ids das pessoas
    chats: {}, // conversas do Encontros ficam só aqui, separadas da Comunidade
    blocked: {},
    charms: {}, // charmes enviados (curtida especial: a pessoa é avisada na hora)
    charmDay: '', // dia dos charmes usados (renova todo dia)
    charmsUsed: 0,
    ageMin: 18, // faixa de idade de quem aparece
    ageMax: 60,
    // Perfil do Date: só o primeiro nome (do cadastro verificado), álbum próprio escolhido pela
    // pessoa (nada da galeria vai sozinho) e, por padrão, o perfil social escondido dos crushes.
    album: [], // [{ id, uri }]; a primeira é a principal
    age: null, // na versão final vem da verificação do documento
    noKids: false, // confirmou que nenhuma foto do álbum mostra crianças
    showSocial: false, // mostrar o perfil da Realys para os crushes
  },
  orders: D.initialOrders,
  rideRequests: D.rideRequests,
  rides: [],
  // Serviços por visita: os pedidos do cliente, os que chegam para o prestador e os que ele aceitou.
  visits: [],
  visitRequests: SAMPLE_VISIT_REQUESTS,
  myVisits: [],
  // Agenda do prestador (src/agenda.js): compromissos, horário de trabalho e aviso antes de cada trabalho.
  agenda: sampleAgenda(),
  workHours: DEFAULT_HOURS,
  agendaRemind: 30,
  available: false,
  myProvider: null, // cadastro profissional de quem usa o perfil Prestador
  cart: [], // [{ productId, qty }]
  cartOpen: false, // janela do carrinho aberta
  mandados: MANDADOS_DEMO, // mandados de serviço (demonstração), compartilhados com a Lotus
  // Avaliações depois da entrega ou do serviço (ver src/ratings.js).
  ratings: [],
  rateOpen: null, // { kind: 'pedido' | 'servico', refId }
  // Pontos de avaliação e créditos promocionais dos parceiros (ver src/rewards.js).
  points: initialPoints,
  pointsLog: [],
  promoCredits: [], // { id, offerId, kind, partnerId?, service?, partner, title, value, used }
  // Engajamento entre os lados (src/engage.js)
  navReq: null, // pedido de navegação vindo de um componente: { go, at }
  reverseRequests: [], // pedidos ao contrário que eu postei: { id, kind, text, deadline, budget, offers, status, accepted }
  reverseSent: {}, // propostas que eu (prestador/fornecedor) mandei: { [idDoPedido]: { price, note } }
  groupJoins: {}, // compras coletivas que a empresa entrou: { [id]: quantidade }
  subscriptions: [], // assinaturas: { id, planId, next, status }
  nudgesDismissed: {}, // lembretes da Lotus dispensados
  intelPlan: false, // empresa assina o painel de inteligência
  protectionFees: 0, // taxas de proteção Realys recebidas nesta sessão (demonstração)
  // Notícias e Alertas (src/newsData.js)
  alertsDismissed: {}, // alertas que a pessoa fechou na faixa do topo
  safeAt: null, // quando marcou "Estou seguro" (os contatos são avisados)
  newsReports: [], // relatos que a pessoa mandou: vão para a moderação antes de aparecer
  disputes: [], // casos da Garantia Realys: { id, kind, refId, title, reason, text, amount, status, outcome, at }
  boosts: [], // boosts e anúncios comprados com pontos ou saldo: { id, offerId, target, title, start, until, paidWith, status }
  loyalty: initialLoyalty, // Clube Realys: pedidos entregues, selos por loja (ver src/loyalty.js)
  loyaltyNotes: [], // avisos de bônus que acabaram de sair
  // Comanda no estabelecimento (src/venueData.js): onde o cliente está, a mesa, os pedidos
  // e os avisos que chegam no caixa do lugar.
  venue: null, // { id, kind, name, title, menu, table? }
  venueOpen: false,
  venueOrders: [], // { id, venueId, venue, table, items, total, status, at }
  staffFeed: [], // avisos do caixa: { id, venueId, text, orderId, at }
  reservations: {}, // { [venueId]: mesa }
  // Lives: a minha no ar (aparece na aba Lives e no meu perfil) e a que estou assistindo pelo perfil de alguém.
  myLive: null, // { id, cat, hostType, hostId, host, title, viewers, mine: true }
  watchLive: null,
  viewProvider: null, // perfil de prestador aberto por cima de qualquer tela
  previewProvider: null, // prévia do perfil de trabalho aberta pela pesquisa (só para analisar)
  liked: {},
  reports: D.reports,
  signups: D.pendingSignups,
  blocked: [],
  handsFree: false, // ouvir o comando "abrir Lotus" para abrir a assistente
  viewCompany: null, // página pública aberta (empresa ou artista)
  following: {}, // páginas que o cliente segue
  myPage: {}, // apresentação editada da minha empresa
  myMedia: [], // músicas, vídeos e obras que a minha empresa/artista publicou
  // Página empresarial da minha empresa: áreas e segmentos, onde atende, vitrine,
  // depoimentos expostos e vídeos de propaganda (ver src/companyBusiness.js).
  myBusiness: null,
  companyReviews: {}, // depoimentos que o cliente escreveu: { [empresaId]: [...] }
  // Meu perfil: dados que o usuário edita e quem pode ver cada parte.
  myProfile: { handle: '', profession: '', city: '', bio: '', photo: null, links: '', social: null, quiz: null },
  // social = fotos, vídeos, destaques e depoimentos · portfolio = Estúdio (trabalhos e criações)
  // 'todos' | 'amigos' | 'eu'. exposed = false deixa o perfil invisível para todo mundo.
  privacy: { exposed: true, social: 'todos', portfolio: 'todos' },
  // Estúdio: tudo que o usuário cria (música, vídeo, arte, foto, projeto). dest diz onde aparece:
  // social (perfil da Comunidade), portfolio (vitrine profissional do perfil), empresa (página do CNPJ).
  creations: [],
  mediaPlan: false, // Plano Artista Pro ativo
  boughtMedia: {}, // faixas e obras compradas pelo cliente
  tickets: [], // passagens de transporte público
  notes: [], // anotações do administrador sobre o que mudar em cada tela (ficam salvas no celular)
  // RH: vagas de outras empresas, vagas da minha empresa (com candidatos) e candidaturas do cliente.
  jobs: J.jobs,
  myJobs: J.myJobs,
  applications: {}, // { jobId: 'enviada' }
  // Nota fiscal eletrônica emitida automaticamente a cada venda (simulada na demonstração).
  nfeSeq: 1240,
  // Publicidade paga do Shop e do Food (src/adsData.js): visualizações e toques de cada anúncio,
  // e os clipes que o cliente já assistiu até o fim (cada um dá pontos uma vez só).
  adStats: {}, // { [adId]: { views, taps, watched } }
  adRewards: {}, // { [clipId]: true }
  liveFollows: [], // classes de live que a pessoa segue (recebe aviso quando alguém abre live)
  liveReminders: {}, // { [idDaLiveAgendada]: true }
};

const nfeNumber = (n) => String(n).padStart(6, '0');

// Compra B2B fechada: o estoque da minha empresa sobe e a saída entra no financeiro.
function applyPurchase(state, itemId, qty, discount) {
  const item = state.supplierItems.find((i) => i.id === itemId);
  const total = qty * item.unitPrice * (1 - discount / 100);
  const existing = state.products.find((p) => p.storeId === D.MY_COMPANY_ID && p.name === item.name);
  const products = existing
    ? state.products.map((p) => (p.id === existing.id ? { ...p, stock: p.stock + qty } : p))
    : [
        ...state.products,
        {
          id: newId('p'),
          storeId: D.MY_COMPANY_ID,
          name: item.name,
          price: +(item.unitPrice * 1.4).toFixed(2),
          cost: item.unitPrice,
          stock: qty,
          minStock: 10,
          emoji: item.emoji,
          tint: '#EEF2F5',
          featured: false,
        },
      ];
  const supplier = state.suppliers.find((s) => s.id === item.supplierId);
  return {
    ...state,
    products,
    finance: [
      { id: newId('m'), date: today(), desc: `Fornecedor - ${supplier.name} (B2B)`, type: 'saida', value: +total.toFixed(2) },
      ...state.finance,
    ],
  };
}

// Proposta da empresa aceita pelo fornecedor (ou contraproposta aceita pela empresa).
function closeDeal(state, proposal, discount) {
  const next = applyPurchase(state, proposal.itemId, proposal.qty, discount);
  return { ...next, proposals: state.proposals.map((p) => (p.id === proposal.id ? { ...p, status: 'aceita', discount } : p)) };
}

// Proposta do fornecedor aceita. Se for para a minha empresa, entra no estoque e no caixa.
function closeOffer(state, offer, discount) {
  const next = offer.companyId === D.MY_COMPANY_ID ? applyPurchase(state, offer.itemId, offer.qty, discount) : state;
  return { ...next, offers: state.offers.map((o) => (o.id === offer.id ? { ...o, status: 'aceita', discount } : o)) };
}

// Toda conta (empresa, prestador, fornecedor) também é Usuário: pode consumir dentro do Realys.
// Perfil de Empresa (e de Fornecedor) só para contas com CNPJ: conta de CPF nunca recebe esses acessos.
const withUserRole = (user) => {
  let roles = (user && user.roles) || [];
  const isAdmin = roles.includes('admin');
  if (!isAdmin && user.cpf) roles = roles.filter((r) => r !== 'empresa' && r !== 'fornecedor');
  if (!roles.includes('cliente')) roles = [...roles, 'cliente'];
  return { ...user, roles };
};

// Atualiza o cadastro do prestador e a lista que os clientes veem (se ele está disponível).
function withMyProvider(state, me) {
  const others = state.providers.filter((p) => p.id !== 'me');
  return { ...state, myProvider: me, providers: state.available ? [...others, me] : others };
}

// Food chama um motoboy já cadastrado no Realys: o mais perto que faz entregas.
function pickCourier(state) {
  const list = (state.providers || []).filter((p) => p.service === 'motoboy').sort((a, b) => a.distanceKm - b.distanceKm);
  return list[0] || null;
}

// Toda ação que mexe no saldo entra sozinha no extrato da carteira.
// O perfil social respondido no cadastro (classe, subclasse, descrição) vira o perfil da pessoa,
// a não ser que ela já tenha editado o perfil depois.
function withSignupProfile(profile, user) {
  if (!user || !user.social || (profile && profile.social)) return profile;
  return {
    ...profile,
    social: user.social,
    quiz: { about: user.about || '', work: user.work || '', hobbies: [] },
    bio: profile.bio || user.about || '',
    profession: profile.profession || user.work || '',
  };
}

// Pontos de quem manda presente (1 por real + bônus a cada 10 presentes enviados).
function giftPointsPatch(state, amount, desc) {
  const sent = (state.gifts || []).filter((g) => g.dir === 'enviado').length;
  const p = giftPoints(amount, sent);
  return {
    points: state.points + p.total,
    pointsLog: [{ id: newId('pt'), points: p.total, desc: `${desc}${p.bonus ? ` (+${p.bonus} de bônus por repetição)` : ''}`, at: Date.now() }, ...state.pointsLog],
  };
}

function reducer(state, a) {
  const next = baseReducer(state, a);
  if (!next || next === state || next.wallet === state.wallet || next.walletTx !== state.walletTx || a.type === 'LOGOUT') return next;
  const diff = +(next.wallet - state.wallet).toFixed(2);
  const [cat, desc] = WALLET_CAT[a.type] || [diff > 0 ? 'Entrada' : 'Outros gastos', () => (diff > 0 ? 'Entrada na carteira' : 'Pagamento no Realys')];
  const tx = { id: newId('w'), ts: Date.now(), kind: diff > 0 ? 'recebido' : 'gasto', cat, desc: desc(a), amount: Math.abs(diff) };
  return { ...next, walletTx: [tx, ...next.walletTx] };
}

function baseReducer(state, a) {
  switch (a.type) {
    case 'LOGIN': {
      const user = withUserRole(a.user);
      return { ...state, ready: true, user, activeRole: user.roles[0], myProfile: withSignupProfile(state.myProfile, user) };
    }
    // Abriu o app com sessão salva: entra direto, sem senha.
    case 'RESTORE_SESSION': {
      if (!a.session || !a.session.user) return { ...state, ready: true };
      const user = withUserRole(a.session.user);
      const roles = user.roles;
      const role = roles.includes(a.session.activeRole) ? a.session.activeRole : roles[0];
      return { ...state, ready: true, user, activeRole: role, myProfile: withSignupProfile(state.myProfile, user) };
    }
    case 'LOGOUT':
      return { ...initialState, ready: true, notes: state.notes, handsFree: state.handsFree };
    case 'SET_HANDSFREE':
      return { ...state, handsFree: a.on };
    case 'LOAD_NOTES':
      return { ...state, notes: a.notes };
    case 'ADD_NOTE':
      return { ...state, notes: [{ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), done: false, at: new Date().toISOString(), ...a.note }, ...state.notes] };
    case 'TOGGLE_NOTE':
      return { ...state, notes: state.notes.map((n) => (n.id === a.id ? { ...n, done: !n.done } : n)) };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== a.id) };
    case 'RESOLVE_REPORT': {
      const rp = state.reports.find((r) => r.id === a.id);
      const fake = rp && rp.kind === 'Fake news' && a.status !== 'arquivada';
      return {
        ...state,
        reports: state.reports.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)),
        // Fake news confirmada: o post sai do feed e a afirmação vira "informação falsa" para a Lotus.
        communityPosts: rp && rp.postId
          ? fake
            ? state.communityPosts.filter((c) => c.id !== rp.postId)
            : state.communityPosts.map((c) => (c.id === rp.postId ? { ...c, flagged: false } : c))
          : state.communityPosts,
        falseKnowledge: fake
          ? [{ id: newId('fk'), claim: rp.claim || rp.detail, reason: 'confirmada pela Moderação', score: rp.aiScore, source: rp.target, at: 'agora' }, ...state.falseKnowledge]
          : state.falseKnowledge,
        blocked: a.status === 'bloqueado' ? [...state.blocked, rp.target] : state.blocked,
      };
    }
    case 'REVIEW_SIGNUP':
      return { ...state, signups: state.signups.map((g) => (g.id === a.id ? { ...g, status: a.status } : g)) };
    case 'UNBLOCK':
      return { ...state, blocked: state.blocked.filter((b) => b !== a.name) };
    case 'SET_ROLE':
      return { ...state, activeRole: a.role };

    case 'TOGGLE_LIKE':
      return { ...state, liked: { ...state.liked, [a.id]: !state.liked[a.id] } };

    case 'ADD_TO_CART': {
      const found = state.cart.find((c) => c.productId === a.productId);
      const cart = found
        ? state.cart.map((c) => (c.productId === a.productId ? { ...c, qty: c.qty + 1 } : c))
        : [...state.cart, { productId: a.productId, qty: 1 }];
      return { ...state, cart };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((c) => c.productId !== a.productId) };
    // Mais um / menos um no carrinho (chegando a zero, sai do carrinho).
    case 'CART_QTY':
      return {
        ...state,
        cart: state.cart.map((c) => (c.productId === a.productId ? { ...c, qty: c.qty + a.delta } : c)).filter((c) => c.qty > 0),
      };
    // Carrinho em janela: abre de qualquer tela (ícone no topo, barra da loja ou pela Lotus).
    case 'MANDADOS_UPDATE':
      return { ...state, mandados: a.updater(state.mandados) };
    case 'OPEN_CART':
      return { ...state, cartOpen: true };
    case 'CLOSE_CART':
      return { ...state, cartOpen: false };

    case 'CHECKOUT': {
      const lines = state.cart.map((c) => ({ ...c, product: state.products.find((p) => p.id === c.productId) }));
      const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      // Créditos promocionais dos parceiros: descontam sozinhos nas compras daquela loja.
      const { off: promoOff, used: promoUsed } = promoDiscount(state, lines);
      // Taxa de proteção Realys (R$ 0,99, isenta para Score Diamante): vai para o Realys.
      const protection = lines.length ? protectionFee(state) : 0;
      const toPay = +(total - promoOff + protection).toFixed(2);
      if (!lines.length || toPay > state.wallet + state.giftCredits) return state;
      // Créditos de presente pagam primeiro; o resto sai do saldo.
      const fromGift = +Math.min(state.giftCredits, toPay).toFixed(2);
      const mine = lines.filter((l) => l.product.storeId === D.MY_COMPANY_ID);
      const mineTotal = mine.reduce((s, l) => s + l.product.price * l.qty, 0);
      const storeNames = [...new Set(lines.map((l) => state.stores.find((s) => s.id === l.product.storeId).name))];
      const salesByDay = state.salesByDay.map((d, i, arr) =>
        i === arr.length - 1 ? { ...d, value: d.value + mineTotal } : d
      );
      const nfe = nfeNumber(state.nfeSeq + 1);
      // Pedido de comida: o restaurante solicita um motoboy cadastrado na plataforma.
      const foodStores = [...new Set(lines.map((l) => state.stores.find((s) => s.id === l.product.storeId)).filter((s) => D.isFoodStore(s)).map((s) => s.name))];
      const courier = foodStores.length ? pickCourier(state) : null;
      return {
        ...state,
        nfeSeq: state.nfeSeq + 1,
        protectionFees: +((state.protectionFees || 0) + protection).toFixed(2),
        wallet: +(state.wallet - (toPay - fromGift)).toFixed(2),
        cart: [],
        promoCredits: (state.promoCredits || []).map((pc) => (promoUsed[pc.id] ? { ...pc, used: true } : pc)),
        giftCredits: +(state.giftCredits - fromGift).toFixed(2),
        gifts: fromGift ? [{ id: newId('gu'), dir: 'usado', amount: fromGift, desc: storeNames.join(', '), at: Date.now() }, ...state.gifts] : state.gifts,
        products: state.products.map((p) => {
          const l = lines.find((x) => x.productId === p.id);
          return l ? { ...p, stock: Math.max(0, p.stock - l.qty) } : p;
        }),
        orders: [
          {
            id: newId('o'),
            at: Date.now(),
            items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
            total: +toPay.toFixed(2),
            promoOff: promoOff ? +promoOff.toFixed(2) : undefined,
            protectionFee: protection || undefined,
            status: 'Pagamento protegido',
            store: storeNames.join(', '),
            courier: courier ? courier.name : null,
            courierId: courier ? courier.id : null,
            food: !!foodStores.length,
            requestedBy: foodStores.join(', '),
            nfe,
          },
          ...state.orders,
        ],
        // O pedido de entrega também chega para os motoboys (perfil Prestador).
        rideRequests: courier
          ? [{ id: newId('r'), client: foodStores.join(', '), service: 'Entrega de comida (Food)', from: foodStores.join(', '), to: 'Endereço do cliente', price: +(courier.price + 1.5 * 2).toFixed(2), distanceKm: 2 }, ...state.rideRequests]
          : state.rideRequests,
        finance: mineTotal
          ? [{ id: newId('m'), date: today(), desc: `Venda no app Realys · NF-e ${nfe}`, type: 'entrada', value: +mineTotal.toFixed(2) }, ...state.finance]
          : state.finance,
        salesByDay,
      };
    }
    case 'ADVANCE_ORDER': {
      const flow = ['Pagamento protegido', 'Preparando', 'A caminho', 'Entregue'];
      const cur = state.orders.find((x) => x.id === a.id);
      // Entregou: conta para o Clube Realys (selos, bônus de 20 pedidos e pontos por compra).
      const club = cur && cur.status === 'A caminho' ? onDelivered(state, cur) : null;
      return {
        ...state,
        ...(club
          ? {
              loyalty: club.loyalty,
              points: state.points + club.points,
              pointsLog: club.points ? [{ id: newId('pt'), points: club.points, desc: `Compra: ${cur.store}`, at: Date.now() }, ...state.pointsLog] : state.pointsLog,
              promoCredits: [...club.credits.map((c) => ({ id: newId('pc'), used: false, ...c })), ...state.promoCredits],
              loyaltyNotes: club.notes,
            }
          : {}),
        orders: state.orders.map((o) => {
          if (o.id !== a.id) return o;
          const next = flow[Math.min(flow.indexOf(o.status) + 1, flow.length - 1)];
          return { ...o, status: next, courier: o.courier || 'Marcos Silva', ...(next === 'Entregue' && o.status !== 'Entregue' ? { deliveredAt: Date.now() } : {}) };
        }),
        // Entregou: já abre a avaliação do pedido.
        rateOpen: (() => {
          const o = state.orders.find((x) => x.id === a.id);
          return o && o.status === 'A caminho' && !o.rated ? { kind: 'pedido', refId: o.id } : state.rateOpen;
        })(),
      };
    }

    case 'UPDATE_STOCK':
      return {
        ...state,
        products: state.products.map((p) => (p.id === a.id ? { ...p, stock: Math.max(0, p.stock + a.delta) } : p)),
      };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [
          ...state.products,
          { id: newId('p'), storeId: D.MY_COMPANY_ID, minStock: 5, emoji: '📦', tint: '#EEF2F5', featured: false, ...a.product },
        ],
      };
    case 'COUNTER_SALE': {
      const p = state.products.find((x) => x.id === a.id);
      if (!p || p.stock < 1) return state;
      return {
        ...state,
        nfeSeq: state.nfeSeq + 1,
        products: state.products.map((x) => (x.id === a.id ? { ...x, stock: x.stock - 1 } : x)),
        finance: [{ id: newId('m'), date: today(), desc: `Balcão - ${p.name} · NF-e ${nfeNumber(state.nfeSeq + 1)}`, type: 'entrada', value: p.price }, ...state.finance],
        salesByDay: state.salesByDay.map((d, i, arr) => (i === arr.length - 1 ? { ...d, value: d.value + p.price } : d)),
      };
    }
    case 'ADD_EXPENSE':
      return {
        ...state,
        finance: [{ id: newId('m'), date: today(), type: 'saida', ...a.entry }, ...state.finance],
      };

    case 'SEND_PROPOSAL':
      return {
        ...state,
        proposals: [
          { id: newId('pr'), itemId: a.itemId, qty: a.qty, discount: a.discount, status: 'pendente', counter: null, buyer: 'Mercadinho Bom Preço', createdAt: 'Agora' },
          ...state.proposals,
        ],
      };
    case 'SUPPLIER_RESPOND': {
      const p = state.proposals.find((x) => x.id === a.id);
      if (a.answer === 'aceitar') return closeDeal(state, p, p.discount);
      if (a.answer === 'recusar')
        return { ...state, proposals: state.proposals.map((x) => (x.id === a.id ? { ...x, status: 'recusada' } : x)) };
      return {
        ...state,
        proposals: state.proposals.map((x) => (x.id === a.id ? { ...x, status: 'contraproposta', counter: a.counter } : x)),
      };
    }
    // Fornecedor: destacar produto, cadastrar produto e enviar proposta direto para empresas.
    case 'SUPPLIER_TOGGLE_FEATURED':
      return { ...state, supplierItems: state.supplierItems.map((i) => (i.id === a.id ? { ...i, featured: !i.featured } : i)) };
    case 'SUPPLIER_ADD_ITEM':
      return {
        ...state,
        supplierItems: [{ id: newId('si'), supplierId: D.MY_SUPPLIER_ID, tiers: [], featured: true, ...a.item }, ...state.supplierItems],
      };
    case 'SUPPLIER_SEND_OFFER':
      return {
        ...state,
        offers: [
          ...a.companyIds.map((companyId) => ({
            id: newId('of'),
            itemId: a.itemId,
            companyId,
            qty: a.qty,
            discount: a.discount,
            note: a.note,
            validUntil: a.validUntil,
            status: 'pendente',
            counter: null,
            createdAt: 'Agora',
          })),
          ...state.offers,
        ],
      };
    case 'SUPPLIER_ACCEPT_COUNTER': {
      const o = state.offers.find((x) => x.id === a.id);
      return closeOffer(state, o, o.counter);
    }
    case 'COMPANY_RESPOND_OFFER': {
      const o = state.offers.find((x) => x.id === a.id);
      if (a.answer === 'aceitar') return closeOffer(state, o, o.discount);
      if (a.answer === 'recusar') return { ...state, offers: state.offers.map((x) => (x.id === a.id ? { ...x, status: 'recusada' } : x)) };
      return { ...state, offers: state.offers.map((x) => (x.id === a.id ? { ...x, status: 'contraproposta', counter: a.counter } : x)) };
    }

    // Encontros
    case 'ENC_SET':
      return { ...state, encontros: { ...state.encontros, ...a.patch } };
    case 'ENC_SET_STATUS': {
      // Status de relacionamento indisponível desliga tudo: radar, visibilidade e notificações.
      const off = !a.allowed;
      return { ...state, encontros: { ...state.encontros, status: a.status, ...(off ? { radar: false, accepted: false } : {}) } };
    }
    case 'ENC_LIKE': {
      const e = state.encontros;
      const match = a.mutual && !e.matches.includes(a.id);
      return { ...state, encontros: { ...e, liked: { ...e.liked, [a.id]: true }, matches: match ? [a.id, ...e.matches] : e.matches } };
    }
    case 'ENC_CHARM': {
      // Charme: curtida especial, limitada por dia. Se a pessoa já curtiu você, vira crush na hora.
      const e = state.encontros;
      const today = new Date().toDateString();
      const used = e.charmDay === today ? e.charmsUsed : 0;
      const match = a.mutual && !e.matches.includes(a.id);
      return {
        ...state,
        encontros: {
          ...e,
          liked: { ...e.liked, [a.id]: true },
          charms: { ...e.charms, [a.id]: true },
          charmDay: today,
          charmsUsed: used + 1,
          matches: match ? [a.id, ...e.matches] : e.matches,
        },
      };
    }
    case 'ENC_PASS':
      return { ...state, encontros: { ...state.encontros, passed: { ...state.encontros.passed, [a.id]: true } } };
    case 'ENC_UNMATCH': {
      const e = state.encontros;
      return {
        ...state,
        encontros: {
          ...e,
          matches: e.matches.filter((m) => m !== a.id),
          chats: { ...e.chats, [a.id]: undefined },
          blocked: a.block ? { ...e.blocked, [a.id]: true } : e.blocked,
        },
      };
    }
    case 'ENC_MSG': {
      const e = state.encontros;
      return { ...state, encontros: { ...e, chats: { ...e.chats, [a.id]: [...(e.chats[a.id] || []), a.msg] } } };
    }
    case 'ENC_LEAVE':
      // Sair do Encontros apaga perfil, curtidas e matches (como prometido nos termos).
      return {
        ...state,
        encontros: { ...initialState.encontros, status: state.encontros.status },
      };

    // Amizades e perfil de outros membros.
    case 'FRIEND': {
      const friends = { ...state.friends };
      if (a.status) friends[a.id] = a.status;
      else delete friends[a.id];
      return { ...state, friends };
    }
    case 'OPEN_PROFILE':
      return { ...state, viewProfile: a.id };
    case 'CLOSE_PROFILE':
      return { ...state, viewProfile: null };

    // Páginas de empresas e artistas.
    case 'OPEN_COMPANY':
      // product: abre a loja já mostrando esse produto em destaque (ex.: tocou no item do carrinho).
      return { ...state, viewCompany: a.id, viewProduct: a.product || null };
    case 'CLOSE_COMPANY':
      return { ...state, viewCompany: null, viewProduct: null };
    case 'FOLLOW': {
      const following = { ...state.following };
      if (following[a.id]) delete following[a.id];
      else following[a.id] = true;
      return { ...state, following };
    }
    case 'SET_PAGE':
      return { ...state, myPage: { ...state.myPage, ...a.page } };
    // Empresa publica um vídeo de propaganda: paga o servidor (ou usa o plano) e aparece na página.
    case 'AD_UPLOAD': {
      const mine = state.myBusiness || {};
      return {
        ...state,
        wallet: +(state.wallet - a.fee).toFixed(2),
        myBusiness: { ...mine, newAds: [a.ad, ...(mine.newAds || [])] },
        finance: a.fee
          ? [{ id: newId('m'), date: today(), desc: `Servidor Realys - propaganda ${a.ad.file}`, type: 'saida', value: a.fee }, ...state.finance]
          : state.finance,
      };
    }
    case 'SET_BUSINESS':
      return { ...state, myBusiness: { ...(state.myBusiness || {}), ...a.patch } };
    // Cliente que comprou escreve um depoimento. Na minha empresa ele chega para eu aprovar.
    case 'ADD_COMPANY_REVIEW':
      if (checkText(a.review.text).verdict === 'falso') return state;
      return { ...state, companyReviews: { ...state.companyReviews, [a.id]: [a.review, ...(state.companyReviews[a.id] || [])] } };
    case 'BUY_MEDIA':
      return { ...state, wallet: +(state.wallet - a.price).toFixed(2), boughtMedia: { ...state.boughtMedia, [a.id]: true } };
    // Artista/empresa sobe um arquivo: paga o servidor e a despesa entra no fluxo de caixa.
    case 'MEDIA_UPLOAD':
      return {
        ...state,
        wallet: +(state.wallet - a.fee).toFixed(2),
        myMedia: [a.item, ...state.myMedia],
        finance: a.fee
          ? [{ id: newId('m'), date: today(), desc: `Servidor Realys - ${a.item.file}`, type: 'saida', value: a.fee }, ...state.finance]
          : state.finance,
      };
    case 'SET_MY_PROFILE':
      return { ...state, myProfile: { ...state.myProfile, ...a.profile } };
    case 'SET_PRIVACY':
      return { ...state, privacy: { ...state.privacy, ...a.privacy } };
    case 'LOAD_PROFILE':
      return { ...state, myProfile: withSignupProfile({ ...state.myProfile, ...(a.data.myProfile || {}) }, state.user), privacy: { ...state.privacy, ...(a.data.privacy || {}) }, creations: a.data.creations || state.creations, myPage: a.data.myPage || state.myPage, myBusiness: a.data.myBusiness || state.myBusiness, agenda: a.data.agenda || state.agenda, workHours: a.data.workHours || state.workHours, agendaRemind: a.data.agendaRemind != null ? a.data.agendaRemind : state.agendaRemind };
    case 'ADD_CREATION':
      return { ...state, creations: [a.item, ...state.creations] };
    case 'UPDATE_CREATION':
      return { ...state, creations: state.creations.map((c) => (c.id === a.id ? { ...c, ...a.patch, dest: { ...c.dest, ...((a.patch && a.patch.dest) || {}) } } : c)) };
    case 'REMOVE_CREATION':
      return { ...state, creations: state.creations.filter((c) => c.id !== a.id) };
    case 'MEDIA_REMOVE':
      return { ...state, myMedia: state.myMedia.filter((m) => m.id !== a.id) };
    case 'MEDIA_PLAN':
      return {
        ...state,
        mediaPlan: true,
        wallet: +(state.wallet - a.price).toFixed(2),
        finance: [{ id: newId('m'), date: today(), desc: 'Plano Artista Pro (servidor)', type: 'saida', value: a.price }, ...state.finance],
      };
    // Chegou no lugar (ingresso do evento ou check-in no bar). Se reservou mesa, já fica nela.
    case 'VENUE_ENTER':
      return {
        ...state,
        venue: { ...a.venue, table: a.table || state.reservations[a.venue.id] || null },
        venueOpen: !!a.open,
        // Entrou no evento com o ingresso: ele passa para "Concluídos" em Meus pedidos.
        tickets: a.eventId ? state.tickets.map((t) => (t.eventId === a.eventId ? { ...t, used: true } : t)) : state.tickets,
      };
    case 'VENUE_RESERVE':
      return { ...state, reservations: { ...state.reservations, [a.venueId]: a.table }, venue: state.venue && state.venue.id === a.venueId ? { ...state.venue, table: a.table } : state.venue };
    case 'VENUE_SET_TABLE':
      return { ...state, venue: state.venue ? { ...state.venue, table: a.table } : state.venue };
    case 'VENUE_LEAVE':
      return { ...state, venue: null, venueOpen: false };
    case 'OPEN_VENUE':
      return { ...state, venueOpen: true };
    case 'CLOSE_VENUE':
      return { ...state, venueOpen: false };
    // Pedido na mesa: paga pelo Realys (créditos de presente primeiro) e avisa o caixa do lugar.
    case 'VENUE_ORDER': {
      const v = state.venue;
      const total = +a.items.reduce((x, it) => x + it.price * it.qty, 0).toFixed(2);
      if (!v || !total || total > state.wallet + state.giftCredits) return state;
      const fromGift = +Math.min(state.giftCredits, total).toFixed(2);
      const who = (state.user && state.user.name) || 'Cliente';
      const id = newId('vo');
      const what = a.items.map((it) => `${it.qty} ${it.name}`).join(', ');
      return {
        ...state,
        wallet: +(state.wallet - (total - fromGift)).toFixed(2),
        giftCredits: +(state.giftCredits - fromGift).toFixed(2),
        gifts: fromGift ? [{ id: newId('gu'), dir: 'usado', amount: fromGift, desc: v.name, at: Date.now() }, ...state.gifts] : state.gifts,
        venueOrders: [{ id, venueId: v.id, venue: v.name, table: v.table, items: a.items, total, status: 'Recebido no caixa', at: Date.now() }, ...state.venueOrders],
        staffFeed: [{ id: newId('sf'), venueId: v.id, orderId: id, text: `${v.table ? `Mesa ${v.table}` : 'Balcão'} · ${who} pediu ${what}`, total, at: Date.now() }, ...state.staffFeed],
      };
    }
    case 'VENUE_ORDER_STATUS':
      return { ...state, venueOrders: state.venueOrders.map((o) => (o.id === a.id ? { ...o, status: a.status } : o)) };
    case 'LIVE_START':
      return { ...state, myLive: { ...a.live, id: 'my-live', mine: true } };
    case 'LIVE_END':
      return { ...state, myLive: null };
    case 'WATCH_LIVE':
      return { ...state, watchLive: a.id, viewCompany: null, viewProfile: null, viewProvider: null };
    case 'CLOSE_WATCH':
      return { ...state, watchLive: null };
    case 'OPEN_PROVIDER':
      return { ...state, viewProvider: a.id, watchLive: null };
    case 'CLOSE_PROVIDER':
      return { ...state, viewProvider: null };
    case 'PREVIEW_PROVIDER':
      return { ...state, previewProvider: a.id };
    case 'CLOSE_PREVIEW_PROVIDER':
      return { ...state, previewProvider: null };
    // Ingresso de evento ou passagem: também aparece em Meus pedidos (aba Ingressos e Despesas).
    case 'BUY_TICKET':
      return {
        ...state,
        wallet: +(state.wallet - (a.ticket.price || 0)).toFixed(2),
        tickets: [{ at: Date.now(), kind: a.ticket.eventId ? 'evento' : 'passagem', used: false, ...a.ticket }, ...state.tickets],
      };
    case 'TICKET_USED':
      return { ...state, tickets: state.tickets.map((t) => (t.id === a.id ? { ...t, used: !t.used } : t)) };
    // Compra, assinatura ou inscrição feita nas abas Tecnologia e Agro: vira um pedido.
    case 'SECTOR_ORDER': {
      const it = a.item;
      const price = it.price || 0;
      if (price > state.wallet + state.giftCredits) return state;
      const nfe = price ? nfeNumber(state.nfeSeq + 1) : null;
      const fromGift = +Math.min(state.giftCredits, price).toFixed(2);
      return {
        ...state,
        nfeSeq: price ? state.nfeSeq + 1 : state.nfeSeq,
        wallet: +(state.wallet - (price - fromGift)).toFixed(2),
        giftCredits: +(state.giftCredits - fromGift).toFixed(2),
        gifts: fromGift ? [{ id: newId('gu'), dir: 'usado', amount: fromGift, desc: it.title, at: Date.now() }, ...state.gifts] : state.gifts,
        orders: [
          { id: newId('o'), at: Date.now(), items: [{ name: it.title, qty: 1, price }], total: price, status: 'Pagamento protegido', store: it.who, courier: null, nfe },
          ...state.orders,
        ],
      };
    }

    // Mensagens e stories (compartilhados entre o Início e a página de Stories).
    case 'UPDATE_CONVS':
      return { ...state, conversations: a.fn(state.conversations) };
    case 'STORY_SEEN':
      return state.storySeen[a.id] ? state : { ...state, storySeen: { ...state.storySeen, [a.id]: true } };
    // Depoimentos
    case 'T_SEND':
      return {
        ...state,
        testimonials: [
          { id: newId('t'), from: 'me', to: a.to, text: a.text, time: 'agora', status: 'pendente', likes: 0, shares: 0, comments: [] },
          ...state.testimonials,
        ],
      };
    case 'T_RESPOND': // aprovado | recusado | oculto (tirado do perfil)
      return { ...state, testimonials: state.testimonials.map((t) => (t.id === a.id ? { ...t, status: a.status, time: a.status === 'aprovado' && t.from === 'me' ? 'agora' : t.time } : t)) };
    case 'T_APPROVE_LAST_FROM_ME': {
      // Demonstração: o amigo aprova o depoimento que você mandou.
      const t = state.testimonials.find((x) => x.from === 'me' && x.to === a.to && x.status === 'pendente');
      return t ? { ...state, testimonials: state.testimonials.map((x) => (x.id === t.id ? { ...x, status: 'aprovado', time: 'agora' } : x)) } : state;
    }
    case 'T_LIKE': {
      const on = !state.tLiked[a.id];
      const tLiked = { ...state.tLiked };
      if (on) tLiked[a.id] = true;
      else delete tLiked[a.id];
      return { ...state, tLiked, testimonials: state.testimonials.map((t) => (t.id === a.id ? { ...t, likes: t.likes + (on ? 1 : -1) } : t)) };
    }
    case 'T_COMMENT':
      return {
        ...state,
        testimonials: state.testimonials.map((t) => (t.id === a.id ? { ...t, comments: [...t.comments, { id: newId('c'), who: a.who, text: a.text, mine: true }] } : t)),
      };
    case 'T_SHARE':
      return { ...state, testimonials: state.testimonials.map((t) => (t.id === a.id ? { ...t, shares: t.shares + 1 } : t)) };
    // Galeria do próprio perfil: kind = photos | videos | highlights
    case 'GALLERY_ADD':
      return { ...state, myGallery: { ...state.myGallery, [a.kind]: [...a.items, ...state.myGallery[a.kind]] } };
    case 'GALLERY_REMOVE':
      return { ...state, myGallery: { ...state.myGallery, [a.kind]: state.myGallery[a.kind].filter((x) => x.id !== a.id) } };
    // Todo post passa pela IA verificadora antes de entrar no feed.
    case 'POST_PUBLISH': {
      const check = checkText(a.post.text);
      if (check.verdict === 'falso') {
        // Fake news: não entra na plataforma nem no conhecimento da Lotus; fica marcada como falsa.
        return {
          ...state,
          falseKnowledge: [{ id: newId('fk'), claim: claimOf(a.post.text), reason: check.reasons.join(', '), score: check.score, source: `Post de ${a.post.author || 'usuário'}`, at: 'agora' }, ...state.falseKnowledge],
          reports: [{ id: newId('rp'), kind: 'Fake news', target: `Post de ${a.post.author || 'usuário'}`, detail: `Removido pela IA antes de publicar: "${claimOf(a.post.text)}"`, claim: claimOf(a.post.text), aiScore: check.score, status: 'removido', count: 1 }, ...state.reports],
        };
      }
      if (check.verdict === 'suspeito') {
        // Suspeito: aparece, mas a Lotus não aprende com ele até o administrador decidir.
        const post = { ...a.post, flagged: true };
        return {
          ...state,
          communityPosts: [post, ...state.communityPosts],
          reports: [{ id: newId('rp'), kind: 'Fake news', target: `Post de ${a.post.author || 'usuário'}`, detail: `A IA achou suspeito (${check.reasons.join(', ')}): "${claimOf(a.post.text)}"`, claim: claimOf(a.post.text), postId: post.id, aiScore: check.score, status: 'aberta', count: 1 }, ...state.reports],
        };
      }
      return { ...state, communityPosts: [a.post, ...state.communityPosts] };
    }
    case 'PUBLISH_STORY':
      return { ...state, myStories: [...state.myStories, a.item] };

    case 'BUYER_ACCEPT_COUNTER': {
      const p = state.proposals.find((x) => x.id === a.id);
      return closeDeal(state, p, p.counter);
    }

    case 'TOGGLE_AVAILABLE': {
      const available = !state.available;
      // Ao ficar disponível com cadastro feito, o prestador aparece para os clientes (e para a voz da Lotus).
      const others = state.providers.filter((p) => p.id !== 'me');
      const providers = available && state.myProvider ? [...others, state.myProvider] : others;
      return { ...state, available, providers };
    }
    case 'SAVE_MY_PROVIDER': {
      const me = {
        id: 'me',
        name: state.user ? state.user.name : 'Prestador',
        rating: 5.0,
        distanceKm: 0.5,
        vehicle: null,
        plate: null,
        photo: null,
        // Prestador novo: começa com o impulso de visibilidade dos primeiros 30 dias.
        done90: 0,
        responseRate: 100,
        responseMin: 0,
        noShows: 0,
        joinedDays: 0,
        sponsored: false,
        ...(state.myProvider || {}),
        ...a.profile,
      };
      const others = state.providers.filter((p) => p.id !== 'me');
      return { ...state, myProvider: me, providers: state.available ? [...others, me] : others };
    }
    // Carteira: depositar, sacar e definir o limite de gastos do mês.
    case 'OPEN_GIFT':
      return { ...state, giftOpen: { to: a.to || null, asCompany: !!a.asCompany } };
    case 'CLOSE_GIFT':
      return { ...state, giftOpen: null };
    // Presente: sai do saldo de quem dá só o valor; a taxa do Realys sai de dentro do presente e entra na hora para quem recebe,
    // como crédito de presente (não precisa aceitar, não dá para sacar, só compra no Realys).
    case 'SEND_GIFT': {
      const amount = +Number(a.amount).toFixed(2);
      const fee = giftFee(amount);
      if (!(amount >= GIFT_MIN) || amount > GIFT_MAX || amount > state.wallet || !a.to) return state;
      const company = a.asCompany ? state.stores.find((x) => x.id === D.MY_COMPANY_ID) : null;
      const gift = {
        id: newId('gf'),
        dir: 'enviado',
        to: a.to,
        from: company ? { name: company.name, kind: 'empresa', logo: company.logo } : { name: (state.user && state.user.name) || 'Você', kind: 'pessoa' },
        amount,
        fee,
        net: +(amount - fee).toFixed(2), // o que chega para quem recebe
        occasion: a.occasion,
        message: a.message,
        at: Date.now(),
        status: 'Entregue',
      };
      return {
        ...state,
        wallet: +(state.wallet - amount).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'gasto', cat: 'Presentes', desc: `Presente para ${a.to.name} (${brl(amount)}; recebe ${brl(amount - fee)}, taxa ${brl(fee)})`, amount }, ...state.walletTx],
        gifts: [gift, ...state.gifts],
        giftFees: +(state.giftFees + fee).toFixed(2),
        ...giftPointsPatch(state, amount, `Presente para ${a.to.name}`),
        finance: company ? [{ id: newId('m'), date: today(), desc: `Presente para cliente ${a.to.name}`, type: 'saida', value: amount }, ...state.finance] : state.finance,
      };
    }
    // Presente numa live: sai do saldo de quem assiste só o valor; quem transmite recebe o valor menos a taxa.
    case 'SEND_LIVE_GIFT': {
      const g = liveGiftOf(a.gift);
      const qty = Math.max(1, Math.floor(a.qty || 1));
      const { value, fee, total } = liveGiftCost(g, qty);
      if (!a.live || a.live.mine || total > state.wallet) return state;
      return {
        ...state,
        wallet: +(state.wallet - total).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'gasto', cat: 'Presentes', desc: `Live de ${a.live.host}: ${g.emoji} ${g.name}${qty > 1 ? ` x${qty}` : ''} (${brl(value)}; quem transmite recebe ${brl(value - fee)})`, amount: total }, ...state.walletTx],
        gifts: [{ id: newId('gf'), dir: 'enviado', to: { name: a.live.host, kind: 'live' }, amount: value, fee, occasion: `${g.emoji} ${g.name}${qty > 1 ? ` x${qty}` : ''} na live`, message: a.live.title, at: Date.now(), status: 'Entregue' }, ...state.gifts],
        giftFees: +(state.giftFees + fee).toFixed(2),
        ...giftPointsPatch(state, value, `Presente na live de ${a.live.host}`),
      };
    }
    // Alguém mandou presente na MINHA live: entra na hora como crédito de live.
    case 'RECEIVE_LIVE_GIFT': {
      const g = liveGiftOf(a.gift);
      const qty = Math.max(1, Math.floor(a.qty || 1));
      // Chega o valor do presente menos a taxa do Realys.
      const value = giftNet(+(g.value * qty).toFixed(2));
      return {
        ...state,
        liveCredits: +(state.liveCredits + value).toFixed(2),
        liveGifts: [{ id: newId('lg'), from: a.from, gift: g.key, qty, value, live: (state.myLive && state.myLive.title) || 'Minha live', at: Date.now() }, ...state.liveGifts].slice(0, 60),
      };
    }
    // Converter créditos de live em moeda Realys: 1 crédito = 1 RLS, direto no saldo da carteira.
    case 'CONVERT_LIVE_CREDITS': {
      const v = +Math.min(state.liveCredits, Number(a.amount || state.liveCredits)).toFixed(2);
      if (!(v >= LIVE_CONVERT_MIN)) return state;
      // Viram créditos de presente (moeda Realys para usar dentro do app). Sacar dinheiro só pelo
      // saque de presentes recebidos (50.000 pontos, 10% de taxa): ver GIFT_CASHOUT.
      return {
        ...state,
        liveCredits: +(state.liveCredits - v).toFixed(2),
        giftCredits: +(state.giftCredits + v).toFixed(2),
      };
    }
    // Saque dos presentes recebidos: tudo o que juntou (créditos de presente + de live), a partir de
    // 50.000 pontos (R$ 500). O Realys fica com 10%; o resto vai por Pix.
    case 'GIFT_CASHOUT': {
      const q = cashoutQuote(state, !!a.early);
      if (!q.ok) return state;
      return {
        ...state,
        giftCredits: 0,
        liveCredits: 0,
        cashoutFees: +((state.cashoutFees || 0) + q.fee).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'saque', cat: 'Saque de presentes', desc: `Saque${q.early ? ' antecipado' : ''} de presentes recebidos para ${a.dest} (${q.points.toLocaleString('pt-BR')} pontos; você fica com ${q.keep}% de ${brl(q.giftValue)} em presentes; taxa ${brl(q.fee)})`, amount: q.net }, ...state.walletTx],
      };
    }
    case 'WALLET_DEPOSIT': {
      const v = +Number(a.amount).toFixed(2);
      if (!(v > 0)) return state;
      return {
        ...state,
        wallet: +(state.wallet + v).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'deposito', cat: 'Depósito', desc: `Depósito por ${a.method}`, amount: v }, ...state.walletTx],
      };
    }
    case 'WALLET_WITHDRAW': {
      const v = +Number(a.amount).toFixed(2);
      if (!(v > 0) || v > state.wallet) return state;
      return {
        ...state,
        wallet: +(state.wallet - v).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'saque', cat: 'Saque', desc: `Saque por Pix para ${a.dest}`, amount: v }, ...state.walletTx],
      };
    }
    case 'WALLET_LIMIT':
      return { ...state, spendLimit: Math.max(0, Number(a.value) || 0) };
    // Prestador aceita o pedido: o valor do serviço entra na carteira (pagamento protegido liberado).
    case 'ACCEPT_RIDE_REQUEST': {
      const req = state.rideRequests.find((r) => r.id === a.id);
      const price = (req && Number(req.price)) || 0;
      if (!req) return state;
      return {
        ...state,
        wallet: +(state.wallet + price).toFixed(2),
        walletTx: price
          ? [{ id: newId('w'), ts: Date.now(), kind: 'recebido', cat: 'Serviço prestado', desc: `Serviço: ${req.service || req.kind || req.from || 'pedido aceito'}${req.client ? ` para ${req.client}` : ''}`, amount: price }, ...state.walletTx]
          : state.walletTx,
        rideRequests: state.rideRequests.filter((r) => r.id !== a.id),
        rides: [{ ...req, status: 'Em andamento', acceptedAt: Date.now() }, ...state.rides],
      };
    }
    // Serviço terminado (cliente confirmou e pagou pelo Realys): abre a avaliação do prestador.
    case 'FINISH_CALL':
      return {
        ...state,
        rides: state.rides.map((r) => (r.id === a.id ? { ...r, done: true, doneAt: Date.now(), status: `${r.serviceLabel} concluído` } : r)),
        rateOpen: { kind: 'servico', refId: a.id },
      };
    case 'OPEN_RATE':
      return { ...state, rateOpen: { kind: a.kind, refId: a.refId } };
    case 'CLOSE_RATE':
      return { ...state, rateOpen: null };
    case 'CLEAR_LOYALTY_NOTES':
      return { ...state, loyaltyNotes: [] };
    // Avaliação enviada: entra na nota do prestador/motoboy e, para lojas, vira depoimento verificado.
    case 'SUBMIT_RATING': {
      const at = Date.now();
      const items = a.items.filter((it) => it.stars > 0);
      if (!items.length) return { ...state, rateOpen: null };
      const ratings = [...items.map((it) => ({ id: newId('rt'), kind: a.kind, refId: a.refId, ...it, at })), ...state.ratings];
      const providers = state.providers.map((p) => {
        const it = items.find((x) => x.targetId === p.id && x.type !== 'loja' && x.type !== 'food');
        if (!it) return p;
        const n = p.ratingCount || 40;
        return { ...p, rating: +(((p.rating * n) + it.stars) / (n + 1)).toFixed(2), ratingCount: n + 1 };
      });
      let companyReviews = state.companyReviews;
      items
        .filter((it) => it.type === 'loja' || it.type === 'food')
        .forEach((it) => {
          const text = (it.text || '').trim() || (it.tags.length ? it.tags.join(', ') + '.' : `Nota ${it.stars} de 5.`);
          if (checkText(text).verdict === 'falso') return;
          const review = { id: newId('rv'), who: 'me', stars: it.stars, text, product: a.product || '', time: 'agora', verified: true, shown: it.targetId !== D.MY_COMPANY_ID };
          companyReviews = { ...companyReviews, [it.targetId]: [review, ...(companyReviews[it.targetId] || [])] };
        });
      const earned = pointsFor(items);
      return {
        ...state,
        ratings,
        providers,
        companyReviews,
        points: state.points + earned,
        pointsLog: [{ id: newId('pt'), points: earned, desc: `Avaliação: ${items.map((it) => it.targetName).join(', ')}`, at }, ...state.pointsLog],
        rateOpen: null,
        orders: a.kind === 'pedido' ? state.orders.map((o) => (o.id === a.refId ? { ...o, rated: true } : o)) : state.orders,
        rides: a.kind === 'servico' ? state.rides.map((r) => (r.id === a.refId ? { ...r, rated: true } : r)) : state.rides,
        visits: a.kind === 'visita' ? state.visits.map((v) => (v.id === a.refId ? { ...v, rated: true } : v)) : state.visits,
      };
    }
    // Troca pontos por um crédito promocional de um parceiro.
    // ---------- Publicidade e promoções do Shop e do Food (src/adsData.js) ----------
    case 'AD_EVENT': {
      const cur = state.adStats[a.id] || { views: 0, taps: 0, watched: 0 };
      return { ...state, adStats: { ...state.adStats, [a.id]: { ...cur, [a.ev]: (cur[a.ev] || 0) + 1 } } };
    }
    // ---------- Notícias e Alertas ----------
    case 'ALERT_DISMISS':
      return { ...state, alertsDismissed: { ...state.alertsDismissed, [a.id]: true } };
    case 'MARK_SAFE':
      return { ...state, safeAt: Date.now() };
    case 'NEWS_REPORT':
      return { ...state, newsReports: [{ id: newId('rp'), area: a.area, text: a.text, status: 'em moderação', at: Date.now() }, ...state.newsReports] };
    // ---------- Garantia Realys (src/guarantee.js) ----------
    case 'DISPUTE_OPEN': {
      if (state.disputes.some((d) => d.refId === a.refId && d.status === 'em análise')) return state;
      return { ...state, disputes: [{ id: newId('gr'), kind: a.kind, refId: a.refId, title: a.title, reason: a.reason, text: a.text || '', amount: a.amount, giftPart: a.giftPart || 0, status: 'em análise', at: Date.now() }, ...state.disputes] };
    }
    // Decisão do Realys. Demonstração: a favor do cliente, o valor pago pelo Realys volta para a carteira.
    case 'DISPUTE_RESOLVE': {
      const d = state.disputes.find((x) => x.id === a.id);
      if (!d || d.status !== 'em análise') return state;
      const refund = a.favor !== false;
      const now = Date.now();
      return {
        ...state,
        disputes: state.disputes.map((x) => (x.id === d.id ? { ...x, status: 'resolvido', outcome: refund ? 'reembolsado' : 'negado', resolvedAt: now } : x)),
        ...(refund
          ? {
              // O que veio de créditos de presente volta como crédito de presente (não vira saque).
              wallet: +(state.wallet + d.amount - (d.giftPart || 0)).toFixed(2),
              giftCredits: +(state.giftCredits + (d.giftPart || 0)).toFixed(2),
              walletTx: [{ id: newId('w'), ts: now, kind: 'deposito', cat: 'Garantia Realys', desc: `Reembolso: ${d.title}`, amount: d.amount }, ...state.walletTx],
              orders: d.kind === 'pedido' ? state.orders.map((o) => (o.id === d.refId ? { ...o, status: 'Reembolsado' } : o)) : state.orders,
              visits: d.kind === 'visita' ? state.visits.map((v) => (v.id === d.refId ? { ...v, status: 'reembolsada' } : v)) : state.visits,
            }
          : {}),
      };
    }
    // ---------- Engajamento entre os lados (src/engage.js) ----------
    case 'NAV_REQUEST':
      return { ...state, navReq: { go: a.go, at: Date.now() } };
    case 'REVERSE_POST':
      return { ...state, reverseRequests: [{ id: newId('rq'), kind: a.kind, text: a.text, deadline: a.deadline, budget: a.budget || null, offers: [], status: 'aberto', at: Date.now() }, ...state.reverseRequests] };
    case 'REVERSE_OFFERS':
      return { ...state, reverseRequests: state.reverseRequests.map((r) => (r.id === a.id && r.status === 'aberto' ? { ...r, offers: a.offers } : r)) };
    case 'REVERSE_ACCEPT':
      return { ...state, reverseRequests: state.reverseRequests.map((r) => (r.id === a.id ? { ...r, status: 'fechado', accepted: a.index } : r)) };
    case 'REVERSE_CANCEL':
      return { ...state, reverseRequests: state.reverseRequests.filter((r) => r.id !== a.id) };
    case 'REVERSE_SEND':
      return { ...state, reverseSent: { ...state.reverseSent, [a.id]: { price: a.price, note: a.note || '' } } };
    case 'GROUP_JOIN': {
      const g = { ...state.groupJoins };
      if (a.qty > 0) g[a.id] = a.qty;
      else delete g[a.id];
      return { ...state, groupJoins: g };
    }
    case 'SUB_START': {
      const plan = subPlan(a.planId);
      if (!plan || state.subscriptions.some((x) => x.planId === a.planId && x.status !== 'cancelada')) return state;
      return { ...state, subscriptions: [{ id: newId('sub'), planId: plan.id, next: Date.now() + 864e5, status: 'ativa', at: Date.now() }, ...state.subscriptions] };
    }
    case 'SUB_TOGGLE':
      return { ...state, subscriptions: state.subscriptions.map((x) => (x.id === a.id ? { ...x, status: x.status === 'ativa' ? 'pausada' : 'ativa' } : x)) };
    case 'SUB_CANCEL':
      return { ...state, subscriptions: state.subscriptions.filter((x) => x.id !== a.id) };
    case 'NUDGE_DISMISS':
      return { ...state, nudgesDismissed: { ...state.nudgesDismissed, [a.id]: true } };
    case 'INTEL_PLAN': {
      if (!a.on) return { ...state, intelPlan: false };
      if (state.intelPlan || state.wallet < INTEL_PLAN.price) return state;
      return {
        ...state,
        intelPlan: true,
        wallet: +(state.wallet - INTEL_PLAN.price).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'gasto', cat: 'Planos', desc: `${INTEL_PLAN.name} (mensal)`, amount: INTEL_PLAN.price }, ...state.walletTx],
      };
    }
    // Seguir uma classe de lives (ex.: Gamers) e lembrar de uma live agendada.
    case 'TOGGLE_LIVE_FOLLOW': {
      const f = state.liveFollows || [];
      return { ...state, liveFollows: f.includes(a.cat) ? f.filter((k) => k !== a.cat) : [...f, a.cat] };
    }
    case 'TOGGLE_LIVE_REMIND': {
      const r = { ...(state.liveReminders || {}) };
      if (r[a.id]) delete r[a.id];
      else r[a.id] = true;
      return { ...state, liveReminders: r };
    }
    // Assistiu o clipe até o fim: ganha pontos (uma vez por clipe).
    case 'AD_REWARD': {
      if (state.adRewards[a.id]) return state;
      // Limite diário de pontos assistindo (lives e clipes): evita ficar "farmando" pontos.
      const room = Math.max(0, POINT_RULES.watchDailyCap - watchedToday(state.pointsLog));
      const pts = Math.min(a.points, room);
      if (!pts) return { ...state, adRewards: { ...state.adRewards, [a.id]: true } };
      return {
        ...state,
        adRewards: { ...state.adRewards, [a.id]: true },
        points: state.points + pts,
        pointsLog: [{ id: newId('pt'), points: pts, desc: `Assistiu: ${a.desc}`, at: Date.now() }, ...state.pointsLog],
      };
    }
    // Pegar cupom: vira crédito promocional da loja e desconta sozinho no carrinho.
    case 'COLLECT_COUPON': {
      const c = a.coupon;
      if ((state.promoCredits || []).some((pc) => pc.offerId === c.id)) return state;
      return {
        ...state,
        promoCredits: [{ id: newId('pc'), offerId: c.id, kind: 'loja', partnerId: c.storeId, partner: a.partner, icon: '🎟️', title: c.title, value: c.value, used: false }, ...state.promoCredits],
      };
    }
    // Combo "leve mais, pague menos": os itens vão para o carrinho e o desconto vira crédito da loja.
    case 'ADD_COMBO': {
      let cart = state.cart;
      a.items.forEach((productId) => {
        const found = cart.find((c) => c.productId === productId);
        cart = found ? cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c)) : [...cart, { productId, qty: 1 }];
      });
      const pending = (state.promoCredits || []).some((pc) => pc.offerId === a.combo.id && !pc.used);
      return {
        ...state,
        cart,
        promoCredits:
          pending || !a.off
            ? state.promoCredits
            : [{ id: newId('pc'), offerId: a.combo.id, kind: 'loja', partnerId: a.combo.storeId, partner: a.partner, icon: '🧺', title: `Combo ${a.combo.title}`, value: a.off, used: false }, ...state.promoCredits],
      };
    }
    // Troca de pontos (ou pagamento em R$ do saldo) por boost ou anúncio: só serviços do Realys.
    case 'REDEEM_POINTS': {
      const offer = pointOffer(a.offerId);
      if (!offer) return state;
      const withMoney = a.pay === 'saldo';
      if (withMoney ? !offer.money || state.wallet < offer.money : state.points < offer.points) return state;
      const now = Date.now();
      // Boost do mesmo tipo ainda valendo: o novo começa quando o atual termina.
      const cur = (state.boosts || []).filter((b) => b.target === offer.target && b.until && b.until > now).sort((x, y) => y.until - x.until)[0];
      const start = offer.target === 'anuncio' ? null : cur ? cur.until : now;
      const boost = {
        id: newId('bo'),
        offerId: offer.id,
        target: offer.target,
        title: offer.title,
        icon: offer.icon,
        start,
        until: start && offer.hours ? start + offer.hours * 3600000 : null,
        paidWith: withMoney ? brl(offer.money) : `${offer.points} pontos`,
        status: offer.target === 'anuncio' ? 'Em análise' : offer.hours ? 'Ativo' : 'Disponível',
        at: now,
      };
      return withMoney
        ? {
            ...state,
            wallet: +(state.wallet - offer.money).toFixed(2),
            walletTx: [{ id: newId('w'), ts: now, kind: 'gasto', cat: 'Boost', desc: offer.title, amount: offer.money }, ...state.walletTx],
            boosts: [boost, ...(state.boosts || [])],
          }
        : {
            ...state,
            points: state.points - offer.points,
            pointsLog: [{ id: newId('pt'), points: -offer.points, desc: `Trocado: ${offer.title}`, at: now }, ...state.pointsLog],
            boosts: [boost, ...(state.boosts || [])],
          };
    }
    case 'REQUEST_RIDE':
      return { ...state, rides: [a.ride, ...state.rides] };

    // ---------- Espera no embarque (src/rideRules.js) ----------
    // Motorista no local: começa a contar os 10 minutos do passageiro.
    case 'RIDE_ARRIVED':
      return { ...state, rides: state.rides.map((r) => (r.id === a.id && !r.arrivedAt ? { ...r, arrivedAt: Date.now(), status: 'Motorista no local de embarque' } : r)) };
    case 'RIDE_BOARDED':
      return { ...state, rides: state.rides.map((r) => (r.id === a.id && !r.done ? { ...r, boardedAt: Date.now(), status: 'Em viagem' } : r)) };
    // Passou dos 10 minutos e o passageiro não embarcou: corrida encerrada, o motorista recebe o
    // valor e o passageiro perde a corrida.
    case 'RIDE_NO_SHOW': {
      const r = state.rides.find((x) => x.id === a.id);
      if (!r || !r.arrivedAt || r.boardedAt || r.done || Date.now() - r.arrivedAt < 10 * 60 * 1000 - 2000) return state;
      const price = Number(r.price) || 0;
      const rides = state.rides.map((x) => (x.id === a.id ? { ...x, done: true, noShow: true, noShowAt: Date.now(), status: 'Encerrada: passageiro não embarcou em 10 min' } : x));
      // Corrida que EU pedi (tenho o prestador junto): o valor sai do meu saldo para o motorista.
      if (r.provider) {
        return {
          ...state,
          rides,
          wallet: +(state.wallet - price).toFixed(2),
          walletTx: price ? [{ id: newId('w'), ts: Date.now(), kind: 'gasto', cat: 'Transporte', desc: `Corrida não realizada: você não embarcou em 10 min (${r.provider.name})`, amount: price }, ...state.walletTx] : state.walletTx,
        };
      }
      // Corrida que EU fiz como motorista: o valor (já recebido ao aceitar) fica comigo.
      return { ...state, rides };
    }

    // ---------- Serviço público e SUS (src/publicServices.js) ----------
    case 'MOD_BLOCK':
      // Registra a tentativa (sem guardar o texto) para a equipe de moderação.
      return {
        ...state,
        reports: [{ id: newId('rp'), kind: a.kind === 'menor' ? 'Conteúdo com menor' : a.kind === 'odio' ? 'Racismo / ódio' : 'Nudez', target: 'Tentativa bloqueada antes de publicar', detail: `Bloqueado pela moderação automática (${a.action}).`, status: 'removido', count: 1 }, ...(state.reports || [])],
      };
    case 'CHECKOUT_FAKE': {
      // Coação: o pedido aparece como pago, mas nada é cobrado e nada vai para a loja.
      const real = reducer(state, { type: 'CHECKOUT' });
      if (real === state) return { ...state, cart: [] };
      const fresh = real.orders.filter((o) => !state.orders.some((x) => x.id === o.id)).map((o) => ({ ...o, fake: true, coacao: true }));
      return { ...state, cart: [], orders: [...fresh, ...state.orders] };
    }
    case 'PANIC_FALSE': {
      // Chamada falsa confirmada pela segurança: conta bloqueada e saldo retido.
      const al = (state.panicAlerts || []).find((x) => x.id === a.id);
      if (!al) return state;
      const alerts = state.panicAlerts.map((x) => (x.id === a.id ? { ...x, status: 'falso', closedAt: Date.now() } : x));
      const mine = state.user && al.userId && al.userId === state.user.id;
      return {
        ...state,
        panicAlerts: alerts,
        accountBlock: mine ? { at: Date.now(), reason: 'Chamada de emergência falsa', alertId: al.id, wallet: state.wallet } : state.accountBlock || null,
      };
    }
    case 'PANIC_REAL':
      return { ...state, panicAlerts: (state.panicAlerts || []).map((x) => (x.id === a.id ? { ...x, status: 'atendido', closedAt: Date.now() } : x)) };
    case 'LOAD_BLOCK':
      return { ...state, accountBlock: a.block || null };
    // Lotus Denúncia e Lotus Emergência (abertos pela voz). Os pedidos vão para a central de segurança.
    case 'OPEN_SOS_FLOW':
      return { ...state, sosFlow: { kind: a.kind, at: Date.now() } };
    case 'CLOSE_SOS_FLOW':
      return { ...state, sosFlow: null };
    case 'SOS_REQUEST':
      return { ...state, sosRequests: [a.req, ...(state.sosRequests || [])] };
    case 'SOS_UPDATE':
      return { ...state, sosRequests: (state.sosRequests || []).map((x) => (x.id === a.id ? { ...x, ...a.data } : x)) };
    // Carteira profissional (src/credentials.js).
    case 'CRED_ADD':
      return { ...state, credentials: [{ ...a.cred, id: newId('cr'), status: 'em_analise', receiveCases: false, userId: state.user ? state.user.id : null, who: state.user ? state.user.name : null, at: Date.now() }, ...(state.credentials || [])] };
    case 'CRED_SET':
      return { ...state, credentials: (state.credentials || []).map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case 'CRED_REMOVE':
      return { ...state, credentials: (state.credentials || []).filter((c) => c.id !== a.id) };
    case 'CASE_FOLLOW':
      // Profissional decidiu acompanhar o caso (o pedido mostra quem está acompanhando).
      return { ...state, sosRequests: (state.sosRequests || []).map((x) => (x.id === a.id ? { ...x, followers: [...new Set([...(x.followers || []), a.who])], status: 'em acompanhamento' } : x)) };
    case 'DATE_SUBSCRIBE': {
      const q = subscribeQuote(state, a.planId, a.pay);
      if (!q.ok) return state;
      const now = Date.now();
      const sub = { planId: q.plan.id, title: q.plan.title, start: q.start, until: q.until, paidWith: a.pay === 'pontos' ? `${q.cost} pontos` : brl(q.cost), at: now };
      const enc = { ...state.encontros, sub, subHistory: [sub, ...((state.encontros && state.encontros.subHistory) || [])].slice(0, 20) };
      return a.pay === 'pontos'
        ? { ...state, points: state.points - q.cost, encontros: enc }
        : {
            ...state,
            wallet: +(state.wallet - q.cost).toFixed(2),
            walletTx: [{ id: newId('w'), ts: now, kind: 'gasto', cat: 'Date', desc: `Assinatura Date+ ${q.plan.title}`, amount: q.cost }, ...state.walletTx],
            encontros: enc,
          };
    }
    case 'DATE_SUB_CANCEL':
      // Cancelar só desliga a renovação: o que já foi pago vale até o fim.
      return state.encontros && state.encontros.sub ? { ...state, encontros: { ...state.encontros, sub: { ...state.encontros.sub, renew: false } } } : state;
    case 'START_VIDEO_CALL':
      return { ...state, videoCall: { to: a.to, name: a.name, kind: a.kind || 'video', ctx: a.ctx || null, at: Date.now() } };
    case 'CLEAR_VIDEO_CALL':
      return { ...state, videoCall: null };
    case 'OPEN_PUBLIC':
      return { ...state, publicOpen: { id: a.id, tab: a.tab || 'inicio', at: Date.now() } };
    case 'CLOSE_PUBLIC':
      return { ...state, publicOpen: null };
    case 'PUBLIC_POST':
      return { ...state, publicPosts: [{ id: newId('pp'), at: Date.now(), ...a.post, orgId: a.orgId }, ...(state.publicPosts || [])] };
    case 'PUBLIC_EDIT': {
      const cur = (state.publicEdits || {})[a.orgId] || {};
      return { ...state, publicEdits: { ...state.publicEdits, [a.orgId]: { ...cur, ...a.data, staff: { ...(cur.staff || {}), ...(a.data.staff || {}) } } } };
    }
    case 'PUBLIC_SLOT_ADD':
      return { ...state, publicSlots: [...(state.publicSlots || []), { id: newId('sl'), ...a.slot, orgId: a.orgId }] };
    case 'SUS_LOAD':
      return { ...state, sus: a.sus || null, susBookings: a.bookings || [] };
    case 'SUS_SAVE':
      return { ...state, sus: a.sus };
    // Agendou pelo Realys: confere o cartão do SUS e reserva o horário.
    case 'SUS_BOOK': {
      if (!state.sus || !state.sus.cns) return state;
      if ((state.susBookings || []).some((b) => b.slotId === a.slot.id && b.status === 'agendado')) return state;
      const booking = { id: newId('ag'), orgId: a.orgId, orgName: a.orgName, slotId: a.slot.id, specialty: a.slot.specialty, who: a.slot.who, at: a.slot.at, cns: state.sus.cns, status: 'agendado', createdAt: Date.now() };
      return { ...state, susBookings: [booking, ...(state.susBookings || [])] };
    }
    case 'SUS_CANCEL':
      return { ...state, susBookings: (state.susBookings || []).map((b) => (b.id === a.id ? { ...b, status: 'cancelado' } : b)) };

    // ---------- Contratos e receitas (src/documents.js) ----------
    case 'OPEN_DOCS':
      return { ...state, docsOpen: { mode: a.mode || 'lista', draft: a.draft || '', at: Date.now() } };
    case 'CLOSE_DOCS':
      return { ...state, docsOpen: null };
    case 'DOC_SAVE': {
      const exists = (state.documents || []).some((d) => d.id === a.doc.id);
      return { ...state, documents: exists ? state.documents.map((d) => (d.id === a.doc.id ? a.doc : d)) : [a.doc, ...(state.documents || [])] };
    }
    // Uma parte assinou (no Realys com biometria, ou pelo gov.br com o PDF assinado anexado).
    case 'DOC_SIGN':
      return {
        ...state,
        documents: (state.documents || []).map((d) =>
          d.id === a.id ? { ...d, ...(a.coacao ? { coacao: true } : {}), parties: d.parties.map((p, i) => (i === a.index && !p.signedAt ? { ...p, signedAt: Date.now(), method: a.method || 'realys', file: a.file || null, ...(a.coacao ? { coacao: true } : {}) } : p)) } : d
        ),
      };

    // ---------- Chave de segurança do motorista (src/panic.js) ----------
    case 'PANIC_ALERT':
      return { ...state, panicAlerts: [a.alert, ...(state.panicAlerts || [])] };
    case 'PANIC_UPDATE':
      return { ...state, panicAlerts: (state.panicAlerts || []).map((x) => (x.id === a.id ? { ...x, ...a.data } : x)) };

    // ---------- Serviços por visita (src/serviceVisits.js) ----------
    // Cliente pede a visita: a taxa sai do saldo e fica retida até a visita ser confirmada.
    case 'VISIT_REQUEST': {
      const p = a.provider;
      const fee = visitFee(p);
      if (state.wallet + state.giftCredits < fee) return state;
      // Créditos de presente pagam primeiro (o valor já está no caixa do Realys).
      const fromGift = +Math.min(state.giftCredits, fee).toFixed(2);
      const visit = {
        id: newId('vs'),
        providerId: p.id,
        provider: p,
        serviceKey: p.service,
        serviceLabel: a.serviceLabel || p.service,
        fee,
        discount: visitDiscount(p),
        address: a.address || '',
        problem: a.problem || '',
        when: a.when || 'Assim que possível',
        status: 'aguardando',
        fromGift,
        at: Date.now(),
      };
      return { ...state, wallet: +(state.wallet - (fee - fromGift)).toFixed(2), giftCredits: +(state.giftCredits - fromGift).toFixed(2), visits: [visit, ...state.visits] };
    }
    // Resposta do prestador. Recusou: a taxa volta e o pedido não recebe avaliação (recusar não pune).
    case 'VISIT_RESPOND': {
      const v = state.visits.find((x) => x.id === a.id);
      if (!v || v.status !== 'aguardando') return state;
      const visits = state.visits.map((x) => (x.id === a.id ? { ...x, status: a.accept ? 'aceita' : 'recusada' } : x));
      return a.accept ? { ...state, visits } : { ...state, visits, wallet: +(state.wallet + v.fee - (v.fromGift || 0)).toFixed(2), giftCredits: +(state.giftCredits + (v.fromGift || 0)).toFixed(2) };
    }
    // Prestador aceitou e não foi: a taxa volta e ele perde posição no ranking.
    case 'VISIT_NO_SHOW': {
      const v = state.visits.find((x) => x.id === a.id);
      if (!v || v.status !== 'aceita') return state;
      return {
        ...state,
        wallet: +(state.wallet + v.fee - (v.fromGift || 0)).toFixed(2),
        giftCredits: +(state.giftCredits + (v.fromGift || 0)).toFixed(2),
        visits: state.visits.map((x) => (x.id === a.id ? { ...x, status: 'faltou' } : x)),
        providers: state.providers.map((p) => (p.id === v.providerId ? { ...p, noShows: providerStats(p).noShows + 1 } : p)),
      };
    }
    // Cliente confirma que a visita aconteceu: a taxa é dividida entre o Realys e o prestador.
    case 'VISIT_CONFIRM': {
      const v = state.visits.find((x) => x.id === a.id);
      if (!v || v.status !== 'aceita') return state;
      return { ...state, visits: state.visits.map((x) => (x.id === a.id ? { ...x, status: 'confirmada', split: splitFee(x.fee), confirmedAt: Date.now() } : x)) };
    }
    // Serviço feito (valor combinado entre os dois): conta no ranking e abre a avaliação.
    case 'VISIT_DONE': {
      const v = state.visits.find((x) => x.id === a.id);
      if (!v || v.status !== 'confirmada') return state;
      return {
        ...state,
        visits: state.visits.map((x) => (x.id === a.id ? { ...x, status: 'concluida', doneAt: Date.now() } : x)),
        providers: state.providers.map((p) => (p.id === v.providerId ? { ...p, done90: providerStats(p).done90 + 1 } : p)),
        rateOpen: { kind: 'visita', refId: a.id },
      };
    }
    // Prestador responde um pedido de visita. Responder rápido melhora a posição, mesmo recusando.
    case 'PROVIDER_VISIT_RESPOND': {
      const req = state.visitRequests.find((r) => r.id === a.id);
      if (!req || !state.myProvider) return state;
      const fee = visitFee(state.myProvider);
      const me = { ...state.myProvider, responseRate: 100, responseMin: 2 };
      return {
        ...withMyProvider(state, me),
        visitRequests: state.visitRequests.filter((r) => r.id !== a.id),
        // Visita aceita entra sozinha na Agenda, no horário que o cliente pediu.
        myVisits: a.accept ? [{ ...req, fee, split: splitFee(fee), status: 'aceita', acceptedAt: Date.now(), start: parseWhen(req.when) }, ...state.myVisits] : state.myVisits,
      };
    }
    // Cliente confirmou a visita: a parte do prestador é liberada na carteira.
    case 'PROVIDER_VISIT_CONFIRMED': {
      const v = state.myVisits.find((x) => x.id === a.id);
      if (!v || v.status !== 'aceita') return state;
      return {
        ...state,
        wallet: +(state.wallet + v.split.provider).toFixed(2),
        myVisits: state.myVisits.map((x) => (x.id === a.id ? { ...x, status: 'confirmada' } : x)),
      };
    }
    case 'PROVIDER_VISIT_DONE': {
      const v = state.myVisits.find((x) => x.id === a.id);
      if (!v || v.status !== 'confirmada' || !state.myProvider) return state;
      const me = { ...state.myProvider, done90: (state.myProvider.done90 || 0) + 1 };
      return { ...withMyProvider(state, me), myVisits: state.myVisits.map((x) => (x.id === a.id ? { ...x, status: 'concluida' } : x)) };
    }
    // O prestador também avalia o cliente.
    case 'PROVIDER_RATE_CLIENT':
      return { ...state, myVisits: state.myVisits.map((x) => (x.id === a.id ? { ...x, clientStars: a.stars, clientText: a.text || '' } : x)) };
    // Agenda do prestador
    case 'AGENDA_ADD':
      return { ...state, agenda: [...state.agenda, { ...a.item, id: a.item.id || newId('ag') }] };
    case 'AGENDA_UPDATE':
      return { ...state, agenda: state.agenda.map((it) => (it.id === a.id ? { ...it, ...a.patch } : it)) };
    case 'AGENDA_REMOVE':
      return { ...state, agenda: state.agenda.filter((it) => it.id !== a.id) };
    case 'AGENDA_HOURS':
      return { ...state, workHours: state.workHours.map((h, i) => (i === a.day ? { ...h, ...a.patch } : h)) };
    case 'AGENDA_REMIND':
      return { ...state, agendaRemind: a.min };
    // Plano de destaque: aparece como "Patrocinado", separado do ranking por mérito.
    case 'SET_HIGHLIGHT': {
      if (!state.myProvider) return state;
      if (a.on && state.wallet < HIGHLIGHT_PLAN.price) return state;
      const me = { ...state.myProvider, sponsored: !!a.on };
      const next = withMyProvider(state, me);
      return a.on ? { ...next, wallet: +(state.wallet - HIGHLIGHT_PLAN.price).toFixed(2) } : next;
    }

    // Empresa anuncia (ou tira) um produto da vitrine de Lançamentos do Shop.
    case 'TOGGLE_LAUNCH':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === a.id ? { ...p, launch: p.launch ? null : { note: a.note || 'Novidade da loja', at: 'Agora' } } : p
        ),
      };

    // RH: candidatura do cliente. Se a vaga for da minha empresa, a pessoa entra na lista de candidatos.
    case 'APPLY_JOB': {
      const mine = state.myJobs.find((j) => j.id === a.id);
      const me = {
        id: 'cand-me',
        name: state.user ? state.user.name : 'Você',
        photo: null,
        city: 'Identidade verificada',
        exp: a.note || 'Candidatura pelo app Realys',
        status: 'novo',
      };
      return {
        ...state,
        applications: { ...state.applications, [a.id]: 'enviada' },
        myJobs: mine
          ? state.myJobs.map((j) => (j.id === a.id ? { ...j, candidates: [me, ...j.candidates.filter((c) => c.id !== 'cand-me')] } : j))
          : state.myJobs,
      };
    }
    case 'CANCEL_APPLICATION': {
      const applications = { ...state.applications };
      delete applications[a.id];
      return {
        ...state,
        applications,
        myJobs: state.myJobs.map((j) => (j.id === a.id ? { ...j, candidates: j.candidates.filter((c) => c.id !== 'cand-me') } : j)),
      };
    }
    case 'POST_JOB':
      return {
        ...state,
        myJobs: [{ id: newId('mj'), status: 'aberta', posted: 'Agora', candidates: [], benefits: '', reqs: [], ...a.job }, ...state.myJobs],
      };
    case 'CANDIDATE_STATUS':
      return {
        ...state,
        myJobs: state.myJobs.map((j) =>
          j.id === a.jobId ? { ...j, candidates: j.candidates.map((c) => (c.id === a.candId ? { ...c, status: a.status } : c)) } : j
        ),
      };
    case 'CLOSE_JOB':
      return { ...state, myJobs: state.myJobs.map((j) => (j.id === a.id ? { ...j, status: j.status === 'aberta' ? 'encerrada' : 'aberta' } : j)) };

    default:
      return state;
  }
}

const NOTES_KEY = 'realys.admin.notes';
const HANDSFREE_KEY = 'realys.handsfree';
const PROFILE_KEY = 'realys.profile.v1'; // perfil editado, privacidade e criações do Estúdio
// Sessão: o usuário continua conectado ao fechar e abrir o app, até tocar em "Sair" ou "Trocar usuário".
const SESSION_KEY = 'realys.session';

async function readSession() {
  let raw = null;
  try {
    raw = await SecureStore.getItemAsync(SESSION_KEY);
  } catch (e) {
    raw = await AsyncStorage.getItem(SESSION_KEY).catch(() => null);
  }
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function writeSession(session) {
  const value = session ? JSON.stringify(session) : null;
  try {
    if (value) await SecureStore.setItemAsync(SESSION_KEY, value);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (e) {
    if (value) await AsyncStorage.setItem(SESSION_KEY, value).catch(() => {});
    else await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loaded = useRef(false);
  // Ao abrir: se tem sessão salva, entra direto.
  useEffect(() => {
    readSession()
      .then((session) => dispatch({ type: 'RESTORE_SESSION', session }))
      .catch(() => dispatch({ type: 'RESTORE_SESSION', session: null }));
  }, []);
  // Guarda a sessão a cada login/troca de perfil e apaga ao sair.
  useEffect(() => {
    if (!state.ready) return;
    writeSession(state.user ? { user: state.user, activeRole: state.activeRole } : null);
  }, [state.ready, state.user, state.activeRole]);
  // Anotações do administrador: carrega ao abrir e salva a cada mudança.
  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY)
      .then((raw) => raw && dispatch({ type: 'LOAD_NOTES', notes: JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => (loaded.current = true));
    AsyncStorage.getItem(HANDSFREE_KEY)
      .then((v) => v === '1' && dispatch({ type: 'SET_HANDSFREE', on: true }))
      .catch(() => {});
  }, []);
  const firstHands = useRef(true);
  useEffect(() => {
    if (firstHands.current) return void (firstHands.current = false);
    AsyncStorage.setItem(HANDSFREE_KEY, state.handsFree ? '1' : '0').catch(() => {});
  }, [state.handsFree]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(NOTES_KEY, JSON.stringify(state.notes)).catch(() => {});
  }, [state.notes]);
  // Perfil, privacidade e Estúdio ficam salvos no celular (por conta).
  const profileKey = state.user ? `${PROFILE_KEY}.${state.user.id || state.user.cpf || state.user.cnpj || state.user.name}` : null;
  const profileLoaded = useRef(null);
  useEffect(() => {
    if (!profileKey) return;
    profileLoaded.current = null;
    AsyncStorage.getItem(profileKey)
      .then((raw) => raw && dispatch({ type: 'LOAD_PROFILE', data: JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => (profileLoaded.current = profileKey));
  }, [profileKey]);
  useEffect(() => {
    if (!profileKey || profileLoaded.current !== profileKey) return;
    AsyncStorage.setItem(profileKey, JSON.stringify({ myProfile: state.myProfile, privacy: state.privacy, creations: state.creations, myPage: state.myPage, myBusiness: state.myBusiness, agenda: state.agenda, workHours: state.workHours, agendaRemind: state.agendaRemind })).catch(() => {});
  }, [state.myProfile, state.privacy, state.creations, state.myPage, state.myBusiness, state.agenda, state.workHours, state.agendaRemind]);
  // Cartão do SUS e agendamentos: dado de saúde, guardado no cofre criptografado do Android, por conta.
  const susKey = state.user ? `realys_sus_${String(state.user.id || state.user.cpf || state.user.cnpj || state.user.name).replace(/[^A-Za-z0-9._-]/g, '_')}` : null;
  const susLoaded = useRef(null);
  useEffect(() => {
    if (!susKey) return;
    susLoaded.current = null;
    SecureStore.getItemAsync(susKey)
      .then((raw) => dispatch({ type: 'SUS_LOAD', ...(raw ? JSON.parse(raw) : {}) }))
      .catch(() => {})
      .finally(() => (susLoaded.current = susKey));
  }, [susKey]);
  useEffect(() => {
    if (!susKey || susLoaded.current !== susKey) return;
    SecureStore.setItemAsync(susKey, JSON.stringify({ sus: state.sus, bookings: state.susBookings })).catch(() => {});
  }, [state.sus, state.susBookings]);
  // Moderação: texto público ou privado passa pelas regras antes de entrar (racismo, ódio, menores, nudez).
  const guarded = React.useCallback((a) => {
    const m = moderateAction(a);
    if (m.ok) return dispatch(a);
    dispatch({ type: 'MOD_BLOCK', kind: m.kind, action: a.type });
    Alert.alert('Não foi enviado', m.why);
  }, []);
  return <StoreContext.Provider value={{ state, dispatch: guarded }}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

// Seletores úteis
export const myProducts = (state) => state.products.filter((p) => p.storeId === D.MY_COMPANY_ID);
export const storeOf = (state, id) => state.stores.find((s) => s.id === id);
export const cartTotal = (state) =>
  state.cart.reduce((s, c) => s + state.products.find((p) => p.id === c.productId).price * c.qty, 0);

// Todas as vagas que o cliente vê: as da minha empresa (abertas) e as das outras empresas.
export function allJobs(state) {
  const store = state.stores.find((x) => x.id === D.MY_COMPANY_ID) || {};
  const mine = state.myJobs
    .filter((j) => j.status === 'aberta')
    .map((j) => ({ ...j, companyId: D.MY_COMPANY_ID, company: store.name, logo: store.logo, city: 'Bela Vista, São Paulo - SP', distanceKm: 0.6 }));
  return [...mine, ...state.jobs];
}

export const serviceType = (key) => D.serviceTypes.find((t) => t.key === key);

export function nearest(state, serviceKey) {
  return [...state.providers]
    .filter((p) => p.service === serviceKey)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}

// Descobre o tipo de serviço pelo que a pessoa falou ou digitou.
export function detectService(text) {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  // 1º frases específicas do catálogo ("limpeza de pele", "vidro do carro"), depois as palavras de
  // sempre, por fim palavras soltas do catálogo como palavra inteira ("tosa" não casa com "tosado").
  const cat = D.serviceTypes.filter((s) => s.exact);
  const whole = (w) => new RegExp('(^|[^a-z0-9])' + w.replace(/[^a-z0-9 ]/g, '.') + '($|[^a-z0-9])').test(t);
  const found =
    cat.find((s) => s.words.some((w) => w.includes(' ') && t.includes(w))) ||
    D.serviceTypes.find((s) => !s.exact && s.words.some((w) => t.includes(w))) ||
    cat.find((s) => s.words.some((w) => !w.includes(' ') && whole(w)));
  return found ? found.key : null;
}

// Cria um chamado para o prestador mais próximo de qualquer tipo de serviço.
export function buildServiceCall(state, address, serviceKey = 'motorista', providerId = null) {
  const provider = (providerId && state.providers.find((p) => p.id === providerId)) || nearest(state, serviceKey);
  if (!provider) return null;
  const type = serviceType(serviceKey);
  const transport = type.group === 'Transporte';
  const eta = Math.max(3, Math.round(provider.distanceKm * (transport ? 4 : 6)));
  // Corrida: tarifa do Realys (base + km + minuto), com o pico e a procura do momento.
  // Sem destino informado, estima um trajeto de 5 km (o valor final segue o trajeto feito).
  const tripKm = 5;
  const waiting = (state.rideRequests || []).length;
  const free = (state.providers || []).filter((p) => p.service === serviceKey).length || 1;
  const fare = transport ? fareQuote(serviceKey, tripKm, { demand: Math.max(0, waiting / free - 1) }) : null;
  return {
    id: newId('r'),
    client: state.user ? state.user.name : 'Cliente',
    from: address || 'Sua localização atual',
    to: '-',
    provider,
    serviceKey,
    serviceLabel: type.label,
    icon: type.icon,
    eta,
    status: transport ? `${type.label} a caminho` : `${type.label} confirmado`,
    price: transport ? fare.total : provider.price,
    fare,
  };
}

// Frase que o app fala de volta para o cliente.
export function callReply(call) {
  const p = call.provider;
  const plate = p.plate ? `, placa ${p.plate.split('').join(' ')}` : '';
  const vehicle = p.vehicle ? ` ${p.vehicle}${plate}.` : '';
  if (call.when) return `Pronto, agendado para ${call.when}. ${call.serviceLabel} ${p.name}, nota ${String(p.rating).replace('.', ',')}.${vehicle}`;
  const fare = call.fare ? ` Corrida estimada em ${brl(call.fare.total)}${call.fare.mult > 1 ? ', um pouco acima do normal pelo horário e pela procura' : ''}.` : '';
  return `Ok, chamando agora. ${call.serviceLabel} ${p.name}, nota ${String(p.rating).replace('.', ',')}, chega em ${call.eta} minutos.${vehicle}${fare}`;
}

// "R$ 80,00 por hora", "R$ 35,00 por m²"...
// Motorista e motoboy seguem a tarifa do Realys (igual para todos): justo e sem disputa de preço.
export const priceText = (p) => {
  const t = p && TARIFFS[p.service];
  if (t) return `corrida a partir de ${brl(t.minimo)}, mais ${brl(t.km)} por km`;
  return `${brl(p.price)} por ${p.priceUnit}`;
};

export function nearbyOf(state, serviceKey, max = 3) {
  return [...state.providers]
    .filter((p) => p.service === serviceKey)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, max);
}

// Resposta da pesquisa por voz: quem está perto, o que faz e quanto cobra.
export function searchReply(state, serviceKey) {
  const type = serviceType(serviceKey);
  const list = nearbyOf(state, serviceKey);
  if (!list.length) return { list, reply: `No momento não encontrei ${type.label.toLowerCase()} disponível perto de você.` };
  const km = (p) => String(p.distanceKm.toFixed(1)).replace('.', ',');
  const first = list[0];
  let reply =
    `Encontrei ${list.length} ${list.length > 1 ? 'opções' : 'opção'} de ${type.label.toLowerCase()} perto de você. ` +
    `O mais próximo é ${first.name}, a ${km(first)} quilômetros, nota ${String(first.rating).replace('.', ',')}. ` +
    `Faz ${first.functions.slice(0, 3).join(', ').toLowerCase()}, e cobra ${priceText(first)}.`;
  if (list[1]) reply += ` Também tem ${list[1].name}, a ${km(list[1])} quilômetros, por ${priceText(list[1])}.`;
  // A Lotus nunca chama sozinha: mostra as opções e pergunta.
  reply += ` Quer que eu chame ${first.name.split(' ')[0]} agora, agende para outro horário, ou prefere outro da lista?`;
  return { list, reply };
}

// Para testes no computador.
export const _reducer = reducer;
export const _initialState = initialState;
