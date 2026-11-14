// Player das rádios: o RadioHost toca (um só no app inteiro), o RadioCard aparece na página
// da rádio e no diretório, e a barrinha embaixo mostra o que está tocando em qualquer tela.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radioNow, onRadioNow, setRadioNow, playRadio, stopRadio, resolveStream, loadRadios, radioOf, onRadios } from '../radio';

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

function Host() {
  const n = useRadioNow();
  const player = EV.useVideoPlayer(null, (p) => {
    p.staysActiveInBackground = true; // continua tocando com a tela bloqueada
    p.showNowPlayingNotification = true; // controle na barra de notificações
  });
  const last = useRef(null);
  useEffect(() => {
    const a = player.addListener('statusChange', (e) => {
      const s = e && e.status;
      if (s === 'error') setRadioNow({ status: 'erro', error: 'Não consegui tocar esta rádio. Confira a URL do streaming ou a internet.' });
      else if (s === 'loading' && radioNow().status !== 'parado') setRadioNow({ status: 'carregando' });
    });
    const b = player.addListener('playingChange', (e) => {
      if (e && e.isPlaying) setRadioNow({ status: 'tocando', error: null });
    });
    return () => (a.remove(), b.remove());
  }, [player]);
  useEffect(() => {
    if (!n.req || n.req === last.current) return;
    last.current = n.req;
    if (n.status === 'parado') {
      try {
        player.pause();
        player.replace(null);
      } catch (e) {}
      return;
    }
    if (!n.radio) return;
    let alive = true;
    resolveStream(n.radio.url).then((uri) => {
      if (!alive) return;
      try {
        player.replace({ uri, metadata: { title: n.radio.name, artist: 'Rádio no Re@lys' } });
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
export function RadioCard({ radio, dark }) {
  const n = useRadioNow();
  const mine = n.radio && n.radio.id === radio.id && n.status !== 'parado';
  const playing = mine && n.status === 'tocando';
  const loading = mine && n.status === 'carregando';
  const err = mine && n.status === 'erro';
  const toggle = () => (mine && !err ? stopRadio() : playRadio(radio));
  return (
    <View style={[st.card, dark && st.cardDark]}>
      <View style={st.logo}><Text style={{ fontSize: 30 }}>{radio.emoji || '📻'}</Text></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LiveDot />
          <Text style={st.live}>AO VIVO</Text>
          {radio.example ? <Text style={st.example}>  · exemplo</Text> : null}
        </View>
        <Text style={[st.name, dark && { color: '#fff' }]} numberOfLines={1}>{radio.name}</Text>
        <Text style={[st.meta, dark && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{[radio.genre, radio.city].filter(Boolean).join(' · ')}</Text>
        {err ? <Text style={st.err}>{n.error}</Text> : null}
      </View>
      {playing ? <Bars on /> : null}
      <TouchableOpacity onPress={toggle} style={st.play} accessibilityLabel={mine && !err ? `Parar ${radio.name}` : `Tocar ${radio.name}`}>
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={mine && !err ? 'stop' : 'play'} size={24} color="#fff" style={!(mine && !err) ? { marginLeft: 3 } : null} />}
      </TouchableOpacity>
    </View>
  );
}

// Barrinha "tocando agora" em qualquer tela.
export function RadioMiniBar({ bottom }) {
  const n = useRadioNow();
  if (!n.radio || n.status === 'parado') return null;
  return (
    <View style={[st.mini, { bottom }]}>
      <Text style={{ fontSize: 18 }}>{n.radio.emoji || '📻'}</Text>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={st.miniName} numberOfLines={1}>{n.radio.name}</Text>
        <Text style={st.miniStatus} numberOfLines={1}>{n.status === 'carregando' ? 'Conectando…' : n.status === 'erro' ? 'Não foi possível tocar' : 'Tocando ao vivo'}</Text>
      </View>
      {n.status === 'tocando' ? <Bars on /> : null}
      <TouchableOpacity onPress={stopRadio} style={st.miniBtn} accessibilityLabel="Parar a rádio">
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
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
  mini: { position: 'absolute', left: 12, right: 84, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B1B1F', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, elevation: 6 },
  miniName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  miniStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  miniBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
