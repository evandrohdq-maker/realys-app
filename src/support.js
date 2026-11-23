// Suporte do Realyz para os usuários.
// 1) Perguntas frequentes. 2) A Lotus responde na hora as dúvidas comuns. 3) O que ela não resolve
// vira um chamado, que a equipe responde pelo painel do administrador (aba Suporte).
// Assuntos de dinheiro, conta bloqueada e biometria entram na frente da fila.
// Na demonstração fica salvo no celular; com o servidor, os chamados passam por ele (server/src/routes/suporte.js):
// o usuário e a equipe enxergam o mesmo chamado, e a resposta chega na hora (WebSocket ou notificação).
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, serverOn, connectEvents } from './api';

export const SUPPORT_TOPICS = [
  { key: 'pagamento', label: 'Pagamento e carteira', icon: 'wallet-outline', urgent: true },
  { key: 'conta', label: 'Conta e acesso', icon: 'person-circle-outline', urgent: true },
  { key: 'biometria', label: 'Biometria', icon: 'finger-print', urgent: true },
  { key: 'pedido', label: 'Pedido ou entrega', icon: 'cube-outline' },
  { key: 'servico', label: 'Serviço contratado', icon: 'construct-outline' },
  { key: 'loja', label: 'Minha loja ou anúncio', icon: 'storefront-outline' },
  { key: 'app', label: 'Problema no app', icon: 'bug-outline' },
  { key: 'outro', label: 'Outro assunto', icon: 'help-circle-outline' },
];
export const topicOf = (key) => SUPPORT_TOPICS.find((t) => t.key === key) || SUPPORT_TOPICS[SUPPORT_TOPICS.length - 1];
export const STATUS_LABEL = { aberto: 'Aguardando a equipe', respondido: 'Respondido', resolvido: 'Resolvido' };

// Perguntas frequentes: src/supportFaq.js (a Lotus também usa).
import { FAQ } from './supportFaq';
import { askRealys } from './lm/realysKnowledge';
export { FAQ };


const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// A Lotus procura a pergunta frequente que mais combina com a dúvida. Sem combinação boa, devolve null.
// A Lotus responde pelo conhecimento do Realyz (src/lm/realysKnowledge.js): entende pelo sentido,
// usa as regras e taxas do app, o Termo de Adesão e os dados da própria conta (saldo, pedidos...).
// Sem resposta boa, cai nas perguntas frequentes por palavra-chave.
export function lotusAnswer(text, state) {
  const r = askRealys(text, state);
  if (r && r.reply) return { q: text, a: r.reply, topic: r.topic, confident: r.confident, suggestions: r.suggestions, go: r.go };
  const t = norm(text);
  let best = null;
  let score = 0;
  FAQ.forEach((f) => {
    const s = f.keys.reduce((n, k) => n + (t.includes(norm(k)) ? (k.includes(' ') ? 2 : 1) : 0), 0);
    if (s > score) {
      score = s;
      best = f;
    }
  });
  if (score >= 1) return { ...best, suggestions: [] };
  return r && r.suggestions && r.suggestions.length ? { a: null, suggestions: r.suggestions } : null;
}
// Pelo texto, adivinha o assunto do chamado (a pessoa pode trocar).
export function guessTopic(text) {
  const f = lotusAnswer(text);
  return f && f.topic ? f.topic : 'outro';
}

const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const msg = (from, text, at = Date.now()) => ({ from, text, at, time: hhmm(at) });

const KEY = 'realys.support.v1';
let tickets = [];
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(tickets)).catch(() => {});

// ── Com o servidor ──
// Cada chamado guarda o id do servidor em srvId (o id da tela não muda depois de enviar).
const srv = () => serverOn();
const fromServer = (x) => {
  const local = tickets.find((t) => t.srvId === x.id || t.id === x.id);
  return { ...x, id: local ? local.id : x.id, srvId: x.id, messages: (x.messages || []).map((m) => ({ ...m, time: hhmm(m.at) })) };
};
let events = null;
let carregando = null;
export function refreshSupport() {
  if (!srv()) return Promise.resolve(tickets);
  if (carregando) return carregando;
  // Os meus chamados e, se eu for da equipe, a fila inteira (quem não é recebe 403 e fica só com os seus).
  carregando = Promise.all([api('GET', '/suporte/chamados').catch(() => null), api('GET', '/admin/suporte').catch(() => null)])
    .then(([meus, fila]) => {
      if (!meus && !fila) return tickets;
      const all = new Map();
      [...(fila || []), ...(meus || [])].forEach((x) => all.set(x.id, fromServer(x)));
      // Mantém o que ainda está sendo enviado (sem srvId).
      const enviando = tickets.filter((t) => !t.srvId);
      tickets = [...enviando, ...all.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      emit();
      return tickets;
    })
    .finally(() => (carregando = null));
  return carregando;
}
const putServer = (localId, x) => {
  if (!x || !x.id) return;
  tickets = tickets.map((t) => (t.id === localId ? { ...fromServer(x), id: localId } : t));
  emit();
};
const falhou = (e) => {
  try {
    require('react-native').Alert.alert('Suporte', (e && e.message) || 'Não deu para enviar agora. Confira a internet e tente de novo.');
  } catch (er) {}
};

export function useSupport() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (srv()) {
      refreshSupport();
      if (!events) events = connectEvents((e) => /^suporte/.test(e.type) && refreshSupport());
    } else if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (raw) {
            tickets = JSON.parse(raw);
            emit();
          }
        })
        .catch(() => {});
    }
    return () => subs.delete(fn);
  }, []);
  return tickets;
}

// Abre um chamado para a equipe. Devolve o número.
export function openTicket({ user, topic, text, lotusTried }) {
  const at = Date.now();
  const t = topicOf(topic);
  const n = 1000 + tickets.length + 1;
  const ticket = {
    id: 'tk' + at,
    n,
    userId: user.id || user.username || user.name,
    userName: user.name,
    topic: t.key,
    urgent: !!t.urgent,
    status: 'aberto',
    at,
    updatedAt: at,
    unreadUser: 0,
    messages: [msg('user', text, at), msg('system', `Chamado nº ${n} aberto${t.urgent ? ' com prioridade' : ''}. A equipe do Realyz responde por aqui.`, at)],
    lotusTried: !!lotusTried,
  };
  tickets = [ticket, ...tickets];
  if (srv()) {
    emit();
    api('POST', '/suporte/chamados', { topic: t.key, text, lotusTried: !!lotusTried })
      .then((x) => putServer(ticket.id, x))
      .catch((e) => {
        tickets = tickets.filter((k) => k.id !== ticket.id);
        emit();
        falhou(e);
      });
    return ticket;
  }
  save();
  emit();
  return ticket;
}
// Muda na tela na hora; com o servidor, envia e depois fica com a versão do servidor.
const patch = (id, fn, send) => {
  const t0 = tickets.find((t) => t.id === id);
  tickets = tickets.map((t) => (t.id === id ? fn(t) : t));
  emit();
  if (srv()) {
    if (send && t0 && t0.srvId) send(t0.srvId).then((x) => x && x.id && putServer(id, x)).catch((e) => (falhou(e), refreshSupport()));
    return;
  }
  save();
};
export const userReply = (id, text) => patch(id, (t) => ({ ...t, status: 'aberto', updatedAt: Date.now(), messages: [...t.messages, msg('user', text)] }), (s) => api('POST', `/suporte/chamados/${s}/msg`, { text }));
export const teamReply = (id, text, by = 'Equipe Realyz') => patch(id, (t) => ({ ...t, status: 'respondido', updatedAt: Date.now(), unreadUser: (t.unreadUser || 0) + 1, messages: [...t.messages, { ...msg('team', text), by }] }), (s) => api('POST', `/admin/suporte/${s}/msg`, { text, by }));
export const closeTicket = (id, by = 'user') =>
  patch(
    id,
    (t) => ({ ...t, status: 'resolvido', updatedAt: Date.now(), messages: [...t.messages, msg('system', by === 'user' ? 'Você marcou o chamado como resolvido.' : 'A equipe encerrou o chamado. Se precisar, é só responder para reabrir.')] }),
    (s) => api('POST', by === 'user' ? `/suporte/chamados/${s}/fechar` : `/admin/suporte/${s}/fechar`)
  );
export const rateTicket = (id, stars) => patch(id, (t) => ({ ...t, rating: stars }), (s) => api('POST', `/suporte/chamados/${s}/nota`, { stars }));
export const markRead = (id) => patch(id, (t) => (t.unreadUser ? { ...t, unreadUser: 0 } : t), (s) => api('POST', `/suporte/chamados/${s}/lido`).then(() => null));

export const ticketsOf = (user) => {
  // Com o servidor: os meus são os que o servidor devolveu com o meu id da conta (ou que eu acabei de abrir).
  if (srv() && user && user.serverId) return tickets.filter((t) => t.userId === user.serverId || !t.srvId);
  const uid = user && (user.id || user.username || user.name);
  return tickets.filter((t) => t.userId === uid);
};
// Fila da equipe: primeiro quem está esperando, os urgentes na frente, do mais antigo para o mais novo.
export function supportQueue() {
  const rank = (t) => (t.status === 'aberto' ? 0 : t.status === 'respondido' ? 1 : 2);
  return [...tickets].sort((a, b) => rank(a) - rank(b) || (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.updatedAt - b.updatedAt);
}
export function supportSummary() {
  const open = tickets.filter((t) => t.status === 'aberto');
  const rated = tickets.filter((t) => t.rating);
  return {
    waiting: open.length,
    urgent: open.filter((t) => t.urgent).length,
    answered: tickets.filter((t) => t.status === 'respondido').length,
    solved: tickets.filter((t) => t.status === 'resolvido').length,
    rating: rated.length ? Math.round((rated.reduce((s, t) => s + t.rating, 0) / rated.length) * 10) / 10 : null,
  };
}
// Respostas prontas para a equipe ganhar tempo.
export const QUICK_REPLIES = [
  'Olá! Recebemos o seu chamado e já estamos verificando.',
  'Pode nos enviar mais detalhes, por favor? Em qual tela aconteceu e o que apareceu?',
  'Conferimos aqui e o valor foi devolvido para a sua carteira Realyz.',
  'Problema corrigido. Feche e abra o app para atualizar.',
];
