// Boost: aparecer mais e mais rápido (prestador, Date, produtos, publicações, lives) e anúncios.
// Paga com pontos Realys ou com saldo (R$). Pontos só valem aqui, em serviços do próprio Realys.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { POINT_SHOP, BOOST_TARGETS, activeBoost } from '../rewards';

// Tempo que falta: "1 h 20 min".
export function leftText(until) {
  const m = Math.max(0, Math.round((until - Date.now()) / 60000));
  if (m >= 60 * 24) return `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`;
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${m} min`;
}

// Atualiza a tela a cada 30 s para a contagem do boost andar.
function useTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
}

// Lista de ofertas com os dois jeitos de pagar. targets: quais tipos mostrar.
export function BoostOffers({ targets }) {
  const { state, dispatch } = useStore();
  const offers = POINT_SHOP.filter((o) => !targets || targets.includes(o.target));
  const buy = (o, pay) => {
    const price = pay === 'saldo' ? brl(o.money) : `${o.points} pontos`;
    Alert.alert(o.title, `${o.desc}.\n\nPagar com ${price}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => {
          dispatch({ type: 'REDEEM_POINTS', offerId: o.id, pay });
          if (o.target === 'anuncio') Alert.alert('Anúncio enviado', 'Seu anúncio passa pela análise do Realys e entra no ar no próximo espaço livre do horário escolhido.');
        },
      },
    ]);
  };
  let last = null;
  return (
    <View>
      {offers.map((o) => {
        const head = !targets || targets.length > 1 ? (o.target !== last ? BOOST_TARGETS[o.target] : null) : null;
        last = o.target;
        const canPts = state.points >= o.points;
        const canMoney = state.wallet >= o.money;
        return (
          <View key={o.id}>
            {head ? <Text style={styles.group}>{head}</Text> : null}
            <View style={styles.offer}>
              <Text style={{ fontSize: 22, width: 32 }}>{o.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerDesc}>{o.desc}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
                <TouchableOpacity disabled={!canPts} onPress={() => buy(o, 'pontos')} style={[styles.ptsBtn, !canPts && { opacity: 0.4 }]} accessibilityLabel={`${o.title} por ${o.points} pontos`}>
                  <Text style={styles.ptsText}>{o.points} pts</Text>
                </TouchableOpacity>
                {o.money ? (
                  <TouchableOpacity disabled={!canMoney} onPress={() => buy(o, 'saldo')} style={[styles.moneyBtn, !canMoney && { opacity: 0.4 }]} accessibilityLabel={`${o.title} por ${brl(o.money)}`}>
                    <Text style={styles.moneyText}>{brl(o.money)}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Boosts e anúncios já comprados.
export function MyBoosts() {
  const { state } = useStore();
  useTick();
  const today = new Date().toDateString();
  // Boost com tempo: enquanto vale. Anúncio: enquanto está em análise. Charmes: só no dia da compra.
  const list = (state.boosts || [])
    .filter((b) => (b.until ? b.until > Date.now() : b.target === 'anuncio' || new Date(b.at).toDateString() === today))
    .slice(0, 8);
  if (!list.length) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={styles.group}>Seus boosts e anúncios</Text>
      {list.map((b) => {
        const waiting = b.start && b.start > Date.now();
        return (
          <View key={b.id} style={styles.mine}>
            <Text style={{ fontSize: 18, width: 28 }}>{b.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerTitle}>{b.title}</Text>
              <Text style={styles.offerDesc}>Pago com {b.paidWith}</Text>
            </View>
            <Text style={[styles.status, b.status === 'Em análise' && { color: colors.accent }]}>
              {b.until ? (waiting ? 'Na fila' : `${leftText(b.until)}`) : b.status}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Botão de boost para colocar nas telas (prestador, Date, estoque da empresa...).
// Mostra o boost ativo com o tempo que falta; tocar abre as opções.
export function BoostButton({ target, label, hint, style }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  useTick();
  const on = activeBoost(state, target);
  return (
    <>
      <TouchableOpacity style={[styles.btn, on && styles.btnOn, style]} onPress={() => setOpen(true)} activeOpacity={0.88} accessibilityLabel={label || 'Boost'}>
        <View style={[styles.btnIcon, on && { backgroundColor: '#fff' }]}>
          <Ionicons name="rocket" size={18} color={on ? colors.sponsored : '#fff'} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.btnTitle, on && { color: '#fff' }]}>{on ? `Boost ativo · faltam ${leftText(on.until)}` : label || 'Dar um boost'}</Text>
          <Text style={[styles.btnHint, on && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={2}>
            {on ? 'Você está aparecendo primeiro. Toque para estender.' : hint || 'Apareça primeiro e ganhe engajamento mais rápido'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={on ? '#fff' : colors.sponsored} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.back}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.grip} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="rocket" size={20} color={colors.sponsored} />
              <Text style={styles.sheetTitle}>Boost</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ marginLeft: 'auto', padding: 4 }} accessibilityLabel="Fechar">
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.balance}>
              Você tem <Text style={{ color: colors.primary, fontWeight: '800' }}>{state.points} pontos</Text> e <Text style={{ color: colors.text, fontWeight: '800' }}>{brl(state.wallet)}</Text> de saldo
            </Text>
            <ScrollView style={{ maxHeight: 460 }}>
              <BoostOffers targets={[target, ...(target === 'produto' ? ['anuncio'] : [])]} />
              <MyBoosts />
              <Text style={styles.rule}>Pontos são ganhos avaliando, comprando e assistindo lives e clipes. Valem só em boosts e anúncios do Realys: não viram saldo e não podem ser sacados.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  group: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  offer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  offerTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  offerDesc: { color: colors.muted, fontSize: 11, marginTop: 1 },
  ptsBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 78, alignItems: 'center' },
  ptsText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  moneyBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, minWidth: 78, alignItems: 'center', marginTop: 5 },
  moneyText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  mine: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 9, marginBottom: 6 },
  status: { color: colors.success, fontWeight: '800', fontSize: 12, marginLeft: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.sponsored + '55', padding: 12, marginBottom: 12, ...soft },
  btnOn: { backgroundColor: colors.sponsored, borderColor: colors.sponsored },
  btnIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sponsored, alignItems: 'center', justifyContent: 'center' },
  btnTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  btnHint: { color: colors.muted, fontSize: 12, marginTop: 1 },
  back: { flex: 1, backgroundColor: 'rgba(15,20,35,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 10 },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 18, marginLeft: 8 },
  balance: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  rule: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8, marginBottom: 6 },
});
