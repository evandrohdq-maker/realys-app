// Janelinha por cima dos outros apps (picture-in-picture do Android), como no YouTube Premium.
// Dentro da janelinha aparece SÓ o player que a pessoa está usando, nunca o app inteiro:
//   - rádio: a logo, o nome e o AO VIVO;   - TV: o vídeo do canal;   - live: o vídeo da live.
// A janelinha abre sozinha ao sair do Realyz (Android 12+) ou pelo botão de janela do player.
// O próprio Android põe nela os botões de abrir em tela cheia e de fechar, e deixa arrastar.
// Precisa do APK novo (módulo nativo RealysUpdater); sem ele, nada muda.
import { useEffect, useState } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

let N = null;
try {
  N = require('expo-modules-core').requireOptionalNativeModule('RealysUpdater');
} catch (e) {
  N = null;
}
const call = (fn, ...a) => {
  try {
    return N && N[fn] ? N[fn](...a) : false;
  } catch (e) {
    return false;
  }
};

// Formato da janelinha: TV e rádio deitadas (16:9), live em pé (9:16).
export const PIP_SHAPE = { tv: [16, 9], radio: [16, 9], live: [9, 16] };
export const pipOk = () => !!call('canPip');
export const setAutoPip = (on, kind = 'radio') => call('setAutoPip', !!on, ...(PIP_SHAPE[kind] || PIP_SHAPE.radio));
export const enterPip = (kind = 'radio') => call('enterPip', ...(PIP_SHAPE[kind] || PIP_SHAPE.radio));
export const isInPipNow = () => !!call('isInPip');

// ---------- Estado único "estou na janelinha" ----------
let inPip = false;
const subs = new Set();
export const pipState = () => inPip;
export function setPipState(v) {
  if (v === inPip) return;
  inPip = v;
  subs.forEach((fn) => fn(v));
}
export function onPipState(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
// A janela do app encolhida (as duas medidas pequenas) só acontece na janelinha. Isso vale
// mesmo se o aviso do Android se perder (ex.: segunda vez que minimiza pelo botão do meio):
// nas três formas de minimizar aparece só a capa/vídeo do que está tocando, nunca o app inteiro.
export const smallWindow = (w) => !!w && w.width < 500 && w.height < 500;
export function usePipState() {
  const [v, setV] = useState(inPip);
  const win = useWindowDimensions();
  useEffect(() => onPipState(setV), []);
  return v || smallWindow(win);
}

// ---------- Minimizar o Realyz ----------
// O que está tocando agora (o PipManager atualiza): 'radio' | 'tv' | 'live' | null.
let playing = null;
export const setPlayingKind = (k) => (playing = k);
export const playingKind = () => playing;
// Botão minimizar do player e voltar 2x: com algo tocando vira a janelinha do player (capa da
// rádio, vídeo da TV ou da live); sem nada tocando, o app só sai da frente. O som continua.
// Fechar o app (arrastar para fora dos apps abertos) é que encerra o som (TaskWatcherService).
export function minimizeApp(kind = playing) {
  const shape = PIP_SHAPE[kind] || PIP_SHAPE.radio;
  if (kind) setPipState(true); // já mostra só o player enquanto a janelinha abre
  return call('minimize', !!kind, ...shape);
}
export const watchTask = (on) => call('watchTask', !!on);

// O Android avisa na hora em que entra e sai da janelinha.
// closed = a pessoa fechou a janelinha no X (o Android confere e avisa).
export function onNativePip(fn) {
  if (!N || !N.addListener) return () => {};
  const sub = N.addListener('onPipChange', (e) => fn(!!(e && e.inPip), !!(e && e.closed)));
  return () => sub && sub.remove && sub.remove();
}

// ---------- Live aberta em tela cheia ----------
// A tela da live se registra aqui; ao sair do app, ela vira a janelinha da live (LiveFloat).
let liveHere = null; // { minimize }
export const registerLive = (h) => {
  liveHere = h;
  return () => {
    if (liveHere === h) liveHere = null;
  };
};
export const liveOpenNow = () => liveHere;

// ---------- Vídeo em tela cheia: TV, clipes e lives ----------
// Enquanto um vídeo está aberto, o Realyz gira junto com o celular: deitou, o vídeo ocupa a tela
// inteira (sem barras do Android); levantou, volta para a janela normal. O botão de tela cheia
// deita na marra, mesmo com a rotação do celular travada. Rádio e música só de áudio não giram.
export const setOrientation = (mode) => call('setOrientation', mode);
export const setImmersive = (on) => call('setImmersive', !!on);

let rotateUsers = 0; // quantos vídeos abertos pedem para girar
let forcedLand = false; // tela cheia pelo botão
let backToAuto = null;
const applyOrientation = () => setOrientation(forcedLand ? 'landscape' : rotateUsers > 0 ? 'auto' : 'portrait');

// Algum vídeo está em tela cheia agora? As páginas do app (Modal) se escondem por trás dele.
let videoFull = false;
const fullSubs = new Set();
export const videoFullNow = () => videoFull;
function setVideoFull(v) {
  if (v === videoFull) return;
  videoFull = v;
  fullSubs.forEach((fn) => fn(v));
}
export function useVideoFullState() {
  const [v, setV] = useState(videoFull);
  useEffect(() => {
    fullSubs.add(setV);
    return () => fullSubs.delete(setV);
  }, []);
  return v;
}

// active: o vídeo está aberto. Devolve { full, enter, exit, toggle }.
export function useVideoRotate(active) {
  const win = useWindowDimensions();
  const inPipNow = usePipState();
  const [forced, setForced] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    rotateUsers += 1;
    applyOrientation();
    return () => {
      rotateUsers = Math.max(0, rotateUsers - 1);
      if (rotateUsers === 0) forcedLand = false;
      setForced(false);
      applyOrientation();
    };
  }, [active]);
  // No celular: deitou, tela cheia. No computador (site) a tela já é 'deitada': o player começa
  // normal e só vai para a tela cheia quando a pessoa clica em expandir.
  const land = Platform.OS !== 'web' && win.width > win.height;
  const full = !!active && !inPipNow && (land || forced);
  useEffect(() => {
    if (!active) return undefined;
    setImmersive(full);
    setVideoFull(full);
    return () => {
      setImmersive(false);
      setVideoFull(false);
    };
  }, [full, active]);
  const enter = () => {
    clearTimeout(backToAuto);
    forcedLand = true;
    setForced(true);
    applyOrientation();
  };
  const exit = () => {
    clearTimeout(backToAuto);
    forcedLand = false;
    setForced(false);
    // Volta em pé na hora; depois de um instante, volta a girar com o celular.
    setOrientation('portrait');
    backToAuto = setTimeout(applyOrientation, 2500);
  };
  // Site: tela cheia de verdade do navegador (some a barra do Chrome e a do Windows). Esc ou F11
  // saem dela e o player volta para a janela.
  useEffect(() => {
    if (Platform.OS !== 'web' || !full || typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!document.fullscreenElement && req) {
      try {
        const r = req.call(el);
        if (r && r.catch) r.catch(() => {});
      } catch (e) {}
    }
    let entered = !!document.fullscreenElement;
    const change = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered) exit();
    };
    const key = (e) => e.key === 'Escape' && exit();
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('fullscreenchange', change);
      window.removeEventListener('keydown', key);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
  }, [full]);
  return { full, enter, exit, toggle: () => (full ? exit() : enter()) };
}
