// Dados do veículo que motoristas e motoboys informam no cadastro, e que o cliente usa como filtro
// (ex.: "preciso de cadeirinha para buscar meus filhos").
export const CAR_FEATURES = [
  ['cadeirinha', 'Cadeirinha infantil', '👶'],
  ['elevacao', 'Assento de elevação', '🧒'],
  ['bebeConforto', 'Bebê conforto', '🍼'],
  ['acessivel', 'Acessível p/ cadeirante', '♿'],
  ['pet', 'Aceita pet', '🐾'],
  ['portaMalas', 'Porta-malas grande', '🧳'],
  ['ar', 'Ar-condicionado', '❄️'],
  ['mulher', 'Motorista mulher', '👩'],
  ['eletrico', 'Carro elétrico', '⚡'],
];
export const featureLabel = (k) => (CAR_FEATURES.find((f) => f[0] === k) || [k, k])[1];
export const featureIcon = (k) => (CAR_FEATURES.find((f) => f[0] === k) || [k, k, '•'])[2];

// Profissões que levam passageiro (o cliente pode pedir para outra pessoa e filtrar por cadeirinha etc.).
export const PASSENGER_TYPES = ['motorista', 'executivo', 'escolar', 'viagem', 'acessivel', 'transpet'];
// Profissões de transporte em geral (motoboy entrega/busca coisas em outro endereço).
export const isPassenger = (key) => PASSENGER_TYPES.includes(key);

// Lista de recursos que o prestador tem ligados.
export const featuresOf = (p) => (p && p.car ? CAR_FEATURES.filter(([k]) => p.car[k]).map(([k]) => k) : []);
export const hasAll = (p, needs) => !needs.length || needs.every((k) => p.car && p.car[k]);
