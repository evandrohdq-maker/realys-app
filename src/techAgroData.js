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

// price null = sob orçamento. go = abre outra tela do app em vez de comprar aqui.
export const sectorItems = [
  // ───────────── Tecnologia ─────────────
  { id: 'tk1', sector: 'tech', seg: 'ia', icon: '🤖', title: 'Atendente com IA no WhatsApp da sua loja', who: 'NeuralBR Soluções', detail: 'Responde clientes 24 h, mostra produtos do seu Shop Realys e fecha pedidos.', price: 149, unit: 'mês', cta: 'Assinar', photo: photo('realys-ia-chat'), sponsored: true },
  { id: 'tk2', sector: 'tech', seg: 'ia', icon: '🧾', title: 'IA que lê notas e lança no fluxo de caixa', who: 'ContaFácil IA', detail: 'Fotografe a nota: a IA separa valores e lança no Caixa da área empresarial.', price: 79, unit: 'mês', cta: 'Assinar', photo: photo('realys-ia-nota') },
  { id: 'tk3', sector: 'tech', seg: 'ia', icon: '🍃', title: 'IA que identifica pragas pela foto da folha', who: 'AgroVisão IA', detail: 'Tire a foto na lavoura e receba o diagnóstico e o que fazer. Funciona na aba Agro.', price: 39, unit: 'mês', cta: 'Assinar', photo: photo('realys-ia-folha'), agrotech: true },
  { id: 'tk4', sector: 'tech', seg: 'robotica', icon: '🦾', title: 'Kit de robótica educacional (8 a 14 anos)', who: 'RoboKids Brasil', detail: 'Motores, sensores e app para programar. Envia para todo o Brasil.', price: 389.9, unit: 'kit', cta: 'Comprar', photo: photo('realys-robokit') },
  { id: 'tk5', sector: 'tech', seg: 'robotica', icon: '🏭', title: 'Braço robótico para linha de produção', who: 'Automatiza Indústria', detail: 'Embalagem, solda e separação. Projeto e instalação na sua fábrica.', price: null, cta: 'Pedir orçamento', photo: photo('realys-braco') },
  { id: 'tk6', sector: 'tech', seg: 'robotica', icon: '🚜', title: 'Robô autônomo de capina e colheita', who: 'FieldBot Agro', detail: 'Anda sozinho entre as linhas, tira o mato sem veneno e conta os frutos.', price: null, cta: 'Pedir orçamento', photo: photo('realys-fieldbot'), agrotech: true },
  { id: 'tk7', sector: 'tech', seg: 'apps', icon: '📱', title: 'Criamos o app da sua empresa', who: 'Diego Martins · Dev', detail: 'Apps Android e iPhone, sites e integrações com IA. Veja o perfil e o preço.', price: 120, unit: 'hora', cta: 'Ver profissional', go: { tab: 'servicos', service: 'dev' }, photo: photo('realys-dev') },
  { id: 'tk8', sector: 'tech', seg: 'apps', icon: '📊', title: 'Sistema de gestão para pequenas empresas', who: 'GestorPlus', detail: 'Vendas, estoque e funcionários. Conecta com a área empresarial do Realys.', price: 59.9, unit: 'mês', cta: 'Assinar', photo: photo('realys-gestor') },
  { id: 'tk9', sector: 'tech', seg: 'apps', icon: '🌾', title: 'App de gestão da fazenda', who: 'Fazenda Conectada', detail: 'Talhões no mapa, plantio, colheita, custos por hectare e funcionários.', price: 89.9, unit: 'mês', cta: 'Assinar', photo: photo('realys-fazendaapp'), agrotech: true },
  { id: 'tk10', sector: 'tech', seg: 'cursos', icon: '🎓', title: 'IA para negócios (online, com certificado)', who: 'Escola Futuro Digital', detail: '8 semanas: usar IA no atendimento, nas vendas e na gestão.', price: 197, unit: 'curso', cta: 'Inscrever-se', photo: photo('realys-cursoia') },
  { id: 'tk11', sector: 'tech', seg: 'cursos', icon: '🔧', title: 'Oficina de robótica com Arduino', who: 'Maker Space SP', detail: 'Aos sábados, presencial. Monte e programe seu primeiro robô.', price: 120, unit: 'aula', cta: 'Inscrever-se', photo: photo('realys-arduino') },
  { id: 'tk12', sector: 'tech', seg: 'cursos', icon: '🚀', title: 'Hackathon Agro + Tech 2026', who: 'Realys Lab', detail: '48 h para criar soluções para o campo. Prêmios para os 3 melhores times.', price: 0, unit: 'inscrição', cta: 'Inscrever-se', photo: photo('realys-hackathon'), agrotech: true, sponsored: true },

  // ───────────── Agro ─────────────
  { id: 'ag1', sector: 'agro', seg: 'insumos', icon: '🌽', title: 'Sementes de milho híbrido (saca 60 mil)', who: 'Sementes Vale Verde', detail: 'Alta produtividade, tolerante à seca. Entrega na fazenda.', price: 690, unit: 'saca', cta: 'Comprar', photo: photo('realys-milho'), sponsored: true },
  { id: 'ag2', sector: 'agro', seg: 'insumos', icon: '🪴', title: 'Adubo orgânico certificado', who: 'BioSolo Fertilizantes', detail: 'Composto orgânico para hortaliças, café e frutas.', price: 1450, unit: 'tonelada', cta: 'Comprar', photo: photo('realys-adubo') },
  { id: 'ag3', sector: 'agro', seg: 'insumos', icon: '☕', title: 'Mudas de café arábica (bandeja com 100)', who: 'Viveiro Serra Alta', detail: 'Mudas certificadas, prontas para o plantio.', price: 180, unit: 'bandeja', cta: 'Comprar', photo: photo('realys-mudas') },
  { id: 'ag4', sector: 'agro', seg: 'maquinas', icon: '🚜', title: 'Trator 75 cv para alugar', who: 'AgroLoc Máquinas', detail: 'Com grade e roçadeira. Leva e busca na propriedade.', price: 950, unit: 'diária', cta: 'Alugar', photo: photo('realys-trator') },
  { id: 'ag5', sector: 'agro', seg: 'maquinas', icon: '🌾', title: 'Colheitadeira com operador', who: 'AgroLoc Máquinas', detail: 'Soja, milho e trigo. Agende a safra com antecedência.', price: 380, unit: 'hora', cta: 'Alugar', photo: photo('realys-colheita') },
  { id: 'ag6', sector: 'agro', seg: 'maquinas', icon: '🛰️', title: 'Piloto automático GPS para trator', who: 'Precisão Agro', detail: 'Linhas retas sem sobreposição: economia de semente, adubo e diesel.', price: 18900, unit: 'kit instalado', cta: 'Comprar', photo: photo('realys-gpstrator'), agrotech: true },
  { id: 'ag7', sector: 'agro', seg: 'servicos', icon: '👩‍🌾', title: 'Visita técnica de agrônomo', who: 'Eng. Agr. Mariana Campos', detail: 'Solo, pragas, adubação e plano de safra. Veja o perfil e a nota.', price: 250, unit: 'visita', cta: 'Ver profissional', go: { tab: 'servicos', service: 'agronomo' }, photo: photo('realys-agronoma') },
  { id: 'ag8', sector: 'agro', seg: 'servicos', icon: '🧪', title: 'Análise de solo completa', who: 'LabSolo Análises', detail: 'Coleta na fazenda e laudo no app em até 7 dias.', price: 120, unit: 'amostra', cta: 'Contratar', photo: photo('realys-solo') },
  { id: 'ag9', sector: 'agro', seg: 'servicos', icon: '🚁', title: 'Pulverização com drone', who: 'Céu Verde Drones', detail: 'Aplicação precisa, sem amassar a lavoura. Preço por hectare.', price: 90, unit: 'hectare', cta: 'Ver profissional', go: { tab: 'servicos', service: 'droneagro' }, photo: photo('realys-drone'), agrotech: true },
  { id: 'ag10', sector: 'agro', seg: 'servicos', icon: '📡', title: 'Sensores de umidade do solo com alerta no celular', who: 'SoloSmart IoT', detail: 'Avisa no Realys a hora certa de irrigar. Economia de até 30% de água.', price: 1290, unit: 'kit', cta: 'Comprar', photo: photo('realys-sensor'), agrotech: true },
  { id: 'ag11', sector: 'agro', seg: 'producao', icon: '☕', title: 'Café especial direto do produtor (saca 60 kg)', who: 'Sítio Boa Esperança · Sul de Minas', detail: 'Para cafeterias e torrefações. Amostra grátis para empresas.', price: 1850, unit: 'saca', cta: 'Comprar', photo: photo('realys-cafe') },
  { id: 'ag12', sector: 'agro', seg: 'producao', icon: '🥬', title: 'Hortifrúti para restaurantes (entrega semanal)', who: 'Cooperativa Raízes', detail: 'Colhido na véspera. Monte a lista da semana e receba proposta.', price: null, cta: 'Pedir orçamento', photo: photo('realys-horti') },
  { id: 'ag13', sector: 'agro', seg: 'producao', icon: '🧀', title: 'Leite e queijos da fazenda', who: 'Laticínios Campo Bom', detail: 'Queijo minas, muçarela e requeijão. Atacado para mercados.', price: 32, unit: 'kg', cta: 'Comprar', photo: photo('realys-queijo') },
];

// Cotações de exemplo (na versão real vêm de uma fonte oficial, atualizadas no servidor).
export const agroQuotes = [
  { key: 'soja', label: 'Soja', unit: 'saca 60 kg', value: 128.4, change: 1.2 },
  { key: 'milho', label: 'Milho', unit: 'saca 60 kg', value: 62.1, change: -0.8 },
  { key: 'cafe', label: 'Café arábica', unit: 'saca 60 kg', value: 1520, change: 2.4 },
  { key: 'boi', label: 'Boi gordo', unit: 'arroba', value: 312, change: 0.5 },
];

export const agroWeather = { place: 'Ribeirão Preto - SP', temp: 28, rain: 20, wind: 8, tip: 'Janela boa para pulverizar até as 10h (vento fraco).' };

// Resultado simulado do diagnóstico por foto (IA). Na versão real a foto vai para o servidor.
export const leafDiagnoses = [
  { crop: 'Soja', problem: 'Ferrugem asiática', confidence: 87, advice: 'Aplicar fungicida indicado pelo agrônomo nos próximos dias e revisar a lavoura vizinha.' },
  { crop: 'Milho', problem: 'Lagarta-do-cartucho', confidence: 91, advice: 'Fazer o monitoramento por talhão; controle biológico ou químico conforme a recomendação técnica.' },
  { crop: 'Café', problem: 'Bicho-mineiro', confidence: 82, advice: 'Conferir a infestação em 100 folhas por talhão antes de decidir a aplicação.' },
];
