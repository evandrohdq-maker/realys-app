// Janela de avaliação: abre sozinha quando o pedido é entregue ou o serviço é concluído
// (e também pelo botão "Avaliar"). dispatch({ type: 'OPEN_RATE', kind, refId }).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';
import { RATE_TAGS, STAR_LABEL, orderTargets, callTargets } from '../ratings';
import { pointsFor, POINTS_PER_RATING, POINTS_COMMENT_BONUS } from '../rewards';
import { providerTarget } from './GiftSheet';

const NIGHT = '#0B1124';
const TYPE_LABEL = { loja: 'Loja', food: 'Restaurante', motoboy: 'Entrega', motorista: 'Motorista', prestador: 'Prestador' };

// Avisa os bônus do Clube Realys que acabaram de sair (selos completos, 20 pedidos, nível novo).
export function LoyaltyNotifier() {
  const { state, dispatch } = useStore();
  const notes = state.loyaltyNotes || [];
  useEffect(() => {
    if (!notes.length) return;
    Alert.alert('Clube Realys 🎉', notes.join('\n\n') + '\n\nO desconto é aplicado sozinho no carrinho.');
    dispatch({ type: 'CLEAR_LOYALTY_NOTES' });
  }, [notes.length]);
  return null;
}

export default function RateSheet() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const open = state.rateOpen;
  const [vals, setVals] = useState({});

  useEffect(() => setVals({}), [open && open.refId]);
  if (!open) return null;

  const order = open.kind === 'pedido' ? state.orders.find((o) => o.id === open.refId) : null;
  // Serviço por visita (src/serviceVisits.js) tem o mesmo formato do chamado: provider, serviceKey, serviceLabel.
  const call =
    open.kind === 'servico' ? state.rides.find((r) => r.id === open.refId) : open.kind === 'visita' ? (state.visits || []).find((v) => v.id === open.refId) : null;
  if (!order && !call) return null;
  const targets = order ? orderTargets(state, order) : callTargets(call);
  const close = () => dispatch({ type: 'CLOSE_RATE' });
  const val = (k) => vals[k] || { stars: 0, tags: [], text: '' };
  const set = (k, patch) => setVals((v) => ({ ...v, [k]: { ...val(k), ...patch } }));
  const any = targets.some((t) => val(t.key).stars > 0);

  const send = () => {
    if (!any) return Alert.alert('Escolha as estrelas', 'Toque nas estrelas para dar a sua nota.');
    dispatch({
      type: 'SUBMIT_RATING',
      kind: open.kind,
      refId: open.refId,
      product: order ? order.items.map((i) => i.name).join(', ') : call.serviceLabel,
      items: targets.map((t) => ({ type: t.type, targetId: t.id, targetName: t.name, ...val(t.key) })),
    });
    const earned = pointsFor(targets.map((t) => val(t.key)));
    const tipTo = targets.find((t) => (t.type === 'motoboy' || t.type === 'motorista' || t.type === 'prestador') && val(t.key).stars >= 4);
    const prov = tipTo && state.providers.find((p) => p.id === tipTo.id);
    Alert.alert('Obrigado pela avaliação ⭐', `Você ganhou ${earned} pontos Realys. Troque por créditos com os parceiros em Carteira › Pontos.`, [
      ...(prov ? [{ text: `Dar gorjeta para ${prov.name.split(' ')[0]}`, onPress: () => dispatch({ type: 'OPEN_GIFT', to: { ...providerTarget(prov), tip: true, orderId: order ? order.id : call.id } }) }] : []),
      { text: 'OK' },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="star" size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title}>{order ? 'Como foi o seu pedido?' : 'Como foi o serviço?'}</Text>
              <Text style={styles.sub} numberOfLines={1}>{order ? order.items.map((i) => i.name).join(', ') : `${call.serviceLabel} · ${call.provider.name}`}</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Avaliar depois">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {targets.map((t) => {
              const v = val(t.key);
              const tags = RATE_TAGS[t.type] || RATE_TAGS.prestador;
              const list = v.stars && v.stars <= 3 ? tags.bad : tags.good;
              return (
                <View key={t.key} style={styles.target}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {t.photo ? <Photo uri={t.photo} style={styles.avatar} fallback="🙂" /> : <View style={styles.logo}><Text style={{ fontSize: 22 }}>{t.logo || '🏪'}</Text></View>}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.tType}>{t.label || TYPE_LABEL[t.type]}</Text>
                      <Text style={styles.name}>{t.name}</Text>
                    </View>
                    {v.stars ? <Text style={styles.starLabel}>{STAR_LABEL[v.stars]}</Text> : null}
                  </View>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TouchableOpacity key={i} onPress={() => set(t.key, { stars: i, tags: [] })} accessibilityLabel={`${i} estrelas para ${t.name}`} style={{ paddingHorizontal: 4 }}>
                        <Ionicons name={v.stars >= i ? 'star' : 'star-outline'} size={34} color={colors.gold} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {v.stars ? (
                    <>
                      <Text style={styles.ask}>{v.stars <= 3 ? 'O que deu errado?' : 'O que você mais gostou?'}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {list.map((tag) => {
                          const on = v.tags.includes(tag);
                          return (
                            <TouchableOpacity key={tag} onPress={() => set(t.key, { tags: on ? v.tags.filter((x) => x !== tag) : [...v.tags, tag] })} style={[styles.tag, on && (v.stars <= 3 ? styles.tagBad : styles.tagOn)]}>
                              <Text style={[styles.tagText, on && { color: '#FFFFFF' }]}>{tag}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        value={v.text}
                        onChangeText={(text) => set(t.key, { text })}
                        placeholder={t.type === 'loja' || t.type === 'food' ? 'Comentário (aparece na página da loja como depoimento)' : 'Comentário (opcional)'}
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                        multiline
                        maxLength={240}
                      />
                    </>
                  ) : null}
                </View>
              );
            })}

            <View style={styles.points}>
              <Ionicons name="trophy-outline" size={16} color={colors.gold} />
              <Text style={styles.pointsText}>
                Ganhe {POINTS_PER_RATING} pontos por nota e +{POINTS_COMMENT_BONUS} com comentário. Os pontos viram créditos com os parceiros do Realys.
              </Text>
            </View>
            <TouchableOpacity style={[styles.sendBtn, !any && { opacity: 0.5 }]} onPress={send}>
              <Ionicons name="send" size={16} color={NIGHT} />
              <Text style={styles.sendText}>Enviar avaliação{any ? ` · +${pointsFor(targets.map((t) => val(t.key)))} pontos` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={close} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Avaliar depois</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.45)' },
  sheet: { backgroundColor: '#FFFDF8', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, maxHeight: '90%', borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: NIGHT, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '900', color: colors.text },
  sub: { color: colors.muted, fontSize: 12 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  target: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  logo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF8' },
  tType: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontWeight: '800', color: colors.text },
  starLabel: { color: colors.primary, fontWeight: '900' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  ask: { color: colors.text, fontWeight: '800', marginBottom: 6 },
  tag: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', marginRight: 6, marginBottom: 6 },
  tagOn: { backgroundColor: colors.success, borderColor: colors.success },
  tagBad: { backgroundColor: colors.danger, borderColor: colors.danger },
  tagText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, minHeight: 50, color: colors.text, marginTop: 4, textAlignVertical: 'top' },
  points: { flexDirection: 'row', alignItems: 'center', backgroundColor: NIGHT, borderRadius: 14, padding: 10, marginTop: 12 },
  pointsText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  sendText: { color: NIGHT, fontWeight: '900', marginLeft: 6, fontSize: 15 },
});
