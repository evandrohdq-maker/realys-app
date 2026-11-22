// Extras: trabalho de um dia ou de um turno (garçom, barman, cozinha, recepção, montagem de evento...).
// A empresa chama o extra com data, horário, valor da diária e os REQUISITOS. Só consegue se
// candidatar quem cumpre todos: faz a função no nível pedido, está disponível naquele dia e turno,
// tem nota e quantidade de extras feitos (histórico no Realyz) e confirma os itens exigidos.
// Assim a empresa não recebe gente que não sabe fazer o serviço.

export const FUNCOES_EXTRA = [
  { key: 'garcom', label: 'Garçom / garçonete', icon: 'wine-outline' },
  { key: 'barman', label: 'Barman / bartender', icon: 'beer-outline' },
  { key: 'cozinha', label: 'Cozinheiro(a)', icon: 'restaurant-outline' },
  { key: 'aux-cozinha', label: 'Auxiliar de cozinha', icon: 'flame-outline' },
  { key: 'copa', label: 'Copeiro(a) / lavagem', icon: 'water-outline' },
  { key: 'recepcao', label: 'Recepcionista', icon: 'people-outline' },
  { key: 'caixa', label: 'Caixa', icon: 'cash-outline' },
  { key: 'seguranca', label: 'Segurança / portaria', icon: 'shield-outline' },
  { key: 'montagem', label: 'Montagem de evento', icon: 'construct-outline' },
  { key: 'limpeza', label: 'Limpeza', icon: 'sparkles-outline' },
  { key: 'promotor', label: 'Promotor(a) de vendas', icon: 'megaphone-outline' },
  { key: 'entregador', label: 'Entregador(a)', icon: 'bicycle-outline' },
];
export const funcaoLabel = (k) => (FUNCOES_EXTRA.find((f) => f.key === k) || {}).label || k;

// Nível na função: a empresa pede o mínimo; a pessoa diz o dela.
export const NIVEIS = [
  { key: 'aprendiz', label: 'Sem experiência, quero aprender', n: 0 },
  { key: 'ja-fiz', label: 'Já trabalhei nisso', n: 1 },
  { key: 'experiente', label: 'Experiente (1 ano ou mais)', n: 2 },
];
const nivelN = (k) => (NIVEIS.find((x) => x.key === k) || { n: -1 }).n;
export const nivelLabel = (k) => (NIVEIS.find((x) => x.key === k) || {}).label || '';

export const DIAS = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
];
export const TURNOS = [
  { key: 'manha', label: 'Manhã', de: 6, ate: 12 },
  { key: 'tarde', label: 'Tarde', de: 12, ate: 18 },
  { key: 'noite', label: 'Noite', de: 18, ate: 24 },
  { key: 'madrugada', label: 'Madrugada', de: 0, ate: 6 },
];

// Itens que a empresa pode exigir; a pessoa marca os que tem (e responde por eles).
export const ITENS = ['Roupa social preta', 'Sapato fechado', 'Curso de manipulação de alimentos', 'Curso de vigilante', 'CNH', 'Moto própria', 'Maior de 18 anos', 'Sabe usar maquininha'];

const DIA_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
export const diaDe = (dataISO) => DIA_DA_SEMANA[new Date(`${dataISO}T12:00:00`).getDay()];
export const turnoDe = (hora) => {
  const h = Number(String(hora || '0').split(':')[0]);
  return (TURNOS.find((t) => h >= t.de && h < t.ate) || TURNOS[0]).key;
};
export const dataBR = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return d ? `${d}/${m}` : iso;
};

export const PERFIL_VAZIO = { disponivel: false, funcoes: [], dias: ['sex', 'sab'], turnos: ['noite'], itens: [], nota: null, feitos: 0, faltas: 0 };

// O que falta para a pessoa poder se candidatar (lista vazia = pode).
export function faltaPara(perfil, extra) {
  const p = perfil || PERFIL_VAZIO;
  const r = extra.requisitos || {};
  const falta = [];
  if (!p.disponivel) falta.push('Ligue "Disponível para extras" no seu perfil de extra');
  const f = (p.funcoes || []).find((x) => x.funcao === extra.funcao);
  if (!f) falta.push(`Não está nas suas funções: ${funcaoLabel(extra.funcao)}`);
  else if (nivelN(f.nivel) < nivelN(r.nivel || 'aprendiz')) falta.push(`Pede: ${nivelLabel(r.nivel)}`);
  const dia = diaDe(extra.data);
  if (!(p.dias || []).includes(dia)) falta.push(`Você não marcou ${(DIAS.find((d) => d.key === dia) || {}).label || dia} como disponível`);
  const turno = turnoDe(extra.inicio);
  if (!(p.turnos || []).includes(turno)) falta.push(`Você não marcou o turno da ${(TURNOS.find((t) => t.key === turno) || {}).label.toLowerCase()}`);
  if (r.notaMin && !(p.nota >= r.notaMin)) falta.push(`Pede nota ${String(r.notaMin).replace('.', ',')} ou mais em extras${p.nota ? ` (a sua: ${String(p.nota).replace('.', ',')})` : ' (você ainda não tem nota)'}`);
  if (r.feitosMin && (p.feitos || 0) < r.feitosMin) falta.push(`Pede ${r.feitosMin} extras feitos pelo Realyz (você tem ${p.feitos || 0})`);
  (r.itens || []).forEach((it) => {
    if (!(p.itens || []).includes(it)) falta.push(`Pede: ${it}`);
  });
  if ((p.faltas || 0) >= 2) falta.push('Duas faltas em extras sem avisar: candidaturas pausadas por 30 dias');
  return falta;
}

export const brlDiaria = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');

// Exemplos em Passo Fundo (a data é sempre dos próximos dias).
const prox = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};
export function extrasDemo() {
  return [
    { id: 'x1', empresa: 'Churrascaria Gaúcha', logo: '🥩', funcao: 'garcom', vagas: 3, data: prox(((5 - new Date().getDay() + 7) % 7) || 7), inicio: '18:30', fim: '00:30', diaria: 150, local: 'Centro, Passo Fundo', obs: 'Rodízio cheio de sexta. Refeição no local.', requisitos: { nivel: 'ja-fiz', notaMin: 4, itens: ['Roupa social preta', 'Sapato fechado'] }, candidatos: [] },
    { id: 'x2', empresa: 'Espaço Villa Eventos', logo: '🎉', funcao: 'barman', vagas: 1, data: prox(((6 - new Date().getDay() + 7) % 7) || 7), inicio: '20:00', fim: '04:00', diaria: 220, local: 'São Cristóvão, Passo Fundo', obs: 'Casamento para 200 pessoas. Drinks clássicos.', requisitos: { nivel: 'experiente', notaMin: 4.5, feitosMin: 3, itens: ['Roupa social preta'] }, candidatos: [] },
    { id: 'x3', empresa: 'Buffet Sabor & Arte', logo: '🍽️', funcao: 'aux-cozinha', vagas: 2, data: prox(((6 - new Date().getDay() + 7) % 7) || 7), inicio: '14:00', fim: '22:00', diaria: 120, local: 'Boqueirão, Passo Fundo', obs: 'Preparo de salgados e finalização de pratos.', requisitos: { nivel: 'aprendiz', itens: ['Curso de manipulação de alimentos'] }, candidatos: [] },
    { id: 'x4', empresa: 'Mercado Bom Preço', logo: '🛒', funcao: 'caixa', vagas: 2, data: prox(2), inicio: '08:00', fim: '14:00', diaria: 95, local: 'Vila Rodrigues, Passo Fundo', obs: 'Reforço no caixa no dia de promoção.', requisitos: { nivel: 'ja-fiz', itens: ['Sabe usar maquininha'] }, candidatos: [] },
  ];
}

// Candidatos de exemplo que a empresa vê (só os que cumprem os requisitos aparecem como aptos).
export const EXTRAS_GENTE = [
  { id: 'g1', name: 'Rafael Lima', city: 'Centro · 1,2 km', perfil: { disponivel: true, funcoes: [{ funcao: 'garcom', nivel: 'experiente' }, { funcao: 'barman', nivel: 'ja-fiz' }], dias: ['sex', 'sab', 'dom'], turnos: ['tarde', 'noite'], itens: ['Roupa social preta', 'Sapato fechado', 'Sabe usar maquininha'], nota: 4.8, feitos: 12, faltas: 0 } },
  { id: 'g2', name: 'Camila Souza', city: 'Boqueirão · 2,1 km', perfil: { disponivel: true, funcoes: [{ funcao: 'aux-cozinha', nivel: 'ja-fiz' }, { funcao: 'cozinha', nivel: 'aprendiz' }], dias: ['sab', 'dom'], turnos: ['manha', 'tarde', 'noite'], itens: ['Curso de manipulação de alimentos', 'Sapato fechado'], nota: 4.6, feitos: 5, faltas: 0 } },
  { id: 'g3', name: 'Diego Martins', city: 'São Cristóvão · 3,0 km', perfil: { disponivel: true, funcoes: [{ funcao: 'garcom', nivel: 'aprendiz' }], dias: ['sex', 'sab'], turnos: ['noite'], itens: ['Sapato fechado'], nota: null, feitos: 0, faltas: 0 } },
  { id: 'g4', name: 'Bruna Alves', city: 'Vila Rodrigues · 0,9 km', perfil: { disponivel: true, funcoes: [{ funcao: 'caixa', nivel: 'experiente' }, { funcao: 'recepcao', nivel: 'ja-fiz' }], dias: ['seg', 'ter', 'qua', 'qui', 'sex'], turnos: ['manha', 'tarde'], itens: ['Sabe usar maquininha', 'Roupa social preta'], nota: 4.9, feitos: 20, faltas: 0 } },
];
