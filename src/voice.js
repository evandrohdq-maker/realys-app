// Voz de resposta da Lotus: suave, feminina e em português do Brasil.
// Escolhe a melhor voz pt-BR instalada no celular (prefere as femininas e as de alta qualidade)
// e fala um pouco mais devagar, com o tom levemente mais alto, para soar calma e acolhedora.
import * as Speech from 'expo-speech';

const SOFT = { rate: 0.88, pitch: 1.08 };

// Vozes femininas conhecidas do Google TTS e de outros motores no Android.
const FEMALE_HINTS = ['afs', 'pte', 'ptc', 'female', 'feminin', 'mulher', 'luciana', 'francisca', 'vitoria', 'camila', 'maria', 'thalita', 'joana'];
const MALE_HINTS = ['ptd', 'ptf', 'male', 'masculin', 'antonio', 'daniel', 'felipe', 'donato'];

let chosen; // undefined = ainda não procurou; null = usa a padrão do celular

const isPtBr = (v) => /^pt[-_]?br/i.test(v.language || '') || /pt[-_]br/i.test(v.identifier || '');

function score(v) {
  const id = `${v.identifier || ''} ${v.name || ''}`.toLowerCase();
  let s = 0;
  if (FEMALE_HINTS.some((h) => id.includes(h))) s += 10;
  if (MALE_HINTS.some((h) => id.includes(h))) s -= 10;
  if (String(v.quality).toLowerCase() === 'enhanced') s += 4;
  if (id.includes('local')) s += 2; // funciona sem internet e responde mais rápido
  if (id.includes('network')) s -= 1;
  return s;
}

export async function prepareVoice() {
  if (chosen !== undefined) return chosen;
  try {
    const voices = (await Speech.getAvailableVoicesAsync()) || [];
    const pt = voices.filter(isPtBr).sort((a, b) => score(b) - score(a));
    chosen = pt.length ? pt[0].identifier : null;
  } catch (e) {
    chosen = null;
  }
  return chosen;
}

// Fala com a voz suave da Lotus.
export async function speakSoft(text, options = {}) {
  const voice = await prepareVoice();
  Speech.stop();
  Speech.speak(text, { language: 'pt-BR', ...SOFT, ...(voice ? { voice } : {}), ...options });
}

export const stopSpeaking = () => Speech.stop();
