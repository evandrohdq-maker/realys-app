import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as D from './data';
import { brl } from './theme';
import { conversations as initialConversations } from './homeData';

const StoreContext = createContext(null);

let seq = 100;
const newId = (prefix) => `${prefix}${++seq}`;
const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const initialState = {
  user: null, // { name, roles: [], cnpj }
  activeRole: null,
  wallet: 750, // saldo em moeda Realys (1 RLS = R$ 1,00 na demonstração)
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
  myStories: [], // stories que o próprio usuário publicou
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
  liked: {},
  reports: D.reports,
  signups: D.pendingSignups,
  blocked: [],
  handsFree: false, // ouvir a palavra "Realys" para abrir o assistente
  notes: [], // anotações do administrador sobre o que mudar em cada tela (ficam salvas no celular)
};

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

function reducer(state, a) {
  switch (a.type) {
    case 'LOGIN':
      return { ...state, user: a.user, activeRole: a.user.roles[0] };
    case 'LOGOUT':
      return { ...initialState, notes: state.notes, handsFree: state.handsFree };
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
    case 'RESOLVE_REPORT':
      return {
        ...state,
        reports: state.reports.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)),
        blocked: a.status === 'bloqueado' ? [...state.blocked, state.reports.find((r) => r.id === a.id).target] : state.blocked,
      };
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

    case 'CHECKOUT': {
      const lines = state.cart.map((c) => ({ ...c, product: state.products.find((p) => p.id === c.productId) }));
      const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      if (!lines.length || total > state.wallet) return state;
      const mine = lines.filter((l) => l.product.storeId === D.MY_COMPANY_ID);
      const mineTotal = mine.reduce((s, l) => s + l.product.price * l.qty, 0);
      const storeNames = [...new Set(lines.map((l) => state.stores.find((s) => s.id === l.product.storeId).name))];
      const salesByDay = state.salesByDay.map((d, i, arr) =>
        i === arr.length - 1 ? { ...d, value: d.value + mineTotal } : d
      );
      return {
        ...state,
        wallet: +(state.wallet - total).toFixed(2),
        cart: [],
        products: state.products.map((p) => {
          const l = lines.find((x) => x.productId === p.id);
          return l ? { ...p, stock: Math.max(0, p.stock - l.qty) } : p;
        }),
        orders: [
          {
            id: newId('o'),
            items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
            total: +total.toFixed(2),
            status: 'Pagamento protegido',
            store: storeNames.join(', '),
            courier: null,
          },
          ...state.orders,
        ],
        finance: mineTotal
          ? [{ id: newId('m'), date: today(), desc: 'Venda no app Realys', type: 'entrada', value: +mineTotal.toFixed(2) }, ...state.finance]
          : state.finance,
        salesByDay,
      };
    }
    case 'ADVANCE_ORDER': {
      const flow = ['Pagamento protegido', 'Preparando', 'A caminho', 'Entregue'];
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== a.id) return o;
          const next = flow[Math.min(flow.indexOf(o.status) + 1, flow.length - 1)];
          return { ...o, status: next, courier: o.courier || 'Marcos Silva' };
        }),
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
        products: state.products.map((x) => (x.id === a.id ? { ...x, stock: x.stock - 1 } : x)),
        finance: [{ id: newId('m'), date: today(), desc: `Balcão - ${p.name}`, type: 'entrada', value: p.price }, ...state.finance],
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

    // Mensagens e stories (compartilhados entre o Início e a página de Stories).
    case 'UPDATE_CONVS':
      return { ...state, conversations: a.fn(state.conversations) };
    case 'STORY_SEEN':
      return state.storySeen[a.id] ? state : { ...state, storySeen: { ...state.storySeen, [a.id]: true } };
    case 'PUBLISH_STORY':
      return { ...state, myStories: [...state.myStories, a.item] };

    case 'BUYER_ACCEPT_COUNTER': {
      const p = state.proposals.find((x) => x.id === a.id);
      return closeDeal(state, p, p.counter);
    }

    case 'TOGGLE_AVAILABLE': {
      const available = !state.available;
      // Ao ficar disponível com cadastro feito, o prestador aparece para os clientes (e para a voz da Realys).
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
    case 'ACCEPT_RIDE_REQUEST':
      return {
        ...state,
        rideRequests: state.rideRequests.filter((r) => r.id !== a.id),
        rides: [{ ...state.rideRequests.find((r) => r.id === a.id), status: 'Em andamento' }, ...state.rides],
      };
    case 'REQUEST_RIDE':
      return { ...state, rides: [a.ride, ...state.rides] };

    default:
      return state;
  }
}

const NOTES_KEY = 'realys.admin.notes';
const HANDSFREE_KEY = 'realys.handsfree';

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loaded = useRef(false);
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
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

// Seletores úteis
export const myProducts = (state) => state.products.filter((p) => p.storeId === D.MY_COMPANY_ID);
export const storeOf = (state, id) => state.stores.find((s) => s.id === id);
export const cartTotal = (state) =>
  state.cart.reduce((s, c) => s + state.products.find((p) => p.id === c.productId).price * c.qty, 0);

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
export function buildServiceCall(state, address, serviceKey = 'motorista') {
  const provider = nearest(state, serviceKey);
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
  return `Ok, agendando. ${call.serviceLabel} ${p.name}, nota ${String(p.rating).replace('.', ',')}, chega em ${call.eta} minutos.${vehicle}`;
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
  reply += ` Quer que eu chame ${first.name.split(' ')[0]}?`;
  return { list, reply };
}
