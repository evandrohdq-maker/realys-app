// Perfil do artista (músicas): abre ao tocar no nome do artista no mini player ou na lista de músicas.
// Capa, nome, gênero, as músicas dele (tocar a lista inteira, uma após a outra) e, se o artista
// também é membro do Realyz, o botão para o perfil social dele.
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { Photo } from './ui';
import { useMusic, useArtistOpen, closeArtist, artistTracks, playTrack } from '../music';
import { useRadioNow } from './RadioKit';
import { stopRadio } from '../radio';
import { memberByName } from '../people';

const short = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + ' mil' : String(n));

export function ArtistSheetHost() {
  const name = useArtistOpen();
  useMusic(); // atualiza se o artista publicar música nova
  if (!name) return null;
  return <ArtistSheet name={name} />;
}

function ArtistSheet({ name }) {
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();
  const n = useRadioNow();
  const tracks = artistTracks(name);
  const cover = (tracks.find((t) => t.cover) || {}).cover;
  const genres = [...new Set(tracks.map((t) => t.genre).filter(Boolean))].join(' · ');
  const plays = tracks.reduce((s, t) => s + (t.plays || 0), 0);
  const member = memberByName(name);
  const playingId = n.radio && n.radio.track && n.status !== 'parado' ? n.radio.id : null;
  const play = (t) => (playingId === t.id ? stopRadio() : playTrack(t, tracks));

  return (
    <Modal visible animationType="slide" onRequestClose={closeArtist}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[st.hero, { paddingTop: insets.top + 10 }]}>
          {cover ? <Photo uri={cover} style={StyleSheet.absoluteFill} /> : null}
          <View style={st.shade} />
          <TouchableOpacity onPress={closeArtist} style={[st.back, { top: insets.top + 8 }]} accessibilityLabel="Voltar">
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={st.heroText}>
            <Text style={st.kind}>ARTISTA</Text>
            <Text style={st.name} numberOfLines={2}>{name}</Text>
            <Text style={st.meta} numberOfLines={1}>{[genres, `${tracks.length} música${tracks.length === 1 ? '' : 's'}`, plays ? `${short(plays)} plays` : ''].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', padding: 16, paddingBottom: 6 }}>
          <TouchableOpacity style={st.playAll} onPress={() => tracks[0] && playTrack(tracks[0], tracks)} disabled={!tracks.length} accessibilityLabel={`Tocar as músicas de ${name}`}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6 }}>Tocar tudo</Text>
          </TouchableOpacity>
          {member ? (
            <TouchableOpacity
              style={st.social}
              onPress={() => {
                closeArtist();
                dispatch({ type: 'OPEN_PROFILE', id: member.id });
              }}
              accessibilityLabel={`Perfil social de ${name}`}
            >
              <Ionicons name="person-circle-outline" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>Perfil</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={st.h}>Músicas</Text>
        {tracks.map((t) => {
          const on = playingId === t.id;
          return (
            <TouchableOpacity key={t.id} style={st.row} onPress={() => play(t)} activeOpacity={0.85} accessibilityLabel={on ? `Parar ${t.title}` : `Ouvir ${t.title}`}>
              <View style={st.cover}>
                {t.cover ? <Photo uri={t.cover} style={StyleSheet.absoluteFill} fallback={t.emoji} /> : <Text style={{ fontSize: 22 }}>{t.emoji}</Text>}
                {on ? (
                  <View style={st.onCover}>
                    <Ionicons name="pause" size={18} color="#fff" />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: on ? colors.primary : colors.text, fontWeight: '800' }} numberOfLines={1}>{t.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{[t.genre, t.price ? brl(t.price) : ''].filter(Boolean).join(' · ')}</Text>
              </View>
              <Ionicons name={on ? 'pause-circle' : 'play-circle-outline'} size={26} color={colors.primary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

const st = StyleSheet.create({
  hero: { height: 260, justifyContent: 'flex-end', backgroundColor: '#1B1B1F', overflow: 'hidden' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  back: { position: 'absolute', left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  heroText: { padding: 16 },
  kind: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  name: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  meta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  playAll: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 18, height: 44 },
  social: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 16, height: 44, marginLeft: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  cover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F2ECDD', alignItems: 'center', justifyContent: 'center' },
  onCover: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
