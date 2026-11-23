// No app: a conta tem este perfil de trabalho (com CNPJ)? Vem do servidor (PerfilTrabalho guarda em
// state.user.trabalho). Admin, conta de teste e o modo sem servidor (demonstração) passam.
import { serverOn } from './api';

export function podeTrabalhar(state, tipo) {
  const u = state && state.user;
  if (!u) return false;
  if (!serverOn() || u.teste || (u.roles || []).includes('admin')) return true;
  if ((u.roles || []).includes('empresa')) return true;
  return (u.trabalho || []).includes(tipo);
}
export const MSG_SEM_CNPJ = (oque) => `Para ${oque}, crie o seu perfil de trabalho com o CNPJ (MEI vale) no Perfil › Perfil de trabalho.`;
