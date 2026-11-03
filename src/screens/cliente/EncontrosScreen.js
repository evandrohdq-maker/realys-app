import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { Screen, Card, Row, Button, Photo, Section, Empty } from '../../components/ui';
import { encounterPeople } from '../../homeData';
import { ENCONTROS_TERMS, TERMS_VERSION, RELATIONSHIP_STATUS, statusAllowed } from '../../encontrosTerms';
import { ChatModal, VideoCallModal } from './home/Social';

const ROSE = '#E0567A';
const LOOKING = ['Amizade', 'Namoro', 'Relacionamento sério'];
const INTEREST = [
  ['f', 'Mulheres'],
  ['m', 'Homens'],
  ['todos', 'Todos'],
];
const KMS = [1, 3, 5, 10];

// Distância sempre aproximada: nunca a posição exata (está nos termos).
const approx = (km) => (km < 0.5 ? 'a menos de 500 m' : km < 1 ? 'a menos de 1 km' : `a cerca de ${Math.round(km)} km`);

export default function EncontrosScreen() {
  const { state } = useStore();
  const e = state.encontros;
  const [terms, setTerms] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {e.accepted && statusAllowed(e.status) ? <Main openTerms={() => setTerms(true)} /> : <Onboarding openTerms={() => setTerms(true)} />}
      <TermsModal visible={terms} onClose={() => setTerms(false)} />
    </View>
  );
}

// Entrada: status de relacionamento, preferências e aceite dos termos.
function Onboarding({ openTerms }) {
  const { state, dispatch } = useStore();
  const e = state.encontros;
  const [age, setAge] = useState(false);
  const [agree, setAgree] = useState(false);
  const [consent, setConsent] = useState(false);
  const allowed = statusAllowed(e.status);
  const ready = allowed && age && agree && consent;

  const enter = () => {
    if (!ready) return Alert.alert('Falta pouco', 'Marque as três confirmações para entrar no Encontros.');
    dispatch({ type: 'ENC_SET', patch: { accepted: true, termsVersion: TERMS_VERSION, radar: true } });
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="heart" size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Encontros</Text>
        <Text style={styles.heroSub}>Conheça pessoas reais e verificadas que passam perto de você. Se as duas curtirem, é match.</Text>
        <View style={{ marginTop: 12 }}>
          <Bullet icon="shield-checkmark" text="Só participa quem entra e aceita os termos do Encontros" />
          <Bullet icon="notifications-off" text="Quem é casado ou está em relacionamento não aparece e não recebe notificações" />
          <Bullet icon="location" text="Sua posição exata nunca aparece, só uma distância aproximada" />
        </View>
      </View>

      <Section title="1. Seu status de relacionamento">
        <View style={styles.wrap}>
          {RELATIONSHIP_STATUS.map((s) => (
            <Pill
              key={s.key}
              label={s.label}
              on={e.status === s.key}
              onPress={() => dispatch({ type: 'ENC_SET_STATUS', status: s.key, allowed: s.allowed })}
            />
          ))}
        </View>
      </Section>

      {e.status && !allowed ? (
        <Card style={{ backgroundColor: colors.cardAlt }}>
          <Row>
            <Ionicons name="notifications-off-outline" size={22} color={colors.muted} />
            <Text style={{ color: colors.text, fontWeight: '800', marginLeft: 8, flex: 1 }}>O Encontros fica desligado para você</Text>
          </Row>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 19 }}>
            Por respeito ao seu relacionamento, quem está namorando, em união estável ou casado não aparece para ninguém e não recebe nenhuma notificação de encontros. O resto do Realys continua igual.
          </Text>
        </Card>
      ) : null}

      {allowed ? (
        <>
          <Section title="2. O que você procura">
            <View style={styles.wrap}>
              {LOOKING.map((l) => (
                <Pill key={l} label={l} on={e.looking === l} onPress={() => dispatch({ type: 'ENC_SET', patch: { looking: l } })} />
              ))}
            </View>
            <Text style={styles.label}>Quero conhecer</Text>
            <View style={styles.wrap}>
              {INTEREST.map(([k, l]) => (
                <Pill key={k} label={l} on={e.interest === k} onPress={() => dispatch({ type: 'ENC_SET', patch: { interest: k } })} />
              ))}
            </View>
          </Section>

          <Section title="3. Termos do Encontros">
            <TouchableOpacity style={styles.termsLink} onPress={openTerms}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>Ler os termos completos</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{TERMS_VERSION}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Check on={age} onPress={() => setAge(!age)} text="Tenho 18 anos ou mais e não estou em um relacionamento." />
            <Check on={agree} onPress={() => setAgree(!agree)} text="Li e aceito os Termos de Uso do Realys Encontros." />
            <Check
              on={consent}
              onPress={() => setConsent(!consent)}
              text="Autorizo o Realys a usar meus dados de relacionamento e a minha localização aproximada (só com o radar ligado) para o Encontros funcionar. Posso retirar a autorização a qualquer momento."
            />
          </Section>

          <Button title="Entrar no Encontros" onPress={enter} style={!ready ? { opacity: 0.5 } : null} />
        </>
      ) : null}
    </Screen>
  );
}

// Já participa: radar, matches e ajustes.
function Main({ openTerms }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const e = state.encontros;
  const [seg, setSeg] = useState('radar');
  const [match, setMatch] = useState(null);
  const [chat, setChat] = useState(null);
  const [video, setVideo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [note, setNote] = useState(null);

  // Só aparece quem também aceitou os termos e está disponível. Casados e namorando ficam de fora.
  const nearby = encounterPeople.filter(
    (p) => p.optIn && statusAllowed(p.status) && !e.blocked[p.id] && p.km <= e.maxKm && (e.interest === 'todos' || p.gender === e.interest)
  );
  const queue = nearby.filter((p) => !e.liked[p.id] && !e.passed[p.id]);
  const current = queue[0];
  const matches = e.matches.map((id) => encounterPeople.find((p) => p.id === id)).filter(Boolean);

  // Notificação simulada: com o radar ligado, avisa quando alguém do Encontros passa perto.
  useEffect(() => {
    if (!e.radar || !queue.length) return;
    const p = queue[0];
    const t = setTimeout(() => setBanner(p), 2500);
    const h = setTimeout(() => setBanner(null), 8000);
    return () => {
      clearTimeout(t);
      clearTimeout(h);
    };
  }, [e.radar]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(t);
  }, [note]);

  const like = (p) => {
    dispatch({ type: 'ENC_LIKE', id: p.id, mutual: p.likesYou });
    if (p.likesYou) setMatch(p);
    else setNote(`Curtida enviada para ${p.name}. Se for recíproco, vira match.`);
  };
  const report = (p) =>
    Alert.alert('Denunciar ' + p.name, 'Nossa equipe analisa em até 24 h. A pessoa não fica sabendo quem denunciou.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Denunciar e bloquear',
        style: 'destructive',
        onPress: () => dispatch({ type: 'ENC_UNMATCH', id: p.id, block: true }),
      },
    ]);
  const contactOf = (p) => ({ id: 'enc-' + p.id, name: p.name, status: 'match do Encontros', photo: p.photo });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.segRow}>
        {[
          ['radar', 'Radar', 'radio-outline'],
          ['matches', `Matches${matches.length ? ` (${matches.length})` : ''}`, 'heart-outline'],
          ['ajustes', 'Ajustes', 'options-outline'],
        ].map(([k, label, icon]) => {
          const on = k === seg;
          return (
            <TouchableOpacity key={k} style={[styles.seg, on && styles.segOn]} onPress={() => setSeg(k)}>
              <Ionicons name={on ? icon.replace('-outline', '') : icon} size={16} color={on ? '#fff' : ROSE} />
              <Text style={[styles.segText, on && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {seg === 'radar' ? (
        <Screen>
          <Card style={[styles.radarCard, e.radar && { borderColor: ROSE }]}>
            <Row>
              <View style={[styles.radarIcon, e.radar && { backgroundColor: ROSE }]}>
                <Ionicons name={e.radar ? 'radio' : 'radio-outline'} size={22} color={e.radar ? '#fff' : ROSE} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Radar de encontros {e.radar ? 'ligado' : 'desligado'}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {e.radar ? `Usando o GPS para achar quem passa até ${e.maxKm} km de você` : 'Ligue para ver quem cruzar com você'}
                </Text>
              </View>
              <Switch
                value={e.radar}
                onValueChange={(v) => dispatch({ type: 'ENC_SET', patch: { radar: v } })}
                trackColor={{ true: ROSE, false: colors.border }}
                thumbColor="#fff"
              />
            </Row>
          </Card>

          {!e.radar ? (
            <Empty text="Com o radar desligado você não aparece para ninguém e não recebe avisos de encontros." />
          ) : current ? (
            <PersonCard p={current} onLike={() => like(current)} onPass={() => dispatch({ type: 'ENC_PASS', id: current.id })} onReport={() => report(current)} />
          ) : (
            <Card>
              <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'center' }}>Por enquanto é isso por perto</Text>
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>
                Deixe o radar ligado: quando alguém do Encontros passar perto, você recebe um aviso.
              </Text>
            </Card>
          )}
        </Screen>
      ) : null}

      {seg === 'matches' ? (
        <Screen>
          {!matches.length ? <Empty text="Quando vocês dois curtirem, o match aparece aqui e a conversa é liberada." /> : null}
          {matches.map((p) => {
            const msgs = e.chats[p.id] || [];
            const last = msgs[msgs.length - 1];
            return (
              <Card key={p.id}>
                <Row>
                  <Photo uri={p.photo} style={styles.matchAvatar} fallback="🙂" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>
                      {p.name}, {p.age} <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                    </Text>
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
                      {last ? (last.from === 'me' ? 'Você: ' : '') + last.text : `Vocês deram match · ${p.looking}`}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.msgBtn} onPress={() => setChat(p)} accessibilityLabel={`Conversar com ${p.name}`}>
                    <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  </TouchableOpacity>
                </Row>
                <Row style={{ marginTop: 10 }}>
                  <TouchableOpacity onPress={() => dispatch({ type: 'ENC_UNMATCH', id: p.id })}>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>Desfazer match</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.border, marginHorizontal: 8 }}>|</Text>
                  <TouchableOpacity onPress={() => report(p)}>
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Denunciar e bloquear</Text>
                  </TouchableOpacity>
                </Row>
              </Card>
            );
          })}
          <SafetyCard />
        </Screen>
      ) : null}

      {seg === 'ajustes' ? <Settings openTerms={openTerms} /> : null}

      {banner && e.radar ? (
        <TouchableOpacity style={[styles.banner, { top: 8 }]} onPress={() => (setBanner(null), setSeg('radar'))} activeOpacity={0.9}>
          <Photo uri={banner.photo} style={styles.bannerAvatar} fallback="💘" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>💘 Alguém do Encontros está perto</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {banner.name}, {banner.age}, {approx(banner.km)}. Toque para ver.
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
      {note ? (
        <View style={[styles.toast, { bottom: 100 + insets.bottom }]}>
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>{note}</Text>
        </View>
      ) : null}

      <MatchModal
        p={match}
        onClose={() => setMatch(null)}
        onChat={() => {
          setChat(match);
          setMatch(null);
        }}
      />
      <ChatModal
        contact={chat ? contactOf(chat) : null}
        visible={!!chat}
        messages={chat ? e.chats[chat.id] || [] : []}
        onClose={() => setChat(null)}
        onSend={(msg) => dispatch({ type: 'ENC_MSG', id: chat.id, msg })}
        onVideo={() => setVideo(contactOf(chat))}
      />
      <VideoCallModal contact={video} visible={!!video} onClose={() => setVideo(null)} />
    </View>
  );
}

function PersonCard({ p, onLike, onPass, onReport }) {
  return (
    <View style={styles.person}>
      <Photo uri={p.photo} style={styles.personPhoto} fallback="🙂" />
      <View style={styles.personCross}>
        <Ionicons name="location" size={12} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
          Cruzou com você {p.when} · {p.place}
        </Text>
      </View>
      <View style={{ padding: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>
            {p.name}, {p.age} <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          </Text>
          <TouchableOpacity onPress={onReport} accessibilityLabel="Denunciar">
            <Ionicons name="flag-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        </Row>
        <Text style={{ color: ROSE, fontWeight: '700', fontSize: 12, marginTop: 2 }}>
          {approx(p.km)} · procura {p.looking.toLowerCase()}
        </Text>
        <Text style={{ color: colors.text, marginTop: 8, lineHeight: 20 }}>{p.bio}</Text>
        <View style={[styles.wrap, { marginTop: 10 }]}>
          {p.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={{ color: colors.text, fontSize: 12 }}>{t}</Text>
            </View>
          ))}
        </View>
        <Row style={{ justifyContent: 'center', marginTop: 14 }}>
          <TouchableOpacity style={[styles.round, { borderColor: colors.border }]} onPress={onPass} accessibilityLabel="Passar">
            <Ionicons name="close" size={30} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.round, { backgroundColor: ROSE, borderColor: ROSE, marginLeft: 28 }]} onPress={onLike} accessibilityLabel="Curtir">
            <Ionicons name="heart" size={30} color="#fff" />
          </TouchableOpacity>
        </Row>
        <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>A outra pessoa não fica sabendo se você passou.</Text>
      </View>
    </View>
  );
}

function MatchModal({ p, onClose, onChat }) {
  if (!p) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.matchBox}>
          <Text style={{ fontSize: 44 }}>💘</Text>
          <Text style={{ color: ROSE, fontSize: 26, fontWeight: '900', marginTop: 4 }}>É um match!</Text>
          <Photo uri={p.photo} style={styles.matchBig} fallback="🙂" />
          <Text style={{ color: colors.text, textAlign: 'center', marginTop: 10 }}>Você e {p.name} se curtiram. A conversa está liberada.</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
            Dica: no primeiro encontro, escolha um lugar público e avise alguém de confiança.
          </Text>
          <Button title={`Mandar mensagem para ${p.name}`} onPress={onChat} style={{ marginTop: 14, alignSelf: 'stretch', backgroundColor: ROSE, borderColor: ROSE }} />
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Continuar no radar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Settings({ openTerms }) {
  const { state, dispatch } = useStore();
  const e = state.encontros;
  const setStatus = (s) => {
    if (!s.allowed) {
      return Alert.alert(
        'Mudar para ' + s.label + '?',
        'Com esse status o Encontros é desligado: você some do radar e não recebe mais notificações de encontros.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Mudar', onPress: () => dispatch({ type: 'ENC_SET_STATUS', status: s.key, allowed: false }) },
        ]
      );
    }
    dispatch({ type: 'ENC_SET_STATUS', status: s.key, allowed: true });
  };
  const leave = () =>
    Alert.alert('Sair do Encontros', 'Seu perfil de Encontros, curtidas, matches e conversas daqui serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair e apagar', style: 'destructive', onPress: () => dispatch({ type: 'ENC_LEAVE' }) },
    ]);
  return (
    <Screen>
      <Section title="Status de relacionamento">
        <View style={styles.wrap}>
          {RELATIONSHIP_STATUS.map((s) => (
            <Pill key={s.key} label={s.label} on={e.status === s.key} onPress={() => setStatus(s)} />
          ))}
        </View>
      </Section>
      <Section title="O que você procura">
        <View style={styles.wrap}>
          {LOOKING.map((l) => (
            <Pill key={l} label={l} on={e.looking === l} onPress={() => dispatch({ type: 'ENC_SET', patch: { looking: l } })} />
          ))}
        </View>
        <Text style={styles.label}>Quero conhecer</Text>
        <View style={styles.wrap}>
          {INTEREST.map(([k, l]) => (
            <Pill key={k} label={l} on={e.interest === k} onPress={() => dispatch({ type: 'ENC_SET', patch: { interest: k } })} />
          ))}
        </View>
        <Text style={styles.label}>Distância máxima</Text>
        <View style={styles.wrap}>
          {KMS.map((k) => (
            <Pill key={k} label={`${k} km`} on={e.maxKm === k} onPress={() => dispatch({ type: 'ENC_SET', patch: { maxKm: k } })} />
          ))}
        </View>
      </Section>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Modo invisível</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Você vê quem passa, mas não aparece para ninguém</Text>
          </View>
          <Switch value={e.invisible} onValueChange={(v) => dispatch({ type: 'ENC_SET', patch: { invisible: v } })} trackColor={{ true: ROSE, false: colors.border }} thumbColor="#fff" />
        </Row>
      </Card>
      <TouchableOpacity style={styles.termsLink} onPress={openTerms}>
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>Termos do Encontros</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Aceitos · {e.termsVersion}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>
      <SafetyCard />
      <Button variant="danger" title="Sair do Encontros e apagar meus dados" onPress={leave} style={{ marginTop: 6 }} />
    </Screen>
  );
}

function SafetyCard() {
  return (
    <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(226,182,73,0.6)', marginTop: 8 }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '800', marginBottom: 4 }}>🛡️ Encontro seguro</Text>
      <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
        Primeiro encontro em lugar público · avise alguém de confiança · vá e volte por conta própria · nunca envie dinheiro · em perigo, ligue 190.
      </Text>
    </Card>
  );
}

function TermsModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={styles.termsHead}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Termos de Uso do Realys Encontros</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{TERMS_VERSION}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
          <Card style={{ backgroundColor: colors.cardAlt }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Proposta inicial para revisão da equipe. Antes do lançamento, este texto precisa ser revisado por um advogado.
            </Text>
          </Card>
          {ENCONTROS_TERMS.map((t) => (
            <View key={t.title} style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>{t.title}</Text>
              <Text style={{ color: colors.text, lineHeight: 21 }}>{t.body}</Text>
            </View>
          ))}
          <Button title="Fechar" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Bullet({ icon, text }) {
  return (
    <Row style={{ alignItems: 'flex-start', marginBottom: 6 }}>
      <Ionicons name={icon} size={15} color={ROSE} style={{ marginTop: 2 }} />
      <Text style={{ color: colors.text, fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 }}>{text}</Text>
    </Row>
  );
}

function Pill({ label, on, onPress }) {
  return (
    <TouchableOpacity style={[styles.pill, on && styles.pillOn]} onPress={onPress}>
      <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Check({ on, onPress, text }) {
  return (
    <TouchableOpacity style={styles.check} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? ROSE : colors.muted} />
      <Text style={{ color: colors.text, fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 }}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#FFF0F4', borderRadius: 22, borderWidth: 1, borderColor: '#F6C6D3', padding: 18, marginBottom: 18 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: ROSE, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 10 },
  heroSub: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  label: { color: colors.muted, fontSize: 12, marginTop: 6, marginBottom: 6 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  pillOn: { backgroundColor: ROSE, borderColor: ROSE },
  termsLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  check: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  segRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  seg: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#F6C6D3', backgroundColor: colors.card, marginRight: 6 },
  segOn: { backgroundColor: ROSE, borderColor: ROSE },
  segText: { color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  radarCard: { borderWidth: 1.5 },
  radarIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F4', alignItems: 'center', justifyContent: 'center' },
  person: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  personPhoto: { width: '100%', height: 340 },
  personCross: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  round: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  matchAvatar: { width: 54, height: 54, borderRadius: 27 },
  msgBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: ROSE, alignItems: 'center', justifyContent: 'center' },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: ROSE,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerAvatar: { width: 44, height: 44, borderRadius: 22 },
  toast: { position: 'absolute', left: 24, right: 24, backgroundColor: 'rgba(31,42,68,0.92)', borderRadius: 14, padding: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.45)', justifyContent: 'center', padding: 24 },
  matchBox: { backgroundColor: colors.card, borderRadius: 26, padding: 22, alignItems: 'center' },
  matchBig: { width: 130, height: 130, borderRadius: 65, marginTop: 12, borderWidth: 4, borderColor: ROSE },
  termsHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
