// Termo de Adesão mudou: quem já tem conta lê a nova versão e aceita antes de continuar.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { TERMO_ADESAO } from '../termoAdesao';
import { needsAccept, saveAccepted } from '../termsAccept';

export default function TermoReaceite() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const uid = state.user && state.user.id;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let live = true;
    if (!uid) return setShow(false);
    needsAccept(uid).then((n) => live && setShow(n));
    return () => {
      live = false;
    };
  }, [uid]);

  if (!show) return null;
  const T = TERMO_ADESAO;
  return (
    <Modal visible animationType="slide" onRequestClose={() => {}}>
      <View style={[st.wrap, { paddingTop: insets.top + 12 }]}>
        <Text style={st.title}>Atualizamos o Termo de Adesão</Text>
        <Text style={st.sub}>Leia a nova versão ({T.atualizado}). Para continuar usando o Realys, é preciso aceitar.</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {T.itens.map((it) => (
            <View key={it.titulo} style={{ marginBottom: 14 }}>
              <Text style={st.h}>{it.titulo}</Text>
              <Text style={st.p}>{it.texto}</Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[st.btn, { marginBottom: 14 + insets.bottom }]}
          onPress={() => saveAccepted(uid).then(() => setShow(false))}
          accessibilityLabel="Li e aceito o termo"
        >
          <Text style={st.btnText}>Li e aceito</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginTop: 4, marginBottom: 14 },
  h: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  p: { color: colors.text, fontSize: 14, lineHeight: 21 },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
});
