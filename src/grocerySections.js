// Organização do Mercado (Food): seções de alimentos e demais itens, em três grupos.
//   Não perecíveis: aguentam na despensa (mercearia, enlatados, massas, café, temperos).
//   Perecíveis: estragam logo (hortifruti, carnes e peixes, frios e laticínios, padaria, congelados).
//   Demais: bebidas, limpeza e higiene, e o que não se encaixa.
// A classificação é pelo nome do produto, sem acento e sem maiúscula. A primeira seção que bater vence,
// então a ordem importa (ex.: "leite em pó" cai em Não perecíveis antes de "leite" cair em Frios).
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const GROCERY_GROUPS = [
  { key: 'nao_perecivel', label: 'Não perecíveis' },
  { key: 'perecivel', label: 'Perecíveis' },
  { key: 'demais', label: 'Demais' },
];

export const GROCERY_SECTIONS = [
  { key: 'mercearia', group: 'nao_perecivel', label: 'Mercearia e secos', short: 'Mercearia', icon: 'cube-outline', color: '#B7791F',
    words: ['arroz', 'feijao', 'farinha', 'acucar', 'oleo', 'macarrao', 'espaguete', 'sardinha', 'atum', 'extrato', 'molho de tomate', 'enlatad', 'lata', 'milho verde', 'ervilha', 'biscoito', 'bolacha', 'tempero', 'sal ', 'aveia', 'achocolatado', 'leite em po', 'fuba', 'cafe', 'granola'] },
  { key: 'hortifruti', group: 'perecivel', label: 'Hortifruti', short: 'Hortifruti', icon: 'leaf-outline', color: '#2E8B57',
    words: ['tomate', 'banana', 'maca', 'laranja', 'alface', 'cebola', 'batata', 'cenoura', 'fruta', 'legume', 'verdura', 'limao', 'abacaxi', 'mamao', 'melancia', 'uva', 'morango', 'alho', 'pepino', 'abobrinha', 'brocolis'] },
  { key: 'acougue', group: 'perecivel', label: 'Açougue e peixaria', short: 'Açougue', icon: 'restaurant-outline', color: '#B42318',
    words: ['frango', 'carne', 'bife', 'picanha', 'costela', 'linguica', 'peixe', 'salmao', 'tilapia', 'file ', 'acem', 'patinho', 'alcatra'] },
  { key: 'frios', group: 'perecivel', label: 'Frios e laticínios', short: 'Frios', icon: 'snow-outline', color: '#2F74D0',
    words: ['queijo', 'presunto', 'mortadela', 'salame', 'peito de peru', 'iogurte', 'manteiga', 'requeijao', 'leite', 'creme de leite', 'nata', 'ovo', 'margarina'] },
  { key: 'padaria', group: 'perecivel', label: 'Padaria', short: 'Padaria', icon: 'cafe-outline', color: '#D9480F',
    words: ['pao', 'bolo', 'torrada', 'croissant', 'bisnaga'] },
  { key: 'congelados', group: 'perecivel', label: 'Congelados', short: 'Congelados', icon: 'ice-cream-outline', color: '#0E7490',
    words: ['congelad', 'sorvete', 'lasanha', 'nugget', 'polpa', 'acai'] },
  { key: 'limpeza', group: 'demais', label: 'Limpeza e higiene', short: 'Limpeza', icon: 'sparkles-outline', color: '#6B5CE7',
    words: ['detergente', 'sabao', 'amaciante', 'desinfetante', 'agua sanitaria', 'papel higienico', 'shampoo', 'sabonete', 'pasta de dente', 'desodorante', 'esponja', 'limpeza'] },
  { key: 'bebidas', group: 'demais', label: 'Bebidas', short: 'Bebidas', icon: 'wine-outline', color: '#7A5806',
    words: ['refrigerante', 'suco', 'agua', 'cerveja', 'vinho', 'cha', 'energetico', 'isotonico'] },
  { key: 'outros', group: 'demais', label: 'Outros', short: 'Outros', icon: 'apps-outline', color: '#64748B', words: [] },
];

// Seção de um produto, pelo nome.
export function sectionOf(name) {
  const n = norm(name);
  const hit = GROCERY_SECTIONS.find((s) => s.words.some((w) => n.includes(norm(w))));
  return hit ? hit.key : 'outros';
}
