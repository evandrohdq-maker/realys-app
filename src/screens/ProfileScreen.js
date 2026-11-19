import React, { useState, useEffect } from 'react';
import { GuaranteeInfo } from '../components/Guarantee';
import { ScoreCard } from '../components/Engage';
import { View, TouchableOpacity, Switch, Alert, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { askMicPermission, wakeWordSupported } from '../wakeWord';
import VoiceEnroll, { TratoPicker, PhrasesEditor } from '../components/VoiceEnroll';
import { SusCard } from '../components/PublicOrg';
import { voicePrintOf, voicePrintSupported, onVoicePrintChange, setVoiceGate, deleteVoicePrint, lastVoiceCheck, setTrato, setPhrases } from '../voicePrint';
import { useStore } from '../store';
import { colors, brl, ROLE_LABELS } from '../theme';
import { Screen, Title, Card, Row, Button, Badge } from '../components/ui';
import UpdateChecker from '../components/UpdateChecker';
import { VERSION_LABEL } from '../updates';
import { getSavedUsers, forgetUser } from '../accounts';
import { ProfileSocial, ProfilePreviewModal, TestimonialsTab, DepCenter } from '../components/SocialProfile';
import { PeopleSearchModal } from '../components/People';
import { UnverifiedBanner, isVerified } from '../components/BioGate';
import ThemeArt from '../components/ThemeArt';
import SupportCenter from '../components/SupportCenter';
import TaxasModal from '../components/TaxasModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BIG_TEXT_KEY } from '../responsive';
import WalletScreen from './WalletScreen';
import BiometriaScreen from './BiometriaScreen';
import DemoScreen from './DemoScreen';
import { ProfileEditor, PrivacyPanel, StudioPanel, FutureIcon, audienceLabel, coverTone } from '../components/ProfileStudio';
import { Photo } from '../components/ui';
import { myPages, MAX_PAGES } from '../userPages';
import Credentials from '../components/Credentials';
import { SocialBadge, ProfileQuizModal } from '../components/SocialClass';
import CategoryMenu from '../components/CategoryMenu';
import { onProfileMenu } from '../profileMenu';

const ROLE_ICON = { cliente: '🛍️', empresa: '🏪', prestador: '🛵', fornecedor: '🚚', admin: '🛡️' };

// Opção do menu ⋮ do Perfil (aba "Minha conta"): quadrinho com o ícone num círculo colorido.
// Abre o painel logo abaixo, na largura toda (ou vai para outra tela, com onPress).
const TILE_TINTS = ['#B8860B', '#6C5CE7', '#0E8BC9', '#1E9E63', '#D9468F', '#E4572E', '#0D9488', '#55607A'];
const tintFor = (t) => TILE_TINTS[[...String(t)].reduce((a, c) => a + c.charCodeAt(0), 0) % TILE_TINTS.length];
function Item({ k, icon, title, sub, onPress, children, danger, open, onToggle }) {
  const isOpen = open === k;
  const tint = danger ? colors.danger : tintFor(title);
  return (
    <>
      <View style={[styles.item, isOpen && { borderColor: tint }]}>
        <TouchableOpacity style={styles.itemRow} onPress={onPress || (() => onToggle(k))} activeOpacity={0.8} accessibilityLabel={title}>
          <View style={[styles.itemIcon, { backgroundColor: tint + '1A' }]}>
            <Ionicons name={isOpen ? icon.replace('-outline', '') : icon} size={18} color={tint} />
          </View>
          <View style={{ flex: 1, marginLeft: 9 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.itemTitle, danger && { color: colors.danger }]}>{title}</Text>
            {sub ? <Text style={styles.itemSub} numberOfLines={1}>{sub}</Text> : null}
          </View>
        </TouchableOpacity>
      </View>
      {!onPress && isOpen ? <View style={styles.itemBody}>{children}</View> : null}
    </>
  );
}

export default function ProfileScreen({ navigate, explore }) {
  const { state, dispatch } = useStore();
  const u = state.user;
  const [checking, setChecking] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false); // ver o perfil como os outros veem
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [focus, setFocus] = useState(null); // aba aberta pelos números do topo
  const [depOpen, setDepOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [taxasOpen, setTaxasOpen] = useState(false);
  // Menu ⋮ do Perfil: "Minha conta" (as antigas Mais opções) + "Explorar" (o antigo ⋮ do cabeçalho).
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSeg, setMenuSeg] = useState('conta');
  // O ⋮ fica no canto direito do cabeçalho do app e abre este menu (de qualquer tela).
  const returnTo = React.useRef(null);
  useEffect(
    () =>
      onProfileMenu((o) => {
        returnTo.current = (o && o.returnTo) || null;
        setMenuSeg('conta');
        setMenuOpen(true);
      }),
    [],
  );
  // Fechou sem escolher nada (X ou voltar): volta para a tela de onde o ⋮ foi aberto.
  const closeMenu = () => {
    setMenuOpen(false);
    const back = returnTo.current;
    returnTo.current = null;
    if (back && navigate) navigate({ tab: back });
  };
  const nav = (go) => {
    returnTo.current = null;
    setMenuOpen(false);
    navigate && navigate(go);
  };
  // Modo acessível: letras maiores no app todo (fica guardado no celular).
  const toggleBigText = () => {
    const on = !state.bigText;
    AsyncStorage.setItem(BIG_TEXT_KEY, on ? '1' : '0').catch(() => {});
    dispatch({ type: 'SET_BIG_TEXT', on });
  }; // Ajuda e suporte // página com todos os depoimentos
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef(null);
  const socialY = React.useRef(0);
  // Fotos e vídeos: abre a aba de fotos e rola a tela até elas.
  const goPhotos = () => {
    setFocus({ tab: 'photos', n: Date.now() });
    setTimeout(() => scrollRef.current && scrollRef.current.scrollTo({ y: Math.max(0, socialY.current - 8), animated: true }), 60);
  };
  const [bioOpen, setBioOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  // Voz do titular (só neste celular): cadastro ao ligar o "abrir Lotus".
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [vp, setVp] = useState(voicePrintOf());
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [vcheck, setVcheck] = useState(lastVoiceCheck());
  useEffect(() => onVoicePrintChange((x) => (setVp(x), setVcheck(lastVoiceCheck()))), []);
  const enrollWasOn = React.useRef(false);
  const openEnroll = () => {
    // Enquanto grava a voz, o "abrir Lotus" fica desligado (os dois usam o mesmo microfone).
    enrollWasOn.current = state.handsFree;
    if (state.handsFree) dispatch({ type: 'SET_HANDSFREE', on: false });
    setEnrollOpen(true);
  };
  const prof = state.myProfile;
  const priv = state.privacy;
  // "Lotus, abre minha carteira": já abre a carteira.
  useEffect(() => {
    if (explore && explore.tab === 'perfil' && explore.wallet) setWalletOpen(true);
    if (explore && explore.tab === 'perfil' && explore.biometria) setBioOpen(true);
  }, [explore]);

  // Sai da conta e volta para a tela "Quem vai usar o Re@lys?".
  const switchUser = () =>
    Alert.alert('Trocar usuário', `Sair da conta de ${u.name} para outra pessoa entrar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Trocar', onPress: () => dispatch({ type: 'LOGOUT' }) },
    ]);

  // Ao sair, pergunta se a conta continua salva neste celular.
  const logout = async () => {
    const saved = await getSavedUsers();
    const mine = saved.find((s) => (u.id && s.user.id === u.id) || (s.user.name === u.name && s.user.cpf === u.cpf && s.user.cnpj === u.cnpj));
    if (!mine) return dispatch({ type: 'LOGOUT' });
    Alert.alert('Sair do Re@lys', 'Sua conta está salva neste aparelho. Quer manter para entrar só com a biometria da próxima vez?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover e sair',
        style: 'destructive',
        onPress: async () => {
          await forgetUser(mine.key).catch(() => {});
          dispatch({ type: 'LOGOUT' });
        },
      },
      { text: 'Manter e sair', onPress: () => dispatch({ type: 'LOGOUT' }) },
    ]);
  };
  // Itens de "Mais opções": um aberto por vez (o resto do perfil fica limpo).
  const [open, setOpen] = useState(null);
  const toggle = (k) => setOpen((o) => (o === k ? null : k));
  const roleOn = (r) => state.activeRole === r;

  return (
    <Screen scrollRef={scrollRef}>
      {/* Cabeçalho: foto, nome verificado, @ e profissão, perfil social e bio. */}
      {/* Conta sem biometria: aviso para completar o cadastro */}
      <UnverifiedBanner />
      {/* Capa de fundo: a foto que a pessoa escolheu ou um tom suave. Tocar abre o editor. */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => setEditing(true)} style={[styles.banner, { backgroundColor: coverTone(prof.coverTone).color }]} accessibilityLabel="Trocar a capa de fundo">
        {!prof.cover && coverTone(prof.coverTone).art ? <ThemeArt theme={coverTone(prof.coverTone).art} /> : null}
        {prof.cover ? <Photo uri={prof.cover} style={styles.bannerImg} /> : null}
        <View style={styles.verifiedPill}>
          <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11, marginLeft: 4 }}>{isVerified(state) ? 'Identidade verificada' : 'Perfil social · sem biometria'}</Text>
        </View>
        <View style={styles.coverEdit}>
          <Ionicons name="image-outline" size={13} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.85} accessibilityLabel="Trocar foto e editar perfil" style={{ marginTop: -58 }}>
          <View style={styles.avatarRing}>
            {prof.photo ? (
              <Photo uri={prof.photo} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }]}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontSize: 34, fontWeight: '800' }}>{u.name[0]}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {/* SOS e Date: dois botõezinhos discretos nos cantos, abaixo da capa.
            SOS abre a tela de Socorro; Date abre os encontros (saiu da barra de baixo). */}
        <TouchableOpacity onPress={() => navigate && navigate({ tab: 'encontros' })} accessibilityLabel="Date, encontros" activeOpacity={0.7} hitSlop={10} style={[styles.quiet, { left: 6 }]}>
          <Ionicons name="heart-outline" size={14} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate && navigate({ tab: 'socorro', seg: 'emergencia' })} accessibilityLabel="SOS, socorro e emergência" activeOpacity={0.7} hitSlop={10} style={[styles.quiet, { right: 6 }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.quietSos}>SOS</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={styles.name}>{u.name}</Text>
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} style={{ marginLeft: 5 }} accessibilityLabel="Identidade verificada por biometria" />
        </View>
        {prof.handle || prof.profession ? (
          <Text style={styles.handle} numberOfLines={1}>{[prof.handle ? '@' + prof.handle : '', prof.profession].filter(Boolean).join(' · ')}</Text>
        ) : null}
        {prof.social ? (
          <SocialBadge social={prof.social} style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => setQuizOpen(true)} />
        ) : (
          <TouchableOpacity onPress={() => setQuizOpen(true)} style={styles.quizCta} activeOpacity={0.85}>
            <Ionicons name="planet-outline" size={16} color={colors.text} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>Descubra seu perfil social</Text>
          </TouchableOpacity>
        )}
        {prof.bio ? <Text style={styles.bio}>{prof.bio}</Text> : null}
        {/* Números em destaque, como nas redes sociais */}
        <View style={styles.stats}>
          {[
            [Object.values(state.friends || {}).filter((v) => v === 'amigo').length, 'Amigos'],
            [((state.myGallery && state.myGallery.photos) || []).length + ((state.myGallery && state.myGallery.videos) || []).length, 'Fotos e vídeos'],
            [(state.testimonials || []).filter((t) => t.to === 'me' && t.status === 'aprovado').length, 'Dep'],
          ].map(([n, label]) => (
            <TouchableOpacity
              key={label}
              style={styles.stat}
              activeOpacity={0.7}
              accessibilityLabel={`${n} ${label}`}
              onPress={() => (label === 'Amigos' ? setFriendsOpen(true) : label === 'Dep' ? setDepOpen(true) : goPhotos())}
            >
              <Text style={styles.statN}>{n}</Text>
              <Text style={styles.statL}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <TouchableOpacity onPress={() => setEditing(true)} style={[styles.privPill, { marginRight: 8 }]} activeOpacity={0.85} accessibilityLabel="Editar perfil">
            <Ionicons name="create-outline" size={14} color={colors.text} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch({ type: 'SET_PRIVACY', privacy: { exposed: !priv.exposed } })} style={[styles.privPill, !priv.exposed && { borderColor: colors.accent }]} accessibilityLabel={priv.exposed ? 'Deixar perfil invisível' : 'Expor meu perfil'}>
            <Ionicons name={priv.exposed ? 'eye' : 'eye-off'} size={14} color={priv.exposed ? colors.text : colors.accent} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: priv.exposed ? colors.text : colors.accent, fontWeight: '700', fontSize: 12, marginLeft: 5 }}>{priv.exposed ? 'Exposto' : 'Invisível'}</Text>
          </TouchableOpacity>
          {/* Ver como o perfil aparece para os outros */}
          <TouchableOpacity onPress={() => setPreviewing(true)} style={[styles.privPill, { marginLeft: 8 }]} accessibilityLabel="Ver como o meu perfil aparece para os outros">
            <Ionicons name="scan-outline" size={14} color={colors.text} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Prévia</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Carteira: o saldo só aparece aqui no Perfil. */}
      <TouchableOpacity onPress={() => setWalletOpen(true)} activeOpacity={0.88} style={styles.wallet} accessibilityLabel="Abrir minha carteira">
        <Ionicons name="wallet-outline" size={16} color={colors.menu} />
        <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '600', marginLeft: 6 }}>Carteira</Text>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginLeft: 6 }}>{brl(state.wallet)}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.muted} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* O que os amigos veem: destaques, fotos, vídeos e depoimentos aceitos. */}
      <View onLayout={(e) => (socialY.current = e.nativeEvent.layout.y)}>
        <ProfileSocial ownerId="me" focus={focus} />
      </View>

      {/* Dep: tudo de depoimentos (relatório de recebidos e enviados, deixar, pesquisar e aprovar).
          Abre pelo número "Dep" lá em cima (saiu da página inicial). */}
      <DepCenter visible={depOpen} onClose={() => setDepOpen(false)} />

      {/* Menu ⋮ do Perfil: duas partes, Minha conta e Explorar o Re@lys. */}
      <Modal visible={menuOpen} animationType="slide" onRequestClose={closeMenu}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
          <View style={styles.menuHead}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={closeMenu} style={styles.menuClose} accessibilityLabel="Fechar o menu">
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.seg}>
            {[['conta', 'Minha conta', 'person-circle-outline'], ['explorar', 'Explorar', 'compass-outline']].map(([k, label, icon]) => {
              const on = menuSeg === k;
              return (
                <TouchableOpacity key={k} onPress={() => setMenuSeg(k)} style={[styles.segBtn, on && styles.segOn]} accessibilityLabel={label}>
                  <Ionicons name={on ? icon.replace('-outline', '') : icon} size={16} color={on ? colors.text : colors.menu} />
                  <Text numberOfLines={1} style={[styles.segTxt, on && { color: colors.text }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {menuSeg === 'explorar' ? (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: insets.bottom }}>
              <CategoryMenu embedded visible onClose={closeMenu} onPick={nav} />
            </View>
          ) : (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
      <View style={styles.moreBox}>
        <Item open={open} onToggle={toggle} k="score" icon="ribbon-outline" title="Score Re@lys" sub="Sua reputação em todos os perfis">
          <ScoreCard />
          <GuaranteeInfo />
        </Item>
        {/* Estúdio Re@lys: para artistas, músicos e criadores de conteúdo. Não aparece no perfil de empresa
            (a empresa divulga por anúncios, propagandas e reels de anúncio, no Painel). */}
        {state.activeRole !== 'empresa' ? (
          <Item open={open} onToggle={toggle} k="estudio" icon="rocket-outline" title="Estúdio Re@lys" sub="Para artistas, músicos e criadores de conteúdo">
            <StudioPanel />
          </Item>
        ) : (
          <Item open={open} onToggle={toggle} icon="megaphone-outline" title="Anúncios e propaganda" sub="Espaços de anúncio e reels de anúncio" onPress={() => nav({ tab: 'anuncie' })} />
        )}
        <Item open={open} onToggle={toggle} icon="albums-outline" title={`Minhas páginas · ${myPages(state).length}/${MAX_PAGES}`} sub="Assinadas ou anônimas" onPress={() => nav({ tab: 'paginas', seg: 'minhas' })} />
        <Item open={open} onToggle={toggle} k="privacidade" icon="lock-closed-outline" title="Quem vê meu perfil" sub={`Social: ${audienceLabel(priv.social).toLowerCase()} · Portfólio: ${audienceLabel(priv.portfolio).toLowerCase()}`}>
          <PrivacyPanel />
        </Item>
        {u.roles.length > 1 && isVerified(state) ? (
          <Item open={open} onToggle={toggle} k="perfis" icon="swap-horizontal-outline" title="Usar o app como" sub={ROLE_LABELS[state.activeRole]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {u.roles.map((r) => (
                <TouchableOpacity key={r} onPress={() => dispatch({ type: 'SET_ROLE', role: r })} style={[styles.roleChip, roleOn(r) && styles.roleChipOn]}>
                  <Text style={{ fontSize: 16 }}>{ROLE_ICON[r]}</Text>
                  <Text style={{ marginLeft: 6, fontWeight: '700', color: roleOn(r) ? colors.onPrimary : colors.text }}>{ROLE_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {u.cnpj && (u.roles.includes('empresa') || u.roles.includes('fornecedor')) ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>CNPJ {u.cnpj}</Text> : null}
          </Item>
        ) : null}
        <Item open={open} onToggle={toggle} k="lotus" icon="mic-outline" title="Lotus por voz" sub={state.handsFree ? 'Ligada: diga "abrir Lotus"' : 'Desligada'}>
          <View>
            <Row>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>Acionar falando "abrir Lotus"</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  Com o app aberto, diga "abrir Lotus, preciso de um eletricista" e a Lotus, assistente do Re@lys, atende com voz suave, sem tocar na tela e sem "Ok Google".
                </Text>
              </View>
              <Switch
                value={state.handsFree}
                onValueChange={async (on) => {
                  if (!on) return dispatch({ type: 'SET_HANDSFREE', on: false });
                  if (!wakeWordSupported()) {
                    return Alert.alert('Não disponível', 'Este celular não tem reconhecimento de voz disponível para o Re@lys.');
                  }
                  const ok = await askMicPermission();
                  if (!ok) return Alert.alert('Microfone bloqueado', 'Permita o microfone para o Re@lys nas configurações do celular.');
                  // Primeira vez: a Lotus aprende a voz do titular antes de ligar.
                  if (!voicePrintOf() && voicePrintSupported()) return openEnroll();
                  dispatch({ type: 'SET_HANDSFREE', on: true });
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={state.handsFree ? '#FFFFFF' : colors.muted}
              />
            </Row>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
              Funciona com o Re@lys aberto e a tela ligada. Com o celular bloqueado será a próxima etapa.
            </Text>
            {/* Voz do titular: só a voz do dono da conta abre a Lotus falando "abrir Lotus". */}
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,121,10,0.2)', marginTop: 12, paddingTop: 12 }}>
              <Row>
                <Ionicons name="mic-circle-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>Só a minha voz abre a Lotus</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {!voicePrintSupported()
                      ? 'Precisa de Android 13 ou mais novo.'
                      : vp
                      ? 'Voz cadastrada neste celular. Tocando no botão da Lotus, qualquer pessoa fala com ela.'
                      : 'Cadastre sua voz para a Lotus atender só você quando chamada por voz.'}
                  </Text>
                </View>
                {vp ? (
                  <Switch
                    value={vp.on !== false}
                    onValueChange={(on) => setVoiceGate(on)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={vp.on !== false ? '#FFFFFF' : colors.muted}
                  />
                ) : null}
              </Row>
              {voicePrintSupported() ? (
                <Row style={{ marginTop: 10 }}>
                  <TouchableOpacity onPress={openEnroll} style={{ marginRight: 18 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{vp ? 'Refazer cadastro da voz' : 'Cadastrar minha voz'}</Text>
                  </TouchableOpacity>
                  {vp ? (
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert('Apagar minha voz', 'A assinatura da sua voz será apagada deste celular. A Lotus volta a atender qualquer voz no "abrir Lotus".', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Apagar', style: 'destructive', onPress: () => deleteVoicePrint() },
                        ])
                      }
                    >
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#B4532A', fontWeight: '700', fontSize: 13 }}>Apagar minha voz</Text>
                    </TouchableOpacity>
                  ) : null}
                </Row>
              ) : null}
              {vp ? (
                <View style={{ marginTop: 12 }}>
                  <TratoPicker value={vp.trato || { key: 'nome' }} onChange={(t) => setTrato(t)} userName={state.user && state.user.name} />
                  <TouchableOpacity onPress={() => setPhrasesOpen((v) => !v)} style={{ paddingVertical: 8 }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {vp.phrases && vp.phrases.question ? 'Trocar pergunta e respostas de segurança' : 'Cadastrar pergunta e respostas de segurança'}
                    </Text>
                  </TouchableOpacity>
                  {phrasesOpen ? (
                    <PhrasesEditor
                      initial={vp.phrases && vp.phrases.question ? vp.phrases : null}
                      saveLabel="Salvar frases"
                      onSave={(ph) => (setPhrases(ph), setPhrasesOpen(false), Alert.alert('Pergunta salva', 'Para confirmar por voz: diga "sim, confirmo" e depois responda a sua pergunta de segurança.'))}
                    />
                  ) : null}
                </View>
              ) : null}
              {vp ? (
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
                  {`Aprendeu com ${((vp.learned || []).length)} uso(s).`}
                  {vcheck ? ` Última conferência (${vcheck.kind}): ${vcheck.ok ? 'reconheceu você' : 'não reconheceu'}${vcheck.d != null ? ` · ${String(vcheck.d).replace('.', ',')} de ${String(vcheck.limit).replace('.', ',')}` : ''}.` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Item>
        <Item open={open} onToggle={toggle} icon="scan-outline" title="Biometria facial" sub="Cadastro e conferência do seu rosto" onPress={() => (setMenuOpen(false), setBioOpen(true))} />
        <Item open={open} onToggle={toggle} k="documentos" icon="card-outline" title="Documentos" sub="Cartão do SUS e carteira profissional">
          <SusCard />
          <Credentials />
        </Item>
        <Item open={open} onToggle={toggle} icon="document-text-outline" title="Contratos e receitas" sub="Assinatura online e cópia para cada parte" onPress={() => (setMenuOpen(false), dispatch({ type: 'OPEN_DOCS' }))} />
        <Item open={open} onToggle={toggle} icon="headset-outline" title="Ajuda e suporte" sub="Dúvidas e chamados" onPress={() => (setMenuOpen(false), setHelpOpen(true))} />
        <Item open={open} onToggle={toggle} icon="text-outline" title="Letras maiores" sub={state.bigText ? 'Ligado · toque para desligar' : 'Desligado · toque para ligar'} onPress={toggleBigText} />
        <Item open={open} onToggle={toggle} icon="pricetags-outline" title="Nossas taxas" sub="Re@lys × mercado" onPress={() => (setMenuOpen(false), setTaxasOpen(true))} />
        <Item open={open} onToggle={toggle} icon="sparkles-outline" title="Novidades do app" sub="Demonstração do que tem de novo" onPress={() => (setMenuOpen(false), setDemoOpen(true))} />
        <Item open={open} onToggle={toggle} icon="cloud-download-outline" title="Verificar atualizações" sub={VERSION_LABEL} onPress={() => (setMenuOpen(false), setChecking(true))} />
        <Item open={open} onToggle={toggle} icon="people-outline" title="Trocar usuário" sub="Celular compartilhado (ex.: da empresa)" onPress={switchUser} />
        <Item open={open} onToggle={toggle} icon="log-out-outline" title="Sair" onPress={logout} danger />
      </View>
      </ScrollView>
          )}
        </View>
      </Modal>

      <VoiceEnroll
        userName={state.user && state.user.name}
        visible={enrollOpen}
        onClose={() => {
          setEnrollOpen(false);
          if (enrollWasOn.current) dispatch({ type: 'SET_HANDSFREE', on: true });
        }}
        onDone={() => {
          setEnrollOpen(false);
          dispatch({ type: 'SET_HANDSFREE', on: true });
        }}
      />

      {checking ? <UpdateChecker manual onDone={() => setChecking(false)} /> : null}
      <SupportCenter visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <TaxasModal visible={taxasOpen} onClose={() => setTaxasOpen(false)} />
      <WalletScreen visible={walletOpen} onClose={() => setWalletOpen(false)} />
      <ProfileEditor visible={editing} onClose={() => setEditing(false)} />
      <ProfilePreviewModal visible={previewing} onClose={() => setPreviewing(false)} />
      <PeopleSearchModal visible={friendsOpen} onClose={() => setFriendsOpen(false)} navigate={navigate} />
      <BiometriaScreen visible={bioOpen} onClose={() => setBioOpen(false)} />
      <DemoScreen visible={demoOpen} onClose={() => setDemoOpen(false)} />
      <ProfileQuizModal
        visible={quizOpen}
        initial={prof.quiz || { about: prof.bio || '', work: prof.profession || '', hobbies: [], manual: false }}
        onClose={() => setQuizOpen(false)}
        onSave={(q) => {
          setQuizOpen(false);
          dispatch({ type: 'SET_MY_PROFILE', profile: { social: q.social, quiz: { about: q.about, work: q.work, hobbies: q.hobbies || [], manual: !!q.manual } } });
        }}
      />
      <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 14 }}>
        Re@lys · {VERSION_LABEL} · demonstração
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { height: 120, borderRadius: 22, overflow: 'hidden', marginTop: 4 },
  bannerImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  coverEdit: { position: 'absolute', left: 12, top: 12, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(20,18,14,0.45)', alignItems: 'center', justifyContent: 'center' },
  bannerGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,240,190,0.25)' },
  bannerText: { color: 'rgba(255,255,255,0.92)', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  verifiedPill: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.5)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  head: { alignItems: 'center', paddingBottom: 6 },
  avatarRing: { padding: 4, borderRadius: 60, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  quiet: { position: 'absolute', top: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  quietSos: { color: colors.danger, fontWeight: '800', fontSize: 8.5, letterSpacing: 0.3 },
  name: { color: colors.text, fontWeight: '800', fontSize: 23 },
  handle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  bio: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 10, textAlign: 'center', paddingHorizontal: 10 },
  quizCta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.primaryLight },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: 20, backgroundColor: colors.text, marginRight: 8 },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { color: colors.text, fontWeight: '800', fontSize: 19 },
  statL: { color: colors.muted, fontSize: 11, marginTop: 1 },
  // Menu ⋮ do Perfil
  dots: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(20,18,14,0.45)', alignItems: 'center', justifyContent: 'center' },
  menuHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  menuTitle: { color: colors.text, fontWeight: '900', fontSize: 24 },
  menuClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, borderRadius: 14, backgroundColor: colors.cardAlt, padding: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 11 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segTxt: { color: colors.menu, fontWeight: '800', fontSize: 13.5, marginLeft: 6 },
  moreTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  moreBox: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  item: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 11, minHeight: 62 },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  itemSub: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
  itemBody: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  roleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8, backgroundColor: '#FFFFFF' },
  roleChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  privPill: { flexDirection: 'row', alignItems: 'center', minHeight: 30, paddingHorizontal: 11, borderRadius: 19, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card },
  // Carteira discreta: uma pílula pequena, centralizada, com o saldo à vista.
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 32,
    marginTop: 10,
    marginBottom: 12,
  },
  walletIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 10, height: 30 },
});
