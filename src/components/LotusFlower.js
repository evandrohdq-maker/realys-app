import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import FRAMES, { MINI } from './lotus/frames';

// Flor de lótus da Lotus em 3D (quadros em assets/lotus, gerados por tools/lotus3d).

const SIZE = 236; // largura da área da flor

// Cores da flor conforme o assunto da conversa.
export const MOODS = {
  padrao: { back: '#E0709F', mid: '#F29BBE', front: '#FFC9DC', center: '#FFF0F5', shineBack: 'rgba(255,190,215,0.6)', shineMid: 'rgba(255,225,238,0.75)', glow: 'rgba(253,224,150,0.22)', seed: '#FDE7A8', icon: '#A8790A' },
  agro: { back: '#2E9E62', mid: '#4CBF7E', front: '#A7E8BF', center: '#E6F9EE', shineBack: 'rgba(190,240,205,0.55)', shineMid: 'rgba(225,250,232,0.7)', glow: 'rgba(110,231,160,0.24)', seed: '#FDE7A8', icon: '#1E7A48' },
  sos: { back: '#C62828', mid: '#E53935', front: '#FF8A80', center: '#FFE1DE', shineBack: 'rgba(255,170,160,0.5)', shineMid: 'rgba(255,215,210,0.7)', glow: 'rgba(248,113,113,0.30)', seed: '#FFF1C1', icon: '#C62828' },
  shop: { back: '#B8860B', mid: '#D4A017', front: '#F5D272', center: '#FFF5D6', shineBack: 'rgba(255,230,160,0.55)', shineMid: 'rgba(255,245,210,0.75)', glow: 'rgba(253,210,100,0.30)', seed: '#FFFFFF', icon: '#A8790A' },
};

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

// Flor de lótus 3D realista (quadros renderizados em 3D, com luz, sombra e translucidez).
// - Ao abrir a caixa, desabrocha a partir do botão fechado.
// - Ativa (ouvindo, pensando, falando): fica aberta e "respira" devagar; falando, respira mais
//   rápido, o brilho acompanha a voz e sobe pólen dourado.
// - Em repouso: fecha de novo até ficar entreaberta.
const LAST = 11; // último quadro do desabrochar
const REST = 4; // quadro de repouso (entreaberta)

export default function LotusFlower({ phase, level, onPress, visible = true, mood = 'padrao' }) {
  const set = FRAMES[mood] || FRAMES.padrao;
  const active = phase === 'listening' || phase === 'speaking' || phase === 'thinking';
  const [frame, setFrame] = useState({ kind: 'bloom', i: 0 });
  const pos = useRef(0); // posição no desabrochar
  const idle = useRef(0);
  const target = useRef(REST);
  target.current = active ? LAST : REST;
  // Aberta, ela "respira": mais rápido falando, mais calma ouvindo.
  const every = useRef(4);
  every.current = phase === 'speaking' ? 2 : 4;
  const tick = useRef(0);

  // Abriu a caixa (ou mudou o assunto/cor): começa do botão fechado.
  useEffect(() => {
    if (!visible) return;
    pos.current = mood === 'padrao' ? 0 : 5;
    setFrame({ kind: 'bloom', i: pos.current });
  }, [visible, mood]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      const t = target.current;
      if (pos.current < t) pos.current += 1;
      else if (pos.current > t) pos.current -= 1;
      else if (t === LAST) {
        tick.current += 1;
        if (tick.current % every.current) return;
        idle.current = (idle.current + 1) % 8;
        setFrame({ kind: 'idle', i: idle.current });
        return;
      } else return;
      setFrame({ kind: 'bloom', i: pos.current });
    }, 55);
    return () => clearInterval(id);
  }, [visible]);

  const listening = phase === 'listening';
  const speaking = phase === 'speaking';
  const glowColor = listening ? 'rgba(96,165,250,0.32)' : (MOODS[mood] || MOODS.padrao).glow;
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: active ? 700 : 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: active ? 700 : 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    b.start();
    return () => b.stop();
  }, [active]);
  const glowScale = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.06] }),
    level.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
  );
  const flowerScale = level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const pollen = useMemo(() => [-22, -10, 0, 9, 20, -15, 14].map((x, i) => ({ x, delay: i * 230 })), []);

  // Todos os quadros ficam empilhados e só o atual aparece: troca sem piscar.
  const all = [...set.bloom.map((src, i) => ['bloom', i, src]), ...set.idle.map((src, i) => ['idle', i, src])];
  return (
    <Pressable onPress={onPress} accessibilityLabel="Falar com a Lotus" style={styles.wrap}>
      <Animated.View pointerEvents="none" style={[styles.glow, { backgroundColor: glowColor, transform: [{ scale: glowScale }] }]} />
      <Animated.View pointerEvents="none" style={[styles.glowSoft, { transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.flower, { transform: [{ scale: flowerScale }] }]}>
        {all.map(([k, i, src]) => (
          <Image
            key={mood + k + i}
            source={src}
            fadeDuration={0}
            resizeMode="contain"
            style={[StyleSheet.absoluteFill, { opacity: frame.kind === k && frame.i === i ? 1 : 0 }]}
          />
        ))}
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

// Florzinha de lótus 3D do cabeçalho: botão fechado em repouso, cresce com brilho azul
// quando o mãos livres está ouvindo e desabrocha quando a Lotus abre.
export function MiniLotus({ hearing, open }) {
  const o = useRef(new Animated.Value(open ? 1 : 0)).current;
  const g = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(o, { toValue: open ? 1 : 0, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, [open]);
  useEffect(() => {
    Animated.timing(g, { toValue: hearing || open ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [hearing, open]);
  const budScale = Animated.add(o.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }), g.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] }));
  return (
    <View style={{ width: 34, height: 32, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <Animated.View style={[styles.miniGlow, { opacity: g }, open && { backgroundColor: 'rgba(253,224,150,0.45)' }]} />
      <Animated.Image source={MINI[0]} fadeDuration={0} resizeMode="contain" style={[styles.mini, { opacity: o.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: budScale }] }]} />
      <Animated.Image source={MINI[1]} fadeDuration={0} resizeMode="contain" style={[styles.mini, { opacity: o, transform: [{ scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.12] }) }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  miniGlow: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(96,165,250,0.28)' },
  mini: { position: 'absolute', width: 32, height: 30 },
  wrap: { alignSelf: 'center', width: SIZE, height: SIZE * 354 / 432, marginTop: 2 },
  flower: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE * 354 / 432 },
  glow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, left: SIZE / 2 - 65, top: 22 },
  glowSoft: { position: 'absolute', width: 200, height: 200, borderRadius: 100, left: SIZE / 2 - 100, top: -12, backgroundColor: 'rgba(255,240,210,0.07)' },
  pollen: { position: 'absolute', top: 70, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FDE68A' },
});
