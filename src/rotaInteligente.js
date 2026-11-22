// Rota inteligente do motoboy: quando ele já está com uma entrega e aparece outra no MESMO caminho,
// o Realyz oferece levar as duas juntas. Ele roda menos, gasta menos combustível e ganha a segunda
// entrega sem voltar vazio. Como a oferta vem da inteligência do Realyz (cruzar rotas em tempo real),
// a segunda entrega paga a taxa de rota inteligente no lugar da taxa normal de corrida.
//
// A conta (tudo em km, em linha reta corrigida para ruas):
//   separado  = A→B (entrega atual) + B→C (vai vazio buscar a outra) + C→D (entrega nova)
//   junto     = melhor ordem entre A→C→B→D e A→C→D→B (busca a nova no caminho)
//   desvio    = junto − A→B (o que a rota atual aumenta)
//   economia  = separado − junto
// Só oferece quando as duas vão para o mesmo lado (direção parecida), o desvio é pequeno e a
// economia vale a pena.

export const TAXA_ROTA_PCT = 25; // % da segunda entrega que fica com o Realyz (corrida normal: 18%)
export const RUA = 1.3; // linha reta → ruas de verdade (fator médio na cidade)
const MAX_ANGULO = 55; // graus de diferença entre as duas direções
const MAX_DESVIO_KM = 3.5;
const KM_POR_LITRO = 35; // moto
const PRECO_LITRO = 6.2;

const rad = (d) => (d * Math.PI) / 180;
const r2 = (n) => Math.round(n * 100) / 100;

export function km(a, b) {
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * RUA;
}

export function rumo(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const difAngulo = (x, y) => {
  const d = Math.abs(x - y) % 360;
  return d > 180 ? 360 - d : d;
};

const temPonto = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

// atual e nova: { fromGeo: {lat,lng}, toGeo: {lat,lng}, price }. Devolve a oferta ou null.
export function combinar(atual, nova) {
  const A = atual && atual.fromGeo;
  const B = atual && atual.toGeo;
  const C = nova && nova.fromGeo;
  const D = nova && nova.toGeo;
  if (![A, B, C, D].every(temPonto)) return null;
  const AB = km(A, B);
  const CD = km(C, D);
  if (AB < 0.3 || CD < 0.3) return null;
  const angulo = difAngulo(rumo(A, B), rumo(C, D));
  if (angulo > MAX_ANGULO) return null;
  const separado = AB + km(B, C) + CD;
  const ordens = [
    { ordem: ['coleta atual', 'coleta nova', 'entrega atual', 'entrega nova'], total: km(A, C) + km(C, B) + km(B, D) },
    { ordem: ['coleta atual', 'coleta nova', 'entrega nova', 'entrega atual'], total: km(A, C) + km(C, D) + km(D, B) },
  ];
  const melhor = ordens.sort((x, y) => x.total - y.total)[0];
  const desvio = melhor.total - AB;
  const economia = separado - melhor.total;
  // Vale a pena: desvio pequeno e economia de pelo menos 1 km e de um terço do que rodaria separado.
  if (desvio > MAX_DESVIO_KM || economia < 1 || economia < (separado - AB) / 3) return null;
  const price = Number(nova.price) || 0;
  const taxa = r2((price * TAXA_ROTA_PCT) / 100);
  return {
    angulo: Math.round(angulo),
    ordem: melhor.ordem,
    kmJunto: r2(melhor.total),
    kmSeparado: r2(separado),
    desvioKm: r2(Math.max(0, desvio)),
    economiaKm: r2(economia),
    combustivel: r2((economia / KM_POR_LITRO) * PRECO_LITRO),
    preco: r2(price),
    taxa,
    taxaPct: TAXA_ROTA_PCT,
    motoboy: r2(price - taxa),
  };
}

// Para cada entrega em andamento, as entregas novas que combinam com ela (a melhor primeiro).
export function ofertasDeRota(emAndamento, pedidos) {
  const out = [];
  (emAndamento || [])
    .filter((r) => !r.done && temPonto(r.fromGeo) && temPonto(r.toGeo))
    .forEach((atual) => {
      (pedidos || []).forEach((nova) => {
        const o = combinar(atual, nova);
        if (o) out.push({ atual, nova, ...o });
      });
    });
  return out.sort((x, y) => y.economiaKm - x.economiaKm);
}
