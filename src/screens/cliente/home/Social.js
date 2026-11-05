import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../theme';
import { Photo } from '../../../components/ui';
import { liveComments } from '../../../homeData';
import { useStore } from '../../../store';
import { HostChip, useOpenHost } from '../../../components/HostChip';
import { LIVE_CATS, hostOptions, defaultHost, catOf, HOST_TYPES } from '../../../liveData';

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Conversa com histórico de mensagens.
export function ChatModal({ contact, messages, visible, onClose, onSend, onVideo }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const scroll = useRef(null);
  if (!contact) return null;

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend({ from: 'me', text: t, time: now() });
    setText('');
    // Resposta automática só para a demonstração parecer viva.
    setTimeout(() => onSend({ from: 'them', text: 'Recebi! Já te respondo 😉', time: now() }), 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.chatHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Photo uri={contact.photo} style={styles.headAvatar} fallback="🙂" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headName}>{contact.name}</Text>
            <Text style={styles.headStatus}>{contact.status}</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert('Chamada de voz', `Ligando para ${contact.name} pela Realys.`)}
            accessibilityLabel="Chamada de voz"
          >
            <Ionicons name="call-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={onVideo} accessibilityLabel="Chamada de vídeo">
            <Ionicons name="videocam-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
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
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === 'me' ? styles.mine : styles.theirs]}>
              <Text style={{ color: m.from === 'me' ? colors.onPrimary : colors.text, fontSize: 15 }}>{m.text}</Text>
              <Text style={[styles.time, m.from === 'me' && { color: 'rgba(255,255,255,0.8)' }]}>{m.time}</Text>
            </View>
          ))}
        </ScrollView>

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Chamada de vídeo entre usuários (demonstração visual; a real precisa do servidor).
export function VideoCallModal({ contact, visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [secs, setSecs] = useState(0);
  const [connected, setConnected] = useState(false);
  const [mute, setMute] = useState(false);
  const [cam, setCam] = useState(true);

  useEffect(() => {
    if (!visible) return;
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
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#03050A' }}>
        <Photo uri={contact.photo ? contact.photo.replace('200/200', '800/1400') : null} style={StyleSheet.absoluteFill} fallback="🙂" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: connected ? 'rgba(3,5,10,0.15)' : 'rgba(3,5,10,0.7)' }]} />

        <View style={{ paddingTop: insets.top + 24, alignItems: 'center' }}>
          <Text style={styles.callName}>{contact.name}</Text>
          <Text style={styles.callStatus}>{connected ? `Chamada de vídeo · ${mmss(Math.max(0, secs - 2))}` : 'Chamando…'}</Text>
        </View>

        <View style={[styles.selfTile, { top: insets.top + 100 }]}>
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
          <CallBtn icon={cam ? 'videocam' : 'videocam-off'} on={!cam} onPress={() => setCam(!cam)} label="Câmera" />
          <CallBtn icon="camera-reverse" onPress={() => {}} label="Virar câmera" />
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#FF5A5F' }]} onPress={onClose} accessibilityLabel="Encerrar chamada">
            <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
export function LiveModal({ live, mine, visible, onClose, userName }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [onAir, setOnAir] = useState(!mine);
  const [viewers, setViewers] = useState(live ? live.viewers : 0);
  const [secs, setSecs] = useState(0);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [liked, setLiked] = useState(0);
  const { state, dispatch } = useStore();
  const openHost = useOpenHost();
  // Minha live: o assunto e o perfil com que eu transmito (usuário, empresa, prestador, fornecedor, artista).
  const [cat, setCat] = useState('comunidade');
  const [host, setHost] = useState(null);
  const hosts = hostOptions(state);
  const me = host || defaultHost(state);
  const type = cat === 'cursos' || cat === 'faculdades' ? 'aula' : cat === 'compras' ? 'venda' : 'papo';
  const close = () => {
    if (mine && onAir) dispatch({ type: 'LIVE_END' });
    onClose();
  };
  const start = () => {
    dispatch({ type: 'LIVE_START', live: { cat, hostType: me.type, hostId: me.id, host: me.name, title: title.trim() || catOf(cat).title, viewers: 0, tag: catOf(cat).label, photo: null, sponsored: false } });
    setOnAir(true);
  };

  useEffect(() => {
    if (!visible) return;
    setOnAir(!mine);
    setViewers(live ? live.viewers : 0);
    setSecs(0);
    setComments([]);
    setLiked(0);
  }, [visible]);

  useEffect(() => {
    if (!visible || !onAir) return;
    const names = ['Ana', 'Diego', 'Lívia', 'Rogério', 'Paula', 'Marcos', 'Bia'];
    const t = setInterval(() => {
      setSecs((s) => s + 1);
      setViewers((v) => v + Math.floor(Math.random() * (mine ? 3 : 6)) - (mine ? 0 : 1));
    }, 1000);
    const c = setInterval(() => {
      const who = names[Math.floor(Math.random() * names.length)];
      const what = liveComments[Math.floor(Math.random() * liveComments.length)];
      setComments((cs) => [...cs.slice(-5), { who, what }]);
    }, 2200);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [visible, onAir]);

  const send = () => {
    if (!text.trim()) return;
    setComments((cs) => [...cs.slice(-5), { who: userName || 'Você', what: text.trim() }]);
    setText('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#03050A' }}>
        {live ? <Photo uri={live.photo.replace('800/500', '800/1400')} style={StyleSheet.absoluteFill} fallback="🎥" /> : null}
        {mine ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2A44' }]}>
            <Ionicons name="videocam-outline" size={64} color="rgba(168,121,10,0.35)" />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Prévia da sua câmera</Text>
          </View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,10,0.25)' }]} />

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
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.iconBtnDark} onPress={close} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!mine && live ? (
          <View style={styles.hostRow}>
            <Text style={styles.hostName}>{live.host}</Text>
            <Text style={styles.liveTitle}>{live.title}</Text>
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
            <Text style={{ color: colors.muted, marginBottom: 12 }}>Seus contatos e seguidores recebem o aviso na hora.</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Assunto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {LIVE_CATS.filter((c) => c.key !== 'noite').map((c) => {
                const on = cat === c.key;
                return (
                  <TouchableOpacity key={c.key} style={[styles.typeChip, on && styles.typeChipOn]} onPress={() => setCat(c.key)}>
                    <Ionicons name={c.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                    <Text style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Transmitir como</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {hosts.map((h) => {
                const on = me.type === h.type;
                const t = HOST_TYPES[h.type];
                return (
                  <TouchableOpacity key={h.type} style={[styles.typeChip, { marginBottom: 6 }, on && styles.typeChipOn]} onPress={() => setHost(h)}>
                    <Ionicons name={t.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                    <Text style={{ color: on ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{t.label}</Text>
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
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Iniciar live</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {onAir ? (
          <View style={[styles.liveBottom, { paddingBottom: 14 + insets.bottom }]}>
            {mine ? (
              <Text style={styles.liveTitle}>
                {catOf(cat).label} · {me.name} · {title}
              </Text>
            ) : null}
            {comments.map((c, i) => (
              <View key={i} style={styles.comment}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{c.who} </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 13, flexShrink: 1 }}>{c.what}</Text>
              </View>
            ))}
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
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Encerrar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.heart} onPress={() => setLiked(liked + 1)} accessibilityLabel="Curtir">
                  <Ionicons name="heart" size={22} color="#FF5A7A" />
                  {liked ? <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: '700' }}>{liked}</Text> : null}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
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
  callName: { color: '#fff', fontSize: 24, fontWeight: '800' },
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
  liveBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
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
  hostName: { color: '#fff', fontWeight: '800', fontSize: 16 },
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
  goLiveTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
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
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  typeChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  goLiveBtn: { height: 52, borderRadius: 16, backgroundColor: '#FF3B5C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
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
  heart: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  endLive: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#FF3B5C', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
