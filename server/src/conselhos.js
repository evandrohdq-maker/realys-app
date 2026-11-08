// Consulta automática nos conselhos profissionais: devolve positivo ("ativo") ou negativo na hora.
//
// Como funciona: os sites públicos dos conselhos (CFP, CFMV, COREN, CRO, CREA...) têm proteção contra
// robôs (reCAPTCHA) e não liberam acesso direto para apps. Para consultar de forma legal e estável,
// usamos um serviço de consultas em fontes públicas (Infosimples, pago por consulta), que já entrega
// esses cadastros em JSON, e o webservice oficial do CFM para médicos (src/cfm.js).
// Sem a chave contratada, a consulta fica "manual" e a equipe confere pelo painel.
//
// INFOSIMPLES_TOKEN: chave do serviço. CONSELHO_PATHS (opcional, JSON) troca ou acrescenta caminhos,
// ex.: {"CRO-SP":"cro-sp/cadastro","CREA-PR":"crea-pr/cadastro"}. Conferir os caminhos no painel deles ao contratar.
const DEFAULT_PATHS = {
  CRP: 'cfp/cadastro', // nacional (todos os CRPs)
  CRMV: 'cfmv/cadastro', // nacional (todos os CRMVs)
  'COREN-SP': 'coren-sp/cadastro',
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const ACTIVE = /(ativ|regular|definitiv|principal)/;
const BAD = /(cancel|suspens|inativ|baixad|falecid|cassad|irregular)/;

export function makeConselhos(cfg, fetchFn = globalThis.fetch) {
  let extra = {};
  try {
    extra = cfg.conselhoPaths ? JSON.parse(cfg.conselhoPaths) : {};
  } catch (e) {
    extra = {};
  }
  const paths = { ...DEFAULT_PATHS, ...extra };
  const ready = !!cfg.infosimplesToken;
  const pathFor = (conselho, uf) => paths[`${conselho}-${String(uf || '').toUpperCase()}`] || paths[conselho] || null;

  // conselho: 'CRP' | 'CRMV' | 'COREN' | 'CRO' | 'CREA' ...
  async function check({ conselho, numero, uf }) {
    const path = pathFor(conselho, uf);
    if (!ready || !path) return { status: 'manual', motivo: !ready ? 'consulta automática não contratada' : `sem consulta automática para ${conselho}${uf ? '-' + uf : ''}` };
    const body = new URLSearchParams({ token: cfg.infosimplesToken, timeout: '60' });
    if (conselho === 'CRMV') {
      body.set('query', String(numero));
      if (uf) body.set('uf', uf);
    } else if (conselho === 'CRP') {
      body.set('registro', String(numero));
      if (uf) body.set('uf', uf);
    } else {
      body.set('inscricao', String(numero));
      if (uf) body.set('uf', uf);
    }
    let d;
    try {
      const r = await fetchFn(`https://api.infosimples.com/api/v2/consultas/${path}`, { method: 'POST', body });
      d = await r.json();
    } catch (e) {
      return { status: 'erro', motivo: 'conselho fora do ar' };
    }
    // Infosimples: code 200 = encontrado; 612 = nada encontrado; outros = erro da fonte.
    if (d && d.code === 612) return { status: 'nao_encontrado' };
    if (!d || d.code !== 200) return { status: 'erro', motivo: (d && d.code_message) || 'sem resposta' };
    const rows = [].concat(...(d.data || []).map((x) => x.resultados || x.dados || [x]));
    const row = rows.find((x) => norm(x.registro || x.inscricao || x.crmv || x.numero).replace(/\D/g, '') === String(numero).replace(/\D/g, '')) || rows[0];
    if (!row) return { status: 'nao_encontrado' };
    const sit = norm(row.situacao);
    return { status: BAD.test(sit) ? 'irregular' : ACTIVE.test(sit) || !sit ? 'ativo' : 'verificar', situacao: row.situacao || null, nome: row.nome || null };
  }
  return { ready, check, pathFor };
}
