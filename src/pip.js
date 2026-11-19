// Janelinha por cima dos outros apps (picture-in-picture do Android), como no YouTube Premium.
// Rádio tocando: ao sair do Re@lys (botão início), o app vira uma janelinha no canto com a logo da
// rádio. Dá para arrastar, tocar para voltar e fechar no X (fechar a janelinha para a rádio).
// A TV usa a janelinha do próprio player de vídeo (src/components/FloatPlayers.js).
// Precisa do APK novo (módulo nativo RealysUpdater); sem ele, nada muda.
import { useEffect, useRef, useState } from 'react';
import { AppState, useWindowDimensions } from 'react-native';

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

export const pipOk = () => !!call('canPip');
export const setAutoPip = (on) => call('setAutoPip', !!on, 16, 9);
export const enterPip = () => call('enterPip', 16, 9);
const isInPip = () => !!call('isInPip');

// O app está dentro da janelinha agora? A janela do Android fica bem pequena: confere com o nativo.
// onClosed: a pessoa fechou a janelinha no X (o app sai da janelinha e não volta para a frente).
export function usePip(onClosed) {
  const win = useWindowDimensions();
  const [inPip, setInPip] = useState(false);
  const was = useRef(false);
  const closed = useRef(onClosed);
  closed.current = onClosed;
  useEffect(() => {
    const now = win.width < 420 && win.height < 420 ? isInPip() || win.width < 300 : false;
    if (was.current && !now) {
      // Saiu da janelinha: tocou para abrir (volta ativo) ou fechou no X (fica em segundo plano).
      setTimeout(() => {
        if (AppState.currentState !== 'active') closed.current && closed.current();
      }, 600);
    }
    was.current = now;
    setInPip(now);
  }, [win.width, win.height]);
  return inPip;
}
