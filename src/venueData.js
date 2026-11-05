// Comanda no estabelecimento: no evento em que comprou ingresso (ou no bar em que fez check-in),
// o cliente pede bebidas e comidas pelo app, paga pelo Realys, e o caixa recebe o aviso
// "Mesa 12 · Fulano pediu 2 chopes". Quem reservou mesa já fica nela.
// Cardápios de exemplo por tipo de lugar.

const CLUB = [
  { id: 'cl1', cat: 'Bebidas', icon: '🍺', name: 'Cerveja long neck', price: 14 },
  { id: 'cl2', cat: 'Bebidas', icon: '🍹', name: 'Drink da casa', price: 28 },
  { id: 'cl3', cat: 'Bebidas', icon: '🍋', name: 'Caipirinha', price: 24 },
  { id: 'cl4', cat: 'Bebidas', icon: '⚡', name: 'Energético', price: 16 },
  { id: 'cl5', cat: 'Bebidas', icon: '💧', name: 'Água', price: 6 },
  { id: 'cl6', cat: 'Bebidas', icon: '🥤', name: 'Refrigerante', price: 8 },
  { id: 'cl7', cat: 'Combos', icon: '🍾', name: 'Combo garrafa + 4 energéticos', price: 260 },
  { id: 'cl8', cat: 'Comidas', icon: '🍟', name: 'Porção de batata', price: 32 },
  { id: 'cl9', cat: 'Comidas', icon: '🍔', name: 'Mini burgers (4 un.)', price: 38 },
];
const BAR = [
  { id: 'br1', cat: 'Bebidas', icon: '🍺', name: 'Chope 300 ml', price: 11 },
  { id: 'br2', cat: 'Bebidas', icon: '🍋', name: 'Caipirinha', price: 22 },
  { id: 'br3', cat: 'Bebidas', icon: '🍷', name: 'Taça de vinho', price: 26 },
  { id: 'br4', cat: 'Bebidas', icon: '💧', name: 'Água', price: 5 },
  { id: 'br5', cat: 'Bebidas', icon: '🥤', name: 'Refrigerante', price: 7 },
  { id: 'br6', cat: 'Petiscos', icon: '🌭', name: 'Porção de calabresa', price: 39 },
  { id: 'br7', cat: 'Petiscos', icon: '🧆', name: 'Bolinho de bacalhau (6 un.)', price: 42 },
  { id: 'br8', cat: 'Petiscos', icon: '🍟', name: 'Batata rústica', price: 29 },
];
const SHOW = [
  { id: 'sh1', cat: 'Bebidas', icon: '🍺', name: 'Cerveja lata', price: 12 },
  { id: 'sh2', cat: 'Bebidas', icon: '💧', name: 'Água', price: 6 },
  { id: 'sh3', cat: 'Bebidas', icon: '🥤', name: 'Refrigerante', price: 8 },
  { id: 'sh4', cat: 'Comidas', icon: '🌭', name: 'Cachorro-quente', price: 18 },
  { id: 'sh5', cat: 'Comidas', icon: '🍿', name: 'Pipoca', price: 12 },
];

export const MENUS = { club: CLUB, bar: BAR, show: SHOW };
export const TABLES = 30;

// Lugar de um evento (festas e baladas usam o cardápio de balada; shows e o resto, de show).
export const venueOfEvent = (e) => ({
  id: 'ev-' + e.id,
  kind: 'evento',
  name: e.who,
  title: e.title,
  place: e.place,
  when: e.when,
  menu: /festa|balada/.test(e.group || '') || /club|house|bar/i.test(e.who || '') ? 'club' : 'show',
});
// Bar ou restaurante do Food.
export const venueOfBar = (b) => ({ id: 'bar-' + b.id, kind: 'bar', name: b.name, title: b.vibe, place: b.when, menu: 'bar' });

// Uma mesa livre para quem reserva (na versão real o estabelecimento escolhe no mapa de mesas).
export const freeTable = (taken = []) => {
  for (let i = 0; i < 50; i++) {
    const n = 1 + Math.floor(Math.random() * TABLES);
    if (!taken.includes(n)) return n;
  }
  return 1;
};

// "R$ 60" -> 60 · "Grátis" -> 0
export const ticketPrice = (v) => {
  if (typeof v === 'number') return v;
  if (/gr[aá]tis/i.test(String(v))) return 0;
  const m = String(v || '').match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  return m ? Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : '')) : 0;
};
