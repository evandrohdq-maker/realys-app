// Texto responsivo do Re@lys. Todas as telas importam Text e TextInput daqui (e não direto do
// react-native), para o app inteiro se ajustar sozinho ao celular de cada pessoa:
//  1. Letra grande nas configurações do Android: o texto cresce só até um limite, para não
//     estourar botões e cartões.
//  2. Texto ao lado de botão ou ícone: encolhe e quebra a linha dentro da caixa, em vez de
//     passar por cima do vizinho ou sair para fora.
//  3. Telas estreitas (menos de 360 de largura): a letra diminui na mesma proporção da tela.
import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, Dimensions } from 'react-native';

// Até quanto a letra do sistema pode aumentar o texto do app (1 = tamanho normal).
export const MAX_FONT_SCALE = 1.15;
const BASE_WIDTH = 360;
const SHRINK = { flexShrink: 1 };

// Fator de redução para telas estreitas (1 = tela normal).
export function narrowScale() {
  const w = Dimensions.get('window').width;
  return w > 0 && w < BASE_WIDTH ? Math.max(0.82, w / BASE_WIDTH) : 1;
}

function fit(style) {
  const k = narrowScale();
  if (k === 1) return style;
  const flat = StyleSheet.flatten(style) || {};
  const out = { fontSize: Math.round((flat.fontSize || 14) * k * 10) / 10 };
  if (flat.lineHeight) out.lineHeight = Math.round(flat.lineHeight * k);
  return [style, out];
}

export const Text = React.forwardRef(function Text({ style, ...rest }, ref) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} ref={ref} style={[SHRINK, fit(style)]} />;
});

export const TextInput = React.forwardRef(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} ref={ref} style={fit(style)} />;
});
