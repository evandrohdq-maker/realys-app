// Pedido de visita (cliente) e cartão de acompanhamento da visita.
// Regras em src/serviceVisits.js.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, serviceType } from '../store';
import { colors, brl, soft } from '../theme';
import { Photo, Input, Chip, Row } from './ui';
import { visitFee, visitDiscount, splitFee, REALYS_FEE_PCT, VISIT_STATUS } from '../serviceVisits';

const WHEN = ['Assim que possível', 'Hoje à tarde', 'Amanhã de manhã', 'Neste fim de semana'];

// Telefone de exemplo, liberado só depois que a taxa de visita é paga.
const phoneOf = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = String(10000000 + (h % 89999999));
  return `(11) 9${n.slice(0, 4)}-${n.slice(4, 8)}`;
};

export function VisitRequestSheet({ provider: p, visible, onClose, address = '', onSent }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [problem, setProblem] = useState('');
  const [addr, setAddr] = useState(address);
  const [when, setWhen] = useState(WHEN[0]);
  useEffect(() => {
    if (visible) {
      setProblem('');
      setAddr(address);
      setWhen(WHEN[0]);
    }
  }, [visible, p && p.id]);
  if (!p) return null;

  const fee = visitFee(p);
  const split = splitFee(fee);
  const discount = visitDiscount(p);
  const type = serviceType(p.service) || { label: 'Serviço' };
  const first = p.name.split(' ')[0];

  const send = () => {
    if (!problem.trim()) return Alert.alert('Conte o que precisa', `Escreva em poucas palavras o problema, para ${first} saber o que levar.`);
    if (state.wallet + (state.giftCredits || 0) < fee) return Alert.alert('Saldo insuficiente', `A taxa de visita é ${brl(fee)}. Adicione saldo em Carteira.`);
    dispatch({ type: 'VISIT_REQUEST', provider: p, serviceLabel: type.label, problem: problem.trim(), address: addr.trim(), when });
    onClose();
    Alert.alert(
      'Pedido enviado ✅',
      `${brl(fee)} ficou retido no Realys. Se ${first} recusar ou não aparecer, o valor volta para você. Acompanhe em Serviços › Minhas visitas.`
    );
    onSent && onSent();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grip} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Row style={{ marginBottom: 12 }}>
              <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.title}>Pedir visita a {first}</Text>
                <Text style={styles.sub}>{type.label} · ID biométrico verificado</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fechar">
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </Row>

            <Text style={styles.label}>O que você precisa?</Text>
            <Input placeholder="Ex.: chuveiro desarmando o disjuntor" value={problem} onChangeText={setProblem} multiline />
            <Text style={styles.label}>Endereço</Text>
            <Input placeholder="Rua, número e bairro" value={addr} onChangeText={setAddr} />
            <Text style={styles.label}>Quando</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
              {WHEN.map((w) => (
                <View key={w} style={{ marginBottom: 8 }}>
                  <Chip label={w} active={when === w} onPress={() => setWhen(w)} />
                </View>
              ))}
            </View>

            <View style={styles.feeBox}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.feeLabel}>Taxa de visita</Text>
                <Text style={styles.feeValue}>{brl(fee)}</Text>
              </Row>
              <Line icon="lock-closed-outline" text="Fica retida no Realys até você confirmar que a visita aconteceu." />
              <Line icon="return-down-back-outline" text={`Se ${first} recusar ou não aparecer, o valor volta na hora.`} />
              <Line icon="pie-chart-outline" text={`Depois da visita: ${brl(split.provider)} para ${first} e ${brl(split.realys)} (${REALYS_FEE_PCT}%) para o Realys.`} />
              <Line icon="chatbubbles-outline" text="O valor do serviço vocês combinam direto. O Realys não cobra nada sobre ele." />
              {discount ? <Line icon="pricetag-outline" color={colors.success} text={`${first} desconta a taxa de visita do serviço se for contratado.`} /> : null}
            </View>

            <TouchableOpacity style={styles.sendBtn} onPress={send}>
              <Ionicons name="shield-checkmark" size={16} color={colors.onPrimary} />
              <Text style={styles.sendText}>Pagar {brl(fee)} e pedir visita</Text>
            </TouchableOpacity>
            <Text style={styles.saldo}>Saldo Realys: {brl(state.wallet)}</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Line({ icon, text, color = colors.muted }) {
  return (
    <Row style={{ alignItems: 'flex-start', marginTop: 8 }}>
      <Ionicons name={icon} size={15} color={color === colors.muted ? colors.primary : color} style={{ marginTop: 1 }} />
      <Text style={{ color: color === colors.muted ? colors.text : color, fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 }}>{text}</Text>
    </Row>
  );
}

// Cartão de uma visita pedida pelo cliente, com o próximo passo de cada etapa.
export function VisitCard({ visit: v }) {
  const { dispatch } = useStore();
  const st = VISIT_STATUS[v.status] || VISIT_STATUS.aguardando;
  const first = v.provider.name.split(' ')[0];
  const act = (type) => dispatch({ type, id: v.id });

  return (
    <View style={[styles.card, { borderColor: st.color }]}>
      <Row>
        <Ionicons name={st.icon} size={16} color={st.color} />
        <Text style={{ color: st.color, fontWeight: '700', marginLeft: 6, flex: 1 }}>{st.label}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{brl(v.fee)}</Text>
      </Row>
      <Row style={{ marginTop: 8 }}>
        <Photo uri={v.provider.photo} style={styles.avatarSm} fallback="🧑" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {v.provider.name} · {v.serviceLabel}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
            {v.problem}
            {v.when ? ` · ${v.when}` : ''}
          </Text>
        </View>
      </Row>

      {v.status === 'aguardando' ? (
        <>
          <Text style={styles.hint}>A taxa está retida. {first} vai aceitar ou recusar.</Text>
          <Text style={styles.demo}>Demonstração: simule a resposta do prestador</Text>
          <Row>
            <Small title="Prestador aceitou" onPress={() => dispatch({ type: 'VISIT_RESPOND', id: v.id, accept: true })} main />
            <Small title="Prestador recusou" onPress={() => dispatch({ type: 'VISIT_RESPOND', id: v.id, accept: false })} />
          </Row>
        </>
      ) : null}

      {v.status === 'aceita' ? (
        <>
          <View style={styles.phone}>
            <Ionicons name="call-outline" size={15} color={colors.success} />
            <Text style={{ color: colors.text, marginLeft: 8, flex: 1, fontSize: 13 }}>
              Telefone liberado: <Text style={{ fontWeight: '700' }}>{phoneOf(v.providerId)}</Text>
            </Text>
            <TouchableOpacity onPress={() => Alert.alert('Chat do Realys', `Conversa com ${first} aberta.`)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Chat</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Depois que {first} passar aí, confirme a visita. Só então o valor é liberado.</Text>
          <Row>
            <Small title="Confirmar visita" onPress={() => act('VISIT_CONFIRM')} main />
            <Small
              title="Não veio"
              danger
              onPress={() =>
                Alert.alert('Prestador não veio?', `A taxa de ${brl(v.fee)} volta para você e ${first} perde posição no ranking.`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Confirmar falta', style: 'destructive', onPress: () => act('VISIT_NO_SHOW') },
                ])
              }
            />
          </Row>
        </>
      ) : null}

      {v.status === 'confirmada' ? (
        <>
          <Text style={styles.hint}>
            Taxa dividida: {brl(v.split.provider)} para {first} e {brl(v.split.realys)} para o Realys. Agora combinem o valor do serviço direto
            {v.discount ? `. ${first} desconta a taxa de visita se for contratado.` : '.'}
          </Text>
          <Row>
            <Small title="Serviço concluído: avaliar" onPress={() => act('VISIT_DONE')} main />
          </Row>
        </>
      ) : null}

      {v.status === 'concluida' && !v.rated ? (
        <Row>
          <Small title={`Avaliar ${first}`} onPress={() => dispatch({ type: 'OPEN_RATE', kind: 'visita', refId: v.id })} main />
        </Row>
      ) : null}
      {v.status === 'concluida' && v.rated ? <Text style={styles.hint}>Avaliação enviada. Obrigado!</Text> : null}
      {v.status === 'recusada' ? <Text style={styles.hint}>Pedido recusado não recebe avaliação. Escolha outro prestador da lista.</Text> : null}
    </View>
  );
}

function Small({ title, onPress, main, danger }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.small, main && styles.smallMain, danger && styles.smallDanger]}>
      <Text style={{ color: main ? colors.onPrimary : danger ? colors.danger : colors.text, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.45)' },
  sheet: { backgroundColor: '#FFFDF8', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, maxHeight: '92%' },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 15 },
  avatarSm: { width: 40, height: 40, borderRadius: 13 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
  feeBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginTop: 4, ...soft },
  feeLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  feeValue: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 14 },
  sendText: { color: colors.onPrimary, fontWeight: '800', marginLeft: 8, fontSize: 15 },
  saldo: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, padding: 12, marginBottom: 10 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  demo: { color: colors.sponsored, fontSize: 11, fontWeight: '700', marginTop: 8 },
  phone: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,158,99,0.08)', borderRadius: 12, padding: 10, marginTop: 10 },
  small: { flex: 1, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginRight: 8, paddingHorizontal: 6 },
  smallMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  smallDanger: { borderColor: 'rgba(217,83,79,0.5)' },
});
