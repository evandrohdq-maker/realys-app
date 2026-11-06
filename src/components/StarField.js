import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

// Céu estrelado e translúcido para a caixa da Lotus: estrelas que piscam,
// nebulosas suaves e, de vez em quando, uma estrela cadente.

// Sorteio fixo (sempre as mesmas posições, sem "pular" a cada render).
function seeded(seed) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

// Céu conforme a hora: estrelado à noite (19h às 5h) e com tom de amanhecer durante o dia.
export function skyMode(date = new Date()) {
  const h = date.getHours();
  return h >= 19 || h < 5 ? 'night' : 'dawn';
}

// Cor de fundo da caixa da Lotus para cada céu (sempre translúcida).
export const SKY_BG = {
  night: 'rgba(12,18,42,0.86)',
  dawn: 'rgba(52,34,88,0.84)',
};

const GROUPS = 3; // estrelas piscam em 3 ritmos diferentes (leve para o celular)

export default function StarField({ count = 46, active = true, mode = 'night' }) {
  const dawn = mode === 'dawn';
  const twinkle = useRef([...Array(GROUPS)].map(() => new Animated.Value(0))).current;
  const shoot = useRef(new Animated.Value(0)).current;

  const stars = useMemo(() => {
    const r = seeded(7);
    return [...Array(count)].map((_, i) => ({
      left: `${(r() * 100).toFixed(2)}%`,
      top: `${(r() * 100).toFixed(2)}%`,
      size: r() < 0.12 ? 3 : r() < 0.5 ? 2 : 1.4,
      group: i % GROUPS,
      gold: r() < 0.18,
    }));
  }, [count]);

  useEffect(() => {
    if (!active) return;
    const loops = twinkle.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 1300 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 1300 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    const s = Animated.loop(
      Animated.sequence([
        Animated.delay(4200),
        Animated.timing(shoot, { toValue: 1, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(shoot, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loops.forEach((l) => l.start());
    if (!dawn) s.start();
    return () => {
      loops.forEach((l) => l.stop());
      s.stop();
    };
  }, [active, dawn]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dawn ? (
        <>
          {/* Amanhecer: luz alaranjada subindo do horizonte e nuvens rosadas */}
          <View style={[styles.nebula, { width: 520, height: 320, borderRadius: 260, bottom: -170, left: -80, backgroundColor: 'rgba(251,146,60,0.30)' }]} />
          <View style={[styles.nebula, { width: 380, height: 220, borderRadius: 190, bottom: -90, left: 10, backgroundColor: 'rgba(253,186,116,0.30)' }]} />
          <View style={[styles.nebula, { width: 240, height: 120, borderRadius: 120, bottom: -40, left: 70, backgroundColor: 'rgba(254,240,138,0.25)' }]} />
          <View style={[styles.nebula, { width: 260, height: 260, borderRadius: 130, top: -70, left: -70, backgroundColor: 'rgba(244,114,182,0.20)' }]} />
          <View style={[styles.nebula, { width: 220, height: 220, borderRadius: 110, top: 90, right: -90, backgroundColor: 'rgba(196,181,253,0.18)' }]} />
        </>
      ) : (
        <>
          {/* Nebulosas: manchas de luz bem suaves */}
          <View style={[styles.nebula, { width: 260, height: 260, borderRadius: 130, top: -60, left: -80, backgroundColor: 'rgba(123,108,246,0.16)' }]} />
          <View style={[styles.nebula, { width: 220, height: 220, borderRadius: 110, top: 120, right: -90, backgroundColor: 'rgba(47,116,208,0.16)' }]} />
          <View style={[styles.nebula, { width: 200, height: 200, borderRadius: 100, bottom: 40, left: -60, backgroundColor: 'rgba(226,182,73,0.10)' }]} />
        </>
      )}

      {(dawn ? stars.filter((st, i) => i % 3 === 0 && parseFloat(st.top) < 45) : stars).map((st, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: st.left,
            top: st.top,
            width: st.size,
            height: st.size,
            borderRadius: st.size,
            backgroundColor: st.gold ? '#FDE68A' : '#FFFFFF',
            opacity: twinkle[st.group].interpolate({ inputRange: [0, 1], outputRange: dawn ? [0.15, 0.55] : i % 2 ? [0.25, 0.95] : [0.9, 0.3] }),
          }}
        />
      ))}

      {/* Estrela cadente (só à noite) */}
      {dawn ? null : <Animated.View
        style={[
          styles.shooting,
          {
            opacity: shoot.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
            transform: [
              { translateX: shoot.interpolate({ inputRange: [0, 1], outputRange: [0, -220] }) },
              { translateY: shoot.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }) },
              { rotate: '-28deg' },
            ],
          },
        ]}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  nebula: { position: 'absolute' },
  shooting: { position: 'absolute', top: 40, right: 20, width: 70, height: 1.6, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
});
