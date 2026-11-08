// Frases de voz do titular (cadastradas junto com a voz do dono):
//  - Frase de confirmação: substitui o "sim, confirmo". Só ela confirma compras, contratações,
//    agendamentos e pagamentos por voz, e só com a voz do titular.
//  - Frase de segurança (coação): para quando a pessoa está sendo assaltada ou obrigada a comprar.
//    A Lotus finge que deu tudo certo (a compra NÃO acontece, nenhum dinheiro sai) e, em silêncio,
//    manda o alerta com o GPS e o endereço para a segurança do Realys e liga para o 190.
//    Chamada falsa = conta bloqueada e saldo retido (está no termo).
// As duas ficam só no celular, no cofre criptografado, junto com a voz.

const STOP = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'e', 'um', 'uma', 'pra', 'para', 'na', 'no', 'lotus', 'me', 'por', 'favor']);
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

export const CONFIRM_EXAMPLES = ['pode seguir com isso', 'manda ver agora', 'fechado e assinado', 'tá aprovado então'];
export const DURESS_EXAMPLES = ['pode finalizar tranquilo', 'confirma rapidinho aí', 'faz logo essa compra', 'tudo certo pode passar'];

// As palavras principais da frase aparecem todas, na ordem, no que foi dito?
export function matchPhrase(text, phrase) {
  const want = main(phrase);
  if (want.length < 2) return false;
  const got = words(text);
  let i = 0;
  for (const w of want) {
    const k = got.findIndex((g, j) => j >= i && same(g, w));
    if (k < 0) return false;
    i = k + 1;
  }
  return true;
}

// Regras para as frases: pelo menos 2 palavras principais, diferentes entre si, e nenhuma pode
// conter a outra (senão uma dispararia a outra). Nada de "socorro" na de segurança.
export function phrasesProblem(confirm, duress, panicPhrase) {
  if (main(confirm).length < 2) return 'A frase de confirmação precisa ter pelo menos 2 palavras (sem contar "a", "de", "pra").';
  if (main(duress).length < 2) return 'A frase de segurança precisa ter pelo menos 2 palavras (sem contar "a", "de", "pra").';
  if (matchPhrase(confirm, duress) || matchPhrase(duress, confirm)) return 'As duas frases estão parecidas demais. Use palavras diferentes em cada uma.';
  if (/socorro|policia|assalt|ajuda|190|brigada/.test(main(duress).join(' '))) return 'A frase de segurança precisa parecer um pedido normal, para quem está perto não perceber. Não use "socorro", "polícia" ou "ajuda".';
  if (panicPhrase && (matchPhrase(confirm, panicPhrase) || matchPhrase(duress, panicPhrase))) return 'Essa frase é parecida com a sua chave de segurança do motorista. Escolha outra.';
  return null;
}
