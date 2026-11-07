// Classificação automática dos produtos que as lojas cadastram: pelo nome (e pela descrição) o
// Realys descobre o setor e o subgrupo do Shop (ex.: "Tênis Casual Unissex" → Vestuário › Calçados).
// Funciona dentro do celular, com o mesmo modelo de linguagem da Lotus: primeiro procura palavras
// conhecidas; se não achar, compara o sentido das palavras com exemplos de cada subgrupo.
import { sentenceVector } from './lm/lotusLM';
import { SHOP_SECTORS } from './shopSectorsData';

// Exemplos de cada subgrupo (palavras que costumam aparecer no nome do produto).
export const PRODUCT_CLASSES = [
  // Eletrônicos
  ['eletronicos', 'celulares', 'celular smartphone iphone galaxy motorola xiaomi redmi telefone'],
  ['eletronicos', 'informatica', 'notebook computador pc monitor teclado mouse impressora tablet ipad ssd hd processador placa webcam roteador'],
  ['eletronicos', 'tvaudio', 'tv televisão televisor smart caixa de som fone headphone headset soundbar rádio projetor home theater'],
  ['eletronicos', 'games', 'videogame console playstation ps5 xbox nintendo switch controle jogo game'],
  ['eletronicos', 'smarthome', 'alexa echo câmera de segurança wi-fi tomada inteligente lâmpada inteligente fechadura digital'],
  ['eletronicos', 'acessorios', 'carregador cabo usb capinha capa película power bank adaptador pendrive cartão de memória smartwatch'],
  // Vestuário
  ['vestuario', 'calcados', 'tênis sapato sandália chinelo bota sapatênis rasteira salto scarpin mocassim chuteira crocs tamanco'],
  ['vestuario', 'feminino', 'vestido saia blusa feminina cropped feminino lingerie sutiã calcinha body macaquinho'],
  ['vestuario', 'masculino', 'camisa masculina bermuda calça jeans polo terno gravata cueca masculino camiseta moletom jaqueta casaco blazer'],
  ['vestuario', 'infantil', 'infantil criança kids menino menina juvenil'],
  ['vestuario', 'fitness', 'legging top esportivo shorts de corrida dry fit roupa de academia regata fitness'],
  ['vestuario', 'acessorios', 'boné bolsa mochila cinto óculos de sol carteira chapéu lenço'],
  // Utensílios domésticos
  ['casa', 'cozinha', 'panela frigideira faqueiro talheres assadeira tábua escorredor garrafa térmica pote'],
  ['casa', 'mesa', 'pratos copos taças jogo de jantar xícaras toalha de mesa sousplat'],
  ['casa', 'eletroportateis', 'air fryer liquidificador batedeira cafeteira sanduicheira mixer ferro de passar aspirador panela elétrica processador de alimentos'],
  ['casa', 'cama', 'lençol edredom travesseiro toalha jogo de cama cobertor manta fronha roupão'],
  ['casa', 'limpeza', 'vassoura rodo balde detergente lixeira pano mop'],
  ['casa', 'organizacao', 'organizador cesto caixa organizadora cabide prateleira sapateira'],
  // Eletrodomésticos
  ['eletrodomesticos', 'geladeiras', 'geladeira refrigerador freezer frigobar adega'],
  ['eletrodomesticos', 'lavadoras', 'máquina de lavar lavadora lava e seca secadora tanquinho'],
  ['eletrodomesticos', 'lavaloucas', 'lava-louças lava louças'],
  ['eletrodomesticos', 'fogoes', 'fogão cooktop coifa depurador'],
  ['eletrodomesticos', 'fornos', 'forno micro-ondas microondas forno elétrico'],
  ['eletrodomesticos', 'climatizacao', 'ar-condicionado ar condicionado ventilador climatizador aquecedor purificador'],
  // Móveis e decoração
  ['moveis', 'sala', 'sofá rack estante poltrona mesa de centro painel puff'],
  ['moveis', 'quarto', 'cama box guarda-roupa colchão cômoda criado-mudo cabeceira beliche'],
  ['moveis', 'cozinhamov', 'mesa de jantar armário de cozinha banqueta balcão'],
  ['moveis', 'escritorio', 'escrivaninha cadeira gamer escritório gaveteiro'],
  ['moveis', 'decoracao', 'quadro cortina espelho vaso almofada persiana'],
  ['moveis', 'iluminacao', 'luminária lustre abajur pendente arandela'],
  ['moveis', 'tapetes', 'tapete passadeira capacho'],
  ['moveis', 'externa', 'varanda espreguiçadeira cadeira de piscina ombrelone'],
  // Beleza e saúde
  ['beleza', 'perfumes', 'perfume colônia eau de parfum body splash desodorante'],
  ['beleza', 'maquiagem', 'maquiagem batom base rímel máscara de cílios sombra blush pó corretivo delineador'],
  ['beleza', 'cabelos', 'shampoo condicionador máscara capilar secador de cabelo chapinha prancha babyliss tintura escova'],
  ['beleza', 'pele', 'hidratante protetor solar sabonete creme sérum esfoliante loção'],
  ['beleza', 'barbearia', 'barbeador máquina de cortar cabelo aparador barba pomada óleo de barba barbear'],
  ['beleza', 'unhas', 'esmalte alicate de unha lixa cabine led unhas'],
  ['beleza', 'farmacia', 'termômetro medidor de pressão curativo máscara cirúrgica inalador oxímetro'],
  ['beleza', 'suplementos', 'whey proteína creatina vitamina colágeno suplemento'],
  // Esporte e lazer
  ['esporte', 'academia', 'halter haltere halteres anilha barra esteira ergométrica colchonete elástico kettlebell'],
  ['esporte', 'bike', 'bicicleta bike pedal câmara de ar ciclismo'],
  ['esporte', 'futebol', 'bola de futebol trave caneleira luva de goleiro uniforme de time'],
  ['esporte', 'quadra', 'raquete bola de tênis vôlei basquete beach tennis rede'],
  ['esporte', 'camping', 'barraca saco de dormir lanterna cooler mochila de trilha'],
  ['esporte', 'pesca', 'vara de pesca molinete carretilha anzol isca linha de pesca'],
  ['esporte', 'aquaticos', 'piscina inflável boia óculos de natação prancha guarda-sol'],
  ['esporte', 'radicais', 'skate patins patinete longboard'],
  ['esporte', 'lutas', 'luva de boxe saco de pancada kimono protetor bucal'],
  // Bebês
  ['bebes', 'passeio', 'carrinho de bebê bebê-conforto canguru sling'],
  ['bebes', 'quarto', 'berço móbile trocador cômoda de bebê'],
  ['bebes', 'enxoval', 'body de bebê macacão de bebê manta de bebê enxoval saída de maternidade'],
  ['bebes', 'higiene', 'fralda lenço umedecido banheira pomada de assadura'],
  ['bebes', 'alimentacao', 'mamadeira chupeta bico babador cadeira de alimentação esterilizador'],
  ['bebes', 'seguranca', 'cadeirinha de carro babá eletrônica protetor de tomada'],
  ['bebes', 'brincar', 'tapete de atividades chocalho mordedor andador'],
  // Pet
  ['pet', 'racao', 'ração petisco sachê bifinho'],
  ['pet', 'caes', 'cachorro cão canino'],
  ['pet', 'gatos', 'gato felino arranhador areia de gato'],
  ['pet', 'aves', 'gaiola alpiste calopsita pássaro'],
  ['pet', 'peixes', 'aquário filtro de aquário peixe'],
  ['pet', 'roedores', 'hamster porquinho-da-índia coelho roedor'],
  ['pet', 'higienepet', 'tapete higiênico shampoo pet antipulgas vermífugo'],
  ['pet', 'acessoriospet', 'coleira guia caminha pet comedouro bebedouro casinha'],
  // Auto e moto
  ['automotivo', 'pecas', 'pastilha de freio amortecedor filtro de ar vela correia bateria automotiva'],
  ['automotivo', 'pneus', 'pneu roda calota'],
  ['automotivo', 'som', 'som automotivo multimídia alto-falante módulo central multimídia'],
  ['automotivo', 'acessoriosauto', 'capa de banco tapete automotivo suporte veicular aspirador automotivo câmera de ré'],
  ['automotivo', 'moto', 'moto relação escapamento retrovisor de moto baú de moto'],
  ['automotivo', 'capacetes', 'capacete jaqueta de moto luva de moto viseira'],
  ['automotivo', 'oleos', 'óleo de motor fluido aditivo lubrificante'],
  // Construção e ferramentas
  ['construcao', 'eletricas', 'furadeira parafusadeira serra elétrica esmerilhadeira lixadeira tupia martelete'],
  ['construcao', 'manuais', 'martelo chave de fenda alicate trena nível serrote jogo de chaves'],
  ['construcao', 'materiais', 'cimento argamassa tijolo bloco piso porcelanato azulejo telha areia'],
  ['construcao', 'eletrica', 'fio cabo elétrico disjuntor tomada interruptor lâmpada led'],
  ['construcao', 'hidraulica', 'torneira chuveiro registro cano tubo pvc vaso sanitário pia caixa d’água'],
  ['construcao', 'pintura', 'tinta rolo pincel massa corrida verniz'],
  ['construcao', 'jardim', 'mangueira cortador de grama vaso de planta terra adubo regador tesoura de poda'],
  ['construcao', 'seguranca', 'luva de proteção capacete de obra óculos de proteção bota de segurança'],
  // Livros e papelaria
  ['livros', 'livros', 'livro romance biografia autoajuda'],
  ['livros', 'biblias', 'bíblia devocional'],
  ['livros', 'religiosos', 'livro cristão evangélico católico'],
  ['livros', 'escolar', 'caderno lápis caneta borracha estojo mochila escolar apontador'],
  ['livros', 'escritorio', 'agenda grampeador pasta fichário papel sulfite calculadora'],
  ['livros', 'arte', 'tela pincel tinta guache lápis de cor aquarela'],
  // Brinquedos
  ['brinquedos', 'bonecas', 'boneca barbie casinha de boneca'],
  ['brinquedos', 'carrinhos', 'carrinho hot wheels pista controle remoto drone de brinquedo'],
  ['brinquedos', 'educativos', 'lego blocos de montar quebra-cabeça educativo'],
  ['brinquedos', 'tabuleiro', 'jogo de tabuleiro dominó xadrez baralho uno'],
  ['brinquedos', 'pelucias', 'pelúcia urso de pelúcia'],
  ['brinquedos', 'arlivre', 'escorregador balanço piscina de bolinha bicicleta infantil'],
  ['brinquedos', 'colecionaveis', 'action figure miniatura colecionável boneco'],
  // Instrumentos musicais
  ['musica', 'cordas', 'violão guitarra baixo ukulele cavaquinho violino'],
  ['musica', 'teclas', 'teclado piano teclas arranjador sintetizador'],
  ['musica', 'percussao', 'bateria pandeiro cajón surdo tambor'],
  ['musica', 'sopro', 'flauta saxofone trompete gaita'],
  ['musica', 'audio', 'microfone mesa de som caixa amplificada amplificador'],
  ['musica', 'acessoriosmus', 'corda de violão palheta afinador estante de partitura capotraste'],
  // Joias e relógios
  ['joias', 'aneis', 'anel aliança solitário'],
  ['joias', 'colares', 'colar corrente gargantilha pingente'],
  ['joias', 'brincos', 'brinco argola'],
  ['joias', 'pulseiras', 'pulseira bracelete tornozeleira'],
  ['joias', 'relogios', 'relógio'],
  ['joias', 'bijuterias', 'bijuteria semijoia folheado'],
  // Vários
  ['varios', 'presentes', 'presente cesta caneca personalizada'],
  ['varios', 'festas', 'balão bexiga decoração de festa vela de aniversário descartáveis'],
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (s) => norm(s).split(/[^a-z0-9-]+/).filter((w) => w.length > 2);
// "tenis" casa com "tênis"; plural simples também ("panelas" → "panela").
const same = (a, b) => a === b || a === b + 's' || b === a + 's' || a === b + 'es' || b === a + 'es';

// Só subgrupos que existem no Shop.
const VALID = PRODUCT_CLASSES.filter(([s, g]) => SHOP_SECTORS[s] && SHOP_SECTORS[s].groups.some((x) => x.key === g));

let VECS = null;
const vecs = () => {
  if (VECS) return VECS;
  VECS = VALID.map(([s, g, ex]) => ({ s, g, v: ex.split(' ').map((w) => sentenceVector(w)).filter(Boolean) }));
  return VECS;
};
const cos = (a, b) => {
  let x = 0;
  for (let i = 0; i < a.length; i++) x += a[i] * b[i];
  return x;
};

// Devolve { sector, group, label, how } ou null se não deu para saber (aí a loja escolhe).
export function classifyProduct(name, description = '') {
  const nameW = words(name);
  const descW = words(description);
  // 1) Palavras conhecidas: o nome vale mais que a descrição; a primeira palavra do nome vale mais.
  let best = null;
  VALID.forEach(([s, g, ex]) => {
    const exW = words(ex);
    const multi = ex.split(' ').length > 1 ? norm(ex) : '';
    let score = 0;
    nameW.forEach((w, i) => exW.some((e) => same(w, e)) && (score += i === 0 ? 4 : 2));
    descW.forEach((w) => exW.some((e) => same(w, e)) && (score += 0.5));
    // expressões de duas palavras ("air fryer", "jogo de cama", "máquina de lavar")
    [/air fryer/, /jogo de cama/, /maquina de lavar/, /lava e seca/, /ar[ -]condicionado/, /mesa de jantar/, /caixa de som/, /cama box/, /guarda-roupa/, /lava-loucas|lava loucas/, /micro-ondas/, /secador de cabelo/, /toalha de mesa/, /carrinho de bebe/, /vara de pesca/, /bola de futebol/, /oleo de motor/, /som automotivo/, /cadeirinha de carro/, /urso de pelucia/, /jogo de tabuleiro/, /protetor solar/, /maquina de cortar/, /capacete de obra/, /mochila escolar/, /areia de gato/, /racao/].forEach((re) => {
      if (re.test(norm(name)) && re.test(multi)) score += 5;
    });
    if (score > 0 && (!best || score > best.score)) best = { s, g, score };
  });
  if (best) return result(best.s, best.g, 'palavras');
  // 2) Sentido das palavras (modelo da Lotus): para nomes que não estão na lista.
  try {
    const v = sentenceVector(`${name} ${name} ${description}`);
    if (!v) return null;
    let top = null;
    vecs().forEach((c) => {
      const sc = Math.max(...c.v.map((x) => cos(v, x)), -1);
      if (!top || sc > top.sc) top = { ...c, sc };
    });
    return top && top.sc > 0.45 ? result(top.s, top.g, 'sentido') : null;
  } catch (e) {
    return null;
  }
}

function result(sector, group, how) {
  const sec = SHOP_SECTORS[sector];
  const grp = sec.groups.find((x) => x.key === group);
  return { sector, group, how, label: `${sec.title} › ${grp ? grp.label : ''}` };
}
