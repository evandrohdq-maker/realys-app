// Arena Gamer: dados compartilhados (servidores, canais e a sala de voz em que estou).
// Ficam aqui, fora da tela, para a Arena e as Lives usarem a mesma coisa: o streamer entra
// na sala de voz do time ao abrir a live e a Arena mostra que ele está lá.
// Guardado enquanto o app está aberto (sai da tela e volta, as mensagens continuam).
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, connectEvents } from './api';
import { entrarVoz, sairVoz, vozAtual, volumeDe, onVoz } from './vozGrupo';

const now = Date.now();
const m = (min) => now - min * 60000;

// Servidores de exemplo (guardados enquanto o app está aberto).
const SEED = [
  {
    id: 'sv-realys', name: 'Realyz Gamers', emoji: '🎮', tint: '#B8860B',
    members: [
      { name: 'Diego Ramos', role: 'dono', status: 'online', game: 'Futebol virtual' },
      { name: 'Ana Souza', role: 'mod', status: 'online', game: 'Tiro tático' },
      { name: 'Lucas Prado', role: 'membro', status: 'idle', game: null },
      { name: 'Bia Lima', role: 'membro', status: 'online', game: 'Battle royale' },
      { name: 'Rafa Gomes', role: 'membro', status: 'dnd', game: 'Mundo aberto' },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [
        { who: 'Diego Ramos', text: 'Bem-vindos à Arena do Realyz! Aqui só tem gente real, sem fake. 🎮', at: m(180) },
        { who: 'Ana Souza', text: 'Regras no #regras. Respeito acima de tudo.', at: m(170) },
        { who: 'Bia Lima', text: 'Alguém pra uma ranqueada de battle royale hoje à noite?', at: m(12) },
      ] },
      { id: 'c2', kind: 'text', name: 'procurando-time', msgs: [
        { who: 'Lucas Prado', text: 'Procuro duo pro tiro tático, sou Ouro 2. Jogo à noite.', at: m(60) },
        { who: 'Ana Souza', text: '@Lucas Prado bora, chama na voz às 21h', at: m(45) },
      ] },
      { id: 'c3', kind: 'text', name: 'clipes', msgs: [{ who: 'Rafa Gomes', text: 'Olha essa jogada que fiz ontem 😂 (clipe nas minhas lives)', at: m(300) }] },
      { id: 'c4', kind: 'text', name: 'torneios', msgs: [{ who: 'Diego Ramos', text: '🏆 Torneio de futebol virtual sábado 15h. Inscrição pelo Realyz, prêmio em moeda Realyz.', at: m(600) }] },
      { id: 'c5', kind: 'text', name: 'regras', msgs: [{ who: 'Ana Souza', text: '1. Respeito. 2. Sem golpe nem venda por fora: troca e venda só com a Garantia Realyz. 3. Sem fake news. 4. Proibido para menores de 18.', at: m(2000) }] },
      { id: 'v1', kind: 'voice', name: 'Squad', inVoice: ['Bia Lima', 'Diego Ramos'], screen: 'Bia Lima' },
      { id: 'v2', kind: 'voice', name: 'Sala de espera', inVoice: [] },
    ],
  },
  {
    id: 'sv-ff', name: 'Battle Royale BR', emoji: '🔥', tint: '#E8590C',
    members: [
      { name: 'Bia Lima', role: 'dono', status: 'online', game: 'Battle royale' },
      { name: 'Kauã Silva', role: 'membro', status: 'online', game: 'Battle royale' },
      { name: 'Duda Reis', role: 'membro', status: 'idle', game: null },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: 'Kauã Silva', text: 'Atualização nova chegou, alguém testou o mapa?', at: m(25) }] },
      { id: 'c2', kind: 'text', name: 'x1-e-squad', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Squad 4', inVoice: ['Kauã Silva'] },
    ],
  },
  {
    id: 'sv-mine', name: 'Construtores de Mundos', emoji: '⛏️', tint: '#2F9E44',
    members: [
      { name: 'Rafa Gomes', role: 'dono', status: 'dnd', game: 'Mundo aberto' },
      { name: 'Teo Martins', role: 'mod', status: 'online', game: 'Mundo aberto' },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: 'Teo Martins', text: 'Servidor de sobrevivência aberto hoje até meia-noite.', at: m(90) }] },
      { id: 'c2', kind: 'text', name: 'construções', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Construindo', inVoice: [] },
    ],
  },
  {
    id: 'sv-fc', name: 'Futebol Virtual BR', emoji: '⚽', tint: '#1C7ED6',
    members: [{ name: 'Diego Ramos', role: 'dono', status: 'online', game: 'Futebol virtual' }],
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
  // Voz de verdade: o volume e o silenciar valem na hora para essa pessoa.
  if (real) {
    const id = idDoNome(name);
    const pf = arenaPref(name);
    if (id) volumeDe(id, pf.volume / 100, pf.muted || pf.blocked);
  }
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
export function arenaKick(sid, name, { voiceOnly = false, banir = false } = {}) {
  if (real) {
    const id = idDoNome(name, sid);
    if (id && !voiceOnly) api('POST', `/espacos/${sid}/remover`, { userId: id, banir }).then(guardar).catch((e) => Alert.alert('Remover', e.message));
    return;
  }
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
  // Conta real: voz de verdade, direto entre os celulares (src/vozGrupo.js).
  if (real) {
    const chave = String(cid).startsWith('sala_') ? cid : 'canal_' + cid;
    entrarVoz(chave)
      .then(() => {
        voice = { sid, cid };
        emit();
        carregarServidor(sid);
      })
      .catch((e) => Alert.alert('Voz', e.message || 'Não deu para entrar na voz.'));
    return;
  }
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
  if (real) {
    const v = voice;
    voice = null;
    sairVoz().finally(() => v && carregarServidor(v.sid));
    emit();
    return;
  }
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
  if (real) return; // na conta real, quem entra é a própria pessoa, pelo celular dela
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
  // Conta real: sala de voz só dos dois no servidor (ninguém mais vê); a pessoa recebe o convite.
  if (real) {
    const id = idDoNome(name, sid);
    if (!id) return null;
    api('POST', `/espacos/${sid}/chamada-particular`, { userId: id })
      .then((sala) => {
        guardarSalas(sid, [sala]);
        joinArenaVoice(sid, 'sala_' + sala.id, me);
      })
      .catch((e) => Alert.alert('Chamada', e.message));
    return null;
  }
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

// =====================================================================================
// Conta real: a Arena vem do servidor. Cada streamer/time tem o seu servidor; o público só vê os
// servidores abertos (escondidos entram pelo código); canais só para membros; chamada particular só
// para os dois. A voz em grupo vai direto entre os celulares (até 5).
// =====================================================================================
let real = false;
let cartoes = []; // lista do servidor
const detalhes = {}; // id -> detalhe do servidor
const msgs = {}; // canalId -> mensagens
const salasPv = {}; // espacoId -> salas privadas de voz (chamadas particulares)
let offEventos = null;
export const arenaReal = () => real;
const CARGO_APP = { dono: 'dono', admin: 'mod', mod: 'mod' };
const CARGO_CFG = { dono: 'Admin', admin: 'Admin', mod: 'Moderador' };
const idDoNome = (name, sid) => {
  for (const d of Object.values(detalhes)) {
    if (sid && d.id !== sid) continue;
    const m = (d.membros || []).find((x) => x.name === name);
    if (m) return m.id;
  }
  return null;
};
const mapear = (c) => {
  const d = detalhes[c.id];
  const base = { id: c.id, server: true, name: c.name, emoji: c.emoji || '🎮', tint: c.tint || '#B8860B', meuCargo: c.meuCargo, codigo: c.codigo, membrosQtd: c.membros };
  if (!d) return { ...base, members: [], channels: [], cfg: { id: c.codigo || '', visivel: c.visivel !== false, senha: c.temSenha ? '•' : '', max: 0, plano: 'gratis', cargos: {}, silenciados: [], banidos: [] }, parcial: true };
  const cargos = {};
  const silenciados = [];
  (d.membros || []).forEach((m) => {
    if (CARGO_CFG[m.cargo]) cargos[m.name] = CARGO_CFG[m.cargo];
    if (m.silenciado) silenciados.push(m.name);
  });
  const nomesVoz = (l) => (l || []).map((p) => p.name);
  const canais = (d.canais || []).map((k) => ({ id: k.id, kind: k.kind === 'voz' ? 'voice' : 'text', name: k.name, msgs: msgs[k.id] || [], qtd: k.msgs, inVoice: nomesVoz(k.naVoz) }));
  // Chamadas particulares (só aparecem para os dois): viram salas de voz com cadeado.
  const pv = [...(d.salas || []), ...(salasPv[c.id] || [])].filter((sl, i, l) => sl.kind === 'voz' && l.findIndex((x) => x.id === sl.id) === i);
  pv.forEach((sl) => canais.push({ id: 'sala_' + sl.id, kind: 'voice', name: sl.name, inVoice: nomesVoz(sl.naVoz), privateWith: true, msgs: [] }));
  return {
    ...base,
    members: (d.membros || []).map((m) => ({ id: m.id, name: m.name, role: CARGO_APP[m.cargo] || 'membro', status: m.online ? 'online' : 'offline', game: null })),
    channels: canais,
    cfg: { ...d.cfg, cargos, silenciados, banidos: [], classes: ['Admin', 'Moderador', 'Membro'], painel: d.cfg.painel },
  };
};
const reconstruir = () => {
  servers = cartoes.map(mapear);
  emit();
};
const guardar = (d) => {
  if (!d || !d.id) return d;
  detalhes[d.id] = d;
  if (!cartoes.some((c) => c.id === d.id)) cartoes = [...cartoes, d];
  else cartoes = cartoes.map((c) => (c.id === d.id ? { ...c, ...d } : c));
  reconstruir();
  return d;
};
const guardarSalas = (sid, l) => {
  salasPv[sid] = [...(salasPv[sid] || []).filter((x) => !l.some((y) => y.id === x.id)), ...l];
  reconstruir();
};
export function carregarArena() {
  if (!real) return Promise.resolve();
  return api('GET', '/espacos?kind=arena')
    .then((l) => {
      cartoes = l || [];
      reconstruir();
    })
    .catch(() => {});
}
export function carregarServidor(sid) {
  if (!real || !sid) return Promise.resolve();
  return api('GET', `/espacos/${sid}`).then(guardar).catch(() => {});
}
export function carregarMsgs(sid, cid) {
  if (!real || !cid || String(cid).startsWith('sala_')) return Promise.resolve();
  return api('GET', `/canais/${cid}/msgs`)
    .then((l) => {
      msgs[cid] = l || [];
      reconstruir();
    })
    .catch(() => {});
}
// Liga/desliga o modo servidor (conta real). Chamado pelas telas que usam a Arena.
export function usarServidorArena(on) {
  if (!!on === real) return;
  real = !!on;
  if (offEventos) offEventos();
  offEventos = null;
  if (!real) {
    servers = SEED;
    emit();
    return;
  }
  servers = [];
  emit();
  carregarArena();
  offEventos = connectEvents((ev) => {
    const d = ev.data || {};
    if (ev.type === 'canal-msg' && d.canalId) {
      msgs[d.canalId] = [...(msgs[d.canalId] || []), d.msg];
      reconstruir();
    } else if (ev.type === 'espaco') {
      carregarArena();
      if (d.removido && voice && voice.sid === d.id) leaveArenaVoice();
      if (detalhes[d.id] && !d.removido) carregarServidor(d.id);
    } else if (ev.type === 'arena-chamada') {
      carregarServidor(d.espacoId);
      Alert.alert('Chamada particular 🎧', `${d.de} te chamou para conversar${d.servidor ? ` em ${d.servidor}` : ''}.`, [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Entrar', onPress: () => joinArenaVoice(d.espacoId, 'sala_' + d.salaId) },
      ]);
    } else if ((ev.type === 'voz-entrou' || ev.type === 'voz-saiu') && voice) carregarServidor(voice.sid);
  });
}
// Quem está na voz muda: atualiza o servidor aberto.
onVoz(() => voice && real && carregarServidor(voice.sid));

// ---------- Ações das telas (servidor na conta real, demonstração no resto) ----------
// Entrar no servidor. Devolve uma Promise; erro com code 'senha' pede a senha.
export function arenaEntrar(sid, me, senha, codigo) {
  if (real) return api('POST', `/espacos/${sid}/entrar`, { senha, codigo }).then(guardar);
  servers = servers.map((s) => (s.id === sid && !s.members.some((x) => x.name === me) ? { ...s, members: [...s.members, { name: me, role: 'membro', status: 'online', game: null }] } : s));
  emit();
  return Promise.resolve();
}
export function arenaEnviar(sid, cid, me, text) {
  if (real) {
    return api('POST', `/canais/${cid}/msgs`, { text })
      .then((m) => {
        msgs[cid] = [...(msgs[cid] || []), m];
        reconstruir();
      })
      .catch((e) => Alert.alert('Mensagem não enviada', e.message));
  }
  servers = servers.map((s) => (s.id === sid ? { ...s, channels: s.channels.map((c) => (c.id === cid ? { ...c, msgs: [...c.msgs, { who: me, text, at: Date.now() }] } : c)) } : s));
  emit();
  return Promise.resolve();
}
export function arenaReagir(sid, cid, i, emoji) {
  if (real) {
    const m = (msgs[cid] || [])[i];
    if (!m) return;
    api('POST', `/canal-msgs/${m.id}/reagir`, { emoji })
      .then((r) => {
        msgs[cid] = msgs[cid].map((x) => (x.id === m.id ? { ...x, reactions: r.reactions } : x));
        reconstruir();
      })
      .catch(() => {});
    return;
  }
  servers = servers.map((s) => (s.id !== sid ? s : { ...s, channels: s.channels.map((c) => {
    if (c.id !== cid) return c;
    const l = c.msgs.slice();
    const r = { ...(l[i].reactions || {}) };
    r[emoji] = (r[emoji] || 0) + 1;
    l[i] = { ...l[i], reactions: r };
    return { ...c, msgs: l };
  }) }));
  emit();
}
// Criar servidor. Devolve Promise com o id.
export function arenaCriar({ name, emoji, me, cfg }) {
  if (real) return api('POST', '/espacos', { kind: 'arena', name, emoji }).then((d) => guardar(d).id);
  const id = 'sv-' + Date.now();
  servers = [...servers, {
    id, name, emoji: emoji || '🎮', tint: '#B8860B', cfg,
    members: [{ name: me, role: 'dono', status: 'online', game: null }],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: me, text: `Servidor ${name} criado! Convide a galera. 🎉`, at: Date.now() }] },
      { id: 'c2', kind: 'text', name: 'procurando-time', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Squad', inVoice: [] },
    ],
  }];
  emit();
  return Promise.resolve(id);
}
export function arenaNovoCanal(sid, kind, name) {
  if (real) return api('POST', `/espacos/${sid}/canais`, { kind: kind === 'voice' ? 'voz' : 'texto', name }).then(guardar).catch((e) => Alert.alert('Canal', e.message));
  servers = servers.map((s) => (s.id !== sid ? s : { ...s, channels: [...s.channels, kind === 'voice' ? { id: 'v' + Date.now(), kind: 'voice', name, inVoice: [] } : { id: 'c' + Date.now(), kind: 'text', name: name.toLowerCase().replace(/\s+/g, '-'), msgs: [] }] }));
  emit();
  return Promise.resolve();
}
// Configuração e moderação: na conta real, cada mudança vai para o servidor (plano, senha, limite,
// visível, moderação, painel, cargos, silenciar e banir).
export async function arenaSalvarCfg(sid, antes, depois, espaco = 'arena') {
  if (!real) {
    servers = servers.map((s) => (s.id === sid ? { ...s, cfg: depois } : s));
    emit();
    return;
  }
  try {
    if (depois.plano && antes && depois.plano !== antes.plano) await api('POST', `/espacos/${sid}/plano`, { plano: depois.plano });
    await api('PATCH', `/espacos/${sid}/config`, { senha: depois.senha || '', max: depois.max || 0, visivel: depois.visivel !== false, moderada: !!depois.moderada, painel: depois.painel || null });
    const d = detalhes[sid] || { membros: [] };
    const idDe = (n) => (d.membros.find((m) => m.name === n) || {}).id;
    for (const [n, k] of Object.entries(depois.cargos || {})) {
      if (((antes && antes.cargos) || {})[n] === k || !idDe(n)) continue;
      await api('POST', `/espacos/${sid}/cargo`, { userId: idDe(n), cargo: k === 'Admin' ? 'admin' : k === 'Moderador' ? 'mod' : espaco === 'hub' ? 'equipe' : 'membro' }).catch((e) => Alert.alert('Cargo', e.message));
    }
    const sil0 = new Set((antes && antes.silenciados) || []);
    const sil1 = new Set(depois.silenciados || []);
    for (const n of new Set([...sil0, ...sil1])) if (sil0.has(n) !== sil1.has(n) && idDe(n)) await api('POST', `/espacos/${sid}/silenciar`, { userId: idDe(n), on: sil1.has(n) });
    for (const n of depois.banidos || []) if (!((antes && antes.banidos) || []).includes(n) && idDe(n)) await api('POST', `/espacos/${sid}/remover`, { userId: idDe(n), banir: true });
  } catch (e) {
    Alert.alert('Configuração', e.message);
  }
  return carregarServidor(sid);
}
// Entrar com o código (acha até os escondidos).
export const arenaPorCodigo = (codigo) => api('GET', `/espacos/codigo/${encodeURIComponent(codigo)}`);
