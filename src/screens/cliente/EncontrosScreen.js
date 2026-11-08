import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Alert, TextInput, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { colors, soft } from '../../theme';
import { Screen, Card, Row, Button, Photo, Section, Empty } from '../../components/ui';
import { datePeople, datePerson, DATE_SPOTS, CHARMS_PER_DAY, minutesAgo } from '../../dateData';
import { BoostButton } from '../../components/Boost';
import { DatePlanCard, DatePlansModal } from '../../components/DatePlans';
import { isDateSubscriber, isOnline } from '../../datePlans';
import { ENCONTROS_TERMS, TERMS_VERSION, RELATIONSHIP_STATUS, statusAllowed } from '../../encontrosTerms';
import { ChatModal, VideoCallModal } from './home/Social';
import { PROFILE_FIELDS, INTEREST_GROUPS, profileScore } from '../../encontrosProfile';
import { useBack } from '../../back';
import * as ImagePicker from 'expo-image-picker';
import { ageFromBirth } from '../../accounts';

const ROSE = '#E0567A';
const LOOKING = ['Amizade', 'Namoro', 'Relacionamento sério'];
const INTEREST = [
  ['f', 'Mulheres'],
  ['m', 'Homens'],
  ['todos', 'Todos'],
];
const KMS = [1, 3, 5, 10];
const AGES = [
  [18, 25],
  [25, 35],
  [35, 45],
  [45, 99],
];

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

  const [step, setStep] = useState(0); // 0 = vitrine chamativa; 1 = perguntas de entrada
  const enter = () => {
    if (!ready) return Alert.alert('Falta pouco', 'Marque as três confirmações para entrar no Date.');
    dispatch({ type: 'ENC_SET', patch: { accepted: true, termsVersion: TERMS_VERSION, radar: true } });
  };
  // Quem está no Date por perto (fotos borradas na vitrine: dá curiosidade para entrar).
  const around = datePeople.filter((p) => p.optIn && statusAllowed(p.status));
  const today = around.filter((p) => minutesAgo(p.when) < 1440).length;
  const done = [!!e.status && allowed, !!e.looking && !!e.interest, age && agree && consent].filter(Boolean).length;

  // Voltar do celular nas perguntas: volta para a vitrine.
  useBack(step === 1, () => setStep(0));

  if (!step) return <DateShowcase people={around} today={today} onStart={() => setStep(1)} />;

  return (
    <Screen>
      <View style={styles.prog}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.progBar, i < Math.max(1, done) && styles.progOn]} />
        ))}
      </View>
      <Text style={styles.progText}>Passo {Math.min(3, done + 1)} de 3 · leva menos de 1 minuto</Text>

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
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }}>O Encontros fica desligado para você</Text>
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
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Ler os termos completos</Text>
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

          <Button title="Entrar no Date" onPress={enter} style={!ready ? { opacity: 0.5 } : null} />
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            Depois de entrar, monte seu perfil de namoro (gostos, estilo de vida e mais). É opcional, mas perfil vazio recebe pouco engajamento.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}


// Vitrine da entrada do Date: chamativa, para dar vontade de entrar. As fotos de quem está por perto
// aparecem borradas (só quem entra vê), com o contador de quem cruzou com você hoje.
const BUBBLES = [
  { left: 18, top: 62, size: 62 },
  { left: 74, top: 150, size: 46 },
  { right: 20, top: 58, size: 70 },
  { right: 84, top: 150, size: 44 },
  { left: 120, top: 56, size: 38 },
  { right: 128, top: 62, size: 34 },
];
function DateShowcase({ people, today, onStart }) {
  return (
    <Screen>
      <View style={styles.show}>
        <View style={[styles.glow, { left: -60, top: -50, width: 220, height: 220, backgroundColor: '#FF8FB0' }]} />
        <View style={[styles.glow, { right: -70, bottom: -80, width: 240, height: 240, backgroundColor: '#9B2C5E' }]} />
        {BUBBLES.map((b, i) =>
          people[i] ? (
            <Image
              key={i}
              source={{ uri: people[i].photo }}
              blurRadius={10}
              style={[styles.bubble, { width: b.size, height: b.size, borderRadius: b.size / 2, top: b.top }, b.left != null ? { left: b.left } : { right: b.right }]}
            />
          ) : null,
        )}
        <View style={[styles.center, { top: 18 }]}>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              <Text style={{ color: '#FFE08A' }}>{today || people.length} pessoas</Text> cruzaram com você hoje
            </Text>
          </View>
        </View>
        <View style={[styles.center, { top: 92 }]}>
          <View style={styles.showHeart}>
            <Text style={{ fontSize: 32 }}>💘</Text>
          </View>
        </View>
        <View style={styles.showText}>
          <Text style={styles.showTitle}>Alguém especial pode ter passado por você hoje</Text>
          <Text style={styles.showSub}>Veja quem cruzou seu caminho e descubra se o interesse é recíproco.</Text>
        </View>
      </View>

      <Text style={styles.howKick}>COMO FUNCIONA</Text>
      <View style={{ flexDirection: 'row' }}>
        {[
          ['👣', 'Cruze', 'Quem passa perto aparece pra você'],
          ['❤️', 'Curta', 'Em segredo: ninguém fica sabendo'],
          ['💬', 'Crush!', 'Curtiram de volta? A conversa abre'],
        ].map(([ic, t, d], i) => (
          <View key={t} style={[styles.howStep, i ? { marginLeft: 8 } : null]}>
            <View style={styles.howIc}>
              <Text style={{ fontSize: 18 }}>{ic}</Text>
            </View>
            <Text style={styles.howNum}>{i + 1}</Text>
            <Text style={styles.howTitle}>{t}</Text>
            <Text style={styles.howDesc}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.wrap, { marginTop: 12 }]}>
        {['🛡️ Todos verificados por biometria', '📍 Só distância aproximada', '💍 Casados não participam', '✨ 3 Charmes por dia'].map((t) => (
          <View key={t} style={styles.trust}>
            <Text style={styles.trustText}>{t}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.bigCta} onPress={onStart} activeOpacity={0.9} accessibilityLabel="Quero ver quem cruzou comigo">
        <Text style={styles.bigCtaText}>Quero ver quem cruzou comigo</Text>
      </TouchableOpacity>
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>Leva menos de 1 minuto · só para maiores de 18</Text>
    </Screen>
  );
}

// Já participa: estilo Happn. Cruzamentos (quem passou perto, do mais recente para o mais antigo),
// Mapa (onde vocês se cruzaram, sempre aproximado), Crushes (quem curtiu você e as conversas) e Ajustes.
// Curtir é secreto: a pessoa só fica sabendo se curtir de volta (crush). O Charme avisa na hora.

function Main({ openTerms }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const e = state.encontros;
  const [seg, setSeg] = useState('cruzamentos');
  const [match, setMatch] = useState(null);
  const [chat, setChat] = useState(null);
  const [video, setVideo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [note, setNote] = useState(null);
  const [person, setPerson] = useState(null);
  const [editProfile, setEditProfile] = useState(false);
  const [plans, setPlans] = useState(null); // null = fechado; string = motivo
  const subscriber = isDateSubscriber(state);
  const myScore = profileScore(e);
  const charms = e.charms || {};
  // Charmes extras comprados hoje com pontos ou saldo (boost do Date).
  const extraCharms = (state.boosts || []).filter((b) => b.offerId === 'bd2' && new Date(b.at).toDateString() === new Date().toDateString()).length * 3 + (subscriber ? 3 : 0);
  const charmsLeft = Math.max(0, CHARMS_PER_DAY + extraCharms - (e.charmDay === new Date().toDateString() ? e.charmsUsed || 0 : 0));

  // Só aparece quem também aceitou os termos e está disponível. Casados e namorando ficam de fora.
  const visible = datePeople.filter(
    (p) =>
      p.optIn &&
      statusAllowed(p.status) &&
      !e.blocked[p.id] &&
      p.km <= e.maxKm &&
      (e.interest === 'todos' || p.gender === e.interest) &&
      p.age >= (e.ageMin || 18) &&
      p.age <= (e.ageMax || 99)
  );
  // Linha do tempo: quem cruzou com você por último aparece primeiro. Quem você passou some.
  const crossed = visible.filter((p) => !e.passed[p.id]).sort((a, b) => minutesAgo(a.when) - minutesAgo(b.when));
  const likedYou = visible.filter((p) => p.likesYou && !e.liked[p.id] && !e.passed[p.id]);
  const matches = e.matches.map((id) => datePerson(id)).filter(Boolean);

  // Notificação simulada: com o radar ligado, avisa quando alguém do Date passa perto.
  useEffect(() => {
    const fresh = crossed.find((p) => !e.liked[p.id]);
    if (!e.radar || !fresh) return;
    const t = setTimeout(() => setBanner(fresh), 2500);
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
    else setNote(`Você curtiu ${p.name}. É segredo: só vira crush se for recíproco.`);
  };
  const charm = (p) => {
    if (charms[p.id]) return setNote(`Você já mandou um Charme para ${p.name}.`);
    if (!charmsLeft) return Alert.alert('Charmes de hoje acabaram', `Você pode mandar ${CHARMS_PER_DAY} Charmes por dia. Amanhã tem mais, ou pegue mais com um boost do Date.`);
    dispatch({ type: 'ENC_CHARM', id: p.id, mutual: p.likesYou });
    if (p.likesYou) setMatch(p);
    else setNote(`✨ Charme enviado! ${p.name} é avisado(a) agora que você se interessou.`);
  };
  const pass = (p) => dispatch({ type: 'ENC_PASS', id: p.id });
  const report = (p) =>
    Alert.alert('Denunciar ' + p.name, 'Nossa equipe analisa em até 24 h. A pessoa não fica sabendo quem denunciou.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Tem foto com criança',
        onPress: () => {
          dispatch({ type: 'ENC_UNMATCH', id: p.id, block: true });
          setNote('Obrigado. Foto com criança não é permitida no Date: a equipe tira a foto e avalia o perfil.');
        },
      },
      {
        text: 'Denunciar e bloquear',
        style: 'destructive',
        onPress: () => dispatch({ type: 'ENC_UNMATCH', id: p.id, block: true }),
      },
    ]);
  const contactOf = (p) => ({ id: 'enc-' + p.id, name: p.name, status: isOnline(p) ? 'online agora' : 'offline', photo: p.photo, serverId: p.serverId, ctx: 'date' });
  // Chamada de vídeo do Date: só entre crushes, só com a pessoa online e só para quem assina o Date+.
  const callVideo = (p) => {
    if (!p || !e.matches.includes(p.id)) return setNote('Chamada de vídeo só com quem já é crush.');
    if (!isOnline(p)) return setNote(`${p.name} está offline. A chamada só pode ser feita com a pessoa online no Date.`);
    if (!subscriber) return setPlans('Chamada de vídeo no Date é para assinantes do Date+. Ela não toca nem faz bip: chega como convite discreto na tela da outra pessoa.');
    setVideo(contactOf(p));
  };
  const actions = { onLike: like, onPass: pass, onCharm: charm, onOpen: setPerson, onReport: report };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.segRow}>
        {[
          ['cruzamentos', 'Cruzamentos', 'footsteps-outline'],
          ['mapa', 'Mapa', 'map-outline'],
          ['crushes', `Crushes${matches.length + likedYou.length ? ` (${matches.length + likedYou.length})` : ''}`, 'heart-outline'],
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
      </ScrollView>

      {seg === 'cruzamentos' ? (
        <Screen>
          <RadarRow on={e.radar} km={e.maxKm} onChange={(v) => dispatch({ type: 'ENC_SET', patch: { radar: v } })} />
          <BoostButton target="date" label="Boost no Date" hint="Apareça primeiro para quem está perto ou ganhe mais charmes" />
          <DatePlanCard onOpen={() => setPlans('')} />
          {myScore < 70 ? <ScoreBar score={myScore} onPress={() => setEditProfile(true)} /> : null}
          {!e.radar ? (
            <Empty text="Com o radar desligado você não aparece para ninguém e não vê quem cruzou com você." />
          ) : !crossed.length ? (
            <Card>
              <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'center' }}>Ninguém cruzou com você ainda</Text>
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>
                Deixe o radar ligado e saia por aí: quem passar perto aparece aqui, do mais recente para o mais antigo.
              </Text>
            </Card>
          ) : (
            <>
              <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={styles.kicker}>{crossed.length} PESSOAS CRUZARAM COM VOCÊ</Text>
                <Text style={[styles.kicker, { color: colors.gold }]}>✨ {charmsLeft} charmes hoje</Text>
              </Row>
              {crossed.map((p) => (
                <DateCard key={p.id} p={p} liked={!!e.liked[p.id]} charmed={!!charms[p.id]} matched={e.matches.includes(p.id)} {...actions} />
              ))}
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginBottom: 10 }}>
                Curtir é secreto: a pessoa só fica sabendo se curtir você também.
              </Text>
            </>
          )}
        </Screen>
      ) : null}

      {seg === 'mapa' ? (
        <Screen>
          <CrossMap people={crossed} onOpen={setPerson} />
        </Screen>
      ) : null}

      {seg === 'crushes' ? (
        <Screen>
          <Text style={styles.h}>Curtiram você {likedYou.length ? `(${likedYou.length})` : ''}</Text>
          {likedYou.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 6 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {likedYou.map((p) => (
                <TouchableOpacity key={p.id} style={styles.likedTile} onPress={() => setPerson(p)} activeOpacity={0.9} accessibilityLabel={`${p.name} curtiu você`}>
                  <Photo uri={p.photo} style={styles.likedImg} fallback="🙂" />
                  <View style={styles.likedHeart}>
                    <Ionicons name="heart" size={13} color="#fff" />
                  </View>
                  <Text style={styles.likedName} numberOfLines={1}>
                    {p.name}, {p.age}
                  </Text>
                  <TouchableOpacity style={styles.likedBack} onPress={() => like(p)} accessibilityLabel={`Curtir ${p.name} de volta`}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Curtir de volta</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>Quando alguém curtir você, aparece aqui. Curta de volta para virar crush.</Text>
          )}

          <Text style={styles.h}>Seus crushes {matches.length ? `(${matches.length})` : ''}</Text>
          {!matches.length ? <Empty text="Crush é quando vocês dois se curtem. A conversa é liberada na hora." /> : null}
          {matches.map((p) => {
            const msgs = e.chats[p.id] || [];
            const last = msgs[msgs.length - 1];
            return (
              <Card key={p.id}>
                <Row>
                  <TouchableOpacity onPress={() => setPerson(p)} accessibilityLabel={`Ver perfil de ${p.name}`}>
                    <Photo uri={p.photo} style={styles.matchAvatar} fallback="🙂" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {isOnline(p) ? <Text style={{ color: '#1E9E63' }}>● </Text> : null}
                      {p.name}, {p.age} <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                      {charms[p.id] ? <Text style={{ color: colors.gold }}> ✨</Text> : null}
                    </Text>
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
                      {last ? (last.from === 'me' ? 'Você: ' : '') + last.text : `Crush! Vocês se cruzaram ${p.crossings.length}x · diga oi`}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.msgBtn} onPress={() => setChat(p)} accessibilityLabel={`Conversar com ${p.name}`}>
                    <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  </TouchableOpacity>
                </Row>
                <Row style={{ marginTop: 10 }}>
                  <TouchableOpacity onPress={() => dispatch({ type: 'ENC_UNMATCH', id: p.id })}>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>Desfazer crush</Text>
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

      {seg === 'ajustes' ? <Settings openTerms={openTerms} openProfile={() => setEditProfile(true)} openPlans={() => setPlans('')} /> : null}

      {banner && e.radar ? (
        <TouchableOpacity style={[styles.banner, { top: 8 }]} onPress={() => (setBanner(null), setPerson(banner))} activeOpacity={0.9}>
          <Photo uri={banner.photo} style={styles.bannerAvatar} fallback="💘" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>💘 Você cruzou com alguém</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {banner.name}, {banner.age}, {banner.place}. Toque para ver.
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
      {note ? (
        <View style={[styles.toast, { bottom: 100 + insets.bottom }]}>
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>{note}</Text>
        </View>
      ) : null}

      <PersonModal
        p={person}
        liked={person ? !!e.liked[person.id] : false}
        charmed={person ? !!charms[person.id] : false}
        matched={person ? e.matches.includes(person.id) : false}
        onClose={() => setPerson(null)}
        onLike={() => {
          const p = person;
          setPerson(null);
          like(p);
        }}
        onCharm={() => {
          const p = person;
          setPerson(null);
          charm(p);
        }}
        onPass={() => {
          pass(person);
          setPerson(null);
        }}
        onChat={() => {
          const p = person;
          setPerson(null);
          setChat(p);
        }}
      />
      <ProfileEditor visible={editProfile} onClose={() => setEditProfile(false)} />
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
        hideVoice
        onVideo={chat && e.matches.includes(chat.id) && isOnline(chat) ? () => callVideo(chat) : null}
      />
      <DatePlansModal visible={plans !== null} reason={plans} onClose={() => setPlans(null)} />
      <VideoCallModal contact={video} visible={!!video} onClose={() => setVideo(null)} />
    </View>
  );
}

// Radar compacto no topo dos Cruzamentos.
function RadarRow({ on, km, onChange }) {
  return (
    <Card style={[styles.radarCard, on && { borderColor: ROSE }]}>
      <Row>
        <View style={[styles.radarIcon, on && { backgroundColor: ROSE }]}>
          <Ionicons name={on ? 'radio' : 'radio-outline'} size={22} color={on ? '#fff' : ROSE} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Radar {on ? 'ligado' : 'desligado'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{on ? `Mostrando quem cruzou com você até ${km} km` : 'Ligue para ver quem cruzar com você'}</Text>
        </View>
        <Switch value={on} onValueChange={onChange} trackColor={{ true: ROSE, false: colors.border }} thumbColor="#fff" />
      </Row>
    </Card>
  );
}

// Cartão da linha do tempo (estilo Happn): foto grande, quando e onde vocês se cruzaram, e as ações.
function DateCard({ p, liked, charmed, matched, onLike, onPass, onCharm, onOpen, onReport }) {
  const last = p.crossings[0];
  return (
    <View style={styles.person}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => onOpen(p)} accessibilityLabel={`Ver perfil completo de ${p.name}`}>
        <Photo uri={p.photo} style={styles.personPhoto} fallback="🙂" />
        <View style={styles.personCross}>
          <Ionicons name="footsteps" size={12} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginLeft: 5 }}>
            {p.crossings.length > 1 ? `Cruzaram ${p.crossings.length} vezes · ` : 'Cruzou com você · '}
            {last.when}
          </Text>
        </View>
        <View style={styles.personShade}>
          <Text style={styles.personName}>
            {p.name}, {p.age} <Ionicons name="shield-checkmark" size={16} color="#fff" />
          </Text>
          <Text style={styles.personSub} numberOfLines={1}>
            {p.job ? `${p.job} · ` : ''}
            {last.place}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>
        {p.bio ? (
          <Text style={{ color: colors.text, lineHeight: 20 }} numberOfLines={2}>
            {p.bio}
          </Text>
        ) : null}
        {p.tags.length ? (
          <View style={[styles.wrap, { marginTop: 8 }]}>
            {p.tags.slice(0, 3).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={{ color: colors.text, fontSize: 12 }}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {matched ? (
          <View style={styles.likedRow}>
            <Ionicons name="heart" size={16} color={ROSE} />
            <Text style={{ color: ROSE, fontWeight: '800', marginLeft: 6 }}>Crush! A conversa está liberada em Crushes</Text>
          </View>
        ) : liked ? (
          <View style={styles.likedRow}>
            <Ionicons name={charmed ? 'sparkles' : 'heart'} size={16} color={charmed ? colors.gold : ROSE} />
            <Text style={{ color: colors.muted, fontWeight: '700', marginLeft: 6 }}>{charmed ? 'Você mandou um Charme' : 'Você curtiu (em segredo)'}</Text>
          </View>
        ) : (
          <Row style={{ justifyContent: 'center', marginTop: 12 }}>
            <TouchableOpacity style={[styles.round, { borderColor: colors.border }]} onPress={() => onPass(p)} accessibilityLabel={`Passar ${p.name}`}>
              <Ionicons name="close" size={28} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundSm, { marginLeft: 18 }]} onPress={() => onCharm(p)} accessibilityLabel={`Mandar um Charme para ${p.name}`}>
              <Ionicons name="sparkles" size={20} color={colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.round, { backgroundColor: ROSE, borderColor: ROSE, marginLeft: 18 }]} onPress={() => onLike(p)} accessibilityLabel={`Curtir ${p.name}`}>
              <Ionicons name="heart" size={28} color="#fff" />
            </TouchableOpacity>
          </Row>
        )}
        <TouchableOpacity onPress={() => onReport(p)} style={{ alignSelf: 'center', marginTop: 8 }} hitSlop={8}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Denunciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Mapa dos cruzamentos: os lugares onde vocês se cruzaram, sempre aproximados (nunca a posição exata).
function CrossMap({ people, onOpen }) {
  const [sel, setSel] = useState(null);
  const at = (key) => people.filter((p) => p.crossings.some((c) => c.spot === key));
  const spots = DATE_SPOTS.map((s) => ({ ...s, people: at(s.key) })).filter((s) => s.people.length);
  const chosen = spots.find((s) => s.key === sel) || null;
  const H = 360;
  return (
    <View>
      <View style={[styles.map, { height: H }]}>
        {/* Ruas e parques desenhados (sem mostrar endereço exato) */}
        {[0.18, 0.46, 0.74].map((y) => (
          <View key={'h' + y} style={[styles.street, { top: H * y, left: 0, right: 0, height: 10 }]} />
        ))}
        {[0.25, 0.55, 0.82].map((x) => (
          <View key={'v' + x} style={[styles.street, { left: `${x * 100}%`, top: 0, bottom: 0, width: 10 }]} />
        ))}
        <View style={[styles.street, { left: '-10%', right: '-10%', top: H * 0.58, height: 14, transform: [{ rotate: '-18deg' }] }]} />
        <View style={[styles.park, { left: '50%', top: H * 0.62, width: 90, height: 70 }]} />
        <View style={[styles.park, { left: '4%', top: H * 0.52, width: 70, height: 60 }]} />
        <View style={[styles.water, { left: '-6%', top: H * 0.84, width: 160, height: 40 }]} />
        {/* Você no meio */}
        <View style={[styles.me, { left: '46%', top: H * 0.5 - 14 }]}>
          <View style={styles.meDot} />
        </View>
        {spots.map((s) => {
          const on = s.key === sel;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.pin, { left: `${s.x * 80}%`, top: s.y * (H - 70) }, on && { transform: [{ scale: 1.15 }] }]}
              onPress={() => setSel(on ? null : s.key)}
              activeOpacity={0.85}
              accessibilityLabel={`${s.people.length} cruzamentos perto de ${s.label}`}
            >
              <Photo uri={s.people[0].photo} style={[styles.pinImg, on && { borderColor: colors.gold }]} fallback="💘" />
              <View style={styles.pinCount}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{s.people.length}</Text>
              </View>
              <Text style={styles.pinLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginVertical: 8 }}>Lugares aproximados: ninguém vê a sua posição exata.</Text>
      {chosen ? (
        <>
          <Text style={styles.h}>Cruzaram com você perto de {chosen.label}</Text>
          {chosen.people.map((p) => {
            const c = p.crossings.find((x) => x.spot === chosen.key);
            return (
              <TouchableOpacity key={p.id} style={styles.spotRow} onPress={() => onOpen(p)} activeOpacity={0.85}>
                <Photo uri={p.photo} style={styles.matchAvatar} fallback="🙂" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {p.name}, {p.age}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {c ? c.when : ''}
                    {p.job ? ` · ${p.job}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Toque num ponto do mapa para ver quem cruzou com você ali.</Text>
      )}
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
          <Text style={{ color: ROSE, fontSize: 26, fontWeight: '800', marginTop: 4 }}>É um crush!</Text>
          <Photo uri={p.photo} style={styles.matchBig} fallback="🙂" />
          <Text style={{ color: colors.text, textAlign: 'center', marginTop: 10 }}>Você e {p.name} se curtiram e já se cruzaram {p.crossings ? p.crossings.length : 1}x. A conversa está liberada.</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
            Dica: no primeiro encontro, escolha um lugar público e avise alguém de confiança.
          </Text>
          <Button title={`Mandar mensagem para ${p.name}`} onPress={onChat} style={{ marginTop: 14, alignSelf: 'stretch', backgroundColor: ROSE, borderColor: ROSE }} />
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Continuar vendo os cruzamentos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Settings({ openTerms, openProfile, openPlans }) {
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
      <ScoreBar score={profileScore(e)} onPress={openProfile} />
      <DatePlanCard onOpen={openPlans} />
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
        <Text style={styles.label}>Idade de quem aparece</Text>
        <View style={styles.wrap}>
          {AGES.map(([lo, hi]) => (
            <Pill
              key={lo}
              label={hi >= 99 ? `${lo}+` : `${lo} a ${hi}`}
              on={(e.ageMin || 18) === lo && (e.ageMax || 60) === hi}
              onPress={() => dispatch({ type: 'ENC_SET', patch: { ageMin: lo, ageMax: hi } })}
            />
          ))}
          <Pill label="Todas" on={(e.ageMin || 18) === 18 && (e.ageMax || 60) >= 60} onPress={() => dispatch({ type: 'ENC_SET', patch: { ageMin: 18, ageMax: 99 } })} />
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
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Termos do Encontros</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Aceitos · {e.termsVersion}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>
      <SafetyCard />
      <Button variant="danger" title="Sair do Encontros e apagar meus dados" onPress={leave} style={{ marginTop: 6 }} />
    </Screen>
  );
}

// Medidor de perfil completo: perfil vazio recebe pouco engajamento.
function ScoreBar({ score, onPress }) {
  const low = score < 50;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.score, low && { borderColor: '#F3C77A', backgroundColor: '#FFF8EA' }]}>
      <Row>
        <Ionicons name={low ? 'alert-circle-outline' : 'sparkles'} size={20} color={low ? '#C77D12' : ROSE} />
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1, marginLeft: 8 }}>Perfil de namoro {score}% completo</Text>
        <Text style={{ color: ROSE, fontWeight: '700' }}>{score >= 100 ? 'Editar' : 'Completar'}</Text>
      </Row>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${score}%`, backgroundColor: low ? '#E0A32E' : ROSE }]} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        {score >= 80
          ? 'Ótimo! Seu perfil aparece em destaque para quem cruza com você.'
          : low
          ? 'Perfil quase vazio recebe pouco engajamento: aparece no fim da fila dos outros e chama menos atenção. Conte seus gostos e seu estilo de vida.'
          : 'Bom começo. Complete mais alguns itens para ganhar destaque e receber mais curtidas.'}
      </Text>
    </TouchableOpacity>
  );
}

// Editor do perfil de namoro. Tudo é opcional.
// Fotos do celular para o álbum do Date.
async function pickPhotos(limit) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Autorize o Realys a ver suas fotos para escolher as do Date.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: limit, quality: 0.8 });
  if (res.canceled) return [];
  return (res.assets || []).map((x, i) => ({ id: 'dp-' + Date.now() + '-' + i, uri: x.uri }));
}
const ALBUM_MAX = 6;
const firstName = (state) => String((state.user && state.user.name) || 'Você').trim().split(/\s+/)[0];
// Idade do cadastro (data de nascimento verificada): não dá para mudar no Date.
const verifiedAge = (state) => (state.user && state.user.birth ? ageFromBirth(state.user.birth) : null);

// Como o próprio usuário aparece para os outros no Date (usado na prévia "Como me veem").
export function myDateProfile(state) {
  const e = state.encontros;
  const album = (e.album || []).map((x) => x.uri);
  return {
    id: 'me',
    name: firstName(state),
    age: verifiedAge(state) || e.age || '',
    job: e.job,
    bio: e.bio,
    km: 0.4,
    looking: e.looking || '',
    details: e.details || {},
    tags: e.interests || [],
    photo: album[0] || null,
    photos: album.length ? album : [null],
    crossings: [{ when: 'hoje às 14h20', place: 'perto da Av. Paulista' }],
  };
}

function ProfileEditor({ visible, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const e = state.encontros;
  const [bio, setBio] = useState(e.bio);
  const [job, setJob] = useState(e.job);
  const [details, setDetails] = useState(e.details);
  const [interests, setInterests] = useState(e.interests);
  const [album, setAlbum] = useState(e.album || []);
  const [age, setAge] = useState(e.age ? String(e.age) : '');
  const [noKids, setNoKids] = useState(!!e.noKids);
  const [showSocial, setShowSocial] = useState(!!e.showSocial);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setBio(e.bio);
    setJob(e.job || (state.myProfile && state.myProfile.profession) || '');
    setDetails(e.details);
    setInterests(e.interests);
    setAlbum(e.album || []);
    setAge(e.age ? String(e.age) : '');
    setNoKids(!!e.noKids);
    setShowSocial(!!e.showSocial);
  }, [visible]);
  const score = profileScore({ bio: bio.trim(), job: job.trim(), details, interests });
  const toggle = (i) => setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i]);
  const gallery = ((state.myGallery && state.myGallery.photos) || []).slice(0, 12);
  const inAlbum = (uri) => album.some((x) => x.uri === uri);
  const useGallery = (g) => {
    if (inAlbum(g.uri)) return setAlbum(album.filter((x) => x.uri !== g.uri));
    if (album.length >= ALBUM_MAX) return Alert.alert('Álbum cheio', `O álbum do Date tem até ${ALBUM_MAX} fotos. Tire uma para colocar outra.`);
    setAlbum([...album, { id: 'dg-' + g.id, uri: g.uri }]);
    setNoKids(false); // foto nova: confirma de novo que não tem criança
  };
  const addFromPhone = async () => {
    const free = ALBUM_MAX - album.length;
    if (free <= 0) return Alert.alert('Álbum cheio', `O álbum do Date tem até ${ALBUM_MAX} fotos.`);
    const picked = await pickPhotos(free);
    if (picked.length) {
      setAlbum([...album, ...picked].slice(0, ALBUM_MAX));
      setNoKids(false);
    }
  };
  const makeMain = (i) => setAlbum([album[i], ...album.filter((_, j) => j !== i)]);
  const removeAt = (i) => setAlbum(album.filter((_, j) => j !== i));
  const ageNum = parseInt(age, 10);
  const save = () => {
    if (!verifiedAge(state) && age && (isNaN(ageNum) || ageNum < 18 || ageNum > 99)) return Alert.alert('Idade', 'O Date é só para maiores de 18 anos.');
    if (album.length && !noKids)
      return Alert.alert('Fotos com crianças não são permitidas', 'Confirme que nenhuma foto do seu álbum do Date mostra crianças. Se alguma mostrar, tire ela do álbum.');
    dispatch({ type: 'ENC_SET', patch: { bio: bio.trim(), job: job.trim(), details, interests, album, age: ageNum || null, noKids, showSocial } });
    onClose();
  };
  const me = { ...myDateProfile(state), bio: bio.trim(), job: job.trim(), details, tags: interests, age: verifiedAge(state) || ageNum || '', photo: album[0] ? album[0].uri : null, photos: album.length ? album.map((x) => x.uri) : [null] };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.modalHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 12, flex: 1 }}>Meu perfil do Date</Text>
          <TouchableOpacity onPress={() => setPreview(true)} style={styles.previewBtn} accessibilityLabel="Ver como os outros me veem">
            <Ionicons name="eye-outline" size={14} color={ROSE} />
            <Text style={{ color: ROSE, fontWeight: '800', fontSize: 12, marginLeft: 4 }}>Como me veem</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={styles.howKick}>COMO VOCÊ APARECE</Text>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text }}>Nome no Date</Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {firstName(state)} <Ionicons name="lock-closed" size={11} color={colors.muted} />
              </Text>
            </Row>
            <Text style={styles.note}>Só o primeiro nome, do seu cadastro verificado. O sobrenome nunca aparece.</Text>
            <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ color: colors.text }}>Idade</Text>
              {verifiedAge(state) ? (
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {verifiedAge(state)} <Ionicons name="lock-closed" size={11} color={colors.muted} />
                </Text>
              ) : (
                <TextInput value={age} onChangeText={(t) => setAge(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="--" placeholderTextColor={colors.muted} style={styles.ageInput} />
              )}
            </Row>
            <Text style={styles.note}>
              {verifiedAge(state) ? 'Vem da data de nascimento do seu cadastro e não pode ser mudada.' : 'Contas antigas sem data de nascimento: informe aqui. O Date é só para maiores de 18.'}
            </Text>
          </Card>

          <Text style={styles.howKick}>ÁLBUM DO DATE (ATÉ {ALBUM_MAX} FOTOS)</Text>
          <View style={styles.albumGrid}>
            {album.map((x, i) => (
              <TouchableOpacity key={x.id} style={styles.albumSlot} onPress={() => makeMain(i)} activeOpacity={0.85} accessibilityLabel={i ? 'Tornar principal' : 'Foto principal'}>
                <Photo uri={x.uri} style={styles.albumImg} fallback="🙂" />
                {!i ? <Text style={styles.mainTag}>PRINCIPAL</Text> : null}
                <TouchableOpacity style={styles.albumX} onPress={() => removeAt(i)} hitSlop={6} accessibilityLabel="Tirar do álbum">
                  <Ionicons name="close" size={13} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {album.length < ALBUM_MAX ? (
              <TouchableOpacity style={[styles.albumSlot, styles.albumAdd]} onPress={addFromPhone} accessibilityLabel="Adicionar foto do celular">
                <Ionicons name="add" size={30} color={ROSE} />
                <Text style={{ color: ROSE, fontSize: 10, fontWeight: '700' }}>do celular</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {album.length > 1 ? <Text style={styles.note}>Toque numa foto para ela virar a principal.</Text> : null}

          {gallery.length ? (
            <>
              <Text style={[styles.howKick, { marginTop: 12 }]}>SUGESTÕES DA SUA GALERIA · TOQUE PARA USAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {gallery.map((g) => {
                  const on = inAlbum(g.uri);
                  return (
                    <TouchableOpacity key={g.id} onPress={() => useGallery(g)} style={{ marginRight: 7 }} activeOpacity={0.85}>
                      <Photo uri={g.uri} style={styles.sugImg} fallback="🖼️" />
                      <View style={[styles.sugCk, on && { backgroundColor: ROSE }]}>{on ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}</View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}
          <View style={styles.kidWarn}>
            <Text style={{ color: '#7A5A1E', fontSize: 12, lineHeight: 17 }}>
              Nada da sua galeria vai para o Date sem você escolher. <Text style={{ fontWeight: '800' }}>Fotos com crianças não são permitidas no Date</Text>, nem com seus filhos.
            </Text>
          </View>
          {album.length ? <Check on={noKids} onPress={() => setNoKids(!noKids)} text="Confirmo que nenhuma foto do meu álbum do Date mostra crianças." /> : null}

          <Text style={styles.howKick}>PRIVACIDADE</Text>
          <Card>
            <Row>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Mostrar meu perfil da Realys para meus crushes</Text>
                <Text style={styles.note}>Desligado: ninguém do Date chega ao seu perfil social, nem depois do crush.</Text>
              </View>
              <Switch value={showSocial} onValueChange={setShowSocial} trackColor={{ true: ROSE, false: colors.border }} thumbColor="#fff" />
            </Row>
          </Card>
          <View style={styles.shield}>
            <Text style={{ color: colors.text, fontSize: 12, lineHeight: 17 }}>
              🛡️ No Date ninguém vê seu sobrenome, seu @ ou seu perfil social, e você não aparece na busca de pessoas por ser do Date.
            </Text>
          </View>

          <ScoreBar score={score} />
          <Text style={styles.h}>Sobre mim</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Conte um pouco de você, do seu jeito e do que valoriza numa pessoa"
            placeholderTextColor={colors.muted}
            maxLength={300}
            multiline
            style={[styles.input, { minHeight: 90 }]}
          />
          <Text style={styles.h}>Profissão</Text>
          <TextInput value={job} onChangeText={setJob} placeholder="Ex.: Professora, motorista, empresário" placeholderTextColor={colors.muted} style={styles.input} />
          {PROFILE_FIELDS.map((f) => (
            <View key={f.key}>
              <Row style={{ marginTop: 6 }}>
                <Ionicons name={f.icon} size={16} color={ROSE} />
                <Text style={[styles.h, { marginTop: 0, marginLeft: 6, marginBottom: 0 }]}>{f.label}</Text>
              </Row>
              <View style={[styles.wrap, { marginTop: 8 }]}>
                {f.options.map((o) => (
                  <Pill key={o} label={o} on={details[f.key] === o} onPress={() => setDetails({ ...details, [f.key]: details[f.key] === o ? undefined : o })} />
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.h}>Meus gostos (escolha vários)</Text>
          {INTEREST_GROUPS.map((g) => (
            <View key={g.title}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              <View style={styles.wrap}>
                {g.items.map((i) => (
                  <Pill key={i} label={i} on={interests.includes(i)} onPress={() => toggle(i)} />
                ))}
              </View>
            </View>
          ))}
          <Button title="Salvar meu perfil do Date" onPress={save} style={{ marginTop: 10, backgroundColor: ROSE, borderColor: ROSE }} />
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Quanto mais completo, mais destaque e mais curtidas.
          </Text>
        </ScrollView>
        <PersonModal p={preview ? me : null} preview onClose={() => setPreview(false)} />
      </View>
    </Modal>
  );
}

// Perfil completo de quem cruzou com você.
// Perfil completo de quem cruzou com você: fotos (arraste para o lado), onde e quando vocês se
// cruzaram, sobre, estilo de vida e gostos.
function PersonModal({ p, liked, charmed, matched, preview, onClose, onLike, onPass, onCharm, onChat }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [p && p.id]);
  if (!p) return null;
  const W = Dimensions.get('window').width;
  const det = PROFILE_FIELDS.filter((f) => p.details && p.details[f.key]);
  const photos = p.photos || [p.photo];
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(ev) => setPage(Math.round(ev.nativeEvent.contentOffset.x / W))}
          >
            {photos.map((u, i) => (
              <Photo key={i} uri={u} style={{ width: W, height: 420 }} fallback="🙂" />
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { position: 'absolute', left: 14, top: insets.top + 10 }]} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            {p.name}
            {p.age ? `, ${p.age}` : ''} <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          </Text>
          {p.job ? <Text style={{ color: colors.muted, marginTop: 2 }}>{p.job}</Text> : null}
          <Text style={{ color: ROSE, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
            {approx(p.km)}
            {p.looking ? ` · procura ${p.looking.toLowerCase()}` : ''}
          </Text>

          <Text style={styles.h}>Onde vocês se cruzaram</Text>
          {(p.crossings || [{ when: p.when, place: p.place }]).map((c, i) => (
            <View key={i} style={styles.crossBox}>
              <Ionicons name="footsteps-outline" size={15} color={ROSE} />
              <Text style={{ color: colors.text, fontSize: 12.5, marginLeft: 6, flex: 1 }}>
                {c.place} · {c.when}
              </Text>
            </View>
          ))}

          {p.bio ? (
            <>
              <Text style={styles.h}>Sobre</Text>
              <Text style={{ color: colors.text, lineHeight: 20 }}>{p.bio}</Text>
            </>
          ) : null}
          {det.length ? (
            <>
              <Text style={styles.h}>Estilo de vida</Text>
              <View style={styles.detGrid}>
                {det.map((f) => (
                  <View key={f.key} style={styles.detItem}>
                    <Ionicons name={f.icon} size={16} color={ROSE} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={{ fontSize: 11, color: colors.muted }}>{f.label}</Text>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>{p.details[f.key]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>{p.name} ainda não preencheu o estilo de vida.</Text>
          )}
          {p.tags.length ? (
            <>
              <Text style={styles.h}>Gostos</Text>
              <View style={styles.wrap}>
                {p.tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={{ color: colors.text, fontSize: 12 }}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {preview ? (
            <View style={[styles.shield, { marginTop: 16 }]}>
              <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                Escondido no Date: <Text style={{ color: ROSE, fontWeight: '800' }}>sobrenome</Text>, <Text style={{ color: ROSE, fontWeight: '800' }}>@ do perfil</Text>,{' '}
                <Text style={{ color: ROSE, fontWeight: '800' }}>amigos</Text>, <Text style={{ color: ROSE, fontWeight: '800' }}>publicações</Text> e{' '}
                <Text style={{ color: ROSE, fontWeight: '800' }}>fotos que você não escolheu</Text>.
              </Text>
            </View>
          ) : matched ? (
            <Button title={`Conversar com ${p.name}`} onPress={onChat} style={{ marginTop: 16, backgroundColor: ROSE, borderColor: ROSE }} />
          ) : liked ? (
            <View style={[styles.likedRow, { justifyContent: 'center', marginTop: 16 }]}>
              <Ionicons name={charmed ? 'sparkles' : 'heart'} size={16} color={charmed ? colors.gold : ROSE} />
              <Text style={{ color: colors.muted, fontWeight: '700', marginLeft: 6 }}>{charmed ? 'Você mandou um Charme' : 'Você curtiu (em segredo)'}</Text>
            </View>
          ) : (
            <Row style={{ justifyContent: 'center', marginTop: 16 }}>
              <TouchableOpacity style={[styles.round, { borderColor: colors.border }]} onPress={onPass} accessibilityLabel="Passar">
                <Ionicons name="close" size={30} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roundSm, { marginLeft: 18 }]} onPress={onCharm} accessibilityLabel="Mandar um Charme">
                <Ionicons name="sparkles" size={20} color={colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.round, { backgroundColor: ROSE, borderColor: ROSE, marginLeft: 18 }]} onPress={onLike} accessibilityLabel="Curtir">
                <Ionicons name="heart" size={30} color="#fff" />
              </TouchableOpacity>
            </Row>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

function SafetyCard() {
  return (
    <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(226,182,73,0.6)', marginTop: 8 }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '700', marginBottom: 4 }}>🛡️ Encontro seguro</Text>
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
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Termos de Uso do Realys Encontros</Text>
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
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>{t.title}</Text>
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
  previewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  note: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 },
  ageInput: { minWidth: 56, textAlign: 'center', borderWidth: 1.5, borderColor: ROSE, borderRadius: 10, paddingVertical: 4, color: colors.text, fontWeight: '800', fontSize: 15 },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  albumSlot: { width: '31.5%', height: 118, borderRadius: 14, overflow: 'hidden', marginBottom: 7 },
  albumImg: { width: '100%', height: '100%' },
  albumAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#F2B8C8', backgroundColor: '#FFF7F9', alignItems: 'center', justifyContent: 'center' },
  mainTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: ROSE, color: '#fff', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  albumX: { position: 'absolute', right: 5, top: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  sugImg: { width: 72, height: 72, borderRadius: 12 },
  sugCk: { position: 'absolute', right: 4, top: 4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  kidWarn: { backgroundColor: '#FFF6DE', borderRadius: 12, padding: 10, marginTop: 10 },
  shield: { backgroundColor: '#EEF6EF', borderRadius: 12, padding: 10, marginTop: 10, marginBottom: 6 },
  show: { height: 318, borderRadius: 28, overflow: 'hidden', backgroundColor: ROSE, marginBottom: 4 },
  glow: { position: 'absolute', borderRadius: 200, opacity: 0.55 },
  bubble: { position: 'absolute', borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5CF29B', marginRight: 6 },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  showHeart: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#9B2C5E', shadowOpacity: 0.45, shadowRadius: 12 },
  showText: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 18 },
  showTitle: { color: '#fff', fontSize: 23, lineHeight: 27, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 10 },
  showSub: { color: 'rgba(255,255,255,0.95)', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  howKick: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 8, marginLeft: 2 },
  howStep: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', ...soft },
  howIc: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF0F4', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  howNum: { color: ROSE, fontSize: 10, fontWeight: '900' },
  howTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  howDesc: { color: colors.muted, fontSize: 10.5, lineHeight: 14, textAlign: 'center', marginTop: 3 },
  trust: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6, ...soft },
  trustText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  bigCta: { marginTop: 16, backgroundColor: ROSE, borderRadius: 22, paddingVertical: 16, alignItems: 'center', elevation: 6, shadowColor: ROSE, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  bigCtaText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  prog: { flexDirection: 'row', marginBottom: 4 },
  progBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#F6C6D3', marginRight: 6 },
  progOn: { backgroundColor: ROSE },
  progText: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 10 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  personShade: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 30, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.38)' },
  personName: { color: '#fff', fontSize: 24, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 },
  personSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  roundSm: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(226,182,73,0.7)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBEF' },
  likedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, alignSelf: 'center' },
  likedTile: { width: 132, marginRight: 10 },
  likedImg: { width: 132, height: 170, borderRadius: 18 },
  likedHeart: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: ROSE, alignItems: 'center', justifyContent: 'center' },
  likedName: { color: colors.text, fontWeight: '700', marginTop: 6 },
  likedBack: { marginTop: 6, backgroundColor: ROSE, borderRadius: 12, paddingVertical: 7, alignItems: 'center' },
  map: { backgroundColor: '#EEF1E8', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3D3' },
  street: { position: 'absolute', backgroundColor: '#FFFFFF', opacity: 0.95 },
  park: { position: 'absolute', backgroundColor: '#CDE8C4', borderRadius: 30 },
  water: { position: 'absolute', backgroundColor: '#C9E0F2', borderRadius: 30 },
  me: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(224,86,122,0.25)', alignItems: 'center', justifyContent: 'center' },
  meDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: ROSE, borderWidth: 2, borderColor: '#fff' },
  pin: { position: 'absolute', alignItems: 'center', width: 84 },
  pinImg: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: ROSE },
  pinCount: { position: 'absolute', top: -4, right: 14, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: ROSE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  pinLabel: { marginTop: 3, fontSize: 10, fontWeight: '800', color: colors.text, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  spotRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 10, marginBottom: 8, ...soft },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)', marginHorizontal: 3 },
  dotOn: { backgroundColor: '#fff', width: 18 },
  hero: { backgroundColor: '#FFF0F4', borderRadius: 22, borderWidth: 1, borderColor: '#F6C6D3', padding: 18, marginBottom: 18 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: ROSE, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 10 },
  heroSub: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  h: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  groupTitle: { color: colors.muted, fontWeight: '700', fontSize: 12, marginBottom: 6, marginTop: 4, textTransform: 'uppercase' },
  score: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: '#F6C6D3', padding: 12, marginBottom: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, marginVertical: 8, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 12, color: colors.text, fontSize: 15, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
  modalHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  detTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F4' },
  crossBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12 },
  detGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detItem: { width: '48.5%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 10, marginBottom: 8, ...soft },
  label: { color: colors.muted, fontSize: 12, marginTop: 6, marginBottom: 6 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  pillOn: { backgroundColor: ROSE, borderColor: ROSE },
  termsLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10, ...soft },
  check: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  segRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  seg: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#F6C6D3', backgroundColor: colors.card, marginRight: 6 },
  segOn: { backgroundColor: ROSE, borderColor: ROSE },
  segText: { color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  radarCard: { borderWidth: 1.5 },
  radarIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F4', alignItems: 'center', justifyContent: 'center' },
  person: { backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', marginBottom: 14, ...soft },
  personPhoto: { width: '100%', height: 400 },
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
