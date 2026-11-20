// Players flutuantes do Re@lys (montados uma vez no App, por cima de qualquer tela):
//  - TvFloat: o canal de TV da aba Stream numa janelinha. Segure e arraste para mudar de canto.
//    O botão de janela (ou sair do app com o canal tocando) passa o vídeo para o
//    picture-in-picture do Android: ele continua num canto da tela, por cima dos outros apps.
//  - LiveFloat: a live que a pessoa minimizou, numa janelinha; um toque abre de novo.
// (A rádio tem a barrinha dela em RadioKit.js, que também é flutuante.)
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import Floating from './Floating';
import { Photo } from './ui';
import { useStore } from '../store';
import { tvNow, onTvNow, stopTv } from '../tv';
import { onRadioNow } from '../radio';
import { usePipState, minimizeApp } from '../pip';
import { LiveStage } from './LiveVideo';
import { FavHeart, StreamerFav } from './FavKit';
import { LiveModal } from '../screens/cliente/home/Social';

// expo-video só existe no APK novo: sem ele, a janela avisa em vez de fechar o app.
let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

export function useTvNow() {
  const [n, setN] = useState(tvNow());
  useEffect(() => onTvNow(setN), []);
  return n;
}

// Parar o canal na hora, direto no player (fechar a janelinha com o app em segundo plano).
let tvPlayer = null;
export function hardStopTv() {
  try {
    if (tvPlayer) {
      tvPlayer.pause();
      tvPlayer.showNowPlayingNotification = false;
      tvPlayer.staysActiveInBackground = false;
    }
  } catch (e) {}
}

// O vídeo do canal. Trocar de canal remonta o player (key = id do canal).
function TvVideo({ channel, viewRef, ctl, onPlaying, onFail }) {
  const player = EV.useVideoPlayer({ uri: channel.url, metadata: { title: channel.name, artist: 'TV no Re@lys' } }, (p) => {
    p.staysActiveInBackground = true; // o som continua se a pessoa sair do app
    p.showNowPlayingNotification = true; // controle na barra de notificações
    p.play();
  });
  useEffect(() => {
    const a = player.addListener('statusChange', (e) => e && e.status === 'error' && onFail());
    const b = player.addListener('playingChange', (e) => onPlaying(!!(e && e.isPlaying)));
    return () => (a.remove(), b.remove());
  }, [player]);
  useEffect(() => {
    tvPlayer = player;
    return () => {
      if (tvPlayer === player) tvPlayer = null;
    };
  }, [player]);
  // Pausar e continuar pelo botão da janela.
  useEffect(() => {
    ctl.current = { toggle: () => (player.playing ? player.pause() : player.play()) };
    return () => {
      ctl.current = null;
    };
  }, [player]);
  return (
    <EV.VideoView
      ref={viewRef}
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

export function TvFloat({ bottom = 150 }) {
  const n = useTvNow();
  const win = useWindowDimensions();
  const [big, setBig] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const view = useRef(null);
  const ctl = useRef(null);
  const ch = n.channel;
  useEffect(() => {
    setFailed(false);
    setPlaying(false);
  }, [ch && ch.id]);
  // Um som só por vez: se a rádio começar a tocar, a TV sai.
  useEffect(
    () =>
      onRadioNow((r) => {
        if (tvNow().channel && r.radio && (r.status === 'carregando' || r.status === 'tocando')) stopTv();
      }),
    [],
  );
  const inPip = usePipState();
  if (!ch) return null;
  const w = Math.round(big ? win.width - 24 : Math.min(260, win.width * 0.62));
  const h = Math.round((w * 9) / 16);
  // Janelinha por cima dos outros apps: só o vídeo do canal (src/pip.js).
  // Minimizar: o Re@lys sai da frente e o vídeo fica numa janelinha; o som continua.
  const pip = () => minimizeApp('tv');
  return (
    <Floating full={inPip} place={{ right: 12, bottom }} style={[st.tv, { width: w, height: h }]}>
      {EV ? (
        <TvVideo key={ch.id} channel={ch} viewRef={view} ctl={ctl} onPlaying={setPlaying} onFail={() => setFailed(true)} />
      ) : (
        <View style={st.center}>
          <Text style={st.msg}>Atualize o app para assistir TV online.</Text>
        </View>
      )}
      {failed ? (
        <View style={[st.center, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
          <Ionicons name="cloud-offline-outline" size={22} color="#fff" />
          <Text style={st.msg}>Não consegui abrir o sinal deste canal agora.</Text>
        </View>
      ) : null}
      {/* Em cima: nome do canal e os botões da janela (na janelinha do Android, os botões são dele) */}
      {inPip ? null : <View style={st.top}>
        <Ionicons name="move" size={13} color="rgba(255,255,255,0.75)" />
        <Text style={st.name} numberOfLines={1}>{ch.name}</Text>
        <FavHeart kind="tv" item={ch} size={15} color="#fff" style={st.btn} hitSlop={6} />
        <TouchableOpacity onPress={pip} style={st.btn} hitSlop={6} accessibilityLabel="Minimizar: continuar assistindo com a tela livre">
          <Ionicons name="remove" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setBig((v) => !v)} style={st.btn} hitSlop={6} accessibilityLabel={big ? 'Diminuir a janela' : 'Aumentar a janela'}>
          <Ionicons name={big ? 'contract' : 'expand'} size={15} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={stopTv} style={st.btn} hitSlop={6} accessibilityLabel="Fechar o canal">
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      </View>}
      {EV && !failed && !inPip ? (
        <TouchableOpacity onPress={() => ctl.current && ctl.current.toggle()} style={st.play} hitSlop={8} accessibilityLabel={playing ? 'Pausar' : 'Continuar'}>
          <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </Floating>
  );
}

// Live minimizada: janelinha com a live; um toque abre de novo em tela cheia.
export function LiveFloat({ bottom = 150 }) {
  const { state, dispatch } = useStore();
  const l = state.liveMini;
  const open = state.liveOpen;
  const inPip = usePipState();
  return (
    <>
      {l ? (
        <Floating full={inPip} place={{ left: 12, bottom }} style={st.live}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.9} onPress={() => dispatch({ type: 'LIVE_REOPEN' })} accessibilityLabel={`Abrir a live de ${l.host}`}>
            <Photo uri={l.photo} style={StyleSheet.absoluteFill} fallback="🎥" />
            {/* Live de verdade (servidor de vídeo): o vídeo continua na janelinha. */}
            <LiveStage liveId={l.real ? l.id : null} mine={false} onAir viewScreen={l.source === 'tela'} />
            {inPip ? null : <View style={st.liveShade} />}
            <View style={st.liveTag}>
              <Text style={st.liveTagText}>AO VIVO</Text>
            </View>
            {inPip ? null : <Text style={st.liveHost} numberOfLines={2}>{l.host}</Text>}
          </TouchableOpacity>
          {inPip ? null : (
            <TouchableOpacity onPress={() => dispatch({ type: 'LIVE_MINI_CLOSE' })} style={[st.btn, st.liveClose]} hitSlop={8} accessibilityLabel="Fechar a live">
              <Ionicons name="close" size={15} color="#fff" />
            </TouchableOpacity>
          )}
          {inPip ? null : (
            <View style={st.liveFav}>
              <StreamerFav live={l} size={14} color="#fff" />
            </View>
          )}
          {inPip ? null : (
            <TouchableOpacity onPress={() => minimizeApp('live')} style={[st.btn, st.liveClose, { top: 34 }]} hitSlop={8} accessibilityLabel="Minimizar: continuar vendo a live com a tela livre">
              <Ionicons name="remove" size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </Floating>
      ) : null}
      {open ? <LiveModal live={open} mine={false} visible onClose={() => dispatch({ type: 'LIVE_OPEN_CLOSE' })} userName={state.user ? state.user.name : 'Você'} /> : null}
    </>
  );
}

const st = StyleSheet.create({
  tv: { backgroundColor: '#000', borderRadius: 14, overflow: 'hidden', elevation: 8, borderWidth: 1, borderColor: 'rgba(245,195,49,0.6)' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 10 },
  msg: { color: '#fff', fontSize: 12, textAlign: 'center', marginTop: 4 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.45)' },
  name: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 11, marginLeft: 5 },
  btn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', marginLeft: 4 },
  play: { position: 'absolute', left: 6, bottom: 6, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  live: { width: 108, height: 160, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', elevation: 8, borderWidth: 1, borderColor: 'rgba(229,72,77,0.8)' },
  liveShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.45)' },
  liveTag: { position: 'absolute', left: 6, top: 6, backgroundColor: '#E5484D', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  liveTagText: { color: '#fff', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 },
  liveHost: { position: 'absolute', left: 6, right: 6, bottom: 6, color: '#fff', fontWeight: '700', fontSize: 11 },
  liveClose: { position: 'absolute', right: 4, top: 4, marginLeft: 0 },
  liveFav: { position: 'absolute', right: 4, top: 64, paddingHorizontal: 6, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
});
