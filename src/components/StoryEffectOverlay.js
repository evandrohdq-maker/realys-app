// Camada de cor do efeito do story, por cima da câmera, do vídeo ou da foto.
// Funciona em qualquer Android (não depende do "filter").
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { effectOverlay } from '../storyEffects';

export default function StoryEffectOverlay({ effect, onImage = false, style }) {
  const c = effectOverlay(effect, onImage);
  if (!c) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c }, style]} />;
}
