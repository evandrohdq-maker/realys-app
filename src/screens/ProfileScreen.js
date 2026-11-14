import React, { useState, useEffect } from 'react';
import { GuaranteeInfo } from '../components/Guarantee';
import { ScoreCard } from '../components/Engage';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
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
import { ProfileSocial } from '../components/SocialProfile';
import WalletScreen from './WalletScreen';
import BiometriaScreen from './BiometriaScreen';
import DemoScreen from './DemoScreen';
import { ProfileEditor, PrivacyPanel, StudioPanel, FutureIcon, audienceLabel } from '../components/ProfileStudio';
import { Photo } from '../components/ui';
import { myPages, MAX_PAGES } from '../userPages';
import Credentials from '../components/Credentials';
import { SocialBadge, ProfileQuizModal } from '../components/SocialClass';

const ROLE_ICON = { cliente: '🛍️', empresa: '🏪', prestador: '🛵', fornecedor: '🚚', admin: '🛡️' };

// Linha de "Mais opções": abre o painel embaixo (ou vai para outra tela, com onPress).
function Item({ k, icon, title, sub, onPress, children, danger, open, onToggle }) {
  const isOpen = open === k;
  return (
    <View style={styles.item}>
      <TouchableOpacity style={styles.itemRow} onPress={onPress || (() => onToggle(k))} activeOpacity={0.8} accessibilityLabel={title}>
        <View style={[styles.itemIcon, danger && { backgroundColor: '#FDECEC' }]}>
          <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.itemTitle, danger && { color: colors.danger }]}>{title}</Text>
          {sub ? <Text style={styles.itemSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        <Ionicons name={onPress ? 'chevron-forward' : isOpen ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} />
      </TouchableOpacity>
      {!onPress && isOpen ? <View style={styles.itemBody}>{children}</View> : null}
    </View>
  );
}

export default function ProfileScreen({ navigate, explore }) {
  const { state, dispatch } = useStore();
  const u = state.user;
  const [checking, setChecking] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [editing, setEditing] = useState(false);
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
    <Screen>
      {/* Cabeçalho: foto, nome verificado, @ e profissão, perfil social e bio. */}
      <View style={styles.banner}>
        <View style={[styles.bannerGlow, { left: -40, top: -60 }]} />
        <View style={[styles.bannerGlow, { right: -30, top: 10, width: 140, height: 140 }]} />
        <Text style={styles.bannerText}>Pessoas reais. Negócios reais.</Text>
        <View style={styles.verifiedPill}>
          <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11, marginLeft: 4 }}>Identidade verificada</Text>
        </View>
      </View>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.85} accessibilityLabel="Trocar foto e editar perfil" style={{ marginTop: -58 }}>
          <View style={styles.avatarRing}>
            {prof.photo ? (
              <Photo uri={prof.photo} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.onPrimary, fontSize: 34, fontWeight: '800' }}>{u.name[0]}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {/* SOS: pequeno, com brilho vermelho. As informações abrem na tela de Socorro. */}
        <TouchableOpacity onPress={() => navigate && navigate({ tab: 'socorro', seg: 'emergencia' })} accessibilityLabel="SOS, socorro e emergência" activeOpacity={0.8} style={styles.sos}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }}>SOS</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={styles.name}>{u.name}</Text>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 5 }} accessibilityLabel="Identidade verificada por biometria" />
        </View>
        {prof.handle || prof.profession ? (
          <Text style={styles.handle} numberOfLines={1}>{[prof.handle ? '@' + prof.handle : '', prof.profession].filter(Boolean).join(' · ')}</Text>
        ) : null}
        {prof.social ? (
          <SocialBadge social={prof.social} style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => setQuizOpen(true)} />
        ) : (
          <TouchableOpacity onPress={() => setQuizOpen(true)} style={styles.quizCta} activeOpacity={0.85}>
            <Ionicons name="planet-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>Descubra seu perfil social</Text>
          </TouchableOpacity>
        )}
        {prof.bio ? <Text style={styles.bio}>{prof.bio}</Text> : null}
        {/* Números em destaque, como nas redes sociais */}
        <View style={styles.stats}>
          {[
            [Object.values(state.friends || {}).filter((v) => v === 'amigo').length, 'Amigos'],
            [((state.myGallery && state.myGallery.photos) || []).length + ((state.myGallery && state.myGallery.videos) || []).length, 'Fotos e vídeos'],
            [(state.testimonials || []).filter((t) => t.to === 'me' && t.status === 'aprovado').length, 'Depoimentos'],
          ].map(([n, label]) => (
            <View key={label} style={styles.stat}>
              <Text style={styles.statN}>{n}</Text>
              <Text style={styles.statL}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' }}>
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn} activeOpacity={0.85} accessibilityLabel="Editar perfil">
            <Ionicons name="create-outline" size={16} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: '800', marginLeft: 6 }}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch({ type: 'SET_PRIVACY', privacy: { exposed: !priv.exposed } })} style={[styles.privPill, !priv.exposed && { borderColor: colors.accent }]} accessibilityLabel={priv.exposed ? 'Deixar perfil invisível' : 'Expor meu perfil'}>
            <Ionicons name={priv.exposed ? 'eye' : 'eye-off'} size={15} color={priv.exposed ? colors.primary : colors.accent} />
            <Text style={{ color: priv.exposed ? colors.primaryDark : colors.accent, fontWeight: '700', fontSize: 12, marginLeft: 5 }}>{priv.exposed ? 'Exposto' : 'Invisível'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Carteira: o saldo só aparece aqui no Perfil. */}
      <TouchableOpacity onPress={() => setWalletOpen(true)} activeOpacity={0.88} style={styles.wallet} accessibilityLabel="Abrir minha carteira">
        <View style={styles.walletIcon}>
          <Ionicons name="wallet" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>Carteira Re@lys</Text>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 20 }}>{brl(state.wallet)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      {/* O que os amigos veem: destaques, fotos, vídeos e depoimentos aceitos. */}
      <ProfileSocial ownerId="me" />

      {/* Todo o resto fica guardado aqui, sem poluir o perfil. */}
      <Text style={styles.moreTitle}>Mais opções</Text>
      <View style={styles.moreBox}>
        <Item open={open} onToggle={toggle} k="score" icon="ribbon-outline" title="Score Re@lys" sub="Sua reputação em todos os perfis">
          <ScoreCard />
          <GuaranteeInfo />
        </Item>
        <Item open={open} onToggle={toggle} k="estudio" icon="rocket-outline" title="Estúdio" sub="Portfólio, músicas, vídeos e artes">
          <StudioPanel />
        </Item>
        <Item open={open} onToggle={toggle} icon="albums-outline" title={`Minhas páginas · ${myPages(state).length}/${MAX_PAGES}`} sub="Assinadas ou anônimas" onPress={() => navigate && navigate({ tab: 'paginas', seg: 'minhas' })} />
        <Item open={open} onToggle={toggle} k="privacidade" icon="lock-closed-outline" title="Quem vê meu perfil" sub={`Social: ${audienceLabel(priv.social).toLowerCase()} · Portfólio: ${audienceLabel(priv.portfolio).toLowerCase()}`}>
          <PrivacyPanel />
        </Item>
        {u.roles.length > 1 ? (
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
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{vp ? 'Refazer cadastro da voz' : 'Cadastrar minha voz'}</Text>
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
                      <Text style={{ color: '#B4532A', fontWeight: '700', fontSize: 13 }}>Apagar minha voz</Text>
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
        <Item open={open} onToggle={toggle} icon="scan-outline" title="Biometria facial" sub="Cadastro e conferência do seu rosto" onPress={() => setBioOpen(true)} />
        <Item open={open} onToggle={toggle} k="documentos" icon="card-outline" title="Documentos" sub="Cartão do SUS e carteira profissional">
          <SusCard />
          <Credentials />
        </Item>
        <Item open={open} onToggle={toggle} icon="document-text-outline" title="Contratos e receitas" sub="Assinatura online e cópia para cada parte" onPress={() => dispatch({ type: 'OPEN_DOCS' })} />
        <Item open={open} onToggle={toggle} icon="sparkles-outline" title="Novidades do app" sub="Demonstração do que tem de novo" onPress={() => setDemoOpen(true)} />
        <Item open={open} onToggle={toggle} icon="cloud-download-outline" title="Verificar atualizações" sub={VERSION_LABEL} onPress={() => setChecking(true)} />
        <Item open={open} onToggle={toggle} icon="people-outline" title="Trocar usuário" sub="Celular compartilhado (ex.: da empresa)" onPress={switchUser} />
        <Item open={open} onToggle={toggle} icon="log-out-outline" title="Sair" onPress={logout} danger />
      </View>

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
      <WalletScreen visible={walletOpen} onClose={() => setWalletOpen(false)} />
      <ProfileEditor visible={editing} onClose={() => setEditing(false)} />
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
  banner: { height: 120, borderRadius: 22, backgroundColor: colors.primary, overflow: 'hidden', justifyContent: 'flex-start', padding: 14, marginTop: 4 },
  bannerGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,240,190,0.25)' },
  bannerText: { color: 'rgba(255,255,255,0.92)', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  verifiedPill: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  head: { alignItems: 'center', paddingBottom: 6 },
  avatarRing: { padding: 4, borderRadius: 60, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  sos: { position: 'absolute', right: 4, top: 8, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFC9C7', shadowColor: '#FF1E1E', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  name: { color: colors.text, fontWeight: '800', fontSize: 23 },
  handle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  bio: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 10, textAlign: 'center', paddingHorizontal: 10 },
  quizCta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primaryLight },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 20, backgroundColor: colors.primary, marginRight: 8 },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { color: colors.text, fontWeight: '800', fontSize: 19 },
  statL: { color: colors.muted, fontSize: 11, marginTop: 1 },
  moreTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  moreBox: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  itemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  itemBody: { paddingHorizontal: 14, paddingBottom: 14 },
  roleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8, backgroundColor: '#FFFFFF' },
  roleChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  privPill: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(168,121,10,0.4)', backgroundColor: colors.primaryLight },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  walletIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 10, height: 30 },
});
