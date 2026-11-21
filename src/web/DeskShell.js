// Site no computador (tela larga): o mesmo app, com cara de computador.
// Menu lateral à esquerda, as telas do app no centro e, à direita, os atalhos da Community (News, Eventos,
// Stream, Lives), carrinho, pedidos e a Lotus. Tudo claro, sem fundo preto. A carteira fica discreta:
// só um link, sem mostrar o saldo (quem estiver do lado não vê o seu dinheiro).
// No celular e no APK não aparece (useDesktop() é falso).
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import WalletScreen from '../screens/WalletScreen';
import { DESK_MIN, RAIL_MIN, CONTENT_MAX, realWidth } from '../webFrame';

// Avisa as janelas abertas (Modal no computador) para fecharem: a pessoa foi para outra área pelo menu.
const deskNav = (fn) => (...args) => {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rz-desk-nav'));
  } catch (e) {}
  return fn && fn(...args);
};

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

// O seu story no topo do menu lateral, sempre à vista: tocar na foto vê o seu story (ou cria, se ainda
// não tem); o "+" abre publicar (post, Reel, story ou depoimento).
function MyStory({ onGo }) {
  const { state } = useStore();
  const name = (state.user && state.user.name) || 'Você';
  const last = state.myStories && state.myStories.length ? state.myStories[state.myStories.length - 1] : null;
  const photo = (state.myProfile && state.myProfile.photo) || (last && last.image) || null;
  return (
    <View style={st.myStory}>
      <TouchableOpacity onPress={() => onGo && onGo({ tab: 'stories', top: 'comunidade', story: 'mine' })} activeOpacity={0.85} accessibilityLabel={last ? 'Ver o seu story' : 'Criar o seu story'}>
        <View style={st.myRing}>
          {photo ? (
            <Image source={{ uri: photo }} style={st.myImg} />
          ) : (
            <View style={[st.myImg, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 24 }}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onGo && onGo({ tab: 'stories', top: 'comunidade', story: 'add' })} style={st.myPlus} accessibilityLabel="Publicar: post, Reel, story ou depoimento">
        <Ionicons name="add" size={18} color="#fff" />
      </TouchableOpacity>
      <Text style={st.myLabel} numberOfLines={1}>Seu story</Text>
    </View>
  );
}

function Side({ tabs, currentKey, onTab, onLotus, onMenu, onProfile, profileOn, userName, onGo }) {
  return (
    <View style={st.side}>
      <MyStory onGo={onGo} />
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

// Atalhos da Community, que no computador saem de baixo dos stories e vêm para cá.
const SHORTCUTS = [
  { top: 'comunidade', label: 'Feed da Community', icon: 'people-circle-outline' },
  { top: 'noticias', label: 'News', icon: 'newspaper-outline' },
  { top: 'eventos', label: 'Eventos', icon: 'sparkles-outline' },
  { top: 'stream', label: 'Stream', icon: 'tv-outline' },
  { top: 'lives', label: 'Lives', icon: 'radio-outline', red: true },
];

function Rail({ onOrders, onLotus, onGo, commTop, currentKey }) {
  const { state, dispatch } = useStore();
  const [wallet, setWallet] = useState(false);
  const count = state.cart.reduce((n, c) => n + c.qty, 0);
  const last = state.orders.slice(0, 3);
  return (
    <ScrollView style={st.rail} contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
      <View style={st.box}>
        {SHORTCUTS.map((t) => {
          const on = currentKey === 'stories' && commTop === t.top;
          const red = t.red ? '#E5484D' : null;
          return (
            <TouchableOpacity key={t.top} onPress={() => onGo && onGo({ tab: 'stories', top: t.top })} style={[st.short, on && st.itemOn]} accessibilityLabel={t.label} accessibilityState={{ selected: on }}>
              <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={20} color={red || (on ? colors.primary : colors.text)} />
              <Text numberOfLines={1} style={[st.shortText, red && { color: red }, on && { fontWeight: '800', color: red || colors.primary }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Carteira (dourada, sem mostrar o saldo) e, ao lado, um botãozinho para o carrinho. */}
      <View style={[st.box, st.walletRow]}>
        <TouchableOpacity onPress={() => setWallet(true)} style={st.walletBtn} accessibilityLabel="Abrir a carteira">
          <Ionicons name="wallet" size={18} color={colors.gold} />
          <Text style={st.walletGold}>Carteira</Text>
          <Ionicons name="eye-off-outline" size={14} color={colors.gold} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => dispatch({ type: 'OPEN_CART' })} style={st.cartBtn} accessibilityLabel={count ? `Abrir o carrinho: ${count} ${count === 1 ? 'item' : 'itens'}` : 'Abrir o carrinho'}>
          <Ionicons name="cart-outline" size={18} color={colors.text} />
          {count ? (
            <View style={st.cartBadge}>
              <Text style={st.cartBadgeText}>{count > 9 ? '9+' : count}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={st.box}>
        <Text style={st.boxLabel}>Pedidos recentes</Text>
        {last.length ? (
          last.map((o) => (
            <TouchableOpacity key={o.id} onPress={onOrders} style={st.order} accessibilityLabel={`Pedido em ${o.store}`}>
              <Text numberOfLines={1} style={st.orderName}>{o.store}</Text>
              <Text style={st.small}>{o.status}</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Image source={require('../../assets/lotus/fab_1.webp')} style={{ width: 30, height: 30, marginRight: 8 }} />
          <Text style={st.lotusBig}>Diga Lotus.</Text>
        </View>
        <Text style={st.small}>Peça um eletricista, uma pizza ou o perfil de alguém. Ela mostra as opções e só confirma quando você mandar.</Text>
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
  const nav = { ...p, onTab: deskNav(p.onTab), onMenu: deskNav(p.onMenu), onProfile: deskNav(p.onProfile), onGo: deskNav(p.onGo), onOrders: deskNav(p.onOrders) };
  return (
    <View style={st.page}>
      <Side {...nav} />
      <View style={st.center}>
        <View style={st.column}>{children}</View>
      </View>
      {rail ? <Rail onOrders={nav.onOrders} onLotus={p.onLotus} onGo={nav.onGo} commTop={p.commTop} currentKey={p.currentKey} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', backgroundColor: '#F1EBDD' },
  side: { width: 248, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 22, paddingHorizontal: 14, paddingBottom: 16 },
  myStory: { alignSelf: 'center', alignItems: 'center', marginBottom: 18 },
  myRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  myImg: { width: 72, height: 72, borderRadius: 36 },
  myPlus: { position: 'absolute', right: -2, top: 58, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  myLabel: { marginTop: 6, color: colors.primary, fontWeight: '800', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, marginBottom: 2 },
  itemOn: { backgroundColor: '#F6EDD6' },
  itemText: { marginLeft: 14, fontSize: 16, color: colors.text, fontWeight: '600' },
  itemTextOn: { color: colors.primary, fontWeight: '800' },
  lotus: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E4', borderWidth: 1, borderColor: '#EAD7A4', borderRadius: 16, padding: 12, marginTop: 8 },
  lotusTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  lotusSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  user: { color: colors.muted, fontSize: 12.5, marginTop: 12, marginLeft: 6 },
  center: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: CONTENT_MAX, backgroundColor: colors.bg, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  rail: { width: 340, flexGrow: 0, borderLeftWidth: 1, borderLeftColor: colors.border },
  box: { backgroundColor: colors.bg, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  boxLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  big: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  small: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  linkBtn: { marginTop: 10 },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  goldBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  goldText: { color: colors.onPrimary, fontWeight: '800' },
  order: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  orderName: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
  lotusBox: { backgroundColor: '#FFF8E4', borderColor: '#EAD7A4' },
  lotusBig: { color: '#B8860B', fontSize: 22, fontWeight: '800' },
  short: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12 },
  shortText: { marginLeft: 12, fontSize: 15, color: colors.text, fontWeight: '600' },
  walletRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  walletGold: { color: colors.gold, fontWeight: '800', fontSize: 15, marginLeft: 8 },
  cartBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  walletLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 },
  walletText: { color: colors.muted, fontSize: 13, fontWeight: '600', marginLeft: 6, marginRight: 6 },
});
