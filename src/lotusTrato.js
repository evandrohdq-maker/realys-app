// Como a Lotus chama o titular: senhor, senhora, doutor, doutora, pelo nome ou por um apelido.
// Só vale para quem cadastrou a voz do dono (a escolha é feita no começo do cadastro e fica junto
// com a voz). Sem o cadastro, a Lotus usa o primeiro nome, como sempre.

export const TRATOS = [
  { key: 'senhor', label: 'Senhor', genero: 'm' },
  { key: 'senhora', label: 'Senhora', genero: 'f' },
  { key: 'doutor', label: 'Doutor', genero: 'm' },
  { key: 'doutora', label: 'Doutora', genero: 'f' },
  { key: 'nome', label: 'Pelo nome' },
  { key: 'apelido', label: 'Apelido' },
];

const first = (name) => {
  const f = String(name || '').trim().split(/\s+/)[0] || '';
  return /^(cliente|voce|você|usuario|usuário|prestador)$/i.test(f) ? '' : f ? f[0].toUpperCase() + f.slice(1) : '';
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Como ela chama a pessoa no meio da frase ("Bom dia, senhor!", "Boa tarde, doutora Ana!").
export function addressOf(trato, userName) {
  const nome = first(userName);
  if (!trato || !trato.key) return nome;
  if (trato.key === 'apelido') return cap(String(trato.apelido || '').trim()) || nome;
  if (trato.key === 'nome') return nome;
  if (trato.key === 'doutor' || trato.key === 'doutora') return nome ? `${trato.key} ${nome}` : trato.key;
  return trato.key; // senhor, senhora
}

// "o senhor" / "a senhora" no lugar de "você" (doutor e doutora também usam).
export function pronounOf(trato) {
  if (!trato) return null;
  if (trato.key === 'senhor' || trato.key === 'doutor') return 'o senhor';
  if (trato.key === 'senhora' || trato.key === 'doutora') return 'a senhora';
  return null;
}

// Troca o "você" das saudações pelo tratamento escolhido.
export function applyTrato(text, trato) {
  const p = pronounOf(trato);
  if (!p || !text) return text;
  const art = p.startsWith('o') ? 'o' : 'a';
  const pron = p.split(' ')[1]; // senhor | senhora
  return String(text)
    .replace(/\bO que você precisa\?/g, `Do que ${p} precisa?`)
    .replace(/\bque bom te ouvir\b/gi, (m) => (m[0] === 'Q' ? 'Que' : 'que') + ` bom ouvir ${p}`)
    .replace(/\bouvir você(?![a-zà-ú])/g, `ouvir ${p}`)
    .replace(/\bpara você(?![a-zà-ú])/g, `para ${p}`)
    .replace(/\bcom você(?![a-zà-ú])/g, art === 'o' ? `com o ${pron}` : `com a ${pron}`)
    .replace(/\bE você(?![a-zà-ú])/g, `E ${p}`)
    .replace(/\bVocê(?![a-zà-ú])/g, cap(p))
    .replace(/\bvocê(?![a-zà-ú])/g, p)
    .replace(/\bte ajudar\b/g, `ajudar ${p}`)
    .replace(/\bte (mostrar|achar)\b/g, (m, v) => `${v} ${art === 'o' ? 'ao' : 'à'} ${pron}`)
    // "E com o senhor, senhor?" → "E com o senhor?"
    .replace(/\b(o senhor|a senhora), (senhor|senhora)(?=[?!.,])/g, '$1');
}

// Frase curta da caixa da Lotus ao abrir ("Do que o senhor precisa?").
export function openLine(trato, userName) {
  const p = pronounOf(trato);
  if (p) return `Do que ${p} precisa?`;
  const n = addressOf(trato, userName);
  return n ? `${n}, do que você precisa?` : 'Do que você precisa?';
}
