// Player das rádios: o RadioHost toca (um só no app inteiro), o RadioCard aparece na página
// da rádio e no diretório, e a barrinha embaixo mostra o que está tocando em qualquer tela.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Image } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import Floating from './Floating';
import { radioNow, onRadioNow, setRadioNow, playRadio, stopRadio, resolveStream, loadRadios, radioOf, onRadios, radioEnded } from '../radio';
import { stationCat, openStation } from '../streamCats';
import { minimizeApp } from '../pip';
import { openArtist } from '../music';

loadRadios(); // rádios indexadas guardadas no celular

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

// Rádio indexada de uma empresa (atualiza quando ela muda a URL).
export function useRadioOf(storeId) {
  const [r, setR] = useState(radioOf(storeId));
  useEffect(() => {
    setR(radioOf(storeId));
    return onRadios(() => setR(radioOf(storeId)));
  }, [storeId]);
  return r;
}

export function useRadioNow() {
  const [n, setN] = useState(radioNow());
  useEffect(() => onRadioNow(setN), []);
  return n;
}

// Logo da estação: a imagem que a rádio/TV mandou ou, sem ela, o ícone na cor da categoria.
// logo pode ser um endereço (foto enviada) ou uma imagem do próprio app (require).
export const logoSource = (logo) => (!logo ? null : typeof logo === 'number' ? logo : { uri: logo });
export const logoUri = (logo) => {
  if (!logo) return undefined;
  if (typeof logo === 'string') return logo;
  try {
    return Image.resolveAssetSource(logo).uri;
  } catch (e) {
    return undefined;
  }
};
export function StationLogo({ s, kind = 'radio', size = 58, radius = 16 }) {
  const cat = stationCat(kind, s);
  const src = logoSource(s && s.logo);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: cat.tint + '22', alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Image source={src} style={{ width: size, height: size }} resizeMode="cover" /> : <Text style={{ fontSize: size * 0.5 }}>{(s && s.emoji) || cat.emoji}</Text>}
    </View>
  );
}

// Parar na hora, direto no player (fechar a janelinha com o app em segundo plano).
let livePlayer = null;
export function hardStopRadio() {
  try {
    if (livePlayer) {
      livePlayer.pause();
      livePlayer.showNowPlayingNotification = false;
      livePlayer.staysActiveInBackground = false;
    }
  } catch (e) {}
}

function Host() {
  const n = useRadioNow();
  const player = EV.useVideoPlayer(null, (p) => {
    p.staysActiveInBackground = true; // continua tocando com a tela bloqueada
    p.showNowPlayingNotification = true; // controle na barra de notificações
  });
  const last = useRef(null);
  useEffect(() => {
    livePlayer = player;
    return () => {
      if (livePlayer === player) livePlayer = null;
    };
  }, [player]);
  useEffect(() => {
    const a = player.addListener('statusChange', (e) => {
      const s = e && e.status;
      if (s === 'error') setRadioNow({ status: 'erro', error: 'Não consegui tocar esta rádio. Confira a URL do streaming ou a internet.' });
      else if (s === 'loading' && radioNow().status !== 'parado') setRadioNow({ status: 'carregando' });
    });
    const b = player.addListener('playingChange', (e) => {
      if (e && e.isPlaying) setRadioNow({ status: 'tocando', error: null });
    });
    // A música chegou ao fim: passa para a próxima da fila (rádio ao vivo não termina).
    // Fechar a música (X) para tudo: o player avisa "terminou" ao ser esvaziado, e isso não pode
    // virar "passar para a próxima". Só passa sozinho quando a faixa termina de verdade, tocando.
    const c = player.addListener('playToEnd', () => {
      const now = radioNow();
      if (now.status !== 'tocando' || Date.now() - (now.req || 0) < 1500) return;
      if (now.radio && now.radio.track) radioEnded();
    });
    return () => (a.remove(), b.remove(), c.remove());
  }, [player]);
  useEffect(() => {
    if (!n.req || n.req === last.current) return;
    last.current = n.req;
    if (n.status === 'parado') {
      // Fechar de verdade: para o som, tira o controle da barra de notificações e libera o segundo plano.
      try {
        player.pause();
        player.showNowPlayingNotification = false;
        player.staysActiveInBackground = false;
        player.replace(null);
      } catch (e) {}
      return;
    }
    if (!n.radio) return;
    let alive = true;
    resolveStream(n.radio.url).then((uri) => {
      if (!alive) return;
      try {
        player.staysActiveInBackground = true;
        player.showNowPlayingNotification = true;
        player.replace({ uri, metadata: { title: n.radio.name, artist: n.radio.track ? n.radio.artist || 'Música no Re@lys' : 'Rádio no Re@lys', artwork: logoUri(n.radio.logo) } });
        player.play();
      } catch (e) {
        setRadioNow({ status: 'erro', error: 'Não consegui tocar esta rádio.' });
      }
    });
    return () => {
      alive = false;
    };
  }, [n.req]);
  return null;
}

// Montado uma vez no App.
export function RadioHost() {
  if (!EV) return null;
  return <Host />;
}

function LiveDot() {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.3, duration: 600, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, []);
  return <Animated.View style={[st.dot, { opacity: a }]} />;
}

// Ondinhas que mexem enquanto toca.
function Bars({ on }) {
  const v = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.6)).current, useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.8)).current];
  useEffect(() => {
    if (!on) return;
    const ls = v.map((x, i) => Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 300 + i * 90, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0.25, duration: 300 + i * 70, useNativeDriver: true }),
    ])));
    ls.forEach((l) => l.start());
    return () => ls.forEach((l) => l.stop());
  }, [on]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 22 }}>
      {v.map((x, i) => <Animated.View key={i} style={[st.bar, { transform: [{ scaleY: on ? x : 0.25 }] }]} />)}
    </View>
  );
}

// Cartão grande do player (página da rádio e diretório).
export function RadioCard({ radio, dark, noOpen }) {
  const n = useRadioNow();
  const mine = n.radio && n.radio.id === radio.id && n.status !== 'parado';
  const playing = mine && n.status === 'tocando';
  const loading = mine && n.status === 'carregando';
  const err = mine && n.status === 'erro';
  const toggle = () => (mine && !err ? stopRadio() : playRadio(radio));
  return (
    <View style={[st.card, dark && st.cardDark]}>
      {/* Logo e nome: tocar abre o perfil da rádio */}
      <TouchableOpacity disabled={noOpen} onPress={() => openStation('radio', radio.id)} activeOpacity={0.8} accessibilityLabel={`Abrir o perfil de ${radio.name}`}>
        <StationLogo s={radio} />
      </TouchableOpacity>
      <TouchableOpacity disabled={noOpen} onPress={() => openStation('radio', radio.id)} activeOpacity={0.8} style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LiveDot />
          <Text style={st.live}>AO VIVO</Text>
          {radio.featured ? <Text style={st.featured}>  ★ PRINCIPAL</Text> : null}
          {radio.example ? <Text style={st.example}>  · exemplo</Text> : null}
        </View>
        <Text style={[st.name, dark && { color: '#fff' }]} numberOfLines={1}>{radio.name}{radio.verified ? ' ✓' : ''}</Text>
        <Text style={[st.meta, dark && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{[stationCat('radio', radio).label, radio.city].filter(Boolean).join(' · ')}</Text>
        {err ? <Text style={st.err}>{n.error}</Text> : null}
      </TouchableOpacity>
      {playing ? <Bars on /> : null}
      <TouchableOpacity onPress={toggle} style={st.play} accessibilityLabel={mine && !err ? `Parar ${radio.name}` : `Tocar ${radio.name}`}>
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={mine && !err ? 'stop' : 'play'} size={24} color="#fff" style={!(mine && !err) ? { marginLeft: 3 } : null} />}
      </TouchableOpacity>
    </View>
  );
}

// Mini player das MÚSICAS (playlist, galeria, artista) em qualquer tela. Rádio ao vivo não tem
// barrinha dentro do app: o play/parar fica na página das rádios e a capa aparece só ao minimizar.
// Mostra a capa do CD/da música; tocar na capa, no nome ou no botão do artista abre o perfil dele.
// É flutuante: segure e arraste para mudar de lugar.
export function RadioMiniBar({ bottom }) {
  const n = useRadioNow();
  if (!n.radio || n.status === 'parado' || !n.radio.track) return null;
  const artist = () => n.radio.artist && openArtist(n.radio.artist);
  return (
    <Floating place={{ left: 12, right: 84, bottom }} style={st.mini}>
      <TouchableOpacity onPress={artist} activeOpacity={0.8} accessibilityLabel={`Abrir o perfil de ${n.radio.artist || 'artista'}`}>
        <StationLogo s={n.radio} size={40} radius={8} />
      </TouchableOpacity>
      <TouchableOpacity style={{ flex: 1, marginLeft: 8 }} onPress={artist} activeOpacity={0.8}>
        <Text style={st.miniName} numberOfLines={1}>{n.radio.name}</Text>
        <Text style={st.miniStatus} numberOfLines={1}>{n.status === 'carregando' ? 'Conectando…' : n.status === 'erro' ? 'Não foi possível tocar' : n.radio.artist || 'Tocando'}</Text>
      </TouchableOpacity>
      {n.radio.artist ? (
        <TouchableOpacity onPress={artist} style={st.miniBtn} hitSlop={6} accessibilityLabel="Perfil do artista">
          <Ionicons name="person-circle-outline" size={18} color="#fff" />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={radioEnded} style={st.miniBtn} hitSlop={6} accessibilityLabel="Próxima música">
        <Ionicons name="play-skip-forward" size={16} color="#fff" />
      </TouchableOpacity>
      {/* Minimizar: o Re@lys sai da frente e a capa fica numa janelinha; a música continua. */}
      <TouchableOpacity onPress={() => minimizeApp('radio')} style={st.miniBtn} hitSlop={6} accessibilityLabel="Minimizar: continuar ouvindo com a tela livre">
        <Ionicons name="remove" size={18} color="#fff" />
      </TouchableOpacity>
      {/* Fechar: encerra a música. */}
      <TouchableOpacity onPress={stopRadio} style={[st.miniBtn, st.miniClose]} hitSlop={8} accessibilityLabel="Fechar a música">
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </Floating>
  );
}

// Playerzinho bem pequeno ao lado da logo do Re@lys: pretinho com borda dourada e um pedacinho
// da logo da rádio ou da capa da música. Segure e arraste para levar a outro lugar.
//  - Rádio ao vivo: tocar na logo abre a rádio; X para o som.
//  - Música: tocar na capa abre o perfil do artista; ⏭ passa para a próxima; X fecha a música.
export function RadioHeadChip({ top, left = 62 }) {
  const n = useRadioNow();
  if (!n.radio || n.status === 'parado') return null;
  const track = !!n.radio.track;
  const open = () => (track ? n.radio.artist && openArtist(n.radio.artist) : openStation('radio', n.radio.id));
  return (
    <Floating place={{ left, top }} style={st.chip}>
      <TouchableOpacity onPress={open} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel={track ? `${n.radio.name}, de ${n.radio.artist}. Ver o artista` : `${n.radio.name} tocando. Abrir a rádio`}>
        <View style={[st.chipLogo, track && { borderRadius: 6 }]}>
          <StationLogo s={n.radio} size={24} radius={track ? 6 : 12} />
        </View>
        {n.status === 'tocando' ? (
          <View style={{ transform: [{ scale: 0.55 }], marginHorizontal: -4 }}>
            <Bars on />
          </View>
        ) : n.status === 'carregando' ? (
          <ActivityIndicator size="small" color={GOLD} style={{ marginHorizontal: 4, transform: [{ scale: 0.7 }] }} />
        ) : (
          <Ionicons name="alert-circle" size={14} color="#E5484D" style={{ marginHorizontal: 4 }} />
        )}
      </TouchableOpacity>
      {track ? (
        <TouchableOpacity onPress={radioEnded} hitSlop={8} style={st.chipX} accessibilityLabel="Próxima música">
          <Ionicons name="play-skip-forward" size={12} color={GOLD} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={stopRadio} hitSlop={8} style={st.chipX} accessibilityLabel={track ? 'Fechar a música' : `Parar ${n.radio.name}`}>
        <Ionicons name="close" size={13} color={GOLD} />
      </TouchableOpacity>
    </Floating>
  );
}

// Dentro da janelinha (app minimizado): só a logo grande, o nome e o AO VIVO, como no YouTube.
export function RadioPipView() {
  const n = useRadioNow();
  if (!n.radio || n.status === 'parado') return null;
  return (
    <View style={st.pip}>
      <StationLogo s={n.radio} size={92} radius={14} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LiveDot />
          <Text style={[st.live, { fontSize: 10 }]}>{n.radio.track ? 'TOCANDO' : 'AO VIVO'}</Text>
        </View>
        <Text style={st.pipName} numberOfLines={2}>{n.radio.name}</Text>
        {n.status === 'tocando' ? <Bars on /> : <Text style={st.miniStatus}>Conectando…</Text>}
      </View>
    </View>
  );
}

const GOLD = '#F5C331';
const st = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', height: 32, paddingLeft: 3, paddingRight: 4, borderRadius: 16, backgroundColor: '#0E0E10', borderWidth: 1.5, borderColor: GOLD, elevation: 6 },
  chipLogo: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(245,195,49,0.6)' },
  chipX: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  featured: { color: '#B8860B', fontWeight: '800', fontSize: 11 },
  miniClose: { backgroundColor: 'rgba(229,72,77,0.9)', width: 32, height: 32, borderRadius: 16 },
  pip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 99, backgroundColor: '#111114', flexDirection: 'row', alignItems: 'center', padding: 10 },
  pipName: { color: '#fff', fontWeight: '800', fontSize: 15, marginTop: 2, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#EFE6CC', marginBottom: 10 },
  cardDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(226,182,73,0.35)' },
  logo: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#F6EBCB', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5484D', marginRight: 5 },
  live: { color: '#E5484D', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  example: { color: '#9A927F', fontSize: 11 },
  name: { fontWeight: '800', fontSize: 16, color: '#1B1B1F', marginTop: 2 },
  meta: { color: '#7A7468', fontSize: 12, marginTop: 1 },
  err: { color: '#E5484D', fontSize: 12, marginTop: 4 },
  play: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#B8860B', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  bar: { width: 4, height: 22, borderRadius: 2, backgroundColor: '#B8860B', marginHorizontal: 1.5 },
  mini: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B1B1F', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, elevation: 6 },
  miniName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  miniStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  miniBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
