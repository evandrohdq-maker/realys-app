// Modelo de linguagem da Lotus, 100% dentro do celular (sem servidor e sem internet).
// Cada palavra em português tem um "vetor de sentido" (vectors.js): palavras de sentido parecido
// ficam perto ("dançar" perto de "balada", "fome" perto de "comer", "dormir" perto de "hospedar").
// A frase vira a média dos vetores das palavras, e a Lotus compara com frases de exemplo de cada
// intenção do app. Assim "tô a fim de dançar hoje" cai em festas, mesmo sem a palavra "festa".
import { DIM, SCALE, WORDS, WORD_ROWS, VECTORS } from './vectors';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decode(b64) {
  const lut = new Uint8Array(128);
  for (let i = 0; i < 64; i++) lut[B64.charCodeAt(i)] = i;
  let len = b64.length;
  while (b64[len - 1] === '=') len--;
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lut[b64.charCodeAt(i)], b = lut[b64.charCodeAt(i + 1)];
    const c = i + 2 < len ? lut[b64.charCodeAt(i + 2)] : 0, d = i + 3 < len ? lut[b64.charCodeAt(i + 3)] : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

let M = null; // { exact: Map, plain: Map, vecs: Int8Array }
// Carrega o modelo uma vez (leva uma fração de segundo; o app chama isso logo depois de abrir).
export function loadModel() {
  if (M) return M;
  const rowsBytes = decode(WORD_ROWS);
  const rows = new Uint16Array(rowsBytes.buffer, rowsBytes.byteOffset, rowsBytes.length / 2);
  const vb = decode(VECTORS);
  const vecs = new Int8Array(vb.buffer, vb.byteOffset, vb.length);
  const exact = new Map();
  const plain = new Map();
  const list = WORDS.split('\n');
  for (let i = 0; i < list.length; i++) {
    exact.set(list[i], rows[i]);
    const p = strip(list[i]);
    if (!plain.has(p)) plain.set(p, rows[i]);
  }
  M = { exact, plain, vecs };
  return M;
}

// Palavras que não carregam sentido ("eu", "de", "um", "pra"...).
const STOP = new Set(
  ('a o e é as os um uma uns umas de do da dos das no na nos nas em pra pro pras pros para por com sem que se me mim eu tu ' +
    'voce você vc ele ela nos nós eles elas meu minha meus minhas seu sua isso esse essa este esta aquele aquela ai aí la lá ' +
    'aqui ja já tá ta to tô tou esta está estou estava ser sou era foi vai vou ir ter tem tenho tinha ha há mais muito muita ' +
    'bem bom boa so só também tambem ou mas como quando onde qual quais quem algum alguma algo coisa coisas tipo ne né ' +
    'lotus realys oi olá ola ei hein entao então agora hoje gente quero queria gostaria preciso precisava pode poderia ' +
    'favor obrigado obrigada fazer faz fiz dar dá dia bom boa tarde tudo beleza valeu ok certo sim não nao fim afim ver vê comprar compra quer conta conte contar sobre umas uns').split(' ')
);

function wordRow(w) {
  const m = loadModel();
  let r = m.exact.get(w);
  if (r === undefined) r = m.plain.get(strip(w));
  return r;
}

const tokensOf = (text) =>
  String(text || '').toLowerCase().split(/[^a-zà-öø-ÿç]+/).filter((w) => w.length > 1 && !STOP.has(w) && !STOP.has(strip(w)));

// Vetores das palavras com sentido da frase (um por palavra reconhecida).
export function wordVectors(text) {
  const m = loadModel();
  const out = [];
  for (const w of tokensOf(text)) {
    const r = wordRow(w);
    if (r === undefined) continue;
    const v = new Float32Array(DIM);
    const base = r * DIM;
    let n = 0;
    for (let d = 0; d < DIM; d++) {
      v[d] = m.vecs[base + d] * SCALE[d];
      n += v[d] * v[d];
    }
    n = Math.sqrt(n) || 1;
    for (let d = 0; d < DIM; d++) v[d] /= n;
    out.push(v);
  }
  return out;
}

// Vetor de sentido da frase (média das palavras com sentido). null se não reconheceu nada.
export function sentenceVector(text) {
  const m = loadModel();
  const toks = tokensOf(text);
  const v = new Float32Array(DIM);
  let n = 0;
  for (const w of toks) {
    const r = wordRow(w);
    if (r === undefined) continue;
    const base = r * DIM;
    for (let d = 0; d < DIM; d++) v[d] += m.vecs[base + d] * SCALE[d];
    n++;
  }
  if (!n) return null;
  let norm = 0;
  for (let d = 0; d < DIM; d++) norm += v[d] * v[d];
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < DIM; d++) v[d] /= norm;
  return v;
}

const cos = (a, b) => {
  let s = 0;
  for (let d = 0; d < DIM; d++) s += a[d] * b[d];
  return s;
};

// Intenções do app: frases de exemplo (como as pessoas falam) → comando que a Lotus já sabe fazer.
export const INTENTS = [
  { key: 'festa', label: 'festas perto de você', command: 'festa mais próxima', examples: ['rolê hoje', 'bora curtir', 'forró', 'sertanejo', 'boate', 'quero dançar hoje', 'to a fim de sair para curtir', 'onde tem balada', 'quero uma festa', 'quero beber e dançar com os amigos', 'show ao vivo hoje à noite', 'quero sair de noite', 'agito na noite', 'música alta e dança', 'pagode com samba hoje'] },
  { key: 'hotel', label: 'hotéis e pousadas', command: 'preciso de um hotel', examples: ['descansar num hotel', 'cansado da viagem', 'hotel perto da praia', 'quarto para dormir', 'preciso de um lugar para dormir', 'onde posso me hospedar', 'quero passar a noite fora', 'reservar um quarto', 'hospedagem para viagem', 'pousada para o fim de semana', 'onde ficar na viagem', 'estou viajando e preciso de hotel'] },
  { key: 'comida', label: 'o Food', command: 'abre o food', examples: ['pizza', 'hambúrguer', 'comida japonesa', 'sushi', 'marmita', 'churrasco', 'estou com fome', 'quero comer alguma coisa', 'pedir comida', 'almoço', 'jantar gostoso', 'lanche', 'restaurante bom', 'comida caseira', 'pedir um delivery', 'to morrendo de fome'] },
  { key: 'bar', label: 'bares e happy hour', command: 'abre os bares', examples: ['estou com sede', 'beber algo gelado', 'quero tomar uma cerveja', 'beber um chope', 'happy hour com os amigos', 'tomar um drink', 'barzinho para relaxar', 'petiscos e cerveja gelada'] },
  { key: 'saude', label: 'hospitais e médicos', command: 'preciso de um médico', examples: ['dentista', 'ir ao médico', 'consulta com especialista', 'estou passando mal', 'estou doente', 'dor de cabeça forte', 'preciso de atendimento médico', 'marcar uma consulta', 'meu filho está com febre', 'estou com dor', 'preciso de um remédio', 'doutor'] },
  { key: 'transporte', label: 'transporte público', command: 'abre o transporte', examples: ['qual ônibus eu pego', 'como chego no centro de ônibus', 'metrô mais perto', 'passagem de ônibus para outra cidade', 'viajar de ônibus', 'horário do ônibus', 'rodoviária'] },
  { key: 'corrida', label: 'um carro', command: 'tem motorista perto de mim', examples: ['ir para o aeroporto', 'me levar para casa', 'voltar para casa de carro', 'preciso de uma carona', 'chamar um carro', 'quero ir para casa de carro', 'motorista para me levar', 'táxi', 'uber', 'corrida até o aeroporto'] },
  { key: 'entrega', label: 'um motoboy', command: 'tem motoboy perto de mim', examples: ['entregar um pacote', 'mandar uma encomenda', 'buscar uma coisa para mim', 'motoboy para entrega', 'levar um documento'] },
  { key: 'reparo', label: 'prestadores de serviço', command: 'abre os serviços', examples: ['conserto de geladeira', 'eletricista', 'encanador', 'quebrou o chuveiro', 'consertar a pia', 'vazamento no banheiro', 'arrumar a tomada', 'a luz acabou em casa', 'pintar a parede', 'limpar a casa', 'meu carro quebrou', 'conserto em casa', 'preciso de um profissional'] },
  { key: 'emprego', label: 'vagas de emprego', command: 'abre os empregos', examples: ['vaga de garçom', 'vaga de vendedor', 'contratação', 'estou desempregado', 'quero trabalhar', 'procurando trabalho', 'preciso de um emprego', 'mandar currículo', 'vaga de trabalho', 'quero um serviço fixo', 'ganhar dinheiro trabalhando'] },
  { key: 'date', label: 'o Date', command: 'abre o date', examples: ['conhecer gente nova', 'fazer novas amizades', 'quero alguém para namorar', 'me sinto sozinho e carente', 'romance', 'quero namorar', 'conhecer alguém', 'estou solteiro', 'arrumar uma namorada', 'encontro romântico', 'paquerar', 'achar um amor'] },
  { key: 'roupa', label: 'vestuário', command: 'abre o vestuário', examples: ['comprar uma roupa nova', 'quero um vestido', 'camisa para festa', 'tênis novo', 'sapato', 'roupa para o trabalho', 'look para sair'] },
  { key: 'eletronico', label: 'eletrônicos', command: 'abre eletrônicos', examples: ['celular novo', 'comprar um celular', 'trocar de celular', 'notebook novo', 'videogame', 'fone de ouvido', 'televisão nova', 'computador'] },
  { key: 'casa', label: 'móveis e decoração', command: 'abre móveis', examples: ['mobiliar a casa', 'sofá novo', 'decorar o quarto', 'comprar uma cama', 'mesa para a sala', 'arrumar a casa nova'] },
  { key: 'eletrodomestico', label: 'eletrodomésticos', command: 'abre eletrodomésticos', examples: ['geladeira nova', 'fogão', 'máquina de lavar roupa', 'ar condicionado para o calor', 'micro-ondas', 'está muito calor em casa'] },
  { key: 'presente', label: 'presentes', command: 'abre presentes', examples: ['dia das mães', 'natal', 'comprar um presente', 'aniversário da minha mãe', 'lembrancinha', 'presente para namorada', 'dia dos pais', 'surpresa para alguém'] },
  { key: 'pet', label: 'pet', command: 'abre pet', examples: ['ração para o cachorro', 'meu gato', 'banho e tosa', 'brinquedo para cachorro', 'coisas para o meu pet'] },
  { key: 'mercado', label: 'mercado', command: 'abre o mercado', examples: ['acabou o arroz', 'acabou a comida de casa', 'fazer compras do mês', 'comprar arroz e feijão', 'supermercado', 'compras da casa', 'faltou leite em casa'] },
  { key: 'moradia', label: 'imóveis', command: 'abre imóveis', examples: ['quero morar sozinho', 'procurando um apartamento', 'casa para alugar', 'mudar de casa', 'comprar uma casa', 'quarto para morar'] },
  { key: 'curso', label: 'cursos', command: 'tem curso online', examples: ['quero estudar', 'aprender inglês', 'fazer uma faculdade', 'curso para melhorar o currículo', 'aprender algo novo', 'aulas online', 'me formar'] },
  { key: 'musica', label: 'artistas e músicas', command: 'abre os artistas', examples: ['ouvir música', 'músicas novas', 'cantor gospel', 'banda ao vivo', 'quero escutar um som'] },
  { key: 'lives', label: 'lives', command: 'abre as lives', examples: ['assistir uma live', 'transmissão ao vivo', 'ver quem está ao vivo', 'abrir uma live'] },
  { key: 'agro', label: 'o Agro', command: 'me leva pro agro', examples: ['plantar', 'minha fazenda', 'colheita da soja', 'gado de corte', 'adubo para a lavoura', 'trator', 'sítio'] },
  { key: 'tecnologia', label: 'Tecnologia', command: 'abre tecnologia', examples: ['robótica', 'aprender a programar', 'software', 'inteligência artificial', 'robôs', 'criar um aplicativo', 'programação', 'automação'] },
  { key: 'mensagens', label: 'suas mensagens', command: 'abre as mensagens', examples: ['mandar um oi', 'falar com o diego', 'falar com a minha família', 'ligar para minha mãe', 'falar com meus amigos', 'mandar mensagem', 'conversar com alguém', 'ver minhas conversas', 'responder a mensagem'] },
  { key: 'stories', label: 'os Stories', command: 'abre os stories', examples: ['story', 'ver o story de alguém', 'ver os stories', 'o que meus amigos postaram', 'postar uma foto', 'ver as novidades dos amigos'] },
  { key: 'carteira', label: 'sua carteira', command: 'abre minha carteira', examples: ['quanto eu gastei', 'meu extrato', 'quanto dinheiro eu tenho', 'colocar dinheiro na conta', 'sacar meu dinheiro', 'meu saldo', 'pagar com o saldo', 'meus gastos do mês'] },
  { key: 'promo', label: 'promoções', command: 'abre as promoções', examples: ['tem desconto', 'promoção', 'coisas baratas', 'quero desconto', 'ofertas do dia', 'economizar nas compras', 'liquidação'] },
];

let PROTOS = null;
function protos() {
  if (PROTOS) return PROTOS;
  PROTOS = INTENTS.map((it) => ({
    it,
    ex: [...it.examples, it.label].map((e) => ({ v: sentenceVector(e), w: wordVectors(e) })).filter((e) => e.v),
  }));
  return PROTOS;
}

// Nota de parecença entre a frase e um exemplo: metade pelo sentido geral da frase e metade
// palavra a palavra (cada palavra dita procura a mais parecida no exemplo: "dentista" ≈ "médico").
function similarity(q, e) {
  let align = 0;
  let top = -1;
  for (const a of q.w) {
    let best = -1;
    for (const b of e.w) best = Math.max(best, cos(a, b));
    align += best;
    top = Math.max(top, best);
  }
  align /= q.w.length || 1;
  // A palavra mais forte também conta: "quero uma pizza" já se decide pela palavra "pizza".
  return 0.4 * cos(q.v, e.v) + 0.3 * align + 0.3 * top;
}

function rank(text) {
  const v = sentenceVector(text);
  if (!v) return [];
  const q = { v, w: wordVectors(text) };
  return protos()
    .map((p) => {
      let best = -1;
      for (const e of p.ex) best = Math.max(best, similarity(q, e));
      return { intent: p.it, key: p.it.key, score: best };
    })
    .sort((a, b) => b.score - a.score);
}

// Entende a frase pelo sentido. Devolve { intent, score, margin } ou null se não tiver certeza.
export function understand(text, { min = 0.64, gap = 0.03 } = {}) {
  const scored = rank(text);
  if (!scored.length) return null;
  const [a, b] = scored;
  const margin = a.score - (b ? b.score : 0);
  if (a.score < min || margin < gap) return null;
  return { intent: a.intent, score: a.score, margin, ranking: scored.slice(0, 3) };
}

// Para os testes e para o administrador: as 3 intenções mais parecidas, com a nota.
export const explain = (text) => rank(text).slice(0, 3).map((x) => ({ key: x.key, score: x.score }));
