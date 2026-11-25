// Notificações com o app fechado (Firebase Cloud Messaging).
// Conta ligada ao servidor: o app pede a permissão, pega o código do aparelho (token do Firebase) e
// manda para o servidor (POST /push/token). O servidor avisa por WebSocket quem está com o app aberto
// e por notificação quem está com o app fechado (server/src/push.js).
// Tocar na notificação abre a tela certa (data.go: { tab, seg... }).
// No site (navegador) não faz nada: lá os avisos chegam com o site aberto.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api, serverOn } from './api';
import { useStore } from './store';
import { ligarRecibo, ehRecibo } from './reciboNotificacao';

export const CHANNEL = 'realyz';

// App aberto: a notificação aparece também (o servidor só manda quando o app não está conectado).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    // O aviso silencioso do recibo de entrega nunca aparece na tela.
    handleNotification: async (n) => {
      const silencioso = ehRecibo(n && n.request && n.request.content && n.request.content.data);
      return { shouldShowBanner: !silencioso, shouldShowList: !silencioso, shouldPlaySound: !silencioso, shouldSetBadge: false };
    },
  });
}

let sentToken = null;
export async function registerPush() {
  if (Platform.OS !== 'android' || !serverOn()) return null;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Avisos do Realyz',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#F5C331',
  });
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const { data: token } = await Notifications.getDevicePushTokenAsync();
  if (token && token !== sentToken) {
    // recibo: este aparelho avisa "chegou" quando a notificação da mensagem chega com o app fechado.
    const recibo = await ligarRecibo();
    await api('POST', '/push/token', { token, platform: 'android', recibo });
    sentToken = token;
  }
  return token;
}

// Sai da conta: o aparelho para de receber os avisos dela.
export async function unregisterPush() {
  if (!sentToken) return;
  const t = sentToken;
  sentToken = null;
  await api('POST', '/push/token/sair', { token: t }).catch(() => {});
}

const goOf = (resp) => {
  const d = resp && resp.notification && resp.notification.request && resp.notification.request.content && resp.notification.request.content.data;
  if (!d || !d.go) return null;
  try {
    return typeof d.go === 'string' ? JSON.parse(d.go) : d.go;
  } catch (e) {
    return null;
  }
};

// Usado no Shell (App.js): registra o aparelho quando a conta está ligada ao servidor e leva para a
// tela da notificação tocada (inclusive quando ela abriu o app do zero).
export function usePush() {
  const { state, dispatch } = useStore();
  const serverId = state.user && state.user.serverId;
  useEffect(() => {
    if (Platform.OS !== 'android' || !serverId) return;
    registerPush().catch(() => {});
    const sub = Notifications.addPushTokenListener(() => {
      sentToken = null;
      registerPush().catch(() => {});
    });
    return () => sub.remove();
  }, [serverId]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (resp) => {
      const go = goOf(resp);
      if (!go) return;
      if (go.chat && go.chat.userId) return dispatch({ type: 'OPEN_SERVER_CHAT', userId: go.chat.userId, name: go.chat.name });
      // Vídeo pronto / gravação da live: abre o editor de vídeo (em "Meus vídeos").
      if (go.editor) return require('./edicao').abrirEditor();
      if (go.tab) dispatch({ type: 'NAV_REQUEST', go });
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [dispatch]);
}
