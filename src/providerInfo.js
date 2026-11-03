// Informações de exibição dos prestadores (demonstração): nº de avaliações,
// tempo de chegada, posição no mapa e avaliações de exemplo.
import { serviceType } from './store';

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
};

export const reviewsCount = (p) => 20 + (hash(p.id) % 220);
export const jobsDone = (p) => 40 + (hash(p.id + 'j') % 400);

export function etaMin(p) {
  const type = serviceType(p.service);
  const transport = type && type.group === 'Transporte';
  return Math.max(3, Math.round(p.distanceKm * (transport ? 4 : 6)));
}

// Posição do pino no mapa, em % (o centro 50/50 é o cliente).
export function mapPos(p) {
  const angle = ((hash(p.id) % 360) * Math.PI) / 180;
  const r = 12 + Math.min(1, p.distanceKm / 6) * 32;
  return { left: 50 + Math.cos(angle) * r * 1.5, top: 50 + Math.sin(angle) * r };
}

export const kmText = (km) => km.toFixed(1).replace('.', ',') + ' km';
export const ratingText = (r) => Number(r).toFixed(1).replace('.', ',');

const REVIEW_POOL = [
  { who: 'Ana P.', stars: 5, text: 'Chegou no horário, explicou tudo e deixou tudo organizado.' },
  { who: 'Rogério T.', stars: 5, text: 'Resolveu rápido e cobrou o combinado. Recomendo.' },
  { who: 'Lívia M.', stars: 4, text: 'Bom serviço, só atrasou uns minutos por causa do trânsito.' },
  { who: 'Diego S.', stars: 5, text: 'Muito educado e cuidadoso. Já salvei nos favoritos.' },
  { who: 'Patrícia L.', stars: 5, text: 'Acompanhei pelo mapa até chegar. Super prático.' },
];

export function sampleReviews(p) {
  const start = hash(p.id) % REVIEW_POOL.length;
  return [0, 1, 2].map((i) => REVIEW_POOL[(start + i) % REVIEW_POOL.length]);
}

// Código que o cliente confere quando o prestador chega (contra golpes).
export const arrivalCode = (id) => String(1000 + (hash(id) % 9000));
