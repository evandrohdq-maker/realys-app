// Opções e ficha do produto (cadastro da loja e tela do produto para o cliente).
//  - options: o que o CLIENTE escolhe antes de pôr no carrinho. [{ name: 'Cor', values: [{ label, hex?, stock? }] }]
//  - specs: ficha técnica que qualifica o produto. [{ k: 'Marca', v: 'Sil' }]
//  - video: vídeo curto (até 5 segundos) mostrando o produto.
// O Realyz sugere as opções e a ficha pelo tipo do produto; a loja aceita, muda ou cria as suas.

export const MAX_PRODUCT_PHOTOS = 5;
export const MAX_VIDEO_SEC = 5;

// Cores com bolinha de cor (o cliente vê a cor de verdade).
export const COLORS = [
  { label: 'Preto', hex: '#1B1B1F' }, { label: 'Branco', hex: '#FFFFFF' }, { label: 'Cinza', hex: '#9AA0A6' }, { label: 'Prata', hex: '#C9CDD2' },
  { label: 'Vermelho', hex: '#E5484D' }, { label: 'Azul', hex: '#2F6FE0' }, { label: 'Azul-marinho', hex: '#1F2F5C' }, { label: 'Verde', hex: '#2FB463' },
  { label: 'Amarelo', hex: '#F5C331' }, { label: 'Laranja', hex: '#F07B22' }, { label: 'Rosa', hex: '#F08CB4' }, { label: 'Roxo', hex: '#7C5CBF' },
  { label: 'Marrom', hex: '#7A4E2D' }, { label: 'Bege', hex: '#E6D5B8' }, { label: 'Dourado', hex: '#C9A227' }, { label: 'Transparente', hex: '#EAF4FB' },
];
export const colorHex = (label) => (COLORS.find((c) => c.label.toLowerCase() === String(label).toLowerCase()) || {}).hex;

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Sugestões por tipo de produto: opções que o cliente escolhe e campos da ficha.
const RULES = [
  { words: ['fio', 'cabo', 'cabinho', 'extensao', 'mangueira', 'corda', 'fita', 'tela', 'arame', 'corrente'], options: [{ name: 'Metragem', values: ['1 m', '5 m', '10 m', '25 m', '50 m', '100 m'] }, { name: 'Cor', colors: true }], specs: ['Bitola (mm²)', 'Material', 'Voltagem máxima', 'Marca', 'Certificação Inmetro'] },
  { words: ['camisa', 'camiseta', 'blusa', 'calca', 'bermuda', 'vestido', 'saia', 'jaqueta', 'moletom', 'short', 'roupa', 'uniforme', 'pijama', 'body'], options: [{ name: 'Tamanho', values: ['PP', 'P', 'M', 'G', 'GG', 'XG'] }, { name: 'Cor', colors: true }], specs: ['Tecido', 'Composição', 'Modelagem', 'Marca'] },
  { words: ['tenis', 'sapato', 'sandalia', 'chinelo', 'bota', 'sapatilha', 'chuteira', 'calcado'], options: [{ name: 'Número', values: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'] }, { name: 'Cor', colors: true }], specs: ['Material', 'Solado', 'Marca'] },
  { words: ['geladeira', 'micro-ondas', 'microondas', 'liquidificador', 'ventilador', 'ar-condicionado', 'ar condicionado', 'chuveiro', 'furadeira', 'parafusadeira', 'ferro', 'secador', 'batedeira', 'air fryer', 'airfryer', 'aspirador', 'lavadora', 'fogao', 'eletrodomestico'], options: [{ name: 'Voltagem', values: ['110 V', '220 V', 'Bivolt'] }, { name: 'Cor', colors: true }], specs: ['Potência (W)', 'Garantia', 'Marca', 'Modelo', 'Selo Procel'] },
  { words: ['celular', 'smartphone', 'iphone', 'galaxy', 'tablet', 'notebook', 'pendrive', 'cartao de memoria', 'ssd', 'hd externo'], options: [{ name: 'Armazenamento', values: ['64 GB', '128 GB', '256 GB', '512 GB'] }, { name: 'Cor', colors: true }], specs: ['Marca', 'Modelo', 'Memória RAM', 'Garantia', 'Nota fiscal'] },
  { words: ['tinta', 'verniz', 'esmalte sintetico', 'massa corrida', 'textura'], options: [{ name: 'Embalagem', values: ['900 ml', '3,6 L', '18 L'] }, { name: 'Cor', colors: true }], specs: ['Acabamento', 'Rendimento (m²)', 'Marca'] },
  { words: ['cano', 'tubo', 'piso', 'porcelanato', 'azulejo', 'madeira', 'tabua', 'telha', 'cimento', 'areia', 'brita', 'tijolo'], options: [{ name: 'Medida', values: [] }], specs: ['Dimensões', 'Material', 'Marca', 'Quantidade por caixa'] },
  { words: ['perfume', 'colonia', 'shampoo', 'creme', 'hidratante', 'condicionador', 'oleo', 'sabonete'], options: [{ name: 'Tamanho', values: ['50 ml', '100 ml', '200 ml', '500 ml', '1 L'] }], specs: ['Fragrância', 'Marca', 'Validade'] },
  { words: ['anel', 'colar', 'pulseira', 'brinco', 'relogio', 'alianca'], options: [{ name: 'Tamanho', values: [] }, { name: 'Material', values: ['Ouro', 'Prata', 'Aço', 'Folheado'] }], specs: ['Material', 'Peso (g)', 'Garantia', 'Certificado'] },
  { words: ['racao', 'petisco'], options: [{ name: 'Peso', values: ['1 kg', '3 kg', '10 kg', '15 kg'] }], specs: ['Espécie', 'Idade', 'Sabor', 'Marca'] },
  { words: ['movel', 'sofa', 'cadeira', 'mesa', 'armario', 'guarda-roupa', 'cama', 'colchao', 'estante', 'rack'], options: [{ name: 'Cor', colors: true }], specs: ['Dimensões (A x L x P)', 'Material', 'Peso suportado', 'Precisa montar?'] },
];
const DEFAULT = { options: [{ name: 'Cor', colors: true }], specs: ['Marca', 'Modelo', 'Garantia'] };

export function suggestFor(name, desc) {
  const t = ` ${fold(name)} ${fold(desc)} `;
  return RULES.find((r) => r.words.some((w) => t.includes(` ${w}`) || t.includes(`${w} `))) || DEFAULT;
}

// Grupo de opções pronto a partir da sugestão.
export const groupFromSuggestion = (g) => ({ name: g.name, colors: !!g.colors, values: g.colors ? [] : (g.values || []).map((label) => ({ label, on: false })) });

// Opções que valem (com pelo menos um valor marcado).
export function cleanOptions(groups) {
  return (groups || [])
    .map((g) => ({ name: g.name.trim(), colors: !!g.colors, values: g.values.filter((v) => v.on !== false && String(v.label).trim()).map((v) => ({ label: String(v.label).trim(), ...(v.hex ? { hex: v.hex } : {}), ...(v.stock != null && v.stock !== '' ? { stock: Math.max(0, parseInt(v.stock, 10) || 0) } : {}) })) }))
    .filter((g) => g.name && g.values.length);
}

// Quanto tem: se a loja informou estoque por opção (ex.: por cor), usa a soma; senão, o estoque geral.
export function stockOf(p, picked = {}) {
  if (!p) return 0;
  const g = (p.options || []).find((x) => x.values.some((v) => v.stock != null));
  if (g) {
    const choice = picked[g.name];
    if (choice) return (g.values.find((v) => v.label === choice) || {}).stock || 0;
    return g.values.reduce((s, v) => s + (v.stock || 0), 0);
  }
  return p.stock == null ? 99 : p.stock;
}
export const optionsLabel = (opts) => (opts ? Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join(' · ') : '');
