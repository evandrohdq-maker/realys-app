// Reels (abre arrastando a página inicial para a direita ou pela Lotus): todos os Reels do
// Re@lys num lugar só, estilo Instagram. Os Reels publicados pelo usuário aparecem primeiro. "Para você" mistura lojas e comida; "Shop" e "Food" filtram.
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../responsive';
import { ReelsFeed } from '../../components/Reels';
import { SHOP_CLIPS, FOOD_CLIPS, MERCADO_CLIPS, SERVICE_CLIPS, NEGOCIO_CLIPS } from '../../adsData';
import { useStore } from '../../store';

const TABS = [
  { key: 'todos', label: 'Para você' },
  { key: 'shop', label: 'Shop' },
  { key: 'food', label: 'Food' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'negocios', label: 'Negócios' },
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
  const { state } = useStore();
  const mine = state.myReels || [];
  const reels = tab === 'shop' ? shop : tab === 'food' ? food : tab === 'servicos' ? SERVICE_CLIPS : tab === 'negocios' ? NEGOCIO_CLIPS : [...mine, ...mix(shop, food, SERVICE_CLIPS, NEGOCIO_CLIPS)];
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* key: trocar o filtro recomeça do primeiro Reel */}
      <ReelsFeed key={tab + (tab === 'todos' ? mine.length : '')} reels={reels} />
      <View style={styles.top} pointerEvents="box-none">
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.tab} accessibilityLabel={`Reels: ${t.label}`}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.tabText, tab === t.key && styles.tabOn]}>{t.label}</Text>
            {tab === t.key ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  tab: { paddingHorizontal: 8, alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  tabOn: { color: '#fff', fontWeight: '800' },
  dot: { width: 18, height: 2, borderRadius: 1, backgroundColor: '#fff', marginTop: 4 },
});
