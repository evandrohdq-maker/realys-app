// Perfil de serviço público (Bombeiros, Defesa Civil, SAMU, hospital público, UPA, UBS) e o cartão do
// SUS do cidadão. Abre pelo SOS, pela busca ou pela Lotus ("Lotus, abre o perfil dos bombeiros").
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { confirmCall } from '../phone';
import { PUBLIC_KINDS, POST_TYPES, postType, publicOrg, validCNS, maskCNS, formatCNS, whenText } from '../publicServices';

const TABS = [
  ['inicio', 'Início'],
  ['publicacoes', 'Publicações'],
  ['agendar', 'Agendar'],
  ['painel', 'Painel do órgão'],
];
const telOf = (s) => String(s || '').replace(/\(demo\)|[^\d]/g, '');
const ago = (ts) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 60) return `há ${Math.max(1, m)} min`;
  if (m < 1440) return `há ${Math.round(m / 60)} h`;
  return `há ${Math.round(m / 1440)} dias`;
};

export function PublicOrgModal() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const open = state.publicOpen;
  const org = open ? publicOrg(state, open.id) : null;
  const [tab, setTab] = useState('inicio');
  useEffect(() => {
    if (open) setTab(open.tab || 'inicio');
  }, [open && open.at]);
  if (!org) return null;
  const k = PUBLIC_KINDS[org.kind];
  const close = () => dispatch({ type: 'CLOSE_PUBLIC' });
  // O painel é do próprio órgão (conta verificada). Na demonstração: administrador ou o próprio órgão.
  const tabs = TABS.filter(([key]) => (key === 'agendar' ? org.sus && org.slots && org.slots.length : true));

  return (
    <Modal visible animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        <View style={st.top}>
          <TouchableOpacity onPress={close} accessibilityLabel="Fechar">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[st.badge, { backgroundColor: k.color + '18' }]}>
            <Ionicons name="shield-checkmark" size={13} color={k.color} />
            <Text style={[st.badgeText, { color: k.color }]}>Serviço público</Text>
          </View>
        </View>
        <View style={st.head}>
          <View style={[st.logo, { backgroundColor: k.color }]}>
            <Ionicons name={k.icon} size={30} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.name}>{org.name}</Text>
            <Text style={st.small}>{k.label}{org.sus ? ' · SUS' : ''}</Text>
          </View>
        </View>
        <View style={st.tabs}>
          {tabs.map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={st.tab}>
              <Text style={[st.tabText, tab === key && { color: colors.primary, fontWeight: '800' }]}>{label}</Text>
              {tab === key ? <View style={st.tabLine} /> : null}
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {tab === 'inicio' ? <About org={org} /> : null}
          {tab === 'publicacoes' ? <Posts org={org} /> : null}
          {tab === 'agendar' ? <Booking org={org} /> : null}
          {tab === 'painel' ? <OrgPanel org={org} /> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function CallBtn({ label, number, main, color }) {
  if (!number) return null;
  return (
    <TouchableOpacity style={[st.call, main && { backgroundColor: color || '#D9534F', borderColor: color || '#D9534F' }]} onPress={() => confirmCall(label, telOf(number))}>
      <Ionicons name="call" size={16} color={main ? '#fff' : colors.primary} />
      <View style={{ marginLeft: 8 }}>
        <Text style={[st.callLabel, main && { color: '#fff' }]}>{label}</Text>
        <Text style={[st.callNum, main && { color: '#fff' }]}>{number}</Text>
      </View>
    </TouchableOpacity>
  );
}

function About({ org }) {
  const k = PUBLIC_KINDS[org.kind];
  return (
    <View>
      <View style={st.calls}>
        <CallBtn label="Emergência" number={org.emergency} main color={k.color} />
        <CallBtn label="0800 / atendimento" number={org.tollFree} />
        <CallBtn label="Contato" number={org.contact} />
      </View>
      <View style={st.stats}>
        <Stat n={org.staff.onDuty} label="de plantão" />
        <Stat n={org.staff.available} label="disponíveis" color="#1E9E63" />
        {org.gps ? <Stat n={org.staff.teamsOut} label="equipes na rua" color={k.color} /> : null}
        {org.waitMin ? <Stat n={`${org.waitMin} min`} label="espera média" /> : null}
      </View>
      {org.gps ? (
        <Text style={[st.small, { marginBottom: 10 }]}>
          <Ionicons name="navigate" size={12} color={k.color} /> GPS das equipes ligado: o Realys mostra a equipe mais perto quando você pede socorro.
        </Text>
      ) : null}
      <Text style={st.h}>Horário</Text>
      <Text style={st.p}>{org.hours}</Text>
      <Text style={st.h}>Endereço</Text>
      <Text style={st.p}>{org.address}</Text>
      <Text style={st.h}>O que fazemos</Text>
      {org.functions.map((f) => (
        <Text key={f} style={st.p}>• {f}</Text>
      ))}
    </View>
  );
}
const Stat = ({ n, label, color }) => (
  <View style={st.stat}>
    <Text style={[st.statN, color && { color }]}>{n}</Text>
    <Text style={st.small}>{label}</Text>
  </View>
);

function Posts({ org }) {
  if (!org.posts.length) return <Text style={st.p}>Nenhuma publicação ainda.</Text>;
  return org.posts.map((p) => {
    const t = postType(p.type);
    return (
      <View key={p.id} style={st.post}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name={t.icon} size={16} color={colors.primary} />
          <Text style={st.postType}>{t.label}</Text>
          <Text style={[st.small, { marginLeft: 'auto' }]}>{ago(p.at)}</Text>
        </View>
        <Text style={st.postTitle}>{p.title}</Text>
        {p.text ? <Text style={st.p}>{p.text}</Text> : null}
      </View>
    );
  });
}

// Agendar pelo SUS: horários publicados pela unidade; o Realys confere o Cartão do SUS do perfil.
function Booking({ org }) {
  const { state, dispatch } = useStore();
  const mine = (state.susBookings || []).filter((b) => b.orgId === org.id && b.status === 'agendado');
  const taken = new Set((state.susBookings || []).filter((b) => b.status === 'agendado').map((b) => b.slotId));
  const book = (slot) => {
    if (!state.sus || !validCNS(state.sus.cns)) return Alert.alert('Falta o Cartão do SUS', 'Cadastre o número do seu Cartão Nacional de Saúde aqui embaixo para agendar.');
    Alert.alert('Confirmar agendamento?', `${slot.specialty}\n${whenText(slot.at)} · ${slot.who}\n${org.name}\nCartão SUS ${maskCNS(state.sus.cns)}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Agendar', onPress: () => (dispatch({ type: 'SUS_BOOK', orgId: org.id, orgName: org.name, slot }), Alert.alert('Agendado ✅', `Leve um documento com foto e o Cartão do SUS. ${whenText(slot.at)}.`)) },
    ]);
  };
  return (
    <View>
      <SusCard compact />
      {mine.length ? <Text style={st.h}>Meus agendamentos aqui</Text> : null}
      {mine.map((b) => (
        <View key={b.id} style={[st.slot, { borderColor: '#1E9E63' }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.postTitle}>{b.specialty}</Text>
            <Text style={st.small}>{whenText(b.at)} · {b.who}</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Cancelar este agendamento?', 'O horário volta a ficar livre para outra pessoa.', [{ text: 'Manter', style: 'cancel' }, { text: 'Cancelar agendamento', style: 'destructive', onPress: () => dispatch({ type: 'SUS_CANCEL', id: b.id }) }])}>
            <Text style={{ color: '#D9534F', fontWeight: '700' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={st.h}>Horários disponíveis</Text>
      {org.slots.filter((s) => !taken.has(s.id) && s.at > Date.now()).map((s) => (
        <TouchableOpacity key={s.id} style={st.slot} onPress={() => book(s)}>
          <View style={{ flex: 1 }}>
            <Text style={st.postTitle}>{s.specialty}</Text>
            <Text style={st.small}>{whenText(s.at)} · {s.who}</Text>
          </View>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>Agendar</Text>
        </TouchableOpacity>
      ))}
      <Text style={[st.small, { marginTop: 10 }]}>Urgência não precisa agendar: procure a UPA ou ligue 192. Especialistas precisam de encaminhamento do posto de saúde.</Text>
    </View>
  );
}

// Painel do órgão: equipe, GPS, publicações e horários de atendimento.
function OrgPanel({ org }) {
  const { dispatch } = useStore();
  const [onDuty, setOnDuty] = useState(String(org.staff.onDuty));
  const [available, setAvailable] = useState(String(org.staff.available));
  const [type, setType] = useState('aviso');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [slotSpec, setSlotSpec] = useState('');
  const [slotWho, setSlotWho] = useState('');
  const [slotDay, setSlotDay] = useState('1');
  const [slotHour, setSlotHour] = useState('9');
  const saveStaff = () => {
    dispatch({ type: 'PUBLIC_EDIT', orgId: org.id, data: { staff: { onDuty: Math.max(0, parseInt(onDuty, 10) || 0), available: Math.max(0, parseInt(available, 10) || 0) } } });
    Alert.alert('Equipe atualizada ✅', 'Os cidadãos já veem os números novos.');
  };
  const publish = () => {
    if (!title.trim()) return Alert.alert('Falta o título', 'Escreva um título curto para a publicação.');
    dispatch({ type: 'PUBLIC_POST', orgId: org.id, post: { type, title: title.trim(), text: text.trim() } });
    setTitle('');
    setText('');
    Alert.alert('Publicado ✅', 'A publicação já aparece no perfil do órgão.');
  };
  const addSlot = () => {
    if (!slotSpec.trim()) return Alert.alert('Falta o atendimento', 'Ex.: Clínico geral, Pediatria, Vacinação.');
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, parseInt(slotDay, 10) || 0));
    d.setHours(Math.min(23, Math.max(0, parseInt(slotHour, 10) || 9)), 0, 0, 0);
    dispatch({ type: 'PUBLIC_SLOT_ADD', orgId: org.id, slot: { specialty: slotSpec.trim(), who: slotWho.trim() || 'Equipe da unidade', at: d.getTime() } });
    setSlotSpec('');
    Alert.alert('Horário publicado ✅', `${whenText(d.getTime())}. O cidadão já pode agendar.`);
  };
  return (
    <View>
      <View style={st.note}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
        <Text style={[st.small, { flex: 1, marginLeft: 6 }]}>Só a equipe do órgão (conta pública verificada) usa este painel. Aqui está aberto para demonstração.</Text>
      </View>
      <Text style={st.h}>Equipe agora</Text>
      <View style={{ flexDirection: 'row' }}>
        <Field label="De plantão" value={onDuty} onChangeText={setOnDuty} num />
        <Field label="Disponíveis" value={available} onChangeText={setAvailable} num />
      </View>
      <View style={st.rowBetween}>
        <Text style={st.p}>GPS das equipes ligado</Text>
        <Switch value={!!org.gps} onValueChange={(v) => dispatch({ type: 'PUBLIC_EDIT', orgId: org.id, data: { gps: v } })} trackColor={{ true: colors.primary }} />
      </View>
      <TouchableOpacity style={st.btn} onPress={saveStaff}>
        <Text style={st.btnText}>Atualizar equipe</Text>
      </TouchableOpacity>

      <Text style={st.h}>Nova publicação</Text>
      <View style={st.chips}>
        {POST_TYPES.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setType(t.key)} style={[st.chip, type === t.key && st.chipOn]}>
            <Text style={[st.chipText, type === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Título" value={title} onChangeText={setTitle} />
      <Field label="Texto (reunião, equipe, evento, salvamento, progresso…)" value={text} onChangeText={setText} multiline />
      <TouchableOpacity style={st.btn} onPress={publish}>
        <Text style={st.btnText}>Publicar</Text>
      </TouchableOpacity>

      {org.sus ? (
        <>
          <Text style={st.h}>Publicar horário de atendimento (SUS)</Text>
          <Field label="Atendimento" value={slotSpec} onChangeText={setSlotSpec} placeholder="Clínico geral" />
          <Field label="Profissional" value={slotWho} onChangeText={setSlotWho} placeholder="Dra. Camila Reis" />
          <View style={{ flexDirection: 'row' }}>
            <Field label="Daqui a quantos dias" value={slotDay} onChangeText={setSlotDay} num />
            <Field label="Hora" value={slotHour} onChangeText={setSlotHour} num />
          </View>
          <TouchableOpacity style={st.btn} onPress={addSlot}>
            <Text style={st.btnText}>Publicar horário</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

function Field({ label, num, multiline, ...p }) {
  return (
    <View style={{ flex: 1, marginRight: 6, marginBottom: 10 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput {...p} keyboardType={num ? 'number-pad' : 'default'} multiline={multiline} placeholderTextColor={colors.muted} style={[st.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]} />
    </View>
  );
}

// Cartão do SUS do cidadão: fica no perfil dele (não é uma aba). É conferido quando ele agenda.
export function SusCard({ compact }) {
  const { state, dispatch } = useStore();
  const sus = state.sus;
  const [editing, setEditing] = useState(false);
  const [cns, setCns] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const start = () => {
    setCns(sus ? formatCNS(sus.cns) : '');
    setName(sus ? sus.name : (state.user && state.user.name) || '');
    setUnit(sus ? sus.unit || '' : '');
    setEditing(true);
  };
  const save = () => {
    const n = cns.replace(/\D/g, '');
    if (!validCNS(n)) return Alert.alert('Número do SUS inválido', 'Confira os 15 números do seu Cartão Nacional de Saúde. Você encontra no cartão físico ou no app Meu SUS Digital.');
    dispatch({ type: 'SUS_SAVE', sus: { cns: n, name: name.trim(), unit: unit.trim(), savedAt: Date.now() } });
    setEditing(false);
    Alert.alert('Cartão do SUS salvo ✅', 'Ele fica só neste celular, protegido. Agora você agenda atendimentos nas unidades do SUS pelo Realys.');
  };
  const bookings = (state.susBookings || []).filter((b) => b.status === 'agendado' && b.at > Date.now());
  return (
    <View style={[st.sus, compact && { marginBottom: 6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={st.susLogo}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>SUS</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.postTitle}>Cartão do SUS</Text>
          <Text style={st.small}>{sus ? `${maskCNS(sus.cns)}${sus.unit ? ` · ${sus.unit}` : ''}` : 'Cadastre para agendar atendimento nas unidades do SUS.'}</Text>
        </View>
        {!editing ? (
          <TouchableOpacity onPress={start}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{sus ? 'Editar' : 'Cadastrar'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {editing ? (
        <View style={{ marginTop: 10 }}>
          <Field label="Número do Cartão Nacional de Saúde (15 números)" value={cns} onChangeText={(v) => setCns(formatCNS(v))} num placeholder="000 0000 0000 0000" />
          <Field label="Nome como está no cartão" value={name} onChangeText={setName} />
          <Field label="Unidade de saúde de referência (opcional)" value={unit} onChangeText={setUnit} placeholder="UBS do seu bairro" />
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={[st.btn, { flex: 1, marginRight: 6 }]} onPress={save}>
              <Text style={st.btnText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { flex: 1, backgroundColor: '#F3F1EC' }]} onPress={() => setEditing(false)}>
              <Text style={[st.btnText, { color: colors.muted }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {!compact && bookings.length ? (
        <View style={{ marginTop: 10 }}>
          {bookings.map((b) => (
            <TouchableOpacity key={b.id} onPress={() => dispatch({ type: 'OPEN_PUBLIC', id: b.orgId, tab: 'agendar' })}>
              <Text style={st.small}>📅 {b.specialty} · {whenText(b.at)} · {b.orgName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {!compact && sus ? (
        <TouchableOpacity onPress={() => dispatch({ type: 'OPEN_PUBLIC', id: 'pub-ubs', tab: 'agendar' })} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Agendar consulta no posto de saúde →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11.5, fontWeight: '800', marginLeft: 4 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6 },
  logo: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 8 },
  tab: { paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center' },
  tabText: { color: colors.muted, fontSize: 13.5, fontWeight: '600' },
  tabLine: { position: 'absolute', bottom: -1, left: 10, right: 10, height: 2, borderRadius: 1, backgroundColor: colors.primary },
  h: { fontSize: 14.5, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 6 },
  p: { fontSize: 13.5, color: colors.text, lineHeight: 20, marginBottom: 4 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  calls: { flexDirection: 'row', flexWrap: 'wrap' },
  call: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  callLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  callNum: { fontSize: 14, color: colors.text, fontWeight: '800' },
  stats: { flexDirection: 'row', marginVertical: 8 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginRight: 6, alignItems: 'center' },
  statN: { fontSize: 20, fontWeight: '900', color: colors.text },
  post: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  postType: { color: colors.primary, fontWeight: '800', fontSize: 12, marginLeft: 6 },
  postTitle: { color: colors.text, fontWeight: '800', fontSize: 14.5 },
  slot: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  note: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F1EC', borderRadius: 12, padding: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12, color: colors.text, fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, fontSize: 14 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 11, paddingVertical: 6, marginRight: 6, marginBottom: 6, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  sus: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#BFD9F2', padding: 12, marginBottom: 10 },
  susLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1660A8', alignItems: 'center', justifyContent: 'center' },
});
