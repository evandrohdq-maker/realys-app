// Stories no computador: em vez de tela cheia, uma caixa em pé (formato de celular, 9:16) no meio da
// tela, com o resto claro em volta. No celular e no APK não muda nada (devolve só o conteúdo).
import React from 'react';
import { View, Platform } from 'react-native';
import { realWidth, DESK_MIN } from '../webFrame';

export const storyDesk = () => Platform.OS === 'web' && realWidth() >= DESK_MIN;

export default function StoryFrame({ children, bg = '#000' }) {
  if (!storyDesk()) return children;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const h = Math.min(720, Math.round(winH * 0.9));
  const w = Math.round((h * 9) / 16);
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(241,235,221,0.9)' }}>
      <View style={{ width: w, height: h, borderRadius: 24, overflow: 'hidden', backgroundColor: bg, borderWidth: 1, borderColor: '#EAD7A4', shadowColor: '#8A6208', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } }}>
        {children}
      </View>
    </View>
  );
}
