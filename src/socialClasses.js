// Perfis sociais do Realys: cada pessoa ganha uma CLASSE (ex.: Gamer) e uma SUBCLASSE (ex.: Streamer)
// a partir do que ela escreve sobre si no cadastro. Tudo roda no celular, sem servidor.
//
// Para criar uma classe nova: acrescente um item em CLASSES com ícone, cor, palavras e subclasses.
// Cada subclasse tem as próprias palavras; a palavra da subclasse também conta para a classe.

export const CLASSES = [
  {
    id: 'gamer',
    label: 'Gamer',
    icon: 'game-controller',
    color: '#7B6CF6',
    words: ['jogo', 'jogos', 'jogar', 'jogando', 'gamer', 'game', 'games', 'videogame', 'video game', 'gameplay', 'zerar', 'zerei', 'rank', 'ranqueada', 'clã', 'cla', 'guilda', 'nerd', 'geek'],
    subs: [
      { id: 'mobile', label: 'Mobile', words: ['free fire', 'freefire', 'ff', 'celular', 'mobile', 'clash', 'pubg mobile', 'roblox', 'brawl stars', 'candy crush'] },
      { id: 'pc', label: 'PC gamer', words: ['pc', 'computador', 'steam', 'setup', 'valorant', 'cs', 'counter strike', 'lol', 'league of legends', 'dota', 'minecraft'] },
      { id: 'console', label: 'Console', words: ['console', 'playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'switch', 'fifa', 'ea fc', 'gta'] },
      { id: 'esports', label: 'Pro de e-sports', words: ['e-sports', 'esports', 'esport', 'campeonato', 'competitivo', 'time profissional', 'pro player', 'proplayer', 'torneio', 'scrim'] },
      { id: 'streamer', label: 'Streamer', words: ['stream', 'streamer', 'live de jogo', 'faço live', 'faço lives', 'twitch', 'transmito', 'transmissão', 'kick'] },
      { id: 'retro', label: 'Retrô e colecionador', words: ['retrô', 'retro', 'colecionador', 'coleção de jogos', 'fliperama', 'arcade', 'super nintendo', 'mega drive', 'atari'] },
    ],
  },
  {
    id: 'criador',
    label: 'Criador de conteúdo',
    icon: 'videocam',
    color: '#E0548C',
    words: ['criador', 'criadora', 'conteúdo', 'conteudo', 'canal', 'vídeos', 'videos', 'gravo', 'edito', 'edição', 'roteiro', 'publico', 'posto', 'inscritos'],
    subs: [
      { id: 'youtuber', label: 'YouTuber', words: ['youtube', 'youtuber', 'canal no youtube', 'vlog', 'vlogueiro', 'inscritos'] },
      { id: 'curtos', label: 'Vídeos curtos', words: ['tiktok', 'reels', 'shorts', 'vídeo curto', 'videos curtos', 'trend', 'trends', 'dancinha'] },
      { id: 'podcaster', label: 'Podcaster', words: ['podcast', 'podcaster', 'videocast', 'entrevista', 'episódio'] },
      { id: 'humor', label: 'Humor', words: ['humor', 'comédia', 'comedia', 'esquete', 'meme', 'memes', 'piada', 'stand up', 'standup'] },
      { id: 'educativo', label: 'Conteúdo educativo', words: ['ensino na internet', 'dicas', 'tutorial', 'tutoriais', 'explico', 'divulgação científica', 'curiosidades'] },
      { id: 'escritor', label: 'Escritor e blogueiro', words: ['blog', 'blogueiro', 'blogueira', 'escrevo', 'escritor', 'escritora', 'textos', 'crônica', 'livro'] },
    ],
  },
  {
    id: 'influenciador',
    label: 'Influenciador',
    icon: 'sparkles',
    color: '#C2410C',
    words: ['influenciador', 'influenciadora', 'influencer', 'influencia', 'digital influencer', 'seguidores', 'publi', 'publis', 'parceria', 'parcerias', 'marcas', 'engajamento', 'mídia kit', 'media kit', 'recebidos'],
    subs: [
      { id: 'moda', label: 'Moda e beleza', words: ['moda', 'look', 'looks', 'beleza', 'maquiagem', 'make', 'skincare', 'cabelo', 'estilo', 'outfit'] },
      { id: 'fitness', label: 'Fitness', words: ['fitness', 'treino em casa', 'shape', 'dieta', 'vida saudável', 'saudavel', 'emagrecimento'] },
      { id: 'lifestyle', label: 'Lifestyle', words: ['lifestyle', 'rotina', 'dia a dia', 'casa', 'decoração', 'maternidade', 'família'] },
      { id: 'gastro', label: 'Gastronomia', words: ['receitas', 'gastronomia', 'comida', 'restaurantes', 'foodie', 'provando'] },
      { id: 'viagem', label: 'Viagem', words: ['viagem', 'viagens', 'viajar', 'mochilão', 'turismo', 'destinos'] },
      { id: 'tech', label: 'Tecnologia', words: ['celulares', 'review', 'reviews', 'unboxing', 'gadgets', 'tecnologia'] },
      { id: 'negocios', label: 'Negócios e finanças', words: ['finanças', 'investimentos', 'empreendedorismo', 'renda extra', 'marketing digital', 'vendas online'] },
    ],
  },
  {
    id: 'artista',
    label: 'Artista',
    icon: 'color-palette',
    color: '#B4529B',
    words: ['artista', 'arte', 'artes', 'obra', 'obras', 'criativo', 'criativa', 'exposição', 'ateliê', 'atelie'],
    subs: [
      { id: 'pintor', label: 'Pintor', words: ['pinto', 'pintor', 'pintora', 'pintura', 'tela', 'quadros', 'aquarela', 'óleo'] },
      { id: 'ilustrador', label: 'Ilustrador e desenhista', words: ['desenho', 'desenhista', 'ilustração', 'ilustrador', 'ilustradora', 'quadrinhos', 'mangá', 'anime', 'arte digital'] },
      { id: 'fotografo', label: 'Fotógrafo', words: ['fotografia', 'fotógrafo', 'fotografa', 'fotografo', 'ensaio', 'ensaios', 'câmera'] },
      { id: 'ator', label: 'Ator e atriz', words: ['ator', 'atriz', 'teatro', 'atuação', 'novela', 'cinema', 'dublagem', 'dublador'] },
      { id: 'danca', label: 'Dançarino', words: ['dança', 'danço', 'dancarino', 'dançarina', 'dançarino', 'balé', 'ballet', 'hip hop', 'forró', 'zouk', 'samba'] },
      { id: 'artesao', label: 'Artesão', words: ['artesanato', 'artesão', 'artesã', 'crochê', 'croche', 'bordado', 'cerâmica', 'escultura', 'tatuador', 'tatuagem'] },
    ],
  },
  {
    id: 'musico',
    label: 'Música',
    icon: 'musical-notes',
    color: '#2F74D0',
    words: ['música', 'musica', 'músico', 'musico', 'banda', 'show', 'shows', 'palco', 'canto', 'cantar', 'cantor', 'cantora'],
    subs: [
      { id: 'cantor', label: 'Cantor', words: ['canto', 'cantar', 'cantor', 'cantora', 'vocal', 'voz', 'sertanejo', 'pagode', 'gospel', 'mpb', 'funk', 'rap', 'trap'] },
      { id: 'instrumentista', label: 'Instrumentista', words: ['toco', 'violão', 'violao', 'guitarra', 'bateria', 'teclado', 'piano', 'baixo', 'sax', 'violino', 'cavaquinho'] },
      { id: 'dj', label: 'DJ', words: ['dj', 'set', 'eletrônica', 'balada', 'mixagem'] },
      { id: 'produtor', label: 'Produtor musical', words: ['produtor musical', 'beat', 'beats', 'beatmaker', 'estúdio', 'gravação', 'mixo'] },
      { id: 'compositor', label: 'Compositor', words: ['compositor', 'compositora', 'componho', 'composição', 'letras'] },
      { id: 'louvor', label: 'Ministro de louvor', words: ['louvor', 'ministério de louvor', 'adoração', 'worship', 'coral', 'igreja'] },
    ],
  },
  {
    id: 'atleta',
    label: 'Atleta',
    icon: 'trophy',
    color: '#C99A0E',
    words: ['atleta', 'competição', 'competicoes', 'federado', 'federada', 'profissional do esporte', 'seleção', 'clube', 'medalha', 'medalhas', 'campeão', 'campeã', 'pódio'],
    subs: [
      { id: 'futebol', label: 'Futebol', words: ['futebol', 'jogador de futebol', 'goleiro', 'atacante', 'zagueiro', 'futsal', 'base do'] },
      { id: 'lutas', label: 'Lutas', words: ['jiu-jitsu', 'jiu jitsu', 'jiujitsu', 'muay thai', 'boxe', 'mma', 'judô', 'judo', 'karatê', 'taekwondo', 'faixa preta', 'lutador'] },
      { id: 'corrida', label: 'Corrida e atletismo', words: ['maratona', 'atletismo', 'velocista', 'meia maratona', 'ultramaratona'] },
      { id: 'quadra', label: 'Esportes de quadra', words: ['vôlei', 'volei', 'basquete', 'handebol', 'tênis', 'tenis', 'beach tennis'] },
      { id: 'aquaticos', label: 'Esportes aquáticos', words: ['natação', 'nadador', 'nadadora', 'surf', 'surfista', 'polo aquático'] },
      { id: 'ciclismo', label: 'Ciclismo', words: ['ciclista', 'ciclismo', 'mountain bike', 'mtb', 'speed'] },
    ],
  },
  {
    id: 'esportista',
    label: 'Esportista',
    icon: 'bicycle',
    color: '#1E9E63',
    words: ['esporte', 'esportes', 'treino', 'treinar', 'treinando', 'academia', 'malhar', 'malho', 'pedal', 'corro', 'correr', 'caminhada', 'ativo', 'ativa', 'saúde'],
    subs: [
      { id: 'academia', label: 'Academia', words: ['academia', 'musculação', 'malhar', 'malho', 'crossfit', 'funcional', 'marombeiro'] },
      { id: 'corrida', label: 'Corrida de rua', words: ['corro', 'correr', 'corrida', 'corredor', 'corredora', '5 km', '10 km', 'pace'] },
      { id: 'pedal', label: 'Pedal', words: ['pedal', 'bike', 'bicicleta', 'pedalar', 'pedalando'] },
      { id: 'trilha', label: 'Trilha e aventura', words: ['trilha', 'trilhas', 'escalada', 'montanha', 'acampar', 'camping', 'rapel'] },
      { id: 'pelada', label: 'Futebol de fim de semana', words: ['pelada', 'racha', 'fut de domingo', 'futebol com os amigos', 'society'] },
      { id: 'bemestar', label: 'Yoga e bem-estar', words: ['yoga', 'ioga', 'pilates', 'meditação', 'alongamento', 'caminhada'] },
    ],
  },
  {
    id: 'estudante',
    label: 'Estudante',
    icon: 'school',
    color: '#0E8FA3',
    words: ['estudante', 'estudo', 'estudando', 'curso', 'cursando', 'aluno', 'aluna', 'aprender', 'formando', 'formanda'],
    subs: [
      { id: 'faculdade', label: 'Universitário', words: ['faculdade', 'universidade', 'graduação', 'universitário', 'universitária', 'semestre', 'tcc', 'calouro', 'caloura'] },
      { id: 'tecnico', label: 'Curso técnico', words: ['técnico em', 'curso técnico', 'senai', 'etec', 'senac', 'profissionalizante'] },
      { id: 'vestibular', label: 'Vestibular e Enem', words: ['enem', 'vestibular', 'cursinho', 'pré-vestibular'] },
      { id: 'concurso', label: 'Concurseiro', words: ['concurso', 'concursos', 'concurseiro', 'concurseira', 'edital', 'oab'] },
      { id: 'pos', label: 'Pós e mestrado', words: ['pós', 'pós-graduação', 'mestrado', 'doutorado', 'mba', 'pesquisa'] },
      { id: 'idiomas', label: 'Idiomas', words: ['inglês', 'espanhol', 'idioma', 'idiomas', 'intercâmbio', 'francês'] },
    ],
  },
  {
    id: 'professor',
    label: 'Professor',
    icon: 'easel',
    color: '#6B4FD8',
    words: ['professor', 'professora', 'prof', 'ensino', 'dou aula', 'dou aulas', 'leciono', 'educador', 'educadora', 'pedagogo', 'pedagoga', 'mestre', 'instrutor', 'instrutora'],
    subs: [
      { id: 'infantil', label: 'Educação infantil', words: ['educação infantil', 'creche', 'alfabetização', 'crianças pequenas', 'pedagogia'] },
      { id: 'escola', label: 'Ensino fundamental e médio', words: ['escola', 'ensino médio', 'ensino fundamental', 'matemática', 'português', 'história', 'química', 'física', 'biologia'] },
      { id: 'universidade', label: 'Universitário', words: ['universidade', 'faculdade', 'docente', 'orientador', 'pesquisador'] },
      { id: 'idiomas', label: 'Idiomas', words: ['inglês', 'espanhol', 'libras', 'idiomas', 'conversação'] },
      { id: 'particular', label: 'Aulas particulares e online', words: ['aula particular', 'aulas particulares', 'reforço', 'aula online', 'aulas online', 'ao vivo', 'mentoria'] },
      { id: 'instrutor', label: 'Instrutor', words: ['instrutor', 'instrutora', 'personal', 'autoescola', 'treinador', 'treinadora', 'técnico do time'] },
    ],
  },
  {
    id: 'empreendedor',
    label: 'Empreendedor',
    icon: 'briefcase',
    color: '#A8790A',
    words: ['empreendedor', 'empreendedora', 'empreendo', 'meu negócio', 'minha loja', 'dono', 'dona', 'empresário', 'empresária', 'vendo', 'vendas', 'cnpj', 'mei'],
    subs: [
      { id: 'mei', label: 'MEI e autônomo', words: ['mei', 'autônomo', 'autônoma', 'por conta própria', 'freelancer', 'freela'] },
      { id: 'comercio', label: 'Comércio e loja', words: ['loja', 'comércio', 'mercado', 'revendo', 'revenda', 'boutique'] },
      { id: 'food', label: 'Food e confeitaria', words: ['food truck', 'confeiteira', 'confeiteiro', 'bolos', 'doces', 'marmita', 'lanchonete', 'restaurante'] },
      { id: 'online', label: 'Vendas online', words: ['loja virtual', 'e-commerce', 'ecommerce', 'vendo online', 'dropshipping'] },
      { id: 'startup', label: 'Startup e tecnologia', words: ['startup', 'aplicativo', 'app', 'saas', 'inovação'] },
    ],
  },
  {
    id: 'tech',
    label: 'Tecnologia',
    icon: 'hardware-chip',
    color: '#2563EB',
    words: ['programador', 'programadora', 'programo', 'programação', 'desenvolvedor', 'desenvolvedora', 'dev', 'ti', 'sistemas', 'software', 'código', 'tecnologia'],
    subs: [
      { id: 'dev', label: 'Desenvolvedor', words: ['programador', 'desenvolvedor', 'dev', 'javascript', 'python', 'java', 'react', 'código', 'analista de sistemas'] },
      { id: 'design', label: 'Designer', words: ['designer', 'ux', 'ui', 'figma', 'design gráfico', 'identidade visual'] },
      { id: 'dados', label: 'Dados e IA', words: ['dados', 'inteligência artificial', 'ia', 'machine learning', 'ciência de dados', 'analista de dados'] },
      { id: 'suporte', label: 'Suporte e redes', words: ['suporte', 'redes', 'infraestrutura', 'manutenção de computador', 'help desk'] },
      { id: 'robotica', label: 'Robótica e maker', words: ['robótica', 'arduino', 'maker', 'impressão 3d', 'eletrônica'] },
    ],
  },
  {
    id: 'saude',
    label: 'Saúde',
    icon: 'medkit',
    color: '#D9534F',
    words: ['saúde', 'médico', 'médica', 'enfermeiro', 'enfermeira', 'hospital', 'clínica', 'paciente', 'pacientes', 'plantão'],
    subs: [
      { id: 'medico', label: 'Médico', words: ['médico', 'médica', 'medicina', 'residência', 'plantão'] },
      { id: 'enfermagem', label: 'Enfermagem', words: ['enfermeiro', 'enfermeira', 'técnico de enfermagem', 'técnica de enfermagem', 'enfermagem'] },
      { id: 'fisio', label: 'Fisioterapia', words: ['fisioterapeuta', 'fisioterapia', 'reabilitação'] },
      { id: 'psico', label: 'Psicologia', words: ['psicólogo', 'psicóloga', 'psicologia', 'terapeuta'] },
      { id: 'nutri', label: 'Nutrição', words: ['nutricionista', 'nutrição'] },
      { id: 'dentista', label: 'Odontologia', words: ['dentista', 'odontologia', 'ortodontia'] },
    ],
  },
  {
    id: 'servicos',
    label: 'Prestador de serviços',
    icon: 'construct',
    color: '#8A6A2E',
    words: ['trabalho com', 'faço serviço', 'serviços', 'orçamento', 'atendo', 'conserto'],
    subs: [
      { id: 'eletricista', label: 'Eletricista', words: ['eletricista', 'elétrica', 'instalação elétrica', 'quadro de luz'] },
      { id: 'reforma', label: 'Reforma e construção', words: ['pedreiro', 'pintor de parede', 'encanador', 'reforma', 'construção', 'gesseiro', 'marceneiro'] },
      { id: 'transporte', label: 'Motorista e entregas', words: ['motorista', 'motoboy', 'entregador', 'entregas', 'uber', 'frete', 'aplicativo de transporte'] },
      { id: 'beleza', label: 'Beleza', words: ['cabeleireiro', 'cabeleireira', 'manicure', 'barbeiro', 'barbearia', 'designer de sobrancelha', 'esteticista'] },
      { id: 'casa', label: 'Casa e limpeza', words: ['diarista', 'faxina', 'limpeza', 'jardineiro', 'babá', 'cuidador', 'cuidadora'] },
      { id: 'mecanico', label: 'Mecânico', words: ['mecânico', 'mecânica de carro', 'oficina', 'funilaria', 'auto elétrica'] },
    ],
  },
  {
    id: 'gastronomia',
    label: 'Gastronomia',
    icon: 'restaurant',
    color: '#E07B1F',
    words: ['cozinhar', 'cozinho', 'cozinha', 'receita', 'receitas', 'chef', 'churrasco', 'gastronomia', 'comer bem'],
    subs: [
      { id: 'chef', label: 'Chef e cozinheiro', words: ['chef', 'cozinheiro', 'cozinheira', 'gastronomia', 'restaurante'] },
      { id: 'confeitaria', label: 'Confeitaria', words: ['confeitaria', 'confeiteira', 'bolo', 'bolos', 'doces', 'brigadeiro'] },
      { id: 'churrasqueiro', label: 'Churrasqueiro', words: ['churrasco', 'churrasqueiro', 'parrilla', 'carne'] },
      { id: 'foodie', label: 'Foodie', words: ['comer bem', 'provar', 'restaurantes', 'hamburguer', 'pizza', 'café', 'cafés'] },
      { id: 'bartender', label: 'Bartender e barista', words: ['bartender', 'drinks', 'drink', 'barista', 'coquetel'] },
    ],
  },
  {
    id: 'fe',
    label: 'Fé e louvor',
    icon: 'heart-circle',
    color: '#C99A0E',
    words: ['deus', 'jesus', 'fé', 'igreja', 'cristão', 'cristã', 'evangélico', 'evangélica', 'católico', 'católica', 'oração', 'gratidão', 'glória'],
    subs: [
      { id: 'lideranca', label: 'Pastor e liderança', words: ['pastor', 'pastora', 'padre', 'líder de célula', 'liderança', 'presbítero', 'diácono'] },
      { id: 'louvor', label: 'Louvor', words: ['louvor', 'adoração', 'ministério de louvor', 'coral', 'gospel'] },
      { id: 'missoes', label: 'Missões e ação social', words: ['missionário', 'missionária', 'missões', 'voluntário', 'voluntária', 'ação social', 'doação'] },
      { id: 'jovens', label: 'Grupo de jovens', words: ['jovens', 'mocidade', 'célula', 'retiro', 'acampamento'] },
    ],
  },
  {
    id: 'viajante',
    label: 'Viajante',
    icon: 'airplane',
    color: '#0EA5A4',
    words: ['viajar', 'viagem', 'viagens', 'viajante', 'conhecer lugares', 'mochila', 'mochileiro', 'turismo', 'praia', 'praias'],
    subs: [
      { id: 'mochileiro', label: 'Mochileiro', words: ['mochila', 'mochileiro', 'mochileira', 'mochilão', 'hostel'] },
      { id: 'praia', label: 'Praia e sol', words: ['praia', 'praias', 'litoral', 'mar', 'nordeste'] },
      { id: 'estrada', label: 'Estrada e moto', words: ['estrada', 'motoqueiro', 'motociclista', 'road trip', 'motorhome'] },
      { id: 'internacional', label: 'Viagens internacionais', words: ['exterior', 'europa', 'eua', 'internacional', 'intercâmbio'] },
    ],
  },
];

export const DEFAULT_CLASS = { id: 'membro', label: 'Membro Realys', icon: 'person-circle', color: '#A8790A', subs: [] };

// Perguntas rápidas do questionário (opcionais). Cada resposta soma palavras à descrição.
export const QUIZ_HOBBIES = [
  { id: 'jogar', label: 'Jogar', icon: 'game-controller-outline', words: 'jogar games' },
  { id: 'gravar', label: 'Gravar vídeos', icon: 'videocam-outline', words: 'criador conteúdo vídeos' },
  { id: 'redes', label: 'Bombar nas redes', icon: 'sparkles-outline', words: 'influenciador seguidores parcerias' },
  { id: 'cantar', label: 'Cantar ou tocar', icon: 'musical-notes-outline', words: 'música cantar toco' },
  { id: 'arte', label: 'Desenhar ou pintar', icon: 'color-palette-outline', words: 'arte desenho pintura' },
  { id: 'dancar', label: 'Dançar', icon: 'body-outline', words: 'dança' },
  { id: 'treinar', label: 'Treinar', icon: 'barbell-outline', words: 'treino academia' },
  { id: 'competir', label: 'Competir', icon: 'trophy-outline', words: 'atleta competição' },
  { id: 'estudar', label: 'Estudar', icon: 'book-outline', words: 'estudo aprender' },
  { id: 'ensinar', label: 'Ensinar', icon: 'easel-outline', words: 'dou aulas ensino' },
  { id: 'cozinhar', label: 'Cozinhar', icon: 'restaurant-outline', words: 'cozinhar receitas' },
  { id: 'viajar', label: 'Viajar', icon: 'airplane-outline', words: 'viajar viagem' },
  { id: 'empreender', label: 'Empreender', icon: 'briefcase-outline', words: 'empreendedor meu negócio' },
  { id: 'programar', label: 'Programar', icon: 'code-slash-outline', words: 'programação tecnologia' },
  { id: 'louvar', label: 'Louvar e servir', icon: 'heart-outline', words: 'fé igreja louvor' },
];

const norm = (t) =>
  ` ${String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

// Conta quantas palavras da lista aparecem no texto (palavra inteira, sem acento).
// Expressões com mais de uma palavra valem mais, porque são mais específicas.
function hits(text, words) {
  let n = 0;
  const found = [];
  const seen = new Set();
  for (const w of words) {
    const k = norm(w);
    if (seen.has(k)) continue; // "vídeos" e "videos" contam uma vez só
    seen.add(k);
    if (k.trim() && text.includes(k)) {
      n += k.trim().includes(' ') ? 2 : 1;
      found.push(w);
    }
  }
  return { n, found };
}

export const classById = (id) => CLASSES.find((c) => c.id === id) || DEFAULT_CLASS;
export const subOf = (cls, subId) => (cls.subs || []).find((s) => s.id === subId) || null;

// Lê a descrição e devolve a classe principal, a subclasse e até duas classes secundárias.
// Ex.: "faço live de Free Fire na Twitch" → Gamer · Streamer.
export function classifyProfile(description, hobbies = []) {
  const extra = QUIZ_HOBBIES.filter((h) => hobbies.includes(h.id)).map((h) => h.words).join(' ');
  const text = norm(`${description || ''} ${extra}`);
  const ranked = CLASSES.map((c) => {
    const base = hits(text, c.words);
    const subs = c.subs
      .map((s) => ({ s, ...hits(text, s.words) }))
      .sort((a, b) => b.n - a.n);
    const best = subs[0] && subs[0].n ? subs[0] : null;
    return { c, score: base.n + (best ? best.n : 0), sub: best ? best.s : null, found: [...base.found, ...(best ? best.found : [])] };
  })
    // Uma palavra solta da subclasse (ex.: "família") não define o perfil sozinha.
    .filter((r) => r.score >= 2 || (r.score > 0 && r.found.length && hits(text, r.c.words).n > 0))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return { cls: DEFAULT_CLASS.id, sub: null, extra: [], why: [], confidence: 0 };
  const top = ranked[0];
  const second = ranked[1] ? ranked[1].score : 0;
  return {
    cls: top.c.id,
    sub: top.sub ? top.sub.id : null,
    // Outras classes fortes viram selos extras (ex.: Gamer que também é Criador de conteúdo).
    extra: ranked.slice(1, 3).filter((r) => r.score >= Math.max(2, top.score * 0.5)).map((r) => r.c.id),
    why: [...new Set(top.found)].slice(0, 4),
    confidence: Math.min(1, (top.score - second * 0.5) / 4),
  };
}

// Texto curto do perfil: "Gamer · Streamer".
export function socialLabel(social) {
  if (!social || !social.cls) return null;
  const c = classById(social.cls);
  const s = subOf(c, social.sub);
  return s ? `${c.label} · ${s.label}` : c.label;
}

// Palavras que a busca de pessoas entende para cada perfil (ex.: "gamer", "streamer").
export function socialSearchText(social) {
  if (!social) return '';
  const c = classById(social.cls);
  const s = subOf(c, social.sub);
  const extras = (social.extra || []).map((id) => classById(id).label);
  return [c.label, s ? s.label : '', ...extras].join(' ');
}
