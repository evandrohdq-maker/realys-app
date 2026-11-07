// Aviso de alerta oficial extremo ATIVO na área do usuário, no topo do app. Sem alerta ativo, não aparece.
// Visual leve, no padrão clean do app: cartão claro com sombra suave, ícone em anel e um botão "Ver".
// Tocar abre Notícias e Alertas; o X esconde até aparecer um alerta novo.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { ALERTS, ALERT_LEVELS } from '../newsData';
import { colors, soft } from '../theme';

export default function AlertPill() {
  const { state, dispatch } = useStore();
  // Só aparece quando há alerta extremo ATIVO na área do usuário e que ele ainda não fechou.
  const a = ALERTS.find((x) => x.active && x.level === 'extremo' && !state.alertsDismissed[x.id]);
  if (!a) return null;
  const L = ALERT_LEVELS[a.level];
  return (
    <View style={[styles.card, soft]}>
      <TouchableOpacity
        style={styles.main}
        onPress={() => dispatch({ type: 'NAV_REQUEST', go: { tab: 'stories', top: 'noticias' } })}
        accessibilityLabel={`${L.label}: ${a.type}. Ver detalhes`}
        activeOpacity={0.85}
      >
        <View style={[styles.ring, { borderColor: L.color }]}>
          <Ionicons name={L.icon} size={15} color={L.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.kicker} numberOfLines={1}>{L.label} · {a.source}</Text>
          <Text style={styles.title} numberOfLines={1}>{a.type}</Text>
        </View>
        <View style={[styles.cta, { backgroundColor: L.color }]}>
          <Text style={styles.ctaText}>Ver</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => dispatch({ type: 'ALERT_DISMISS', id: a.id })}
        hitSlop={10}
        style={styles.close}
        accessibilityLabel="Esconder alerta"
      >
        <Ionicons name="close" size={16} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  main: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ring: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  title: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 1 },
  cta: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginLeft: 8 },
  ctaText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  close: { paddingHorizontal: 8, paddingVertical: 4 },
});
