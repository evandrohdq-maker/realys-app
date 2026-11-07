// Módulo de Serviços: taxa de visita, ranking dos prestadores e plano de destaque.
//
// Como funciona (demonstração):
// 1. O cliente pede uma visita e paga a TAXA DE VISITA pelo Realys. O valor fica retido.
// 2. O prestador aceita ou recusa. Recusou: a taxa volta na hora e o pedido não recebe avaliação.
// 3. Aceitou: a conversa segue pelo chat do Realys e o telefone é liberado (a taxa já foi paga).
// 4. O cliente confirma que a visita aconteceu. Só então a taxa é dividida:
//    REALYS_FEE_PCT % fica com o Realys e o resto vai para o prestador.
//    Se o prestador não foi, a taxa volta para o cliente e ele perde posição no ranking.
// 5. O valor final do serviço é negociado entre cliente e prestador (o Realys não define nem cobra).
//    O prestador pode abater a taxa de visita no fechamento do serviço, como desconto: é acordo entre eles.
// 6. Serviço concluído: o cliente avalia o prestador e o prestador avalia o cliente.
//
// O ranking pesa nota e serviços finalizados nos últimos 90 dias, taxa e tempo de resposta e
// proximidade. Recusar NÃO pune; faltar numa visita aceita pune. Prestador novo ganha impulso
// nos primeiros 30 dias. Quem paga o plano de destaque aparece separado, como "Patrocinado".
import { serviceTypes } from './data';

// Porcentagem do Realys sobre a taxa de visita. O valor da visita é o prestador quem define;
// o Realys só lucra os 10% da visita e nunca define o valor final do serviço.
export const REALYS_FEE_PCT = 10;
// Plano de destaque do prestador (mensal).
export const HIGHLIGHT_PLAN = { name: 'Destaque Realys', price: 49.9 };
// Só competem prestadores dentro deste raio do cliente.
export const RANK_RADIUS_KM = 20;
// Dias que contam para o ranking e dias de impulso do prestador novo.
export const RANK_DAYS = 90;
export const NEW_BOOST_DAYS = 30;

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
};
const round2 = (v) => Math.round(v * 100) / 100;

// Exemplos da demonstração que assinam o plano de destaque.
const DEMO_SPONSORED = ['v13'];

// Transporte (motorista, motoboy, frete) continua como corrida. O resto funciona por visita.
export function isVisitService(serviceKey) {
  const t = serviceTypes.find((s) => s.key === serviceKey);
  // Transporte é chamado na hora; atendimento online é por chamada de vídeo: nenhum dos dois tem visita.
  return !!t && t.group !== 'Transporte' && t.mode !== 'online';
}

// Taxa de visita: o prestador informa no cadastro. Nos exemplos, quem cobra "por visita" usa esse valor.
export function visitFee(p) {
  if (p.visitFee != null) return Number(p.visitFee);
  if (p.priceUnit === 'visita') return Number(p.price);
  return 40 + (hash(p.id + 'fee') % 6) * 10; // R$ 40 a R$ 90
}

// O prestador pode descontar a taxa de visita do serviço se for contratado.
export const visitDiscount = (p) => (p.visitDiscount != null ? !!p.visitDiscount : hash(p.id + 'desc') % 2 === 0);

// Números que entram no ranking. Os exemplos são fixos por prestador; o que acontece no app soma em cima.
export function providerStats(p) {
  const h = hash(p.id + 'stats');
  return {
    done90: p.done90 != null ? p.done90 : 6 + (h % 40), // serviços finalizados nos últimos 90 dias
    responseRate: p.responseRate != null ? p.responseRate : 78 + (h % 22), // % de pedidos respondidos
    responseMin: p.responseMin != null ? p.responseMin : 3 + (h % 28), // tempo médio de resposta
    noShows: p.noShows != null ? p.noShows : h % 9 === 0 ? 1 : 0, // faltas em visitas aceitas
    joinedDays: p.joinedDays != null ? p.joinedDays : h % 7 === 3 ? 12 : 120 + (h % 700),
    sponsored: p.sponsored != null ? !!p.sponsored : DEMO_SPONSORED.includes(p.id) || h % 9 === 4,
  };
}

export const isNewProvider = (p) => providerStats(p).joinedDays <= NEW_BOOST_DAYS;

// Nota de 0 a ~1,15. Qualidade pesa mais que quantidade: 50 serviços com nota 3
// não passam de 20 serviços com nota 5.
export function rankScore(p) {
  const s = providerStats(p);
  const quality = Math.min(1, Math.max(0, (Number(p.rating) - 3) / 2));
  const volume = Math.min(1, s.done90 / 40);
  const response = (s.responseRate / 100) * 0.7 + (1 - Math.min(1, s.responseMin / 60)) * 0.3;
  const near = 1 - Math.min(1, (p.distanceKm || 0) / RANK_RADIUS_KM);
  const boost = s.joinedDays <= NEW_BOOST_DAYS ? 0.15 : 0;
  return quality * 0.45 + volume * 0.3 + response * 0.15 + near * 0.1 + boost - s.noShows * 0.12;
}

// Ranking da categoria na região do cliente: patrocinados separados, o resto por mérito.
export function rankProviders(providers, serviceKey) {
  const region = providers.filter((p) => p.service === serviceKey && (p.distanceKm || 0) <= RANK_RADIUS_KM);
  const merit = [...region].sort((a, b) => rankScore(b) - rankScore(a));
  const sponsored = region.filter((p) => providerStats(p).sponsored).sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 1);
  return { merit, sponsored };
}

// Posição (1, 2, 3...) do prestador no ranking por mérito da categoria dele.
export function rankPosition(providers, p) {
  const { merit } = rankProviders(providers, p.service);
  const i = merit.findIndex((x) => x.id === p.id);
  return { pos: i + 1, total: merit.length };
}

// Divisão da taxa depois que a visita é confirmada.
export function splitFee(fee) {
  const realys = round2((fee * REALYS_FEE_PCT) / 100);
  return { realys, provider: round2(fee - realys) };
}

export const VISIT_STATUS = {
  aguardando: { label: 'Aguardando o prestador', color: '#2F74D0', icon: 'time-outline' },
  aceita: { label: 'Visita aceita', color: '#1E9E63', icon: 'checkmark-circle-outline' },
  recusada: { label: 'Recusado · taxa devolvida', color: '#6E7891', icon: 'close-circle-outline' },
  faltou: { label: 'Prestador não veio · taxa devolvida', color: '#D9534F', icon: 'alert-circle-outline' },
  confirmada: { label: 'Visita feita · combine o valor', color: '#A8790A', icon: 'people-outline' },
  concluida: { label: 'Serviço concluído', color: '#1E9E63', icon: 'ribbon-outline' },
  reembolsada: { label: 'Garantia Realys · taxa devolvida', color: '#1E9E63', icon: 'shield-checkmark-outline' },
};

// Pedidos de visita que chegam para quem usa o perfil Prestador (exemplos).
export const SAMPLE_VISIT_REQUESTS = [
  { id: 'vq1', client: 'Cláudia R.', clientRating: 4.9, address: 'Rua Tamandaré, 310', problem: 'Chuveiro desarmando o disjuntor', when: 'Hoje, 15h', distanceKm: 1.8 },
  { id: 'vq2', client: 'Pizzaria da Praça', clientRating: 4.6, address: 'Praça da Sé, 12', problem: 'Vazamento embaixo da pia da cozinha', when: 'Amanhã, 9h', distanceKm: 2.9 },
  { id: 'vq3', client: 'Rodrigo A.', clientRating: 4.2, address: 'Av. Brasil, 1500', problem: 'Orçamento para reforma do banheiro', when: 'Sábado, 10h', distanceKm: 7.4 },
];
