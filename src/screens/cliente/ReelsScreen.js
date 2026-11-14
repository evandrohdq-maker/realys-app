// Aba Reels (botão próprio na barra de baixo): todos os Reels do Re@lys num lugar só,
// estilo Instagram. "Para você" mistura lojas e comida; "Shop" e "Food" filtram.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ReelsFeed } from '../../components/Reels';
import { SHOP_CLIPS, FOOD_CLIPS, MERCADO_CLIPS } from '../../adsData';

const TABS = [
  { key: 'todos', label: 'Para você' },
  { key: 'shop', label: 'Shop' },
  { key: 'food', label: 'Food' },
];

// Intercala as listas (1 de cada), para o "Para você" não ficar só de um tipo.
function mix(...lists) {
  const out = [];
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) lists.forEach((l) => l[i] && out.push(l[i]));
  return out;
}

export default function ReelsScreen() {
  const [tab, setTab] = useState('todos');
  const shop = useMemo(() => SHOP_CLIPS.map((c) => ({ ...c, kind: 'shop' })), []);
  const food = useMemo(() => [...FOOD_CLIPS, ...MERCADO_CLIPS].map((c) => ({ ...c, kind: 'food' })), []);
  const reels = tab === 'shop' ? shop : tab === 'food' ? food : mix(shop, food);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* key: trocar o filtro recomeça do primeiro Reel */}
      <ReelsFeed key={tab} reels={reels} />
      <View style={styles.top} pointerEvents="box-none">
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.tab} accessibilityLabel={`Reels: ${t.label}`}>
            <Text style={[styles.tabText, tab === t.key && styles.tabOn]}>{t.label}</Text>
            {tab === t.key ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  tab: { paddingHorizontal: 12, alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  tabOn: { color: '#fff', fontWeight: '800' },
  dot: { width: 18, height: 2, borderRadius: 1, backgroundColor: '#fff', marginTop: 4 },
});
