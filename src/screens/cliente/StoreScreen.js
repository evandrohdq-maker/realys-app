import { askPix } from '../../components/PixPay';
import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf, cartTotal } from '../../store';
import { colors, brl, soft } from '../../theme';
import { SearchBar, GlobalResults } from '../../components/Search';
import { Screen, Photo, Badge, Row, Button, Input, ProductThumb, Chip, Card, Section, Empty } from '../../components/ui';
import { LaunchStrip } from '../../components/Launches';
import { useBack } from '../../back';
import { isFoodStore } from '../../data';
import { GROCERY_GROUPS, GROCERY_SECTIONS, sectionOf } from '../../grocerySections';
import { classifyFood, FOOD_CLASSES, MODOS, classeByKey, FOOD_MODES, FOOD_TIPOS, productInMode, storeInMode, storeReserves } from '../../foodClasses';
import { freeTable } from '../../venueData';
import FoodClassPicker from '../../components/FoodClassPicker';
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
// Food: duas classes (Delivery e Reservas). Restaurantes, Bares e Doces e cafés viraram subclasses
// (as pílulas logo abaixo) e os tipos de prato continuam no seletor "O que vai ser hoje?".
const FOOD_COPY = {
  delivery: { title: 'Bateu a fome? Pede aí', hint: 'Pizza, sushi, burger, doce… escolhe e chega na sua porta', list: 'Entregam pra você', empty: 'Ninguém entregando isso agora. Tenta outra opção.' },
  reservas: { title: 'Bora sair hoje?', hint: 'Rodízio, chope, café… escolhe o rolê e garante a mesa', list: 'Garanta a sua mesa', empty: 'Nenhum lugar com reserva pra isso agora. Tenta outra opção.' },
};

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
  // Filtro de classe/subclasse do Food: { classe, subclasse } ou null (Tudo).
  const [foodCls, setFoodCls] = useState(null);
  // Classe do Food: 'delivery' ou 'reservas'.
  const [mode, setMode] = useState('delivery');

  // Veio do menu ⋮ (ex.: Restaurantes → Pizzaria)
  useEffect(() => {
    if (!explore) return;
    if (explore.cat) setCat(food ? foodFilterOf(explore.cat) : explore.cat);
    if (explore.q !== undefined) setQ(explore.q);
    if (food && explore.mode) {
      setMode(explore.mode === 'reservas' ? 'reservas' : 'delivery');
      setFoodCls(null);
    }
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

  // Lojas de comida por classe e por subclasse (para o seletor e para filtrar a lista).
  const foodIndex = useMemo(() => {
    const lojas = new Map();
    const porLoja = new Map();
    for (const p of state.products) porLoja.set(p.storeId, [...(porLoja.get(p.storeId) || []), p]);
    for (const p of state.products) {
      const loja = state.stores.find((x) => x.id === p.storeId);
      if (!isFoodStore(loja)) continue;
      // Só conta o que existe na classe aberta (Delivery ou Reservas).
      if (food && !productInMode(mode, p, loja, porLoja.get(loja.id) || [])) continue;
      const cls = p.classe ? { classe: p.classe, subclasse: p.subclasse } : classifyFood(p.name, p.description || p.desc || '', loja.category);
      if (!cls || !cls.classe) continue;
      for (const k of [cls.classe, `${cls.classe}:${cls.subclasse}`]) {
        if (!lojas.has(k)) lojas.set(k, new Set());
        lojas.get(k).add(loja.id);
      }
    }
    const counts = new Map([...lojas].map(([k, set]) => [k, set.size]));
    return { counts, lojas, porLoja };
  }, [state.products, state.stores, mode, food]);
  const chaveFood = foodCls ? (foodCls.subclasse ? `${foodCls.classe}:${foodCls.subclasse}` : foodCls.classe) : null;

  // Ordem da busca: patrocinadas primeiro, depois recomendadas, depois por nota.
  const rankedStores = useMemo(() => {
    const term = q.trim().toLowerCase();
    const foodCats = food ? (FOOD_TIPOS.find((f) => f.key === cat) || {}).cats : null;
    return state.stores
      .filter((s) =>
        food
          ? isFoodStore(s) && (!foodCats || foodCats.includes(s.category)) && (term || !isMarket(s)) && (term || storeInMode(mode, s, foodIndex.porLoja.get(s.id) || [])) && (!chaveFood || (foodIndex.lojas.get(chaveFood) || new Set()).has(s.id))
          : !isFoodStore(s) && (cat === 'Todos' || s.category === cat)
      )
      .filter(
        (s) =>
          !term ||
          s.name.toLowerCase().includes(term) ||
          state.products.some((p) => p.storeId === s.id && p.name.toLowerCase().includes(term))
      )
      .sort((a, b) => b.sponsored - a.sponsored || b.recommended - a.recommended || b.rating - a.rating);
  }, [state.stores, state.products, q, cat, food, chaveFood, foodIndex, mode]);

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
      'Pagamento protegido: o valor fica retido pelo Re@lys e só é liberado para a loja quando você confirmar a entrega.',
      [{ text: 'Ver pedidos', onPress: () => goTo('pedidos') }, { text: 'OK' }]
    );
  };

  if (showCart) {
    return (
      <Screen>
        <TouchableOpacity onPress={() => setShowCart(false)}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.back}>‹ {food ? 'Voltar para o Food' : 'Voltar para a loja'}</Text>
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
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.danger, fontWeight: '700' }}>Remover</Text>
                </TouchableOpacity>
              </Row>
            </Card>
          );
        })}
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.muted }}>Seu saldo Re@lys</Text>
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
        <Button title="Pagar com saldo Re@lys" onPress={checkout} disabled={!state.cart.length} />
      </Screen>
    );
  }

  if (openStore) {
    const s = storeOf(state, openStore);
    const items = state.products.filter((p) => p.storeId === s.id);
    return (
      <Screen>
        <TouchableOpacity onPress={() => setOpenStore(null)}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.back}>‹ {food ? 'Todos os restaurantes e bares' : 'Todas as lojas'}</Text>
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
        {food && s.teleGratis ? (
          <Text style={{ color: colors.success, fontWeight: '800', marginBottom: 6 }}>🛵 Tele grátis acima de {brl(s.teleGratisMin || 40)}</Text>
        ) : null}
        <TouchableOpacity style={styles.pageBtn} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: s.id })}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Ver página da empresa ›</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Apresentação, conteúdos, vídeos e seguir</Text>
        </TouchableOpacity>
        <Row style={{ marginBottom: 14 }}>
          <Badge label="CNPJ verificado" />
          {s.shipsBrazil ? <View style={{ marginLeft: 6 }}><Badge label="Envia para todo o Brasil" color={colors.accent} /></View> : null}
        </Row>
        {food && isFoodStore(s) && storeReserves(s, items) ? (
          <TouchableOpacity
            style={styles.reserveBtn}
            activeOpacity={0.85}
            accessibilityLabel={`Reservar mesa no ${s.name}`}
            onPress={() => {
              const had = (state.reservations || {})['loja-' + s.id];
              if (had) return Alert.alert('Sua mesa já tá garantida 🪑', `Mesa ${had} no ${s.name}. É só chegar.`);
              const table = freeTable();
              dispatch({ type: 'VENUE_RESERVE', venueId: 'loja-' + s.id, table });
              Alert.alert('Mesa garantida 🪑', `Mesa ${table} no ${s.name}. É só chegar e curtir.`);
            }}
          >
            <Ionicons name="calendar" size={17} color={colors.text} />
            <Text style={styles.reserveText}>{(state.reservations || {})['loja-' + s.id] ? `Mesa ${(state.reservations || {})['loja-' + s.id]} reservada` : 'Reservar mesa'}</Text>
          </TouchableOpacity>
        ) : null}
        {isFoodStore(s) ? (
          <CardapioFood items={items} store={s} onAdd={add} filtro={foodCls} />
        ) : (
          <ShopGrid>
            {items.map((p) => (
              <ProductCard key={p.id} p={p} onAdd={() => add(p.id)} />
            ))}
          </ShopGrid>
        )}
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
      {food ? (
        <>
          {/* As duas classes do Food */}
          <View style={styles.modes}>
            {FOOD_MODES.map((m) => {
              const on = mode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.mode, on && styles.modeOn]}
                  activeOpacity={0.85}
                  accessibilityLabel={`${m.label}: ${m.hint}`}
                  onPress={() => {
                    setMode(m.key);
                    setFoodCls(null);
                  }}
                >
                  <Ionicons name={on ? m.icon.replace('-outline', '') : m.icon} size={22} color={colors.text} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.modeTitle} numberOfLines={1}>{m.label}</Text>
                    <Text style={styles.modeHint} numberOfLines={1}>{m.hint}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Subclasses: o tipo de lugar */}
          <View style={styles.tipos}>
            {FOOD_TIPOS.map((t) => {
              const on = cat === t.key;
              return (
                <TouchableOpacity key={t.key} style={[styles.tipo, on && styles.tipoOn]} onPress={() => setCat(t.key)} activeOpacity={0.85} accessibilityLabel={t.label}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.tipoText, on && styles.tipoTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FoodClassPicker selected={foodCls} counts={foodIndex.counts} onPick={setFoodCls} title={FOOD_COPY[mode].title} hint={FOOD_COPY[mode].hint} />
        </>
      ) : null}
      {food && !q ? <SpotlightCarousel ads={FOOD_SPOTLIGHT} onOpen={openAd} /> : null}
      {!q ? (food ? <ShopHero title="Food" sub={mode === 'reservas' ? 'Os melhores rolês perto de você, com mesa garantida' : 'O que você tá a fim, na sua porta'} /> : <ShopHero title="Loja Re@lys" sub="Só loja de verdade. As melhores aparecem primeiro" />) : null}
      {food ? null : <CircleShortcuts items={CATEGORIES} value={cat} onPress={setCat} />}
      {food && !q ? <ClipStrip title="🎬 Reels da cozinha" clips={FOOD_CLIPS} food /> : null}
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
        <GlobalResults query={searched} navigate={navigate} title={food ? 'Não achei no Food, mas achei no Re@lys' : 'Não está na loja, mas achei no Re@lys'} />
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

      <ShopHead title={food ? (foodCls ? (mode === 'reservas' ? 'Onde tem, com mesa pra você' : 'Quem entrega isso') : FOOD_COPY[mode].list) : 'Lojas em destaque'} />
      {rankedStores.map((s) => (
        <StoreRow key={s.id} s={s} onPress={() => setOpenStore(s.id)} />
      ))}
      {!rankedStores.length ? <Empty text={food && !q ? FOOD_COPY[mode].empty : 'Nada encontrado.'} /> : null}
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
    .filter((p) => !term || p.name.toLowerCase().includes(term));
  // Sem busca e com "Tudo", a lista sai agrupada: Não perecíveis, Perecíveis e Demais.
  const grouped = !term && aisle === 'todos';
  const oneSection = (key) => list.filter((p) => sectionOf(p.name) === key);
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
      {!term ? <ShopHero title="Mercado" sub="Do pãozinho ao rancho do mês, direto na sua casa" icon="basket-outline" /> : null}
      <CircleShortcuts items={MERCADO_AISLES} value={aisle} onPress={setAisle} />
      {!term ? <ClipStrip title="🎬 Reels do mercado" clips={MERCADO_CLIPS} food /> : null}
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
      {grouped ? null : (
        <>
          <ShopHead title={term ? `Produtos para "${q.trim()}"` : a.label} />
          <ShopGrid>
            {(term ? list : oneSection(aisle)).map((p) => (
              <ProductCard key={p.id} p={p} storeName={(storeOf(state, p.storeId) || {}).name} onAdd={() => onAdd(p.id)} onPress={() => onOpenStore(p.storeId)} />
            ))}
          </ShopGrid>
        </>
      )}
      {grouped
        ? GROCERY_GROUPS.map((g) => {
            const secs = GROCERY_SECTIONS.filter((s) => s.group === g.key).filter((s) => oneSection(s.key).length);
            if (!secs.length) return null;
            return (
              <View key={g.key}>
                <ShopHead title={g.label} />
                {secs.map((s) => (
                  <View key={s.key}>
                    <Text style={{ color: s.color, fontWeight: '700', fontSize: 13, marginBottom: 6, marginTop: 4 }}>{s.label}</Text>
                    <ShopGrid>
                      {oneSection(s.key).map((p) => (
                        <ProductCard key={p.id} p={p} storeName={(storeOf(state, p.storeId) || {}).name} onAdd={() => onAdd(p.id)} onPress={() => onOpenStore(p.storeId)} />
                      ))}
                    </ShopGrid>
                  </View>
                ))}
              </View>
            );
          })
        : null}
      {!list.length ? <Empty text="Nada encontrado no mercado." /> : null}
      <ShopHead title="Mercados perto de você" />
      {markets.map((m) => (
        <StoreRow key={m.id} s={m} onPress={() => onOpenStore(m.id)} />
      ))}
      <View style={{ height: 10 }} />
    </View>
  );
}

// Cardápio de loja de comida: produtos agrupados por classe › subclasse (foodClasses), com o filtro
// Entrega ou Retirada no local. Produto sem classe gravada é classificado na hora pelo nome.
function CardapioFood({ items, store, onAdd, filtro = null }) {
  const [modo, setModo] = useState('todos');
  const porClasse = useMemo(() => {
    const info = items.map((p) => {
      const cls = p.classe
        ? { classe: p.classe, subclasse: p.subclasse, modos: p.modos || MODOS.map((m) => m.key) }
        : classifyFood(p.name, p.description || p.desc || '', store.category);
      return { p, cls };
    });
    const visiveis = info
      .filter(({ cls }) => modo === 'todos' || (cls && cls.modos && cls.modos.includes(modo)))
      .filter(({ cls }) => !filtro || (cls && cls.classe === filtro.classe && (!filtro.subclasse || cls.subclasse === filtro.subclasse)));
    return FOOD_CLASSES.map((c) => ({
      c,
      subs: c.subs
        .map((sub) => ({ sub, produtos: visiveis.filter(({ cls }) => cls && cls.classe === c.key && cls.subclasse === sub.key).map((x) => x.p) }))
        .filter((x) => x.produtos.length),
    })).filter((x) => x.subs.length);
  }, [items, store.category, modo, filtro]);
  const semClasse = items.filter((p) => !(p.classe || classifyFood(p.name, p.description || p.desc || '', store.category)));
  return (
    <View>
      <View style={styles.modoRow}>
        {[{ key: 'todos', label: 'Tudo' }, ...MODOS].map((m) => (
          <TouchableOpacity key={m.key} onPress={() => setModo(m.key)} style={[styles.modoBtn, modo === m.key && styles.modoBtnOn]} activeOpacity={0.85}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.modoTxt, modo === m.key && { color: '#fff' }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {porClasse.map(({ c, subs }) => (
        <View key={c.key} style={{ marginBottom: 6 }}>
          <ShopHead title={classeByKey(c.key).label} />
          {subs.map(({ sub, produtos }) => (
            <View key={sub.key}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6, marginBottom: 4 }}>{sub.label}</Text>
              <ShopGrid>
                {produtos.map((p) => (
                  <ProductCard key={p.id} p={p} onAdd={() => onAdd(p.id)} />
                ))}
              </ShopGrid>
            </View>
          ))}
        </View>
      ))}
      {!porClasse.length ? <Empty text={modo === 'todos' ? 'Esta loja ainda não tem produtos no cardápio.' : `Nenhum produto com ${modo === 'entrega' ? 'entrega' : 'retirada no local'}.`} /> : null}
      {semClasse.length && modo === 'todos' ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{semClasse.length} item(ns) sem classe definida pela loja.</Text> : null}
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
  modoRow: { flexDirection: 'row', marginBottom: 10 },
  modoBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 8, alignItems: 'center', marginRight: 6, backgroundColor: colors.card },
  modoBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  modoTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
  promoTeaser: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5C331', borderRadius: 16, padding: 12, marginBottom: 16 },
  // Food: as duas classes (Delivery e Reservas) e as subclasses de lugar
  modes: { flexDirection: 'row', marginBottom: 10 },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1.5, borderColor: colors.borderStrong, paddingVertical: 12, paddingHorizontal: 12, marginHorizontal: 3 },
  modeOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  modeTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  modeHint: { color: colors.menu, fontSize: 11, marginTop: 1 },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  tipo: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  tipoOn: { backgroundColor: colors.text },
  tipoText: { color: colors.menu, fontWeight: '700', fontSize: 12.5 },
  tipoTextOn: { color: '#FFFFFF' },
  reserveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 10 },
  reserveText: { color: colors.text, fontWeight: '800', marginLeft: 8 },
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
