// Senhas, tokens de acesso e validação de CPF/CNPJ.
//
// - Senha: guardada só como hash scrypt com sal (nunca a senha em si).
// - Token de acesso (curto, 1 h): assinado com JWT_SECRET, vai em "Authorization: Bearer ...".
// - Sessão do aparelho (longa, 180 dias): o celular guarda no cofre protegido pela biometria
//   e troca por um novo token de acesso sem pedir senha ("continuar conectado").
import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function checkPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, s, h] = stored.split('$');
  const expected = Buffer.from(h, 'base64');
  const got = scryptSync(password, Buffer.from(s, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, got);
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function signToken(payload, secret, minutes) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + minutes * 60 });
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

export function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const sig = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== sig.length || !timingSafeEqual(given, sig)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!p.exp || p.exp < Date.now() / 1000) return null;
    return p;
  } catch (e) {
    return null;
  }
}

export const newSessionToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// ── Documentos (mesmas regras do app, src/accounts.js) ──
export const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

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

export const cleanUsername = (v) => String(v || '').trim().replace(/^@/, '').toLowerCase();

export function usernameProblem(v) {
  const u = cleanUsername(v);
  if (u.length < 3) return 'O usuário precisa ter pelo menos 3 letras.';
  if (u.length > 20) return 'O usuário pode ter no máximo 20 caracteres.';
  if (!/^[a-z0-9._]+$/.test(u)) return 'Use só letras sem acento, números, ponto ou _ no usuário.';
  if (!/[a-z]/.test(u)) return 'O usuário precisa ter pelo menos uma letra.';
  if (['admin', 'realys', 'lotus', 'suporte'].includes(u)) return 'Esse usuário é reservado.';
  return null;
}

export function passwordProblem(v) {
  if (String(v || '').length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use letras e números na senha.';
  return null;
}

export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
