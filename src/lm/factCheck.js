// IA verificadora do Realys (dentro do celular, sem servidor): confere posts e depoimentos antes de
// entrarem na plataforma e no conhecimento da Lotus.
//
//   falso     -> não é publicado, sai da plataforma e do conhecimento da Lotus. A afirmação fica
//                registrada como "informação falsa" (state.falseKnowledge), para a Lotus avisar
//                quem perguntar sobre ela.
//   suspeito  -> é publicado, mas a Lotus NÃO aprende com ele e vai para a Moderação. Se o
//                administrador remover, vira informação falsa; se arquivar, volta a valer.
//   ok        -> publicado normalmente; a Lotus pode aprender com ele.
//
// Na versão final isso vira uma IA no servidor que também confere em fontes de notícia confiáveis.
// Aqui são sinais típicos de notícia falsa e golpe, cada um com um peso.

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const SIGNS = [
  { re: /\b(compartilh\w*|repass\w*|espalh\w*) (antes|ja|urgente|para todos|com todos|pra todos)|antes que (apaguem|tirem|derrubem)|(divulguem|compartilhem) ao maximo/, w: 40, why: 'pede para espalhar com urgência' },
  { re: /\b(a midia|a imprensa|a tv|a globo) (nao|esconde|nao mostra|nao fala)|ninguem (esta|ta) falando|o que (eles|o governo) nao (quer|querem) que voce saiba/, w: 35, why: 'diz que "a mídia esconde"' },
  { re: /\b(cura|curou|curar) (o |a )?(cancer|diabetes|covid|aids|hiv|tudo)|cura milagros\w*|remedio milagros\w*|milagre|medicos (odeiam|escondem)/, w: 70, why: 'promete cura milagrosa' },
  { re: /\b100% (comprovado|garantido|verdade)|cientistas comprovaram que|comprovado pela ciencia/, w: 25, why: 'garante "100% comprovado" sem fonte' },
  { re: /\bvacinas? (tem|tem um|com|causa\w*|implanta\w*) (chip|microchip|autismo|morte)|5g (causa|espalha|transmite)|terra (e |eh )?plana/, w: 70, why: 'repete boato já desmentido' },
  { re: /\b(governo|banco central|bancos?) (vai|vao|ira) (confiscar|bloquear|congelar|tomar)|confisco d[ao]s? (poupanca|pix|contas?)|pix (vai ser|sera) (taxado|cobrado|extinto|cancelado)/, w: 55, why: 'anuncia confisco ou taxa sem fonte oficial' },
  { re: /\b(gasolina|diesel|botijao|gas|luz|energia) (vai|vao) (a|para|pra|subir para) r?\$? ?\d+.{0,20}(amanha|segunda|semana que vem|hoje)/, w: 45, why: 'anuncia aumento repentino sem fonte' },
  { re: /\b(ganhe|ganha|receba|recebe) r?\$ ?\d+.{0,30}(agora|hoje|so clicar|clique|link)|clique no link|dinheiro facil|renda extra de r?\$ ?\d+ por dia|pix de volta|devolvem em dobro/, w: 60, why: 'parece golpe (dinheiro fácil ou link)' },
  { re: /\burgente\b|\batencao\b.{0,10}!|alerta geral|ultima hora/, w: 15, why: 'tom alarmista' },
];

// Confere um texto. Devolve { verdict, score, reasons }.
export function checkText(text) {
  const raw = String(text || '');
  const t = norm(raw);
  let score = 0;
  const reasons = [];
  SIGNS.forEach((s) => {
    if (s.re.test(t)) {
      score += s.w;
      reasons.push(s.why);
    }
  });
  const letters = raw.replace(/[^A-Za-zÀ-ú]/g, '');
  const caps = letters.replace(/[^A-ZÀ-Ý]/g, '').length;
  if (letters.length > 25 && caps / letters.length > 0.6) {
    score += 15;
    reasons.push('escrito todo em maiúsculas');
  }
  if (/!{3,}/.test(raw)) {
    score += 10;
    reasons.push('excesso de exclamações');
  }
  score = Math.min(99, score);
  const verdict = score >= 70 ? 'falso' : score >= 40 ? 'suspeito' : 'ok';
  return { verdict, score, reasons };
}

// Afirmação principal do texto (a primeira frase), para registrar como informação falsa.
// Tira "URGENTE!!!", "Atenção:" e pedidos de compartilhar; fica com a primeira frase que diz algo.
export const claimOf = (text) => {
  const s = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^(\s*(urgente|aten[cç][aã]o|alerta( geral)?|[uú]ltima hora|gente|pessoal)\s*[!:.,-]*\s*)+/i, '')
    .replace(/,?\s*(compartilh|repass|espalh|divulgu)\w*.*$/i, '')
    .trim();
  const parts = s.split(/(?<=[.!?])\s+/).map((x) => x.replace(/[!?.\s]+$/, '').trim());
  const first = parts.find((x) => x.split(' ').length >= 4) || parts[0] || s;
  const out = first.charAt(0).toUpperCase() + first.slice(1);
  return out.length > 140 ? out.slice(0, 137) + '…' : out;
};

// Informação falsa já registrada que bate com o que a pessoa perguntou.
const STOP = new Set('a o e de da do das dos em no na nos nas um uma que pra para por com sem se ja mais muito foi tem ate isso esse essa verdade sera vi ouvi disseram falaram lotus voce sabe confirma real fato noticia'.split(' '));
const keyWords = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));

export function matchFalse(list, text) {
  const q = new Set(keyWords(text));
  if (q.size < 2) return null;
  let best = null;
  (list || []).forEach((f) => {
    const k = keyWords(f.claim);
    if (!k.length) return;
    const hit = k.filter((w) => q.has(w)).length;
    const ratio = hit / Math.min(k.length, q.size);
    if (hit >= 2 && ratio >= 0.5 && (!best || ratio > best.ratio)) best = { f, ratio };
  });
  return best ? best.f : null;
}

export const ASK_TRUTH = /\b(e verdade|verdade que|e fato|e real|confirma|sera que|vi que|ouvi que|disseram que|falaram que|to vendo que|tao falando que|estao falando que|recebi (que|uma mensagem)|e fake|e falso)\b/;
