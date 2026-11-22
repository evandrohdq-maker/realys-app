// As compras estão travadas para esta conta agora? (O administrador continua podendo testar.)
// Fica num arquivo só, sem dependências, para o store e as telas usarem sem import circular.
export const comprasTravadas = (state) => !!(state && state.comprasBloqueadas) && !(state.user && (state.user.roles || []).includes('admin'));
