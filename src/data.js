// Dados de demonstração do Realys. Tudo aqui é fictício, para apresentação.
// Fotos vêm do picsum.photos (precisam de internet no celular).

const photo = (seed, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const MY_COMPANY_ID = 'e1';
export const MY_SUPPLIER_ID = 's1';

export const stores = [
  {
    id: 'e1',
    name: 'Mercadinho Bom Preço',
    category: 'Mercado',
    city: 'São Paulo - SP',
    rating: 4.8,
    recommended: true,
    sponsored: false,
    shipsBrazil: false,
    cover: photo('realys-mercado'),
    logo: '🛒',
  },
  {
    id: 'e2',
    name: 'Pizzaria da Praça',
    category: 'Alimentação',
    city: 'São Paulo - SP',
    rating: 4.9,
    recommended: true,
    sponsored: true,
    shipsBrazil: false,
    cover: photo('realys-pizza'),
    logo: '🍕',
  },
  {
    id: 'e3',
    name: 'Moda Brasil',
    category: 'Roupas',
    city: 'Belo Horizonte - MG',
    rating: 4.6,
    recommended: false,
    sponsored: true,
    shipsBrazil: true,
    cover: photo('realys-moda'),
    logo: '👕',
  },
  {
    id: 'e4',
    name: 'Tech Center',
    category: 'Eletrônicos',
    city: 'Curitiba - PR',
    rating: 4.7,
    recommended: true,
    sponsored: false,
    shipsBrazil: true,
    cover: photo('realys-tech'),
    logo: '📱',
  },
  {
    id: 'e5',
    name: 'Burguer do Zé',
    category: 'Alimentação',
    city: 'São Paulo - SP',
    rating: 4.5,
    recommended: false,
    sponsored: false,
    shipsBrazil: false,
    cover: photo('realys-burger'),
    logo: '🍔',
  },
];

export const products = [
  { id: 'p1', storeId: 'e1', name: 'Arroz Tipo 1 - 5kg', price: 27.9, cost: 21.0, stock: 42, minStock: 10, emoji: '🍚', tint: '#FFF4D6', featured: true },
  { id: 'p2', storeId: 'e1', name: 'Feijão Carioca - 1kg', price: 8.49, cost: 6.1, stock: 8, minStock: 15, emoji: '🫘', tint: '#F6E7DA', featured: false },
  { id: 'p3', storeId: 'e1', name: 'Café Torrado 500g', price: 18.9, cost: 13.5, stock: 25, minStock: 10, emoji: '☕', tint: '#EADBCF', featured: true },
  { id: 'p4', storeId: 'e1', name: 'Leite Integral 1L', price: 5.29, cost: 3.9, stock: 60, minStock: 24, emoji: '🥛', tint: '#EEF5FB', featured: false },
  { id: 'p5', storeId: 'e1', name: 'Farinha de Trigo 1kg', price: 6.5, cost: 4.4, stock: 5, minStock: 12, emoji: '🌾', tint: '#FBF1DC', featured: false },
  { id: 'p6', storeId: 'e2', name: 'Pizza Calabresa Grande', price: 54.9, cost: 22.0, stock: 99, minStock: 0, emoji: '🍕', tint: '#FFE3D6', featured: true },
  { id: 'p7', storeId: 'e2', name: 'Pizza Margherita Grande', price: 52.9, cost: 21.0, stock: 99, minStock: 0, emoji: '🍅', tint: '#FFE0E0', featured: false },
  { id: 'p8', storeId: 'e3', name: 'Camiseta Algodão Premium', price: 69.9, cost: 28.0, stock: 120, minStock: 20, emoji: '👕', tint: '#E3ECFF', featured: true },
  { id: 'p9', storeId: 'e3', name: 'Tênis Casual Unissex', price: 199.9, cost: 95.0, stock: 34, minStock: 10, emoji: '👟', tint: '#E8E8F5', featured: false },
  { id: 'p10', storeId: 'e4', name: 'Fone Bluetooth Pro', price: 149.9, cost: 70.0, stock: 18, minStock: 5, emoji: '🎧', tint: '#E2F1F7', featured: true },
  { id: 'p11', storeId: 'e4', name: 'Carregador Turbo 30W', price: 79.9, cost: 32.0, stock: 50, minStock: 10, emoji: '🔌', tint: '#EDEDED', featured: false },
  { id: 'p12', storeId: 'e5', name: 'Combo X-Burguer + Fritas', price: 34.9, cost: 14.0, stock: 99, minStock: 0, emoji: '🍔', tint: '#FFF0D9', featured: true },
];

export const posts = [
  {
    id: 'f1',
    storeId: 'e2',
    author: 'Pizzaria da Praça',
    verified: true,
    sponsored: true,
    image: photo('realys-post-pizza', 800, 800),
    text: 'Terça da Pizza! Peça pelo Realys e ganhe refrigerante 2L. 🍕',
    productId: 'p6',
    likes: 1284,
    comments: 96,
    type: 'video',
  },
  {
    id: 'f2',
    storeId: 'e3',
    author: 'Moda Brasil',
    verified: true,
    sponsored: false,
    image: photo('realys-post-moda', 800, 800),
    text: 'Nova coleção chegou. Enviamos para todo o Brasil com pagamento protegido.',
    productId: 'p8',
    likes: 842,
    comments: 41,
    type: 'foto',
  },
  {
    id: 'f3',
    storeId: null,
    author: 'Ana Souza',
    verified: true,
    sponsored: false,
    image: photo('realys-post-ana', 800, 800),
    text: 'Final de semana no parque com a família. Aqui todo mundo é gente de verdade! 💚',
    productId: null,
    likes: 213,
    comments: 18,
    type: 'foto',
  },
  {
    id: 'f4',
    storeId: 'e4',
    author: 'Tech Center',
    verified: true,
    sponsored: false,
    image: photo('realys-post-tech', 800, 800),
    text: 'Fone Bluetooth Pro com 30h de bateria. Garantia de 1 ano.',
    productId: 'p10',
    likes: 530,
    comments: 27,
    type: 'video',
  },
];

// Tipos de serviço. O assistente de voz reconhece qualquer um pelas palavras-chave.
// A ordem importa: os mais específicos vêm antes (ex.: "carro quebrou" = mecânico, não corrida).
export const serviceTypes = [
  { key: 'mecanico', label: 'Mecânico', icon: '🔧', group: 'Veículos', words: ['mecanico', 'oficina', 'pneu', 'carro quebrou', 'carro nao liga', 'carro parou', 'bateria do carro', 'guincho', 'problema no motor'] },
  { key: 'eletricista', label: 'Eletricista', icon: '💡', group: 'Casa e reparos', words: ['eletricista', 'eletrica', 'tomada', 'chuveiro', 'disjuntor', 'fiacao', 'curto', 'sem luz'] },
  { key: 'encanador', label: 'Encanador', icon: '🚰', group: 'Casa e reparos', words: ['encanador', 'vazamento', 'vazando', 'cano', 'torneira', 'esgoto', 'entupi', 'descarga'] },
  { key: 'diarista', label: 'Diarista', icon: '🧹', group: 'Casa e reparos', words: ['diarista', 'faxina', 'limpeza', 'limpar'] },
  { key: 'pintor', label: 'Pintor', icon: '🎨', group: 'Casa e reparos', words: ['pintor', 'pintar', 'pintura'] },
  { key: 'chaveiro', label: 'Chaveiro', icon: '🔑', group: 'Casa e reparos', words: ['chaveiro', 'chave', 'fechadura', 'tranquei'] },
  { key: 'tecnico', label: 'Técnico de informática', icon: '💻', group: 'Tecnologia', words: ['tecnico', 'computador', 'notebook', 'informatica', 'celular quebrado', 'internet'] },
  { key: 'frete', label: 'Frete e mudança', icon: '🚚', group: 'Transporte', words: ['frete', 'mudanca', 'carreto'] },
  { key: 'motoboy', label: 'Motoboy', icon: '🛵', group: 'Transporte', words: ['motoboy', 'moto boy', 'entregador', 'encomenda'] },
  { key: 'motorista', label: 'Motorista', icon: '🚗', group: 'Transporte', words: ['uber', 'carro', 'motorista', 'corrida', 'taxi', 'carona'] },
];

export const providers = [
  { id: 'v1', name: 'Carlos Lima', service: 'motorista', rating: 4.9, distanceKm: 0.8, vehicle: 'Chevrolet Onix prata', plate: 'BRA2E19', functions: ['Corridas na cidade', 'Aeroporto', 'Viagens intermunicipais'], price: 8, priceUnit: 'corrida + R$ 2,50/km', photo: photo('realys-carlos', 200, 200) },
  { id: 'v3', name: 'Juliana Rocha', service: 'motorista', rating: 4.7, distanceKm: 2.1, vehicle: 'Hyundai HB20 branco', plate: 'QWE7C31', functions: ['Corridas na cidade', 'Carro com cadeirinha infantil'], price: 8, priceUnit: 'corrida + R$ 2,50/km', photo: photo('realys-juliana', 200, 200) },
  { id: 'v2', name: 'Marcos Silva', service: 'motoboy', rating: 4.8, distanceKm: 1.2, vehicle: 'Honda CG 160 preta', plate: 'RLY4A22', functions: ['Entregas rápidas', 'Documentos', 'Compras no mercado'], price: 7, priceUnit: 'entrega + R$ 1,50/km', photo: photo('realys-marcos', 200, 200) },
  { id: 'v5', name: 'Rafael Costa', service: 'motoboy', rating: 4.6, distanceKm: 3.9, vehicle: 'Yamaha Factor azul', plate: 'MTO1B08', functions: ['Entregas rápidas', 'Delivery de restaurantes'], price: 7, priceUnit: 'entrega + R$ 1,50/km', photo: photo('realys-rafael', 200, 200) },
  { id: 'v4', name: 'Pedro Alves', service: 'eletricista', rating: 4.9, distanceKm: 3.4, vehicle: 'Fiat Fiorino branca', plate: 'ELT3D45', functions: ['Instalação de chuveiro', 'Tomadas e interruptores', 'Quadro de luz e disjuntores', 'Fiação nova'], price: 80, priceUnit: 'hora', photo: photo('realys-pedro', 200, 200) },
  { id: 'v13', name: 'Marcelo Teixeira', service: 'eletricista', rating: 4.7, distanceKm: 5.8, vehicle: null, plate: null, functions: ['Instalação de ventilador de teto', 'Padrão de energia', 'Iluminação de LED'], price: 150, priceUnit: 'visita', photo: photo('realys-marcelo', 200, 200) },
  { id: 'v14', name: 'Paulo Henrique', service: 'encanador', rating: 4.9, distanceKm: 4.2, vehicle: null, plate: null, functions: ['Caça-vazamento', 'Aquecedor a gás', 'Desentupimento'], price: 120, priceUnit: 'serviço', photo: photo('realys-paulo', 200, 200) },
  { id: 'v15', name: 'Oficina do Beto (socorro)', service: 'mecanico', rating: 4.6, distanceKm: 4.8, vehicle: 'Guincho plataforma', plate: 'GCH6M21', functions: ['Guincho 24h', 'Troca de pneu na rua', 'Carga de bateria'], price: 180, priceUnit: 'serviço', photo: photo('realys-beto', 200, 200) },
  { id: 'v7', name: 'Roberto Nunes', service: 'mecanico', rating: 4.8, distanceKm: 2.6, vehicle: 'Oficina móvel - Strada vermelha', plate: 'MEC8F12', functions: ['Mecânica geral', 'Troca de óleo', 'Bateria e pneu', 'Atendimento na rua (socorro)'], price: 120, priceUnit: 'hora', photo: photo('realys-roberto', 200, 200) },
  { id: 'v8', name: 'Antônio Ferreira', service: 'encanador', rating: 4.7, distanceKm: 1.9, vehicle: 'VW Saveiro prata', plate: 'HID5K77', functions: ['Vazamentos', 'Desentupimento', 'Instalação de torneiras e caixa d\'água'], price: 90, priceUnit: 'hora', photo: photo('realys-antonio', 200, 200) },
  { id: 'v6', name: 'Fernanda Dias', service: 'diarista', rating: 5.0, distanceKm: 4.5, vehicle: null, plate: null, functions: ['Faxina completa', 'Limpeza pós-obra', 'Passar roupa'], price: 180, priceUnit: 'diária (8h)', photo: photo('realys-fernanda', 200, 200) },
  { id: 'v9', name: 'Lucas Pinheiro', service: 'pintor', rating: 4.6, distanceKm: 5.2, vehicle: null, plate: null, functions: ['Pintura interna e externa', 'Textura', 'Massa corrida'], price: 35, priceUnit: 'm²', photo: photo('realys-lucas', 200, 200) },
  { id: 'v10', name: 'Sandra Melo', service: 'chaveiro', rating: 4.9, distanceKm: 1.5, vehicle: 'Moto Honda Biz', plate: 'CHV2A90', functions: ['Abertura de portas', 'Cópia de chaves', 'Troca de fechadura'], price: 60, priceUnit: 'serviço', photo: photo('realys-sandra', 200, 200) },
  { id: 'v11', name: 'Thiago Ramos', service: 'tecnico', rating: 4.8, distanceKm: 3.0, vehicle: null, plate: null, functions: ['Formatação', 'Rede e Wi-Fi', 'Conserto de notebook e celular'], price: 100, priceUnit: 'hora', photo: photo('realys-thiago', 200, 200) },
  { id: 'v12', name: 'José Carreto', service: 'frete', rating: 4.5, distanceKm: 6.1, vehicle: 'Caminhão baú 3/4', plate: 'FRT9J03', functions: ['Fretes', 'Mudanças pequenas', 'Entregas de móveis'], price: 150, priceUnit: 'frete (até 10 km)', photo: photo('realys-jose', 200, 200) },
];

export const suppliers = [
  { id: 's1', name: 'Distribuidora Real Alimentos', city: 'Campinas - SP', rating: 4.8, logo: '🚚' },
  { id: 's2', name: 'Atacadão do Café', city: 'Franca - SP', rating: 4.6, logo: '☕' },
];

// Catálogo atacado (B2B). Só empresas com CNPJ verificado veem estes preços.
export const supplierItems = [
  { id: 'si1', supplierId: 's1', name: 'Feijão Carioca - 1kg', unitPrice: 5.6, minQty: 30, tiers: [{ qty: 50, off: 5 }, { qty: 200, off: 10 }], emoji: '🫘' },
  { id: 'si2', supplierId: 's1', name: 'Farinha de Trigo 1kg', unitPrice: 3.9, minQty: 20, tiers: [{ qty: 50, off: 5 }, { qty: 200, off: 12 }], emoji: '🌾' },
  { id: 'si3', supplierId: 's1', name: 'Arroz Tipo 1 - 5kg', unitPrice: 19.5, minQty: 20, tiers: [{ qty: 100, off: 6 }], emoji: '🍚' },
  { id: 'si4', supplierId: 's2', name: 'Café Torrado 500g', unitPrice: 12.2, minQty: 24, tiers: [{ qty: 96, off: 8 }], emoji: '☕' },
];

export const salesByDay = [
  { label: 'Qua', value: 1840 },
  { label: 'Qui', value: 2210 },
  { label: 'Sex', value: 3120 },
  { label: 'Sáb', value: 3980 },
  { label: 'Dom', value: 2650 },
  { label: 'Seg', value: 1720 },
  { label: 'Hoje', value: 1290 },
];

export const finance = [
  { id: 'm1', date: '03/11', desc: 'Vendas no app Realys', type: 'entrada', value: 1290.4 },
  { id: 'm2', date: '03/11', desc: 'Vendas no balcão', type: 'entrada', value: 640.0 },
  { id: 'm3', date: '02/11', desc: 'Fornecedor - Distribuidora Real', type: 'saida', value: 980.0 },
  { id: 'm4', date: '01/11', desc: 'Aluguel da loja', type: 'saida', value: 2500.0 },
  { id: 'm5', date: '01/11', desc: 'Vídeo patrocinado no Realys', type: 'saida', value: 49.9 },
  { id: 'm6', date: '31/10', desc: 'Vendas no app Realys', type: 'entrada', value: 2650.2 },
];

export const upcomingBills = [
  { id: 'b1', due: '10/11', desc: 'Energia elétrica', value: 420.0 },
  { id: 'b2', due: '15/11', desc: 'Salários (2 funcionários)', value: 3600.0 },
  { id: 'b3', due: '20/11', desc: 'Plano mensal Realys Empresas', value: 89.9 },
];

export const initialProposals = [
  { id: 'pr1', itemId: 'si2', qty: 60, discount: 8, status: 'pendente', counter: null, buyer: 'Mercadinho Bom Preço', createdAt: 'Hoje 09:12' },
  { id: 'pr2', itemId: 'si1', qty: 40, discount: 4, status: 'aceita', counter: null, buyer: 'Mercadinho Bom Preço', createdAt: 'Ontem 16:40' },
];

export const initialOrders = [
  { id: 'o1', items: [{ name: 'Pizza Calabresa Grande', qty: 1, price: 54.9 }], total: 54.9, status: 'Entregue', store: 'Pizzaria da Praça', courier: 'Marcos Silva' },
];

// Pedidos que chegam para o prestador (no perfil Prestador da demonstração).
export const rideRequests = [
  { id: 'r1', client: 'Beatriz M.', service: 'Corrida', from: 'Rua Augusta, 1200', to: 'Av. Paulista, 900', price: 18.5, distanceKm: 3.2 },
  { id: 'r2', client: 'Mercadinho Bom Preço', service: 'Entrega', from: 'Rua das Flores, 45', to: 'Rua Vergueiro, 2100', price: 9.9, distanceKm: 2.4 },
  { id: 'r3', client: 'Cláudia R.', service: 'Eletricista: trocar chuveiro', from: 'Rua Tamandaré, 310', to: null, price: 120, distanceKm: 1.8 },
  { id: 'r4', client: 'Pizzaria da Praça', service: 'Encanador: vazamento na cozinha', from: 'Praça da Sé, 12', to: null, price: 150, distanceKm: 2.9 },
];
