// Perfis de serviço público no Re@lys: Corpo de Bombeiros, Defesa Civil, SAMU, hospital público,
// UPA e posto de saúde (UBS). Cada um com funções, horário, números (emergência, 0800, contato),
// equipe de plantão e disponível, GPS das equipes na rua e um painel para publicar reuniões, equipes,
// eventos, salvamentos e progressos. As unidades de saúde do SUS publicam horários e o cidadão agenda
// pelo Re@lys, com o Cartão Nacional de Saúde (CNS) que ele guardou no próprio perfil.
//
// Hoje (demonstração) os dados ficam no app. Com o governo como parceiro, cada órgão entra com conta
// verificada e os agendamentos passam a sair dos sistemas oficiais (ver PENDENCIAS.md).

export const PUBLIC_KINDS = {
  bombeiros: { label: 'Corpo de Bombeiros', icon: 'flame', color: '#E8711C' },
  defesa: { label: 'Defesa Civil', icon: 'warning', color: '#C77D12' },
  samu: { label: 'SAMU', icon: 'medkit', color: '#D9534F' },
  hospital: { label: 'Hospital público', icon: 'business', color: '#2F74D0' },
  upa: { label: 'UPA 24h', icon: 'pulse', color: '#2F74D0' },
  ubs: { label: 'Posto de saúde (UBS)', icon: 'medical', color: '#1E9E63' },
  cidadao: { label: 'Atendimento ao cidadão', icon: 'document-text', color: '#6B5BD2' },
  ecoponto: { label: 'Ecoponto', icon: 'leaf', color: '#2E8B57' },
};

export const POST_TYPES = [
  { key: 'aviso', label: 'Aviso', icon: 'megaphone-outline' },
  { key: 'evento', label: 'Evento', icon: 'calendar-outline' },
  { key: 'reuniao', label: 'Reunião', icon: 'people-outline' },
  { key: 'equipe', label: 'Equipe', icon: 'shield-checkmark-outline' },
  { key: 'salvamento', label: 'Salvamento', icon: 'heart-outline' },
  { key: 'progresso', label: 'Progresso', icon: 'trending-up-outline' },
];
export const postType = (k) => POST_TYPES.find((t) => t.key === k) || POST_TYPES[0];

const H = 3600 * 1000;
const ago = (h) => Date.now() - h * H;
// Horários de atendimento dos próximos dias (as unidades publicam; o cidadão agenda).
const day = (d, hh, mm = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(hh, mm, 0, 0);
  return x.getTime();
};

export const PUBLIC_ORGS = [
  {
    id: 'pub-bombeiros',
    kind: 'bombeiros',
    name: 'Corpo de Bombeiros · 1º Grupamento (demo)',
    emergency: '193',
    tollFree: '0800 000 0193 (demo)',
    contact: '(11) 0000-1930 (demo)',
    address: 'Av. Central, 1000 · Centro',
    hours: 'Emergência 24 horas · Atendimento ao público seg a sex, 8h às 17h',
    functions: ['Combate a incêndios', 'Resgate e salvamento', 'Acidentes de trânsito', 'Captura de animais perigosos', 'Vistoria e alvará (AVCB)', 'Prevenção e treinamento de brigadas'],
    staff: { onDuty: 18, available: 11, teamsOut: 3 },
    gps: true,
    posts: [
      { id: 'pb1', type: 'salvamento', title: 'Família resgatada em enchente', text: 'Equipe resgatou 4 pessoas ilhadas na Rua das Flores durante a chuva desta madrugada. Todos bem.', at: ago(6) },
      { id: 'pb2', type: 'evento', title: 'Treinamento de brigadistas no sábado', text: 'Curso gratuito de primeiros socorros e combate a princípio de incêndio, 9h, no quartel. Vagas limitadas.', at: ago(30) },
      { id: 'pb3', type: 'progresso', title: 'Nova viatura de resgate', text: 'O grupamento recebeu uma viatura de resgate com equipamento de desencarceramento.', at: ago(80) },
    ],
  },
  {
    id: 'pub-defesa',
    kind: 'defesa',
    name: 'Defesa Civil Municipal (demo)',
    emergency: '199',
    tollFree: '0800 000 0199 (demo)',
    contact: '(11) 0000-1990 (demo)',
    address: 'Rua da Prefeitura, 200 · Centro',
    hours: 'Plantão 24 horas para emergências · Atendimento seg a sex, 8h às 18h',
    functions: ['Alertas de chuva forte e enchente', 'Vistoria de risco em imóveis', 'Deslizamento e queda de árvores', 'Abrigos e doações em desastres', 'Planos de contingência'],
    staff: { onDuty: 9, available: 5, teamsOut: 2 },
    gps: true,
    posts: [
      { id: 'pd1', type: 'aviso', title: 'Alerta de chuva forte hoje à noite', text: 'Previsão de 60 mm. Evite áreas de alagamento e encostas. Em risco, ligue 199.', at: ago(2) },
      { id: 'pd2', type: 'reuniao', title: 'Reunião com líderes comunitários', text: 'Quinta, 19h, na escola do bairro Vila Nova: plano de evacuação e pontos de apoio.', at: ago(26) },
    ],
  },
  {
    id: 'pub-samu',
    kind: 'samu',
    name: 'SAMU 192 · Regional (demo)',
    emergency: '192',
    tollFree: null,
    contact: '(11) 0000-1920 (demo)',
    address: 'Base Central · Rua da Saúde, 50',
    hours: '24 horas, todos os dias',
    functions: ['Atendimento pré-hospitalar de urgência', 'Ambulância com médico (USA)', 'Ambulância básica (USB)', 'Orientação médica por telefone'],
    staff: { onDuty: 24, available: 6, teamsOut: 7 },
    gps: true,
    posts: [{ id: 'ps1', type: 'equipe', title: 'Equipe da madrugada completa', text: '7 ambulâncias na rua e regulação médica com 3 médicos.', at: ago(4) }],
  },
  {
    id: 'pub-hospital',
    kind: 'hospital',
    name: 'Hospital Municipal Central (demo)',
    emergency: '192',
    tollFree: '0800 000 1010 (demo)',
    contact: '(11) 0000-0003 (demo)',
    address: 'Av. da Saúde, 500 · Centro',
    hours: 'Pronto-socorro 24 horas · Ambulatório seg a sex, 7h às 19h',
    functions: ['Pronto-socorro adulto e infantil', 'Internação', 'Cirurgias', 'Ambulatório de especialidades (com encaminhamento)', 'Exames de imagem'],
    staff: { onDuty: 46, available: 12, teamsOut: 0 },
    gps: false,
    sus: true,
    slots: [
      { id: 'hs1', specialty: 'Cardiologia (com encaminhamento)', who: 'Dr. André Moura', at: day(2, 9) },
      { id: 'hs2', specialty: 'Ortopedia (com encaminhamento)', who: 'Dr. Felipe Santana', at: day(3, 14) },
      { id: 'hs3', specialty: 'Dermatologia (com encaminhamento)', who: 'Dr. Renato Vieira', at: day(5, 10) },
    ],
    posts: [{ id: 'ph1', type: 'progresso', title: 'Nova ala pediátrica', text: 'Inauguramos 20 leitos de pediatria. Mais conforto para as crianças e as famílias.', at: ago(50) }],
  },
  {
    id: 'pub-upa',
    kind: 'upa',
    name: 'UPA 24h Bela Vista (demo)',
    emergency: '192',
    tollFree: null,
    contact: '(11) 0000-0002 (demo)',
    address: 'Rua Bela Vista, 300',
    hours: '24 horas, todos os dias (urgência: não precisa agendar)',
    functions: ['Urgência e emergência', 'Raio-x e exames rápidos', 'Observação até 24 horas', 'Classificação de risco por cores'],
    staff: { onDuty: 15, available: 4, teamsOut: 0 },
    gps: false,
    sus: true,
    waitMin: 50,
    posts: [{ id: 'pu1', type: 'aviso', title: 'Movimento alto agora', text: 'Espera média de 50 min para casos leves (verde e azul). Casos graves têm prioridade.', at: ago(1) }],
  },
  {
    id: 'pub-ubs',
    kind: 'ubs',
    name: 'UBS Jardim das Flores (demo)',
    emergency: '192',
    tollFree: '136 (Disque Saúde)',
    contact: '(11) 0000-0136 (demo)',
    address: 'Rua das Flores, 120 · Jardim das Flores',
    hours: 'Seg a sex, 7h às 19h · Sábado, 8h às 12h (vacinação)',
    functions: ['Consulta com clínico geral', 'Pediatria e ginecologia', 'Vacinação', 'Pré-natal', 'Curativos e medicação', 'Encaminhamento para especialistas'],
    staff: { onDuty: 14, available: 6, teamsOut: 2 },
    gps: true,
    sus: true,
    slots: [
      { id: 'us1', specialty: 'Clínico geral', who: 'Dra. Camila Reis', at: day(1, 8, 30) },
      { id: 'us2', specialty: 'Clínico geral', who: 'Dra. Camila Reis', at: day(1, 10) },
      { id: 'us3', specialty: 'Pediatria', who: 'Dra. Beatriz Lopes', at: day(1, 14) },
      { id: 'us4', specialty: 'Ginecologia', who: 'Dra. Luíza Prado', at: day(2, 9) },
      { id: 'us5', specialty: 'Odontologia', who: 'Dra. Sofia Almeida', at: day(2, 15) },
      { id: 'us6', specialty: 'Vacinação', who: 'Equipe de enfermagem', at: day(3, 8) },
    ],
    posts: [
      { id: 'pf1', type: 'evento', title: 'Campanha de vacinação contra a gripe', text: 'Sábado, 8h às 12h. Leve o Cartão do SUS e a caderneta de vacinação.', at: ago(10) },
      { id: 'pf2', type: 'equipe', title: 'Agentes comunitários nas ruas', text: '2 equipes visitando as famílias do bairro esta semana.', at: ago(40) },
    ],
  },
  {
    id: 'pub-cidadao',
    kind: 'cidadao',
    name: 'Central do Cidadão · Prefeitura (demo)',
    emergency: null,
    tollFree: '156 (Central da Prefeitura)',
    contact: '(11) 0000-0156 (demo)',
    address: 'Praça da Matriz, 50 · Centro',
    hours: 'Seg a sex, 8h às 17h · Agendamento pelo Re@lys',
    functions: ['Segunda via de IPTU e taxas', 'Certidões negativas', 'Alvará de funcionamento e MEI', 'Emissão de RG e CPF (com agendamento)', 'Carteira de trabalho digital e seguro-desemprego', 'Ouvidoria e reclamações da cidade'],
    staff: { onDuty: 22, available: 9, teamsOut: 0 },
    gps: false,
    sus: false,
    slots: [
      { id: 'cd1', specialty: 'RG (carteira de identidade)', who: 'Guichê 3', at: day(1, 9) },
      { id: 'cd2', specialty: 'Alvará e abertura de MEI', who: 'Sala do Empreendedor', at: day(1, 14) },
      { id: 'cd3', specialty: 'Seguro-desemprego', who: 'Guichê 7', at: day(2, 10) },
      { id: 'cd4', specialty: 'Parcelamento de IPTU', who: 'Guichê 1', at: day(3, 11) },
    ],
    posts: [
      { id: 'pc1', type: 'aviso', title: 'IPTU com 10% de desconto à vista', text: 'Pagamento até o fim do mês. Segunda via na Central ou pelo site da prefeitura.', at: ago(20) },
      { id: 'pc2', type: 'evento', title: 'Mutirão do MEI no sábado', text: 'Abertura e regularização de MEI de graça, com orientação de contador voluntário.', at: ago(60) },
    ],
  },
  {
    id: 'pub-ecoponto',
    kind: 'ecoponto',
    name: 'Ecoponto Vila Nova (demo)',
    emergency: null,
    tollFree: '156 (Central da Prefeitura)',
    contact: '(11) 0000-0157 (demo)',
    address: 'Rua do Parque, 900 · Vila Nova',
    hours: 'Seg a sáb, 7h às 19h',
    functions: ['Entulho de pequenas obras (até 1 m³)', 'Móveis velhos e colchões', 'Recicláveis', 'Óleo de cozinha usado', 'Pilhas, baterias e eletrônicos', 'Poda de jardim'],
    staff: { onDuty: 4, available: 2, teamsOut: 1 },
    gps: true,
    sus: false,
    posts: [{ id: 'pe1', type: 'progresso', title: '12 toneladas recicladas no mês', text: 'Obrigado a quem trouxe o material separado. Tudo vai para a cooperativa de catadores.', at: ago(30) }],
  },
];

export const publicOrg = (state, id) => {
  const base = PUBLIC_ORGS.find((o) => o.id === id);
  if (!base) return null;
  const mine = (state.publicEdits || {})[id] || {};
  const posts = [...((state.publicPosts || []).filter((p) => p.orgId === id)), ...base.posts].sort((a, b) => b.at - a.at);
  const slots = [...(base.slots || []), ...((state.publicSlots || []).filter((s) => s.orgId === id))].sort((a, b) => a.at - b.at);
  return { ...base, ...mine, staff: { ...base.staff, ...(mine.staff || {}) }, posts, slots };
};

// Para quem procura pelo nome ("bombeiros", "defesa civil", "posto de saúde"...).
const WORDS = {
  'pub-bombeiros': /\bbombeir/,
  'pub-defesa': /\bdefesa civil\b/,
  'pub-samu': /\bsamu\b/,
  'pub-hospital': /\bhospital (municipal|publico|central|do sus)\b/,
  'pub-upa': /\bupa\b/,
  'pub-ubs': /\b(ubs|posto de saude|unidade basica|postinho)\b/,
  'pub-cidadao': /\b(prefeitura|segunda via|iptu|central do cidadao|alvara|certidao|poupatempo|tirar rg|seguro.desemprego)\b/,
  'pub-ecoponto': /\b(ecoponto|ponto de entrega voluntaria|descartar entulho de graca)\b/,
};
export const findPublicOrg = (t) => Object.keys(WORDS).find((k) => WORDS[k].test(t)) || null;

// ---------- Cartão Nacional de Saúde (CNS) ----------
// 15 números. Começa com 1 ou 2 (definitivo) ou 7, 8 ou 9 (provisório). Conferência oficial do
// Ministério da Saúde: soma dos dígitos × peso (15 a 1) tem que ser múltipla de 11.
export function validCNS(raw) {
  const s = String(raw || '').replace(/\D/g, '');
  if (s.length !== 15 || !/^[12789]/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += Number(s[i]) * (15 - i);
  return sum % 11 === 0;
}
export const maskCNS = (raw) => {
  const s = String(raw || '').replace(/\D/g, '');
  return s.length === 15 ? `${s.slice(0, 3)} •••• •••• ${s.slice(11)}` : s;
};
export const formatCNS = (raw) => String(raw || '').replace(/\D/g, '').replace(/^(\d{3})(\d{4})(\d{4})(\d{0,4}).*/, '$1 $2 $3 $4').trim();

export const whenText = (ts) =>
  new Date(ts).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('.', '');
