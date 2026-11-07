// Scan facial: o rosto fica centralizado na câmera frontal por cerca de 2 a 3 segundos.
// O app tira várias fotos seguidas (movimento natural), depois pede para aproximar e afastar.
// Quem decide é o servidor; aqui só capturamos e devolvemos as fotos em base64.
import React, { useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';

const BURST = 6;           // fotos na fase de centralizar (2 a 3 s)
const PASSOS = ['Aproxime o rosto devagar', 'Afaste o rosto devagar']; // depois do scan

export default function ScanFacial({ visible, title = 'Scan facial', onFrames, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef(null);
  const [fase, setFase] = useState('pronto'); // pronto | centralizar | passo | pronto_final
  const [dica, setDica] = useState('Centralize o rosto no círculo');
  const [erro, setErro] = useState('');

  const foto = async () => {
    const p = await cam.current.takePictureAsync({ base64: true, quality: 0.5, skipProcessing: true });
    return p.base64;
  };
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  const iniciar = async () => {
    setErro('');
    if (!permission || !permission.granted) {
      const r = await requestPermission();
      if (!r.granted) { setErro('Libere a câmera nas configurações do celular.'); return; }
    }
    try {
      const frames = [];
      setFase('centralizar'); setDica('Mantenha o rosto parado no círculo');
      for (let i = 0; i < BURST; i++) { frames.push(await foto()); await esperar(350); }
      for (const passo of PASSOS) {
        setFase('passo'); setDica(passo);
        await esperar(900);
        frames.push(await foto());
      }
      setFase('pronto'); setDica('Pronto');
      onFrames(frames);
    } catch (e) {
      setFase('pronto');
      setErro('Não consegui tirar as fotos. Tente de novo.');
    }
  };

  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.camBox}>
          {permission && permission.granted ? (
            <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" />
          ) : null}
          <View style={styles.guide} pointerEvents="none" />
        </View>
        <Text style={styles.dica}>{dica}</Text>
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        {fase === 'pronto' ? (
          <TouchableOpacity style={styles.btn} onPress={iniciar} activeOpacity={0.85}>
            <Text style={styles.btnText}>Iniciar scan</Text>
          </TouchableOpacity>
        ) : <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }} disabled={fase !== 'pronto'}>
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
