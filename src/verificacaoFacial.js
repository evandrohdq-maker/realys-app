// Verificação facial do dia a dia do prestador: no aceite, na finalização e a cada 2 h
// (entregador e motorista). A câmera abre na frente, tira uma foto e o servidor confere.
// A foto é comparada e apagada na hora; o app só recebe "confirmado" ou "não confirmado".
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

export const isVerificacaoPendente = (err) => !!err && (err.code === 'verificacao_facial' || err.code === 'verificacao_periodica');

// purpose: 'aceite' | 'finalizacao' | 'periodica'. callId é obrigatório para aceite e finalização.
export async function verificarRosto(purpose, callId) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Libere a câmera para confirmar seu rosto.');
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'], quality: 0.8, allowsEditing: false, cameraType: ImagePicker.CameraType.front,
  });
  if (r.canceled) return null;
  const buf = await (await fetch(r.assets[0].uri)).arrayBuffer();
  const q = `purpose=${encodeURIComponent(purpose)}` + (callId ? `&callId=${encodeURIComponent(callId)}` : '');
  return api('POST', `/biometria/verificar?${q}`, buf, { 'Content-Type': 'image/jpeg' });
}
