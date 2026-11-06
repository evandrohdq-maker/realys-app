import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Flor de lótus da Lotus, desenhada só com Views (sem bordas, sem círculo de voz).
// - Ao abrir a caixa, a flor desabrocha a partir do botão fechado.
// - Em repouso, respira devagar; ouvindo, as pétalas se abrem mais e ganham brilho azul;
//   falando, o brilho dourado acompanha a voz e sobem partículas de pólen.
// - Embaixo, a água reflete a flor com ondas suaves que se espalham enquanto ela ouve.

const SIZE = 190; // largura da área da flor
const BASE_Y = 128; // altura onde nascem as pétalas
const SQ = Math.SQRT2;

// Cores da flor conforme o assunto da conversa.
export const MOODS = {
  padrao: { back: '#E0709F', mid: '#F29BBE', front: '#FFC9DC', center: '#FFF0F5', shineBack: 'rgba(255,190,215,0.6)', shineMid: 'rgba(255,225,238,0.75)', glow: 'rgba(253,224,150,0.22)', seed: '#FDE7A8', icon: '#A8790A' },
  agro: { back: '#2E9E62', mid: '#4CBF7E', front: '#A7E8BF', center: '#E6F9EE', shineBack: 'rgba(190,240,205,0.55)', shineMid: 'rgba(225,250,232,0.7)', glow: 'rgba(110,231,160,0.24)', seed: '#FDE7A8', icon: '#1E7A48' },
  sos: { back: '#C62828', mid: '#E53935', front: '#FF8A80', center: '#FFE1DE', shineBack: 'rgba(255,170,160,0.5)', shineMid: 'rgba(255,215,210,0.7)', glow: 'rgba(248,113,113,0.30)', seed: '#FFF1C1', icon: '#C62828' },
  shop: { back: '#B8860B', mid: '#D4A017', front: '#F5D272', center: '#FFF5D6', shineBack: 'rgba(255,230,160,0.55)', shineMid: 'rgba(255,245,210,0.75)', glow: 'rgba(253,210,100,0.30)', seed: '#FFFFFF', icon: '#A8790A' },
};

// Uma pétala em forma de "folha" (losango arredondado) que gira a partir da base.
function Petal({ length, width, angle, open, color, shine, bloom, cx = SIZE / 2, baseY = BASE_Y }) {
  const s = length / SQ; // lado do quadrado que, girado 45°, vira a pétala
  const rotate = (open ? Animated.multiply(open, bloom) : bloom).interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${angle}deg`],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - width / 2,
        top: baseY - length,
        width,
        height: length * 2,
        transform: [{ rotate }],
      }}
    >
      <View style={{ width, height: length, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: s,
            height: s,
            backgroundColor: color,
            borderTopLeftRadius: s,
            borderBottomRightRadius: s,
            transform: [{ scaleX: width / length }, { rotate: '-45deg' }],
          }}
        />
        {/* Veio de luz no meio da pétala */}
        <View
          style={{
            position: 'absolute',
            width: s * 0.6,
            height: s * 0.6,
            backgroundColor: shine,
            borderTopLeftRadius: s,
            borderBottomRightRadius: s,
            top: length * 0.28,
            transform: [{ scaleX: (width / length) * 0.45 }, { rotate: '-45deg' }],
          }}
        />
      </View>
    </Animated.View>
  );
}

// Partícula de pólen que sobe do centro enquanto a Lotus fala.
function Pollen({ x, delay, active }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pollen,
        {
          left: SIZE / 2 - 2 + x,
          opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, x * 1.6] }) },
          ],
        },
      ]}
    />
  );
}

export default function LotusFlower({ phase, level, onPress, visible = true, mood = 'padrao' }) {
  const c = MOODS[mood] || MOODS.padrao;
  const bloom = useRef(new Animated.Value(0)).current; // 0 = botão fechado, 1 = flor aberta
  const open = useRef(new Animated.Value(0.82)).current; // abertura conforme o estado
  const breath = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  // Desabrocha toda vez que a caixa da Lotus abre.
  useEffect(() => {
    if (!visible) {
      bloom.setValue(0);
      return;
    }
    bloom.setValue(0.15);
    Animated.spring(bloom, { toValue: 1, friction: 6, tension: 38, useNativeDriver: true }).start();
  }, [visible]);

  // Mudou de assunto (Agro, SOS, Shop): a flor fecha um pouco e reabre já na cor nova.
  const firstMood = useRef(true);
  useEffect(() => {
    if (firstMood.current) {
      firstMood.current = false;
      return;
    }
    bloom.setValue(0.6);
    Animated.spring(bloom, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }).start();
  }, [mood]);

  useEffect(() => {
    const target = phase === 'listening' ? 1 : phase === 'speaking' ? 0.94 : phase === 'thinking' ? 0.7 : phase === 'paused' ? 0.6 : 0.82;
    Animated.spring(open, { toValue: target, friction: 7, tension: 50, useNativeDriver: true }).start();

    const fast = phase === 'listening' || phase === 'speaking';
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: fast ? 600 : 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: fast ? 600 : 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    ripple.setValue(0);
    const r = Animated.loop(Animated.timing(ripple, { toValue: 1, duration: phase === 'listening' ? 1400 : 3200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    b.start();
    r.start();
    return () => {
      b.stop();
      r.stop();
    };
  }, [phase]);

  const listening = phase === 'listening';
  const speaking = phase === 'speaking';
  const glowColor = listening ? 'rgba(96,165,250,0.30)' : c.glow;
  const glowScale = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }),
    level.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
  );
  const flowerScale = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }),
    level.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
  );

  // Pétalas de trás (rosadas), do meio (rosa-claro) e da frente (marfim com brilho).
  const back = [-80, -54, -27, 27, 54, 80];
  const mid = [-62, -36, 36, 62];
  const front = [-40, -18, 18, 40];
  const icon = listening ? 'mic' : speaking ? 'volume-high' : phase === 'paused' ? 'pause' : phase === 'thinking' ? 'sparkles' : 'mic-outline';

  const pollen = useMemo(() => [-22, -10, 0, 9, 20, -15, 14].map((x, i) => ({ x, delay: i * 230 })), []);

  return (
    <Pressable onPress={onPress} accessibilityLabel="Falar com a Lotus" style={styles.wrap}>
      {/* Reflexo na água: ondas que se espalham */}
      {[0, 0.33, 0.66].map((off) => {
        const p = Animated.modulo(Animated.add(ripple, off), 1);
        return (
          <Animated.View
            key={off}
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                borderColor: listening ? 'rgba(147,197,253,0.7)' : 'rgba(250,215,140,0.55)',
                opacity: p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }),
                transform: [{ scaleX: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) }, { scaleY: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }],
              },
            ]}
          />
        );
      })}

      {/* Halo de luz atrás da flor (sem borda: só brilho) */}
      <Animated.View pointerEvents="none" style={[styles.glow, { backgroundColor: glowColor, transform: [{ scale: glowScale }] }]} />
      <Animated.View pointerEvents="none" style={[styles.glowSoft, { transform: [{ scale: glowScale }] }]} />

      <Animated.View style={[styles.flower, { transform: [{ scale: flowerScale }] }]}>
        {/* Folhas d'água embaixo */}
        <View style={[styles.leaf, { left: SIZE / 2 - 92, transform: [{ rotate: '-6deg' }] }]} />
        <View style={[styles.leaf, { left: SIZE / 2 + 10, transform: [{ rotate: '6deg' }] }]} />

        {back.map((a) => (
          <Petal key={'b' + a} angle={a} length={84} width={38} open={open} bloom={bloom} color={c.back} shine={c.shineBack} />
        ))}
        {mid.map((a) => (
          <Petal key={'m' + a} angle={a} length={80} width={36} open={open} bloom={bloom} color={c.mid} shine={c.shineMid} />
        ))}
        {front.map((a) => (
          <Petal key={'f' + a} angle={a} length={76} width={34} open={open} bloom={bloom} color={c.front} shine="rgba(255,255,255,0.8)" />
        ))}
        <Petal angle={0} length={80} width={34} open={open} bloom={bloom} color="#FFF3F7" shine="#FFFFFF" />

        {/* Miolo dourado com o estado da Lotus */}
        <View style={[styles.seed, { backgroundColor: c.seed }, listening && { backgroundColor: '#DBEAFE', shadowColor: '#60A5FA' }]}>
          <Ionicons name={icon} size={14} color={listening ? '#2F74D0' : c.icon} />
        </View>
      </Animated.View>

      {pollen.map((p, i) => (
        <Pollen key={i} x={p.x} delay={p.delay} active={speaking} />
      ))}
    </Pressable>
  );
}

// Pétala que se solta da flor e voa até o carrinho quando uma compra ou chamada é confirmada.
export function FlyingPetal({ trigger, from, to, color = '#F29BBE' }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger]);
  if (!trigger) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: from.x - 9,
        top: from.y - 16,
        width: 18,
        height: 32,
        opacity: t.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          // sobe em arco: primeiro para cima, depois para o lado do carrinho
          { translateX: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, dx * 0.25, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, dy * 0.7, dy] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
          { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 0.45] }) },
        ],
      }}
    >
      <View style={{ width: 18, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 22.6,
            height: 22.6,
            backgroundColor: color,
            borderTopLeftRadius: 22.6,
            borderBottomRightRadius: 22.6,
            transform: [{ scaleX: 18 / 32 }, { rotate: '-45deg' }],
          }}
        />
      </View>
    </Animated.View>
  );
}

// Florzinha de lótus do cabeçalho: botão fechado em repouso, entreabre quando o
// mãos livres está ouvindo e desabrocha quando a Lotus abre.
const MINI_W = 34;
const MINI_BASE = 27;
export function MiniLotus({ hearing, open }) {
  const bloom = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(bloom, { toValue: open ? 1 : hearing ? 0.62 : 0.3, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [open, hearing]);
  const c = MOODS.padrao;
  return (
    <View style={{ width: MINI_W, height: 30 }} pointerEvents="none">
      {hearing || open ? <View style={[styles.miniGlow, open && { backgroundColor: 'rgba(253,224,150,0.45)' }]} /> : null}
      {[-64, -32, 32, 64].map((a) => (
        <Petal key={'mb' + a} angle={a} length={18} width={8} bloom={bloom} color={c.back} shine={c.shineBack} cx={MINI_W / 2} baseY={MINI_BASE} />
      ))}
      {[-18, 18].map((a) => (
        <Petal key={'mf' + a} angle={a} length={17} width={8} bloom={bloom} color={c.mid} shine={c.shineMid} cx={MINI_W / 2} baseY={MINI_BASE} />
      ))}
      <Petal angle={0} length={19} width={9} bloom={bloom} color={c.front} shine="#FFFFFF" cx={MINI_W / 2} baseY={MINI_BASE} />
      <View style={styles.miniSeed} />
    </View>
  );
}

const styles = StyleSheet.create({
  miniGlow: { position: 'absolute', width: 26, height: 26, borderRadius: 13, left: MINI_W / 2 - 13, top: 4, backgroundColor: 'rgba(96,165,250,0.25)' },
  miniSeed: { position: 'absolute', width: 6, height: 6, borderRadius: 3, left: MINI_W / 2 - 3, top: MINI_BASE - 6, backgroundColor: '#E2B649' },
  wrap: { alignSelf: 'center', width: SIZE, height: 176, marginTop: 2 },
  flower: { position: 'absolute', left: 0, top: 0, width: SIZE, height: 176 },
  glow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, left: SIZE / 2 - 55, top: BASE_Y - 100 },
  glowSoft: { position: 'absolute', width: 180, height: 180, borderRadius: 90, left: SIZE / 2 - 90, top: BASE_Y - 122, backgroundColor: 'rgba(255,240,210,0.07)' },
  ripple: { position: 'absolute', width: 170, height: 30, borderRadius: 85, borderWidth: 1.2, left: SIZE / 2 - 85, top: BASE_Y + 8 },
  leaf: {
    position: 'absolute',
    top: BASE_Y - 4,
    width: 82,
    height: 18,
    borderRadius: 41,
    backgroundColor: 'rgba(52,168,120,0.8)',
  },
  seed: {
    position: 'absolute',
    left: SIZE / 2 - 13,
    top: BASE_Y - 26,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FDE7A8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E2B649',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  pollen: { position: 'absolute', top: BASE_Y - 30, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FDE68A' },
});
