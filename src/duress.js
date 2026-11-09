// Resposta de segurança (coação): alerta silencioso com GPS e endereço para a segurança do Realys e
// ligação para o 190. Usado pela Lotus (compras e contratações) e pela assinatura de contratos.
import { getDevicePoint, addressOf } from './geo';
import { callNow } from './phone';
import { panicConfig } from './panic';
import { syncAlert, syncAlertPlace } from './securitySync';

export function triggerDuress(dispatch, state, info) {
  const cfg = panicConfig() || {};
  const id = 'pa' + Date.now();
  dispatch({
    type: 'PANIC_ALERT',
    alert: {
      id,
      at: Date.now(),
      kind: 'coacao',
      userId: state && state.user ? state.user.id : null,
      who: state && state.user ? state.user.name : 'Cliente',
      what: info && info.what,
      point: null,
      address: null,
      called190: cfg.call190 !== false,
      status: 'aberto',
    },
  });
  syncAlert(id, 'coacao', { tipo: 'Resposta de segurança (coação)', what: info && info.what });
  getDevicePoint().then(async (p) => {
    if (!p) return;
    dispatch({ type: 'PANIC_UPDATE', id, data: { point: p } });
    const address = await addressOf(p);
    if (address) dispatch({ type: 'PANIC_UPDATE', id, data: { address } });
    syncAlertPlace(id, p, address);
  });
  // Espera a tela de "deu certo" aparecer antes de ligar.
  if (cfg.call190 !== false) setTimeout(() => callNow('190'), 4000);
}
