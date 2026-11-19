import './src/pipModal'; // janelinha: só o player por cima (antes de qualquer tela)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, TouchableOpacity, StyleSheet, Platform, Alert, BackHandler, ToastAndroid, ActivityIndicator, Image } from 'react-native';
import { Text, setTextBoost, BIG_TEXT_KEY } from './src/responsive';
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
import NegociosScreen, { NEGOCIOS_KINDS } from './src/screens/cliente/NegociosScreen';
import AnuncieScreen from './src/screens/AnuncieScreen';
import StoreScreen, { FoodScreen } from './src/screens/cliente/StoreScreen';
import ServicesScreen from './src/screens/cliente/ServicesScreen';
import OrdersScreen from './src/screens/cliente/OrdersScreen';
import DashboardScreen from './src/screens/empresa/DashboardScreen';
import CrmScreen from './src/screens/empresa/CrmScreen';
import { crmSyncVisits } from './src/crm';
import AdminSupport from './src/screens/admin/AdminSupport';
const CRM_PRESTADOR = ['prestador', 'aulas', 'online'];
const CrmPrestador = () => <CrmScreen board="prestador" boards={CRM_PRESTADOR} />;
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
import { loadVoicePrint } from './src/voicePrint';
import { loadPanic, panicConfig } from './src/panic';
import { RideWatcher } from './src/rideRules';
import DocsCenter from './src/components/DocsCenter';
import { PublicOrgModal } from './src/components/PublicOrg';
import UserPageModal from './src/components/UserPageModal';
import PagesScreen from './src/screens/cliente/PagesScreen';
import { VideoCallHost } from './src/components/LiveVideo';
import TermoReaceite from './src/components/TermoReaceite';
import AccountBlocked from './src/components/AccountBlocked';
import LotusSOS from './src/components/LotusSOS';
import SecurityEvents from './src/components/SecurityEvents';
import { SoftAlertHost, installSoftAlert } from './src/components/SoftAlert';

// Avisos no estilo do Re@lys no app inteiro (no lugar da caixa cinza do Android).
installSoftAlert();
import { callNow } from './src/phone';
import { getDevicePoint } from './src/geo';
import { triggerDuress, triggerSilent } from './src/duress';
import { syncAlert, syncAlertPlace } from './src/securitySync';
import { stopSpeaking } from './src/voice';
import { findNavigation, navReply } from './src/voiceNav';
import { findMandadoAction } from './src/voiceMandados';
import LotusCartao from './src/components/LotusCartao';
import { openAction, findProfile, openReply } from './src/voiceIntents';
import { stripWake } from './src/wakeMatch';
import { speakSoft, prepareVoice } from './src/voice';
import { loadModel } from './src/lm/lotusLM';
import { UserProfileModal, PeopleSearchModal } from './src/components/People';
import { listenInviteLinks, savePendingInvite, takePendingInvite, parseInviteUrl, resolveInvite } from './src/callInvite';
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
import DesapegoScreen from './src/screens/cliente/DesapegoScreen';
import ReelsScreen from './src/screens/cliente/ReelsScreen';
import ArenaScreen from './src/screens/cliente/ArenaScreen';
import SalasScreen from './src/screens/empresa/SalasScreen';
import { ScreenShareBar } from './src/components/ScreenShareKit';
import { StationProfileHost } from './src/components/StationProfile';
import PipManager from './src/components/PipManager';
import { minimizeApp, playingKind } from './src/pip';
import { openProfileMenu } from './src/profileMenu';
import { ProductSheetHost } from './src/components/ProductSheet';
import RadiosScreen from './src/screens/cliente/RadiosScreen';
import { RadioHost, RadioHeadChip } from './src/components/RadioKit';
import { ArtistSheetHost } from './src/components/ArtistSheet';
import { TvFloat, LiveFloat } from './src/components/FloatPlayers';
import { BioGateModal, LockedScreen, canOpenTab, isVerified, useServerBio } from './src/components/BioGate';
import HRScreen from './src/screens/empresa/HRScreen';
import { TechScreen, AgroScreen } from './src/screens/cliente/TechAgroScreen';
import { ElectronicsScreen, FashionScreen, HomeGoodsScreen, AppliancesScreen, FurnitureScreen, VariousScreen, EXTRA_SECTOR_KEYS, SECTOR_SCREENS } from './src/screens/cliente/ShopSectorScreen';
import { SHOP_SECTORS } from './src/shopSectorsData';
import SwipePages from './src/components/SwipePages';

// Cada perfil enxerga abas diferentes dentro do MESMO app.
const TABS = {
  admin: [
    { key: 'geral', label: 'Geral', icon: 'shield-checkmark-outline', Comp: AdminOverview },
    { key: 'sistema', label: 'Sistema', icon: 'git-network-outline', Comp: AdminSystem },
    { key: 'mercado', label: 'Mercado', icon: 'analytics-outline', Comp: AdminMarket },
    { key: 'moderacao', label: 'Moderação', icon: 'flag-outline', Comp: AdminModeration },
    { key: 'suporte', label: 'Suporte', icon: 'headset-outline', Comp: AdminSupport },
    { key: 'cadastros', label: 'Cadastros', icon: 'checkmark-done-outline', Comp: AdminSignups },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
  ],
  cliente: [
    // Community vem primeiro: é a aba que abre quando o app inicia.
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen },
    { key: 'home', label: 'Shop', icon: 'bag-handle-outline', Comp: HomeScreen },
    // Negócios (no lugar do Date): imóveis, veículos e máquinas, para comprar ou alugar.
    // A chave é 'bens' (e não 'negocios') porque 'negocios' já é a aba de negociações B2B do perfil Empresa.
    { key: 'bens', label: 'Negócios', icon: 'business-outline', Comp: NegociosScreen },
    { key: 'food', label: 'Food', icon: 'restaurant-outline', Comp: FoodScreen },
    { key: 'servicos', label: 'Serviços', icon: 'construct-outline', Comp: ServicesScreen },
    { key: 'pedidos', label: 'Pedidos', icon: 'receipt-outline', Comp: OrdersScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
    // Abertas pelo menu ⋮ (e pelo SOS da aba Perfil): não ocupam lugar na barra de baixo.
    // Reels: sem botão na barra. Abre arrastando a página inicial para a direita (como no Instagram)
    // ou pela Lotus; para publicar, é a opção Reel do botão de publicação.
    { key: 'reels', label: 'Reels', icon: 'play-circle-outline', Comp: ReelsScreen, hidden: true },
    // Anuncie no Re@lys: espaços de publicidade com preço fechado (menu ⋮ e Lotus).
    { key: 'anuncie', label: 'Anuncie', icon: 'megaphone-outline', Comp: AnuncieScreen, hidden: true },
    // Date: sem botão na barra. Abre pelo coraçãozinho discreto do Perfil (e pelo menu ⋮ e pela Lotus).
    { key: 'encontros', label: 'Date', icon: 'heart-outline', Comp: EncontrosScreen, hidden: true },
    { key: 'transporte', label: 'Transporte', icon: 'bus-outline', Comp: TransitScreen, hidden: true },
    { key: 'socorro', label: 'Socorro', icon: 'medkit-outline', Comp: SosScreen, hidden: true },
    { key: 'artistas', label: 'Artistas', icon: 'musical-notes-outline', Comp: ArtistsScreen, hidden: true },
    { key: 'vagas', label: 'Empregos', icon: 'briefcase-outline', Comp: JobsScreen, hidden: true },
    { key: 'paginas', label: 'Páginas', icon: 'albums-outline', Comp: PagesScreen, hidden: true },
    { key: 'desapego', label: 'Desapego', icon: 'pricetags-outline', Comp: DesapegoScreen, hidden: true },
    { key: 'arena', label: 'Arena Gamer', icon: 'game-controller-outline', Comp: ArenaScreen, hidden: true },
    // Salas de Negócios: atendimento ao vivo e reuniões das empresas (separado da Arena Gamer).
    { key: 'salas', label: 'Salas de Negócios', icon: 'headset-outline', Comp: SalasScreen, hidden: true },
    { key: 'radios', label: 'Rádios', icon: 'radio-outline', Comp: RadiosScreen, hidden: true },
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
    { key: 'clientes', label: 'Clientes', icon: 'chatbubbles-outline', Comp: CrmScreen },
    { key: 'estoque', label: 'Estoque', icon: 'file-tray-stacked-outline', Comp: InventoryScreen },
    { key: 'caixa', label: 'Caixa', icon: 'wallet-outline', Comp: FinanceScreen },
    { key: 'negocios', label: 'Negócios', icon: 'swap-horizontal-outline', Comp: B2BScreen },
    { key: 'rh', label: 'RH', icon: 'people-outline', Comp: HRScreen },
    { key: 'pagina', label: 'Página', icon: 'albums-outline', Comp: PageScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
    // Anúncios e propaganda da empresa (abre pelo Painel › Divulgação).
    { key: 'anuncie', label: 'Anuncie', icon: 'megaphone-outline', Comp: AnuncieScreen, hidden: true },
    // Salas de Negócios: recepção ao vivo, atendimento com tela compartilhada e reuniões da equipe (Painel).
    { key: 'salas', label: 'Salas de Negócios', icon: 'headset-outline', Comp: SalasScreen, hidden: true },
    // Community para a empresa ver o feed sem trocar de perfil (quando a conta não tem perfil de usuário).
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen, hidden: true },
  ],
  prestador: [
    { key: 'prestar', label: 'Trabalhar', icon: 'navigate-circle-outline', Comp: DriverScreen },
    { key: 'agenda', label: 'Agenda', icon: 'calendar-outline', Comp: AgendaScreen },
    { key: 'clientes', label: 'Clientes', icon: 'chatbubbles-outline', Comp: CrmPrestador },
    { key: 'inicio', label: 'Feed', icon: 'home-outline', Comp: FeedScreen },
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
    { key: 'vagas', label: 'Empregos', icon: 'briefcase-outline', Comp: JobsScreen, hidden: true },
    { key: 'paginas', label: 'Páginas', icon: 'albums-outline', Comp: PagesScreen, hidden: true },
    { key: 'salas', label: 'Salas de Negócios', icon: 'headset-outline', Comp: SalasScreen, hidden: true },
  ],
  fornecedor: [
    { key: 'propostas', label: 'Propostas', icon: 'cube-outline', Comp: SupplierScreen },
    { key: 'inicio', label: 'Feed', icon: 'home-outline', Comp: FeedScreen },
    { key: 'stories', label: 'Community', icon: 'people-circle-outline', Comp: StoriesScreen },
    { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline', Comp: ProfileScreen },
    { key: 'paginas', label: 'Páginas', icon: 'albums-outline', Comp: PagesScreen, hidden: true },
  ],
};

// Símbolo de cada perfil no botãozinho de troca do cabeçalho.
const ROLE_ICONS = { cliente: 'person', prestador: 'construct', empresa: 'business', fornecedor: 'cube' };

function Shell({ inviteTick }) {
  const { state, dispatch } = useStore();
  // Convite de chamada (link recebido por fora do app): depois de entrar ou se cadastrar, vai direto
  // para a sala de voz da Arena (src/callInvite.js).
  useEffect(() => {
    let alive = true;
    (async () => {
      const url = await takePendingInvite();
      const inv = parseInviteUrl(url);
      if (!inv || !alive) return;
      try {
        const r = await resolveInvite(inv);
        if (alive) dispatch({ type: 'NAV_REQUEST', go: { tab: 'arena', server: r.sid, voice: r.cid, host: r.host || null } });
      } catch (e) {
        Alert.alert('Convite de chamada', e.message || 'Não deu para abrir o convite. Peça um link novo.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [inviteTick]);
  // Conta sem biometria usa só o perfil de usuário (modo social).
  const verified = isVerified(state);
  useServerBio();
  // Prestador: pedidos de visita e visitas aceitas entram sozinhos no CRM (aba Clientes).
  const hasProvider = !!state.myProvider;
  useEffect(() => {
    if (hasProvider) crmSyncVisits({ requests: state.visitRequests, visits: state.myVisits });
  }, [hasProvider, state.visitRequests, state.myVisits]);
  const tabs = TABS[verified ? state.activeRole : TABS.cliente ? 'cliente' : state.activeRole] || TABS[state.activeRole];
  const [tab, setTabRaw] = useState(tabs[0].key);
  // Caminho percorrido (para o botão voltar do celular): [{ role, tab }]
  const history = useRef([]);
  const backStack = useMemo(createBackStack, []);
  const lastBack = useRef(0);
  const live = useRef({});
  const [voice, setVoice] = useState(false);
  // "abrir Lotus" ouvido: a caixa já abriu e o mesmo microfone segue ouvindo o resto do pedido.
  const [wakeCapture, setWakeCapture] = useState(false);
  const [wakeLive, setWakeLive] = useState('');
  // Voz do titular: cada conta tem a sua (celular compartilhado = cada um com a própria voz).
  const voiceOwner = state.user ? state.user.id || state.user.login || state.user.cpf || state.user.cnpj || state.user.name : null;
  useEffect(() => {
    loadVoicePrint(voiceOwner);
    loadPanic(voiceOwner);
  }, [voiceOwner]);
  // Chave de segurança do motorista: nada aparece na tela, a Lotus só diz "Certo." e, em silêncio,
  // registra o alerta com GPS e dados da corrida e liga para a polícia (190).
  const stateRef = useRef(state);
  stateRef.current = state;
  const panicNow = () => {
    const cfg = panicConfig() || {};
    const st = stateRef.current;
    setVoice(false);
    setWakeCmd(null);
    setWakeCapture(false);
    stopSpeaking();
    speakSoft(cfg.decoy || 'Certo.');
    const ride = st.rides.find((r) => !r.done && !r.provider) || st.rides.find((r) => !r.done);
    const me = st.myProvider || {};
    const id = 'pa' + Date.now();
    dispatch({
      type: 'PANIC_ALERT',
      alert: {
        id,
        at: Date.now(),
        userId: st.user ? st.user.id : null,
        who: st.user ? st.user.name : 'Prestador',
        vehicle: me.vehicle || null,
        plate: me.plate || null,
        ride: ride ? { client: ride.client || (ride.provider && ride.provider.name) || null, from: ride.from || null, to: ride.to && ride.to !== '-' ? ride.to : null, service: ride.service || ride.serviceLabel || null } : null,
        point: null,
        called190: cfg.call190 !== false,
        status: 'aberto',
      },
    });
    syncAlert(id, 'chave', { tipo: 'Chave de segurança do motorista', what: ride ? `Corrida${ride.client ? ` com ${ride.client}` : ''}${me.plate ? ` · placa ${me.plate}` : ''}` : null });
    getDevicePoint().then((p) => {
      if (!p) return;
      dispatch({ type: 'PANIC_UPDATE', id, data: { point: p } });
      syncAlertPlace(id, p);
    });
    if (cfg.call190 !== false) setTimeout(() => callNow('190'), 1200);
  };
  // Frase de segurança (coação) na hora de confirmar: a Lotus mostra que deu certo, nada é cobrado,
  // e em silêncio vai o alerta com GPS e endereço para a segurança do Re@lys, e a ligação para o 190.
  const duressNow = (info) => triggerDuress(dispatch, stateRef.current, info);
  const silentNow = (info) => triggerSilent(dispatch, stateRef.current, info);
  const [acaoPendente, setAcaoPendente] = useState(null); // mensagem da Lotus aguardando sim/não (só chat)
  const [cartaoLotus, setCartaoLotus] = useState(null); // cartão de confirmação com botões (finalização, dinheiro)
  const [menu, setMenu] = useState(false);
  const [cameFromEmpresa, setCameFromEmpresa] = useState(false); // entrou na Community pelo botão da empresa
  const [explore, setExplore] = useState(null);
  const [noting, setNoting] = useState(false);
  const [wakeCmd, setWakeCmd] = useState(null);
  const [hearing, setHearing] = useState(false);
  const [musicOn, setMusicOn] = useState(false); // música de outro app tocando: fala com a Lotus tocando na flor
  const [searching, setSearching] = useState(false);
  // Sub-aba aberta na Community ('comunidade' = feed, 'noticias' = Feed de Notícias...).
  const [commTop, setCommTop] = useState('comunidade');
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

  // Empresa › Community: usa o perfil de usuário (feed, Shop, Food, Serviços…). Sem perfil de usuário, abre só o feed.
  const goCommunity = () => {
    if (state.user.roles.includes('cliente') && verified) {
      setCameFromEmpresa(true);
      switchRole('cliente', 'stories');
    } else setTab('stories');
  };

  // Troca de perfil (botãozinho do cabeçalho): trabalho (prestador, empresa, fornecedor) ⇄ usuário.
  // Lembra qual era o perfil de trabalho para voltar direto para ele.
  const WORK_ROLES = ['prestador', 'empresa', 'fornecedor'];
  const workRoles = state.user.roles.filter((r) => WORK_ROLES.includes(r));
  const lastWork = useRef(WORK_ROLES.includes(state.activeRole) ? state.activeRole : workRoles[0]);
  if (WORK_ROLES.includes(state.activeRole)) lastWork.current = state.activeRole;
  const canSwap = verified && state.user.roles.includes('cliente') && workRoles.length > 0 && state.activeRole !== 'admin';
  const swapTarget = state.activeRole === 'cliente' ? lastWork.current || workRoles[0] : 'cliente';
  // Segurou o botão do Perfil: troca de perfil e avisa para qual foi.
  const swapHold = () => swapProfile();
  const swapProfile = () => {
    setCameFromEmpresa(false);
    if (Platform.OS === 'android') ToastAndroid.show(`Modo ${ROLE_LABELS[swapTarget].toLowerCase()}`, ToastAndroid.SHORT);
    switchRole(swapTarget, swapTarget === 'cliente' ? 'stories' : undefined);
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
      if (now - lastBack.current < 2000) {
        // Segundo toque: MINIMIZA o Re@lys (não fecha). Com rádio, TV ou live tocando, vira a
        // janelinha com a capa/vídeo e o som continua. Fechar de verdade = arrastar o app para
        // fora na tela de apps abertos, e aí o som para.
        lastBack.current = 0;
        if (!minimizeApp()) return false; // APK antigo, sem o módulo: comportamento de antes
        return true;
      }
      lastBack.current = now;
      if (Platform.OS === 'android') ToastAndroid.show(playingKind() ? 'Toque em voltar de novo para minimizar (o som continua)' : 'Toque em voltar de novo para minimizar o Re@lys', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);

  // A voz da Lotus já fica escolhida desde a abertura do app (resposta sem atraso).
  // O modelo de linguagem (190 mil palavras) é pesado para montar: em vez de travar a primeira
  // tela logo na abertura, ele carrega quando a Lotus é aberta (enquanto a pessoa ainda fala)
  // ou, se ninguém abrir, depois de uns segundos com o app parado.
  useEffect(() => {
    prepareVoice();
    const t = setTimeout(() => {
      try {
        loadModel();
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!voice) return;
    const t = setTimeout(() => {
      try {
        loadModel();
      } catch (e) {}
    }, 250);
    return () => clearTimeout(t);
  }, [voice]);

  const current = tabs.find((t) => t.key === tab) || tabs[0];
  // Aba de compra ou serviço numa conta sem biometria: mostra a tela "falta só a biometria".
  const Comp = canOpenTab(state, current.key) ? current.Comp : LockedScreen;
  // Menus: todo perfil tem o menu numa linha só, no rodapé. A empresa tem dois menus: 4 botões no
  // alto da tela (logo abaixo do cabeçalho) e 4 no rodapé.
  // Perfil não fica na barra: o botão dele está no cabeçalho (no lugar do antigo ⋮).
  const shownTabs = tabs.filter((t) => !t.hidden && t.key !== 'perfil');
  const splitMenu = verified && state.activeRole === 'empresa' && shownTabs.length > 4;
  // Empresa: em cima ficam Negócios, RH e Página (só o ícone, sem caixa e sem fundo);
  // embaixo, Painel, Clientes, Estoque e Caixa.
  const EMPRESA_TOP = ['negocios', 'rh', 'pagina'];
  const topMenu = splitMenu ? shownTabs.filter((t) => EMPRESA_TOP.includes(t.key)) : [];
  const bottomMenu = splitMenu ? shownTabs.filter((t) => !EMPRESA_TOP.includes(t.key)) : shownTabs;
  const renderTab = (t, iconOnly) => {
    const on = t.key === current.key;
    return (
      <TouchableOpacity key={t.key} style={styles.tab} accessibilityLabel={t.label} onPress={() => {
        // Prestador/fornecedor tocando em Community: entra no modo usuário, com as abas de baixo do app
        // (Shop, Negócios, Food, Serviços, Pedidos). O botãozinho de troca do cabeçalho traz de volta.
        if (t.key === 'stories' && canSwap && state.activeRole !== 'cliente') {
          setExplore({ tab: 'stories', at: Date.now() });
          return switchRole('cliente', 'stories');
        }
        // Community no rodapé sempre volta para o feed (sai de Eventos, Lives etc.).
        if (t.key === 'stories') setExplore({ tab: 'stories', at: Date.now() });
        setTab(t.key);
      }}>
        {/* Aba ativa: sem fundo, só o ícone e o nome em dourado */}
        <View style={styles.tabIcon}>
          {/* Menu de cima da empresa: ícone pequeno e suave (contorno fino), dourado quando ativo */}
          <Ionicons name={on && !iconOnly ? t.icon.replace('-outline', '') : t.icon} size={iconOnly ? 17 : 21} color={on ? colors.primary : iconOnly ? colors.muted : colors.menu} style={iconOnly && !on ? { opacity: 0.75 } : null} />
        </View>
        {iconOnly ? null : <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.tabLabel, on && { color: colors.primary, fontWeight: '800' }]}>{t.label}</Text>}
      </TouchableOpacity>
    );
  };
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
  // Gestos de arrastar: Reels ← [página inicial] → Perfil.
  // Puxando a tela para a direita abre os Reels; puxando para a esquerda abre o Perfil.
  const homeKey = tabs[0].key;
  const onNews = current.key === 'stories' && commTop === 'noticias';
  const onCommunityFeed = current.key === 'stories' && commTop === 'comunidade';
  const isHome = current.key === homeKey && (current.key !== 'stories' || commTop === 'comunidade');
  const openNews = () => pick({ tab: 'stories', top: 'noticias' });
  const openProfile = () => pick({ tab: 'perfil' });
  const backHome = () => (homeKey === 'stories' ? pick({ tab: 'stories' }) : setTab(homeKey));
  const hasReels = tabs.some((t) => t.key === 'reels');
  const openReels = () => pick({ tab: 'reels' });
  const swipe =
    isHome || onCommunityFeed
      ? { left: openProfile, right: hasReels ? openReels : undefined }
      : onNews
      ? { right: backHome }
      : current.key === 'perfil'
      ? { right: backHome }
      : current.key === 'reels'
      ? { left: backHome }
      : {};

  const mapped = SYSTEM_MAP.flatMap((g) => g.items).filter((i) => i.role === state.activeRole && i.tab === current.key);
  const where = mapped.length === 1 ? mapped[0].name : `${ROLE_LABELS[state.activeRole]} › ${current.label}`;

  // Eventos, Promoções, Anúncios e Lives agora ficam na Community (antes ficavam no Shop).
  const route = (go) => {
    if (!go || go.tab !== 'home') return go;
    // Imóveis, veículos e máquinas agora têm a aba Negócios.
    if (go.top === 'anuncios' && NEGOCIOS_KINDS.includes(go.kind)) return { ...go, tab: 'bens', top: undefined };
    return ['noticias', 'eventos', 'stream', 'promo', 'anuncios', 'lives', 'comunidade'].includes(go.top) ? { ...go, tab: 'stories' } : go;
  };

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
        {/* Só a logo (o R dentro do @), sem fundo dourado e sem o nome escrito: a palavra Re@lys fica só na entrada do app. */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel="Re@lys">
          <Image source={require('./assets/logo-mark.png')} style={styles.logoImg} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Troca de perfil: um símbolo só, pequeno. Mostra o perfil em uso; tocar troca trabalho ⇄ usuário. */}
          {/* A troca de perfil (usuário ⇄ trabalho) agora fica no botão do Perfil: segurar troca. */}
          {canSwap ? null : state.activeRole === 'empresa' ? (
            /* Empresa sem perfil de usuário: entra só no feed da Community. */
            <TouchableOpacity onPress={goCommunity} style={styles.rolePill} accessibilityLabel="Entrar na Community: ver o feed e usar os serviços">
              <Ionicons name="people-circle-outline" size={16} color={colors.text} />
              <Text numberOfLines={1} style={styles.rolePillText}>Community</Text>
            </TouchableOpacity>
          ) : cameFromEmpresa && state.user.roles.includes('empresa') ? (
            <TouchableOpacity onPress={() => { setCameFromEmpresa(false); switchRole('empresa'); }} style={styles.rolePill} accessibilityLabel="Voltar para a empresa">
              <Ionicons name="business-outline" size={15} color={colors.text} />
              <Text numberOfLines={1} style={styles.rolePillText}>Empresa</Text>
            </TouchableOpacity>
          ) : null}
          {/* Carrinho discreto: só aparece quando há itens */}
          <CartIcon style={styles.iconBtn} />
          <TouchableOpacity onPress={() => setSearching(true)} style={styles.iconBtn} accessibilityLabel="Buscar pessoas na rede Re@lys">
            <Ionicons name="search-outline" size={21} color={colors.text} />
          </TouchableOpacity>
          {/* Toque: abre o Perfil (dentro do Perfil vira o ⋮ do menu).
              Segurar 1 segundo: troca de perfil (usuário ⇄ prestador/empresa). O selinho mostra o perfil em uso. */}
          <TouchableOpacity
            onPress={current.key === 'perfil' ? openProfileMenu : () => pick({ tab: 'perfil' })}
            onLongPress={canSwap ? swapHold : undefined}
            delayLongPress={1000}
            style={styles.iconBtn}
            accessibilityLabel={(current.key === 'perfil' ? 'Abrir menu: minha conta e explorar o Re@lys' : 'Abrir meu perfil') + (canSwap ? `. Segure para trocar para ${ROLE_LABELS[swapTarget]}` : '')}
          >
            {current.key === 'perfil' ? (
              <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            ) : state.myProfile && state.myProfile.photo ? (
              <Image source={{ uri: state.myProfile.photo }} style={styles.headAvatar} />
            ) : (
              <Ionicons name="person-circle-outline" size={25} color={colors.text} />
            )}
            {canSwap ? (
              <View style={styles.swapBadge}>
                <Ionicons name={ROLE_ICONS[state.activeRole] || 'person'} size={8} color="#fff" />
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
      {/* Faixa de avisos: só aparece quando há algo (comanda do evento, mãos livres). */}
      {/* Mostrando a tela (sala ou live): aviso fixo com o botão Parar, em qualquer aba. */}
      <ScreenShareBar />
      <View style={styles.subHeader}>
        <AlertPill />
        <VenuePill style={[styles.idPill, { marginRight: 6 }]} textStyle={styles.idText} />
        {/* Sem aviso de "Mãos livres" / "Diga abrir Lotus": a flor da Lotus já mostra quando está ouvindo. */}
      </View>

      {/* Página inicial com arrastar para os lados (qualquer perfil):
          puxar para a direita → Reels, puxar para a esquerda → Perfil. De lá, o gesto contrário volta. */}
      {/* Empresa: primeiro menu, no alto da tela */}
      {topMenu.length ? <View style={styles.topMenu}>{topMenu.map((t) => renderTab(t, true))}</View> : null}
      <SwipePages onLeft={swipe.left} onRight={swipe.right}>
        <Comp goTo={setTab} openVoice={() => setVoice(true)} explore={explore} openArea={openArea} navigate={pick} onTop={setCommTop} />
      </SwipePages>

      {/* Rádio tocando: barrinha em qualquer tela (o player é um só no app). */}
      <BioGateModal />
      {/* Rádio ao vivo: sem barrinha dentro do app (o play/parar fica na página das rádios; a capa
          aparece só ao minimizar). Músicas: mini player com a capa e o botão do perfil do artista. */}
      {/* Rádio e músicas: playerzinho pequeno ao lado da logo do Re@lys (pretinho com borda dourada),
          com fechar, próxima música e o artista. A capa grande aparece só ao minimizar o app. */}
      <RadioHeadChip top={insets.top + 12} />
      <ArtistSheetHost />
      {/* TV da aba Stream e live minimizada: janelinhas flutuantes (segure e arraste). */}
      <TvFloat bottom={150 + insets.bottom} />
      {/* Perfil de rádio/TV (abre ao tocar no nome) e a janelinha por cima dos outros apps. */}
      <StationProfileHost />
      {/* Tela do produto (fotos, vídeo de 5 s, opções e ficha), aberta de qualquer vitrine. */}
      <ProductSheetHost />
      <PipManager />
      <LiveFloat bottom={150 + insets.bottom} />
      <TouchableOpacity
        style={[styles.fab, { bottom: 84 + insets.bottom }]}
        onPress={() => setVoice(true)}
        activeOpacity={0.85}
        accessibilityLabel="Falar com a Lotus"
      >
        {/* A Lotus é o microfone: só a flor dourada, sem fundo. */}
        <LotusMic hearing={state.handsFree && hearing} open={voice} />
        {/* Mãos livres: só um pontinho discreto na flor (dourado = ouvindo "abrir Lotus"; cinza = música tocando, toque na flor). */}
        {state.handsFree ? <View style={[styles.earDot, { backgroundColor: hearing ? colors.primary : colors.muted, opacity: hearing ? 1 : 0.6 }]} /> : null}
      </TouchableOpacity>

      {isAdmin ? (
        <View style={[styles.adminTools, { bottom: 90 + insets.bottom }]}>
          <TouchableOpacity style={styles.adminBtn} onPress={() => setNoting(true)} accessibilityLabel="Anotar mudança nesta tela">
            <Ionicons name="create-outline" size={17} color={colors.accent} />
          </TouchableOpacity>
          {state.activeRole !== 'admin' ? (
            <TouchableOpacity
              style={[styles.adminBtn, { marginTop: 8 }]}
              onPress={() => openArea('admin', 'sistema')}
              accessibilityLabel="Voltar ao mapa do sistema"
            >
              <Ionicons name="git-network-outline" size={16} color={colors.accent} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.tabbar, { paddingBottom: 10 + insets.bottom }]}>{bottomMenu.map((t) => renderTab(t))}</View>

      <VoiceAssistant
        visible={voice}
        onClose={() => {
          setVoice(false);
          setWakeCmd(null);
          setWakeCapture(false);
        }}
        initialCommand={wakeCmd}
        wakeLive={wakeLive}
        handsFree={state.handsFree}
        onNavigate={(go) => {
          setVoice(false);
          setWakeCmd(null);
          pick(go);
        }}
        onVoiceNav={voiceGo}
        canOpen={canOpen}
        onPanic={panicNow}
        onDuress={duressNow}
        onSilent={silentNow}
      />
      <RadioHost />
      <RideWatcher />
      <DocsCenter />
      <PublicOrgModal />
      <UserPageModal />
      <VideoCallHost />
      <TermoReaceite />
      <LotusSOS />
      <SecurityEvents />
      <AccountBlocked />
      <WakeWordListener
        enabled={state.handsFree && (!voice || wakeCapture) && !menu && !noting && !searching && !state.docsOpen}
        onListening={setHearing}
        onMusic={setMusicOn}
        onWakeStart={() => {
          // Abre a caixa da Lotus na hora (menos de meio segundo depois do "abrir Lotus").
          setWakeLive('');
          setWakeCapture(true);
          setWakeCmd({ waiting: true, text: '', at: Date.now() });
          setVoice(true);
        }}
        onWakeHeard={setWakeLive}
        onPanic={panicNow}
        onSilent={silentNow}
        onReject={() => {
          // "abrir Lotus" com a voz de outra pessoa: a caixa avisa e fecha sozinha.
          setWakeCapture(false);
          setWakeCmd({ rejected: true, text: '', at: Date.now() });
          setVoice(true);
        }}
        onWake={(text) => {
          setWakeCapture(false);
          // Caixa já aberta pelo "abrir Lotus": se o pedido for resolvido sem ela, fecha.
          const closeBox = () => {
            setVoice(false);
            setWakeCmd(null);
          };
          // "abrir Lotus, me leva pro Agro": vai direto, sem abrir a caixa da Lotus.
          // "abrir Lotus, abre o perfil do Diego": abre o perfil direto.
          const prof = text ? findProfile(stripWake(text), state) : null;
          if (prof && prof.open) {
            speakSoft(openReply(prof.open, prof.others));
            dispatch(openAction(prof.open));
            return closeBox();
          }
          // Ação pendente de confirmação: "sim" executa, "não" cancela; outra fala descarta a pergunta.
          if (acaoPendente && text) {
            const resp = stripWake(text).toLowerCase();
            setAcaoPendente(null);
            if (/^(sim|confirma|confirmo|pode sim|pode confirmar|isso|claro|ok|beleza)\b/.test(resp)) {
              speakSoft(acaoPendente.reply);
              dispatch({ type: 'MANDADOS_UPDATE', updater: acaoPendente.updater });
              return closeBox();
            }
            if (/^(nao|não|cancela|cancelar|deixa)\b/.test(resp)) {
              speakSoft('Cancelado. Nada foi enviado.');
              return closeBox();
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
              return closeBox();
            }
            if (acao.updater && acao.pergunta) {
              setAcaoPendente(acao);
              speakSoft(acao.pergunta);
              return closeBox();
            }
            speakSoft(acao.reply);
            return closeBox();
          }
          const nav = text && !prof ? findNavigation(stripWake(text)) : null;
          if (nav && (nav.back || canOpen(nav.go.tab))) {
            speakSoft(navReply(nav));
            closeBox();
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
          onQuote={(p) => Alert.alert('Orçamento pedido', `${p.name} recebeu seu pedido. A proposta chega no chat do Re@lys.`)}
          onMessage={(p) => Alert.alert('Mensagem', `Conversa com ${p.name.split(' ')[0]} aberta no chat do Re@lys.`)}
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
  const { state, dispatch } = useStore();
  // Link de convite para chamada abriu o app: guarda e, com a conta aberta, o Shell leva para a chamada.
  const [inviteTick, setInviteTick] = useState(0);
  const userRef = useRef(null);
  userRef.current = state.user;
  useEffect(
    () =>
      listenInviteLinks(async (url) => {
        await savePendingInvite(url);
        setInviteTick((n) => n + 1);
        if (!userRef.current) Alert.alert('Convite para chamada 🎧', 'Entre na sua conta ou faça o cadastro. Assim que terminar, você vai direto para a chamada.');
      }),
    []
  );
  // Modo acessível (letras maiores): lido do celular ao abrir; vale antes de desenhar as telas.
  useEffect(() => {
    AsyncStorage.getItem(BIG_TEXT_KEY)
      .then((v) => v === '1' && dispatch({ type: 'SET_BIG_TEXT', on: true }))
      .catch(() => {});
  }, []);
  setTextBoost(!!state.bigText);
  const tk = state.bigText ? ':big' : '';
  return (
    <>
      <StatusBar style="dark" />
      {!state.ready ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.brand, { fontSize: 26, marginBottom: 16 }]}>REALYS</Text>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state.user ? (
        <Shell key={state.user.name + tk} inviteTick={inviteTick} />
      ) : (
        <LoginScreen key={'login' + tk} />
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
      {/* Avisos do Re@lys: em qualquer tela, inclusive na entrada (login). */}
      <SoftAlertHost />
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
  logoImg: { width: 38, height: 38 },
  // Ícones do topo soltos, sem caixinha (visual clean).
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  iconBtnOn: { backgroundColor: colors.primaryLight },
  headAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border },
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
  tab: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  // Menu de cima da empresa: só os ícones, sem caixa e sem fundo.
  topMenu: { flexDirection: 'row', paddingTop: 2, paddingBottom: 6, paddingHorizontal: 40 },
  rolePill: { flexDirection: 'row', alignItems: 'center', minHeight: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, marginRight: 6 },
  // Botãozinho de troca de perfil: anel fino dourado com o símbolo do perfil em uso e as setinhas de troca.
  swapBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  swapRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  swapBadge: { position: 'absolute', right: 2, bottom: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  rolePillText: { color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  tabIcon: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: colors.gold },
  tabLabel: { fontSize: 10.5, fontWeight: '600', color: colors.menu, marginTop: 3 },
  // Ferramentas do administrador: pequenas, claras e meio transparentes, para não tapar o conteúdo.
  adminTools: { position: 'absolute', left: 10, alignItems: 'center', opacity: 0.85 },
  adminBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(47,116,208,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  earDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: '#fff' },
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
