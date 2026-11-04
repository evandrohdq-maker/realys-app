// Reconhece a palavra "Realys" pelo SOM, não pela grafia.
// O reconhecimento de voz do celular não conhece a palavra "Realys" (é um nome inventado)
// e escreve coisas parecidas: "Reels", "realize", "rallies", "real is", "Riális"...
// Aqui cada palavra ouvida vira uma "chave de som" e é comparada com a chave de "Realys".
// Sem dependências do React Native, para poder ser testado no computador.

export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// "Chave de som": junta letras que soam igual em português e inglês.
// realys -> rialis · realize -> rialis · reales -> rialis · rallies -> ralis · reels -> rils
export function soundKey(word) {
  let s = norm(word).replace(/[^a-z]/g, '');
  s = s
    .replace(/ph/g, 'f')
    .replace(/h/g, '')
    .replace(/y/g, 'i')
    .replace(/z/g, 's')
    .replace(/c(?=[ei])/g, 's')
    .replace(/[ck]/g, 'k');
  if (s.length > 4) s = s.replace(/e$/, ''); // realize -> realiz, realice -> realis
  s = s.replace(/e/g, 'i'); // "e" de Realys soa como "i": Riális
  s = s.replace(/(.)\1+/g, '$1'); // letras repetidas: rallies -> ralis
  return s;
}

const TARGET = soundKey('Realys'); // "rialis"

// Palavras comuns que soam perto de "Realys", mas não são a palavra.
const NOT_WAKE = new Set(['reais', 'real', 'reals', 'rial', 'rials', 'reles', 'relis']);

// Transcrições erradas conhecidas de "Realys" que não soam tão perto pela chave.
// Valem só no começo da frase ("Reels, tem hotel?"), nunca no meio ("vi uns reels").
const KNOWN = new Set(['reels', 'rails', 'reals is', 'rallies', 'realys', 'rialys']);

// Palavras de chamada que podem vir antes: "Oi Realys", "Ei, Realys", "Ok Realys".
const CALLS = new Set(['oi', 'ei', 'ok', 'okay', 'hey', 'ola', 'alo', 'e', 'ai', 'ae', 'o', 'a']);

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Quanto o trecho ouvido se parece com "Realys" (0 = igual).
function closeness(text) {
  const plain = norm(text).replace(/[^a-z]/g, '');
  if (NOT_WAKE.has(plain)) return 99;
  const k = soundKey(text);
  if (k.length < 3 || k[0] !== 'r') return 99; // tem que começar com som de "R"
  const d = distance(k, TARGET);
  if (d === 0) return 0;
  if (KNOWN.has(plain)) return 1;
  // Parecido, mas só conta se terminar com o "s" de "Realys" (evita "rally", "relê"...).
  return k.endsWith('s') ? d : 99;
}

// Igual ao norm, mas mantém o mesmo tamanho do texto (posições batem com o original).
export const normSame = (s) =>
  Array.from(String(s || ''))
    .map((c) => norm(c).charAt(0) || c)
    .join('');

// Procura "Realys" no que foi ouvido.
// - No começo da frase (como "Ok Google"), aceita sons parecidos: "Reels", "rallies", "Riális".
// - No meio da frase, só aceita quando o som é praticamente igual, para não disparar à toa.
// Devolve { start, end } (posições no texto normalizado) ou null.
export function findWake(said) {
  const text = normSame(said);
  const words = [];
  text.replace(/[a-z]+/g, (w, i) => {
    words.push({ w, start: i, end: i + w.length });
    return w;
  });

  let first = 0;
  while (first < words.length && first < 2 && CALLS.has(words[first].w)) first++;

  let best = null;
  for (let i = 0; i < words.length; i++) {
    const atStart = i === first;
    // Testa a palavra sozinha e juntando com as próximas ("real is", "really is", "ri alis").
    for (let n = 1; n <= 3 && i + n <= words.length; n++) {
      const part = words.slice(i, i + n);
      const joined = part.map((p) => p.w).join('');
      const dist = closeness(joined);
      const limit = atStart ? (TARGET.length >= 6 ? 2 : 1) : 0;
      if (dist <= limit && (!best || dist < best.dist || (dist === best.dist && i < best.i))) {
        best = { i, dist, start: part[0].start, end: part[part.length - 1].end };
      }
    }
    if (best && best.dist === 0) break;
  }
  return best ? { start: best.start, end: best.end } : null;
}

// Tira o "Realys" (e o "Oi"/"Ei" antes dele) do começo do pedido.
// "Reels, tem hotel perto?" -> "tem hotel perto?"
export function stripWake(said) {
  const text = Array.from(String(said || '')).join('');
  const m = findWake(text);
  if (!m) return text.trim();
  const before = normSame(text).slice(0, m.start).replace(/[^a-z]+/g, ' ').trim();
  const onlyCalls = !before || before.split(' ').every((w) => CALLS.has(w));
  if (!onlyCalls) return text.trim();
  return text.slice(m.end).replace(/^[\s,.!?:;-]+/, '').trim();
}
