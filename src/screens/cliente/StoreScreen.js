import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useStore, storeOf, cartTotal } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Photo, Badge, Row, Button, Input, ProductThumb, Chip, Card, Section, Empty } from '../../components/ui';

const CATEGORIES = ['Todos', 'Alimentação', 'Mercado', 'Roupas', 'Eletrônicos'];

function ProductCard({ p, onAdd, storeName, style }) {
  return (
    <View style={[styles.pCard, style]}>
      <ProductThumb product={p} size={96} />
      <Text numberOfLines={2} style={styles.pName}>
        {p.name}
      </Text>
      {storeName ? <Text style={styles.pStore}>{storeName}</Text> : null}
      <Text style={styles.pPrice}>{brl(p.price)}</Text>
      {p.stock > 0 ? (
        <Button small title="+ Carrinho" onPress={onAdd} />
      ) : (
        <Badge label="Esgotado" color={colors.danger} />
      )}
    </View>
  );
}

export default function StoreScreen({ openVoice, goTo, explore }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todos');

  // Veio do menu ⋮ (ex.: Restaurantes → Pizzaria)
  useEffect(() => {
    if (!explore) return;
    if (explore.cat) setCat(explore.cat);
    if (explore.q !== undefined) setQ(explore.q);
  }, [explore]);
  const [openStore, setOpenStore] = useState(null);
  const [showCart, setShowCart] = useState(false);

  const add = (id) => dispatch({ type: 'ADD_TO_CART', productId: id });

  // Ordem da busca: patrocinadas primeiro, depois recomendadas, depois por nota.
  const rankedStores = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.stores
      .filter((s) => cat === 'Todos' || s.category === cat)
      .filter(
        (s) =>
          !term ||
          s.name.toLowerCase().includes(term) ||
          state.products.some((p) => p.storeId === s.id && p.name.toLowerCase().includes(term))
      )
      .sort((a, b) => b.sponsored - a.sponsored || b.recommended - a.recommended || b.rating - a.rating);
  }, [state.stores, state.products, q, cat]);

  const matchedProducts = q.trim()
    ? state.products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const featured = state.products.filter((p) => p.featured);
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);
  const total = cartTotal(state);

  const checkout = () => {
    if (total > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para concluir.');
    dispatch({ type: 'CHECKOUT' });
    setShowCart(false);
    Alert.alert(
      'Pedido confirmado! ✅',
      'Pagamento protegido: o valor fica retido pelo Realys e só é liberado para a loja quando você confirmar a entrega.',
      [{ text: 'Ver pedidos', onPress: () => goTo('pedidos') }, { text: 'OK' }]
    );
  };

  if (showCart) {
    return (
      <Screen>
        <TouchableOpacity onPress={() => setShowCart(false)}>
          <Text style={styles.back}>‹ Voltar para a loja</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Seu carrinho</Text>
        {state.cart.length === 0 ? <Empty text="Carrinho vazio." /> : null}
        {state.cart.map((c) => {
          const p = state.products.find((x) => x.id === c.productId);
          return (
            <Card key={c.productId}>
              <Row>
                <ProductThumb product={p} size={52} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{p.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{storeOf(state, p.storeId).name}</Text>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {c.qty} × {brl(p.price)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_FROM_CART', productId: p.id })}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>Remover</Text>
                </TouchableOpacity>
              </Row>
            </Card>
          );
        })}
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.muted }}>Seu saldo Realys</Text>
            <Text style={{ fontWeight: '700' }}>{brl(state.wallet)}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>Total</Text>
            <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary }}>{brl(total)}</Text>
          </Row>
        </Card>
        <Button title="Pagar com saldo Realys" onPress={checkout} disabled={!state.cart.length} />
      </Screen>
    );
  }

  if (openStore) {
    const s = storeOf(state, openStore);
    const items = state.products.filter((p) => p.storeId === s.id);
    return (
      <Screen>
        <TouchableOpacity onPress={() => setOpenStore(null)}>
          <Text style={styles.back}>‹ Todas as lojas</Text>
        </TouchableOpacity>
        <Photo uri={s.cover} style={styles.cover} fallback={s.logo} />
        <Row style={{ marginTop: 12, marginBottom: 4 }}>
          <Text style={styles.h1}>
            {s.logo} {s.name}
          </Text>
        </Row>
        <Text style={{ color: colors.muted, marginBottom: 6 }}>
          {s.category} · {s.city} · ⭐ {s.rating}
        </Text>
        <Row style={{ marginBottom: 14 }}>
          <Badge label="CNPJ verificado" />
          {s.shipsBrazil ? <View style={{ marginLeft: 6 }}><Badge label="Envia para todo o Brasil" color={colors.accent} /></View> : null}
        </Row>
        <View style={styles.grid}>
          {items.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={() => add(p.id)} />
          ))}
        </View>
        {cartCount ? <CartBar count={cartCount} total={total} onPress={() => setShowCart(true)} /> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <Row>
        <Input
          placeholder="Buscar produtos, lojas, restaurantes…"
          value={q}
          onChangeText={setQ}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <TouchableOpacity style={styles.mic} onPress={openVoice}>
          <Text style={{ fontSize: 20 }}>🎙️</Text>
        </TouchableOpacity>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>

      {matchedProducts.length ? (
        <Section title={`Produtos para "${q}"`}>
          <View style={styles.grid}>
            {matchedProducts.map((p) => (
              <ProductCard key={p.id} p={p} storeName={storeOf(state, p.storeId).name} onAdd={() => add(p.id)} />
            ))}
          </View>
        </Section>
      ) : null}

      {!q ? (
        <Section title="⭐ Destaques da semana">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                style={{ width: 150, marginRight: 10 }}
                storeName={storeOf(state, p.storeId).name}
                onAdd={() => add(p.id)}
              />
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Section title="Lojas e restaurantes">
        {rankedStores.map((s) => (
          <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => setOpenStore(s.id)} style={styles.storeCard}>
            <Photo uri={s.cover} style={styles.storeImg} fallback={s.logo} />
            <View style={{ padding: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.storeName}>
                  {s.logo} {s.name}
                </Text>
                <Text style={{ fontWeight: '700' }}>⭐ {s.rating}</Text>
              </Row>
              <Text style={{ color: colors.muted, fontSize: 12, marginVertical: 4 }}>
                {s.category} · {s.city}
              </Text>
              <Row>
                {s.sponsored ? <Badge label="Patrocinado" color={colors.sponsored} /> : null}
                {s.recommended ? <View style={{ marginLeft: s.sponsored ? 6 : 0 }}><Badge label="Recomendado" /></View> : null}
                {s.shipsBrazil ? <View style={{ marginLeft: 6 }}><Badge label="Envia p/ todo Brasil" color={colors.accent} /></View> : null}
              </Row>
            </View>
          </TouchableOpacity>
        ))}
        {!rankedStores.length ? <Empty text="Nada encontrado." /> : null}
      </Section>

      {cartCount ? <CartBar count={cartCount} total={total} onPress={() => setShowCart(true)} /> : null}
    </Screen>
  );
}

function CartBar({ count, total, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.cartBar} activeOpacity={0.9}>
      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>🛍️ Ver carrinho ({count})</Text>
      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{brl(total)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  back: { color: colors.primary, fontWeight: '700', marginBottom: 10, fontSize: 15 },
  mic: {
    width: 48,
    height: 46,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: '48.5%',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  pName: { fontWeight: '600', color: colors.text, marginTop: 8, minHeight: 36 },
  pStore: { fontSize: 11, color: colors.muted },
  pPrice: { fontWeight: '800', color: colors.primary, fontSize: 16, marginVertical: 6 },
  storeCard: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  storeImg: { width: '100%', height: 130 },
  storeName: { fontWeight: '800', fontSize: 16, color: colors.text },
  cover: { width: '100%', height: 170, borderRadius: 16 },
  cartBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 14,
    marginTop: 6,
  },
});
