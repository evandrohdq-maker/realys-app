// Temas futuristas para páginas e para a capa do perfil.
// Não é só uma cor: cada tema junta um degradê, luzes e um desenho (grade, estrelas, feixes, ondas).
// Tudo feito com formas simples do próprio app (sem biblioteca extra e sem imagem), então é leve.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

// from/to: degradê de cima para baixo · glows: luzes [cor, x%, y%, tamanho] · pattern: desenho por cima
// card/text/muted/line/accent: cores do conteúdo quando o tema é usado como fundo de página
export const FUTURE_THEMES = [
  { key: 'neon', label: 'Neon', from: '#070A1F', to: '#2A0A5E', glows: [['#22D3EE', 82, 12, 190], ['#F0329B', 8, 78, 220]], pattern: 'grid', card: 'rgba(255,255,255,0.09)', text: '#F4F7FF', muted: '#B9C2E6', line: 'rgba(255,255,255,0.16)', accent: '#22D3EE' },
  { key: 'aurora', label: 'Aurora', from: '#04121C', to: '#0B3B3A', glows: [['#34F5C5', 20, 18, 240], ['#7C5CFF', 85, 40, 220], ['#38BDF8', 45, 85, 200]], pattern: 'waves', card: 'rgba(255,255,255,0.09)', text: '#EFFFFA', muted: '#A9D6CC', line: 'rgba(255,255,255,0.15)', accent: '#34F5C5' },
  { key: 'cyber', label: 'Cyber', from: '#050505', to: '#141A12', glows: [['#B6FF3B', 88, 85, 200]], pattern: 'circuit', card: 'rgba(182,255,59,0.07)', text: '#F2FFE0', muted: '#AEBF98', line: 'rgba(182,255,59,0.22)', accent: '#B6FF3B' },
  { key: 'holo', label: 'Holograma', from: '#E9F1FF', to: '#F6E9FF', glows: [['#7DD3FC', 12, 15, 220], ['#F0ABFC', 88, 30, 220], ['#A7F3D0', 50, 90, 220]], pattern: 'beams', card: 'rgba(255,255,255,0.72)', text: '#161A2B', muted: '#535B78', line: 'rgba(22,26,43,0.10)', accent: '#6D5BFF' },
  { key: 'galaxia', label: 'Galáxia', from: '#03030C', to: '#1A1140', glows: [['#8B5CF6', 75, 25, 230], ['#2563EB', 15, 70, 200]], pattern: 'stars', card: 'rgba(255,255,255,0.08)', text: '#F3F0FF', muted: '#B8B2DA', line: 'rgba(255,255,255,0.14)', accent: '#A78BFA' },
  { key: 'ouro', label: 'Ouro digital', from: '#0B0A07', to: '#2A2110', glows: [['#F5C331', 85, 15, 220], ['#B8860B', 10, 85, 200]], pattern: 'grid', card: 'rgba(245,195,49,0.08)', text: '#FFF7DF', muted: '#CDBE95', line: 'rgba(245,195,49,0.22)', accent: '#F5C331' },
];
export const futureTheme = (key) => FUTURE_THEMES.find((t) => t.key === key) || null;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const x = hex(a);
  const y = hex(b);
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`;
};
const STEPS = 14;
const range = (n) => Array.from({ length: n }, (_, i) => i);
// Posições fixas das estrelas (sempre iguais, para a tela não "piscar" ao redesenhar).
const STARS = range(34).map((i) => ({ x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100, s: 1 + (i % 3), o: 0.35 + ((i * 7) % 6) / 10 }));

// Luz suave: círculos um dentro do outro, cada vez mais fortes no centro.
function Glow({ color, x, y, size }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 0, height: 0 }}>
      {[1, 0.74, 0.5, 0.28].map((k, i) => (
        <View key={i} style={{ position: 'absolute', width: size * k, height: size * k, left: (-size * k) / 2, top: (-size * k) / 2, borderRadius: (size * k) / 2, backgroundColor: color, opacity: 0.07 + i * 0.035 }} />
      ))}
    </View>
  );
}

function Pattern({ kind, color }) {
  if (kind === 'grid' || kind === 'circuit') {
    const o = kind === 'circuit' ? 0.2 : 0.12;
    return (
      <>
        {range(9).map((i) => (
          <View key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: `${(i + 1) * 10}%`, height: StyleSheet.hairlineWidth * 2, backgroundColor: color, opacity: o }} />
        ))}
        {range(7).map((i) => (
          <View key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * 12.5}%`, width: StyleSheet.hairlineWidth * 2, backgroundColor: color, opacity: o }} />
        ))}
        {kind === 'circuit'
          ? range(8).map((i) => (
              <View key={'n' + i} style={{ position: 'absolute', left: `${((i * 3 + 1) % 7 + 1) * 12.5}%`, top: `${((i * 5 + 2) % 9 + 1) * 10}%`, width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 3, backgroundColor: color, opacity: 0.75 }} />
            ))
          : null}
      </>
    );
  }
  if (kind === 'stars') {
    return (
      <>
        {STARS.map((s, i) => (
          <View key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: s.s, backgroundColor: '#FFFFFF', opacity: s.o }} />
        ))}
      </>
    );
  }
  if (kind === 'beams') {
    return (
      <>
        {range(5).map((i) => (
          <View key={i} style={{ position: 'absolute', top: '-60%', left: `${i * 24 - 6}%`, width: 26 + i * 6, height: '220%', backgroundColor: '#FFFFFF', opacity: 0.22, transform: [{ rotate: '24deg' }] }} />
        ))}
      </>
    );
  }
  if (kind === 'waves') {
    return (
      <>
        {range(4).map((i) => (
          <View key={i} style={{ position: 'absolute', left: '-25%', width: '150%', height: 220, top: `${18 + i * 20}%`, borderRadius: 220, borderTopWidth: 1.5, borderColor: color, opacity: 0.22 - i * 0.03 }} />
        ))}
      </>
    );
  }
  return null;
}

// Fundo do tema: ocupa todo o espaço do pai (que precisa ter overflow: 'hidden').
function ThemeArt({ theme, style }) {
  const t = typeof theme === 'string' ? futureTheme(theme) : theme;
  if (!t) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: t.to }, style]}>
      {range(STEPS).map((i) => (
        <View key={i} style={{ flex: 1, backgroundColor: mix(t.from, t.to, i / (STEPS - 1)) }} />
      ))}
      <View style={StyleSheet.absoluteFill}>
        {t.glows.map((g, i) => (
          <Glow key={i} color={g[0]} x={g[1]} y={g[2]} size={g[3]} />
        ))}
        <Pattern kind={t.pattern} color={t.accent} />
      </View>
    </View>
  );
}
export default memo(ThemeArt);

// Bolinha de amostra do tema (para os seletores).
export function ThemeSwatch({ theme, size = 34, on, onColor = '#14120E', offColor = '#E6DAC0' }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: on ? 2.5 : 1, borderColor: on ? onColor : offColor }}>
      <ThemeArt theme={theme} />
    </View>
  );
}
