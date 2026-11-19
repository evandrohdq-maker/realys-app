// CRM da empresa: cada conversa com cliente vira um atendimento que anda por etapas, do primeiro
// contato até a venda fechada. Guarda a conversa, o valor, as notas e a data de cada etapa.
// Na demonstração fica salvo no celular; com o servidor, as conversas chegam dos clientes de verdade.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORDER_FEE_PCT, SERVICE_FEE_PCT } from './fees';
import { pickOwner } from './team';

export const CRM_STAGES = [
  { key: 'novo', label: 'Novo contato', short: 'Novo', icon: 'sparkles-outline', hint: 'O cliente chamou. Responda rápido.' },
  { key: 'conversa', label: 'Em conversa', short: 'Conversa', icon: 'chatbubbles-outline', hint: 'Entenda o que ele precisa.' },
  { key: 'proposta', label: 'Proposta enviada', short: 'Proposta', icon: 'document-text-outline', hint: 'Preço e condições na mão do cliente.' },
  { key: 'negociacao', label: 'Negociação', short: 'Negociação', icon: 'swap-horizontal-outline', hint: 'Ajuste de preço, prazo ou entrega.' },
  { key: 'fechado', label: 'Venda fechada', short: 'Fechada', icon: 'checkmark-circle-outline', hint: 'Vendido. Hora de entregar bem.' },
];
export const CRM_LOST = { key: 'perdido', label: 'Não fechou', short: 'Não fechou', icon: 'close-circle-outline' };
export const CRM_ORIGINS = ['Shop', 'Food', 'Reels', 'Anúncio', 'Página', 'Campanha', 'Chamado', 'Indicação', 'Sala ao vivo'];
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
// Campos que todo atendimento tem (os salvos em versões antigas ganham os que faltam).
const normLead = (l) => ({ cycle: 1, qual: {}, tasks: [], owner: null, ...l });
// Atendimento direcionado: escolhe o funcionário que recebe o cliente novo (src/team.js).
const ownerFor = (board, origin) => {
  const openBy = {};
  leads.forEach((l) => l.owner && (l.board || 'empresa') === board && l.stage !== 'fechado' && l.stage !== 'perdido' && (openBy[l.owner] = (openBy[l.owner] || 0) + 1));
  return pickOwner(origin, openBy);
};
let leads = SEED.map(normLead);
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
            leads = JSON.parse(raw).map(normLead);
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
// Ao fechar, o Re@lys registra o fechamento e a parte dele (crmFee): é assim que a plataforma ganha
// por negócio fechado.
export function crmMove(id, stage, extra = {}) {
  patch(id, (l) =>
    l.stage === stage
      ? l
      : {
          ...l,
          ...extra,
          stage,
          lostReason: stage === 'perdido' ? extra.lostReason || l.lostReason : null,
          closing: stage === 'fechado' ? { at: Date.now(), value: l.value || 0, ...crmFee(l.board, l.value), paid: false } : stage === 'perdido' ? l.closing : null,
          history: [...l.history, { stage, at: Date.now(), cycle: l.cycle || 1 }],
        }
  );
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
// Passa o atendimento para outro funcionário (fica registrado na conversa).
export function crmAssign(id, ownerId, ownerName) {
  const at = Date.now();
  patch(id, (l) => ({ ...l, owner: ownerId, messages: [...l.messages, { from: 'system', text: ownerId ? `Atendimento passado para ${ownerName}.` : 'Atendimento sem responsável.', at, time: hhmm(at) }] }));
}
export function crmAdd({ client, interest, value, origin, board = 'empresa' }) {
  const at = Date.now();
  const lead = { owner: ownerFor(board, origin || 'Indicação'), board, id: 'l' + at, client, origin: origin || 'Indicação', interest, value: value || 0, stage: 'novo', unread: 0, note: '', followUp: null, cycle: 1, qual: {}, tasks: [], history: [{ stage: 'novo', at, cycle: 1 }], messages: [] };
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

// ---------- Fechamento acompanhado pelo Re@lys ----------
// Todo negócio fechado pelo CRM é registrado na plataforma, e o Re@lys recebe a parte dele sobre o
// valor fechado: lojas pagam a comissão de venda; prestadores, aulas e atendimento online pagam a
// taxa de serviço. Imóveis e veículos já pagam por plano ou por conversa liberada (sem taxa no fechamento).
export const CRM_FEE_PCT = { empresa: ORDER_FEE_PCT, prestador: SERVICE_FEE_PCT, aulas: SERVICE_FEE_PCT, online: SERVICE_FEE_PCT, imoveis: 0, veiculos: 0 };
const r2 = (n) => Math.round(n * 100) / 100;
export function crmFee(board, value) {
  const pct = CRM_FEE_PCT[board || 'empresa'] || 0;
  const fee = r2(((value || 0) * pct) / 100);
  return { pct, fee, net: r2((value || 0) - fee) };
}
// Cliente pagou pelo Re@lys: o fechamento fica quitado (na demonstração, marcado à mão).
export const crmPaid = (id) => patch(id, (l) => (l.closing ? { ...l, closing: { ...l.closing, paid: true, paidAt: Date.now() } } : l));
// Visão da plataforma (administrador): tudo que foi fechado pelos CRMs e quanto o Re@lys recebe.
export function crmPlatform() {
  const won = leads.filter((l) => l.stage === 'fechado' && l.closing);
  const by = {};
  won.forEach((l) => {
    const b = l.board || 'empresa';
    by[b] = by[b] || { count: 0, value: 0, fee: 0 };
    by[b].count += 1;
    by[b].value = r2(by[b].value + l.closing.value);
    by[b].fee = r2(by[b].fee + l.closing.fee);
  });
  return {
    count: won.length,
    value: r2(won.reduce((s, l) => s + l.closing.value, 0)),
    fee: r2(won.reduce((s, l) => s + l.closing.fee, 0)),
    pending: r2(won.filter((l) => !l.closing.paid).reduce((s, l) => s + l.closing.fee, 0)),
    open: leads.filter((l) => l.stage !== 'fechado' && l.stage !== 'perdido').length,
    by,
  };
}

// ---------- Qualificação passo a passo ----------
// Quatro perguntas que dizem se o cliente está pronto para comprar. Valem para o ciclo atual: se o
// cliente não fechou e volta a falar, a qualificação recomeça do zero.
export const QUAL_STEPS = [
  { key: 'need', label: 'Necessidade', q: 'O que o cliente precisa?', ph: 'Ex.: 20 cestas para sexta' },
  { key: 'budget', label: 'Orçamento', q: 'Quanto pode ou pretende gastar?', ph: 'Ex.: até R$ 500' },
  { key: 'deadline', label: 'Prazo', q: 'Para quando precisa?', ph: 'Ex.: esta semana' },
  { key: 'decider', label: 'Decisão', q: 'É essa pessoa que decide a compra?', ph: 'Ex.: sim, é a dona' },
];
export const qualDone = (l) => QUAL_STEPS.filter((s) => l.qual && l.qual[s.key] && l.qual[s.key].done).length;
export const crmQual = (id, key, data) => patch(id, (l) => ({ ...l, qual: { ...(l.qual || {}), [key]: { ...((l.qual || {})[key] || {}), ...data } } }));
// Temperatura: junta a qualificação com o quanto o atendimento está parado.
export function crmTemp(l, at = Date.now()) {
  if (l.stage === 'fechado' || l.stage === 'perdido') return null;
  const last = l.history[l.history.length - 1];
  const idleH = (at - (last ? last.at : at)) / 3600000;
  const q = qualDone(l);
  const score = q + (l.unread ? 1 : 0) + (stageIndex(l.stage) >= 2 ? 1 : 0) - (idleH > 72 ? 2 : idleH > 24 ? 1 : 0);
  return score >= 4 ? { key: 'quente', label: 'Quente', color: '#D9480F' } : score >= 2 ? { key: 'morno', label: 'Morno', color: '#B8860B' } : { key: 'frio', label: 'Frio', color: '#5B7C99' };
}

// ---------- Tarefas (próxima ação) ----------
export const crmTaskAdd = (id, text, days = 0) => patch(id, (l) => ({ ...l, tasks: [...(l.tasks || []), { id: 't' + Date.now(), text, due: Date.now() + days * 86400000, done: false }] }));
export const crmTaskToggle = (id, tid) => patch(id, (l) => ({ ...l, tasks: (l.tasks || []).map((t) => (t.id === tid ? { ...t, done: !t.done } : t)) }));
export const crmTaskRemove = (id, tid) => patch(id, (l) => ({ ...l, tasks: (l.tasks || []).filter((t) => t.id !== tid) }));

// ---------- Mensagem do cliente ----------
// Chegou mensagem do cliente. Se o atendimento estava em "Não fechou", ele recomeça do início:
// volta para "Novo contato", abre um ciclo novo e a qualificação é refeita passo a passo.
export function crmReceive(id, text) {
  const at = Date.now();
  patch(id, (l) => {
    const base = { ...l, unread: (l.unread || 0) + 1, messages: [...l.messages, msg('them', text, at)] };
    if (l.stage !== 'perdido') return base;
    const cycle = (l.cycle || 1) + 1;
    return {
      ...base,
      stage: 'novo',
      cycle,
      qual: {},
      lostReason: null,
      lastLost: l.lostReason || null,
      followUp: null,
      tasks: (l.tasks || []).filter((t) => t.done),
      history: [...l.history, { stage: 'novo', at, cycle, restart: true }],
      messages: [...base.messages, { from: 'system', text: `O cliente voltou a falar. O atendimento recomeçou do início (${cycle}ª vez): refaça a qualificação passo a passo.`, at, time: hhmm(at) }],
    };
  });
}
// Catálogo enviado na conversa (lojas): a mensagem leva os produtos escolhidos.
export function crmSendCatalog(id, items, storeName) {
  const at = Date.now();
  patch(id, (l) => ({
    ...l,
    unread: 0,
    messages: [...l.messages, { from: 'me', kind: 'catalog', text: `Catálogo de ${storeName}`, items, at, time: hhmm(at) }],
    ...(l.stage === 'novo' ? { stage: 'conversa', history: [...l.history, { stage: 'conversa', at, cycle: l.cycle || 1 }] } : {}),
  }));
}
// Registro de chamada (voz ou vídeo) na conversa.
export function crmCallLog(id, kind, secs) {
  const at = Date.now();
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  patch(id, (l) => ({ ...l, messages: [...l.messages, { from: 'system', text: `${kind === 'video' ? 'Chamada de vídeo' : 'Chamada de voz'} · ${mm}`, at, time: hhmm(at) }] }));
}

// Mensagens prontas por etapa (o atendente ajusta antes de enviar).
export const CRM_TEMPLATES = {
  novo: ['Olá! Obrigado pelo contato. Como posso ajudar?', 'Oi! Vi a sua mensagem. Me conta o que você precisa?'],
  conversa: ['Para quando você precisa?', 'Tem um valor em mente?', 'Posso te mandar uma proposta ainda hoje.'],
  proposta: ['Enviei a proposta. Ficou alguma dúvida?', 'Consigo segurar esse valor até amanhã.'],
  negociacao: ['Consigo melhorar a condição se fecharmos hoje.', 'Podemos confirmar? Assim já deixo tudo reservado.'],
  fechado: ['Obrigado pela confiança! Qualquer coisa, é só chamar.', 'Se gostou, deixa uma avaliação? Ajuda muito.'],
  perdido: ['Oi! Passando para saber se ainda posso ajudar.', 'Temos uma condição nova. Quer que eu te mande?'],
};

// ---------- Hoje: o que pede ação agora ----------
export function crmToday(list, at = Date.now()) {
  const end = new Date(at);
  end.setHours(23, 59, 59, 999);
  const open = list.filter((l) => l.stage !== 'fechado' && l.stage !== 'perdido');
  const idleH = (l) => (at - (l.history[l.history.length - 1] || { at }).at) / 3600000;
  return {
    unread: list.filter((l) => l.unread),
    follow: list.filter((l) => l.followUp && l.followUp <= end.getTime() && l.stage !== 'fechado'),
    tasks: list.flatMap((l) => (l.tasks || []).filter((t) => !t.done && t.due <= end.getTime()).map((t) => ({ lead: l, task: t, late: t.due < at - 86400000 }))),
    stalled: open.filter((l) => !l.unread && idleH(l) > 48),
    toPay: list.filter((l) => l.stage === 'fechado' && l.closing && !l.closing.paid),
  };
}

// ---------- Relatório ----------
export function crmReport(list, board) {
  const stages = crmStages(board);
  // Quantos atendimentos chegaram a cada etapa (no ciclo atual).
  const reached = stages.map((s, i) => list.filter((l) => l.history.some((h) => (h.cycle || 1) === (l.cycle || 1) && stageIndex(h.stage) >= i)).length);
  const won = list.filter((l) => l.stage === 'fechado');
  const lost = list.filter((l) => l.stage === 'perdido');
  const closeH = won.map((l) => {
    const cyc = l.history.filter((h) => (h.cycle || 1) === (l.cycle || 1));
    return cyc.length ? (cyc[cyc.length - 1].at - cyc[0].at) / 3600000 : 0;
  });
  const reasons = {};
  lost.forEach((l) => (reasons[l.lostReason || 'Sem motivo'] = (reasons[l.lostReason || 'Sem motivo'] || 0) + 1));
  const origins = {};
  list.forEach((l) => {
    origins[l.origin] = origins[l.origin] || { total: 0, won: 0, value: 0 };
    origins[l.origin].total += 1;
    if (l.stage === 'fechado') {
      origins[l.origin].won += 1;
      origins[l.origin].value += l.value || 0;
    }
  });
  return {
    funnel: stages.map((s, i) => ({ key: s.key, label: s.short, count: reached[i], pct: reached[0] ? Math.round((reached[i] / reached[0]) * 100) : 0 })),
    avgCloseDays: closeH.length ? Math.round((closeH.reduce((a, b) => a + b, 0) / closeH.length / 24) * 10) / 10 : null,
    ticket: won.length ? r2(won.reduce((a, l) => a + (l.value || 0), 0) / won.length) : 0,
    reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]),
    origins: Object.entries(origins).sort((a, b) => b[1].total - a[1].total),
    returned: list.filter((l) => (l.cycle || 1) > 1).length,
    fee: r2(won.reduce((a, l) => a + ((l.closing && l.closing.fee) || crmFee(board, l.value).fee), 0)),
  };
}

// ---------- Prestador: chamados e visitas entram sozinhos no CRM ----------
// Pedido de visita que chega vira "Novo pedido"; visita aceita vai para "Agendado"; concluída fecha.
// Pedido recusado vai para "Não fechou". Assim o prestador acompanha tudo num lugar só.
export function crmSyncVisits({ requests = [], visits = [] }) {
  const at = Date.now();
  let changed = false;
  const byRef = {};
  leads.forEach((l) => l.ref && (byRef[l.ref] = l));
  const add = [];
  const mk = (v, stage) => ({
    board: 'prestador', ref: v.id, id: 'lv' + v.id, client: v.client, origin: 'Chamado', interest: v.problem || v.service || 'Pedido de visita', value: v.fee || 0, stage, unread: stage === 'novo' ? 1 : 0, note: [v.address, v.when].filter(Boolean).join(' · '), followUp: null, cycle: 1, qual: {}, tasks: [],
    history: [{ stage: 'novo', at, cycle: 1 }, ...(stage !== 'novo' ? [{ stage, at, cycle: 1 }] : [])],
    messages: [msg('them', [v.problem, v.when && `Para ${String(v.when).toLowerCase()}`, v.address].filter(Boolean).join('. '), at)],
    closing: stage === 'fechado' ? { at, value: v.fee || 0, ...crmFee('prestador', v.fee), paid: true } : null,
  });
  const target = (v) => (v.status === 'concluida' ? 'fechado' : 'negociacao');
  requests.forEach((r) => !byRef[r.id] && add.push(mk(r, 'novo')));
  visits.forEach((v) => !byRef[v.id] && add.push(mk(v, target(v))));
  const liveRefs = new Set([...requests, ...visits].map((x) => x.id));
  const next = leads.map((l) => {
    if (!l.ref) return l;
    const v = visits.find((x) => x.id === l.ref);
    if (v) {
      const tg = target(v);
      if (l.stage !== 'perdido' && stageIndex(tg) > stageIndex(l.stage)) {
        changed = true;
        return { ...l, stage: tg, value: v.fee || l.value, history: [...l.history, { stage: tg, at, cycle: l.cycle || 1 }], closing: tg === 'fechado' ? { at, value: v.fee || l.value || 0, ...crmFee('prestador', v.fee || l.value), paid: true } : l.closing };
      }
      return l;
    }
    // O pedido saiu da fila sem virar visita: foi recusado.
    if (!liveRefs.has(l.ref) && (l.stage === 'novo' || l.stage === 'conversa')) {
      changed = true;
      return { ...l, stage: 'perdido', lostReason: 'Pedido recusado', unread: 0, history: [...l.history, { stage: 'perdido', at, cycle: l.cycle || 1 }] };
    }
    return l;
  });
  if (!changed && !add.length) return;
  leads = [...add, ...next];
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
    fee: r2(won.reduce((s, l) => s + ((l.closing && l.closing.fee) || 0), 0)),
    unread: list.reduce((s, l) => s + (l.unread || 0), 0),
  };
}
// Há quanto tempo o atendimento está parado na etapa atual.
export function crmIdle(l, at = Date.now()) {
  const last = l.history[l.history.length - 1];
  const hrs = Math.max(0, Math.round((at - (last ? last.at : at)) / 3600000));
  return hrs < 1 ? 'agora há pouco' : hrs < 24 ? `há ${hrs} h` : `há ${Math.round(hrs / 24)} dia${Math.round(hrs / 24) > 1 ? 's' : ''}`;
}

// ---------- Captação de leads ----------
// Lead = pessoa interessada que deixou o contato. Entra direto na etapa "Novo contato".
// 1) Pelo botão "Pedir orçamento" na página da empresa. 2) Por uma campanha de leads (oferta que a
// empresa publica para atrair interessados).
export function crmCapture({ client, text, interest, origin = 'Página', value = 0, board = 'empresa' }) {
  const at = Date.now();
  const lead = { owner: ownerFor(board, origin), board, id: 'l' + at + Math.round(Math.random() * 999), client, origin, interest: interest || text || 'Pedido de orçamento', value, stage: 'novo', unread: 1, note: '', followUp: null, cycle: 1, qual: {}, tasks: [], history: [{ stage: 'novo', at }], messages: text ? [msg('them', text, at)] : [] };
  leads = [lead, ...leads];
  save();
  emit();
  return lead.id;
}

const CAMP_KEY = 'realys.crm.campaigns.v1';
let campaigns = [];
let campLoaded = false;
const saveCamp = () => AsyncStorage.setItem(CAMP_KEY, JSON.stringify(campaigns)).catch(() => {});
export function useCampaigns(board = 'empresa') {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (!campLoaded) {
      campLoaded = true;
      AsyncStorage.getItem(CAMP_KEY)
        .then((raw) => {
          if (raw) {
            campaigns = JSON.parse(raw);
            emit();
          }
        })
        .catch(() => {});
    }
    return () => subs.delete(fn);
  }, []);
  return campaigns.filter((c) => (c.board || 'empresa') === board);
}
const DEMO_NAMES = ['Paula Ribeiro', 'Escritório Contábil Exata', 'Vinícius Amaral', 'Clínica Bem Viver', 'Oficina do Nando', 'Débora Martins'];
const DEMO_ASK = ['Vi a oferta de vocês e quero saber mais.', 'Tenho interesse. Podem me passar os valores?', 'Gostei! Como funciona a entrega?'];
// Cria a campanha. Na demonstração, dois interessados de exemplo chegam em seguida para mostrar o caminho.
export function crmCampaign({ title, offer, audience, board = 'empresa' }) {
  const c = { id: 'cp' + Date.now(), board, title, offer, audience, at: Date.now(), on: true, leads: 0 };
  campaigns = [c, ...campaigns];
  saveCamp();
  emit();
  [4000, 9000].forEach((ms, i) =>
    setTimeout(() => {
      const cur = campaigns.find((x) => x.id === c.id);
      if (!cur || !cur.on) return;
      const k = (campaigns.length + cur.leads + i) % DEMO_NAMES.length;
      campaigns = campaigns.map((x) => (x.id === c.id ? { ...x, leads: x.leads + 1 } : x));
      saveCamp();
      crmCapture({ client: DEMO_NAMES[k], text: DEMO_ASK[(k + i) % DEMO_ASK.length], interest: title, origin: 'Campanha', board });
    }, ms)
  );
  return c;
}
export function crmCampaignToggle(id) {
  campaigns = campaigns.map((c) => (c.id === id ? { ...c, on: !c.on } : c));
  saveCamp();
  emit();
}
export function crmCampaignRemove(id) {
  campaigns = campaigns.filter((c) => c.id !== id);
  saveCamp();
  emit();
}
