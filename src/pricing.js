// Preço justo no Realys: corridas (motorista e motoboy) e faixas de referência de visitas,
// consultas e atendimentos por vídeo. Mudou um valor? Muda só aqui.
//
// CORRIDAS: tarifa base + quilômetro + minuto (o minuto paga o tempo parado no trânsito).
// Nos horários de pico e com muita procura o valor sobe um pouco, porque o prestador gasta mais
// combustível no anda e para, troca mais de marcha e demora mais: tempo é dinheiro.
// O aumento é moderado e tem teto: no máximo 1,5x (outros apps chegam a 2x ou mais).
//
// Referências usadas (pesquisadas em nov/2026):
// - Carro: tarifas publicadas do UberX/99Pop (R$ 2 + R$ 1,40/km + R$ 0,26/min, mínimo R$ 7, valores
//   antigos que os apps pararam de divulgar), corrigidas pela inflação e pelos reajustes de combustível.
// - Motoboy: os apps pagam R$ 6,50 por entrega + R$ 1,50/km; a categoria pede R$ 10 + R$ 2,50/km.
//   O Realys fica no meio: justo para o motoboy e acessível para o cliente.

const r2 = (n) => Math.round(n * 100) / 100;

export const TARIFFS = {
  motorista: { label: 'Carro', base: 3.0, km: 1.9, min: 0.36, minimo: 9.5 },
  motoboy: { label: 'Motoboy', base: 8.0, kmFree: 3, km: 2.0, min: 0.15, minimo: 8.0 },
};
export const tariffOf = (serviceKey) => TARIFFS[serviceKey] || (/moto/.test(serviceKey || '') ? TARIFFS.motoboy : TARIFFS.motorista);

// Parte do Realys nas corridas (o resto é do prestador). Uber e 99 ficam com 20% a 35% (src/taxas.js).
export const RIDE_FEE_PCT = 18;
export const SURGE_MAX = 1.5;

// Velocidade média na cidade: ~25 km/h normal, ~15 km/h no pico (anda e para).
const minutesFor = (km, peak) => Math.max(4, Math.round((km / (peak ? 15 : 25)) * 60));

// Horário de pico e procura. Devolve { mult, reasons: [{ label, pct }] }.
export function surgeAt(date = new Date(), { demand = 0, rain = false } = {}) {
  const d = date.getDay();
  const h = date.getHours() + date.getMinutes() / 60;
  const weekday = d >= 1 && d <= 5;
  const reasons = [];
  if (weekday && ((h >= 6.5 && h < 9.5) || (h >= 17 && h < 20))) reasons.push({ label: 'Horário de pico (trânsito lento, mais combustível)', pct: 15 });
  if ((d === 5 || d === 6) && (h >= 22 || h < 3)) reasons.push({ label: 'Noite de sexta/sábado', pct: 10 });
  if ((d === 6 || d === 0) && h >= 3 && h < 5) reasons.push({ label: 'Madrugada de fim de semana', pct: 10 });
  if (rain) reasons.push({ label: 'Chuva', pct: 10 });
  // Procura: pedidos esperando por prestador disponível (0 = normal, 1 = o dobro de pedidos).
  if (demand > 0.3) reasons.push({ label: 'Muita procura agora', pct: Math.min(20, Math.round(demand * 15)) });
  const mult = Math.min(SURGE_MAX, 1 + reasons.reduce((s, r) => s + r.pct, 0) / 100);
  return { mult: r2(mult), reasons };
}

// Preço da corrida. km = trajeto; minutes opcional (senão estima pelo trânsito do horário).
export function fareQuote(serviceKey, km, { at = new Date(), demand = 0, rain = false, minutes } = {}) {
  const t = tariffOf(serviceKey);
  const s = surgeAt(at, { demand, rain });
  const peak = s.reasons.some((r) => /pico/.test(r.label));
  const min = minutes != null ? minutes : minutesFor(km, peak);
  const kmPaid = Math.max(0, km - (t.kmFree || 0));
  const normal = Math.max(t.minimo, t.base + kmPaid * t.km + min * t.min);
  const total = r2(normal * s.mult);
  const fee = r2((total * RIDE_FEE_PCT) / 100);
  return {
    serviceKey,
    km: r2(km),
    minutes: min,
    normal: r2(normal),
    mult: s.mult,
    reasons: s.reasons,
    total,
    realysFee: fee,
    driverGets: r2(total - fee),
    tariff: t,
  };
}

// Texto curto do valor dinâmico para mostrar ao cliente.
export const surgeText = (q) => (q && q.mult > 1 ? `${q.reasons.map((r) => `${r.label} +${r.pct}%`).join(' · ')} (teto ${String(SURGE_MAX).replace('.', ',')}x)` : '');

// Ganho do motorista: corrida menos taxa do Realys e combustível.
export function driverEarnings(q, { kmPerLiter = 11, fuelPrice = 6.2, deadheadKm = 2 } = {}) {
  const fuel = r2(((q.km + deadheadKm) / kmPerLiter) * fuelPrice);
  const net = r2(q.driverGets - fuel);
  const perHour = q.minutes ? r2((net / (q.minutes + 6)) * 60) : 0; // +6 min até buscar o passageiro
  return { fuel, net, perHour };
}

// ---------- Faixa justa de valores (visitas, consultas, atendimento por vídeo) ----------
// Ninguém cobra acima do teto da faixa: fica justo para o cliente e equilibrado entre prestadores.
// Abaixo do piso é permitido, mas o app avisa (pode não cobrir os custos do prestador).
// src = de onde veio a referência; provisoria = sem fonte confirmada, revisar com dados reais.
export const PRICE_REFS = {
  eletricista: {
    visita: { min: 90, typical: 120, max: 160, src: 'Engehall, tabela 2026 (visita técnica R$ 90 a R$ 160)' },
    hora: { min: 80, typical: 110, max: 150, src: 'Engehall e Click Petróleo e Gás, 2026 (hora R$ 80 a R$ 150)' },
  },
  encanador: {
    visita: { min: 80, typical: 120, max: 200, src: 'Revista Oeste, jan/2026 (técnico para ajuste simples R$ 80 a R$ 200)' },
    'diária (8h)': { min: 200, typical: 270, max: 350, src: 'Lar Pontual, 2026 (diária R$ 200 a R$ 350)' },
  },
  pedreiro: { 'diária (8h)': { min: 180, typical: 215, max: 250, src: 'Canal Rural, ago/2026 (diária R$ 180 a R$ 250)' } },
  tecnico: { visita: { min: 80, typical: 120, max: 200, src: 'Revista Oeste, jan/2026 (técnico R$ 80 a R$ 200)' } },
  psicologo: {
    'sessão (50 min)': { min: 60, typical: 150, max: 350, src: 'Agilize, 2026: online R$ 60 a R$ 250, presencial R$ 100 a R$ 350; tabela CFP/Fenapsi com média de R$ 326,61' },
  },
  nutricionista: { consulta: { min: 150, typical: 220, max: 400, src: 'Monitor do Mercado, 2026 (consulta R$ 150 a R$ 400)' } },
  psiquiatra: { consulta: { min: 380, typical: 500, max: 580, src: 'Base Sanar, ago/2026 (mediana R$ 500; maioria R$ 380 a R$ 580; teleconsulta R$ 450)' } },
  medico: { consulta: { min: 150, typical: 300, max: 600, provisoria: true, src: 'Referência provisória: confirmar por especialidade (ex.: Base Sanar)' } },
};
// Atendimento por vídeo costuma ser ~10% mais barato que o presencial (Base Sanar, 2026).
export const ONLINE_DISCOUNT = 0.9;

// Faixa justa para o serviço e a unidade ("visita", "hora", "consulta"...). null se não tem referência.
export function priceRef(serviceKey, unit, { online = false } = {}) {
  const refs = PRICE_REFS[serviceKey] || (/tecnico|reparo|conserto|manutenc/.test(serviceKey || '') ? PRICE_REFS.tecnico : null);
  if (!refs) return null;
  const first = (x) => String(x || '').split(' ')[0];
  const u = Object.keys(refs).find((k) => first(k) === first(unit));
  const ref = u && refs[u];
  if (!ref) return null;
  if (!online) return { ...ref, unit: u };
  return { ...ref, unit: u, min: Math.round(ref.min * ONLINE_DISCOUNT), typical: Math.round(ref.typical * ONLINE_DISCOUNT), max: Math.round(ref.max * ONLINE_DISCOUNT) };
}

// O valor está dentro da faixa justa? { ok, level: 'ok'|'baixo'|'alto', ref }
export function checkFair(serviceKey, unit, value, opts) {
  const ref = priceRef(serviceKey, unit, opts);
  if (!ref || !(value > 0)) return { ok: true, level: 'ok', ref };
  if (value > ref.max) return { ok: false, level: 'alto', ref };
  if (value < ref.min) return { ok: true, level: 'baixo', ref };
  return { ok: true, level: 'ok', ref };
}
export const brlInt = (n) => `R$ ${Math.round(n)}`;
export const refText = (ref) => (ref ? `${brlInt(ref.min)} a ${brlInt(ref.max)} por ${ref.unit} (comum: ${brlInt(ref.typical)})` : '');
