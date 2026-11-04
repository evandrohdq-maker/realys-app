import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { Screen, Title, Photo, Badge, Row, Input } from '../../components/ui';
import { artists, artMedia, ART_KINDS } from '../../extraData';
import { MediaList } from '../../components/CompanyProfile';

// Artistas: músicas em MP3, vídeos e obras. Cada artista tem a sua página.
export default function ArtistsScreen({ explore }) {
  const { dispatch } = useStore();
  const [kind, setKind] = useState('todos');
  const [q, setQ] = useState('');
  useEffect(() => {
    if (explore && explore.art) setKind(explore.art);
  }, [explore]);

  const term = q.trim().toLowerCase();
  const list = artists.filter((a) => !term || (a.name + ' ' + a.genre + ' ' + a.city).toLowerCase().includes(term));
  const media = artMedia
    .filter((m) => kind === 'todos' || m.kind === kind)
    .filter((m) => list.some((a) => a.id === m.ownerId))
    .sort((a, b) => b.plays - a.plays);

  return (
    <Screen>
      <Title sub="Ouça, assista e apoie artistas reais">Artistas</Title>
      <Input placeholder="Buscar artista, estilo ou cidade" value={q} onChangeText={setQ} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {list.map((a) => (
          <TouchableOpacity key={a.id} style={styles.artist} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: a.id })} activeOpacity={0.85}>
            <Photo uri={a.cover} style={styles.artistImg} fallback={a.logo} />
            <View style={{ padding: 8 }}>
              <Text style={styles.name} numberOfLines={1}>{a.logo} {a.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{a.genre} · {a.city.split(' - ')[0]}</Text>
              {a.verified ? <View style={{ marginTop: 4 }}><Badge label="Verificado" /></View> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Row style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {ART_KINDS.map((k) => {
          const on = k.key === kind;
          return (
            <TouchableOpacity key={k.key} onPress={() => setKind(k.key)} style={[styles.chip, on && styles.chipOn]}>
              <Ionicons name={k.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </Row>

      <Text style={styles.h2}>Em alta</Text>
      <MediaList items={media} showOwner />

      <View style={styles.cta}>
        <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
        <Text style={[styles.sub, { flex: 1, marginLeft: 8, marginTop: 0 }]}>
          É artista? Cadastre seu CNPJ ou MEI e publique faixas MP3, vídeos e obras pela área empresarial (aba Página).
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  artist: { width: 160, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginRight: 10, overflow: 'hidden' },
  artistImg: { width: '100%', height: 90 },
  name: { fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { marginLeft: 5, fontWeight: '700', color: colors.primary, fontSize: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12, marginTop: 8 },
});
