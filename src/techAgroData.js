// Dados de demonstração das abas Tecnologia e Agro.
// As duas conversam: tudo que tem "agrotech: true" aparece nas duas abas (Agro é tech).
// Empresas, valores e cotações são fictícios, só para apresentação.
const photo = (seed, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const TECH_SEGMENTS = [
  { key: 'todos', label: 'Tudo', icon: 'grid-outline' },
  { key: 'ia', label: 'Inteligência artificial', icon: 'sparkles-outline' },
  { key: 'robotica', label: 'Robótica', icon: 'hardware-chip-outline' },
  { key: 'apps', label: 'Apps e sistemas', icon: 'phone-portrait-outline' },
  { key: 'cursos', label: 'Cursos e eventos', icon: 'school-outline' },
  { key: 'agrotech', label: 'Agro é tech', icon: 'leaf-outline' },
];

export const AGRO_SEGMENTS = [
  { key: 'todos', label: 'Tudo', icon: 'grid-outline' },
  { key: 'insumos', label: 'Sementes e insumos', icon: 'flower-outline' },
  { key: 'maquinas', label: 'Máquinas', icon: 'construct-outline' },
  { key: 'servicos', label: 'Agrônomos e serviços', icon: 'person-outline' },
  { key: 'producao', label: 'Direto do produtor', icon: 'basket-outline' },
  { key: 'agrotech', label: 'Agro é tech', icon: 'hardware-chip-outline' },
];

// Subgrupos (cadeias) do Agro. Cada item do agro diz em quais cadeias aparece.
export const AGRO_CHAINS = [
  { key: 'todas', label: 'Todas', icon: '🌎' },
  { key: 'graos', label: 'Grãos', icon: '🌽' },
  { key: 'cafe', label: 'Café', icon: '☕' },
  { key: 'pecuaria', label: 'Pecuária', icon: '🐂' },
  { key: 'horti', label: 'Hortifrúti', icon: '🥬' },
  { key: 'leite', label: 'Leite', icon: '🥛' },
];

const ALL_CHAINS = ['graos', 'cafe', 'pecuaria', 'horti', 'leite'];

// price null = sob orçamento. go = abre outra tela do app em vez de comprar aqui.
export const sectorItems = [
  // ───────────── Tecnologia ─────────────
  { id: 'tk1', sector: 'tech', seg: 'ia', icon: '🤖', title: 'Atendente com IA no WhatsApp da sua loja', who: 'NeuralBR Soluções', detail: 'Responde clientes 24 h, mostra produtos do seu Shop Realys e fecha pedidos.', price: 149, unit: 'mês', cta: 'Assinar', photo: photo('realys-ia-chat'), sponsored: true },
  { id: 'tk2', sector: 'tech', seg: 'ia', icon: '🧾', title: 'IA que lê notas e lança no fluxo de caixa', who: 'ContaFácil IA', detail: 'Fotografe a nota: a IA separa valores e lança no Caixa da área empresarial.', price: 79, unit: 'mês', cta: 'Assinar', photo: photo('realys-ia-nota') },
  { id: 'tk3', sector: 'tech', seg: 'ia', icon: '🍃', title: 'IA que identifica pragas pela foto da folha', who: 'AgroVisão IA', detail: 'Tire a foto na lavoura e receba o diagnóstico e o que fazer. Funciona na aba Agro.', price: 39, unit: 'mês', cta: 'Assinar', chains: ['graos', 'cafe', 'horti'], photo: photo('realys-ia-folha'), agrotech: true },
  { id: 'tk4', sector: 'tech', seg: 'robotica', icon: '🦾', title: 'Kit de robótica educacional (8 a 14 anos)', who: 'RoboKids Brasil', detail: 'Motores, sensores e app para programar. Envia para todo o Brasil.', price: 389.9, unit: 'kit', cta: 'Comprar', photo: photo('realys-robokit') },
  { id: 'tk5', sector: 'tech', seg: 'robotica', icon: '🏭', title: 'Braço robótico para linha de produção', who: 'Automatiza Indústria', detail: 'Embalagem, solda e separação. Projeto e instalação na sua fábrica.', price: null, cta: 'Pedir orçamento', photo: photo('realys-braco') },
  { id: 'tk6', sector: 'tech', seg: 'robotica', icon: '🚜', title: 'Robô autônomo de capina e colheita', who: 'FieldBot Agro', detail: 'Anda sozinho entre as linhas, tira o mato sem veneno e conta os frutos.', price: null, cta: 'Pedir orçamento', chains: ['graos', 'horti'], photo: photo('realys-fieldbot'), agrotech: true },
  { id: 'tk7', sector: 'tech', seg: 'apps', icon: '📱', title: 'Criamos o app da sua empresa', who: 'Diego Martins · Dev', detail: 'Apps Android e iPhone, sites e integrações com IA. Veja o perfil e o preço.', price: 120, unit: 'hora', cta: 'Ver profissional', go: { tab: 'servicos', service: 'dev' }, photo: photo('realys-dev') },
  { id: 'tk8', sector: 'tech', seg: 'apps', icon: '📊', title: 'Sistema de gestão para pequenas empresas', who: 'GestorPlus', detail: 'Vendas, estoque e funcionários. Conecta com a área empresarial do Realys.', price: 59.9, unit: 'mês', cta: 'Assinar', photo: photo('realys-gestor') },
  { id: 'tk9', sector: 'tech', seg: 'apps', icon: '🌾', title: 'App de gestão da fazenda', who: 'Fazenda Conectada', detail: 'Talhões no mapa, plantio, colheita, custos por hectare e funcionários.', price: 89.9, unit: 'mês', cta: 'Assinar', chains: ALL_CHAINS, photo: photo('realys-fazendaapp'), agrotech: true },
  { id: 'tk10', sector: 'tech', seg: 'cursos', icon: '🎓', title: 'IA para negócios (online, com certificado)', who: 'Escola Futuro Digital', detail: '8 semanas: usar IA no atendimento, nas vendas e na gestão.', price: 197, unit: 'curso', cta: 'Inscrever-se', photo: photo('realys-cursoia') },
  { id: 'tk11', sector: 'tech', seg: 'cursos', icon: '🔧', title: 'Oficina de robótica com Arduino', who: 'Maker Space SP', detail: 'Aos sábados, presencial. Monte e programe seu primeiro robô.', price: 120, unit: 'aula', cta: 'Inscrever-se', photo: photo('realys-arduino') },
  { id: 'tk12', sector: 'tech', seg: 'cursos', icon: '🚀', title: 'Hackathon Agro + Tech 2026', who: 'Realys Lab', detail: '48 h para criar soluções para o campo. Prêmios para os 3 melhores times.', price: 0, unit: 'inscrição', cta: 'Inscrever-se', photo: photo('realys-hackathon'), agrotech: true, sponsored: true },

  // ───────────── Agro ─────────────
  { id: 'ag1', sector: 'agro', seg: 'insumos', icon: '🌽', title: 'Sementes de milho híbrido (saca 60 mil)', who: 'Sementes Vale Verde', detail: 'Alta produtividade, tolerante à seca. Entrega na fazenda.', price: 690, unit: 'saca', cta: 'Comprar', chains: ['graos'], photo: photo('realys-milho'), sponsored: true },
  { id: 'ag2', sector: 'agro', seg: 'insumos', icon: '🪴', title: 'Adubo orgânico certificado', who: 'BioSolo Fertilizantes', detail: 'Composto orgânico para hortaliças, café e frutas.', price: 1450, unit: 'tonelada', cta: 'Comprar', chains: ['horti', 'cafe'], photo: photo('realys-adubo') },
  { id: 'ag3', sector: 'agro', seg: 'insumos', icon: '☕', title: 'Mudas de café arábica (bandeja com 100)', who: 'Viveiro Serra Alta', detail: 'Mudas certificadas, prontas para o plantio.', price: 180, unit: 'bandeja', cta: 'Comprar', chains: ['cafe'], photo: photo('realys-mudas') },
  { id: 'ag4', sector: 'agro', seg: 'maquinas', icon: '🚜', title: 'Trator 75 cv para alugar', who: 'AgroLoc Máquinas', detail: 'Com grade e roçadeira. Leva e busca na propriedade.', price: 950, unit: 'diária', cta: 'Alugar', chains: ALL_CHAINS, photo: photo('realys-trator') },
  { id: 'ag5', sector: 'agro', seg: 'maquinas', icon: '🌾', title: 'Colheitadeira com operador', who: 'AgroLoc Máquinas', detail: 'Soja, milho e trigo. Agende a safra com antecedência.', price: 380, unit: 'hora', cta: 'Alugar', chains: ['graos'], photo: photo('realys-colheita') },
  { id: 'ag6', sector: 'agro', seg: 'maquinas', icon: '🛰️', title: 'Piloto automático GPS para trator', who: 'Precisão Agro', detail: 'Linhas retas sem sobreposição: economia de semente, adubo e diesel.', price: 18900, unit: 'kit instalado', cta: 'Comprar', chains: ['graos'], photo: photo('realys-gpstrator'), agrotech: true },
  { id: 'ag7', sector: 'agro', seg: 'servicos', icon: '👩‍🌾', title: 'Visita técnica de agrônomo', who: 'Eng. Agr. Mariana Campos', detail: 'Solo, pragas, adubação e plano de safra. Veja o perfil e a nota.', price: 250, unit: 'visita', cta: 'Ver profissional', go: { tab: 'servicos', service: 'agronomo' }, chains: ALL_CHAINS, photo: photo('realys-agronoma') },
  { id: 'ag8', sector: 'agro', seg: 'servicos', icon: '🧪', title: 'Análise de solo completa', who: 'LabSolo Análises', detail: 'Coleta na fazenda e laudo no app em até 7 dias.', price: 120, unit: 'amostra', cta: 'Contratar', chains: ['graos', 'cafe', 'horti', 'pecuaria'], photo: photo('realys-solo') },
  { id: 'ag9', sector: 'agro', seg: 'servicos', icon: '🚁', title: 'Pulverização com drone', who: 'Céu Verde Drones', detail: 'Aplicação precisa, sem amassar a lavoura. Preço por hectare.', price: 90, unit: 'hectare', cta: 'Ver profissional', go: { tab: 'servicos', service: 'droneagro' }, chains: ['graos', 'cafe'], photo: photo('realys-drone'), agrotech: true },
  { id: 'ag10', sector: 'agro', seg: 'servicos', icon: '📡', title: 'Sensores de umidade do solo com alerta no celular', who: 'SoloSmart IoT', detail: 'Avisa no Realys a hora certa de irrigar. Economia de até 30% de água.', price: 1290, unit: 'kit', cta: 'Comprar', chains: ['graos', 'cafe', 'horti'], photo: photo('realys-sensor'), agrotech: true },
  { id: 'ag11', sector: 'agro', seg: 'producao', icon: '☕', title: 'Café especial direto do produtor (saca 60 kg)', who: 'Sítio Boa Esperança · Sul de Minas', detail: 'Para cafeterias e torrefações. Amostra grátis para empresas.', price: 1850, unit: 'saca', cta: 'Comprar', chains: ['cafe'], photo: photo('realys-cafe') },
  { id: 'ag12', sector: 'agro', seg: 'producao', icon: '🥬', title: 'Hortifrúti para restaurantes (entrega semanal)', who: 'Cooperativa Raízes', detail: 'Colhido na véspera. Monte a lista da semana e receba proposta.', price: null, cta: 'Pedir orçamento', chains: ['horti'], photo: photo('realys-horti') },
  { id: 'ag13', sector: 'agro', seg: 'producao', icon: '🧀', title: 'Leite e queijos da fazenda', who: 'Laticínios Campo Bom', detail: 'Queijo minas, muçarela e requeijão. Atacado para mercados.', price: 32, unit: 'kg', cta: 'Comprar', chains: ['leite'], photo: photo('realys-queijo') },
  // Subgrupos: grãos, café, pecuária, hortifrúti e leite.
  { id: 'ag14', sector: 'agro', seg: 'servicos', icon: '🏗️', title: 'Armazenagem de grãos em silo', who: 'Silo Forte Armazéns', detail: 'Guarde a safra e venda na melhor hora. Laudo de umidade e seguro.', price: 2.8, unit: 'saca por mês', cta: 'Contratar', chains: ['graos'], photo: photo('realys-silo') },
  { id: 'ag15', sector: 'agro', seg: 'producao', icon: '🫘', title: 'Soja direto do produtor (lote de 1.000 sacas)', who: 'Fazenda Santa Clara · Rio Verde - GO', detail: 'Para cerealistas e indústrias. Entrega FOB na fazenda.', price: null, cta: 'Pedir orçamento', chains: ['graos'], photo: photo('realys-soja') },
  { id: 'ag16', sector: 'agro', seg: 'maquinas', icon: '🌀', title: 'Derriçadeira portátil para café', who: 'CafeMaq', detail: 'Colheita mais rápida e menos cansativa. Bateria de longa duração.', price: 2490, unit: 'unidade', cta: 'Comprar', chains: ['cafe'], photo: photo('realys-derricadeira') },
  { id: 'ag17', sector: 'agro', seg: 'servicos', icon: '🔬', title: 'Classificação e prova do seu café', who: 'LabCafé Qualidade', detail: 'Nota SCA e laudo para vender como café especial.', price: 60, unit: 'amostra', cta: 'Contratar', chains: ['cafe'], photo: photo('realys-provacafe') },
  { id: 'ag18', sector: 'agro', seg: 'insumos', icon: '🌾', title: 'Ração para gado de corte (saca 40 kg)', who: 'Nutri Boi Rações', detail: 'Engorda e suplemento mineral. Entrega no curral.', price: 89, unit: 'saca', cta: 'Comprar', chains: ['pecuaria'], photo: photo('realys-racao') },
  { id: 'ag19', sector: 'agro', seg: 'servicos', icon: '🩺', title: 'Veterinário rural (visita na fazenda)', who: 'Dr. Henrique Alves · CRMV', detail: 'Vacinação, reprodução e saúde do rebanho. Veja o perfil e o preço.', price: 200, unit: 'visita', cta: 'Ver profissional', go: { tab: 'servicos', service: 'veterinario' }, chains: ['pecuaria', 'leite'], photo: photo('realys-vet') },
  { id: 'ag20', sector: 'agro', seg: 'maquinas', icon: '🏷️', title: 'Brinco eletrônico com app de pesagem', who: 'RebanhoTech', detail: 'Cada animal com peso, vacinas e ganho diário no celular.', price: 14.9, unit: 'brinco', cta: 'Comprar', chains: ['pecuaria', 'leite'], photo: photo('realys-brinco'), agrotech: true },
  { id: 'ag21', sector: 'agro', seg: 'producao', icon: '🐂', title: 'Leilão virtual de gado (ao vivo)', who: 'Leilões Campo Real', detail: 'Lotes de nelore e angus com vídeo, peso e GTA. Lances pelo app.', price: 0, unit: 'inscrição', cta: 'Inscrever-se', chains: ['pecuaria'], photo: photo('realys-leilao'), sponsored: true },
  { id: 'ag22', sector: 'agro', seg: 'producao', icon: '🐄', title: 'Bezerros nelore desmamados', who: 'Fazenda Três Marias · MS', detail: 'Lotes de 20 cabeças, vacinados e com GTA.', price: 2600, unit: 'cabeça', cta: 'Comprar', chains: ['pecuaria'], photo: photo('realys-bezerro') },
  { id: 'ag23', sector: 'agro', seg: 'maquinas', icon: '💧', title: 'Estufa com irrigação por gotejamento', who: 'HortaPro Estufas', detail: 'Montagem no local e irrigação ligada ao celular.', price: 8900, unit: 'kit 200 m²', cta: 'Comprar', chains: ['horti'], photo: photo('realys-estufa'), agrotech: true },
  { id: 'ag24', sector: 'agro', seg: 'insumos', icon: '🌱', title: 'Mudas de hortaliças (bandeja com 200)', who: 'Viveiro Verde Vida', detail: 'Alface, tomate, pimentão e cheiro-verde.', price: 45, unit: 'bandeja', cta: 'Comprar', chains: ['horti'], photo: photo('realys-mudashorta') },
  { id: 'ag25', sector: 'agro', seg: 'maquinas', icon: '🥛', title: 'Ordenhadeira mecânica (2 conjuntos)', who: 'LeiteMaq', detail: 'Ordenha mais rápida e higiênica. Instalação inclusa.', price: 7900, unit: 'unidade', cta: 'Comprar', chains: ['leite'], photo: photo('realys-ordenha') },
  { id: 'ag26', sector: 'agro', seg: 'maquinas', icon: '❄️', title: 'Tanque resfriador 1.000 L para alugar', who: 'FrioCampo Locações', detail: 'Mantém o leite a 4 °C até a coleta.', price: 650, unit: 'mês', cta: 'Alugar', chains: ['leite'], photo: photo('realys-tanque') },
  { id: 'ag27', sector: 'agro', seg: 'producao', icon: '🚛', title: 'Leite cru para laticínios (contrato de coleta)', who: 'Associação Leite Bom · Sul de MG', detail: '12 mil litros por dia, com análise de qualidade a cada coleta.', price: null, cta: 'Pedir orçamento', chains: ['leite'], photo: photo('realys-coleta') },
];

// Cotações de exemplo (na versão real vêm de uma fonte oficial, atualizadas no servidor).
export const agroQuotes = [
  { key: 'soja', label: 'Soja', unit: 'saca 60 kg', value: 128.4, change: 1.2, chain: 'graos', main: true },
  { key: 'milho', label: 'Milho', unit: 'saca 60 kg', value: 62.1, change: -0.8, chain: 'graos', main: true },
  { key: 'trigo', label: 'Trigo', unit: 'saca 60 kg', value: 78.3, change: 0.3, chain: 'graos' },
  { key: 'cafe', label: 'Café arábica', unit: 'saca 60 kg', value: 1520, change: 2.4, chain: 'cafe', main: true },
  { key: 'conilon', label: 'Café conilon', unit: 'saca 60 kg', value: 1180, change: 1.1, chain: 'cafe' },
  { key: 'boi', label: 'Boi gordo', unit: 'arroba', value: 312, change: 0.5, chain: 'pecuaria', main: true },
  { key: 'bezerro', label: 'Bezerro', unit: 'cabeça', value: 2550, change: -0.4, chain: 'pecuaria' },
  { key: 'tomate', label: 'Tomate', unit: 'caixa 20 kg', value: 85, change: -3.2, chain: 'horti' },
  { key: 'alface', label: 'Alface', unit: 'engradado', value: 38, change: 1.5, chain: 'horti' },
  { key: 'leite', label: 'Leite ao produtor', unit: 'litro', value: 2.45, change: 0.8, chain: 'leite' },
];

export const agroWeather = { place: 'Ribeirão Preto - SP', temp: 28, rain: 20, wind: 8, tip: 'Janela boa para pulverizar até as 10h (vento fraco).' };

// Resultado simulado do diagnóstico por foto (IA). Na versão real a foto vai para o servidor.
export const leafDiagnoses = [
  { crop: 'Soja', problem: 'Ferrugem asiática', confidence: 87, advice: 'Aplicar fungicida indicado pelo agrônomo nos próximos dias e revisar a lavoura vizinha.', chain: 'graos' },
  { crop: 'Milho', problem: 'Lagarta-do-cartucho', confidence: 91, advice: 'Fazer o monitoramento por talhão; controle biológico ou químico conforme a recomendação técnica.', chain: 'graos' },
  { crop: 'Tomate', problem: 'Requeima', confidence: 85, advice: 'Retirar as folhas atingidas, evitar molhar as folhas na irrigação e falar com o agrônomo sobre o controle.', chain: 'horti' },
  { crop: 'Café', problem: 'Bicho-mineiro', confidence: 82, advice: 'Conferir a infestação em 100 folhas por talhão antes de decidir a aplicação.', chain: 'cafe' },
];
