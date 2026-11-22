// Ver foto ou vídeo em destaque, por cima de tudo: tocar numa foto ou num vídeo (feed, galerias do
// perfil) abre a mídia grande, com player de verdade no vídeo (play/pausa, barra de tempo, som e tela
// cheia), botões de fechar, anterior e próximo, e a contagem (2 de 9).
// No celular ocupa a tela inteira; no computador abre numa moldura grande no meio da tela, com o
// fundo escurecido e desfocado.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

const srcOf = (v) => (typeof v === 'string' ? { uri: v } : v); // url ou arquivo do app (require)

// items: [{ photo, video, poster, title, sub }] · index: qual abre primeiro
let openListener = null;
export const openMedia = (items, index = 0) => openListener && openListener({ items: (items || []).filter((x) => x && (x.photo || x.video)), index });

export function MediaViewerHost() {
  const [req, setReq] = useState(null);
  useEffect(() => {
    openListener = setReq;
    return () => (openListener = null);
  }, []);
  if (!req || !req.items.length) return null;
  return <MediaViewer items={req.items} start={req.index} onClose={() => setReq(null)} />;
}

export function MediaViewer({ items, start = 0, onClose }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const desk = Platform.OS === 'web' && width >= 1000;
  const [i, setI] = useState(Math.max(0, Math.min(start, items.length - 1)));
  const it = items[i];
  const go = (d) => setI((x) => (x + d + items.length) % items.length);
  // Teclado no computador: setas passam, Esc fecha.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const key = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [items.length]);
  if (!it) return null;
  const many = items.length > 1;
  const frameW = desk ? Math.min(width * 0.72, 1100) : width;
  const frameH = desk ? Math.min(height * 0.8, 760) : height;

  return (
    <Modal visible transparent deskFull animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View style={[st.backdrop, desk && st.backdropDesk]}>
        {desk ? <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar" /> : null}
        <View style={[st.frame, { width: frameW, height: frameH }, desk && st.frameDesk]}>
          {it.video && EV ? (
            <VideoItem key={i} source={srcOf(it.video)} />
          ) : it.video ? (
            <View style={st.center}><Text style={{ color: '#fff' }}>Vídeo indisponível neste aparelho.</Text></View>
          ) : (
            <Image source={srcOf(it.photo)} style={StyleSheet.absoluteFill} resizeMode="contain" />
          )}

          {/* Topo: contagem e fechar */}
          <View style={[st.top, { paddingTop: desk ? 14 : insets.top + 10 }]} pointerEvents="box-none">
            {many ? <Text style={st.count}>{i + 1} de {items.length}</Text> : <View />}
            <TouchableOpacity style={st.btn} onPress={onClose} accessibilityLabel="Fechar" hitSlop={10}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Anterior e próximo */}
          {many ? (
            <>
              <TouchableOpacity style={[st.btn, st.prev]} onPress={() => go(-1)} accessibilityLabel="Anterior" hitSlop={10}>
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, st.next]} onPress={() => go(1)} accessibilityLabel="Próximo" hitSlop={10}>
                <Ionicons name="chevron-forward" size={26} color="#fff" />
              </TouchableOpacity>
            </>
          ) : null}

          {it.title || it.sub ? (
            <View style={[st.caption, { paddingBottom: desk ? 16 : insets.bottom + (it.video ? 70 : 16) }]} pointerEvents="none">
              {it.title ? <Text style={st.title} numberOfLines={2}>{it.title}</Text> : null}
              {it.sub ? <Text style={st.sub} numberOfLines={2}>{it.sub}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// Player de verdade: começa tocando com som, com os controles do aparelho (play/pausa, barra de
// tempo, volume e tela cheia).
function VideoItem({ source }) {
  const player = EV.useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });
  return <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls allowsFullscreen allowsPictureInPicture={false} />;
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  backdropDesk: { backgroundColor: 'rgba(20,18,14,0.78)', ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : null) },
  frame: { backgroundColor: '#000', overflow: 'hidden' },
  frameDesk: { borderRadius: 24, borderWidth: 2, borderColor: 'rgba(245,195,49,0.55)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14 },
  count: { color: '#fff', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  prev: { position: 'absolute', left: 12, top: '50%', marginTop: -22 },
  next: { position: 'absolute', right: 12, top: '50%', marginTop: -22 },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 30, backgroundColor: 'rgba(0,0,0,0.35)' },
  title: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, marginTop: 2 },
});
