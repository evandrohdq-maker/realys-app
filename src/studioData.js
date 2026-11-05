// Demonstração: privacidade e criações do Estúdio de algumas pessoas da rede.
// (Na versão real isso vem do servidor, de cada perfil.)
const photo = (seed, w = 600, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Quem pode ver: 'todos' | 'amigos' | 'eu'. exposed: false = modo invisível.
export const memberPrivacy = {
  u12: { exposed: true, social: 'amigos', portfolio: 'todos' }, // Beatriz: vida social só para amigos
  u13: { exposed: true, social: 'eu', portfolio: 'todos' }, // André: só mostra o trabalho
  u7: { exposed: false, social: 'todos', portfolio: 'todos' }, // Carlos: modo invisível
};
export const privacyOf = (id) => memberPrivacy[id] || { exposed: true, social: 'todos', portfolio: 'todos' };

export const memberCreations = {
  u10: [
    { id: 'mc1', kind: 'foto', title: 'Bolo de casamento três andares', desc: 'Pasta americana e flores de açúcar feitas à mão.', cover: photo('realys-st-bolo'), dest: { social: true, portfolio: true } },
    { id: 'mc2', kind: 'video', title: 'Making of: naked cake de morango', desc: 'Do recheio à decoração em 60 segundos.', cover: photo('realys-st-naked'), dest: { social: true, portfolio: true } },
  ],
  u8: [
    { id: 'mc3', kind: 'video', title: 'Aula grátis: inglês para viagem', desc: 'As 20 frases que mais salvam no aeroporto.', cover: photo('realys-st-aula'), dest: { social: true, portfolio: true } },
  ],
  u12: [
    { id: 'mc4', kind: 'arte', title: 'Aquarela: Pelourinho ao entardecer', desc: 'Série Salvador em cores.', cover: photo('realys-st-aquarela'), dest: { social: true, portfolio: true } },
    { id: 'mc5', kind: 'musica', title: 'Ijexá da Lua (voz e violão)', desc: 'Composição própria.', cover: photo('realys-st-ijexa'), dest: { social: false, portfolio: true } },
  ],
  u13: [
    { id: 'mc6', kind: 'projeto', title: 'Apartamento decorado · Boa Viagem', desc: 'Venda em 21 dias com tour virtual.', cover: photo('realys-st-ape'), dest: { social: false, portfolio: true } },
  ],
};
export const creationsOf = (id) => memberCreations[id] || [];
