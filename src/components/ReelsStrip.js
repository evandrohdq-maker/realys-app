// De vez em quando, no meio do feed: uma faixa de Reels em miniatura (em pé, 9:16) que passa para o
// lado. Tocar abre os Reels a partir daquele vídeo.
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { ReelsViewer } from './Reels';

const views = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')} mil` : String(n));

export default function ReelsStrip({ reels }) {
  const [open, setOpen] = useState(null);
  if (!reels || !reels.length) return null;
  return (
    <View style={st.box}>
      <View style={st.head}>
        <Ionicons name="play-circle-outline" size={18} color={colors.text} />
        <Text style={st.title}>Reels</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {reels.map((r, i) => {
          const src = r.poster || r.photo;
          return (
            <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => setOpen(i)} style={st.card} accessibilityLabel={`Abrir Reels: ${r.title}`}>
              {src ? <Image source={typeof src === 'string' ? { uri: src } : src} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              <View style={st.shade} />
              <View style={st.foot}>
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={st.views}>{views(r.views || 0)}</Text>
              </View>
              <Text style={st.cap} numberOfLines={2}>{r.title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ReelsViewer reels={reels} index={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  box: { marginVertical: 8 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { marginLeft: 6, fontSize: 16, fontWeight: '800', color: colors.text },
  card: { width: 118, aspectRatio: 9 / 16, borderRadius: 14, overflow: 'hidden', marginRight: 8, backgroundColor: colors.border },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', backgroundColor: 'rgba(20,18,14,0.28)' },
  foot: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center' },
  views: { color: '#fff', fontWeight: '800', fontSize: 11.5, marginLeft: 3 },
  cap: { position: 'absolute', left: 8, right: 8, bottom: 26, color: '#fff', fontWeight: '700', fontSize: 11.5 },
});
