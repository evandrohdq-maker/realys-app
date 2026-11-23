// Códigos do Google Authenticator (TOTP, RFC 6238): 6 números que mudam a cada 30 segundos.
// Sem dependências: HMAC-SHA1 do Node e Base32 escrito aqui.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALFA[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALFA[(val << (5 - bits)) & 31];
  return out;
}
export function deBase32(s) {
  const clean = String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, val = 0;
  const out = [];
  for (const c of clean) {
    val = (val << 5) | ALFA.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
export const novoSegredo = () => base32(randomBytes(20));

export function codigoEm(segredo, tempoMs = Date.now()) {
  const contador = Math.floor(tempoMs / 1000 / 30);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const h = createHmac('sha1', deBase32(segredo)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}

// Aceita o código atual e os vizinhos (relógio do celular um pouco adiantado ou atrasado).
export function confere(segredo, codigo, tempoMs = Date.now()) {
  const c = String(codigo || '').replace(/\D/g, '');
  if (c.length !== 6 || !segredo) return false;
  for (const d of [-1, 0, 1]) {
    const certo = codigoEm(segredo, tempoMs + d * 30000);
    if (timingSafeEqual(Buffer.from(certo), Buffer.from(c))) return true;
  }
  return false;
}

export const linkAuthenticator = (segredo, conta) =>
  `otpauth://totp/${encodeURIComponent('Realyz:' + conta)}?secret=${segredo}&issuer=Realyz&digits=6&period=30`;
