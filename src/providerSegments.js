// Cadastro do prestador por segmento: cada segmento (classe do catálogo de profissões, em
// src/professionsData.js) mostra só o que é da profissão dele — as profissões do segmento, as
// formas de cobrança que fazem sentido, se tem taxa de visita, se pede veículo e os exemplos.
// Ex.: Artista não vê "por corrida", "por km" nem campo de veículo; motorista não vê "por show".
import { PROF_CLASSES } from './professionsData';
import { serviceTypes } from './data';

const BASE = { units: ['visita', 'hora', 'serviço', 'diária'], visit: true, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Tomadas, Chuveiro, Disjuntor)' };
export const SEG_CONFIG = {
  casa: BASE,
  construcao: { ...BASE, units: ['visita', 'diária', 'm²', 'serviço', 'hora'], ph: 'O que você faz (ex.: Reboco, Piso, Telhado)' },
  veiculos: { ...BASE, units: ['serviço', 'visita', 'hora'], ph: 'O que você faz (ex.: Revisão, Freio, Elétrica)' },
  transporte: { units: ['corrida', 'km', 'hora', 'diária'], visit: false, vehicle: true, price: 'Preço (R$)', ph: 'O que você faz (ex.: Corridas na cidade, Aeroporto, Entregas)' },
  saude: { units: ['consulta', 'sessão', 'hora'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'Sua especialidade (ex.: Ansiedade, Nutrição esportiva)' },
  beleza: { ...BASE, units: ['serviço', 'hora', 'visita'], ph: 'O que você faz (ex.: Corte, Unhas, Maquiagem)' },
  cuidados: { units: ['hora', 'diária', 'plantão'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Cuidador de idosos, Babá)' },
  pets: { units: ['serviço', 'passeio', 'diária', 'hora'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Banho, Adestramento, Passeio)' },
  eventos: { units: ['evento', 'hora', 'serviço', 'pessoa'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Casamentos, Aniversários, Formaturas)' },
  artistas: {
    units: ['show', 'hora', 'serviço', 'publicidade'], visit: false, vehicle: false, price: 'Cachê (R$)',
    ph: 'Seu estilo e o que você apresenta (ex.: Sertanejo, Acústico, Casamentos)',
    note: 'Artista cobra por show, por hora, por serviço (jingle, gravação, arte) ou por publicidade (divulgar uma marca nos seus reels e stories). Monte cachês, agenda e vitrine em Perfil › Shows e contratação.',
  },
  gamers: {
    units: ['publicidade', 'hora', 'partida', 'evento'], visit: false, vehicle: false, price: 'Preço (R$)',
    ph: 'Seus jogos e o que oferece (ex.: Free Fire, Coaching, Publi na live)',
    note: 'Gamer cobra por publicidade (sua marca na live, no reels e nos stories), por hora (coaching), por partida (jogar em dupla ou no time de quem contrata) ou por evento (campeonato, narração, presença). Monte seu cartão em Perfil › Perfil gamer.',
  },
  aulas: { units: ['aula', 'hora', 'mês'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você ensina (ex.: Matemática, Violão, Inglês)' },
  tecnologia: { units: ['hora', 'serviço', 'projeto', 'visita'], visit: true, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Formatação, Sites, Redes)' },
  criativos: { units: ['serviço', 'projeto', 'hora', 'publicidade'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Logo, Social media, Vídeos)' },
  juridico: { units: ['consulta', 'hora', 'serviço', 'mês'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'Sua área (ex.: Trabalhista, Imposto de renda)' },
  agro: { units: ['visita', 'hora', 'diária', 'hectare'], visit: true, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Pulverização, Análise de solo)' },
  moda: { units: ['peça', 'serviço', 'hora'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Ajustes, Roupas sob medida)' },
  turismo: { units: ['pessoa', 'passeio', 'diária'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você oferece (ex.: City tour, Trilhas)' },
  ambiente: { units: ['coleta', 'kg', 'serviço'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Coleta de recicláveis, Entulho)' },
  seguranca: { units: ['hora', 'plantão', 'diária', 'evento'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Portaria, Eventos, Ronda)' },
};
export const segConfig = (key) => SEG_CONFIG[key] || BASE;

// Artista e Gamer no começo, para quem se apresenta ou transmite achar fácil.
const TOPO = { artistas: 0, gamers: 1 };
const typeByKey = Object.fromEntries(serviceTypes.map((t) => [t.key, t]));
// Segmentos na ordem do catálogo (Artistas logo no começo, para quem se apresenta achar fácil).
export const SEGMENTS = [...PROF_CLASSES]
  .sort((a, b) => (TOPO[a.key] ?? 99) - (TOPO[b.key] ?? 99))
  .map((c) => ({ key: c.key, label: { Artistas: 'Artista', 'Gamers e streamers': 'Gamer' }[c.label] || c.label, emoji: c.emoji, professions: c.subs.map(([k]) => typeByKey[k]).filter(Boolean) }));

// Segmento de uma profissão já cadastrada (DJ e banda contam como Artista).
export function segOfService(service) {
  const art = SEGMENTS.find((s) => s.key === 'artistas');
  if (art && art.professions.some((p) => p.key === service)) return 'artistas';
  const s = SEGMENTS.find((x) => x.professions.some((p) => p.key === service));
  return s ? s.key : 'casa';
}

// ---------- Busca de profissão (cadastro do prestador) ----------
// A pessoa digita ("eletri", "cantor", "uber", "unha") e aparecem só as 4 profissões que mais
// combinam, cada uma com o segmento e um exemplo do que faz. Ela toca e pronto.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const segLabelOf = (key) => {
  const sg = SEGMENTS.find((x) => x.key === segOfService(key));
  return sg ? sg.label : '';
};
export function buscarProfissoes(q, n = 4) {
  const t = norm(q);
  if (t.length < 2) return [];
  const out = [];
  serviceTypes.forEach((p) => {
    const label = norm(p.label);
    const words = (p.words || []).map(norm);
    let score = 0;
    if (label === t) score = 100;
    else if (label.startsWith(t)) score = 80;
    else if (label.split(/[\s(),/]+/).some((w) => w.startsWith(t))) score = 65;
    else if (words.some((w) => w === t)) score = 55;
    else if (words.some((w) => w.startsWith(t))) score = 45;
    else if (label.includes(t) || words.some((w) => w.includes(t))) score = 30;
    if (score) out.push({ ...p, score, segmento: segLabelOf(p.key), exemplo: funcoesSugeridas(p.key).slice(0, 3).join(', ') });
  });
  return out.sort((a, b) => b.score - a.score || a.label.length - b.label.length).slice(0, n);
}
export const profissaoPorKey = (key) => serviceTypes.find((p) => p.key === key) || null;

// O que cada profissão costuma fazer: vira sugestões para tocar (e a pessoa ainda escreve as dela).
const FUNCOES = {
  eletricista: ['Tomadas e interruptores', 'Chuveiro', 'Disjuntor e quadro', 'Fiação nova', 'Iluminação', 'Padrão de energia'],
  encanador: ['Vazamentos', 'Torneiras e registros', 'Desentupimento', 'Caixa d’água', 'Descarga', 'Instalação hidráulica'],
  diarista: ['Faxina completa', 'Limpeza pós-obra', 'Passar roupa', 'Limpeza de vidros', 'Organização'],
  pintor: ['Pintura interna', 'Pintura externa', 'Textura e grafiato', 'Massa corrida', 'Portões e grades'],
  chaveiro: ['Abertura de portas', 'Cópia de chaves', 'Troca de fechaduras', 'Chave de carro'],
  motorista: ['Corridas na cidade', 'Aeroporto e rodoviária', 'Viagens', 'Levar crianças', 'Cadeirinha infantil'],
  motoboy: ['Entregas rápidas', 'Documentos', 'Delivery de restaurante', 'Farmácia', 'Compras'],
  frete: ['Mudanças', 'Pequenos fretes', 'Móveis e eletros', 'Entulho', 'Ajudante incluso'],
  mecanico: ['Revisão', 'Freios', 'Suspensão', 'Elétrica do carro', 'Troca de óleo', 'Socorro na rua'],
  psicologo: ['Ansiedade', 'Depressão', 'Terapia de casal', 'Adolescentes', 'Atendimento online'],
  nutricionista: ['Emagrecimento', 'Nutrição esportiva', 'Gestantes', 'Reeducação alimentar', 'Atendimento online'],
  personal: ['Musculação', 'Emagrecimento', 'Treino em casa', 'Idosos', 'Funcional'],
  professor: ['Reforço escolar', 'Matemática', 'Inglês', 'Preparação para o ENEM', 'Aulas online'],
  dev: ['Sites', 'Aplicativos', 'Lojas virtuais', 'Sistemas sob medida', 'Manutenção'],
  tecnico: ['Formatação', 'Conserto de PC e notebook', 'Redes e Wi-Fi', 'Celulares', 'Câmeras'],
  dj: ['Casamentos', 'Aniversários', 'Formaturas', 'Som e iluminação', 'Festas de empresa'],
  fotografo: ['Casamentos', 'Ensaios', 'Aniversários', 'Produtos', 'Eventos de empresa'],
  buffet: ['Festas', 'Casamentos', 'Coffee break', 'Churrasco', 'Salgados e doces'],
  decoracao: ['Festas infantis', 'Casamentos', 'Balões', 'Mesa posta', 'Eventos de empresa'],
  advogado: ['Trabalhista', 'Família e divórcio', 'Previdenciário', 'Consumidor', 'Contratos'],
  contador: ['MEI', 'Imposto de renda', 'Abertura de empresa', 'Folha de pagamento', 'Contabilidade mensal'],
  cantor: ['Sertanejo', 'Pagode', 'Gospel', 'Acústico (voz e violão)', 'Casamentos', 'Bares e restaurantes'],
  musico: ['Banda para festa', 'Casamentos', 'Bailes', 'Bares e restaurantes', 'Eventos de empresa'],
  instrumentista: ['Violino em casamento', 'Sax', 'Piano', 'Gaita e sanfona', 'Gravações'],
  humorista: ['Stand-up', 'Eventos de empresa', 'Festas', 'Mestre de cerimônias'],
  dancarino: ['Shows de dança', 'Coreografia de casamento', 'Aulas', 'Eventos'],
  ator: ['Animação de festa infantil', 'Personagens', 'Teatro', 'Comerciais'],
  artistavisual: ['Pintura ao vivo', 'Grafite e murais', 'Caricatura em eventos', 'Quadros sob encomenda'],
  streamer: ['Publi na live', 'Reels patrocinado', 'Stories com a marca', 'Lives de jogo'],
  coachgame: ['Aulas de Free Fire', 'Aulas de LoL', 'Análise de partidas', 'Treino de mira'],
  proplayer: ['Jogar no seu time', 'Campeonatos', 'Partidas em dupla', 'Presença em eventos'],
  caster: ['Narração de campeonato', 'Comentarista', 'Apresentação de evento'],
  gamecreator: ['Vídeos de gameplay', 'Review de jogos', 'Publi em vídeo', 'Edição'],
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function funcoesSugeridas(key) {
  if (FUNCOES[key]) return FUNCOES[key];
  const p = profissaoPorKey(key);
  if (!p) return [];
  const nome = norm(p.label);
  return (p.words || []).filter((w) => !nome.includes(norm(w)) && w.length > 3).slice(0, 6).map(cap);
}

// Classe do perfil social que combina com a profissão (artista e gamer têm a sua; o resto o app
// entende pelas palavras; se não achar, fica "Prestador de serviços").
const CLASSE_DA_PROFISSAO = {
  cantor: ['musico', 'cantor'], musico: ['musico', 'banda'], instrumentista: ['musico', 'instrumentista'], dj: ['musico', 'dj'],
  humorista: ['cenicas', 'standup'], dancarino: ['cenicas', 'danca'], ator: ['cenicas', 'ator'], artistavisual: ['artista', 'grafite'],
  streamer: ['gamer', 'streamer'], coachgame: ['gamer', 'coach'], proplayer: ['gamer', 'esports'], caster: ['gamer', 'caster'], gamecreator: ['gamer', 'streamer'],
};
export const classeDaProfissao = (key) => (CLASSE_DA_PROFISSAO[key] ? { cls: CLASSE_DA_PROFISSAO[key][0], sub: CLASSE_DA_PROFISSAO[key][1] } : null);
