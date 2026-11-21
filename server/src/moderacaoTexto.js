// Moderação de texto no servidor: a mesma regra do app (src/moderation.js), repetida aqui para quem
// tentar publicar sem passar pelo app. Mudou a regra lá? Copie para cá.
//
// Regras (estão no Termo de Adesão):
//  - Público (posts, comentários, stories, chat de live, perfis, Date): sem racismo e ódio, sem conteúdo
//    sexual explícito, sem nudez; biquíni e sunga podem. Nada envolvendo criança ou adolescente de forma sexual.
//  - Conversa privada (chat e chamada entre duas pessoas): o conteúdo é delas e fica só entre elas.
//    Mesmo assim, nunca passa conteúdo sexual com menores, racismo ou ódio (são crimes).
//  - Fotos: a checagem automática de nudez precisa de uma IA de imagem no servidor (ver PENDENCIAS.md).
//    Enquanto isso, quem publica confirma a regra e qualquer pessoa pode denunciar.

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Menção a criança ou adolescente.
const MINOR = /\b(crianca|criancas|menor de idade|menores de idade|menorzinh[ao]s?|infantil|pre ?adolescente|adolescente|novinh[ao]s? de (1[0-7]|[1-9]) anos|(1[0-7]|[1-9]) aninhos|(de|com|tem) (1[0-7]|[1-9]) anos|colegial|pedo\w*|lolit\w*)\b/;
// Conteúdo sexual.
const SEXUAL = /\b(sexo|sexual|transar|transa|nude|nudes|pelad[ao]s?|nua|nu|pornografi\w*|porno|putaria|safadeza|intim[ao]s?|excitad[ao]|gozar|tesao|foto sem roupa|sem roupa|erotic\w*)\b/;
// Racismo, discriminação e incitação ao ódio (padrões dirigidos a pessoas ou grupos).
const HATE = [
  /\b(odeio|odio a|morte aos?|exterminar|eliminar|fora) (os |as |todos os |todas as )?(negros?|pretos?|judeus?|nordestinos?|indios?|indigenas?|gays?|lesbicas?|trans|travestis?|imigrantes?|haitianos?|venezuelanos?|bolivianos?|muculmanos?|evangelicos?|catolicos?|macumbeiros?|deficientes?)\b/,
  /\b(negro|negra|preto|preta|neguinho|neguinha|macaco|macaca)s? (sujos?|sujas?|imundos?|imundas?|fedidos?|fedidas?|nojentos?|nojentas?)\b/,
  /\b(seu|sua|esse|essa|aquele|aquela) (macaco|macaca|crioulo|crioula|tiziu)\b/,
  /\b(volta|voltem|vai) (pra|para) (a )?senzala\b/,
  /\b(raca|gente) (inferior|ruim|maldita)\b/,
  /\bcabelo (ruim|de bombril|de palha de aco)\b/,
  /\b(viado|bicha|sapatao|traveco) (nojent[ao]|imund[ao]|tem que morrer|merece apanhar)\b/,
];
// Golpe e incentivo a trair/brigar não são bloqueados aqui (são conversa humana), mas a Lotus nunca incentiva.

export function moderateText(text, where = 'publico') {
  const t = norm(text);
  if (!t) return { ok: true };
  if (MINOR.test(t) && SEXUAL.test(t))
    return { ok: false, kind: 'menor', why: 'Conteúdo sexual envolvendo criança ou adolescente é crime e não é permitido no Realyz. A tentativa fica registrada.' };
  if (HATE.some((r) => r.test(t)))
    return { ok: false, kind: 'odio', why: 'Racismo, discriminação e discurso de ódio não são permitidos no Realyz (racismo e injúria racial são crimes). Reescreva a mensagem com respeito.' };
  if (where === 'publico' && /\b(nudes?|pelad[ao]s?|foto sem roupa|pornografi\w*|porno|putaria)\b/.test(t))
    return { ok: false, kind: 'nudez', why: 'Conteúdo sexual e nudez não são permitidos em publicações, comentários e lives. Biquíni e sunga pode.' };
  return { ok: true };
}

// Regra mostrada a quem publica foto ou vídeo.
export const PHOTO_RULE = 'Sem nudez e sem partes íntimas à mostra. Biquíni, maiô e sunga pode. Nada com criança em situação íntima. Publicações fora da regra são removidas e a conta pode ser suspensa.';

// ---------- Anti-desvio: o cliente não sai do Realyz pela caixa de conversa ----------
// Venda e contratação de serviço só pelo Realyz (com a Garantia e a taxa da plataforma).
// Em conversa de negócio (empresa, prestador, rádio, sala de atendimento, CRM) e em conversa com quem
// ainda não aceitou o contato, não passam: telefone, e-mail, @ de outra rede, link de WhatsApp/Telegram,
// chave Pix e combinados de pagar "por fora". Entre amigos que aceitaram o contato, a conversa é livre.
const RAW_DIGITS = (t) => String(t || '').replace(/[^\d]/g, ' ');
const DESVIO = [
  { kind: 'telefone', test: (raw) => /(\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\s?\d{4}[\s.-]?\d{4}/.test(raw) || RAW_DIGITS(raw).split(/\s+/).some((d) => d.length >= 10 && d.length <= 13) },
  { kind: 'email', test: (raw) => /[\w.+-]+@[\w-]+\.[\w.]{2,}/i.test(raw) },
  { kind: 'link', test: (raw) => /(wa\.me|whatsapp\.com|api\.whatsapp|t\.me\/|telegram\.me|chat\.whatsapp|instagram\.com|facebook\.com|m\.me\/|tiktok\.com|linktr\.ee)/i.test(raw) },
  { kind: 'rede', test: (raw, t) => /(^|\s)@[a-z0-9_.]{3,}/i.test(raw) && /\b(insta|instagram|face|tiktok|me segue|segue la|perfil)\b/.test(t) },
  { kind: 'fora', test: (raw, t) => /\b(whats|whatsapp|wpp|zap|zapzap|telegram|telegran|insta|direct|dm)\b/.test(t) && /\b(me chama|chama no|manda no|fala no|me add|me adiciona|passa teu|passa seu|me passa|meu numero|teu numero|seu numero|contato|la no|pelo|no)\b/.test(t) },
  { kind: 'pagamento', test: (raw, t) => /\b(por fora|fora do app|fora do aplicativo|fora da plataforma|sem a taxa|sem taxa do app|direto comigo|paga direto|pagar direto|deposita na minha conta|transfere pra mim|faz um pix|manda um pix|chave pix|minha chave|meu pix|pix pra mim|pix direto|dinheiro na mao|em especie)\b/.test(t) },
];
export const DESVIO_MSG = 'Para a sua segurança, contatos e pagamentos ficam dentro do Realyz. Assim vale a Garantia Realyz: se der problema, o dinheiro volta. Combine e pague pelo app (proposta, pedido ou chamado).';
export function antiDesvio(text) {
  const raw = String(text || '');
  const t = norm(raw);
  const hit = DESVIO.find((d) => d.test(raw, t));
  return hit ? { ok: false, kind: 'desvio', what: hit.kind, why: DESVIO_MSG } : { ok: true };
}
