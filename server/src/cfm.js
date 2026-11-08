// Consulta de médicos do CFM (webservice contratado pelo Realys; ver PENDENCIAS.md).
// O formato da chamada vem no manual que o CFM envia junto com a chave de acesso. Enquanto a
// chave não existe, a conferência do CRM fica com a equipe (consulta pública no portal do CFM).
export function makeCfm(cfg) {
  const ready = !!(cfg.cfmWsUrl && cfg.cfmWsKey);
  async function check({ crm, uf }) {
    if (!ready) return { status: 'nao_configurado' };
    // Ajustar ao manual do CFM ao contratar (operação "Consultar": CRM, UF e chave de acesso).
    const r = await fetch(cfg.cfmWsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm: String(crm), uf: String(uf || '').toUpperCase(), chave: cfg.cfmWsKey }),
    }).catch(() => null);
    if (!r || !r.ok) return { status: 'erro' };
    const d = await r.json().catch(() => ({}));
    return { status: d && d.situacao ? String(d.situacao).toLowerCase() : 'desconhecido', nome: d && d.nome, especialidades: d && d.especialidades };
  }
  return { ready, check };
}
