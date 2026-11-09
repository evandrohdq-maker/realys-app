// Páginas de usuários: todo usuário verificado tem o próprio sistema de páginas dentro da conta dele.
// Ninguém cria página sem ser usuário: a página sempre pertence a uma conta com biometria.
//
// Cada página escolhe como aparece:
//  - Assinada: mostra "Assinada por <nome> ✓ verificado" e leva ao perfil do dono.
//  - Anônima: o nome do dono não aparece para ninguém, mas a página mostra "Dono verificado pelo Realys".
//    O Realys sabe quem é: a identidade só é revelada por ordem judicial. Por isso página anônima
//    continua sujeita à IA contra notícias falsas, às denúncias e ao bloqueio, como tudo no app.
// Regras das anônimas: não pode se passar por pessoa, empresa ou órgão real, nem vender (vendas são
// assinadas, para a Garantia Realys funcionar).
const photo = (seed, w = 800, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const MAX_PAGES = 5; // páginas por usuário

export const PAGE_CATEGORIES = [
  { key: 'comunidade', label: 'Comunidade e bairro', icon: 'people-outline' },
  { key: 'cidade', label: 'Notícias da cidade', icon: 'newspaper-outline' },
  { key: 'receitas', label: 'Receitas e culinária', icon: 'restaurant-outline' },
  { key: 'esporte', label: 'Esporte', icon: 'football-outline' },
  { key: 'fe', label: 'Fé e espiritualidade', icon: 'heart-outline' },
  { key: 'humor', label: 'Humor e memes', icon: 'happy-outline' },
  { key: 'games', label: 'Games', icon: 'game-controller-outline' },
  { key: 'tecnologia', label: 'Tecnologia e IA', icon: 'hardware-chip-outline' },
  { key: 'agro', label: 'Agro', icon: 'leaf-outline' },
  { key: 'pets', label: 'Pets', icon: 'paw-outline' },
  { key: 'viagem', label: 'Viagens e passeios', icon: 'airplane-outline' },
  { key: 'arte', label: 'Arte e música', icon: 'musical-notes-outline' },
  { key: 'estudos', label: 'Estudos e dicas', icon: 'school-outline' },
  { key: 'outros', label: 'Outros assuntos', icon: 'apps-outline' },
];
export const categoryOfPage = (k) => PAGE_CATEGORIES.find((c) => c.key === k) || PAGE_CATEGORIES[PAGE_CATEGORIES.length - 1];

const H = 3600 * 1000;
const ago = (h) => Date.now() - h * H;

// Páginas de exemplo de outros usuários (demonstração).
export const DEMO_PAGES = [
  {
    id: 'pg1', ownerId: 'u1', ownerName: 'Ana Paula', anon: false, category: 'receitas', name: 'Receitas da Vó Ana', handle: 'receitasdavoana',
    about: 'Receitas de família, simples e baratas, testadas na minha cozinha.', cover: photo('realys-pg-receitas'), followers: 2310, createdAt: ago(900),
    posts: [
      { id: 'pp1', text: 'Cuca de uva do jeito da minha avó: rende 2 formas e leva 40 minutos de forno.', photo: photo('realys-pg-cuca', 600, 400), at: ago(5), likes: 184 },
      { id: 'pp2', text: 'Sopa de capeletti para o frio de Passo Fundo. Receita completa nos comentários.', at: ago(40), likes: 96 },
    ],
  },
  {
    id: 'pg2', ownerId: 'anon', ownerName: null, anon: true, category: 'cidade', name: 'Passo Fundo de Antigamente', handle: 'pfantigamente',
    about: 'Fotos e histórias antigas da cidade. Mande a sua foto que a gente publica.', cover: photo('realys-pg-antigo'), followers: 5120, createdAt: ago(2000),
    posts: [
      { id: 'pp3', text: 'A Avenida Brasil nos anos 70. Alguém lembra do cinema que ficava aqui?', photo: photo('realys-pg-avenida', 600, 400), at: ago(3), likes: 642 },
    ],
  },
  {
    id: 'pg3', ownerId: 'anon', ownerName: null, anon: true, category: 'comunidade', name: 'Achados e Perdidos PF', handle: 'achadosperdidospf',
    about: 'Perdeu ou achou algo? Publique aqui. Documentos, pets, chaves e celulares.', cover: photo('realys-pg-achados'), followers: 3870, createdAt: ago(1500),
    posts: [
      { id: 'pp4', text: 'Achada uma carteira marrom no terminal de ônibus hoje de manhã. Está com o fiscal da linha.', at: ago(2), likes: 211 },
    ],
  },
  {
    id: 'pg4', ownerId: 'u2', ownerName: 'Diego Santos', anon: false, category: 'viagem', name: 'Trilhas do Rio Grande', handle: 'trilhasrs',
    about: 'Roteiros de trilhas e cachoeiras no RS, com nível de dificuldade e onde estacionar.', cover: photo('realys-pg-trilhas'), followers: 1640, createdAt: ago(700),
    posts: [
      { id: 'pp5', text: 'Cascata do Caracol no fim de semana: chegue antes das 9h para pegar estacionamento.', photo: photo('realys-pg-cascata', 600, 400), at: ago(20), likes: 158 },
    ],
  },
];

// Como a página assina: o dono verificado (assinada) ou "dono verificado" sem nome (anônima).
export const signatureOf = (pg) => (pg.anon ? 'Página anônima · dono verificado pelo Realys' : `Assinada por ${pg.ownerName} · verificado`);

export const myPages = (state) => (state.userPages || []).filter((p) => p.ownerId === 'me');
export const pageById = (state, id) => (state.userPages || []).find((p) => p.id === id) || null;
export const canCreatePage = (state) => !!state.user && myPages(state).length < MAX_PAGES;

export const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 30);

// Nome que não pode ser usado por página anônima (se passar por gente, empresa ou órgão real).
const RESERVED = /\b(oficial|prefeitura|governo|policia|brigada|bombeiros|defesa civil|samu|realys|banco|receita federal|ministerio)\b/;
export function pageNameProblem(name, anon, state) {
  const n = String(name || '').trim();
  if (n.length < 3) return 'O nome da página precisa ter pelo menos 3 letras.';
  const t = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (anon && RESERVED.test(t)) return 'Página anônima não pode usar nome de órgão público, empresa ou de algo "oficial".';
  if ((state.userPages || []).some((p) => slug(p.name) === slug(n))) return 'Já existe uma página com esse nome.';
  return null;
}

export const PAGE_RULES = [
  'A página é sua e fica ligada à sua conta verificada por biometria.',
  'Anônima: seu nome não aparece, mas o Realys sabe quem é e só revela por ordem judicial.',
  'Página anônima não pode se passar por pessoa, empresa ou órgão real, nem vender produtos.',
  'Todo post passa pela IA contra notícias falsas; fake news não é publicada e pode bloquear a página.',
];
