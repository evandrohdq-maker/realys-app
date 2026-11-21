// Peças do Stream (rádios e TVs):
//  - CatChips: categorias de transmissão em fileira (Todas, Sertaneja, Gospel… / Notícias, Esportes…).
//  - StationFormExtras: no cadastro da rádio/TV, escolher a categoria e enviar a logo e a capa.
//  - FeaturedStation: destaque da rádio principal no topo do Stream.
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { catsOf, stationCat, guessCat, openStation } from '../streamCats';
import { StationLogo, logoSource } from './RadioKit';

const C = { text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', line: '#EFE6CC', soft: '#FAF7EF' };

export function CatChips({ kind, value, onChange, counts = {} }) {
  const cats = catsOf(kind);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }} contentContainerStyle={{ paddingRight: 8 }}>
      {[{ key: 'todas', label: 'Todas', icon: 'apps-outline' }, ...cats].map((c) => {
        const on = value === c.key;
        return (
          <TouchableOpacity key={c.key} onPress={() => onChange(c.key)} style={[st.chip, on && { borderColor: c.tint || C.gold, backgroundColor: (c.tint || C.gold) + '18' }]} accessibilityLabel={`Categoria ${c.label}`}>
            <Ionicons name={c.icon} size={14} color={on ? c.tint || C.gold : C.muted} />
            <Text numberOfLines={1} style={[st.chipText, on && { color: C.text }]}>{c.label}</Text>
            {c.key !== 'todas' && counts[c.key] ? <Text style={st.count}>{counts[c.key]}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

async function pick(aspect) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Fotos', 'Libere o acesso às fotos para enviar a imagem.');
    return null;
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8 });
  return r.canceled || !r.assets || !r.assets[0] ? null : r.assets[0].uri;
}

// form = { cat, logo, cover, genre, name }. Com o servidor, as imagens sobem junto ao salvar (uploadMedia).
export function StationFormExtras({ kind, form, setForm }) {
  const auto = guessCat(kind, `${form.genre} ${form.name}`);
  const current = form.cat || auto;
  const cover = logoSource(form.cover);
  return (
    <View>
      <Text style={st.label}>Categoria</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {catsOf(kind).map((c) => {
          const on = current === c.key;
          return (
            <TouchableOpacity key={c.key} onPress={() => setForm({ ...form, cat: c.key })} style={[st.chip, { marginBottom: 6 }, on && { borderColor: c.tint, backgroundColor: c.tint + '18' }]}>
              <Text style={{ fontSize: 13 }}>{c.emoji}</Text>
              <Text numberOfLines={1} style={[st.chipText, on && { color: C.text }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!form.cat ? <Text style={st.hint}>Escolhida pelo estilo que você escreveu. Toque para trocar.</Text> : null}

      <Text style={st.label}>Logo e capa</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={async () => { const u = await pick([1, 1]); if (u) setForm({ ...form, logo: u }); }} accessibilityLabel="Enviar a logo">
          <StationLogo s={form} kind={kind} size={72} radius={18} />
          <View style={st.editBadge}><Ionicons name="camera" size={12} color="#fff" /></View>
        </TouchableOpacity>
        <TouchableOpacity style={[st.coverBox, { backgroundColor: stationCat(kind, form).tint + '22' }]} onPress={async () => { const u = await pick([16, 9]); if (u) setForm({ ...form, cover: u }); }} accessibilityLabel="Enviar a capa">
          {cover ? <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <Ionicons name="image-outline" size={20} color={cover ? '#fff' : C.muted} />
          <Text numberOfLines={1} style={{ color: cover ? '#fff' : C.muted, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{cover ? 'Trocar capa' : 'Capa do perfil'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={st.hint}>A logo aparece no player, na janelinha por cima dos outros apps, na notificação e no perfil.</Text>
    </View>
  );
}

export function FeaturedStation({ s, kind = 'radio', onPlay, on }) {
  if (!s) return null;
  const cat = stationCat(kind, s);
  const cover = logoSource(s.cover);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => openStation(kind, s.id)} style={st.hero} accessibilityLabel={`Abrir o perfil de ${s.name}`}>
      {cover ? <Image source={cover} style={[StyleSheet.absoluteFill, { opacity: 0.22 }]} resizeMode="cover" /> : null}
      <StationLogo s={s} kind={kind} size={78} radius={20} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={st.heroTag}>★ RÁDIO PRINCIPAL</Text>
        <Text style={st.heroName} numberOfLines={1}>{s.name}</Text>
        <Text style={st.heroMeta} numberOfLines={1}>{cat.label} · ao vivo 24h</Text>
      </View>
      <TouchableOpacity onPress={onPlay} style={[st.heroPlay, on && { backgroundColor: '#E5484D' }]} accessibilityLabel={on ? `Parar ${s.name}` : `Ouvir ${s.name}`}>
        <Ionicons name={on ? 'stop' : 'play'} size={24} color="#fff" style={on ? null : { marginLeft: 3 }} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, marginRight: 7, backgroundColor: '#fff' },
  chipText: { color: C.muted, fontWeight: '700', fontSize: 12.5, marginLeft: 5 },
  count: { color: C.gold, fontWeight: '800', fontSize: 11, marginLeft: 5 },
  label: { color: C.muted, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  hint: { color: C.muted, fontSize: 11, marginTop: 4 },
  editBadge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  coverBox: { flex: 1, height: 72, marginLeft: 12, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  // Claro e dourado (sem fundo preto).
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 14, overflow: 'hidden', backgroundColor: '#FFF8E4', borderWidth: 1, borderColor: '#EAD7A4' },
  heroTag: { color: '#B8860B', fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  heroName: { color: C.text, fontWeight: '800', fontSize: 20, marginTop: 2 },
  heroMeta: { color: C.muted, fontSize: 12.5, marginTop: 2 },
  heroPlay: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
