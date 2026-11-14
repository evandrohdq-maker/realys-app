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
  Speech.speak(forSpeech(text), { language: 'pt-BR', ...SOFT, ...(voice ? { voice } : {}), ...options });
}

export const stopSpeaking = () => Speech.stop();

// Divide a resposta em frases. Assim a Lotus sabe em que frase parou quando é pausada
// e consegue continuar dali (o Android não tem "pausar" na voz, só "parar").
const ABBR = /(?:^|\s)(?:Dr|Dra|Sr|Sra|Srta|Av|Prof|Profa|nº|n)\.$/i;
export const splitSentences = (text) => {
  const t = String(text || '').trim();
  const out = [];
  let cur = '';
  for (let i = 0; i < t.length; i++) {
    cur += t[i];
    // fim de frase: pontuação seguida de espaço (ou do fim). "3.4", "Dra. Sofia" não quebram.
    if (/[.!?…]/.test(t[i]) && (i === t.length - 1 || /\s/.test(t[i + 1])) && !ABBR.test(cur)) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : [t];
};

// Texto para a VOZ da Lotus: sem símbolos (/, ·, ★, emojis), sem notas e sem detalhes entre
// parênteses, com unidades por extenso (km -> quilômetros, R$ -> reais). E mais curto: fala as
// duas primeiras frases e a pergunta final (o detalhe completo continua escrito na tela).
// A marca se escreve "Re@lys", mas a Lotus fala "Realys" (nunca "re arroba lys").
const sayName = (t) => String(t || '').replace(/re@lys/gi, 'Realys');

export function forSpeech(text) {
  let t = sayName(text);
  t = t.replace(/\([^)]*\)/g, '');
  t = t.replace(/,?\s*nota\s*\d+(?:[.,]\d+)?/gi, '');
  t = t.replace(/★\s*\d+(?:[.,]\d+)?/g, '');
  t = t.replace(/R\$\s*(\d+(?:\.\d{3})*)(?:,(\d{2}))?/g, (m, r, c) => (c && c !== '00' ? `${r} reais e ${+c} centavos` : `${r} reais`));
  t = t.replace(/(\d)\s*km\b/gi, '$1 quilômetros').replace(/\bkm\b/gi, 'quilômetros');
  t = t.replace(/(\d)\s*min\b/g, '$1 minutos');
  t = t.replace(/\//g, ' ou ');
  t = t.replace(/[·•★*#_|→—–]+/g, ', ');
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '');
  t = t.replace(/(?:\s*,\s*){2,}/g, ', ').replace(/\s+,/g, ',').replace(/\s+([,.!?…])/g, '$1').replace(/([.!?…]),/g, '$1').replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/^,\s*/, '');
  const parts = splitSentences(t);
  if (parts.length <= 3) return t;
  const keep = parts.slice(0, 2);
  const ask = parts.filter((x) => /\?$/.test(x)).pop();
  if (ask && !keep.includes(ask)) keep.push(ask);
  return keep.join(' ');
}

// Fala as frases a partir da frase `from`. onPart(i) avisa qual frase começou.
// onDone só no fim da última; onStopped/onError uma vez só (quando ela é parada).
// alive(): se devolver false, a fala foi cancelada (a pessoa interrompeu) e nada é falado.
export async function speakParts(parts, from = 0, { onPart, onDone, onStopped, onError, alive } = {}) {
  const voice = await prepareVoice();
  // Enquanto preparava a voz, a pessoa chamou "Lotus": não começa a resposta que ficou para trás.
  if (alive && !alive()) return onStopped && onStopped();
  Speech.stop();
  let over = false;
  const once = (fn) => () => {
    if (over) return;
    over = true;
    fn && fn();
  };
  const stopped = once(onStopped);
  const failed = once(onError);
  const finished = once(onDone);
  const list = parts.slice(from);
  if (!list.length) return finished();
  list.forEach((p, k) => {
    const i = from + k;
    Speech.speak(sayName(p), {
      language: 'pt-BR',
      ...SOFT,
      ...(voice ? { voice } : {}),
      onStart: () => !over && onPart && onPart(i),
      onDone: k === list.length - 1 ? finished : undefined,
      onStopped: stopped,
      onError: failed,
    });
  });
}
