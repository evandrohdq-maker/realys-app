// Suporte do Re@lys para os usuários.
// 1) Perguntas frequentes. 2) A Lotus responde na hora as dúvidas comuns. 3) O que ela não resolve
// vira um chamado, que a equipe responde pelo painel do administrador (aba Suporte).
// Assuntos de dinheiro, conta bloqueada e biometria entram na frente da fila.
// Na demonstração fica salvo no celular; com o servidor, os chamados passam por ele.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Perguntas frequentes. keys: palavras que a Lotus procura na dúvida da pessoa.
export const FAQ = [
  { id: 'f1', topic: 'biometria', q: 'Por que preciso cadastrar a biometria?', a: 'A biometria confirma que cada conta é de uma pessoa de verdade. Sem ela você navega e interage, mas não compra nem contrata. Para cadastrar, vá em Perfil e toque em "Conta no modo social".', keys: ['biometria', 'rosto', 'digital', 'facial', 'modo social', 'verificar', 'verificacao'] },
  { id: 'f2', topic: 'pagamento', q: 'Como coloco saldo na carteira?', a: 'Vá em Perfil › Carteira › Depositar, escolha o valor e pague pelo Pix. O saldo entra assim que o pagamento é confirmado.', keys: ['depositar', 'deposito', 'saldo', 'pix', 'colocar dinheiro', 'recarga', 'carteira'] },
  { id: 'f3', topic: 'pagamento', q: 'Como saco o meu dinheiro?', a: 'Em Perfil › Carteira › Sacar. O valor vai por Pix para uma conta no seu CPF ou CNPJ. Créditos de presente não podem ser sacados: servem para comprar no Re@lys.', keys: ['sacar', 'saque', 'retirar', 'transferir', 'receber dinheiro'] },
  { id: 'f4', topic: 'pedido', q: 'Meu pedido não chegou. O que eu faço?', a: 'Abra Pedidos e toque no pedido para acompanhar a entrega e falar com a loja. Se passou do prazo e ninguém respondeu, abra um chamado aqui: o pagamento fica protegido até a entrega ser confirmada.', keys: ['pedido', 'entrega', 'nao chegou', 'atrasado', 'atraso', 'entregador', 'compra'] },
  { id: 'f5', topic: 'pedido', q: 'Como peço reembolso?', a: 'Em Pedidos, abra a compra e toque em "Tive um problema". A loja tem prazo para responder. Se não houver acordo, o Re@lys analisa e devolve o valor para a sua carteira quando for o caso.', keys: ['reembolso', 'devolver', 'devolucao', 'estorno', 'dinheiro de volta', 'cancelar pedido', 'cancelar'] },
  { id: 'f6', topic: 'servico', q: 'O prestador não apareceu. E agora?', a: 'A taxa de visita fica reservada e só é liberada quando a visita acontece. Se o prestador não veio, abra o chamado em Pedidos › Aguardando ou Serviços e o valor volta para a sua carteira.', keys: ['prestador', 'nao veio', 'nao apareceu', 'visita', 'servico', 'taxa de visita', 'eletricista', 'encanador'] },
  { id: 'f7', topic: 'conta', q: 'Problema com a senha ou com o acesso', a: 'Confira se o usuário e a senha estão certos (maiúsculas e minúsculas contam). Para trocar a senha, ou se o celular foi trocado ou roubado, abra um chamado de Conta e acesso: a equipe confirma a sua identidade pela biometria antes de liberar.', keys: ['senha', 'entrar', 'login', 'acesso', 'esqueci', 'bloqueada', 'bloqueado', 'celular roubado', 'trocar celular'] },
  { id: 'f8', topic: 'loja', q: 'Quanto a loja paga para vender no Re@lys?', a: 'A loja paga 10% sobre cada venda. O plano da loja (R$ 49,90 por mês, ou anual por 75% do valor) só começa quando ela aceita o primeiro pedido, e o primeiro mês é gratuito.', keys: ['taxa', 'comissao', 'plano', 'mensalidade', 'loja', 'vender', '49', 'quanto custa'] },
  { id: 'f9', topic: 'loja', q: 'Como anuncio no Re@lys?', a: 'Empresa: no Painel, cartão Divulgação. Usuário: em Negócios, toque em Anunciar. Os espaços de publicidade têm preço fechado e você contrata direto no app.', keys: ['anunciar', 'anuncio', 'propaganda', 'publicidade', 'divulgar', 'divulgacao'] },
  { id: 'f10', topic: 'app', q: 'O app está travando ou com erro', a: 'Feche o Re@lys e abra de novo: ele se atualiza sozinho ao abrir, com internet. Se continuar, abra um chamado dizendo em qual tela acontece. Isso ajuda a equipe a corrigir rápido.', keys: ['travando', 'travou', 'erro', 'bug', 'lento', 'fechando', 'nao abre', 'atualizar', 'atualizacao'] },
  { id: 'f11', topic: 'conta', q: 'Como apago a minha conta e os meus dados?', a: 'Abra um chamado de Conta e acesso pedindo a exclusão. A equipe confirma a sua identidade e apaga a conta e a biometria, guardando só o que a lei obriga.', keys: ['apagar conta', 'excluir conta', 'deletar', 'meus dados', 'lgpd', 'privacidade', 'excluir'] },
  { id: 'f12', topic: 'outro', q: 'Sofri um golpe ou fui ofendido por alguém', a: 'Toque em Denunciar no perfil ou na mensagem da pessoa. Em caso de perigo, use o SOS no Perfil. Abra também um chamado aqui contando o que houve: como toda conta tem dono identificado, a equipe consegue agir.', keys: ['golpe', 'fraude', 'ofensa', 'assedio', 'ameaca', 'denunciar', 'denuncia', 'enganado'] },
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// A Lotus procura a pergunta frequente que mais combina com a dúvida. Sem combinação boa, devolve null.
export function lotusAnswer(text) {
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
  return score >= 1 ? best : null;
}
// Pelo texto, adivinha o assunto do chamado (a pessoa pode trocar).
export function guessTopic(text) {
  const f = lotusAnswer(text);
  return f ? f.topic : 'outro';
}

const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const msg = (from, text, at = Date.now()) => ({ from, text, at, time: hhmm(at) });

const KEY = 'realys.support.v1';
let tickets = [];
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(tickets)).catch(() => {});

export function useSupport() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (!loaded) {
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
    messages: [msg('user', text, at), msg('system', `Chamado nº ${n} aberto${t.urgent ? ' com prioridade' : ''}. A equipe do Re@lys responde por aqui.`, at)],
    lotusTried: !!lotusTried,
  };
  tickets = [ticket, ...tickets];
  save();
  emit();
  return ticket;
}
const patch = (id, fn) => {
  tickets = tickets.map((t) => (t.id === id ? fn(t) : t));
  save();
  emit();
};
export const userReply = (id, text) => patch(id, (t) => ({ ...t, status: 'aberto', updatedAt: Date.now(), messages: [...t.messages, msg('user', text)] }));
export const teamReply = (id, text, by = 'Equipe Re@lys') => patch(id, (t) => ({ ...t, status: 'respondido', updatedAt: Date.now(), unreadUser: (t.unreadUser || 0) + 1, messages: [...t.messages, { ...msg('team', text), by }] }));
export const closeTicket = (id, by = 'user') =>
  patch(id, (t) => ({ ...t, status: 'resolvido', updatedAt: Date.now(), messages: [...t.messages, msg('system', by === 'user' ? 'Você marcou o chamado como resolvido.' : 'A equipe encerrou o chamado. Se precisar, é só responder para reabrir.')] }));
export const rateTicket = (id, stars) => patch(id, (t) => ({ ...t, rating: stars }));
export const markRead = (id) => patch(id, (t) => (t.unreadUser ? { ...t, unreadUser: 0 } : t));

export const ticketsOf = (user) => {
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
  'Conferimos aqui e o valor foi devolvido para a sua carteira Re@lys.',
  'Problema corrigido. Feche e abra o app para atualizar.',
];
