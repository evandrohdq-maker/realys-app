// "Sugestões para você" no feed da Community: cartões que rolam para o lado, com foto redonda,
// nome, amigos em comum, botão Adicionar e X para dispensar. Só com conta real (servidor).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { api, mediaUrl } from '../api';
import { addFriend } from '../serverFriends';
import { openServerProfile } from './ServerProfile';
import { Photo } from './ui';
import { colors } from '../theme';

export default function SugestoesCarrossel({ on }) {
  const [lista, setLista] = useState([]);
  const [status, setStatus] = useState({}); // id → 'enviado'
  useEffect(() => {
    if (!on) return;
    let vivo = true;
    api('GET', '/me/sugestoes')
      .then((l) => vivo && setLista((l || []).map((u) => ({ ...u, photo: mediaUrl(u.photo) }))))
      .catch(() => {});
    return () => (vivo = false);
  }, [on]);
  if (!on || !lista.length) return null;

  const adicionar = (u) =>
    addFriend(u.id)
      .then((r) => setStatus((s) => ({ ...s, [u.id]: r.status || 'enviado' })))
      .catch((e) => Alert.alert('Adicionar', e.message));
  const dispensar = (id) => setLista((l) => l.filter((u) => u.id !== id));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Sugestões para você</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
        {lista.map((u) => {
          const st = status[u.id];
          return (
            <View key={u.id} style={styles.card}>
              <TouchableOpacity style={styles.x} onPress={() => dispensar(u.id)} hitSlop={8} accessibilityLabel={`Dispensar ${u.name}`}>
                <Ionicons name="close" size={16} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => openServerProfile(u.id)} style={{ alignItems: 'center' }} accessibilityLabel={`Ver perfil de ${u.name}`}>
                {u.photo ? (
                  <Photo uri={u.photo} style={styles.foto} fallback="🙂" />
                ) : (
                  <View style={[styles.foto, styles.inicial]}>
                    <Text style={styles.inicialTxt}>{(u.name || '?')[0]}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={styles.nome}>{u.name}</Text>
                <Text numberOfLines={1} style={styles.sub}>{u.emComum ? `${u.emComum} em comum` : 'Sugestão para você'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, st && styles.btnFeito]}
                disabled={!!st}
                onPress={() => adicionar(u)}
                accessibilityLabel={`Adicionar ${u.name}`}
              >
                <Text numberOfLines={1} style={[styles.btnTxt, st && styles.btnTxtFeito]}>{st === 'amigos' ? 'Amigos' : st ? 'Enviado' : 'Adicionar'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  title: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 },
  card: { width: 150, backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 16, paddingBottom: 10, paddingHorizontal: 10, marginRight: 8, alignItems: 'center' },
  x: { position: 'absolute', top: 6, right: 6, zIndex: 2 },
  foto: { width: 76, height: 76, borderRadius: 38 },
  inicial: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  inicialTxt: { color: colors.primary, fontWeight: '800', fontSize: 26 },
  nome: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 8, maxWidth: 130 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2, maxWidth: 130 },
  btn: { alignSelf: 'stretch', marginTop: 10, borderRadius: 9, paddingVertical: 7, backgroundColor: colors.primary, alignItems: 'center' },
  btnFeito: { backgroundColor: colors.cardAlt },
  btnTxt: { color: colors.onPrimary, fontWeight: '700', fontSize: 13 },
  btnTxtFeito: { color: colors.text },
});
