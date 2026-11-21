// Hub de Negócios: o "Discord das empresas" do Realyz. Separado da Arena Gamer (que é dos streamers).
// Cada empresa tem uma Recepção ao vivo:
//   - o cliente entra na fila dizendo o que precisa;
//   - a empresa (ou um funcionário) chama o cliente para uma sala de atendimento;
//   - na sala: voz, câmera, mostrar a tela, catálogo, proposta, contrato e o CRM andando junto.
// E salas só da equipe (reunião, plantão) com canais de avisos.
// Na demonstração fica na memória do celular; com o servidor no ar, a fila e as salas chegam para todos.
import { useEffect, useState } from 'react';
import { crmAdd, crmMove } from './crm';
import { cfgPadrao } from './salaPlanos';

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
  patchSala(sid, (s) => ({ ...s, cfg }));
}
// Moderação: tira a pessoa da equipe, da fila e das salas.
export function salaKick(sid, name) {
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
  const id = 'sl-' + Date.now();
  const t = SALA_TIPOS[tipo] || SALA_TIPOS.loja;
  set((l) => [
    { id, cfg: cfgPadrao(owner), name, emoji: emoji || '💼', tipo, city: 'Passo Fundo', open: true, mine: true, team: [{ name: owner, role: 'Responsável', online: true }], fila: [], rooms: [{ id: 'r1', kind: 'atendimento', name: `${t.room} 1`, people: [], since: null }, { id: 'r2', kind: 'equipe', name: 'Reunião da equipe', people: [], since: null }], canais: [{ id: 'c1', name: 'avisos-da-equipe', msgs: [] }] },
    ...l,
  ]);
  return id;
}

// ---------- Cliente ----------
export function enterQueue(sid, me, motivo, note) {
  const id = 'f' + Date.now();
  patchSala(sid, (s) => ({ ...s, fila: [...s.fila.filter((f) => f.client !== me), { id, client: me, motivo, note, at: Date.now(), mine: true }] }));
  myQueue = { sid, id, at: Date.now() };
  emit();
  return id;
}
export function leaveQueue() {
  if (!myQueue) return;
  const { sid, id } = myQueue;
  patchSala(sid, (s) => ({ ...s, fila: s.fila.filter((f) => f.id !== id) }));
  myQueue = null;
  emit();
}
export const queuePos = (sid, id) => {
  const s = salaOf(sid);
  const i = s ? s.fila.findIndex((f) => f.id === id) : -1;
  return i < 0 ? null : i + 1;
};

// ---------- Empresa ----------
// Chamar o cliente da fila para uma sala de atendimento livre (ou cria uma). Abre o atendimento no CRM.
export function callFromQueue(sid, fid, attendant) {
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
  set((l) => l.map((s) => ({ ...s, rooms: s.rooms.map((r) => {
    const without = r.people.filter((n) => n !== me);
    if (s.id === sid && r.id === rid) return { ...r, people: [...without, me], since: r.since || Date.now() };
    return without.length === r.people.length ? r : { ...r, people: without, since: without.length ? r.since : null };
  }) })));
  here = { sid, rid };
  emit();
}
export function leaveRoom(me) {
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
  patchSala(sid, (s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === rid ? { ...r, chat: [...(r.chat || []), { ...item, at: Date.now() }] } : r)) }));
  const r = roomOf(sid, rid);
  if (r && r.leadId && item.kind === 'proposta') crmMove(r.leadId, 'proposta', { value: item.value || 0 });
  if (r && r.leadId && item.kind === 'contrato') crmMove(r.leadId, 'negociacao');
}
export function roomAccept(sid, rid, idx) {
  const r = roomOf(sid, rid);
  if (!r) return;
  patchSala(sid, (s) => ({ ...s, rooms: s.rooms.map((x) => (x.id === rid ? { ...x, chat: x.chat.map((c, i) => (i === idx ? { ...c, accepted: true } : c)) } : x)) }));
  if (r.leadId) crmMove(r.leadId, 'fechado');
}
export function roomScreen(sid, rid, who) {
  patchSala(sid, (s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === rid ? { ...r, screen: who } : r)) }));
}
export function channelPost(sid, cid, who, text) {
  patchSala(sid, (s) => ({ ...s, canais: s.canais.map((c) => (c.id === cid ? { ...c, msgs: [...c.msgs, { who, text, at: Date.now() }] } : c)) }));
}

// Reunião: sala nova da empresa (equipe, fornecedores, parceiros). Convidados entram pelo link.
export function createMeeting(sid, name, me) {
  const rid = 'm' + Date.now();
  patchSala(sid, (s) => ({ ...s, rooms: [...s.rooms, { id: rid, kind: 'reuniao', name: name || 'Reunião', people: [me], since: Date.now(), chat: [] }] }));
  here = { sid, rid };
  emit();
  return rid;
}
export const meetingLink = (sid, rid) => `https://realys.app/sala/${sid}/${rid}`;
