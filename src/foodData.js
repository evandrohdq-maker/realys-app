// Aba Food do cliente: só comida e bebida. Promoções de restaurantes, bares e happy hour,
// novidades do cardápio e a interação da galera (check-in, "vou hoje", curtidas).
// Tudo fictício, para a demonstração.
const photo = (seed, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Filtros do topo da aba Food. cats = categorias de loja; q = palavra procurada nos produtos.
export const FOOD_FILTERS = [
  { key: 'todos', label: 'Tudo', icon: 'restaurant-outline' },
  { key: 'restaurantes', label: 'Restaurantes', icon: 'pizza-outline', cats: ['Alimentação'] },
  { key: 'bares', label: 'Bares', icon: 'beer-outline', cats: ['Bares'] },
  { key: 'doces', label: 'Doces e cafés', icon: 'cafe-outline', cats: ['Doces e cafés'] },
];

// Promoções de restaurantes (patrocinadas aparecem primeiro).
export const foodPromos = [
  { id: 'fp1', storeId: 'e2', title: 'Pizza grande + refri 2 L', deal: '-30%', price: 'R$ 49,90', from: 'R$ 71,30', when: 'Hoje até 23h', photo: photo('realys-promo-pizza'), sponsored: true, cta: 'Pedir agora' },
  { id: 'fp2', storeId: 'e5', title: 'Combo duplo: 2 X-Burguer + fritas', deal: '2 por 1', price: 'R$ 34,90', from: 'R$ 69,80', when: 'Terça e quarta', photo: photo('realys-promo-burger'), cta: 'Pedir agora' },
  { id: 'fp3', storeId: 'e7', title: 'Rodízio japonês no almoço', deal: '-25%', price: 'R$ 74,90', from: 'R$ 99,90', when: 'Seg a sex, 11h às 15h', photo: photo('realys-promo-sushi'), sponsored: true, cta: 'Reservar mesa' },
  { id: 'fp4', storeId: 'e8', title: 'Café da tarde para 2', deal: 'Frete grátis', price: 'R$ 29,90', from: null, when: 'Todo dia, 15h às 18h', photo: photo('realys-promo-cafe'), cta: 'Pedir agora' },
];

// Bares e happy hour: engajamento com quem vai, quem está lá agora e o que rola hoje.
export const barSpots = [
  { id: 'b1', storeId: 'e6', name: 'Boteco do Alemão', vibe: 'Happy hour com chope em dobro', when: 'Hoje, 17h às 20h', music: 'Samba ao vivo às 21h', here: 38, going: 112, photo: photo('realys-bar-boteco'), sponsored: true },
  { id: 'b2', storeId: null, name: 'Rooftop Vista Alta', vibe: 'Drinks autorais e pôr do sol', when: 'Hoje, a partir das 18h', music: 'DJ de MPB', here: 21, going: 74, photo: photo('realys-bar-rooftop') },
  { id: 'b3', storeId: null, name: 'Bar da Esquina', vibe: 'Jogo no telão e porção grátis no gol', when: 'Quinta, 21h30', music: 'Futebol ao vivo', here: 12, going: 59, photo: photo('realys-bar-esquina') },
];

// Posts da galera sobre comida: fotos de pratos, avaliações e indicações.
export const foodPosts = [
  { id: 'fq1', author: 'Mariana Souza', place: 'Pizzaria da Praça', text: 'A de costela com catupiry é surreal! Chegou quentinha em 25 min. 🍕', likes: 84, photo: photo('realys-post-pizza') },
  { id: 'fq2', author: 'Rafael Lima', place: 'Boteco do Alemão', text: 'Happy hour com a equipe, chope gelado e bolinho de bacalhau. Recomendo! 🍻', likes: 57, photo: photo('realys-post-boteco') },
  { id: 'fq3', author: 'Juliana Costa', place: 'Doce Encanto Café', text: 'Bolo de pote de ninho com morango + cappuccino. Tarde salva ☕🍰', likes: 103, photo: photo('realys-post-doce') },
];
