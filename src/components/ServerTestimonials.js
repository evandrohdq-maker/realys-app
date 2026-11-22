// Depoimentos das contas reais: cartão do feed e caixa de "esperando a sua aprovação".
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Photo } from './ui';
import { openServerProfile } from '../profileOpen';
import { decideTestimonial } from '../serverTestimonials';

const first = (n) => String(n || '').split(' ')[0];

function Avatar({ uri, name, size, onPress }) {
  const body = uri ? (
    <Photo uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} fallback="🙂" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{first(name).charAt(0).toUpperCase()}</Text>
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} accessibilityLabel={`Ver perfil de ${name}`}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

// Depoimento aceito (feed da Community). Tocar em quem escreveu ou em quem recebeu abre o perfil.
export function ServerTestimonialCard({ t }) {
  return (
    <View style={st.card}>
      <View style={st.head}>
        <Avatar uri={t.fromPhoto} name={t.fromName} size={42} onPress={() => openServerProfile(t.fromId)} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.who} numberOfLines={2}>
            <Text onPress={() => openServerProfile(t.fromId)}>{t.fromName}</Text>
            <Text style={st.verb}> escreveu para </Text>
            {t.toId ? <Text onPress={() => openServerProfile(t.toId)}>{t.toName}</Text> : null}
          </Text>
          <Text style={st.time}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} /> Aprovado por {first(t.toName)} · {t.time}
          </Text>
        </View>
      </View>
      <Text style={st.text}>“{t.text}”</Text>
    </View>
  );
}

// Depoimentos que chegaram para mim e esperam eu aceitar ou recusar.
export function ServerPendingTestimonials({ pending }) {
  const [busy, setBusy] = useState(null);
  if (!pending || !pending.length) return null;
  const decide = (t, aceitar) => {
    setBusy(t.id);
    decideTestimonial(t.serverId, aceitar)
      .catch((e) => Alert.alert('Depoimento', e.message))
      .finally(() => setBusy(null));
  };
  return (
    <View style={st.pendingBox}>
      <Text style={st.pendingTitle}>
        <Ionicons name="mail-unread-outline" size={15} color={colors.primaryDark} /> {pending.length === 1 ? '1 depoimento espera a sua aprovação' : `${pending.length} depoimentos esperam a sua aprovação`}
      </Text>
      {pending.map((t) => (
        <View key={t.id} style={st.pendingItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar uri={t.fromPhoto} name={t.fromName} size={34} onPress={() => openServerProfile(t.fromId)} />
            <Text style={[st.who, { marginLeft: 8, flex: 1 }]} numberOfLines={1}>
              {t.fromName} <Text style={st.verb}>· {t.time}</Text>
            </Text>
          </View>
          <Text style={[st.text, { marginTop: 6 }]}>“{t.text}”</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity disabled={busy === t.id} onPress={() => decide(t, true)} style={[st.btn, { backgroundColor: colors.primary }]} accessibilityLabel={`Aceitar depoimento de ${t.fromName}`}>
              <Text numberOfLines={1} style={{ color: colors.onPrimary, fontWeight: '800' }}>Aceitar</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy === t.id} onPress={() => decide(t, false)} style={[st.btn, { borderWidth: 1, borderColor: colors.border, marginLeft: 8 }]} accessibilityLabel={`Recusar depoimento de ${t.fromName}`}>
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>Recusar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.card || '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center' },
  who: { color: colors.text, fontWeight: '800', fontSize: 14 },
  verb: { color: colors.muted, fontWeight: '500' },
  time: { color: colors.muted, fontSize: 11, marginTop: 2 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 10, fontStyle: 'italic' },
  pendingBox: { backgroundColor: '#FFF8E6', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.gold },
  pendingTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  pendingItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 6 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
});
