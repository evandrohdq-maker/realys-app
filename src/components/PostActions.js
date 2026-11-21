// Curtir, comentar e compartilhar um post de loja. O cliente interage com os posts à vontade;
// conversa direta com a loja não existe — o contato nasce da compra (vitrine e produtos).
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Share } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';

export default function PostActions({ post, author }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const liked = !!(state.liked && state.liked[post.id]);
  const mine = (state.postComments && state.postComments[post.id]) || [];
  const share = () =>
    Share.share({ message: `${author ? author + ': ' : ''}${post.text || 'Veja este post'} (via Realyz · realyz.com.br)` }).catch(() => {});
  const send = () => {
    const v = txt.trim();
    if (!v) return;
    dispatch({ type: 'POST_COMMENT', id: post.id, text: v, who: (state.myProfile && state.myProfile.name) || 'Você' });
    setTxt('');
  };
  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => dispatch({ type: 'TOGGLE_LIKE', id: post.id })} accessibilityLabel={liked ? 'Descurtir' : 'Curtir'}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#E0245E' : colors.text} />
          <Text style={styles.n}>{(post.likes || 0) + (liked ? 1 : 0)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)} accessibilityLabel="Comentar">
          <Ionicons name="chatbubble-outline" size={19} color={colors.text} />
          <Text style={styles.n}>{(post.comments || 0) + mine.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={share} accessibilityLabel="Compartilhar">
          <Ionicons name="paper-plane-outline" size={19} color={colors.text} />
          <Text style={styles.n}>Compartilhar</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.back} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.head}>
              <Text style={styles.title}>Comentários</Text>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="Fechar">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {mine.length ? (
                mine.map((c) => (
                  <View key={c.id} style={styles.c}>
                    <Text style={styles.who}>{c.who}</Text>
                    <Text style={{ color: colors.text }}>{c.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>Seja o primeiro a comentar.</Text>
              )}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput value={txt} onChangeText={setTxt} placeholder="Escreva um comentário" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={send} returnKeyType="send" />
              <TouchableOpacity style={styles.send} onPress={send} accessibilityLabel="Enviar comentário">
                <Ionicons name="send" size={16} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', marginRight: 18, paddingVertical: 4 },
  n: { marginLeft: 5, color: colors.text, fontWeight: '600', fontSize: 13 },
  back: { flex: 1, backgroundColor: 'rgba(40,32,18,0.25)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.card, borderRadius: 20, padding: 16, width: '100%', maxWidth: 460, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  c: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  who: { fontWeight: '700', color: colors.text, marginBottom: 2 },
  empty: { color: colors.muted, paddingVertical: 14, textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, color: colors.text },
  send: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
