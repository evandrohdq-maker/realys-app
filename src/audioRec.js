// Gravar áudio na conversa (mensagem de voz, como no WhatsApp).
// - Celular: expo-audio (grava .m4a).
// - Site: o gravador do próprio navegador (MediaRecorder, grava webm/ogg).
// useGravador() devolve { gravando, segundos, iniciar(), parar() → { uri, mime } | null, cancelar() }.
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

let EA = null;
if (Platform.OS !== 'web') {
  try {
    EA = require('expo-audio');
  } catch (e) {
    EA = null;
  }
}
export const podeGravarAudio = () =>
  Platform.OS === 'web' ? typeof window !== 'undefined' && !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) : !!EA;

// Celular: o gravador do expo-audio precisa ser criado por um hook (sempre o mesmo, para a ordem dos hooks não mudar).
const useRecorderNativo = EA && EA.useAudioRecorder ? () => EA.useAudioRecorder(EA.RecordingPresets.HIGH_QUALITY) : () => null;

export function useGravador() {
  const nativo = useRecorderNativo();
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const web = useRef({ rec: null, partes: [], stream: null, fim: null });
  const relogio = useRef(null);

  useEffect(() => () => clearInterval(relogio.current), []);
  const contar = () => {
    setSegundos(0);
    clearInterval(relogio.current);
    relogio.current = setInterval(() => setSegundos((s) => s + 1), 1000);
  };

  const iniciar = async () => {
    if (Platform.OS === 'web') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm', 'audio/ogg'].find((m) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(m)) || '';
      const rec = new window.MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      web.current = { rec, partes: [], stream, mime: mime || 'audio/webm', fim: null };
      rec.ondataavailable = (e) => e.data && e.data.size && web.current.partes.push(e.data);
      rec.onstop = () => web.current.fim && web.current.fim();
      rec.start();
    } else {
      if (!nativo) throw new Error('Gravador indisponível neste celular.');
      const perm = await EA.AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) throw new Error('Permita o microfone para gravar o áudio.');
      if (EA.setAudioModeAsync) await EA.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
      await nativo.prepareToRecordAsync();
      nativo.record();
    }
    setGravando(true);
    contar();
  };

  const parar = async () => {
    clearInterval(relogio.current);
    setGravando(false);
    if (Platform.OS === 'web') {
      const w = web.current;
      if (!w.rec) return null;
      const pronto = new Promise((ok) => (w.fim = ok));
      w.rec.stop();
      await pronto;
      w.stream && w.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(w.partes, { type: w.mime.split(';')[0] });
      web.current = { rec: null, partes: [], stream: null, fim: null };
      return blob.size ? { uri: URL.createObjectURL(blob), mime: w.mime.split(';')[0] } : null;
    }
    if (!nativo) return null;
    await nativo.stop();
    if (EA.setAudioModeAsync) await EA.setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    return nativo.uri ? { uri: nativo.uri, mime: 'audio/mp4' } : null;
  };

  const cancelar = async () => {
    await parar().catch(() => null);
  };

  return { gravando, segundos, iniciar, parar, cancelar };
}
