// O ⋮ do cabeçalho, quando a pessoa já está no Perfil, abre o Menu do Perfil (Minha conta + Explorar).
// O cabeçalho (App.js) chama openProfileMenu(); a tela do Perfil escuta com onProfileMenu.
const subs = new Set();
export const openProfileMenu = () => subs.forEach((fn) => fn());
export function onProfileMenu(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
