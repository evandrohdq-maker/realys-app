// Abrir o perfil de uma conta real (servidor) de qualquer lugar do app, e saber se tem um perfil
// aberto por cima (ex.: o story espera parado enquanto você vê o perfil de quem postou).
// Fica separado de components/ServerProfile.js para qualquer tela importar sem dependência circular.
import { useEffect, useState } from 'react';

let openListener = null;
let pendingId = null;
export const openServerProfile = (id) => {
  if (!id) return;
  if (openListener) openListener(String(id));
  else pendingId = String(id); // a tela do perfil ainda está montando: abre assim que ficar pronta
};
// Chamado pela tela do perfil (ServerProfileHost) ao montar. Devolve a função de desligar.
export function bindProfileHost(setId) {
  openListener = setId;
  if (pendingId) {
    setId(pendingId);
    pendingId = null;
  }
  return () => {
    if (openListener === setId) openListener = null;
  };
}

let openNow = false;
const openSubs = new Set();
export const setOpenNow = (v) => {
  openNow = v;
  openSubs.forEach((fn) => fn(v));
};
export function useServerProfileOpen() {
  const [v, setV] = useState(openNow);
  useEffect(() => {
    openSubs.add(setV);
    return () => openSubs.delete(setV);
  }, []);
  return v;
}
