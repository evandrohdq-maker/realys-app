// Convite para chamada por fora do app (WhatsApp, SMS, e-mail...).
//
// Quem convida gera um link. Quem recebe:
//   - já tem o Realyz: o link abre o app direto na chamada;
//   - não tem: o link abre uma página do Realyz (servidor › GET /c/:codigo) que mostra quem chamou,
//     o botão para baixar o APK e os passos do cadastro (documento + biometria). Depois do cadastro,
//     o mesmo link (ou o botão "Já instalei") leva para dentro da chamada.
// O app guarda o convite enquanto a pessoa entra ou se cadastra e abre a chamada logo depois do login.
//
// Com o servidor ligado (app.json › extra.apiUrl), o código é registrado lá (vale 24 h).
// Sem servidor (modo demonstração), o código vai no próprio link, com a sala dentro dele.
import { Share, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, serverOn, api } from './api';

export const APP_SCHEME = 'realys';
// Endereço público das páginas de convite: o mesmo servidor da API.
export const INVITE_WEB = API_URL || 'https://realyz.com.br';
const PENDING_KEY = 'realys.pendingCall';

const code6 = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, para ditar sem confusão
  let s = '';
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
};
const qs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

// Gera o convite da sala de voz { sid, cid } (servidor e canal da Arena).
export async function makeCallInvite({ sid, cid, server, room, host }) {
  if (serverOn()) {
    try {
      const r = await api('POST', '/convites/chamada', { sid, cid, server, room });
      return { code: r.code, url: r.url, expiresAt: r.expiresAt };
    } catch (e) {
      // Sem conexão: cai no convite local (funciona entre quem já tem o app).
    }
  }
  const code = code6();
  const q = qs({ s: sid, c: cid, r: room, sv: server, h: host });
  return { code, url: `${INVITE_WEB}/c/${code}?${q}`, local: true };
}

export function inviteMessage({ url, code, host, room, server }) {
  return (
    `🎮 ${host || 'Um amigo'} te chamou para a chamada "${room}"${server ? ` (${server})` : ''} no Realyz.\n\n` +
    `Toque para entrar: ${url}\n\n` +
    `Ainda não tem o Realyz? O link mostra como baixar o app e se cadastrar (só gente real, com biometria). ` +
    `Assim que terminar o cadastro, você entra direto na chamada.\n` +
    `Código do convite: ${code}`
  );
}

export async function shareCallInvite(room) {
  const inv = await makeCallInvite(room);
  await Share.share({ message: inviteMessage({ ...inv, ...room }) }).catch(() => {});
  return inv;
}

// Lê um link de convite: realys://chamada/CODIGO?... ou https://…/c/CODIGO?...
export function parseInviteUrl(url) {
  if (!url) return null;
  const m = String(url).match(/^(?:realys:\/\/chamada\/|https?:\/\/[^/]+\/c\/)([A-Za-z0-9]{4,12})(?:\?(.*))?$/);
  if (!m) return null;
  const params = {};
  (m[2] || '').split('&').forEach((kv) => {
    const [k, v] = kv.split('=');
    if (k) params[k] = decodeURIComponent((v || '').replace(/\+/g, ' '));
  });
  return { code: m[1].toUpperCase(), params };
}

// Descobre a sala do convite. Volta { sid, cid, room, server, host } ou lança erro com a explicação.
export async function resolveInvite({ code, params = {} }) {
  if (serverOn()) {
    const r = await api('POST', `/convites/${code}/entrar`, {});
    return { sid: r.sid, cid: r.cid, room: r.room, server: r.server, host: r.host };
  }
  if (!params.s || !params.c) throw new Error('Convite sem sala. Peça um link novo para quem te chamou.');
  return { sid: params.s, cid: params.c, room: params.r, server: params.sv, host: params.h };
}

// Guardar o convite enquanto a pessoa ainda vai entrar ou se cadastrar.
export const savePendingInvite = (url) => AsyncStorage.setItem(PENDING_KEY, url).catch(() => {});
export async function takePendingInvite() {
  const url = await AsyncStorage.getItem(PENDING_KEY).catch(() => null);
  if (url) await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
  return url;
}

// Escuta os links que abrem o app (app fechado ou já aberto).
export function listenInviteLinks(onUrl) {
  Linking.getInitialURL()
    .then((u) => u && parseInviteUrl(u) && onUrl(u))
    .catch(() => {});
  const sub = Linking.addEventListener('url', ({ url }) => parseInviteUrl(url) && onUrl(url));
  return () => sub && sub.remove && sub.remove();
}
