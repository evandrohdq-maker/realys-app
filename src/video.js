// Vídeo do Re@lys no celular (WebRTC):
//   - Live: o streamer envia UM vídeo para o servidor de vídeo do Re@lys (WHIP) e quem assiste recebe
//     de lá (WHEP). Só usuário logado assiste: o servidor do app dá um passe para cada pessoa.
//   - Chamada 1 para 1 (consulta online, amigos, prestador): o vídeo vai direto de um celular para o
//     outro; o servidor do app só faz a apresentação (sinalização) e dá o retransmissor (TURN) se precisar.
// Sem servidor contratado (ou sem o componente de vídeo no aparelho), tudo cai no modo demonstração.
import { serverOn, api, connectEvents } from './api';

let RTC = null;
try {
  RTC = require('react-native-webrtc');
} catch (e) {
  RTC = null;
}
export const webrtcOk = () => !!(RTC && RTC.RTCPeerConnection);
export const RTCView = RTC ? RTC.RTCView : null;

let statusCache = null;
// O vídeo de verdade está ligado? (servidor do app + servidor de vídeo contratado + componente no app)
export async function videoStatus(force = false) {
  if (!serverOn() || !webrtcOk()) return { on: false, calls: false, reason: !serverOn() ? 'sem_servidor' : 'sem_componente' };
  if (statusCache && !force && Date.now() - statusCache.at < 60000) return statusCache;
  try {
    const s = await api('GET', '/video/status');
    statusCache = { ...s, at: Date.now() };
  } catch (e) {
    statusCache = { on: false, calls: false, reason: 'offline', at: Date.now() };
  }
  return statusCache;
}

const VIDEO_QUALITY = {
  '480p': { width: 854, height: 480, frameRate: 24 },
  '720p': { width: 1280, height: 720, frameRate: 30 },
};

// Câmera + microfone (frontal por padrão).
export async function openCamera({ front = true, quality = '720p', audioOnly = false } = {}) {
  const q = VIDEO_QUALITY[quality] || VIDEO_QUALITY['720p'];
  return RTC.mediaDevices.getUserMedia({
    audio: true,
    video: audioOnly ? false : { facingMode: front ? 'user' : 'environment', width: q.width, height: q.height, frameRate: q.frameRate },
  });
}

// Espera o celular juntar os caminhos de rede (no máximo 2,5 s) antes de mandar a oferta.
const gathered = (pc) =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const t = setTimeout(resolve, 2500);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t);
        resolve();
      }
    });
  });

// WHIP/WHEP: manda a oferta (SDP) com o passe e recebe a resposta do servidor de vídeo.
async function negotiate(pc, url, token) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await gathered(pc);
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${token}` },
    body: pc.localDescription.sdp,
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Sem permissão para essa live.' : 'O servidor de vídeo não respondeu.');
  const answer = await res.text();
  await pc.setRemoteDescription(new RTC.RTCSessionDescription({ type: 'answer', sdp: answer }));
  const loc = res.headers.get('location');
  return loc ? new URL(loc, url).toString() : null;
}

const closeAll = (pc, stream, resource, token) => {
  try {
    if (resource) fetch(resource, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  } catch (e) {}
  try {
    stream && stream.getTracks().forEach((t) => t.stop());
  } catch (e) {}
  try {
    pc && pc.close();
  } catch (e) {}
};

// Streamer: abre a câmera e transmite na live (que já foi aberta com POST /lives).
export async function startBroadcast(liveId, { front = true } = {}) {
  const s = await api('POST', `/lives/${liveId}/stream`);
  const stream = await openCamera({ front, quality: s.quality });
  const pc = new RTC.RTCPeerConnection({ iceServers: s.iceServers });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  let resource = null;
  try {
    resource = await negotiate(pc, s.whip, s.token);
  } catch (e) {
    closeAll(pc, stream);
    throw e;
  }
  return {
    stream,
    pc,
    flip: () => stream.getVideoTracks().forEach((t) => t._switchCamera && t._switchCamera()),
    mute: (on) => stream.getAudioTracks().forEach((t) => (t.enabled = !on)),
    stop: () => closeAll(pc, stream, resource, s.token),
  };
}

// Espectador: recebe o vídeo da live.
export async function watchLive(liveId, onStream) {
  const w = await api('GET', `/lives/${liveId}/watch`);
  const pc = new RTC.RTCPeerConnection({ iceServers: w.iceServers });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.addEventListener('track', (e) => e.streams && e.streams[0] && onStream(e.streams[0]));
  const resource = await negotiate(pc, w.whep, w.token);
  return { pc, stop: () => closeAll(pc, null, resource, w.token) };
}

// ---------- Chamada de vídeo 1 para 1 ----------
// Eventos que chegam pelo WebSocket: call (tocando), call-answer, call-signal, call-end.
const listeners = new Set();
let disconnect = null;
export function onCallEvents(fn) {
  listeners.add(fn);
  if (!disconnect && serverOn()) disconnect = connectEvents((e) => /^call/.test(e.type) && listeners.forEach((l) => l(e)));
  return () => {
    listeners.delete(fn);
    if (!listeners.size && disconnect) {
      disconnect();
      disconnect = null;
    }
  };
}

// Cria a ligação. role 'caller' (quem liga) ou 'callee' (quem atende). onRemote(stream) mostra o outro.
export async function startCall({ role, callId, to, kind = 'video', ctx = null, onRemote, onEnd }) {
  // Prepara tudo ANTES de tocar/atender: câmera, conexão e escuta dos sinais (nenhum sinal se perde).
  const { iceServers } = await api('GET', '/video-calls/ice');
  const local = await openCamera({ front: true, quality: '480p', audioOnly: kind === 'audio' });
  const pc = new RTC.RTCPeerConnection({ iceServers });
  local.getTracks().forEach((t) => pc.addTrack(t, local));
  pc.addEventListener('track', (e) => e.streams && e.streams[0] && onRemote && onRemote(e.streams[0]));
  let id = callId;
  const send = (data) => id && api('POST', `/video-calls/${id}/signal`, { data }).catch(() => {});
  pc.addEventListener('icecandidate', (e) => e.candidate && send({ candidate: e.candidate }));
  let ended = false;
  let off = () => {};
  const end = (notify = true) => {
    if (ended) return;
    ended = true;
    off();
    if (notify && id) api('POST', `/video-calls/${id}/end`).catch(() => {});
    closeAll(pc, local);
    onEnd && onEnd();
  };
  off = onCallEvents(async (e) => {
    if (!e.data || !id || e.data.id !== id) return;
    try {
      if (e.type === 'call-end' || (e.type === 'call-answer' && !e.data.accept)) return end(false);
      if (e.type === 'call-answer' && e.data.accept && role === 'caller') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ sdp: offer });
      }
      if (e.type === 'call-signal') {
        const d = e.data.data || {};
        if (d.sdp) {
          await pc.setRemoteDescription(new RTC.RTCSessionDescription(d.sdp));
          if (d.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ sdp: answer });
          }
        } else if (d.candidate) {
          await pc.addIceCandidate(new RTC.RTCIceCandidate(d.candidate)).catch(() => {});
        }
      }
    } catch (err) {}
  });
  try {
    if (role === 'caller') id = (await api('POST', '/video-calls', { to, kind, ctx })).id;
    else await api('POST', `/video-calls/${id}/answer`, { accept: true });
  } catch (err) {
    end(false);
    throw err;
  }
  return {
    id,
    local,
    pc,
    end,
    mute: (on) => local.getAudioTracks().forEach((t) => (t.enabled = !on)),
    camera: (on) => local.getVideoTracks().forEach((t) => (t.enabled = on)),
    flip: () => local.getVideoTracks().forEach((t) => t._switchCamera && t._switchCamera()),
  };
}

export const declineCall = (id) => api('POST', `/video-calls/${id}/answer`, { accept: false }).catch(() => {});
