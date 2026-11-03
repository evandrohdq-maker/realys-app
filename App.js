import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider, useStore } from './src/store';
import { colors, brl, ROLE_LABELS } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VoiceAssistant from './src/screens/VoiceAssistant';
import FeedScreen from './src/screens/cliente/FeedScreen';
import StoreScreen from './src/screens/cliente/StoreScreen';
import ServicesScreen from './src/screens/cliente/ServicesScreen';
import OrdersScreen from './src/screens/cliente/OrdersScreen';
import DashboardScreen from './src/screens/empresa/DashboardScreen';
import InventoryScreen from './src/screens/empresa/InventoryScreen';
import FinanceScreen from './src/screens/empresa/FinanceScreen';
import B2BScreen from './src/screens/empresa/B2BScreen';
import DriverScreen from './src/screens/prestador/DriverScreen';
import SupplierScreen from './src/screens/fornecedor/SupplierScreen';
import { AdminOverview, AdminModeration, AdminSignups } from './src/screens/admin/AdminScreens';

// Cada perfil enxerga abas diferentes dentro do MESMO app.
const TABS = {
  admin: [
    { key: 'geral', label: 'Geral', icon: '🛡️', Comp: AdminOverview },
    { key: 'moderacao', label: 'Moderação', icon: '🚩', Comp: AdminModeration },
    { key: 'cadastros', label: 'Cadastros', icon: '✅', Comp: AdminSignups },
    { key: 'perfil', label: 'Perfil', icon: '👤', Comp: ProfileScreen },
  ],
  cliente: [
    { key: 'inicio', label: 'Início', icon: '🏠', Comp: FeedScreen },
    { key: 'loja', label: 'Loja', icon: '🛍️', Comp: StoreScreen },
    { key: 'servicos', label: 'Serviços', icon: '🚗', Comp: ServicesScreen },
    { key: 'pedidos', label: 'Pedidos', icon: '📦', Comp: OrdersScreen },
    { key: 'perfil', label: 'Perfil', icon: '👤', Comp: ProfileScreen },
  ],
  empresa: [
    { key: 'painel', label: 'Painel', icon: '📊', Comp: DashboardScreen },
    { key: 'estoque', label: 'Estoque', icon: '📦', Comp: InventoryScreen },
    { key: 'caixa', label: 'Caixa', icon: '💰', Comp: FinanceScreen },
    { key: 'negocios', label: 'Negócios', icon: '🤝', Comp: B2BScreen },
    { key: 'perfil', label: 'Perfil', icon: '👤', Comp: ProfileScreen },
  ],
  prestador: [
    { key: 'servicos', label: 'Serviços', icon: '🧰', Comp: DriverScreen },
    { key: 'inicio', label: 'Feed', icon: '🏠', Comp: FeedScreen },
    { key: 'perfil', label: 'Perfil', icon: '👤', Comp: ProfileScreen },
  ],
  fornecedor: [
    { key: 'propostas', label: 'Propostas', icon: '🚚', Comp: SupplierScreen },
    { key: 'inicio', label: 'Feed', icon: '🏠', Comp: FeedScreen },
    { key: 'perfil', label: 'Perfil', icon: '👤', Comp: ProfileScreen },
  ],
};

function Shell() {
  const { state, dispatch } = useStore();
  const tabs = TABS[state.activeRole];
  const [tab, setTab] = useState(tabs[0].key);
  const [voice, setVoice] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setTab(TABS[state.activeRole][0].key);
  }, [state.activeRole]);

  const current = tabs.find((t) => t.key === tab) || tabs[0];
  const Comp = current.Comp;
  const nextRole = () => {
    const r = state.user.roles;
    dispatch({ type: 'SET_ROLE', role: r[(r.indexOf(state.activeRole) + 1) % r.length] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.brand}>Realys</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.wallet}>💳 {brl(state.wallet)}</Text>
          <TouchableOpacity onPress={nextRole} style={styles.roleChip}>
            <Text style={styles.roleChipText}>{ROLE_LABELS[state.activeRole]} ⇄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Comp goTo={setTab} openVoice={() => setVoice(true)} />
      </View>

      <TouchableOpacity style={[styles.fab, { bottom: 84 + insets.bottom }]} onPress={() => setVoice(true)} activeOpacity={0.85}>
        <Text style={{ fontSize: 26 }}>🎙️</Text>
      </TouchableOpacity>

      <View style={[styles.tabbar, { paddingBottom: 10 + insets.bottom }]}>
        {tabs.map((t) => {
          const on = t.key === current.key;
          return (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Text style={{ fontSize: 20, opacity: on ? 1 : 0.55 }}>{t.icon}</Text>
              <Text style={[styles.tabLabel, on && { color: colors.primary, fontWeight: '800' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <VoiceAssistant visible={voice} onClose={() => setVoice(false)} />
    </View>
  );
}

function Root() {
  const { state } = useStore();
  return (
    <>
      <StatusBar style="light" />
      {state.user ? <Shell key={state.user.name} /> : <LoginScreen />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  wallet: { color: '#B8C6CF', fontSize: 12, marginRight: 10, fontWeight: '600' },
  roleChip: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleChipText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 84,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
