// Garantia Re@lys na tela: selo, botão "Tive um problema", janela para abrir o caso e acompanhamento.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { GUARANTEE_REASONS, GUARANTEE_RULES, GUARANTEE_DAYS, GUARANTEE_ANSWER_HOURS, daysLeft } from '../guarantee';

const GREEN = '#1E9E63';

// Selo curto: "Protegido pela Garantia Re@lys".
export function GuaranteeSeal({ text, style }) {
  return (
    <View style={[styles.seal, style]}>
      <Ionicons name="shield-checkmark" size={14} color={GREEN} />
      <Text style={styles.sealText}>{text || `Protegido pela Garantia Re@lys · ${GUARANTEE_DAYS} dias`}</Text>
    </View>
  );
}

// Cartão explicando a garantia (Perfil).
export function GuaranteeInfo() {
  const [open, setOpen] = useState(false);
  const { state } = useStore();
  const cases = state.disputes || [];
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(!open)} style={styles.info} accessibilityLabel="Garantia Re@lys">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.infoIcon}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.infoTitle}>Garantia Re@lys</Text>
          <Text style={styles.infoSub}>Deu problema? Seu dinheiro volta.</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={GREEN} />
      </View>
      {open ? (
        <View style={{ marginTop: 8 }}>
          {GUARANTEE_RULES.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', marginTop: 5 }}>
              <Text style={styles.ruleNum}>{i + 1}</Text>
              <Text style={styles.ruleText}>{r}</Text>
            </View>
          ))}
          {cases.length ? <Text style={[styles.infoTitle, { fontSize: 13, marginTop: 12 }]}>Seus casos</Text> : null}
          {cases.map((d) => (
            <DisputeLine key={d.id} d={d} />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function DisputeLine({ d }) {
  const done = d.status === 'resolvido';
  return (
    <View style={styles.caseLine}>
      <Ionicons name={done ? (d.outcome === 'reembolsado' ? 'checkmark-circle' : 'close-circle') : 'time'} size={16} color={done ? (d.outcome === 'reembolsado' ? GREEN : colors.danger) : colors.accent} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.caseTitle} numberOfLines={1}>{d.title}</Text>
        <Text style={styles.caseSub}>
          {d.reason} · {done ? (d.outcome === 'reembolsado' ? `${brl(d.amount)} devolvido` : 'não aprovado') : `em análise (até ${GUARANTEE_ANSWER_HOURS} h)`}
        </Text>
      </View>
    </View>
  );
}

// Botão "Tive um problema" + janela do caso. kind: 'pedido' | 'visita'.
export function GuaranteeButton({ kind, refId, title, amount, giftPart, deliveredAt }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [text, setText] = useState('');
  const d = (state.disputes || []).find((x) => x.refId === refId);

  // Demonstração: o Re@lys analisa (chat, GPS, QR Code) e responde em alguns segundos.
  useEffect(() => {
    if (!d || d.status !== 'em análise') return;
    const t = setTimeout(() => dispatch({ type: 'DISPUTE_RESOLVE', id: d.id, favor: true }), 6000);
    return () => clearTimeout(t);
  }, [d && d.id, d && d.status]);

  if (d) {
    const done = d.status === 'resolvido';
    return (
      <View style={[styles.status, done && { backgroundColor: '#EEF7F1', borderColor: '#BFE3CC' }]}>
        <Ionicons name={done ? 'shield-checkmark' : 'time-outline'} size={16} color={done ? GREEN : colors.accent} />
        <Text style={[styles.statusText, done && { color: GREEN }]}>
          {done
            ? d.outcome === 'reembolsado'
              ? `Garantia Re@lys: ${brl(d.amount)} devolvido para a sua carteira`
              : 'Garantia Re@lys: caso analisado e não aprovado'
            : `Garantia Re@lys analisando: ${d.reason.toLowerCase()}. Resposta em até ${GUARANTEE_ANSWER_HOURS} h.`}
        </Text>
      </View>
    );
  }

  const reasons = GUARANTEE_REASONS[kind] || GUARANTEE_REASONS.pedido;
  const send = () => {
    if (!reason) return Alert.alert('Escolha o problema', 'Toque no que aconteceu.');
    dispatch({ type: 'DISPUTE_OPEN', kind, refId, title, reason: reason.label, text: text.trim(), amount, giftPart });
    setOpen(false);
    setReason(null);
    setText('');
    Alert.alert('Caso aberto', `O valor continua retido. O Re@lys vai olhar o chat, o GPS e o QR Code e responder em até ${GUARANTEE_ANSWER_HOURS} horas.`);
  };

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)} accessibilityLabel="Tive um problema: Garantia Re@lys">
        <Ionicons name="shield-checkmark-outline" size={14} color={GREEN} />
        <Text style={styles.btnText}>Tive um problema</Text>
        {deliveredAt ? <Text style={styles.btnSub}> · {daysLeft(deliveredAt)} dias de garantia</Text> : null}
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.back}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.grip} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.infoTitle}>Garantia Re@lys</Text>
                <Text style={styles.infoSub} numberOfLines={1}>{title} · {brl(amount)}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="Fechar" style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>O que aconteceu?</Text>
              {reasons.map((r) => {
                const on = reason && reason.key === r.key;
                return (
                  <TouchableOpacity key={r.key} style={[styles.reason, on && styles.reasonOn]} onPress={() => setReason(r)}>
                    <Ionicons name={r.icon} size={18} color={on ? '#fff' : GREEN} />
                    <Text style={[styles.reasonText, on && { color: '#fff' }]}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.label}>Conte em poucas palavras (opcional)</Text>
              <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Ex.: a embalagem chegou aberta e faltou uma peça" placeholderTextColor={colors.muted} multiline />
              <Text style={styles.note}>O Re@lys vai olhar a conversa, o GPS da entrega, o QR Code e as fotos. Enquanto isso, o dinheiro fica retido. Caso falso tira pontos do seu Score.</Text>
              <TouchableOpacity style={styles.send} onPress={send}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Abrir caso na Garantia Re@lys</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  seal: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EEF7F1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  sealText: { color: GREEN, fontWeight: '700', fontSize: 11, marginLeft: 4 },
  info: { backgroundColor: '#F4FBF6', borderRadius: 18, borderWidth: 1, borderColor: '#BFE3CC', padding: 14, marginBottom: 14 },
  infoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  infoSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  ruleNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: '800', lineHeight: 20, overflow: 'hidden', marginRight: 8 },
  ruleText: { color: colors.text, fontSize: 12, flex: 1, lineHeight: 18 },
  caseLine: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  caseTitle: { color: colors.text, fontWeight: '700', fontSize: 12 },
  caseSub: { color: colors.muted, fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  btnText: { color: GREEN, fontWeight: '800', fontSize: 12, marginLeft: 4 },
  btnSub: { color: colors.muted, fontSize: 11 },
  status: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF3FB', borderRadius: 12, borderWidth: 1, borderColor: '#C9DAF2', padding: 9, marginTop: 8 },
  statusText: { color: colors.accent, fontWeight: '700', fontSize: 12, marginLeft: 6, flex: 1 },
  back: { flex: 1, backgroundColor: 'rgba(15,20,35,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 10 },
  label: { color: colors.text, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  reason: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BFE3CC', borderRadius: 14, padding: 11, marginBottom: 6, backgroundColor: '#fff' },
  reasonOn: { backgroundColor: GREEN, borderColor: GREEN },
  reasonText: { color: colors.text, fontWeight: '700', marginLeft: 10 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 11, minHeight: 60, color: colors.text, textAlignVertical: 'top' },
  note: { color: colors.muted, fontSize: 11, marginTop: 10, lineHeight: 16 },
  send: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 12, marginBottom: 6 },
});
