// Planos do Date (Date+): cartão compacto e tela de assinatura com comparação com os concorrentes.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { DATE_PLANS, DATE_PLAN_PERKS, DATE_COMPETITORS, dateSub, planPoints, perMonth } from '../datePlans';

const ROSE = '#E0567A';
const day = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Cartão que aparece no Date: mostra a assinatura ou chama para assinar.
export function DatePlanCard({ onOpen }) {
  const { state } = useStore();
  const sub = dateSub(state);
  return (
    <TouchableOpacity style={[st.card, sub && { borderColor: ROSE }]} onPress={onOpen} activeOpacity={0.85} accessibilityLabel="Planos do Date">
      <Text style={{ fontSize: 22 }}>💎</Text>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={st.cardTitle}>{sub ? `Date+ ${sub.title} ativo` : 'Date+ a partir de R$ 9,90'}</Text>
        <Text style={st.cardSub}>{sub ? `Vale até ${day(sub.until)}${sub.renew === false ? ' · sem renovar' : ''}` : 'Chamada de vídeo com seus crushes e mais charmes'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

export function DatePlansModal({ visible, onClose, reason }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState('mensal');
  const sub = dateSub(state);
  const plan = DATE_PLANS.find((p) => p.id === pick);

  const buy = (pay) => {
    const cost = pay === 'pontos' ? `${planPoints(plan)} pontos` : brl(plan.price);
    if (pay === 'pontos' ? state.points < planPoints(plan) : state.wallet < plan.price)
      return Alert.alert(pay === 'pontos' ? 'Pontos insuficientes' : 'Saldo insuficiente', pay === 'pontos' ? `Você tem ${state.points} pontos.` : `Seu saldo é ${brl(state.wallet)}. Adicione saldo na Carteira.`);
    Alert.alert(`Date+ ${plan.title}`, `${plan.days} dias por ${cost}.${sub ? '\n\nOs dias somam no fim da assinatura atual.' : ''}\n\nPode cancelar a renovação quando quiser; o que foi pago vale até o fim.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Assinar',
        onPress: () => {
          dispatch({ type: 'DATE_SUBSCRIBE', planId: plan.id, pay });
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={st.close} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.title}>Date+</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
          {reason ? <Text style={st.reason}>{reason}</Text> : null}
          {DATE_PLAN_PERKS.map((t) => (
            <View key={t} style={st.perk}>
              <Ionicons name="checkmark-circle" size={18} color={ROSE} />
              <Text style={st.perkText}>{t}</Text>
            </View>
          ))}

          <View style={{ marginTop: 14 }}>
            {DATE_PLANS.map((p) => {
              const on = p.id === pick;
              return (
                <TouchableOpacity key={p.id} style={[st.plan, on && st.planOn]} onPress={() => setPick(p.id)} activeOpacity={0.85}>
                  <View style={[st.radio, on && { borderColor: ROSE }]}>{on ? <View style={st.radioDot} /> : null}</View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={st.planTitle}>
                      {p.title}
                      {p.best ? <Text style={{ color: ROSE }}>  · mais escolhido</Text> : null}
                    </Text>
                    <Text style={st.planHint}>{p.hint}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.price}>{brl(p.price)}</Text>
                    <Text style={st.planHint}>{p.days >= 30 ? `${brl(perMonth(p))}/mês` : `${p.days} dias`}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={st.buy} onPress={() => buy('saldo')}>
            <Text style={st.buyText}>Assinar com saldo · {brl(plan.price)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.buy, st.buyAlt]} onPress={() => buy('pontos')}>
            <Text style={[st.buyText, { color: ROSE }]}>Usar pontos · {planPoints(plan)} pontos</Text>
          </TouchableOpacity>
          {sub ? (
            <TouchableOpacity onPress={() => dispatch({ type: 'DATE_SUB_CANCEL' })} style={{ alignSelf: 'center', marginTop: 12 }}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>{sub.renew === false ? 'Renovação cancelada' : 'Cancelar renovação'}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={st.h}>Compare com os outros apps (por mês)</Text>
          <View style={st.cmpRow}>
            <Text style={[st.cmpName, { color: ROSE, fontWeight: '800' }]}>Re@lys Date+</Text>
            <Text style={[st.cmpVal, { color: ROSE, fontWeight: '800' }]}>{brl(14.9)}</Text>
          </View>
          {DATE_COMPETITORS.map((c) => (
            <View key={c.name} style={st.cmpRow}>
              <Text style={st.cmpName}>{c.name}</Text>
              <Text style={st.cmpVal}>{brl(c.mes)}</Text>
            </View>
          ))}
          <Text style={st.note}>Preço cheio de tabela nas lojas do Brasil em 2026; pode variar por idade e promoção.</Text>
          <Text style={st.note}>Chamada de vídeo só com quem já é crush e está online. A chamada não toca nem faz bip: chega como convite na tela.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  cardTitle: { color: colors.text, fontWeight: '800' },
  cardSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginLeft: 4 },
  reason: { backgroundColor: '#FDECF1', color: '#8A2340', padding: 12, borderRadius: 12, marginBottom: 12, fontWeight: '600' },
  perk: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  perkText: { color: colors.text, marginLeft: 8, flex: 1 },
  plan: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: colors.border, marginBottom: 10 },
  planOn: { borderColor: ROSE, backgroundColor: '#FFF6F8' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ROSE },
  planTitle: { color: colors.text, fontWeight: '800' },
  planHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.text, fontWeight: '800', fontSize: 16 },
  buy: { backgroundColor: ROSE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  buyAlt: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: ROSE, marginTop: 10 },
  buyText: { color: '#fff', fontWeight: '800' },
  h: { color: colors.text, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  cmpRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  cmpName: { color: colors.text },
  cmpVal: { color: colors.text, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 11, marginTop: 8 },
});
