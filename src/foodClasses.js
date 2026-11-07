// Classes e subclasses da comida (aba Food) e do Mercado. Cada produto que a loja cadastra cai numa
// subclasse sozinho, pelo nome e, se preciso, pela descrição. A categoria da loja decide a ordem de
// prioridade (ex.: numa padaria "pão" vai para Padaria; num mercado "pão de forma" vai para Mercado).
// O mesmo cálculo define se o produto é de entrega, de retirada no local ou dos dois.
// Arquivo sem dependências de React Native, para poder ser testado no computador.
import { GROCERY_SECTIONS } from './grocerySections';

export const MODOS = [
  { key: 'entrega', label: 'Entrega', icon: 'bicycle-outline' },
  { key: 'retirada', label: 'Retirada no local', icon: 'bag-handle-outline' },
];
export const modoLabel = (k) => (MODOS.find((m) => m.key === k) || {}).label || k;

// Palavras no formato normalizado (sem acento, sem maiúscula, hífen vira espaço).
// requer: lista de grupos; cada grupo precisa ter pelo menos uma palavra no texto.
// exceto: se alguma dessas palavras aparecer, a subclasse não serve.
// modos: quando a subclasse só atende de um jeito (ex.: rodízio é consumo no local).
// maioridade: bebida alcoólica; entrega só para quem comprova 18 anos.
const C = (key, label, icon, color, subs) => ({ key, label, icon, color, subs });
const S = (key, label, words, extra = {}) => ({ key, label, words, ...extra });

export const FOOD_CLASSES = [
  C('pizzaria', 'Pizzaria', 'pizza-outline', '#D9480F', [
    S('pizza_doce', 'Pizza doce', ['chocolate', 'nutella', 'romeu e julieta', 'goiabada', 'banana', 'morango', 'doce', 'sorvete'], { requer: [['pizza']] }),
    S('calzone_esfiha', 'Calzone e esfiha', ['calzone', 'esfiha', 'esfirra']),
    S('pizza_salgada', 'Pizza salgada', ['pizza', 'margherita', 'marguerita', 'calabresa', 'mucarela', 'portuguesa', 'quatro queijos', 'frango com catupiry', 'napolitana', 'marinara']),
  ]),
  C('lanches', 'Lanches', 'fast-food-outline', '#B7791F', [
    S('cachorro_quente', 'Cachorro-quente', ['cachorro quente', 'hot dog', 'hotdog', 'dogao']),
    S('hamburguer', 'Hambúrguer', ['hamburguer', 'hamburger', 'burguer', 'burger', 'cheeseburger', 'smash', 'x burguer', 'x salada', 'x tudo', 'x bacon', 'x egg']),
    S('sanduiche', 'Sanduíche e wrap', ['sanduiche', 'misto quente', 'wrap', 'baguete', 'ciabatta']),
  ]),
  C('japonesa', 'Comida japonesa', 'fish-outline', '#B42318', [
    S('rodizio_japones', 'Rodízio japonês', ['rodizio'], { requer: [['japones', 'japonesa', 'sushi', 'sashimi', 'temaki', 'yakisoba', 'hot roll', 'hossomaki']], modos: ['retirada'] }),
    S('sushi', 'Sushi, sashimi e temaki', ['sushi', 'sashimi', 'temaki', 'hossomaki', 'uramaki', 'niguiri', 'nigiri', 'hot roll', 'california', 'philadelphia']),
    S('japonesa_quente', 'Pratos quentes japoneses', ['yakisoba', 'teriyaki', 'gyoza', 'tempura', 'katsu', 'harumaki', 'lamen', 'ramen', 'udon', 'yakitori']),
  ]),
  C('pratos', 'Pratos e refeições', 'restaurant-outline', '#2E8B57', [
    S('buffet', 'Buffet e rodízio', ['buffet', 'rodizio', 'self service', 'a quilo', 'por kg', 'por quilo', 'churrascaria'], { modos: ['retirada'] }),
    S('marmita', 'Marmitas e executivo', ['marmita', 'marmitex', 'executivo', 'prato feito', 'prato do dia', 'quentinha']),
    S('carnes', 'Carnes e grelhados', ['picanha', 'costela', 'file mignon', 'filé', 'bife', 'carne de sol', 'grelhado', 'espetinho', 'churrasco', 'costelinha', 'linguica', 'espeto']),
    S('massas', 'Massas', ['macarrao', 'lasanha', 'espaguete', 'nhoque', 'fettuccine', 'penne', 'talharim', 'ravioli', 'carbonara', 'bolonhesa', 'risoto', 'capeletti']),
    S('saudavel', 'Saladas e saudáveis', ['salada', 'bowl', 'poke', 'fit', 'low carb', 'vegano', 'vegetariano']),
  ]),
  C('padaria', 'Padaria', 'cafe-outline', '#D9822B', [
    S('salgados', 'Pães e salgados', ['pao', 'paes', 'pao de queijo', 'coxinha', 'pastel', 'empada', 'bolinho de queijo', 'enroladinho', 'salgado', 'croissant', 'bisnaga', 'pao frances', 'rosca', 'tapioca']),
    S('cafe_manha', 'Café da manhã', ['cafe da manha', 'combo da manha', 'colonial', 'omelete']),
  ]),
  C('doces', 'Doces e cafés', 'ice-cream-outline', '#8E4585', [
    S('bolos', 'Bolos e tortas', ['bolo', 'torta', 'cheesecake', 'brownie', 'cupcake', 'pave', 'naked cake', 'fatia']),
    S('sorvetes', 'Sorvetes e açaí', ['sorvete', 'picole', 'acai', 'milk shake', 'milkshake', 'sundae', 'gelato', 'casquinha']),
    S('cafes', 'Cafés', ['cafe', 'cafes', 'cappuccino', 'capuccino', 'expresso', 'espresso', 'latte', 'mocha', 'macchiato', 'americano', 'chocolate quente'], { exceto: ['em po', 'moido', 'graos', 'torrado'] }),
    S('sobremesas', 'Doces e sobremesas', ['doce', 'doces', 'sobremesa', 'pudim', 'mousse', 'churros', 'brigadeiro', 'beijinho', 'petit gateau', 'quindim', 'cocada']),
  ]),
  C('bar', 'Bar e happy hour', 'beer-outline', '#7A5806', [
    S('chope', 'Chope e cerveja', ['chope', 'chopp', 'cerveja', 'cervejas', 'long neck', 'litrao', 'ipa', 'pilsen', 'lager'], { maioridade: true }),
    S('drinks', 'Drinks e destilados', ['drink', 'drinks', 'caipirinha', 'caipirosca', 'gin', 'vodka', 'whisky', 'whiskey', 'uisque', 'rum', 'tequila', 'negroni', 'mojito', 'coquetel', 'licor', 'cachaca'], { maioridade: true }),
    S('vinhos', 'Vinhos e espumantes', ['vinho', 'vinhos', 'espumante', 'champagne', 'prosecco'], { maioridade: true }),
    S('petiscos', 'Porções e petiscos', ['porcao', 'porcoes', 'petisco', 'petiscos', 'bolinho de bacalhau', 'batata frita', 'torresmo', 'mandioca frita', 'dadinho', 'bruschetta']),
  ]),
  C('bebidas', 'Bebidas', 'wine-outline', '#0E7490', [
    S('refrigerantes', 'Refrigerantes e sucos', ['refrigerante', 'refri', 'coca', 'guarana', 'suco', 'sucos', 'laranjada', 'limonada', 'refresco']),
    S('aguas', 'Águas e energéticos', ['agua', 'aguas', 'agua com gas', 'agua de coco', 'energetico', 'isotonico']),
    S('chas', 'Chás e mate', ['cha', 'chas', 'cha gelado', 'mate']),
  ]),
  C('mercado', 'Mercado', 'cart-outline', '#64748B', GROCERY_SECTIONS.filter((s) => s.key !== 'outros').map((s) => S(s.key, s.label, s.words.map((w) => w.trim()).filter(Boolean)))),
];

// Ordem de prioridade por categoria da loja (data.js: Alimentação, Bares, Doces e cafés, Mercado).
const TODAS = FOOD_CLASSES.map((c) => c.key);
const primeiro = (...ks) => [...ks, ...TODAS.filter((k) => !ks.includes(k))];
export const PRIORIDADE = {
  Alimentação: primeiro('japonesa', 'pizzaria', 'lanches', 'pratos', 'padaria', 'doces', 'bar', 'bebidas'),
  Bares: primeiro('bar', 'bebidas', 'petiscos'),
  'Doces e cafés': primeiro('doces', 'padaria', 'bebidas', 'bar'),
  Mercado: primeiro('mercado', 'bebidas', 'padaria', 'doces'),
};

export const classeByKey = (k) => FOOD_CLASSES.find((c) => c.key === k) || null;
export const subclasseByKey = (classeKey, subKey) => {
  const c = classeByKey(classeKey);
  return c ? c.subs.find((s) => s.key === subKey) || null : null;
};

const norm = (s) =>
  ' ' +
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() +
  ' ';
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cache = new Map();
// Palavra inteira, com plural simples ("pizzas", "hambúrgueres"): "cha" não casa com "chamado".
const reOf = (p) => {
  const k = norm(p).trim();
  if (!cache.has(k)) cache.set(k, new RegExp(` ${escRe(k)}(s|es)? `));
  return cache.get(k);
};
const hit = (txt, words) => words.some((w) => reOf(w).test(txt));

// Uma subclasse casa com o texto?
function casa(sub, txt) {
  if (sub.exceto && hit(txt, sub.exceto)) return false;
  if (sub.requer && !sub.requer.every((g) => hit(txt, g))) return false;
  return hit(txt, sub.words);
}

// Modos de atendimento pelo texto: "só entrega", "somente retirada", "consumo no local".
function modosDo(sub, txt) {
  if (/ (so|somente) entrega /.test(txt) || / (so|somente) delivery /.test(txt)) return ['entrega'];
  if (/ (so|somente) retirada /.test(txt) || / (so|somente) no local /.test(txt)) return ['retirada'];
  if (/ (no local|na mesa|consumo no local|degustacao) /.test(txt)) return ['retirada'];
  const base = sub.modos || ['entrega', 'retirada'];
  return MODOS.map((m) => m.key).filter((k) => base.includes(k));
}

// Classifica um produto. Devolve { classe, subclasse, label, modos, maioridade, how } ou null
// (aí a loja escolhe). Procura primeiro no nome; só depois na descrição.
export function classifyFood(name, description = '', categoria = 'Alimentação') {
  const ordem = PRIORIDADE[categoria] || PRIORIDADE.Alimentação;
  const passes = [
    { txt: norm(name), how: 'nome' },
    { txt: norm(description), how: 'descrição' },
  ];
  for (const { txt, how } of passes) {
    if (!txt.trim()) continue;
    for (const ck of ordem) {
      const c = classeByKey(ck);
      const sub = c && c.subs.find((s) => casa(s, txt));
      if (sub) {
        const full = norm(`${name} ${description}`);
        return {
          classe: c.key,
          subclasse: sub.key,
          label: `${c.label} › ${sub.label}`,
          modos: modosDo(sub, full),
          maioridade: !!sub.maioridade,
          how,
        };
      }
    }
  }
  return null;
}

// Rótulo curto para mostrar no cardápio e no cadastro.
export const rotuloClasse = (classe, subclasse) => {
  const c = classeByKey(classe);
  const s = subclasseByKey(classe, subclasse);
  return c && s ? `${c.label} › ${s.label}` : null;
};
