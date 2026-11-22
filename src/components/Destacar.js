// Destacar: deixar um ATALHO de um post, story ou reel que a pessoa já publicou nos lugares do
// perfil dela — pastas de Destaques, Mural e Vitrine (portfólio). Não é cópia: o destaque aponta
// para o original (mesmo arquivo, guarda { ref: { kind, id } }) e, tocado, abre o original.
// Dá para escolher já na hora de publicar (Nova publicação, Novo Reel) ou depois: no story
// (botão Destacar), no post (ícone de destaque) e nos Stories salvos (arquivo).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { openMedia } from './MediaViewer';
import { Photo } from './ui';

export const DESTAQUE_VAZIO = { mural: false, vitrine: false, pastas: [], novaPasta: '' };
const NOME = { story: 'story', post: 'post', reel: 'reel' };

// alvo = { kind: 'story' | 'post' | 'reel', id, image, video, text }
export function aplicarDestaque(dispatch, alvo, esc) {
  if (!alvo || !esc) return 0;
  const ref = { kind: alvo.kind, id: alvo.id };
  const capa = alvo.image || null;
  const item = { id: `ref-${alvo.kind}-${alvo.id}-${Date.now()}`, ref, image: alvo.image || null, video: alvo.video || null, caption: alvo.text || '', time: 'destaque' };
  let n = 0;
  (esc.pastas || []).forEach((folderId) => {
    dispatch({ type: 'HIGHLIGHT_LINK', folderId, item });
    n += 1;
  });
  const nova = String(esc.novaPasta || '').trim();
  if (nova) {
    dispatch({ type: 'HIGHLIGHT_LINK', newTitle: nova.slice(0, 30), cover: capa, item });
    n += 1;
  }
  if (esc.mural) {
    dispatch({ type: 'MURAL_ADD', item: { id: 'm' + Date.now(), at: Date.now(), time: 'agora', type: 'post', ref, postId: `${alvo.kind}:${alvo.id}`, author: `Meu ${NOME[alvo.kind] || 'post'}`, text: alvo.text || '', image: alvo.image || null, video: alvo.video || null } });
    n += 1;
  }
  if (esc.vitrine) {
    dispatch({
      type: 'ADD_CREATION',
      item: {
        id: 'cr' + Date.now(), kind: alvo.video ? 'video' : 'foto', title: (alvo.text || `Meu ${NOME[alvo.kind] || 'post'}`).slice(0, 60), desc: '',
        cover: capa, video: alvo.video || null, fileUri: alvo.video || null, ref, dest: { portfolio: true }, at: Date.now(),
      },
    });
    n += 1;
  }
  return n;
}
export const temDestaque = (esc) => !!esc && (esc.mural || esc.vitrine || (esc.pastas || []).length || String(esc.novaPasta || '').trim());

// Escolha dos lugares (usada dentro do formulário de publicar e na janela de destacar).
export function DestaqueOpcoes({ value, onChange, light }) {
  const { state } = useStore();
  const v = { ...DESTAQUE_VAZIO, ...(value || {}) };
  const pastas = (state.myGallery && state.myGallery.highlights) || [];
  const [criando, setCriando] = useState(!!v.novaPasta);
  const set = (patch) => onChange({ ...v, ...patch });
  const togglePasta = (id) => set({ pastas: v.pastas.includes(id) ? v.pastas.filter((x) => x !== id) : [...v.pastas, id] });
  const ink = light ? '#fff' : colors.text;
  const Op = ({ on, icon, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[st.op, on && st.opOn]} accessibilityLabel={label} accessibilityState={{ selected: !!on }}>
      <Ionicons name={on ? 'checkmark-circle' : icon} size={15} color={on ? colors.primaryDark : colors.muted} />
      <Text numberOfLines={1} style={[st.opText, on && { color: colors.primaryDark, fontWeight: '800' }]}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View>
      <Text style={[st.h, { color: ink }]}>Destacar no meu perfil</Text>
      <Text style={st.small}>Fica um atalho para esta publicação: quem tocar abre o original.</Text>
      <View style={st.wrap}>
        <Op on={v.mural} icon="albums-outline" label="Mural" onPress={() => set({ mural: !v.mural })} />
        <Op on={v.vitrine} icon="briefcase-outline" label="Vitrine" onPress={() => set({ vitrine: !v.vitrine })} />
        {pastas.map((p) => (
          <Op key={p.id} on={v.pastas.includes(p.id)} icon="star-outline" label={p.title} onPress={() => togglePasta(p.id)} />
        ))}
        {!criando ? <Op icon="add" label="Nova pasta" onPress={() => setCriando(true)} /> : null}
      </View>
      {criando ? (
        <TextInput style={st.input} value={v.novaPasta} onChangeText={(t) => set({ novaPasta: t })} placeholder="Nome da pasta de destaque (ex.: Viagens)" placeholderTextColor={colors.muted} maxLength={30} />
      ) : null}
    </View>
  );
}

// Janela para destacar depois (story, post, story salvo).
let openListener = null;
export const abrirDestacar = (alvo) => openListener && openListener(alvo);
export function DestacarHost() {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [alvo, setAlvo] = useState(null);
  const [esc, setEsc] = useState(DESTAQUE_VAZIO);
  useEffect(() => {
    openListener = (a) => (setEsc(DESTAQUE_VAZIO), setAlvo(a));
    return () => (openListener = null);
  }, []);
  if (!alvo) return null;
  const fechar = () => setAlvo(null);
  const ok = () => {
    if (!temDestaque(esc)) return Alert.alert('Destacar', 'Escolha pelo menos um lugar: Mural, Vitrine ou uma pasta.');
    const n = aplicarDestaque(dispatch, alvo, esc);
    fechar();
    Alert.alert('Destacado ✨', n > 1 ? `Atalho criado em ${n} lugares do seu perfil.` : 'Atalho criado no seu perfil.');
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={fechar} statusBarTranslucent>
      <TouchableOpacity style={st.shade} activeOpacity={1} onPress={fechar} />
      <View style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <DestaqueOpcoes value={esc} onChange={setEsc} />
          <TouchableOpacity style={st.btn} onPress={ok} accessibilityLabel="Destacar">
            <Text style={st.btnText}>Destacar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  h: { fontWeight: '800', fontSize: 15, marginTop: 14 },
  small: { color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  op: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6, maxWidth: '100%' },
  opOn: { backgroundColor: '#FFFBEF', borderWidth: 1, borderColor: colors.primary },
  opText: { color: colors.text, fontSize: 13, marginLeft: 5 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, backgroundColor: '#fff', marginTop: 4 },
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 6, maxHeight: '80%' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  btnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
});

// Stories salvos (arquivo, como no Instagram): todo story publicado fica aqui, só o dono vê.
// Tocar abre o story; Destacar cria o atalho (pasta, mural, vitrine); segurar apaga do arquivo.
export function StoriesSalvos() {
  const { state, dispatch } = useStore();
  const lista = state.storyArchive || [];
  if (!lista.length) return <Text style={st.small}>Seus stories ficam guardados aqui depois que somem do ar (24 h). Só você vê.</Text>;
  const data = (t) => {
    const d = new Date(t || Date.now());
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  return (
    <View>
      <Text style={st.small}>Só você vê. Toque para abrir · Destacar para pôr no perfil · segure para apagar.</Text>
      <View style={st.wrap}>
        {lista.slice(0, 60).map((x) => (
          <View key={x.id} style={st.cel}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => (x.image || x.video ? openMedia([x.video ? { video: x.video, photo: x.image, title: x.text } : { photo: x.image, title: x.text }]) : Alert.alert('Story', x.text || ''))}
              onLongPress={() =>
                Alert.alert('Apagar dos salvos?', 'Some só do seu arquivo. Destaques que apontam para ele continuam.', [
                  { text: 'Manter', style: 'cancel' },
                  { text: 'Apagar', style: 'destructive', onPress: () => dispatch({ type: 'STORY_ARCHIVE_REMOVE', id: x.id }) },
                ])
              }
              style={[st.thumb, { backgroundColor: x.bg || '#1B1B1F' }]}
              accessibilityLabel={`Story de ${data(x.savedAt)}`}
            >
              {x.image ? <ImageThumb uri={x.image} /> : x.video ? <Ionicons name="play-circle" size={30} color="#F5C331" /> : <Text numberOfLines={4} style={st.thumbText}>{x.text}</Text>}
              <Text style={st.data}>{data(x.savedAt)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => abrirDestacar({ kind: 'story', id: x.id, image: x.image || null, video: x.video || null, text: x.text || '' })} style={st.destBtn} accessibilityLabel="Destacar este story">
              <Ionicons name="star-outline" size={13} color={colors.primary} />
              <Text style={st.destText}>Destacar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}
function ImageThumb({ uri }) {
  return <Photo uri={uri} style={StyleSheet.absoluteFill} fallback="🖼️" />;
}
Object.assign(st, StyleSheet.create({
  cel: { width: '31%', marginRight: '2%', marginBottom: 10 },
  thumb: { aspectRatio: 9 / 16, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 6 },
  thumbText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  data: { position: 'absolute', top: 4, left: 4, color: '#fff', fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 5, borderRadius: 6 },
  destBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, paddingVertical: 3 },
  destText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 3 },
}));
