// Cálculo de impostos do Realys e das empresas da plataforma.
//
// IMPORTANTE: são as regras gerais da lei (LC 123/2006 para o Simples, regras do Lucro Presumido e a
// reforma tributária da LC 214/2025). Antes de ligar a emissão de notas, o contador do Realys confere o
// regime, o anexo, o código do serviço e a alíquota de ISS de Passo Fundo e ajusta o .env (FISCAL_*).
// Todos os valores aqui são em CENTAVOS (inteiros) e as alíquotas em porcentagem (ex.: 6 = 6%).

// ---------- Simples Nacional (LC 123/2006, Anexos com a redação da LC 155/2016) ----------
// Cada faixa: [receita bruta dos últimos 12 meses até (R$), alíquota nominal (%), parcela a deduzir (R$), parte do ISS (%)].
// Anexo I = comércio (lojas). Anexo III = serviços, inclusive intermediação. Anexo V = serviços com fator R abaixo de 28%.
export const ANEXOS = {
  I: [
    [180000, 4.0, 0, null],
    [360000, 7.3, 5940, null],
    [720000, 9.5, 13860, null],
    [1800000, 10.7, 22500, null],
    [3600000, 14.3, 87300, null],
    [4800000, 19.0, 378000, null],
  ],
  III: [
    [180000, 6.0, 0, 33.5],
    [360000, 11.2, 9360, 32.0],
    [720000, 13.5, 17640, 32.5],
    [1800000, 16.0, 35640, 32.5],
    [3600000, 21.0, 125640, 33.5],
    [4800000, 33.0, 648000, null], // 6ª faixa: acima do sublimite o ISS é pago fora do Simples
  ],
  V: [
    [180000, 15.5, 0, 14.0],
    [360000, 18.0, 4500, 17.0],
    [720000, 19.5, 9900, 19.0],
    [1800000, 20.5, 17100, 21.0],
    [3600000, 23.0, 62100, 23.5],
    [4800000, 30.5, 540000, null],
  ],
};
export const TETO_SIMPLES = 4800000; // R$ 4,8 milhões por ano
// Teto do MEI pela LC 238/2026 (21/10/2026): R$ 81 mil em 2026, R$ 110 mil em 2027 e R$ 140 mil a partir
// de 2028 (este último condicionado à previsão orçamentária da renúncia de receita).
export const TETOS_MEI = { 2026: 81000, 2027: 110000, 2028: 140000 };
export const tetoMei = (ano = new Date().getFullYear()) => TETOS_MEI[Math.min(Math.max(ano, 2026), 2028)];
export const TETO_MEI = tetoMei(2026);
export const TOLERANCIA_MEI = 0.2; // até 20% acima: paga a diferença e sai do MEI no ano seguinte

const r2 = (x) => Math.round(x * 100) / 100;

// Alíquota efetiva do Simples: (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12.
// rbt12Cents = receita bruta dos 12 meses anteriores ao mês da nota (no 1º ano, a regra proporcional).
export function aliquotaSimples(rbt12Cents, anexo = 'III') {
  const tabela = ANEXOS[anexo];
  if (!tabela) throw new Error(`Anexo do Simples desconhecido: ${anexo}`);
  const rbt12 = Math.max(0, rbt12Cents) / 100;
  if (rbt12 > TETO_SIMPLES) return { foraDoSimples: true, faixa: null, efetiva: null, iss: null };
  const i = tabela.findIndex(([ate]) => rbt12 <= ate);
  const [, nominal, deduzir, partIss] = tabela[i];
  const issForaDoSimples = partIss == null && (anexo === 'III' || anexo === 'V');
  // Na 1ª faixa (ou antes de ter faturamento) a efetiva é a própria nominal.
  const efetiva = rbt12 > 0 && deduzir > 0 ? ((rbt12 * nominal) / 100 - deduzir) / rbt12 * 100 : nominal;
  let iss = partIss == null ? null : (efetiva * partIss) / 100;
  // O ISS dentro do Simples não passa de 5%: o que sobra vai para os tributos federais.
  if (iss != null && iss > 5) iss = 5;
  return { foraDoSimples: false, faixa: i + 1, nominal, efetiva: r2(efetiva), iss: iss == null ? null : r2(iss), issForaDoSimples };
}

// Fator R (LC 123, art. 18, § 5º-J e § 5º-M): intermediação de negócios é Anexo V, mas vai para o Anexo III
// quando a folha de salários dos últimos 12 meses (inclusive pró-labore e encargos) for 28% ou mais da receita.
// Empresa sem receita ainda: com folha, conta como Anexo III; sem folha, Anexo V.
export function fatorR({ folha12Cents = 0, rbt12Cents = 0 }) {
  const r = rbt12Cents > 0 ? folha12Cents / rbt12Cents : folha12Cents > 0 ? 1 : 0;
  return { fatorR: r2(r * 100) / 100, anexo: r >= 0.28 ? 'III' : 'V' };
}
// Resolve o anexo do .env: 'III', 'V', 'I' fixos, ou 'fatorR' (calcula pela folha).
export function anexoEfetivo(anexo, { folha12Cents = 0, rbt12Cents = 0 } = {}) {
  return anexo === 'fatorR' ? fatorR({ folha12Cents, rbt12Cents }).anexo : anexo;
}

// ---------- Lucro Presumido (serviços) ----------
// Presunção de 32% sobre a receita de serviços para IRPJ e CSLL. PIS 0,65% e COFINS 3% (cumulativos).
// IRPJ 15% + adicional de 10% sobre a base que passar de R$ 20 mil por mês. CSLL 9%.
// LC 224/2025 (desde 2026): sobre a parte da receita do ano que passar de R$ 5 milhões, a presunção sobe 10%
// (32% vira 35,2%). receitaAnoAntesCents = receita do ano até o mês anterior.
export function impostosPresumido(receitaMesCents, { issPct = 5, presuncao = 32, receitaAnoAntesCents = 0 } = {}) {
  const LIMITE = 5000000 * 100;
  const excedente = Math.max(0, Math.min(receitaMesCents, receitaAnoAntesCents + receitaMesCents - LIMITE));
  const base = ((receitaMesCents - excedente) * presuncao + excedente * presuncao * 1.1) / 100;
  const irpj = base * 0.15 + Math.max(0, base - 2000000) * 0.1;
  const csll = base * 0.09;
  const pis = receitaMesCents * 0.0065;
  const cofins = receitaMesCents * 0.03;
  const iss = (receitaMesCents * issPct) / 100;
  const out = { irpj, csll, pis, cofins, iss };
  for (const k of Object.keys(out)) out[k] = Math.round(out[k]);
  out.total = out.irpj + out.csll + out.pis + out.cofins + out.iss;
  out.efetiva = receitaMesCents ? r2((out.total / receitaMesCents) * 100) : 0;
  return out;
}

// ---------- Reforma tributária (CBS e IBS) ----------
// 2026 é o ano de teste: CBS 0,9% e IBS 0,1% só destacados na nota (não pagos), e quem está no Simples
// fica dispensado de destacar. A partir de 2027 a CBS passa a valer; o contador atualiza as alíquotas.
// Regime regular (Lucro Presumido/Real) é OBRIGADO a destacar desde 01/2026; Simples está dispensado em 2026.
export function ibsCbs(valorCents, { destacar = false, cbsPct = 0.9, ibsPct = 0.1 } = {}) {
  if (!destacar) return null;
  return { cbs: Math.round((valorCents * cbsPct) / 100), ibs: Math.round((valorCents * ibsPct) / 100), cbsPct, ibsPct };
}

// Imposto estimado de UMA nota do Realys (serviço de intermediação).
export function impostoDaNota(valorCents, { regime = 'simples', anexo = 'III', rbt12Cents = 0, issPct = 5, destacarIbsCbs = false } = {}) {
  if (regime === 'simples') {
    const a = aliquotaSimples(rbt12Cents, anexo);
    if (a.foraDoSimples) throw new Error('A receita dos últimos 12 meses passou do teto do Simples (R$ 4,8 milhões). Fale com o contador.');
    return {
      regime, anexo, faixa: a.faixa, aliquota: a.efetiva, issPct: a.iss,
      total: Math.round((valorCents * a.efetiva) / 100),
      iss: a.iss == null ? null : Math.round((valorCents * a.iss) / 100),
      ibsCbs: ibsCbs(valorCents, { destacar: destacarIbsCbs }),
    };
  }
  const p = impostosPresumido(valorCents, { issPct });
  return { regime, aliquota: p.efetiva, issPct, total: p.total, iss: p.iss, detalhe: p, ibsCbs: ibsCbs(valorCents, { destacar: destacarIbsCbs }) };
}

// Resumo do mês: receita, impostos estimados, custos e quanto sobra (para não trabalhar no prejuízo).
export function resumoMensal({ receitaCents, rbt12Cents, custosCents = 0, regime = 'simples', anexo = 'III', issPct = 5, receitaAnoAntesCents = 0 }) {
  let impostos;
  let aliquota;
  if (regime === 'simples') {
    const a = aliquotaSimples(rbt12Cents, anexo);
    aliquota = a.efetiva;
    impostos = a.foraDoSimples ? null : Math.round((receitaCents * a.efetiva) / 100);
  } else {
    const p = impostosPresumido(receitaCents, { issPct, receitaAnoAntesCents });
    aliquota = p.efetiva;
    impostos = p.total;
  }
  const lucro = impostos == null ? null : receitaCents - impostos - custosCents;
  return {
    receita: receitaCents, impostos, aliquota, custos: custosCents, lucro,
    margem: lucro == null || !receitaCents ? null : r2((lucro / receitaCents) * 100),
    prejuizo: lucro != null && lucro < 0,
    // Taxa mínima para empatar: quanto o Realys precisa faturar para cobrir custos e impostos.
    receitaParaEmpatar: aliquota == null || aliquota >= 100 ? null : Math.ceil(custosCents / (1 - aliquota / 100)),
  };
}

// ---------- MEI ----------
// Situação do MEI pelo que ele recebeu no ano (vendas e serviços pelo Realys). Avisa antes de estourar o teto.
export function situacaoMei(recebidoAnoCents, { mesesAtivos = 12, ano = new Date().getFullYear() } = {}) {
  const teto = Math.round((tetoMei(ano) * 100 * Math.min(12, Math.max(1, mesesAtivos))) / 12);
  const pct = teto ? (recebidoAnoCents / teto) * 100 : 0;
  let nivel = 'ok';
  let aviso = null;
  if (pct >= 100 + TOLERANCIA_MEI * 100) {
    nivel = 'desenquadrado';
    aviso = 'Passou mais de 20% do teto do MEI: o MEI é cancelado desde janeiro deste ano e os impostos são recalculados. Procure um contador agora.';
  } else if (pct >= 100) {
    nivel = 'excedeu';
    aviso = 'Passou do teto do MEI (até 20% a mais): paga um DAS complementar e vira microempresa no ano que vem.';
  } else if (pct >= 80) {
    nivel = 'atencao';
    aviso = 'Já usou 80% do teto do MEI deste ano. Planeje com um contador a passagem para microempresa.';
  }
  return { teto, recebido: recebidoAnoCents, usadoPct: r2(pct), nivel, aviso };
}
