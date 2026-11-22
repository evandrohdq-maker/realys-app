// As compras estão travadas para esta conta agora? (O administrador continua podendo testar.)
// Fica num arquivo só, sem dependências, para o store e as telas usarem sem import circular.
export const comprasTravadas = (state) => !!(state && state.comprasBloqueadas) && !(state.user && (state.user.roles || []).includes('admin'));

// Logo depois de barrar uma compra, a tela que pediu pode tentar mostrar "Pedido confirmado!".
// Nesse instante os avisos ficam em silêncio (só aparece o "Temporariamente bloqueado").
let silencioAte = 0;
export const silenciarAvisos = (ms) => (silencioAte = Date.now() + ms);
export const avisosSilenciados = () => Date.now() < silencioAte;
