// Rota inteligente no servidor (mesma conta do app, src/rotaInteligente.js): uma entrega nova que
// vai para o mesmo lado da que o entregador já leva é oferecida para ele levar junto.
export const TAXA_ROTA_PCT = 25;
const RUA = 1.3;
const rad = (d) => (d * Math.PI) / 180;
export function km(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) * RUA;
}
function rumo(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const ok = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
// A → B: entrega atual; C → D: nova. Devolve { economiaKm, desvioKm, kmJunto } ou null.
export function combinar(A, B, C, D) {
  if (![A, B, C, D].every(ok)) return null;
  const AB = km(A, B);
  const CD = km(C, D);
  if (AB < 0.3 || CD < 0.3) return null;
  let ang = Math.abs(rumo(A, B) - rumo(C, D)) % 360;
  if (ang > 180) ang = 360 - ang;
  if (ang > 55) return null;
  const separado = AB + km(B, C) + CD;
  const junto = Math.min(km(A, C) + km(C, B) + km(B, D), km(A, C) + km(C, D) + km(D, B));
  const desvio = junto - AB;
  const economia = separado - junto;
  if (desvio > 3.5 || economia < 1 || economia < (separado - AB) / 3) return null;
  return { economiaKm: Math.round(economia * 10) / 10, desvioKm: Math.round(Math.max(0, desvio) * 10) / 10, kmJunto: Math.round(junto * 10) / 10 };
}
