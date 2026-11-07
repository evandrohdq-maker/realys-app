// Perfis sociais do Realys: cada pessoa ganha uma CLASSE (ex.: Gamer) e uma SUBCLASSE (ex.: Streamer)
// a partir do que ela escreve sobre si no cadastro. Tudo roda no celular, sem servidor.
//
// Para criar uma classe nova: acrescente um item em CLASSES com ícone, cor, palavras e subclasses.
// Cada subclasse tem as próprias palavras; a palavra da subclasse também conta para a classe.

export const CLASSES = [
  {
    id: 'musico',
    label: 'Música',
    icon: 'musical-notes',
    color: '#2F74D0',
    words: ['música', 'musica', 'músico', 'musico', 'banda', 'show', 'shows', 'palco', 'canto', 'cantar', 'cantor', 'cantora', 'dj', 'rapper', 'instrumentista', 'baterista', 'guitarrista'],
    subs: [
      { id: 'cantor', label: 'Cantor', words: ['canto', 'cantar', 'cantor', 'cantora', 'vocal', 'voz', 'sertanejo', 'pagode', 'gospel', 'mpb', 'funk', 'forró', 'pop', 'rock'] },
      { id: 'instrumentista', label: 'Instrumentista', words: ['toco', 'violão', 'violao', 'guitarra', 'bateria', 'teclado', 'piano', 'baixo', 'sax', 'violino', 'cavaquinho', 'percussão', 'sanfona'] },
      { id: 'rap', label: 'Rap, trap e MC', words: ['rap', 'rapper', 'trap', 'mc', 'freestyle', 'batalha de rima', 'rima', 'hip hop'] },
      { id: 'dj', label: 'DJ', words: ['dj', 'set', 'eletrônica', 'balada', 'mixagem'] },
      { id: 'produtor', label: 'Produtor musical', words: ['produtor musical', 'beat', 'beats', 'beatmaker', 'estúdio', 'gravação', 'mixo'] },
      { id: 'compositor', label: 'Compositor', words: ['compositor', 'compositora', 'componho', 'composição', 'letras', 'letrista'] },
      { id: 'banda', label: 'Banda ou grupo', words: ['banda', 'grupo musical', 'minha banda', 'nossa banda', 'dupla sertaneja', 'trio'] },
      { id: 'louvor', label: 'Ministro de louvor', words: ['louvor', 'ministério de louvor', 'adoração', 'worship', 'coral', 'igreja'] },
      { id: 'som', label: 'Técnico de som', words: ['técnico de som', 'tecnico de som', 'mesa de som', 'sonorização', 'roadie', 'masterização'] },
    ],
  },
  {
    id: 'artista',
    label: 'Artes visuais',
    icon: 'color-palette',
    color: '#B4529B',
    words: ['artista', 'arte', 'artes', 'obra', 'obras', 'criativo', 'criativa', 'exposição', 'ateliê', 'atelie', 'artes visuais', 'grafiteiro', 'grafiteira', 'tatuador', 'tatuadora', 'pintora', 'pintor', 'escultor', 'escultora', 'fotógrafo', 'fotógrafa', 'ilustradora', 'ilustrador', 'artesã', 'artesão'],
    subs: [
      { id: 'pintor', label: 'Pintor', words: ['pinto', 'pintor', 'pintora', 'pintura', 'tela', 'telas', 'quadros', 'aquarela', 'óleo', 'acrílica'] },
      { id: 'ilustrador', label: 'Ilustrador e desenhista', words: ['desenho', 'desenhista', 'ilustração', 'ilustrador', 'ilustradora', 'quadrinhos', 'mangá', 'anime'] },
      { id: 'digital', label: 'Artista digital e 3D', words: ['arte digital', 'artista digital', '3d', 'blender', 'modelagem 3d', 'animação', 'animador', 'motion'] },
      { id: 'fotografo', label: 'Fotógrafo', words: ['fotografia', 'fotógrafo', 'fotografa', 'fotografo', 'ensaio', 'ensaios', 'câmera'] },
      { id: 'escultor', label: 'Escultor e ceramista', words: ['escultura', 'escultor', 'escultora', 'cerâmica', 'ceramista', 'argila'] },
      { id: 'grafite', label: 'Grafite e arte urbana', words: ['grafite', 'grafiteiro', 'grafiteira', 'graffiti', 'arte urbana', 'muralismo', 'mural', 'murais', 'spray'] },
      { id: 'artesao', label: 'Artesão', words: ['artesanato', 'artesão', 'artesã', 'crochê', 'croche', 'bordado', 'macramê', 'bijuteria', 'velas', 'sabonetes'] },
      { id: 'tatuador', label: 'Tatuador', words: ['tatuador', 'tatuadora', 'tatuagem', 'tattoo', 'piercing'] },
      { id: 'designer', label: 'Designer gráfico', words: ['design gráfico', 'designer gráfico', 'identidade visual', 'logo', 'logotipo', 'branding'] },
    ],
  },
  {
    id: 'cenicas',
    label: 'Artes cênicas',
    icon: 'happy',
    color: '#D9467A',
    words: ['teatro', 'espetáculo', 'peça', 'atuação', 'artes cênicas', 'ator', 'atriz', 'comediante', 'humorista', 'dançarino', 'dançarina', 'mágico', 'palhaço', 'dublador', 'dubladora'],
    subs: [
      { id: 'ator', label: 'Ator e atriz', words: ['ator', 'atriz', 'teatro', 'atuação', 'novela', 'cinema', 'elenco'] },
      { id: 'danca', label: 'Dançarino', words: ['dança', 'danço', 'dancarino', 'dançarina', 'dançarino', 'balé', 'ballet', 'zouk', 'samba', 'gafieira', 'dança urbana'] },
      { id: 'standup', label: 'Humorista e stand-up', words: ['stand up', 'standup', 'stand-up', 'comediante', 'humorista', 'show de comédia', 'improviso'] },
      { id: 'circo', label: 'Circo e mágica', words: ['circo', 'circense', 'mágico', 'mágica', 'palhaço', 'malabares', 'acrobata'] },
      { id: 'voz', label: 'Dublador e locutor', words: ['dublagem', 'dublador', 'dubladora', 'locutor', 'locutora', 'locução', 'narração'] },
      { id: 'modelo', label: 'Modelo', words: ['modelo', 'passarela', 'desfile', 'book fotográfico', 'agência de modelos'] },
    ],
  },
  {
    id: 'criador',
    label: 'Criador de conteúdo digital',
    icon: 'videocam',
    color: '#E0548C',
    words: ['criador', 'criadora', 'conteúdo', 'conteudo', 'criador de conteúdo', 'canal', 'vídeos', 'videos', 'gravo', 'edito', 'edição', 'roteiro', 'publico', 'posto', 'inscritos', 'digital', 'podcast', 'podcaster', 'youtuber', 'tiktoker', 'videomaker', 'streamer'],
    subs: [
      { id: 'youtuber', label: 'YouTuber e vlogger', words: ['youtube', 'youtuber', 'canal no youtube', 'vlog', 'vlogueiro', 'vlogueira', 'vídeo longo'] },
      { id: 'curtos', label: 'Vídeos curtos', words: ['tiktok', 'reels', 'shorts', 'vídeo curto', 'videos curtos', 'trend', 'trends', 'dancinha'] },
      { id: 'lives', label: 'Lives', words: ['lives', 'ao vivo', 'faço lives', 'live todo dia', 'transmissão ao vivo'] },
      { id: 'podcaster', label: 'Podcaster', words: ['podcast', 'podcaster', 'videocast', 'entrevista', 'episódio'] },
      { id: 'humor', label: 'Humor', words: ['humor', 'comédia', 'comedia', 'esquete', 'esquetes', 'meme', 'memes', 'piada'] },
      { id: 'educativo', label: 'Conteúdo educativo', words: ['ensino na internet', 'dicas', 'tutorial', 'tutoriais', 'explico', 'divulgação científica', 'curiosidades'] },
      { id: 'ugc', label: 'UGC para marcas', words: ['ugc', 'ugc creator', 'conteúdo para marcas', 'vídeo para marcas', 'vídeos para marcas', 'conteúdo patrocinado'] },
      { id: 'afiliado', label: 'Afiliado e divulgador', words: ['afiliado', 'afiliada', 'link de afiliado', 'achadinhos', 'divulgo produtos', 'cupom', 'cupons'] },
      { id: 'editor', label: 'Editor e videomaker', words: ['editor de vídeo', 'editora de vídeo', 'edito vídeos', 'videomaker', 'premiere', 'capcut', 'after effects', 'thumbnail', 'thumbnails'] },
      { id: 'socialmedia', label: 'Social media e roteirista', words: ['social media', 'roteirista', 'roteiros', 'copywriter', 'copy', 'gestão de redes', 'planejamento de conteúdo'] },
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
    id: 'gamer',
    label: 'Gamer',
    icon: 'game-controller',
    color: '#7B6CF6',
    words: ['jogo', 'jogos', 'jogar', 'jogando', 'gamer', 'game', 'games', 'videogame', 'video game', 'gameplay', 'zerar', 'zerei', 'rank', 'ranqueada', 'clã', 'cla', 'guilda', 'nerd', 'geek'],
    subs: [
      { id: 'casual', label: 'Gamer casual', words: ['jogo por diversão', 'jogo nas horas vagas', 'jogo com os amigos', 'casual', 'fim de semana jogando'] },
      { id: 'mobile', label: 'Mobile', words: ['free fire', 'freefire', 'ff', 'celular', 'mobile', 'clash', 'pubg mobile', 'roblox', 'brawl stars', 'candy crush'] },
      { id: 'pc', label: 'PC gamer', words: ['pc', 'computador', 'steam', 'setup', 'valorant', 'cs', 'counter strike', 'lol', 'league of legends', 'dota', 'minecraft'] },
      { id: 'console', label: 'Console', words: ['console', 'playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'switch', 'fifa', 'ea fc', 'gta'] },
      { id: 'esports', label: 'Pro de e-sports', words: ['e-sports', 'esports', 'esport', 'campeonato', 'competitivo', 'time profissional', 'pro player', 'proplayer', 'torneio', 'scrim'] },
      { id: 'streamer', label: 'Streamer', words: ['stream', 'streamer', 'live de jogo', 'faço live', 'faço lives', 'twitch', 'transmito', 'kick'] },
      { id: 'caster', label: 'Narrador e caster', words: ['caster', 'narrador', 'narradora', 'narro', 'narração de campeonato', 'comentarista'] },
      { id: 'analista', label: 'Reviewer e speedrunner', words: ['review de jogos', 'análise de jogos', 'analista de jogos', 'speedrun', 'speedrunner', 'detonado', 'guia de jogo'] },
      { id: 'coach', label: 'Coach de jogos', words: ['coach', 'coaching', 'treinador de time', 'ensino a jogar', 'aula de jogo'] },
      { id: 'gamedev', label: 'Criador de jogos', words: ['desenvolvo jogos', 'desenvolvedor de jogos', 'game dev', 'gamedev', 'jogo indie', 'indie', 'unity', 'unreal', 'game designer', 'modder', 'mods', 'servidor de minecraft'] },
      { id: 'retro', label: 'Retrô e colecionador', words: ['retrô', 'retro', 'colecionador', 'coleção de jogos', 'fliperama', 'arcade', 'super nintendo', 'mega drive', 'atari'] },
      { id: 'vr', label: 'Realidade virtual', words: ['realidade virtual', 'vr', 'oculus', 'quest', 'metaverso'] },
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
      { id: 'radicais', label: 'Skate e radicais', words: ['skate', 'skatista', 'bmx', 'patins', 'parkour', 'motocross'] },
      { id: 'treinador', label: 'Treinador e técnico', words: ['treinador', 'treinadora', 'técnico do time', 'preparador físico', 'comissão técnica'] },
      { id: 'arbitro', label: 'Árbitro', words: ['árbitro', 'arbitro', 'arbitragem', 'bandeirinha', 'juiz de futebol'] },
    ],
  },
  {
    id: 'esportista',
    label: 'Esportista',
    icon: 'bicycle',
    color: '#1E9E63',
    words: ['esporte', 'esportes', 'treino', 'treinar', 'treinando', 'academia', 'malhar', 'malho', 'pedal', 'corro', 'correr', 'caminhada', 'ativo', 'ativa'],
    subs: [
      { id: 'academia', label: 'Academia', words: ['academia', 'musculação', 'malhar', 'malho', 'crossfit', 'funcional', 'marombeiro'] },
      { id: 'corrida', label: 'Corrida de rua', words: ['corro', 'correr', 'corrida', 'corredor', 'corredora', '5 km', '10 km', 'pace'] },
      { id: 'pedal', label: 'Pedal', words: ['pedal', 'bike', 'bicicleta', 'pedalar', 'pedalando'] },
      { id: 'trilha', label: 'Trilha e aventura', words: ['trilha', 'trilhas', 'escalada', 'montanha', 'acampar', 'camping', 'rapel'] },
      { id: 'pelada', label: 'Futebol de fim de semana', words: ['pelada', 'racha', 'fut de domingo', 'futebol com os amigos', 'society'] },
      { id: 'bemestar', label: 'Yoga e bem-estar', words: ['yoga', 'ioga', 'pilates', 'meditação', 'alongamento', 'caminhada'] },
      { id: 'torcedor', label: 'Torcedor', words: ['torcedor', 'torcedora', 'torço', 'meu time', 'estádio', 'torcida'] },
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
      { id: 'pos', label: 'Pós e mestrado', words: ['pós', 'pós-graduação', 'mestrado', 'doutorado', 'mba'] },
      { id: 'idiomas', label: 'Idiomas e intercâmbio', words: ['inglês', 'espanhol', 'idioma', 'idiomas', 'intercâmbio', 'francês'] },
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
      { id: 'universidade', label: 'Universitário', words: ['universidade', 'faculdade', 'docente', 'orientador'] },
      { id: 'idiomas', label: 'Idiomas', words: ['inglês', 'espanhol', 'libras', 'idiomas', 'conversação'] },
      { id: 'particular', label: 'Aulas particulares e online', words: ['aula particular', 'aulas particulares', 'reforço', 'aula online', 'aulas online', 'ao vivo', 'mentoria'] },
      { id: 'instrutor', label: 'Instrutor', words: ['instrutor', 'instrutora', 'personal', 'autoescola'] },
      { id: 'pesquisador', label: 'Pesquisador e cientista', words: ['pesquisador', 'pesquisadora', 'pesquisa científica', 'cientista', 'laboratório', 'artigo científico'] },
    ],
  },
  {
    id: 'escrita',
    label: 'Escrita e comunicação',
    icon: 'create',
    color: '#5B6B8C',
    words: ['escrevo', 'escrever', 'escrita', 'texto', 'textos', 'comunicação', 'redação', 'escritor', 'escritora', 'jornalista', 'poeta', 'poetisa', 'tradutor', 'tradutora', 'intérprete'],
    subs: [
      { id: 'escritor', label: 'Escritor', words: ['escritor', 'escritora', 'livro', 'livros', 'romance', 'publiquei', 'crônica', 'contos'] },
      { id: 'poeta', label: 'Poeta', words: ['poeta', 'poetisa', 'poesia', 'poemas', 'cordel', 'sarau', 'slam'] },
      { id: 'jornalista', label: 'Jornalista', words: ['jornalista', 'jornalismo', 'repórter', 'reportagem', 'redação de jornal', 'notícias'] },
      { id: 'blogueiro', label: 'Blogueiro', words: ['blog', 'blogueiro', 'blogueira', 'newsletter', 'artigos'] },
      { id: 'tradutor', label: 'Tradutor e intérprete', words: ['tradutor', 'tradutora', 'tradução', 'intérprete', 'libras', 'legendas', 'legendagem'] },
    ],
  },
  {
    id: 'moda',
    label: 'Moda e beleza',
    icon: 'shirt',
    color: '#C24F8A',
    words: ['moda', 'beleza', 'roupa', 'roupas', 'costura', 'estilista', 'costureira', 'maquiadora', 'maquiador', 'personal stylist'],
    subs: [
      { id: 'estilista', label: 'Estilista e costureiro', words: ['estilista', 'costureira', 'costureiro', 'costuro', 'modelagem', 'ateliê de costura', 'coleção própria'] },
      { id: 'maquiador', label: 'Maquiador', words: ['maquiador', 'maquiadora', 'maquiagem artística', 'make de noiva', 'maquio'] },
      { id: 'consultor', label: 'Consultor de imagem', words: ['consultora de imagem', 'consultor de imagem', 'personal stylist', 'coloração pessoal', 'closet'] },
      { id: 'cabelo', label: 'Cabelo e estética', words: ['cabeleireiro', 'cabeleireira', 'trancista', 'tranças', 'barbeiro', 'lash', 'sobrancelha'] },
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
      { id: 'amador', label: 'Cozinheiro de casa', words: ['cozinho em casa', 'cozinha de casa', 'receita de vó', 'almoço de domingo', 'amo cozinhar'] },
      { id: 'churrasqueiro', label: 'Churrasqueiro', words: ['churrasco', 'churrasqueiro', 'parrilla', 'carne'] },
      { id: 'foodie', label: 'Foodie', words: ['comer bem', 'provar', 'restaurantes', 'hamburguer', 'pizza', 'café', 'cafés'] },
      { id: 'bartender', label: 'Bartender e barista', words: ['bartender', 'drinks', 'drink', 'barista', 'coquetel'] },
    ],
  },
  {
    id: 'tech',
    label: 'Tecnologia e IA',
    icon: 'hardware-chip',
    color: '#2563EB',
    words: ['programador', 'programadora', 'programo', 'programação', 'desenvolvedor', 'desenvolvedora', 'dev', 'ti', 'sistemas', 'software', 'código', 'tecnologia', 'ia', 'inteligência artificial', 'tech'],
    subs: [
      { id: 'ia', label: 'Criador de IA', words: ['crio ia', 'crio ias', 'criador de ia', 'criadora de ia', 'treino modelos', 'modelo de linguagem', 'llm', 'chatbot', 'chatbots', 'ia generativa'] },
      { id: 'ml', label: 'Machine learning', words: ['machine learning', 'aprendizado de máquina', 'deep learning', 'redes neurais', 'pytorch', 'tensorflow', 'visão computacional'] },
      { id: 'dados', label: 'Dados e analytics', words: ['dados', 'ciência de dados', 'cientista de dados', 'analista de dados', 'power bi', 'sql', 'big data'] },
      { id: 'prompt', label: 'Prompt engineer', words: ['prompt', 'prompts', 'engenharia de prompt', 'prompt engineer'] },
      { id: 'agentes', label: 'Agentes e automações', words: ['agente de ia', 'agentes de ia', 'automação', 'automações', 'automatizo', 'n8n', 'zapier', 'bots', 'rpa'] },
      { id: 'artistaia', label: 'Artista de IA', words: ['arte com ia', 'imagens com ia', 'vídeos com ia', 'música com ia', 'midjourney', 'stable diffusion', 'artista de ia'] },
      { id: 'dev', label: 'Desenvolvedor', words: ['programador', 'desenvolvedor', 'dev', 'javascript', 'python', 'java', 'código', 'analista de sistemas'] },
      { id: 'front', label: 'Front-end', words: ['front-end', 'frontend', 'front end', 'react', 'html', 'css', 'interfaces'] },
      { id: 'back', label: 'Back-end', words: ['back-end', 'backend', 'back end', 'api', 'apis', 'node', 'banco de dados', 'servidor'] },
      { id: 'fullstack', label: 'Full stack', words: ['full stack', 'fullstack', 'full-stack'] },
      { id: 'mobile', label: 'Apps mobile', words: ['aplicativo', 'aplicativos', 'app', 'apps', 'android', 'ios', 'flutter', 'react native', 'kotlin', 'swift'] },
      { id: 'web3', label: 'Web3 e blockchain', words: ['blockchain', 'web3', 'cripto', 'smart contract', 'solidity', 'nft'] },
      { id: 'cloud', label: 'DevOps e cloud', words: ['devops', 'cloud', 'nuvem', 'aws', 'azure', 'docker', 'kubernetes', 'infraestrutura'] },
      { id: 'seguranca', label: 'Cibersegurança', words: ['segurança da informação', 'cibersegurança', 'hacker ético', 'pentest', 'pentester', 'cybersecurity'] },
      { id: 'suporte', label: 'Suporte e redes', words: ['suporte', 'redes', 'manutenção de computador', 'help desk', 'técnico de informática'] },
      { id: 'design', label: 'Designer UX/UI', words: ['designer', 'ux', 'ui', 'figma', 'experiência do usuário', 'produto digital'] },
      { id: 'nocode', label: 'Produto e no-code', words: ['no-code', 'no code', 'nocode', 'low-code', 'low code', 'bubble', 'product manager', 'gerente de produto'] },
      { id: 'robotica', label: 'Robótica e maker', words: ['robótica', 'robô', 'robôs', 'arduino', 'maker', 'impressão 3d', 'eletrônica', 'drone', 'drones'] },
      { id: 'iot', label: 'IoT e casa inteligente', words: ['iot', 'internet das coisas', 'casa inteligente', 'automação residencial', 'sensores', 'esp32'] },
      { id: 'conteudo', label: 'Criador de conteúdo tech', words: ['canal de tecnologia', 'conteúdo de tecnologia', 'ensino programação', 'aulas de programação', 'review de gadgets'] },
    ],
  },
  {
    id: 'agro',
    label: 'Agro',
    icon: 'leaf',
    color: '#4E8A2A',
    words: ['agro', 'roça', 'fazenda', 'sítio', 'plantio', 'colheita', 'rural', 'lavoura', 'gado', 'agrônomo', 'agrônoma', 'pecuarista', 'cafeicultor', 'cafeicultora'],
    subs: [
      { id: 'produtor', label: 'Produtor rural', words: ['produtor rural', 'produtora rural', 'planto', 'plantação', 'grãos', 'soja', 'milho', 'hortifrúti', 'horta'] },
      { id: 'pecuaria', label: 'Pecuarista', words: ['pecuária', 'pecuarista', 'gado', 'boi', 'leite', 'curral', 'ordenha', 'avicultura', 'suínos'] },
      { id: 'cafe', label: 'Cafeicultor', words: ['café', 'cafeicultor', 'cafeicultora', 'cafezal', 'café especial', 'torra'] },
      { id: 'agronomo', label: 'Agrônomo e técnico', words: ['agrônomo', 'agrônoma', 'agronomia', 'técnico agrícola', 'zootecnista', 'veterinário de campo'] },
      { id: 'agrotech', label: 'Agro tech', words: ['agricultura de precisão', 'drone agrícola', 'agrotech', 'agtech', 'sensor de solo'] },
      { id: 'conteudo', label: 'Criador de conteúdo agro', words: ['canal do agro', 'vida na roça', 'conteúdo do campo', 'agro é tech'] },
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
      { id: 'beleza', label: 'Beleza', words: ['manicure', 'barbearia', 'designer de sobrancelha', 'esteticista'] },
      { id: 'casa', label: 'Casa e limpeza', words: ['diarista', 'faxina', 'limpeza', 'jardineiro', 'babá', 'cuidador', 'cuidadora'] },
      { id: 'mecanico', label: 'Mecânico', words: ['mecânico', 'mecânica de carro', 'oficina', 'funilaria', 'auto elétrica'] },
    ],
  },
  {
    id: 'empreendedor',
    label: 'Negócios e carreira',
    icon: 'briefcase',
    color: '#A8790A',
    words: ['empreendedor', 'empreendedora', 'empreendo', 'meu negócio', 'minha loja', 'dono', 'dona', 'empresário', 'empresária', 'vendo', 'vendas', 'cnpj', 'mei', 'carreira'],
    subs: [
      { id: 'mei', label: 'MEI e autônomo', words: ['mei', 'autônomo', 'autônoma', 'por conta própria', 'freelancer', 'freela'] },
      { id: 'comercio', label: 'Comércio e loja', words: ['loja', 'comércio', 'mercado', 'revendo', 'revenda', 'boutique'] },
      { id: 'food', label: 'Food e confeitaria', words: ['food truck', 'confeiteira', 'confeiteiro', 'bolos', 'doces', 'marmita', 'lanchonete', 'restaurante'] },
      { id: 'online', label: 'Vendas online', words: ['loja virtual', 'e-commerce', 'ecommerce', 'vendo online', 'dropshipping'] },
      { id: 'startup', label: 'Startup', words: ['startup', 'saas', 'inovação', 'fundador', 'fundadora', 'founder'] },
      { id: 'liberal', label: 'Profissional liberal', words: ['advogado', 'advogada', 'contador', 'contadora', 'arquiteto', 'arquiteta', 'engenheiro', 'engenheira', 'corretor', 'corretora'] },
      { id: 'investidor', label: 'Investidor', words: ['investidor', 'investidora', 'invisto', 'ações', 'bolsa de valores', 'renda fixa', 'fundos imobiliários'] },
      { id: 'vagas', label: 'Em busca de emprego', words: ['procurando emprego', 'busco emprego', 'em busca de emprego', 'desempregado', 'desempregada', 'primeiro emprego', 'busco oportunidade', 'currículo'] },
    ],
  },
  {
    id: 'fe',
    label: 'Fé e comunidade',
    icon: 'heart-circle',
    color: '#C99A0E',
    words: ['deus', 'jesus', 'fé', 'igreja', 'cristão', 'cristã', 'evangélico', 'evangélica', 'católico', 'católica', 'oração', 'gratidão', 'glória', 'comunidade'],
    subs: [
      { id: 'lideranca', label: 'Pastor e liderança', words: ['pastor', 'pastora', 'padre', 'líder de célula', 'liderança', 'presbítero', 'diácono'] },
      { id: 'louvor', label: 'Louvor', words: ['louvor', 'adoração', 'ministério de louvor', 'coral', 'gospel'] },
      { id: 'missoes', label: 'Missões e ação social', words: ['missionário', 'missionária', 'missões', 'voluntário', 'voluntária', 'ação social', 'doação', 'ong', 'projeto social', 'ativista'] },
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
      { id: 'internacional', label: 'Viagens internacionais', words: ['exterior', 'europa', 'eua', 'internacional'] },
    ],
  },
  {
    id: 'estilo',
    label: 'Estilo de vida',
    icon: 'sunny',
    color: '#D08A12',
    words: ['estilo de vida', 'amo', 'adoro', 'apaixonado', 'apaixonada', 'hobby', 'hobbies'],
    subs: [
      { id: 'pets', label: 'Pet lover', words: ['pet', 'pets', 'cachorro', 'cachorros', 'gato', 'gatos', 'vira-lata', 'tutor de', 'tutora de', 'adoção de animais'] },
      { id: 'colecionador', label: 'Colecionador', words: ['coleciono', 'coleção', 'colecionador', 'colecionadora', 'figurinhas', 'vinil', 'miniaturas', 'action figures'] },
      { id: 'familia', label: 'Família', words: ['pai de', 'mãe de', 'meus filhos', 'minha família', 'casado', 'casada', 'paternidade', 'maternidade'] },
      { id: 'saudavel', label: 'Vida saudável', words: ['vida saudável', 'alimentação saudável', 'natural', 'orgânicos', 'bem-estar'] },
      { id: 'carros', label: 'Carros e motos', words: ['carro antigo', 'carros', 'motos', 'tuning', 'rebaixado', 'encontro de carros'] },
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
  { id: 'atuar', label: 'Atuar ou fazer rir', icon: 'happy-outline', words: 'teatro atuação stand up' },
  { id: 'lives', label: 'Fazer lives', icon: 'radio-outline', words: 'lives ao vivo criador conteúdo' },
  { id: 'ia', label: 'Criar com IA', icon: 'sparkles-outline', words: 'inteligência artificial criador de ia tecnologia' },
  { id: 'escrever', label: 'Escrever', icon: 'create-outline', words: 'escrevo escrita textos' },
  { id: 'moda', label: 'Moda e beleza', icon: 'shirt-outline', words: 'moda beleza estilo' },
  { id: 'plantar', label: 'Plantar e criar', icon: 'leaf-outline', words: 'agro roça plantio' },
  { id: 'pets', label: 'Cuidar de pets', icon: 'paw-outline', words: 'pets cachorro gato amo' },
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
