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
// Quadros: cada tipo de negócio tem o seu CRM, com os nomes das etapas do jeito que ele trabalha.
// As chaves das etapas são as mesmas; só o nome muda.
export const CRM_BOARDS = {
  empresa: { title: 'Clientes', sub: 'Do primeiro contato até a venda fechada, etapa por etapa.', won: 'vendas fechadas', close: 'Fechar a venda', labels: {} },
  prestador: {
    title: 'Clientes', sub: 'Do pedido de orçamento até o serviço concluído.', won: 'serviços concluídos', close: 'Concluir o serviço', tab: 'Serviços',
    labels: { novo: ['Novo pedido', 'Novo'], proposta: ['Orçamento enviado', 'Orçamento'], negociacao: ['Agendado', 'Agendado'], fechado: ['Serviço concluído', 'Concluído'] },
    hints: { novo: 'Pediram orçamento. Responda rápido.', conversa: 'Entenda o serviço e combine a visita.', proposta: 'Orçamento na mão do cliente.', negociacao: 'Dia e hora combinados.', fechado: 'Serviço feito. Peça a avaliação.' },
  },
  aulas: {
    title: 'Alunos', sub: 'Do primeiro contato até o aluno matriculado.', won: 'alunos matriculados', close: 'Matricular o aluno', tab: 'Aulas',
    labels: { novo: ['Novo interessado', 'Novo'], proposta: ['Aula experimental', 'Experimental'], negociacao: ['Plano e horário', 'Plano'], fechado: ['Aluno matriculado', 'Matriculado'] },
    hints: { novo: 'Alguém quer aprender com você. Responda rápido.', conversa: 'Entenda o nível e o objetivo.', proposta: 'Aula experimental combinada.', negociacao: 'Pacote, valor e horário.', fechado: 'Aluno matriculado. Boas aulas!' },
  },
  online: {
    title: 'Atendimento online', sub: 'Do pedido de atendimento até a consulta feita por vídeo.', won: 'atendimentos feitos', close: 'Concluir o atendimento', tab: 'Online',
    labels: { novo: ['Novo pedido', 'Novo'], conversa: ['Triagem', 'Triagem'], proposta: ['Horário proposto', 'Horário'], negociacao: ['Agendado', 'Agendado'], fechado: ['Atendimento feito', 'Feito'] },
    hints: { novo: 'Pediram atendimento. Responda rápido.', conversa: 'Entenda o caso antes de marcar.', proposta: 'Horário enviado ao cliente.', negociacao: 'Dia e hora confirmados para a chamada de vídeo.', fechado: 'Atendimento concluído. Combine o retorno.' },
  },
  imoveis: {
    title: 'Clientes · Imóveis', sub: 'Do interesse no anúncio até o negócio fechado.', won: 'negócios fechados', close: 'Fechar o negócio',
    labels: { proposta: ['Visita marcada', 'Visita'], negociacao: ['Proposta', 'Proposta'], fechado: ['Negócio fechado', 'Fechado'] },
    hints: { novo: 'Interessado novo. Responda rápido.', conversa: 'Entenda o que ele procura.', proposta: 'Visita ao imóvel combinada.', negociacao: 'Proposta de valor e condições.', fechado: 'Contrato assinado.' },
  },
  veiculos: {
    title: 'Clientes · Veículos', sub: 'Do interesse no anúncio até a venda fechada.', won: 'vendas fechadas', close: 'Fechar a venda',
    labels: { proposta: ['Visita ou test drive', 'Test drive'], negociacao: ['Proposta', 'Proposta'], fechado: ['Venda fechada', 'Fechada'] },
    hints: { novo: 'Interessado novo. Responda rápido.', conversa: 'Tire as dúvidas sobre o veículo.', proposta: 'Cliente vem ver o veículo.', negociacao: 'Valor, troca e financiamento.', fechado: 'Vendido.' },
  },
};
export const crmBoard = (board) => CRM_BOARDS[board] || CRM_BOARDS.empresa;
export function crmStages(board) {
  const b = crmBoard(board);
  return CRM_STAGES.map((s) => ({ ...s, label: (b.labels[s.key] || [s.label])[0], short: (b.labels[s.key] || [s.label, s.short])[1] || s.short, hint: (b.hints && b.hints[s.key]) || s.hint }));
}
export const stageOf = (key, board) => crmStages(board).find((s) => s.key === key) || (key === 'perdido' ? CRM_LOST : crmStages(board)[0]);
export const stageIndex = (key) => CRM_STAGES.findIndex((s) => s.key === key);

const now = Date.now();
const h = (hours) => now - hours * 3600000;
const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const msg = (from, text, at) => ({ from, text, at, time: hhmm(at) });

// Atendimentos de exemplo (a empresa de demonstração é um mercadinho).
const SEED = [
  {
    board: 'empresa', id: 'l1', client: 'Marina Costa', origin: 'Shop', interest: 'Cesta de café da manhã para 20 pessoas', value: 480, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(1) }],
    messages: [msg('them', 'Oi! Vocês montam cesta de café da manhã para empresa? Preciso de 20 para sexta.', h(1))],
  },
  {
    board: 'empresa', id: 'l2', client: 'Restaurante Sabor Caseiro', origin: 'Anúncio', interest: 'Compra semanal de hortifrúti', value: 1250, stage: 'conversa', unread: 0, note: 'Compra toda segunda. Quer entrega até 9h.', followUp: null,
    history: [{ stage: 'novo', at: h(50) }, { stage: 'conversa', at: h(47) }],
    messages: [msg('them', 'Bom dia, vi o anúncio de vocês. Fazem entrega semanal de hortifrúti?', h(50)), msg('me', 'Bom dia! Fazemos sim. Me passa a lista do que usa por semana?', h(47)), msg('them', 'Mando hoje à tarde.', h(46))],
  },
  {
    board: 'empresa', id: 'l3', client: 'João Pereira', origin: 'Reels', interest: 'Kit churrasco para 30 pessoas', value: 890, stage: 'proposta', unread: 0, note: '', followUp: h(-20),
    history: [{ stage: 'novo', at: h(75) }, { stage: 'conversa', at: h(74) }, { stage: 'proposta', at: h(70) }],
    messages: [msg('them', 'Vi o reel do kit churrasco. Quanto fica para 30 pessoas?', h(75)), msg('me', 'Para 30 pessoas: R$ 890, com carvão e entrega. Mandei os detalhes.', h(70))],
  },
  {
    board: 'empresa', id: 'l4', client: 'Condomínio Jardim das Flores', origin: 'Indicação', interest: 'Festa de fim de ano: bebidas e descartáveis', value: 2300, stage: 'negociacao', unread: 2, note: 'Síndica pediu 5% de desconto no pagamento à vista.', followUp: null,
    history: [{ stage: 'novo', at: h(170) }, { stage: 'conversa', at: h(168) }, { stage: 'proposta', at: h(120) }, { stage: 'negociacao', at: h(30) }],
    messages: [msg('me', 'Segue a proposta: R$ 2.300 com entrega no salão.', h(120)), msg('them', 'Conseguem 5% à vista?', h(30)), msg('them', 'Se sim, fechamos hoje.', h(29))],
  },
  {
    board: 'empresa', id: 'l5', client: 'Padaria Pão Quente', origin: 'Página', interest: 'Farinha e açúcar no atacado', value: 1640, stage: 'fechado', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(300) }, { stage: 'conversa', at: h(298) }, { stage: 'proposta', at: h(280) }, { stage: 'negociacao', at: h(260) }, { stage: 'fechado', at: h(240) }],
    messages: [msg('them', 'Fechado! Pode entregar na terça.', h(240)), msg('me', 'Combinado. Obrigado pela preferência! 🙌', h(239))],
  },
  {
    board: 'empresa', id: 'l6', client: 'Carla Mendes', origin: 'Food', interest: 'Encomenda de salgados para aniversário', value: 320, stage: 'perdido', lostReason: 'Achou caro', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(400) }, { stage: 'conversa', at: h(398) }, { stage: 'proposta', at: h(390) }, { stage: 'perdido', at: h(350) }],
    messages: [msg('them', 'Obrigada, mas achei outro lugar mais em conta.', h(350))],
  },

  // Prestador de serviço
  {
    board: 'prestador', id: 'p1', client: 'Helena Duarte', origin: 'Reels', interest: 'Instalar 2 ar-condicionados split', value: 700, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(2) }],
    messages: [msg('them', 'Oi! Vi seu reel. Quanto fica para instalar 2 splits de 9.000 BTUs?', h(2))],
  },
  {
    board: 'prestador', id: 'p2', client: 'Sérgio Antunes', origin: 'Página', interest: 'Troca do quadro de luz', value: 950, stage: 'proposta', unread: 0, note: 'Casa antiga, fiação de alumínio.', followUp: null,
    history: [{ stage: 'novo', at: h(60) }, { stage: 'conversa', at: h(58) }, { stage: 'proposta', at: h(40) }],
    messages: [msg('them', 'Preciso trocar o quadro de luz, está desarmando direto.', h(60)), msg('me', 'Fui aí ver: fica R$ 950 com material. Mandei o orçamento.', h(40))],
  },
  {
    board: 'prestador', id: 'p3', client: 'Luciana Prates', origin: 'Indicação', interest: 'Pintura de 2 quartos', value: 1200, stage: 'negociacao', unread: 0, note: 'Marcado para sábado, 8h.', followUp: null,
    history: [{ stage: 'novo', at: h(120) }, { stage: 'conversa', at: h(118) }, { stage: 'proposta', at: h(100) }, { stage: 'negociacao', at: h(72) }],
    messages: [msg('them', 'Fechado, pode vir sábado cedo.', h(72))],
  },
  {
    board: 'prestador', id: 'p4', client: 'Mateus Rocha', origin: 'Shop', interest: 'Conserto de torneira e sifão', value: 180, stage: 'fechado', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(200) }, { stage: 'conversa', at: h(199) }, { stage: 'proposta', at: h(198) }, { stage: 'negociacao', at: h(190) }, { stage: 'fechado', at: h(170) }],
    messages: [msg('them', 'Ficou ótimo, obrigado!', h(170))],
  },
  // Aulas
  {
    board: 'aulas', id: 'a1', client: 'Gabriel Moraes', origin: 'Reels', interest: 'Aulas de violão para iniciante', value: 280, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(2) }],
    messages: [msg('them', 'Oi! Nunca toquei violão. Você dá aula para iniciante? Quanto custa por mês?', h(2))],
  },
  {
    board: 'aulas', id: 'a2', client: 'Mãe da Sofia (9 anos)', origin: 'Indicação', interest: 'Reforço de matemática, 2 vezes por semana', value: 360, stage: 'proposta', unread: 0, note: 'Dificuldade em frações.', followUp: null,
    history: [{ stage: 'novo', at: h(90) }, { stage: 'conversa', at: h(88) }, { stage: 'proposta', at: h(60) }],
    messages: [msg('me', 'Aula experimental marcada para quinta, 15h, por vídeo.', h(60)), msg('them', 'Ótimo, obrigada!', h(59))],
  },
  {
    board: 'aulas', id: 'a3', client: 'Fernanda Luz', origin: 'Página', interest: 'Inglês para viagem, 3 meses', value: 900, stage: 'fechado', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(300) }, { stage: 'conversa', at: h(298) }, { stage: 'proposta', at: h(280) }, { stage: 'negociacao', at: h(270) }, { stage: 'fechado', at: h(260) }],
    messages: [msg('them', 'Amei a aula experimental. Quero o pacote de 3 meses!', h(260))],
  },
  // Atendimento online
  {
    board: 'online', id: 'o1', client: 'Ricardo Bastos', origin: 'Anúncio', interest: 'Consultoria para abrir MEI', value: 150, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(1) }],
    messages: [msg('them', 'Boa tarde! Quero abrir um MEI e tenho dúvidas. Você atende por vídeo?', h(1))],
  },
  {
    board: 'online', id: 'o2', client: 'Aline Castro', origin: 'Página', interest: 'Orientação nutricional por vídeo', value: 220, stage: 'negociacao', unread: 0, note: 'Prefere à noite.', followUp: h(-26),
    history: [{ stage: 'novo', at: h(100) }, { stage: 'conversa', at: h(98) }, { stage: 'proposta', at: h(80) }, { stage: 'negociacao', at: h(70) }],
    messages: [msg('me', 'Confirmado: amanhã, 19h30, por chamada de vídeo aqui no Re@lys.', h(70)), msg('them', 'Combinado!', h(69))],
  },
  {
    board: 'online', id: 'o3', client: 'Bruno Farias', origin: 'Reels', interest: 'Suporte de informática remoto', value: 90, stage: 'fechado', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(210) }, { stage: 'conversa', at: h(209) }, { stage: 'proposta', at: h(208) }, { stage: 'negociacao', at: h(205) }, { stage: 'fechado', at: h(200) }],
    messages: [msg('them', 'Resolveu! Muito obrigado.', h(200))],
  },
  // Imobiliária
  {
    board: 'imoveis', id: 'i1', client: 'Família Albuquerque', origin: 'Anúncio', interest: 'Apartamento 3 quartos no Centro · compra', value: 480000, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(3) }],
    messages: [msg('them', 'Boa tarde! O apartamento do Centro ainda está disponível? Aceita financiamento?', h(3))],
  },
  {
    board: 'imoveis', id: 'i2', client: 'Tiago Nunes', origin: 'Reels', interest: 'Casa para alugar, 2 quartos, com pátio', value: 2200, stage: 'proposta', unread: 0, note: 'Tem um cachorro grande.', followUp: h(-18),
    history: [{ stage: 'novo', at: h(80) }, { stage: 'conversa', at: h(78) }, { stage: 'proposta', at: h(50) }],
    messages: [msg('me', 'Visita marcada para amanhã, 17h, na casa da Rua das Acácias.', h(50)), msg('them', 'Combinado!', h(49))],
  },
  {
    board: 'imoveis', id: 'i3', client: 'Renata e Paulo', origin: 'Página', interest: 'Terreno no loteamento Bela Vista', value: 165000, stage: 'negociacao', unread: 2, note: 'Ofereceram 155 mil à vista.', followUp: null,
    history: [{ stage: 'novo', at: h(260) }, { stage: 'conversa', at: h(255) }, { stage: 'proposta', at: h(200) }, { stage: 'negociacao', at: h(40) }],
    messages: [msg('them', 'Gostamos muito. Fechamos por 155 à vista?', h(40)), msg('them', 'Aguardamos o retorno do proprietário.', h(39))],
  },
  // Revenda de veículos
  {
    board: 'veiculos', id: 'v1', client: 'Anderson Lima', origin: 'Anúncio', interest: 'Onix LT 2021 · quer dar o carro na troca', value: 68900, stage: 'novo', unread: 1, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(1) }],
    messages: [msg('them', 'Boa noite, o Onix 2021 aceita troca? Tenho um Gol 2015.', h(1))],
  },
  {
    board: 'veiculos', id: 'v2', client: 'Patrícia Souza', origin: 'Reels', interest: 'HB20 2022 automático', value: 82500, stage: 'proposta', unread: 0, note: 'Vem sábado de manhã fazer o test drive.', followUp: null,
    history: [{ stage: 'novo', at: h(70) }, { stage: 'conversa', at: h(69) }, { stage: 'proposta', at: h(48) }],
    messages: [msg('me', 'Test drive agendado para sábado, 10h.', h(48)), msg('them', 'Perfeito, estarei aí.', h(47))],
  },
  {
    board: 'veiculos', id: 'v3', client: 'Jorge Teixeira', origin: 'Indicação', interest: 'Hilux 2019 diesel', value: 189000, stage: 'fechado', unread: 0, note: '', followUp: null,
    history: [{ stage: 'novo', at: h(320) }, { stage: 'conversa', at: h(318) }, { stage: 'proposta', at: h(290) }, { stage: 'negociacao', at: h(270) }, { stage: 'fechado', at: h(250) }],
    messages: [msg('them', 'Negócio fechado. Busco a caminhonete na sexta.', h(250))],
  },
];

const KEY = 'realys.crm.v3';
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

export function useCrm(board = 'empresa') {
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
  return leads.filter((l) => (l.board || 'empresa') === board);
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
export function crmAdd({ client, interest, value, origin, board = 'empresa' }) {
  const at = Date.now();
  const lead = { board, id: 'l' + at, client, origin: origin || 'Indicação', interest, value: value || 0, stage: 'novo', unread: 0, note: '', followUp: null, history: [{ stage: 'novo', at }], messages: [] };
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
