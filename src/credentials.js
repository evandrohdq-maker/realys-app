// Carteira profissional: quem quiser se apresentar como advogado, médico, policial etc. cadastra a
// carteira da profissão (OAB, CRM, carteira policial...). A equipe do Realys confere antes de aprovar.
// Servidor público: é opcional, não presta serviço PARA o Realys e, se atender alguém pela plataforma,
// atende de graça (sem taxa do Realys). Pode ligar "receber casos": a plataforma passa casos (denúncias,
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
