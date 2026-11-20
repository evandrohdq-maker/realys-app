// Vitrine do fornecedor: preço com promoção e textos de apoio.
// promo = { off: % de desconto, until: até quando vale } — aparece em destaque na vitrine e no catálogo.
export const PROMO_UNTIL = ['hoje', 'amanhã', 'sexta', '7 dias', '30 dias'];

export const hasPromo = (item) => !!(item && item.promo && item.promo.off > 0);

// Preço por unidade que vale agora (já com a promoção, se tiver).
export const unitPriceOf = (item) => (item ? +(item.unitPrice * (1 - (hasPromo(item) ? item.promo.off : 0) / 100)).toFixed(2) : 0);

// Capa do produto: 1ª foto (ou nada, e a vitrine usa o emoji).
export const coverOf = (item) => (item && item.photos && item.photos[0]) || null;
