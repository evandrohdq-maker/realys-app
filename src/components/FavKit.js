// Peças dos favoritos (src/favorites.js):
//  - FavHeart: o coraçãozinho de favoritar (rádio, TV, música).
//  - StreamerFav: coração + sininho do streamer (o sininho liga/desliga o aviso de "entrou ao vivo").
//  - PlaylistPlus / PlaylistSheet: o "+" que põe a música numa playlist (cria uma na hora, se quiser).
//  - FavStrip: a fileira "Seus favoritos" no topo do Stream e das Lives.
//  - FavLiveAlerts: montado no App; com o servidor no ar, recebe o aviso de que um streamer favorito abriu live.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform, ToastAndroid } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { useFavs, isFav, toggleFav, favList, wantsNotify, setStreamerNotify, pushLiveAlert, FAV_LABEL } from '../favorites';
import { useMusic, loadMusic, createPlaylist, togglePlaylistTrack } from '../music';
import { connectEvents, serverOn } from '../api';
import { Photo } from './ui';

const RED = '#E5484D';
const toast = (msg) => (Platform.OS === 'android' ? ToastAndroid.show(msg, ToastAndroid.SHORT) : null);
const nameOf = (kind, it) => (kind === 'music' ? it.title : kind === 'streamer' ? it.host : it.name);

// Coração de favoritar. color: cor do contorno; on: vermelho quando favoritado.
export function FavHeart({ kind, item, size = 20, color = colors.menu, style, hitSlop = 8 }) {
  useFavs();
  if (!item) return null;
  const on = isFav(kind, item);
  const tap = () => {
    const now = toggleFav(kind, item);
    toast(now ? `${nameOf(kind, item)} nos favoritos ❤️` : `${nameOf(kind, item)} saiu dos favoritos`);
  };
  return (
    <TouchableOpacity onPress={tap} hitSlop={hitSlop} style={style} accessibilityLabel={on ? `Tirar ${nameOf(kind, item)} dos favoritos` : `Favoritar ${nameOf(kind, item)}`}>
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={size} color={on ? RED : color} />
    </TouchableOpacity>
  );
}

// Coração + sininho do streamer. Favoritar pergunta (uma vez) se quer receber o aviso das lives;
// depois, o sininho liga e desliga quando quiser. Seguir a classe da live continua separado.
export function StreamerFav({ live, size = 18, color = colors.menu, style }) {
  useFavs();
  if (!live || !live.host || live.mine || live.hostId === 'me') return null;
  const on = isFav('streamer', live);
  const bell = on && wantsNotify(live);
  const heart = () => {
    if (on) {
      toggleFav('streamer', live);
      return toast(`${live.host} saiu dos favoritos`);
    }
    toggleFav('streamer', live);
    Alert.alert(`${live.host} nos favoritos ❤️`, 'Quer receber uma notificação sempre que ele entrar ao vivo? Dá para mudar depois no sininho.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Me avisar', onPress: () => setStreamerNotify(live, true) },
    ]);
  };
  const ring = () => {
    const now = setStreamerNotify(live, !bell);
    toast(now ? `Você vai ser avisado quando ${live.host} entrar ao vivo 🔔` : `Avisos de ${live.host} desligados`);
  };
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <TouchableOpacity onPress={heart} hitSlop={8} accessibilityLabel={on ? `Tirar ${live.host} dos favoritos` : `Favoritar ${live.host}`}>
        <Ionicons name={on ? 'heart' : 'heart-outline'} size={size} color={on ? RED : color} />
      </TouchableOpacity>
      {on ? (
        <TouchableOpacity onPress={ring} hitSlop={8} style={{ marginLeft: 8 }} accessibilityLabel={bell ? `Parar os avisos de ${live.host}` : `Receber aviso quando ${live.host} entrar ao vivo`}>
          <Ionicons name={bell ? 'notifications' : 'notifications-off-outline'} size={size - 1} color={bell ? colors.gold : color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// "+" que abre a escolha da playlist.
export function PlaylistPlus({ track, size = 18, color = colors.menu, style, hitSlop = 8, children }) {
  const [open, setOpen] = useState(false);
  if (!track) return null;
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} hitSlop={hitSlop} style={style} accessibilityLabel={`Adicionar ${track.title} a uma playlist`}>
        {children || <Ionicons name="add" size={size} color={color} />}
      </TouchableOpacity>
      {open ? <PlaylistSheet track={track} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Escolher a playlist da música (marca/desmarca) ou criar uma nova já com ela dentro.
export function PlaylistSheet({ track, onClose }) {
  const m = useMusic();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => {
    let alive = true;
    loadMusic().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const create = () => {
    const n = name.trim();
    if (!n || !ready) return;
    const p = createPlaylist(n);
    togglePlaylistTrack(p.id, track.id);
    setName('');
    toast(`"${track.title}" entrou na playlist ${n}`);
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.4)' }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={st.sheetTitle} numberOfLines={1}>Adicionar "{track.title}"</Text>
            <FavHeart kind="music" item={track} size={22} />
          </View>
          <Text style={st.sheetSub} numberOfLines={1}>{track.artist}</Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {m.playlists.map((p) => {
              const inIt = p.tracks.includes(track.id);
              return (
                <TouchableOpacity key={p.id} style={st.row} onPress={() => ready && togglePlaylistTrack(p.id, track.id)} accessibilityLabel={inIt ? `Tirar da playlist ${p.name}` : `Pôr na playlist ${p.name}`}>
                  <Ionicons name={inIt ? 'checkbox' : 'square-outline'} size={21} color={inIt ? colors.primary : colors.muted} />
                  <Text style={st.rowName} numberOfLines={1}>{p.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{p.tracks.length}</Text>
                </TouchableOpacity>
              );
            })}
            {!m.playlists.length ? <Text style={st.empty}>Você ainda não tem playlist. Dê um nome abaixo e a música já entra nela.</Text> : null}
          </ScrollView>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TextInput value={name} onChangeText={setName} placeholder="Nova playlist" placeholderTextColor={colors.muted} maxLength={30} style={st.field} onSubmitEditing={create} />
            <TouchableOpacity style={st.create} onPress={create} accessibilityLabel="Criar playlist com esta música">
              <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800' }}>Criar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={st.done} onPress={onClose}>
            <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800' }}>Pronto</Text>
          </TouchableOpacity>
        </View>
      </KeyboardLift>
    </Modal>
  );
}

// "Seus favoritos": fileira com os favoritos dos tipos pedidos. onPick(kind, item) decide o que o toque faz.
export function FavStrip({ kinds, title = 'Seus favoritos', onPick, renderLogo }) {
  useFavs();
  const items = kinds.flatMap((k) => favList(k).map((it) => ({ k, it })));
  if (!items.length) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="heart" size={15} color={RED} />
        <Text style={st.stripTitle}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map(({ k, it }) => (
          <TouchableOpacity key={k + it.id} style={st.fav} onPress={() => onPick && onPick(k, it)} activeOpacity={0.85} accessibilityLabel={`${FAV_LABEL[k]}: ${it.name || it.host || it.title}`}>
            <View>
              <View style={st.favLogo}>
                {renderLogo ? renderLogo(k, it) : it.photo || it.cover ? <Photo uri={it.photo || it.cover} style={StyleSheet.absoluteFill} fallback="⭐" /> : <Text style={{ fontSize: 24 }}>{it.emoji || (k === 'streamer' ? String(it.host || '?').charAt(0) : '⭐')}</Text>}
              </View>
              {k === 'streamer' && it.notify ? (
                <View style={st.favBell}>
                  <Ionicons name="notifications" size={10} color="#0E0E10" />
                </View>
              ) : null}
            </View>
            <Text style={st.favName} numberOfLines={1}>{it.name || it.host || it.title}</Text>
            <Text style={st.favKind} numberOfLines={1}>{FAV_LABEL[k]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Aviso de live (servidor no ar): o servidor manda "live-favorito" para quem favoritou o streamer
// e ligou o sininho. O aviso entra nas Notificações e aparece na tela com o botão Assistir.
export function FavLiveAlerts() {
  const { dispatch } = useStore();
  useEffect(() => {
    if (!serverOn()) return;
    return connectEvents((e) => {
      if (e.type !== 'live-favorito' || !e.data) return;
      const l = { ...e.data, real: true, photo: null, tag: 'Ao vivo', viewers: e.data.viewers || 0 };
      pushLiveAlert(l);
      Alert.alert(`🔴 ${l.host} está ao vivo`, l.title || 'Entrou ao vivo agora no Realyz.', [
        { text: 'Depois', style: 'cancel' },
        { text: 'Assistir', onPress: () => dispatch({ type: 'LIVE_OPEN', live: l }) },
      ]);
    });
  }, []);
  return null;
}

const st = StyleSheet.create({
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  sheetTitle: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 16, marginRight: 10 },
  sheetSub: { color: colors.muted, fontSize: 12.5, marginTop: 2, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowName: { color: colors.text, fontWeight: '700', marginLeft: 10, flex: 1 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 12 },
  field: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  create: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  done: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  stripTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 6 },
  fav: { width: 78, marginRight: 12, alignItems: 'center' },
  favLogo: { width: 62, height: 62, borderRadius: 31, overflow: 'hidden', backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.gold },
  favBell: { position: 'absolute', right: -2, bottom: -2, borderWidth: 1.5, borderColor: colors.card, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  favName: { color: colors.text, fontWeight: '700', fontSize: 12, marginTop: 5 },
  favKind: { color: colors.muted, fontSize: 10.5 },
});
