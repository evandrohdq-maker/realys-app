import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import FRAMES, { FAB, LIGHT } from './lotus/frames';

// Flor de lótus da Lotus em 3D (quadros em assets/lotus, gerados por tools/lotus3d).

const SIZE = 166; // a flor é vista de frente (de cima), formando um círculo no centro da caixa
const STAGE = 250; // faixa da caixa onde a flor fica, sempre centralizada
const HALO = Math.round(SIZE * 1.75); // luz branca atrás da flor
const RAYS = Math.round(SIZE * 2.1); // raios de luz que giram devagar
// Ajuste fino da posição na caixa (no celular ela aparecia um pouco à direita e para baixo).
const NUDGE_X = -8;
const NUDGE_Y = -14;
// Ondas sonoras douradas em círculo, no lugar do antigo miolo amarelo. Cada barrinha nasce perto
// do centro e cresce/diminui para fora, sempre dentro do miolo escuro (nunca passa desse limite).
const WAVE_N = 28;
const WAVE_IN = SIZE * 0.04; // onde as barrinhas começam (perto do centro)
const WAVE_OUT = SIZE * 0.14; // limite de fora (borda do miolo escuro)
const WAVE_L = WAVE_OUT - WAVE_IN; // comprimento máximo
const WAVE_W = 2.4;
// O miolo escuro da flor aberta fica um tiquinho à esquerda e para baixo do meio da imagem
// (medido nos quadros: 148,3 x 152,2 de 300). As ondas usam esse ponto como centro.
const WAVE_CX = SIZE * (148.3 / 300);
const WAVE_CY = SIZE * (152.2 / 300);

// O círculo de ondas cresce e diminui por igual, com uma tremulação leve em cada barrinha;
// com voz elas crescem mais e mais rápido, em silêncio ficam baixinhas.
const STEPS = 24;
const T_IN = [...Array(STEPS + 1)].map((_, k) => k / STEPS);
function SoundRing({ voice, active, show }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    t.setValue(0);
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: active ? 650 : 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active]);
  const amp = voice.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1], extrapolate: 'clamp' });
  const bars = useMemo(
    () =>
      [...Array(WAVE_N)].map((_, i) => {
        // O círculo inteiro pulsa junto (fica sempre redondo e centrado) e cada barrinha
        // ainda tremula um pouco, em 6 ondinhas iguais em volta, para parecer onda sonora.
        const phase = (i * 6) / WAVE_N;
        const pulse = t.interpolate({ inputRange: T_IN, outputRange: T_IN.map((k) => 0.5 + 0.5 * Math.sin(2 * Math.PI * k)) });
        const ripple = t.interpolate({ inputRange: T_IN, outputRange: T_IN.map((k) => 0.5 + 0.5 * Math.sin(2 * Math.PI * (2 * k + phase))) });
        const osc = Animated.add(Animated.multiply(pulse, 0.65), Animated.multiply(ripple, 0.35));
        // tamanho de 0.2 (baixinha) a 1 (encosta no limite do miolo)
        const s = Animated.add(0.2, Animated.multiply(Animated.multiply(osc, amp), 0.8)).interpolate({ inputRange: [0, 1], outputRange: [0.2, 1], extrapolate: 'clamp' });
        // mantém a ponta de dentro parada: a barrinha cresce só para fora
        const ty = s.interpolate({ inputRange: [0, 1], outputRange: [WAVE_L / 2, 0] });
        return { deg: `${(i * 360) / WAVE_N}deg`, s, ty };
      }),
    [],
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: show ? 1 : 0 }]}>
      {bars.map((b, i) => (
        <View key={i} style={[styles.waveBox, { transform: [{ rotate: b.deg }] }]}>
          <Animated.View style={[styles.wave, { transform: [{ translateY: b.ty }, { scaleY: b.s }] }]} />
        </View>
      ))}
    </View>
  );
}

// Cores da flor conforme o assunto da conversa.
export const MOODS = {
  // Padrão do Realys: preto por dentro, azul em volta e dourado no meio.
  padrao: { back: '#0E1A3A', mid: '#2F86FF', front: '#7DB8FF', center: '#E2B649', shineBack: 'rgba(47,134,255,0.5)', shineMid: 'rgba(125,184,255,0.7)', glow: 'rgba(226,182,73,0.22)', seed: '#E2B649', icon: '#E2B649' },
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
        <Pressable onPress={onPress} accessibilityLabel="Falar com a Lotus" style={styles.wrap}>
          <Animated.View style={[styles.flower, { transform: [{ translateY: lift }, { rotate }, { scale: flowerScale }] }]}>
            {all.map(([k, i, src]) => (
              <Image
                key={mood + k + i}
                source={src}
                fadeDuration={0}
                resizeMode="contain"
                style={[StyleSheet.absoluteFill, { opacity: frame.kind === k && frame.i === i ? 1 : 0 }]}
              />
            ))}
            {mood === 'padrao' ? <SoundRing voice={voice} active={active} show={frame.kind === 'idle' || frame.i >= 4} /> : null}
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

// Botão flutuante da Lotus (canto inferior direito): uma flor de lótus preta, azul e dourada
// que funciona como microfone. Respira devagar em repouso e brilha azul quando o mãos livres
// está ouvindo o "abrir Lotus". Tocar abre o comando de voz.
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
      <Animated.View style={[styles.micGlow, { opacity: g }]} />
      <Animated.Image source={FAB[0]} fadeDuration={0} resizeMode="contain" style={[styles.micFlower, { opacity: g.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale }] }]} />
      <Animated.Image source={FAB[1]} fadeDuration={0} resizeMode="contain" style={[styles.micFlower, { opacity: g, transform: [{ scale }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  micWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  micGlow: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(47,134,255,0.35)' },
  micFlower: { position: 'absolute', width: 50, height: 50 },
  // Faixa da largura inteira da caixa; a flor fica no meio exato, na horizontal e na vertical.
  stage: { alignSelf: 'stretch', height: STAGE, alignItems: 'center', justifyContent: 'center' },
  // Luz, raios e flor ficam todos no mesmo quadro, com o mesmo centro exato.
  center: { width: SIZE, height: SIZE, transform: [{ translateX: NUDGE_X }, { translateY: NUDGE_Y }] },
  // caixa de giro com o centro exatamente no meio do miolo escuro
  waveBox: { position: 'absolute', left: 0, top: 0, width: WAVE_CX * 2, height: WAVE_CY * 2 },
  wave: { position: 'absolute', left: WAVE_CX - WAVE_W / 2, top: WAVE_CY - WAVE_IN - WAVE_L, width: WAVE_W, height: WAVE_L, borderRadius: WAVE_W / 2, backgroundColor: '#FFC928' },
  halo: { position: 'absolute', width: HALO, height: HALO, left: (SIZE - HALO) / 2, top: (SIZE - HALO) / 2 },
  rays: { position: 'absolute', width: RAYS, height: RAYS, left: (SIZE - RAYS) / 2, top: (SIZE - RAYS) / 2 },
  wrap: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  flower: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  pollen: { position: 'absolute', top: SIZE / 2 - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FDE68A' },
});
