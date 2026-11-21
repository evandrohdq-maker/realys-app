// Notificações push do Realyz (o servidor manda: server/src/push.js).
//   - APK: Firebase (FCM) pelo expo-notifications. Sem o arquivo do Firebase no APK, fica quieto.
//   - Site: Web Push com o service worker public/sw-push.js. O navegador pede permissão no primeiro
//     toque na tela depois de entrar (navegador não deixa pedir sozinho).
// Tocar na notificação chama onPushOpen(fn) com { type, id } para o app abrir a tela certa.
import { Platform } from 'react-native';
import { api, serverOn } from './api';

let N = null;
if (Platform.OS !== 'web') {
  try {
    N = require('expo-notifications');
  } catch (e) {}
}

let openFn = null;
let pendente = null;
export function onPushOpen(fn) {
  openFn = fn;
  if (fn && pendente) {
    fn(pendente);
    pendente = null;
  }
}
const abrir = (d) => (openFn ? openFn(d) : (pendente = d));

const CANAIS = [
  ['chamadas', 'Chamadas', 5],
  ['mensagens', 'Mensagens', 4],
  ['pedidos', 'Pedidos e serviços', 4],
  ['carteira', 'Carteira e presentes', 3],
  ['social', 'Amizades e depoimentos', 3],
  ['geral', 'Avisos do Realyz', 3],
];

let meuToken = null;

async function nativo() {
  if (!N) return;
  // Com o app aberto na tela, o aviso já chega pelo próprio app: não mostra a notificação de novo.
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: false, shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    for (const [id, name, imp] of CANAIS) {
      await N.setNotificationChannelAsync(id, { name, importance: imp, sound: 'default', vibrationPattern: [0, 250, 150, 250], lightColor: '#B8860B' }).catch(() => {});
    }
  }
  let perm = await N.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain !== false) perm = await N.requestPermissionsAsync();
  if (!perm.granted) return;
  const t = await N.getDevicePushTokenAsync(); // FCM (precisa do google-services.json no APK)
  meuToken = t.data;
  await api('POST', '/push/registrar', { kind: 'fcm', token: t.data });
  N.addNotificationResponseReceivedListener((r) => {
    const d = (r && r.notification && r.notification.request && r.notification.request.content && r.notification.request.content.data) || {};
    abrir({ type: d.type || '', id: d.id || '' });
  });
  const ultima = await N.getLastNotificationResponseAsync().catch(() => null);
  if (ultima) {
    const d = ultima.notification.request.content.data || {};
    abrir({ type: d.type || '', id: d.id || '' });
  }
}

const b64ToBytes = (s) => {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function web() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return;
  const reg = await navigator.serviceWorker.register('/sw-push.js');
  navigator.serviceWorker.addEventListener('message', (e) => e.data && e.data.rzPush && abrir(e.data.rzPush));
  const q = new URLSearchParams(window.location.search).get('push');
  if (q) abrir({ type: q, id: '' });
  const assinar = async () => {
    if (Notification.permission !== 'granted') return;
    const { web: chave } = await api('GET', '/push/chave');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(chave) });
    const json = sub.toJSON();
    meuToken = JSON.stringify(json);
    await api('POST', '/push/registrar', { kind: 'web', token: json });
  };
  if (Notification.permission === 'granted') return assinar();
  if (Notification.permission === 'denied') return;
  // O navegador só deixa pedir depois de um toque da pessoa.
  const pedir = () => {
    window.removeEventListener('pointerdown', pedir, true);
    Notification.requestPermission().then(() => assinar()).catch(() => {});
  };
  window.addEventListener('pointerdown', pedir, true);
}

let ligado = false;
// Chamar depois que a pessoa entrou na conta do servidor.
export function ligarPush() {
  if (ligado || !serverOn()) return;
  ligado = true;
  (Platform.OS === 'web' ? web() : nativo()).catch((e) => {
    ligado = false;
    console.log('[push] não ligou:', e && e.message);
  });
}

// Ao sair da conta: este aparelho para de receber as notificações dessa conta.
export async function desligarPush() {
  ligado = false;
  if (meuToken) await api('POST', '/push/remover', { token: meuToken }).catch(() => {});
  meuToken = null;
}
