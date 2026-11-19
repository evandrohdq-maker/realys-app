// Teclado do celular: a tela sobe junto com ele.
// No Android novo (tela de ponta a ponta) o sistema não encolhe mais o app quando o teclado abre,
// então a caixa de texto ficava escondida atrás dele. Aqui o app mede o teclado e empurra o
// conteúdo para cima na mesma altura, com animação, e desce de novo quando o teclado fecha.
import React, { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, View } from 'react-native';

export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animate = (e) => {
      try {
        LayoutAnimation.configureNext({
          duration: (e && e.duration) || 220,
          update: { type: LayoutAnimation.Types.keyboard || LayoutAnimation.Types.easeInEaseOut },
        });
      } catch (err) {}
    };
    const a = Keyboard.addListener(showEv, (e) => {
      animate(e);
      setH((e && e.endCoordinates && e.endCoordinates.height) || 0);
    });
    const b = Keyboard.addListener(hideEv, (e) => {
      animate(e);
      setH(0);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}

// Caixa que sobe com o teclado. Substitui o KeyboardAvoidingView (que no Android não fazia nada).
// behavior e keyboardVerticalOffset são aceitos só para não quebrar quem já passava.
export function KeyboardLift({ style, children, behavior, keyboardVerticalOffset, enabled = true, ...rest }) {
  const h = useKeyboardHeight();
  return (
    <View {...rest} style={[style, enabled && h ? { paddingBottom: h } : null]}>
      {children}
    </View>
  );
}
