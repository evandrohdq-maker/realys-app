// Conversa de verdade (pelo servidor do Realyz) com uma loja, prestador ou pessoa.
// Perfil social com perfil social (amigos) é conversa livre entre eles; com loja ou prestador
// vale a regra de negócio (contato e pagamento sempre pelo Realyz).
// Abre de qualquer tela: dispatch({ type: 'OPEN_SERVER_CHAT', userId, name }).
// Mensagens da loja escritas pelo atendente IA aparecem marcadas como "Assistente virtual".
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { api, connectEvents, uploadMedia, mediaUrl } from '../api';
import { colors } from '../theme';
import * as ImagePicker from 'expo-image-picker';
import { Photo } from './ui';
import { openMedia } from './MediaViewer';
import { useGravador, podeGravarAudio } from '../audioRec';

let EA = null;
let EV = null;
if (Platform.OS !== 'web') {
  try {
    EA = require('expo-audio');
  } catch (e) {}
  try {
    EV = require('expo-video');
  } catch (e) {}
}
import ClassifyModal, { TagLine, LISTAS_PADRAO } from './ClassifyModal';
import EmojiBar, { EmojiButton } from './EmojiBar';
const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

export default function ChatServidor() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const open = state.serverChat;
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef(null);
  const me = state.user && state.user.serverId;
  // null = ainda sabendo; true = loja/prestador; false = pessoa (perfil social).
  const [negocio, setNegocio] = useState(null);
  useEffect(() => {
    setNegocio(null);
    if (!open) return;
    api('GET', `/users/${open.userId}`)
      .then((u) => setNegocio(!!(u && (u.negocio || u.kind === 'empresa'))))
      .catch(() => setNegocio(null));
  }, [open && open.userId]);

  const load = () => open && api('GET', `/messages/${open.userId}`).then(setMsgs).catch(() => {});
  useEffect(() => {
    if (!open) return setMsgs([]);
    load();
    const stop = connectEvents((e) => {
      if (e.type === 'message' && (e.from === open.userId || (e.data && e.data.from === open.userId))) load();
    });
    const t = setInterval(load, 15000);
    return () => {
      stop();
      clearInterval(t);
    };
  }, [open && open.userId]);
  useEffect(() => {
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 60);
  }, [msgs.length]);

  const grav = useGravador();
  const [enviando, setEnviando] = useState(null); // 'foto' | 'video' | 'audio' enquanto sobe
  const [classificar, setClassificar] = useState(false);
  const [emojis, setEmojis] = useState(false);
  if (!open) return null;
  const close = () => {
    if (grav.gravando) grav.cancelar();
    dispatch({ type: 'CLOSE_SERVER_CHAT' });
  };
  const amigos = negocio === false;
  // Foto, vídeo ou áudio: sobe como arquivo privado (só as duas pessoas veem) e vai na mensagem.
  const mandarMidia = async (uri, mime, tipo) => {
    setEnviando(tipo);
    try {
      const url = await uploadMedia(uri, mime, 'privado');
      await api('POST', '/messages', { toId: open.userId, media: url.replace(/^https?:\/\/[^/]+/, ''), mediaType: tipo, text: '' });
      await load();
    } catch (e) {
      Alert.alert('Não foi enviado', e.message || 'Tente de novo.');
    } finally {
      setEnviando(null);
    }
  };
  const anexar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão', 'Permita o acesso às fotos e vídeos para enviar.');
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 120 });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      const video = a.type === 'video';
      const mime = a.mimeType || (video ? 'video/mp4' : /\.png$/i.test(a.uri) ? 'image/png' : 'image/jpeg');
      mandarMidia(a.uri, mime, video ? 'video' : 'foto');
    } catch (e) {
      Alert.alert('Enviar foto ou vídeo', 'Não deu para abrir a galeria.');
    }
  };
  const fotografar = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão', 'Permita a câmera para tirar a foto.');
      const r = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      mandarMidia(r.assets[0].uri, r.assets[0].mimeType || 'image/jpeg', 'foto');
    } catch (e) {
      Alert.alert('Câmera', 'Não deu para abrir a câmera.');
    }
  };
  // Áudio: toca uma vez para gravar, de novo para enviar (o X cancela).
  const audio = async () => {
    try {
      if (!grav.gravando) return await grav.iniciar();
      const r = await grav.parar();
      if (r) mandarMidia(r.uri, r.mime, 'audio');
    } catch (e) {
      Alert.alert('Áudio', e.message || 'Não deu para usar o microfone.');
    }
  };
  // Ligação (voz) ou chamada de vídeo de verdade, direto entre os aparelhos (src/components/LiveVideo.js).
  // A conversa fecha para a tela da chamada ficar por cima.
  const ligar = (kind) => {
    const alvo = { to: open.userId, name: open.name };
    close();
    dispatch({ type: 'START_VIDEO_CALL', ...alvo, kind });
  };
  const meta = (state.chatMeta || {})[open.userId] || {};
  const minhasListas = meta.lists || [];
  const listas = state.chatLists || LISTAS_PADRAO;
  const alternarLista = (id) =>
    dispatch({ type: 'CHAT_META', contactId: open.userId, patch: { lists: minhasListas.includes(id) ? minhasListas.filter((x) => x !== id) : [...minhasListas, id] } });
  const enviar = async () => {
    const t = txt.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await api('POST', '/messages', { toId: open.userId, text: t });
      setTxt('');
      await load();
      // O atendente IA responde em seguida: busca de novo daqui a pouco.
      setTimeout(load, 2500);
      setTimeout(load, 8000);
    } catch (e) {
      Alert.alert('Mensagem não enviada', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardLift behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[st.head, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={close} accessibilityLabel="Voltar" style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={st.title} numberOfLines={1}>{open.name}</Text>
            {/* Classificação pequenininha e colorida embaixo do nome; sem classificação, o aviso de sempre. */}
            {amigos && minhasListas.length ? (
              <TagLine contactId={open.userId} />
            ) : (
              <Text style={st.sub} numberOfLines={1}>{amigos ? 'Conversa entre amigos · só pessoas verificadas' : 'Conversa protegida pelo Realyz: contato e pagamento sempre por aqui'}</Text>
            )}
          </View>
          {amigos ? (
            <>
              <TouchableOpacity onPress={() => ligar('audio')} style={st.headBtn} accessibilityLabel={`Ligar para ${open.name}`}>
                <Ionicons name="call-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => ligar('video')} style={st.headBtn} accessibilityLabel={`Chamada de vídeo com ${open.name}`}>
                <Ionicons name="videocam-outline" size={21} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setClassificar(true)} style={st.headBtn} accessibilityLabel={`Classificar ${open.name}`}>
                <Ionicons name={minhasListas.length ? 'pricetag' : 'pricetag-outline'} size={19} color={colors.primary} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {!msgs.length && negocio !== null ? <Text style={st.empty}>{negocio ? 'Mande sua dúvida. A loja responde por aqui.' : `Diga oi para ${String(open.name || '').split(' ')[0]}! 👋`}</Text> : null}
          {msgs.map((m) => {
            const mine = m.from === me;
            return (
              <View key={m.id} style={[st.bubble, mine ? st.mine : st.theirs, m.media && m.mediaType !== 'audio' && { padding: 4 }]}>
                {!mine && m.ia ? <Text style={st.ia}>Assistente virtual</Text> : null}
                {m.media ? <MidiaMsg m={m} mine={mine} /> : null}
                {m.text ? <Text style={[st.text, mine && { color: '#FBF8F1' }, m.media && { paddingHorizontal: 8, paddingTop: 4 }]}>{m.text}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
        {emojis ? <EmojiBar onPick={(e) => setTxt((t) => t + e)} style={{ marginHorizontal: 10, marginBottom: 4 }} /> : null}
        {enviando ? <Text style={st.subindo}>Enviando {enviando === 'foto' ? 'a foto' : enviando === 'video' ? 'o vídeo' : 'o áudio'}…</Text> : null}
        <View style={[st.bar, { paddingBottom: 10 + insets.bottom }]}>
          {amigos && !grav.gravando ? (
            <>
              <TouchableOpacity onPress={anexar} style={st.tool} accessibilityLabel="Enviar foto ou vídeo da galeria">
                <Ionicons name="images-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              {Platform.OS !== 'web' ? (
                <TouchableOpacity onPress={fotografar} style={st.tool} accessibilityLabel="Tirar foto e enviar">
                  <Ionicons name="camera-outline" size={23} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
          {!grav.gravando ? <EmojiButton open={emojis} onPress={() => setEmojis((v) => !v)} /> : null}
          {grav.gravando ? (
            <View style={[st.input, st.gravando]}>
              <TouchableOpacity onPress={grav.cancelar} accessibilityLabel="Cancelar o áudio" style={{ padding: 2 }}>
                <Ionicons name="close" size={20} color={colors.danger || '#D64545'} />
              </TouchableOpacity>
              <View style={st.recDot} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>Gravando {mmss(grav.segundos)}</Text>
            </View>
          ) : (
            <TextInput value={txt} onChangeText={setTxt} placeholder="Escreva sua mensagem" placeholderTextColor={colors.muted} style={st.input} multiline onSubmitEditing={enviar} />
          )}
          {/* Sem texto: o botão vira o microfone (toca para gravar, toca de novo para enviar). */}
          {amigos && !txt.trim() && podeGravarAudio() ? (
            <TouchableOpacity onPress={audio} disabled={!!enviando} style={[st.send, grav.gravando && { backgroundColor: '#D64545' }]} accessibilityLabel={grav.gravando ? 'Enviar o áudio' : 'Gravar áudio'}>
              <Ionicons name={grav.gravando ? 'send' : 'mic'} size={19} color={colors.onPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={enviar} disabled={busy || !txt.trim()} style={[st.send, (busy || !txt.trim()) && { opacity: 0.5 }]} accessibilityLabel="Enviar">
              <Ionicons name="send" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <ClassifyModal visible={classificar} contactId={open.userId} name={open.name} onClose={() => setClassificar(false)} />
      </KeyboardLift>
    </Modal>
  );
}

// Foto, vídeo ou áudio dentro da bolha.
function MidiaMsg({ m, mine }) {
  const url = mediaUrl(m.media);
  if (m.mediaType === 'audio') return <AudioMsg url={url} mine={mine} />;
  if (m.mediaType === 'video') {
    if (Platform.OS === 'web') return React.createElement('video', { src: url, controls: true, style: { width: 240, maxWidth: '100%', borderRadius: 14, display: 'block' } });
    if (EV) return <VideoNativo url={url} />;
  }
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => openMedia([{ photo: url }])} accessibilityLabel="Ver a foto">
      <Photo uri={url} style={{ width: 230, height: 230, borderRadius: 14 }} fallback="📷" />
    </TouchableOpacity>
  );
}
function VideoNativo({ url }) {
  const player = EV.useVideoPlayer({ uri: url }, (p) => (p.loop = false));
  return <EV.VideoView player={player} style={{ width: 230, height: 300, borderRadius: 14 }} nativeControls contentFit="cover" />;
}
// Áudio: no site, o player do navegador; no celular, tocar/pausar com o expo-audio.
function AudioMsg({ url, mine }) {
  if (Platform.OS === 'web') return React.createElement('audio', { src: url, controls: true, style: { width: 230, height: 40 } });
  if (!EA) return <Text style={[st.text, mine && { color: '#FBF8F1' }]}>🎤 Áudio</Text>;
  return <AudioNativo url={url} mine={mine} />;
}
function AudioNativo({ url, mine }) {
  const player = EA.useAudioPlayer({ uri: url });
  const status = EA.useAudioPlayerStatus ? EA.useAudioPlayerStatus(player) : null;
  const tocando = !!(status && status.playing);
  const cor = mine ? '#FBF8F1' : colors.text;
  const toggle = () => {
    if (tocando) return player.pause();
    if (status && status.didJustFinish) player.seekTo(0);
    player.play();
  };
  const dur = status && status.duration ? Math.round(status.duration) : 0;
  const pos = status && status.currentTime ? Math.round(status.currentTime) : 0;
  return (
    <TouchableOpacity onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center', minWidth: 160 }} accessibilityLabel={tocando ? 'Pausar o áudio' : 'Ouvir o áudio'}>
      <Ionicons name={tocando ? 'pause-circle' : 'play-circle'} size={34} color={cor} />
      <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: mine ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)', marginHorizontal: 8 }}>
        <View style={{ width: `${dur ? Math.min(100, (pos / dur) * 100) : 0}%`, height: 3, borderRadius: 2, backgroundColor: cor }} />
      </View>
      <Text style={{ color: cor, fontSize: 12 }}>{mmss(tocando ? pos : dur)}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  headBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  tool: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  gravando: { flexDirection: 'row', alignItems: 'center' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D64545', marginHorizontal: 8 },
  subindo: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 4 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: { backgroundColor: colors.card, borderRadius: 18, padding: 18, width: '100%', maxWidth: 380 },
  lista: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  title: { color: colors.text, fontWeight: '800', fontSize: 17 },
  sub: { color: colors.muted, fontSize: 11.5 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.text, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#F6EDD6', borderBottomLeftRadius: 6 },
  ia: { color: '#8A6208', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
