import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import FRAMES, { FAB, LIGHT } from './lotus/frames';

// Flor de lótus da Lotus em 3D (quadros em assets/lotus, gerados por tools/lotus3d).

// Posição: luz, raios e flor juntos, com o mesmo centro, no meio da caixa na horizontal.
const BOX = 166; // quadro de referência dentro da caixa
const ANCHOR = BOX / 2; // centro da flor = centro do quadro (centralizada)
const SIZE = 240; // tamanho da flor (20% menor do que aparecia)
const STAGE = 250; // faixa da caixa onde a flor fica
const HALO = Math.round(SIZE * 1.5); // luz branca atrás da flor
const RAYS = Math.round(SIZE * 1.8); // raios de luz que giram devagar
const NUDGE_X = 0;
const NUDGE_Y = -24; // um pouco mais para cima

// Cores da flor conforme o assunto da conversa.
export const MOODS = {
  // Padrão: a Lotus vermelha com o miolo amarelo.
  padrao: { back: '#C62828', mid: '#E53935', front: '#FF8A80', center: '#FFE1DE', shineBack: 'rgba(255,170,160,0.5)', shineMid: 'rgba(255,215,210,0.7)', glow: 'rgba(248,113,113,0.30)', seed: '#FFF1C1', icon: '#C62828' },
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
          left: ANCHOR - 2 + x,
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
// - Ativa (ouvindo, pensando, falando): fica aberta e "respira"; no lugar dos antigos círculos de
//   voz, a própria flor balança e pulsa com a voz (de quem fala ou da Lotus) e sobe pólen dourado.
// - Em repouso: fecha de novo até ficar entreaberta.
const LAST = 7; // último quadro do desabrochar
const REST = 3; // quadro de repouso (entreaberta)

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
    pos.current = mood === 'padrao' ? 0 : 3;
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
        idle.current = (idle.current + 1) % set.idle.length;
        setFrame({ kind: 'idle', i: idle.current });
        return;
      } else return;
      setFrame({ kind: 'bloom', i: pos.current });
    }, 55);
    return () => clearInterval(id);
  }, [visible]);

  const speaking = phase === 'speaking';
  // A flor "fala": em vez dos círculos de voz, a própria flor balança no ritmo da voz.
  // Ouvindo, acompanha o volume de quem fala (level); falando, cada sílaba da Lotus dá um tremor.
  const breath = useRef(new Animated.Value(0)).current;
  const talk = useRef(new Animated.Value(0)).current; // força da "sílaba" da Lotus (0 a 1)
  const tilt = useRef(new Animated.Value(0)).current; // lado do balanço (-1 a 1)
  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: active ? 900 : 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: active ? 900 : 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    b.start();
    return () => b.stop();
  }, [active]);
  useEffect(() => {
    if (!visible || !active) {
      Animated.parallel([
        Animated.timing(talk, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!speaking) Animated.timing(talk, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    let alive = true;
    let id;
    const beat = () => {
      if (!alive) return;
      const dur = speaking ? 90 + Math.random() * 90 : 260 + Math.random() * 200;
      const anims = [Animated.timing(tilt, { toValue: Math.random() * 2 - 1, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true })];
      if (speaking) {
        // sílaba: sobe rápido e solta; de vez em quando uma pausa curta, como entre palavras
        const amp = Math.random() < 0.15 ? 0.05 : 0.35 + Math.random() * 0.65;
        anims.push(
          Animated.sequence([
            Animated.timing(talk, { toValue: amp, duration: dur * 0.4, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(talk, { toValue: amp * 0.25, duration: dur * 0.6, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        );
      }
      Animated.parallel(anims).start();
      id = setTimeout(beat, dur);
    };
    beat();
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [visible, active, speaking]);
  const voice = Animated.add(level, talk); // 0 (quieta) a ~1 (voz forte)
  const flowerScale = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.025 : 1.012] }),
    voice.interpolate({ inputRange: [0, 2], outputRange: [0, 0.2], extrapolate: 'clamp' }),
  );
  // Balanço: um pouquinho sempre que está ativa e bem mais forte com a voz.
  const sway = Animated.multiply(tilt, voice.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1], extrapolate: 'clamp' }));
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'], extrapolate: 'clamp' });
  const lift = voice.interpolate({ inputRange: [0, 1], outputRange: [0, -5], extrapolate: 'clamp' });
  // Luz branca atrás da flor: um halo que acende mais quando ela está ativa e pulsa com a voz,
  // e raios finos girando bem devagar.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    spin.setValue(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [visible]);
  const raysRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const haloOpacity = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: active ? [0.7, 0.85] : [0.5, 0.6] }),
    voice.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15], extrapolate: 'clamp' }),
  );
  const haloScale = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
    voice.interpolate({ inputRange: [0, 1.5], outputRange: [0, 0.12], extrapolate: 'clamp' }),
  );
  const raysOpacity = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: active ? [0.45, 0.6] : [0.28, 0.36] }),
    voice.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25], extrapolate: 'clamp' }),
  );
  const pollen = useMemo(() => [-22, -10, 0, 9, 20, -15, 14].map((x, i) => ({ x, delay: i * 230 })), []);

  // Todos os quadros ficam empilhados e só o atual aparece: troca sem piscar.
  const all = [...set.bloom.map((src, i) => ['bloom', i, src]), ...set.idle.map((src, i) => ['idle', i, src])];
  return (
    <View style={styles.stage} pointerEvents="box-none">
      <View style={styles.center} pointerEvents="box-none">
        {/* A luz e os raios são maiores que a flor e passam por cima do cabeçalho da caixa.
            Ficam dentro de uma View que não recebe toques, senão roubavam o toque do botão
            fechar (no Android a Image ignora pointerEvents). */}
        <View pointerEvents="none" style={styles.lights}>
          <Animated.Image
            source={LIGHT.rays}
            fadeDuration={0}
            resizeMode="contain"
            pointerEvents="none"
            style={[styles.rays, { opacity: raysOpacity, transform: [{ translateY: lift }, { rotate: raysRotate }, { scale: haloScale }] }]}
          />
          <Animated.Image
            source={LIGHT.halo}
            fadeDuration={0}
            resizeMode="contain"
            pointerEvents="none"
            style={[styles.halo, { opacity: haloOpacity, transform: [{ translateY: lift }, { scale: haloScale }] }]}
          />
        </View>
        <Pressable onPress={onPress} accessibilityLabel="Falar com a Lotus" style={styles.wrap}>
          <Animated.View style={[styles.flower, { transform: [{ translateY: lift }, { rotate }, { scale: flowerScale }] }]}>
            {all.map(([k, i, src]) => (
              <Image
                key={mood + k + i}
                source={src}
                fadeDuration={0}
                resizeMode="contain"
                style={[styles.frame, { opacity: frame.kind === k && frame.i === i ? 1 : 0 }]}
              />
            ))}
          </Animated.View>
        </Pressable>
        {pollen.map((p, i) => (
          <Pollen key={i} x={p.x} delay={p.delay} active={speaking} />
        ))}
      </View>
    </View>
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

// Botão flutuante da Lotus (canto inferior direito): só a flor vermelha de miolo amarelo, sem
// fundo, que funciona como microfone. Entreaberta e respirando devagar em repouso; abre inteira
// quando o mãos livres está ouvindo o "abrir Lotus" ou a caixa de voz está aberta.
export function LotusMic({ hearing, open }) {
  const b = useRef(new Animated.Value(0)).current;
  const g = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(b, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(b, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  useEffect(() => {
    Animated.timing(g, { toValue: hearing || open ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [hearing, open]);
  const scale = Animated.add(b.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }), g.interpolate({ inputRange: [0, 1], outputRange: [0, 0.06] }));
  return (
    <View style={styles.micWrap} pointerEvents="none">
      <Animated.Image source={FAB[0]} fadeDuration={0} resizeMode="contain" style={[styles.micFlower, { opacity: g.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale }] }]} />
      <Animated.Image source={FAB[1]} fadeDuration={0} resizeMode="contain" style={[styles.micFlower, { opacity: g, transform: [{ scale }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  micWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  micFlower: { position: 'absolute', left: 0, top: 0, width: 60, height: 60 },
  // Faixa da largura inteira da caixa; a flor fica no meio exato, na horizontal e na vertical.
  stage: { alignSelf: 'stretch', height: STAGE, alignItems: 'center', justifyContent: 'center' },
  // Luz, raios e flor ficam todos no mesmo quadro, com o mesmo centro exato.
  center: { width: BOX, height: BOX, transform: [{ translateX: NUDGE_X }, { translateY: NUDGE_Y }] },
  lights: { position: 'absolute', left: 0, top: 0, width: BOX, height: BOX },
  halo: { position: 'absolute', width: HALO, height: HALO, left: ANCHOR - HALO / 2, top: ANCHOR - HALO / 2 },
  rays: { position: 'absolute', width: RAYS, height: RAYS, left: ANCHOR - RAYS / 2, top: ANCHOR - RAYS / 2 },
  wrap: { position: 'absolute', left: ANCHOR - SIZE / 2, top: ANCHOR - SIZE / 2, width: SIZE, height: SIZE },
  flower: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  // tamanho explícito em cada quadro: sem isso o Android desenhava a imagem no tamanho original
  frame: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  pollen: { position: 'absolute', top: ANCHOR - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FDE68A' },
});
