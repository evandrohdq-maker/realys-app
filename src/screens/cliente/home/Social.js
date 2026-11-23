import React, { useEffect, useRef, useState } from 'react';
import { isServerUserId } from '../../../openPerson';
import { openServerProfile } from '../../../components/ServerProfile';
import { KeyboardLift } from '../../../keyboard';
import { moderateText, antiDesvio } from '../../../moderation';
import { usePrivateScreen } from '../../../privacyGuard';
import { registerLive, useVideoRotate } from '../../../pip';
import { giftPoints } from '../../../rewards';
import GiftIcon from '../../../components/GiftIcon';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Alert, Animated, Easing, PanResponder, Dimensions, AppState } from 'react-native';
import { Text, TextInput } from '../../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, brl, soft } from '../../../theme';
import { LIVE_GIFTS, LIVE_GIFT_QTY, liveGiftCost, liveGiftOf } from '../../../gifts';
import { Photo } from '../../../components/ui';
import { liveComments, lives as LIVES } from '../../../homeData';
import { useStore } from '../../../store';
import { HostChip, useOpenHost } from '../../../components/HostChip';
import { LIVE_CATS, hostOptions, defaultHost, catOf, subOf, HOST_TYPES, missionId, LIVE_MISSION_SECS, LIVE_MISSION_POINTS, liveScore } from '../../../liveData';
import { members } from '../../../people';
import { artists } from '../../../extraData';
import { storeChat, storeOfContact } from '../../../storeTrust';
import { BLOCK_TEXT } from '../../../orderContact';
import { LiveStage, openRealLive, endRealLive, realLivesOf } from '../../../components/LiveVideo';
import { serverOn, api, connectEvents } from '../../../api';
import { setOpeningCurtain, onScreenPauseChange } from '../../../screenShare';
import { webrtcOk, openPip, closePip } from '../../../video';
import { setLiveKeep } from '../../../liveKeep';
import { useArena, arenaVoiceRooms, arenaRoom, arenaServerOf, joinArenaVoice, leaveArenaVoice } from '../../../arena';

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Conversa com histórico de mensagens.
export function ChatModal({ contact, messages, visible, onClose, onSend, onVideo, hideVoice, blocked, onBlocked }) {
  usePrivateScreen(!!visible, 'chat');
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [peek, setPeek] = useState(false); // prévia de quem não tem perfil no Realyz
  const [voice, setVoice] = useState(false); // chamada de voz
  const scroll = useRef(null);
  if (!contact) return null;

  // Tocar no nome ou na foto: abre o perfil da pessoa (publicações, depoimentos, adicionar amigo)
  // ou a página da empresa. A conversa continua aberta por baixo: voltar do perfil volta para cá.
  const openContact = () => {
    if (state.viewProfile === contact.id) return onClose(); // a conversa foi aberta pelo próprio perfil
    // Conta real: sempre o perfil social (galeria, mural, publicações), mesmo se for prestador.
    if (isServerUserId(contact.id)) return openServerProfile(contact.id);
    // Prestador de serviço: só a prévia do perfil de trabalho (sem adicionar).
    const pv = (state.providers || []).find((x) => x.id === contact.id || x.name === contact.name);
    if (pv) return dispatch({ type: 'PREVIEW_PROVIDER', id: pv.id });
    if (members.some((m) => m.id === contact.id)) return dispatch({ type: 'OPEN_PROFILE', id: contact.id });
    const co =
      artists.find((a) => a.id === contact.id || a.name === contact.name) ||
      (state.stores || []).find((x) => x.id === contact.id || x.name === contact.name);
    if (co) return dispatch({ type: 'OPEN_COMPANY', id: co.id });
    setPeek(true);
  };
  const friendSt = state.friends[contact.id];
  // Loja: o cliente só escreve dentro de um pedido em andamento (ou quando a loja chamou primeiro).
  // Ligação e vídeo com loja não existem para o cliente: tudo fica registrado no pedido.
  const store = storeOfContact(state, contact);
  const storeRule = store ? storeChat(state, store) : { open: true };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    // Anti-desvio: com empresa, prestador ou quem ainda não aceitou o contato, nada de telefone,
    // Pix ou "por fora" (vale até entre amigos, se um dos dois vende). Entre amigos comuns, a conversa é livre.
    const business = (state.providers || []).some((x) => x.id === contact.id || x.name === contact.name) || (state.stores || []).some((x) => x.id === contact.id || x.name === contact.name) || contact.business;
    const iSell = !!state.myProvider || (state.user && (state.user.roles || []).some((r) => r === 'empresa' || r === 'prestador' || r === 'fornecedor'));
    // Conversa do pedido com a loja: telefone bloqueia a conversa inteira (vai para o suporte do Realyz).
    if (onBlocked) {
      const ad = antiDesvio(t);
      if (!ad.ok && ad.what === 'telefone') {
        setText('');
        onBlocked();
        return Alert.alert('Conversa bloqueada 🔒', BLOCK_TEXT);
      }
    }
    if (business || iSell || friendSt !== 'amigo') {
      const ad = antiDesvio(t);
      if (!ad.ok) return Alert.alert('Fica tudo no Realyz 🔒', ad.why);
    }
    onSend({ from: 'me', text: t, time: now() });
    setText('');
    // Resposta automática só para a demonstração parecer viva.
    setTimeout(() => onSend({ from: 'them', text: 'Recebi! Já te respondo 😉', time: now() }), 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.chatHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={openContact} activeOpacity={0.7} accessibilityLabel={`Ver o perfil de ${contact.name}`}>
            <Photo uri={contact.photo} style={styles.headAvatar} fallback="🙂" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headName}>{contact.name}</Text>
              <Text style={styles.headStatus}>{contact.status ? `${contact.status} · ` : ''}ver perfil</Text>
            </View>
          </TouchableOpacity>
          {hideVoice || store ? null : (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setVoice(true)}
              accessibilityLabel="Chamada de voz"
            >
              <Ionicons name="call-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
          )}
          {/* Sem onVideo (ex.: no Date, com a pessoa offline) o botão de vídeo não aparece. */}
          {onVideo && !store ? (
            <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={onVideo} accessibilityLabel="Chamar por vídeo">
              <Ionicons name="videocam-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: true })}
        >
          <Text style={styles.secure}>
            <Ionicons name="lock-closed" size={11} color={colors.muted} /> Conversa protegida · só pessoas verificadas
          </Text>
          {messages.map((m, i) => m.from === 'system' ? (
            <Text key={i} style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginVertical: 8, marginHorizontal: 16, lineHeight: 17 }}>{m.text}</Text>
          ) : (
            <View key={i} style={[styles.bubble, m.from === 'me' ? styles.mine : styles.theirs]}>
              <Text style={{ color: m.from === 'me' ? colors.onPrimary : colors.text, fontSize: 15 }}>{m.text}</Text>
              <Text style={[styles.time, m.from === 'me' && { color: 'rgba(255,255,255,0.8)' }]}>{m.time}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Prévia de quem não tem perfil aberto no Realyz (ex.: anunciante): adicionar aos contatos. */}
        <Modal visible={peek} transparent animationType="fade" onRequestClose={() => setPeek(false)}><KeyboardLift style={{ flex: 1 }}>
          <TouchableOpacity style={styles.peekBack} activeOpacity={1} onPress={() => setPeek(false)}>
            <View style={styles.peekCard}>
              <Photo uri={contact.photo} style={styles.peekAvatar} fallback="🙂" />
              <Text style={styles.peekName}>{contact.name}</Text>
              {contact.status ? <Text style={styles.headStatus}>{contact.status}</Text> : null}
              <Text style={styles.peekNote}>Essa pessoa ainda não tem um perfil público no Realyz.</Text>
              <TouchableOpacity
                style={[styles.peekBtn, friendSt && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary }]}
                onPress={() => dispatch({ type: 'FRIEND', id: contact.id, status: friendSt ? null : 'enviado' })}
                accessibilityLabel={friendSt ? 'Remover dos contatos' : 'Adicionar aos contatos'}
              >
                <Ionicons name={friendSt ? 'checkmark' : 'person-add'} size={16} color={friendSt ? colors.primary : colors.onPrimary} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.peekBtnText, friendSt && { color: colors.primary }]}>{friendSt ? 'Nos seus contatos' : 'Adicionar contato'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardLift></Modal>

        {blocked ? (
          <View style={[styles.composer, { paddingBottom: 10 + insets.bottom, alignItems: 'center' }]}>
            <Ionicons name="lock-closed" size={16} color={colors.danger || '#C0392B'} />
            <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 }}>{BLOCK_TEXT}</Text>
          </View>
        ) : !storeRule.open ? (
          <View style={[styles.composer, { paddingBottom: 10 + insets.bottom, alignItems: 'center' }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 }}>{storeRule.why}</Text>
            <TouchableOpacity onPress={() => { onClose(); dispatch({ type: 'OPEN_COMPANY', id: store.id }); }} accessibilityLabel={`Abrir a página de ${store.name}`}>
              <Text numberOfLines={1} style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Ver loja</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={[styles.composer, { paddingBottom: 10 + insets.bottom }]}>
          <TextInput
            style={styles.composerInput}
            placeholder="Escreva uma mensagem"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} accessibilityLabel="Enviar">
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
        )}
      </KeyboardLift>
      <VideoCallModal audio contact={contact} visible={voice} onClose={() => setVoice(false)} />
    </Modal>
  );
}

// Chamada de vídeo entre usuários (demonstração visual; a real precisa do servidor).
// Chamada de voz: a mesma tela de chamada, sem câmera.
export function VoiceCallModal(props) {
  return <VideoCallModal {...props} audio />;
}

// audio: chamada só de voz (sem câmera). onEnd(segundos) avisa quanto durou.
export function VideoCallModal({ contact, visible, onClose, audio = false, onEnd }) {
  usePrivateScreen(!!visible, 'chamada');
  const insets = useSafeAreaInsets();
  const [secs, setSecs] = useState(0);
  const [connected, setConnected] = useState(false);
  const [mute, setMute] = useState(false);
  const [cam, setCam] = useState(true);
  const [speaker, setSpeaker] = useState(false);
  const hang = () => {
    if (onEnd && connected) onEnd(Math.max(0, secs - 2));
    onClose();
  };

  const { dispatch: callDispatch } = useStore();
  useEffect(() => {
    if (!visible) return;
    // Contato com conta no servidor: chamada de verdade (vídeo ou só voz), direto entre os celulares.
    if (contact && contact.serverId && serverOn() && webrtcOk()) {
      callDispatch({ type: 'START_VIDEO_CALL', to: contact.serverId, name: contact.name, kind: audio ? 'audio' : 'video', ctx: contact.ctx || null });
      onClose();
      return;
    }
    setSecs(0);
    setConnected(false);
    const c = setTimeout(() => setConnected(true), 1800);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      clearTimeout(c);
      clearInterval(t);
    };
  }, [visible]);

  if (!contact) return null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={hang}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#03050A' }}>
        {audio ? null : <Photo uri={contact.photo ? contact.photo.replace('200/200', '800/1400') : null} style={StyleSheet.absoluteFill} fallback="🙂" />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: connected ? 'rgba(3,5,10,0.15)' : 'rgba(3,5,10,0.7)' }]} />

        <View style={{ paddingTop: insets.top + 24, alignItems: 'center' }}>
          <Text style={styles.callName}>{contact.name}</Text>
          <Text style={styles.callStatus}>{connected ? `${audio ? 'Chamada de voz' : 'Chamada de vídeo'} · ${mmss(Math.max(0, secs - 2))}` : contact.ctx === 'date' ? 'Convite enviado · esperando entrar…' : 'Chamando…'}</Text>
        </View>

        {audio ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Photo uri={contact.photo} style={{ width: 130, height: 130, borderRadius: 65 }} fallback="🙂" />
            <Ionicons name="call" size={22} color="rgba(255,255,255,0.7)" style={{ marginTop: 18 }} />
          </View>
        ) : null}
        <View style={[styles.selfTile, { top: insets.top + 100 }, audio && { display: 'none' }]}>
          {cam ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={34} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Você</Text>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam-off" size={26} color={colors.muted} />
            </View>
          )}
        </View>

        <View style={[styles.callBar, { bottom: 30 + insets.bottom }]}>
          <CallBtn icon={mute ? 'mic-off' : 'mic'} on={mute} onPress={() => setMute(!mute)} label={mute ? 'Ativar microfone' : 'Silenciar'} />
          {audio ? (
            <CallBtn icon={speaker ? 'volume-high' : 'volume-medium'} on={speaker} onPress={() => setSpeaker(!speaker)} label="Viva-voz" />
          ) : (
            <>
              <CallBtn icon={cam ? 'videocam' : 'videocam-off'} on={!cam} onPress={() => setCam(!cam)} label="Câmera" />
            </>
          )}
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#FF5A5F' }]} onPress={hang} accessibilityLabel="Encerrar chamada">
            <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardLift></Modal>
  );
}

function CallBtn({ icon, on, onPress, label }) {
  return (
    <TouchableOpacity style={[styles.callBtn, on && { backgroundColor: "#FFFFFF" }]} onPress={onPress} accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={on ? colors.dark : "#FFFFFF"} />
    </TouchableOpacity>
  );
}

// Assistir uma live ou abrir a sua própria (mine = true).
// Ordem das lives ao puxar para cima: patrocinada primeiro, depois a mais assistida (igual à lista).
const liveRank = (a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || liveScore(b) - liveScore(a);

export function LiveModal({ live: liveProp, mine, visible, onClose, userName }) {
  const insets = useSafeAreaInsets();
  // Assistindo: a live gira com o celular. Deitou (ou tocou em tela cheia), só o vídeo na tela inteira.
  const rot = useVideoRotate(!!visible && !mine);
  const full = rot.full;
  // Assistindo: puxar para cima passa para a próxima live do MESMO segmento (Gamers → próxima de Gamers);
  // puxar para baixo volta para a anterior. A tela acompanha o dedo, como nos Reels.
  const [live, setCurLive] = useState(liveProp);
  useEffect(() => {
    if (visible) setCurLive(liveProp);
  }, [visible, liveProp && liveProp.id]);
  // Com o servidor no ar, as lives transmitidas de verdade no segmento vêm primeiro (atualiza a cada 20 s);
  // depois as de exemplo. Sem servidor, só as de exemplo.
  const { state: stQ } = useStore();
  const [realQ, setRealQ] = useState([]);
  const segCat = !mine && live ? live.cat : null;
  useEffect(() => {
    if (!visible || !segCat) return setRealQ([]);
    let alive = true;
    const load = () => realLivesOf(segCat).then((l) => alive && setRealQ(l));
    load();
    const t = setInterval(load, 20000);
    return () => ((alive = false), clearInterval(t));
  }, [visible, segCat]);
  const queue = segCat
    ? [...realQ.filter((l) => l.hostId !== (stQ.user && stQ.user.id)).sort(liveRank), ...LIVES.filter((l) => l.cat === segCat && !l.mine).sort(liveRank)]
    : [];
  const [swipeHint, setSwipeHint] = useState(null);
  const slide = useRef(new Animated.Value(0)).current;
  const swipeRef = useRef(null);
  swipeRef.current = (dir) => {
    const H = Dimensions.get('window').height;
    if (queue.length < 2) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();
      setSwipeHint(`Só tem esta live em ${catOf(live.cat).label} agora`);
      setTimeout(() => setSwipeHint(null), 1800);
      return;
    }
    const i = Math.max(0, queue.findIndex((l) => l.id === live.id));
    const nx = queue[(i + (dir > 0 ? 1 : queue.length - 1)) % queue.length];
    Animated.timing(slide, { toValue: dir > 0 ? -H : H, duration: 180, useNativeDriver: true }).start(() => {
      setCurLive(nx);
      slide.setValue(dir > 0 ? H : -H);
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dy) > 18 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6,
      onPanResponderMove: (e, g) => slide.setValue(g.dy * 0.6),
      onPanResponderRelease: (e, g) => {
        if (g.dy < -90 || g.vy < -0.8) swipeRef.current(1);
        else if (g.dy > 90 || g.vy > 0.8) swipeRef.current(-1);
        else Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start(),
    })
  ).current;
  const [title, setTitle] = useState('');
  const [onAir, setOnAir] = useState(!mine);
  const [viewers, setViewers] = useState(live ? live.viewers : 0);
  const [secs, setSecs] = useState(0);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [liked, setLiked] = useState(0);
  // Presentes na live: bandeja para escolher, animação na tela e quanto eu ganhei nesta live.
  const [tray, setTray] = useState(false);
  const [pick, setPick] = useState('rosa');
  const [qty, setQty] = useState(1);
  const [earned, setEarned] = useState(0);
  const [burst, setBurst] = useState(null);
  const burstAnim = useRef(new Animated.Value(0)).current;
  const { state, dispatch } = useStore();
  // Live de outra pessoa aberta em tela cheia: ao sair do app, ela vira o player da janelinha
  // por cima dos outros apps (src/pip.js, PipManager), e volta em tela cheia ao tocar nela.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!visible || mine || !live) return;
    return registerLive({ minimize: () => (closeRef.current && closeRef.current(), dispatch({ type: 'LIVE_MINIMIZE', live })) });
  }, [visible, mine, live && live.id]);
  const showBurst = (g, q, who) => {
    setBurst({ gift: g, emoji: g.emoji, text: `${who} enviou ${g.name}${q > 1 ? ` x${q}` : ''}`, at: Date.now() });
    burstAnim.setValue(0);
    Animated.timing(burstAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setBurst(null));
  };
  const openHost = useOpenHost();
  // Minha live: o assunto e o perfil com que eu transmito (usuário, empresa, prestador, fornecedor, artista).
  const [cat, setCat] = useState('comunidade');
  const [sub, setSub] = useState(null);
  const [host, setHost] = useState(null);
  const hosts = hostOptions(state);
  const me = host || defaultHost(state);
  const type = cat === 'cursos' || cat === 'faculdades' ? 'aula' : cat === 'compras' ? 'venda' : 'papo';
  // Live de verdade (servidor de vídeo contratado): id da live no servidor.
  const [realId, setRealId] = useState(null);
  // Só no computador: minha câmera numa janelinha do navegador (Picture-in-Picture). A tela da live some,
  // dá para navegar no Realyz e a transmissão continua. Fechar a janelinha volta para a live.
  const [mini, setMini] = useState(false);
  const podePip = !!(mine && onAir && realId && source === 'camera' && openPip && Platform.OS === 'web' && Dimensions.get('window').width >= 1000);
  const abrirPip = async () => {
    const w = await openPip('minha-live', () => setMini(false));
    if (w) setMini(true), setLiveKeep(true);
    else Alert.alert('Janelinha', 'Este navegador não deixou abrir a janelinha. No Chrome ou no Edge funciona.');
  };
  // Fonte da live: câmera ou a tela do celular (lives de jogos).
  const [source, setSource] = useState('camera');
  // Cortina ao abrir o jogo: tempo (s) que a tela fica escondida depois de sair do Realyz,
  // para a tela inicial e os aplicativos do celular não aparecerem na live.
  const [curtainSecs, setCurtainSecs] = useState(10);
  const [myPause, setMyPause] = useState(null); // 'abrindo' | motivo de segurança | null
  const [remotePause, setRemotePause] = useState(null); // quem assiste: a tela do streamer está pausada
  // Jogar com o time: sala de voz da Arena Gamer em que entro ao abrir a live (sem precisar de outro app).
  const arena = useArena();
  const [team, setTeam] = useState(null); // { sid, cid }
  const [teamMic, setTeamMic] = useState(true);
  const myName = (state.user && state.user.name) || 'Você';
  const teamRooms = mine && !onAir ? arenaVoiceRooms(myName).slice(0, 6) : [];
  const teamRoom = mine && onAir && team ? arenaRoom(arena.voice) : null;
  const close = () => {
    if (mini) closePip();
    setMini(false);
    setLiveKeep(false);
    if (mine && onAir && team) leaveArenaVoice(myName);
    if (mine && onAir) dispatch({ type: 'LIVE_END' });
    if (realId) endRealLive(realId);
    setRealId(null);
    onClose();
  };
  const start = () => {
    const sb = subOf(cat, sub);
    const liveTitle = title.trim() || (sb ? sb.label : catOf(cat).title);
    dispatch({ type: 'LIVE_START', live: { cat, sub: sb ? sb.key : null, hostType: me.type, hostId: me.id, host: me.name, title: liveTitle, viewers: 0, tag: sb ? sb.label : catOf(cat).label, photo: null, sponsored: false } });
    setOnAir(true);
    if (team) joinArenaVoice(team.sid, team.cid, myName);
    // Com o servidor de vídeo contratado, abre a live de verdade e a câmera passa a transmitir.
    openRealLive({ title: liveTitle, cat, hostType: me.type, source })
      .then((id) => id && setRealId(id))
      .catch((e) => Alert.alert('Live', (e && e.message) || 'Não foi possível abrir a live no servidor.'));
  };

  useEffect(() => {
    if (!visible) return;
    setOnAir(!mine);
    setRealId(null);
    setSource('camera');
    setTeam(null);
    setTeamMic(true);
    setViewers(liveProp ? liveProp.viewers : 0);
    setSecs(0);
    setComments([]);
    setLiked(0);
    setTray(false);
    setQty(1);
    setEarned(0);
    setBurst(null);
    slide.setValue(0);
    // Dica rápida ao abrir a live de outra pessoa: puxar para cima passa para a próxima do segmento.
    if (!mine && liveProp && liveProp.cat) {
      setSwipeHint(`Puxe para cima: próxima live de ${catOf(liveProp.cat).label}`);
      const t = setTimeout(() => setSwipeHint(null), 2600);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Trocou de live puxando para cima/baixo: plateia, comentários e presentes são os da live nova.
  const lastLiveId = useRef(null);
  useEffect(() => {
    if (!visible || mine || !live) return;
    if (lastLiveId.current && lastLiveId.current !== live.id) {
      setViewers(live.viewers || 0);
      setComments([]);
      setLiked(0);
      setTray(false);
      setBurst(null);
    }
    lastLiveId.current = live.id;
  }, [visible, live && live.id]);

  // Missão do dia: 3 minutos assistindo lives da classe dão pontos Realyz (uma vez por dia e por classe).
  useEffect(() => {
    if (mine || !live || secs !== LIVE_MISSION_SECS) return;
    dispatch({ type: 'AD_REWARD', id: missionId(live.cat), points: LIVE_MISSION_POINTS, desc: `lives de ${catOf(live.cat).label}` });
  }, [secs]);

  useEffect(() => {
    // Live de verdade: plateia, comentários e presentes são reais (nada simulado).
    if (!visible || !onAir || realId || (live && live.real)) return;
    const names = ['Ana', 'Diego', 'Lívia', 'Rogério', 'Paula', 'Marcos', 'Bia'];
    const t = setInterval(() => {
      setViewers((v) => v + Math.floor(Math.random() * (mine ? 3 : 6)) - (mine ? 0 : 1));
    }, 1000);
    const c = setInterval(() => {
      const who = names[Math.floor(Math.random() * names.length)];
      // De vez em quando alguém da plateia manda um presente (mais os pequenos, às vezes um grande).
      if (Math.random() < (mine ? 0.28 : 0.15)) {
        const g = LIVE_GIFTS[Math.min(LIVE_GIFTS.length - 1, Math.floor(Math.random() ** 2.4 * LIVE_GIFTS.length))];
        const q = Math.random() < 0.25 ? 5 : 1;
        setComments((cs) => [...cs.slice(-5), { who, what: `enviou ${g.name}${q > 1 ? ` x${q}` : ''}`, gift: true, g }]);
        if (mine) {
          // Na minha live o presente vira crédito de live na hora.
          dispatch({ type: 'RECEIVE_LIVE_GIFT', from: who, gift: g.key, qty: q });
          setEarned((e) => +(e + liveGiftCost(g, q).net).toFixed(2));
        }
        if (g.value >= 10) showBurst(g, q, who);
        return;
      }
      const what = liveComments[Math.floor(Math.random() * liveComments.length)];
      setComments((cs) => [...cs.slice(-5), { who, what }]);
    }, 2200);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [visible, onAir, realId]);

  // Saiu da tela da live (fechou ou desmontou): a aba não precisa mais ficar guardada.
  useEffect(() => () => setLiveKeep(false), []);
  useEffect(() => {
    if (!visible) setLiveKeep(false);
  }, [visible]);

  // Relógio da live: anda sempre que a live está no ar, inclusive nas de verdade (antes ficava em 00:00).
  useEffect(() => {
    if (!visible || !onAir) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [visible, onAir]);

  // Live de jogo (tela): com o Realyz aberto a tela fica escondida; ao sair, espera o tempo da cortina
  // (passar pela tela inicial e abrir o jogo) e só então libera. Voltou ao Realyz: esconde de novo.
  const screenLive = !!(visible && mine && onAir && source === 'tela');
  useEffect(() => {
    if (!screenLive) return;
    let timer = null;
    setOpeningCurtain(AppState.currentState === 'active');
    const sub = AppState.addEventListener('change', (st) => {
      clearTimeout(timer);
      if (st === 'active') setOpeningCurtain(true);
      else timer = setTimeout(() => setOpeningCurtain(false), curtainSecs * 1000);
    });
    const off = onScreenPauseChange((by) => setMyPause(by));
    return () => {
      clearTimeout(timer);
      sub.remove();
      off();
      setOpeningCurtain(false);
      setMyPause(null);
    };
  }, [screenLive, curtainSecs]);
  // Com o servidor no ar: avisa quem está assistindo (aparece "abrindo o jogo, já volta" no lugar da tela).
  useEffect(() => {
    if (!screenLive || !realId) return;
    api('POST', `/lives/${realId}/pause`, { paused: !!myPause, motivo: myPause === 'abrindo' ? 'abrindo' : 'seguranca' }).catch(() => {});
  }, [screenLive, realId, myPause]);
  // Quem assiste uma live de verdade: recebe a pausa na hora.
  useEffect(() => {
    if (!visible || mine || !live || !live.real) return setRemotePause(null);
    setRemotePause(live.paused || null);
    if (!serverOn()) return;
    return connectEvents((e) => {
      if (e && e.type === 'live-pausa' && e.data && e.data.liveId === live.id) setRemotePause(e.data.paused || null);
    });
  }, [visible, mine, live && live.id]);

  const gift = liveGiftOf(pick);
  const cost = liveGiftCost(gift, qty);
  const sendGift = () => {
    if (!live) return;
    if (cost.total > state.wallet)
      return Alert.alert('Saldo insuficiente', `Esse presente custa ${brl(cost.total)}. Deposite saldo na carteira. (Créditos de presente não servem para presentear.)`);
    // Live de verdade (servidor): o presente sai da carteira do servidor e chega ao streamer na hora.
    if (live.real && state.user && state.user.serverId) {
      api('POST', `/lives/${live.id}/gifts`, { gift: gift.key, qty })
        .then((r) => api('GET', '/wallet').then((w) => dispatch({ type: 'SERVER_WALLET', balance: w.balance, giftCredits: w.giftCredits })))
        .catch((e) => Alert.alert('Presente não enviado', e.message));
    } else dispatch({ type: 'SEND_LIVE_GIFT', live, gift: gift.key, qty });
    setComments((cs) => [...cs.slice(-5), { who: userName || 'Você', g: gift, what: `enviou ${gift.name}${qty > 1 ? ` x${qty}` : ''}`, gift: true }]);
    showBurst(gift, qty, 'Você');
    setTray(false);
  };

  // Site no computador: a live fica numa moldura com cantos arredondados e borda dourada suave
  // (no celular e em tela cheia, continua ocupando a tela toda).
  const deskLive = Platform.OS === 'web' && Dimensions.get('window').width >= 1000 && !full;

  const send = () => {
    if (!text.trim()) return;
    const m = moderateText(text, 'publico');
    if (!m.ok) return Alert.alert('Não foi enviado', m.why);
    setComments((cs) => [...cs.slice(-5), { who: userName || 'Você', what: text.trim() }]);
    setText('');
  };

  return (
    <Modal videoHost deskFull={full} deskHidden={mini} visible={visible} animationType="slide" supportedOrientations={['portrait', 'landscape']} onRequestClose={full ? rot.exit : close}><KeyboardLift style={{ flex: 1, backgroundColor: deskLive ? '#F1EBDD' : '#03050A' }}>
      <Animated.View style={[{ flex: 1, backgroundColor: '#03050A', transform: [{ translateY: slide }] }, deskLive && styles.liveDesk]} {...(mine || full ? {} : swipe.panHandlers)}>
        {live ? <Photo uri={live.photo ? live.photo.replace('800/500', '800/1400') : null} style={StyleSheet.absoluteFill} fallback="🎥" /> : null}
        {mine ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#14120E' }]}>
            <Ionicons name="videocam-outline" size={64} color="rgba(168,121,10,0.35)" />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Prévia da sua câmera</Text>
          </View>
        ) : null}
        {/* Vídeo de verdade: minha câmera transmitindo, ou a live que estou assistindo. */}
        <LiveStage liveId={mine ? realId : live && live.real ? live.id : null} mine={mine} onAir={onAir} screen={mine && source === 'tela'} viewScreen={!mine && live && live.source === 'tela'} onError={(m) => Alert.alert('Vídeo da live', m)} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,10,0.25)' }]} pointerEvents="none" />
        {/* Tela cheia (celular deitado): só o vídeo, o AO VIVO e o botão de sair da tela cheia. */}
        {full ? (
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'flex-start', padding: 14 }]} pointerEvents="box-none">
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>AO VIVO</Text>
            </View>
            {live ? <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', marginLeft: 10, flexShrink: 1, marginTop: 3 }}>{live.host}</Text> : null}
            <View style={{ flex: 1 }} />
            {!mine && live ? (
              <TouchableOpacity style={[styles.iconBtnDark, { marginRight: 8 }]} onPress={() => swipeRef.current && swipeRef.current(1)} accessibilityLabel="Próxima live">
                <Ionicons name="play-skip-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            {!mine && live ? (
              <TouchableOpacity
                style={[styles.iconBtnDark, { marginRight: 8 }]}
                accessibilityLabel="Minimizar a live numa janelinha"
                onPress={() => {
                  rot.exit();
                  onClose();
                  dispatch({ type: 'LIVE_MINIMIZE', live });
                }}
              >
                <Ionicons name="remove" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.iconBtnDark} onPress={rot.exit} accessibilityLabel="Sair da tela cheia (Esc)">
              <Ionicons name="contract" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, full && { display: 'none' }]} pointerEvents="box-none">

        <View style={[styles.liveTop, { paddingTop: insets.top + 12 }]}>
          {onAir ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>AO VIVO</Text>
            </View>
          ) : null}
          {onAir ? (
            <View style={styles.viewers}>
              <Ionicons name="eye" size={13} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{viewers.toLocaleString('pt-BR')}</Text>
            </View>
          ) : null}
          {onAir && mine ? <Text style={{ color: "#FFFFFF", fontWeight: '700', marginLeft: 8 }}>{mmss(secs)}</Text> : null}
          {onAir && mine ? (
            <View style={styles.earned} accessibilityLabel={`Presentes recebidos nesta live: ${brl(earned)}`}>
              <Ionicons name="gift" size={13} color="#0B1124" />
              <Text style={styles.earnedText}>{brl(earned)}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {/* Próxima live do mesmo segmento (o mesmo que puxar para cima). */}
          {!mine && live ? (
            <TouchableOpacity style={[styles.iconBtnDark, { marginRight: 8 }]} onPress={() => swipeRef.current && swipeRef.current(1)} accessibilityLabel="Próxima live">
              <Ionicons name="play-skip-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {!mine && live ? (
            <TouchableOpacity style={[styles.iconBtnDark, { marginRight: 8 }]} onPress={rot.enter} accessibilityLabel="Tela cheia">
              <Ionicons name="expand" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {!mine && live ? (
            <TouchableOpacity
              style={[styles.iconBtnDark, { marginRight: 8 }]}
              accessibilityLabel="Minimizar a live numa janelinha"
              onPress={() => {
                // A live vira uma janelinha flutuante: dá para mexer no resto do app e voltar com um toque.
                onClose();
                dispatch({ type: 'LIVE_MINIMIZE', live });
              }}
            >
              <Ionicons name="remove" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {podePip ? (
            <TouchableOpacity style={[styles.iconBtnDark, { marginRight: 8 }]} onPress={abrirPip} accessibilityLabel="Janelinha: continuar ao vivo e navegar no Realyz">
              <Ionicons name="albums-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.iconBtnDark} onPress={close} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {teamRoom ? (
          <View style={styles.teamBar} accessibilityLabel={`Sala de voz ${teamRoom.room}, ${teamRoom.people.length} na sala`}>
            <Ionicons name="volume-high" size={16} color="#fff" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.teamTitle} numberOfLines={1}>{teamRoom.room} · {teamRoom.server}</Text>
              <Text style={styles.teamSub} numberOfLines={1}>{teamRoom.people.length > 1 ? teamRoom.people.map((n) => (n === myName ? 'Você' : n.split(' ')[0])).join(', ') : 'Só você na sala por enquanto'}</Text>
            </View>
            <TouchableOpacity onPress={() => setTeamMic((v) => !v)} style={[styles.teamMic, !teamMic && { backgroundColor: '#E5484D' }]} hitSlop={8} accessibilityLabel={teamMic ? 'Desligar meu microfone na sala' : 'Ligar meu microfone na sala'}>
              <Ionicons name={teamMic ? 'mic' : 'mic-off'} size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}

        {!mine && live ? (
          <View style={styles.hostRow}>
            <Text style={styles.hostName}>{live.host}</Text>
            <Text style={styles.liveTitle}>{live.title}</Text>
            {live.cat === 'gamers' ? (
              <TouchableOpacity
                style={styles.serverBtn}
                activeOpacity={0.85}
                accessibilityLabel={`Entrar no servidor de ${live.host} na Arena Gamer`}
                onPress={() => {
                  const sv = arenaServerOf(live.host);
                  onClose();
                  setTimeout(() => dispatch({ type: 'NAV_REQUEST', go: { tab: 'arena', server: sv ? sv.id : undefined } }), 250);
                }}
              >
                <Ionicons name="game-controller" size={14} color="#fff" />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.serverBtnText}>Entrar no servidor do streamer</Text>
              </TouchableOpacity>
            ) : null}
            {live.hostType ? (
              <HostChip
                live={live}
                dark
                onOpen={(l) => {
                  onClose();
                  setTimeout(() => openHost(l), 250);
                }}
              />
            ) : null}
          </View>
        ) : null}

        {mine && !onAir ? (
          <View style={styles.goLive}>
            <Text style={styles.goLiveTitle}>Abrir uma live</Text>
            <Text style={{ color: colors.muted, marginBottom: 12 }}>Sua galera recebe o aviso na hora.</Text>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Sobre o quê?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {LIVE_CATS.filter((c) => c.key !== 'noite').map((c) => {
                const on = cat === c.key;
                return (
                  <TouchableOpacity key={c.key} style={[styles.typeChip, on && styles.typeChipOn]} onPress={() => { setCat(c.key); setSub(null); if (c.key === 'gamers') { setSource('tela'); setHost(hosts.find((h) => h.type === 'gamer') || null); } }}>
                    <Ionicons name={c.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Qual estilo?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {catOf(cat).subs.map((x) => {
                const on = sub === x.key;
                return (
                  <TouchableOpacity key={x.key} style={[styles.typeChip, on && styles.typeChipOn]} onPress={() => setSub(on ? null : x.key)}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700' }}>{x.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>O que transmitir</Text>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {[['camera', 'Câmera', 'videocam-outline'], Platform.OS === 'web' ? ['tela', 'Tela do computador (jogos)', 'desktop-outline'] : ['tela', 'Tela do celular (jogos)', 'phone-portrait-outline']].map(([k, label, icon]) => {
                const on = source === k;
                return (
                  <TouchableOpacity key={k} style={[styles.typeChip, on && styles.typeChipOn]} onPress={() => setSource(k)} accessibilityLabel={`Transmitir ${label}`}>
                    <Ionicons name={icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {source === 'tela' ? (
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 10 }}>
                {Platform.OS === 'web'
                  ? 'O navegador vai perguntar o que mostrar: escolha "Janela" e o jogo, ou "Tela inteira". Se o jogo não aparecer na lista ou ficar preto, coloque o jogo em "Janela sem bordas" (nas opções de vídeo do jogo) ou use "Tela inteira".'
                  : 'O celular vai pedir para liberar a transmissão da tela. Depois é só abrir o jogo: quem assiste vê a sua tela e ouve você pelo microfone.'}
              </Text>
            ) : <View style={{ height: 6 }} />}
            {source === 'tela' && Platform.OS !== 'web' ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 2 }}>Esconder a tela ao abrir o jogo</Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>Quem assiste não vê seus aplicativos nem a tela inicial: só o jogo. Enquanto o Realyz estiver aberto, a tela também fica escondida.</Text>
                <View style={{ flexDirection: 'row' }}>
                  {[5, 10, 15].map((n) => (
                    <TouchableOpacity key={n} style={[styles.typeChip, curtainSecs === n && styles.typeChipOn]} onPress={() => setCurtainSecs(n)} accessibilityLabel={`Esconder por ${n} segundos`}>
                      <Text numberOfLines={1} style={{ color: curtainSecs === n ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700' }}>{n} s</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            {cat === 'gamers' || source === 'tela' ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 2 }}>Jogar com o time</Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>Entre numa sala de voz da Arena Gamer ao abrir a live e fale com o seu time sem sair do Realyz.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity style={[styles.typeChip, !team && styles.typeChipOn]} onPress={() => setTeam(null)} accessibilityLabel="Sem sala de voz">
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: !team ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700' }}>Sem sala</Text>
                  </TouchableOpacity>
                  {teamRooms.map((r) => {
                    const on = team && team.sid === r.sid && team.cid === r.cid;
                    return (
                      <TouchableOpacity key={r.sid + r.cid} style={[styles.typeChip, on && styles.typeChipOn]} onPress={() => setTeam({ sid: r.sid, cid: r.cid })} accessibilityLabel={`Sala ${r.room} do servidor ${r.server}`}>
                        <Ionicons name="volume-high-outline" size={14} color={on ? colors.onPrimary : colors.primary} />
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                          {r.room} · {r.server}{r.people.length ? ` (${r.people.length})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Transmitir como</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {hosts.map((h) => {
                const on = me.type === h.type;
                const t = HOST_TYPES[h.type];
                return (
                  <TouchableOpacity key={h.type} style={[styles.typeChip, { marginBottom: 6 }, on && styles.typeChipOn]} onPress={() => setHost(h)}>
                    <Ionicons name={t.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {cat === 'noticias' ? <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>Noticiário ao vivo passa pela IA verificadora: notícia falsa derruba a live.</Text> : null}
            <TextInput
              style={styles.goLiveInput}
              placeholder={type === 'aula' ? 'Tema da aula (ex.: Matemática para o Enem)' : type === 'venda' ? 'O que você vai vender (ex.: Coleção de verão)' : 'Título da live (ex.: Bate-papo com a comunidade)'}
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
            />
            <TouchableOpacity style={styles.goLiveBtn} onPress={start}>
              <Ionicons name="radio-outline" size={20} color="#fff" />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>Iniciar live</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {burst ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.burst,
              {
                opacity: burstAnim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateY: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [40, -60] }) },
                  { scale: burstAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.15, 1] }) },
                ],
              },
            ]}
          >
            <GiftIcon gift={burst.gift} size={72} />
            <Text style={styles.burstText}>{burst.text}</Text>
          </Animated.View>
        ) : null}

        {onAir ? (
          <View style={[styles.liveBottom, { paddingBottom: 14 + insets.bottom }]}>
            {mine ? (
              <Text style={styles.liveTitle}>
                {catOf(cat).label} · {me.name} · {title}
              </Text>
            ) : null}
            {comments.map((c, i) => (
              <View key={i} style={[styles.comment, c.gift && styles.giftComment]}>
                <Text style={{ color: c.gift ? '#F5C331' : colors.primary, fontWeight: '700', fontSize: 13 }}>{c.who} </Text>
                {c.g ? <View style={{ marginRight: 4 }}><GiftIcon gift={c.g} size={15} /></View> : null}
                <Text style={{ color: "#FFFFFF", fontSize: 13, flexShrink: 1, fontWeight: c.gift ? '800' : '400' }}>{c.what}</Text>
              </View>
            ))}
            {tray && !mine ? (
              <View style={styles.tray}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.trayTitle}>Presentear {live ? live.host : ''}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.trayBalance}>Saldo {brl(state.wallet)}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {LIVE_GIFTS.map((g) => {
                    const on = g.key === pick;
                    return (
                      <TouchableOpacity key={g.key} style={[styles.giftItem, on && styles.giftItemOn]} onPress={() => setPick(g.key)} accessibilityLabel={`${g.name}, ${brl(g.value)}`}>
                        <GiftIcon gift={g} size={28} />
                        <Text style={styles.giftName} numberOfLines={1}>{g.name}</Text>
                        <Text style={styles.giftValue}>{brl(g.value)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  {LIVE_GIFT_QTY.map((q) => (
                    <TouchableOpacity key={q} style={[styles.qty, qty === q && styles.qtyOn]} onPress={() => setQty(q)}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: qty === q ? '#0B1124' : '#FFFFFF', fontWeight: '800', fontSize: 12 }}>x{q}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={styles.giftSend} onPress={sendGift}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.giftSendText}>Enviar · {brl(cost.total)}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.trayNote}>
                  Quem transmite recebe {brl(cost.net)} em créditos de live (a taxa de {brl(cost.fee)} do Realyz sai do presente). Você ganha +{giftPoints(cost.value, state.gifts.filter((x) => x.dir === 'enviado').length).total} pontos Realyz., que viram moeda Realyz.
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TextInput
                style={styles.liveInput}
                placeholder="Comentar…"
                placeholderTextColor="#B9C3D6"
                value={text}
                onChangeText={setText}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              {mine ? (
                <TouchableOpacity style={styles.endLive} onPress={close}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '700' }}>Encerrar</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={[styles.heart, tray && { backgroundColor: '#F5C331' }]} onPress={() => setTray(!tray)} accessibilityLabel="Enviar presente">
                    <Ionicons name="gift" size={21} color={tray ? '#0B1124' : '#F5C331'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heart} onPress={() => setLiked(liked + 1)} accessibilityLabel="Curtir">
                    <Ionicons name="heart" size={22} color="#FF5A7A" />
                    {liked ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: "#FFFFFF", fontSize: 10, fontWeight: '700' }}>{liked}</Text> : null}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : null}
        {(mine && myPause) || (!mine && remotePause) ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '30%', alignItems: 'center', paddingHorizontal: 24 }}>
            <View style={{ alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Ionicons name={(mine ? myPause : remotePause) === 'abrindo' ? 'game-controller' : 'lock-closed'} size={26} color="#F5C331" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 6, textAlign: 'center' }}>
                {mine
                  ? myPause === 'abrindo'
                    ? `Tela escondida para quem assiste. Abra o jogo: ela volta ${curtainSecs} s depois de você sair do Realyz.`
                    : 'Tela pausada por segurança para quem assiste.'
                  : remotePause === 'abrindo'
                  ? 'Abrindo o jogo… já volta!'
                  : 'Tela pausada por segurança. Já volta!'}
              </Text>
            </View>
          </View>
        ) : null}
        {swipeHint ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '45%', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Ionicons name="chevron-up" size={16} color="#F5C331" />
              <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 6 }}>{swipeHint}</Text>
            </View>
          </View>
        ) : null}
        </View>
      </Animated.View>
    </KeyboardLift></Modal>
  );
}

const styles = StyleSheet.create({
  liveDesk: { margin: 18, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(245,195,49,0.55)', shadowColor: '#8A6407', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  peekBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  peekCard: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: 24, padding: 22, alignItems: 'center', ...soft },
  peekAvatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 10 },
  peekName: { fontSize: 19, fontWeight: '800', color: colors.text },
  peekNote: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 10, marginBottom: 16 },
  peekBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 11 },
  peekBtnText: { color: colors.onPrimary, fontWeight: '800', marginLeft: 6 },
  chatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headAvatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 10 },
  headName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  headStatus: { color: colors.muted, fontSize: 12 },
  secure: { color: colors.muted, fontSize: 11, textAlign: 'center', marginBottom: 14 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 6, ...soft },
  time: { color: colors.muted, fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  composer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  composerInput: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  callName: { color: '#fff', fontSize: 24, fontWeight: '700' },
  callStatus: { color: '#DDE5F2', fontSize: 14, marginTop: 4 },
  selfTile: {
    position: 'absolute',
    right: 16,
    width: 104,
    height: 150,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.4)',
    overflow: 'hidden',
  },
  callBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly' },
  callBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(15,21,34,0.85)', alignItems: 'center', justifyContent: 'center' },
  liveTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  liveBadge: { backgroundColor: '#FF3B5C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  liveBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  viewers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(3,5,10,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  iconBtnDark: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(3,5,10,0.6)', alignItems: 'center', justifyContent: 'center' },
  hostRow: { paddingHorizontal: 16, marginTop: 12 },
  // Sala de voz do time (Arena Gamer) durante a minha live
  teamBar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '88%', marginHorizontal: 16, marginTop: 12, backgroundColor: 'rgba(88,101,242,0.9)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  teamTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  teamSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  teamMic: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  serverBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(88,101,242,0.9)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, marginTop: 8 },
  serverBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 6 },
  hostName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  liveTitle: { color: '#E8EEF8', fontSize: 13, marginTop: 2, marginBottom: 8 },
  goLive: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.3)',
    padding: 18,
  },
  goLiveTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  goLiveInput: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  typeChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  goLiveBtn: { minHeight: 52, borderRadius: 16, backgroundColor: '#FF3B5C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  earned: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5C331', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  earnedText: { color: '#0B1124', fontWeight: '800', fontSize: 12, marginLeft: 4 },
  giftComment: { backgroundColor: 'rgba(226,182,73,0.22)', borderWidth: 1, borderColor: 'rgba(226,182,73,0.6)' },
  tray: { backgroundColor: 'rgba(11,17,36,0.94)', borderRadius: 20, padding: 12, marginTop: 8, borderWidth: 1, borderColor: 'rgba(226,182,73,0.5)' },
  trayTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  trayBalance: { color: '#F5C331', fontWeight: '700', fontSize: 12 },
  giftItem: { width: 76, alignItems: 'center', paddingVertical: 8, borderRadius: 16, marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  giftItemOn: { borderColor: '#F5C331', backgroundColor: 'rgba(226,182,73,0.18)' },
  giftName: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginTop: 2 },
  giftValue: { color: '#F5C331', fontSize: 11, fontWeight: '800' },
  qty: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 6 },
  qtyOn: { backgroundColor: '#F5C331', borderColor: '#F5C331' },
  giftSend: { backgroundColor: '#F5C331', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  giftSendText: { color: '#0B1124', fontWeight: '800', fontSize: 13 },
  trayNote: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 8, lineHeight: 14 },
  burst: { position: 'absolute', alignSelf: 'center', top: '30%', alignItems: 'center' },
  burstText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, backgroundColor: 'rgba(11,17,36,0.7)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  liveBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  comment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(3,5,10,0.55)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 5,
    maxWidth: '85%',
  },
  liveInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(3,5,10,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    color: '#fff',
  },
  heart: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8, borderRadius: 22 },
  endLive: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#FF3B5C', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
