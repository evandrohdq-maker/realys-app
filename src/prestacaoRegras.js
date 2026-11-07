// Regras de cadastro de prestador e de funcionário de empresa: documentos exigidos.
// Funções puras (sem tela e sem servidor). O servidor aplicará as mesmas regras quando estiver ligado.

export const TIPOS_CADASTRO = [
  { key: 'pf', label: 'Pessoa física' },
  { key: 'mei', label: 'MEI' },
  { key: 'cnpj', label: 'Empresa (CNPJ)' },
];

// Categorias de CNH aceitas para dirigir: A, AB, B, C, D ou E.
export const CATEGORIAS_CNH = ['A', 'AB', 'B', 'C', 'D', 'E'];

// Serviços que dirigem veículo: exigem CNH válida em categoria compatível.
export const SERVICOS_CNH = ['motorista', 'motoboy', 'frete', 'carro', 'moto', 'van'];

// Transporte de passageiros: além da CNH, a carteira precisa da autorização de atividade remunerada (EAR).
export const SERVICOS_PASSAGEIROS = ['motorista', 'carro', 'van', 'moto'];

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

// Documento de identidade do titular: número, nome e validade (se houver) dentro do prazo.
function titularOk(t, hoje) {
  return !!(t && t.nome && t.numero) && (!t.validade || t.validade >= hoje);
}

// CNH válida: categoria aceita e validade em dia.
export function cnhValida(cnh, hoje = hojeISO()) {
  return !!cnh && CATEGORIAS_CNH.includes(cnh.categoria) && !!cnh.validade && cnh.validade >= hoje;
}

// Lista do que ainda falta para o cadastro. Vazia = completo.
//   cad = { tipo: 'pf' | 'mei' | 'cnpj', servico, cnpj, titular, cnh }
//   Em CNPJ com sociedade, o titular é um dos sócios: basta o documento de um deles.
export function docsFaltantes(cad, hoje = hojeISO()) {
  const faltam = [];
  if (!titularOk(cad.titular, hoje)) {
    const vencido = cad.titular && cad.titular.nome && cad.titular.numero && cad.titular.validade < hoje;
    faltam.push(vencido ? 'Documento do titular vencido' : cad.tipo === 'cnpj' ? 'Documento de um dos sócios titulares (RG ou CNH)' : 'Documento do titular (RG ou CNH)');
  }
  if ((cad.tipo === 'mei' || cad.tipo === 'cnpj') && !cad.cnpj) {
    faltam.push(cad.tipo === 'mei' ? 'CNPJ do MEI' : 'CNPJ da empresa');
  }
  if (SERVICOS_CNH.includes(cad.servico)) {
    if (!cnhValida(cad.cnh, hoje)) {
      faltam.push('CNH válida, em categoria A, AB, B, C, D ou E');
    } else if (SERVICOS_PASSAGEIROS.includes(cad.servico) && !cad.cnh.ear) {
      faltam.push('Autorização para atividade remunerada (EAR) na CNH, para transporte de passageiros');
    }
  }
  return faltam;
}

export function statusCadastro(cad, hoje = hojeISO()) {
  const faltam = docsFaltantes(cad, hoje);
  return { completo: faltam.length === 0, faltam };
}
