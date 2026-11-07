// Mostra o Termo de Adesão completo (o mesmo texto que o servidor publica).
import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TERMO_ADESAO } from '../termoAdesao';
import { colors } from '../theme';

export default function TermoAdesaoModal({ visible, onClose, termo = TERMO_ADESAO }) {
  const T = termo;
  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Text style={styles.title}>{T.titulo}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Fechar termo"><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <Text style={styles.meta}>Versão {T.versao} · atualizado em {T.atualizado}</Text>
          {T.itens.map((it) => (
            <View key={it.titulo} style={{ marginBottom: 14 }}>
              <Text style={styles.h}>{it.titulo}</Text>
              <Text style={styles.p}>{it.texto}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 14 },
  h: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  p: { color: colors.text, fontSize: 14, lineHeight: 21 },
});
