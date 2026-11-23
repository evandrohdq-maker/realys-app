// Abrir o perfil de uma conta real (servidor) de qualquer lugar do app, e saber se tem um perfil
// aberto por cima (ex.: o story espera parado enquanto você vê o perfil de quem postou).
// Fica separado de components/ServerProfile.js para qualquer tela importar sem dependência circular.
import { useEffect, useState } from 'react';

let openListener = null;
let pendingId = null;
// preview (opcional): { name, photo } de quem já se sabe (ex.: o story), para a prévia aparecer na hora.
let pendingPreview = null;
export const openServerProfile = (id, preview) => {
  if (!id) return;
  if (openListener) openListener(String(id), preview || null);
  else { pendingId = String(id); pendingPreview = preview || null; } // a tela do perfil ainda está montando
};
// Chamado pela tela do perfil (ServerProfileHost) ao montar. Devolve a função de desligar.
export function bindProfileHost(setId) {
  openListener = setId;
  if (pendingId) {
    setId(pendingId, pendingPreview);
    pendingId = null;
    pendingPreview = null;
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
