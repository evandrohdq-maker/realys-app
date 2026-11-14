// Comando de ativação "abrir Lotus": o app fica ouvindo e, quando alguém fala "abrir Lotus…",
// abre a assistente Lotus com o pedido. Não passa pelo "Ok Google": usa o reconhecimento
// de voz do próprio celular, dentro do Re@lys.
// Funciona com o app aberto e a tela ligada. Com a tela bloqueada é a próxima etapa
// (precisa de um serviço em segundo plano com aviso fixo na barra de notificações).
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { findWake, normSame, hearCall } from './wakeMatch';
import { stopSpeaking } from './voice';
import { musicPlaying } from './musicGuard';
import { voiceGateOn, recordingFor, verifyWake } from './voicePrint';
import { isPanicAny } from './panic';
import { findCall } from './wakeMatch';
import { securityQuestion } from './voicePrint';
import { answerKind } from './voicePhrases';
import { withSystemDialog } from './systemDialog';
import { onDeviceOptions, noteVoiceError } from './offlineVoice';

// "Lotus" + socorro/denúncia/emergência + resposta de segurança → { kind, tipo } ou null.
function silentOf(texts) {
  const sq = securityQuestion();
  if (!sq) return null;
  for (const t of texts || []) {
    const c = findCall(t);
    if (!c) continue;
    const n = String(c.rest || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').trim();
    const m = n.match(/^(denuncia|denunciar|socorro|emergencia)\s+(.+)$/);
    if (m && answerKind(m[2], sq) === 'seguranca')
      return { kind: m[1] === 'emergencia' ? 'emergencia' : 'perigo', tipo: m[1] === 'emergencia' ? 'Emergência (silenciosa)' : m[1] === 'socorro' ? 'Socorro (silencioso)' : 'Denúncia (silenciosa)' };
  }
  return null;
}

// Com música de outro app tocando, o "abrir Lotus" fica desligado (o microfone do Android pausaria
// a música). Confere de tempos em tempos e volta a ouvir sozinho quando a música para.
const MUSIC_CHECK_MS = 4000;

// O Android desliga o microfone sozinho depois de uns segundos de silêncio, e o app religa na hora.
// Antes, cada religada fechava e abria a flor (a cada ~3 segundos, mesmo em silêncio). Agora a flor
// só fecha se o microfone ficar desligado de verdade por mais que isto:
const HEAR_OFF_DELAY_MS = 2500;
// Falhas seguidas sem ouvir nada (ex.: sem internet): espera cada vez mais antes de tentar de novo
// (2 s, 4 s, 8 s… até 30 s), em vez de liga-desliga sem parar gastando bateria.
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;
const NORMAL_END = [null, undefined, 'no-speech', 'speech-timeout', 'aborted', 'no-match'];

// A caixa da Lotus abre NA HORA em que o "abrir Lotus" é reconhecido (sem esperar a pessoa terminar
// de falar). O resto do pedido continua sendo ouvido pelo MESMO microfone, já com a caixa aberta:
// assim nenhuma palavra se perde na troca de microfone.
// Depois do pedido, espera esta pausa para entender que a pessoa terminou de falar:
const WAKE_REST_PAUSE_MS = 900;
// Disse só "abrir Lotus": espera o pedido por até 3 segundos.
const WAKE_EMPTY_WAIT_MS = 3000;

// "abrir Lotus" é reconhecido pelo SOM (ver src/wakeMatch.js), não por uma lista de grafias:
// o celular escreve "Lótus", "lotos", "lots", "abre", "abra"... e todos contam.
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
    const r = await withSystemDialog(() => ExpoSpeechRecognitionModule.requestPermissionsAsync());
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
export function WakeWordListener({ enabled, onWake, onWakeStart, onWakeHeard, onReject, onPanic, onSilent, onListening: rawListening, onFatal, onMusic }) {
  // Flor de "ouvindo": liga na hora; desliga na hora só quando o microfone para de verdade.
  // Numa religada normal do Android (soft), espera um pouco antes de fechar a flor.
  const shown = useRef(false);
  const offTimer = useRef(null);
  const onListening = (v, soft) => {
    if (!rawListening) return;
    if (v) {
      clearTimeout(offTimer.current);
      offTimer.current = null;
      if (!shown.current) {
        shown.current = true;
        rawListening(true);
      }
      return;
    }
    if (soft) {
      if (!shown.current || offTimer.current) return;
      offTimer.current = setTimeout(() => {
        offTimer.current = null;
        shown.current = false;
        rawListening(false);
      }, HEAR_OFF_DELAY_MS);
      return;
    }
    clearTimeout(offTimer.current);
    offTimer.current = null;
    shown.current = false;
    rawListening(false);
  };
  const lastErr = useRef(null);
  const fails = useRef(0);
  const retryNow = useRef(false);
  const on = useRef(false);
  const running = useRef(false);
  const woke = useRef(null); // { rest, timer }
  const errors = useRef(0);
  const restartTimer = useRef(null);
  const appActive = useRef(AppState.currentState === 'active');
  // Voz do titular: o celular grava o que o microfone ouve e, no "abrir Lotus", o app confere a voz.
  const audio = useRef({ uri: null, waiters: [] });
  const firing = useRef(false);

  const music = useRef(false);
  const start = () => {
    if (!on.current || running.current || !appActive.current) return;
    const playing = musicPlaying();
    if (playing !== music.current) {
      music.current = playing;
      onMusic && onMusic(playing);
    }
    if (playing) {
      onListening && onListening(false);
      return scheduleRestart(MUSIC_CHECK_MS);
    }
    try {
      running.current = true;
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        maxAlternatives: 5,
        // Dica para o reconhecedor do celular: estas palavras existem e são prováveis.
        contextualStrings: ['abrir Lotus', 'Lotus', 'Lótus'],
        // Em Androids que não têm o "continuous", o microfone aguenta mais tempo ligado no silêncio
        // (menos religadas).
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 60000,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        },
        // Sem internet: usa o reconhecimento do próprio celular (se ele tiver).
        ...onDeviceOptions(),
        // Com a voz do titular cadastrada, o celular entrega o áudio para conferir quem chamou.
        ...(voiceGateOn() ? recordingFor('wake') : {}),
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
    if (!appActive.current) return; // em segundo plano não religa o microfone
    restartTimer.current = setTimeout(start, ms);
  };
  // Espera o celular fechar o arquivo de áudio (no máximo 900 ms).
  const audioDone = () =>
    new Promise((resolve) => {
      const t = setTimeout(() => resolve(audio.current.uri), 900);
      audio.current.waiters.push((uri) => (clearTimeout(t), resolve(uri)));
    });
  const fire = async (rest) => {
    if (firing.current) return;
    const gate = voiceGateOn();
    if (!gate) {
      stop();
      onListening && onListening(false);
      onWake(rest.trim());
      // Se o pedido foi só de navegação ("abrir Lotus, me leva pro Agro"), a caixa não abre:
      // volta a ouvir sozinho. Se a caixa abrir, o stop() cancela esta volta.
      if (on.current) scheduleRestart(700);
      return;
    }
    // Voz do titular: termina a gravação (stop, não abort, para o arquivo fechar), confere a voz e só
    // então a Lotus atende. A caixa já está aberta na tela; só o pedido espera a conferência.
    firing.current = true;
    clearTimeout(restartTimer.current);
    if (woke.current) clearTimeout(woke.current.timer);
    woke.current = null;
    const wait = audioDone();
    if (running.current) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {}
    }
    onListening && onListening(false);
    const uri = await wait;
    const v = await verifyWake(uri);
    firing.current = false;
    running.current = false;
    if (v.ok === false) onReject && onReject(v);
    else onWake(rest.trim());
    if (on.current) scheduleRestart(700);
  };

  useEffect(() => {
    on.current = enabled;
    fails.current = 0;
    if (enabled) start();
    else {
      stop();
      onListening(false);
    }
    return () => stop();
  }, [enabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      appActive.current = s === 'active';
      if (appActive.current) start();
      else {
        // App minimizado ou tela bloqueada: desliga o microfone e cala a Lotus (economiza bateria).
        stop();
        stopSpeaking();
        onListening && onListening(false);
      }
    });
    return () => sub.remove();
  }, []);

  // A caixa da Lotus usa o mesmo microfone: só reage aos eventos quando está ouvindo o "abrir Lotus".
  useSpeechRecognitionEvent('start', () => {
    if (!on.current) return;
    onListening(true);
  });

  useSpeechRecognitionEvent('audiostart', (e) => {
    if (on.current && running.current && e && e.uri) audio.current.uri = e.uri;
  });
  useSpeechRecognitionEvent('audioend', (e) => {
    if (!on.current) return;
    if (e && e.uri) audio.current.uri = e.uri;
    const w = audio.current.waiters;
    audio.current.waiters = [];
    w.forEach((fn) => fn(audio.current.uri));
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!on.current || firing.current) return;
    if (!appActive.current) return stop();
    fails.current = 0; // o microfone está funcionando
    // Chave de segurança ("Lotus" + frase secreta): dispara na hora, em silêncio, sem abrir a Lotus.
    if (isPanicAny((event.results || []).map((a) => a && a.transcript))) {
      stop();
      onListening && onListening(false);
      onPanic && onPanic();
      if (on.current) scheduleRestart(1500);
      return;
    }
    // "Lotus, socorro/denúncia/emergência + palavra de segurança": alerta silencioso, sem abrir a Lotus.
    const sil = silentOf((event.results || []).map((a) => a && a.transcript));
    if (sil) {
      stop();
      onListening && onListening(false);
      onSilent && onSilent(sil);
      if (on.current) scheduleRestart(1500);
      return;
    }
    const heard = hearWake(event.results);
    // Chamou "Lotus" enquanto ela fala (caixa fechada, ex.: "Abrindo Agro"): ela se cala na hora.
    if (!heard && !woke.current && running.current && hearCall(event.results)) stopSpeaking();
    if (!heard) return;
    const { said, m } = heard;
    const rest = said.slice(m.end).replace(/^[\s,.!?]+/, '');
    // Primeira vez que ouviu "abrir Lotus": abre a caixa AGORA (o pedido vem depois).
    if (!woke.current) onWakeStart && onWakeStart();
    onWakeHeard && onWakeHeard(rest);
    if (event.isFinal && rest) return fire(rest);
    // Cada palavra nova reinicia a contagem, para não cortar o pedido no meio.
    if (woke.current) clearTimeout(woke.current.timer);
    woke.current = { rest, timer: setTimeout(() => woke.current && fire(woke.current.rest), rest ? WAKE_REST_PAUSE_MS : WAKE_EMPTY_WAIT_MS) };
  });

  useSpeechRecognitionEvent('end', () => {
    running.current = false;
    if (!on.current || firing.current) return;
    // O celular desligou o microfone logo depois do "abrir Lotus": a caixa (já aberta) assume e ouve.
    if (woke.current) return fire(woke.current.rest);
    if (!on.current || !appActive.current) return onListening(false);
    const code = lastErr.current;
    lastErr.current = null;
    // Sem internet e o celular entende português sozinho: tenta de novo na hora, pelo aparelho.
    if (retryNow.current) {
      retryNow.current = false;
      onListening(false, true);
      return scheduleRestart(150);
    }
    // Silêncio (o Android desligou sozinho): religa na hora, sem fechar a flor.
    if (NORMAL_END.includes(code)) {
      onListening(false, true);
      return scheduleRestart(150);
    }
    // Erro de verdade (sem internet, microfone ocupado…): espera cada vez mais.
    fails.current += 1;
    onListening(false);
    scheduleRestart(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (fails.current - 1)));
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!on.current) return;
    errors.current += 1;
    lastErr.current = event && event.error;
    if (noteVoiceError(lastErr.current)) retryNow.current = true;
    if (event && (event.error === 'not-allowed' || event.error === 'service-not-allowed')) {
      on.current = false;
      stop();
      onFatal && onFatal('O Re@lys precisa da permissão do microfone para ouvir o comando "abrir Lotus".');
    }
  });

  return null;
}
