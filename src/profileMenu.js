// O ⋮ do cabeçalho (canto direito, em qualquer tela) abre o Menu (Minha conta + Explorar),
// que mora na tela do Perfil. Se a pessoa não está no Perfil, o app passa por ele e, ao fechar
// o menu sem escolher nada, volta para a tela em que ela estava (returnTo).
const subs = new Set();
let pending = null;
export function openProfileMenu(opts = {}) {
  if (subs.size) subs.forEach((fn) => fn(opts));
  else pending = opts; // o Perfil ainda vai montar: ele abre o menu assim que aparecer
}
export function onProfileMenu(fn) {
  subs.add(fn);
  if (pending) {
    const p = pending;
    pending = null;
    setTimeout(() => fn(p), 0);
  }
  return () => subs.delete(fn);
}

// O Perfil pega o pedido pendente já ao nascer: o menu aparece na mesma hora, sem mostrar o Perfil antes.
export function takePendingMenu() {
  const p = pending;
  pending = null;
  return p;
}
