// Conversa privada fica só entre as duas pessoas: enquanto o chat ou a chamada estão abertos,
// o Android bloqueia print e gravação de tela (e a tela aparece preta nos apps recentes).
import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { useScreenSharePause } from './screenShare';

// E se eu estiver mostrando a tela numa sala ou live, a transmissão pausa sozinha (src/screenShare.js).
export function usePrivateScreen(active, tag = 'privado') {
  useScreenSharePause(!!active, /chamada/.test(tag) ? 'chamada' : 'chat');
  useEffect(() => {
    if (!active) return;
    let on = true;
    ScreenCapture.preventScreenCaptureAsync(tag).catch(() => {});
    return () => {
      if (!on) return;
      on = false;
      ScreenCapture.allowScreenCaptureAsync(tag).catch(() => {});
    };
  }, [active, tag]);
}
