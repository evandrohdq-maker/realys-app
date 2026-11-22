// Arena Gamer: comunidades de jogos no estilo Discord, dentro do Realyz.
// - Servidores (barra da esquerda): cada jogo ou grupo tem o seu; dá para criar o próprio.
// - Canais de texto (#geral, #procurando-time…) e de voz (🔊 Squad, Sala…).
// - Membros com cargo (Dono, Moderador, Membro) e o que estão jogando agora.
// - Mensagens passam pela moderação do Realyz; perfis são de pessoas reais (biometria).
// Na demonstração, as conversas ficam no celular; com o servidor no ar, chegam para todos.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardLift } from '../../keyboard';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Share, Animated, Platform,
} from 'react-native';
import { Text, TextInput } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { moderateText } from '../../moderation';
import { useBack } from '../../back';
import { useArena, arenaPref, joinArenaVoice } from '../../arena';
import ArenaUserSheet from '../../components/ArenaUserSheet';
import { CallPersonSheet, InviteSheet } from '../../components/ArenaCallInvite';
import { useGrupoMsgs, chaveGrupo, GrupoAviso } from '../../serverGrupos';
import { conectado } from '../../serverShop';
import { useScreenShare, startScreenShare, stopScreenShare } from '../../screenShare';
import { ScreenViewer } from '../../components/ScreenShareKit';
import { useCamShare, startCam, stopCam } from '../../camShare';
import { cfgPadrao, ehMod, cargoDe } from '../../salaPlanos';
import { SalaConfig, SalaPainel, ModeracaoSheet, EntrarComId, SenhaSheet, tentaEntrar } from '../../components/SalaKit';
import { arenaKick } from '../../arena';

const D = { bg: '#F7F5EF', rail: '#EDE8DA', card: '#FFFFFF', text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', online: '#2FB463', idle: '#E0A92B', dnd: '#E5484D' };
const ROLE = { dono: { label: 'Dono', color: '#B8860B' }, mod: { label: 'Moderador', color: '#3B82F6' }, membro: { label: 'Membro', color: '#1B1B1F' } };


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

export default function ArenaScreen({ explore }) {
  const { state } = useStore();
  const me = (state.user && state.user.name) || 'Você';
  // Servidores e sala de voz ficam em src/arena.js (as Lives usam os mesmos).
  const { servers, setServers, voice, setVoice } = useArena();
  const [sid, setSid] = useState(servers[0].id);
  const [cid, setCid] = useState(null); // canal de texto aberto
  // Veio de uma live ("Entrar no servidor do streamer"): abre direto naquele servidor.
  useEffect(() => {
    if (explore && explore.tab === 'arena' && explore.server && servers.some((x) => x.id === explore.server)) {
      setSid(explore.server);
      setCid(null);
    }
    // Veio de um link de convite: entra direto na sala de voz.
    if (explore && explore.tab === 'arena' && explore.voice) {
      const s = servers.find((x) => x.id === explore.server);
      const c = s && s.channels.find((x) => x.id === explore.voice && x.kind === 'voice');
      if (!c) return Alert.alert('Chamada não encontrada', 'A sala desse convite foi fechada ou ainda não chegou ao seu celular. Peça um link novo para quem te chamou.');
      joinArenaVoice(s.id, c.id, me);
      Alert.alert('Você entrou na chamada 🎧', `${c.name} · ${s.name}${explore.host ? `\nConvite de ${explore.host}` : ''}`);
    }
  }, [explore]);
  const [mic, setMic] = useState(true);
  // Compartilhar a tela na sala de voz (como o Go Live do Discord, só para quem está na sala).
  const share = useScreenShare();
  const [watching, setWatching] = useState(null); // { by, id?, demo }
  const salaKey = (v) => (v ? `arena:${v.sid}:${v.cid}` : null);
  const sharingHere = !!(share && voice && share.sala === salaKey(voice));
  const toggleScreen = async () => {
    if (sharingHere) return stopScreenShare();
    try {
      await startScreenShare({ sala: salaKey(voice), label: voiceCh ? voiceCh.name : 'Arena', para: [] });
    } catch (e) {
      Alert.alert('Tela não compartilhada', e.message);
    }
  };
  // Câmera na sala: a imagem da pessoa (pequena no canto se ela também mostra a tela).
  const camOn = useCamShare();
  const camHere = !!(camOn && voice && camOn.sala === salaKey(voice));
  const toggleCam = async () => {
    if (camHere) return stopCam();
    try {
      await startCam({ sala: salaKey(voice), label: voiceCh ? voiceCh.name : 'Arena', para: [] });
    } catch (e) {
      Alert.alert('Câmera não ligada', e.message);
    }
  };
  const [userOpen, setUserOpen] = useState(null); // pessoa com as opções abertas (silenciar, volume, bloquear…)
  const openUser = (name) => name && name !== me && setUserOpen(name);
  // Segurar o nome de alguém: convidar para chamada. O botão 👤+ convida amigos e manda o link por fora.
  const [callFor, setCallFor] = useState(null);
  const callUser = (name) => name && name !== me && setCallFor(name);
  const [inviting, setInviting] = useState(false);
  const [deaf, setDeaf] = useState(false);
  const [members, setMembers] = useState(false);
  const [create, setCreate] = useState(null);
  const [newCh, setNewCh] = useState(null);
  const [draft, setDraft] = useState('');
  const [react, setReact] = useState(null); // mensagem para reagir
  const scroll = useRef(null);
  useBack(!!cid, () => setCid(null));

  // Toda sala (servidor) tem configuração: ID, senha, limite, exposta ou não, moderação, classes e painel.
  useEffect(() => {
    if (servers.some((s) => !s.cfg)) {
      setServers((l) => l.map((s) => (s.cfg ? s : { ...s, cfg: cfgPadrao((s.members.find((x) => x.role === 'dono') || {}).name, 'gratis') })));
    }
  }, [servers]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [idOpen, setIdOpen] = useState(false);
  const [senhaAsk, setSenhaAsk] = useState(null);
  const oldCargo = (x) => (x && x.role === 'dono' ? 'Admin' : x && x.role === 'mod' ? 'Moderador' : 'Membro');
  const visiveis = servers.filter((s) => !s.cfg || s.cfg.visivel !== false || s.members.some((x) => x.name === me));

  const sv = servers.find((s) => s.id === sid) || servers[0];
  const ch = cid ? sv.channels.find((c) => c.id === cid) : null;
  // Conta real: o canal de texto passa pelo servidor (chega para todo mundo do canal).
  const chaveCanal = ch && ch.kind === 'text' && sv && conectado(state) ? chaveGrupo('arena', sv.id, ch.id) : null;
  const real = useGrupoMsgs(chaveCanal);
  const iAmIn = (s) => s.members.some((x) => x.name === me);
  const myRole = (sv.members.find((x) => x.name === me) || {}).role;
  const update = (fn) => setServers((list) => list.map((s) => (s.id === sid ? fn(s) : s)));

  const join = () => update((s) => ({ ...s, members: [...s.members, { name: me, role: 'membro', status: 'online', game: null }] }));
  // Entrar passa pela porta: banido, sala cheia e senha.
  const gate = (then) => {
    if (iAmIn(sv)) return then && then();
    tentaEntrar({ cfg: sv.cfg, pessoas: sv.members.length, me, nome: sv.name, askSenha: setSenhaAsk, onOk: () => { join(); then && setTimeout(then, 0); } });
  };
  const fbCargo = (n) => oldCargo(sv.members.find((x) => x.name === n));
  const souMod = sv.cfg ? ehMod({ ...sv.cfg, cargos: { ...(sv.cfg.cargos || {}), [me]: cargoDe(sv.cfg, me, fbCargo(me)) } }, me) : myRole === 'dono';
  const souAdmin = sv.cfg ? cargoDe(sv.cfg, me, fbCargo(me)) === 'Admin' : myRole === 'dono';
  const findById = (id) => {
    const s = servers.find((x) => x.cfg && x.cfg.id === id);
    if (!s) return null;
    return {
      nome: s.name, cfg: s.cfg, pessoas: s.members.length,
      onOk: () => {
        setServers((l) => l.map((x) => (x.id === s.id && !x.members.some((m) => m.name === me) ? { ...x, members: [...x.members, { name: me, role: 'membro', status: 'online', game: null }] } : x)));
        setSid(s.id);
        setCid(null);
      },
    };
  };

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    const mod = moderateText ? moderateText(t) : { ok: true };
    if (mod && mod.ok === false) return Alert.alert('Mensagem não enviada', mod.why || 'A mensagem não segue as regras do Realyz.');
    if (!iAmIn(sv)) return gate();
    if (sv.cfg && sv.cfg.moderada && (sv.cfg.silenciados || []).includes(me)) return Alert.alert('Você está silenciado', 'Um moderador desta sala silenciou você.');
    if (real.on) {
      real.enviar(t).catch((e) => Alert.alert('Mensagem não enviada', e.message));
      setDraft('');
      setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 50);
      return;
    }
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
    if (!iAmIn(sv)) return gate(() => toggleVoice(c));
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
  };
  const leaveVoice = () => {
    if (!voice) return;
    if (sharingHere) stopScreenShare();
    if (camHere) stopCam();
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
      id, name, emoji: create.emoji || '🎮', tint: D.gold, cfg: cfgPadrao(me),
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
    // Logo depois de criar: senha, limite, exposta ou não, moderação (Premium) e painel (Empresarial).
    setTimeout(() => setCfgOpen(true), 250);
  };
  const makeChannel = () => {
    const name = (newCh.name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9à-ú-]/g, '');
    if (!name) return;
    update((s) => ({ ...s, channels: [...s.channels, newCh.kind === 'voice' ? { id: 'v' + Date.now(), kind: 'voice', name: newCh.name.trim(), inVoice: [] } : { id: 'c' + Date.now(), kind: 'text', name, msgs: [] }] }));
    setNewCh(null);
  };
  const invite = () => setInviting(true);

  const online = sv.members.filter((x) => x.status !== 'offline').length;

  // ---------- Conversa de um canal de texto ----------
  if (ch) {
    return (
      <KeyboardLift enabled={false} style={{ flex: 1, backgroundColor: D.bg }}>
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
          <GrupoAviso chave={chaveCanal} nome={ch.name} cor={D.muted} />
          {[...ch.msgs, ...real.msgs].map((msg, i) => {
            const mem = sv.members.find((x) => x.name === msg.who) || {};
            const role = ROLE[mem.role] || ROLE.membro;
            const mention = (msg.text.includes('*' + me) || msg.text.includes('@' + me));
            const pf = msg.who === me ? null : arenaPref(msg.who);
            // Bloqueado: a mensagem nem aparece. Ignorado: fica recolhida; tocar abre as opções da pessoa.
            if (pf && pf.blocked) return null;
            if (pf && pf.ignored)
              return (
                <TouchableOpacity key={i} onPress={() => openUser(msg.who)} style={[st.msg, { opacity: 0.6 }]} accessibilityLabel={`Mensagem de ${msg.who}, que você ignorou`}>
                  <Ionicons name="eye-off-outline" size={16} color={D.muted} style={{ width: 38, textAlign: 'center' }} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: D.muted, fontSize: 12.5, marginLeft: 10, flex: 1 }}>Mensagem de {msg.who.split(' ')[0]}, que você ignorou.</Text>
                </TouchableOpacity>
              );
            return (
              <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => openUser(msg.who)} onLongPress={() => i < ch.msgs.length && setReact({ i })} style={[st.msg, mention && st.msgMention]}>
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
        {voice ? <VoiceBar ch={voiceCh} sv={voiceSv} mic={mic} deaf={deaf} setMic={setMic} setDeaf={setDeaf} leave={leaveVoice} screen={sharingHere} onScreen={toggleScreen} cam={camHere} onCam={toggleCam} /> : null}
        <Modal visible={!!react} transparent animationType="fade" onRequestClose={() => setReact(null)}><KeyboardLift style={{ flex: 1 }}>
          <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setReact(null)}>
            <View style={st.reactBox}>
              {['👍', '🔥', '😂', '❤️', '🎮', '🏆'].map((e) => (
                <TouchableOpacity key={e} onPress={() => addReaction(e)} style={{ padding: 8 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 28 }}>{e}</Text></TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </KeyboardLift></Modal>
        <MembersModal open={members} onClose={() => setMembers(false)} sv={sv} me={me} onUser={(n) => { setMembers(false); openUser(n); }} onCall={(n) => { setMembers(false); callUser(n); }} />
        <ArenaUserSheet name={userOpen} sv={sv} me={me} myRole={myRole} onClose={() => setUserOpen(null)} onCall={(n) => { setUserOpen(null); callUser(n); }} onMention={(n) => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}@${n} `)} />
        <CallPersonSheet name={callFor} sv={sv} me={me} onClose={() => setCallFor(null)} />
        <InviteSheet open={inviting} sv={sv} me={me} onClose={() => setInviting(false)} />
      </KeyboardLift>
    );
  }

  // ---------- Servidores + canais ----------
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: D.bg }}>
      <ScrollView style={st.rail} contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
        {visiveis.map((s) => {
          const on = s.id === sid;
          return (
            <TouchableOpacity key={s.id} onPress={() => { setSid(s.id); setCid(null); }} style={st.railItem} accessibilityLabel={`Servidor ${s.name}`}>
              {on ? <View style={st.railPill} /> : null}
              <View style={[st.railIcon, { borderRadius: on ? 16 : 24, backgroundColor: on ? s.tint : D.card }]}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 22 }}>{s.emoji}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => setCreate({ name: '', emoji: '🎮' })} style={st.railItem} accessibilityLabel="Criar servidor">
          <View style={[st.railIcon, { backgroundColor: D.card }]}>
            <Ionicons name="add" size={26} color={D.online} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIdOpen(true)} style={st.railItem} accessibilityLabel="Entrar com ID">
          <View style={[st.railIcon, { backgroundColor: D.card }]}>
            <Ionicons name="key-outline" size={22} color={D.gold} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ flex: 1 }}>
        <View style={st.svHead}>
          <View style={{ flex: 1 }}>
            <Text style={st.svName} numberOfLines={1}>{sv.emoji} {sv.name}{sv.cfg && sv.cfg.senha ? ' 🔒' : ''}</Text>
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
          {sv.cfg && souMod ? (
            <TouchableOpacity onPress={() => setModOpen(true)} style={st.headBtn} accessibilityLabel="Moderação">
              <Ionicons name="shield-checkmark-outline" size={19} color={D.text} />
            </TouchableOpacity>
          ) : null}
          {sv.cfg && souAdmin ? (
            <TouchableOpacity onPress={() => setCfgOpen(true)} style={st.headBtn} accessibilityLabel="Configurar sala">
              <Ionicons name="settings-outline" size={19} color={D.text} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: voice ? 90 : 24 }}>
          {sv.cfg ? <View style={{ paddingHorizontal: 10 }}><SalaPainel cfg={sv.cfg} nome={sv.name} /></View> : null}
          {!iAmIn(sv) ? (
            <TouchableOpacity style={st.joinBtn} onPress={() => gate()}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Entrar no servidor</Text>
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
                  <TouchableOpacity key={n} style={st.voiceUser} onPress={() => openUser(n)} onLongPress={() => callUser(n)} activeOpacity={n === me ? 1 : 0.7} accessibilityLabel={n === me ? 'Você' : `Opções de ${n}. Segure para convidar para chamada`}>
                    <Avatar name={n} size={24} speaking={n !== me ? k % 2 === 0 && !deaf && !arenaPref(n).muted && !arenaPref(n).blocked : mic && inIt} />
                    <Text style={{ marginLeft: 8, color: D.text, flexShrink: 1 }} numberOfLines={1}>{n === me ? `${n} (você)` : n}</Text>
                    {(n === me && inIt && sharingHere) || (n !== me && c.screen === n) ? (
                      <TouchableOpacity onPress={() => n !== me && setWatching({ by: n, demo: true })} style={st.liveTag} accessibilityLabel={n === me ? 'Você está mostrando a tela' : `Ver a tela de ${n}`}>
                        <Text numberOfLines={1} style={st.liveTagText}>{n === me ? 'AO VIVO' : 'VER TELA'}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {n === me && !mic ? <Ionicons name="mic-off" size={14} color={D.dnd} style={{ marginLeft: 6 }} /> : null}
                    {n === me && deaf ? <Ionicons name="volume-mute" size={14} color={D.dnd} style={{ marginLeft: 4 }} /> : null}
                    {n !== me && (arenaPref(n).muted || arenaPref(n).blocked) ? <Ionicons name="volume-mute" size={14} color={D.dnd} style={{ marginLeft: 6 }} /> : null}
                    {n !== me && !arenaPref(n).muted && arenaPref(n).volume !== 100 ? <Text style={{ color: D.muted, fontSize: 11, marginLeft: 6 }}>{arenaPref(n).volume}%</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
          <Text style={st.cat}>JOGANDO AGORA</Text>
          {sv.members.filter((x) => x.game && !arenaPref(x.name).blocked).map((x) => (
            <TouchableOpacity key={x.name} style={st.playing} onPress={() => openUser(x.name)} onLongPress={() => callUser(x.name)} activeOpacity={0.7} accessibilityLabel={`${x.name}. Segure para convidar para chamada`}>
              <Avatar name={x.name} status={x.status} size={30} />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontWeight: '700', color: D.text }}>{x.name}</Text>
                <Text style={{ color: D.muted, fontSize: 12 }}>🎮 Jogando {x.game}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {voice ? <VoiceBar ch={voiceCh} sv={voiceSv} mic={mic} deaf={deaf} setMic={setMic} setDeaf={setDeaf} leave={leaveVoice} screen={sharingHere} onScreen={toggleScreen} /> : null}
      </View>

      <MembersModal open={members} onClose={() => setMembers(false)} sv={sv} me={me} onUser={(n) => { setMembers(false); openUser(n); }} onCall={(n) => { setMembers(false); callUser(n); }} />
        <ArenaUserSheet name={userOpen} sv={sv} me={me} myRole={myRole} onClose={() => setUserOpen(null)} onCall={(n) => { setUserOpen(null); callUser(n); }} onMention={(n) => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}@${n} `)} />
        <CallPersonSheet name={callFor} sv={sv} me={me} onClose={() => setCallFor(null)} />
        <ScreenViewer tela={watching} onClose={() => setWatching(null)} />
        <InviteSheet open={inviting} sv={sv} me={me} onClose={() => setInviting(false)} />
        <SalaConfig open={cfgOpen} cfg={sv.cfg} nome={sv.name} onClose={() => setCfgOpen(false)} onSave={(cfg) => { update((s) => ({ ...s, cfg })); setCfgOpen(false); }} />
        <ModeracaoSheet
          open={modOpen}
          onClose={() => setModOpen(false)}
          cfg={sv.cfg}
          pessoas={sv.members.map((x) => x.name)}
          me={me}
          fallbackCargo={fbCargo}
          onCfg={(cfg) => update((s) => ({ ...s, cfg }))}
          onKick={(n) => arenaKick(sv.id, n)}
        />
        <EntrarComId open={idOpen} onClose={() => setIdOpen(false)} find={findById} me={me} />
        <SenhaSheet ask={senhaAsk} onClose={() => setSenhaAsk(null)} />

      <Modal visible={!!create} transparent animationType="fade" onRequestClose={() => setCreate(null)}><KeyboardLift style={{ flex: 1 }}>
        <View style={st.backdrop}>
          <View style={st.dialog}>
            <Text style={st.dialogTitle}>Criar servidor</Text>
            <Text style={{ color: D.muted, marginBottom: 10 }}>Seu espaço para jogar com a galera. Você é o dono.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {['🎮', '🔥', '⚽', '⛏️', '🏎️', '🔫', '🧙', '🏀', '♟️', '🕹️'].map((e) => (
                <TouchableOpacity key={e} onPress={() => setCreate({ ...create, emoji: e })} style={[st.emojiPick, create && create.emoji === e && { borderColor: D.gold }]}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={create ? create.name : ''} onChangeText={(t) => setCreate({ ...create, name: t })} placeholder="Nome do servidor" placeholderTextColor={D.muted} style={st.field} maxLength={40} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <TouchableOpacity onPress={() => setCreate(null)} style={{ padding: 10 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: D.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={makeServer} style={st.okBtn}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardLift></Modal>

      <Modal visible={!!newCh} transparent animationType="fade" onRequestClose={() => setNewCh(null)}><KeyboardLift style={{ flex: 1 }}>
        <View style={st.backdrop}>
          <View style={st.dialog}>
            <Text style={st.dialogTitle}>{newCh && newCh.kind === 'voice' ? 'Novo canal de voz' : 'Novo canal de texto'}</Text>
            <TextInput value={newCh ? newCh.name : ''} onChangeText={(t) => setNewCh({ ...newCh, name: t })} placeholder={newCh && newCh.kind === 'voice' ? 'Ex.: Squad 2' : 'Ex.: dicas'} placeholderTextColor={D.muted} style={st.field} maxLength={30} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <TouchableOpacity onPress={() => setNewCh(null)} style={{ padding: 10 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: D.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={makeChannel} style={st.okBtn}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardLift></Modal>
    </View>
  );
}

function VoiceBar({ ch, sv, mic, deaf, setMic, setDeaf, leave, screen, onScreen, cam, onCam }) {
  if (!ch) return null;
  return (
    <View style={st.voiceBar}>
      <Ionicons name="cellular" size={16} color={D.online} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ color: D.online, fontWeight: '800', fontSize: 13 }}>Conectado na voz</Text>
        <Text style={{ color: D.muted, fontSize: 12 }} numberOfLines={1}>{ch.name} · {sv && sv.name}</Text>
      </View>
      {/* Mutar o microfone (ninguém me ouve) e mutar o áudio (eu não ouço ninguém) */}
      <TouchableOpacity onPress={() => setMic(!mic)} style={st.vCol} accessibilityLabel={mic ? 'Mutar microfone' : 'Ligar microfone'}>
        <View style={[st.vBtn, !mic && { backgroundColor: '#FBE3E4' }]}>
          <Ionicons name={mic ? 'mic' : 'mic-off'} size={19} color={mic ? D.text : D.dnd} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.vLabel, !mic && { color: D.dnd }]}>{mic ? 'Mic' : 'Mic mudo'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDeaf(!deaf)} style={st.vCol} accessibilityLabel={deaf ? 'Ligar áudio' : 'Mutar áudio'}>
        <View style={[st.vBtn, deaf && { backgroundColor: '#FBE3E4' }]}>
          <Ionicons name={deaf ? 'volume-mute' : 'headset'} size={19} color={deaf ? D.dnd : D.text} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.vLabel, deaf && { color: D.dnd }]}>{deaf ? 'Áudio mudo' : 'Áudio'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCam} style={st.vCol} accessibilityLabel={cam ? 'Desligar a câmera' : 'Ligar a câmera para a sala'}>
        <View style={[st.vBtn, cam && { backgroundColor: '#E6F6EC' }]}>
          <Ionicons name={cam ? 'videocam' : 'videocam-outline'} size={19} color={cam ? D.online : D.text} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.vLabel, cam && { color: D.online }]}>{cam ? 'Câmera on' : 'Câmera'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onScreen} style={st.vCol} accessibilityLabel={screen ? 'Parar de mostrar a tela' : 'Mostrar minha tela para a sala'}>
        <View style={[st.vBtn, screen && { backgroundColor: '#E6F6EC' }]}>
          <Ionicons name={screen ? 'tv' : 'tv-outline'} size={19} color={screen ? D.online : D.text} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.vLabel, screen && { color: D.online }]}>{screen ? 'Na tela' : 'Tela'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={leave} style={st.vCol} accessibilityLabel="Sair da voz">
        <View style={[st.vBtn, { backgroundColor: D.dnd }]}>
          <Ionicons name="call" size={17} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.vLabel}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

function MembersModal({ open, onClose, sv, me, onUser, onCall }) {
  const groups = ['dono', 'mod', 'membro'];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={onClose} />
      <View style={st.sheet}>
        <Text style={st.dialogTitle}>Membros · {sv.name}</Text>
        <Text style={{ color: D.muted, fontSize: 12, marginBottom: 4 }}>Toque numa pessoa para silenciar, ajustar o volume, ignorar, bloquear ou adicionar. Segure o nome para convidar para chamada.</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {groups.map((g) => {
            const list = sv.members.filter((x) => x.role === g);
            if (!list.length) return null;
            return (
              <View key={g}>
                <Text style={st.cat}>{ROLE[g].label.toUpperCase()} — {list.length}</Text>
                {list.map((x) => (
                  <TouchableOpacity key={x.name} style={st.playing} onPress={() => x.name !== me && onUser && onUser(x.name)} onLongPress={() => x.name !== me && onCall && onCall(x.name)} activeOpacity={x.name === me ? 1 : 0.7} accessibilityLabel={`Opções de ${x.name}. Segure para convidar para chamada`}>
                    <Avatar name={x.name} status={x.status} size={34} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: ROLE[g].color }}>{x.name} <Ionicons name="shield-checkmark" size={12} color={D.gold} /></Text>
                      <Text style={{ color: D.muted, fontSize: 12 }}>{x.game ? `🎮 Jogando ${x.game}` : x.status === 'idle' ? 'Ausente' : x.status === 'dnd' ? 'Não perturbe' : 'Online'}</Text>
                    </View>
                    {arenaPref(x.name).blocked ? <Text style={{ color: D.dnd, fontSize: 11, fontWeight: '700' }}>Bloqueado</Text> : arenaPref(x.name).muted ? <Ionicons name="volume-mute" size={16} color={D.dnd} /> : arenaPref(x.name).ignored ? <Ionicons name="eye-off-outline" size={16} color={D.muted} /> : x.name !== me ? <Ionicons name="ellipsis-horizontal" size={16} color={D.muted} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

const st = StyleSheet.create({
  liveTag: { marginLeft: 8, backgroundColor: '#E5484D', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
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
  vBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1ECDD' },
  vCol: { alignItems: 'center', marginLeft: 8, minWidth: 46 },
  vLabel: { color: D.muted, fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  reactBox: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 30, paddingHorizontal: 8 },
  dialog: { backgroundColor: '#fff', borderRadius: 18, padding: 18, alignSelf: 'stretch' },
  dialogTitle: { fontWeight: '800', fontSize: 17, color: D.text, marginBottom: 6 },
  emojiPick: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', margin: 3, backgroundColor: '#F7F5EF' },
  field: { borderWidth: 1, borderColor: '#E3DCC8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: D.text },
  okBtn: { backgroundColor: D.gold, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginLeft: 8 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 30 },
});
