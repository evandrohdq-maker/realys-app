// CRM da empresa: cada conversa com cliente vira um atendimento que anda por etapas, do primeiro
// contato até a venda fechada. Guarda a conversa, o valor, as notas e a data de cada etapa.
// Na demonstração fica salvo no celular; com o servidor, as conversas chegam dos clientes de verdade.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CRM_STAGES = [
  { key: 'novo', label: 'Novo contato', short: 'Novo', icon: 'sparkles-outline', hint: 'O cliente chamou. Responda rápido.' },
  { key: 'conversa', label: 'Em conversa', short: 'Conversa', icon: 'chatbubbles-outline', hint: 'Entenda o que ele precisa.' },
  { key: 'proposta', label: 'Proposta enviada', short: 'Proposta', icon: 'document-text-outline', hint: 'Preço e condições na mão do cliente.' },
  { key: 'negociacao', label: 'Negociação', short: 'Negociação', icon: 'swap-horizontal-outline', hint: 'Ajuste de preço, prazo ou entrega.' },
  { key: 'fechado', label: 'Venda fechada', short: 'Fechada', icon: 'checkmark-circle-outline', hint: 'Vendido. Hora de entregar bem.' },
];
export const CRM_LOST = { key: 'perdido', label: 'Não fechou', short: 'Não fechou', icon: 'close-circle-outline' };
export const CRM_ORIGINS = ['Shop', 'Food', 'Reels', 'Anúncio', 'Página', 'Indicação'];
export const CRM_LOST_REASONS = ['Achou caro', 'Comprou em outro lugar', 'Parou de responder', 'Sem estoque', 'Desistiu'];
export const stageOf = (key) => CRM_STAGES.find((s) => s.key === key) || (key === 'perdido' ? CRM_LOST : CRM_STAGES[0]);
export const stageIndex = (key) => CRM_STAGES.findIndex((s) => s.key === key);

const now = Date.now();
const h = (hours) => now - hours * 3600000;
const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const msg = (from, text, at) => ({ from, text, at, time: hhmm(at) });

// Atendimentos de exemplo (a empresa de demonstração é um mercadinho).
const SEED = [
  {
    id: 'l1', client: 'Marina Costa', origin: 'Shop', interest: 'Cesta de café da manhã para 20 pessoas', value: 480, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(1) }],
    messages: [msg('them', 'Oi! Vocês montam cesta de café da manhã para empresa? Preciso de 20 para sexta.', h(1))],
  },
  {
    id: 'l2', client: 'Restaurante Sabor Caseiro', origin: 'Anúncio', interest: 'Compra semanal de hortifrúti', value: 1250, stage: 'conversa', unread: 0, note: 'Compra toda segunda. Quer entrega até 9h.', followUp: null,
    history: [{ stage: 'novo', at: h(50) }, { stage: 'conversa', at: h(47) }],
    messages: [msg('them', 'Bom dia, vi o anúncio de vocês. Fazem entrega semanal de hortifrúti?', h(50)), msg('me', 'Bom dia! Fazemos sim. Me passa a lista do que usa por semana?', h(47)), msg('them', 'Mando hoje à tarde.', h(46))],
  },
  {
    id: 'l3', client: 'João Pereira', origin: 'Reels', interest: 'Kit churrasco para 30 pessoas', value: 890, stage: 'proposta', unread: 0, note: '', followUp: h(-20),
    history: [{ stage: 'novo', at: h(75) }, { stage: 'conversa', at: h(74) }, { stage: 'proposta', at: h(70) }],
    messages: [msg('them', 'Vi o reel do kit churrasco. Quanto fica para 30 pessoas?', h(75)), msg('me', 'Para 30 pessoas: R$ 890, com carvão e entrega. Mandei os detalhes.', h(70))],
  },
  {
    id: 'l4', client: 'Condomínio Jardim das Flores', origin: 'Indicação', interest: 'Festa de fim de ano: bebidas e descartáveis', value: 2300, stage: 'negociacao', unread: 2, note: 'Síndica pediu 5% de desconto no pagamento à vista.', followUp: null,
    history: [{ stage: 'novo', at: h(170) }, { stage: 'conversa', at: h(168) }, { stage: 'proposta', at: h(120) }, { stage: 'negociacao', at: h(30) }],
    messages: [msg('me', 'Segue a proposta: R$ 2.300 com entrega no salão.', h(120)), msg('them', 'Conseguem 5% à vista?', h(30)), msg('them', 'Se sim, fechamos hoje.', h(29))],
  },
  {
    id: 'l5', client: 'Padaria Pão Quente', origin: 'Página', interest: 'Farinha e açúcar no atacado', value: 1640, stage: 'fechado', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(300) }, { stage: 'conversa', at: h(298) }, { stage: 'proposta', at: h(280) }, { stage: 'negociacao', at: h(260) }, { stage: 'fechado', at: h(240) }],
    messages: [msg('them', 'Fechado! Pode entregar na terça.', h(240)), msg('me', 'Combinado. Obrigado pela preferência! 🙌', h(239))],
  },
  {
    id: 'l6', client: 'Carla Mendes', origin: 'Food', interest: 'Encomenda de salgados para aniversário', value: 320, stage: 'perdido', lostReason: 'Achou caro', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(400) }, { stage: 'conversa', at: h(398) }, { stage: 'proposta', at: h(390) }, { stage: 'perdido', at: h(350) }],
    messages: [msg('them', 'Obrigada, mas achei outro lugar mais em conta.', h(350))],
  },
];

const KEY = 'realys.crm.v1';
let leads = SEED;
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(leads)).catch(() => {});
const patch = (id, fn) => {
  leads = leads.map((l) => (l.id === id ? fn(l) : l));
  save();
  emit();
};

export function useCrm() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (raw) {
            leads = JSON.parse(raw);
            emit();
          }
        })
        .catch(() => {});
    }
    return () => subs.delete(fn);
  }, []);
  return leads;
}

// Muda de etapa e registra a data na linha do tempo.
export function crmMove(id, stage, extra = {}) {
  patch(id, (l) => (l.stage === stage ? l : { ...l, ...extra, stage, lostReason: stage === 'perdido' ? extra.lostReason || l.lostReason : null, history: [...l.history, { stage, at: Date.now() }] }));
}
export function crmSend(id, text) {
  const at = Date.now();
  // Respondeu um contato novo: o atendimento passa sozinho para "Em conversa".
  patch(id, (l) => ({
    ...l,
    unread: 0,
    messages: [...l.messages, msg('me', text, at)],
    ...(l.stage === 'novo' ? { stage: 'conversa', history: [...l.history, { stage: 'conversa', at }] } : {}),
  }));
}
export const crmRead = (id) => patch(id, (l) => (l.unread ? { ...l, unread: 0 } : l));
export const crmUpdate = (id, data) => patch(id, (l) => ({ ...l, ...data }));
export function crmAdd({ client, interest, value, origin }) {
  const at = Date.now();
  const lead = { id: 'l' + at, client, origin: origin || 'Indicação', interest, value: value || 0, stage: 'novo', unread: 0, note: '', followUp: null, history: [{ stage: 'novo', at }], messages: [] };
  leads = [lead, ...leads];
  save();
  emit();
  return lead.id;
}
export function crmRemove(id) {
  leads = leads.filter((l) => l.id !== id);
  save();
  emit();
}

// Números do funil.
export function crmSummary(list = leads) {
  const open = list.filter((l) => l.stage !== 'fechado' && l.stage !== 'perdido');
  const won = list.filter((l) => l.stage === 'fechado');
  const lost = list.filter((l) => l.stage === 'perdido');
  const done = won.length + lost.length;
  return {
    openCount: open.length,
    openValue: open.reduce((s, l) => s + (l.value || 0), 0),
    wonCount: won.length,
    wonValue: won.reduce((s, l) => s + (l.value || 0), 0),
    lostCount: lost.length,
    rate: done ? Math.round((won.length / done) * 100) : 0,
    unread: list.reduce((s, l) => s + (l.unread || 0), 0),
  };
}
// Há quanto tempo o atendimento está parado na etapa atual.
export function crmIdle(l, at = Date.now()) {
  const last = l.history[l.history.length - 1];
  const hrs = Math.max(0, Math.round((at - (last ? last.at : at)) / 3600000));
  return hrs < 1 ? 'agora há pouco' : hrs < 24 ? `há ${hrs} h` : `há ${Math.round(hrs / 24)} dia${Math.round(hrs / 24) > 1 ? 's' : ''}`;
}
