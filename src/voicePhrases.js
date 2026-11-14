// Confirmação em duas perguntas (só para quem cadastrou a voz do dono):
//  1ª "Você confirma a compra?"  → "sim, confirmo" (com a voz do titular).
//  2ª a pergunta de segurança que ele escolheu no cadastro ("Qual a sua cor preferida?"):
//     - resposta de liberação  ("branco") → a compra/contratação é feita;
//     - resposta de segurança  ("preto")  → a Lotus finge que deu certo (nada é cobrado nem chamado) e,
//       em silêncio, manda o alerta com GPS e endereço para a segurança do Re@lys e liga para o 190.
//     - qualquer outra resposta → não confirma nada.
// Para quem está do lado, as duas respostas soam iguais: uma resposta curta a uma pergunta comum.
// Pergunta e respostas ficam só no celular, no cofre criptografado, junto com a voz.

export const SECURITY_QUESTIONS = [
  'Qual a sua cor preferida?',
  'Qual o seu animal de estimação preferido?',
  'Qual o seu anime preferido?',
  'Qual a sua fruta preferida?',
  'Qual o seu time do coração?',
  'Qual a sua comida preferida?',
  'Qual a cidade dos seus sonhos?',
  'Qual o seu filme preferido?',
];

const STOP = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'e', 'um', 'uma', 'pra', 'para', 'na', 'no', 'lotus', 'e', 'eh', 'minha', 'meu', 'cor', 'e']);
const words = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
const main = (s) => words(s).filter((w) => !STOP.has(w));
const same = (a, b) => a === b || (a.length > 4 && b.length > 4 && (a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5))));

// A resposta cadastrada aparece no que a pessoa disse? (todas as palavras principais, na ordem)
export function saidAnswer(text, answer) {
  const want = main(answer);
  if (!want.length) return false;
  const got = words(text);
  let i = 0;
  for (const w of want) {
    const k = got.findIndex((g, j) => j >= i && same(g, w));
    if (k < 0) return false;
    i = k + 1;
  }
  return true;
}

// 'libera' | 'seguranca' | null. Se as duas aparecerem juntas, não decide (pede de novo).
export function answerKind(text, secq) {
  if (!secq) return null;
  const ok = saidAnswer(text, secq.allow);
  const sos = saidAnswer(text, secq.duress);
  if (ok && sos) return null;
  return sos ? 'seguranca' : ok ? 'libera' : null;
}

export function secqProblem(q) {
  if (!q || !String(q.question || '').trim()) return 'Escolha ou escreva a pergunta de segurança.';
  if (!main(q.allow).length) return 'Grave ou escreva a resposta que libera a compra.';
  if (!main(q.duress).length) return 'Grave ou escreva a resposta de segurança.';
  if (saidAnswer(q.allow, q.duress) || saidAnswer(q.duress, q.allow)) return 'As duas respostas estão parecidas demais. Use respostas bem diferentes (por exemplo, branco e preto).';
  if (/socorro|policia|assalt|ajuda|190|brigada/.test(words(q.duress).join(' '))) return 'A resposta de segurança precisa parecer uma resposta normal, para quem está perto não perceber.';
  return null;
}
