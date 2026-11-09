// Desapego: itens usados entre pessoas. Taxa do Realys igual à dos pedidos (10%), descontada do vendedor
// só quando o comprador confirma que recebeu.
import { ORDER_FEE_PCT } from './fees';

export const DESAPEGO_CATS = [
  ['eletronicos', 'Eletrônicos'],
  ['moveis', 'Móveis'],
  ['roupas', 'Roupas e calçados'],
  ['casa', 'Casa e cozinha'],
  ['infantil', 'Bebês e crianças'],
  ['esporte', 'Esporte e bike'],
  ['livros', 'Livros e games'],
  ['outros', 'Outros'],
];
export const DESAPEGO_CONDITIONS = ['Novo, sem uso', 'Usado, ótimo estado', 'Usado, com marcas', 'Para conserto'];
export const desapegoFee = (price) => +(((price || 0) * ORDER_FEE_PCT) / 100).toFixed(2);

const photo = (seed) => `https://picsum.photos/seed/${seed}/600/600`;
export const DESAPEGO_DEMO = [
  { id: 'dz1', title: 'Bicicleta aro 29, 21 marchas', price: 650, cat: 'esporte', condition: 'Usado, ótimo estado', place: 'Pinheiros, São Paulo', seller: 'Marcos Lima', desc: 'Revisada mês passado. Pneus novos. Acompanha capacete.', photo: photo('realys-bike'), status: 'disponivel', at: Date.now() - 86400000 },
  { id: 'dz2', title: 'Sofá retrátil 3 lugares', price: 900, cat: 'moveis', condition: 'Usado, com marcas', place: 'Moema, São Paulo', seller: 'Patrícia Rocha', desc: 'Tecido suede cinza, uma pequena marca no braço. Retirar no local.', photo: photo('realys-sofa'), status: 'disponivel', at: Date.now() - 2 * 86400000 },
  { id: 'dz3', title: 'Carrinho de bebê com bebê conforto', price: 480, cat: 'infantil', condition: 'Usado, ótimo estado', place: 'Vila Mariana, São Paulo', seller: 'Juliana Prado', desc: 'Usado por 8 meses. Fecha com uma mão. Sem manchas.', photo: photo('realys-carrinho'), status: 'disponivel', at: Date.now() - 3 * 86400000 },
  { id: 'dz4', title: 'Console com 2 controles e 3 jogos', price: 1350, cat: 'livros', condition: 'Usado, ótimo estado', place: 'Santana, São Paulo', seller: 'Rafael Nunes', desc: 'Funcionando perfeitamente, na caixa. Nota fiscal.', photo: photo('realys-console'), status: 'disponivel', at: Date.now() - 4 * 86400000 },
];
