// Conta bloqueada por chamada de emergência falsa: o app fica travado nesta tela e o saldo retido.
import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store';
import { colors, brl } from '../theme';

const key = (uid) => `realys-bloqueio-${uid}`;

export default function AccountBlocked() {
  const { state, dispatch } = useStore();
  const uid = state.user && state.user.id;
  const b = state.accountBlock;
  // O bloqueio fica guardado no celular (e, com o servidor ligado, na conta).
  useEffect(() => {
    if (!uid) return;
    AsyncStorage.getItem(key(uid))
      .then((raw) => raw && dispatch({ type: 'LOAD_BLOCK', block: JSON.parse(raw) }))
      .catch(() => {});
  }, [uid]);
  useEffect(() => {
    if (uid && b) AsyncStorage.setItem(key(uid), JSON.stringify(b)).catch(() => {});
  }, [uid, b && b.at]);
  if (!b) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <View style={st.wrap}>
        <Ionicons name="lock-closed" size={56} color={colors.danger} />
        <Text style={st.title}>Conta bloqueada</Text>
        <Text style={st.p}>
          A segurança confirmou que o alerta de emergência enviado por esta conta foi falso. Como está no Termo de Adesão, a conta foi bloqueada e o saldo{b.wallet ? ` (${brl(b.wallet)})` : ''} ficou retido.
        </Text>
        <Text style={st.p}>Se você acredita que houve um engano, fale com o suporte do Re@lys para pedir a revisão do caso.</Text>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 10 },
  p: { color: colors.text, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
});
