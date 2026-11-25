// Aviso discreto no topo quando a internet cai (como o Instagram): o app continua funcionando com o
// que já estava guardado no aparelho, e o aviso não bloqueia nenhum toque (dá para apertar o que está
// embaixo dele). Mostra também quantas ações (curtidas, seguir) estão esperando a internet voltar.
// Voltou a internet: aparece "Conectado de novo" por 2,5 s e some.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors, soft } from '../theme';
import { useConexao } from '../conexao';
import { onFila, pendentes, serverOn } from '../api';

export default function AvisoConexao() {
  const online = useConexao();
  const insets = useSafeAreaInsets();
  const [fila, setFila] = useState(pendentes());
  const [voltou, setVoltou] = useState(false);
  const antes = useRef(online);
  const op = useRef(new Animated.Value(online ? 0 : 1)).current;

  useEffect(() => onFila((n) => setFila(n)), []);
  useEffect(() => {
    let t = null;
    if (online && !antes.current) {
      setVoltou(true);
      t = setTimeout(() => setVoltou(false), 2500);
    }
    antes.current = online;
    return () => clearTimeout(t);
  }, [online]);

  const mostrar = serverOn() && (!online || voltou);
  useEffect(() => {
    Animated.timing(op, { toValue: mostrar ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [mostrar]);
  if (!serverOn()) return null;

  const off = !online;
  const texto = off ? (fila > 0 ? `Sem internet · ${fila} ${fila === 1 ? 'ação esperando' : 'ações esperando'}` : 'Sem internet · mostrando o que já estava salvo') : 'Conectado de novo';
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <Animated.View style={[styles.pill, soft, { opacity: op, transform: [{ translateY: op.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]} accessibilityLiveRegion="polite">
        <Ionicons name={off ? 'cloud-offline-outline' : 'cloud-done-outline'} size={14} color={off ? colors.primaryDark : colors.success} />
        <Text style={[styles.txt, { color: off ? colors.primaryDark : colors.success }]} numberOfLines={1}>
          {texto}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, elevation: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, maxWidth: '92%' },
  txt: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
});
