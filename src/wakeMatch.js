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
// O celular às vezes escreve "Lotus" como "motos" (e o contrário). "Motos" só vale como o nome
// dela quando não está falando de motos de verdade: "ver motos", "motos usadas", "loja de motos".
const MOTO = new Set(['motos', 'moto', 'motus', 'mottos']);
const MOTO_BEFORE = new Set(['de', 'das', 'dos', 'da', 'do', 'as', 'os', 'umas', 'uns', 'uma', 'um', 'duas', 'ver', 'veja', 'mostra', 'mostrar', 'mostre', 'comprar', 'compra', 'vender', 'vende', 'venda', 'alugar', 'aluguel', 'quero', 'procuro', 'procurando', 'tem', 'minha', 'meu', 'sua', 'nova', 'novas', 'usada', 'usadas', 'pecas', 'peca', 'loja', 'lojas', 'oficina', 'capacete', 'seguro', 'entrega', 'pra', 'para', 'por', 'com', 'e', 'mais', 'algumas', 'barata', 'baratas']);
const MOTO_AFTER = new Set(['usadas', 'usada', 'novas', 'nova', 'baratas', 'barata', 'eletricas', 'eletrica', 'de', 'da', 'do', 'a', 'para', 'pra', 'honda', 'yamaha', 'cg', 'biz', 'bmw', 'esportivas', 'zero', '0km']);
function motoIsLotus(words, i) {
  if (!MOTO.has(words[i].w)) return false;
  const prev = words[i - 1] && words[i - 1].w;
  const next = words[i + 1] && words[i + 1].w;
  return !(prev && MOTO_BEFORE.has(prev)) && !(next && MOTO_AFTER.has(next));
}

function lotusAt(words, i) {
  if (motoIsLotus(words, i)) return { dist: 1, end: words[i].end, next: i + 1 };
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

// Chamar pelo nome enquanto a Lotus fala: "Lotus!" interrompe a fala e ela volta a ouvir.
// Basta o nome (com ou sem "abrir", "oi", "ei" antes). O que vier depois já vira o novo pedido:
// "Lotus, me leva pro Agro" -> { rest: "me leva pro Agro" }; "Lotus" -> { rest: "" }.
// Devolve null se o nome não foi dito.
export function findCall(said) {
  const text = String(said || '');
  const words = wordsOf(normSame(text));
  // Vale o ÚLTIMO "Lotus" ouvido: o que vem antes pode ser a própria voz dela captada pelo
  // microfone ou um "Lotus, Lotus" repetido; o pedido novo é o que vem depois do último.
  let last = null;
  for (let i = 0; i < words.length; i++) {
    const l = lotusAt(words, i);
    if (l) last = l;
  }
  return last ? { rest: text.slice(last.end).replace(/^[\s,.!?:;-]+/, '').trim() } : null;
}

// Confere todas as opções que o celular ouviu.
export function hearCall(results) {
  for (const alt of results || []) {
    const m = findCall(alt && alt.transcript);
    if (m) return m;
  }
  return null;
}

// A Lotus NUNCA pode obedecer à própria voz: o microfone fica ligado enquanto ela fala e pega a voz
// dela junto com a da pessoa. Como ela sabe exatamente o que falou, tudo o que o microfone ouviu e
// que é a fala dela é jogado fora, em qualquer parte da frase (não só no começo):
//   - no começo, 2 ou mais palavras seguidas iguais à fala dela;
//   - no meio ou no fim, 3 ou mais palavras seguidas iguais (2 palavras soltas, como um nome que a
//     pessoa repete, "chama o Pedro Alves", continuam valendo);
//   - se sobrar só 1 palavra e ela também é da fala dela, sobra nada.
// Sobra só o que a pessoa disse. Se tudo era a voz dela, sobra nada e nada é executado.
export function stripEcho(rest, spoken) {
  const words = String(rest || '').split(/\s+/).filter(Boolean);
  const her = norm(spoken).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length || her.length < 2) return String(rest || '').trim();
  const w = words.map((x) => norm(x).replace(/[^a-z0-9]/g, ''));
  const runAt = (j) => {
    let best = 0;
    for (let i = 0; i < her.length; i++) {
      let k = 0;
      while (j + k < w.length && i + k < her.length && (w[j + k] === her[i + k] || !w[j + k])) k++;
      if (k > best) best = k;
    }
    return best;
  };
  const keep = [];
  for (let j = 0; j < w.length; ) {
    const k = runAt(j);
    if (k >= (keep.length ? 3 : 2)) j += k;
    else keep.push(words[j++]);
  }
  const herSet = new Set(her);
  if (keep.length === 1 && herSet.has(norm(keep[0]).replace(/[^a-z0-9]/g, ''))) return '';
  return keep.join(' ').trim();
}

// O contrário: pediu motos e o celular escreveu "Lotus" ("quero ver Lotus usadas"). Quando a
// palavra aparece no meio de um pedido de compra/aluguel, troca por "motos".
export function fixMotos(said) {
  const text = String(said || '');
  const same = normSame(text);
  const words = wordsOf(same);
  let out = text;
  for (let i = words.length - 1; i >= 1; i--) {
    const w = words[i];
    const prev = words[i - 1].w;
    const next = words[i + 1] && words[i + 1].w;
    if (closeness(w.w) <= 1 && (MOTO_BEFORE.has(prev) || (next && MOTO_AFTER.has(next))) && !CALLS.has(prev) && !OPEN.has(prev)) {
      out = out.slice(0, w.start) + 'motos' + out.slice(w.end);
    }
  }
  return out;
}
