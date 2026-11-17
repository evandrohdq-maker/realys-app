// Equipe da empresa: perfis de funcionários para o atendimento direcionado.
// - Classes (funções): o proprietário cria, renomeia, altera e apaga. Já vêm alguns exemplos.
// - Funcionário: nome, classe, se está ativo, se recebe clientes novos, de quais origens atende e o
//   que pode fazer (permissões). Começa com as permissões da classe e pode ser ajustado um a um.
// - Atendimento direcionado: cliente novo vai sozinho para o funcionário certo (quem atende aquela
//   origem e está com menos atendimentos abertos).
// Na demonstração fica salvo no celular. Com o servidor, cada funcionário entra com a própria conta.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERMS = [
  { key: 'atender', label: 'Atender clientes', hint: 'Conversar e mover os atendimentos de etapa' },
  { key: 'valores', label: 'Ver e mudar valores', hint: 'Valor do negócio e propostas' },
  { key: 'fechar', label: 'Fechar venda', hint: 'Marcar o negócio como fechado' },
  { key: 'catalogo', label: 'Enviar catálogo', hint: 'Mandar produtos e preços na conversa' },
  { key: 'relatorio', label: 'Ver relatórios', hint: 'Funil, conversão e motivos de perda' },
  { key: 'todos', label: 'Ver atendimentos de todos', hint: 'Sem isso, vê só os próprios' },
  { key: 'equipe', label: 'Gerenciar a equipe', hint: 'Criar e editar funcionários e classes' },
];
const P = (...keys) => PERMS.reduce((o, p) => ({ ...o, [p.key]: keys.includes(p.key) }), {});
const ALL = P(...PERMS.map((p) => p.key));

// Exemplos de classes. O proprietário pode renomear, alterar e apagar, e criar as dele.
const DEFAULT_ROLES = [
  { id: 'r-atend', name: 'Atendimento', desc: 'Primeiro contato e dúvidas', perms: P('atender', 'catalogo'), receives: true },
  { id: 'r-vendas', name: 'Vendas', desc: 'Proposta, negociação e fechamento', perms: P('atender', 'valores', 'fechar', 'catalogo'), receives: true },
  { id: 'r-caixa', name: 'Caixa', desc: 'Cobrança e pagamento', perms: P('atender', 'valores', 'fechar'), receives: false },
  { id: 'r-entrega', name: 'Entrega', desc: 'Combina e faz a entrega', perms: P('atender'), receives: false },
  { id: 'r-pos', name: 'Pós-venda', desc: 'Acompanha o cliente depois da compra', perms: P('atender', 'catalogo'), receives: false },
  { id: 'r-ger', name: 'Gerência', desc: 'Acompanha tudo e cuida da equipe', perms: ALL, receives: false },
];
const DEFAULT_MEMBERS = [
  { id: 'm1', name: 'Bruna Almeida', roleId: 'r-atend', active: true, receives: true, origins: [], perms: null, bio: true },
  { id: 'm2', name: 'Rafael Souza', roleId: 'r-vendas', active: true, receives: true, origins: ['Anúncio', 'Campanha', 'Indicação'], perms: null, bio: true },
  { id: 'm3', name: 'Dona Célia', roleId: 'r-ger', active: true, receives: false, origins: [], perms: null, bio: true },
];

const KEY = 'realys.team.v1';
let data = { roles: DEFAULT_ROLES, members: DEFAULT_MEMBERS };
let loaded = false;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const set = (patch) => {
  data = { ...data, ...patch };
  AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  emit();
};

export function useTeam() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (raw) {
            data = { ...data, ...JSON.parse(raw) };
            emit();
          }
        })
        .catch(() => {});
    }
    return () => subs.delete(fn);
  }, []);
  return data;
}
export const teamRoles = () => data.roles;
export const teamMembers = () => data.members;
export const roleOf = (id) => data.roles.find((r) => r.id === id) || null;
export const memberOf = (id) => data.members.find((m) => m.id === id) || null;
// O que o funcionário pode fazer: as permissões dele, ou as da classe quando não foram ajustadas.
export const memberPerms = (m) => (m && m.perms) || (m && roleOf(m.roleId) ? roleOf(m.roleId).perms : P());

// ---------- Classes ----------
export function roleAdd(name) {
  const r = { id: 'r' + Date.now(), name, desc: '', perms: P('atender'), receives: true };
  set({ roles: [...data.roles, r] });
  return r;
}
export const roleUpdate = (id, patch) => set({ roles: data.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
// Apagar a classe: os funcionários dela ficam sem classe (continuam na equipe).
export const roleRemove = (id) => set({ roles: data.roles.filter((r) => r.id !== id), members: data.members.map((m) => (m.roleId === id ? { ...m, roleId: null } : m)) });

// ---------- Funcionários ----------
export function memberAdd(name, roleId) {
  const role = roleOf(roleId);
  const m = { id: 'm' + Date.now(), name, roleId: roleId || null, active: true, receives: role ? !!role.receives : true, origins: [], perms: null, bio: false };
  set({ members: [...data.members, m] });
  return m;
}
export const memberUpdate = (id, patch) => set({ members: data.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
export const memberRemove = (id) => set({ members: data.members.filter((m) => m.id !== id) });

// Atendimento direcionado: quem recebe o cliente novo. openBy = { idDoFuncionario: atendimentos abertos }.
export function pickOwner(origin, openBy = {}) {
  // Só entra na distribuição quem está ativo, tem a biometria cadastrada e pode atender.
  const able = data.members.filter((m) => m.active && m.bio && m.receives && memberPerms(m).atender);
  if (!able.length) return null;
  const forOrigin = able.filter((m) => (m.origins || []).includes(origin));
  const pool = forOrigin.length ? forOrigin : able.filter((m) => !(m.origins || []).length);
  const list = pool.length ? pool : able;
  return [...list].sort((a, b) => (openBy[a.id] || 0) - (openBy[b.id] || 0))[0].id;
}
