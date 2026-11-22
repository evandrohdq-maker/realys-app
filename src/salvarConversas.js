// Salvar uma conversa (ou um canal de grupo) antes de limpar: gera um arquivo de texto e abre o
// "Compartilhar" do celular (salvar nos arquivos, mandar por e-mail, WhatsApp...). No site, baixa.
import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './api';

// caminho: '/messages/ID/exportar' (particular) ou '/grupos/CHAVE/exportar?nome=...' (canal).
export async function salvarConversa(caminho, nomeArquivo = 'conversa') {
  try {
    const r = await api('GET', caminho);
    if (!r.mensagens) return Alert.alert('Nada para salvar', 'Essa conversa ainda está vazia.');
    const nome = `${nomeArquivo.replace(/[^A-Za-z0-9À-ÿ_-]+/g, '-').slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.txt`;
    const texto = r.texto + (r.midias && r.midias.length ? `\n\nFotos e vídeos (${r.midias.length}): abra a conversa no Realyz e salve os que quiser guardar.` : '');
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      return;
    }
    const arq = FileSystem.cacheDirectory + nome;
    await FileSystem.writeAsStringAsync(arq, texto);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(arq, { mimeType: 'text/plain', dialogTitle: 'Salvar ou mandar por e-mail' });
    else await Share.share({ message: texto });
  } catch (e) {
    Alert.alert('Não deu para salvar', e.message);
  }
}
