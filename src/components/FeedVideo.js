// Vídeo no feed, no esquema do Instagram: toca sozinho e em loop; tocar no vídeo liga ou desliga o
// SOM (o vídeo continua rodando). Segurar pausa o vídeo; soltar volta. A escolha do som vale para
// todos os vídeos do feed (como no Instagram).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo } from './ui';

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

let soundOn = false; // começa sem som (como o Instagram); a pessoa liga no toque
const subs = new Set();
const setSound = (v) => {
  soundOn = v;
  subs.forEach((fn) => fn(v));
};
function useSound() {
  const [v, setV] = useState(soundOn);
  useEffect(() => {
    subs.add(setV);
    return () => subs.delete(setV);
  }, []);
  return v;
}

function Player({ source, poster, style }) {
  const sound = useSound();
  const [hint, setHint] = useState(false);
  const player = EV.useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = !soundOn;
    p.play();
  });
  useEffect(() => {
    try {
      player.muted = !sound;
    } catch (e) {}
  }, [sound]);
  useEffect(() => {
    if (!hint) return undefined;
    const t = setTimeout(() => setHint(false), 900);
    return () => clearTimeout(t);
  }, [hint]);
  return (
    <Pressable
      style={style}
      onPress={() => {
        setSound(!soundOn);
        setHint(true);
      }}
      onLongPress={() => {
        try {
          player.pause();
        } catch (e) {}
      }}
      onPressOut={() => {
        try {
          if (!player.playing) player.play();
        } catch (e) {}
      }}
      delayLongPress={250}
      accessibilityLabel={sound ? 'Desligar o som do vídeo' : 'Ligar o som do vídeo'}
    >
      <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {hint ? (
        <View style={st.center} pointerEvents="none">
          <View style={st.big}>
            <Ionicons name={sound ? 'volume-high' : 'volume-mute'} size={26} color="#fff" />
          </View>
        </View>
      ) : null}
      <View style={st.badge} pointerEvents="none">
        <Ionicons name={sound ? 'volume-high' : 'volume-mute'} size={15} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function FeedVideo({ source, poster, style }) {
  if (!EV || !source) return <Photo uri={poster} style={style} />;
  return <Player source={source} poster={poster} style={style} />;
}

const st = StyleSheet.create({
  badge: { position: 'absolute', right: 10, bottom: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(20,18,14,0.45)', alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  big: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(20,18,14,0.45)', alignItems: 'center', justifyContent: 'center' },
});
