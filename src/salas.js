// Hub de Negócios: o "Discord das empresas" do Realyz. Separado da Arena Gamer (que é dos streamers).
// Cada empresa tem uma Recepção ao vivo:
//   - o cliente entra na fila dizendo o que precisa;
//   - a empresa (ou um funcionário) chama o cliente para uma sala de atendimento;
//   - na sala: voz, câmera, mostrar a tela, catálogo, proposta, contrato e o CRM andando junto.
// E salas só da equipe (reunião, plantão) com canais de avisos.
// Na demonstração fica na memória do celular; com o servidor no ar, a fila e as salas chegam para todos.
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { crmAdd, crmMove } from './crm';
import { cfgPadrao } from './salaPlanos';
import { api, connectEvents } from './api';
import { entrarVoz, sairVoz } from './vozGrupo';

const now = Date.now();
const m = (min) => now - min * 60000;

// Tipo de empresa decide o nome das coisas, o quadro do CRM e as ações rápidas da sala.
export const SALA_TIPOS = {
  imobiliaria: { label: 'Imobiliária', board: 'imoveis', icon: 'home-outline', room: 'Visita virtual', motivos: ['Quero comprar', 'Quero alugar', 'Agendar visita', 'Documentação'], acoes: ['visita', 'catalogo', 'proposta', 'contrato'] },
  suporte: { label: 'Suporte técnico', board: 'prestador', icon: 'construct-outline', room: 'Atendimento remoto', motivos: ['Celular com problema', 'Computador lento', 'Instalar programa', 'Internet e Wi-Fi'], acoes: ['tela', 'proposta', 'contrato'] },
  revenda: { label: 'Revenda de veículos', board: 'veiculos', icon: 'car-sport-outline', room: 'Vitrine ao vivo', motivos: ['Ver um carro', 'Financiamento', 'Avaliar meu carro na troca', 'Test drive'], acoes: ['visita', 'catalogo', 'proposta', 'contrato'] },
  loja: { label: 'Loja', board: 'empresa', icon: 'storefront-outline', room: 'Atendimento', motivos: ['Tirar dúvida de produto', 'Pedido em andamento', 'Troca ou devolução', 'Comprar no atacado'], acoes: ['catalogo', 'proposta'] },
  consultoria: { label: 'Atendimento online', board: 'online', icon: 'videocam-outline', room: 'Consulta', motivos: ['Primeira consulta', 'Retorno', 'Orçamento'], acoes: ['tela', 'proposta', 'contrato'] },
};
export const ACOES = {
  tela: { label: 'Tela', icon: 'tv-outline' },
  visita: { label: 'Tour ao vivo', icon: 'videocam-outline' },
  catalogo: { label: 'Catálogo', icon: 'images-outline' },
  proposta: { label: 'Proposta', icon: 'document-text-outline' },
  contrato: { label: 'Contrato', icon: 'create-outline' },
};

const SEED = [
  {
    id: 'sl-imob', name: 'Imobiliária Centro PF', emoji: '🏢', tipo: 'imobiliaria', city: 'Passo Fundo', open: true,
    team: [{ name: 'Carla Menezes', role: 'Corretora', online: true }, { name: 'Pedro Alves', role: 'Corretor', online: true }, { name: 'Sônia Rocha', role: 'Gerente', online: false }],
    fila: [
      { id: 'f1', client: 'Tiago Nunes', motivo: 'Quero alugar', note: 'Casa com pátio, 2 quartos', at: m(4) },
      { id: 'f2', client: 'Família Albuquerque', motivo: 'Agendar visita', note: 'Apto 3 quartos no Centro', at: m(1) },
    ],
    rooms: [
      { id: 'r1', kind: 'atendimento', name: 'Visita virtual 1', people: ['Carla Menezes', 'Júlia Ferraz'], client: 'Júlia Ferraz', screen: 'Carla Menezes', since: m(9) },
      { id: 'r2', kind: 'equipe', name: 'Reunião da equipe', people: [], since: null },
    ],
    canais: [
      { id: 'c1', name: 'avisos-da-equipe', msgs: [{ who: 'Sônia Rocha', text: 'Imóvel novo na Av. Brasil: fotos já estão no catálogo.', at: m(80) }] },
      { id: 'c2', name: 'propostas', msgs: [{ who: 'Pedro Alves', text: 'Proposta da casa do Petrópolis aceita! 🎉', at: m(30) }] },
    ],
  },
  {
    id: 'sl-tec', name: 'TecInfo Suporte', emoji: '🛠️', tipo: 'suporte', city: 'Passo Fundo', open: true,
    team: [{ name: 'Marcos Tech', role: 'Técnico', online: true }, { name: 'Lia Duarte', role: 'Técnica', online: true }],
    fila: [{ id: 'f1', client: 'Rogério Teixeira', motivo: 'Computador lento', note: 'Notebook demorando para ligar', at: m(2) }],
    rooms: [
      { id: 'r1', kind: 'atendimento', name: 'Atendimento remoto 1', people: ['Lia Duarte', 'Ana Paula'], client: 'Ana Paula', screen: 'Ana Paula', since: m(6) },
      { id: 'r2', kind: 'equipe', name: 'Plantão técnico', people: ['Marcos Tech'], since: m(40) },
    ],
    canais: [{ id: 'c1', name: 'chamados', msgs: [{ who: 'Marcos Tech', text: 'Fila tranquila hoje. Quem pegar remoto, registre no CRM.', at: m(50) }] }],
  },
  {
    id: 'sl-auto', name: 'Revenda Planalto Veículos', emoji: '🚗', tipo: 'revenda', city: 'Passo Fundo', open: true,
    team: [{ name: 'Fábio Lemos', role: 'Vendedor', online: true }],
    fila: [],
    rooms: [
      { id: 'r1', kind: 'atendimento', name: 'Vitrine ao vivo', people: [], since: null },
      { id: 'r2', kind: 'equipe', name: 'Reunião de vendas', people: [], since: null },
    ],
    canais: [{ id: 'c1', name: 'estoque-novo', msgs: [{ who: 'Fábio Lemos', text: 'Chegou um Onix 2024 seminovo, já no catálogo.', at: m(200) }] }],
  },
  {
    id: 'sl-psi', name: 'Clínica Mente Leve', emoji: '🌿', tipo: 'consultoria', city: 'Online', open: false, hours: 'Abre às 14h',
    team: [{ name: 'Dra. Helena Prado', role: 'Psicóloga', online: false }],
    fila: [],
    rooms: [{ id: 'r1', kind: 'atendimento', name: 'Consulta', people: [], since: null, privada: true }],
    canais: [],
  },
];

// Toda sala tem configuração (ID, senha, limite, exposta, moderação, classes, painel): src/salaPlanos.js.
let salas = SEED.map((s) => ({ ...s, cfg: cfgPadrao((s.team[0] || {}).name, 'gratis') }));
let here = null; // { sid, rid } sala em que estou
let myQueue = null; // { sid, id, at } meu lugar na fila
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const set = (fn) => {
  salas = fn(salas);
  emit();
};
const patchSala = (sid, fn) => set((l) => l.map((s) => (s.id === sid ? fn(s) : s)));

export const salasAll = () => salas;
export const salaOf = (sid) => salas.find((s) => s.id === sid);
export const salaKey = (sid, rid) => `negocios:${sid}:${rid}`;
export const salaById = (id) => salas.find((s) => s.cfg && s.cfg.id === id);
export const salaGente = (s) => [...new Set([...s.team.map((t) => t.name), ...s.fila.map((f) => f.client), ...s.rooms.flatMap((r) => r.people)])];
export function setSalaCfg(sid, cfg) {
  if (real) return salvarCfgReal(sid, cfg);
  patchSala(sid, (s) => ({ ...s, cfg }));
}
// Moderação: tira a pessoa da equipe, da fila e das salas.
export function salaKick(sid, name) {
  if (real) {
    const id = idDe(sid, name);
    if (id) api('POST', `/espacos/${sid}/remover`, { userId: id }).then(guardar).catch((e) => Alert.alert('Remover', e.message));
    return;
  }
  patchSala(sid, (s) => ({
    ...s,
    team: s.team.filter((t) => t.name !== name),
    fila: s.fila.filter((f) => f.client !== name),
    rooms: s.rooms.map((r) => (r.people.includes(name) ? { ...r, people: r.people.filter((n) => n !== name), screen: r.screen === name ? null : r.screen } : r)),
  }));
}

export function useSalas() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return { salas, here, myQueue };
}

// Minhas salas (perfil empresa): a empresa logada aparece como dona da primeira sala da demonstração.
export function createSala({ name, emoji, tipo, owner }) {
  // Conta real: a Recepção da empresa vai para o servidor. Devolve uma Promise com o id.
  if (real) return api('POST', '/espacos', { kind: 'hub', name, emoji, tipo }).then((d) => guardar(d).id);
  const id = 'sl-' + Date.now();
  const t = SALA_TIPOS[tipo] || SALA_TIPOS.loja;
  set((l) => [
    { id, cfg: cfgPadrao(owner), name, emoji: emoji || '💼', tipo, city: 'Passo Fundo', open: true, mine: true, team: [{ name: owner, role: 'Responsável', online: true }], fila: [], rooms: [{ id: 'r1', kind: 'atendimento', name: `${t.room} 1`, people: [], since: null }, { id: 'r2', kind: 'equipe', name: 'Reunião da equipe', people: [], since: null }], canais: [{ id: 'c1', name: 'avisos-da-equipe', msgs: [] }] },
    ...l,
  ]);
  return id;
}

// ---------- Cliente ----------
export function enterQueue(sid, me, motivo, note, senha) {
  if (real) {
    return api('POST', `/espacos/${sid}/fila`, { motivo, note, senha })
      .then((d) => {
        guardar(d);
        myQueue = d.minhaFila ? { sid, id: d.minhaFila.id, at: d.minhaFila.at } : null;
        emit();
      });
  }
  const id = 'f' + Date.now();
  patchSala(sid, (s) => ({ ...s, fila: [...s.fila.filter((f) => f.client !== me), { id, client: me, motivo, note, at: Date.now(), mine: true }] }));
  myQueue = { sid, id, at: Date.now() };
  emit();
  return id;
}
export function leaveQueue() {
  if (!myQueue) return;
  const { sid, id } = myQueue;
  if (real) {
    myQueue = null;
    emit();
    api('DELETE', `/espacos/${sid}/fila`).then(() => carregarSala(sid)).catch(() => {});
    return;
  }
  patchSala(sid, (s) => ({ ...s, fila: s.fila.filter((f) => f.id !== id) }));
  myQueue = null;
  emit();
}
export const queuePos = (sid, id) => {
  if (real) return (detalhes[sid] && detalhes[sid].minhaFila && detalhes[sid].minhaFila.posicao) || null;
  const s = salaOf(sid);
  const i = s ? s.fila.findIndex((f) => f.id === id) : -1;
  return i < 0 ? null : i + 1;
};

// ---------- Empresa ----------
// Chamar o cliente da fila para uma sala de atendimento livre (ou cria uma). Abre o atendimento no CRM.
export function callFromQueue(sid, fid, attendant) {
  // Conta real: abre a sala de atendimento só da atendente e do cliente. Devolve Promise com o id.
  if (real) {
    const s0 = salaOf(sid);
    const f0 = s0 && s0.fila.find((x) => x.id === fid);
    return api('POST', `/espacos/${sid}/fila/${fid}/chamar`).then((sala) => {
      const t = SALA_TIPOS[s0 && s0.tipo] || SALA_TIPOS.loja;
      if (f0) leads[sala.id] = crmAdd({ client: f0.client, interest: `${f0.motivo || ''}${f0.note ? ` · ${f0.note}` : ''}`, value: 0, origin: 'Sala ao vivo', board: t.board });
      carregarSala(sid);
      return sala.id;
    });
  }
  const s = salaOf(sid);
  const f = s && s.fila.find((x) => x.id === fid);
  if (!f) return null;
  const t = SALA_TIPOS[s.tipo] || SALA_TIPOS.loja;
  let room = s.rooms.find((r) => r.kind === 'atendimento' && !r.people.length);
  const rid = room ? room.id : 'r' + Date.now();
  const leadId = crmAdd({ client: f.client, interest: `${f.motivo}${f.note ? ` · ${f.note}` : ''}`, value: 0, origin: 'Sala ao vivo', board: t.board });
  patchSala(sid, (x) => ({
    ...x,
    fila: x.fila.filter((q) => q.id !== fid),
    rooms: room
      ? x.rooms.map((r) => (r.id === rid ? { ...r, people: [attendant, f.client], client: f.client, since: Date.now(), leadId, chat: [], screen: null } : r))
      : [...x.rooms, { id: rid, kind: 'atendimento', name: `${t.room} ${x.rooms.filter((r) => r.kind === 'atendimento').length + 1}`, people: [attendant, f.client], client: f.client, since: Date.now(), leadId, chat: [] }],
  }));
  here = { sid, rid };
  if (myQueue && myQueue.id === fid) myQueue = null;
  emit();
  return rid;
}

export function joinRoom(sid, rid, me) {
  // Conta real: abre a sala (só para quem foi chamado/convidado) e liga a voz direto entre os celulares.
  if (real) {
    here = { sid, rid };
    emit();
    carregarConversa(sid, rid);
    entrarVoz('sala_' + rid).catch((e) => Alert.alert('Voz', e.message || 'Não deu para ligar a voz. A conversa por texto continua.'));
    return;
  }
  set((l) => l.map((s) => ({ ...s, rooms: s.rooms.map((r) => {
    const without = r.people.filter((n) => n !== me);
    if (s.id === sid && r.id === rid) return { ...r, people: [...without, me], since: r.since || Date.now() };
    return without.length === r.people.length ? r : { ...r, people: without, since: without.length ? r.since : null };
  }) })));
  here = { sid, rid };
  emit();
}
export function leaveRoom(me) {
  if (real) {
    const h = here;
    here = null;
    sairVoz();
    emit();
    if (h) carregarSala(h.sid);
    return;
  }
  set((l) => l.map((s) => ({ ...s, rooms: s.rooms.map((r) => {
    const without = r.people.filter((n) => n !== me);
    return without.length === r.people.length ? r : { ...r, people: without, since: without.length ? r.since : null, screen: r.screen === me ? null : r.screen };
  }) })));
  here = null;
  emit();
}
export const roomOf = (sid, rid) => {
  const s = salaOf(sid);
  return s ? s.rooms.find((r) => r.id === rid) : null;
};

// Mensagens e cartões dentro da sala (proposta, catálogo, contrato). Proposta anda o CRM.
export function roomPost(sid, rid, item) {
  if (real) {
    api('POST', `/salas-privadas/${rid}/chat`, { kind: item.kind, text: item.text, value: item.value })
      .then((c) => {
        conversa[rid] = [...(conversa[rid] || []), c];
        reconstruir();
      })
      .catch((e) => Alert.alert('Não foi enviado', e.message));
    if (leads[rid] && item.kind === 'proposta') crmMove(leads[rid], 'proposta', { value: item.value || 0 });
    if (leads[rid] && item.kind === 'contrato') crmMove(leads[rid], 'negociacao');
    return;
  }
  patchSala(sid, (s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === rid ? { ...r, chat: [...(r.chat || []), { ...item, at: Date.now() }] } : r)) }));
  const r = roomOf(sid, rid);
  if (r && r.leadId && item.kind === 'proposta') crmMove(r.leadId, 'proposta', { value: item.value || 0 });
  if (r && r.leadId && item.kind === 'contrato') crmMove(r.leadId, 'negociacao');
}
export function roomAccept(sid, rid, idx) {
  if (real) {
    const c = (conversa[rid] || [])[idx];
    if (!c) return;
    api('POST', `/salas-privadas/${rid}/chat/${c.id}/aceitar`)
      .then(() => {
        conversa[rid] = conversa[rid].map((x) => (x.id === c.id ? { ...x, accepted: true } : x));
        reconstruir();
      })
      .catch((e) => Alert.alert('Proposta', e.message));
    if (leads[rid]) crmMove(leads[rid], 'fechado');
    return;
  }
  const r = roomOf(sid, rid);
  if (!r) return;
  patchSala(sid, (s) => ({ ...s, rooms: s.rooms.map((x) => (x.id === rid ? { ...x, chat: x.chat.map((c, i) => (i === idx ? { ...c, accepted: true } : c)) } : x)) }));
  if (r.leadId) crmMove(r.leadId, 'fechado');
}
export function roomScreen(sid, rid, who) {
  if (real) return void api('POST', `/salas-privadas/${rid}/tela`, { on: !!who }).then(() => carregarSala(sid)).catch(() => {});
  patchSala(sid, (s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === rid ? { ...r, screen: who } : r)) }));
}
export function channelPost(sid, cid, who, text) {
  if (real) {
    api('POST', `/canais/${cid}/msgs`, { text })
      .then((m) => {
        canalMsgs[cid] = [...(canalMsgs[cid] || []), m];
        reconstruir();
      })
      .catch((e) => Alert.alert('Mensagem não enviada', e.message));
    return;
  }
  patchSala(sid, (s) => ({ ...s, canais: s.canais.map((c) => (c.id === cid ? { ...c, msgs: [...c.msgs, { who, text, at: Date.now() }] } : c)) }));
}

// Reunião: sala nova da empresa (equipe, fornecedores, parceiros). Convidados entram pelo link.
export function createMeeting(sid, name, me) {
  // Conta real: reunião começa só com quem criou; os outros entram pelo link de convite (24 h).
  if (real) {
    return api('POST', `/espacos/${sid}/reunioes`, { name }).then((sala) => {
      api('POST', `/salas-privadas/${sala.id}/convite`).then((c) => {
        links[sala.id] = c.link;
        emit();
      }).catch(() => {});
      return carregarSala(sid).then(() => sala.id);
    });
  }
  const rid = 'm' + Date.now();
  patchSala(sid, (s) => ({ ...s, rooms: [...s.rooms, { id: rid, kind: 'reuniao', name: name || 'Reunião', people: [me], since: Date.now(), chat: [] }] }));
  here = { sid, rid };
  emit();
  return rid;
}
export const meetingLink = (sid, rid) => (real ? links[rid] || 'https://realyz.com.br (o link está sendo gerado, tente de novo em instantes)' : `https://realys.app/sala/${sid}/${rid}`);

// =====================================================================================
// Conta real: o Hub vem do servidor. O público só vê a Recepção das empresas visíveis (escondidas,
// só pelo código). Sala de atendimento e reunião: só para quem foi chamado ou convidado. Equipe e
// canais internos: só os funcionários.
// =====================================================================================
let real = false;
let cartoes = [];
const detalhes = {};
const conversa = {}; // salaId -> mensagens/cartões da sala
const canalMsgs = {}; // canalId -> mensagens dos canais da equipe
const leads = {}; // salaId -> lead do CRM (no celular de quem atende)
const links = {}; // salaId -> link de convite
let offEventos = null;
export const hubReal = () => real;
const EQUIPE = ['dono', 'admin', 'mod', 'equipe'];
const CARGO_CFG = { dono: 'Admin', admin: 'Admin', mod: 'Moderador' };
const idDe = (sid, name) => ((detalhes[sid] && detalhes[sid].membros) || []).find((m) => m.name === name)?.id || null;
const mapear = (c) => {
  const d = detalhes[c.id];
  const souEquipe = EQUIPE.includes(c.meuCargo);
  const base = {
    id: c.id, server: true, name: c.name, emoji: c.emoji || '💼', tipo: c.tipo || 'loja', city: c.city || '', open: !!c.aberto, hours: c.horario,
    mine: souEquipe, souEquipe, filaQtd: c.fila || 0, equipeOnline: c.equipeOnline || 0,
    team: [], fila: [], rooms: [], canais: [],
    cfg: { id: c.codigo || '', visivel: c.visivel !== false, senha: c.temSenha ? '•' : '', max: 0, plano: 'gratis', cargos: {}, silenciados: [], banidos: [] },
  };
  if (!d) return base;
  const cargos = {};
  (d.membros || []).forEach((m) => CARGO_CFG[m.cargo] && (cargos[m.name] = CARGO_CFG[m.cargo]));
  return {
    ...base,
    team: (d.membros || []).filter((m) => EQUIPE.includes(m.cargo)).map((m) => ({ id: m.id, name: m.name, role: m.cargo === 'dono' ? 'Responsável' : m.cargo === 'equipe' ? 'Atendimento' : 'Gestão', online: m.online })),
    fila: (d.filaLista || []).map((f) => ({ id: f.id, client: f.client, clientId: f.clientId, motivo: f.motivo, note: f.note, at: f.at })),
    rooms: (d.salas || []).filter((sl) => sl.kind !== 'voz').map((sl) => ({
      id: sl.id, kind: sl.kind, name: sl.name, people: (sl.naVoz && sl.naVoz.length ? sl.naVoz : sl.pessoas).map((p) => p.name), convidados: sl.pessoas.map((p) => p.name),
      since: sl.createdAt, client: sl.clientName, screen: sl.telaPor ? ((sl.pessoas.find((p) => p.id === sl.telaPor) || {}).name || null) : null, privada: true, chat: conversa[sl.id] || [],
    })),
    canais: (d.canais || []).filter((k) => k.kind === 'texto').map((k) => ({ id: k.id, name: k.name, msgs: canalMsgs[k.id] || [] })),
    cfg: { ...d.cfg, cargos, silenciados: (d.membros || []).filter((m) => m.silenciado).map((m) => m.name), banidos: [], classes: ['Admin', 'Moderador', 'Membro'] },
  };
};
const reconstruir = () => {
  salas = cartoes.map(mapear);
  emit();
};
const guardar = (d) => {
  if (!d || !d.id) return d;
  detalhes[d.id] = d;
  cartoes = cartoes.some((c) => c.id === d.id) ? cartoes.map((c) => (c.id === d.id ? { ...c, ...d } : c)) : [...cartoes, d];
  if (d.minhaFila) myQueue = { sid: d.id, id: d.minhaFila.id, at: d.minhaFila.at };
  else if (myQueue && myQueue.sid === d.id) myQueue = null;
  reconstruir();
  return d;
};
export function carregarHub() {
  if (!real) return Promise.resolve();
  return api('GET', '/espacos?kind=hub')
    .then((l) => {
      cartoes = l || [];
      reconstruir();
    })
    .catch(() => {});
}
export function carregarSala(sid, codigo) {
  if (!real || !sid) return Promise.resolve();
  return api('GET', `/espacos/${sid}${codigo ? `?codigo=${encodeURIComponent(codigo)}` : ''}`).then(guardar).catch(() => {});
}
export function carregarCanal(cid) {
  if (!real) return Promise.resolve();
  return api('GET', `/canais/${cid}/msgs`).then((l) => {
    canalMsgs[cid] = l || [];
    reconstruir();
  }).catch(() => {});
}
export function carregarConversa(sid, rid) {
  if (!real) return Promise.resolve();
  return api('GET', `/salas-privadas/${rid}`).then((sl) => {
    conversa[rid] = sl.chat || [];
    carregarSala(sid);
  }).catch((e) => Alert.alert('Sala', e.message));
}
export const hubPorCodigo = (codigo) => api('GET', `/espacos/codigo/${encodeURIComponent(codigo)}`);
// Liga/desliga o modo servidor (conta real).
export function usarServidorHub(on) {
  if (!!on === real) return;
  real = !!on;
  if (offEventos) offEventos();
  offEventos = null;
  here = null;
  myQueue = null;
  if (!real) {
    salas = SEED.map((s) => ({ ...s, cfg: cfgPadrao((s.team[0] || {}).name, 'gratis') }));
    emit();
    return;
  }
  salas = [];
  emit();
  carregarHub();
  offEventos = connectEvents((ev) => {
    const d = ev.data || {};
    if (ev.type === 'hub-chamado') {
      myQueue = null;
      carregarSala(d.espacoId);
      chamados.forEach((fn) => fn(d));
    } else if (ev.type === 'hub-fila' || ev.type === 'espaco') {
      carregarHub();
      if (detalhes[d.espacoId || d.id]) carregarSala(d.espacoId || d.id);
    } else if (ev.type === 'canal-msg' && d.canalId) {
      canalMsgs[d.canalId] = [...(canalMsgs[d.canalId] || []), d.msg];
      reconstruir();
    } else if (ev.type === 'sala-chat' && d.salaId) {
      if (d.item) conversa[d.salaId] = [...(conversa[d.salaId] || []), d.item];
      if (d.aceito) conversa[d.salaId] = (conversa[d.salaId] || []).map((x) => (x.id === d.aceito ? { ...x, accepted: true } : x));
      reconstruir();
    } else if (ev.type === 'sala-fim' && here && here.rid === d.salaId) {
      sairVoz();
      here = null;
      emit();
      Alert.alert('Atendimento encerrado', 'A sala foi encerrada pela empresa.');
    } else if ((ev.type === 'sala-tela' || ev.type === 'sala-entrou' || ev.type === 'voz-entrou' || ev.type === 'voz-saiu') && here) carregarSala(here.sid);
  });
}
// Fui chamado da fila (a tela abre a sala na hora).
const chamados = new Set();
export function onChamado(fn) {
  chamados.add(fn);
  return () => chamados.delete(fn);
}
// Encerrar o atendimento (equipe): o acesso do cliente acaba.
export function encerrarSala(sid, rid) {
  if (!real) return leaveRoom();
  return api('POST', `/salas-privadas/${rid}/encerrar`).then(() => {
    sairVoz();
    here = null;
    carregarSala(sid);
  });
}
// Pôr um funcionário na equipe pelo *usuário.
export const addEquipe = (sid, username) => api('POST', `/espacos/${sid}/equipe`, { username }).then(guardar);
// Abrir/fechar a Recepção.
export const setAberto = (sid, aberto, horario) => api('PATCH', `/espacos/${sid}/config`, { aberto, horario }).then(guardar);
async function salvarCfgReal(sid, depois) {
  const s = salaOf(sid);
  const antes = s && s.cfg;
  try {
    if (depois.plano && antes && depois.plano !== antes.plano) await api('POST', `/espacos/${sid}/plano`, { plano: depois.plano });
    await api('PATCH', `/espacos/${sid}/config`, { senha: depois.senha || '', max: depois.max || 0, visivel: depois.visivel !== false, moderada: !!depois.moderada, painel: depois.painel || null });
    for (const [n, k] of Object.entries(depois.cargos || {})) {
      if (((antes && antes.cargos) || {})[n] === k || !idDe(sid, n)) continue;
      await api('POST', `/espacos/${sid}/cargo`, { userId: idDe(sid, n), cargo: k === 'Admin' ? 'admin' : k === 'Moderador' ? 'mod' : 'equipe' }).catch((e) => Alert.alert('Cargo', e.message));
    }
    for (const n of depois.banidos || []) if (idDe(sid, n)) await api('POST', `/espacos/${sid}/remover`, { userId: idDe(sid, n), banir: true });
  } catch (e) {
    Alert.alert('Configuração', e.message);
  }
  return carregarSala(sid);
}
