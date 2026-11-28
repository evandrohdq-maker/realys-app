// Aviso discreto no topo quando a internet cai (como o Instagram): o app continua funcionando com o
// que já estava guardado no aparelho, e o aviso não bloqueia nenhum toque (dá para apertar o que está
// embaixo dele). Mostra também quantas ações (curtidas, seguir) estão esperando a internet voltar.
// Só aparece se a queda for confirmada com o servidor (src/conexao.js) e durar mais de 4 s.
// Voltou a internet depois de o aviso aparecer: "Conectado" por 2 s e some.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors, soft } from '../theme';
import { useConexao } from '../conexao';
import { onFila, pendentes, serverOn } from '../api';

const ESPERA_AVISO = 4000;

export default function AvisoConexao() {
  const online = useConexao();
  const insets = useSafeAreaInsets();
  const [fila, setFila] = useState(pendentes());
  const [voltou, setVoltou] = useState(false);
  // O aviso só aparece se a queda durar mais de alguns segundos (queda curtinha nem é mostrada),
  // e o "Conectado" só aparece se o aviso de queda chegou a aparecer.
  const [caiu, setCaiu] = useState(!online);
  const mostrouQueda = useRef(false);
  const op = useRef(new Animated.Value(online ? 0 : 1)).current;

  useEffect(() => onFila((n) => setFila(n)), []);
  useEffect(() => {
    let t = null;
    if (!online) {
      t = setTimeout(() => {
        setCaiu(true);
        mostrouQueda.current = true;
      }, ESPERA_AVISO);
    } else {
      setCaiu(false);
      if (mostrouQueda.current) {
        mostrouQueda.current = false;
        setVoltou(true);
        t = setTimeout(() => setVoltou(false), 2000);
      }
    }
    return () => clearTimeout(t);
  }, [online]);

  const mostrar = serverOn() && ((!online && caiu) || voltou);
  useEffect(() => {
    Animated.timing(op, { toValue: mostrar ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [mostrar]);
  if (!serverOn()) return null;

  const off = !online;
  // Texto curto: não cobre o logo nem os botões do topo.
  const texto = off ? (fila > 0 ? `Sem conexão · ${fila} esperando` : 'Sem conexão') : 'Conectado';
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
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, maxWidth: '92%' },
  txt: { fontSize: 11.5, fontWeight: '700', marginLeft: 5 },
});
