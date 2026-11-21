// Vídeo no feed: toca sozinho e em loop, começando sem som. O botãozinho de caixa de som no canto
// liga ou desliga só o SOM (o vídeo continua rodando). Tocar no vídeo pausa ou volta a tocar.
// A escolha do som vale para todos os vídeos do feed.
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
  const [paused, setPaused] = useState(false);
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
        try {
          if (paused) player.play();
          else player.pause();
        } catch (e) {}
        setPaused(!paused);
      }}
      accessibilityLabel={paused ? 'Continuar o vídeo' : 'Pausar o vídeo'}
    >
      <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {paused ? (
        <View style={st.center} pointerEvents="none">
          <View style={st.big}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>
        </View>
      ) : null}
      {/* Botãozinho de caixa de som: só o som liga e desliga. */}
      <Pressable
        style={st.badge}
        hitSlop={10}
        onPress={() => {
          setSound(!soundOn);
          setHint(true);
        }}
        accessibilityLabel={sound ? 'Desligar o som do vídeo' : 'Ligar o som do vídeo'}
      >
        <Ionicons name={sound ? 'volume-high' : 'volume-mute'} size={17} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

export default function FeedVideo({ source, poster, style }) {
  if (!EV || !source) return <Photo uri={poster} style={style} />;
  return <Player source={source} poster={poster} style={style} />;
}

const st = StyleSheet.create({
  badge: { position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,14,0.45)', alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  big: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(20,18,14,0.45)', alignItems: 'center', justifyContent: 'center' },
});
