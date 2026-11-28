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
import { usePrivateScreen } from '../privacyGuard';

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
import { aCada } from '../ritmo';
import Petalas from './Petalas';
import { enviarMensagem, pendentesCom, onPendentes, tirarRecusadas } from '../mensagensPendentes';
const hora = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

// Como a foto, o vídeo ou o áudio pode ser visto por quem recebe. Com limite, o arquivo é apagado do
// servidor quando acabam as vezes (servidor: POST /messages/:id/abrir e /fechar).
const MODOS = [
  { id: 'unica', icon: 'eye-off-outline', titulo: 'Visualização única', sub: 'Abre 1 vez e depois é apagada' },
  { id: 'duas', icon: 'repeat-outline', titulo: 'Visualização em dois tempos', sub: 'Abre 2 vezes e depois é apagada' },
  { id: 'livre', icon: 'infinite-outline', titulo: 'Sem limite', sub: 'Fica na conversa, como sempre' },
];
let ultimoModo = 'livre'; // a última escolha já vem marcada no próximo envio
const NOME = { foto: 'Foto', video: 'Vídeo', audio: 'Áudio' };
const ICONE = { foto: '📷', video: '🎬', audio: '🎤' };

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
      // A pessoa abriu a foto/áudio de visualização limitada que eu mandei.
      if (e.type === 'message_vista' && e.data && e.data.with === open.userId) load();
      // A pessoa recebeu ou leu: as pétalas mudam na hora, sem buscar a conversa de novo.
      if (e.type === 'message_status' && e.data && e.data.with === open.userId && Array.isArray(e.data.ids)) {
        const ids = new Set(e.data.ids);
        const campo = e.data.status === 'lida' ? 'readAt' : 'deliveredAt';
        setMsgs((l) => l.map((m) => (ids.has(m.id) ? { ...m, [campo]: m[campo] || e.data.at, deliveredAt: m.deliveredAt || e.data.at } : m)));
      }
    });
    const t = aCada(load, 15000);
    return () => {
      stop();
      t.parar();
    };
  }, [open && open.userId]);
  // Mensagens escritas sem internet (reloginho): aparecem na hora e somem daqui quando chegam no servidor.
  const [, setPendTick] = useState(0);
  useEffect(
    () =>
      onPendentes(() => {
        setPendTick((n) => n + 1);
        if (!open) return;
        const rec = tirarRecusadas(open.userId);
        if (rec.length) Alert.alert('Mensagem não enviada', `${rec[0].erro || 'O Realyz não aceitou a mensagem.'}\n\n"${String(rec[0].text).slice(0, 80)}"`);
        load();
      }),
    [open && open.userId]
  );
  const pend = open ? pendentesCom(open.userId).filter((p) => !msgs.some((m) => m.clientId === p.clientId)) : [];
  const todas = [...msgs, ...pend.map((p) => ({ id: p.clientId, clientId: p.clientId, from: me, text: p.text, at: p.at, pendente: true }))];
  useEffect(() => {
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 60);
  }, [todas.length]);

  const grav = useGravador();
  const [enviando, setEnviando] = useState(null); // 'foto' | 'video' | 'audio' enquanto sobe
  const [classificar, setClassificar] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const [escolha, setEscolha] = useState(null); // mídia pronta, esperando escolher como vai: { uri, mime, tipo }
  const [vendo, setVendo] = useState(null); // mídia de visualização limitada aberta agora: { id, url, tipo }
  if (!open) return null;
  const close = () => {
    if (grav.gravando) grav.cancelar();
    dispatch({ type: 'CLOSE_SERVER_CHAT' });
  };
  const amigos = negocio === false;
  // Foto, vídeo ou áudio: sobe como arquivo privado (só as duas pessoas veem) e vai na mensagem.
  const mandarMidia = async (uri, mime, tipo, modo = 'livre') => {
    setEnviando(tipo);
    try {
      const url = await uploadMedia(uri, mime, 'privado');
      await api('POST', '/messages', { toId: open.userId, media: url.replace(/^https?:\/\/[^/]+/, ''), mediaType: tipo, text: '', visualizacao: modo });
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
      setEscolha({ uri: a.uri, mime, tipo: video ? 'video' : 'foto' });
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
      setEscolha({ uri: r.assets[0].uri, mime: r.assets[0].mimeType || 'image/jpeg', tipo: 'foto' });
    } catch (e) {
      Alert.alert('Câmera', 'Não deu para abrir a câmera.');
    }
  };
  // Áudio: toca uma vez para gravar, de novo para enviar (o X cancela).
  const audio = async () => {
    try {
      if (!grav.gravando) return await grav.iniciar();
      const r = await grav.parar();
      if (r) setEscolha({ uri: r.uri, mime: r.mime, tipo: 'audio' });
    } catch (e) {
      Alert.alert('Áudio', e.message || 'Não deu para usar o microfone.');
    }
  };
  // Ligação (voz) ou chamada de vídeo de verdade, direto entre os aparelhos (src/components/LiveVideo.js).
  // A conversa fecha para a tela da chamada ficar por cima.
  // Quem recebeu abre a mídia de visualização limitada: conta uma vez no servidor.
  const abrirLimitada = async (m) => {
    try {
      const r = await api('POST', `/messages/${m.id}/abrir`);
      setVendo({ id: m.id, url: mediaUrl(r.media), tipo: r.mediaType });
      load();
    } catch (e) {
      Alert.alert('Não abriu', e.message || 'Essa mídia não está mais disponível.');
      load();
    }
  };
  const fecharLimitada = () => {
    const v = vendo;
    setVendo(null);
    if (v) api('POST', `/messages/${v.id}/fechar`).catch(() => {}).then(load);
  };
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
    // Como no WhatsApp: a mensagem sai da caixa na hora e aparece na conversa com o reloginho.
    setTxt('');
    setEmojis(false);
    try {
      const r = await enviarMensagem(open.userId, t);
      if (r && r.pendente) return;
      await load();
      // O atendente IA responde em seguida: busca de novo daqui a pouco.
      setTimeout(load, 2500);
      setTimeout(load, 8000);
    } catch (e) {
      setTxt((atual) => atual || t);
      Alert.alert('Mensagem não enviada', e.message);
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
          {!todas.length && negocio !== null ? <Text style={st.empty}>{negocio ? 'Mande sua dúvida. A loja responde por aqui.' : `Diga oi para ${String(open.name || '').split(' ')[0]}! 👋`}</Text> : null}
          {todas.map((m) => {
            const mine = m.from === me;
            return (
              <View key={m.id} style={[st.bubble, mine ? st.mine : st.theirs, m.media && m.mediaType !== 'audio' && { padding: 4 }]}>
                {!mine && m.ia ? <Text style={st.ia}>Assistente virtual</Text> : null}
                {m.efemera ? <LimitadaMsg m={m} mine={mine} onAbrir={() => abrirLimitada(m)} /> : m.media ? <MidiaMsg m={m} mine={mine} /> : null}
                {m.text ? <Text style={[st.text, mine && { color: '#FBF8F1' }, m.media && { paddingHorizontal: 8, paddingTop: 4 }]}>{m.text}</Text> : null}
                {/* Hora e, nas minhas, as pétalas: enviada, entregue, lida (douradas). */}
                <View style={[st.rodape, m.media && { paddingHorizontal: 8, paddingBottom: 2 }]}>
                  {m.at ? <Text style={[st.hora, mine && { color: 'rgba(251,248,241,0.62)' }]}>{hora(m.at)}</Text> : null}
                  {mine ? <Petalas m={m} style={{ marginLeft: 5 }} /> : null}
                </View>
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
        <EscolherEnvio
          item={escolha}
          onCancel={() => setEscolha(null)}
          onSend={(modo) => {
            const it = escolha;
            ultimoModo = modo;
            setEscolha(null);
            if (it) mandarMidia(it.uri, it.mime, it.tipo, modo);
          }}
        />
        {vendo ? <VerLimitada item={vendo} onClose={fecharLimitada} /> : null}
      </KeyboardLift>
    </Modal>
  );
}

// Antes de enviar a foto, o vídeo ou o áudio: escolher se quem recebe vê 1 vez, 2 vezes ou sem limite.
function EscolherEnvio({ item, onCancel, onSend }) {
  const [modo, setModo] = useState(ultimoModo);
  useEffect(() => {
    if (item) setModo(ultimoModo);
  }, [item]);
  if (!item) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.fundo}>
        <View style={st.caixa}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            {item.tipo === 'foto' ? (
              <Photo uri={item.uri} style={{ width: 54, height: 54, borderRadius: 10 }} fallback="📷" />
            ) : (
              <View style={st.previa}>
                <Text style={{ fontSize: 26 }}>{ICONE[item.tipo]}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.title}>Enviar {item.tipo === 'audio' ? 'o áudio' : item.tipo === 'video' ? 'o vídeo' : 'a foto'}</Text>
              <Text style={st.sub}>Como a pessoa vai poder ver?</Text>
            </View>
          </View>
          {MODOS.map((o) => {
            const on = modo === o.id;
            return (
              <TouchableOpacity key={o.id} onPress={() => setModo(o.id)} style={[st.modo, on && st.modoOn]} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${o.titulo}: ${o.sub}`}>
                <Ionicons name={o.icon} size={22} color={on ? colors.primary : colors.muted} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14.5 }}>{o.titulo}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{o.sub}</Text>
                </View>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.muted} />
              </TouchableOpacity>
            );
          })}
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity onPress={onCancel} style={[st.botao, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginRight: 8 }]} accessibilityLabel="Cancelar o envio">
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSend(modo)} style={st.botao} accessibilityLabel="Enviar">
              <Ionicons name="send" size={16} color={colors.onPrimary} />
              <Text style={{ color: colors.onPrimary, fontWeight: '800', marginLeft: 6 }}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Bolha da mídia com limite: o arquivo não vem na conversa. Quem recebe toca para abrir;
// quem mandou vê se já foi aberta.
function LimitadaMsg({ m, mine, onAbrir }) {
  const e = m.efemera;
  const cor = mine ? '#FBF8F1' : colors.text;
  const fraco = mine ? 'rgba(251,248,241,0.7)' : colors.muted;
  const nome = NOME[m.mediaType] || 'Mídia';
  const limite = e.max === 1 ? 'visualização única' : '2 visualizações';
  const acabou = e.restam <= 0;
  const status = mine ? (acabou ? 'Aberta' : e.vistas ? `Aberta ${e.vistas} de ${e.max}` : 'Ainda não aberta') : acabou ? 'Aberta' : e.restam === 1 && e.max === 2 ? 'Toque para ver · última vez' : 'Toque para ver';
  const conteudo = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 190 }}>
      <View style={[st.selo, { borderColor: cor }, acabou && { borderStyle: 'dashed', opacity: 0.6 }]}>
        <Text style={{ color: cor, fontWeight: '900', fontSize: 13 }}>{e.max === 1 ? '1' : '2'}</Text>
      </View>
      <View style={{ marginLeft: 10, flexShrink: 1 }}>
        <Text style={{ color: cor, fontWeight: '700', fontSize: 14.5 }}>{ICONE[m.mediaType] || '📎'} {nome} · {limite}</Text>
        <Text style={{ color: fraco, fontSize: 12 }}>{status}</Text>
      </View>
    </View>
  );
  if (mine || acabou) return conteudo;
  return (
    <TouchableOpacity onPress={onAbrir} activeOpacity={0.8} accessibilityLabel={`Ver ${nome.toLowerCase()} de ${limite}`}>
      {conteudo}
    </TouchableOpacity>
  );
}

// Tela da mídia com limite (sem print no Android). Ao fechar, o app avisa o servidor, que apaga o arquivo
// se era a última vez.
function VerLimitada({ item, onClose }) {
  usePrivateScreen(true, 'visualizacao-limitada');
  const insets = useSafeAreaInsets();
  let corpo;
  if (item.tipo === 'audio') corpo = <View style={st.audioVer}><AudioMsg url={item.url} mine /></View>;
  else if (item.tipo === 'video') {
    corpo = Platform.OS === 'web'
      ? React.createElement('video', { src: item.url, controls: true, autoPlay: true, controlsList: 'nodownload', style: { width: '100%', maxHeight: '80vh' } })
      : EV ? <VideoNativo url={item.url} grande /> : <Text style={{ color: '#fff' }}>Não deu para abrir o vídeo aqui.</Text>;
  } else corpo = <Photo uri={item.url} style={{ width: "100%", height: "80%" }} fit="contain" fallback="📷" />;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: insets.top + 10, right: 14, padding: 8, zIndex: 2 }} accessibilityLabel="Fechar">
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {corpo}
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, position: 'absolute', bottom: insets.bottom + 18 }}>Ao fechar, essa visualização acaba.</Text>
      </View>
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
function VideoNativo({ url, grande }) {
  const player = EV.useVideoPlayer({ uri: url }, (p) => {
    p.loop = false;
    if (grande) p.play();
  });
  return <EV.VideoView player={player} style={grande ? { width: '100%', height: '80%' } : { width: 230, height: 300, borderRadius: 14 }} nativeControls contentFit={grande ? 'contain' : 'cover'} />;
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
  previa: { width: 54, height: 54, borderRadius: 10, backgroundColor: colors.cardAlt || '#F3EEE4', alignItems: 'center', justifyContent: 'center' },
  modo: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  modoOn: { borderColor: colors.primary, backgroundColor: 'rgba(0,0,0,0.03)' },
  botao: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  selo: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  audioVer: { backgroundColor: colors.text, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
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
  rodape: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  hora: { color: colors.muted, fontSize: 10.5 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
