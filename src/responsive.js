// Texto responsivo do Realyz. Todas as telas importam Text e TextInput daqui (e não direto do
// react-native), para o app inteiro se ajustar sozinho ao celular de cada pessoa:
//  1. Letra grande nas configurações do Android: o texto cresce só até um limite, para não
//     estourar botões e cartões.
//  2. Texto ao lado de botão ou ícone: encolhe e quebra a linha dentro da caixa, em vez de
//     passar por cima do vizinho ou sair para fora.
//  3. Telas estreitas (menos de 392 de largura, a maioria dos Android): a letra diminui na proporção da tela.
//  4. Títulos e números grandes são contidos, para o app ficar limpo e caber em qualquer celular.
import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, Dimensions, Platform } from 'react-native';
import { useScreenSharePause } from './screenShare';

// Até quanto a letra do sistema pode aumentar o texto do app (1 = tamanho normal).
export const MAX_FONT_SCALE = 1.1;
// Largura para a qual as telas foram desenhadas. Em celular mais estreito (a maioria dos Android tem
// 360 de largura), a letra diminui na mesma proporção, até um limite.
const BASE_WIDTH = 392;
const MIN_SCALE = 0.86;
const MIN_FONT = 10; // nada de letra menor que isso por causa da tela (quem já é menor continua igual)
const SHRINK = { flexShrink: 1 };
const round = (n) => Math.round(n * 10) / 10;

// Fator de redução para telas estreitas (1 = tela normal).
export function narrowScale() {
  const w = Dimensions.get('window').width;
  return w > 0 && w < BASE_WIDTH ? Math.max(MIN_SCALE, w / BASE_WIDTH) : 1;
}

// Visual mais limpo: títulos e números grandes ficam mais contidos. Até 16 nada muda; acima disso
// o tamanho cresce pela metade (18 vira 17, 20 vira 18, 24 vira 20, 30 vira 23, 36 vira 26).
export const calm = (size) => (size > 16 ? 16 + (size - 16) * 0.5 : size);

// Só figurinha ou ícone em forma de texto (sem letra nem número): o tamanho é do desenho, não mexe.
const isSymbolOnly = (children) => typeof children === 'string' && children.length <= 8 && !/[0-9A-Za-zÀ-ÿ]/.test(children);

// Modo acessível (Perfil › Letras maiores): aumenta todo o texto do app, para quem enxerga pouco.
let BOOST = 1;
export const TEXT_BOOST = 1.18;
export const BIG_TEXT_KEY = 'realys.bigtext'; // guardado no celular
export const setTextBoost = (on) => (BOOST = on ? TEXT_BOOST : 1);
export const textBoost = () => BOOST;

function fit(style, children) {
  const k = narrowScale() * BOOST;
  const flat = StyleSheet.flatten(style) || {};
  const base = flat.fontSize || 14;
  const symbol = isSymbolOnly(children);
  let size = symbol ? base : calm(base);
  if (k !== 1) size = base <= MIN_FONT && BOOST === 1 ? size : Math.max(MIN_FONT, size * k);
  size = round(size);
  if (size === base) return style;
  const out = { fontSize: size };
  if (flat.lineHeight) out.lineHeight = Math.round(flat.lineHeight * (size / base));
  return [style, out];
}

export const Text = React.forwardRef(function Text({ style, ...rest }, ref) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} ref={ref} style={[SHRINK, fit(style, rest.children)]} />;
});

// Campo de senha (secureTextEntry) ou marcado como sensitive: enquanto está em foco, a tela compartilhada
// pausa sozinha (src/screenShare.js). Ninguém precisa lembrar de pausar.
export const TextInput = React.forwardRef(function TextInput({ style, sensitive, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = React.useState(false);
  useScreenSharePause(focused && !!(rest.secureTextEntry || sensitive), 'senha');
  return (
    <RNTextInput
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      onFocus={(e) => (setFocused(true), onFocus && onFocus(e))}
      onBlur={(e) => (setFocused(false), onBlur && onBlur(e))}
      ref={ref}
      // No site, sem a borda preta do navegador em volta da caixa ao digitar.
      style={Platform.OS === 'web' ? [fit(style), NO_OUTLINE] : fit(style)}
    />
  );
});
const NO_OUTLINE = { outlineStyle: 'none', outlineWidth: 0 };
