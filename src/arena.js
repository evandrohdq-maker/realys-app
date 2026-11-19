// Arena Gamer: dados compartilhados (servidores, canais e a sala de voz em que estou).
// Ficam aqui, fora da tela, para a Arena e as Lives usarem a mesma coisa: o streamer entra
// na sala de voz do time ao abrir a live e a Arena mostra que ele está lá.
// Guardado enquanto o app está aberto (sai da tela e volta, as mensagens continuam).
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const now = Date.now();
const m = (min) => now - min * 60000;

// Servidores de exemplo (guardados enquanto o app está aberto).
const SEED = [
  {
    id: 'sv-realys', name: 'Re@lys Gamers', emoji: '🎮', tint: '#B8860B',
    members: [
      { name: 'Diego Ramos', role: 'dono', status: 'online', game: 'EA FC 26' },
      { name: 'Ana Souza', role: 'mod', status: 'online', game: 'Valorant' },
      { name: 'Lucas Prado', role: 'membro', status: 'idle', game: null },
      { name: 'Bia Lima', role: 'membro', status: 'online', game: 'Free Fire' },
      { name: 'Rafa Gomes', role: 'membro', status: 'dnd', game: 'Minecraft' },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [
        { who: 'Diego Ramos', text: 'Bem-vindos à Arena do Re@lys! Aqui só tem gente real, sem fake. 🎮', at: m(180) },
        { who: 'Ana Souza', text: 'Regras no #regras. Respeito acima de tudo.', at: m(170) },
        { who: 'Bia Lima', text: 'Alguém pra uma ranqueada de Free Fire hoje à noite?', at: m(12) },
      ] },
      { id: 'c2', kind: 'text', name: 'procurando-time', msgs: [
        { who: 'Lucas Prado', text: 'Procuro duo pra Valorant, sou Ouro 2. Jogo à noite.', at: m(60) },
        { who: 'Ana Souza', text: '@Lucas Prado bora, chama na voz às 21h', at: m(45) },
      ] },
      { id: 'c3', kind: 'text', name: 'clipes', msgs: [{ who: 'Rafa Gomes', text: 'Olha essa jogada que fiz ontem 😂 (clipe nas minhas lives)', at: m(300) }] },
      { id: 'c4', kind: 'text', name: 'torneios', msgs: [{ who: 'Diego Ramos', text: '🏆 Torneio de EA FC sábado 15h. Inscrição pelo Re@lys, prêmio em moeda Re@lys.', at: m(600) }] },
      { id: 'c5', kind: 'text', name: 'regras', msgs: [{ who: 'Ana Souza', text: '1. Respeito. 2. Sem golpe nem venda por fora: troca e venda só com a Garantia Re@lys. 3. Sem fake news. 4. Proibido para menores de 18.', at: m(2000) }] },
      { id: 'v1', kind: 'voice', name: 'Squad', inVoice: ['Bia Lima', 'Diego Ramos'], screen: 'Bia Lima' },
      { id: 'v2', kind: 'voice', name: 'Sala de espera', inVoice: [] },
    ],
  },
  {
    id: 'sv-ff', name: 'Free Fire BR', emoji: '🔥', tint: '#E8590C',
    members: [
      { name: 'Bia Lima', role: 'dono', status: 'online', game: 'Free Fire' },
      { name: 'Kauã Silva', role: 'membro', status: 'online', game: 'Free Fire' },
      { name: 'Duda Reis', role: 'membro', status: 'idle', game: null },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: 'Kauã Silva', text: 'Atualização nova chegou, alguém testou o mapa?', at: m(25) }] },
      { id: 'c2', kind: 'text', name: 'x1-e-squad', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Squad 4', inVoice: ['Kauã Silva'] },
    ],
  },
  {
    id: 'sv-mine', name: 'Construtores Minecraft', emoji: '⛏️', tint: '#2F9E44',
    members: [
      { name: 'Rafa Gomes', role: 'dono', status: 'dnd', game: 'Minecraft' },
      { name: 'Teo Martins', role: 'mod', status: 'online', game: 'Minecraft' },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: 'Teo Martins', text: 'Servidor de sobrevivência aberto hoje até meia-noite.', at: m(90) }] },
      { id: 'c2', kind: 'text', name: 'construções', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Construindo', inVoice: [] },
    ],
  },
  {
    id: 'sv-fc', name: 'EA FC Brasil', emoji: '⚽', tint: '#1C7ED6',
    members: [{ name: 'Diego Ramos', role: 'dono', status: 'online', game: 'EA FC 26' }],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [] },
      { id: 'c2', kind: 'text', name: 'ultimate-team', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Partida', inVoice: [] },
    ],
  },
];

let servers = SEED;
let voice = null; // { sid, cid }: sala de voz em que estou
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export const arenaServers = () => servers;
export const arenaVoice = () => voice;
export function setArenaServers(next) {
  servers = typeof next === 'function' ? next(servers) : next;
  emit();
}
export function setArenaVoice(v) {
  voice = v;
  emit();
}

// ---------- Opções por usuário (como no Discord) ----------
// Para cada pessoa eu guardo, só para mim: silenciar a voz dela, o volume dela (0 a 200%),
// ignorar (esconde as mensagens), bloquear, pedido de amizade e um apelido/nota.
// Fica salvo no celular.
const PREFS_KEY = 'realys.arena.prefs.v1';
let prefs = {};
let prefsLoaded = false;
export const ARENA_PREF_DEFAULT = { muted: false, volume: 100, ignored: false, blocked: false, friend: null, note: '' };
export const arenaPref = (name) => ({ ...ARENA_PREF_DEFAULT, ...(prefs[name] || {}) });
export function setArenaPref(name, patch) {
  prefs = { ...prefs, [name]: { ...arenaPref(name), ...patch } };
  AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  emit();
}
export function loadArenaPrefs() {
  if (prefsLoaded) return;
  prefsLoaded = true;
  AsyncStorage.getItem(PREFS_KEY)
    .then((raw) => {
      if (!raw) return;
      prefs = { ...JSON.parse(raw), ...prefs };
      emit();
    })
    .catch(() => {});
}
// Tira a pessoa do servidor (dono ou moderador) ou só da sala de voz.
export function arenaKick(sid, name, { voiceOnly = false } = {}) {
  servers = servers.map((s) =>
    s.id !== sid
      ? s
      : { ...s, members: voiceOnly ? s.members : s.members.filter((x) => x.name !== name), channels: s.channels.map((c) => (c.kind === 'voice' ? { ...c, inVoice: dropMe(c.inVoice, name) } : c)) }
  );
  emit();
}

// Para as telas: redesenha quando os servidores ou a sala de voz mudam.
export function useArena() {
  const [, tick] = useState(0);
  useEffect(() => {
    loadArenaPrefs();
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return { servers, setServers: setArenaServers, voice, setVoice: setArenaVoice };
}

const dropMe = (list, me) => (list || []).filter((n) => n !== me);

// Entra numa sala de voz (saindo de qualquer outra) e vira membro do servidor, se ainda não for.
export function joinArenaVoice(sid, cid, me) {
  servers = servers.map((s) => {
    const mine = s.id === sid;
    const channels = s.channels.map((c) => (c.kind !== 'voice' ? c : { ...c, inVoice: mine && c.id === cid ? [...dropMe(c.inVoice, me), me] : dropMe(c.inVoice, me) }));
    const members = mine && !s.members.some((x) => x.name === me) ? [...s.members, { name: me, role: 'membro', status: 'online', game: null }] : s.members;
    return { ...s, channels, members };
  });
  voice = { sid, cid };
  emit();
}
export function leaveArenaVoice(me) {
  servers = servers.map((s) => ({ ...s, channels: s.channels.map((c) => (c.kind === 'voice' ? { ...c, inVoice: dropMe(c.inVoice, me) } : c)) }));
  voice = null;
  emit();
}

// Salas de voz para escolher ao abrir a live: primeiro as dos servidores em que já estou.
export function arenaVoiceRooms(me) {
  const rooms = [];
  servers.forEach((s) => {
    const member = s.members.some((x) => x.name === me);
    s.channels.filter((c) => c.kind === 'voice').forEach((c) => rooms.push({ sid: s.id, cid: c.id, server: s.name, emoji: s.emoji, room: c.name, people: dropMe(c.inVoice, me), member }));
  });
  return rooms.sort((x, y) => (y.member ? 1 : 0) - (x.member ? 1 : 0));
}
export function arenaRoom(v) {
  if (!v) return null;
  const s = servers.find((x) => x.id === v.sid);
  const c = s && s.channels.find((x) => x.id === v.cid);
  return c ? { server: s.name, emoji: s.emoji, room: c.name, people: c.inVoice || [] } : null;
}
// Servidor do streamer: aquele em que ele é dono ou membro (para o botão da live).
export const arenaServerOf = (name) => servers.find((s) => s.members.some((x) => x.name === name && x.role === 'dono')) || servers.find((s) => s.members.some((x) => x.name === name)) || null;

// Convidado aceitou a chamada (na demonstração, alguns segundos depois do convite): entra na sala.
// Com o servidor no ar, quem entra é a própria pessoa, pelo celular dela.
export function arenaGuestJoins(sid, cid, name) {
  servers = servers.map((s) => {
    const here = s.id === sid;
    const channels = s.channels.map((c) => (c.kind !== 'voice' ? c : { ...c, inVoice: here && c.id === cid ? [...dropMe(c.inVoice, name), name] : dropMe(c.inVoice, name) }));
    const members = here && !s.members.some((x) => x.name === name) ? [...s.members, { name, role: 'membro', status: 'online', game: null }] : s.members;
    return { ...s, channels, members };
  });
  emit();
}

// Chamada particular com uma pessoa: cria uma sala de voz só de vocês dois no servidor e eu entro nela.
export function arenaPrivateCall(sid, me, name) {
  const first = String(name).split(' ')[0];
  const s = servers.find((x) => x.id === sid);
  const existing = s && s.channels.find((c) => c.kind === 'voice' && c.privateWith === name);
  const cid = existing ? existing.id : 'pv' + Date.now();
  if (!existing) {
    servers = servers.map((x) => (x.id !== sid ? x : { ...x, channels: [...x.channels, { id: cid, kind: 'voice', name: `🔒 Você e ${first}`, inVoice: [], privateWith: name }] }));
  }
  joinArenaVoice(sid, cid, me);
  return cid;
}
