// Conversa privada fica só entre as duas pessoas: enquanto o chat ou a chamada estão abertos,
// o Android bloqueia print e gravação de tela (e a tela aparece preta nos apps recentes).
import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

export function usePrivateScreen(active, tag = 'privado') {
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
