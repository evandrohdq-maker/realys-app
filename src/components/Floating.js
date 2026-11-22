// Janela flutuante: fica por cima do app e pode ser levada para qualquer canto.
// Para arrastar: segure o dedo em cima dela (um instante) e arraste. Um toque rápido continua
// valendo para os botões de dentro. Ao soltar, ela para dentro da tela.
import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOLD_MS = 300; // tempo segurando para "pegar" a janela
const EDGE = 8; // distância mínima das bordas da tela

// place: posição inicial ({ left | right, top | bottom }). O resto do estilo vem em `style`.
// full: ocupa a tela inteira (dentro da janelinha por cima dos outros apps), sem arrastar.
export default function Floating({ place, style, children, bottomGap = 0, full = false }) {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const at = useRef({ x: 0, y: 0 }); // deslocamento atual a partir da posição inicial
  const home = useRef(null); // retângulo na posição inicial (sem deslocamento)
  const armed = useRef(false);
  const timer = useRef(null);
  const start = useRef({ x: 0, y: 0 });
  const [lifted, setLifted] = useState(false);
  // Limites guardados em ref para o PanResponder (criado uma vez) enxergar a tela atual.
  const lim = useRef({});
  lim.current = { w: win.width, h: win.height, top: insets.top, bottom: insets.bottom + bottomGap };

  const disarm = () => {
    clearTimeout(timer.current);
    armed.current = false;
    setLifted(false);
  };
  const clamp = (x, y) => {
    const r = home.current;
    if (!r) return { x, y };
    const L = lim.current;
    const minX = EDGE - r.x;
    const maxX = L.w - r.width - EDGE - r.x;
    const minY = L.top + EDGE - r.y;
    const maxY = L.h - L.bottom - r.height - EDGE - r.y;
    return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(Math.max(minY, maxY), y)) };
  };
  const settle = (g) => {
    pos.flattenOffset();
    const to = clamp(at.current.x + g.dx, at.current.y + g.dy);
    at.current = to;
    Animated.spring(pos, { toValue: to, useNativeDriver: false, bounciness: 4 }).start();
    disarm();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Só assume o gesto depois de segurar; antes disso os botões de dentro funcionam normalmente.
        onMoveShouldSetPanResponderCapture: (_, g) => armed.current && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderGrant: () => {
          pos.setOffset({ x: at.current.x, y: at.current.y });
          pos.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, g) => pos.setValue({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_, g) => settle(g),
        onPanResponderTerminate: (_, g) => settle(g),
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  // Tela cheia: presa nas quatro bordas (não pela medida da janela, que no giro do celular chega
  // atrasada e deixava uma faixa vazia de um lado). No site, ocupa a janela inteira do navegador.
  if (full)
    return (
      <Animated.View
        style={[
          style,
          Platform.OS === 'web'
            ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }
            : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: undefined, height: undefined },
          { borderRadius: 0, borderWidth: 0, margin: 0, zIndex: 9999, elevation: 99 },
        ]}
      >
        {children}
      </Animated.View>
    );
  return (
    <Animated.View
      {...pan.panHandlers}
      onLayout={(e) => {
        home.current = e.nativeEvent.layout;
        // Mudou de tamanho (ex.: janela aumentada): garante que continua dentro da tela.
        const to = clamp(at.current.x, at.current.y);
        if (to.x !== at.current.x || to.y !== at.current.y) {
          at.current = to;
          pos.setValue(to);
        }
      }}
      onTouchStart={(e) => {
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          armed.current = true;
          setLifted(true);
        }, HOLD_MS);
      }}
      onTouchMove={(e) => {
        // Mexeu o dedo antes de completar o tempo: não era para pegar a janela.
        if (armed.current) return;
        if (Math.abs(e.nativeEvent.pageX - start.current.x) > 10 || Math.abs(e.nativeEvent.pageY - start.current.y) > 10) clearTimeout(timer.current);
      }}
      onTouchEnd={disarm}
      onTouchCancel={disarm}
      style={[{ position: 'absolute' }, place, style, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: lifted ? 1.04 : 1 }], opacity: lifted ? 0.94 : 1 }]}
    >
      {children}
    </Animated.View>
  );
}
