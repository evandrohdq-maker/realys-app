// Salvar as minhas conversas antes da limpeza mensal: gera um arquivo de texto com todas e abre o
// "Compartilhar" do celular (salvar nos arquivos, mandar por e-mail, WhatsApp...). No site, baixa.
import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './api';

export async function salvarConversas() {
  try {
    const r = await api('GET', '/conversas/exportar');
    if (!r.mensagens) return Alert.alert('Nada para salvar', 'Você ainda não tem conversas no Realyz.');
    const nome = `conversas-realyz-${new Date().toISOString().slice(0, 10)}.txt`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([r.texto], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      return;
    }
    const arq = FileSystem.cacheDirectory + nome;
    await FileSystem.writeAsStringAsync(arq, r.texto);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(arq, { mimeType: 'text/plain', dialogTitle: 'Salvar ou mandar por e-mail' });
    else await Share.share({ message: r.texto });
  } catch (e) {
    Alert.alert('Não deu para salvar', e.message);
  }
}
