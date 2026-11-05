import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkText, claimOf } from './lm/factCheck';
import * as SecureStore from 'expo-secure-store';
import * as D from './data';
import { initialFriends } from './people';
import { brl } from './theme';
import { initialGifts, initialGiftCredits, giftFee, GIFT_MIN, GIFT_MAX, liveGiftOf, liveGiftCost, initialLiveCredits, initialLiveGifts, LIVE_CONVERT_MIN } from './gifts';
import { pointsFor, PARTNER_OFFERS, initialPoints, promoDiscount } from './rewards';
import { initialLoyalty, onDelivered } from './loyalty';
import { conversations as initialConversations, communityPosts as initialCommunityPosts } from './homeData';
import * as J from './jobsData';
import { initialTestimonials, myInitialGallery } from './testimonialsData';

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
};

const initialState = {
  ready: false, // vira true depois de ler a sessão salva (evita piscar a tela de login)
  user: null, // { name, roles: [], cnpj }
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
  },
  orders: D.initialOrders,
  rideRequests: D.rideRequests,
  rides: [],
  available: false,
  myProvider: null, // cadastro profissional de quem usa o perfil Prestador
  cart: [], // [{ productId, qty }]
  cartOpen: false, // janela do carrinho aberta
  // Avaliações depois da entrega ou do serviço (ver src/ratings.js).
  ratings: [],
  rateOpen: null, // { kind: 'pedido' | 'servico', refId }
  // Pontos de avaliação e créditos promocionais dos parceiros (ver src/rewards.js).
  points: initialPoints,
  pointsLog: [],
  promoCredits: [], // { id, offerId, kind, partnerId?, service?, partner, title, value, used }
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
    case 'OPEN_CART':
      return { ...state, cartOpen: true };
    case 'CLOSE_CART':
      return { ...state, cartOpen: false };

    case 'CHECKOUT': {
      const lines = state.cart.map((c) => ({ ...c, product: state.products.find((p) => p.id === c.productId) }));
      const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      // Créditos promocionais dos parceiros: descontam sozinhos nas compras daquela loja.
      const { off: promoOff, used: promoUsed } = promoDiscount(state, lines);
      const toPay = +(total - promoOff).toFixed(2);
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
            items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
            total: +toPay.toFixed(2),
            promoOff: promoOff ? +promoOff.toFixed(2) : undefined,
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
          return { ...o, status: next, courier: o.courier || 'Marcos Silva' };
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
      return { ...state, viewCompany: a.id };
    case 'CLOSE_COMPANY':
      return { ...state, viewCompany: null };
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
      return { ...state, myProfile: withSignupProfile({ ...state.myProfile, ...(a.data.myProfile || {}) }, state.user), privacy: { ...state.privacy, ...(a.data.privacy || {}) }, creations: a.data.creations || state.creations, myPage: a.data.myPage || state.myPage, myBusiness: a.data.myBusiness || state.myBusiness };
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
      return { ...state, venue: { ...a.venue, table: a.table || state.reservations[a.venue.id] || null }, venueOpen: !!a.open };
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
    case 'BUY_TICKET':
      return { ...state, wallet: +(state.wallet - a.ticket.price).toFixed(2), tickets: [a.ticket, ...state.tickets] };
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
          { id: newId('o'), items: [{ name: it.title, qty: 1, price }], total: price, status: 'Pagamento protegido', store: it.who, courier: null, nfe },
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
    // Presente: sai do saldo de quem dá (valor + taxa do Realys) e entra na hora para quem recebe,
    // como crédito de presente (não precisa aceitar, não dá para sacar, só compra no Realys).
    case 'SEND_GIFT': {
      const amount = +Number(a.amount).toFixed(2);
      const fee = giftFee(amount);
      if (!(amount >= GIFT_MIN) || amount > GIFT_MAX || amount + fee > state.wallet || !a.to) return state;
      const company = a.asCompany ? state.stores.find((x) => x.id === D.MY_COMPANY_ID) : null;
      const gift = {
        id: newId('gf'),
        dir: 'enviado',
        to: a.to,
        from: company ? { name: company.name, kind: 'empresa', logo: company.logo } : { name: (state.user && state.user.name) || 'Você', kind: 'pessoa' },
        amount,
        fee,
        occasion: a.occasion,
        message: a.message,
        at: Date.now(),
        status: 'Entregue',
      };
      return {
        ...state,
        wallet: +(state.wallet - amount - fee).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'gasto', cat: 'Presentes', desc: `Presente para ${a.to.name} (${brl(amount)} + taxa ${brl(fee)})`, amount: +(amount + fee).toFixed(2) }, ...state.walletTx],
        gifts: [gift, ...state.gifts],
        giftFees: +(state.giftFees + fee).toFixed(2),
        finance: company ? [{ id: newId('m'), date: today(), desc: `Presente para cliente ${a.to.name}`, type: 'saida', value: +(amount + fee).toFixed(2) }, ...state.finance] : state.finance,
      };
    }
    // Presente numa live: sai do saldo de quem assiste (valor + taxa do Realys) e vai para quem transmite.
    case 'SEND_LIVE_GIFT': {
      const g = liveGiftOf(a.gift);
      const qty = Math.max(1, Math.floor(a.qty || 1));
      const { value, fee, total } = liveGiftCost(g, qty);
      if (!a.live || a.live.mine || total > state.wallet) return state;
      return {
        ...state,
        wallet: +(state.wallet - total).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'gasto', cat: 'Presentes', desc: `Live de ${a.live.host}: ${g.emoji} ${g.name}${qty > 1 ? ` x${qty}` : ''} (${brl(value)} + taxa ${brl(fee)})`, amount: total }, ...state.walletTx],
        gifts: [{ id: newId('gf'), dir: 'enviado', to: { name: a.live.host, kind: 'live' }, amount: value, fee, occasion: `${g.emoji} ${g.name}${qty > 1 ? ` x${qty}` : ''} na live`, message: a.live.title, at: Date.now(), status: 'Entregue' }, ...state.gifts],
        giftFees: +(state.giftFees + fee).toFixed(2),
      };
    }
    // Alguém mandou presente na MINHA live: entra na hora como crédito de live.
    case 'RECEIVE_LIVE_GIFT': {
      const g = liveGiftOf(a.gift);
      const qty = Math.max(1, Math.floor(a.qty || 1));
      const value = +(g.value * qty).toFixed(2);
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
      return {
        ...state,
        liveCredits: +(state.liveCredits - v).toFixed(2),
        wallet: +(state.wallet + v).toFixed(2),
        walletTx: [{ id: newId('w'), ts: Date.now(), kind: 'deposito', cat: 'Lives', desc: `Créditos de live convertidos em moeda Realys (${v.toFixed(2).replace('.', ',')} RLS)`, amount: v }, ...state.walletTx],
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
        rides: [{ ...req, status: 'Em andamento' }, ...state.rides],
      };
    }
    // Serviço terminado (cliente confirmou e pagou pelo Realys): abre a avaliação do prestador.
    case 'FINISH_CALL':
      return {
        ...state,
        rides: state.rides.map((r) => (r.id === a.id ? { ...r, done: true, status: `${r.serviceLabel} concluído` } : r)),
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
      };
    }
    // Troca pontos por um crédito promocional de um parceiro.
    case 'REDEEM_POINTS': {
      const offer = PARTNER_OFFERS.find((o) => o.id === a.offerId);
      if (!offer || state.points < offer.points) return state;
      return {
        ...state,
        points: state.points - offer.points,
        pointsLog: [{ id: newId('pt'), points: -offer.points, desc: `Trocado: ${offer.title} · ${offer.partner}`, at: Date.now() }, ...state.pointsLog],
        promoCredits: [{ id: newId('pc'), offerId: offer.id, kind: offer.kind, partnerId: offer.partnerId, service: offer.service, partner: offer.partner, icon: offer.icon, title: offer.title, value: offer.value, used: false }, ...state.promoCredits],
      };
    }
    case 'REQUEST_RIDE':
      return { ...state, rides: [a.ride, ...state.rides] };

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
    AsyncStorage.setItem(profileKey, JSON.stringify({ myProfile: state.myProfile, privacy: state.privacy, creations: state.creations, myPage: state.myPage, myBusiness: state.myBusiness })).catch(() => {});
  }, [state.myProfile, state.privacy, state.creations, state.myPage, state.myBusiness]);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
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
  const found = D.serviceTypes.find((s) => s.words.some((w) => t.includes(w)));
  return found ? found.key : null;
}

// Cria um chamado para o prestador mais próximo de qualquer tipo de serviço.
export function buildServiceCall(state, address, serviceKey = 'motorista', providerId = null) {
  const provider = (providerId && state.providers.find((p) => p.id === providerId)) || nearest(state, serviceKey);
  if (!provider) return null;
  const type = serviceType(serviceKey);
  const transport = type.group === 'Transporte';
  const eta = Math.max(3, Math.round(provider.distanceKm * (transport ? 4 : 6)));
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
    price: transport ? +(provider.price + provider.distanceKm * 2.5).toFixed(2) : provider.price,
  };
}

// Frase que o app fala de volta para o cliente.
export function callReply(call) {
  const p = call.provider;
  const plate = p.plate ? `, placa ${p.plate.split('').join(' ')}` : '';
  const vehicle = p.vehicle ? ` ${p.vehicle}${plate}.` : '';
  if (call.when) return `Pronto, agendado para ${call.when}. ${call.serviceLabel} ${p.name}, nota ${String(p.rating).replace('.', ',')}.${vehicle}`;
  return `Ok, chamando agora. ${call.serviceLabel} ${p.name}, nota ${String(p.rating).replace('.', ',')}, chega em ${call.eta} minutos.${vehicle}`;
}

// "R$ 80,00 por hora", "R$ 35,00 por m²"...
export const priceText = (p) => `${brl(p.price)} por ${p.priceUnit}`;

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
