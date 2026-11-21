// Notificações push: chegam com o app fechado ou o site fora da tela.
//   - APK (Android): Firebase Cloud Messaging (FCM, API v1). Precisa da chave de serviço do Firebase
//     no servidor: FCM_SERVICE_ACCOUNT=/opt/realys/server/firebase.json  (sem ela, só o site recebe).
//   - Site (realyz.com.br): Web Push padrão (VAPID). As chaves são criadas sozinhas na primeira vez
//     e ficam em DATA_DIR/vapid.json. Nenhum serviço pago e nenhum pacote extra.
// Toda chamada a hub.send(...) dos tipos abaixo também vira push (o app, se estiver aberto na tela,
// não mostra de novo: ele já recebeu pelo WebSocket).
import { createECDH, createPrivateKey, generateKeyPairSync, hkdfSync, randomBytes, createCipheriv, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const corta = (t, n = 140) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');
const brl = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');

// O que cada aviso vira na notificação. null = não manda push.
export function textoDoAviso(type, d = {}) {
  switch (type) {
    case 'message':
      return { title: d.fromName || 'Nova mensagem', body: corta(d.text) || 'Te mandou uma mensagem', tag: `chat-${d.from || ''}`, canal: 'mensagens' };
    case 'call':
      if (d.from && d.from.name) return { title: `📞 ${d.from.name}`, body: d.kind === 'audio' ? 'Está te ligando' : 'Chamada de vídeo', tag: `call-${d.id}`, canal: 'chamadas', urgente: true };
      return { title: 'Seu chamado', body: d.status ? `Atualização: ${d.status}` : 'Tem novidade no seu chamado', tag: `servico-${d.id || ''}`, canal: 'pedidos' };
    case 'order':
      if (d.buyer) return { title: d.status === 'Cancelado' ? 'Pedido cancelado' : '🛍️ Novo pedido', body: `${d.buyer}${d.total ? ' · ' + brl(d.total) : ''}`, tag: `pedido-${d.id}`, canal: 'pedidos', urgente: d.status !== 'Cancelado' };
      return { title: `Pedido ${String(d.status || 'atualizado').toLowerCase()}`, body: d.company || 'Seu pedido mudou de status', tag: `pedido-${d.id}`, canal: 'pedidos' };
    case 'gift':
      return { title: `🎁 ${d.from || 'Alguém'} te deu um presente`, body: `${brl(d.amount)}${d.message ? ' · ' + corta(d.message, 80) : ''}`, canal: 'carteira' };
    case 'payment':
      return { title: '💰 Pagamento recebido', body: `${brl(d.amount)}${d.from ? ' de ' + d.from : ''}`, canal: 'carteira' };
    case 'ticket':
      return { title: '🎟️ Ingresso vendido', body: `${d.buyer || 'Alguém'} comprou ${d.qty || 1} para ${d.title || 'seu evento'}`, canal: 'pedidos' };
    case 'testimonial':
      return { title: 'Novo depoimento', body: `${(d.from && d.from.name) || 'Alguém'} escreveu sobre você`, canal: 'social' };
    case 'deposit':
      return { title: 'Carteira', body: 'Seu depósito foi atualizado', canal: 'carteira' };
    case 'withdrawal':
      return { title: 'Carteira', body: 'Seu saque foi atualizado', canal: 'carteira' };
    case 'friend_request':
      return { title: '👋 Pedido de amizade', body: `${(d.from && d.from.name) || 'Alguém'} quer ser seu amigo`, canal: 'social' };
    case 'friend_accepted':
      return { title: 'Pedido aceito', body: `${(d.by && d.by.name) || 'Alguém'} aceitou sua amizade`, canal: 'social' };
    default:
      return null;
  }
}

// ---------- Web Push (RFC 8291 + VAPID RFC 8292) ----------
function vapidKeys(cfg) {
  if (cfg.vapidPublic && cfg.vapidPrivateJwk) return { pub: cfg.vapidPublic, jwk: cfg.vapidPrivateJwk };
  const file = join(cfg.dataDir || 'data', 'vapid.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pj = publicKey.export({ format: 'jwk' });
  const keys = { pub: b64u(Buffer.concat([Buffer.from([4]), unb64u(pj.x), unb64u(pj.y)])), jwk: privateKey.export({ format: 'jwk' }) };
  try {
    mkdirSync(cfg.dataDir || 'data', { recursive: true });
    writeFileSync(file, JSON.stringify(keys), { mode: 0o600 });
  } catch (e) {}
  return keys;
}

function jwtES256(claims, key) {
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify(claims));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

export function encryptWebPush(sub, payload) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const auth = unb64u(sub.keys.auth);
  const ecdh = createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, auth, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const enc = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, enc]);
}

// ---------- FCM (Android) ----------
function jwtRS256(claims, pem) {
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'RS256' }));
  const body = b64u(JSON.stringify(claims));
  return `${head}.${body}.${b64u(sign('sha256', Buffer.from(`${head}.${body}`), pem))}`;
}

export function makePush({ db, cfg, fetchImpl }) {
  const doFetch = fetchImpl || globalThis.fetch;
  const vapid = vapidKeys(cfg);
  const vapidKey = createPrivateKey({ key: vapid.jwk, format: 'jwk' });
  let sa = null;
  try {
    if (cfg.fcmServiceAccount && existsSync(cfg.fcmServiceAccount)) sa = JSON.parse(readFileSync(cfg.fcmServiceAccount, 'utf8'));
  } catch (e) {
    console.warn('[push] chave do Firebase inválida:', e.message);
  }
  let fcmToken = null;
  let fcmExp = 0;
  const fcmAccess = async () => {
    if (fcmToken && Date.now() < fcmExp) return fcmToken;
    const t = Math.floor(Date.now() / 1000);
    const assertion = jwtRS256({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: t, exp: t + 3600 }, sa.private_key);
    const r = await doFetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`,
    });
    const j = await r.json();
    if (!j.access_token) throw new Error('Firebase recusou a chave de serviço');
    fcmToken = j.access_token;
    fcmExp = Date.now() + 50 * 60 * 1000;
    return fcmToken;
  };

  const drop = (token) => db.prepare('DELETE FROM push_tokens WHERE token = ?').run(token);

  async function toFcm(row, msg) {
    if (!sa) return;
    const access = await fcmAccess();
    const data = { tag: msg.tag || '', type: msg.type || '', ...(msg.data || {}) };
    for (const k of Object.keys(data)) data[k] = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
    const r = await doFetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: row.token,
          notification: { title: msg.title, body: msg.body },
          data,
          android: { priority: 'high', notification: { channel_id: msg.canal || 'geral', sound: 'default', tag: msg.tag || undefined, color: '#B8860B' } },
        },
      }),
    });
    if (r.status === 404 || r.status === 400) {
      const t = await r.text();
      if (/UNREGISTERED|INVALID_ARGUMENT|registration-token-not-registered/.test(t)) drop(row.token);
    }
  }

  async function toWeb(row, msg) {
    const sub = JSON.parse(row.token);
    const aud = new URL(sub.endpoint).origin;
    const jwt = jwtES256({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: cfg.pushContato || 'mailto:contato@realyz.com.br' }, vapidKey);
    const body = encryptWebPush(sub, JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag, type: msg.type, data: msg.data || {} }));
    const r = await doFetch(sub.endpoint, {
      method: 'POST',
      headers: {
        authorization: `vapid t=${jwt}, k=${vapid.pub}`,
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        ttl: '86400',
        urgency: msg.urgente ? 'high' : 'normal',
      },
      body,
    });
    if (r.status === 404 || r.status === 410) drop(row.token);
  }

  return {
    vapidPublic: vapid.pub,
    fcmLigado: !!sa,
    register(userId, kind, token) {
      if (!['fcm', 'web'].includes(kind) || !token || String(token).length > 4000) return false;
      if (kind === 'web') {
        const s = JSON.parse(token);
        if (!s || !/^https:\/\//.test(s.endpoint || '') || !s.keys || !s.keys.p256dh || !s.keys.auth) return false;
      }
      db.prepare('INSERT INTO push_tokens (token, user_id, kind, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, created_at = excluded.created_at').run(String(token), userId, kind, Date.now());
      return true;
    },
    unregister(token) {
      drop(String(token || ''));
    },
    // Manda para todos os aparelhos da pessoa. Não trava quem chamou (roda em segundo plano).
    send(userId, msg) {
      const rows = db.prepare('SELECT token, kind FROM push_tokens WHERE user_id = ?').all(userId);
      for (const row of rows) {
        (row.kind === 'fcm' ? toFcm(row, msg) : toWeb(row, msg)).catch((e) => console.warn('[push]', row.kind, e.message));
      }
      return rows.length;
    },
    notify(userId, type, data) {
      const t = textoDoAviso(type, data);
      if (!t) return 0;
      return this.send(userId, { ...t, type, data: { id: data && data.id ? String(data.id) : '' } });
    },
  };
}
