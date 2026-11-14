// Depoimentos (como no Orkut) e galerias do perfil: fotos, vídeos e destaques de stories.
// Tudo fictício, para demonstração. 'me' é o próprio usuário do app.
//
// Como funciona o depoimento:
// 1. Alguém escreve um depoimento para o perfil de um amigo.
// 2. A Re@lys analisa o texto (ofensas, golpes, links, dados pessoais) antes de entregar.
// 3. O dono do perfil recebe em "Depoimentos para aprovar" e decide: Aceitar ou Recusar.
// 4. Só os aceitos ficam expostos no perfil e aparecem no feed, abaixo dos stories,
//    para as pessoas curtirem, comentarem e compartilharem.
// 5. O dono pode tirar do perfil quando quiser.

const pic = (seed, w = 600, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const initialTestimonials = [
  {
    id: 't1', from: 'u1', to: 'u2', status: 'aprovado', time: 'há 25 min', likes: 48, shares: 4,
    text: 'Diego é aquele amigo que aparece na hora que a gente mais precisa. Me ajudou na mudança inteira num domingo de chuva e ainda levou o almoço. Gente de verdade! 💛',
    comments: [
      { id: 'c1', who: 'Lívia Martins', text: 'Verdade! O Diego é sensacional 👏' },
      { id: 'c2', who: 'Diego Santos', text: 'Que isso, Ana! Sempre que precisar 🙏' },
    ],
  },
  {
    id: 't2', from: 'u7', to: 'u10', status: 'aprovado', time: 'há 1 h', likes: 112, shares: 15,
    text: 'A Juliana fez o bolo do aniversário da minha filha e foi o sucesso da festa. Caprichosa, pontual e com um coração enorme. Recomendo de olhos fechados!',
    comments: [{ id: 'c3', who: 'Ana Souza', text: 'Já encomendei também, maravilhoso 🍓' }],
  },
  {
    id: 't3', from: 'u3', to: 'u8', status: 'aprovado', time: 'há 3 h', likes: 76, shares: 9,
    text: 'Fernanda é a professora mais paciente que já conheci. Em três meses de aula ao vivo aqui no Re@lys eu perdi o medo de falar inglês. Thank you, teacher! ✈️',
    comments: [],
  },
  {
    id: 't4', from: 'u2', to: 'u11', status: 'aprovado', time: 'há 5 h', likes: 39, shares: 2,
    text: 'Pedro trocou toda a fiação do meu apê, explicou cada passo e deixou tudo limpinho. Profissional honesto é raro, e esse é um deles. ⚡',
    comments: [{ id: 'c4', who: 'Rogério Teixeira', text: 'Ele fez o meu quadro de luz também, top!' }],
  },
  {
    id: 't5', from: 'u4', to: 'u1', status: 'aprovado', time: 'ontem', likes: 64, shares: 6,
    text: 'Ana Paula é luz! Sempre indicando coisa boa, ajudando a comunidade e com uma palavra de fé na hora certa. Deus abençoe sua família 🙌',
    comments: [],
  },
  {
    id: 't6', from: 'u12', to: 'u6', status: 'aprovado', time: 'ontem', likes: 27, shares: 1,
    text: 'Amiga de infância que a vida só fez ficar mais perto. Obrigada por cada conversa, cada risada e cada viagem. Te amo, Ana! 💚',
    comments: [],
  },

  // Depoimentos para o próprio usuário: dois esperando aprovação e um já exposto no perfil.
  {
    id: 't20', from: 'u8', to: 'me', status: 'pendente', time: 'há 10 min', likes: 0, shares: 0, comments: [],
    text: 'Aluno dedicado, sempre presente nas lives e ajudando os colegas com as dúvidas. Dá gosto de ensinar assim! 📚',
  },
  {
    id: 't21', from: 'u4', to: 'me', status: 'pendente', time: 'há 2 h', likes: 0, shares: 0, comments: [],
    text: 'Parceiro de pescaria e de vida. Pessoa correta, de palavra, que a gente pode contar sempre. Valeu por tudo, irmão! 🎣',
  },
  {
    id: 't22', from: 'u1', to: 'me', status: 'aprovado', time: 'semana passada', likes: 23, shares: 1,
    text: 'Uma das pessoas mais generosas que conheço. Sempre tem tempo para ouvir e ajudar quem precisa. Obrigada pela amizade! 🌻',
    comments: [{ id: 'c9', who: 'Diego Santos', text: 'Assino embaixo!' }],
  },
];

// Análise automática antes de entregar ao dono do perfil.
// Na versão real é a IA da Re@lys; aqui, regras simples para a demonstração.
const BLOCKED = ['idiota', 'burro', 'otario', 'otário', 'lixo', 'vagabund', 'golpe', 'piranha', 'merda', 'porra', 'caralho', 'fdp'];
const SCAM = ['pix', 'deposita', 'transfere', 'whatsapp', 'ganhe dinheiro', 'renda extra', 'clique no link'];

export function analyzeTestimonial(text) {
  const t = String(text || '').trim();
  const low = t.toLowerCase();
  if (t.length < 15) return { ok: false, reason: 'Escreva um pouco mais (pelo menos 15 letras) para o depoimento ter sentido.' };
  if (t.length > 600) return { ok: false, reason: 'O depoimento pode ter no máximo 600 letras.' };
  if (/https?:\/\/|www\.|\.com\b|\.com\.br\b/.test(low)) return { ok: false, reason: 'Depoimentos não podem ter links. Isso protege a rede contra golpes.' };
  if (/\d{4,}[\s.-]?\d{4,}/.test(low) || /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(low)) return { ok: false, reason: 'Não coloque telefone, CPF ou outros números pessoais no depoimento.' };
  if (BLOCKED.some((w) => low.includes(w))) return { ok: false, reason: 'A Re@lys encontrou palavras ofensivas. Reescreva com respeito, por favor.' };
  if (SCAM.some((w) => low.includes(w))) return { ok: false, reason: 'Parece pedido de dinheiro ou propaganda. Depoimento é para falar da pessoa.' };
  return { ok: true };
}

// Galeria de cada membro: fotos, vídeos e destaques (stories que a pessoa deixou fixados no perfil).
const HL_TITLES = [
  ['Viagens', 'Família', 'Fé'],
  ['Trilhas', 'Amigos', 'Trabalho'],
  ['Comidas', 'Festas', 'Pets'],
  ['Igreja', 'Praia', 'Momentos'],
];
const VIDEO_TITLES = ['Fim de semana em família', 'Bastidores do trabalho', 'Louvor no domingo', 'Passeio no parque', 'Receita rápida', 'Aniversário surpresa'];

export function galleryOf(memberId) {
  const n = Number(String(memberId).replace(/\D/g, '')) || 1;
  const photos = Array.from({ length: 9 }, (_, i) => ({ id: `${memberId}-f${i}`, uri: pic(`realys-g-${memberId}-${i}`, 800, 800) }));
  const videos = Array.from({ length: 4 }, (_, i) => ({
    id: `${memberId}-v${i}`,
    thumb: pic(`realys-gv-${memberId}-${i}`, 800, 450),
    title: VIDEO_TITLES[(n + i) % VIDEO_TITLES.length],
    duration: `0:${String(15 + ((n * 7 + i * 11) % 44)).padStart(2, '0')}`,
    views: 40 + ((n * 37 + i * 53) % 900),
  }));
  const highlights = HL_TITLES[n % HL_TITLES.length].map((title, i) => ({
    id: `${memberId}-h${i}`,
    title,
    cover: pic(`realys-gh-${memberId}-${i}`, 300, 300),
    items: Array.from({ length: 2 + (i % 2) }, (_, k) => ({
      id: `${memberId}-h${i}-${k}`,
      image: pic(`realys-ghs-${memberId}-${i}-${k}`, 720, 1280),
      caption: k === 0 ? title : '',
      time: 'destaque',
    })),
  }));
  return { photos, videos, highlights };
}

// Galeria inicial do próprio usuário (na versão real vem do servidor).
export const myInitialGallery = {
  photos: [0, 1, 2, 3, 4].map((i) => ({ id: `me-f${i}`, uri: pic(`realys-g-me-${i}`, 800, 800) })),
  videos: [
    { id: 'me-v0', thumb: pic('realys-gv-me-0', 800, 450), title: 'Culto de domingo', duration: '0:42', views: 128 },
    { id: 'me-v1', thumb: pic('realys-gv-me-1', 800, 450), title: 'Churrasco com a turma', duration: '0:27', views: 86 },
  ],
  highlights: [
    {
      id: 'me-h0',
      title: 'Viagens',
      cover: pic('realys-gh-me-0', 300, 300),
      items: [
        { id: 'me-h0-0', image: pic('realys-ghs-me-0-0', 720, 1280), caption: 'Serra da Mantiqueira ⛰️', time: 'destaque' },
        { id: 'me-h0-1', image: pic('realys-ghs-me-0-1', 720, 1280), caption: '', time: 'destaque' },
      ],
    },
    {
      id: 'me-h1',
      title: 'Família',
      cover: pic('realys-gh-me-1', 300, 300),
      items: [{ id: 'me-h1-0', image: pic('realys-ghs-me-1-0', 720, 1280), caption: 'Almoço de domingo 💛', time: 'destaque' }],
    },
  ],
};
