import React, { createContext, useContext, useReducer } from 'react';
import * as D from './data';
import { brl } from './theme';

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
};

// Quando uma proposta B2B é fechada: o estoque da empresa sobe e a saída entra no financeiro.
function closeDeal(state, proposal, discount) {
  const item = state.supplierItems.find((i) => i.id === proposal.itemId);
  const total = proposal.qty * item.unitPrice * (1 - discount / 100);
  const existing = state.products.find((p) => p.storeId === D.MY_COMPANY_ID && p.name === item.name);
  const products = existing
    ? state.products.map((p) => (p.id === existing.id ? { ...p, stock: p.stock + proposal.qty } : p))
    : [
        ...state.products,
        {
          id: newId('p'),
          storeId: D.MY_COMPANY_ID,
          name: item.name,
          price: +(item.unitPrice * 1.4).toFixed(2),
          cost: item.unitPrice,
          stock: proposal.qty,
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
    proposals: state.proposals.map((p) =>
      p.id === proposal.id ? { ...p, status: 'aceita', discount } : p
    ),
  };
}

function reducer(state, a) {
  switch (a.type) {
    case 'LOGIN':
      return { ...state, user: a.user, activeRole: a.user.roles[0] };
    case 'LOGOUT':
      return { ...initialState };
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

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
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
