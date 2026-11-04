// Palavra de ativação "Realys": o app fica ouvindo e, quando alguém fala "Realys…",
// abre o assistente com o pedido. Não passa pelo "Ok Google": usa o reconhecimento
// de voz do próprio celular, dentro do Realys.
// Funciona com o app aberto e a tela ligada. Com a tela bloqueada é a próxima etapa
// (precisa de um serviço em segundo plano com aviso fixo na barra de notificações).
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { findWake, normSame } from './wakeMatch';

// "Realys" é reconhecido pelo SOM (ver src/wakeMatch.js), não por uma lista de grafias:
// o celular escreve "Reels", "realize", "rallies"... e todos contam como "Realys" no começo da frase.
// Também confere as várias opções que o celular ouviu, não só a primeira.
const hearWake = (results) => {
  for (const alt of results || []) {
    const said = normSame(alt && alt.transcript);
    const m = findWake(said);
    if (m) return { said, m };
  }
  return null;
};

export async function askMicPermission() {
  try {
    const r = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return !!(r && r.granted);
  } catch (e) {
    return false;
  }
}

export function wakeWordSupported() {
  try {
    return Platform.OS === 'android' && ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch (e) {
    return false;
  }
}

// Componente invisível que escuta enquanto `enabled` for verdadeiro.
export function WakeWordListener({ enabled, onWake, onListening, onFatal }) {
  const on = useRef(false);
  const running = useRef(false);
  const woke = useRef(null); // { rest, timer }
  const errors = useRef(0);
  const restartTimer = useRef(null);
  const appActive = useRef(AppState.currentState === 'active');

  const start = () => {
    if (!on.current || running.current || !appActive.current) return;
    try {
      running.current = true;
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        maxAlternatives: 5,
        // Dica para o reconhecedor do celular: estas palavras existem e são prováveis.
        contextualStrings: ['Realys', 'Riális', 'Realis'],
      });
    } catch (e) {
      running.current = false;
      scheduleRestart(3000);
    }
  };
  const stop = () => {
    clearTimeout(restartTimer.current);
    if (woke.current) clearTimeout(woke.current.timer);
    woke.current = null;
    if (running.current) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch (e) {}
    }
    running.current = false;
  };
  const scheduleRestart = (ms) => {
    clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(start, ms);
  };
  const fire = (rest) => {
    stop();
    onListening && onListening(false);
    onWake(rest.trim());
  };

  useEffect(() => {
    on.current = enabled;
    if (enabled) start();
    else stop();
    onListening && onListening(false);
    return () => stop();
  }, [enabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      appActive.current = s === 'active';
      if (appActive.current) start();
      else stop();
    });
    return () => sub.remove();
  }, []);

  useSpeechRecognitionEvent('start', () => {
    errors.current = 0;
    onListening && onListening(true);
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!on.current) return;
    const heard = hearWake(event.results);
    if (!heard) return;
    const { said, m } = heard;
    const rest = said.slice(m.end).replace(/^[\s,.!?]+/, '');
    if (event.isFinal) return fire(rest);
    // Ouviu "Realys": espera a pessoa terminar a frase (ou 2,5 s de silêncio).
    if (!woke.current) woke.current = { rest, timer: setTimeout(() => woke.current && fire(woke.current.rest), 2500) };
    else woke.current.rest = rest;
  });

  useSpeechRecognitionEvent('end', () => {
    running.current = false;
    onListening && onListening(false);
    if (on.current) scheduleRestart(errors.current > 4 ? 5000 : 350);
  });

  useSpeechRecognitionEvent('error', (event) => {
    errors.current += 1;
    if (event && (event.error === 'not-allowed' || event.error === 'service-not-allowed')) {
      on.current = false;
      stop();
      onFatal && onFatal('O Realys precisa da permissão do microfone para ouvir a palavra "Realys".');
    }
  });

  return null;
}
