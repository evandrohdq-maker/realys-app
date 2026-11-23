// Página de usuário aberta por cima de qualquer tela (pela aba Páginas, pela busca ou pela Lotus).
// dispatch({ type: 'OPEN_USER_PAGE', id })
import React, { useEffect, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Row, Input, Button, Photo } from './ui';
import ThemeArt from './ThemeArt';
import { pageById, signatureOf, categoryOfPage, pageStyle, pageNameProblem, PAGE_ACCENTS, PAGE_BACKGROUNDS, PAGE_FONTS, PAGE_LAYOUTS, PAGE_CATEGORIES } from '../userPages';
import { moderateText } from '../moderation';
import { checkText } from '../lm/factCheck';
import { editPhoto } from './PhotoEditor';

const when = (ts) => {
  const h = Math.max(0, Math.round((Date.now() - ts) / 3600000));
  return h < 1 ? 'agora' : h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
};

// Escolhe uma foto da galeria (capa ou foto de post). Devolve o endereço ou null.
async function pickPhoto() {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Autorize o Realyz a ver suas fotos.');
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.95 });
    if (res.canceled || !res.assets || !res.assets[0]) return null;
    return await editPhoto(res.assets[0].uri, { confirm: 'Usar foto' });
  } catch (e) {
    return null;
  }
}

// Editor da página (estilo blog): nome, texto de apresentação, assunto, capa e aparência.
function PageEditor({ pg, visible, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState(null);
  useEffect(() => {
    if (visible && pg) setF({ name: pg.name, about: pg.about, category: pg.category, cover: pg.cover, style: { ...pageStyle(pg), accent: (pg.style && pg.style.accent) || pageStyle(pg).accent } });
  }, [visible]);
  if (!pg || !f) return null;
  const setStyle = (patch) => setF({ ...f, style: { ...f.style, ...patch } });
  const th = pageStyle({ style: f.style });
  const save = () => {
    const name = f.name.trim();
    if (name !== pg.name) {
      const problem = pageNameProblem(name, pg.anon, { userPages: (state.userPages || []).filter((x) => x.id !== pg.id) });
      if (problem) return Alert.alert('Confira o nome', problem);
    }
    if (!f.about.trim()) return Alert.alert('Apresentação', 'Escreva uma frase sobre a página.');
    const mod = moderateText(`${name} ${f.about}`);
    if (!mod.ok) return Alert.alert('Não foi possível salvar', mod.why);
    const { accent, bg, font, layout } = f.style;
    dispatch({ type: 'PAGE_UPDATE', id: pg.id, patch: { name, about: f.about.trim(), category: f.category, cover: f.cover, style: { accent, bg, font, layout } } });
    onClose();
  };
  const Swatch = ({ color, on, onPress, label }) => (
    <TouchableOpacity onPress={onPress} accessibilityLabel={label} style={[st.swatch, { backgroundColor: color, borderColor: on ? colors.text : colors.borderStrong, borderWidth: on ? 3 : 1 }]} />
  );
  const Opt = ({ on, label, hint, onPress, family }) => (
    <TouchableOpacity onPress={onPress} style={[st.opt, on && st.optOn]} accessibilityLabel={label}>
      <Text style={[st.optText, on && { color: '#fff' }, family ? { fontFamily: family } : null]}>{label}</Text>
      {hint ? <Text style={[st.optHint, on && { color: 'rgba(255,255,255,0.8)' }]}>{hint}</Text> : null}
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.edHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={st.edClose} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.edTitle}>Editar página</Text>
          <TouchableOpacity onPress={save} style={st.edSave} accessibilityLabel="Salvar a página">
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Salvar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          {/* Prévia ao vivo do estilo escolhido */}
          <View style={[st.pv, { backgroundColor: th.tone.bg, borderColor: th.tone.line, overflow: 'hidden' }]}>
            {th.tone.art ? <ThemeArt theme={th.tone.art} /> : null}
            <Photo uri={f.cover} style={st.pvCover} fallback="📄" />
            <View style={{ padding: 12 }}>
              <Text style={{ color: th.tone.text, fontWeight: '800', fontSize: 18, fontFamily: th.family }} numberOfLines={1}>{f.name || 'Nome da página'}</Text>
              <View style={{ height: 3, width: 44, borderRadius: 2, backgroundColor: th.accent, marginTop: 6 }} />
              <Text style={{ color: th.tone.muted, fontSize: 12.5, marginTop: 8, fontFamily: th.family }} numberOfLines={2}>{f.about || 'Apresentação da página'}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={async () => {
              const uri = await pickPhoto();
              if (uri) setF({ ...f, cover: uri });
            }}
            style={st.coverBtn}
            accessibilityLabel="Trocar a capa da página"
          >
            <Ionicons name="image-outline" size={16} color={colors.text} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>Trocar a capa</Text>
          </TouchableOpacity>

          <Text style={st.label}>Nome da página</Text>
          <TextInput value={f.name} onChangeText={(v) => setF({ ...f, name: v })} style={st.field} maxLength={50} placeholderTextColor={colors.muted} />
          <Text style={st.label}>Apresentação</Text>
          <TextInput value={f.about} onChangeText={(v) => setF({ ...f, about: v })} style={[st.field, { minHeight: 70, textAlignVertical: 'top' }]} multiline maxLength={300} placeholderTextColor={colors.muted} />

          <Text style={st.label}>Assunto</Text>
          <View style={st.wrapRow}>
            {PAGE_CATEGORIES.map((c) => (
              <Opt key={c.key} on={f.category === c.key} label={c.label} onPress={() => setF({ ...f, category: c.key })} />
            ))}
          </View>

          <Text style={st.label}>Cor de destaque</Text>
          <View style={st.wrapRow}>
            {PAGE_ACCENTS.map((c) => (
              <Swatch key={c} color={c} on={f.style.accent === c} onPress={() => setStyle({ accent: c })} label={`Cor ${c}`} />
            ))}
          </View>

          <Text style={st.label}>Fundo e tema</Text>
          <View style={st.wrapRow}>
            {PAGE_BACKGROUNDS.map((b) => (
              <Opt key={b.key} on={f.style.bg === b.key} label={b.label} onPress={() => setStyle({ bg: b.key })} />
            ))}
          </View>

          <Text style={st.label}>Letra</Text>
          <View style={st.wrapRow}>
            {PAGE_FONTS.map((x) => (
              <Opt key={x.key} on={f.style.font === x.key} label={x.label} family={x.family} onPress={() => setStyle({ font: x.key })} />
            ))}
          </View>

          <Text style={st.label}>Formato dos posts</Text>
          <View style={st.wrapRow}>
            {PAGE_LAYOUTS.map((l) => (
              <Opt key={l.key} on={f.style.layout === l.key} label={l.label} hint={l.hint} onPress={() => setStyle({ layout: l.key })} />
            ))}
          </View>
        </ScrollView>
      </KeyboardLift>
    </Modal>
  );
}

export default function UserPageModal() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState(null);
  const [editing, setEditing] = useState(false); // editor da página
  const [editPost, setEditPost] = useState(null); // id do post em edição
  const pg = state.viewUserPage ? pageById(state, state.viewUserPage) : null;
  useEffect(() => {
    setText('');
    setTitle('');
    setPhoto(null);
    setEditPost(null);
    setEditing(false);
  }, [state.viewUserPage]);
  if (!pg) return null;
  const mine = pg.ownerId === 'me';
  const following = !!(state.followingPages || {})[pg.id];
  const close = () => dispatch({ type: 'CLOSE_USER_PAGE' });
  const cat = categoryOfPage(pg.category);
  const posts = pg.posts.filter((p) => mine || !p.flagged);
  // Aparência escolhida pelo dono (cor, fundo, letra e formato dos posts).
  const th = pageStyle(pg);
  const T = th.tone;
  const ff = th.family ? { fontFamily: th.family } : null;

  const publish = () => {
    const t = text.trim();
    if (!t) return;
    // A mesma IA dos posts da Community confere antes: notícia falsa não é publicada.
    const v = checkText(`${title} ${t}`).verdict;
    if (editPost) {
      if (v === 'falso') return Alert.alert('Post não salvo', 'A verificação do Realyz identificou informação falsa. Confira a fonte antes de publicar.');
      dispatch({ type: 'PAGE_POST_EDIT', id: pg.id, postId: editPost, patch: { text: t, title: title.trim(), photo } });
    } else {
      dispatch({ type: 'PAGE_POST', id: pg.id, post: { text: t, ...(title.trim() ? { title: title.trim() } : {}), ...(photo ? { photo } : {}) } });
      if (v === 'falso') Alert.alert('Post não publicado', 'A verificação do Realyz identificou informação falsa. Confira a fonte antes de publicar.');
      else if (v === 'suspeito') Alert.alert('Post em verificação', 'Ele aparece para você e fica visível para todos depois que o Realyz conferir.');
    }
    setText('');
    setTitle('');
    setPhoto(null);
    setEditPost(null);
  };
  const startEdit = (p) => {
    setEditPost(p.id);
    setTitle(p.title || '');
    setText(p.text || '');
    setPhoto(p.photo || null);
  };
  const delPost = (p) =>
    Alert.alert('Apagar este post?', p.title || p.text.slice(0, 60), [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => dispatch({ type: 'PAGE_POST_DELETE', id: pg.id, postId: p.id }) },
    ]);
  const report = () =>
    Alert.alert('Denunciar página', pg.anon ? 'A página é anônima, mas o dono é verificado: o Realyz analisa e pode bloquear.' : 'O Realyz vai analisar a página.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Notícia falsa', onPress: () => dispatch({ type: 'PAGE_REPORT', id: pg.id, kind: 'Fake news', detail: 'Usuário denunciou notícia falsa' }) },
      { text: 'Golpe ou se passando por alguém', onPress: () => dispatch({ type: 'PAGE_REPORT', id: pg.id, kind: 'Golpe', detail: 'Usuário denunciou golpe ou falsidade' }) },
    ]);
  const remove = () =>
    Alert.alert('Apagar página?', 'A página e os posts somem para todos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => dispatch({ type: 'PAGE_DELETE', id: pg.id }) },
    ]);

  const flat = th.layout !== 'cartoes'; // blog e revista: texto corrido, sem cartão
  return (
    <Modal visible animationType="slide" onRequestClose={close} statusBarTranslucent><KeyboardLift style={{ flex: 1 }}>
      <View style={[st.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: T.bg }]}>
        {T.art ? <ThemeArt theme={T.art} /> : null}
        <ScrollView keyboardShouldPersistTaps="handled">
          <View>
            <Photo uri={pg.cover} style={st.cover} fallback="📄" />
            <TouchableOpacity onPress={close} style={st.closeBtn} accessibilityLabel="Fechar página">
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            {mine ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={st.editBtn} accessibilityLabel="Editar a página: nome, capa, cores e formato">
                <Ionicons name="color-palette-outline" size={16} color="#fff" />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800', fontSize: 12.5, marginLeft: 6 }}>Editar página</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={{ padding: 16 }}>
            <Text style={[st.name, { color: T.text }, ff]}>{pg.name}</Text>
            <View style={{ height: 3, width: 48, borderRadius: 2, backgroundColor: th.accent, marginTop: 6 }} />
            <Text style={[st.handle, { color: T.muted }]}>*{pg.handle} · {cat.label}</Text>
            {pg.anon ? (
              <View style={[st.sealAnon, { backgroundColor: T.card }]}>
                <Ionicons name="eye-off-outline" size={15} color={T.muted} />
                <Text style={[st.sealAnonText, { color: T.muted }]}>Página anônima · dono verificado pelo Realyz</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[st.seal, { backgroundColor: T.card }]}
                onPress={() => (mine ? null : dispatch({ type: 'OPEN_PROFILE', id: pg.ownerId }))}
                disabled={mine}
                accessibilityLabel={`Ver o perfil de ${pg.ownerName}`}
              >
                <Ionicons name="shield-checkmark" size={15} color={th.accent} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.sealText, { color: T.text }]}>{signatureOf(pg)}</Text>
              </TouchableOpacity>
            )}
            <Text style={[st.about, { color: T.text }, ff]}>{pg.about}</Text>
            <Text style={[st.small, { color: T.muted }]}>{pg.followers.toLocaleString('pt-BR')} seguidores · {pg.posts.length} posts</Text>

            {mine ? (
              <View style={st.box}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[st.boxTitle, { flex: 1 }]}>{editPost ? 'Editando o post' : pg.anon ? 'Novo post (anônima)' : 'Novo post (assinado com seu nome)'}</Text>
                  {editPost ? null : (
                    <Switch value={pg.anon} onValueChange={(v) => dispatch({ type: 'PAGE_UPDATE', id: pg.id, patch: { anon: v } })} trackColor={{ true: colors.text, false: colors.border }} thumbColor="#fff" accessibilityLabel="Página anônima" />
                  )}
                </Row>
                <Input value={title} onChangeText={setTitle} placeholder="Título (opcional)" maxLength={90} style={{ marginTop: 10 }} />
                <Input value={text} onChangeText={setText} placeholder="Escreva o texto do post" multiline maxLength={3000} style={{ marginTop: 8 }} />
                {photo ? <Photo uri={photo} style={st.postPhoto} fallback="🖼️" /> : null}
                <Row style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      if (photo) return setPhoto(null);
                      const uri = await pickPhoto();
                      if (uri) setPhoto(uri);
                    }}
                    style={st.photoBtn}
                    accessibilityLabel={photo ? 'Tirar a foto do post' : 'Pôr uma foto no post'}
                  >
                    <Ionicons name={photo ? 'close' : 'image-outline'} size={16} color={colors.text} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 6 }}>{photo ? 'Tirar foto' : 'Foto'}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  {editPost ? (
                    <TouchableOpacity onPress={() => { setEditPost(null); setText(''); setTitle(''); setPhoto(null); }} style={{ marginRight: 12 }}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.muted, fontWeight: '700' }}>Cancelar</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Button title={editPost ? 'Salvar post' : 'Publicar'} onPress={publish} small />
                </Row>
                <TouchableOpacity onPress={remove} style={{ marginTop: 12 }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Apagar página</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Row style={{ marginTop: 12 }}>
                <Button title={following ? 'Seguindo' : 'Seguir'} variant={following ? 'light' : 'primary'} small onPress={() => dispatch({ type: 'PAGE_FOLLOW', id: pg.id })} />
                <TouchableOpacity onPress={report} style={{ marginLeft: 14 }} accessibilityLabel="Denunciar página">
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: T.muted, fontWeight: '700', fontSize: 13 }}>Denunciar</Text>
                </TouchableOpacity>
              </Row>
            )}

            <Text style={[st.boxTitle, { marginTop: 18, color: T.text }, ff]}>Posts</Text>
            {posts.map((p) => (
              <View key={p.id} style={flat ? [st.postFlat, { borderTopColor: T.line }] : [st.post, { backgroundColor: T.card }]}>
                {p.flagged ? <Text style={st.flag}>Em verificação: só você vê até o Realyz conferir.</Text> : null}
                {th.layout === 'revista' && p.photo ? <Photo uri={p.photo} style={st.postPhotoBig} fallback="🖼️" /> : null}
                {p.title ? <Text style={[st.postTitle, { color: T.text, fontSize: th.layout === 'cartoes' ? 16 : 20 }, ff]}>{p.title}</Text> : null}
                <Text style={[st.postText, { color: T.text }, flat && { fontSize: 15, lineHeight: 23 }, ff]}>{p.text}</Text>
                {th.layout !== 'revista' && p.photo ? <Photo uri={p.photo} style={st.postPhoto} fallback="🖼️" /> : null}
                <Row style={{ marginTop: 6 }}>
                  <Text style={[st.small, { color: T.muted, marginTop: 0, flex: 1 }]}>{when(p.at)}{p.editedAt ? ' · editado' : ''} · {p.likes} curtidas</Text>
                  {mine ? (
                    <>
                      <TouchableOpacity onPress={() => startEdit(p)} hitSlop={8} accessibilityLabel="Editar este post">
                        <Ionicons name="create-outline" size={17} color={th.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => delPost(p)} hitSlop={8} style={{ marginLeft: 14 }} accessibilityLabel="Apagar este post">
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </>
                  ) : null}
                </Row>
              </View>
            ))}
            {!posts.length ? <Text style={[st.small, { color: T.muted }]}>Ainda não tem posts.</Text> : null}
          </View>
        </ScrollView>
      </View>
      <PageEditor pg={mine ? pg : null} visible={mine && editing} onClose={() => setEditing(false)} />
    </KeyboardLift></Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  cover: { width: '100%', height: 170 },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  editBtn: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  handle: { color: colors.muted, fontSize: 13, marginTop: 8 },
  seal: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  sealText: { fontSize: 12, fontWeight: '700', marginLeft: 5 },
  sealAnon: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  sealAnonText: { fontSize: 12, fontWeight: '700', marginLeft: 5 },
  about: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  small: { color: colors.muted, fontSize: 12, marginTop: 4 },
  box: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginTop: 14, ...soft },
  boxTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong },
  post: { borderRadius: 16, padding: 12, marginTop: 10, ...soft },
  postFlat: { paddingVertical: 16, marginTop: 4, borderTopWidth: 1 },
  postTitle: { fontWeight: '800', marginBottom: 6 },
  postText: { fontSize: 14, lineHeight: 20 },
  postPhoto: { width: '100%', height: 180, borderRadius: 12, marginTop: 8 },
  postPhotoBig: { width: '100%', height: 210, borderRadius: 14, marginBottom: 10 },
  flag: { color: '#B7700C', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  // editor
  edHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  edTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  edClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  edSave: { backgroundColor: colors.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  pv: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  pvCover: { width: '100%', height: 90 },
  coverBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, marginTop: 10 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  field: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, backgroundColor: colors.card },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  swatch: { width: 36, height: 36, borderRadius: 18, marginRight: 10, marginBottom: 8 },
  opt: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  optOn: { backgroundColor: colors.text },
  optText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  optHint: { color: colors.muted, fontSize: 10.5, marginTop: 1 },
});
