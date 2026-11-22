// Compras temporariamente bloqueadas: aviso único do app inteiro.
// O servidor diz se as compras estão liberadas (GET /status). Enquanto estiverem bloqueadas, todo
// botão de comprar, pagar, contratar, presentear, depositar ou sacar abre este aviso (a trava fica
// no store, em COMPRA, e também no servidor). Navegar, ver preços e montar o carrinho continuam.
import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, AppState } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { api, serverOn, onComprasBlocked } from '../api';

const PADRAO = 'Compras e pagamentos estão temporariamente bloqueados no Realyz. Em breve liberamos. Todo o resto do app já funciona.';

// Pergunta ao servidor ao abrir o app e sempre que ele volta para a tela.
export function useComprasStatus() {
  const { dispatch } = useStore();
  useEffect(() => {
    onComprasBlocked((msg) => {
      dispatch({ type: 'COMPRAS_STATUS', bloqueadas: true, aviso: msg });
      dispatch({ type: 'COMPRAS_GATE' });
    });
    if (!serverOn()) return () => onComprasBlocked(null);
    const check = () =>
      api('GET', '/status')
        .then((s) => dispatch({ type: 'COMPRAS_STATUS', bloqueadas: s.compras !== 'liberadas', aviso: s.comprasAviso }))
        .catch(() => {});
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => {
      onComprasBlocked(null);
      sub && sub.remove && sub.remove();
    };
  }, [dispatch]);
}

export function ComprasGateModal() {
  const { state, dispatch } = useStore();
  const close = () => dispatch({ type: 'COMPRAS_GATE_CLOSE' });
  return (
    <Modal visible={!!state.comprasGate} transparent animationType="fade" onRequestClose={close}>
      <View style={st.back}>
        <View style={st.box}>
          <View style={st.icon}>
            <Ionicons name="time-outline" size={30} color={colors.primaryDark} />
          </View>
          <Text style={st.title}>Temporariamente bloqueado</Text>
          <Text style={st.text}>{state.comprasAviso || PADRAO}</Text>
          <TouchableOpacity onPress={close} style={st.btn} accessibilityLabel="Entendi">
            <Text numberOfLines={1} style={st.btnText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Faixa discreta para pôr no topo de carrinho, carteira e telas de pagamento.
export function ComprasAviso({ style }) {
  const { state } = useStore();
  if (!state.comprasBloqueadas) return null;
  return (
    <View style={[st.faixa, style]}>
      <Ionicons name="time-outline" size={15} color={colors.primaryDark} />
      <Text style={st.faixaText}>Compras temporariamente bloqueadas</Text>
    </View>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colors.card, borderRadius: 20, padding: 22, width: '100%', maxWidth: 380, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '900', fontSize: 18, marginTop: 12, textAlign: 'center' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  btn: { marginTop: 18, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  faixa: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4D6', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 },
  faixaText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13, marginLeft: 6 },
});
