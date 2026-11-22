// Amizades das contas reais (servidor): amigos, pedidos recebidos e pedidos enviados.
// Carrega ao abrir e se atualiza sozinho quando chega um pedido ou um aceite (WebSocket).
// Usado nos Contatos (Feed › Conversas), na busca de pessoas e no perfil das contas reais.
import { useEffect, useState } from 'react';
import { api, serverOn, connectEvents, API_URL } from './api';

let data = { list: [], loaded: false };
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
let loading = null;
let events = null;

export function refreshFriends() {
  if (!serverOn()) return Promise.resolve([]);
  if (loading) return loading;
  loading = api('GET', '/friends')
    .then((l) => {
      data = { list: (l || []).map((u) => ({ ...u, photo: u.photo && u.photo.startsWith('/') ? API_URL + u.photo : u.photo })), loaded: true };
      emit();
      return data.list;
    })
    .catch(() => data.list)
    .finally(() => (loading = null));
  return loading;
}

// on: a conta está ligada ao servidor (conectado(state)).
export function useServerFriends(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (on) {
      refreshFriends();
      if (!events) events = connectEvents((e) => /^friend_/.test(e.type) && refreshFriends());
    }
    return () => subs.delete(fn);
  }, [on]);
  const list = on ? data.list : [];
  return {
    friends: list.filter((u) => u.friend === 'amigos'),
    received: list.filter((u) => u.friend === 'recebido'),
    sent: list.filter((u) => u.friend === 'enviado'),
    statusOf: (id) => (list.find((u) => u.id === id) || {}).friend || null,
  };
}

// Ações de amizade (todas atualizam a lista em seguida).
export const addFriend = (id) => api('POST', `/friends/${id}`).then((r) => (refreshFriends(), r));
export const removeFriend = (id) => api('DELETE', `/friends/${id}`).then(() => refreshFriends());

// Convite (sala de voz da Arena, reunião do Hub…) mandado como mensagem no Realyz: cai na conversa
// da pessoa e, com o app fechado, vira notificação.
export const sendInviteMessage = (userId, text) => api('POST', '/messages', { toId: userId, text });
