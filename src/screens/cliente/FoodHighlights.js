import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../../store';
import { colors, brl, soft } from '../../theme';
import { Photo, ProductThumb } from '../../components/ui';
import { isFoodStore } from '../../data';
import { foodPromos, barSpots, foodPosts } from '../../foodData';
import { venueOfBar, freeTable } from '../../venueData';

// Destaques da aba Food: promoções de restaurantes, bares e happy hour (com check-in e "vou hoje"),
// novidades do cardápio e o que a galera está comendo. Só conteúdo de comida e bebida.
const sponsoredFirst = (list) => [...list].sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));

// only='promos': só as promoções de restaurantes (vão para a aba Promoções do Food).
export function FoodHighlights({ filter, onOpenStore, onAdd, only }) {
  const { state, dispatch } = useStore();
  const [going, setGoing] = useState({});
  const [here, setHere] = useState({});
  const [liked, setLiked] = useState({});

  const catOf = (storeId) => (storeOf(state, storeId) || {}).category;
  const showPromos = only === 'promos';
  const showBars = !only && (filter === 'todos' || filter === 'bares');
  const promos = sponsoredFirst(foodPromos);
  // Novidades do cardápio: só restaurantes, bares e cafés (o Mercado tem a aba dele).
  const news = state.products.filter((p) => p.launch && isFoodStore(storeOf(state, p.storeId)) && (storeOf(state, p.storeId) || {}).category !== 'Mercado');

  const openPromo = (p) => {
    const s = storeOf(state, p.storeId);
    Alert.alert(p.cta, `${p.title}\n${s ? s.name : ''} · ${p.when}\n\nPor ${p.price}${p.from ? ` (antes ${p.from})` : ''}.`, [
      { text: 'Ver cardápio', onPress: () => s && onOpenStore(s.id) },
      { text: 'OK' },
    ]);
  };

  return (
    <View>
      {showPromos && promos.length ? (
        <>
          <Head title="🔥 Promoções dos restaurantes" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {promos.map((p) => {
              const s = storeOf(state, p.storeId) || {};
              return (
                <TouchableOpacity key={p.id} style={styles.promoCard} activeOpacity={0.9} onPress={() => openPromo(p)}>
                  <View>
                    <Photo uri={p.photo} style={styles.promoPhoto} fallback={s.logo || '🍽️'} />
                    <View style={styles.deal}>
                      <Text style={styles.dealText}>{p.deal}</Text>
                    </View>
                    {p.sponsored ? (
                      <View style={styles.sponsored}>
                        <Text style={styles.sponsoredText}>PATROCINADO</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ padding: 10 }}>
                    <Text numberOfLines={2} style={styles.cardTitle}>{p.title}</Text>
                    <Text numberOfLines={1} style={styles.cardMeta}>{s.logo} {s.name} · {p.when}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
                      <Text style={styles.price}>{p.price}</Text>
                      {p.from ? <Text style={styles.from}>{p.from}</Text> : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {showBars ? (
        <>
          <Head title="🍻 Bares e happy hour" />
          {sponsoredFirst(barSpots).map((b) => {
            const isGoing = !!going[b.id];
            const isHere = !!here[b.id];
            return (
              <View key={b.id} style={styles.bar}>
                <View>
                  <Photo uri={b.photo} style={styles.barPhoto} fallback="🍻" />
                  <View style={styles.liveNow}>
                    <View style={styles.dot} />
                    <Text style={styles.liveNowText}>{b.here + (isHere ? 1 : 0)} pessoas lá agora</Text>
                  </View>
                  {b.sponsored ? (
                    <View style={styles.sponsored}>
                      <Text style={styles.sponsoredText}>PATROCINADO</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={styles.barName}>{b.name}</Text>
                  <Text style={styles.barVibe}>{b.vibe}</Text>
                  <Text style={styles.cardMeta}>
                    <Ionicons name="time-outline" size={12} color={colors.muted} /> {b.when}   <Ionicons name="musical-notes-outline" size={12} color={colors.muted} /> {b.music}
                  </Text>
                  <Text style={[styles.cardMeta, { marginTop: 4 }]}>{b.going + (isGoing ? 1 : 0)} confirmaram que vão</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity style={[styles.btn, isGoing && styles.btnOn]} onPress={() => setGoing({ ...going, [b.id]: !isGoing })}>
                      <Ionicons name={isGoing ? 'checkmark-circle' : 'calendar-outline'} size={16} color={isGoing ? colors.onPrimary : colors.primary} />
                      <Text style={[styles.btnText, isGoing && { color: colors.onPrimary }]}>{isGoing ? 'Vou!' : 'Vou hoje'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, isHere && styles.btnOn]}
                      onPress={() => {
                        setHere({ ...here, [b.id]: !isHere });
                        if (isHere) return;
                        // Check-in: já pode pedir bebidas e comidas pelo app (na mesa reservada, se tiver).
                        dispatch({ type: 'VENUE_ENTER', venue: venueOfBar(b) });
                        const table = (state.reservations || {})['bar-' + b.id];
                        Alert.alert('Check-in feito 📍', `Seus amigos veem que você está no ${b.name}.${table ? ` Você está na mesa ${table}.` : ''}\n\nQuer pedir bebidas e comidas pelo app? O caixa recebe o seu pedido na hora.`, [
                          { text: 'Agora não' },
                          { text: 'Abrir comanda', onPress: () => dispatch({ type: 'OPEN_VENUE' }) },
                        ]);
                      }}
                    >
                      <Ionicons name="location" size={16} color={isHere ? colors.onPrimary : colors.primary} />
                      <Text style={[styles.btnText, isHere && { color: colors.onPrimary }]}>Check-in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { marginRight: 0 }]}
                      onPress={() => {
                        if (b.storeId) return onOpenStore(b.storeId);
                        const table = freeTable();
                        dispatch({ type: 'VENUE_RESERVE', venueId: 'bar-' + b.id, table });
                        Alert.alert('Mesa reservada 🪑', `Mesa ${table} no ${b.name}. Quando chegar, faça o check-in: você já fica na mesa e pode pedir pelo app.`);
                      }}
                    >
                      <Ionicons name={b.storeId ? 'book-outline' : 'people-outline'} size={16} color={colors.primary} />
                      <Text style={styles.btnText}>{b.storeId ? 'Cardápio' : 'Reservar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {!only && news.length && filter !== 'bares' ? (
        <>
          <Head title="✨ Novidades do cardápio" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {news.map((p) => (
              <View key={p.id} style={styles.newCard}>
                <ProductThumb product={p} size={64} />
                <Text numberOfLines={2} style={[styles.cardTitle, { marginTop: 6 }]}>{p.name}</Text>
                <Text numberOfLines={1} style={styles.cardMeta}>{(storeOf(state, p.storeId) || {}).name}</Text>
                <Text style={[styles.price, { fontSize: 14 }]}>{brl(p.price)}</Text>
                <TouchableOpacity style={styles.add} onPress={() => onAdd(p.id)}>
                  <Ionicons name="add" size={16} color={colors.onPrimary} />
                  <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 12 }}>Pedir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {!only ? <Head title="😋 O que a galera está comendo" /> : null}
      {(only ? [] : foodPosts).map((f) => (
        <View key={f.id} style={styles.post}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {f.author} <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
          </Text>
          <Text style={styles.cardMeta}>
            <Ionicons name="location-outline" size={12} color={colors.muted} /> {f.place}
          </Text>
          <Text style={{ color: colors.text, marginTop: 8, lineHeight: 20 }}>{f.text}</Text>
          <Photo uri={f.photo} style={styles.postImg} fallback="🍽️" />
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }} onPress={() => setLiked({ ...liked, [f.id]: !liked[f.id] })}>
            <Ionicons name={liked[f.id] ? 'heart' : 'heart-outline'} size={18} color={liked[f.id] ? '#FF5A7A' : colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 5 }}>{f.likes + (liked[f.id] ? 1 : 0)}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ height: 8 }} />
    </View>
  );
}

function Head({ title }) {
  return <Text style={styles.head}>{title}</Text>;
}

const styles = StyleSheet.create({
  head: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  hScroll: { marginHorizontal: -16, marginBottom: 16 },
  promoCard: { width: 210, marginRight: 12, backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', ...soft },
  promoPhoto: { width: '100%', height: 115 },
  deal: { position: 'absolute', left: 10, top: 10, backgroundColor: '#FF3B5C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dealText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  sponsored: { position: 'absolute', right: 10, top: 10, backgroundColor: colors.sponsored, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sponsoredText: { color: colors.onPrimary, fontSize: 10, fontWeight: '700' },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.accent, fontWeight: '800', fontSize: 17 },
  from: { color: colors.muted, fontSize: 12, textDecorationLine: 'line-through', marginLeft: 8 },
  bar: { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', marginBottom: 14, ...soft },
  barPhoto: { width: '100%', height: 140 },
  liveNow: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(3,5,10,0.65)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3DDC84', marginRight: 6 },
  liveNowText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  barName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  barVibe: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 2 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 11, borderWidth: 1, borderColor: colors.primary, marginRight: 8 },
  btnOn: { backgroundColor: colors.primary },
  btnText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  newCard: { width: 140, marginRight: 10, backgroundColor: colors.card, borderRadius: 18, padding: 10, ...soft },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 11, backgroundColor: colors.primary, marginTop: 8 },
  post: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 12, ...soft },
  postImg: { width: '100%', height: 180, borderRadius: 14, marginTop: 10 },
});
