// Tema claro do Realys: fundo marfim luminoso, dourado de glória e azul-céu.
export const colors = {
  primary: '#A8790A', // dourado
  primaryDark: '#7A5806',
  primaryLight: '#FBF1D6',
  onPrimary: '#FFFFFF',
  accent: '#2F74D0', // azul-céu
  dark: '#1F2A44',
  text: '#1F2A44',
  muted: '#6E7891',
  border: '#EADFC8',
  bg: '#FBF8F1',
  card: '#FFFFFF',
  cardAlt: '#F5EFE2',
  danger: '#D9534F',
  success: '#1E9E63',
  sponsored: '#6C5CE7',
  violet: '#7B6CF6',
  gold: '#E2B649', // brilho dourado (anéis dos stories, destaques)
};

export const brl = (v) =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const ROLE_LABELS = {
  cliente: 'Usuário',
  empresa: 'Empresa',
  prestador: 'Prestador',
  fornecedor: 'Fornecedor',
  admin: 'Administrador',
};
