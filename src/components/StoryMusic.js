// Música no story (como no Instagram): quem publica escolhe uma música da galeria do Realyz
// e o trecho; o story toca a música junto (o som do vídeo fica mudo) e mostra a figurinha
// com a capa, o nome e o artista. A rádio/música que estava tocando pausa e volta depois.
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { allTracks, loadMusic, useMusic } from '../music';
import { holdRadio } from './RadioKit';

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

// Trechos para começar a música (segundos).
export const MUSIC_PARTS = [
  { key: 0, label: 'Início' },
  { key: 30, label: '0:30' },
  { key: 60, label: '1:00' },
  { key: 90, label: '1:30' },
];

// O que fica guardado no story.
export const storyMusicOf = (t, start = 0) => ({ id: t.id, title: t.title, artist: t.artist, cover: t.cover || null, emoji: t.emoji || '🎵', url: t.url, start });

function Player({ url, start, paused }) {
  const player = EV.useVideoPlayer({ uri: url }, (p) => {
    p.loop = true;
    p.muted = false;
  });
  useEffect(() => {
    const sub = player.addListener('statusChange', (e) => {
      if (e && e.status === 'readyToPlay' && start) {
        try {
          if (player.currentTime < start - 1) player.currentTime = start;
        } catch (er) {}
      }
    });
    return () => sub.remove();
  }, [player, start]);
  useEffect(() => {
    try {
      if (paused) player.pause();
      else player.play();
    } catch (e) {}
  }, [paused, player]);
  return null;
}

// Toca a música do story. Some (para) quando o componente sai da tela.
export function StoryMusicPlayer({ music, paused }) {
  useEffect(() => {
    if (!music) return;
    holdRadio(true);
    return () => holdRadio(false);
  }, [music && music.id]);
  if (!EV || !music || !music.url) return null;
  return <Player key={`${music.id}-${music.start || 0}`} url={music.url} start={music.start || 0} paused={paused} />;
}

// Figurinha da música em cima do story.
export function MusicSticker({ music, onPress, style }) {
  if (!music) return null;
  const body = (
    <View style={[st.sticker, style]}>
      {music.cover ? <Image source={{ uri: music.cover }} style={st.stickerCover} /> : <Text style={{ fontSize: 18 }}>{music.emoji || '🎵'}</Text>}
      <View style={{ flexShrink: 1, marginLeft: 8 }}>
        <Text numberOfLines={1} style={st.stickerTitle}>
          <Ionicons name="musical-notes" size={12} color={colors.gold} /> {music.title}
        </Text>
        <Text numberOfLines={1} style={st.stickerArtist}>{music.artist}</Text>
      </View>
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityLabel={`Música do Now: ${music.title}, de ${music.artist}`}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

// Escolher a música: busca por nome, artista ou gênero, ouvir antes (toque no play) e escolher o trecho.
export function MusicPicker({ visible, current, onPick, onRemove, onClose }) {
  const insets = useSafeAreaInsets();
  useMusic();
  const [q, setQ] = useState('');
  const [listen, setListen] = useState(null); // faixa que está tocando na prévia
  const [sel, setSel] = useState(null);
  const [part, setPart] = useState(0);
  useEffect(() => {
    if (!visible) return setListen(null);
    loadMusic();
    setQ('');
    setSel(current ? current.id : null);
    setPart(current ? current.start || 0 : 0);
  }, [visible]);
  const tracks = allTracks();
  const list = useMemo(() => {
    const n = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const k = n(q.trim());
    return k ? tracks.filter((t) => n(`${t.title} ${t.artist} ${t.genre}`).includes(k)) : tracks;
  }, [q, tracks.length]);
  const chosen = tracks.find((t) => t.id === sel) || null;
  const previewMusic = listen ? storyMusicOf(listen, sel === listen.id ? part : 0) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[st.sheet, { paddingBottom: 14 + insets.bottom }]}>
          <View style={st.grip} />
          <View style={st.head}>
            <Text style={st.title}>Música no Now</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={st.search}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar música, artista ou gênero"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={st.searchInput}
              returnKeyType="search"
            />
          </View>
          <ScrollView style={{ maxHeight: 330 }} keyboardShouldPersistTaps="handled">
            {list.map((t) => {
              const on = sel === t.id;
              const playing = listen && listen.id === t.id;
              return (
                <TouchableOpacity key={t.id} style={[st.row, on && st.rowOn]} onPress={() => setSel(t.id)} activeOpacity={0.85} accessibilityLabel={`Escolher ${t.title}, de ${t.artist}`}>
                  {t.cover ? <Image source={{ uri: t.cover }} style={st.cover} /> : <View style={st.cover}><Text>{t.emoji || '🎵'}</Text></View>}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text numberOfLines={1} style={st.rowTitle}>{t.title}</Text>
                    <Text numberOfLines={1} style={st.rowSub}>{t.artist}{t.genre ? ` · ${t.genre}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setListen(playing ? null : t)} hitSlop={8} style={st.playBtn} accessibilityLabel={playing ? 'Parar a prévia' : `Ouvir ${t.title}`}>
                    <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#fff" />
                  </TouchableOpacity>
                  {on ? <Ionicons name="checkmark-circle" size={20} color={colors.gold} style={{ marginLeft: 8 }} /> : null}
                </TouchableOpacity>
              );
            })}
            {!list.length ? <Text style={st.empty}>Nenhuma música encontrada.</Text> : null}
          </ScrollView>
          {chosen ? (
            <>
              <Text style={st.partLabel}>Trecho</Text>
              <View style={{ flexDirection: 'row' }}>
                {MUSIC_PARTS.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => (setPart(p.key), setListen(chosen))}
                    style={[st.part, part === p.key && st.partOn]}
                    accessibilityLabel={`Começar a música em ${p.label}`}
                  >
                    <Text numberOfLines={1} style={[st.partText, part === p.key && { color: colors.onPrimary }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            {current ? (
              <TouchableOpacity style={st.ghost} onPress={() => (setListen(null), onRemove())}>
                <Text numberOfLines={1} style={st.ghostText}>Tirar música</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[st.main, !chosen && { opacity: 0.5 }]}
              disabled={!chosen}
              onPress={() => (setListen(null), onPick(storyMusicOf(chosen, part)))}
            >
              <Text numberOfLines={1} style={st.mainText}>Usar esta música</Text>
            </TouchableOpacity>
          </View>
        </View>
        {visible ? <StoryMusicPlayer music={previewMusic} paused={false} /> : null}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sticker: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: 260, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderWidth: 1, borderColor: 'rgba(226,182,73,0.55)' },
  stickerCover: { width: 32, height: 32, borderRadius: 8 },
  stickerTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stickerArtist: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#12131A', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: '#fff', fontWeight: '800', fontSize: 16 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 9, paddingHorizontal: 8, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12 },
  rowOn: { backgroundColor: 'rgba(226,182,73,0.14)' },
  cover: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  playBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  empty: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingVertical: 20 },
  partLabel: { color: '#fff', fontWeight: '700', marginTop: 10, marginBottom: 6 },
  part: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226,182,73,0.4)' },
  partOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  partText: { color: '#FDE68A', fontWeight: '700', fontSize: 13 },
  ghost: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', marginRight: 8 },
  ghostText: { color: '#fff', fontWeight: '700' },
  main: { flex: 2, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 22, backgroundColor: colors.gold },
  mainText: { color: colors.onPrimary, fontWeight: '800' },
});
