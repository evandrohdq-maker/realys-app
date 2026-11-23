// Música no story (como no Instagram): quem publica escolhe uma música da galeria do Realyz
// e o trecho EXATO numa barrinha (arrasta a janela pela música toda e já ouve o trecho tocando);
// o story toca só aquele trecho, em repetição, junto com a foto ou o vídeo (o som do vídeo fica
// mudo) e mostra a figurinha com a capa, o nome e o artista. Foto com música fica 5, 10 ou 15 s
// no ar (a pessoa escolhe); vídeo usa o tempo do próprio vídeo.
// A rádio/música que estava tocando pausa e volta depois.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, PanResponder } from 'react-native';
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

// Quanto tempo a foto (ou o story de texto) com música fica na tela.
export const PHOTO_MUSIC_SECS = [5, 10, 15];
export const PHOTO_MUSIC_DEFAULT = 15;

// O que fica guardado no story: start = onde o trecho começa; len = quanto dura (segundos).
export const storyMusicOf = (t, start = 0, len = 0) => ({ id: t.id, title: t.title, artist: t.artist, cover: t.cover || null, emoji: t.emoji || '🎵', url: t.url, start: Math.max(0, Math.round(start * 10) / 10), len: len || 0 });

const mmss = (x) => {
  const v = Math.max(0, Math.floor(x || 0));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

// Toca a música e, se tiver "len", repete só o trecho escolhido.
function Player({ url, start, len, paused, onTime, onDuration }) {
  const cb = useRef({});
  cb.current = { onTime, onDuration };
  const player = EV.useVideoPlayer({ uri: url }, (p) => {
    p.loop = true;
    p.muted = false;
    try {
      p.timeUpdateEventInterval = 0.2;
    } catch (e) {}
  });
  useEffect(() => {
    const seek = () => {
      try {
        player.currentTime = start || 0;
      } catch (er) {}
    };
    const s1 = player.addListener('statusChange', (e) => {
      if (e && e.status === 'readyToPlay') {
        if (player.duration > 0 && cb.current.onDuration) cb.current.onDuration(player.duration);
        if (start && Math.abs((player.currentTime || 0) - start) > 0.6) seek();
      }
    });
    const s2 = player.addListener('timeUpdate', (e) => {
      const t = e && typeof e.currentTime === 'number' ? e.currentTime : player.currentTime;
      // Passou do fim do trecho (ou a música voltou ao começo): volta para o início do trecho.
      if (len && (t >= start + len || t < start - 0.5)) seek();
      if (cb.current.onTime) cb.current.onTime(t);
    });
    return () => (s1.remove(), s2.remove());
  }, [player, start, len]);
  useEffect(() => {
    try {
      if (paused) player.pause();
      else player.play();
    } catch (e) {}
  }, [paused, player]);
  return null;
}

// Toca a música do story. Some (para) quando o componente sai da tela.
export function StoryMusicPlayer({ music, paused, onTime, onDuration }) {
  useEffect(() => {
    if (!music) return;
    holdRadio(true);
    return () => holdRadio(false);
  }, [music && music.id]);
  if (!EV || !music || !music.url) return null;
  return <Player key={`${music.id}-${music.start || 0}-${music.len || 0}`} url={music.url} start={music.start || 0} len={music.len || 0} paused={paused} onTime={onTime} onDuration={onDuration} />;
}

// Barrinha do trecho: a música inteira em ondas; a janela dourada é o pedaço que vai no story.
// Arrasta a janela para escolher; ao soltar, a prévia toca a partir dali.
const BARS = 64;
function waveOf(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  for (let i = 0; i < BARS; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const base = 0.35 + 0.35 * Math.abs(Math.sin(i / 5 + (h % 7)));
    out.push(Math.min(1, base + ((h >>> 16) % 100) / 300));
  }
  return out;
}
function MusicTrimmer({ trackId, duration, start, len, pos, onMove, onSet }) {
  const [w, setW] = useState(0);
  const wave = useMemo(() => waveOf(trackId), [trackId]);
  const dur = Math.max(duration || 0, len + 1);
  const winW = Math.max(28, (len / dur) * w);
  const left = w ? (Math.min(start, dur - len) / Math.max(1, dur - len)) * (w - winW) : 0;
  const ref = useRef({});
  ref.current = { w, dur, len, start, winW, onMove, onSet };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => (ref.current.s0 = ref.current.start),
        onPanResponderMove: (_, g) => {
          const c = ref.current;
          if (!c.w) return;
          const span = Math.max(1, c.w - c.winW);
          const v = Math.min(Math.max(0, c.s0 + (g.dx / span) * Math.max(0, c.dur - c.len)), Math.max(0, c.dur - c.len));
          c.last = v;
          c.onMove(v);
        },
        onPanResponderRelease: () => {
          const c = ref.current;
          c.onSet(c.last != null ? c.last : c.start);
          c.last = null;
        },
      }),
    []
  );
  const barW = w / BARS;
  const inWin = (i) => {
    const x = (i + 0.5) * barW;
    return x >= left && x <= left + winW;
  };
  const prog = pos != null && len ? Math.min(1, Math.max(0, (pos - start) / len)) : null;
  return (
    <View>
      <View style={st.trimHead}>
        <Text style={st.partLabel}>Trecho</Text>
        <Text style={st.trimTime}>{mmss(start)} – {mmss(start + len)}</Text>
      </View>
      <View style={st.trim} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
        {w ? wave.map((h, i) => <View key={i} style={[st.bar, { left: i * barW + barW * 0.2, width: Math.max(1.5, barW * 0.6), height: 8 + h * 38, top: (56 - (8 + h * 38)) / 2, backgroundColor: inWin(i) ? colors.gold : 'rgba(255,255,255,0.28)' }]} />) : null}
        {w ? (
          <View pointerEvents="none" style={[st.win, { left, width: winW }]}>
            {prog != null ? <View style={[st.playhead, { left: Math.max(0, prog * winW - 1) }]} /> : null}
          </View>
        ) : null}
      </View>
      <Text style={st.trimHint}>Arraste a barrinha para escolher o momento exato da música</Text>
    </View>
  );
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityLabel={`Música do story: ${music.title}, de ${music.artist}`}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

// Escolher a música: busca por nome, artista ou gênero, ouvir antes (toque no play) e escolher o trecho.
// videoSecs: duração do vídeo do story (o trecho da música tem o mesmo tamanho). Sem vídeo
// (foto ou texto), a pessoa escolhe 5, 10 ou 15 s.
export function MusicPicker({ visible, current, onPick, onRemove, onClose, videoSecs }) {
  const insets = useSafeAreaInsets();
  useMusic();
  const [q, setQ] = useState('');
  const [listen, setListen] = useState(null); // faixa que está tocando na prévia
  const [sel, setSel] = useState(null);
  const [part, setPart] = useState(0); // início do trecho (segundos), já valendo para a prévia
  const [drag, setDrag] = useState(null); // enquanto arrasta a barrinha
  const [photoLen, setPhotoLen] = useState(PHOTO_MUSIC_DEFAULT);
  const [durs, setDurs] = useState({}); // duração real de cada música (descoberta ao tocar)
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!visible) return setListen(null);
    loadMusic();
    setQ('');
    setSel(current ? current.id : null);
    setPart(current ? current.start || 0 : 0);
    setPhotoLen(!videoSecs && current && current.len ? current.len : PHOTO_MUSIC_DEFAULT);
    setDrag(null);
    setPos(null);
  }, [visible]);
  const len = videoSecs ? Math.max(1, Math.min(30, Math.round(videoSecs))) : photoLen;
  const tracks = allTracks();
  const list = useMemo(() => {
    const n = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const k = n(q.trim());
    return k ? tracks.filter((t) => n(`${t.title} ${t.artist} ${t.genre}`).includes(k)) : tracks;
  }, [q, tracks.length]);
  const chosen = tracks.find((t) => t.id === sel) || null;
  const dur = chosen ? durs[chosen.id] || chosen.duration || 180 : 180;
  // Escolheu a música: a prévia já toca o trecho, em repetição (como no Instagram).
  const choose = (t) => {
    setSel(t.id);
    if (!chosen || chosen.id !== t.id) setPart(0);
    setPos(null);
    setListen(t);
  };
  const previewMusic = listen ? (chosen && listen.id === chosen.id ? storyMusicOf(listen, part, len) : storyMusicOf(listen, 0)) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[st.sheet, { paddingBottom: 14 + insets.bottom }]}>
          <View style={st.grip} />
          <View style={st.head}>
            <Text style={st.title}>Música no story</Text>
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
                <TouchableOpacity key={t.id} style={[st.row, on && st.rowOn]} onPress={() => choose(t)} activeOpacity={0.85} accessibilityLabel={`Escolher ${t.title}, de ${t.artist}`}>
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
              <MusicTrimmer
                trackId={chosen.id}
                duration={dur}
                start={drag != null ? drag : Math.min(part, Math.max(0, dur - len))}
                len={len}
                pos={drag != null ? null : pos}
                onMove={setDrag}
                onSet={(v) => (setDrag(null), setPos(null), setPart(v), setListen(chosen))}
              />
              {!videoSecs ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text style={[st.partLabel, { marginTop: 0, marginBottom: 0, marginRight: 8 }]}>Duração</Text>
                  {PHOTO_MUSIC_SECS.map((x) => (
                    <TouchableOpacity key={x} onPress={() => setPhotoLen(x)} style={[st.part, photoLen === x && st.partOn]} accessibilityLabel={`Story de ${x} segundos`}>
                      <Text numberOfLines={1} style={[st.partText, photoLen === x && { color: colors.onPrimary }]}>{x} s</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={st.trimHint}>O trecho tem o tamanho do seu vídeo ({len} s) e toca junto com ele.</Text>
              )}
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
              onPress={() => (setListen(null), onPick(storyMusicOf(chosen, Math.min(part, Math.max(0, dur - len)), len)))}
            >
              <Text numberOfLines={1} style={st.mainText}>Usar esta música</Text>
            </TouchableOpacity>
          </View>
        </View>
        {visible ? (
          <StoryMusicPlayer
            music={previewMusic}
            paused={drag != null}
            onTime={(t) => chosen && listen && listen.id === chosen.id && setPos(t)}
            onDuration={(d) => listen && setDurs((x) => (x[listen.id] ? x : { ...x, [listen.id]: d }))}
          />
        ) : null}
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
  trimHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trimTime: { color: colors.gold, fontWeight: '800', marginTop: 10, marginBottom: 6, fontVariant: ['tabular-nums'] },
  trim: { height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', overflow: 'hidden' },
  bar: { position: 'absolute', borderRadius: 2 },
  win: { position: 'absolute', top: 0, bottom: 0, borderRadius: 12, borderWidth: 2.5, borderColor: colors.gold, backgroundColor: 'rgba(226,182,73,0.12)' },
  playhead: { position: 'absolute', top: 4, bottom: 4, width: 2, backgroundColor: '#fff', borderRadius: 1 },
  trimHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  partLabel: { color: '#fff', fontWeight: '700', marginTop: 10, marginBottom: 6 },
  part: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226,182,73,0.4)' },
  partOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  partText: { color: '#FDE68A', fontWeight: '700', fontSize: 13 },
  ghost: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', marginRight: 8 },
  ghostText: { color: '#fff', fontWeight: '700' },
  main: { flex: 2, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 22, backgroundColor: colors.gold },
  mainText: { color: colors.onPrimary, fontWeight: '800' },
});
