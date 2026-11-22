// Perfil de uma conta real (servidor): abre ao tocar no nome ou na foto de quem está no Realyz de
// verdade (busca de pessoas, Contatos, pedidos de amizade). Mostra foto, nome, *usuário, o que a
// pessoa escreveu sobre ela, a amizade (Adicionar, Aceitar, Enviado, Amigos), Mensagem e as
// publicações e depoimentos que ela deixou visíveis.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Photo } from './ui';
import { api, API_URL } from '../api';
import { addFriend, removeFriend } from '../serverFriends';
import { openMedia } from './MediaViewer';

let openListener = null;
export const openServerProfile = (id) => openListener && openListener(id);
const full = (u) => (u && u.startsWith('/') ? API_URL + u : u || null);

export function ServerProfileHost() {
  const [id, setId] = useState(null);
  useEffect(() => {
    openListener = setId;
    return () => (openListener = null);
  }, []);
  if (!id) return null;
  return <ServerProfile id={id} onClose={() => setId(null)} />;
}

function ServerProfile({ id, onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () =>
    api('GET', `/users/${id}`)
      .then(setP)
      .catch((e) => setErr(e.message || 'Não deu para abrir este perfil.'));
  useEffect(() => {
    load();
  }, [id]);
  const first = p ? (p.name || '').split(' ')[0] : '';
  const act = (fn) => {
    setBusy(true);
    fn()
      .then(load)
      .catch((e) => Alert.alert('Não deu certo', e.message))
      .finally(() => setBusy(false));
  };
  const unfriend = () =>
    Alert.alert('Desfazer amizade?', `Você e ${first} deixam de ser amigos no Realyz.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Desfazer', style: 'destructive', onPress: () => act(() => removeFriend(id)) },
    ]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[st.cover, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={st.back} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        {!p && !err ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null}
        {err ? <Text style={st.err}>{err}</Text> : null}
        {p ? (
          <View style={{ paddingHorizontal: 16 }}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => p.photo && openMedia([{ photo: full(p.photo), title: p.name }])} style={st.avatarWrap} accessibilityLabel={`Foto de ${p.name}`}>
              {p.photo ? (
                <Photo uri={full(p.photo)} style={st.avatar} fallback="🙂" />
              ) : (
                <View style={[st.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: colors.onPrimary, fontWeight: '900', fontSize: 34 }}>{first.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={st.name}>
              {p.name}{p.verified ? <> <Ionicons name="shield-checkmark" size={16} color={colors.primary} /></> : null}
            </Text>
            {p.username ? <Text style={st.handle}>*{p.username}</Text> : null}
            {p.about ? <Text style={st.about}>{p.about}</Text> : null}

            <View style={st.row}>
              {p.friend === 'amigos' ? (
                <>
                  <Btn icon="chatbubble-ellipses" label="Mensagem" solid onPress={() => (onClose(), dispatch({ type: 'OPEN_SERVER_CHAT', userId: p.id, name: p.name }))} />
                  <Btn icon="people" label="Amigos" onPress={unfriend} />
                </>
              ) : p.friend === 'enviado' ? (
                <Btn icon="time-outline" label="Pedido enviado" onPress={() => Alert.alert('Pedido enviado', `Quando ${first} aceitar, vocês viram amigos.`)} />
              ) : p.friend === 'recebido' ? (
                <>
                  <Btn icon="checkmark" label="Aceitar" solid onPress={busy ? undefined : () => act(() => addFriend(id))} />
                  <Btn icon="close" label="Recusar" onPress={busy ? undefined : () => act(() => removeFriend(id))} />
                </>
              ) : (
                <Btn icon="person-add" label={busy ? '…' : 'Adicionar'} solid onPress={busy ? undefined : () => act(() => addFriend(id))} />
              )}
            </View>

            {p.visible === false ? (
              <View style={st.locked}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <Text style={[st.small, { marginLeft: 8, flex: 1 }]}>{first} mostra as publicações só para amigos.</Text>
              </View>
            ) : null}

            {(p.posts || []).length ? <Text style={st.h}>Publicações</Text> : null}
            {(p.posts || []).map((x) => (
              <View key={x.id} style={st.post}>
                {x.text ? <Text style={{ color: colors.text, lineHeight: 20 }}>{x.text}</Text> : null}
                {x.media ? (
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(x.media) ? { video: full(x.media) } : { photo: full(x.media) }])}>
                    <Photo uri={full(x.media)} style={st.postImg} fallback="🖼️" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {p.visible !== false && !(p.posts || []).length ? <Text style={st.small}>{first} ainda não publicou nada.</Text> : null}

            {(p.testimonials || []).length ? <Text style={st.h}>Depoimentos</Text> : null}
            {(p.testimonials || []).map((t) => (
              <View key={t.id} style={st.post}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t.fromName}</Text>
                <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{t.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

function Btn({ icon, label, onPress, solid }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.btn, solid ? st.btnSolid : st.btnLine]} activeOpacity={0.85} accessibilityLabel={label}>
      <Ionicons name={icon} size={16} color={solid ? colors.onPrimary : colors.primary} />
      <Text numberOfLines={1} style={[st.btnText, { color: solid ? colors.onPrimary : colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  cover: { height: 130, backgroundColor: '#F1E7CF', paddingHorizontal: 14 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { marginTop: -48, alignSelf: 'flex-start', borderRadius: 50, borderWidth: 3, borderColor: colors.gold, backgroundColor: colors.bg },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  handle: { color: colors.muted, marginTop: 2 },
  about: { color: colors.text, marginTop: 10, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginRight: 8, marginBottom: 8 },
  btnSolid: { backgroundColor: colors.primary },
  btnLine: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff' },
  btnText: { fontWeight: '700', marginLeft: 6 },
  locked: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 12, padding: 12, marginTop: 8 },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  post: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, ...soft },
  postImg: { width: '100%', height: 220, borderRadius: 10, marginTop: 8 },
  small: { color: colors.muted, fontSize: 13, marginTop: 8 },
  err: { color: colors.danger, textAlign: 'center', marginTop: 30, paddingHorizontal: 24 },
});
