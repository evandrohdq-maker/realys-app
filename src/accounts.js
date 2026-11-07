// Contas do Realys guardadas NO CELULAR (versão de demonstração, sem servidor).
//
// - Cadastro: as contas criadas em "Cadastre-se" ficam no aparelho, com a senha
//   guardada só como "impressão digital" (hash SHA-256 com sal), nunca a senha em si.
// - Contas salvas: quem marca "Salvar usuário neste aparelho" aparece na tela de
//   entrada e entra só com a biometria, sem digitar usuário e senha.
//   Vários usuários podem ficar salvos no mesmo celular (aparelho da empresa
//   usado por mais de um funcionário). A lista fica no cofre do Android (SecureStore).
//
// Na versão real, as contas e as senhas ficam no servidor; o celular guarda só um
// token de acesso protegido pela biometria.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

const ACCOUNTS_KEY = 'realys.accounts';
const SAVED_KEY = 'realys.savedUsers';

// ---------- Formatação e validação ----------

export const onlyDigits = (v) => (v || '').replace(/\D/g, '');

export const formatCpf = (d) =>
  d
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');

export const formatCnpj = (d) =>
  d
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

export const formatPhone = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

// Confere os dígitos verificadores, para não aceitar CPF ou CNPJ inventado.
export function validCpf(v) {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function validCnpj(v) {
  const d = onlyDigits(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (len) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = w.reduce((acc, wi, i) => acc + Number(d[i]) * wi, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim());

export const cleanUsername = (v) => (v || '').trim().replace(/^@/, '').toLowerCase();

export function usernameProblem(v) {
  const u = cleanUsername(v);
  if (u.length < 3) return 'O usuário precisa ter pelo menos 3 letras.';
  if (u.length > 20) return 'O usuário pode ter no máximo 20 caracteres.';
  if (!/^[a-z0-9._]+$/.test(u)) return 'Use só letras sem acento, números, ponto ou _ no usuário.';
  if (!/[a-z]/.test(u)) return 'O usuário precisa ter pelo menos uma letra.';
  if (u === 'admin') return 'Esse usuário é reservado.';
  return null;
}

export function passwordProblem(v) {
  if ((v || '').length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use letras e números na senha.';
  return null;
}

// Mostra o acesso sem expor o documento inteiro: ***.456.789-** / **.345.678/****-90
export function maskLogin(login) {
  const d = onlyDigits(login);
  if (/^[\d.\-\/]+$/.test(login) && d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (/^[\d.\-\/]+$/.test(login) && d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-${d.slice(12)}`;
  return '@' + cleanUsername(login);
}

// ---------- Senha ----------

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password, salt) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

// ---------- Contas cadastradas ----------

async function loadAccounts() {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

const saveAccounts = (list) => AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));

// O usuário (objeto que entra no app) a partir da conta cadastrada.
export function userFromAccount(acc) {
  if (acc.kind === 'empresa') {
    return { id: acc.id, name: acc.name, username: acc.username, roles: ['empresa', 'fornecedor', 'cliente'], cnpj: formatCnpj(acc.doc) };
  }
  return { id: acc.id, name: acc.name, username: acc.username, roles: ['cliente', 'prestador'], cpf: formatCpf(acc.doc), cnpj: '12.345.678/0001-90', social: acc.social || null, about: acc.about || '', work: acc.work || '', birth: acc.birth || null };
}

// Acha a conta pelo que a pessoa digitou: usuário, CPF ou CNPJ.
export async function findAccount(login) {
  const list = await loadAccounts();
  const d = onlyDigits(login);
  const numeric = /^[\d.\-\/\s]+$/.test(login.trim());
  if (numeric && (d.length === 11 || d.length === 14)) return list.find((a) => a.doc === d) || null;
  const u = cleanUsername(login);
  return list.find((a) => a.username === u) || null;
}

export async function checkPassword(acc, password) {
  return (await hashPassword(password, acc.salt)) === acc.hash;
}

// Cria a conta. Devolve { account } ou { error }.
// O Realys é só para maiores de 18 anos. Idade a partir de "DD/MM/AAAA" (null se a data for inválida).
export function ageFromBirth(birth) {
  const m = String(birth || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() < mo - 1 || (now.getMonth() === mo - 1 && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export async function createAccount({ kind, name, doc, username, email, phone, password, social = null, about = '', work = '', birth = null }) {
  if (kind !== 'empresa' && !(ageFromBirth(birth) >= 18)) return { error: 'O Realys é só para maiores de 18 anos.' };
  const list = await loadAccounts();
  const d = onlyDigits(doc);
  const u = cleanUsername(username);
  const mail = email.trim().toLowerCase();
  if (list.some((a) => a.doc === d)) return { error: `Já existe uma conta com este ${kind === 'empresa' ? 'CNPJ' : 'CPF'}. Use "Entrar".` };
  if (list.some((a) => a.username === u)) return { error: 'Esse usuário já está em uso. Escolha outro.' };
  if (list.some((a) => a.email === mail)) return { error: 'Já existe uma conta com este e-mail.' };
  const salt = toHex(Crypto.getRandomBytes(16));
  const account = {
    id: 'u' + toHex(Crypto.getRandomBytes(6)),
    kind,
    name: name.trim(),
    doc: d,
    username: u,
    email: mail,
    phone: onlyDigits(phone),
    salt,
    hash: await hashPassword(password, salt),
    social, // perfil social: { cls, sub, extra } (ex.: Gamer · Streamer)
    about: about.trim(),
    work: work.trim(),
    birth: kind === 'empresa' ? null : birth, // DD/MM/AAAA (na versão final, conferida no documento)
    createdAt: new Date().toISOString(),
  };
  await saveAccounts([...list, account]);
  return { account };
}

// ---------- Contas salvas no aparelho (entrar só com a biometria) ----------

async function secureGet(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return AsyncStorage.getItem(key).catch(() => null);
  }
}

async function secureSet(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    await AsyncStorage.setItem(key, value).catch(() => {});
  }
}

export async function getSavedUsers() {
  try {
    const raw = await secureGet(SAVED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));
  } catch (e) {
    return [];
  }
}

// Guarda (ou atualiza) o usuário. Não guarda a senha: na volta, a biometria confirma quem é.
// Chave da conta salva no aparelho (CPF/CNPJ, ou usuário).
export function savedKey(login) {
  const d = onlyDigits(login);
  return /^[\d.\-\/\s]+$/.test(login.trim()) && d.length ? d : cleanUsername(login);
}

export async function saveUser(login, user) {
  const list = await getSavedUsers();
  const key = savedKey(login);
  const entry = { key, login: login.trim(), user, lastAt: new Date().toISOString() };
  const next = [entry, ...list.filter((s) => s.key !== key)].slice(0, 8);
  await secureSet(SAVED_KEY, JSON.stringify(next));
  return next;
}

export async function touchSavedUser(key) {
  const list = await getSavedUsers();
  const next = list.map((s) => (s.key === key ? { ...s, lastAt: new Date().toISOString() } : s));
  await secureSet(SAVED_KEY, JSON.stringify(next));
}

export async function forgetUser(key) {
  const list = await getSavedUsers();
  const next = list.filter((s) => s.key !== key);
  await secureSet(SAVED_KEY, JSON.stringify(next));
  return next;
}

// ---------- Biometria ----------

// 'ok' = confirmou · 'sem' = aparelho sem digital/rosto cadastrado · 'falhou' = cancelou ou não reconheceu
export async function confirmBiometric(message = 'Confirme que é você para entrar no Realys') {
  try {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHw || !enrolled) return 'sem';
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: message, cancelLabel: 'Cancelar' });
    return res.success ? 'ok' : 'falhou';
  } catch (e) {
    return 'sem';
  }
}
