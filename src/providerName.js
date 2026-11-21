// Nome do prestador de serviço para os clientes: só o primeiro nome e a inicial do sobrenome
// ("Carlos Lima" → "Carlos L."). Assim o cliente não acha o prestador na rede social pelo nome
// completo para contratar por fora: serviço só se contrata pelo Realyz.
// O nome completo fica guardado em `fullName` (cadastro, documentos, painel do próprio prestador).
// A Lotus fala só o primeiro nome ("Carlos"): ver src/voice.js › forSpeech.

// Títulos que vêm antes do nome e continuam aparecendo.
const TITLES = /^((?:(?:Dr|Dra|Sr|Sra|Prof|Profa|Eng|Agr|Téc)\.\s*|Técnico Agrícola\s+|Técnica Agrícola\s+|Nutri\s+|Tio\s+|Tia\s+|Dona\s+|Seu\s+)*)/i;
// Partes do sobrenome que não contam como inicial: "Maria da Silva" → "Maria S.".
const LINKS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

export function publicName(name) {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  // "Dr. Henrique Alves · CRMV": encurta só o nome, o registro continua.
  const [main, ...extra] = raw.split(' · ');
  const title = (main.match(TITLES) || [''])[0];
  const words = main.slice(title.length).trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return raw;
  const last = [...words.slice(1)].reverse().find((w) => !LINKS.has(w.toLowerCase())) || words[words.length - 1];
  const short = `${title}${words[0]} ${last.charAt(0).toUpperCase()}.`;
  return [short, ...extra].join(' · ');
}

// Prestador com nome de marca ou apelido profissional (Buffet Sabor & Festa, Bia Unhas...):
// não é nome de pessoa, então aparece como está. Marque `brand: true` no cadastro.
export function forClients(p) {
  if (!p || !p.name) return p;
  const fullName = p.fullName || p.name;
  return { ...p, fullName, name: p.brand ? fullName : publicName(fullName) };
}
