// Por que o Realyz é mais barato: cada taxa do Realyz ao lado do que o mercado cobra.
// Os dados vêm de src/taxas.js (comparativo). Bom para mostrar a lojistas e prestadores.
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft } from '../theme';
import { comparativo } from '../taxas';

const NOMES = {
  protecao: 'Taxa de proteção do pedido',
  food: 'Food (restaurantes)',
  shop: 'Shop (lojas)',
  corrida: 'Corridas',
  visita: 'Serviços (taxa de visita)',
  ingresso: 'Ingressos de eventos',
  presente: 'Presentes',
  live: 'Lives (parte do criador)',
  planoEmpresa: 'Plano da loja',
  anuncioImobiliaria: 'Imobiliárias',
  contatoImovel: 'Contato de imóvel',
  anuncioRevenda: 'Revendas de veículos',
  contatoVeiculo: 'Contato de veículo',
  publicidade: 'Publicidade',
  musicaVenda: 'Venda de músicas',
  musicaPremium: 'Músicas sem propaganda',
  paginaUsuario: 'Páginas',
  destaquePrestador: 'Destaque do prestador',
};

export default function TaxasModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const linhas = comparativo().filter((l) => l.realys && l.mercado);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={st.back} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.title} numberOfLines={1}>Por que o Realyz é mais barato</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
          <Text style={st.intro}>Cada taxa do Realyz ao lado do que os outros cobram. Todas aparecem antes de você confirmar qualquer coisa.</Text>
          {linhas.map((l) => (
            <View key={l.chave} style={st.card}>
              <Text style={st.name}>{NOMES[l.chave] || l.chave}</Text>
              <View style={st.row}>
                <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                <Text style={st.realys}>Realyz: {l.realys}</Text>
              </View>
              <View style={st.row}>
                <Ionicons name="storefront-outline" size={16} color={colors.muted} />
                <Text style={st.mercado}>Mercado: {l.mercado}</Text>
              </View>
            </View>
          ))}
          <Text style={st.note}>Valores do mercado levantados em 2026 e revistos a cada 6 meses. Podem mudar.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 18, marginLeft: 2, flex: 1 },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, ...soft },
  name: { color: colors.text, fontWeight: '800', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 3 },
  realys: { color: colors.text, fontSize: 13, marginLeft: 6, flex: 1, lineHeight: 18 },
  mercado: { color: colors.muted, fontSize: 12.5, marginLeft: 7, flex: 1, lineHeight: 18 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
