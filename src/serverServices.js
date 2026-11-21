// Serviços de verdade pelo servidor do Realyz (api.realyz.com.br).
//
// - Prestadores cadastrados no servidor e disponíveis perto do cliente aparecem em Serviços junto
//   com os de demonstração (id começando com "srv_").
// - Pedir visita a um prestador do servidor: a taxa de visita sai da carteira do servidor e fica retida.
//   Recusou ou não veio: volta. O cliente confirma a visita: o Realyz fica com 15% e o resto vai ao prestador.
// - Chamar corrida de um motorista do servidor: o chamado vai para o celular dele.
// - Prestador: cadastro (funções, valores e taxa de visita), ficar disponível com o GPS e responder chamados
//   (src/components/ServerProviderPanel.js).
// Sem servidor configurado, nada disso roda.
import { api } from './api';
import { getDevicePoint } from './geo';
import { SRV, conectado, carregarCarteira } from './serverShop';

export const providerFromServer = (p) => ({
  id: SRV + p.id,
  serverId: p.id,
  name: p.name,
  photo: p.photo || null,
  service: p.service,
  functions: p.functions || [],
  price: p.price,
  priceUnit: p.priceUnit,
  visitFee: p.visitFee || undefined,
  vehicle: p.vehicle || null,
  rating: p.ratingCount ? p.rating : 5,
  ratingCount: p.ratingCount || 0,
  distanceKm: p.distanceKm,
  etaMin: p.etaMin,
  available: p.available,
  verified: true,
  real: true,
});

// Prestadores disponíveis perto de quem está usando o app (até 20 km, com posição dos últimos 15 min).
export async function carregarPrestadores(dispatch) {
  const pt = await getDevicePoint();
  if (!pt) return;
  const list = await api('GET', `/providers/nearby?lat=${pt.lat}&lng=${pt.lon}&max=20`);
  dispatch({ type: 'SERVER_PROVIDERS', providers: list.map(providerFromServer) });
}

// Chamado do servidor → visita no formato do app (cartão em Serviços › Minhas visitas).
const VISIT = { Solicitado: 'aguardando', Aceito: 'aceita', 'A caminho': 'aceita', Chegou: 'aceita', Concluído: 'aceita', Recusado: 'recusada' };
export function visitFromCall(c, provider) {
  let status = VISIT[c.status] || 'aguardando';
  if (c.visitState === 'liberada') status = c.status === 'Concluído' ? 'confirmada' : 'confirmada';
  if (c.status === 'Cancelado') status = c.visitState === 'devolvida' ? 'faltou' : 'recusada';
  return {
    id: SRV + c.id,
    serverId: c.id,
    providerId: SRV + c.providerId,
    provider: provider || { id: SRV + c.providerId, name: c.provider, service: c.service },
    serviceKey: c.service,
    serviceLabel: c.service,
    fee: c.visitFee,
    discount: false,
    address: c.address || '',
    problem: c.problem || '',
    when: c.when || 'Assim que possível',
    status,
    split: c.visitState === 'liberada' ? { realys: +(c.visitFee * 0.15).toFixed(2), provider: +(c.visitFee * 0.85).toFixed(2) } : undefined,
    at: c.createdAt || Date.now(),
  };
}

// Pedir visita. Devolve { ok, message }.
export async function pedirVisita(state, dispatch, p, { problem, address, when, serviceLabel }) {
  if (!p.serverId) {
    dispatch({ type: 'VISIT_REQUEST', provider: p, serviceLabel, problem, address, when });
    return { ok: true };
  }
  if (!conectado(state)) return { ok: false, message: 'Para chamar prestadores do Realyz, entre com a sua conta (cadastro com senha e biometria).' };
  try {
    const c = await api('POST', '/calls', { providerId: p.serverId, problem, address, when: when && !/assim que/i.test(when) ? when : undefined });
    dispatch({ type: 'SERVER_VISIT_ADD', visit: { ...visitFromCall(c, p), serviceLabel: serviceLabel || p.service } });
    carregarCarteira(dispatch).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// Confirmar a visita ou avisar que o prestador não veio (visitas do servidor).
export async function acaoVisita(dispatch, v, acao) {
  const path = acao === 'VISIT_CONFIRM' ? 'confirmar-visita' : 'nao-compareceu';
  const c = await api('POST', `/calls/${v.serverId}/${path}`);
  dispatch({ type: 'SERVER_VISITS_SYNC', visits: [visitFromCall(c, v.provider)] });
  carregarCarteira(dispatch).catch(() => {});
}

// Chamados do cliente: atualiza o status das visitas (aceitou, recusou...).
export async function carregarVisitas(state, dispatch) {
  const me = state.user && state.user.serverId;
  const list = await api('GET', '/calls');
  const mine = list.filter((c) => c.clientId === me && c.visitFee > 0);
  dispatch({ type: 'SERVER_VISITS_SYNC', visits: mine.map((c) => visitFromCall(c)) });
}

// Corrida com motorista/motoboy do servidor: manda o chamado para ele.
export async function chamarCorrida(state, p, { address, when } = {}) {
  if (!p.serverId || !conectado(state)) return null;
  return api('POST', '/calls', { providerId: p.serverId, address, when: when || undefined });
}
