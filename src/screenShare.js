// Compartilhar a tela do celular numa sala (Arena Gamer e Arena Negócios).
// O mesmo motor serve para as duas: cada tela decide onde fica o botão.
//
// Com o servidor e o servidor de vídeo no ar: a tela vai para o servidor de vídeo do Re@lys (WHIP) e só
// quem está na sala recebe (WHEP), com passe conferido pelo servidor. Sem isso, roda em modo demonstração
// (mostra o aviso e o painel de quem está transmitindo, sem vídeo de verdade).
//
// Segurança:
//   - O Android sempre pergunta antes ("Iniciar gravação ou transmissão?") e mostra o aviso fixo.
//   - Carteira, Pix e conversas privadas ficam escondidas: a tela usa usePrivateScreen (FLAG_SECURE),
//     o que deixa a imagem preta na transmissão, e aqui o vídeo também é pausado na hora.
//   - Um aviso fica visível o tempo todo com o botão de parar.
import { useEffect, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { serverOn, api, connectEvents } from './api';
import { screenOk, videoStatus, RTCView, acquireScreen, releaseScreen, setScreenPaused, screenInUse } from './video';

let RTC = null;
try {
  RTC = require('react-native-webrtc');
} catch (e) {
  RTC = null;
}

// Estado único no app: { sala, label, demo, startedAt, paused, pausedBy }
let share = null;
let session = null; // conexão de verdade (pc, stream, id, token)
const pauses = new Set(); // telas privadas abertas agora (carteira, pix, chat...)
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export const screenShare = () => share;
export const PAUSE_LABEL = { carteira: 'Carteira aberta', pix: 'Pagamento por Pix', chat: 'Conversa privada', chamada: 'Chamada privada', senha: 'Digitando senha', login: 'Entrando na conta', biometria: 'Biometria', dados: 'Dados pessoais' };

// Enquanto estou transmitindo e há uma tela privada aberta, o Android também deixa o Re@lys preto na
// captura (FLAG_SECURE): mesmo que algo falhe na pausa, a senha não aparece para ninguém.
let secured = false;
const secure = (on) => {
  if (on === secured) return;
  secured = on;
  (on ? ScreenCapture.preventScreenCaptureAsync('tela-compartilhada') : ScreenCapture.allowScreenCaptureAsync('tela-compartilhada')).catch(() => {});
};
const applyPause = () => {
  const paused = pauses.size > 0;
  // Vale para a sala E para a live "transmitir como gamer" (as duas usam a mesma captura).
  setScreenPaused(paused);
  secure((!!share || screenInUse()) && paused);
  if (!share) return;
  share = { ...share, paused, pausedBy: paused ? [...pauses][pauses.size - 1] : null };
  emit();
};

// Começa a mostrar a tela na sala. sala = chave da sala; para = ids de quem está nela (no servidor).
export async function startScreenShare({ sala, label, para = [] }) {
  await stopScreenShare();
  const st = await videoStatus().catch(() => ({ on: false }));
  if (!(serverOn() && st.on && st.screens !== false && screenOk() && RTC)) {
    share = { sala, label, demo: true, startedAt: Date.now(), paused: false, pausedBy: null };
    applyPause();
    return share;
  }
  const s = await api('POST', '/salas/tela', { sala, para });
  // Mesma captura da live: se já estou em live transmitindo a tela, a sala reaproveita (não pergunta de novo).
  let track;
  try {
    track = await acquireScreen();
  } catch (e) {
    api('POST', `/salas/tela/${s.id}/end`).catch(() => {});
    throw e;
  }
  const screen = new RTC.MediaStream([track]);
  const pc = new RTC.RTCPeerConnection({ iceServers: s.iceServers });
  screen.getTracks().forEach((t) => pc.addTrack(t, screen));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await new Promise((r) => setTimeout(r, 1200));
  const res = await fetch(`${s.whip}?token=${encodeURIComponent(s.token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${s.token}` },
    body: pc.localDescription.sdp,
  });
  if (!res.ok) {
    releaseScreen(track);
    pc.close();
    api('POST', `/salas/tela/${s.id}/end`).catch(() => {});
    throw new Error('O servidor de vídeo não respondeu.');
  }
  await pc.setRemoteDescription(new RTC.RTCSessionDescription({ type: 'answer', sdp: await res.text() }));
  const loc = res.headers.get('location');
  session = { id: s.id, pc, stream: screen, track, token: s.token, resource: loc ? new URL(loc, s.whip).toString() : null };
  // Quando a pessoa para pela notificação do Android, encerra aqui também.
  screen.getVideoTracks().forEach((t) => t.addEventListener && t.addEventListener('ended', () => stopScreenShare()));
  share = { sala, label, demo: false, id: s.id, startedAt: Date.now(), paused: false, pausedBy: null };
  applyPause();
  return share;
}

// Alguém entrou ou saiu da sala: atualiza quem pode ver.
export function updateScreenViewers(para) {
  if (session) api('POST', `/salas/tela/${session.id}/para`, { para }).catch(() => {});
}

export async function stopScreenShare() {
  const s = session;
  session = null;
  if (s) {
    try {
      s.resource && fetch(s.resource, { method: 'DELETE', headers: { Authorization: `Bearer ${s.token}` } }).catch(() => {});
      releaseScreen(s.track);
      s.pc.close();
    } catch (e) {}
    api('POST', `/salas/tela/${s.id}/end`).catch(() => {});
  }
  if (share) {
    share = null;
    secure(false);
    emit();
  }
}

// Telas privadas chamam isso: enquanto estiverem abertas, a transmissão fica pausada.
export function useScreenSharePause(active, motivo = 'carteira') {
  useEffect(() => {
    if (!active) return;
    pauses.add(motivo);
    applyPause();
    return () => {
      pauses.delete(motivo);
      applyPause();
    };
  }, [active, motivo]);
}

// A live de tela chama isso ao começar, para já entrar respeitando uma tela privada aberta.
export const refreshScreenPause = () => applyPause();

export function useScreenShare() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return share;
}

// Quem está na sala: recebe a tela de quem está mostrando.
export async function watchScreen(id, onStream) {
  const w = await api('GET', `/salas/tela/${id}/watch`);
  const pc = new RTC.RTCPeerConnection({ iceServers: w.iceServers });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addEventListener('track', (e) => e.streams && e.streams[0] && onStream(e.streams[0]));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await new Promise((r) => setTimeout(r, 1200));
  const res = await fetch(`${w.whep}?token=${encodeURIComponent(w.token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${w.token}` },
    body: pc.localDescription.sdp,
  });
  if (!res.ok) {
    pc.close();
    throw new Error('Não deu para abrir a tela agora.');
  }
  await pc.setRemoteDescription(new RTC.RTCSessionDescription({ type: 'answer', sdp: await res.text() }));
  return { stop: () => pc.close() };
}

// Avisos do servidor: alguém começou ou parou de mostrar a tela numa sala em que estou.
export function onScreenEvents(fn) {
  if (!serverOn()) return () => {};
  return connectEvents((e) => (e.type === 'tela-on' || e.type === 'tela-off') && fn(e));
}

export { RTCView };
