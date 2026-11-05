// Reconhece o comando de ativação "abrir Lotus" pelo SOM, não pela grafia.
// O reconhecimento de voz do celular pode escrever "Lotus" de vários jeitos:
// "Lótus", "lotos", "lots", "lotis", "low tus"... e "abrir" como "abre", "abra", "abri", "a brir".
// Aqui cada palavra ouvida vira uma "chave de som" e é comparada com a chave de "Lotus".
// Sem dependências do React Native, para poder ser testado no computador.

export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const ASSISTANT_NAME = 'Lotus';
export const WAKE_PHRASE = 'abrir Lotus';

// "Chave de som": junta letras que soam igual em português e inglês.
// lotus -> lotos · lótus -> lotos · lotos -> lotos · low tus -> lotos · lotis -> lotis
export function soundKey(word) {
  let s = norm(word).replace(/[^a-z]/g, '');
  s = s
    .replace(/th/g, 't')
    .replace(/w/g, '')
    .replace(/h/g, '')
    .replace(/u/g, 'o')
    .replace(/y/g, 'i')
    .replace(/z/g, 's');
  s = s.replace(/(.)\1+/g, '$1'); // letras repetidas: lottus -> lotos
  return s;
}

const TARGET = soundKey('Lotus'); // "lotos"

// Palavras comuns parecidas com "Lotus" que não são o nome.
const NOT_WAKE = new Set(['lote', 'lotes', 'loto', 'lotado', 'lotada', 'lotou', 'louco', 'logo', 'lucas']);

// Jeitos de o celular escrever "abrir".
const OPEN = new Set(['abrir', 'abre', 'abra', 'abri', 'abrem', 'abro', 'abrirr', 'habrir']);

// Palavras de chamada que podem vir antes: "Oi, abrir Lotus", "Ei, abre Lotus".
const CALLS = new Set(['oi', 'ei', 'ok', 'okay', 'hey', 'ola', 'alo', 'e', 'ai', 'ae', 'o', 'a']);

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Quanto o trecho ouvido se parece com "Lotus" (0 = igual).
function closeness(text) {
  const plain = norm(text).replace(/[^a-z]/g, '');
  if (NOT_WAKE.has(plain)) return 99;
  const k = soundKey(text);
  if (k.length < 4 || k[0] !== 'l' || k[1] !== 'o') return 99; // tem que começar com "Lo"
  const d = distance(k, TARGET);
  if (d === 0) return 0;
  // Parecido, mas só conta se terminar com o "s" de "Lotus" ("lots", "lotis", "lotas").
  return k.endsWith('s') ? d : 99;
}

// Igual ao norm, mas mantém o mesmo tamanho do texto (posições batem com o original).
export const normSame = (s) =>
  Array.from(String(s || ''))
    .map((c) => norm(c).charAt(0) || c)
    .join('');

function wordsOf(text) {
  const words = [];
  text.replace(/[a-z]+/g, (w, i) => {
    words.push({ w, start: i, end: i + w.length });
    return w;
  });
  return words;
}

// Acha "Lotus" a partir da palavra i (sozinha ou juntando "low tus", "lo tus").
function lotusAt(words, i) {
  let best = null;
  for (let n = 1; n <= 2 && i + n <= words.length; n++) {
    const part = words.slice(i, i + n);
    const dist = closeness(part.map((p) => p.w).join(''));
    if (dist <= 1 && (!best || dist < best.dist)) best = { dist, end: part[part.length - 1].end, next: i + n };
  }
  return best;
}

// Acha "abrir" a partir da palavra i (também "a brir").
function openAt(words, i) {
  if (!words[i]) return null;
  if (OPEN.has(words[i].w)) return { start: words[i].start, next: i + 1 };
  if (words[i + 1] && OPEN.has(words[i].w + words[i + 1].w)) return { start: words[i].start, next: i + 2 };
  return null;
}

// Procura "abrir Lotus" no que foi ouvido. Precisa do "abrir" logo antes do "Lotus",
// para o app não abrir sozinho quando alguém só fala de flor de lótus numa conversa.
// Devolve { start, end } (posições no texto normalizado) ou null.
export function findWake(said) {
  const words = wordsOf(normSame(said));
  for (let i = 0; i < words.length; i++) {
    const o = openAt(words, i);
    if (!o) continue;
    // Aceita "abrir a Lotus" / "abrir o Lotus".
    const at = words[o.next] && (words[o.next].w === 'a' || words[o.next].w === 'o') ? o.next + 1 : o.next;
    const l = lotusAt(words, o.next) || lotusAt(words, at);
    if (l) return { start: o.start, end: l.end };
  }
  return null;
}

// Tira o "abrir Lotus" (e o "Oi"/"Ei" antes dele) do começo do pedido.
// "Abrir Lotus, tem hotel perto?" -> "tem hotel perto?"
// Dentro do assistente também aceita só "Lotus, …" no começo.
export function stripWake(said) {
  const text = Array.from(String(said || '')).join('');
  const same = normSame(text);
  let m = findWake(text);
  if (!m) {
    const words = wordsOf(same);
    let i = 0;
    while (i < words.length && i < 2 && CALLS.has(words[i].w)) i++;
    const l = words[i] ? lotusAt(words, i) : null;
    if (l) m = { start: words[i].start, end: l.end };
  }
  if (!m) return text.trim();
  const before = same.slice(0, m.start).replace(/[^a-z]+/g, ' ').trim();
  const onlyCalls = !before || before.split(' ').every((w) => CALLS.has(w));
  if (!onlyCalls) return text.trim();
  return text.slice(m.end).replace(/^[\s,.!?:;-]+/, '').trim();
}
