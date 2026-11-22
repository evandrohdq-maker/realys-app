// Valores do MEI sempre atualizados, sem ninguém mexer no código:
//  - Salário mínimo: buscado sozinho na API oficial do Banco Central (série 1619 do SGS), ao ligar o
//    servidor e a cada 12 horas. Mudou o mínimo (todo janeiro), o DAS muda junto.
//  - DAS = 5% do salário mínimo (INSS) + ICMS R$ 1 (comércio/indústria) e/ou ISS R$ 5 (serviços).
//    MEI caminhoneiro: 12% do mínimo.
//  - Limite de faturamento: pela lei, com as datas já aprovadas (LC 238/2026: R$ 110 mil em 2027 e
//    R$ 140 mil em 2028). Na virada do ano ele troca sozinho.
//  - O administrador pode corrigir qualquer valor (se a lei mudar) em /admin/mei/valores.
// Tudo fica na tabela parametros (chave 'mei'); o app e a Lotus leem de GET /mei/valores.
import { now } from './http.js';

const BCB = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1619/dados/ultimos/1?formato=json';
// Base legal conhecida (o administrador pode trocar). limites: a partir de que ano vale cada teto.
const PADRAO = {
  salarioMinimo: 1621,
  salarioMinimoData: '01/01/2026',
  inssPct: 5,
  inssPctCaminhoneiro: 12,
  icms: 1,
  iss: 5,
  limites: [{ desde: 2018, valor: 81000 }, { desde: 2027, valor: 110000 }, { desde: 2028, valor: 140000 }],
  toleranciaPct: 20,
  fonte: 'padrão (salário mínimo 2026)',
};
const r2 = (n) => Math.round(n * 100) / 100;

export function makeMeiValores({ db, fetchFn = globalThis.fetch }) {
  const ler = () => {
    const row = db.prepare("SELECT valor, updated_at FROM parametros WHERE chave = 'mei'").get();
    return row ? { ...PADRAO, ...JSON.parse(row.valor), atualizadoEm: row.updated_at } : { ...PADRAO, atualizadoEm: null };
  };
  const gravar = (patch) => {
    const atual = ler();
    const { atualizadoEm, ...base } = atual;
    const novo = { ...base, ...patch };
    db.prepare("INSERT INTO parametros (chave, valor, updated_at) VALUES ('mei', ?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at").run(JSON.stringify(novo), now());
    return valores();
  };

  // Valores prontos para o app (para o ano de hoje).
  function valores(hoje = new Date()) {
    const p = ler();
    const ano = hoje.getFullYear();
    const lim = [...p.limites].sort((a, b) => a.desde - b.desde);
    const vigente = lim.filter((l) => l.desde <= ano).pop() || lim[0];
    const inss = r2((p.salarioMinimo * p.inssPct) / 100);
    return {
      ano,
      salarioMinimo: p.salarioMinimo,
      salarioMinimoData: p.salarioMinimoData,
      inss,
      das: { servico: r2(inss + p.iss), comercio: r2(inss + p.icms), misto: r2(inss + p.icms + p.iss) },
      limiteAno: vigente.valor,
      tolerancia: r2(vigente.valor * (1 + p.toleranciaPct / 100)),
      proximos: lim.filter((l) => l.desde > ano).map((l) => ({ ano: l.desde, limite: l.valor })),
      caminhoneiro: { inss: r2((p.salarioMinimo * p.inssPctCaminhoneiro) / 100) },
      fonte: p.fonte,
      atualizadoEm: p.atualizadoEm,
    };
  }

  // Busca o salário mínimo oficial no Banco Central.
  async function atualizar(fetcher = fetchFn) {
    try {
      const res = await fetcher(BCB, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Banco Central respondeu ${res.status}`);
      const lista = await res.json();
      const ult = Array.isArray(lista) ? lista[lista.length - 1] : null;
      const sm = ult ? Number(String(ult.valor).replace(',', '.')) : NaN;
      // Confere se o número faz sentido antes de usar (nunca grava lixo).
      if (!(sm >= 1000 && sm <= 20000)) throw new Error('valor do salário mínimo fora do esperado');
      const antes = ler().salarioMinimo;
      gravar({ salarioMinimo: sm, salarioMinimoData: ult.data, fonte: 'Banco Central (SGS 1619)' });
      return { ok: true, salarioMinimo: sm, mudou: sm !== antes };
    } catch (e) {
      return { ok: false, motivo: e.message };
    }
  }

  let timer = null;
  const start = () => {
    if (timer) return;
    atualizar().catch(() => {});
    timer = setInterval(() => atualizar().catch(() => {}), 12 * 3600000);
    timer.unref && timer.unref();
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  return { valores, atualizar, gravar, start, stop };
}
