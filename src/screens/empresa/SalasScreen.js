// Salas de Negócios: atendimento ao vivo das empresas (separado da Arena Gamer).
// Três telas:
//   1. Lista de empresas com Recepção aberta (fila e quem está atendendo agora).
//   2. Recepção de uma empresa: o cliente entra na fila; a empresa vê a fila e chama; salas da equipe e canais.
//   3. Sala de atendimento: voz, câmera, mostrar a tela, catálogo, proposta e contrato, com o CRM andando junto.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardLift } from '../../keyboard';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Share } from 'react-native';
import { Text, TextInput } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { useBack } from '../../back';
import { moderateText, antiDesvio } from '../../moderation';
import {
  useSalas, salaOf, roomOf, salaKey, SALA_TIPOS, ACOES, enterQueue, leaveQueue, queuePos, callFromQueue,
  joinRoom, leaveRoom, roomPost, roomAccept, roomScreen, channelPost, createSala, createMeeting, meetingLink,
} from '../../salas';
import { useScreenShare, startScreenShare, stopScreenShare } from '../../screenShare';
import { ScreenViewer } from '../../components/ScreenShareKit';
import { crmBoard } from '../../crm';

const C = { bg: '#FFFFFF', soft: '#FAF7EF', line: '#EFE8D6', text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', green: '#2FB463', red: '#E5484D', amber: '#E0A92B' };
const brl = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ago = (t) => {
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  return min < 1 ? 'agora' : `há ${min} min`;
};
const mmss = (t) => {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const initials = (n) => String(n).split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

function Avatar({ name, size = 34, ring }) {
  return (
    <View style={[st.avatar, { width: size, height: size, borderRadius: size / 2 }, ring && { borderColor: C.green, borderWidth: 2 }]}>
      <Text style={{ color: C.gold, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export default function SalasScreen({ explore }) {
  const { state } = useStore();
  const me = (state.user && state.user.name) || 'Você';
  const isCompany = state.activeRole === 'empresa';
  const { salas, here, myQueue } = useSalas();
  const [sid, setSid] = useState(null);
  const [rid, setRid] = useState(null);
  const [creating, setCreating] = useState(null);
  useEffect(() => {
    if (explore && explore.sala && salaOf(explore.sala)) setSid(explore.sala);
  }, [explore]);
  useBack(!!rid, () => setRid(null));
  useBack(!rid && !!sid, () => setSid(null));

  // Demonstração: quem está na fila é chamado depois de alguns segundos.
  useEffect(() => {
    if (!myQueue || isCompany) return;
    const s = salaOf(myQueue.sid);
    const att = s && (s.team.find((t) => t.online) || s.team[0]);
    if (!att || !s.open) return;
    const t = setTimeout(() => {
      const r = callFromQueue(myQueue.sid, myQueue.id, att.name);
      if (!r) return;
      Alert.alert('Sua vez chegou 🔔', `${att.name} (${s.name}) chamou você para a sala.`, [{ text: 'Entrar agora', onPress: () => { setSid(myQueue.sid); setRid(r); } }]);
    }, 7000);
    return () => clearTimeout(t);
  }, [myQueue && myQueue.id]);

  if (sid && rid) return <Room sid={sid} rid={rid} me={me} isCompany={isCompany} onLeave={() => { leaveRoom(me); setRid(null); }} onBack={() => setRid(null)} />;
  if (sid) return <Reception sid={sid} me={me} isCompany={isCompany} myQueue={myQueue} onBack={() => setSid(null)} onRoom={(r) => setRid(r)} />;

  const open = salas.filter((s) => s.open);
  const closed = salas.filter((s) => !s.open);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={st.h1}>Salas de Negócios</Text>
      <Text style={st.sub}>Atendimento ao vivo com quem é real: voz, vídeo e tela compartilhada, sem sair do Re@lys.</Text>
      {here ? (
        <TouchableOpacity style={st.backToRoom} onPress={() => { setSid(here.sid); setRid(here.rid); }} accessibilityLabel="Voltar para a sala em que você está">
          <Ionicons name="radio-button-on" size={14} color={C.green} />
          <Text style={{ marginLeft: 8, fontWeight: '800', color: C.green, flex: 1 }} numberOfLines={1}>Você está numa sala · voltar</Text>
          <Ionicons name="chevron-forward" size={16} color={C.green} />
        </TouchableOpacity>
      ) : null}
      {myQueue ? (
        <View style={st.queueBox}>
          <Ionicons name="time-outline" size={18} color={C.gold} />
          <Text style={{ marginLeft: 8, flex: 1, color: C.text }} numberOfLines={2}>
            Você é o <Text style={{ fontWeight: '800' }}>{queuePos(myQueue.sid, myQueue.id) || 1}º</Text> na fila de {(salaOf(myQueue.sid) || {}).name}
          </Text>
          <TouchableOpacity onPress={leaveQueue} accessibilityLabel="Sair da fila"><Text style={{ color: C.red, fontWeight: '700' }}>Sair</Text></TouchableOpacity>
        </View>
      ) : null}
      {isCompany ? (
        <TouchableOpacity style={st.create} onPress={() => setCreating({ name: (state.user && state.user.name) || '', tipo: 'loja', emoji: '💼' })} accessibilityLabel="Abrir a recepção da minha empresa">
          <Ionicons name="add-circle-outline" size={20} color={C.gold} />
          <Text style={{ marginLeft: 8, fontWeight: '800', color: C.text }} numberOfLines={1}>Abrir a recepção da minha empresa</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={st.section}>ATENDENDO AGORA</Text>
      {open.map((s) => <SalaCard key={s.id} s={s} onPress={() => setSid(s.id)} />)}
      {closed.length ? <Text style={st.section}>FECHADAS AGORA</Text> : null}
      {closed.map((s) => <SalaCard key={s.id} s={s} onPress={() => setSid(s.id)} />)}

      <Modal visible={!!creating} transparent animationType="fade" onRequestClose={() => setCreating(null)}><KeyboardLift style={{ flex: 1 }}>
        <View style={st.backdrop}>
          <View style={st.dialog}>
            <Text style={st.dTitle}>Recepção da empresa</Text>
            <TextInput value={creating ? creating.name : ''} onChangeText={(t) => setCreating({ ...creating, name: t })} placeholder="Nome da empresa" placeholderTextColor={C.muted} style={st.field} maxLength={40} />
            <Text style={[st.section, { marginTop: 12 }]}>TIPO DE ATENDIMENTO</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Object.entries(SALA_TIPOS).map(([k, t]) => (
                <TouchableOpacity key={k} onPress={() => setCreating({ ...creating, tipo: k })} style={[st.chip, creating && creating.tipo === k && st.chipOn]}>
                  <Ionicons name={t.icon} size={14} color={creating && creating.tipo === k ? C.gold : C.muted} />
                  <Text numberOfLines={1} style={[st.chipText, creating && creating.tipo === k && { color: C.gold }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.dActions}>
              <TouchableOpacity onPress={() => setCreating(null)} style={{ padding: 10 }}><Text style={{ color: C.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity
                style={st.okBtn}
                onPress={() => {
                  const name = (creating.name || '').trim();
                  if (!name) return;
                  const id = createSala({ name, tipo: creating.tipo, emoji: '💼', owner: me });
                  setCreating(null);
                  setSid(id);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Abrir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardLift></Modal>
    </ScrollView>
  );
}

function SalaCard({ s, onPress }) {
  const t = SALA_TIPOS[s.tipo] || SALA_TIPOS.loja;
  const online = s.team.filter((x) => x.online).length;
  const live = s.rooms.filter((r) => r.kind === 'atendimento' && r.people.length).length;
  return (
    <TouchableOpacity style={st.card} onPress={onPress} activeOpacity={0.85} accessibilityLabel={`${s.name}, ${t.label}`}>
      <View style={st.cardIcon}><Text style={{ fontSize: 24 }}>{s.emoji}</Text></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={st.cardName} numberOfLines={1}>{s.name} <Ionicons name="shield-checkmark" size={12} color={C.gold} /></Text>
        <Text style={st.cardSub} numberOfLines={1}>{t.label} · {s.city}</Text>
        <Text style={[st.cardSub, { marginTop: 3 }]} numberOfLines={1}>
          {s.open ? (
            <>
              <Text style={{ color: C.green }}>● </Text>{online} atendendo · {s.fila.length ? `${s.fila.length} na fila` : 'sem fila'}{live ? ` · ${live} ao vivo` : ''}
            </>
          ) : (
            <Text style={{ color: C.muted }}>{s.hours || 'Fechada agora'}</Text>
          )}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </TouchableOpacity>
  );
}

// ---------- Recepção ----------
function Reception({ sid, me, isCompany, myQueue, onBack, onRoom }) {
  useSalas();
  const s = salaOf(sid);
  const t = SALA_TIPOS[s.tipo] || SALA_TIPOS.loja;
  // Empresa vê como dona (na demonstração, a empresa logada cuida da recepção que abrir).
  const owner = isCompany || s.mine;
  const [asking, setAsking] = useState(null); // { motivo, note }
  const [canal, setCanal] = useState(null);
  const [draft, setDraft] = useState('');
  const inQueue = myQueue && myQueue.sid === sid;
  const att = s.team.find((x) => x.online) || s.team[0];
  const ch = canal ? s.canais.find((c) => c.id === canal) : null;
  useBack(!!canal, () => setCanal(null));

  if (ch) {
    const send = () => {
      const txt = draft.trim();
      if (!txt) return;
      const mod = moderateText ? moderateText(txt) : { ok: true };
      if (mod && mod.ok === false) return Alert.alert('Mensagem não enviada', mod.why || 'A mensagem não segue as regras do Re@lys.');
      channelPost(sid, ch.id, me, txt);
      setDraft('');
    };
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Head title={`# ${ch.name}`} sub={`${s.emoji} ${s.name} · só a equipe`} onBack={() => setCanal(null)} />
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          {ch.msgs.length ? ch.msgs.map((m, i) => (
            <View key={i} style={st.msg}>
              <Avatar name={m.who} size={32} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text><Text style={{ fontWeight: '800', color: C.text }}>{m.who}</Text><Text style={{ color: C.muted, fontSize: 11 }}>  {ago(m.at)}</Text></Text>
                <Text style={{ color: C.text, marginTop: 2 }}>{m.text}</Text>
              </View>
            </View>
          )) : <Text style={st.empty}>Nenhuma mensagem ainda. Comece o canal.</Text>}
        </ScrollView>
        <View style={st.inputRow}>
          <TextInput value={draft} onChangeText={setDraft} placeholder={`Mensagem em #${ch.name}`} placeholderTextColor={C.muted} style={st.input} onSubmitEditing={send} returnKeyType="send" />
          <TouchableOpacity onPress={send} style={st.sendBtn} accessibilityLabel="Enviar"><Ionicons name="send" size={16} color="#fff" /></TouchableOpacity>
        </View>
      </View>
    );
  }

  const rooms = s.rooms.filter((r) => owner || (r.kind === 'atendimento' && r.people.includes(me)));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Head title={`${s.emoji} ${s.name}`} sub={`${t.label} · ${s.open ? 'Recepção aberta' : s.hours || 'Fechada agora'}`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={st.teamRow}>
          {s.team.map((x) => (
            <View key={x.name} style={{ alignItems: 'center', marginRight: 14, width: 64 }}>
              <Avatar name={x.name} size={40} ring={x.online} />
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: C.text, marginTop: 4, fontWeight: '700' }}>{x.name.split(' ')[0]}</Text>
              <Text numberOfLines={1} style={{ fontSize: 10.5, color: C.muted }}>{x.role}</Text>
            </View>
          ))}
        </View>

        {!owner ? (
          inQueue ? (
            <View style={st.waitCard}>
              <Text style={st.waitBig}>{queuePos(sid, myQueue.id) || 1}º</Text>
              <Text style={{ color: C.text, fontWeight: '700' }}>na fila · {att ? `${att.name.split(' ')[0]} já vai te chamar` : 'aguarde'}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>Pode navegar no app: avisamos quando chegar sua vez.</Text>
              <TouchableOpacity onPress={leaveQueue} style={{ marginTop: 10 }}><Text style={{ color: C.red, fontWeight: '700' }}>Sair da fila</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity disabled={!s.open} style={[st.bigBtn, !s.open && { opacity: 0.5 }]} onPress={() => setAsking({ motivo: t.motivos[0], note: '' })} accessibilityLabel="Entrar na fila de atendimento">
              <Ionicons name="hand-right-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 }} numberOfLines={1}>{s.open ? 'Quero ser atendido' : 'Fechada agora'}</Text>
            </TouchableOpacity>
          )
        ) : null}

        {owner ? (
          <>
            <Text style={st.section}>FILA DA RECEPÇÃO · {s.fila.length}</Text>
            {s.fila.length ? s.fila.map((f) => (
              <View key={f.id} style={st.qItem}>
                <Avatar name={f.client} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: '800', color: C.text }} numberOfLines={1}>{f.client} <Ionicons name="shield-checkmark" size={11} color={C.gold} /></Text>
                  <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{f.motivo}{f.note ? ` · ${f.note}` : ''} · {ago(f.at)}</Text>
                </View>
                <TouchableOpacity style={st.callBtn} onPress={() => { const r = callFromQueue(sid, f.id, me); if (r) onRoom(r); }} accessibilityLabel={`Atender ${f.client}`}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }} numberOfLines={1}>Atender</Text>
                </TouchableOpacity>
              </View>
            )) : <Text style={st.empty}>Ninguém esperando. A fila aparece aqui na hora.</Text>}
          </>
        ) : null}

        {owner ? (
          <TouchableOpacity
            style={st.meetBtn}
            onPress={() => {
              const r = createMeeting(sid, `Reunião ${new Date().getHours()}h`, me);
              Share.share({ message: `Reunião no Re@lys com ${s.name}. Entre pelo link (precisa ter conta verificada): ${meetingLink(sid, r)}` }).catch(() => {});
              onRoom(r);
            }}
            accessibilityLabel="Começar uma reunião e convidar pessoas"
          >
            <Ionicons name="people-circle-outline" size={20} color={C.gold} />
            <Text numberOfLines={1} style={{ marginLeft: 8, fontWeight: '800', color: C.text, flex: 1 }}>Nova reunião</Text>
            <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>equipe, fornecedor, parceiro</Text>
          </TouchableOpacity>
        ) : null}
        {rooms.length ? <Text style={st.section}>{owner ? 'SALAS' : 'SUA SALA'}</Text> : null}
        {rooms.map((r) => {
          const inIt = r.people.includes(me);
          return (
            <TouchableOpacity key={r.id} style={[st.roomRow, inIt && { borderColor: C.green }]} onPress={() => { if (!inIt) joinRoom(sid, r.id, me); onRoom(r.id); }} accessibilityLabel={`Entrar em ${r.name}`}>
              <Ionicons name={r.kind === 'atendimento' ? 'headset-outline' : 'people-outline'} size={18} color={r.people.length ? C.green : C.muted} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: '800', color: C.text }} numberOfLines={1}>{r.privada ? '🔒 ' : ''}{r.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                  {r.people.length ? `${r.people.map((n) => n.split(' ')[0]).join(', ')} · ${mmss(r.since)}` : r.kind === 'equipe' ? 'Só a equipe · livre' : 'Livre'}
                  {r.screen ? ' · 📺 tela' : ''}
                </Text>
              </View>
              <Text style={{ color: inIt ? C.green : C.gold, fontWeight: '800', fontSize: 12 }}>{inIt ? 'Voltar' : 'Entrar'}</Text>
            </TouchableOpacity>
          );
        })}

        {owner && s.canais.length ? <Text style={st.section}>CANAIS DA EQUIPE</Text> : null}
        {owner ? s.canais.map((c) => (
          <TouchableOpacity key={c.id} style={st.chan} onPress={() => setCanal(c.id)}>
            <Text style={{ color: C.muted, fontWeight: '800', fontSize: 17, width: 18 }}>#</Text>
            <Text style={{ flex: 1, color: C.text, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
            {c.msgs.length ? <Text style={{ color: C.muted, fontSize: 12 }}>{c.msgs.length}</Text> : null}
          </TouchableOpacity>
        )) : null}
        <Text style={st.foot}>Todos aqui são verificados por biometria. Pagamento e contrato só pelo Re@lys, com a Garantia Re@lys.</Text>
      </ScrollView>

      <Modal visible={!!asking} transparent animationType="slide" onRequestClose={() => setAsking(null)}><KeyboardLift style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={() => setAsking(null)} />
        <View style={st.sheet}>
          <Text style={st.dTitle}>Do que você precisa?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {t.motivos.map((mo) => (
              <TouchableOpacity key={mo} onPress={() => setAsking({ ...asking, motivo: mo })} style={[st.chip, asking && asking.motivo === mo && st.chipOn]}>
                <Text numberOfLines={1} style={[st.chipText, asking && asking.motivo === mo && { color: C.gold }]}>{mo}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={asking ? asking.note : ''} onChangeText={(x) => setAsking({ ...asking, note: x })} placeholder="Conte rapidinho (opcional)" placeholderTextColor={C.muted} style={[st.field, { marginTop: 10 }]} maxLength={120} />
          <TouchableOpacity style={[st.bigBtn, { marginTop: 14 }]} onPress={() => { enterQueue(sid, me, asking.motivo, asking.note.trim()); setAsking(null); }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>Entrar na fila</Text>
          </TouchableOpacity>
        </View>
      </KeyboardLift></Modal>
    </View>
  );
}

// ---------- Sala de atendimento ----------
function Room({ sid, rid, me, isCompany, onLeave, onBack }) {
  useSalas();
  const s = salaOf(sid);
  const r = roomOf(sid, rid);
  const t = SALA_TIPOS[s.tipo] || SALA_TIPOS.loja;
  const share = useScreenShare();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [watching, setWatching] = useState(null);
  const [prop, setProp] = useState(null); // { desc, value }
  const [draft, setDraft] = useState('');
  const [, tick] = useState(0);
  const scroll = useRef(null);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
  if (!r) return null;
  const owner = isCompany || s.mine || s.team.some((x) => x.name === me);
  const key = salaKey(sid, rid);
  const sharing = !!(share && share.sala === key);
  const someoneElse = r.screen && r.screen !== me ? r.screen : null;

  const toggleScreen = async () => {
    if (sharing) {
      roomScreen(sid, rid, null);
      return stopScreenShare();
    }
    try {
      await startScreenShare({ sala: key, label: r.name, para: [] });
      roomScreen(sid, rid, me);
    } catch (e) {
      Alert.alert('Tela não compartilhada', e.message);
    }
  };
  const leave = () => {
    if (sharing) stopScreenShare();
    onLeave();
  };
  const action = (a) => {
    if (a === 'tela') return toggleScreen();
    if (a === 'visita') {
      setCam(true);
      return roomPost(sid, rid, { kind: 'info', who: me, text: '📹 Tour ao vivo começou: câmera traseira ligada.' });
    }
    if (a === 'catalogo') return roomPost(sid, rid, { kind: 'catalogo', who: me, text: `Catálogo de ${s.name}` });
    if (a === 'proposta') return setProp({ desc: '', value: '' });
    if (a === 'contrato') {
      roomPost(sid, rid, { kind: 'contrato', who: me, text: 'Contrato enviado para assinar no app (cópia em PDF para as duas partes).' });
      return Alert.alert('Contrato enviado ✍️', 'O cliente assina aqui mesmo, no Re@lys. As duas partes recebem o PDF.');
    }
  };
  const send = () => {
    const txt = draft.trim();
    if (!txt) return;
    const mod = moderateText ? moderateText(txt) : { ok: true };
    if (mod && mod.ok === false) return Alert.alert('Mensagem não enviada', mod.why || 'A mensagem não segue as regras do Re@lys.');
    const ad = antiDesvio(txt);
    if (!ad.ok) return Alert.alert('Fica tudo no Re@lys 🔒', `${ad.why}\n\nNa sala, use os botões Proposta e Contrato.`);
    roomPost(sid, rid, { kind: 'msg', who: me, text: txt });
    setDraft('');
  };
  const board = crmBoard(t.board);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Head title={r.name} sub={`${s.emoji} ${s.name}${r.since ? ` · ${mmss(r.since)}` : ''}`} onBack={onBack} />
      {/* Quem está na sala */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        {r.people.map((n) => (
          <View key={n} style={st.person}>
            <Avatar name={n} size={52} ring={n !== me || mic} />
            <Text numberOfLines={1} style={{ marginTop: 5, fontSize: 12, fontWeight: '700', color: C.text }}>{n === me ? 'Você' : n.split(' ')[0]}</Text>
            {(n === me && sharing) || r.screen === n ? <View style={st.screenTag}><Text style={st.screenTagText}>{n === me ? 'AO VIVO' : 'TELA'}</Text></View> : null}
          </View>
        ))}
      </ScrollView>

      {someoneElse ? (
        <TouchableOpacity style={st.watchBanner} onPress={() => setWatching({ by: someoneElse, demo: true })} accessibilityLabel={`Ver a tela de ${someoneElse}`}>
          <Ionicons name="tv" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 8, flex: 1 }} numberOfLines={1}>{someoneElse.split(' ')[0]} está mostrando a tela</Text>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Ver</Text>
        </TouchableOpacity>
      ) : null}

      {/* Ações do negócio (a empresa usa; o cliente vê os cartões que chegam) */}
      {owner ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          {t.acoes.map((a) => (
            <TouchableOpacity key={a} style={[st.action, a === 'tela' && sharing && st.actionOn]} onPress={() => action(a)} accessibilityLabel={ACOES[a].label}>
              <Ionicons name={ACOES[a].icon} size={16} color={a === 'tela' && sharing ? C.green : C.gold} />
              <Text numberOfLines={1} style={st.actionText}>{a === 'tela' && sharing ? 'Na tela' : ACOES[a].label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {owner && r.leadId ? <Text style={st.crmLine}>CRM · {board.title}: o atendimento anda sozinho ao mandar proposta e contrato.</Text> : null}

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: true })}>
        {(r.chat || []).length ? null : <Text style={st.empty}>{owner ? 'Fale com o cliente, mostre a tela ou mande uma proposta.' : 'Você está na sala. Pode falar à vontade.'}</Text>}
        {(r.chat || []).map((c, i) => {
          if (c.kind === 'proposta')
            return (
              <View key={i} style={st.propCard}>
                <Text style={{ color: C.gold, fontWeight: '800', fontSize: 12 }}>PROPOSTA · {c.who.split(' ')[0]}</Text>
                <Text style={{ color: C.text, fontWeight: '700', marginTop: 4 }}>{c.text}</Text>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginTop: 4 }}>{brl(c.value)}</Text>
                {c.accepted ? (
                  <Text style={{ color: C.green, fontWeight: '800', marginTop: 6 }}>✅ Aceita · pagamento pelo Re@lys com Garantia</Text>
                ) : !owner ? (
                  <TouchableOpacity style={[st.callBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => roomAccept(sid, rid, i)}>
                    <Text style={{ color: '#fff', fontWeight: '800' }} numberOfLines={1}>Aceitar proposta</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Aguardando o cliente aceitar.</Text>
                )}
              </View>
            );
          if (c.kind === 'catalogo' || c.kind === 'contrato' || c.kind === 'info')
            return (
              <View key={i} style={st.infoCard}>
                <Ionicons name={c.kind === 'catalogo' ? 'images-outline' : c.kind === 'contrato' ? 'create-outline' : 'videocam-outline'} size={18} color={C.gold} />
                <Text style={{ marginLeft: 8, color: C.text, flex: 1 }}>{c.text}</Text>
              </View>
            );
          return (
            <View key={i} style={st.msg}>
              <Avatar name={c.who} size={28} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={{ fontWeight: '800', color: C.text, fontSize: 13 }}>{c.who === me ? 'Você' : c.who}</Text>
                <Text style={{ color: C.text }}>{c.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={st.inputRow}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Mensagem na sala" placeholderTextColor={C.muted} style={st.input} onSubmitEditing={send} returnKeyType="send" />
        <TouchableOpacity onPress={send} style={st.sendBtn} accessibilityLabel="Enviar"><Ionicons name="send" size={16} color="#fff" /></TouchableOpacity>
      </View>
      <View style={st.controls}>
        <Ctl icon={mic ? 'mic' : 'mic-off'} label={mic ? 'Mic' : 'Mudo'} on={!mic} danger onPress={() => setMic(!mic)} />
        <Ctl icon={cam ? 'videocam' : 'videocam-off-outline'} label="Câmera" on={cam} onPress={() => setCam(!cam)} />
        <Ctl icon={sharing ? 'tv' : 'tv-outline'} label={sharing ? 'Na tela' : 'Tela'} on={sharing} onPress={toggleScreen} />
        <Ctl icon="call" label="Sair" leave onPress={leave} />
      </View>

      <ScreenViewer tela={watching} onClose={() => setWatching(null)} />
      <Modal visible={!!prop} transparent animationType="slide" onRequestClose={() => setProp(null)}><KeyboardLift style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={() => setProp(null)} />
        <View style={st.sheet}>
          <Text style={st.dTitle}>Enviar proposta</Text>
          <TextInput value={prop ? prop.desc : ''} onChangeText={(x) => setProp({ ...prop, desc: x })} placeholder="O que está incluído" placeholderTextColor={C.muted} style={st.field} maxLength={140} />
          <TextInput value={prop ? prop.value : ''} onChangeText={(x) => setProp({ ...prop, value: x.replace(/[^0-9,.]/g, '') })} placeholder="Valor (R$)" keyboardType="decimal-pad" placeholderTextColor={C.muted} style={[st.field, { marginTop: 10 }]} />
          <TouchableOpacity
            style={[st.bigBtn, { marginTop: 14 }]}
            onPress={() => {
              const value = Number(String(prop.value).replace(/\./g, '').replace(',', '.')) || 0;
              if (!prop.desc.trim() || !value) return Alert.alert('Falta pouco', 'Diga o que está incluído e o valor.');
              roomPost(sid, rid, { kind: 'proposta', who: me, text: prop.desc.trim(), value });
              setProp(null);
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>Enviar na sala</Text>
          </TouchableOpacity>
        </View>
      </KeyboardLift></Modal>
    </View>
  );
}

function Ctl({ icon, label, on, danger, leave, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', flex: 1 }} accessibilityLabel={label}>
      <View style={[st.ctl, on && { backgroundColor: danger ? '#FBE3E4' : '#E6F6EC' }, leave && { backgroundColor: C.red }]}>
        <Ionicons name={icon} size={20} color={leave ? '#fff' : on ? (danger ? C.red : C.green) : C.text} style={leave ? { transform: [{ rotate: '135deg' }] } : null} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Head({ title, sub, onBack }) {
  return (
    <View style={st.head}>
      <TouchableOpacity onPress={onBack} style={{ padding: 4 }} accessibilityLabel="Voltar"><Ionicons name="arrow-back" size={22} color={C.text} /></TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ fontWeight: '800', color: C.text, fontSize: 16 }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { color: C.muted, marginTop: 4, marginBottom: 12 },
  section: { color: C.muted, fontWeight: '800', fontSize: 11.5, letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12, marginBottom: 10 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontWeight: '800', color: C.text, fontSize: 15 },
  cardSub: { color: C.muted, fontSize: 12.5 },
  create: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: C.gold, borderRadius: 14, padding: 12 },
  backToRoom: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F6EC', borderRadius: 12, padding: 10, marginBottom: 10 },
  queueBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 12, padding: 10, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  teamRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  avatar: { backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  waitCard: { alignItems: 'center', backgroundColor: C.soft, borderRadius: 16, padding: 18, marginTop: 8 },
  waitBig: { fontSize: 40, fontWeight: '800', color: C.gold },
  qItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  callBtn: { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  roomRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginBottom: 8 },
  chan: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  meetBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.gold, borderRadius: 14, padding: 12, marginTop: 18 },
  foot: { color: C.muted, fontSize: 11.5, textAlign: 'center', marginTop: 22 },
  empty: { color: C.muted, textAlign: 'center', marginVertical: 14 },
  msg: { flexDirection: 'row', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  input: { flex: 1, backgroundColor: C.soft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: C.text },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  person: { alignItems: 'center', width: 72, marginRight: 6 },
  screenTag: { position: 'absolute', top: 0, right: 4, backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  screenTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  watchBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.text, marginHorizontal: 14, borderRadius: 12, padding: 12, marginBottom: 8 },
  action: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
  actionOn: { borderColor: C.green, backgroundColor: '#E6F6EC' },
  actionText: { marginLeft: 6, color: C.text, fontWeight: '700', fontSize: 12.5 },
  crmLine: { color: C.muted, fontSize: 11, paddingHorizontal: 16, marginBottom: 4 },
  propCard: { borderWidth: 1, borderColor: C.gold, backgroundColor: C.soft, borderRadius: 14, padding: 12, marginBottom: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 12, padding: 10, marginBottom: 10 },
  controls: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },
  ctl: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: C.bg, borderRadius: 18, padding: 18 },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 28 },
  dTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  dActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  okBtn: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  field: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.text },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  chipOn: { borderColor: C.gold, backgroundColor: C.soft },
  chipText: { color: C.muted, fontWeight: '700', fontSize: 12.5, marginLeft: 4 },
});
