// Carrinho em janela compacta: abre por cima de qualquer tela, sem ocupar espaço no visual do app.
// Abre pelo ícone discreto no topo (só aparece quando há itens), pela barra da loja ou pedindo
// à Lotus ("abre meu carrinho"). dispatch({ type: 'OPEN_CART' }).
import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, cartTotal, storeOf } from '../store';
import { colors, brl, soft } from '../theme';
import { ProductThumb } from './ui';
import { promoDiscount } from '../rewards';

const NIGHT = '#0B1124';

export default function CartSheet({ onOrders }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  if (!state.cartOpen) return null;
  const close = () => dispatch({ type: 'CLOSE_CART' });
  const lines = state.cart.map((c) => ({ ...c, p: state.products.find((x) => x.id === c.productId) })).filter((l) => l.p);
  const promo = promoDiscount(state, lines.map((l) => ({ ...l, product: l.p })));
  const total = +(cartTotal(state) - promo.off).toFixed(2);
  const fromGift = Math.min(state.giftCredits || 0, total);
  const fromWallet = total - fromGift;
  const count = lines.reduce((n, l) => n + l.qty, 0);

  const pay = () => {
    if (total > state.wallet + (state.giftCredits || 0)) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys na carteira para concluir.');
    dispatch({ type: 'CHECKOUT' });
    close();
    Alert.alert('Pedido confirmado! ✅', 'Pagamento protegido: o valor fica retido pelo Realys e só é liberado para a loja quando você confirmar a entrega.', [
      { text: 'Ver pedidos', onPress: () => onOrders && onOrders() },
      { text: 'OK' },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} accessibilityLabel="Fechar carrinho" />
        <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="bag-handle" size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title}>Seu carrinho</Text>
              <Text style={styles.sub}>{count ? `${count} ${count === 1 ? 'item' : 'itens'}` : 'Vazio'}</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!lines.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Ionicons name="bag-outline" size={34} color={colors.muted} />
              <Text style={[styles.sub, { marginTop: 8, textAlign: 'center' }]}>Nada no carrinho ainda.{'\n'}Adicione produtos na Loja, no Food ou pela Lotus.</Text>
            </View>
          ) : (
            <>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {lines.map(({ p, qty }) => (
                  <View key={p.id} style={styles.line}>
                    <ProductThumb product={p} size={46} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.sub} numberOfLines={1}>{(storeOf(state, p.storeId) || {}).name}</Text>
                      <Text style={styles.price}>{brl(p.price * qty)}</Text>
                    </View>
                    <View style={styles.qty}>
                      <TouchableOpacity onPress={() => dispatch({ type: 'CART_QTY', productId: p.id, delta: -1 })} style={styles.qBtn} accessibilityLabel={`Tirar um ${p.name}`}>
                        <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={15} color={qty === 1 ? colors.danger : colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.qNum}>{qty}</Text>
                      <TouchableOpacity onPress={() => dispatch({ type: 'CART_QTY', productId: p.id, delta: 1 })} style={styles.qBtn} accessibilityLabel={`Mais um ${p.name}`}>
                        <Ionicons name="add" size={15} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.sum}>
                {promo.off > 0 ? (
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>🏷️ Créditos de parceiros</Text>
                    <Text style={[styles.sumValue, { color: '#7BE0B0' }]}>− {brl(promo.off)}</Text>
                  </View>
                ) : null}
                {fromGift > 0 ? (
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>🎁 Créditos de presente</Text>
                    <Text style={[styles.sumValue, { color: '#7BE0B0' }]}>− {brl(fromGift)}</Text>
                  </View>
                ) : null}
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Do saldo Realys ({brl(state.wallet)})</Text>
                  <Text style={styles.sumValue}>{brl(fromWallet)}</Text>
                </View>
                <View style={[styles.sumRow, { marginTop: 4 }]}>
                  <Text style={[styles.sumLabel, { color: '#FFFFFF', fontWeight: '800' }]}>Total</Text>
                  <Text style={[styles.sumValue, { color: colors.gold, fontSize: 17 }]}>{brl(total)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.payBtn} onPress={pay}>
                <Ionicons name="shield-checkmark-outline" size={17} color={NIGHT} />
                <Text style={styles.payText}>Pagar com saldo Realys</Text>
              </TouchableOpacity>
              <Text style={[styles.sub, { textAlign: 'center', marginTop: 6 }]}>Pagamento protegido · NF-e emitida automaticamente</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Ícone discreto do topo: só aparece quando há itens no carrinho.
export function CartIcon({ style }) {
  const { state, dispatch } = useStore();
  const count = state.cart.reduce((n, c) => n + c.qty, 0);
  if (!count) return null;
  return (
    <TouchableOpacity onPress={() => dispatch({ type: 'OPEN_CART' })} style={style} accessibilityLabel={`Abrir carrinho, ${count} itens`}>
      <Ionicons name="bag-handle-outline" size={21} color={colors.text} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.4)' },
  sheet: { backgroundColor: '#FFFDF8', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: NIGHT, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontWeight: '700', color: colors.text },
  price: { color: colors.primary, fontWeight: '800', marginTop: 1 },
  qty: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#FFFFFF', ...soft },
  qBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qNum: { minWidth: 18, textAlign: 'center', fontWeight: '800', color: colors.text },
  sum: { backgroundColor: NIGHT, borderRadius: 16, padding: 12, marginTop: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  sumLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 13 },
  sumValue: { color: '#FFFFFF', fontWeight: '800' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 13, marginTop: 10 },
  payText: { color: NIGHT, fontWeight: '800', marginLeft: 6, fontSize: 15 },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFDF8' },
  badgeText: { color: NIGHT, fontSize: 9, fontWeight: '800' },
});
