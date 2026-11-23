// Minha live na janelinha (só no computador): a aba onde a live foi aberta continua montada, escondida,
// enquanto a pessoa navega por outras abas. Assim a transmissão não para ao trocar de tela.
const subs = new Set();
let on = false;
export const setLiveKeep = (v) => {
  if (on === !!v) return;
  on = !!v;
  subs.forEach((fn) => fn(on));
};
export const onLiveKeep = (fn) => (subs.add(fn), () => subs.delete(fn));
