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
  // Mais exemplos: um perfil para cada classe do Realys (Tecnologia e IA, games, conteúdo digital, cênicas, escrita, moda, agro, estilo de vida...).
  { id: 'u23', social: { cls: 'tech', sub: 'ia', extra: ['criador'] }, name: 'Rodrigo Teles', handle: 'rodrigo.ia', city: 'São Paulo - SP', bio: 'Crio IAs e agentes que atendem clientes de pequenas lojas 24h. Mostro tudo nas minhas lives 🤖', friends: 3870, mutual: 7, photo: photo('realys-u-rodrigo') },
  { id: 'u24', social: { cls: 'tech', sub: 'fullstack', extra: ['estudante'] }, name: 'Larissa Gomes', handle: 'lari.codes', city: 'Recife - PE', bio: 'Programadora full stack (React e Node) e estudante de Ciência da Computação. Aceito freelas!', friends: 1290, mutual: 4, photo: photo('realys-u-larissa') },
  { id: 'u25', social: { cls: 'tech', sub: 'seguranca', extra: [] }, name: 'Felipe Araújo', handle: 'felipe.sec', city: 'Brasília - DF', bio: 'Hacker ético. Ensino como se proteger de golpes na internet e faço pentest para empresas.', friends: 2045, mutual: 3, photo: photo('realys-u-felipe') },
  { id: 'u26', social: { cls: 'tech', sub: 'artistaia', extra: ['artista'] }, name: 'Nicole Barros', handle: 'nicole.ia.art', city: 'Florianópolis - SC', bio: 'Artista de IA: imagens, clipes e capas de música feitas com inteligência artificial ✨', friends: 5310, mutual: 2, photo: photo('realys-u-nicole') },
  { id: 'u27', social: { cls: 'tech', sub: 'mobile', extra: ['empreendedor'] }, name: 'Caio Medeiros', handle: 'caio.apps', city: 'Belo Horizonte - MG', bio: 'Desenvolvo apps Android e iOS em React Native. Fundador de uma startup de delivery.', friends: 980, mutual: 5, photo: photo('realys-u-caio') },
  { id: 'u28', social: { cls: 'tech', sub: 'robotica', extra: ['professor'] }, name: 'Júlia Santana', handle: 'julia.robotica', city: 'Campinas - SP', bio: 'Robótica com Arduino e impressão 3D. Dou oficinas de robótica para adultos iniciantes.', friends: 1430, mutual: 6, photo: photo('realys-u-julia') },
  { id: 'u29', social: { cls: 'gamer', sub: 'gamedev', extra: ['tech'] }, name: 'Vinícius Lopes', handle: 'vini.indie', city: 'Porto Alegre - RS', bio: 'Desenvolvo jogos indie na Unity. Meu primeiro jogo sai este ano na Steam 🎮', friends: 2210, mutual: 1, photo: photo('realys-u-vinicius') },
  { id: 'u30', social: { cls: 'gamer', sub: 'caster', extra: ['criador'] }, name: 'Henrique Batista', handle: 'henrique.caster', city: 'São Paulo - SP', bio: 'Narro campeonatos de e-sports de Valorant e CS. Grito de gol até em clutch.', friends: 4120, mutual: 8, photo: photo('realys-u-henrique') },
  { id: 'u31', social: { cls: 'gamer', sub: 'casual', extra: ['estilo'] }, name: 'Renan Carvalho', handle: 'renan.joga', city: 'Natal - RN', bio: 'Pai de dois e gamer nas horas vagas. Jogo com os amigos toda sexta à noite.', friends: 410, mutual: 9, photo: photo('realys-u-renan') },
  { id: 'u32', social: { cls: 'criador', sub: 'ugc', extra: ['influenciador'] }, name: 'Sofia Andrade', handle: 'sofia.ugc', city: 'Rio de Janeiro - RJ', bio: 'UGC creator: faço vídeos reais para marcas mostrarem seus produtos. Portfólio no meu perfil.', friends: 6740, mutual: 3, photo: photo('realys-u-sofia') },
  { id: 'u33', social: { cls: 'criador', sub: 'editor', extra: [] }, name: 'Matheus Pires', handle: 'matheus.edita', city: 'Goiânia - GO', bio: 'Editor de vídeo e videomaker. Edito para youtubers e faço thumbnails que dão clique.', friends: 1580, mutual: 2, photo: photo('realys-u-matheus') },
  { id: 'u34', social: { cls: 'criador', sub: 'lives', extra: ['gastronomia'] }, name: 'Dona Cida', handle: 'donacida.aovivo', city: 'Uberlândia - MG', bio: 'Faço lives ao vivo cozinhando receitas de vó. Toda quarta, 19h, aqui no Realys 🍲', friends: 8900, mutual: 4, photo: photo('realys-u-cida') },
  { id: 'u35', social: { cls: 'cenicas', sub: 'standup', extra: ['criador'] }, name: 'Eduardo Nascimento', handle: 'edu.standup', city: 'São Paulo - SP', bio: 'Comediante de stand-up. Agenda de shows no perfil e trechos novos toda semana.', friends: 7320, mutual: 5, photo: photo('realys-u-eduardo') },
  { id: 'u36', social: { cls: 'cenicas', sub: 'ator', extra: [] }, name: 'Renata Alves', handle: 'renata.atriz', city: 'Salvador - BA', bio: 'Atriz de teatro e cinema. Em cartaz com a peça "Maré Alta" no Teatro Castro Alves.', friends: 2650, mutual: 1, photo: photo('realys-u-renata') },
  { id: 'u37', social: { cls: 'escrita', sub: 'jornalista', extra: ['criador'] }, name: 'Clara Monteiro', handle: 'clara.reporter', city: 'Brasília - DF', bio: 'Jornalista. Checo notícia antes de publicar: aqui no Realys, só fato comprovado.', friends: 3480, mutual: 2, photo: photo('realys-u-clara') },
  { id: 'u38', social: { cls: 'escrita', sub: 'tradutor', extra: ['professor'] }, name: 'Otávio Reis', handle: 'otavio.libras', city: 'Belém - PA', bio: 'Intérprete de Libras em eventos e lives. Também dou aulas de Libras online.', friends: 1120, mutual: 3, photo: photo('realys-u-otavio') },
  { id: 'u39', social: { cls: 'moda', sub: 'estilista', extra: ['empreendedor'] }, name: 'Patrícia Souza', handle: 'paty.atelie', city: 'Fortaleza - CE', bio: 'Estilista. Costuro minha própria coleção de moda praia e vendo para todo o Brasil.', friends: 2890, mutual: 2, photo: photo('realys-u-patricia') },
  { id: 'u40', social: { cls: 'agro', sub: 'cafe', extra: ['empreendedor'] }, name: 'José Carlos Ribeiro', handle: 'zecarlos.cafe', city: 'Varginha - MG', bio: 'Cafeicultor há 30 anos no Sul de Minas. Café especial direto da fazenda ☕', friends: 760, mutual: 1, photo: photo('realys-u-zecarlos') },
  { id: 'u41', social: { cls: 'agro', sub: 'agrotech', extra: ['tech'] }, name: 'Aline Freitas', handle: 'aline.agro', city: 'Rio Verde - GO', bio: 'Agrônoma. Agricultura de precisão com drones e sensores: agro é tech!', friends: 1940, mutual: 2, photo: photo('realys-u-aline') },
  { id: 'u42', social: { cls: 'musico', sub: 'dj', extra: [] }, name: 'Kelly Martins', handle: 'djkelly', city: 'São Paulo - SP', bio: 'DJ de festas e casamentos. Agenda aberta para o fim do ano 🎧', friends: 5120, mutual: 6, photo: photo('realys-u-kelly') },
  { id: 'u43', social: { cls: 'artista', sub: 'grafite', extra: [] }, name: 'Samuel Costa', handle: 'samu.grafite', city: 'Curitiba - PR', bio: 'Grafiteiro. Pinto murais para comércios e escolas. Orçamento pelo Realys.', friends: 1360, mutual: 1, photo: photo('realys-u-samuel') },
  { id: 'u44', social: { cls: 'estilo', sub: 'pets', extra: [] }, name: 'Roberto Lima', handle: 'beto.e.os.dogs', city: 'Sorocaba - SP', bio: 'Tutor de 3 vira-latas resgatados. Adote, não compre 🐶', friends: 690, mutual: 4, photo: photo('realys-u-roberto') },
  { id: 'u45', social: { cls: 'empreendedor', sub: 'investidor', extra: ['criador'] }, name: 'Letícia Ramos', handle: 'leticia.investe', city: 'São Paulo - SP', bio: 'Investidora. Explico renda fixa e fundos imobiliários sem complicação.', friends: 4560, mutual: 3, photo: photo('realys-u-leticia') },
  { id: 'u46', social: { cls: 'professor', sub: 'pesquisador', extra: ['tech'] }, name: 'Dr. Marcelo Antunes', handle: 'marcelo.ciencia', city: 'São Carlos - SP', bio: 'Pesquisador de inteligência artificial na universidade. Divulgo ciência de um jeito simples.', friends: 2230, mutual: 1, photo: photo('realys-u-marcelo') },
  { id: 'u47', social: { cls: 'saude', sub: 'psico', extra: [] }, name: 'Tânia Moreira', handle: 'tania.psico', city: 'Londrina - PR', bio: 'Psicóloga. Atendo online por chamada de vídeo pela aba Serviços.', friends: 1670, mutual: 2, photo: photo('realys-u-tania') },
  { id: 'u48', social: { cls: 'fe', sub: 'missoes', extra: [] }, name: 'Pastor Daniel Freire', handle: 'pr.danielfreire', city: 'Manaus - AM', bio: 'Pastor e voluntário. Nosso projeto social leva cestas básicas a 200 famílias por mês 🙏', friends: 3340, mutual: 2, photo: photo('realys-u-daniel') },
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
