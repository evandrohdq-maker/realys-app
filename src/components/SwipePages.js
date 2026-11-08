// Arrastar a página inicial para os lados, como páginas vizinhas:
//   arrastar para a ESQUERDA  → a página vem junto com o dedo e abre o Feed de Notícias (à direita);
//   arrastar para a DIREITA   → abre o Perfil (à esquerda).
// Vale para qualquer perfil de acesso (usuário, empresa, prestador, fornecedor, admin).
// Faixas horizontais (stories, carrosséis) continuam rolando normalmente: elas têm prioridade.
import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Dimensions, Easing } from 'react-native';

const W = Dimensions.get('window').width;

export default function SwipePages({ onLeft, onRight, style, children }) {
  const x = useRef(new Animated.Value(0)).current;
  // Guarda os callbacks atuais sem recriar o PanResponder a cada render.
  const cb = useRef({});
  cb.current = { onLeft, onRight };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
          const { onLeft: l, onRight: r } = cb.current;
          if (Math.abs(g.dx) < 16 || Math.abs(g.dx) < Math.abs(g.dy) * 2.2) return false;
          return g.dx < 0 ? !!l : !!r;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const { onLeft: l, onRight: r } = cb.current;
          // Só deixa puxar para o lado que tem página; o outro lado resiste.
          let dx = g.dx;
          if ((dx < 0 && !l) || (dx > 0 && !r)) dx = dx * 0.15;
          x.setValue(dx);
        },
        onPanResponderRelease: (_, g) => {
          const { onLeft: l, onRight: r } = cb.current;
          const goLeft = l && (g.dx < -W * 0.25 || (g.dx < -40 && g.vx < -0.5));
          const goRight = r && (g.dx > W * 0.25 || (g.dx > 40 && g.vx > 0.5));
          if (!goLeft && !goRight) {
            Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
            return;
          }
          const dir = goLeft ? -1 : 1;
          // A página atual sai pelo lado arrastado...
          Animated.timing(x, { toValue: dir * W, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
            (goLeft ? l : r)();
            // ...e a nova entra pelo lado oposto, continuando o movimento.
            x.setValue(-dir * W * 0.6);
            Animated.timing(x, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [x]
  );

  return (
    <Animated.View style={[{ flex: 1, transform: [{ translateX: x }] }, style]} {...responder.panHandlers}>
      {children}
    </Animated.View>
  );
}
