// Tema futurista do Realys: fundo escuro, azul neon e detalhes em roxo.
export const colors = {
  primary: '#3BE8FF',
  primaryDark: '#9AF3FF',
  primaryLight: '#10303A',
  onPrimary: '#04121A',
  accent: '#FFC46B',
  dark: '#0A0F1A',
  text: '#E8EEF8',
  muted: '#8A96AD',
  border: '#1C2638',
  bg: '#070A12',
  card: '#0F1522',
  cardAlt: '#151D2E',
  danger: '#FF8A80',
  success: '#5BE3A0',
  sponsored: '#B3A8FF',
  violet: '#9B8CFF',
};

export const brl = (v) =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const ROLE_LABELS = {
  cliente: 'Cliente',
  empresa: 'Empresa',
  prestador: 'Prestador',
  fornecedor: 'Fornecedor',
  admin: 'Administrador',
};
