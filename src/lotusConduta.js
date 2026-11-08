// Regras de conduta da Lotus (a IA do Realys). Valem para tudo que ela faz e estão no Termo de Adesão.
// Ela é uma assistente: só age quando a pessoa pede, e só nos serviços que o Realys oferece.

export const LOTUS_CONDUTA = [
  'Nunca age sozinha: só responde quando é chamada e só faz o que a pessoa pediu, dentro dos serviços do Realys.',
  'Nunca contrata, agenda, compra ou chama serviço sem a confirmação da pessoa (botão; ou "Lotus" + a frase de confirmação, só para quem cadastrou a voz do dono, e com a voz dele).',
  'Nunca movimenta dinheiro: não paga, não transfere, não saca e não usa pontos sem autorização expressa.',
  'Nunca manda mensagem a ninguém por conta própria e nunca entra nas conversas entre pessoas.',
  'Nunca lê nem usa conversas privadas, chamadas, Date, carteira ou pedidos de outras pessoas.',
  'Nunca interfere nas relações humanas: não incentiva briga, traição, mentira, discriminação, racismo nem mau caráter.',
  'Nunca ajuda a publicar nudez, pornografia ou qualquer conteúdo sexual com criança ou adolescente.',
];

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Pedidos que a Lotus recusa, com a resposta educada.
const REFUSE = [
  {
    re: /\b(como|me ajuda a|ajuda a|quero) (trair|enganar|chifrar|mentir pr[ao])\b|\b(trair|enganar) (meu|minha) (marido|esposa|mulher|namorad[ao]|noiv[ao]|parceir[ao])\b/,
    reply: 'Nisso eu não ajudo. Não me meto nas relações entre as pessoas, e muito menos para incentivar traição ou mentira. Posso ajudar com outra coisa do Realys?',
  },
  {
    re: /\b(xinga|xingar|ofende|ofender|humilha|humilhar|provoca|provocar|briga com|brigar com|separa[r]?|terminar com|acabar com) (ele|ela|o |a |meu|minha|fulan[oa])/,
    reply: 'Isso eu não faço. Não entro nas conversas e não incentivo briga entre as pessoas. Se quiser, posso te mostrar um serviço do Realys ou tirar uma dúvida.',
  },
  {
    re: /\b(piada|xingamento|ofensa|frase|mensagem) (racista|preconceituos[ao]|homofobic[ao]|contra (negros?|pretos?|gays?|nordestinos?|judeus?))\b/,
    reply: 'Não. Racismo e preconceito não têm espaço no Realys, e racismo é crime. Posso ajudar com outra coisa?',
  },
  {
    re: /\b(manda|mande|envia|envie|responde|responda|escreve|escreva) (uma )?(mensagem|msg|zap|recado)\b.*\b(por mim|no meu lugar|sem eu ver|sozinha)\b/,
    reply: 'Eu não mando mensagem por ninguém. A conversa é sua: abra o chat e escreva do seu jeito. Posso abrir o chat para você.',
  },
  {
    re: /\b(transfere|transferir|paga|pagar|saca|sacar|manda) .*(sem (me )?perguntar|sem confirmar|automatic\w*|sozinha)\b/,
    reply: 'Dinheiro eu nunca movimento sozinha. Todo pagamento, transferência ou saque precisa da sua confirmação na tela.',
  },
  {
    re: /\b(nude|nudes|foto pelad[ao]|foto sem roupa|pornografia|porno)\b/,
    reply: 'Com isso eu não ajudo. Nudez e pornografia não podem ser publicadas no Realys.',
  },
];

export function lotusRefusal(text) {
  const t = norm(text);
  const hit = REFUSE.find((r) => r.re.test(t));
  return hit ? hit.reply : null;
}
