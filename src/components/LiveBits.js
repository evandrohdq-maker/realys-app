// Peças das lives ligadas aos perfis: selo de quem transmite (tocar abre o perfil),
// "Ao vivo agora" dentro dos perfis e a janela global para assistir de qualquer lugar.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { lives } from '../homeData';
import { livesOf, catOf } from '../liveData';
import { LiveModal } from '../screens/cliente/home/Social';

// Todas as lives no ar agora: a minha (se estiver transmitindo) e as dos outros perfis.
export const allLives = (state) => (state.myLive ? [state.myLive, ...lives] : lives);

// Selo "AO VIVO agora" nos perfis (pessoa, empresa, artista, prestador, fornecedor).
export function LiveNowBadge({ hostType, hostId, style }) {
  const { state, dispatch } = useStore();
  const on = livesOf(allLives(state), hostType, hostId);
  if (!on.length) return null;
  const l = on[0];
  return (
    <TouchableOpacity style={[styles.badge, style]} onPress={() => dispatch({ type: 'WATCH_LIVE', id: l.id })} activeOpacity={0.85} accessibilityLabel={`Assistir live: ${l.title}`}>
      <View style={styles.dot} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.badgeTitle} numberOfLines={1}>AO VIVO agora · {catOf(l.cat).label}</Text>
        <Text style={styles.badgeText} numberOfLines={1}>{l.title}</Text>
      </View>
      <Text style={styles.watch}>Assistir</Text>
    </TouchableOpacity>
  );
}

// Assistir uma live aberta pelo selo de um perfil (fica por cima de qualquer tela).
export function GlobalLive() {
  const { state, dispatch } = useStore();
  const l = state.watchLive ? allLives(state).find((x) => x.id === state.watchLive) : null;
  if (!l) return null;
  return <LiveModal live={l} mine={false} visible onClose={() => dispatch({ type: 'CLOSE_WATCH' })} userName={state.user ? state.user.name : 'Você'} />;
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, maxWidth: '100%' },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  chipType: { fontSize: 10, fontWeight: '900', marginLeft: 3, marginRight: 5, letterSpacing: 0.4 },
  chipName: { color: colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1, marginRight: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1124', borderRadius: 14, padding: 10, marginTop: 10, borderWidth: 1, borderColor: 'rgba(217,83,79,0.7)' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5484D' },
  badgeTitle: { color: '#FF8A80', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  badgeText: { color: '#FFFFFF', fontWeight: '800', marginTop: 1 },
  watch: { color: '#0B1124', backgroundColor: '#E2B649', fontWeight: '900', fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', marginLeft: 8 },
});
