// Voz em grupo direto entre os celulares (até 5 pessoas: um squad, uma reunião pequena).
// O servidor só diz quem está na sala e passa os sinais para os celulares se acharem; a voz vai de
// celular para celular (no Wi-Fi ou nos dados de cada um). Usado na Arena Gamer (canais de voz e
// chamada particular) e no Hub de Negócios (atendimento e reunião).
//
// Como liga: quem entra manda uma "oferta" para cada pessoa que já está na sala; cada uma responde.
// Quem chega depois faz o mesmo com a gente. Se alguém sai, fecha só a ligação com ele.
import { api, connectEvents } from './api';

let RTC = null;
try {
  RTC = require('react-native-webrtc');
} catch (e) {
  RTC = null;
}
export const vozOk = () => !!(RTC && RTC.RTCPeerConnection && RTC.mediaDevices);

let atual = null; // { chave, local, peers: Map(id -> { pc, name, stream, audio }), ice, off, onPessoas }
const subs = new Set();
const emit = () => subs.forEach((fn) => fn(estado()));
export const onVoz = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
export const estado = () => (atual ? { chave: atual.chave, pessoas: [...atual.peers.entries()].map(([id, p]) => ({ id, name: p.name, conectado: p.conectado })), mudo: atual.mudo, surdo: atual.surdo } : null);
export const vozAtual = () => (atual ? atual.chave : null);

// No navegador, o som do outro precisa de um <audio> tocando.
const tocarNoNavegador = (p) => {
  if (typeof document === 'undefined' || !p.stream) return;
  if (!p.audio) {
    p.audio = document.createElement('audio');
    p.audio.autoplay = true;
    document.body.appendChild(p.audio);
  }
  p.audio.srcObject = p.stream;
  p.audio.volume = p.volume == null ? 1 : Math.min(1, p.volume);
};

function novoPeer(id, name) {
  const a = atual;
  const pc = new RTC.RTCPeerConnection({ iceServers: a.ice });
  a.local.getTracks().forEach((t) => pc.addTrack(t, a.local));
  const p = { pc, name: name || 'Pessoa', conectado: false, volume: 1 };
  pc.addEventListener('icecandidate', (e) => e.candidate && api('POST', `/voz/${a.chave}/sinal`, { to: id, data: { candidate: e.candidate } }).catch(() => {}));
  pc.addEventListener('track', (e) => {
    p.stream = (e.streams && e.streams[0]) || null;
    if (a.surdo) setSom(p, false);
    tocarNoNavegador(p);
  });
  pc.addEventListener('connectionstatechange', () => {
    p.conectado = pc.connectionState === 'connected';
    emit();
  });
  a.peers.set(id, p);
  emit();
  return p;
}
const fecharPeer = (id) => {
  const p = atual && atual.peers.get(id);
  if (!p) return;
  try {
    p.pc.close();
  } catch (e) {}
  if (p.audio) p.audio.remove();
  atual.peers.delete(id);
  emit();
};
const setSom = (p, on) => p.stream && p.stream.getAudioTracks().forEach((t) => (t.enabled = on));

// Entra na voz. chave: "canal_<id>" (canal de voz da Arena) ou "sala_<id>" (sala privada).
export async function entrarVoz(chave) {
  if (!vozOk()) throw new Error('Atualize o Realyz para usar a voz em grupo.');
  if (atual && atual.chave === chave) return estado();
  await sairVoz();
  const local = await RTC.mediaDevices.getUserMedia({ audio: true, video: false });
  let r;
  try {
    r = await api('POST', `/voz/${chave}/entrar`);
  } catch (e) {
    local.getTracks().forEach((t) => t.stop());
    throw e;
  }
  atual = { chave, local, peers: new Map(), ice: r.iceServers, mudo: false, surdo: false };
  // Sinais de quem está na sala.
  atual.off = connectEvents(async (ev) => {
    const d = ev.data || {};
    if (!atual || d.chave !== atual.chave) return;
    try {
      if (ev.type === 'voz-saiu') return fecharPeer(d.id);
      if (ev.type === 'voz-entrou') {
        // Quem chegou manda a oferta; aqui só aparece o nome até a ligação fechar.
        if (!atual.peers.has(d.id)) novoPeer(d.id, d.name);
        return;
      }
      if (ev.type !== 'voz-sinal') return;
      const p = atual.peers.get(d.from) || novoPeer(d.from);
      const s = d.data || {};
      if (s.sdp) {
        await p.pc.setRemoteDescription(new RTC.RTCSessionDescription(s.sdp));
        if (s.sdp.type === 'offer') {
          const ans = await p.pc.createAnswer();
          await p.pc.setLocalDescription(ans);
          api('POST', `/voz/${atual.chave}/sinal`, { to: d.from, data: { sdp: ans } }).catch(() => {});
        }
      } else if (s.candidate) {
        await p.pc.addIceCandidate(new RTC.RTCIceCandidate(s.candidate)).catch(() => {});
      }
    } catch (e) {}
  });
  // Eu cheguei: mando oferta para cada um que já estava.
  for (const pessoa of r.participantes) {
    const p = novoPeer(pessoa.id, pessoa.name);
    const off = await p.pc.createOffer();
    await p.pc.setLocalDescription(off);
    api('POST', `/voz/${chave}/sinal`, { to: pessoa.id, data: { sdp: off } }).catch(() => {});
  }
  emit();
  return estado();
}

export async function sairVoz() {
  if (!atual) return;
  const a = atual;
  atual = null;
  try {
    a.off && a.off();
  } catch (e) {}
  for (const id of [...a.peers.keys()]) {
    const p = a.peers.get(id);
    try {
      p.pc.close();
    } catch (e) {}
    if (p.audio) p.audio.remove();
  }
  a.local.getTracks().forEach((t) => t.stop());
  api('POST', `/voz/${a.chave}/sair`).catch(() => {});
  emit();
}

// Meu microfone (mudo) e o som dos outros (surdo), como no Discord.
export function mudo(on) {
  if (!atual) return;
  atual.mudo = on;
  atual.local.getAudioTracks().forEach((t) => (t.enabled = !on));
  emit();
}
export function surdo(on) {
  if (!atual) return;
  atual.surdo = on;
  atual.peers.forEach((p) => setSom(p, !on));
  emit();
}
// Volume de uma pessoa (0 a 2 = 0% a 200%) e silenciar só ela, para mim.
export function volumeDe(id, vol, silenciada) {
  const p = atual && atual.peers.get(id);
  if (!p || !p.stream) return;
  p.volume = vol;
  p.stream.getAudioTracks().forEach((t) => {
    t.enabled = !silenciada && !atual.surdo;
    try {
      if (t._setVolume) t._setVolume(Math.max(0, Math.min(10, vol * 5)));
    } catch (e) {}
  });
  if (p.audio) p.audio.volume = Math.min(1, vol);
}
