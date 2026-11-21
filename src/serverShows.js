// Ponte entre a contratação de artistas do app (src/artistShows.js) e o servidor (server/src/routes/shows.js).
// Conta ligada ao servidor: a vitrine sobe para todo mundo, os artistas do servidor aparecem na lista,
// e os pedidos com artista do servidor (pagamento, resposta, conversa, divulgação) passam por ele.
// Sem servidor, tudo continua funcionando no celular (demonstração).
import { api, serverOn } from './api';
import { setServerArtists, getShows, replaceServerPedidos } from './artistShows';

const pic = (seed) => `https://picsum.photos/seed/${seed}/900/600`;

export function salvarVitrine(mine) {
  const { id, ref, rating, shows, updatedAt, ...body } = mine;
  return api('PUT', '/shows/me', body);
}

export async function carregarArtistas() {
  if (!serverOn()) return [];
  const list = await api('GET', '/shows/artistas');
  const mapped = (list || []).map((a) => ({ ...a, server: true, ref: { member: a.id }, logo: '🎤', foto: a.foto || pic('realys-show-' + a.id) }));
  setServerArtists(mapped);
  return mapped;
}

// Pedidos do servidor (como cliente e como artista) entram no lugar dos locais com o mesmo serverId.
export async function sincronizarPedidos() {
  if (!serverOn()) return;
  const list = await api('GET', '/shows/pedidos');
  const artists = getShows().server || [];
  replaceServerPedidos(
    (list || []).map((p) => {
      const a = artists.find((x) => x.id === p.artistaId) || {};
      return {
        ...p, id: 'srv-' + p.id, serverId: p.id, artista: { id: p.artistaId, nome: p.artista, foto: a.foto || null, logo: '🎤', genero: a.genero || '', cidade: a.cidade || '' },
        divulgacao: { artista: Array(p.divulgacao.artista).fill(0), contratante: Array(p.divulgacao.contratante).fill(0) }, at: p.createdAt,
      };
    })
  );
}

export async function enviarPedido(body) {
  const p = await api('POST', '/shows/pedidos', body);
  sincronizarPedidos().catch(() => {});
  return p;
}

// Ação num pedido do servidor: responder, pagar, cancelar, realizado, mensagens, divulgacao.
export async function acaoPedido(p, acao, body) {
  const r = await api('POST', `/shows/pedidos/${p.serverId}/${acao}`, body || {});
  await sincronizarPedidos().catch(() => {});
  return r;
}
