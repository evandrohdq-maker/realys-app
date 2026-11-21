// Câmera própria do story (no lugar da câmera do sistema):
// - A foto e o vídeo saem do jeito que aparecem na tela: com a câmera da frente a imagem
//   fica espelhada igual à prévia (antes saía invertida, esquerda ↔ direita).
// - Efeitos já na hora de bater a foto ou gravar: escolhe na faixa de baixo e o efeito
//   vai junto para o story (dá para trocar depois, antes de publicar).
// - Abre sempre na câmera da FRENTE (selfie); o botão de virar troca para a de trás.
// - O efeito na câmera ao vivo é uma camada de cor por cima (o "filter" do React Native
//   em cima da câmera deixava a tela preta ou cortada no meio, metade amarela).
// - Foto: toque no botão. Vídeo: troque para "Vídeo" e toque para gravar e para parar (até 30 s).
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Alert, Animated, Platform } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { colors } from '../theme';
import { STORY_EFFECTS, effectStyle, STORY_VIDEO_MAX_S } from '../storyEffects';
import StoryEffectOverlay from './StoryEffectOverlay';
import StoryFrame, { storyDesk } from './StoryFrame';

// Amostra para as bolinhas de efeito (a câmera não dá miniatura ao vivo).
const SAMPLE = 'https://picsum.photos/seed/realys-fx-amostra/200/200';

export default function StoryCamera({ visible, startMode = 'foto', initialEffect = 'auto', onDone, onClose }) {
  const insets = useSafeAreaInsets();
  const [camPerm, askCam] = useCameraPermissions();
  const [micPerm, askMic] = useMicrophonePermissions();
  const cam = useRef(null);
  const [mode, setMode] = useState(startMode); // 'foto' | 'video'
  const [facing, setFacing] = useState('front');
  const [flash, setFlash] = useState(false);
  const [effect, setEffect] = useState(initialEffect);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const recStart = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const flipping = useRef(false);
  const [camKey, setCamKey] = useState(0);

  // Virar a câmera: espera a câmera atual soltar antes de abrir a outra
  // (trocar direto deixava a tela preta em vários Android).
  const flip = () => {
    if (rec || busy || flipping.current) return;
    flipping.current = true;
    setReady(false);
    setFlash(false);
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
    setCamKey((k) => k + 1);
    setTimeout(() => (flipping.current = false), 600);
  };

  useEffect(() => {
    if (!visible) return;
    setMode(startMode === 'video' ? 'video' : 'foto');
    setEffect(initialEffect || 'auto');
    setRec(false);
    setSecs(0);
    setBusy(false);
    setReady(false);
    setFacing('front'); // sempre começa na câmera da frente
    setFlash(false);
    (async () => {
      if (!camPerm || !camPerm.granted) {
        const r = await askCam();
        if (!r.granted) {
          Alert.alert('Câmera', 'Permita a câmera para fazer o story.');
          return onClose();
        }
      }
    })();
  }, [visible]);

  // Contador da gravação (para sozinho em 30 s).
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs(Math.min(STORY_VIDEO_MAX_S, Math.round((Date.now() - recStart.current) / 1000))), 250);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.85, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    a.start();
    return () => (clearInterval(t), a.stop());
  }, [rec]);

  const shoot = async () => {
    if (!cam.current || busy || !ready || flipping.current) return;
    if (mode === 'foto') {
      setBusy(true);
      try {
        const p = await cam.current.takePictureAsync({ quality: 0.9, shutterSound: false });
        if (p && p.uri) onDone({ kind: 'image', uri: p.uri, effect });
      } catch (e) {
        Alert.alert('Câmera', 'Não deu para bater a foto. Tente de novo.');
      }
      setBusy(false);
      return;
    }
    if (rec) {
      try {
        cam.current.stopRecording();
      } catch (e) {}
      return;
    }
    if (!micPerm || !micPerm.granted) {
      const r = await askMic();
      if (!r.granted) return Alert.alert('Microfone', 'Permita o microfone para gravar o vídeo com som.');
    }
    try {
      recStart.current = Date.now();
      setSecs(0);
      setRec(true);
      const v = await cam.current.recordAsync({ maxDuration: STORY_VIDEO_MAX_S });
      setRec(false);
      const took = Math.max(1, Math.min(STORY_VIDEO_MAX_S, Math.round((Date.now() - recStart.current) / 1000)));
      if (v && v.uri) onDone({ kind: 'video', uri: v.uri, secs: took, effect });
    } catch (e) {
      setRec(false);
      Alert.alert('Câmera', 'Não deu para gravar o vídeo. Tente de novo.');
    }
  };

  const close = () => {
    if (rec) {
      try {
        cam.current && cam.current.stopRecording();
      } catch (e) {}
    }
    onClose();
  };

  const granted = camPerm && camPerm.granted;
  // No computador (webcam): a câmera numa caixa em pé no meio da tela, como um player, não a tela inteira.
  return (
    <Modal visible={visible} animationType="fade" transparent={storyDesk()} onRequestClose={close} statusBarTranslucent>
      <StoryFrame>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {visible && granted ? (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              key={`${mode}-${facing}-${camKey}`}
              ref={cam}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mode={mode === 'video' ? 'video' : 'picture'}
              mirror={facing === 'front'}
              enableTorch={flash && facing === 'back' && mode === 'video'}
              flash={flash && mode === 'foto' ? 'on' : 'off'}
              onCameraReady={() => setReady(true)}
              onMountError={() => {
                // Se a câmera de trás não abrir, volta para a da frente em vez de ficar na tela preta.
                setReady(false);
                if (facing === 'back') setFacing('front');
                else Alert.alert('Câmera', 'Não deu para abrir a câmera. Feche e tente de novo.');
              }}
            />
            <StoryEffectOverlay effect={effect} />
          </View>
        ) : null}

        {/* Topo: fechar, flash e virar a câmera */}
        <View style={[st.top, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={st.round} onPress={close} accessibilityLabel="Fechar a câmera">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {rec ? (
            <View style={st.recChip}>
              <View style={st.recDot} />
              <Text style={st.recText}>{`0:${String(secs).padStart(2, '0')} / 0:${STORY_VIDEO_MAX_S}`}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={[st.round, { marginRight: 8 }]} onPress={() => setFlash((f) => !f)} disabled={facing === 'front'} accessibilityLabel={flash ? 'Desligar o flash' : 'Ligar o flash'}>
              <Ionicons name={flash && facing === 'back' ? 'flash' : 'flash-off'} size={20} color={facing === 'front' ? 'rgba(255,255,255,0.35)' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={st.round} onPress={flip} accessibilityLabel="Virar a câmera">
              <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Baixo: efeitos, botão de bater/gravar e Foto · Vídeo */}
        <View style={[st.bottom, { paddingBottom: insets.bottom + 14 }]}>
          {!rec ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
              {STORY_EFFECTS.map((e) => {
                const on = effect === e.key;
                return (
                  <TouchableOpacity key={e.key} onPress={() => setEffect(e.key)} style={st.fxItem} accessibilityLabel={`Efeito ${e.label}`}>
                    <View style={[st.fxThumb, on && st.fxThumbOn]}>
                      <Image source={{ uri: SAMPLE }} style={[st.fxImg, effectStyle(e.key)]} />
                      <StoryEffectOverlay effect={e.key} onImage />
                    </View>
                    <Text numberOfLines={1} style={[st.fxLabel, on && { color: colors.gold }]}>{e.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
          <View style={st.shutterRow}>
            <Animated.View style={{ transform: [{ scale: rec ? pulse : 1 }] }}>
              <TouchableOpacity
                onPress={shoot}
                activeOpacity={0.8}
                style={[st.shutter, mode === 'video' && st.shutterVideo]}
                accessibilityLabel={mode === 'foto' ? 'Bater a foto' : rec ? 'Parar de gravar' : 'Gravar vídeo'}
              >
                <View style={[st.shutterIn, mode === 'video' && { backgroundColor: '#EF4444' }, rec && st.shutterStop, busy && { opacity: 0.5 }]} />
              </TouchableOpacity>
            </Animated.View>
          </View>
          {!rec ? (
            <View style={st.modes}>
              {[
                ['foto', 'Foto'],
                ['video', `Vídeo ${STORY_VIDEO_MAX_S}s`],
              ].map(([k, label]) => (
                <TouchableOpacity key={k} onPress={() => mode !== k && (setReady(false), setMode(k))} style={st.modeBtn} accessibilityLabel={label}>
                  <Text numberOfLines={1} style={[st.modeText, mode === k && st.modeOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      </StoryFrame>
    </Modal>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  recChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 6 },
  recText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, backgroundColor: 'rgba(0,0,0,0.28)' },
  fxItem: { alignItems: 'center', marginRight: 10, width: 58 },
  fxThumb: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  fxThumbOn: { borderColor: colors.gold, borderWidth: 3 },
  fxImg: { width: '100%', height: '100%' },
  fxLabel: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 3 },
  shutterRow: { alignItems: 'center', marginTop: 12 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterVideo: { borderColor: 'rgba(255,255,255,0.9)' },
  shutterIn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  shutterStop: { width: 30, height: 30, borderRadius: 8 },
  modes: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 6 },
  modeText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  modeOn: { color: colors.gold },
});
