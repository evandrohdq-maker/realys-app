// Catálogo de profissões do Realys, em classes e subclasses (como os setores do Shop).
// Usado na escolha de profissional (aba Serviços, tela por cima), no cadastro do prestador e pela
// Lotus. As profissões que já existiam (eletricista, motorista, psicólogo…) continuam com a mesma
// chave; as novas entram em serviceTypes (src/data.js) e aparecem como "em breve" até ter prestador.
//
// Cada subclasse: [chave, nome, emoji, ícone, palavras que a pessoa fala, modo]
// modo 'online' = atendimento por chamada de vídeo; Transporte = chamado na hora; o resto = visita.

export const PROF_CLASSES = [
  {
    key: 'casa', label: 'Casa e reparos', ion: 'home-outline', emoji: '🏠',
    subs: [
      ['eletricista'], ['encanador'], ['diarista'], ['pintor'], ['chaveiro'],
      ['montador', 'Montador de móveis', '🪛', 'hammer-outline', ['montador de moveis', 'montar movel', 'montar guarda-roupa', 'montagem de moveis']],
      ['marido', 'Marido de aluguel', '🧰', 'build-outline', ['marido de aluguel', 'pequenos reparos', 'faz-tudo', 'faz tudo']],
      ['arcond', 'Técnico de ar-condicionado', '❄️', 'snow-outline', ['tecnico de ar', 'instalar ar condicionado', 'ar-condicionado', 'limpeza de ar condicionado', 'ar condicionado']],
      ['eletrodom', 'Técnico de eletrodomésticos', '🔌', 'flash-outline', ['conserto de geladeira', 'conserto de maquina de lavar', 'tecnico de eletrodomesticos', 'conserto de fogao', 'geladeira parou']],
      ['jardineiro', 'Jardineiro', '🌿', 'leaf-outline', ['jardineiro', 'jardinagem', 'cortar grama', 'poda de arvore', 'paisagismo']],
      ['piscineiro', 'Piscineiro', '🏊', 'water-outline', ['piscineiro', 'limpeza de piscina', 'tratamento de piscina']],
      ['dedetizador', 'Dedetizador', '🪳', 'bug-outline', ['dedetizacao', 'dedetizador', 'barata', 'cupim', 'rato', 'controle de pragas']],
      ['estofados', 'Limpeza de estofados', '🛋️', 'sparkles-outline', ['limpeza de sofa', 'higienizacao de sofa', 'limpeza de estofados', 'limpeza de colchao', 'lavar tapete']],
      ['passadeira', 'Passadeira', '👔', 'shirt-outline', ['passadeira', 'passar roupa']],
      ['cozinheira', 'Cozinheira(o) em casa', '👩‍🍳', 'restaurant-outline', ['cozinheira', 'cozinheiro particular', 'chef em casa', 'marmitas em casa']],
      ['caseiro', 'Caseiro', '🏡', 'home-outline', ['caseiro', 'cuidar da chacara', 'cuidar do sitio']],
      ['tapeceiro', 'Tapeceiro e estofador', '🪑', 'color-palette-outline', ['tapeceiro', 'estofador', 'reformar sofa', 'trocar tecido do sofa']],
      ['antenista', 'Instalador de antena e TV', '📡', 'tv-outline', ['antenista', 'instalar antena', 'instalar tv na parede', 'suporte de tv']],
    ],
  },
  {
    key: 'construcao', label: 'Construção e reforma', ion: 'construct-outline', emoji: '🧱',
    subs: [
      ['pedreiro', 'Pedreiro', '🧱', 'construct-outline', ['pedreiro', 'reforma', 'construir muro', 'assentar piso', 'obra']],
      ['mestreobras', 'Mestre de obras', '👷', 'people-outline', ['mestre de obras', 'empreiteiro', 'empreitada']],
      ['azulejista', 'Azulejista e pisos', '🟫', 'grid-outline', ['azulejista', 'colocar azulejo', 'colocar porcelanato', 'assentador de piso']],
      ['gesseiro', 'Gesseiro e drywall', '⬜', 'square-outline', ['gesseiro', 'gesso', 'drywall', 'forro de gesso', 'sanca']],
      ['serralheiro', 'Serralheiro', '🔩', 'construct-outline', ['serralheiro', 'portao de ferro', 'grade de ferro', 'solda', 'serralheria']],
      ['marceneiro', 'Marceneiro', '🪚', 'hammer-outline', ['marceneiro', 'moveis planejados', 'marcenaria', 'carpinteiro']],
      ['vidraceiro', 'Vidraceiro', '🪟', 'albums-outline', ['vidraceiro', 'box de banheiro', 'trocar vidro', 'janela de vidro']],
      ['telhadista', 'Telhadista', '🏚️', 'home-outline', ['telhadista', 'conserto de telhado', 'goteira', 'calha', 'trocar telha']],
      ['marmorista', 'Marmorista', '⬛', 'cube-outline', ['marmorista', 'bancada de granito', 'pia de marmore']],
      ['engcivil', 'Engenheiro civil', '📐', 'calculator-outline', ['engenheiro civil', 'laudo de obra', 'projeto estrutural', 'art de obra']],
      ['arquiteto', 'Arquiteto', '🏛️', 'easel-outline', ['arquiteto', 'arquiteta', 'projeto de casa', 'planta da casa']],
      ['designinteriores', 'Designer de interiores', '🛋️', 'color-palette-outline', ['designer de interiores', 'decorar apartamento', 'projeto de interiores']],
      ['energiasolar', 'Instalador de energia solar', '☀️', 'sunny-outline', ['energia solar', 'placa solar', 'painel solar']],
    ],
  },
  {
    key: 'veiculos', label: 'Veículos', ion: 'car-outline', emoji: '🚗',
    subs: [
      ['mecanico'],
      ['autoeletrico', 'Auto elétrico', '🔋', 'battery-charging-outline', ['auto eletrico', 'eletrica do carro', 'alternador', 'motor de partida']],
      ['funileiro', 'Funilaria e pintura', '🚘', 'color-fill-outline', ['funileiro', 'funilaria', 'amassado', 'pintura do carro', 'martelinho de ouro']],
      ['borracheiro', 'Borracheiro', '🛞', 'ellipse-outline', ['borracheiro', 'borracharia', 'pneu furado', 'calibrar pneu']],
      ['guincho', 'Guincho 24h', '🚛', 'car-outline', ['guincho', 'reboque', 'carro quebrado na estrada']],
      ['lavajato', 'Lava-jato e estética automotiva', '🧽', 'water-outline', ['lava jato', 'lavar carro', 'lavagem a seco', 'polimento', 'higienizacao do carro']],
      ['mecmoto', 'Mecânico de motos', '🏍️', 'bicycle-outline', ['mecanico de moto', 'oficina de moto', 'moto quebrou']],
      ['vidroauto', 'Vidros automotivos', '🪟', 'car-outline', ['parabrisa', 'para-brisa', 'vidro do carro']],
      ['despachante', 'Despachante', '📄', 'document-text-outline', ['despachante', 'transferencia de veiculo', 'licenciamento', 'documento do carro']],
    ],
  },
  {
    key: 'transporte', label: 'Transporte', ion: 'car-sport-outline', emoji: '🚕',
    subs: [
      ['motorista'], ['motoboy'], ['frete'],
      ['executivo', 'Motorista executivo', '🕴️', 'car-sport-outline', ['motorista executivo', 'carro executivo', 'motorista particular']],
      ['escolar', 'Transporte escolar', '🚌', 'bus-outline', ['transporte escolar', 'van escolar', 'levar na escola', 'perua escolar']],
      ['viagem', 'Motorista para viagens', '🛣️', 'navigate-outline', ['motorista para viagem', 'viagem intermunicipal', 'levar para outra cidade']],
      ['transpet', 'Transporte de pets', '🐕', 'paw-outline', ['transporte de pet', 'taxi dog', 'levar o cachorro']],
      ['bikeentrega', 'Entregador de bike', '🚲', 'bicycle-outline', ['entregador de bike', 'bike entrega']],
      ['acessivel', 'Transporte acessível', '♿', 'accessibility-outline', ['cadeirante', 'transporte acessivel', 'carro adaptado']],
    ],
  },
  {
    key: 'saude', label: 'Saúde e bem-estar', ion: 'medkit-outline', emoji: '🩺',
    subs: [
      ['psicologo'], ['nutricionista'],
      ['medico', 'Médico (teleconsulta)', '👨‍⚕️', 'medkit-outline', ['teleconsulta', 'consulta medica online', 'medico online'], 'online'],
      ['enfermeiro', 'Enfermeiro(a) em casa', '💉', 'bandage-outline', ['enfermeiro', 'enfermeira', 'curativo em casa', 'aplicar injecao', 'home care']],
      ['fisioterapeuta', 'Fisioterapeuta', '🦴', 'body-outline', ['fisioterapeuta', 'fisioterapia', 'dor nas costas', 'pilates clinico']],
      ['fono', 'Fonoaudiólogo', '🗣️', 'chatbubbles-outline', ['fonoaudiologo', 'fonoaudiologa', 'fono']],
      ['dentista', 'Dentista', '🦷', 'happy-outline', ['dentista', 'dor de dente', 'clareamento', 'aparelho nos dentes']],
      ['terapeutaocup', 'Terapeuta ocupacional', '🧩', 'extension-puzzle-outline', ['terapeuta ocupacional', 'terapia ocupacional']],
      ['massoterapeuta', 'Massoterapeuta', '💆', 'hand-left-outline', ['massagem', 'massoterapeuta', 'drenagem linfatica', 'quick massage']],
      ['doula', 'Doula', '🤰', 'heart-outline', ['doula', 'parto humanizado']],
      ['acompanhante', 'Acompanhante hospitalar', '🏥', 'medical-outline', ['acompanhante hospitalar', 'acompanhar no hospital']],
      ['psicopedagogo', 'Psicopedagogo', '🧠', 'school-outline', ['psicopedagogo', 'psicopedagoga', 'dificuldade de aprendizagem'], 'online'],
    ],
  },
  {
    key: 'beleza', label: 'Beleza e estética', ion: 'rose-outline', emoji: '💇',
    subs: [
      ['cabeleireiro', 'Cabeleireiro(a)', '💇', 'cut-outline', ['cabeleireiro', 'cabeleireira', 'cortar cabelo', 'escova progressiva', 'luzes no cabelo', 'salao de beleza']],
      ['barbeiro', 'Barbeiro', '💈', 'cut-outline', ['barbeiro', 'barbearia', 'fazer a barba', 'corte masculino']],
      ['manicure', 'Manicure e pedicure', '💅', 'hand-left-outline', ['manicure', 'pedicure', 'fazer a unha', 'unha de gel', 'alongamento de unha']],
      ['maquiador', 'Maquiador(a)', '💄', 'color-palette-outline', ['maquiador', 'maquiadora', 'maquiagem para festa', 'make para casamento']],
      ['esteticista', 'Esteticista', '🧖', 'sparkles-outline', ['esteticista', 'limpeza de pele', 'estetica facial', 'peeling']],
      ['sobrancelha', 'Designer de sobrancelhas', '✨', 'eye-outline', ['sobrancelha', 'design de sobrancelha', 'micropigmentacao']],
      ['cilios', 'Extensão de cílios', '👁️', 'eye-outline', ['extensao de cilios', 'cilios', 'lash designer']],
      ['depilacao', 'Depilação', '🌸', 'flower-outline', ['depilacao', 'depiladora', 'depilacao a laser']],
      ['trancista', 'Trancista', '🧶', 'git-branch-outline', ['trancista', 'trancas', 'box braids', 'nago']],
      ['tatuador', 'Tatuador(a)', '🖋️', 'brush-outline', ['tatuador', 'tatuadora', 'tatuagem', 'tattoo', 'piercing']],
    ],
  },
  {
    key: 'cuidados', label: 'Cuidados e família', ion: 'people-outline', emoji: '👨‍👩‍👧',
    subs: [
      ['baba', 'Babá', '🍼', 'happy-outline', ['baba', 'cuidar de crianca', 'cuidar do meu filho', 'baby sitter']],
      ['cuidadoridoso', 'Cuidador(a) de idosos', '🧓', 'heart-outline', ['cuidador de idoso', 'cuidadora de idoso', 'cuidar da minha mae', 'cuidar do meu pai', 'cuidador']],
      ['domestica', 'Empregada doméstica', '🏠', 'home-outline', ['empregada domestica', 'domestica mensalista']],
      ['libras', 'Intérprete de Libras', '🤟', 'hand-right-outline', ['interprete de libras', 'libras', 'surdo', 'lingua de sinais', 'tradutor de libras']],
      ['acompanhantepcd', 'Acompanhante de pessoa com deficiência', '♿', 'accessibility-outline', ['acompanhante pcd', 'cuidador de pessoa com deficiencia', 'acompanhante para cadeirante', 'pessoa com deficiencia']],
      ['recreador', 'Recreador infantil', '🎪', 'balloon-outline', ['recreador', 'recreacao infantil', 'animador de festa infantil']],
    ],
  },
  {
    key: 'pets', label: 'Pets', ion: 'paw-outline', emoji: '🐾',
    subs: [
      ['vetpet', 'Veterinário de pets', '🐶', 'medkit-outline', ['veterinario para cachorro', 'veterinario para gato', 'vacina do cachorro', 'meu cachorro esta doente', 'meu gato esta doente']],
      ['banhotosa', 'Banho e tosa', '🛁', 'water-outline', ['banho e tosa', 'tosa', 'dar banho no cachorro', 'pet shop banho']],
      ['adestrador', 'Adestrador', '🦮', 'ribbon-outline', ['adestrador', 'adestramento', 'adestrar cachorro']],
      ['dogwalker', 'Passeador de cães', '🐕', 'walk-outline', ['passeador de caes', 'dog walker', 'passear com o cachorro']],
      ['petsitter', 'Pet sitter', '🏡', 'home-outline', ['pet sitter', 'cuidar do meu pet', 'hotel para cachorro', 'creche para cachorro']],
    ],
  },
  {
    key: 'eventos', label: 'Festas e eventos', ion: 'musical-notes-outline', emoji: '🎉',
    subs: [
      ['dj'], ['fotografo'], ['buffet'], ['decoracao'],
      ['cerimonialista', 'Cerimonialista', '💍', 'ribbon-outline', ['cerimonialista', 'assessoria de casamento', 'organizar casamento']],
      ['musico', 'Banda e músicos', '🎸', 'musical-notes-outline', ['banda para festa', 'musico para evento', 'voz e violao', 'cantor para casamento']],
      ['confeiteiro', 'Confeiteiro(a) e bolos', '🎂', 'ice-cream-outline', ['confeiteira', 'confeiteiro', 'bolo de aniversario', 'bolo de casamento', 'docinhos']],
      ['videomaker', 'Videomaker e filmagem', '🎥', 'videocam-outline', ['videomaker', 'filmagem de casamento', 'filmagem de evento']],
      ['segevento', 'Segurança para eventos', '🛡️', 'shield-outline', ['seguranca para festa', 'seguranca de evento']],
      ['florista', 'Florista', '💐', 'flower-outline', ['florista', 'arranjo de flores', 'buque']],
      ['palhaco', 'Palhaço e mágico', '🤡', 'happy-outline', ['palhaco', 'magico', 'show de magica']],
    ],
  },
  {
    key: 'aulas', label: 'Aulas', ion: 'school-outline', emoji: '📚',
    subs: [
      ['professor'], ['personal'],
      ['idiomas', 'Professor de idiomas', '🌎', 'language-outline', ['aula de ingles', 'aula de espanhol', 'professor de ingles', 'professor de idiomas'], 'online'],
      ['musicaaula', 'Professor de música', '🎹', 'musical-note-outline', ['aula de violao', 'aula de piano', 'aula de canto', 'professor de musica', 'aula de bateria']],
      ['autoescola', 'Instrutor de direção', '🚗', 'car-outline', ['instrutor de direcao', 'aula de direcao', 'aprender a dirigir', 'autoescola']],
      ['natacao', 'Professor de natação', '🏊', 'water-outline', ['aula de natacao', 'professor de natacao']],
      ['danca', 'Professor de dança', '💃', 'musical-notes-outline', ['aula de danca', 'professor de danca', 'aula de forro', 'aula de zumba']],
      ['lutas', 'Professor de lutas', '🥋', 'hand-right-outline', ['aula de jiu-jitsu', 'aula de boxe', 'aula de muay thai', 'professor de luta']],
      ['yoga', 'Yoga e pilates', '🧘', 'body-outline', ['aula de yoga', 'aula de pilates', 'professor de yoga']],
      ['informaticaaula', 'Aulas de informática', '🖥️', 'desktop-outline', ['aula de informatica', 'aprender a usar o computador', 'curso de excel'], 'online'],
      ['culinaria', 'Aulas de culinária', '🍳', 'restaurant-outline', ['aula de culinaria', 'aula de confeitaria', 'aprender a cozinhar']],
    ],
  },
  {
    key: 'tecnologia', label: 'Tecnologia', ion: 'hardware-chip-outline', emoji: '💻',
    subs: [
      ['dev'], ['tecnico'],
      ['celularconserto', 'Conserto de celular', '📱', 'phone-portrait-outline', ['conserto de celular', 'tela do celular quebrou', 'trocar tela do celular', 'bateria do celular']],
      ['redes', 'Instalador de redes e Wi-Fi', '📶', 'wifi-outline', ['instalar wi-fi', 'rede de internet', 'cabeamento', 'repetidor de sinal']],
      ['cameras', 'Instalador de câmeras e alarmes', '📹', 'videocam-outline', ['instalar camera', 'camera de seguranca', 'cftv', 'instalar alarme', 'cerca eletrica']],
      ['suporteti', 'Suporte de TI para empresas', '🗄️', 'server-outline', ['suporte de ti', 'ti para empresa', 'servidor da empresa'], 'online'],
      ['segdigital', 'Segurança digital', '🔐', 'lock-closed-outline', ['seguranca digital', 'conta hackeada', 'whatsapp clonado', 'recuperar conta'], 'online'],
    ],
  },
  {
    key: 'criativos', label: 'Criativos e marketing', ion: 'brush-outline', emoji: '🎨',
    subs: [
      ['designer', 'Designer gráfico', '🎨', 'brush-outline', ['designer grafico', 'criar logo', 'logomarca', 'identidade visual', 'arte para post'], 'online'],
      ['socialmedia', 'Social media', '📲', 'share-social-outline', ['social media', 'gerenciar instagram', 'posts para instagram', 'marketing digital'], 'online'],
      ['editorvideo', 'Editor de vídeo', '🎬', 'film-outline', ['editor de video', 'editar video', 'edicao de video'], 'online'],
      ['redator', 'Redator e revisor', '✍️', 'create-outline', ['redator', 'revisor de texto', 'revisao de tcc', 'escrever texto'], 'online'],
      ['tradutor', 'Tradutor', '🌐', 'language-outline', ['tradutor', 'traducao', 'tradutor juramentado'], 'online'],
      ['ilustrador', 'Ilustrador', '🖌️', 'color-palette-outline', ['ilustrador', 'ilustracao', 'desenho personalizado'], 'online'],
      ['locutor', 'Locutor', '🎙️', 'mic-outline', ['locutor', 'locucao', 'gravar propaganda', 'voz para propaganda'], 'online'],
      ['fotoproduto', 'Fotógrafo de produtos', '📸', 'camera-outline', ['foto de produto', 'fotografo de produto', 'fotos para loja']],
    ],
  },
  {
    key: 'juridico', label: 'Jurídico e finanças', ion: 'briefcase-outline', emoji: '⚖️',
    subs: [
      ['advogado'], ['contador'], ['consultor'],
      ['corretorimoveis', 'Corretor de imóveis', '🏘️', 'business-outline', ['corretor de imoveis', 'vender minha casa', 'avaliar imovel']],
      ['corretorseguros', 'Corretor de seguros', '📑', 'shield-checkmark-outline', ['corretor de seguros', 'seguro do carro', 'seguro de vida', 'plano de saude'], 'online'],
      ['consultorfin', 'Consultor financeiro', '💰', 'cash-outline', ['consultor financeiro', 'organizar minhas dividas', 'planejamento financeiro', 'investimentos'], 'online'],
      ['sindico', 'Síndico profissional', '🏢', 'business-outline', ['sindico profissional', 'administracao de condominio']],
    ],
  },
  {
    key: 'agro', label: 'Agro', ion: 'leaf-outline', emoji: '🌾',
    subs: [
      ['agronomo'], ['veterinario'], ['droneagro'],
      ['tratorista', 'Tratorista e operador de máquinas', '🚜', 'construct-outline', ['tratorista', 'operador de maquinas', 'operador de colheitadeira']],
      ['inseminador', 'Inseminador', '🐄', 'medical-outline', ['inseminador', 'inseminacao artificial']],
      ['irrigacao', 'Técnico em irrigação', '💧', 'water-outline', ['irrigacao', 'tecnico em irrigacao', 'sistema de irrigacao']],
      ['topografo', 'Topógrafo', '🗺️', 'map-outline', ['topografo', 'topografia', 'georreferenciamento', 'medir terreno']],
      ['zootecnista', 'Zootecnista', '🐖', 'paw-outline', ['zootecnista', 'nutricao animal', 'manejo do rebanho']],
      ['ferrador', 'Ferrador e casqueador', '🐎', 'hammer-outline', ['ferrador', 'casqueador', 'ferrar cavalo']],
    ],
  },
  {
    key: 'moda', label: 'Moda e costura', ion: 'shirt-outline', emoji: '🧵',
    subs: [
      ['costureira', 'Costureira', '🧵', 'cut-outline', ['costureira', 'costura', 'ajuste de roupa', 'fazer barra', 'consertar roupa']],
      ['alfaiate', 'Alfaiate', '🤵', 'shirt-outline', ['alfaiate', 'terno sob medida']],
      ['sapateiro', 'Sapateiro', '👞', 'footsteps-outline', ['sapateiro', 'consertar sapato', 'trocar sola']],
      ['estilista', 'Estilista e personal stylist', '👗', 'sparkles-outline', ['estilista', 'personal stylist', 'consultoria de imagem'], 'online'],
    ],
  },
  {
    key: 'turismo', label: 'Turismo e passeios', ion: 'map-outline', emoji: '🧭',
    subs: [
      ['guiaturismo', 'Guia de turismo', '🧭', 'map-outline', ['guia de turismo', 'guia turistico', 'city tour', 'roteiro pela cidade', 'conhecer a cidade']],
      ['ecoturismo', 'Ecoturismo e trilhas', '🥾', 'trail-sign-outline', ['trilha', 'ecoturismo', 'cachoeira', 'rapel', 'passeio na natureza']],
      ['passeiobarco', 'Passeio de barco', '⛵', 'boat-outline', ['passeio de barco', 'passeio de lancha', 'escuna', 'aluguel de barco']],
      ['receptivo', 'Receptivo e transfer turístico', '🚐', 'bus-outline', ['transfer do aeroporto', 'receptivo', 'transfer turistico', 'buscar no aeroporto']],
    ],
  },
  {
    key: 'ambiente', label: 'Meio ambiente e reciclagem', ion: 'leaf-outline', emoji: '♻️',
    subs: [
      ['reciclaveis', 'Coleta de recicláveis', '♻️', 'refresh-circle-outline', ['reciclagem', 'coleta de reciclavel', 'reciclaveis', 'catador', 'coleta seletiva', 'oleo de cozinha usado']],
      ['cacamba', 'Caçamba e retirada de entulho', '🚛', 'trash-bin-outline', ['cacamba', 'entulho', 'retirar entulho', 'restos de obra', 'aluguel de cacamba']],
      ['eletronicodescarte', 'Descarte de eletrônicos', '🔋', 'battery-dead-outline', ['descarte de eletronicos', 'lixo eletronico', 'descartar celular', 'pilhas e baterias', 'descartar computador']],
      ['moveisvelhos', 'Retirada de móveis velhos', '🛋️', 'cube-outline', ['retirar movel velho', 'descartar sofa', 'descartar colchao', 'bota-fora']],
      ['limpezaterreno', 'Limpeza de terreno e roçada', '🌾', 'cut-outline', ['limpeza de terreno', 'rocada', 'rocar terreno', 'capina', 'terreno baldio']],
    ],
  },
  {
    key: 'seguranca', label: 'Segurança', ion: 'shield-outline', emoji: '🛡️',
    subs: [
      ['vigilante', 'Vigilante e segurança', '🛡️', 'shield-outline', ['vigilante', 'seguranca particular', 'guarda noturno']],
      ['porteiro', 'Porteiro e controlador de acesso', '🚪', 'log-in-outline', ['porteiro', 'portaria', 'controlador de acesso']],
      ['escolta', 'Escolta e motorista de segurança', '🚓', 'car-outline', ['escolta', 'seguranca armada']],
    ],
  },
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Novas profissões no formato de serviceTypes (as já existentes ficam como estão).
export function catalogTypes(existing) {
  const have = new Set(existing.map((t) => t.key));
  const out = [];
  PROF_CLASSES.forEach((c) =>
    c.subs.forEach(([key, label, icon, ion, words, mode]) => {
      if (!label || have.has(key)) return;
      out.push({ key, label, icon, ion, group: c.label, words: (words || []).map(norm), exact: true, ...(mode ? { mode } : {}) });
    }),
  );
  return out;
}

// Classe (grupo) de cada profissão, para a tela de escolha.
export const classOfGroup = (group) => PROF_CLASSES.find((c) => c.label === group);
