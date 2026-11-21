// Planos e regras das salas (Arena Gamer e Hub de Negócios).
//   - Grátis: cria salas abertas como sempre. Com senha também pode, mas no máximo um squad: 5 pessoas.
//   - Premium (cliente ou empresa): salas moderadas, com admin e moderadores, classes (cargos) para
//     dividir a sala, sala exposta na busca ou escondida (entra só pelo ID), senha e limite maior.
//   - Empresarial: tudo do Premium e o painel personalizado (cor, boas-vindas, regras e links fixos).
// Toda sala tem um ID (ex.: RZ-7K2Q9M) para ser achada pela busca "Entrar com ID".
// Na demonstração o plano fica no aparelho; os valores ficam aqui num lugar só.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_SENHA_MAX = 5; // grátis com senha: um squad

export const SALA_PLANOS = {
  gratis: { id: 'gratis', label: 'Grátis', price: 0, max: FREE_SENHA_MAX, feats: ['Salas abertas', `Sala com senha até ${FREE_SENHA_MAX} pessoas`, 'ID da sala para os amigos acharem'] },
  premium: {
    id: 'premium', label: 'Premium', price: 19.9, max: 100,
    feats: ['Salas moderadas com admin e moderadores', 'Classes para dividir a sala', 'Sala exposta na busca ou escondida', 'Senha e até 100 pessoas'],
  },
  empresarial: {
    id: 'empresarial', label: 'Empresarial', price: 79.9, max: 500,
    feats: ['Tudo do Premium', 'Painel personalizado (cor, boas-vindas, regras e links)', 'Até 500 pessoas por sala'],
  },
};
export const LIMITES = [5, 10, 25, 50, 100, 250, 500];
export const CLASSES_PADRAO = ['Admin', 'Moderador', 'Membro'];
export const PAINEL_CORES = ['#B8860B', '#2F74D0', '#2FB463', '#8B5CF6', '#E5484D', '#0F9B8E'];

const KEY = 'realyz.salaPlano';
let plano = 'gratis';
const subs = new Set();
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v && SALA_PLANOS[v]) {
      plano = v;
      subs.forEach((fn) => fn());
    }
  })
  .catch(() => {});

export const salaPlano = () => plano;
export function setSalaPlano(p) {
  plano = SALA_PLANOS[p] ? p : 'gratis';
  AsyncStorage.setItem(KEY, plano).catch(() => {});
  subs.forEach((fn) => fn());
}
export function useSalaPlano() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return plano;
}
export const isPago = (p = plano) => p === 'premium' || p === 'empresarial';
export const temPainel = (p = plano) => p === 'empresarial';

// ID curto, sem letras que confundem (0/O, 1/I).
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function novoId() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ABC[Math.floor(Math.random() * ABC.length)];
  return 'RZ-' + s;
}
export const normId = (t) => {
  const v = String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return v ? 'RZ-' + v.replace(/^RZ/, '') : '';
};

// Configuração de uma sala (vai em servidor.cfg / sala.cfg).
export function cfgPadrao(owner, p = plano) {
  return {
    id: novoId(),
    plano: p,
    visivel: true,
    senha: '',
    max: 0, // 0 = sem limite (sala aberta grátis, como sempre foi)
    moderada: false,
    classes: CLASSES_PADRAO.slice(),
    cargos: owner ? { [owner]: 'Admin' } : {},
    banidos: [],
    silenciados: [],
    painel: null, // { cor, boasVindas, regras, links: [{ label, url }] }
  };
}

// Corrige o que o plano não permite (ex.: grátis com senha fica em no máximo 5 pessoas).
export function ajustaCfg(cfg, p = plano) {
  const c = { ...cfg, plano: p };
  if (!isPago(p)) {
    c.visivel = true;
    c.moderada = false;
    c.painel = null;
    c.max = c.senha ? FREE_SENHA_MAX : 0;
  } else {
    const teto = SALA_PLANOS[p].max;
    if (c.max > teto) c.max = teto;
    if (!temPainel(p)) c.painel = null;
  }
  return c;
}

export const cargoDe = (cfg, name, fallback) => (cfg && cfg.cargos && cfg.cargos[name]) || fallback || 'Membro';
export const ehAdmin = (cfg, name) => cargoDe(cfg, name) === 'Admin';
export const ehMod = (cfg, name) => ['Admin', 'Moderador'].includes(cargoDe(cfg, name));

// Pode entrar? pessoas = quantos já estão; senha = o que a pessoa digitou (ou undefined).
export function podeEntrar(cfg, pessoas, me, senha) {
  if (!cfg) return { ok: true };
  if ((cfg.banidos || []).includes(me)) return { ok: false, why: 'Você foi removido desta sala pelos administradores.' };
  if (cfg.max && pessoas >= cfg.max) return { ok: false, why: `A sala está cheia (${cfg.max} pessoas).` };
  if (cfg.senha && senha === undefined) return { ok: false, pedeSenha: true };
  if (cfg.senha && String(senha) !== String(cfg.senha)) return { ok: false, pedeSenha: true, why: 'Senha errada.' };
  return { ok: true };
}
