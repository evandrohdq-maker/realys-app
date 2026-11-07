import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Moldura dourada em volta do produto que a pessoa pediu pela Lotus ("tênis" → abre Calçados com
// o tênis destacado no topo da lista).
export default function LotusFocus({ children }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tag}>
        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
        <Text style={styles.tagText}>Encontrado pela Lotus</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 2, borderColor: colors.gold, borderRadius: 22, padding: 4, marginBottom: 14, backgroundColor: 'rgba(226,182,73,0.08)' },
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, margin: 6, marginBottom: 6 },
  tagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', marginLeft: 4 },
});
