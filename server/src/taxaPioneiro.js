// Taxa do Realyz para motoboys e motoristas Pioneiros (piloto em Passo Fundo).
//
// Motoboy Pioneiro, só na tele-entrega (entregas de pedidos e cargas):
//   - 1º mês (30 dias a partir da primeira entrega): taxa zero, a entrega é 100% dele. O Realyz
//     continua ganhando no pedido: 10% da loja e R$ 0,99 da taxa de proteção do cliente;
//   - do 2º ao 6º mês: 10% (a tabela normal é 18%);
//   - depois de 6 meses: 15%, enquanto for pioneiro.
// Motorista Pioneiro, nas corridas (outro sistema: chamados de transporte): 15% nos primeiros
// 6 meses a partir da primeira corrida; depois, a tabela normal.
// Quem não é pioneiro (ou ainda não teve a conta ligada pelo administrador) paga a tabela normal.
// A taxa do pioneiro nunca passa da taxa normal daquela entrega ou corrida.
const DIA = 86400000;
export const REGRAS_PIONEIRO = {
  motoboy: { tipo: 'entrega', faixas: [{ ateDias: 30, pct: 0 }, { ateDias: 182, pct: 10 }, { ateDias: Infinity, pct: 15 }] },
  motorista: { tipo: 'corrida', faixas: [{ ateDias: 182, pct: 15 }] },
};
const TRANSPORTE = ['motorista', 'motoboy', 'frete', 'carro', 'moto', 'van'];

export function makeTaxaPioneiro(db) {
  // Quando foi a primeira entrega (ou corrida) da pessoa: é dela que contam os prazos.
  function primeira(userId, tipo) {
    if (tipo === 'entrega') return db.prepare(`SELECT MIN(updated_at) AS t FROM entregas WHERE entregador_id = ? AND status IN ('aceita','coletada','entregue')`).get(userId).t || null;
    const marks = TRANSPORTE.map(() => '?').join(',');
    return db.prepare(`SELECT MIN(created_at) AS t FROM service_calls WHERE provider_id = ? AND service IN (${marks}) AND status = 'Concluído'`).get(userId, ...TRANSPORTE).t || null;
  }
  // Taxa do pioneiro para esta entrega/corrida (null = não é pioneiro nesse tipo: vale a tabela normal).
  function pct(userId, normal, { tipo = 'entrega', agora = Date.now() } = {}) {
    if (!userId) return null;
    const p = db.prepare(`SELECT area FROM pioneiros WHERE user_id = ? AND status = 'fechado' AND area IN ('motoboy','motorista') LIMIT 1`).get(userId);
    const regra = p && REGRAS_PIONEIRO[p.area];
    if (!regra || regra.tipo !== tipo) return null;
    const ini = primeira(userId, tipo) || agora; // sem nenhuma ainda: esta é a primeira
    const dias = (agora - ini) / DIA;
    const faixa = regra.faixas.find((f) => dias < f.ateDias);
    return faixa ? Math.min(faixa.pct, normal) : null;
  }
  // Para mostrar ao pioneiro em que fase ele está.
  function situacao(userId, agora = Date.now()) {
    const p = db.prepare(`SELECT area, numero FROM pioneiros WHERE user_id = ? AND status = 'fechado' LIMIT 1`).get(userId);
    if (!p) return null;
    const regra = REGRAS_PIONEIRO[p.area];
    if (!regra) return { area: p.area, numero: p.numero };
    const ini = primeira(userId, regra.tipo);
    const dias = ini ? (agora - ini) / DIA : 0;
    const faixa = regra.faixas.find((f) => dias < f.ateDias);
    return { area: p.area, numero: p.numero, desde: ini, taxaAgora: faixa ? faixa.pct : null, proximaMudanca: faixa && faixa.ateDias !== Infinity && ini ? ini + faixa.ateDias * DIA : null };
  }
  return { pct, situacao };
}
