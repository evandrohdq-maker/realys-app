// Conversa de verdade (pelo servidor do Realyz) com uma loja, prestador ou pessoa.
// Abre de qualquer tela: dispatch({ type: 'OPEN_SERVER_CHAT', userId, name }).
// Mensagens da loja escritas pelo atendente IA aparecem marcadas como "Assistente virtual".
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { api, connectEvents } from '../api';
import { colors } from '../theme';

export default function ChatServidor() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const open = state.serverChat;
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef(null);
  const me = state.user && state.user.serverId;

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

  if (!open) return null;
  const close = () => dispatch({ type: 'CLOSE_SERVER_CHAT' });
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
            <Text style={st.sub} numberOfLines={1}>Conversa protegida pelo Realyz: contato e pagamento sempre por aqui</Text>
          </View>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {!msgs.length ? <Text style={st.empty}>Mande sua dúvida. A loja responde por aqui.</Text> : null}
          {msgs.map((m) => {
            const mine = m.from === me;
            return (
              <View key={m.id} style={[st.bubble, mine ? st.mine : st.theirs]}>
                {!mine && m.ia ? <Text style={st.ia}>Assistente virtual</Text> : null}
                <Text style={[st.text, mine && { color: '#FBF8F1' }]}>{m.text}</Text>
              </View>
            );
          })}
        </ScrollView>
        <View style={[st.bar, { paddingBottom: 10 + insets.bottom }]}>
          <TextInput value={txt} onChangeText={setTxt} placeholder="Escreva sua mensagem" placeholderTextColor={colors.muted} style={st.input} multiline onSubmitEditing={enviar} />
          <TouchableOpacity onPress={enviar} disabled={busy || !txt.trim()} style={[st.send, (busy || !txt.trim()) && { opacity: 0.5 }]} accessibilityLabel="Enviar">
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardLift>
    </Modal>
  );
}

const st = StyleSheet.create({
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
