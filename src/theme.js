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
  border: '#F0E9DA', // linha bem suave (visual clean)
  borderStrong: '#E6DAC0',
  bg: '#FBF8F1',
  card: '#FFFFFF',
  cardAlt: '#F5EFE2',
  danger: '#D9534F',
  success: '#1E9E63',
  sponsored: '#6C5CE7',
  violet: '#7B6CF6',
  gold: '#E2B649', // brilho dourado (anéis dos stories, destaques)
};

// Sombra leve e quente no lugar de bordas: deixa os cartões "flutuando" no fundo marfim.
export const soft = {
  elevation: 2,
  shadowColor: '#7A5806',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
};

// Espaçamentos e cantos padronizados (mais respiro entre os blocos).
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const brl = (v) =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const ROLE_LABELS = {
  cliente: 'Usuário',
  empresa: 'Empresa',
  prestador: 'Prestador',
  fornecedor: 'Fornecedor',
  admin: 'Administrador',
};
