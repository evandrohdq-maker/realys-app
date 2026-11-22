// Abre um arquivo protegido do servidor (precisa do acesso da conta), como o currículo de um
// candidato: no site abre numa aba; no celular baixa e abre no app de PDF/Word do aparelho.
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { API_URL, authToken } from './api';

export async function abrirArquivoProtegido(path, { mime = 'application/pdf', nome = 'arquivo' } = {}) {
  try {
    const token = await authToken();
    if (Platform.OS === 'web') {
      const r = await fetch(API_URL + path, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível abrir.');
      const url = URL.createObjectURL(await r.blob());
      window.open(url, '_blank');
      return;
    }
    const ext = (nome.split('.').pop() || 'pdf').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'pdf';
    const dest = `${FileSystem.cacheDirectory}curriculo-${Date.now()}.${ext}`;
    const d = await FileSystem.downloadAsync(API_URL + path, dest, { headers: { Authorization: `Bearer ${token}` } });
    if (d.status !== 200) throw new Error('Não foi possível baixar o arquivo.');
    const uri = await FileSystem.getContentUriAsync(d.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri, flags: 1, type: mime });
  } catch (e) {
    Alert.alert('Arquivo', e.message || 'Não foi possível abrir. Confira se tem um app de PDF ou Word no celular.');
  }
}
