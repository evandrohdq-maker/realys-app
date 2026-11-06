import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../store';
import { colors, brl } from '../theme';
import { ProductThumb } from './ui';

// Lançamentos: produtos novos que as lojas apresentam no Shop.
// É o que mais prende a atenção do cliente, então aparece primeiro.
export function launchesOf(state) {
  return state.products.filter((p) => p.launch);
}

export function LaunchStrip({ title = '🚀 Lançamentos das lojas' }) {
  const { state, dispatch } = useStore();
  const list = launchesOf(state);
  if (!list.length) return null;
  const add = (p) => {
    dispatch({ type: 'ADD_TO_CART', productId: p.id });
    Alert.alert('No carrinho 🛍️', `${p.name} foi para o seu carrinho.`);
  };
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{list.length} novidades</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {list.map((p) => {
          const store = storeOf(state, p.storeId) || {};
          return (
            <View key={p.id} style={styles.card}>
              <View style={styles.media}>
                <ProductThumb product={p} size={92} />
                <View style={styles.newTag}>
                  <Text style={styles.newText}>NOVO</Text>
                </View>
                <TouchableOpacity
                  style={styles.play}
                  onPress={() => Alert.alert('Vídeo de lançamento', `${store.name} apresenta: ${p.name}.\n\nNa versão real, a loja grava um vídeo curto mostrando o produto.`)}
                  accessibilityLabel={`Ver vídeo do lançamento ${p.name}`}
                >
                  <Ionicons name="play" size={14} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
              <Text numberOfLines={2} style={styles.name}>{p.name}</Text>
              <TouchableOpacity onPress={() => dispatch({ type: 'OPEN_COMPANY', id: p.storeId })}>
                <Text numberOfLines={1} style={styles.store}>{store.logo} {store.name}</Text>
              </TouchableOpacity>
              <Text numberOfLines={2} style={styles.note}>{p.launch.note}</Text>
              <View style={styles.footer}>
                <Text style={styles.price}>{brl(p.price)}</Text>
                <TouchableOpacity style={styles.add} onPress={() => add(p)} accessibilityLabel={`Adicionar ${p.name} ao carrinho`}>
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  count: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  card: { width: 170, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, borderColor: colors.gold, padding: 10, marginRight: 10 },
  media: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderRadius: 12, paddingVertical: 10 },
  newTag: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  newText: { color: colors.onPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  play: { position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(31,42,68,0.75)', alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '700', color: colors.text, marginTop: 8, minHeight: 36 },
  store: { fontSize: 11, color: colors.accent, fontWeight: '700', marginTop: 2 },
  note: { fontSize: 11, color: colors.muted, marginTop: 4, minHeight: 28 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { fontWeight: '800', color: colors.primary, fontSize: 15 },
  add: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
