import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { moonPhase } from '../weather';

// Céu translúcido da caixa da Lotus, conforme o tempo no local do usuário:
// - dia: sol com brilho suave e nuvenzinhas;
// - noite: estrelas que piscam, a lua na fase do dia e, às vezes, uma estrela cadente;
// - nublado: nuvens passando devagar (de dia ou de noite);
// - chuvoso: céu mais fechado, nuvens escuras e garoa parada (sem gotas caindo, para ficar leve).
// Tudo com poucas animações (só piscar das estrelas e o passeio lento das nuvens).

function seeded(seed) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

// Fundo da caixa: bem translúcido, para o céu "transparecer" e só as caixas de conteúdo se destacarem.
export function skyBg(sky) {
  if (sky.mode === 'day') return 'rgba(46,120,206,0.52)';
  if (sky.mode === 'night') return 'rgba(10,16,40,0.62)';
  if (sky.mode === 'cloudy') return sky.day ? 'rgba(92,120,156,0.56)' : 'rgba(30,38,60,0.64)';
  return sky.day ? 'rgba(62,76,98,0.62)' : 'rgba(22,28,44,0.68)'; // chuvoso
}

const GROUPS = 3;

// Nuvem feita de bolinhas sobrepostas (leve, sem imagem).
function Cloud({ top, left, scale = 1, color, drift }) {
  return (
    <Animated.View style={{ position: 'absolute', top, left, transform: [{ translateX: drift }, { scale }] }}>
      <View style={[styles.puff, { width: 70, height: 34, borderRadius: 17, top: 22, left: 0, backgroundColor: color }]} />
      <View style={[styles.puff, { width: 40, height: 40, borderRadius: 20, top: 6, left: 12, backgroundColor: color }]} />
      <View style={[styles.puff, { width: 34, height: 34, borderRadius: 17, top: 12, left: 34, backgroundColor: color }]} />
    </Animated.View>
  );
}

function Moon({ south = true }) {
  const p = moonPhase();
  const lit = p < 0.5 ? p * 2 : (1 - p) * 2; // 0 = nova, 1 = cheia
  const waxing = p < 0.5;
  const S = 34;
  // Sombra que desliza sobre a lua conforme a fase. No hemisfério sul a crescente acende à esquerda.
  const off = S * (0.12 + lit * 0.98);
  const dir = (waxing ? 1 : -1) * (south ? 1 : -1);
  return (
    <View style={styles.moonWrap}>
      <View style={[styles.moonGlow, { opacity: 0.25 + lit * 0.5 }]} />
      <View style={{ width: S, height: S, borderRadius: S / 2, overflow: 'hidden', backgroundColor: '#FFF6D8' }}>
        <View style={{ position: 'absolute', width: 9, height: 9, borderRadius: 5, top: 8, left: 9, backgroundColor: 'rgba(214,200,160,0.55)' }} />
        <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, top: 20, left: 20, backgroundColor: 'rgba(214,200,160,0.5)' }} />
        {lit < 0.97 ? (
          <View style={{ position: 'absolute', width: S, height: S, borderRadius: S / 2, top: 0, left: dir * off, backgroundColor: 'rgba(14,20,44,0.93)' }} />
        ) : null}
      </View>
    </View>
  );
}

export default function StarField({ count = 40, active = true, sky = { mode: 'night', day: false }, south = true }) {
  const { mode, day } = sky;
  const showStars = mode === 'night' || (mode === 'cloudy' && !day);
  const twinkle = useRef([...Array(GROUPS)].map(() => new Animated.Value(0))).current;
  const shoot = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const sunPulse = useRef(new Animated.Value(0)).current;

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
    const loops = [];
    if (showStars) {
      twinkle.forEach((v, i) =>
        loops.push(
          Animated.loop(
            Animated.sequence([
              Animated.timing(v, { toValue: 1, duration: 1300 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(v, { toValue: 0, duration: 1300 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          ),
        ),
      );
    }
    if (mode === 'night') {
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.delay(5200),
            Animated.timing(shoot, { toValue: 1, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.timing(shoot, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
      );
    }
    if (mode !== 'night') {
      // Nuvens passeando bem devagar, indo e voltando.
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(drift, { toValue: 1, duration: 26000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(drift, { toValue: 0, duration: 26000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      );
    }
    if (mode === 'day') {
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(sunPulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(sunPulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      );
    }
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, mode, showStars]);

  const d1 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const d2 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const cloudColor =
    mode === 'day' ? 'rgba(255,255,255,0.55)' : mode === 'cloudy' ? (day ? 'rgba(236,242,250,0.42)' : 'rgba(150,160,190,0.22)') : day ? 'rgba(150,162,182,0.5)' : 'rgba(90,100,124,0.4)';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {mode === 'day' ? (
        <>
          <View style={[styles.blob, { width: 420, height: 260, borderRadius: 210, bottom: -150, left: -60, backgroundColor: 'rgba(186,230,253,0.28)' }]} />
          <Animated.View style={[styles.sunHalo, { opacity: sunPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }), transform: [{ scale: sunPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }) }] }]} />
          <View style={styles.sunRing} />
          <View style={styles.sun} />
        </>
      ) : null}

      {mode === 'night' ? (
        <>
          <View style={[styles.blob, { width: 260, height: 260, borderRadius: 130, top: -60, left: -80, backgroundColor: 'rgba(123,108,246,0.14)' }]} />
          <View style={[styles.blob, { width: 220, height: 220, borderRadius: 110, top: 140, right: -90, backgroundColor: 'rgba(47,116,208,0.14)' }]} />
        </>
      ) : null}

      {showStars
        ? stars
            .filter((st, i) => mode === 'night' || i % 3 === 0)
            .map((st, i) => (
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
                  opacity: twinkle[st.group].interpolate({ inputRange: [0, 1], outputRange: mode === 'night' ? (i % 2 ? [0.25, 0.95] : [0.9, 0.3]) : [0.1, 0.45] }),
                }}
              />
            ))
        : null}

      {mode === 'night' ? <Moon south={south} /> : null}
      {mode === 'cloudy' && !day ? <View style={{ opacity: 0.45 }}><Moon south={south} /></View> : null}
      {mode === 'cloudy' && day ? <View style={[styles.sun, { opacity: 0.55 }]} /> : null}

      {mode !== 'night' ? (
        <>
          <Cloud top={34} left={-10} scale={1.1} color={cloudColor} drift={d1} />
          <Cloud top={150} left={210} scale={0.9} color={cloudColor} drift={d2} />
          {mode !== 'day' ? (
            <>
              <Cloud top={6} left={150} scale={1.3} color={cloudColor} drift={d2} />
              <Cloud top={260} left={-30} scale={1.2} color={cloudColor} drift={d1} />
              <Cloud top={90} left={90} scale={0.8} color={cloudColor} drift={d1} />
            </>
          ) : null}
        </>
      ) : null}

      {/* Chuvoso: garoa parada, bem sutil (não fica gerando quadros) */}
      {mode === 'rain'
        ? stars.slice(0, 26).map((st, i) => (
            <View key={'r' + i} style={[styles.drop, { left: st.left, top: st.top, opacity: 0.18 + (i % 3) * 0.08 }]} />
          ))
        : null}

      {mode === 'night' ? (
        <Animated.View
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
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
  puff: { position: 'absolute' },
  sun: { position: 'absolute', top: 76, right: 30, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE58A' },
  sunRing: { position: 'absolute', top: 66, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,236,150,0.35)' },
  sunHalo: { position: 'absolute', top: 46, right: 0, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,240,170,0.32)' },
  moonWrap: { position: 'absolute', top: 78, right: 34, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  moonGlow: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,246,216,0.22)' },
  drop: { position: 'absolute', width: 1.2, height: 9, borderRadius: 1, backgroundColor: '#DCE6F5', transform: [{ rotate: '14deg' }] },
  shooting: { position: 'absolute', top: 40, right: 20, width: 70, height: 1.6, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
});
