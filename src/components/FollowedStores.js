// "Lojas que você segue": faixa de bolinhas (como os stories) com as lojas que a pessoa segue.
// Tocar abre a página da loja (vitrine, produtos, seguir). Patrocinadas aparecem primeiro, com anel roxo.
// Sem nenhuma loja seguida ainda: mostra lojas para seguir (as patrocinadas e as mais confiáveis).
// food: true = só restaurantes e bares; false = só lojas do Shop; undefined = todas.
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { isFoodStore } from '../data';

export default function FollowedStores({ food, title }) {
  const { state, dispatch } = useStore();
  const all = (state.stores || []).filter((s) => (food === undefined ? true : food ? isFoodStore(s) : !isFoodStore(s)));
  const seguidas = all.filter((s) => state.following && state.following[s.id]);
  const lista = (seguidas.length ? seguidas : all).slice().sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || (b.rating || 0) - (a.rating || 0)).slice(0, 15);
  if (!lista.length) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={st.title}>{title || (seguidas.length ? 'Lojas que você segue' : 'Lojas para seguir')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
        {lista.map((s) => (
          <TouchableOpacity key={s.id} style={st.item} activeOpacity={0.85} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: s.id })} accessibilityLabel={`Abrir a página de ${s.name}`}>
            <View style={[st.ring, s.sponsored && { borderColor: colors.sponsored }]}>
              <Text style={{ fontSize: 24 }}>{s.logo}</Text>
            </View>
            <Text numberOfLines={1} style={st.name}>{s.name.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  title: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 8 },
  item: { alignItems: 'center', width: 70, marginRight: 6 },
  ring: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  name: { color: colors.text, fontSize: 11.5, marginTop: 4, maxWidth: 68 },
});
