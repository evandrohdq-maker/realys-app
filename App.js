import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, BackHandler, ToastAndroid, ActivityIndicator, Image } from 'react-native';
import { BackProvider, createBackStack } from './src/back';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StoreProvider, useStore } from './src/store';
import { colors, brl, ROLE_LABELS, soft } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VoiceAssistant from './src/screens/VoiceAssistant';
import { LotusMic } from './src/components/LotusFlower';
import FeedScreen from './src/screens/cliente/FeedScreen';
import HomeScreen from './src/screens/cliente/home/HomeScreen';
import StoriesScreen from './src/screens/StoriesScreen';
import EncontrosScreen from './src/screens/cliente/EncontrosScreen';
import StoreScreen, { FoodScreen } from './src/screens/cliente/StoreScreen';
import ServicesScreen from './src/screens/cliente/ServicesScreen';
import OrdersScreen from './src/screens/cliente/OrdersScreen';
import DashboardScreen from './src/screens/empresa/DashboardScreen';
import InventoryScreen from './src/screens/empresa/InventoryScreen';
import FinanceScreen from './src/screens/empresa/FinanceScreen';
import B2BScreen from './src/screens/empresa/B2BScreen';
import DriverScreen from './src/screens/prestador/DriverScreen';
import AgendaScreen from './src/screens/prestador/AgendaScreen';
import SupplierScreen from './src/screens/fornecedor/SupplierScreen';
import { AdminOverview, AdminModeration, AdminSignups } from './src/screens/admin/AdminScreens';
import AdminMarket from './src/screens/admin/AdminMarket';
import CategoryMenu from './src/components/CategoryMenu';
import UpdateChecker from './src/components/UpdateChecker';
import { AdminSystem, NoteModal, SYSTEM_MAP } from './src/screens/admin/AdminSystem';
import { WakeWordListener } from './src/wakeWord';
import { findNavigation, navReply } from './src/voiceNav';
import { findMandadoAction } from './src/voiceMandados';
import LotusCartao from './src/components/LotusCartao';
import { findProfile, openReply } from './src/voiceIntents';
import { stripWake } from './src/wakeMatch';
import { speakSoft, prepareVoice } from './src/voice';
import { loadModel } from './src/lm/lotusLM';
import { UserProfileModal, PeopleSearchModal } from './src/components/People';
import { CompanyProfileModal } from './src/components/CompanyProfile';
import GiftSheet from './src/components/GiftSheet';
import CartSheet, { CartIcon } from './src/components/CartSheet';
import { PixPayHost } from './src/components/PixPay';
import RateSheet, { LoyaltyNotifier } from './src/components/RateSheet';
import VenueSheet, { VenuePill } from './src/components/VenueSheet';
import AlertPill from './src/components/AlertPill';
import { GlobalLive } from './src/components/LiveBits';
import ProviderProfile from './src/screens/cliente/ProviderProfile';
import { ProviderPreviewModal } from './src/components/ProviderPreview';
import TransitScreen from './src/screens/cliente/TransitScreen';
import SosScreen from './src/screens/cliente/SosScreen';
import ArtistsScreen from './src/screens/cliente/ArtistsScreen';
import PageScreen from './src/screens/empresa/PageScreen';
import JobsScreen from './src/screens/cliente/JobsScreen';
import HRScreen from './src/screens/empresa/HRScreen';
import { TechScreen, AgroScreen } from './src/screens/cliente/TechAgroScreen';
import { ElectronicsScreen, FashionScreen, HomeGoodsScreen, AppliancesScreen, FurnitureScreen, VariousScreen, EXTRA_SECTOR_KEYS, SECTOR_SCREENS } from './src/screens/cliente/ShopSectorScreen';
import { SHOP_SECTORS } from './src/shopSectorsData';

// Cada perfil enxerga abas diferentes dentro do MESMO app.
const TABS = {
  admin: [
    { key: 'geral', label: 'Geral', icon: 'shield-checkmark-outline', Comp: AdminOverview },
    { key: 'sistema', label: 'Sistema', icon: 'git-network-outline', Comp: AdminSystem },
    { key: 'mercado', label: 'Mercado', icon: 'analytics-outline', Comp: AdminMarket },
    { key: 'moderacao', label: 'Moderação', icon: 'flag-outline', Comp: AdminModeration },
    { key: 'cadastros', label: 'Cadastros', icon: 'checkmark-done-outline', Comp: AdminSignups },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  cliente: [
    // Community vem primeiro: é a aba que abre quando o app inicia.
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen },
    { key: 'home', label: 'Shop', icon: 'bag-handle-outline', Comp: HomeScreen },
    { key: 'encontros', label: 'Date', icon: 'heart-outline', Comp: EncontrosScreen },
    { key: 'food', label: 'Food', icon: 'restaurant-outline', Comp: FoodScreen },
    { key: 'servicos', label: 'Serviços', icon: 'construct-outline', Comp: ServicesScreen },
    { key: 'pedidos', label: 'Pedidos', icon: 'receipt-outline', Comp: OrdersScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
    // Abertas pelo menu ⋮ (e pelo SOS da aba Perfil): não ocupam lugar na barra de baixo.
    { key: 'transporte', label: 'Transporte', icon: 'bus-outline', Comp: TransitScreen, hidden: true },
    { key: 'socorro', label: 'Socorro', icon: 'medkit-outline', Comp: SosScreen, hidden: true },
    { key: 'artistas', label: 'Artistas', icon: 'musical-notes-outline', Comp: ArtistsScreen, hidden: true },
    { key: 'vagas', label: 'Empregos', icon: 'briefcase-outline', Comp: JobsScreen, hidden: true },
    { key: 'tecnologia', label: 'Tecnologia', icon: 'hardware-chip-outline', Comp: TechScreen, hidden: true },
    { key: 'agro', label: 'Agro', icon: 'leaf-outline', Comp: AgroScreen, hidden: true },
    { key: 'eletronicos', label: 'Eletrônicos', icon: 'phone-portrait-outline', Comp: ElectronicsScreen, hidden: true },
    { key: 'vestuario', label: 'Vestuário', icon: 'shirt-outline', Comp: FashionScreen, hidden: true },
    { key: 'casa', label: 'Utensílios domésticos', icon: 'home-outline', Comp: HomeGoodsScreen, hidden: true },
    { key: 'eletrodomesticos', label: 'Eletrodomésticos', icon: 'snow-outline', Comp: AppliancesScreen, hidden: true },
    { key: 'moveis', label: 'Móveis e decoração', icon: 'bed-outline', Comp: FurnitureScreen, hidden: true },
    { key: 'varios', label: 'Vários', icon: 'apps-outline', Comp: VariousScreen, hidden: true },
    // Setores novos do Shop (Beleza, Esporte, Bebês, Pet, Auto e moto, Construção, Livros, Brinquedos, Música, Joias).
    ...EXTRA_SECTOR_KEYS.map((k) => ({ key: k, label: SHOP_SECTORS[k].title, icon: SHOP_SECTORS[k].ion, Comp: SECTOR_SCREENS[k], hidden: true })),
    // Loja geral (todas as lojas): aberta pelo Shop do Início e pela busca.
    { key: 'loja', label: 'Loja', icon: 'bag-handle-outline', Comp: StoreScreen, hidden: true },
  ],
  empresa: [
    { key: 'painel', label: 'Painel', icon: 'speedometer-outline', Comp: DashboardScreen },
    { key: 'estoque', label: 'Estoque', icon: 'file-tray-stacked-outline', Comp: InventoryScreen },
    { key: 'caixa', label: 'Caixa', icon: 'wallet-outline', Comp: FinanceScreen },
    { key: 'negocios', label: 'Negócios', icon: 'swap-horizontal-outline', Comp: B2BScreen },
    { key: 'rh', label: 'RH', icon: 'people-outline', Comp: HRScreen },
    { key: 'pagina', label: 'Página', icon: 'albums-outline', Comp: PageScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  prestador: [
    { key: 'prestar', label: 'Trabalhar', icon: 'navigate-circle-outline', Comp: DriverScreen },
    { key: 'agenda', label: 'Agenda', icon: 'calendar-outline', Comp: AgendaScreen },
    { key: 'inicio', label: 'Feed', icon: 'home-outline', Comp: FeedScreen },
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
    { key: 'vagas', label: 'Empregos', icon: 'briefcase-outline', Comp: JobsScreen, hidden: true },
  ],
  fornecedor: [
    { key: 'propostas', label: 'Propostas', icon: 'cube-outline', Comp: SupplierScreen },
    { key: 'inicio', label: 'Feed', icon: 'home-outline', Comp: FeedScreen },
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
};

function Shell() {
  const { state, dispatch } = useStore();
  const tabs = TABS[state.activeRole];
  const [tab, setTabRaw] = useState(tabs[0].key);
  // Caminho percorrido (para o botão voltar do celular): [{ role, tab }]
  const history = useRef([]);
  const backStack = useMemo(createBackStack, []);
  const lastBack = useRef(0);
  const live = useRef({});
  const [voice, setVoice] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState(null); // mensagem da Lotus aguardando sim/não (só chat)
  const [cartaoLotus, setCartaoLotus] = useState(null); // cartão de confirmação com botões (finalização, dinheiro)
  const [menu, setMenu] = useState(false);
  const [explore, setExplore] = useState(null);
  const [noting, setNoting] = useState(false);
  const [wakeCmd, setWakeCmd] = useState(null);
  const [hearing, setHearing] = useState(false);
  const [searching, setSearching] = useState(false);
  const isAdmin = state.user.roles.includes('admin');
  const pendingTab = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setTabRaw(pendingTab.current || TABS[state.activeRole][0].key);
    pendingTab.current = null;
  }, [state.activeRole]);

  // Troca de aba guardando de onde veio.
  const setTab = (key) => {
    if (key === tab) return;
    history.current = [...history.current, { role: state.activeRole, tab }].slice(-30);
    setTabRaw(key);
  };
  const switchRole = (role, tabKey) => {
    history.current = [...history.current, { role: state.activeRole, tab }].slice(-30);
    pendingTab.current = tabKey || null;
    dispatch({ type: 'SET_ROLE', role });
  };

  // Botão voltar do Android: 1) volta dentro da tela, 2) volta para a aba anterior,
  // 3) vai para a aba inicial, 4) na aba inicial, pede um segundo toque para sair.
  live.current = { tab, role: state.activeRole };
  // Volta um passo (usado pelo botão do celular e pelo "voltar" falado para a Lotus).
  // Retorna false quando já está na aba inicial sem nada para voltar.
  const goBack = () => {
    if (backStack.pop()) return true;
    const { tab: curTab, role } = live.current;
    const prev = history.current.pop();
    if (prev) {
      if (prev.role !== role && TABS[prev.role] && state.user.roles.includes(prev.role)) {
        pendingTab.current = prev.tab;
        dispatch({ type: 'SET_ROLE', role: prev.role });
      } else if (TABS[role].some((t) => t.key === prev.tab)) {
        setTabRaw(prev.tab);
      } else {
        setTabRaw(TABS[role][0].key);
      }
      return true;
    }
    const first = TABS[role][0].key;
    if (curTab !== first) {
      setTabRaw(first);
      return true;
    }
    return false;
  };
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (goBackRef.current()) return true;
      const now = Date.now();
      if (now - lastBack.current < 2000) return false; // segundo toque: sai do app
      lastBack.current = now;
      if (Platform.OS === 'android') ToastAndroid.show('Toque em voltar de novo para sair do Realys', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);

  // A voz da Lotus já fica escolhida desde a abertura do app (resposta sem atraso),
  // e o modelo de linguagem carrega logo depois que a tela aparece.
  useEffect(() => {
    prepareVoice();
    const t = setTimeout(() => {
      try {
        loadModel();
      } catch (e) {}
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const current = tabs.find((t) => t.key === tab) || tabs[0];
  const Comp = current.Comp;
  const nextRole = () => {
    const r = state.user.roles;
    switchRole(r[(r.indexOf(state.activeRole) + 1) % r.length]);
  };

  // Administrador abrindo qualquer tela pelo mapa do sistema.
  const openArea = (role, tabKeyIn, top) => {
    const tabKey = route({ tab: tabKeyIn, top }).tab;
    setExplore({ tab: tabKey, top, at: Date.now() });
    if (role === state.activeRole) return setTab(tabKey);
    switchRole(role, tabKey);
  };
  const mapped = SYSTEM_MAP.flatMap((g) => g.items).filter((i) => i.role === state.activeRole && i.tab === current.key);
  const where = mapped.length === 1 ? mapped[0].name : `${ROLE_LABELS[state.activeRole]} › ${current.label}`;

  // Eventos, Promoções, Anúncios e Lives agora ficam na Community (antes ficavam no Shop).
  const route = (go) =>
    go && go.tab === 'home' && ['noticias', 'eventos', 'promo', 'anuncios', 'lives', 'comunidade'].includes(go.top) ? { ...go, tab: 'stories' } : go;

  // Escolha feita no menu ⋮: vai para a aba certa (trocando de perfil se precisar).
  const pick = (goIn) => {
    const go = route(goIn);
    setMenu(false);
    if (go.cart) return dispatch({ type: 'OPEN_CART' }); // carrinho: abre a janela sobre a tela atual
    setExplore({ ...go, at: Date.now() });
    const has = (role) => TABS[role].some((t) => t.key === go.tab);
    if (has(state.activeRole)) return setTab(go.tab);
    const role = state.user.roles.find(has);
    if (!role) {
      return Alert.alert('Acesso de empresa', 'Essa área é para contas com CNPJ. Cadastre uma empresa no login para acessar.');
    }
    switchRole(role, go.tab);
  };

  // Componentes (carrinho, cartões de aviso...) pedem para ir a uma área: dispatch({ type: 'NAV_REQUEST', go }).
  useEffect(() => {
    if (state.navReq) pick(state.navReq.go);
  }, [state.navReq]);

  // A Lotus só leva para áreas que a conta pode abrir.
  const canOpen = (tabKey) => state.user.roles.some((r) => TABS[r] && TABS[r].some((t) => t.key === tabKey));
  // Navegação falada: "me leva pro Agro", "abre o Food", "voltar".
  const voiceGo = (nav) => {
    setVoice(false);
    setWakeCmd(null);
    if (nav.back) {
      if (!goBack()) speakSoft('Você já está no início.');
      return;
    }
    pick(nav.go);
  };

  return (
    <BackProvider value={backStack}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Logo do Realys à esquerda (o R dourado, mesmo ícone do app). */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel="Realys, ID biométrico verificado">
          <Image source={require('./assets/icon.png')} style={styles.logoImg} />
          <Text style={styles.brand}>REALYS</Text>
          {/* Selo de ID verificado: só um check discreto ao lado da marca */}
          <Ionicons name="checkmark-circle" size={14} color={colors.gold} style={{ marginLeft: 5 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Carrinho discreto: só aparece quando há itens */}
          <CartIcon style={styles.iconBtn} />
          <TouchableOpacity onPress={() => setSearching(true)} style={styles.iconBtn} accessibilityLabel="Buscar pessoas na rede Realys">
            <Ionicons name="search-outline" size={21} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenu(true)}
            style={[styles.iconBtn, menu && styles.iconBtnOn]}
            accessibilityLabel="Abrir menu: perfis de acesso e categorias"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Faixa de avisos: só aparece quando há algo (comanda do evento, mãos livres). */}
      <View style={styles.subHeader}>
        <AlertPill />
        <VenuePill style={[styles.idPill, { marginRight: 6 }]} textStyle={styles.idText} />
        {state.handsFree ? (
          <View style={[styles.idPill, hearing && { backgroundColor: 'rgba(47,116,208,0.1)' }]}>
            <Ionicons name={hearing ? 'ear' : 'ear-outline'} size={12} color={hearing ? colors.accent : colors.muted} />
            <Text style={[styles.idText, { color: hearing ? colors.accent : colors.muted }]}>{hearing ? 'Diga "abrir Lotus"' : 'Mãos livres'}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <Comp goTo={setTab} openVoice={() => setVoice(true)} explore={explore} openArea={openArea} navigate={pick} />
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: 84 + insets.bottom }]}
        onPress={() => setVoice(true)}
        activeOpacity={0.85}
        accessibilityLabel="Falar com a Lotus"
      >
        {/* A Lotus é o microfone: só a flor dourada, sem fundo. */}
        <LotusMic hearing={state.handsFree && hearing} open={voice} />
      </TouchableOpacity>

      {isAdmin ? (
        <View style={[styles.adminTools, { bottom: 90 + insets.bottom }]}>
          <TouchableOpacity style={styles.adminBtn} onPress={() => setNoting(true)} accessibilityLabel="Anotar mudança nesta tela">
            <Ionicons name="create-outline" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
          {state.activeRole !== 'admin' ? (
            <TouchableOpacity
              style={[styles.adminBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent, marginTop: 8 }]}
              onPress={() => openArea('admin', 'sistema')}
              accessibilityLabel="Voltar ao mapa do sistema"
            >
              <Ionicons name="git-network-outline" size={19} color={colors.accent} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.tabbar, { paddingBottom: 10 + insets.bottom }]}>
        {tabs.filter((t) => !t.hidden).map((t) => {
          const on = t.key === current.key;
          return (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => {
              // Community no rodapé sempre volta para o feed (sai de Eventos, Lives etc.).
              if (t.key === 'stories') setExplore({ tab: 'stories', at: Date.now() });
              setTab(t.key);
            }}>
              {/* Aba ativa: ícone dourado dentro de uma pílula clarinha */}
              <View style={[styles.tabIcon, on && styles.tabIconOn]}>
                <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={21} color={on ? colors.primary : colors.muted} />
              </View>
              <Text numberOfLines={1} style={[styles.tabLabel, on && { color: colors.primaryDark, fontWeight: '700' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <VoiceAssistant
        visible={voice}
        onClose={() => {
          setVoice(false);
          setWakeCmd(null);
        }}
        initialCommand={wakeCmd}
        handsFree={state.handsFree}
        onNavigate={(go) => {
          setVoice(false);
          setWakeCmd(null);
          pick(go);
        }}
        onVoiceNav={voiceGo}
        canOpen={canOpen}
      />
      <WakeWordListener
        enabled={state.handsFree && !voice && !menu && !noting && !searching}
        onListening={setHearing}
        onWake={(text) => {
          // "abrir Lotus, me leva pro Agro": vai direto, sem abrir a caixa da Lotus.
          // "abrir Lotus, abre o perfil do Diego": abre o perfil direto.
          const prof = text ? findProfile(stripWake(text), state) : null;
          if (prof && prof.open) {
            speakSoft(openReply(prof.open, prof.others));
            dispatch({ type: prof.open.kind === 'company' ? 'OPEN_COMPANY' : 'OPEN_PROFILE', id: prof.open.id });
            return;
          }
          // Ação pendente de confirmação: "sim" executa, "não" cancela; outra fala descarta a pergunta.
          if (acaoPendente && text) {
            const resp = stripWake(text).toLowerCase();
            setAcaoPendente(null);
            if (/^(sim|confirma|confirmo|pode sim|pode confirmar|isso|claro|ok|beleza)\b/.test(resp)) {
              speakSoft(acaoPendente.reply);
              dispatch({ type: 'MANDADOS_UPDATE', updater: acaoPendente.updater });
              return;
            }
            if (/^(nao|não|cancela|cancelar|deixa)\b/.test(resp)) {
              speakSoft('Cancelado. Nada foi enviado.');
              return;
            }
          }
          // Mandados de serviço: "finaliza com o código QR-…" e "manda no chat: …" (dentro do prazo).
          const acao = text && !prof ? findMandadoAction(stripWake(text), state.mandados) : null;
          if (acao) {
            if (acao.cartao) {
              // Contratação e dinheiro: abre o cartão. A voz não confirma.
              const updater = acao.updater;
              setCartaoLotus({ ...acao.cartao, confirmar: () => dispatch({ type: 'MANDADOS_UPDATE', updater }) });
              speakSoft(acao.reply);
              return;
            }
            if (acao.updater && acao.pergunta) {
              setAcaoPendente(acao);
              speakSoft(acao.pergunta);
              return;
            }
            speakSoft(acao.reply);
            return;
          }
          const nav = text && !prof ? findNavigation(stripWake(text)) : null;
          if (nav && (nav.back || canOpen(nav.go.tab))) {
            speakSoft(navReply(nav));
            return voiceGo(nav);
          }
          setWakeCmd({ text, at: Date.now() });
          setVoice(true);
        }}
        onFatal={(msg) => {
          dispatch({ type: 'SET_HANDSFREE', on: false });
          Alert.alert('Mãos livres desligado', msg);
        }}
      />
      <LotusCartao cartao={cartaoLotus} onClose={() => setCartaoLotus(null)} />
      <PeopleSearchModal visible={searching} onClose={() => setSearching(false)} navigate={pick} />
      <UserProfileModal />
      <CompanyProfileModal />
      <GiftSheet />
      <CartSheet onOrders={() => pick({ tab: 'pedidos' })} />
      {/* Compra sem saldo: janela do Pix (valor inteiro ou saldo + restante). */}
      <PixPayHost />
      <RateSheet />
      <LoyaltyNotifier />
      <VenueSheet />
      <GlobalLive />
      {/* Perfil de prestador aberto de qualquer lugar (ex.: pela live dele) */}
      {state.viewProvider ? (
        <ProviderProfile
          provider={state.providers.find((x) => x.id === state.viewProvider)}
          visible
          onClose={() => dispatch({ type: 'CLOSE_PROVIDER' })}
          onHire={(p) => {
            dispatch({ type: 'CLOSE_PROVIDER' });
            pick({ tab: 'servicos', service: p.service });
          }}
          onQuote={(p) => Alert.alert('Orçamento pedido', `${p.name} recebeu seu pedido. A proposta chega no chat do Realys.`)}
          onMessage={(p) => Alert.alert('Mensagem', `Conversa com ${p.name.split(' ')[0]} aberta no chat do Realys.`)}
        />
      ) : null}
      {/* Prévia do prestador tocado na pesquisa: só para analisar, sem mensagem nem chamar */}
      <ProviderPreviewModal
        provider={state.previewProvider ? state.providers.find((x) => x.id === state.previewProvider) : null}
        onClose={() => dispatch({ type: 'CLOSE_PREVIEW_PROVIDER' })}
      />
      <CategoryMenu
        visible={menu}
        onClose={() => setMenu(false)}
        onPick={pick}
        roles={state.user.roles}
        activeRole={state.activeRole}
        onRole={(r) => {
          setMenu(false);
          if (r !== state.activeRole) switchRole(r);
        }}
      />
      {isAdmin ? <NoteModal visible={noting} where={where} onClose={() => setNoting(false)} /> : null}
    </View>
    </BackProvider>
  );
}

function Root() {
  const { state } = useStore();
  return (
    <>
      <StatusBar style="dark" />
      {!state.ready ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.brand, { fontSize: 26, marginBottom: 16 }]}>REALYS</Text>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state.user ? (
        <Shell key={state.user.name} />
      ) : (
        <LoginScreen />
      )}
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
    paddingHorizontal: 18,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  logoImg: { width: 28, height: 28, borderRadius: 8, marginRight: 8 },
  // Ícones do topo soltos, sem caixinha (visual clean).
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  iconBtnOn: { backgroundColor: colors.primaryLight },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  idText: { color: colors.primaryDark, fontSize: 11, fontWeight: '600', marginLeft: 5 },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 12,
    shadowColor: '#7A5806',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
  },
  tab: { flex: 1, alignItems: 'center' },
  tabIcon: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: colors.primaryLight },
  tabLabel: { fontSize: 10, color: colors.muted, marginTop: 3 },
  adminTools: { position: 'absolute', left: 18, alignItems: 'center' },
  adminBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...soft,
    elevation: 4,
  },
  // Botão da Lotus: só o desenho da flor, sem fundo, sem borda e sem sombra.
  fab: {
    position: 'absolute',
    right: 14,
    bottom: 84,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
