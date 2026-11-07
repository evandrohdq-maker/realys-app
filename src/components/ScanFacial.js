// Scan facial com círculo de centralização. Em duas etapas:
//   1) aproxime o rosto: grava 3 s de vídeo e tira uma foto de perto;
//   2) afaste um pouco: grava 3 s de vídeo e tira uma foto de mais longe.
// Total: 2 vídeos de 3 s e 2 fotos. Quem decide é o servidor; aqui só capturamos e enviamos.
import React, { useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { colors } from '../theme';

const VIDEO_S = 3;      // cada vídeo dura 3 segundos
const FOTO_EM_MS = 1500; // a foto é tirada no meio do vídeo

const ETAPAS = [
  { dica: 'Centralize o rosto no círculo e aproxime devagar', fase: 'perto' },
  { dica: 'Agora afaste um pouco o celular', fase: 'longe' },
];

export default function ScanFacial({ visible, title = 'Scan facial', onFrames, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef(null);
  const [etapa, setEtapa] = useState(-1); // -1: pronto; 0 e 1: gravando
  const [erro, setErro] = useState('');

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const base64 = (uri) => FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

  // Uma etapa: vídeo de 3 s, com a foto no meio.
  const etapaGravacao = async () => {
    let foto = null;
    const gravando = cam.current.recordAsync({ maxDuration: VIDEO_S });
    await esperar(FOTO_EM_MS);
    const p = await cam.current.takePictureAsync({ base64: true, quality: 0.6, skipProcessing: true });
    foto = p.base64;
    const v = await gravando;
    return { video: await base64(v.uri), foto };
  };

  const iniciar = async () => {
    setErro('');
    if (!permission || !permission.granted) {
      const r = await requestPermission();
      if (!r.granted) { setErro('Libere a câmera nas configurações do celular.'); return; }
    }
    try {
      const videos = [];
      const photos = [];
      for (let i = 0; i < ETAPAS.length; i++) {
        setEtapa(i);
        const r = await etapaGravacao();
        videos.push(r.video);
        photos.push(r.foto);
      }
      setEtapa(-1);
      onFrames({ videos, photos });
    } catch (e) {
      setEtapa(-1);
      setErro('Não consegui gravar o scan. Tente de novo.');
    }
  };

  const gravando = etapa >= 0;
  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.camBox}>
          {permission && permission.granted ? (
            <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" mode="video" />
          ) : null}
          <View style={styles.guide} pointerEvents="none" />
        </View>
        <Text style={styles.dica}>{gravando ? ETAPAS[etapa].dica : 'Ficam 2 vídeos de 3 segundos e 2 fotos.'}</Text>
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        {!gravando ? (
          <TouchableOpacity style={styles.btn} onPress={iniciar} activeOpacity={0.85}>
            <Text style={styles.btnText}>Iniciar scan</Text>
          </TouchableOpacity>
        ) : <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }} disabled={gravando}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 56, paddingHorizontal: 18 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12, textAlign: 'center' },
  camBox: { width: '100%', aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' },
  guide: { ...StyleSheet.absoluteFillObject, margin: '12%', borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  dica: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  erro: { color: '#B42318', textAlign: 'center', marginTop: 8, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  btnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
