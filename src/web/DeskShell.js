// Site no computador (tela larga): o mesmo app, com cara de computador.
// Menu lateral à esquerda, as telas do app no centro e, à direita, carteira, carrinho, pedidos e a Lotus.
// No celular e no APK não aparece (useDesktop() é falso).
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { useStore, cartTotal } from '../store';
import { colors, brl } from '../theme';
import WalletScreen from '../screens/WalletScreen';
import { DESK_MIN, RAIL_MIN, CONTENT_MAX, realWidth } from '../webFrame';

export function useDesktop() {
  const [w, setW] = useState(realWidth());
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const on = () => setW(realWidth());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { desk: Platform.OS === 'web' && w >= DESK_MIN, rail: Platform.OS === 'web' && w >= RAIL_MIN };
}

function Side({ tabs, currentKey, onTab, onLotus, onMenu, onProfile, profileOn, userName }) {
  return (
    <View style={st.side}>
      <Image source={require('../../assets/wordmark-escuro.png')} style={st.mark} resizeMode="contain" accessibilityLabel="Realyz" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {tabs.map((t) => {
          const on = t.key === currentKey;
          return (
            <TouchableOpacity key={t.key} onPress={() => onTab(t)} style={[st.item, on && st.itemOn]} accessibilityLabel={t.label} accessibilityState={{ selected: on }}>
              <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={22} color={on ? colors.primary : colors.text} />
              <Text numberOfLines={1} style={[st.itemText, on && st.itemTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={onProfile} style={[st.item, profileOn && st.itemOn]} accessibilityLabel="Perfil">
          <Ionicons name={profileOn ? 'person-circle' : 'person-circle-outline'} size={22} color={profileOn ? colors.primary : colors.text} />
          <Text numberOfLines={1} style={[st.itemText, profileOn && st.itemTextOn]}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenu} style={st.item} accessibilityLabel="Explorar o Realyz: todas as áreas">
          <Ionicons name="grid-outline" size={22} color={colors.text} />
          <Text numberOfLines={1} style={st.itemText}>Explorar</Text>
        </TouchableOpacity>
      </ScrollView>
      <TouchableOpacity onPress={onLotus} style={st.lotus} accessibilityLabel="Falar com a Lotus">
        <Image source={require('../../assets/lotus/fab_1.webp')} style={{ width: 34, height: 34 }} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={st.lotusTitle}>Falar com a Lotus</Text>
          <Text style={st.lotusSub} numberOfLines={1}>Peça o que precisar</Text>
        </View>
      </TouchableOpacity>
      <Text style={st.user} numberOfLines={1}>{userName}</Text>
    </View>
  );
}

function Rail({ onOrders, onLotus }) {
  const { state, dispatch } = useStore();
  const [wallet, setWallet] = useState(false);
  const count = state.cart.reduce((n, c) => n + c.qty, 0);
  const last = state.orders.slice(0, 3);
  return (
    <ScrollView style={st.rail} contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
      <View style={st.box}>
        <Text style={st.boxLabel}>Carteira</Text>
        <Text style={st.money}>{brl((state.wallet || 0) + (state.giftCredits || 0))}</Text>
        {state.giftCredits ? <Text style={st.small}>{brl(state.giftCredits)} em créditos de presente</Text> : null}
        <TouchableOpacity onPress={() => setWallet(true)} style={st.linkBtn} accessibilityLabel="Abrir a carteira">
          <Text style={st.linkText}>Depositar, sacar e ver o extrato</Text>
        </TouchableOpacity>
      </View>

      <View style={st.box}>
        <Text style={st.boxLabel}>Carrinho</Text>
        {count ? (
          <>
            <Text style={st.big}>{count} {count === 1 ? 'item' : 'itens'} · {brl(cartTotal(state))}</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'OPEN_CART' })} style={st.goldBtn} accessibilityLabel="Abrir o carrinho">
              <Text style={st.goldText}>Ver carrinho e pagar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={st.small}>Vazio. Os produtos que você escolher no Shop e no Food aparecem aqui.</Text>
        )}
      </View>

      <View style={st.box}>
        <Text style={st.boxLabel}>Pedidos recentes</Text>
        {last.length ? (
          last.map((o) => (
            <TouchableOpacity key={o.id} onPress={onOrders} style={st.order} accessibilityLabel={`Pedido em ${o.store}`}>
              <Text numberOfLines={1} style={st.orderName}>{o.store}</Text>
              <Text style={st.small}>{o.status} · {brl(o.total)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={st.small}>Nenhum pedido ainda.</Text>
        )}
        <TouchableOpacity onPress={onOrders} style={st.linkBtn}>
          <Text style={st.linkText}>Ver todos os pedidos</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onLotus} style={[st.box, st.lotusBox]} accessibilityLabel="Falar com a Lotus">
        <Text style={st.lotusBig}>Diga Lotus.</Text>
        <Text style={[st.small, { color: 'rgba(251,248,241,0.75)' }]}>Peça um eletricista, uma pizza ou o perfil de alguém. Ela mostra as opções e só confirma quando você mandar.</Text>
      </TouchableOpacity>
      <WalletScreen visible={wallet} onClose={() => setWallet(false)} />
    </ScrollView>
  );
}

// Moldura do computador: menu | tela do app | coluna da direita.
export default function DeskShell({ desk, rail, children, ...p }) {
  if (!desk) {
    if (Platform.OS !== 'web') return children;
    // Navegador estreito (tablet): as telas do app numa coluna central.
    return (
      <View style={[st.center, { backgroundColor: '#F1EBDD' }]}>
        <View style={st.column}>{children}</View>
      </View>
    );
  }
  return (
    <View style={st.page}>
      <Side {...p} />
      <View style={st.center}>
        <View style={st.column}>{children}</View>
      </View>
      {rail ? <Rail onOrders={p.onOrders} onLotus={p.onLotus} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', backgroundColor: '#F1EBDD' },
  side: { width: 248, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 22, paddingHorizontal: 14, paddingBottom: 16 },
  mark: { width: 150, height: 46, marginLeft: 8, marginBottom: 22 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, marginBottom: 2 },
  itemOn: { backgroundColor: '#F6EDD6' },
  itemText: { marginLeft: 14, fontSize: 16, color: colors.text, fontWeight: '600' },
  itemTextOn: { color: colors.primary, fontWeight: '800' },
  lotus: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 16, padding: 12, marginTop: 8 },
  lotusTitle: { color: '#FBF8F1', fontWeight: '800', fontSize: 14 },
  lotusSub: { color: 'rgba(251,248,241,0.65)', fontSize: 12, marginTop: 1 },
  user: { color: colors.muted, fontSize: 12.5, marginTop: 12, marginLeft: 6 },
  center: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: CONTENT_MAX, backgroundColor: colors.bg, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  rail: { width: 340, flexGrow: 0, borderLeftWidth: 1, borderLeftColor: colors.border },
  box: { backgroundColor: colors.bg, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  boxLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  money: { color: colors.text, fontSize: 30, fontWeight: '800' },
  big: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  small: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  linkBtn: { marginTop: 10 },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  goldBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  goldText: { color: colors.onPrimary, fontWeight: '800' },
  order: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  orderName: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
  lotusBox: { backgroundColor: '#000', borderColor: '#000' },
  lotusBig: { color: '#F2C14E', fontSize: 24, fontWeight: '800', marginBottom: 6 },
});
