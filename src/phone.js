// Ligações feitas de dentro do Realys, usando o próprio chip do celular.
// Com a permissão "Fazer e gerenciar ligações" aceita, o Android liga direto.
// Sem ela, o Realys abre o discador já com o número digitado (basta tocar em ligar).
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const CALL = PermissionsAndroid.PERMISSIONS ? PermissionsAndroid.PERMISSIONS.CALL_PHONE : 'android.permission.CALL_PHONE';

export async function hasCallPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(CALL);
  } catch (e) {
    return false;
  }
}

export async function askCallPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const r = await PermissionsAndroid.request(CALL, {
      title: 'Ligações pelo Realys',
      message: 'Permita que o Realys faça ligações do seu celular para pedir socorro (SAMU, Bombeiros, Polícia) e falar com hospitais e prestadores.',
      buttonPositive: 'Permitir',
      buttonNegative: 'Agora não',
    });
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
}

const digits = (n) => String(n).replace(/[^\d+]/g, '');

// Liga de verdade. Usar só para números reais (emergência oficial ou cadastro confirmado).
export async function callNow(number) {
  const tel = 'tel:' + digits(number);
  if (Platform.OS === 'android' && (await hasCallPermission())) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.CALL', { data: tel });
      return;
    } catch (e) {
      // Se o Android recusar a ligação direta, cai para o discador.
    }
  }
  try {
    await Linking.openURL(tel);
  } catch (e) {
    Alert.alert('Não foi possível ligar', `Disque ${number} pelo telefone do celular.`);
  }
}

// Confirma antes de ligar (evita ligação por toque sem querer).
export function confirmCall(label, number) {
  Alert.alert(`Ligar para ${label}?`, `Número ${number}. A ligação sai do seu celular.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Ligar agora', style: 'destructive', onPress: () => callNow(number) },
  ]);
}

// Hospitais e prestadores da demonstração têm números de exemplo: não liga para ninguém de verdade.
export function demoCall(name, number) {
  Alert.alert(
    `Ligar para ${name}`,
    `Na versão final, o Realys liga direto para ${number}. Este é um cadastro de demonstração, então nenhuma ligação foi feita.`
  );
}

// Abre a rota no mapa do celular.
export function openRoute(place) {
  Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place)).catch(() => {});
}
