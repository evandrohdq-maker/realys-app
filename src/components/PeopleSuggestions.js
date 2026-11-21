// "Sugestões para você" no meio do feed: cartões que passam para o lado, com foto, nome, amigos em
// comum e Seguir (pedido de amizade). O X dispensa a sugestão. "Ver tudo" abre a busca de pessoas.
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';
import { members } from '../people';

let dispensados = {}; // fica enquanto o app está aberto

export default function PeopleSuggestions({ onSeeAll, offset = 0 }) {
  const { state, dispatch } = useStore();
  const [, tick] = useState(0);
  const friends = state.friends || {};
  const amigos = members.filter((m) => friends[m.id] === 'amigo');
  const lista = members
    .filter((m) => friends[m.id] !== 'amigo' && !dispensados[m.id])
    .sort((a, b) => (friends[b.id] === 'recebido') - (friends[a.id] === 'recebido') || (b.mutual || 0) - (a.mutual || 0));
  const fatia = lista.slice(offset, offset + 10);
  if (!fatia.length) return null;
  return (
    <View style={st.box}>
      <View style={st.head}>
        <Text style={st.title}>Sugestões para você</Text>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} accessibilityLabel="Ver todas as sugestões">
            <Text style={st.all}>Ver tudo</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
        {fatia.map((m, i) => {
          const s = friends[m.id];
          const comum = amigos.filter((a) => a.id !== m.id).slice(i % 3, (i % 3) + 3);
          return (
            <View key={m.id} style={st.card}>
              <TouchableOpacity style={st.x} onPress={() => { dispensados[m.id] = true; tick((n) => n + 1); }} accessibilityLabel={`Dispensar ${m.name}`}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => dispatch({ type: 'OPEN_PROFILE', id: m.id })} style={{ alignItems: 'center' }}>
                <Photo uri={m.photo} style={st.avatar} fallback={m.name[0]} />
                <Text style={st.name} numberOfLines={1}>{m.name}</Text>
              </TouchableOpacity>
              <View style={st.mutualRow}>
                {comum.map((a, k) => (
                  <Photo key={a.id} uri={a.photo} style={[st.mini, k && { marginLeft: -7 }]} fallback={a.name[0]} />
                ))}
                <Text style={st.mutual} numberOfLines={1}>{m.mutual ? `${m.mutual} em comum` : m.city}</Text>
              </View>
              <TouchableOpacity
                style={[st.btn, s === 'enviado' && st.btnSent]}
                onPress={() => dispatch({ type: 'FRIEND', id: m.id, status: s === 'recebido' ? 'amigo' : s === 'enviado' ? null : 'enviado' })}
                accessibilityLabel={s === 'recebido' ? `Aceitar ${m.name}` : s === 'enviado' ? `Cancelar pedido para ${m.name}` : `Seguir ${m.name}`}
              >
                <Text style={[st.btnText, s === 'enviado' && { color: colors.muted }]} numberOfLines={1}>
                  {s === 'recebido' ? 'Aceitar' : s === 'enviado' ? 'Solicitado' : 'Seguir'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  box: { marginVertical: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  all: { color: colors.primaryDark, fontWeight: '700' },
  card: { width: 168, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginRight: 10, alignItems: 'center' },
  x: { position: 'absolute', top: 6, right: 6, padding: 4, zIndex: 2 },
  avatar: { width: 92, height: 92, borderRadius: 46, marginTop: 6 },
  name: { marginTop: 8, fontWeight: '800', color: colors.text, fontSize: 14, maxWidth: 140 },
  mutualRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, minHeight: 20 },
  mini: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.card },
  mutual: { marginLeft: 5, color: colors.muted, fontSize: 12, maxWidth: 100 },
  btn: { marginTop: 10, alignSelf: 'stretch', borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.card },
  btnSent: { borderColor: colors.border, backgroundColor: colors.bg },
  btnText: { color: colors.primaryDark, fontWeight: '800' },
});
