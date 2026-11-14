// Arena Gamer: comunidades de jogos no estilo Discord, dentro do Re@lys.
// - Servidores (barra da esquerda): cada jogo ou grupo tem o seu; dá para criar o próprio.
// - Canais de texto (#geral, #procurando-time…) e de voz (🔊 Squad, Sala…).
// - Membros com cargo (Dono, Moderador, Membro) e o que estão jogando agora.
// - Mensagens passam pela moderação do Re@lys; perfis são de pessoas reais (biometria).
// Na demonstração, as conversas ficam no celular; com o servidor no ar, chegam para todos.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Share, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { moderateText } from '../../moderation';
import { useBack } from '../../back';

const D = { bg: '#F7F5EF', rail: '#EDE8DA', card: '#FFFFFF', text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', online: '#2FB463', idle: '#E0A92B', dnd: '#E5484D' };
const ROLE = { dono: { label: 'Dono', color: '#B8860B' }, mod: { label: 'Moderador', color: '#3B82F6' }, membro: { label: 'Membro', color: '#1B1B1F' } };

const now = Date.now();
const m = (min) => now - min * 60000;

// Servidores de exemplo (guardados enquanto o app está aberto).
const SEED = [
  {
    id: 'sv-realys', name: 'Re@lys Gamers', emoji: '🎮', tint: '#B8860B',
    members: [
      { name: 'Diego Ramos', role: 'dono', status: 'online', game: 'EA FC 26' },
      { name: 'Ana Souza', role: 'mod', status: 'online', game: 'Valorant' },
      { name: 'Lucas Prado', role: 'membro', status: 'idle', game: null },
      { name: 'Bia Lima', role: 'membro', status: 'online', game: 'Free Fire' },
      { name: 'Rafa Gomes', role: 'membro', status: 'dnd', game: 'Minecraft' },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [
        { who: 'Diego Ramos', text: 'Bem-vindos à Arena do Re@lys! Aqui só tem gente real, sem fake. 🎮', at: m(180) },
        { who: 'Ana Souza', text: 'Regras no #regras. Respeito acima de tudo.', at: m(170) },
        { who: 'Bia Lima', text: 'Alguém pra uma ranqueada de Free Fire hoje à noite?', at: m(12) },
      ] },
      { id: 'c2', kind: 'text', name: 'procurando-time', msgs: [
        { who: 'Lucas Prado', text: 'Procuro duo pra Valorant, sou Ouro 2. Jogo à noite.', at: m(60) },
        { who: 'Ana Souza', text: '@Lucas Prado bora, chama na voz às 21h', at: m(45) },
      ] },
      { id: 'c3', kind: 'text', name: 'clipes', msgs: [{ who: 'Rafa Gomes', text: 'Olha essa jogada que fiz ontem 😂 (clipe nas minhas lives)', at: m(300) }] },
      { id: 'c4', kind: 'text', name: 'torneios', msgs: [{ who: 'Diego Ramos', text: '🏆 Torneio de EA FC sábado 15h. Inscrição pelo Re@lys, prêmio em moeda Re@lys.', at: m(600) }] },
      { id: 'c5', kind: 'text', name: 'regras', msgs: [{ who: 'Ana Souza', text: '1. Respeito. 2. Sem golpe nem venda por fora: troca e venda só com a Garantia Re@lys. 3. Sem fake news. 4. Proibido para menores de 18.', at: m(2000) }] },
      { id: 'v1', kind: 'voice', name: 'Squad', inVoice: ['Bia Lima', 'Diego Ramos'] },
      { id: 'v2', kind: 'voice', name: 'Sala de espera', inVoice: [] },
    ],
  },
  {
    id: 'sv-ff', name: 'Free Fire BR', emoji: '🔥', tint: '#E8590C',
    members: [
      { name: 'Bia Lima', role: 'dono', status: 'online', game: 'Free Fire' },
      { name: 'Kauã Silva', role: 'membro', status: 'online', game: 'Free Fire' },
      { name: 'Duda Reis', role: 'membro', status: 'idle', game: null },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: 'Kauã Silva', text: 'Atualização nova chegou, alguém testou o mapa?', at: m(25) }] },
      { id: 'c2', kind: 'text', name: 'x1-e-squad', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Squad 4', inVoice: ['Kauã Silva'] },
    ],
  },
  {
    id: 'sv-mine', name: 'Construtores Minecraft', emoji: '⛏️', tint: '#2F9E44',
    members: [
      { name: 'Rafa Gomes', role: 'dono', status: 'dnd', game: 'Minecraft' },
      { name: 'Teo Martins', role: 'mod', status: 'online', game: 'Minecraft' },
    ],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: 'Teo Martins', text: 'Servidor de sobrevivência aberto hoje até meia-noite.', at: m(90) }] },
      { id: 'c2', kind: 'text', name: 'construções', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Construindo', inVoice: [] },
    ],
  },
  {
    id: 'sv-fc', name: 'EA FC Brasil', emoji: '⚽', tint: '#1C7ED6',
    members: [{ name: 'Diego Ramos', role: 'dono', status: 'online', game: 'EA FC 26' }],
    channels: [
      { id: 'c1', kind: 'text', name: 'geral', msgs: [] },
      { id: 'c2', kind: 'text', name: 'ultimate-team', msgs: [] },
      { id: 'v1', kind: 'voice', name: 'Partida', inVoice: [] },
    ],
  },
];

// Fica guardado enquanto o app está aberto (sai da tela e volta, as mensagens continuam).
let MEM = null;

const hhmm = (t) => {
  const d = new Date(t);
  const today = new Date().toDateString() === d.toDateString();
  const h = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return today ? `Hoje às ${h}` : `${d.getDate()}/${d.getMonth() + 1} ${h}`;
};
const initials = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const statusColor = (s) => (s === 'online' ? D.online : s === 'idle' ? D.idle : s === 'dnd' ? D.dnd : '#AAA');

function Avatar({ name, status, size = 36, speaking }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!speaking) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [speaking]);
  return (
    <View style={{ width: size, height: size }}>
      {speaking ? <Animated.View style={[st.speakRing, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, opacity: pulse }]} /> : null}
      <View style={[st.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ color: D.gold, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
      </View>
      {status ? <View style={[st.status, { backgroundColor: statusColor(status) }]} /> : null}
    </View>
  );
}

export default function ArenaScreen() {
  const { state } = useStore();
  const me = (state.user && state.user.name) || 'Você';
  const [servers, setServers] = useState(() => MEM || SEED);
  const [sid, setSid] = useState(servers[0].id);
  const [cid, setCid] = useState(null); // canal de texto aberto
  const [voice, setVoice] = useState(null); // { sid, cid } canal de voz conectado
  const [mic, setMic] = useState(true);
  const [deaf, setDeaf] = useState(false);
  const [members, setMembers] = useState(false);
  const [create, setCreate] = useState(null);
  const [newCh, setNewCh] = useState(null);
  const [draft, setDraft] = useState('');
  const [react, setReact] = useState(null); // mensagem para reagir
  const scroll = useRef(null);
  useEffect(() => {
    MEM = servers;
  }, [servers]);
  useBack(!!cid, () => setCid(null));

  const sv = servers.find((s) => s.id === sid) || servers[0];
  const ch = cid ? sv.channels.find((c) => c.id === cid) : null;
  const iAmIn = (s) => s.members.some((x) => x.name === me);
  const myRole = (sv.members.find((x) => x.name === me) || {}).role;
  const update = (fn) => setServers((list) => list.map((s) => (s.id === sid ? fn(s) : s)));

  const join = () => update((s) => ({ ...s, members: [...s.members, { name: me, role: 'membro', status: 'online', game: null }] }));

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    const mod = moderateText ? moderateText(t) : { ok: true };
    if (mod && mod.ok === false) return Alert.alert('Mensagem não enviada', mod.why || 'A mensagem não segue as regras do Re@lys.');
    if (!iAmIn(sv)) join();
    update((s) => ({ ...s, channels: s.channels.map((c) => (c.id === cid ? { ...c, msgs: [...c.msgs, { who: me, text: t, at: Date.now() }] } : c)) }));
    setDraft('');
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 50);
  };

  const addReaction = (emoji) => {
    const { i } = react;
    update((s) => ({
      ...s,
      channels: s.channels.map((c) => {
        if (c.id !== cid) return c;
        const msgs = c.msgs.slice();
        const r = { ...(msgs[i].reactions || {}) };
        r[emoji] = (r[emoji] || 0) + 1;
        msgs[i] = { ...msgs[i], reactions: r };
        return { ...c, msgs };
      }),
    }));
    setReact(null);
  };

  // Entrar e sair da voz: sai de uma sala ao entrar em outra.
  const toggleVoice = (c) => {
    const leaving = voice && voice.sid === sid && voice.cid === c.id;
    setServers((list) => list.map((s) => ({
      ...s,
      channels: s.channels.map((x) => {
        if (x.kind !== 'voice') return x;
        const without = (x.inVoice || []).filter((n) => n !== me);
        return s.id === sid && x.id === c.id && !leaving ? { ...x, inVoice: [...without, me] } : { ...x, inVoice: without };
      }),
    })));
    setVoice(leaving ? null : { sid, cid: c.id });
    if (!leaving && !iAmIn(sv)) join();
  };
  const leaveVoice = () => {
    if (!voice) return;
    setServers((list) => list.map((s) => ({ ...s, channels: s.channels.map((x) => (x.kind === 'voice' ? { ...x, inVoice: (x.inVoice || []).filter((n) => n !== me) } : x)) })));
    setVoice(null);
  };
  const voiceCh = voice ? (servers.find((s) => s.id === voice.sid) || { channels: [] }).channels.find((c) => c.id === voice.cid) : null;
  const voiceSv = voice ? servers.find((s) => s.id === voice.sid) : null;

  const makeServer = () => {
    const name = (create.name || '').trim();
    if (!name) return;
    const mod = moderateText ? moderateText(name) : { ok: true };
    if (mod && mod.ok === false) return Alert.alert('Nome não permitido', mod.why || 'Escolha outro nome.');
    const id = 'sv-' + Date.now();
    const s = {
      id, name, emoji: create.emoji || '🎮', tint: D.gold,
      members: [{ name: me, role: 'dono', status: 'online', game: null }],
      channels: [
        { id: 'c1', kind: 'text', name: 'geral', msgs: [{ who: me, text: `Servidor ${name} criado! Convide a galera. 🎉`, at: Date.now() }] },
        { id: 'c2', kind: 'text', name: 'procurando-time', msgs: [] },
        { id: 'v1', kind: 'voice', name: 'Squad', inVoice: [] },
      ],
    };
    setServers((l) => [...l, s]);
    setSid(id);
    setCid(null);
    setCreate(null);
  };
  const makeChannel = () => {
    const name = (newCh.name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9à-ú-]/g, '');
    if (!name) return;
    update((s) => ({ ...s, channels: [...s.channels, newCh.kind === 'voice' ? { id: 'v' + Date.now(), kind: 'voice', name: newCh.name.trim(), inVoice: [] } : { id: 'c' + Date.now(), kind: 'text', name, msgs: [] }] }));
    setNewCh(null);
  };
  const invite = () => Share.share({ message: `Entre no servidor ${sv.name} na Arena Gamer do Re@lys! Só gente real, verificada por biometria. 🎮` }).catch(() => {});

  const online = sv.members.filter((x) => x.status !== 'offline').length;

  // ---------- Conversa de um canal de texto ----------
  if (ch) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: D.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.chatHead}>
          <TouchableOpacity onPress={() => setCid(null)} style={{ padding: 4 }} accessibilityLabel="Voltar para os canais">
            <Ionicons name="arrow-back" size={22} color={D.text} />
          </TouchableOpacity>
          <Text style={st.hash}>#</Text>
          <Text style={st.chatTitle} numberOfLines={1}>{ch.name}</Text>
          <Text style={st.chatSv} numberOfLines={1}>{sv.emoji} {sv.name}</Text>
          <TouchableOpacity onPress={() => setMembers(true)} style={{ padding: 4 }} accessibilityLabel="Ver membros">
            <Ionicons name="people-outline" size={22} color={D.text} />
          </TouchableOpacity>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: false })}>
          <View style={st.chanIntro}>
            <View style={st.chanIntroIcon}><Text style={{ fontSize: 26, color: D.gold, fontWeight: '800' }}>#</Text></View>
            <Text style={st.chanIntroTitle}>Bem-vindo a #{ch.name}!</Text>
            <Text style={{ color: D.muted, textAlign: 'center' }}>Este é o começo do canal. Seja gentil: aqui todo mundo é pessoa real.</Text>
          </View>
          {ch.msgs.map((msg, i) => {
            const mem = sv.members.find((x) => x.name === msg.who) || {};
            const role = ROLE[mem.role] || ROLE.membro;
            const mention = msg.text.includes('@' + me);
            return (
              <TouchableOpacity key={i} activeOpacity={0.8} onLongPress={() => setReact({ i })} style={[st.msg, mention && st.msgMention]}>
                <Avatar name={msg.who} size={38} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text>
                    <Text style={{ fontWeight: '800', color: role.color }}>{msg.who}</Text>
                    {mem.role && mem.role !== 'membro' ? <Text style={[st.roleTag, { color: role.color }]}>  {role.label}</Text> : null}
                    <Text style={st.time}>  {hhmm(msg.at)}</Text>
                  </Text>
                  <Text style={st.msgText}>{msg.text}</Text>
                  {msg.reactions ? (
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                      {Object.entries(msg.reactions).map(([e, n]) => (
                        <View key={e} style={st.reaction}><Text style={{ fontSize: 13 }}>{e} {n}</Text></View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={st.inputRow}>
          <TextInput value={draft} onChangeText={setDraft} placeholder={`Conversar em #${ch.name}`} placeholderTextColor={D.muted} style={st.input} onSubmitEditing={send} returnKeyType="send" />
          <TouchableOpacity onPress={send} style={st.sendBtn} accessibilityLabel="Enviar mensagem">
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
        {voice ? <VoiceBar ch={voiceCh} sv={voiceSv} mic={mic} deaf={deaf} setMic={setMic} setDeaf={setDeaf} leave={leaveVoice} /> : null}
        <Modal visible={!!react} transparent animationType="fade" onRequestClose={() => setReact(null)}>
          <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setReact(null)}>
            <View style={st.reactBox}>
              {['👍', '🔥', '😂', '❤️', '🎮', '🏆'].map((e) => (
                <TouchableOpacity key={e} onPress={() => addReaction(e)} style={{ padding: 8 }}><Text style={{ fontSize: 28 }}>{e}</Text></TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
        <MembersModal open={members} onClose={() => setMembers(false)} sv={sv} />
      </KeyboardAvoidingView>
    );
  }

  // ---------- Servidores + canais ----------
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: D.bg }}>
      <ScrollView style={st.rail} contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
        {servers.map((s) => {
          const on = s.id === sid;
          return (
            <TouchableOpacity key={s.id} onPress={() => { setSid(s.id); setCid(null); }} style={st.railItem} accessibilityLabel={`Servidor ${s.name}`}>
              {on ? <View style={st.railPill} /> : null}
              <View style={[st.railIcon, { borderRadius: on ? 16 : 24, backgroundColor: on ? s.tint : D.card }]}>
                <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => setCreate({ name: '', emoji: '🎮' })} style={st.railItem} accessibilityLabel="Criar servidor">
          <View style={[st.railIcon, { backgroundColor: D.card }]}>
            <Ionicons name="add" size={26} color={D.online} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ flex: 1 }}>
        <View style={st.svHead}>
          <View style={{ flex: 1 }}>
            <Text style={st.svName} numberOfLines={1}>{sv.emoji} {sv.name}</Text>
            <Text style={{ color: D.muted, fontSize: 12 }}>
              <Text style={{ color: D.online }}>●</Text> {online} online · {sv.members.length} membros
            </Text>
          </View>
          <TouchableOpacity onPress={invite} style={st.headBtn} accessibilityLabel="Convidar amigos">
            <Ionicons name="person-add-outline" size={19} color={D.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMembers(true)} style={st.headBtn} accessibilityLabel="Ver membros">
            <Ionicons name="people-outline" size={20} color={D.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: voice ? 90 : 24 }}>
          {!iAmIn(sv) ? (
            <TouchableOpacity style={st.joinBtn} onPress={join}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Entrar no servidor</Text>
            </TouchableOpacity>
          ) : null}
          <View style={st.catRow}>
            <Text style={st.cat}>CANAIS DE TEXTO</Text>
            {myRole === 'dono' || myRole === 'mod' ? (
              <TouchableOpacity onPress={() => setNewCh({ kind: 'text', name: '' })} accessibilityLabel="Criar canal de texto"><Ionicons name="add" size={18} color={D.muted} /></TouchableOpacity>
            ) : null}
          </View>
          {sv.channels.filter((c) => c.kind === 'text').map((c) => (
            <TouchableOpacity key={c.id} style={st.chan} onPress={() => setCid(c.id)}>
              <Text style={st.chanHash}>#</Text>
              <Text style={st.chanName}>{c.name}</Text>
              {c.msgs.length ? <Text style={st.chanCount}>{c.msgs.length}</Text> : null}
            </TouchableOpacity>
          ))}
          <View style={st.catRow}>
            <Text style={st.cat}>CANAIS DE VOZ</Text>
            {myRole === 'dono' || myRole === 'mod' ? (
              <TouchableOpacity onPress={() => setNewCh({ kind: 'voice', name: '' })} accessibilityLabel="Criar canal de voz"><Ionicons name="add" size={18} color={D.muted} /></TouchableOpacity>
            ) : null}
          </View>
          {sv.channels.filter((c) => c.kind === 'voice').map((c) => {
            const inIt = voice && voice.sid === sid && voice.cid === c.id;
            return (
              <View key={c.id}>
                <TouchableOpacity style={[st.chan, inIt && { backgroundColor: '#E6F6EC' }]} onPress={() => toggleVoice(c)} accessibilityLabel={inIt ? `Sair de ${c.name}` : `Entrar na voz ${c.name}`}>
                  <Ionicons name="volume-high" size={17} color={inIt ? D.online : D.muted} style={{ width: 20 }} />
                  <Text style={[st.chanName, inIt && { color: D.online, fontWeight: '800' }]}>{c.name}</Text>
                  <Text style={st.chanCount}>{(c.inVoice || []).length ? `${(c.inVoice || []).length} na voz` : 'Entrar'}</Text>
                </TouchableOpacity>
                {(c.inVoice || []).map((n, k) => (
                  <View key={n} style={st.voiceUser}>
                    <Avatar name={n} size={24} speaking={n !== me ? k % 2 === 0 : mic && inIt} />
                    <Text style={{ marginLeft: 8, color: D.text }}>{n === me ? `${n} (você)` : n}</Text>
                    {n === me && !mic ? <Ionicons name="mic-off" size={14} color={D.dnd} style={{ marginLeft: 6 }} /> : null}
                  </View>
                ))}
              </View>
            );
          })}
          <Text style={st.cat}>JOGANDO AGORA</Text>
          {sv.members.filter((x) => x.game).map((x) => (
            <View key={x.name} style={st.playing}>
              <Avatar name={x.name} status={x.status} size={30} />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontWeight: '700', color: D.text }}>{x.name}</Text>
                <Text style={{ color: D.muted, fontSize: 12 }}>🎮 Jogando {x.game}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        {voice ? <VoiceBar ch={voiceCh} sv={voiceSv} mic={mic} deaf={deaf} setMic={setMic} setDeaf={setDeaf} leave={leaveVoice} /> : null}
      </View>

      <MembersModal open={members} onClose={() => setMembers(false)} sv={sv} />

      <Modal visible={!!create} transparent animationType="fade" onRequestClose={() => setCreate(null)}>
        <View style={st.backdrop}>
          <View style={st.dialog}>
            <Text style={st.dialogTitle}>Criar servidor</Text>
            <Text style={{ color: D.muted, marginBottom: 10 }}>Seu espaço para jogar com a galera. Você é o dono.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {['🎮', '🔥', '⚽', '⛏️', '🏎️', '🔫', '🧙', '🏀', '♟️', '🕹️'].map((e) => (
                <TouchableOpacity key={e} onPress={() => setCreate({ ...create, emoji: e })} style={[st.emojiPick, create && create.emoji === e && { borderColor: D.gold }]}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={create ? create.name : ''} onChangeText={(t) => setCreate({ ...create, name: t })} placeholder="Nome do servidor" placeholderTextColor={D.muted} style={st.field} maxLength={40} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <TouchableOpacity onPress={() => setCreate(null)} style={{ padding: 10 }}><Text style={{ color: D.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={makeServer} style={st.okBtn}><Text style={{ color: '#fff', fontWeight: '800' }}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!newCh} transparent animationType="fade" onRequestClose={() => setNewCh(null)}>
        <View style={st.backdrop}>
          <View style={st.dialog}>
            <Text style={st.dialogTitle}>{newCh && newCh.kind === 'voice' ? 'Novo canal de voz' : 'Novo canal de texto'}</Text>
            <TextInput value={newCh ? newCh.name : ''} onChangeText={(t) => setNewCh({ ...newCh, name: t })} placeholder={newCh && newCh.kind === 'voice' ? 'Ex.: Squad 2' : 'Ex.: dicas'} placeholderTextColor={D.muted} style={st.field} maxLength={30} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <TouchableOpacity onPress={() => setNewCh(null)} style={{ padding: 10 }}><Text style={{ color: D.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={makeChannel} style={st.okBtn}><Text style={{ color: '#fff', fontWeight: '800' }}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VoiceBar({ ch, sv, mic, deaf, setMic, setDeaf, leave }) {
  if (!ch) return null;
  return (
    <View style={st.voiceBar}>
      <Ionicons name="cellular" size={16} color={D.online} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ color: D.online, fontWeight: '800', fontSize: 13 }}>Conectado na voz</Text>
        <Text style={{ color: D.muted, fontSize: 12 }} numberOfLines={1}>{ch.name} · {sv && sv.name}</Text>
      </View>
      <TouchableOpacity onPress={() => setMic(!mic)} style={st.vBtn} accessibilityLabel={mic ? 'Desligar microfone' : 'Ligar microfone'}>
        <Ionicons name={mic ? 'mic' : 'mic-off'} size={19} color={mic ? D.text : D.dnd} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDeaf(!deaf)} style={st.vBtn} accessibilityLabel={deaf ? 'Voltar a ouvir' : 'Silenciar a sala'}>
        <Ionicons name={deaf ? 'volume-mute' : 'headset'} size={19} color={deaf ? D.dnd : D.text} />
      </TouchableOpacity>
      <TouchableOpacity onPress={leave} style={[st.vBtn, { backgroundColor: D.dnd }]} accessibilityLabel="Sair da voz">
        <Ionicons name="call" size={17} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
      </TouchableOpacity>
    </View>
  );
}

function MembersModal({ open, onClose, sv }) {
  const groups = ['dono', 'mod', 'membro'];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={onClose} />
      <View style={st.sheet}>
        <Text style={st.dialogTitle}>Membros · {sv.name}</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {groups.map((g) => {
            const list = sv.members.filter((x) => x.role === g);
            if (!list.length) return null;
            return (
              <View key={g}>
                <Text style={st.cat}>{ROLE[g].label.toUpperCase()} — {list.length}</Text>
                {list.map((x) => (
                  <View key={x.name} style={st.playing}>
                    <Avatar name={x.name} status={x.status} size={34} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={{ fontWeight: '700', color: ROLE[g].color }}>{x.name} <Ionicons name="shield-checkmark" size={12} color={D.gold} /></Text>
                      <Text style={{ color: D.muted, fontSize: 12 }}>{x.game ? `🎮 Jogando ${x.game}` : x.status === 'idle' ? 'Ausente' : x.status === 'dnd' ? 'Não perturbe' : 'Online'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  rail: { width: 68, flexGrow: 0, backgroundColor: D.rail },
  railItem: { width: 68, alignItems: 'center', marginBottom: 8, justifyContent: 'center' },
  railPill: { position: 'absolute', left: 0, width: 4, height: 36, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: D.text },
  railIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  svHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD6C4' },
  svName: { fontWeight: '800', fontSize: 16, color: D.text },
  headBtn: { padding: 6, marginLeft: 4 },
  joinBtn: { margin: 12, backgroundColor: D.online, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 },
  cat: { color: D.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 16, marginBottom: 6, marginLeft: 14 },
  chan: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 8 },
  chanHash: { width: 20, color: D.muted, fontSize: 18, fontWeight: '700' },
  chanName: { flex: 1, color: D.text, fontSize: 15, fontWeight: '600' },
  chanCount: { color: D.muted, fontSize: 12 },
  voiceUser: { flexDirection: 'row', alignItems: 'center', marginLeft: 44, paddingVertical: 4 },
  playing: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 },
  avatar: { backgroundColor: '#F6EBCB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7D49A' },
  status: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: D.bg },
  speakRing: { position: 'absolute', left: -3, top: -3, borderWidth: 2, borderColor: D.online },
  chatHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD6C4', backgroundColor: D.bg },
  hash: { color: D.muted, fontSize: 22, fontWeight: '700', marginLeft: 8 },
  chatTitle: { fontWeight: '800', fontSize: 16, color: D.text, marginLeft: 4, flexShrink: 1 },
  chatSv: { flex: 1, color: D.muted, fontSize: 12, marginLeft: 8 },
  chanIntro: { alignItems: 'center', paddingVertical: 16, marginBottom: 6 },
  chanIntroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F6EBCB', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  chanIntroTitle: { fontWeight: '800', fontSize: 18, color: D.text, marginBottom: 4 },
  msg: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  msgMention: { backgroundColor: '#FFF4D6', borderLeftWidth: 3, borderLeftColor: D.gold },
  roleTag: { fontSize: 11, fontWeight: '800' },
  time: { color: D.muted, fontSize: 11 },
  msgText: { color: D.text, fontSize: 15, marginTop: 2, lineHeight: 20 },
  reaction: { backgroundColor: '#F1ECDD', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDD6C4', backgroundColor: D.bg },
  input: { flex: 1, backgroundColor: D.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: D.text },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: D.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  voiceBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: D.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDD6C4' },
  vBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1ECDD', marginLeft: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  reactBox: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 30, paddingHorizontal: 8 },
  dialog: { backgroundColor: '#fff', borderRadius: 18, padding: 18, alignSelf: 'stretch' },
  dialogTitle: { fontWeight: '800', fontSize: 17, color: D.text, marginBottom: 6 },
  emojiPick: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', margin: 3, backgroundColor: '#F7F5EF' },
  field: { borderWidth: 1, borderColor: '#E3DCC8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: D.text },
  okBtn: { backgroundColor: D.gold, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginLeft: 8 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 30 },
});
