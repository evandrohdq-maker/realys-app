// Aceite do Termo de Adesão por conta: guarda a versão aceita. Termo novo = pedir o aceite de novo.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TERMO_ADESAO_VERSAO } from './termoAdesao';
import { api, serverOn } from './api';

const key = (userId) => `realys-termo-${userId}`;

export async function acceptedVersion(userId) {
  if (!userId) return null;
  return AsyncStorage.getItem(key(userId)).catch(() => null);
}
export async function needsAccept(userId) {
  if (!userId) return false;
  return (await acceptedVersion(userId)) !== TERMO_ADESAO_VERSAO;
}
export async function saveAccepted(userId) {
  if (!userId) return;
  await AsyncStorage.setItem(key(userId), TERMO_ADESAO_VERSAO).catch(() => {});
  // Com o servidor ligado, o aceite também fica registrado na conta (versão e data).
  if (serverOn()) api('POST', '/termos/adesao/aceite', { versao: TERMO_ADESAO_VERSAO }).catch(() => {});
}
