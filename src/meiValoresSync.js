// Busca no servidor os valores do MEI do momento (DAS e limite), que o servidor atualiza sozinho
// pelo salário mínimo oficial do Banco Central. Uma vez por abertura do app basta.
import { api, serverOn } from './api';
import { aplicarMeiValores } from './professionsKnowledge';

let feito = null;
export function atualizarMeiValores() {
  if (!serverOn()) return Promise.resolve(false);
  if (!feito) feito = api('GET', '/mei/valores').then(aplicarMeiValores).catch(() => ((feito = null), false));
  return feito;
}
