// Comentários no modelo do Instagram: sobem por baixo, por cima do post/vídeo.
// Cada comentário: foto, nome, tempo ("14 h"), texto (com *menções em destaque), "Responder",
// coração com o número de curtidas à direita, e as respostas recolhidas em "Ver mais N respostas".
// Embaixo: a fileira de emojis rápidos e a caixa "O que você acha disso?" com a foto de quem está
// comentando (eu ou a minha página: toque na foto para trocar, o "Publicar como").
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';
import { ComoChip, useEuAgora } from './PublicarComo';
import { comentariosDoPost, comentarPost, curtirComentario, apagarComentario, full, atorAtual, abrirPagina } from '../serverPaginas';

const EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

// "agora", "1 s", "5 min", "14 h", "3 d", "12 sem"
export const tempoCurto = (t) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 5) return 'agora';
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return `${Math.floor(s / 604800)} sem`;
};
const nCurto = (n) => (n >= 1000 ? n.toLocaleString('pt-BR') : String(n));

// Texto com *usuário e @usuário em destaque.
function TextoComMencao({ text }) {
  const partes = String(text || '').split(/([*@][A-Za-z0-9._]{2,30})/g);
  return (
    <Text style={st.text}>
      {partes.map((p, i) => (/^[*@][A-Za-z0-9._]{2,30}$/.test(p) ? <Text key={i} style={st.mention}>{p}</Text> : p))}
    </Text>
  );
}

export default function CommentsSheet({ visible, onClose, postId, onCount, openPerson }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const { agora } = useEuAgora();
  const meuId = state.user && state.user.serverId;
  const [lista, setLista] = useState(null);
  const [txt, setTxt] = useState('');
  const [resp, setResp] = useState(null); // comentário que estou respondendo
  const [abertas, setAbertas] = useState({}); // respostas à mostra, por comentário
  const [enviando, setEnviando] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!visible || !postId) return;
    setLista(null);
    setTxt('');
    setResp(null);
    setAbertas({});
    comentariosDoPost(postId).then(setLista).catch(() => setLista([]));
  }, [visible, postId]);

  const principais = useMemo(() => (lista || []).filter((c) => !c.parentId).sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt), [lista]);
  const respostas = useMemo(() => {
    const m = {};
    (lista || []).filter((c) => c.parentId).forEach((c) => (m[c.parentId] = [...(m[c.parentId] || []), c]));
    return m;
  }, [lista]);

  const ator = atorAtual(meuId);
  const enviar = () => {
    const v = txt.trim();
    if (!v || enviando) return;
    setEnviando(true);
    comentarPost(postId, v, { parentId: resp ? resp.id : undefined })
      .then((c) => {
        setLista((l) => [...(l || []), c]);
        if (c.parentId) setAbertas((x) => ({ ...x, [c.parentId]: true }));
        setTxt('');
        setResp(null);
        onCount && onCount(1);
      })
      .catch((e) => Alert.alert('Comentário', e.message))
      .finally(() => setEnviando(false));
  };
  const curtir = (c) => {
    // Na hora: o coração muda antes de o servidor responder.
    const ja = c.likedBy.includes(ator);
    const troca = (x) => (x.id === c.id ? { ...x, likes: x.likes + (ja ? -1 : 1), likedBy: ja ? x.likedBy.filter((a) => a !== ator) : [...x.likedBy, ator] } : x);
    setLista((l) => (l || []).map(troca));
    curtirComentario(c.id).catch((e) => {
      setLista((l) => (l || []).map((x) => (x.id === c.id ? c : x)));
      Alert.alert('Curtir', e.message);
    });
  };
  const responder = (c) => {
    setResp(c);
    const h = c.author.username ? `*${c.author.username} ` : '';
    setTxt((t) => (t.startsWith(h) ? t : h + t));
    setTimeout(() => input.current && input.current.focus(), 50);
  };
  const apagar = (c) =>
    Alert.alert('Apagar comentário?', c.text.slice(0, 80), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () =>
          apagarComentario(c.id)
            .then(() => {
              setLista((l) => (l || []).filter((x) => x.id !== c.id && x.parentId !== c.id));
              onCount && onCount(-1);
            })
            .catch((e) => Alert.alert('Apagar', e.message)),
      },
    ]);
  const abrirAutor = (a) => {
    if (a.pagina) {
      onClose && onClose();
      return abrirPagina(a.id);
    }
    if (openPerson) {
      onClose && onClose();
      openPerson(a.id);
    }
  };

  const Comentario = ({ c, resposta }) => {
    const liked = c.likedBy.includes(ator);
    return (
      <View style={[st.cmt, resposta && st.reply]}>
        <TouchableOpacity onPress={() => abrirAutor(c.author)} accessibilityLabel={`Ver ${c.author.name}`}>
          <View style={[st.ring, resposta && { padding: 1.5 }]}>
            <Photo uri={full(c.author.photo)} style={resposta ? st.avSm : st.av} fallback={c.author.pagina ? '📄' : '🙂'} />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.head} numberOfLines={1}>
            <Text style={st.name}>{c.author.username || c.author.name}</Text>
            {c.author.pagina ? <Text style={st.pgTag}> · página</Text> : null}
            <Text style={st.time}>  {tempoCurto(c.createdAt)}</Text>
          </Text>
          <TextoComMencao text={c.text} />
          <View style={st.acts}>
            <TouchableOpacity onPress={() => responder(c)} hitSlop={6} accessibilityLabel={`Responder ${c.author.name}`}>
              <Text style={st.act}>Responder</Text>
            </TouchableOpacity>
            {c.mine ? (
              <TouchableOpacity onPress={() => apagar(c)} hitSlop={6} style={{ marginLeft: 18 }} accessibilityLabel="Apagar comentário">
                <Text style={st.act}>Apagar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <TouchableOpacity onPress={() => curtir(c)} style={st.heart} hitSlop={8} accessibilityLabel={liked ? 'Descurtir comentário' : 'Curtir comentário'}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={resposta ? 18 : 22} color={liked ? '#E0245E' : colors.muted} />
          {c.likes ? <Text style={st.likes}>{nCurto(c.likes)}</Text> : null}
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item: c }) => {
    const rs = respostas[c.id] || [];
    const aberto = !!abertas[c.id];
    return (
      <View>
        <Comentario c={c} />
        {aberto ? rs.map((r) => <Comentario key={r.id} c={r} resposta />) : null}
        {rs.length ? (
          <TouchableOpacity style={st.more} onPress={() => setAbertas((x) => ({ ...x, [c.id]: !aberto }))} accessibilityLabel={aberto ? 'Esconder respostas' : `Ver ${rs.length} respostas`}>
            <View style={st.moreLine} />
            <Text style={st.moreText}>{aberto ? 'Esconder respostas' : `Ver mais ${rs.length} ${rs.length === 1 ? 'resposta' : 'respostas'}`}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.back}>
        <TouchableOpacity style={{ flex: 0.32 }} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar comentários" />
        <KeyboardLift style={st.sheet}>
          <View style={st.handle} />
          <Text style={st.title}>Comentários</Text>
          {lista === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30, flex: 1 }} />
          ) : (
            <FlatList
              data={principais}
              keyExtractor={(c) => c.id}
              renderItem={renderItem}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={st.emptyT}>Ainda não há comentários</Text>
                  <Text style={st.emptyS}>Comece a conversa.</Text>
                </View>
              }
            />
          )}
          {resp ? (
            <View style={st.replying}>
              <Text style={st.replyingT} numberOfLines={1}>Respondendo a {resp.author.username || resp.author.name}</Text>
              <TouchableOpacity onPress={() => { setResp(null); setTxt(''); }} hitSlop={8} accessibilityLabel="Cancelar resposta">
                <Ionicons name="close" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={st.emojis}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setTxt((t) => t + e)} hitSlop={4} accessibilityLabel={`Pôr ${e}`}>
                <Text style={st.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[st.inputRow, { paddingBottom: 10 + insets.bottom }]}>
            <ComoChip size={40} />
            <View style={st.inputBox}>
              <TextInput
                ref={input}
                value={txt}
                onChangeText={setTxt}
                placeholder={agora.pagina ? `Comentar como ${agora.name}…` : 'O que você acha disso?'}
                placeholderTextColor={colors.muted}
                style={st.input}
                multiline
                maxLength={600}
              />
              {txt.trim() ? (
                <TouchableOpacity onPress={enviar} disabled={enviando} style={st.send} accessibilityLabel="Publicar comentário">
                  {enviando ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-up-circle" size={30} color={colors.primary} />}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardLift>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { flex: 0.68, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginTop: 10 },
  title: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  cmt: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  reply: { paddingLeft: 66, paddingVertical: 6 },
  ring: { borderRadius: 999, padding: 2, borderWidth: 2, borderColor: colors.gold },
  av: { width: 40, height: 40, borderRadius: 20 },
  avSm: { width: 28, height: 28, borderRadius: 14 },
  head: { color: colors.text },
  name: { color: colors.text, fontWeight: '800', fontSize: 13.5 },
  pgTag: { color: colors.primary, fontWeight: '700', fontSize: 11.5 },
  time: { color: colors.muted, fontSize: 12.5 },
  text: { color: colors.text, fontSize: 14.5, lineHeight: 20, marginTop: 2 },
  mention: { color: colors.accent, fontWeight: '600' },
  acts: { flexDirection: 'row', marginTop: 6 },
  act: { color: colors.muted, fontWeight: '700', fontSize: 12.5 },
  heart: { alignItems: 'center', width: 44, paddingTop: 4 },
  likes: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  more: { flexDirection: 'row', alignItems: 'center', paddingLeft: 66, paddingVertical: 6 },
  moreLine: { width: 26, height: 1, backgroundColor: colors.borderStrong, marginRight: 10 },
  moreText: { color: colors.muted, fontWeight: '700', fontSize: 12.5 },
  emptyT: { color: colors.text, fontWeight: '800', fontSize: 17 },
  emptyS: { color: colors.muted, marginTop: 4 },
  replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardAlt, paddingHorizontal: 14, paddingVertical: 8 },
  replyingT: { color: colors.muted, fontSize: 12.5, flex: 1 },
  emojis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  emoji: { fontSize: 26 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 24, marginLeft: 10, paddingLeft: 14, paddingRight: 4, minHeight: 44 },
  input: { flex: 1, color: colors.text, fontSize: 15, maxHeight: 100, paddingVertical: 8 },
  send: { padding: 4 },
});
