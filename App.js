import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
import CategoryMenu from './src/components/CategoryMenu';
import UpdateChecker from './src/components/UpdateChecker';

// Cada perfil enxerga abas diferentes dentro do MESMO app.
const TABS = {
  admin: [
    { key: 'geral', label: 'Geral', icon: 'shield-checkmark-outline', Comp: AdminOverview },
    { key: 'moderacao', label: 'Moderação', icon: 'flag-outline', Comp: AdminModeration },
    { key: 'cadastros', label: 'Cadastros', icon: 'checkmark-done-outline', Comp: AdminSignups },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  cliente: [
    { key: 'inicio', label: 'Início', icon: 'home-outline', Comp: FeedScreen },
    { key: 'loja', label: 'Loja', icon: 'bag-handle-outline', Comp: StoreScreen },
    { key: 'servicos', label: 'Serviços', icon: 'construct-outline', Comp: ServicesScreen },
    { key: 'pedidos', label: 'Pedidos', icon: 'receipt-outline', Comp: OrdersScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  empresa: [
    { key: 'painel', label: 'Painel', icon: 'speedometer-outline', Comp: DashboardScreen },
    { key: 'estoque', label: 'Estoque', icon: 'file-tray-stacked-outline', Comp: InventoryScreen },
    { key: 'caixa', label: 'Caixa', icon: 'wallet-outline', Comp: FinanceScreen },
    { key: 'negocios', label: 'Negócios', icon: 'swap-horizontal-outline', Comp: B2BScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  prestador: [
    { key: 'prestar', label: 'Trabalhar', icon: 'navigate-circle-outline', Comp: DriverScreen },
    { key: 'inicio', label: 'Feed', icon: 'home-outline', Comp: FeedScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  fornecedor: [
    { key: 'propostas', label: 'Propostas', icon: 'cube-outline', Comp: SupplierScreen },
    { key: 'inicio', label: 'Feed', icon: 'home-outline', Comp: FeedScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
};

function Shell() {
  const { state, dispatch } = useStore();
  const tabs = TABS[state.activeRole];
  const [tab, setTab] = useState(tabs[0].key);
  const [voice, setVoice] = useState(false);
  const [menu, setMenu] = useState(false);
  const [explore, setExplore] = useState(null);
  const pendingTab = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setTab(pendingTab.current || TABS[state.activeRole][0].key);
    pendingTab.current = null;
  }, [state.activeRole]);

  const current = tabs.find((t) => t.key === tab) || tabs[0];
  const Comp = current.Comp;
  const nextRole = () => {
    const r = state.user.roles;
    dispatch({ type: 'SET_ROLE', role: r[(r.indexOf(state.activeRole) + 1) % r.length] });
  };

  // Escolha feita no menu ⋮: vai para a aba certa (trocando de perfil se precisar).
  const pick = (go) => {
    setMenu(false);
    setExplore({ ...go, at: Date.now() });
    const has = (role) => TABS[role].some((t) => t.key === go.tab);
    if (has(state.activeRole)) return setTab(go.tab);
    const role = state.user.roles.find(has);
    if (!role) {
      return Alert.alert('Acesso de empresa', 'Essa área é para contas com CNPJ. Cadastre uma empresa no login para acessar.');
    }
    pendingTab.current = go.tab;
    dispatch({ type: 'SET_ROLE', role });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.logoMark}>
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.brand}>REALYS</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={nextRole} style={styles.roleChip} accessibilityLabel="Trocar de perfil">
            <Ionicons name="swap-horizontal" size={13} color={colors.primary} />
            <Text style={styles.roleChipText}>{ROLE_LABELS[state.activeRole]}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenu(true)}
            style={[styles.dots, menu && styles.dotsOn]}
            accessibilityLabel="Abrir menu de categorias"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.subHeader}>
        <View style={styles.idPill}>
          <Ionicons name="scan-outline" size={12} color={colors.primary} />
          <Text style={styles.idText}>ID biométrico verificado</Text>
        </View>
        <Text style={styles.wallet}>Saldo {brl(state.wallet)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Comp goTo={setTab} openVoice={() => setVoice(true)} explore={explore} />
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: 84 + insets.bottom }]}
        onPress={() => setVoice(true)}
        activeOpacity={0.85}
        accessibilityLabel="Falar com a Realys"
      >
        <Ionicons name="mic" size={26} color={colors.primary} />
      </TouchableOpacity>

      <View style={[styles.tabbar, { paddingBottom: 10 + insets.bottom }]}>
        {tabs.map((t) => {
          const on = t.key === current.key;
          return (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={22} color={on ? colors.primary : colors.muted} />
              <Text style={[styles.tabLabel, on && { color: colors.primary, fontWeight: '700' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <VoiceAssistant visible={voice} onClose={() => setVoice(false)} />
      <CategoryMenu visible={menu} onClose={() => setMenu(false)} onPick={pick} />
    </View>
  );
}

function Root() {
  const { state } = useStore();
  return (
    <>
      <StatusBar style="light" />
      {state.user ? <Shell key={state.user.name} /> : <LoginScreen />}
      <UpdateChecker />
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
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: 4 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.45)',
    backgroundColor: 'rgba(59,232,255,0.08)',
    marginRight: 8,
  },
  roleChipText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  dots: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsOn: { borderColor: colors.primary, backgroundColor: 'rgba(59,232,255,0.14)' },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.3)',
  },
  idText: { color: colors.primary, fontSize: 11, fontWeight: '600', marginLeft: 5 },
  wallet: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#0A0E18',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11, color: colors.muted, marginTop: 3 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 84,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
});
