// Selo de quem transmite a live (tocar abre o perfil) e o atalho para abrir esse perfil.
import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { suppliers } from '../data';
import { HOST_TYPES } from '../liveData';

// Abre o perfil de quem transmite: pessoa, página da empresa ou do artista, prestador, fornecedor.
export function useOpenHost() {
  const { dispatch } = useStore();
  return (l) => {
    if (!l || !l.hostId || l.hostId === 'me') return;
    if (l.hostType === 'usuario') return dispatch({ type: 'OPEN_PROFILE', id: l.hostId });
    if (l.hostType === 'empresa' || l.hostType === 'artista') return dispatch({ type: 'OPEN_COMPANY', id: l.hostId });
    if (l.hostType === 'prestador') return dispatch({ type: 'OPEN_PROVIDER', id: l.hostId });
    if (l.hostType === 'fornecedor') {
      const s = suppliers.find((x) => x.id === l.hostId);
      if (s) Alert.alert(`${s.logo} ${s.name}`, `Fornecedor verificado · ${s.city} · ★ ${String(s.rating).replace('.', ',')}\n\nEmpresas com CNPJ veem o catálogo de atacado e mandam proposta em Negócios.`);
    }
  };
}

// "Empresa · Pizzaria da Praça ›" — tocar abre o perfil.
export function HostChip({ live, onOpen, dark }) {
  const t = HOST_TYPES[live.hostType] || HOST_TYPES.usuario;
  const can = live.hostId && live.hostId !== 'me';
  return (
    <TouchableOpacity disabled={!can} onPress={() => onOpen && onOpen(live)} style={[styles.chip, dark && styles.chipDark]} accessibilityLabel={`Perfil de ${live.host}`}>
      <Ionicons name={t.icon} size={11} color={t.color} />
      <Text style={[styles.chipType, { color: t.color }]}>{t.label}</Text>
      <Text style={[styles.chipName, dark && { color: '#FFFFFF' }]} numberOfLines={1}>{live.host}</Text>
      {can ? <Ionicons name="chevron-forward" size={12} color={dark ? '#FFFFFF' : colors.muted} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, maxWidth: '100%' },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  chipType: { fontSize: 10, fontWeight: '900', marginLeft: 3, marginRight: 5, letterSpacing: 0.4 },
  chipName: { color: colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1, marginRight: 2 },
});
