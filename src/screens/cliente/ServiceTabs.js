import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, serviceType, priceText } from '../../store';
import { serviceTypes } from '../../data';
import { listings, lives } from '../../homeData';
import { sectorItems } from '../../techAgroData';
import { colors, brl, soft } from '../../theme';
import { Row, Photo, Badge } from '../../components/ui';
import { ratingText, reviewsCount } from '../../providerInfo';

// Abas da aba Serviços. "Serviços" é o geral (tudo); as outras separam e destacam as funções
// compatíveis com cada jeito de atender, sem tirar nada do geral.
export const SERVICE_TABS = [
  { key: 'servicos', label: 'Serviços', icon: 'construct-outline' },
  { key: 'cursos', label: 'Cursos', icon: 'library-outline' },
  { key: 'visitas', label: 'Visitas', icon: 'home-outline' },
  { key: 'aulas', label: 'Aulas', icon: 'school-outline' },
  { key: 'online', label: 'Online', icon: 'videocam-outline' },
];
export const SERVICE_TAB_KEYS = SERVICE_TABS.map((t) => t.key);

// Funções de cada aba (null = todas). Visitas: quem vai até o local avaliar e passar orçamento.
export const TAB_TYPES = {
  servicos: null,
  visitas: ['eletricista', 'encanador', 'pintor', 'mecanico', 'tecnico', 'agronomo', 'veterinario', 'droneagro'],
  aulas: serviceTypes.filter((t) => t.group === 'Aulas').map((t) => t.key),
};
export const isOnlineType = (key) => (serviceTypes.find((t) => t.key === key) || {}).mode === 'online';

// Em qual aba destacada uma função aparece (fora o geral).
export function tabOfType(key) {
  if (isOnlineType(key)) return 'online';
  if (TAB_TYPES.visitas.includes(key)) return 'visitas';
  if (TAB_TYPES.aulas.includes(key)) return 'aulas';
  return 'servicos';
}

// Explicação curta de cada aba para o cliente final, com o passo a passo.
const INTRO = {
  servicos: {
    icon: 'grid-outline',
    title: 'Todos os profissionais num lugar só',
    text: 'Aqui fica tudo. As outras abas separam cada jeito de atender para você achar mais rápido.',
    steps: ['Escolha a categoria e a função.', 'Compare nota, distância e preço.', 'Contrate na hora ou peça uma visita. O pagamento fica protegido.'],
  },
  visitas: {
    icon: 'home-outline',
    title: 'Visita técnica no seu endereço',
    text: 'O profissional vai até você, avalia o problema e passa o orçamento na hora.',
    steps: ['Você paga só a taxa de visita. Ela fica retida no Re@lys.', 'O profissional aceita e vai até o local.', 'Recebe o orçamento e decide. O valor do serviço vocês combinam direto.'],
  },
  aulas: {
    icon: 'school-outline',
    title: 'Aulas particulares',
    text: 'Professores e instrutores perto de você. Quem tem o selo "Também online" dá aula por vídeo.',
    steps: ['Escolha a matéria ou a atividade.', 'Veja nota, preço por aula e se atende online.', 'Marque a aula e pague pelo app.'],
  },
  cursos: {
    icon: 'library-outline',
    title: 'Cursos e faculdades online',
    text: 'Cursos com certificado, graduação e pós. Tudo pago e acompanhado pelo Re@lys.',
    steps: ['Escolha o curso.', 'Inscreva-se pelo Re@lys com a sua carteira.', 'Assista pelo app e participe das aulas ao vivo nas Lives.'],
  },
  online: {
    icon: 'videocam-outline',
    title: 'Atendimento online por vídeo',
    text: 'Psicólogo, nutricionista, advogado, contador, professores e mais, sem sair de casa.',
    steps: ['Escolha o profissional. O registro no conselho é verificado.', 'Escolha o horário livre e confirme.', 'Na hora marcada, entre na chamada de vídeo aqui no Re@lys.', 'O pagamento só é repassado depois do atendimento.'],
  },
};

export function TabIntro({ tab }) {
  const i = INTRO[tab];
  const [open, setOpen] = useState(false);
  if (!i) return null;
  return (
    <TouchableOpacity style={styles.intro} onPress={() => setOpen(!open)} activeOpacity={0.85} accessibilityLabel={`Como funciona: ${i.title}`}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={styles.introIcon}>
          <Ionicons name={i.icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.introTitle}>{i.title}</Text>
          <Text style={styles.introText}>{i.text}</Text>
        </View>
      </Row>
      <Row style={{ marginTop: 8, justifyContent: 'flex-end' }}>
        <Text style={styles.introMore}>{open ? 'Fechar' : 'Como funciona'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
      </Row>
      {open
        ? i.steps.map((s, n) => (
            <Row key={n} style={{ alignItems: 'flex-start', marginTop: 6 }}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{n + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s}</Text>
            </Row>
          ))
        : null}
    </TouchableOpacity>
  );
}

// ---------- Online ----------
// Áreas do atendimento online. Cada profissional entra pela função que ele exerce.
const AREAS = [
  { key: 'todos', label: 'Todos', icon: 'apps-outline' },
  { key: 'Saúde e bem-estar', label: 'Saúde', icon: 'heart-outline' },
  { key: 'Jurídico e finanças', label: 'Jurídico e finanças', icon: 'briefcase-outline' },
  { key: 'Aulas', label: 'Aulas', icon: 'school-outline' },
  { key: 'Tecnologia', label: 'Tecnologia', icon: 'hardware-chip-outline' },
  { key: 'Agro', label: 'Agro', icon: 'leaf-outline' },
];
// Quem é só online vem primeiro; depois quem atende presencial e também por vídeo.
const onlineOnly = (p) => isOnlineType(p.service);

export function OnlineTab({ appts, setAppts, focus }) {
  const { state } = useStore();
  const [area, setArea] = useState('todos');
  const [slot, setSlot] = useState({}); // horário escolhido por profissional
  const pros = state.providers
    .filter((p) => p.online)
    .filter((p) => area === 'todos' || (serviceType(p.service) || {}).group === area)
    .sort((a, b) => (b.id === focus) - (a.id === focus) || onlineOnly(b) - onlineOnly(a) || b.rating - a.rating);

  const book = (p) => {
    const when = slot[p.id] || (p.slots || [])[0];
    if (!when) return;
    // Como a Lotus: mostra tudo e pergunta antes de marcar.
    Alert.alert('Agendar atendimento online?', `${p.name}\n${serviceType(p.service).label} · ${when}\n${priceText(p)}\n\nO valor fica reservado na sua carteira Re@lys e só é repassado depois do atendimento.`, [
      { text: 'Agora não', style: 'cancel' },
      {
        text: 'Agendar',
        onPress: () => {
          setAppts((a) => [{ id: `${p.id}-${Date.now()}`, p, when }, ...a.filter((x) => x.p.id !== p.id)]);
          Alert.alert('Agendado!', `No horário, toque em "Entrar na chamada" aqui na aba Online. ${p.name.split(' ')[0]} recebeu o aviso.`);
        },
      },
    ]);
  };

  return (
    <View>
      {appts.length ? (
        <View style={{ marginBottom: 6 }}>
          <Text style={styles.head}>Seus atendimentos online</Text>
          {appts.map((a) => (
            <View key={a.id} style={styles.appt}>
              <Photo uri={a.p.photo} style={styles.apptPhoto} fallback="🧑" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name} numberOfLines={1}>{a.p.name}</Text>
                <Text style={styles.meta}>{serviceType(a.p.service).label} · {a.when}</Text>
              </View>
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => Alert.alert('Chamada de vídeo', `A chamada com ${a.p.name.split(' ')[0]} abre aqui no Re@lys no horário marcado (${a.when}).`)}
                accessibilityLabel={`Entrar na chamada com ${a.p.name}`}
              >
                <Ionicons name="videocam" size={15} color={colors.onPrimary} />
                <Text style={styles.joinText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 10 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {AREAS.map((a) => {
          const on = a.key === area;
          return (
            <TouchableOpacity key={a.key} onPress={() => setArea(a.key)} style={[styles.pill, on && styles.pillOn]}>
              <Ionicons name={a.icon} size={14} color={on ? colors.primaryDark : colors.muted} />
              <Text style={[styles.pillText, on && { color: colors.primaryDark }]}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!pros.length ? <Text style={styles.empty}>Ninguém atendendo online nessa área ainda.</Text> : null}
      {pros.map((p) => {
        const t = serviceType(p.service) || {};
        const chosen = slot[p.id] || (p.slots || [])[0];
        return (
          <View key={p.id} style={[styles.card, p.id === focus && { borderColor: colors.primary, borderWidth: 1.5 }]}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Photo uri={p.photo} style={styles.photo} fallback="🧑" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Row>
                  <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                  <Ionicons name="shield-checkmark" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                </Row>
                <Text style={styles.meta}>{t.label} · {reviewsCount(p)} avaliações</Text>
                <Text style={styles.price}>{priceText(p)}</Text>
              </View>
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={styles.ratingText}>{ratingText(p.rating)}</Text>
              </View>
            </Row>
            <View style={styles.badges}>
              <Badge label={onlineOnly(p) ? 'Só online' : 'Presencial e online'} color={colors.primary} />
              {/(CRP|CRN|OAB|CRC|CRMV)/.test(p.name) ? <View style={{ marginLeft: 6 }}><Badge label="Registro verificado" color={colors.success} /></View> : null}
            </View>
            <Text style={styles.funcs} numberOfLines={2}>{p.functions.join(' · ')}</Text>
            <Text style={styles.slotLabel}>Horários livres</Text>
            <Row style={{ flexWrap: 'wrap' }}>
              {(p.slots || []).map((s) => {
                const on = s === chosen;
                return (
                  <TouchableOpacity key={s} onPress={() => setSlot({ ...slot, [p.id]: s })} style={[styles.slot, on && styles.slotOn]}>
                    <Text style={[styles.slotText, on && { color: colors.onPrimary }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </Row>
            <TouchableOpacity style={styles.bookBtn} onPress={() => book(p)} accessibilityLabel={`Agendar chamada de vídeo com ${p.name}`}>
              <Ionicons name="videocam" size={16} color={colors.onPrimary} />
              <Text style={styles.bookText}>Agendar chamada de vídeo · {chosen}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Cursos ----------
const COURSE_KINDS = [
  { key: 'todos', label: 'Todos', icon: 'apps-outline' },
  { key: 'livre', label: 'Cursos livres', icon: 'ribbon-outline' },
  { key: 'facul', label: 'Faculdade e pós', icon: 'library-outline' },
];
const isFacul = (c) => /gradua|faculdade|p[óo]s-gradua/i.test(`${c.title} ${c.detail}`);

export function CoursesTab({ navigate }) {
  const { state } = useStore();
  const [kind, setKind] = useState('todos');
  const courses = [
    ...listings.filter((l) => l.kind === 'curso').map((l) => ({ id: l.id, title: l.title, who: l.who, detail: l.detail, price: l.price, place: l.place, photo: l.photo, sponsored: l.sponsored })),
    ...sectorItems
      .filter((i) => i.seg === 'cursos')
      .map((i) => ({ id: i.id, title: i.title, who: i.who, detail: i.detail, price: i.price ? brl(i.price) : 'Grátis', place: i.unit, photo: i.photo, sponsored: i.sponsored })),
  ]
    .filter((c) => kind === 'todos' || (kind === 'facul' ? isFacul(c) : !isFacul(c)))
    .sort((a, b) => !!b.sponsored - !!a.sponsored);
  const liveClasses = lives.filter((l) => l.aula);

  const enroll = (c) =>
    Alert.alert('Inscrever-se?', `${c.title}\n${c.who}\n${c.price}`, [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Inscrever-se', onPress: () => Alert.alert('Inscrição feita!', `O acesso ao curso aparece no seu Perfil. Saldo atual: ${brl(state.wallet)}.`) },
    ]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 10 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {COURSE_KINDS.map((k) => {
          const on = k.key === kind;
          return (
            <TouchableOpacity key={k.key} onPress={() => setKind(k.key)} style={[styles.pill, on && styles.pillOn]}>
              <Ionicons name={k.icon} size={14} color={on ? colors.primaryDark : colors.muted} />
              <Text style={[styles.pillText, on && { color: colors.primaryDark }]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {courses.map((c) => (
        <View key={c.id} style={styles.card}>
          <Photo uri={c.photo} style={styles.cover} fallback="🎓" />
          {c.sponsored ? <View style={styles.spTag}><Text style={styles.spTagText}>Patrocinado</Text></View> : null}
          <Text style={[styles.name, { marginTop: 10 }]}>{c.title}</Text>
          <Text style={styles.meta}>{c.who}</Text>
          <Text style={styles.funcs}>{c.detail}{c.place ? ` · ${c.place}` : ''}</Text>
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={styles.price}>{c.price}</Text>
            <TouchableOpacity style={styles.enroll} onPress={() => enroll(c)} accessibilityLabel={`Inscrever-se em ${c.title}`}>
              <Text style={styles.bookText}>Inscrever-se</Text>
            </TouchableOpacity>
          </Row>
        </View>
      ))}

      {liveClasses.length ? <LiveClasses items={liveClasses} navigate={navigate} title="Aulas abertas ao vivo" /> : null}
    </View>
  );
}

// Faixa de aulas ao vivo (nas Lives). Usada em Cursos e em Aulas.
export function LiveClasses({ items, navigate, title = 'Aulas ao vivo agora' }) {
  return (
    <View style={{ marginTop: 4, marginBottom: 10 }}>
      <Text style={styles.head}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={styles.live}
            activeOpacity={0.9}
            onPress={() => navigate && navigate({ tab: 'home', top: 'lives', live: l.cat })}
            accessibilityLabel={`Assistir: ${l.title}`}
          >
            <Photo uri={l.photo} style={styles.liveImg} fallback="📺" />
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>AO VIVO · {l.viewers}</Text>
            </View>
            <Text style={styles.liveTitle} numberOfLines={2}>{l.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{l.host}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 14, ...soft },
  introIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  introTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  introText: { color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  introMore: { color: colors.primary, fontSize: 12, fontWeight: '700', marginRight: 3 },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 1 },
  stepNumText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
  stepText: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 19 },

  head: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 6 },
  pillOn: { backgroundColor: colors.primaryLight },
  pillText: { color: colors.muted, fontSize: 13, fontWeight: '600', marginLeft: 5 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 20 },

  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 12, ...soft },
  photo: { width: 58, height: 58, borderRadius: 18 },
  name: { color: colors.text, fontWeight: '800', fontSize: 15, flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.primaryDark, fontWeight: '800', fontSize: 14, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  ratingText: { color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 3 },
  badges: { flexDirection: 'row', marginTop: 10 },
  funcs: { color: colors.text, fontSize: 13, marginTop: 8, lineHeight: 18 },
  slotLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  slot: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  slotOn: { backgroundColor: colors.primary },
  slotText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, height: 44, marginTop: 8 },
  bookText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14, marginLeft: 6 },
  enroll: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },

  appt: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 16, padding: 10, marginBottom: 8 },
  apptPhoto: { width: 40, height: 40, borderRadius: 14 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, height: 34 },
  joinText: { color: colors.onPrimary, fontWeight: '800', marginLeft: 5, fontSize: 13 },

  cover: { width: '100%', height: 130, borderRadius: 14 },
  spTag: { position: 'absolute', top: 22, left: 22, backgroundColor: 'rgba(11,17,36,0.7)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  spTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  live: { width: 200, marginRight: 10 },
  liveImg: { width: 200, height: 112, borderRadius: 14 },
  liveTag: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,59,92,0.92)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 5 },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  liveTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6 },
});
