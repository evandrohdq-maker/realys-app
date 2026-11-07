// Dados fictícios para testar o cadastro de prestador, a empresa com funcionários e os mandados de serviço.
// Nomes, números e documentos são de demonstração. Nada aqui é guardado no servidor.

export const EMPRESA_DEMO = {
  id: 'emp-demo-1',
  nome: 'Encanamentos Silva Ltda (demo)',
  cnpj: '00.000.000/0001-00 (demo)',
  socios: [
    { nome: 'Carlos Silva (demo)', numero: 'DEMO-SOCIO-01', validade: '2035-05-20' },
    { nome: 'Helena Silva (demo)', numero: 'DEMO-SOCIO-02', validade: '2035-06-10' },
  ],
};

export const FUNCIONARIOS_DEMO = [
  {
    id: 'f1',
    nome: 'Lucas Ferreira (demo)',
    servico: 'encanador',
    titular: { nome: 'Lucas Ferreira', numero: 'DEMO-F1', validade: '2034-02-02' },
    cnh: { categoria: 'B', validade: '2034-02-02', ear: false },
  },
  {
    id: 'f2',
    nome: 'Rafael Motorista (demo)',
    servico: 'motorista',
    titular: { nome: 'Rafael Motorista', numero: 'DEMO-F2', validade: '2034-03-03' },
    cnh: { categoria: 'D', validade: '2034-03-03', ear: true },
  },
];

// Mandados de serviço: pedidos que a empresa recebe e distribui para o funcionário.
export const MANDADOS_DEMO = [
  { id: 'm1', cliente: 'Ana Souza (demo)', servico: 'encanador', endereco: 'Rua Exemplo, 100 (demo)', valor: 120, funcionarioId: 'f1', status: 'Recebido' },
  { id: 'm2', cliente: 'Pedro Lima (demo)', servico: 'motorista', endereco: 'Av. Modelo, 500 (demo)', valor: 35, funcionarioId: 'f2', status: 'Recebido' },
];

// Perfis fictícios de cadastro de prestador, para ver cada regra funcionando.
export const EXEMPLOS_CADASTRO_DEMO = [
  {
    id: 'ex1',
    nome: 'Marcos, MEI de motoboy (demo)',
    tipo: 'mei',
    servico: 'motoboy',
    cnpj: '11.111.111/0001-11 (demo)',
    titular: { nome: 'Marcos Demo', numero: 'DEMO-EX1', validade: '2034-01-10' },
    cnh: { categoria: 'A', validade: '2034-01-10', ear: false },
  },
  {
    id: 'ex2',
    nome: 'Joana, pessoa física de carro para passageiros (demo)',
    tipo: 'pf',
    servico: 'carro',
    cnpj: '',
    titular: { nome: 'Joana Demo', numero: 'DEMO-EX2', validade: '2034-04-04' },
    cnh: { categoria: 'B', validade: '2034-04-04', ear: false },
  },
  {
    id: 'ex3',
    nome: 'Paulo, sócio de empresa de frete com CNH vencida (demo)',
    tipo: 'cnpj',
    servico: 'frete',
    cnpj: '22.222.222/0001-22 (demo)',
    titular: { nome: 'Paulo Demo', numero: 'DEMO-EX3', validade: '2034-05-05' },
    cnh: { categoria: 'C', validade: '2020-01-01', ear: false },
  },
];
