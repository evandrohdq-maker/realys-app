// Janelinha por cima dos outros apps (picture-in-picture do Android), como no YouTube Premium.
// Dentro da janelinha aparece SÓ o player que a pessoa está usando, nunca o app inteiro:
//   - rádio: a logo, o nome e o AO VIVO;   - TV: o vídeo do canal;   - live: o vídeo da live.
// A janelinha abre sozinha ao sair do Re@lys (Android 12+) ou pelo botão de janela do player.
// O próprio Android põe nela os botões de abrir em tela cheia e de fechar, e deixa arrastar.
// Precisa do APK novo (módulo nativo RealysUpdater); sem ele, nada muda.
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

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

// ---------- Minimizar o Re@lys ----------
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
