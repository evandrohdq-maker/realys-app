// Perfil de trabalho com CNPJ: uma conta (CPF + biometria), vários perfis. O perfil social só descreve
// a pessoa e serve para navegar, comprar e contratar como cliente. Trabalhar no Realyz (prestar serviço,
// vender como artista, ter loja) exige um perfil de trabalho com CNPJ (MEI vale).
import { fail } from './http.js';

export const TIPOS_TRABALHO = {
  prestador: 'Prestador de serviço',
  artista: 'Artista',
  criador: 'Criador de conteúdo / Gamer',
  professor: 'Professor / Cursos',
  saude: 'Profissional de saúde',
  imobiliaria: 'Imobiliária / Revenda',
  radio: 'Rádio / TV',
  loja: 'Loja',
};

// A conta pode agir como este tipo de profissional? Conta de empresa (CNPJ) já é; admin e teste passam.
export function temTrabalho(db, user, tipo, roles = [], cfg = {}) {
  if (!user) return false;
  if (cfg.exigirCnpjTrabalho === false) return true;
  if (roles.includes('admin') || user.teste) return true;
  if (user.kind === 'empresa') return true;
  return !!db.prepare("SELECT 1 FROM perfis_trabalho WHERE owner_id = ? AND tipo = ? AND status = 'ativo'").get(user.id, tipo);
}

// Algum destes tipos (ex.: presentes de live valem para criador de conteúdo ou artista).
export const temAlgum = (db, user, tipos, roles, cfg) => tipos.some((t) => temTrabalho(db, user, t, roles, cfg));
export function exigirTrabalho(db, user, tipo, roles, cfg) {
  if (!temTrabalho(db, user, tipo, roles, cfg)) {
    fail(403, `Para atuar como ${TIPOS_TRABALHO[tipo].toLowerCase()} no Realyz, crie seu perfil de trabalho com o CNPJ (MEI vale) no Perfil › Perfil de trabalho.`, 'sem_cnpj');
  }
}

// O CNPJ é desta pessoa? Consulta pública do CNPJ (BrasilAPI, dados da Receita) e compara com o CPF e o
// nome da conta. MEI: o nome do empresário vem na razão social (às vezes com o CPF). Sociedade: o CPF do
// sócio vem mascarado (***123456**), então confere os 6 números do meio e o nome.
// Resposta: 'confere' | 'nao_confere' | 'sem_consulta' (consulta fora do ar: vai para análise da equipe).
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
export function conferirTitular(dados, cpf, nome) {
  if (!dados) return 'sem_consulta';
  const meio = String(cpf).slice(3, 9);
  const n = semAcento(nome);
  const razao = String(dados.razao_social || '');
  if (razao.replace(/\D/g, '').includes(String(cpf))) return 'confere';
  const nomeBate = (x) => {
    const a = semAcento(x);
    return !!n && !!a && (a.includes(n) || n.includes(a));
  };
  for (const s of dados.qsa || []) {
    const doc = String(s.cnpj_cpf_do_socio || '').replace(/\D/g, '');
    if ((doc && doc.includes(meio)) || nomeBate(s.nome_socio)) return 'confere';
  }
  if (nomeBate(razao.replace(/[\d.\-/]/g, ' '))) return 'confere';
  return 'nao_confere';
}
export async function consultarCnpj(cfg, cnpj) {
  if (cfg.consultaCnpj === false) return null;
  if (typeof cfg.consultaCnpj === 'function') return cfg.consultaCnpj(cnpj);
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return { naoExiste: true };
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}
