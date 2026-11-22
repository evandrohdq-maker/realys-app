// Lista dos amigos de contas reais com o botão "Convidar": o convite vai como mensagem no Realyz
// (cai na conversa da pessoa e vira notificação com o app fechado). Usado na Arena Gamer e no Hub.
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../responsive';
import { Photo } from './ui';
import { useStore } from '../store';
import { conectado } from '../serverShop';
import { useServerFriends, sendInviteMessage } from '../serverFriends';

// makeText(friend) → Promise<string> com o texto do convite (o link é gerado na hora).
export default function RealFriendsInvite({ makeText, title = 'Seus amigos no Realyz', dark }) {
  const { state } = useStore();
  const { friends } = useServerFriends(conectado(state));
  const [sent, setSent] = useState({});
  const [busy, setBusy] = useState(null);
  if (!friends.length) return null;
  const go = async (u) => {
    setBusy(u.id);
    try {
      const text = await makeText(u);
      await sendInviteMessage(u.id, text);
      setSent((x) => ({ ...x, [u.id]: true }));
    } catch (e) {
      Alert.alert('Convite não enviado', e.message || 'Tente de novo.');
    } finally {
      setBusy(null);
    }
  };
  const ink = dark ? '#fff' : '#1B1B1F';
  return (
    <View>
      <Text style={[st.label, { color: dark ? 'rgba(255,255,255,0.7)' : '#7A7468' }]}>{title}</Text>
      {friends.map((u) => {
        const done = sent[u.id];
        const first = (u.name || '').split(' ')[0];
        return (
          <View key={u.id} style={st.row}>
            {u.photo ? (
              <Photo uri={u.photo} style={st.av} fallback="🙂" />
            ) : (
              <View style={[st.av, { backgroundColor: '#B8860B', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{first.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: ink, fontWeight: '700' }} numberOfLines={1}>{u.name}</Text>
              <Text style={{ color: '#7A7468', fontSize: 12 }} numberOfLines={1}>{done ? 'Convite enviado por mensagem' : u.username ? `*${u.username}` : 'amigo no Realyz'}</Text>
            </View>
            <TouchableOpacity disabled={!!done || busy === u.id} onPress={() => go(u)} style={[st.btn, done && st.btnDone]} accessibilityLabel={`Convidar ${u.name}`}>
              <Text numberOfLines={1} style={[st.btnTxt, done && { color: '#7A7468' }]}>{done ? 'Enviado' : busy === u.id ? '…' : 'Convidar'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  av: { width: 38, height: 38, borderRadius: 19 },
  btn: { backgroundColor: '#B8860B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnDone: { backgroundColor: '#F4F0E4' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
});
