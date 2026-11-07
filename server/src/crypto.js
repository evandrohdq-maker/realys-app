// Criptografia dos dados sensíveis (biometria, documentos). AES-256-GCM, só com o que vem do Node.
// Cada valor leva o número da chave usada ("kid"), então dá para trocar a chave sem perder dados:
// os antigos continuam abrindo com a chave antiga, e a manutenção regrava com a nova.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

// Chaves em BIOMETRIA_KEYS="1:<hex 64>,2:<hex 64>". A chave com o maior número é a atual.
export function parseKeys(spec) {
  const keys = {};
  for (const part of String(spec || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [kid, hex] = part.split(':');
    if (!/^\d+$/.test(kid || '') || !/^[0-9a-fA-F]{64}$/.test(hex || '')) throw new Error('BIOMETRIA_KEYS inválido: use "1:<64 caracteres hex>".');
    keys[kid] = Buffer.from(hex, 'hex');
  }
  return keys;
}

export function makeCipher(keys) {
  const kids = Object.keys(keys).map(Number).sort((a, b) => a - b);
  const current = kids.length ? String(kids[kids.length - 1]) : null;

  return {
    hasKey: !!current,
    currentKid: current,
    // Devolve um texto só: "v1.<kid>.<iv>.<tag>.<dados>" (tudo em base64url).
    seal(plain) {
      if (!current) throw new Error('Chave de criptografia não configurada.');
      const iv = randomBytes(12);
      const c = createCipheriv('aes-256-gcm', keys[current], iv);
      const data = Buffer.concat([c.update(plain), c.final()]);
      return ['v1', current, iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
    },
    open(sealed) {
      const [v, kid, iv, tag, data] = String(sealed).split('.');
      if (v !== 'v1' || !keys[kid]) throw new Error('Dado cifrado com chave desconhecida.');
      const d = createDecipheriv('aes-256-gcm', keys[kid], Buffer.from(iv, 'base64url'));
      d.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]);
    },
    // Dado cifrado com chave antiga? (a manutenção regrava com a chave atual)
    needsRewrap(sealed) {
      const kid = String(sealed).split('.')[1];
      return !!current && kid !== current;
    },
  };
}

// Impressão digital curta de um valor (para auditoria, sem guardar o valor).
export const fingerprint = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
