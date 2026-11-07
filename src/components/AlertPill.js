// Faixa de alerta no topo do app: aparece quando há alerta oficial extremo na área do usuário.
// Tocar abre Notícias e Alertas; o X esconde até aparecer um alerta novo.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { ALERTS, ALERT_LEVELS } from '../newsData';

export default function AlertPill() {
  const { state, dispatch } = useStore();
  const a = ALERTS.find((x) => x.level === 'extremo' && !state.alertsDismissed[x.id]);
  if (!a) return null;
  const L = ALERT_LEVELS[a.level];
  return (
    <View style={[styles.pill, { backgroundColor: L.bg, borderColor: L.color + '66' }]}>
      <TouchableOpacity style={styles.main} onPress={() => dispatch({ type: 'NAV_REQUEST', go: { tab: 'stories', top: 'noticias' } })} accessibilityLabel={`${L.label}: ${a.type}. Ver detalhes`}>
        <Ionicons name={L.icon} size={14} color={L.color} />
        <Text style={[styles.text, { color: L.color }]} numberOfLines={1}>{a.source}: {a.type}</Text>
        <Text style={[styles.more, { color: L.color }]}>Ver</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => dispatch({ type: 'ALERT_DISMISS', id: a.id })} style={{ paddingHorizontal: 6 }} accessibilityLabel="Esconder alerta">
        <Ionicons name="close" size={14} color={L.color} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingLeft: 8, paddingVertical: 4, flex: 1, marginRight: 6 },
  main: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  text: { fontWeight: '800', fontSize: 12, marginLeft: 5, flex: 1 },
  more: { fontWeight: '900', fontSize: 12, marginLeft: 6 },
});
