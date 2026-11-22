// Compatibilidade entre currículo e vaga (0 a 100) e os motivos, em português, para a empresa ver
// por que o Realyz indicou a pessoa. Função é obrigatória: sem fazer a função, não é indicado.
import { FUNCOES } from './lerCurriculo.js';

export const NIVEL_N = { aprendiz: 0, 'ja-fiz': 1, experiente: 2 };
export const TIPOS_VAGA = ['clt', 'temporario', 'extra', 'freela', 'estagio'];
export const FUNCAO_LABEL = {
  garcom: 'Garçom', barman: 'Barman', cozinha: 'Cozinheiro(a)', 'aux-cozinha': 'Auxiliar de cozinha', copa: 'Copeiro(a)', recepcao: 'Recepcionista', caixa: 'Caixa',
  seguranca: 'Segurança / portaria', montagem: 'Montagem de evento', limpeza: 'Limpeza', promotor: 'Promotor(a)', entregador: 'Entregador(a)', vendedor: 'Vendedor(a)',
  estoque: 'Estoque', motorista: 'Motorista', administrativo: 'Administrativo',
};
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function distKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return null;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const inter = (a, b) => (a || []).filter((x) => (b || []).includes(x));

export function compatibilidade(cv, vaga, cvPonto) {
  const f = (cv.funcoes || []).find((x) => x.funcao === vaga.funcao);
  if (!f) return { pct: 0, porques: [], apto: false };
  const porques = [];
  let pts = 0;
  const precisa = NIVEL_N[vaga.nivel || 'aprendiz'] || 0;
  const tem = NIVEL_N[f.nivel] ?? 0;
  if (tem >= precisa) {
    pts += 45;
    porques.push(f.nivel === 'experiente' ? `experiente em ${FUNCAO_LABEL[vaga.funcao] || vaga.funcao}${f.anos ? ` (${f.anos} anos)` : ''}` : f.nivel === 'ja-fiz' ? `já trabalhou como ${FUNCAO_LABEL[vaga.funcao] || vaga.funcao}` : 'quer aprender a função');
  } else pts += 15;
  const tipos = cv.tipos || [];
  if (!tipos.length || tipos.includes(vaga.tipo)) pts += 10;
  const turnos = inter(cv.turnos, vaga.turnos);
  if (!(vaga.turnos || []).length || turnos.length) {
    pts += 12;
    if (turnos.length) porques.push(`disponível de ${turnos.join(' e ')}`);
  }
  if (!(vaga.dias || []).length || inter(cv.dias, vaga.dias).length) pts += 8;
  const d = distKm(cvPonto, vaga.lat != null ? { lat: vaga.lat, lng: vaga.lng } : null);
  const max = Number(cv.distanciaMax) || 15;
  if (d == null) pts += 8;
  else if (d <= max) {
    pts += d <= 3 ? 15 : d <= 8 ? 11 : 7;
    porques.push(`mora a ${d < 1 ? 'menos de 1' : Math.round(d)} km`);
  }
  if (!cv.salarioMin || !vaga.salario || Number(vaga.salario) >= Number(cv.salarioMin)) pts += 10;
  const itens = vaga.itens || [];
  if (itens.length && inter(cv.itens, itens).length === itens.length) porques.push('tem tudo o que a vaga pede');
  const apto = tem >= precisa && (d == null || d <= max) && inter(cv.itens, itens).length === itens.length;
  return { pct: Math.max(10, Math.min(99, pts)), porques, apto, distKm: d == null ? null : Math.round(d * 10) / 10 };
}

// Quem ainda não tem currículo: a profissão do perfil ("Gastronomia · Confeiteira") bate com a vaga?
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function perfilCombina(user, vaga) {
  const t = norm(`${user.social_class || ''} ${user.about || ''}`);
  return (FUNCOES[vaga.funcao] || []).some((p) => t.includes(p));
}
