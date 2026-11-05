// Membros da rede Realys (pessoas verificadas). Tudo fictício, para demonstração.
// Usado pela busca de pessoas, pelo perfil que abre ao tocar em quem postou e pelas amizades.
import { communityPosts, contacts } from './homeData';
import { posts as feedPosts } from './data';
import { socialSearchText } from './socialClasses';

const photo = (seed, w = 200, h = 200) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const contactPhoto = (id) => (contacts.find((c) => c.id === id) || {}).photo;

export const members = [
  { id: 'u1', social: { cls: 'gastronomia', sub: 'foodie', extra: [] }, name: 'Ana Paula', handle: 'anapaula', city: 'São Paulo - SP', bio: 'Mãe da Lara, apaixonada por café e por indicar bons profissionais.', friends: 342, mutual: 18, photo: contactPhoto('u1') },
  { id: 'u2', social: { cls: 'tech', sub: 'dev', extra: ['esportista'] }, name: 'Diego Santos', handle: 'diegosantos', city: 'São Paulo - SP', bio: 'Analista de sistemas e corredor de fim de semana.', friends: 518, mutual: 25, photo: contactPhoto('u2') },
  { id: 'u3', social: { cls: 'estudante', sub: 'faculdade', extra: [] }, name: 'Lívia Martins', handle: 'liviamartins', city: 'Santo André - SP', bio: 'Estudante de arquitetura, procurando apê perto do metrô.', friends: 207, mutual: 9, photo: contactPhoto('u3') },
  { id: 'u4', social: { cls: 'servicos', sub: 'transporte', extra: [] }, name: 'Rogério Teixeira', handle: 'rogerio.teixeira', city: 'Guarulhos - SP', bio: 'Pai, motorista de aplicativo e fã de pizza de domingo.', friends: 156, mutual: 4, photo: contactPhoto('u4') },
  { id: 'u6', social: { cls: 'viajante', sub: 'praia', extra: [] }, name: 'Ana Souza', handle: 'anasouza', city: 'Campinas - SP', bio: 'Família, parque e gente de verdade. 💚', friends: 689, mutual: 7, photo: photo('realys-u-anasouza') },
  { id: 'u7', social: { cls: 'empreendedor', sub: 'food', extra: ['fe'] }, name: 'Carlos Mendes', handle: 'carlosmendes', city: 'Belo Horizonte - MG', bio: 'Empreendedor, dono de food truck e louvor no carro.', friends: 932, mutual: 3, photo: photo('realys-u-carlos') },
  { id: 'u8', social: { cls: 'professor', sub: 'idiomas', extra: ['criador'] }, name: 'Fernanda Lima', handle: 'fernandalima', city: 'Rio de Janeiro - RJ', bio: 'Professora de inglês. Dou aulas ao vivo aqui no Realys!', friends: 1204, mutual: 11, photo: photo('realys-u-fernanda') },
  { id: 'u9', social: { cls: 'servicos', sub: 'transporte', extra: [] }, name: 'Marcos Silva', handle: 'marcos.entregas', city: 'São Paulo - SP', bio: 'Motoboy parceiro do Realys. Entrega rápida e com cuidado.', friends: 288, mutual: 6, photo: photo('realys-u-marcos') },
  { id: 'u10', social: { cls: 'gastronomia', sub: 'confeitaria', extra: ['empreendedor'] }, name: 'Juliana Rocha', handle: 'juliana.rocha', city: 'Curitiba - PR', bio: 'Confeiteira. Encomendas de bolo pelo meu perfil.', friends: 475, mutual: 2, photo: photo('realys-u-julianar') },
  { id: 'u11', social: { cls: 'servicos', sub: 'eletricista', extra: [] }, name: 'Pedro Almeida', handle: 'pedro.eletricista', city: 'São Paulo - SP', bio: 'Eletricista há 12 anos. Me chame em Serviços.', friends: 390, mutual: 14, photo: photo('realys-u-pedro') },
  { id: 'u12', social: { cls: 'viajante', sub: 'mochileiro', extra: ['artista'] }, name: 'Beatriz Costa', handle: 'biacosta', city: 'Salvador - BA', bio: 'Viajar, dançar e comer bem. Nessa ordem.', friends: 811, mutual: 0, photo: photo('realys-u-bia') },
  { id: 'u13', social: { cls: 'empreendedor', sub: 'mei', extra: [] }, name: 'André Oliveira', handle: 'andre.oliveira', city: 'Recife - PE', bio: 'Corretor de imóveis. Ajudo você a achar seu cantinho.', friends: 640, mutual: 1, photo: photo('realys-u-andre') },
  // Exemplos de perfis sociais (classe · subclasse) definidos pelo questionário do cadastro.
  { id: 'u14', social: { cls: 'gamer', sub: 'streamer', extra: ['criador'] }, name: 'Lucas Ferreira', handle: 'lucasplays', city: 'São Paulo - SP', bio: 'Jogo Free Fire e Valorant todo dia e faço live à noite. Bora pro rank! 🎮', friends: 2310, mutual: 5, photo: photo('realys-u-lucasgamer') },
  { id: 'u15', social: { cls: 'gamer', sub: 'esports', extra: [] }, name: 'Rafaela Nunes', handle: 'rafa.nunes', city: 'Fortaleza - CE', bio: 'Pro player de e-sports, time feminino de CS. Campeonato todo mês.', friends: 1876, mutual: 2, photo: photo('realys-u-rafagamer') },
  { id: 'u16', social: { cls: 'influenciador', sub: 'moda', extra: ['criador'] }, name: 'Camila Duarte', handle: 'camiladuarte', city: 'Rio de Janeiro - RJ', bio: 'Moda, maquiagem e looks reais. Parcerias e publis pelo direct ✨', friends: 15420, mutual: 8, photo: photo('realys-u-camila') },
  { id: 'u17', social: { cls: 'criador', sub: 'humor', extra: ['influenciador'] }, name: 'Thiago Ramos', handle: 'thiagoramos', city: 'Belo Horizonte - MG', bio: 'Crio esquetes de humor e vídeos curtos. Mineiro com orgulho, uai.', friends: 9840, mutual: 4, photo: photo('realys-u-thiago') },
  { id: 'u18', social: { cls: 'criador', sub: 'podcaster', extra: [] }, name: 'Paula Vieira', handle: 'paulavieira.cast', city: 'Porto Alegre - RS', bio: 'Podcast semanal sobre empreendedorismo feminino. Episódio novo toda segunda.', friends: 3120, mutual: 1, photo: photo('realys-u-paula') },
  { id: 'u19', social: { cls: 'atleta', sub: 'lutas', extra: ['professor'] }, name: 'Bruno Cardoso', handle: 'bruno.bjj', city: 'Curitiba - PR', bio: 'Faixa preta de jiu-jitsu, campeão brasileiro. Dou aula na academia do bairro.', friends: 1450, mutual: 3, photo: photo('realys-u-bruno') },
  { id: 'u20', social: { cls: 'esportista', sub: 'corrida', extra: [] }, name: 'Mariana Castro', handle: 'mari.corre', city: 'Campinas - SP', bio: 'Corro 10 km aos domingos e treino na academia antes do trabalho.', friends: 620, mutual: 6, photo: photo('realys-u-mariana') },
  { id: 'u21', social: { cls: 'musico', sub: 'cantor', extra: ['fe'] }, name: 'Gabriel Moura', handle: 'gabrielmoura', city: 'Goiânia - GO', bio: 'Cantor gospel e ministro de louvor. Shows e cultos, é só chamar. 🙌', friends: 4210, mutual: 9, photo: photo('realys-u-gabriel') },
  { id: 'u22', social: { cls: 'artista', sub: 'ilustrador', extra: ['estudante'] }, name: 'Isabela Prado', handle: 'isa.desenha', city: 'Florianópolis - SC', bio: 'Ilustradora e estudante de design. Faço arte digital por encomenda.', friends: 980, mutual: 2, photo: photo('realys-u-isabela') },
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
      const hay = `${norm(m.name)} ${norm(m.handle)} ${norm(socialSearchText(m.social))}`; // acha por nome, @ ou perfil (ex.: "gamer")
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1) || b.mutual - a.mutual);
}
