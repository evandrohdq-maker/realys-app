// Convivência com a música do celular (Spotify no carro, YouTube Music, rádio…).
// O reconhecimento de voz do Android pausa a música enquanto o microfone está aberto.
// Por isso: com música de outro app tocando, o "abrir Lotus" fica desligado (a música não é
// interrompida a cada poucos segundos) e a pessoa fala com a Lotus tocando na flor. Quando a
// Lotus termina, a música volta a tocar sozinha.
let Native = null;
try {
  Native = require('expo-modules-core').requireOptionalNativeModule('RealysUpdater');
} catch (e) {}

export function musicPlaying() {
  try {
    return !!(Native && Native.isMusicActive && Native.isMusicActive());
  } catch (e) {
    return false;
  }
}

export function resumeMusic() {
  try {
    if (Native && Native.resumeMusic) Native.resumeMusic();
  } catch (e) {}
}

// Lembra se tinha música tocando antes de a Lotus abrir o microfone e, no fim, dá play de novo.
let wasPlaying = false;
export function rememberMusic() {
  if (!wasPlaying) wasPlaying = musicPlaying();
}
export function giveMusicBack(delay = 500) {
  if (!wasPlaying) return;
  wasPlaying = false;
  setTimeout(() => {
    if (!musicPlaying()) resumeMusic();
  }, delay);
}
