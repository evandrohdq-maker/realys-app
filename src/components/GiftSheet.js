// Janela de presentear: abre de qualquer lugar com dispatch({ type: 'OPEN_GIFT', to, asCompany }).
// to = { id, name, kind: 'pessoa' | 'prestador', photo, role } · asCompany = a empresa presenteia um cliente.
// Sem "to", a pessoa escolhe para quem: amigos e pessoas, prestadores (ou clientes, se for empresa).
import React, { useEffect, useState } from 'react';
import { giftPoints } from '../rewards';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { Photo } from './ui';
import { members } from '../people';
import { serviceTypes, MY_COMPANY_ID } from '../data';
import { GIFT_AMOUNTS, GIFT_MIN, GIFT_MAX, GIFT_FEE_PCT, giftFee, OCCASIONS } from '../gifts';

const NIGHT = '#0B1124';
const toNumber = (t) => Number(String(t || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

export const memberTarget = (m) => ({ id: m.id, name: m.name, kind: 'pessoa', photo: m.photo, role: m.city });
export const providerTarget = (p) => ({ id: p.id, name: p.name, kind: 'prestador', photo: p.photo, role: (serviceTypes.find((t) => t.key === p.service) || {}).label || 'Prestador' });

export default function GiftSheet() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const open = state.giftOpen;
  const [to, setTo] = useState(null);
  const [tab, setTab] = useState('pessoas');
  const [amount, setAmount] = useState(20);
  const [other, setOther] = useState('');
  const [occasion, setOccasion] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setTo(open.to || null);
    setTab('pessoas');
    setAmount(open.to && open.to.tip ? 5 : 20);
    setOther('');
    setOccasion('');
    setMessage('');
  }, [open]);

  if (!open) return null;
  const asCompany = open.asCompany;
  const company = asCompany ? state.stores.find((s) => s.id === MY_COMPANY_ID) : null;
  const value = other ? toNumber(other) : amount;
  const fee = giftFee(value);
  const total = value; // quem envia paga só o valor do presente
  const net = +(value - fee).toFixed(2); // a taxa sai de dentro do presente
  const kind = asCompany ? 'empresa' : to && to.tip ? 'gorjeta' : to && to.kind === 'prestador' ? 'prestador' : 'pessoa';
  const occasions = OCCASIONS[kind];
  const close = () => dispatch({ type: 'CLOSE_GIFT' });

  const send = () => {
    if (!to) return Alert.alert('Para quem?', 'Escolha quem vai receber o presente.');
    if (value < GIFT_MIN) return Alert.alert('Valor mínimo', `O presente mínimo é de ${brl(GIFT_MIN)}.`);
    if (value > GIFT_MAX) return Alert.alert('Valor máximo', `O presente máximo é de ${brl(GIFT_MAX)}.`);
    if (total > state.wallet) return Alert.alert('Saldo insuficiente', `O presente custa ${brl(total)}. Deposite saldo na carteira. (Créditos de presente não servem para presentear.)`);
    dispatch({ type: 'SEND_GIFT', to, amount: value, occasion: occasion || occasions[0], message: message.trim(), asCompany });
    close();
    Alert.alert('Presente enviado 🎁', `${to.name.split(' ')[0]} já recebeu ${brl(net)} em créditos de presente para usar em compras no Re@lys. Não precisa aceitar: já está na conta.`);
  };

  // Para quem: pessoas e prestadores (cliente) ou clientes (empresa).
  const people = members;
  const friendsFirst = [...people].sort((a, b) => (state.friends[b.id] === 'amigo') - (state.friends[a.id] === 'amigo'));
  const providers = state.providers || [];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.giftIcon}>
              <Ionicons name="gift" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title}>{to && to.tip ? 'Dar gorjeta' : asCompany ? 'Presentear cliente' : 'Presentear'}</Text>
              <Text style={styles.sub}>{asCompany ? `Em nome de ${company ? company.name : 'sua empresa'}` : 'Em créditos Re@lys, direto na conta de quem recebe'}</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Para quem */}
            <Text style={styles.label}>Para quem</Text>
            {to ? (
              <View style={styles.toCard}>
                <Photo uri={to.photo} style={styles.avatar} fallback={to.kind === 'prestador' ? '🧑‍🔧' : '🙂'} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{to.name}</Text>
                  <Text style={styles.sub}>{to.kind === 'prestador' ? `Prestador · ${to.role}` : asCompany ? 'Cliente' : to.role || 'Pessoa'}</Text>
                </View>
                {!open.to ? (
                  <TouchableOpacity onPress={() => setTo(null)}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Trocar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <>
                {!asCompany ? (
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {[['pessoas', 'Pessoas'], ['prestadores', 'Prestadores']].map(([k, l]) => (
                      <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.chip, tab === k && styles.chipOn]}>
                        <Text style={[styles.chipText, tab === k && { color: '#FFFFFF' }]}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                  {(tab === 'prestadores' && !asCompany ? providers.map(providerTarget) : friendsFirst.map(memberTarget)).map((t) => (
                    <TouchableOpacity key={t.kind + t.id} style={styles.pick} onPress={() => setTo(t)} accessibilityLabel={`Presentear ${t.name}`}>
                      <Photo uri={t.photo} style={styles.pickPhoto} fallback={t.kind === 'prestador' ? '🧑‍🔧' : '🙂'} />
                      <Text style={styles.pickName} numberOfLines={1}>{t.name.split(' ')[0]}</Text>
                      <Text style={styles.pickRole} numberOfLines={1}>{t.kind === 'prestador' ? t.role : state.friends[t.id] === 'amigo' ? 'amigo' : ' '}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Quanto */}
            <Text style={styles.label}>Quanto</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(to && to.tip ? [5, 10, 15, 20] : GIFT_AMOUNTS).map((v) => (
                <TouchableOpacity key={v} onPress={() => { setAmount(v); setOther(''); }} style={[styles.amount, !other && amount === v && styles.amountOn]}>
                  <Text style={[styles.amountText, !other && amount === v && { color: NIGHT }]}>{brl(v)}</Text>
                </TouchableOpacity>
              ))}
              <TextInput value={other} onChangeText={setOther} placeholder="Outro valor" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.amount, styles.otherInput, !!other && styles.amountOn]} />
            </View>

            {/* Ocasião e mensagem */}
            <Text style={styles.label}>Ocasião</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {occasions.map((o) => (
                <TouchableOpacity key={o} onPress={() => setOccasion(o)} style={[styles.chip, (occasion || occasions[0]) === o && styles.chipOn]}>
                  <Text style={[styles.chipText, (occasion || occasions[0]) === o && { color: '#FFFFFF' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={message} onChangeText={setMessage} placeholder="Mensagem (opcional)" placeholderTextColor={colors.muted} style={styles.message} multiline maxLength={140} />

            {/* Resumo */}
            <View style={styles.summary}>
              <Row label="Sai da sua carteira" value={brl(total)} strong />
              <Row label={`Taxa do Re@lys (${GIFT_FEE_PCT}%, sai do presente)`} value={`− ${brl(fee)}`} />
              <View style={styles.sumLine} />
              <Row label="Quem recebe ganha" value={brl(net)} strong />
              {value > 0 ? (
                <Text style={[styles.note, { color: colors.primary, fontWeight: '700' }]}>
                  🏆 Você ganha +{giftPoints(value, state.gifts.filter((g) => g.dir === 'enviado').length).total} pontos Re@lys (para boosts e anúncios)
                </Text>
              ) : null}
              <Text style={styles.note}>
                <Ionicons name="information-circle-outline" size={12} color={colors.muted} /> Chega na hora, sem precisar aceitar. Quem recebe usa os créditos só dentro do Re@lys (compras, Food, Shop e serviços): eles não podem ser sacados.
              </Text>
            </View>

            <TouchableOpacity style={[styles.sendBtn, !to && { opacity: 0.5 }]} onPress={send}>
              <Ionicons name="gift-outline" size={18} color={NIGHT} />
              <Text style={styles.sendText}>{to && to.tip ? 'Enviar gorjeta' : 'Enviar presente'} · {brl(total)}</Text>
            </TouchableOpacity>
            <Text style={[styles.sub, { textAlign: 'center', marginTop: 8 }]}>Seu saldo: {brl(state.wallet)}</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
      <Text style={{ color: strong ? colors.text : colors.muted, fontWeight: strong ? '900' : '600' }}>{label}</Text>
      <Text style={{ color: strong ? colors.primary : colors.text, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.45)' },
  sheet: { backgroundColor: '#FFFDF8', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 8, maxHeight: '90%' },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  giftIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  toCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, ...soft },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { fontWeight: '700', color: colors.text },
  pick: { width: 76, alignItems: 'center', marginRight: 8 },
  pickPhoto: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.gold },
  pickName: { color: colors.text, fontWeight: '700', fontSize: 12, marginTop: 4 },
  pickRole: { color: colors.muted, fontSize: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  amount: { minWidth: 72, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', marginRight: 6, marginBottom: 6, backgroundColor: '#FFFFFF' },
  amountOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  amountText: { color: colors.primaryDark, fontWeight: '800' },
  otherInput: { minWidth: 110, color: colors.text, fontWeight: '700', textAlign: 'center' },
  message: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, minHeight: 56, color: colors.text, backgroundColor: '#FFFFFF', marginTop: 4, textAlignVertical: 'top' },
  summary: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  sumLine: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  note: { color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 16, paddingVertical: 14, marginTop: 14 },
  sendText: { color: NIGHT, fontWeight: '800', marginLeft: 8, fontSize: 15 },
});
