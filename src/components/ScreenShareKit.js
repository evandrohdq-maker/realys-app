// Peças do compartilhamento de tela (src/screenShare.js):
//   - ScreenShareBar: aviso fixo no topo do app enquanto estou mostrando a tela, com o botão Parar.
//     Fica no app inteiro (navegar para outra aba continua transmitindo, como no Discord).
//   - ScreenViewer: janela para ver a tela de quem está mostrando na sala.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useScreenShare, stopScreenShare, watchScreen, RTCView, PAUSE_LABEL } from '../screenShare';
import { CamCorner } from './CamBubble';

const C = { red: '#E5484D', gold: '#B8860B', text: '#1B1B1F', muted: '#7A7468', amber: '#E0A92B' };
const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function ScreenShareBar() {
  const share = useScreenShare();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!share) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [!!share]);
  if (!share) return null;
  const paused = share.paused;
  return (
    <View style={[st.bar, paused && { backgroundColor: C.amber }]} accessibilityLiveRegion="polite">
      <Ionicons name={paused ? 'pause-circle' : 'radio-button-on'} size={16} color="#fff" />
      <Text style={st.barText} numberOfLines={1}>
        {paused ? `Tela pausada · ${PAUSE_LABEL[share.pausedBy] || 'tela privada'}` : `Mostrando sua tela · ${share.label || 'sala'}`}
        {'  '}
        {mmss(Date.now() - share.startedAt)}
      </Text>
      <TouchableOpacity onPress={stopScreenShare} style={st.stop} accessibilityLabel="Parar de mostrar a tela">
        <Text numberOfLines={1} style={{ color: paused ? C.amber : C.red, fontWeight: '800', fontSize: 12 }}>Parar</Text>
      </TouchableOpacity>
    </View>
  );
}

// tela = { id?, by, demo } ; quem está mostrando e se é de verdade ou demonstração.
// tela.camId: a câmera de quem está mostrando a tela, que aparece pequena no canto do jogo.
export function ScreenViewer({ tela, onClose }) {
  const [stream, setStream] = useState(null);
  const [camStream, setCamStream] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!tela || tela.demo || !tela.camId) return;
    let conn = null;
    let alive = true;
    setCamStream(null);
    watchScreen(tela.camId, (s) => alive && setCamStream(s))
      .then((c) => (alive ? (conn = c) : c.stop()))
      .catch(() => {});
    return () => {
      alive = false;
      conn && conn.stop();
    };
  }, [tela && tela.camId]);
  useEffect(() => {
    if (!tela || tela.demo || !tela.id) return;
    let conn = null;
    let alive = true;
    setStream(null);
    setErr(null);
    watchScreen(tela.id, (s) => alive && setStream(s))
      .then((c) => (alive ? (conn = c) : c.stop()))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
      conn && conn.stop();
    };
  }, [tela && tela.id]);
  if (!tela) return null;
  const first = String(tela.by || '').split(' ')[0];
  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={st.viewer}>
        <View style={st.viewerHead}>
          <Ionicons name="tv-outline" size={18} color={C.gold} />
          <Text style={st.viewerTitle} numberOfLines={1}>Tela de {first}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Fechar a tela compartilhada">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={st.viewerBody}>
          {stream && RTCView ? (
            <View style={{ flex: 1, width: '100%' }}>
              <RTCView streamURL={stream.toURL()} style={{ flex: 1, width: '100%' }} objectFit="contain" />
              <CamCorner stream={camStream} />
            </View>
          ) : err ? (
            <Text style={st.viewerMsg}>{err}</Text>
          ) : tela.demo ? (
            <View style={st.mockPhone}>
              <View style={st.mockNotch} />
              <Ionicons name="phone-portrait-outline" size={46} color={C.gold} />
              <Text style={[st.viewerMsg, { marginTop: 10 }]}>{first} está mostrando a tela</Text>
              <Text style={st.viewerSub}>Demonstração: com o servidor de vídeo no ar, a tela aparece aqui ao vivo.</Text>
            </View>
          ) : (
            <ActivityIndicator color={C.gold} size="large" />
          )}
        </View>
        <Text style={st.viewerFoot}>Só quem está nesta sala vê. Carteira, Pix e conversas privadas ficam escondidas.</Text>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.red, paddingHorizontal: 12, paddingVertical: 7 },
  barText: { color: '#fff', fontWeight: '700', fontSize: 12.5, marginLeft: 8, flex: 1 },
  stop: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginLeft: 8 },
  viewer: { flex: 1, backgroundColor: '#0E0E10' },
  viewerHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  viewerTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8, flex: 1 },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerMsg: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  viewerSub: { color: '#A8A29A', fontSize: 12.5, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  viewerFoot: { color: '#A8A29A', fontSize: 11.5, textAlign: 'center', padding: 14 },
  mockPhone: { width: 200, height: 360, borderRadius: 28, borderWidth: 2, borderColor: '#3A3A40', alignItems: 'center', justifyContent: 'center', padding: 14 },
  mockNotch: { position: 'absolute', top: 10, width: 60, height: 6, borderRadius: 3, backgroundColor: '#3A3A40' },
});
