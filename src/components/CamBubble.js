// Janelinha da sua câmera na sala (Arena Gamer e Hub de Negócios): pequena, por cima do app, em
// qualquer tela, inclusive com a conversa minimizada. Segure e arraste para levar a outro canto.
// Botões: virar a câmera e desligar.
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import Floating from './Floating';
import { useCamShare, stopCam, flipCam } from '../camShare';
import { RTCView } from '../video';

export default function CamBubble({ bottom = 160 }) {
  const cam = useCamShare();
  if (!cam || !cam.stream) return null;
  return (
    <Floating place={{ right: 12, bottom }} style={st.box}>
      {RTCView ? (
        <RTCView streamURL={cam.stream.toURL()} style={st.video} objectFit="cover" mirror={cam.front} zOrder={2} />
      ) : (
        <View style={[st.video, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="videocam" size={26} color="#B8860B" />
        </View>
      )}
      <View style={st.tag}>
        <View style={[st.dot, cam.demo && { backgroundColor: '#E0A92B' }]} />
        <Text style={st.tagText} numberOfLines={1}>{cam.demo ? 'Só você vê' : 'Na sala'}</Text>
      </View>
      <View style={st.btns}>
        <TouchableOpacity onPress={flipCam} style={st.btn} hitSlop={6} accessibilityLabel="Virar a câmera">
          <Ionicons name="camera-reverse-outline" size={15} color="#1B1B1F" />
        </TouchableOpacity>
        <TouchableOpacity onPress={stopCam} style={[st.btn, { backgroundColor: '#E5484D' }]} hitSlop={6} accessibilityLabel="Desligar a câmera">
          <Ionicons name="videocam-off" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </Floating>
  );
}

// A câmera de quem está mostrando a tela, pequena no canto do jogo (dentro do ScreenViewer).
export function CamCorner({ stream, mirror }) {
  if (!stream || !RTCView) return null;
  return (
    <View style={st.corner} pointerEvents="none">
      <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={mirror} zOrder={2} />
    </View>
  );
}

const st = StyleSheet.create({
  box: { width: 118, height: 158, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF8E4', borderWidth: 2, borderColor: '#E2B649', elevation: 8, shadowColor: '#8A6208', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  video: { width: '100%', height: '100%' },
  tag: { position: 'absolute', left: 6, top: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2FB463', marginRight: 4 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#1B1B1F' },
  btns: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  btn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  corner: { position: 'absolute', right: 12, bottom: 12, width: '24%', aspectRatio: 3 / 4, maxWidth: 160, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#E2B649', backgroundColor: '#000' },
});
