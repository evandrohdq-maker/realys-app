// Cartão de confirmação da Lotus: ações com dinheiro ou contratação só são feitas com toque no botão.
// A voz apenas abre este cartão. Opções: Confirmar, Recusar ou Depois.
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function LotusCartao({ cartao, onClose }) {
  if (!cartao) return null;
  const opcoes = [
    { label: 'Confirmar', primary: true, onPress: () => { cartao.confirmar && cartao.confirmar(); onClose(); } },
    { label: 'Recusar', onPress: onClose },
    { label: 'Depois', onPress: onClose },
  ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fundo}>
        <View style={styles.caixa}>
          <Text style={styles.titulo}>{cartao.titulo}</Text>
          <Text style={styles.texto}>{cartao.texto}</Text>
          {cartao.aviso ? <Text style={styles.aviso}>{cartao.aviso}</Text> : null}
          {opcoes.map((o) => (
            <TouchableOpacity key={o.label} onPress={o.onPress} activeOpacity={0.85} style={[styles.btn, o.primary && styles.btnPrimary]}>
              <Text style={[styles.btnTexto, o.primary && { color: colors.onPrimary }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22 },
  caixa: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  texto: { color: colors.text, fontSize: 14, lineHeight: 20 },
  aviso: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  btn: { borderRadius: 14, borderWidth: 1, borderColor: colors.border || colors.muted, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
