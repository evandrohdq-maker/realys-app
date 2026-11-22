// Compras de verdade pelo servidor do Realyz (api.realyz.com.br).
//
// - Lojas e produtos cadastrados no servidor aparecem no Shop e no Food junto com os de demonstração
//   (id começando com "srv_").
// - Conta ligada ao servidor: a carteira mostrada é a do servidor (depósitos vão para lá).
// - Finalizar compra: os itens de lojas do servidor são pagos lá, com a taxa de proteção Realyz
//   de R$ 0,99 por compra cobrada pelo servidor. Os itens de demonstração seguem no celular.
// Sem servidor configurado, nada disso roda.
import { serverOn, api, API_URL } from './api';
import { getDevicePoint } from './geo';

export const SRV = 'srv_';
export const isServerId = (id) => typeof id === 'string' && id.startsWith(SRV);
export const conectado = (state) => serverOn() && !!(state.user && state.user.serverId);

const FOOD_CLASSES = ['pizzaria', 'lanches', 'japonesa', 'pratos', 'padaria', 'doces', 'bar', 'bebidas', 'mercado'];
const fullUrl = (u) => (u && u.startsWith('/') ? API_URL + u : u || null);
const STATUS = { Recebido: 'Pagamento protegido', Preparando: 'Preparando', 'A caminho': 'A caminho', Entregue: 'Entregue', Cancelado: 'Cancelado' };

// Produto do servidor no formato do app.
export function productFromServer(p) {
  const food = !!p.classe;
  return {
    id: SRV + p.id,
    serverId: p.id,
    storeId: SRV + p.companyId,
    name: p.name,
    description: p.description || '',
    price: p.price,
    stock: p.stock,
    minStock: 0,
    photo: fullUrl(p.photo),
    emoji: food ? '🍽️' : '📦',
    tint: '#EEF2F5',
    featured: !!p.sponsored,
    sponsored: !!p.sponsored,
    category: p.category,
    classe: p.classe || undefined,
    subclasse: p.subclasse || undefined,
    secao: p.secao || undefined,
    modos: p.modos || undefined,
    maioridade: !!p.maioridade,
    food,
  };
}

function storesFrom(list) {
  const map = new Map();
  for (const p of list) {
    const id = SRV + p.companyId;
    const cur = map.get(id) || { id, serverId: p.companyId, name: p.company || 'Loja', city: '', rating: 0, recommended: false, sponsored: false, shipsBrazil: false, cover: null, logo: '🏪', foodVotes: 0, shopVotes: 0, market: false };
    if (p.classe && FOOD_CLASSES.includes(p.classe)) cur.foodVotes++;
    else cur.shopVotes++;
    if (p.classe === 'mercado' || p.secao) cur.market = true;
    if (p.sponsored) cur.sponsored = true;
    if (!cur.cover && p.photo) cur.cover = fullUrl(p.photo);
    map.set(id, cur);
  }
  return [...map.values()].map(({ foodVotes, shopVotes, market, ...s }) => ({
    ...s,
    // A categoria decide se a loja aparece no Food ou no Shop.
    category: market ? 'Mercado' : foodVotes > shopVotes ? 'Alimentação' : 'Vários',
    logo: market ? '🛒' : foodVotes > shopVotes ? '🍽️' : '🏪',
  }));
}

export async function carregarCatalogo(dispatch) {
  if (!serverOn()) return;
  const list = await api('GET', '/products');
  dispatch({ type: 'SERVER_CATALOG', products: list.map(productFromServer), stores: storesFrom(list) });
}

export async function carregarCarteira(dispatch) {
  const w = await api('GET', '/wallet');
  dispatch({ type: 'SERVER_WALLET', balance: w.balance, giftCredits: w.giftCredits });
  return w;
}

const orderFromServer = (o) => ({
  id: SRV + o.id,
  serverId: o.id,
  at: o.createdAt || Date.now(),
  items: (o.items || []).map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  total: +(o.total + (o.protection || 0)).toFixed(2),
  protectionFee: o.protection || undefined,
  status: STATUS[o.status] || o.status,
  store: o.company,
  food: false,
  nfe: null,
});

export async function carregarPedidos(dispatch) {
  const list = await api('GET', '/orders');
  dispatch({ type: 'SERVER_ORDERS_SYNC', orders: list.map(orderFromServer) });
}

// Cliente cancela antes do preparo: volta o valor menos as taxas (o servidor decide e devolve).
export async function cancelarPedido(order, dispatch) {
  const r = await api('POST', `/orders/${order.serverId}/cancelar`, {});
  await carregarPedidos(dispatch);
  await carregarCarteira(dispatch);
  return r;
}

// Aviso em tempo real "order" (a loja mudou o status): atualiza a lista.
export const statusDoAviso = (e) => ({ serverId: e.id, status: STATUS[e.status] || e.status });

// Itens do carrinho que são de lojas do servidor.
export const linhasDoServidor = (state) => state.cart.filter((c) => isServerId(c.productId));

// Total que o servidor vai cobrar: produtos + R$ 0,99 de proteção (uma vez por compra).
export const PROTECAO_SERVIDOR = 0.99;
export function totalServidor(state) {
  const lines = linhasDoServidor(state);
  if (!lines.length) return 0;
  const sum = lines.reduce((s, c) => {
    const p = state.products.find((x) => x.id === c.productId);
    return s + (p ? p.price * c.qty : 0);
  }, 0);
  return +(sum + PROTECAO_SERVIDOR).toFixed(2);
}

// Finaliza o carrinho: primeiro o que é do servidor (dinheiro de verdade), depois o de demonstração.
// Devolve { ok, message }. Não lança erro.
export async function finalizarCompra(state, dispatch, { address } = {}) {
  if (!conectado(state) && linhasDoServidor(state).length) {
    return { ok: false, message: 'Para comprar nas lojas do Realyz, entre com a sua conta (cadastro com senha e biometria).' };
  }
  const srvLines = conectado(state) ? linhasDoServidor(state) : [];
  const hasLocal = state.cart.some((c) => !isServerId(c.productId));
  if (srvLines.length) {
    try {
      // Ponto de entrega no mapa: a central de entregas usa para achar o entregador e a rota.
      const ponto = await getDevicePoint().catch(() => null);
      const r = await api('POST', '/orders', {
        items: srvLines.map((c) => ({ productId: c.productId.slice(SRV.length), qty: c.qty })),
        address: address || undefined,
        // Indicação: quem divulgou o produto para este cliente (ganha 2% quando o pedido for entregue).
        ...(state.indicacao && state.indicacao.ref ? { ref: state.indicacao.ref } : {}),
        ...(ponto ? { destLat: ponto.lat, destLng: ponto.lon } : {}),
      });
      dispatch({ type: 'SERVER_ORDERS_PLACED', productIds: srvLines.map((c) => c.productId), orders: r.orders.map((o) => orderFromServer({ ...o, items: itemsOf(state, srvLines, o.company) })) });
      carregarCarteira(dispatch).catch(() => {});
      carregarCatalogo(dispatch).catch(() => {}); // estoque novo
    } catch (e) {
      return { ok: false, message: e.message || 'Não foi possível finalizar a compra. Tente de novo.' };
    }
  }
  if (hasLocal) dispatch({ type: 'CHECKOUT' });
  return { ok: true };
}

function itemsOf(state, lines, company) {
  return lines
    .map((c) => ({ c, p: state.products.find((x) => x.id === c.productId) }))
    .filter(({ p }) => p && state.stores.find((s) => s.id === p.storeId && s.name === company))
    .map(({ c, p }) => ({ name: p.name, qty: c.qty, price: p.price }));
}

// Depósito na carteira: com a conta ligada, vai para o servidor.
// Devolve true se foi pelo servidor (o app não soma de novo no celular).
export async function depositar(state, dispatch, amount, method) {
  if (!conectado(state)) return false;
  const m = /cart/i.test(method || '') ? 'cartao' : /bolet/i.test(method || '') ? 'boleto' : 'pix';
  const r = await api('POST', '/wallet/deposit', { amount, method: m });
  if (r.wallet) dispatch({ type: 'SERVER_WALLET', balance: r.wallet.balance, giftCredits: r.wallet.giftCredits });
  if (r.status === 'pendente') throw Object.assign(new Error('Depósito registrado. O saldo entra assim que o pagamento for confirmado.'), { pendente: true });
  return true;
}

// Empresa cadastrando produto: com a conta ligada, o produto vai para o servidor e aparece para todos.
export async function publicarProduto(state, product) {
  if (!conectado(state)) return null;
  return api('POST', '/products', {
    name: product.name,
    description: product.description || product.detail || '',
    category: product.category || 'Vários',
    price: Number(product.price) || 0,
    stock: Number(product.stock) || 0,
    photo: product.photo && String(product.photo).startsWith(API_URL) ? product.photo.slice(API_URL.length) : undefined,
    classe: product.classe || undefined,
    subclasse: product.subclasse || undefined,
  });
}

// Quanto sai da carteira ao finalizar: conta ligada paga só o que é do servidor.
export const aPagar = (state, totalLocal) => (conectado(state) ? totalServidor(state) : totalLocal);
