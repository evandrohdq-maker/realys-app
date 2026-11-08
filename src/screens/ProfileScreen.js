import React, { useState, useEffect } from 'react';
import { GuaranteeInfo } from '../components/Guarantee';
import { ScoreCard } from '../components/Engage';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { askMicPermission, wakeWordSupported } from '../wakeWord';
import VoiceEnroll from '../components/VoiceEnroll';
import { voicePrintOf, voicePrintSupported, onVoicePrintChange, setVoiceGate, deleteVoicePrint, lastVoiceCheck } from '../voicePrint';
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
import { SocialBadge, ProfileQuizModal } from '../components/SocialClass';

const ROLE_ICON = { cliente: '🛍️', empresa: '🏪', prestador: '🛵', fornecedor: '🚚', admin: '🛡️' };

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

  // Sai da conta e volta para a tela "Quem vai usar o Realys?".
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
    Alert.alert('Sair do Realys', 'Sua conta está salva neste aparelho. Quer manter para entrar só com a biometria da próxima vez?', [
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
  return (
    <Screen>
      <Title>Meu perfil</Title>
      <Card>
        <Row>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {prof.photo ? (
              <Photo uri={prof.photo} style={{ width: 60, height: 60, borderRadius: 30 }} />
            ) : (
              <Text style={{ color: colors.onPrimary, fontSize: 24, fontWeight: '800' }}>{u.name[0]}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{u.name}</Text>
            {prof.handle || prof.profession ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 3 }} numberOfLines={1}>
                {[prof.handle ? '@' + prof.handle : '', prof.profession].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Badge label="✔ Identidade verificada por biometria" />
            <TouchableOpacity onPress={() => setBioOpen(true)} accessibilityLabel="Cadastro biométrico" activeOpacity={0.85} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Gerenciar biometria facial ›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoOpen(true)} accessibilityLabel="Demonstração das novidades" activeOpacity={0.85} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Demonstração das novidades ›</Text>
            </TouchableOpacity>
          </View>
          {/* Botão de emergência: pequeno, com brilho vermelho. As informações abrem na tela de Socorro. */}
          <TouchableOpacity
            onPress={() => navigate && navigate({ tab: 'socorro', seg: 'emergencia' })}
            accessibilityLabel="SOS, socorro e emergência"
            activeOpacity={0.8}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.danger,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: '#FFC9C7',
              shadowColor: '#FF1E1E',
              shadowOpacity: 0.9,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>SOS</Text>
          </TouchableOpacity>
        </Row>
        {/* Perfil social: classe e subclasse definidas pelo questionário do cadastro. */}
        {prof.social ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <SocialBadge social={prof.social} style={{ flex: 1 }} onPress={() => setQuizOpen(true)} />
            <TouchableOpacity onPress={() => setQuizOpen(true)} hitSlop={8} accessibilityLabel="Refazer questionário do perfil social">
              <Ionicons name="refresh-circle-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setQuizOpen(true)} style={styles.quizCta} activeOpacity={0.85}>
            <Ionicons name="planet-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6, flex: 1 }}>Descubra seu perfil social (Gamer, Artista, Estudante…)</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        {prof.bio ? <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 10 }}>{prof.bio}</Text> : null}
        {/* Editar perfil e situação da privacidade. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn} activeOpacity={0.85} accessibilityLabel="Editar perfil">
            <Ionicons name="create-outline" size={16} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: '800', marginLeft: 6 }}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch({ type: 'SET_PRIVACY', privacy: { exposed: !priv.exposed } })} style={[styles.privPill, !priv.exposed && { borderColor: colors.accent }]} accessibilityLabel={priv.exposed ? 'Deixar perfil invisível' : 'Expor meu perfil'}>
            <Ionicons name={priv.exposed ? 'eye' : 'eye-off'} size={15} color={priv.exposed ? colors.primary : colors.accent} />
            <Text style={{ color: priv.exposed ? colors.primaryDark : colors.accent, fontWeight: '700', fontSize: 12, marginLeft: 5 }}>{priv.exposed ? 'Exposto' : 'Invisível'}</Text>
          </TouchableOpacity>
        </View>
        {/* Carteira em destaque: o saldo só aparece aqui no Perfil. */}
        <TouchableOpacity onPress={() => setWalletOpen(true)} activeOpacity={0.88} style={styles.wallet} accessibilityLabel="Abrir minha carteira">
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>Carteira Realys</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 22 }}>{brl(state.wallet)}</Text>
          </View>
          <View style={styles.walletBtn}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>Gerenciar</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Depósitos, gastos, recebidos, saques e o balanço do mês.</Text>
      </Card>
      {/* Score Realys: uma reputação só, que vale em todos os perfis. */}
      <ScoreCard />
      <GuaranteeInfo />

      {/* Estúdio: produção de conteúdo do próprio usuário (portfólio, música, vídeo, arte...). */}
      <Card>
        <Row>
          <FutureIcon name="rocket" size={40} spin />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Estúdio Realys</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              Crie seu portfólio e publique músicas, vídeos e artes. Você escolhe se cada criação vai para o Social, o Portfólio{u.roles.includes('empresa') ? ' ou a parte Empresarial' : ''}.
            </Text>
          </View>
        </Row>
        <StudioPanel />
      </Card>

      {/* Quem vê o perfil: exposto ou invisível; vida social e portfólio para todos, só amigos ou só eu. */}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 2 }}>Quem vê meu perfil</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
          Agora: vida social para {audienceLabel(priv.social).toLowerCase()}, portfólio para {audienceLabel(priv.portfolio).toLowerCase()}{priv.exposed ? '' : ' (perfil invisível)'}.
        </Text>
        <PrivacyPanel />
      </Card>

      {/* Perfil social: destaques, galeria de fotos, galeria de vídeos e depoimentos aceitos. */}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Meu perfil na Comunidade</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
          É o que seus amigos veem ao abrir seu perfil. Depoimentos só aparecem depois que você aceita.
        </Text>
        <ProfileSocial ownerId="me" />
      </Card>

      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginVertical: 8 }}>Trocar de perfil</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>
        Uma conta só, com acessos diferentes. Troque para ver o app como cada tipo de usuário.
      </Text>
      {u.roles.map((r) => {
        const on = state.activeRole === r;
        return (
          <TouchableOpacity key={r} onPress={() => dispatch({ type: 'SET_ROLE', role: r })}>
            <Card style={on ? { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryLight } : null}>
              <Row>
                <Text style={{ color: colors.text, fontSize: 26, marginRight: 12 }}>{ROLE_ICON[r]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{ROLE_LABELS[r]}</Text>
                  {r === 'empresa' || r === 'fornecedor' ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>CNPJ {u.cnpj}</Text>
                  ) : null}
                </View>
                {on ? <Badge label="Ativo" /> : null}
              </Row>
            </Card>
          </TouchableOpacity>
        );
      })}

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(168,121,10,0.35)', marginTop: 8 }}>
        <Row>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>Acionar falando "abrir Lotus"</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              Com o app aberto, diga "abrir Lotus, preciso de um eletricista" e a Lotus, assistente do Realys, atende com voz suave, sem tocar na tela e sem "Ok Google".
            </Text>
          </View>
          <Switch
            value={state.handsFree}
            onValueChange={async (on) => {
              if (!on) return dispatch({ type: 'SET_HANDSFREE', on: false });
              if (!wakeWordSupported()) {
                return Alert.alert('Não disponível', 'Este celular não tem reconhecimento de voz disponível para o Realys.');
              }
              const ok = await askMicPermission();
              if (!ok) return Alert.alert('Microfone bloqueado', 'Permita o microfone para o Realys nas configurações do celular.');
              // Primeira vez: a Lotus aprende a voz do titular antes de ligar.
              if (!voicePrintOf() && voicePrintSupported()) return openEnroll();
              dispatch({ type: 'SET_HANDSFREE', on: true });
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={state.handsFree ? '#FFFFFF' : colors.muted}
          />
        </Row>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
          Funciona com o Realys aberto e a tela ligada. Com o celular bloqueado será a próxima etapa.
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
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
              {`Aprendeu com ${((vp.learned || []).length)} uso(s).`}
              {vcheck ? ` Última conferência (${vcheck.kind}): ${vcheck.ok ? 'reconheceu você' : 'não reconheceu'}${vcheck.d != null ? ` · ${String(vcheck.d).replace('.', ',')} de ${String(vcheck.limit).replace('.', ',')}` : ''}.` : ''}
            </Text>
          ) : null}
        </View>
      </Card>
      <VoiceEnroll
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

      <Card>
        <Row>
          <Ionicons name="people-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Trocar usuário</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              Celular compartilhado (ex.: aparelho da empresa)? Saia da sua conta e outra pessoa entra com a dela. As contas salvas aparecem na entrada.
            </Text>
          </View>
        </Row>
        <Button title="Trocar usuário" onPress={switchUser} style={{ marginTop: 12 }} />
      </Card>

      <Button title="Sair" variant="outline" onPress={logout} style={{ marginTop: 10 }} />
      <Button title="Verificar atualizações" variant="light" onPress={() => setChecking(true)} style={{ marginTop: 10 }} />
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
        Realys · {VERSION_LABEL} · demonstração
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quizCta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primaryLight },
  editBtn: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.primary, marginRight: 8 },
  privPill: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(168,121,10,0.4)', backgroundColor: colors.primaryLight },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  walletIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 10, height: 30 },
});
