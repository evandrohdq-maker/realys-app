// Leva os alertas de segurança para a central do servidor (quando o servidor estiver no ar).
// Sem servidor, tudo continua funcionando só no celular e no painel local, como hoje.
import { api, serverOn } from './api';

const pending = new Map(); // id local -> id do servidor

export async function syncAlert(localId, kind, data = {}) {
  if (!serverOn()) return null;
  try {
    const r = await api('POST', '/alertas', { kind, ...data });
    pending.set(localId, r.id);
    return r;
  } catch (e) {
    return null;
  }
}

// GPS e endereço chegam depois do alerta: manda para o mesmo alerta no servidor.
export async function syncAlertPlace(localId, point, endereco) {
  const id = pending.get(localId);
  if (!id || !serverOn()) return;
  api('POST', `/alertas/${id}/local`, { lat: point && point.lat, lon: point && point.lon, endereco: endereco || undefined }).catch(() => {});
}
