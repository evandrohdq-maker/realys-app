// Vídeo do Realyz no celular (WebRTC):
//   - Live: o streamer envia UM vídeo para o servidor de vídeo do Realyz (WHIP) e quem assiste recebe
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
// Só no site: janelinha do navegador (Picture-in-Picture) para a própria câmera durante a live.
export const openPip = RTC && RTC.openPip ? RTC.openPip : null;
export const closePip = RTC && RTC.closePip ? RTC.closePip : () => {};

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

// Tela do celular + microfone (lives de jogos). O Android pede a permissão "Iniciar gravação ou
// transmissão?" e mostra o aviso fixo na barra de notificações enquanto a tela está sendo transmitida.
// O som do jogo não é capturado direto: vai pelo microfone (a voz do streamer e o que sai do alto-falante).
export const screenOk = () => !!(RTC && RTC.mediaDevices && RTC.mediaDevices.getDisplayMedia);

// Uma captura de tela só para o app inteiro: a live ("transmitir como gamer") e a sala da equipe
// (Arena ou Hub de Negócios) usam a MESMA captura. O Android só pergunta uma vez e nada briga.
// Cada uso pega a captura e devolve quando termina; ela só para quando ninguém mais usa.
let shared = null; // { stream, users }
export async function acquireScreen() {
  if (!screenOk()) throw new Error(typeof document !== 'undefined' ? 'Este navegador não permite transmitir a tela. Use o Chrome ou o Edge no computador.' : 'Este celular não permite transmitir a tela.');
  const alive = shared && shared.stream.getVideoTracks().some((t) => t.readyState !== 'ended');
  if (!alive) {
    let stream;
    try {
      // No computador (Chrome/Edge): deixa escolher tela inteira, janela (o jogo) ou aba, em 1080p/60,
      // e não oferece a própria aba do Realyz (evita o efeito de espelho infinito).
      stream = await RTC.mediaDevices.getDisplayMedia(
        typeof window !== 'undefined' && typeof document !== 'undefined'
          ? { video: { frameRate: { ideal: 60, max: 60 }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false, selfBrowserSurface: 'exclude', surfaceSwitching: 'include', monitorTypeSurfaces: 'include', preferCurrentTab: false }
          : { video: true }
      );
    } catch (e) {
      throw new Error('Você não liberou a transmissão da tela.');
    }
    shared = { stream, users: 0, clones: [], paused: false };
  }
  shared.users += 1;
  // Cada uso recebe uma cópia da trilha (live e sala andam separadas e uma pode parar sem derrubar a outra).
  const orig = shared.stream.getVideoTracks()[0];
  const track = orig.clone ? orig.clone() : orig;
  if (track !== orig) shared.clones.push(track);
  track.enabled = !shared.paused;
  return track;
}
// Pausa automática (senha, carteira, Pix...): vale para tudo que usa a tela, live e salas juntas.
export function setScreenPaused(paused) {
  if (!shared) return;
  shared.paused = paused;
  [shared.stream.getVideoTracks()[0], ...shared.clones].forEach((t) => {
    try {
      t.enabled = !paused;
    } catch (e) {}
  });
}
export function releaseScreen(track) {
  try {
    if (track && shared && track !== shared.stream.getVideoTracks()[0]) {
      track.stop();
      shared.clones = shared.clones.filter((t) => t !== track);
    }
  } catch (e) {}
  if (!shared) return;
  shared.users -= 1;
  if (shared.users <= 0) {
    try {
      shared.stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    shared = null;
  }
}
export const screenInUse = () => !!(shared && shared.users > 0);

// Tela do celular + microfone (lives de jogos). O Android pede a permissão "Iniciar gravação ou
// transmissão?" e mostra o aviso fixo na barra de notificações enquanto a tela está sendo transmitida.
// Minimizar o Realyz não para a transmissão: o jogo (ou o que estiver na tela) continua indo.
// O som do jogo não é capturado direto: vai pelo microfone (a voz do streamer e o que sai do alto-falante).
export async function openScreen() {
  const video = await acquireScreen();
  let mic = null;
  try {
    mic = await RTC.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (e) {}
  const stream = new RTC.MediaStream([video, ...(mic ? mic.getAudioTracks() : [])]);
  stream._screenTrack = video;
  return stream;
}

const videoErr = (code, msg) => Object.assign(new Error(msg), { code });

// Só no computador: tela (o jogo) em tela cheia + a webcam de quem transmite num cantinho, juntas num
// vídeo só. Quem assiste vê o jogo e a pessoa jogando, como nas plataformas de stream.
// O desenho é feito num <canvas> e o relógio fica num Worker: assim continua a 30 quadros por segundo
// mesmo com a aba do Realyz escondida atrás do jogo (o navegador freia os relógios da aba escondida).
export const camOverScreenOk = () => typeof document !== 'undefined' && typeof Worker !== 'undefined' && !!(document.createElement('canvas').captureStream);
async function openScreenWithCam() {
  const screenTrack = await acquireScreen();
  let cam = null;
  try {
    cam = await RTC.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: 640, height: 360, frameRate: 30 } });
  } catch (e) {
    cam = null;
  }
  let mic = cam && cam.getAudioTracks().length ? null : await RTC.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
  const camTrack = cam && cam.getVideoTracks()[0];
  if (!camTrack) {
    // Sem webcam (ou não liberada): vai só a tela, como antes.
    const stream = new RTC.MediaStream([screenTrack, ...((cam || mic) ? (cam || mic).getAudioTracks() : [])]);
    stream._screenTrack = screenTrack;
    return stream;
  }
  const mkVideo = (tracks) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.srcObject = new MediaStream(tracks);
    v.play().catch(() => {});
    return v;
  };
  const vScreen = mkVideo([screenTrack]);
  const vCam = mkVideo([camTrack]);
  const s = screenTrack.getSettings ? screenTrack.getSettings() : {};
  const W = Math.min(1920, s.width || 1280);
  const H = Math.min(1080, s.height || 720);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const draw = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (vScreen.videoWidth) {
      // Tela inteira, sem cortar (barras pretas se a proporção for diferente).
      const r = Math.min(W / vScreen.videoWidth, H / vScreen.videoHeight);
      const w = vScreen.videoWidth * r;
      const h = vScreen.videoHeight * r;
      ctx.drawImage(vScreen, (W - w) / 2, (H - h) / 2, w, h);
    }
    if (vCam.videoWidth && camTrack.enabled && camTrack.readyState === 'live') {
      // Webcam no canto de baixo à direita, com borda dourada (cantinho do streamer).
      const cw = Math.round(W * 0.24);
      const ch = Math.round((cw * vCam.videoHeight) / vCam.videoWidth);
      const x = W - cw - Math.round(W * 0.02);
      const y = H - ch - Math.round(H * 0.03);
      const rad = Math.round(cw * 0.06);
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, rad);
      else ctx.rect(x, y, cw, ch);
      ctx.clip();
      // Espelhado como num espelho, igual à prévia que a pessoa vê de si mesma.
      ctx.translate(x + cw, y);
      ctx.scale(-1, 1);
      ctx.drawImage(vCam, 0, 0, cw, ch);
      ctx.restore();
      ctx.lineWidth = Math.max(3, Math.round(W * 0.003));
      ctx.strokeStyle = '#F5C331';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, rad);
      else ctx.rect(x, y, cw, ch);
      ctx.stroke();
    }
  };
  const worker = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},33)'], { type: 'text/javascript' })));
  worker.onmessage = draw;
  const out = canvas.captureStream(30);
  const audio = (cam && cam.getAudioTracks().length ? cam : mic) ? (cam && cam.getAudioTracks().length ? cam : mic).getAudioTracks() : [];
  const stream = new RTC.MediaStream([...out.getVideoTracks(), ...audio]);
  stream._screenTrack = screenTrack;
  // Só a webcam, para a prévia de quem transmite (e a janelinha Picture-in-Picture).
  stream._camPreview = new RTC.MediaStream([camTrack]);
  stream._stopCompose = () => {
    try {
      worker.terminate();
    } catch (e) {}
    out.getTracks().forEach((t) => t.stop());
    camTrack.stop();
    vScreen.srcObject = null;
    vCam.srcObject = null;
  };
  return stream;
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
  // Sem resposta do servidor de vídeo em 15 s: para de esperar e avisa (antes ficava carregando para sempre).
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const limite = setTimeout(() => ctl && ctl.abort(), 15000);
  let res;
  try {
    res = await fetch(`${url}${sep}token=${encodeURIComponent(token)}`, {
      signal: ctl ? ctl.signal : undefined,
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${token}` },
      body: pc.localDescription.sdp,
    });
  } catch (e) {
    throw videoErr('sem_resposta', 'O servidor de vídeo do Realyz não respondeu.');
  } finally {
    clearTimeout(limite);
  }
  // 404: o servidor de vídeo está no ar, mas a imagem de quem transmite ainda não chegou nele.
  if (res.status === 404) throw videoErr('sem_sinal', 'A imagem de quem transmite ainda não chegou ao servidor de vídeo.');
  if (!res.ok) throw videoErr(res.status === 401 ? 'sem_permissao' : 'erro_video', res.status === 401 ? 'Sem permissão para essa live.' : `O servidor de vídeo recusou (erro ${res.status}).`);
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
    if (stream && stream._screenTrack) {
      if (stream._stopCompose) stream._stopCompose();
      stream.getAudioTracks().forEach((t) => t.stop());
      releaseScreen(stream._screenTrack);
    } else stream && stream.getTracks().forEach((t) => t.stop());
  } catch (e) {}
  try {
    pc && pc.close();
  } catch (e) {}
};

// Streamer: abre a câmera e transmite na live (que já foi aberta com POST /lives).
export async function startBroadcast(liveId, { front = true, screen = false, withCam = false, onState } = {}) {
  const s = await api('POST', `/lives/${liveId}/stream`);
  const stream = screen ? (withCam && camOverScreenOk() ? await openScreenWithCam() : await openScreen()) : await openCamera({ front, quality: s.quality });
  const pc = new RTC.RTCPeerConnection({ iceServers: s.iceServers });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  let resource = null;
  try {
    resource = await negotiate(pc, s.whip, s.token);
  } catch (e) {
    closeAll(pc, stream);
    throw e;
  }
  if (onState) pc.addEventListener('connectionstatechange', () => onState(pc.connectionState));
  return {
    stream,
    pc,
    flip: () => stream.getVideoTracks().forEach((t) => t._switchCamera && t._switchCamera()),
    mute: (on) => stream.getAudioTracks().forEach((t) => (t.enabled = !on)),
    stop: () => closeAll(pc, stream, resource, s.token),
  };
}

// Espectador: recebe o vídeo da live.
export async function watchLive(liveId, onStream, onState) {
  const w = await api('GET', `/lives/${liveId}/watch`);
  const pc = new RTC.RTCPeerConnection({ iceServers: w.iceServers });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.addEventListener('track', (e) => e.streams && e.streams[0] && onStream(e.streams[0]));
  if (onState) pc.addEventListener('connectionstatechange', () => onState(pc.connectionState));
  let resource;
  try {
    resource = await negotiate(pc, w.whep, w.token);
  } catch (e) {
    closeAll(pc);
    throw e;
  }
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
