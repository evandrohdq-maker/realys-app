// Anuncie no Re@lys: todos os espaços de publicidade num lugar só, com preço fechado e compra
// direta pelo app (saldo ou pontos). Abre pelo menu ⋮ e pela Lotus ("anunciar").
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft } from '../theme';
import { Screen, Title } from '../components/ui';
import { BoostOffers, MyBoosts } from '../components/Boost';
import { TAXAS } from '../taxas';

const PONTOS = [
  ['people-outline', 'Só gente de verdade vê', 'Todo mundo no Re@lys passou pela biometria: sem perfil falso, sem robô.'],
  ['pricetag-outline', 'Preço fechado', 'Você sabe quanto paga antes de confirmar. Sem leilão e sem cobrança por clique.'],
  ['flash-outline', 'Contrata na hora', 'Escolhe o espaço, paga com saldo ou pontos e o anúncio vai para análise.'],
];

export default function AnuncieScreen() {
  return (
    <Screen>
      <Title sub="Coloque a sua marca na frente de quem compra">Anuncie no Re@lys</Title>
      <View style={st.box}>
        {PONTOS.map(([icon, title, text]) => (
          <View key={title} style={st.row}>
            <Ionicons name={icon} size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.rowTitle}>{title}</Text>
              <Text style={st.rowText}>{text}</Text>
            </View>
          </View>
        ))}
        <Text style={st.compare}>No mercado: {TAXAS.publicidade.mercado}.</Text>
      </View>
      <Text style={st.h}>Escolha o espaço</Text>
      <BoostOffers targets={['anuncio', 'produto', 'post', 'live']} />
      <MyBoosts />
    </Screen>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 16, ...soft },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
  rowTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  rowText: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  compare: { color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 6 },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 },
});
