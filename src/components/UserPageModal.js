// Página de usuário aberta por cima de qualquer tela (pela aba Páginas, pela busca ou pela Lotus).
// dispatch({ type: 'OPEN_USER_PAGE', id })
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Row, Input, Button, Photo } from './ui';
import { pageById, signatureOf, categoryOfPage } from '../userPages';
import { checkText } from '../lm/factCheck';

const when = (ts) => {
  const h = Math.max(0, Math.round((Date.now() - ts) / 3600000));
  return h < 1 ? 'agora' : h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
};

export default function UserPageModal() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const pg = state.viewUserPage ? pageById(state, state.viewUserPage) : null;
  if (!pg) return null;
  const mine = pg.ownerId === 'me';
  const following = !!(state.followingPages || {})[pg.id];
  const close = () => dispatch({ type: 'CLOSE_USER_PAGE' });
  const cat = categoryOfPage(pg.category);
  const posts = pg.posts.filter((p) => mine || !p.flagged);

  const publish = () => {
    const t = text.trim();
    if (!t) return;
    // A mesma IA dos posts da Community confere antes: notícia falsa não é publicada.
    const v = checkText(t).verdict;
    dispatch({ type: 'PAGE_POST', id: pg.id, post: { text: t } });
    setText('');
    if (v === 'falso') Alert.alert('Post não publicado', 'A verificação do Re@lys identificou informação falsa. Confira a fonte antes de publicar.');
    else if (v === 'suspeito') Alert.alert('Post em verificação', 'Ele aparece para você e fica visível para todos depois que o Re@lys conferir.');
  };
  const report = () =>
    Alert.alert('Denunciar página', pg.anon ? 'A página é anônima, mas o dono é verificado: o Re@lys analisa e pode bloquear.' : 'O Re@lys vai analisar a página.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Notícia falsa', onPress: () => dispatch({ type: 'PAGE_REPORT', id: pg.id, kind: 'Fake news', detail: 'Usuário denunciou notícia falsa' }) },
      { text: 'Golpe ou se passando por alguém', onPress: () => dispatch({ type: 'PAGE_REPORT', id: pg.id, kind: 'Golpe', detail: 'Usuário denunciou golpe ou falsidade' }) },
    ]);
  const remove = () =>
    Alert.alert('Apagar página?', 'A página e os posts somem para todos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => dispatch({ type: 'PAGE_DELETE', id: pg.id }) },
    ]);

  return (
    <Modal visible animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[st.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View>
            <Photo uri={pg.cover} style={st.cover} fallback="📄" />
            <TouchableOpacity onPress={close} style={st.closeBtn} accessibilityLabel="Fechar página">
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={st.name}>{pg.name}</Text>
            <Text style={st.handle}>@{pg.handle} · {cat.label}</Text>
            {pg.anon ? (
              <View style={st.sealAnon}>
                <Ionicons name="eye-off-outline" size={15} color={colors.muted} />
                <Text style={st.sealAnonText}>Página anônima · dono verificado pelo Re@lys</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={st.seal}
                onPress={() => (mine ? null : dispatch({ type: 'OPEN_PROFILE', id: pg.ownerId }))}
                accessibilityLabel={`Ver o perfil de ${pg.ownerName}`}
              >
                <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
                <Text style={st.sealText}>{signatureOf(pg)}</Text>
              </TouchableOpacity>
            )}
            <Text style={st.about}>{pg.about}</Text>
            <Text style={st.small}>{pg.followers.toLocaleString('pt-BR')} seguidores · {pg.posts.length} posts</Text>

            {mine ? (
              <View style={st.box}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[st.boxTitle, { flex: 1 }]}>{pg.anon ? 'Publicando como anônima' : 'Publicando assinada com seu nome'}</Text>
                  <Switch value={pg.anon} onValueChange={(v) => dispatch({ type: 'PAGE_UPDATE', id: pg.id, patch: { anon: v } })} trackColor={{ true: colors.gold, false: colors.border }} thumbColor="#fff" accessibilityLabel="Página anônima" />
                </Row>
                <Input value={text} onChangeText={setText} placeholder="Escreva um post para a página" multiline maxLength={1000} style={{ marginTop: 10 }} />
                <Button title="Publicar" onPress={publish} small style={{ marginTop: 8 }} />
                <TouchableOpacity onPress={remove} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Apagar página</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Row style={{ marginTop: 12 }}>
                <Button title={following ? 'Seguindo' : 'Seguir'} variant={following ? 'light' : 'primary'} small onPress={() => dispatch({ type: 'PAGE_FOLLOW', id: pg.id })} />
                <TouchableOpacity onPress={report} style={{ marginLeft: 14 }} accessibilityLabel="Denunciar página">
                  <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13 }}>Denunciar</Text>
                </TouchableOpacity>
              </Row>
            )}

            <Text style={[st.boxTitle, { marginTop: 18 }]}>Posts</Text>
            {posts.map((p) => (
              <View key={p.id} style={st.post}>
                {p.flagged ? <Text style={st.flag}>Em verificação: só você vê até o Re@lys conferir.</Text> : null}
                <Text style={st.postText}>{p.text}</Text>
                {p.photo ? <Photo uri={p.photo} style={st.postPhoto} fallback="🖼️" /> : null}
                <Text style={st.small}>{when(p.at)} · {p.likes} curtidas</Text>
              </View>
            ))}
            {!posts.length ? <Text style={st.small}>Ainda não tem posts.</Text> : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  cover: { width: '100%', height: 170 },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  handle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  seal: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  sealText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700', marginLeft: 5 },
  sealAnon: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  sealAnonText: { color: colors.muted, fontSize: 12, fontWeight: '700', marginLeft: 5 },
  about: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 10 },
  small: { color: colors.muted, fontSize: 12, marginTop: 4 },
  box: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginTop: 14, ...soft },
  boxTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  post: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginTop: 10, ...soft },
  postText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  postPhoto: { width: '100%', height: 180, borderRadius: 12, marginTop: 8 },
  flag: { color: '#B7700C', fontSize: 12, fontWeight: '700', marginBottom: 4 },
});
