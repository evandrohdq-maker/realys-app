// Lotus sem internet. O reconhecimento de voz normal do Android manda o áudio para o Google:
// sem internet ele dá erro "network" na hora, e a Lotus parecia morta (o "abrir Lotus" não abria
// e o microfone liga-desliga sem parar). Quando o celular tem o reconhecimento DENTRO do aparelho
// (Android 13 ou mais novo, com o pacote de voz em português baixado), passa a usar ele.
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

let netFailed = false; // já deu erro de internet: tenta pelo próprio celular
let deviceBroken = false; // o celular não tem a voz em português dentro do aparelho

const NET_ERRORS = ['network', 'server', 'server-disconnected'];
const DEVICE_ERRORS = ['language-not-supported', 'language-unavailable'];

function deviceOk() {
  if (deviceBroken) return false;
  try {
    return !!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
  } catch (e) {
    return false;
  }
}

// Opções extras para o start(): reconhecimento no próprio celular quando a internet falhou.
export const onDeviceOptions = () => (netFailed && deviceOk() ? { requiresOnDeviceRecognition: true } : {});

export const isNetError = (code) => NET_ERRORS.includes(code);

// Avisa o erro que o microfone deu. Devolve true se vale tentar de novo pelo próprio celular.
export function noteVoiceError(code) {
  if (isNetError(code)) {
    const first = !netFailed;
    netFailed = true;
    return first && deviceOk();
  }
  if (netFailed && DEVICE_ERRORS.includes(code)) deviceBroken = true;
  return false;
}

// O celular entende português sem internet?
export const worksOffline = () => deviceOk();
