// Membros da rede Realys (pessoas verificadas). Tudo fictício, para demonstração.
// Usado pela busca de pessoas, pelo perfil que abre ao tocar em quem postou e pelas amizades.
import { communityPosts, contacts } from './homeData';
import { posts as feedPosts } from './data';

const photo = (seed, w = 200, h = 200) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const contactPhoto = (id) => (contacts.find((c) => c.id === id) || {}).photo;

export const members = [
  { id: 'u1', name: 'Ana Paula', handle: 'anapaula', city: 'São Paulo - SP', bio: 'Mãe da Lara, apaixonada por café e por indicar bons profissionais.', friends: 342, mutual: 18, photo: contactPhoto('u1') },
  { id: 'u2', name: 'Diego Santos', handle: 'diegosantos', city: 'São Paulo - SP', bio: 'Analista de sistemas e corredor de fim de semana.', friends: 518, mutual: 25, photo: contactPhoto('u2') },
  { id: 'u3', name: 'Lívia Martins', handle: 'liviamartins', city: 'Santo André - SP', bio: 'Estudante de arquitetura, procurando apê perto do metrô.', friends: 207, mutual: 9, photo: contactPhoto('u3') },
  { id: 'u4', name: 'Rogério Teixeira', handle: 'rogerio.teixeira', city: 'Guarulhos - SP', bio: 'Pai, motorista de aplicativo e fã de pizza de domingo.', friends: 156, mutual: 4, photo: contactPhoto('u4') },
  { id: 'u6', name: 'Ana Souza', handle: 'anasouza', city: 'Campinas - SP', bio: 'Família, parque e gente de verdade. 💚', friends: 689, mutual: 7, photo: photo('realys-u-anasouza') },
  { id: 'u7', name: 'Carlos Mendes', handle: 'carlosmendes', city: 'Belo Horizonte - MG', bio: 'Empreendedor, dono de food truck e louvor no carro.', friends: 932, mutual: 3, photo: photo('realys-u-carlos') },
  { id: 'u8', name: 'Fernanda Lima', handle: 'fernandalima', city: 'Rio de Janeiro - RJ', bio: 'Professora de inglês. Dou aulas ao vivo aqui no Realys!', friends: 1204, mutual: 11, photo: photo('realys-u-fernanda') },
  { id: 'u9', name: 'Marcos Silva', handle: 'marcos.entregas', city: 'São Paulo - SP', bio: 'Motoboy parceiro do Realys. Entrega rápida e com cuidado.', friends: 288, mutual: 6, photo: photo('realys-u-marcos') },
  { id: 'u10', name: 'Juliana Rocha', handle: 'juliana.rocha', city: 'Curitiba - PR', bio: 'Confeiteira. Encomendas de bolo pelo meu perfil.', friends: 475, mutual: 2, photo: photo('realys-u-julianar') },
  { id: 'u11', name: 'Pedro Almeida', handle: 'pedro.eletricista', city: 'São Paulo - SP', bio: 'Eletricista há 12 anos. Me chame em Serviços.', friends: 390, mutual: 14, photo: photo('realys-u-pedro') },
  { id: 'u12', name: 'Beatriz Costa', handle: 'biacosta', city: 'Salvador - BA', bio: 'Viajar, dançar e comer bem. Nessa ordem.', friends: 811, mutual: 0, photo: photo('realys-u-bia') },
  { id: 'u13', name: 'André Oliveira', handle: 'andre.oliveira', city: 'Recife - PE', bio: 'Corretor de imóveis. Ajudo você a achar seu cantinho.', friends: 640, mutual: 1, photo: photo('realys-u-andre') },
];

// Situação da amizade de cada membro com o usuário do app (no começo da demonstração).
// amigo · enviado (você pediu) · recebido (pediram para você). Sem chave = não são amigos.
export const initialFriends = { u1: 'amigo', u2: 'amigo', u3: 'amigo', u4: 'amigo', u8: 'recebido', u10: 'recebido' };

// Posts do membro: sai da Comunidade e do feed geral.
export function postsOf(member) {
  const extra = {
    u7: [{ id: 'x7', text: 'Food truck novo estacionado no Parque Municipal neste sábado! 🌮', image: photo('realys-px-truck', 800, 600), likes: 96, comments: 14, time: 'há 2 dias' }],
    u8: [{ id: 'x8', text: 'Live de inglês hoje às 20h. Tema: viagem e aeroporto ✈️', image: null, likes: 158, comments: 33, time: 'há 5 h' }],
    u10: [{ id: 'x10', text: 'Bolo de morango com chantilly saindo para uma festa de 15 anos 🍓', image: photo('realys-px-bolo', 800, 600), likes: 274, comments: 41, time: 'há 1 dia' }],
    u11: [{ id: 'x11', text: 'Troca de quadro de luz finalizada. Segurança em primeiro lugar ⚡', image: photo('realys-px-quadro', 800, 600), likes: 63, comments: 8, time: 'há 3 dias' }],
  };
  const fromCommunity = communityPosts.filter((p) => p.author === member.name);
  const fromFeed = feedPosts.filter((p) => !p.storeId && p.author === member.name).map((p) => ({ ...p, time: 'esta semana' }));
  return [...fromCommunity, ...fromFeed, ...(extra[member.id] || [])];
}

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^@/, '')
    .trim();

export const memberByName = (name) => members.find((m) => norm(m.name) === norm(name));
export const memberById = (id) => members.find((m) => m.id === id);

// Busca por nome ou @usuário, sem ligar para acento ou maiúscula.
export function searchMembers(query) {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(/\s+/);
  return members
    .filter((m) => {
      const hay = `${norm(m.name)} ${norm(m.handle)}`;
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1) || b.mutual - a.mutual);
}
