import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useStore, storeOf, cartTotal } from '../../store';
import { colors, brl, soft } from '../../theme';
import { SearchBar, GlobalResults } from '../../components/Search';
import { Screen, Photo, Badge, Row, Button, Input, ProductThumb, Chip, Card, Section, Empty } from '../../components/ui';
import { LaunchStrip } from '../../components/Launches';
import { useBack } from '../../back';
import { isFoodStore } from '../../data';
import { FOOD_FILTERS } from '../../foodData';
import { FoodHighlights } from './FoodHighlights';
import { ShopHero, CircleShortcuts, ShopHead, ShopProductCard as ProductCard, ShopGrid, StoreRow } from '../../components/ShopKit';

// Atalhos redondos da Loja (mesmo visual do Shop).
const CATEGORIES = [
  { key: 'Todos', label: 'Todos', ion: 'grid-outline', color: colors.primary },
  { key: 'Alimentação', label: 'Comida', ion: 'restaurant-outline', color: '#E8590C' },
  { key: 'Mercado', label: 'Mercado', ion: 'basket-outline', color: '#2E8B57' },
  { key: 'Roupas', label: 'Roupas', ion: 'shirt-outline', color: '#C2255C' },
  { key: 'Eletrônicos', label: 'Eletrônicos', ion: 'phone-portrait-outline', color: colors.accent },
];
// Atalhos redondos do Food.
const FOOD_COLORS = { todos: colors.primary, restaurantes: '#E8590C', bares: '#B7791F', doces: '#A0522D' };
const FOOD_SHORTCUTS = FOOD_FILTERS.map((f) => ({ key: f.key, label: f.key === 'doces' ? 'Doces e cafés' : f.label, ion: f.icon, color: FOOD_COLORS[f.key] }));

// Aba Food do cliente: a mesma loja, mas só com comida e bebida (restaurantes, bares, doces e cafés),
// com promoções de restaurantes e a interação com bares em destaque.
export function FoodScreen(props) {
  return <StoreScreen {...props} food />;
}

// Categoria vinda do menu ⋮ ou da busca → filtro da aba Food.
const foodFilterOf = (cat) => (cat === 'Bares' ? 'bares' : cat === 'Doces e cafés' ? 'doces' : cat === 'Alimentação' ? 'restaurantes' : 'todos');

export default function StoreScreen({ openVoice, goTo, explore, navigate, food }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(food ? 'todos' : 'Todos');
  const [searched, setSearched] = useState('');

  // Veio do menu ⋮ (ex.: Restaurantes → Pizzaria)
  useEffect(() => {
    if (!explore) return;
    if (explore.cat) setCat(food ? foodFilterOf(explore.cat) : explore.cat);
    if (explore.q !== undefined) setQ(explore.q);
  }, [explore]);
  const [openStore, setOpenStore] = useState(null);
  const [showCart, setShowCart] = useState(false);
  // Voltar do celular: fecha o carrinho / a loja aberta antes de sair da aba.
  useBack(!!openStore, () => setOpenStore(null));
  useBack(showCart, () => setShowCart(false));

  const add = (id) => dispatch({ type: 'ADD_TO_CART', productId: id });

  // Ordem da busca: patrocinadas primeiro, depois recomendadas, depois por nota.
  const rankedStores = useMemo(() => {
    const term = q.trim().toLowerCase();
    const foodCats = food ? (FOOD_FILTERS.find((f) => f.key === cat) || {}).cats : null;
    return state.stores
      .filter((s) => (food ? isFoodStore(s) && (!foodCats || foodCats.includes(s.category)) : cat === 'Todos' || s.category === cat))
      .filter(
        (s) =>
          !term ||
          s.name.toLowerCase().includes(term) ||
          state.products.some((p) => p.storeId === s.id && p.name.toLowerCase().includes(term))
      )
      .sort((a, b) => b.sponsored - a.sponsored || b.recommended - a.recommended || b.rating - a.rating);
  }, [state.stores, state.products, q, cat, food]);

  // Na aba Food só entram produtos de restaurantes, bares e cafés.
  const inScope = (p) => !food || isFoodStore(storeOf(state, p.storeId));
  const matchedProducts = q.trim()
    ? state.products.filter((p) => inScope(p) && p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const featured = state.products.filter((p) => p.featured && !food);
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);
  const total = cartTotal(state);

  const checkout = () => {
    if (total > state.wallet + state.giftCredits) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para concluir.');
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
          <Text style={styles.back}>‹ {food ? 'Voltar para o Food' : 'Voltar para a loja'}</Text>
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
            <Text style={{ color: colors.text, fontWeight: '700' }}>{brl(state.wallet)}</Text>
          </Row>
          {state.giftCredits > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>🎁 Créditos de presente (usados primeiro)</Text>
              <Text style={{ color: colors.success, fontWeight: '700' }}>− {brl(Math.min(state.giftCredits, total))}</Text>
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Total</Text>
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.primary }}>{brl(total)}</Text>
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
          <Text style={styles.back}>‹ {food ? 'Todos os restaurantes e bares' : 'Todas as lojas'}</Text>
        </TouchableOpacity>
        <Photo uri={s.cover} style={styles.cover} fallback={s.logo} />
        <Row style={{ marginTop: 12, marginBottom: 4 }}>
          <Text style={styles.h1}>
            {s.logo} {s.name}
          </Text>
        </Row>
        <Text style={{ color: colors.muted, marginBottom: 6 }}>
          {s.category} · {s.city} · <Text style={{ color: colors.accent, fontWeight: '700' }}>★ {s.rating}</Text>
        </Text>
        <TouchableOpacity style={styles.pageBtn} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: s.id })}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Ver página da empresa ›</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Apresentação, conteúdos, vídeos e seguir</Text>
        </TouchableOpacity>
        <Row style={{ marginBottom: 14 }}>
          <Badge label="CNPJ verificado" />
          {s.shipsBrazil ? <View style={{ marginLeft: 6 }}><Badge label="Envia para todo o Brasil" color={colors.accent} /></View> : null}
        </Row>
        <ShopGrid>
          {items.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={() => add(p.id)} />
          ))}
        </ShopGrid>
        {cartCount ? <CartBar count={cartCount} total={total} onPress={() => dispatch({ type: 'OPEN_CART' })} /> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <SearchBar
        value={q}
        onChangeText={(t) => {
          setQ(t);
          if (!t) setSearched('');
        }}
        onSubmit={setSearched}
        placeholder={food ? 'Buscar pizza, sushi, bar, café…' : 'Buscar produtos, lojas, restaurantes…'}
        voicePrompt={food ? 'O que você quer comer hoje?' : 'O que você quer comprar?'}
        style={{ marginBottom: 0 }}
      />
      <View style={{ height: 12 }} />
      {!q ? (food ? <ShopHero title="Food" sub="Promoções de restaurantes, bares e cafés perto de você" /> : <ShopHero title="Loja Realys" sub="Lojas verificadas, patrocinadas e recomendadas primeiro" />) : null}
      <CircleShortcuts items={food ? FOOD_SHORTCUTS : CATEGORIES} value={cat} onPress={setCat} />

      {matchedProducts.length ? (
        <>
          <ShopHead title={`Produtos para "${q}"`} />
          <ShopGrid>
            {matchedProducts.map((p) => (
              <ProductCard key={p.id} p={p} storeName={storeOf(state, p.storeId).name} onAdd={() => add(p.id)} />
            ))}
          </ShopGrid>
        </>
      ) : null}

      {searched && !matchedProducts.length && !rankedStores.length ? (
        <GlobalResults query={searched} navigate={navigate} title={food ? 'Não achei no Food, mas achei no Realys' : 'Não está na loja, mas achei no Realys'} />
      ) : null}

      {food && !q ? <FoodHighlights filter={cat} onOpenStore={setOpenStore} onAdd={add} /> : null}

      {!q && !food ? <LaunchStrip title="🚀 Lançamentos" /> : null}

      {!q && !food ? (
        <>
          <ShopHead title="Destaques para você" />
          <ShopGrid>
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} storeName={storeOf(state, p.storeId).name} onAdd={() => add(p.id)} />
            ))}
          </ShopGrid>
        </>
      ) : null}

      <ShopHead title={food ? 'Restaurantes, bares e cafés' : 'Lojas em destaque'} />
      {rankedStores.map((s) => (
        <StoreRow key={s.id} s={s} onPress={() => setOpenStore(s.id)} />
      ))}
      {!rankedStores.length ? <Empty text="Nada encontrado." /> : null}
      <View style={{ height: 10 }} />

      {cartCount ? <CartBar count={cartCount} total={total} onPress={() => dispatch({ type: 'OPEN_CART' })} /> : null}
    </Screen>
  );
}

function CartBar({ count, total, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.cartBar} activeOpacity={0.9}>
      <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>🛍️ Ver carrinho ({count})</Text>
      <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{brl(total)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pageBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 10, marginBottom: 10, backgroundColor: colors.primaryLight },
  h1: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
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
