// Comanda pelo app: o cliente que está no evento (com ingresso) ou no bar (com check-in) pede
// bebidas e comidas, paga pelo Realys e o caixa recebe "Mesa 12 · Fulano pediu…".
// Quem reservou mesa já está nela; quem não reservou pode dizer a mesa ou retirar no balcão.
// Abre com dispatch({ type: 'OPEN_VENUE' }). Na demonstração dá para ver o painel do caixa.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { MENUS } from '../venueData';

const NIGHT = '#0B1124';
const FLOW = ['Recebido no caixa', 'Preparando', 'A caminho da mesa', 'Entregue'];

export default function VenueSheet() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState({});
  const [tab, setTab] = useState('cardapio');
  const [tableText, setTableText] = useState('');
  const v = state.venue;
  useEffect(() => {
    setQty({});
    setTab('cardapio');
    setTableText('');
  }, [state.venueOpen]);
  if (!state.venueOpen || !v) return null;

  const close = () => dispatch({ type: 'CLOSE_VENUE' });
  const menu = MENUS[v.menu] || MENUS.bar;
  const cats = [...new Set(menu.map((m) => m.cat))];
  const items = menu.filter((m) => qty[m.id]).map((m) => ({ id: m.id, name: m.name, price: m.price, qty: qty[m.id] }));
  const total = items.reduce((x, it) => x + it.price * it.qty, 0);
  const mine = state.venueOrders.filter((o) => o.venueId === v.id);
  const feed = state.staffFeed.filter((f) => f.venueId === v.id);
  const add = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  const order = () => {
    if (!items.length) return;
    if (total > state.wallet + (state.giftCredits || 0)) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys na carteira para pedir.');
    const go = () => {
      dispatch({ type: 'VENUE_ORDER', items });
      setQty({});
      setTab('pedidos');
      Alert.alert('Pedido enviado ✅', v.table ? `O caixa de ${v.name} foi avisado: mesa ${v.table}. É só aguardar na mesa.` : `O caixa de ${v.name} foi avisado. Retire no balcão quando ficar pronto.`);
    };
    Alert.alert('Confirmar pedido', `${items.map((it) => `${it.qty}× ${it.name}`).join('\n')}\n\nTotal ${brl(total)} pelo Realys${v.table ? ` · mesa ${v.table}` : ' · retirar no balcão'}`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Pedir e pagar', onPress: go },
    ]);
  };

  const setTable = () => {
    const n = parseInt(tableText, 10);
    if (!n || n < 1 || n > 99) return Alert.alert('Mesa', 'Digite o número da mesa que está na placa.');
    dispatch({ type: 'VENUE_SET_TABLE', table: n });
    setTableText('');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="restaurant" size={17} color={colors.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title} numberOfLines={1}>{v.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{v.kind === 'evento' ? `Ingresso: ${v.title}` : 'Check-in feito'}</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Mesa */}
          <View style={styles.table}>
            <Ionicons name={v.table ? 'checkmark-circle' : 'help-circle-outline'} size={18} color={v.table ? '#7BE0B0' : colors.gold} />
            {v.table ? (
              <Text style={styles.tableText}>Você está na <Text style={{ color: colors.gold }}>mesa {v.table}</Text>. O pedido chega aqui.</Text>
            ) : (
              <>
                <Text style={[styles.tableText, { flex: 0 }]}>Mesa:</Text>
                <TextInput value={tableText} onChangeText={setTableText} placeholder="nº" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="number-pad" style={styles.tableInput} />
                <TouchableOpacity onPress={setTable} style={styles.tableBtn}>
                  <Text style={{ color: NIGHT, fontWeight: '800', fontSize: 12 }}>OK</Text>
                </TouchableOpacity>
                <Text style={[styles.tableText, { fontSize: 11, color: 'rgba(255,255,255,0.6)' }]}>ou retire no balcão</Text>
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row', marginVertical: 8 }}>
            {[['cardapio', 'Cardápio'], ['pedidos', `Meus pedidos${mine.length ? ` (${mine.length})` : ''}`], ['caixa', 'Caixa (demo)']].map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
                <Text style={[styles.tabText, tab === k && { color: '#FFFFFF' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {tab === 'cardapio'
              ? cats.map((c) => (
                  <View key={c}>
                    <Text style={styles.cat}>{c}</Text>
                    {menu.filter((m) => m.cat === c).map((m) => (
                      <View key={m.id} style={styles.item}>
                        <Text style={{ fontSize: 20, width: 30 }}>{m.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{m.name}</Text>
                          <Text style={styles.price}>{brl(m.price)}</Text>
                        </View>
                        {qty[m.id] ? (
                          <View style={styles.qty}>
                            <TouchableOpacity onPress={() => add(m.id, -1)} style={styles.qBtn} accessibilityLabel={`Tirar ${m.name}`}>
                              <Ionicons name="remove" size={15} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.qNum}>{qty[m.id]}</Text>
                            <TouchableOpacity onPress={() => add(m.id, 1)} style={styles.qBtn} accessibilityLabel={`Mais ${m.name}`}>
                              <Ionicons name="add" size={15} color={colors.text} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => add(m.id, 1)} style={styles.addBtn} accessibilityLabel={`Adicionar ${m.name}`}>
                            <Ionicons name="add" size={16} color={NIGHT} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ))
              : null}

            {tab === 'pedidos' ? (
              mine.length ? (
                mine.map((o) => (
                  <View key={o.id} style={styles.order}>
                    <Text style={styles.name}>{o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}</Text>
                    <Text style={styles.sub}>{o.table ? `Mesa ${o.table}` : 'Balcão'} · {brl(o.total)}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      {FLOW.map((s, i) => (
                        <View key={s} style={[styles.step, i <= FLOW.indexOf(o.status) && styles.stepOn]} />
                      ))}
                    </View>
                    <Text style={[styles.sub, { marginTop: 4, color: colors.primary, fontWeight: '700' }]}>{o.status}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.sub, { textAlign: 'center', paddingVertical: 20 }]}>Nenhum pedido ainda.</Text>
              )
            ) : null}

            {tab === 'caixa' ? (
              <>
                <Text style={[styles.sub, { marginBottom: 6 }]}>É o que o atendente do caixa de {v.name} recebe na hora. Na versão real chega no celular ou no sistema do estabelecimento.</Text>
                {feed.length ? (
                  feed.map((f) => {
                    const o = state.venueOrders.find((x) => x.id === f.orderId) || {};
                    const next = FLOW[FLOW.indexOf(o.status) + 1];
                    return (
                      <View key={f.id} style={styles.feed}>
                        <Ionicons name="notifications" size={16} color={colors.gold} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{f.text}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{brl(f.total)} · pago pelo Realys · {o.status}</Text>
                        </View>
                        {next ? (
                          <TouchableOpacity onPress={() => dispatch({ type: 'VENUE_ORDER_STATUS', id: o.id, status: next })} style={styles.feedBtn}>
                            <Text style={{ color: NIGHT, fontWeight: '800', fontSize: 11 }}>{next === 'Entregue' ? 'Entregar' : next.split(' ')[0]}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={[styles.sub, { textAlign: 'center', paddingVertical: 20 }]}>Nenhum aviso ainda. Faça um pedido para ver chegar aqui.</Text>
                )}
              </>
            ) : null}
          </ScrollView>

          {tab === 'cardapio' ? (
            <TouchableOpacity style={[styles.payBtn, !items.length && { opacity: 0.45 }]} onPress={order} disabled={!items.length}>
              <Ionicons name="flash" size={16} color={NIGHT} />
              <Text style={styles.payText}>{items.length ? `Pedir e pagar · ${brl(total)}` : 'Escolha o que vai pedir'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Sair do local?', 'A comanda fecha. Os pedidos já feitos continuam valendo.', [
                { text: 'Ficar', style: 'cancel' },
                { text: 'Sair', onPress: () => dispatch({ type: 'VENUE_LEAVE' }) },
              ])
            }
            style={{ alignItems: 'center', paddingTop: 10 }}
          >
            <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12 }}>Saí do local</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Marcador discreto no topo: "📍 Club Neon · Mesa 12". Tocar abre a comanda.
export function VenuePill({ style, textStyle }) {
  const { state, dispatch } = useStore();
  const v = state.venue;
  if (!v) return null;
  return (
    <TouchableOpacity onPress={() => dispatch({ type: 'OPEN_VENUE' })} style={style} accessibilityLabel={`Comanda de ${v.name}`}>
      <Ionicons name="restaurant-outline" size={12} color={colors.primary} />
      <Text style={textStyle} numberOfLines={1}>{v.name}{v.table ? ` · Mesa ${v.table}` : ''} · Pedir</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.45)' },
  sheet: { backgroundColor: '#FFFDF8', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: NIGHT, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  table: { flexDirection: 'row', alignItems: 'center', backgroundColor: NIGHT, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  tableText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8, flex: 1, fontSize: 13 },
  tableInput: { width: 48, height: 32, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(226,182,73,0.6)', color: '#FFFFFF', textAlign: 'center', fontWeight: '800', marginLeft: 8 },
  tableBtn: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 10, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', marginRight: 6 },
  tabOn: { backgroundColor: NIGHT, borderColor: NIGHT },
  tabText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  cat: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, marginBottom: 2 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontWeight: '700', color: colors.text },
  price: { color: colors.primary, fontWeight: '800', marginTop: 1 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  qty: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#FFFFFF', ...soft },
  qBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qNum: { minWidth: 18, textAlign: 'center', fontWeight: '800', color: colors.text },
  order: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, marginBottom: 8, ...soft },
  step: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border, marginRight: 4 },
  stepOn: { backgroundColor: colors.primary },
  feed: { flexDirection: 'row', alignItems: 'center', backgroundColor: NIGHT, borderRadius: 14, padding: 10, marginBottom: 8 },
  feedBtn: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, marginLeft: 6 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 13, marginTop: 10 },
  payText: { color: NIGHT, fontWeight: '800', marginLeft: 6, fontSize: 15 },
});
