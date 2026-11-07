import { askPix } from '../../components/PixPay';
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
import { SegTabs, SpotlightCarousel, ClipStrip, PromoSector } from '../../components/AdKit';
import {
  FOOD_SPOTLIGHT, FOOD_CLIPS, FOOD_FLASH, FOOD_COUPONS, FOOD_COMBOS,
  MERCADO_SPOTLIGHT, MERCADO_CLIPS, MERCADO_FLASH, MERCADO_COUPONS, MERCADO_COMBOS, MERCADO_AISLES,
} from '../../adsData';

// Promoções do Food juntam as dos restaurantes e as do Mercado.
const ALL_FOOD_FLASH = [...FOOD_FLASH, ...MERCADO_FLASH];
const ALL_FOOD_COUPONS = [...FOOD_COUPONS, ...MERCADO_COUPONS];
const ALL_FOOD_COMBOS = [...FOOD_COMBOS, ...MERCADO_COMBOS];

// Abas internas do Food: Cardápio (restaurantes, bares e cafés), Mercado e o setor de Promoções.
const FOOD_SEGS = [
  { key: 'cardapio', label: 'Cardápio', icon: 'restaurant-outline' },
  { key: 'mercado', label: 'Mercado', icon: 'basket-outline' },
  { key: 'promo', label: 'Promoções', icon: 'flame-outline', hot: true, badge: ALL_FOOD_FLASH.length },
];
const isMarket = (s) => !!s && s.category === 'Mercado';

// Atalhos redondos da Loja (mesmo visual do Shop).
// Comida e mercado não entram na Loja: ficam no Food.
const CATEGORIES = [
  { key: 'Todos', label: 'Todos', ion: 'grid-outline', color: colors.primary },
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
  const [seg, setSeg] = useState('cardapio');

  // Veio do menu ⋮ (ex.: Restaurantes → Pizzaria)
  useEffect(() => {
    if (!explore) return;
    if (explore.cat) setCat(food ? foodFilterOf(explore.cat) : explore.cat);
    if (explore.q !== undefined) setQ(explore.q);
    if (food) setSeg(explore.cat === 'Mercado' ? 'mercado' : explore.seg || 'cardapio');
  }, [explore]);
  const [openStore, setOpenStore] = useState(null);
  const [showCart, setShowCart] = useState(false);
  // Voltar do celular: fecha o carrinho / a loja aberta antes de sair da aba.
  useBack(!!openStore, () => setOpenStore(null));
  useBack(showCart, () => setShowCart(false));
  useBack(!!food && seg !== 'cardapio' && !openStore, () => setSeg('cardapio'));

  const add = (id) => dispatch({ type: 'ADD_TO_CART', productId: id });
  // Toque no anúncio da vitrine do Food: abre o cardápio ou já põe o prato no carrinho.
  const openAd = (ad) => {
    const p = state.products.find((x) => x.id === ad.productId);
    const s = storeOf(state, ad.storeId) || {};
    Alert.alert(ad.title, `${s.name}${p ? `\n${p.name} · ${brl(p.price)}` : ''}\n\n${ad.sub}`, [
      { text: 'Ver cardápio', onPress: () => setOpenStore(ad.storeId) },
      p ? { text: 'Pedir', onPress: () => add(p.id) } : { text: 'OK' },
    ]);
  };

  // Ordem da busca: patrocinadas primeiro, depois recomendadas, depois por nota.
  const rankedStores = useMemo(() => {
    const term = q.trim().toLowerCase();
    const foodCats = food ? (FOOD_FILTERS.find((f) => f.key === cat) || {}).cats : null;
    return state.stores
      .filter((s) =>
        food
          ? isFoodStore(s) && (!foodCats || foodCats.includes(s.category)) && (term || !isMarket(s))
          : !isFoodStore(s) && (cat === 'Todos' || s.category === cat)
      )
      .filter(
        (s) =>
          !term ||
          s.name.toLowerCase().includes(term) ||
          state.products.some((p) => p.storeId === s.id && p.name.toLowerCase().includes(term))
      )
      .sort((a, b) => b.sponsored - a.sponsored || b.recommended - a.recommended || b.rating - a.rating);
  }, [state.stores, state.products, q, cat, food]);

  // Na aba Food só entram produtos de restaurantes, bares e cafés.
  // No Shop/Loja, nada de comida.
  const inScope = (p) => (food ? isFoodStore(storeOf(state, p.storeId)) : !isFoodStore(storeOf(state, p.storeId)));
  const matchedProducts = q.trim()
    ? state.products.filter((p) => inScope(p) && p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const featured = state.products.filter((p) => p.featured && !food && inScope(p));
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);
  const total = cartTotal(state);

  const checkout = () => {
    const avail = state.wallet + state.giftCredits;
    if (total > avail) return askPix({ amount: total, available: avail, label: 'Carrinho', onPaid: finish });
    finish();
  };
  const finish = () => {
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

  if (food && seg === 'promo') {
    return (
      <Screen>
        <SegTabs items={FOOD_SEGS} value={seg} onChange={setSeg} />
        <PromoSector food flash={ALL_FOOD_FLASH} coupons={ALL_FOOD_COUPONS} combos={ALL_FOOD_COMBOS} onOpenStore={setOpenStore} />
        <FoodHighlights filter="todos" only="promos" onOpenStore={setOpenStore} onAdd={add} />
        {cartCount ? <CartBar count={cartCount} total={total} onPress={() => dispatch({ type: 'OPEN_CART' })} /> : null}
      </Screen>
    );
  }

  if (food && seg === 'mercado') {
    return (
      <Screen>
        <SegTabs items={FOOD_SEGS} value={seg} onChange={setSeg} />
        <MarketTab onOpenStore={setOpenStore} onAdd={add} onPromos={() => setSeg('promo')} />
        {cartCount ? <CartBar count={cartCount} total={total} onPress={() => dispatch({ type: 'OPEN_CART' })} /> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      {food ? <SegTabs items={FOOD_SEGS} value={seg} onChange={setSeg} /> : null}
      <SearchBar
        value={q}
        onChangeText={(t) => {
          setQ(t);
          if (!t) setSearched('');
        }}
        onSubmit={setSearched}
        placeholder={food ? 'Buscar pizza, sushi, bar, café…' : 'Buscar produtos e lojas…'}
        voicePrompt={food ? 'O que você quer comer hoje?' : 'O que você quer comprar?'}
        style={{ marginBottom: 0 }}
      />
      <View style={{ height: 12 }} />
      {food && !q ? <SpotlightCarousel ads={FOOD_SPOTLIGHT} onOpen={openAd} /> : null}
      {!q ? (food ? <ShopHero title="Food" sub="Restaurantes, bares e cafés perto de você" /> : <ShopHero title="Loja Realys" sub="Lojas verificadas, patrocinadas e recomendadas primeiro" />) : null}
      <CircleShortcuts items={food ? FOOD_SHORTCUTS : CATEGORIES} value={cat} onPress={setCat} />
      {food && !q ? <ClipStrip title="🎬 Clipes da cozinha" clips={FOOD_CLIPS} food /> : null}
      {food && !q ? (
        <TouchableOpacity style={styles.promoTeaser} activeOpacity={0.9} onPress={() => setSeg('promo')}>
          <Text style={{ fontSize: 18 }}>🔥</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: '#0B1124', fontWeight: '800' }}>Promoções dos restaurantes</Text>
            <Text style={{ color: 'rgba(11,17,36,0.7)', fontSize: 12 }}>Ofertas relâmpago, cupons e combos · até 40% off</Text>
          </View>
          <Text style={{ color: '#0B1124', fontWeight: '800', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ) : null}

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

      {!q && !food ? <LaunchStrip title="🚀 Lançamentos" only={inScope} /> : null}

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

// Aba Mercado do Food: compras do dia e do mês (mercearia, café, laticínios), com a
// publicidade paga dos mercados, ofertas e a cesta da semana.
function MarketTab({ onOpenStore, onAdd, onPromos }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [aisle, setAisle] = useState('todos');
  const markets = state.stores.filter(isMarket).sort((a, b) => b.sponsored - a.sponsored || b.rating - a.rating);
  const ids = markets.map((m) => m.id);
  const term = q.trim().toLowerCase();
  const a = MERCADO_AISLES.find((x) => x.key === aisle) || {};
  const list = state.products
    .filter((p) => ids.includes(p.storeId))
    .filter((p) => !a.words || a.words.some((w) => p.name.toLowerCase().includes(w)))
    .filter((p) => !term || p.name.toLowerCase().includes(term));
  const openAd = (ad) => {
    const p = state.products.find((x) => x.id === ad.productId);
    const s = storeOf(state, ad.storeId) || {};
    Alert.alert(ad.title, `${s.name}${p ? `\n${p.name} · ${brl(p.price)}` : ''}\n\n${ad.sub}`, [
      { text: 'Ver mercado', onPress: () => onOpenStore(ad.storeId) },
      p ? { text: 'Pôr no carrinho', onPress: () => onAdd(p.id) } : { text: 'OK' },
    ]);
  };
  return (
    <View>
      <SearchBar value={q} onChangeText={setQ} onSubmit={setQ} placeholder="Buscar arroz, café, leite…" voicePrompt="O que você quer do mercado?" style={{ marginBottom: 12 }} />
      {!term ? <SpotlightCarousel ads={MERCADO_SPOTLIGHT} onOpen={openAd} /> : null}
      {!term ? <ShopHero title="Mercado" sub="Compras do dia e do mês, entregues por motoboy do Realys" icon="basket-outline" /> : null}
      <CircleShortcuts items={MERCADO_AISLES} value={aisle} onPress={setAisle} />
      {!term ? <ClipStrip title="🎬 Clipes do mercado" clips={MERCADO_CLIPS} food /> : null}
      {!term ? (
        <TouchableOpacity style={styles.promoTeaser} activeOpacity={0.9} onPress={onPromos}>
          <Text style={{ fontSize: 18 }}>🧺</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: '#0B1124', fontWeight: '800' }}>Ofertas do mercado e cesta da semana</Text>
            <Text style={{ color: 'rgba(11,17,36,0.7)', fontSize: 12 }}>Leve 4, pague 3 · cupom de R$ 8</Text>
          </View>
          <Text style={{ color: '#0B1124', fontWeight: '800', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ) : null}
      <ShopHead title={term ? `Produtos para "${q.trim()}"` : a.key === 'todos' ? 'Produtos do mercado' : a.label} />
      <ShopGrid>
        {list.map((p) => (
          <ProductCard key={p.id} p={p} storeName={(storeOf(state, p.storeId) || {}).name} onAdd={() => onAdd(p.id)} onPress={() => onOpenStore(p.storeId)} />
        ))}
      </ShopGrid>
      {!list.length ? <Empty text="Nada encontrado no mercado." /> : null}
      <ShopHead title="Mercados perto de você" />
      {markets.map((m) => (
        <StoreRow key={m.id} s={m} onPress={() => onOpenStore(m.id)} />
      ))}
      <View style={{ height: 10 }} />
    </View>
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
  promoTeaser: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2B649', borderRadius: 16, padding: 12, marginBottom: 16 },
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
