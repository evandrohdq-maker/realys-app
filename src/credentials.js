// Carteira profissional: quem quiser se apresentar como advogado, médico, policial etc. cadastra a
// carteira da profissão (OAB, CRM, carteira policial...). A equipe do Re@lys confere antes de aprovar.
// Servidor público: é opcional, não presta serviço PARA o Re@lys e, se atender alguém pela plataforma,
// atende de graça (sem taxa do Re@lys). Pode ligar "receber casos": a plataforma passa casos (denúncias,
// pedidos de socorro, emergências) para ele analisar e decidir se quer seguir. Até haver convênio com o
// governo, isso fica à disposição como um canal entre ele e o cliente.

export const PROFESSIONS = [
  { key: 'advogado', label: 'Advogado(a)', doc: 'Carteira da OAB', conselho: 'OAB', cases: ['denuncia'] },
  { key: 'medico', label: 'Médico(a)', doc: 'Carteira do CRM', conselho: 'CRM', cases: ['emergencia'] },
  { key: 'enfermeiro', label: 'Enfermeiro(a)', doc: 'Carteira do COREN', conselho: 'COREN', cases: ['emergencia'] },
  { key: 'dentista', label: 'Dentista', doc: 'Carteira do CRO', conselho: 'CRO', cases: [] },
  { key: 'psicologo', label: 'Psicólogo(a)', doc: 'Carteira do CRP', conselho: 'CRP', cases: ['denuncia'] },
  { key: 'veterinario', label: 'Veterinário(a)', doc: 'Carteira do CRMV', conselho: 'CRMV', cases: [] },
  { key: 'engenheiro', label: 'Engenheiro(a)', doc: 'Carteira do CREA', conselho: 'CREA', cases: [] },
  { key: 'policial', label: 'Policial (PM, Brigada, Civil, Federal, Rodoviária)', doc: 'Carteira funcional policial', conselho: 'Órgão', gov: true, cases: ['perigo', 'denuncia'] },
  { key: 'guarda', label: 'Guarda Municipal', doc: 'Carteira funcional da Guarda', conselho: 'Órgão', gov: true, cases: ['perigo', 'denuncia'] },
  { key: 'bombeiro', label: 'Bombeiro(a)', doc: 'Carteira funcional do Corpo de Bombeiros', conselho: 'Órgão', gov: true, cases: ['emergencia', 'perigo'] },
  { key: 'socorrista', label: 'Socorrista do SAMU', doc: 'Carteira funcional do SAMU', conselho: 'Órgão', gov: true, cases: ['emergencia'] },
  { key: 'defesacivil', label: 'Agente da Defesa Civil', doc: 'Carteira funcional da Defesa Civil', conselho: 'Órgão', gov: true, cases: ['emergencia'] },
  { key: 'agentesaude', label: 'Agente de saúde do SUS', doc: 'Crachá ou carteira funcional do SUS', conselho: 'Órgão', gov: true, cases: ['emergencia'] },
];
export const professionOf = (key) => PROFESSIONS.find((p) => p.key === key) || null;

// Casos que este profissional pode ver (só com a carteira aprovada e "receber casos" ligado).
// Nunca mostra o nome de quem pediu; denúncia anônima segue anônima.
export function casesFor(cred, requests) {
  const p = cred && professionOf(cred.prof);
  if (!p || cred.status !== 'aprovado' || !cred.receiveCases) return [];
  return (requests || []).filter((r) => p.cases.includes(r.kind) && r.status !== 'encerrado');
}

// Só o bairro e a cidade do endereço (a localização exata vai só para casos de perigo e emergência).
export const roughPlace = (r) => {
  if (!r) return '';
  if ((r.kind === 'perigo' || r.kind === 'emergencia') && r.address) return r.address;
  const a = String(r.address || r.onde || '');
  const parts = a.split(' · ');
  return parts.length > 1 ? parts.slice(1).join(' · ') : a ? 'local informado' : 'sem local';
};

export const isGovEmail = (e) => /^[^\s@]+@([a-z0-9-]+\.)+(gov|jus|mp|leg|mil|def)\.br$/i.test(String(e || '').trim());

// Resultado da consulta no conselho: [título, explicação, cor].
export const CONSELHO_TEXT = {
  ativo: ['✔ Registro ativo no conselho', 'O conselho confirmou o seu registro.', '#1E9E63'],
  nao_encontrado: ['✖ Registro não encontrado no conselho', 'Confira o número e a UF. Se estiverem certos, a equipe confere manualmente.', '#C0392B'],
  irregular: ['✖ Registro irregular no conselho', 'O conselho informa que o registro está suspenso, cancelado ou inativo.', '#C0392B'],
  nome_diferente: ['✖ O nome no conselho é diferente do nome da conta', 'A carteira precisa ser de quem é dono da conta.', '#C0392B'],
  verificar: ['Registro encontrado, situação a conferir', 'A equipe confere a situação com o conselho.', '#C77D12'],
  manual: ['Conferência com o conselho pela equipe', 'A consulta automática deste conselho ainda não está ligada; a equipe confere.', '#C77D12'],
  erro: ['Conselho fora do ar agora', 'A equipe confere assim que o site do conselho voltar.', '#C77D12'],
  orgao_publico: ['Conferência com o órgão público', 'Servidor público: confirmamos pelo e-mail institucional ou direto com o órgão.', '#C77D12'],
};

// Consulta pública de cada conselho (para a equipe conferir no painel).
export const CONSULTA_URL = {
  OAB: 'https://cna.oab.org.br/',
  CRM: 'https://portal.cfm.org.br/busca-medicos/',
  CRP: 'https://cadastro.cfp.org.br/',
  CRMV: 'https://www.cfmv.gov.br/busca-por-profissionais/servicos/2018/10/09/',
};

// Profissões que podem aparecer no perfil público: só aprovadas e sem sigilo.
export const publicCredentials = (state, userId) =>
  (state.credentials || []).filter((c) => c.status === 'aprovado' && !c.discreto && (!userId || c.userId === userId));
