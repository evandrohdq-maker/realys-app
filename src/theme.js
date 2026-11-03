export const colors = {
  primary: '#0E7C66',
  primaryDark: '#0A5C4C',
  primaryLight: '#E3F4EF',
  accent: '#F5A623',
  dark: '#14212B',
  text: '#1E2A33',
  muted: '#6B7B86',
  border: '#E1E6EA',
  bg: '#F4F6F8',
  card: '#FFFFFF',
  danger: '#D64545',
  success: '#2E9E5B',
  sponsored: '#7B4DFF',
};

export const brl = (v) =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const ROLE_LABELS = {
  cliente: 'Cliente',
  empresa: 'Empresa',
  prestador: 'Prestador',
  fornecedor: 'Fornecedor',
};
