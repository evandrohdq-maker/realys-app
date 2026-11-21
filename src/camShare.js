// Câmera na sala (Arena Gamer e Hub de Negócios), como no Discord: a pessoa liga a câmera e a sala vê
// a imagem dela. Se ela também mostra a tela (o jogo), a câmera aparece PEQUENA no canto da tela
// transmitida; e a sua própria câmera fica numa janelinha pequena por cima do app (CamBubble), inclusive
// com a conversa minimizada, para você se ver.
//
// Com o servidor e o servidor de vídeo no ar: a câmera vai para o servidor de vídeo (WHIP), só para
// quem está na sala (WHEP), igual à tela compartilhada. Sem isso: só a prévia para você mesmo
// (modo demonstração).
import { useEffect, useState } from 'react';
import { serverOn, api } from './api';
import { videoStatus, webrtcOk } from './video';

let RTC = null;
try {
  RTC = require('react-native-webrtc');
} catch (e) {
  RTC = null;
}

let cam = null; // { sala, label, demo, startedAt, front, stream }
let session = null; // { id, pc, token, resource }
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
export const camShare = () => cam;

async function openCam(front) {
  if (!RTC || !RTC.mediaDevices) throw new Error('Este aparelho não liberou a câmera para o Realyz.');
  try {
    return await RTC.mediaDevices.getUserMedia({ audio: false, video: { facingMode: front ? 'user' : 'environment', width: 640, height: 480, frameRate: 24 } });
  } catch (e) {
    throw new Error('Você não liberou a câmera. Libere nas permissões e tente de novo.');
  }
}

const gathered = (pc) =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const t = setTimeout(resolve, 2500);
    pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && (clearTimeout(t), resolve()));
  });

async function publish(sala, para, stream) {
  const st = await videoStatus().catch(() => ({ on: false }));
  if (!(serverOn() && st.on && webrtcOk())) return null;
  const s = await api('POST', '/salas/tela', { sala, para, kind: 'cam' });
  const pc = new RTC.RTCPeerConnection({ iceServers: s.iceServers });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  const res = await fetch(`${s.whip}?token=${encodeURIComponent(s.token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${s.token}` },
    body: pc.localDescription.sdp,
  });
  if (!res.ok) {
    pc.close();
    api('POST', `/salas/tela/${s.id}/end`).catch(() => {});
    throw new Error('O servidor de vídeo não respondeu.');
  }
  await pc.setRemoteDescription(new RTC.RTCSessionDescription({ type: 'answer', sdp: await res.text() }));
  const loc = res.headers.get('location');
  return { id: s.id, pc, token: s.token, resource: loc ? new URL(loc, s.whip).toString() : null };
}

// Liga a câmera na sala. para = ids de quem está na sala (no servidor).
export async function startCam({ sala, label, para = [], front = true }) {
  await stopCam();
  const stream = await openCam(front);
  cam = { sala, label, demo: true, startedAt: Date.now(), front, stream };
  emit();
  try {
    session = await publish(sala, para, stream);
    if (session && cam) {
      cam = { ...cam, demo: false, id: session.id };
      emit();
    }
  } catch (e) {
    // A prévia continua para você; a sala vê quando o vídeo do servidor voltar.
  }
  return cam;
}

export async function stopCam() {
  const s = session;
  session = null;
  if (s) {
    try {
      s.resource && fetch(s.resource, { method: 'DELETE', headers: { Authorization: `Bearer ${s.token}` } }).catch(() => {});
      s.pc.close();
    } catch (e) {}
    api('POST', `/salas/tela/${s.id}/end`).catch(() => {});
  }
  if (cam) {
    try {
      cam.stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    cam = null;
    emit();
  }
}

// Virar a câmera (frente ⇄ trás) sem sair da sala.
export async function flipCam() {
  if (!cam) return;
  const { sala, label } = cam;
  return startCam({ sala, label, front: !cam.front });
}

export function useCamShare() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return cam;
}
