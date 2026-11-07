// Lives do Realys por assunto e por quem transmite.
// Qualquer perfil abre live: usuário, empresa, artista, prestador de serviço e fornecedor.
// A live aparece na aba Lives (no assunto certo) e no perfil de quem está transmitindo,
// e tocar em quem transmite abre o perfil dele.

// Classes das lives, cada uma com as suas subclasses. A ordem é a do destaque na tela
// (o que mais engaja vem primeiro). "shop" liga a classe aos produtos da loja (ex.: Gamers → Games).
// O Realys é só para maiores de 18: nenhuma classe é de conteúdo infantil.
const S = (key, label) => ({ key, label });
export const LIVE_CATS = [
  {
    key: 'gamers', label: 'Gamers', icon: 'game-controller-outline', tint: '#7B6CF6', title: 'Gamers ao vivo', hint: 'Partidas, campeonatos e gameplay',
    shop: { label: 'Games na loja', sector: 'eletronicos', groups: ['games'], go: { tab: 'eletronicos', group: 'games' } },
    subs: [S('campeonatos', 'Campeonatos e eSports'), S('fps', 'Tiro e FPS'), S('battle', 'Battle Royale'), S('futebol', 'Futebol virtual'), S('moba', 'MOBA'), S('rpg', 'RPG e aventura'), S('corrida', 'Corrida'), S('luta', 'Luta'), S('mobile', 'Jogos de celular'), S('construcao', 'Construção e sobrevivência'), S('estrategia', 'Estratégia'), S('retro', 'Retrô e clássicos'), S('speedrun', 'Speedrun'), S('lancamentos', 'Lançamentos e reviews'), S('setup', 'Setup e hardware gamer')],
  },
  {
    key: 'artistas', label: 'Artistas', icon: 'mic-outline', tint: '#C2417A', title: 'Artistas ao vivo', hint: 'Shows, ensaios e bate-papo com artistas',
    shop: { label: 'Instrumentos e áudio', sector: 'musica', groups: [], go: { tab: 'musica' } },
    subs: [S('gospel', 'Gospel'), S('sertanejo', 'Sertanejo'), S('pagode', 'Pagode e samba'), S('funk', 'Funk'), S('rap', 'Rap e hip hop'), S('rock', 'Rock'), S('mpb', 'MPB'), S('eletronica', 'Eletrônica e DJs'), S('forro', 'Forró e piseiro'), S('pop', 'Pop'), S('instrumental', 'Instrumental'), S('pedidos', 'Pedidos dos fãs'), S('ensaios', 'Ensaios e bastidores')],
  },
  {
    key: 'compras', label: 'Compras ao vivo', icon: 'bag-handle-outline', tint: '#A8790A', title: 'Compras ao vivo', hint: 'Lojas, restaurantes e fornecedores mostrando produtos',
    subs: [S('lancamentos', 'Lançamentos das lojas'), S('moda', 'Moda'), S('eletronicos', 'Eletrônicos'), S('beleza', 'Beleza'), S('casa', 'Casa e decoração'), S('restaurantes', 'Restaurantes e delivery'), S('mercado', 'Mercado'), S('imoveis', 'Imóveis'), S('veiculos', 'Veículos'), S('atacado', 'Atacado e fornecedores')],
  },
  {
    key: 'esportes', label: 'Esportes', icon: 'football-outline', tint: '#1E9E63', title: 'Esportes ao vivo', hint: 'Várzea, campeonatos locais e resenha (só com direito de transmissão)',
    shop: { label: 'Esporte na loja', sector: 'esporte', groups: [], go: { tab: 'esporte' } },
    subs: [S('futebol', 'Futebol amador e várzea'), S('lutas', 'Lutas e artes marciais'), S('corrida', 'Corrida e maratona'), S('ciclismo', 'Ciclismo'), S('volei', 'Vôlei e basquete'), S('radicais', 'Skate e radicais'), S('pesca', 'Pesca'), S('xadrez', 'Xadrez e jogos de mesa'), S('resenha', 'Resenha esportiva')],
  },
  {
    key: 'saude', label: 'Saúde e bem-estar', icon: 'fitness-outline', tint: '#E0663A', title: 'Saúde e bem-estar ao vivo', hint: 'Treinos, yoga, nutrição e relaxamento',
    subs: [S('treino', 'Treino em casa'), S('musculacao', 'Musculação'), S('yoga', 'Yoga e pilates'), S('danca', 'Dança fitness'), S('nutricao', 'Nutrição'), S('meditacao', 'Meditação e relaxamento')],
  },
  {
    key: 'fe', label: 'Fé', icon: 'book-outline', tint: '#2F74D0', title: 'Fé ao vivo', hint: 'Cultos, missas, louvor e oração',
    subs: [S('cultos', 'Cultos ao vivo'), S('missas', 'Missas'), S('louvor', 'Louvor e adoração'), S('estudo', 'Estudo bíblico'), S('oracao', 'Oração e intercessão'), S('testemunhos', 'Testemunhos'), S('jovens', 'Encontros de jovens')],
  },
  {
    key: 'cursos', label: 'Cursos', icon: 'school-outline', tint: '#2F74D0', title: 'Cursos e aulas ao vivo', hint: 'Aulas, oficinas e treinamentos',
    subs: [S('enem', 'Enem e vestibular'), S('concursos', 'Concursos'), S('idiomas', 'Idiomas'), S('profissionalizantes', 'Profissionalizantes'), S('oficinas', 'Oficinas práticas'), S('financas', 'Finanças pessoais'), S('musica', 'Aulas de música'), S('informatica', 'Informática')],
  },
  {
    key: 'faculdades', label: 'Faculdades', icon: 'library-outline', tint: '#1F2A44', title: 'Faculdades ao vivo', hint: 'Aulas abertas e eventos de faculdades',
    subs: [S('aulas', 'Aulas abertas'), S('palestras', 'Palestras'), S('vestibular', 'Vestibular e bolsas'), S('pos', 'Pós e MBA'), S('eventos', 'Eventos acadêmicos')],
  },
  {
    key: 'tecnologia', label: 'Tecnologia', icon: 'hardware-chip-outline', tint: '#2F74D0', title: 'Tecnologia ao vivo', hint: 'IA, apps, robótica e novidades',
    shop: { label: 'Eletrônicos na loja', sector: 'eletronicos', groups: ['informatica', 'celulares'], go: { tab: 'eletronicos', group: 'informatica' } },
    subs: [S('ia', 'Inteligência artificial'), S('programacao', 'Programação'), S('pc', 'Montagem de PC'), S('celulares', 'Celulares e reviews'), S('robotica', 'Robótica'), S('seguranca', 'Segurança digital'), S('apps', 'Apps e lançamentos')],
  },
  {
    key: 'agro', label: 'Agro', icon: 'leaf-outline', tint: '#3C8D2F', title: 'Agro ao vivo', hint: 'Leilões, cotações e o campo em tempo real',
    subs: [S('leiloes', 'Leilões de gado'), S('pecuaria', 'Pecuária'), S('cafe', 'Café'), S('hortifruti', 'Hortifrúti'), S('graos', 'Soja e milho'), S('maquinas', 'Máquinas e tecnologia no campo'), S('cotacoes', 'Cotações e clima')],
  },
  {
    key: 'negocios', label: 'Negócios', icon: 'briefcase-outline', tint: '#A8790A', title: 'Negócios ao vivo', hint: 'Empreender, vender mais e fechar parcerias',
    subs: [S('rodadas', 'Rodadas de negócios'), S('mei', 'MEI e pequenos negócios'), S('marketing', 'Marketing e vendas'), S('financas', 'Finanças da empresa'), S('franquias', 'Franquias'), S('lideranca', 'Liderança e RH')],
  },
  {
    key: 'culinaria', label: 'Culinária', icon: 'restaurant-outline', tint: '#D9534F', title: 'Culinária ao vivo', hint: 'Receitas, churrasco e confeitaria',
    subs: [S('receitas', 'Receitas do dia a dia'), S('churrasco', 'Churrasco'), S('confeitaria', 'Doces e confeitaria'), S('drinks', 'Drinks e cafés'), S('saudavel', 'Comida saudável'), S('regional', 'Cozinha regional')],
  },
  {
    key: 'beleza', label: 'Beleza e moda', icon: 'rose-outline', tint: '#C2417A', title: 'Beleza e moda ao vivo', hint: 'Maquiagem, cabelo, unhas e looks',
    shop: { label: 'Beleza na loja', sector: 'beleza', groups: [], go: { tab: 'beleza' } },
    subs: [S('maquiagem', 'Maquiagem'), S('cabelo', 'Cabelo'), S('unhas', 'Unhas'), S('barbearia', 'Barbearia'), S('moda', 'Moda e looks'), S('skincare', 'Cuidados com a pele')],
  },
  {
    key: 'arte', label: 'Arte e criação', icon: 'brush-outline', tint: '#7B6CF6', title: 'Arte e criação ao vivo', hint: 'Desenho, artesanato, tatuagem e fotografia',
    subs: [S('desenho', 'Desenho e pintura'), S('artesanato', 'Artesanato'), S('tatuagem', 'Tatuagem'), S('fotografia', 'Fotografia e vídeo'), S('design', 'Design'), S('costura', 'Costura')],
  },
  {
    key: 'humor', label: 'Humor', icon: 'happy-outline', tint: '#E0A11B', title: 'Humor ao vivo', hint: 'Stand-up, react e desafios',
    subs: [S('standup', 'Stand-up'), S('react', 'React e comentários'), S('desafios', 'Desafios'), S('papo', 'Bate-papo descontraído')],
  },
  {
    key: 'podcasts', label: 'Podcasts', icon: 'headset-outline', tint: '#1F2A44', title: 'Podcasts ao vivo', hint: 'Conversas e entrevistas',
    subs: [S('entrevistas', 'Entrevistas'), S('negocios', 'Negócios'), S('fe', 'Fé e família'), S('esportes', 'Esportes'), S('cotidiano', 'Vida e cotidiano')],
  },
  {
    key: 'noticias', label: 'Noticiários', icon: 'newspaper-outline', tint: '#1F2A44', title: 'Noticiários ao vivo', hint: 'Só canais de notícia verificados',
    subs: [S('jornal', 'Jornal do dia'), S('cidade', 'Sua cidade'), S('economia', 'Economia'), S('agro', 'Agro'), S('esportes', 'Esportes'), S('politica', 'Política')],
  },
  {
    key: 'noite', label: 'Noite e eventos', icon: 'musical-notes-outline', tint: '#6C5CE7', title: 'Noite e eventos', hint: 'Festas, shows e baladas',
    subs: [S('festas', 'Festas e baladas'), S('shows', 'Shows das casas'), S('esquenta', 'Esquenta'), S('bares', 'Bares com música ao vivo'), S('eventos', 'Eventos e feiras')],
  },
  {
    key: 'comunidade', label: 'Comunidade', icon: 'people-outline', tint: '#A8790A', title: 'Comunidade ao vivo', hint: 'Bate-papo de quem está no Realys',
    subs: [S('papo', 'Bate-papo'), S('dicas', 'Dicas'), S('bairro', 'Meu bairro'), S('pets', 'Pets'), S('viagens', 'Viagens e passeios')],
  },
];
export const catOf = (k) => LIVE_CATS.find((c) => c.key === k) || LIVE_CATS[LIVE_CATS.length - 1];
export const subOf = (cat, sub) => (catOf(cat).subs || []).find((s) => s.key === sub) || null;

// Engajamento: quem assiste, quem manda presente e quem curte conta para o "Em alta".
export const liveScore = (l) => (l.viewers || 0) + (l.gifts || 0) * 40 + (l.likes || 0) * 0.5;

// Missão do dia: assistir lives de uma classe por 3 minutos dá pontos Realys (uma vez por dia e por classe).
export const LIVE_MISSION_SECS = 180;
export const LIVE_MISSION_POINTS = 10;
export const missionId = (cat, d = new Date()) => `live-${cat}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const HOST_TYPES = {
  usuario: { label: 'Usuário', icon: 'person-outline', color: '#2F74D0' },
  empresa: { label: 'Empresa', icon: 'storefront-outline', color: '#A8790A' },
  artista: { label: 'Artista', icon: 'mic-outline', color: '#7B6CF6' },
  prestador: { label: 'Prestador', icon: 'construct-outline', color: '#1E9E63' },
  fornecedor: { label: 'Fornecedor', icon: 'cube-outline', color: '#C77D12' },
};

// Como quem abre a live pode aparecer, conforme os perfis da conta.
export function hostOptions(state) {
  const roles = (state.user && state.user.roles) || ['cliente'];
  const name = (state.user && state.user.name) || 'Você';
  const opts = [{ type: 'usuario', name, id: 'me' }];
  if (roles.includes('empresa')) {
    const s = (state.stores || []).find((x) => x.id === 'e1');
    opts.push({ type: 'empresa', name: s ? s.name : 'Minha empresa', id: 'e1' });
  }
  if (roles.includes('prestador')) opts.push({ type: 'prestador', name: (state.myProvider && state.myProvider.name) || name, id: 'me' });
  if (roles.includes('fornecedor')) opts.push({ type: 'fornecedor', name: 'Distribuidora Real Alimentos', id: 's1' });
  opts.push({ type: 'artista', name: `${name} (Estúdio)`, id: 'me' });
  return opts;
}

// Perfil padrão de quem transmite, pelo perfil que está em uso no app.
export function defaultHost(state) {
  const opts = hostOptions(state);
  const want = { empresa: 'empresa', prestador: 'prestador', fornecedor: 'fornecedor' }[state.activeRole];
  return opts.find((o) => o.type === want) || opts[0];
}

// Lives de quem tem este perfil (para o selo "Ao vivo agora" nos perfis).
export const livesOf = (list, hostType, hostId) => list.filter((l) => l.hostType === hostType && l.hostId === hostId);
