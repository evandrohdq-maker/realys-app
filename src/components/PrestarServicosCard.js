// Empresa que também presta serviço (ex.: vende ar-condicionado no Shop e faz instalação, manutenção e
// reforma): no Painel da empresa, "Prestar serviços" abre o mesmo cadastro do prestador (profissão,
// o que faz, valores e taxa de visita). Fica na mesma conta e no mesmo CNPJ; depois ela troca entre
// Empresa e Prestador pelo botão do Perfil (ou pelo "Empresa" no topo do painel de prestador).
import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { conectado } from '../serverShop';
import ServerProviderPanel from './ServerProviderPanel';

export default function PrestarServicosCard() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState(false);
  if (!conectado(state)) return null;
  const jaPresta = (state.user.roles || []).includes('prestador');
  return (
    <>
      <TouchableOpacity
        style={st.card}
        activeOpacity={0.88}
        onPress={() => (jaPresta ? dispatch({ type: 'SET_ROLE', role: 'prestador' }) : setAberto(true))}
        accessibilityLabel={jaPresta ? 'Abrir o painel de prestador de serviço' : 'Prestar serviços: cadastrar instalação, manutenção e outros serviços da empresa'}
      >
        <View style={st.ic}>
          <Ionicons name="construct-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.t} numberOfLines={1}>{jaPresta ? 'Painel de serviços' : 'Prestar serviços'}</Text>
          <Text style={st.s} numberOfLines={2}>
            {jaPresta ? 'Chamados, agenda e GPS da equipe que presta os serviços da empresa.' : 'Instalação, manutenção, conserto… Apareça em Serviços e na Lotus com o mesmo CNPJ.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>
      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[st.head, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setAberto(false)} style={st.close} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={st.ht} numberOfLines={1}>Serviços da empresa</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Text style={st.s}>
              Cadastre o que a empresa faz e quanto cobra. A taxa de visita é sua: o Realyz fica com 10% dela, e o valor final do serviço é combinado com o cliente. Depois de salvar, troque entre Empresa e Prestador pelo botão do Perfil.
            </Text>
            <ServerProviderPanel />
            {(state.user.roles || []).includes('prestador') ? (
              <TouchableOpacity
                style={st.go}
                onPress={() => {
                  setAberto(false);
                  dispatch({ type: 'SET_ROLE', role: 'prestador' });
                }}
                accessibilityLabel="Abrir o painel de prestador"
              >
                <Text style={st.goT}>Abrir o painel de prestador</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 14, marginTop: 12, ...soft },
  ic: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text, fontWeight: '800', fontSize: 15 },
  s: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  ht: { color: colors.text, fontWeight: '800', fontSize: 16 },
  go: { backgroundColor: colors.text, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  goT: { color: '#fff', fontWeight: '800' },
});
