// Vídeo de verdade nas lives e nas chamadas (quando o servidor de vídeo estiver contratado).
// - LiveStage: fundo da tela da live. Quem transmite vê a própria câmera e envia; quem assiste recebe.
// - useRealLives: lives que estão no ar de verdade (servidor do Realyz), para a aba Lives.
// - VideoCallHost: toca quando alguém liga, atende/recusa e mostra a chamada (montado uma vez no App).
// Sem servidor contratado, nada disso aparece e o app segue no modo demonstração.
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, serverOn } from '../api';
import { useStore } from '../store';
import { colors } from '../theme';
import { isDateSubscriber } from '../datePlans';
import { usePrivateScreen } from '../privacyGuard';
import { RTCView, videoStatus, startBroadcast, watchLive, startCall, declineCall, onCallEvents, webrtcOk, openScreen } from '../video';

// Fundo de vídeo da live: transmite (mine) ou assiste. onError avisa a tela (ex.: sem permissão).
// screen: live de jogo, transmite a TELA do celular em vez da câmera.
export function LiveStage({ liveId, mine, onAir, onError, screen, viewScreen }) {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  // Quem assiste: o que está acontecendo, em palavras (no lugar do "Conectando…" que não acabava).
  const [aviso, setAviso] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const flip = useRef(null);
  useEffect(() => {
    if (!onAir || !RTCView) return;
    // Sem servidor (demonstração): a tela de jogo é capturada no celular, mas não sai dele.
    if (!liveId && !(mine && screen)) return;
    let alive = true;
    let session = null;
    let retry = null;
    setLoading(true);
    setAviso(null);
    // Quem assiste tenta de novo sozinho a cada 6 s enquanto a imagem não chega.
    const deNovo = (msg) => {
      if (!alive) return;
      setAviso(msg);
      retry = setTimeout(() => alive && setTentativa((n) => n + 1), 6000);
    };
    (async () => {
      try {
        const st = liveId ? await videoStatus(tentativa > 0) : { on: false };
        if (mine && screen && !st.on) {
          const s = await openScreen();
          session = { stop: () => s.getTracks().forEach((t) => t.stop()) };
          if (alive) setScreenOn(true);
          return;
        }
        if (!st.on) {
          if (!mine) deNovo(st.reason === 'offline' ? 'Sem ligação com o Realyz agora. Tentando de novo…' : 'O vídeo das lives não está ligado neste aparelho.');
          return;
        }
        if (mine) {
          session = await startBroadcast(liveId, {
            screen,
            onState: (c) => c === 'failed' && onError && onError('Sua imagem não está chegando ao servidor de vídeo. Confira a internet e abra a live de novo.'),
          });
          flip.current = session.flip;
          if (alive) (screen ? setScreenOn(true) : setStream(session.stream));
        } else {
          // Sem imagem em 20 s depois de ligar: avisa e tenta de novo.
          const espera = setTimeout(() => alive && !session?.got && (session && session.stop(), (session = null), deNovo('A imagem da live não chegou. Tentando de novo…')), 20000);
          session = await watchLive(
            liveId,
            (s) => {
              if (!alive) return;
              clearTimeout(espera);
              if (session) session.got = true;
              setAviso(null);
              setStream(s);
            },
            (c) => {
              if (!alive) return;
              if (c === 'failed' || c === 'disconnected') {
                clearTimeout(espera);
                setStream(null);
                deNovo('A ligação com a live caiu. Reconectando…');
              }
            }
          );
          if (!alive) session.stop();
        }
      } catch (e) {
        if (!mine) {
          deNovo(
            e.code === 'sem_sinal'
              ? 'A live abriu, mas a imagem de quem transmite ainda não chegou. Esperando…'
              : e.code === 'sem_resposta'
              ? 'O servidor de vídeo do Realyz não respondeu. Tentando de novo…'
              : `${e.message || 'Não deu para ligar o vídeo.'} Tentando de novo…`
          );
        } else onError && onError(e.message || 'Não foi possível ligar o vídeo.');
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(retry);
      session && session.stop();
      setStream(null);
      setScreenOn(false);
    };
  }, [liveId, mine, onAir, screen, tentativa]);
  // Quem transmite a tela não vê a própria tela aqui (seria um espelho infinito): vê um aviso.
  if (mine && screen && (screenOn || loading)) {
    return (
      <View style={[StyleSheet.absoluteFill, st.screenBox]}>
        {loading && !screenOn ? <ActivityIndicator color="#fff" /> : <Ionicons name={Platform.OS === 'web' ? 'desktop-outline' : 'phone-portrait-outline'} size={46} color="#FFD66B" />}
        <Text style={st.screenTitle}>{screenOn ? 'Sua tela está ao vivo' : 'Ligando a transmissão da tela…'}</Text>
        {screenOn ? (
          <Text style={st.screenText}>
            {Platform.OS === 'web' ? 'Pode ir para o jogo: a live continua. Seus seguidores veem o que você escolheu mostrar e ouvem você pelo microfone.' : 'Pode abrir o jogo: a live continua. Seus seguidores veem a tela do seu celular e ouvem você pelo microfone.'}
            {liveId ? '' : '\n\n(Demonstração: com o servidor de vídeo contratado, a tela chega para quem assiste.)'}
            {'\n\n'}Volte ao Realyz para ler os comentários e ver os presentes.
          </Text>
        ) : null}
      </View>
    );
  }
  const esperando = !stream && (loading || (!mine && aviso));
  if (!RTCView || (!stream && !esperando)) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      {stream ? <RTCView streamURL={stream.toURL()} pipTag={mine && !screen ? 'minha-live' : undefined} style={[StyleSheet.absoluteFill, viewScreen && { backgroundColor: '#000' }]} objectFit={viewScreen ? 'contain' : 'cover'} mirror={!!mine && !screen} /> : null}
      {esperando ? (
        // Fundo escuro por inteiro: o aviso não fica por cima do ícone da live.
        <View style={[StyleSheet.absoluteFill, st.waitBox]}>
          <ActivityIndicator color="#fff" />
          <Text style={st.waitText}>{mine ? 'Ligando a transmissão…' : aviso || 'Conectando à live…'}</Text>
          {!mine && aviso ? (
            <TouchableOpacity onPress={() => setTentativa((n) => n + 1)} style={st.waitBtn} accessibilityLabel="Tentar agora">
              <Text style={{ color: '#fff', fontWeight: '800' }}>Tentar agora</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {mine && stream && !screen && Platform.OS !== 'web' ? (
        <TouchableOpacity onPress={() => flip.current && flip.current()} style={st.flip} accessibilityLabel="Virar câmera">
          <Ionicons name="camera-reverse" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Lives no ar de verdade (servidor). Atualiza a cada 20 segundos enquanto a aba está aberta.
export function useRealLives(active = true) {
  const [lives, setLives] = useState([]);
  useEffect(() => {
    if (!active || !serverOn()) return;
    let alive = true;
    const load = () =>
      api('GET', '/lives')
        .then((list) => alive && setLives((list || []).map((l) => ({ ...l, real: true, photo: null, tag: 'Ao vivo', viewers: l.viewers || 0 }))))
        .catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [active]);
  return lives;
}

// Lives no ar de verdade de um segmento (para o "puxar para cima" ir para a próxima do mesmo segmento).
// Sem servidor (demonstração): lista vazia e o app usa só as lives de exemplo.
export async function realLivesOf(cat) {
  if (!serverOn() || !cat) return [];
  try {
    const list = await api('GET', `/lives?cat=${encodeURIComponent(cat)}`);
    return (list || []).map((l) => ({ ...l, real: true, photo: null, tag: 'Ao vivo', viewers: l.viewers || 0 }));
  } catch (e) {
    return [];
  }
}

// Abre a live no servidor (para transmitir de verdade). Devolve o id ou null (modo demonstração).
export async function openRealLive({ title, cat, hostType, source }) {
  if (!serverOn() || !webrtcOk()) return null;
  const st = await videoStatus(true);
  if (!st.on) return null;
  const l = await api('POST', '/lives', { title, cat, hostType, source });
  return l.id;
}
export const endRealLive = (id) => id && api('POST', `/lives/${id}/end`).catch(() => {});

// ---------- Chamadas de vídeo ----------
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function VideoCallHost() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [ringing, setRinging] = useState(null); // { id, from, kind }
  const [call, setCall] = useState(null); // sessão ativa
  const [remote, setRemote] = useState(null);
  const [who, setWho] = useState('');
  const [secs, setSecs] = useState(0);
  const [mute, setMute] = useState(false);
  const [cam, setCam] = useState(true);
  const enabled = !!(state.user && serverOn() && webrtcOk());
  usePrivateScreen(!!call, 'chamada-real');

  // Chamada que chega.
  useEffect(() => {
    if (!enabled) return;
    return onCallEvents((e) => {
      if (e.type === 'call' && e.data && !call) setRinging({ id: e.data.id, from: e.data.from || {}, kind: e.data.kind, ctx: e.data.ctx || null });
      if ((e.type === 'call-end' || e.type === 'call-answer') && ringing && e.data && e.data.id === ringing.id) setRinging(null);
    });
  }, [enabled, call, ringing]);

  // Convite sem resposta some sozinho em 1 minuto.
  useEffect(() => {
    if (!ringing) return;
    const t = setTimeout(() => setRinging(null), 60000);
    return () => clearTimeout(t);
  }, [ringing && ringing.id]);

  // Ligar para alguém (dispatch({ type: 'START_VIDEO_CALL', to, name })).
  useEffect(() => {
    const out = state.videoCall;
    if (!out || !enabled) return;
    dispatch({ type: 'CLEAR_VIDEO_CALL' });
    begin({ role: 'caller', to: out.to, kind: out.kind || 'video', ctx: out.ctx || null }, out.name);
  }, [state.videoCall && state.videoCall.at]);

  useEffect(() => {
    if (!remote) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [remote]);

  const reset = () => {
    setCall(null);
    setRemote(null);
    setSecs(0);
    setMute(false);
    setCam(true);
  };
  const [kind, setKind] = useState('video');
  const begin = async (opts, name) => {
    setWho(name || 'Chamada');
    setKind(opts.kind === 'audio' ? 'audio' : 'video');
    // A tela da chamada aparece na hora ("Chamando…"), enquanto o aparelho libera microfone/câmera.
    let cancelada = false;
    const nada = () => {};
    setCall({ pendente: true, local: null, mute: nada, camera: nada, flip: nada, end: () => ((cancelada = true), reset()) });
    try {
      const s = await startCall({ ...opts, onRemote: setRemote, onEnd: reset });
      if (cancelada) return s.end();
      setCall(s);
    } catch (e) {
      reset();
      if (cancelada) return;
      const negado = e && /NotAllowed|Permission|denied/i.test(`${e.name} ${e.message}`);
      Alert.alert(
        'Não deu para ligar',
        negado
          ? `Permita ${opts.kind === 'audio' ? 'o microfone' : 'a câmera e o microfone'} para o Realyz (no aviso do navegador ou nas configurações do celular) e tente de novo.`
          : (e && e.message) || 'Confira a internet e tente de novo.'
      );
    }
  };

  // Convite do Date: caixa discreta no topo, sem toque, sem bip e sem vibração. Entrar só com Date+.
  if (ringing && !call && ringing.ctx === 'date') {
    const no = () => (declineCall(ringing.id), setRinging(null));
    const join = () => {
      if (!isDateSubscriber(state)) {
        Alert.alert('Assine o Date+ para entrar', 'Entrar em chamada de vídeo no Date é para assinantes. Assine em Encontros › Ajustes e peça um novo convite.');
        return no();
      }
      const r = ringing;
      setRinging(null);
      begin({ role: 'callee', callId: r.id, kind: r.kind, ctx: 'date' }, r.from.name);
    };
    return (
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
        <View style={[st.invite, { top: insets.top + 8 }]}>
          <Text style={st.inviteTitle}>💘 {ringing.from.name || 'Seu crush'} chamou você para uma chamada de vídeo</Text>
          <Text style={st.inviteSub}>Convite do Date · só vocês dois</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <TouchableOpacity style={[st.inviteBtn, { backgroundColor: '#F1F1F4' }]} onPress={no} accessibilityLabel="Recusar">
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '800' }}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.inviteBtn, { backgroundColor: '#E0567A', marginLeft: 10 }]} onPress={join} accessibilityLabel="Entrar agora">
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Entrar agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  if (ringing && !call) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => (declineCall(ringing.id), setRinging(null))}>
        <View style={st.ringBack}>
          <View style={st.ringCard}>
            <Ionicons name={ringing.kind === 'audio' ? 'call' : 'videocam'} size={34} color={colors.primary} />
            <Text style={st.ringName}>{ringing.from.name || 'Alguém do Realyz'}</Text>
            <Text style={st.ringSub}>{ringing.kind === 'audio' ? 'Chamada de voz' : 'Chamada de vídeo'} pelo Realyz</Text>
            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <TouchableOpacity style={[st.round, { backgroundColor: '#FF5A5F' }]} onPress={() => (declineCall(ringing.id), setRinging(null))} accessibilityLabel="Recusar">
                <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.round, { backgroundColor: '#1E9E63', marginLeft: 40 }]}
                onPress={() => {
                  const r = ringing;
                  setRinging(null);
                  begin({ role: 'callee', callId: r.id, kind: r.kind }, r.from.name);
                }}
                accessibilityLabel="Atender"
              >
                <Ionicons name="call" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  if (!call) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={() => call.end()}>
      <View style={{ flex: 1, backgroundColor: '#03050A' }}>
        {remote && kind !== 'audio' ? <RTCView streamURL={remote.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" /> : null}
        {/* Ligação de voz: o som do outro lado toca pelo player escondido (sem imagem). */}
        {remote && kind === 'audio' ? <RTCView streamURL={remote.toURL()} style={{ width: 1, height: 1, opacity: 0 }} /> : null}
        <View style={{ paddingTop: insets.top + 24, alignItems: 'center' }}>
          <Text style={st.callName}>{who}</Text>
          <Text style={st.callStatus}>{remote ? `${kind === 'audio' ? 'Chamada de voz' : 'Chamada de vídeo'} · ${mmss(secs)}` : call.pendente ? `Liberando ${kind === 'audio' ? 'o microfone' : 'a câmera e o microfone'}…` : 'Chamando…'}</Text>
        </View>
        {call.local && cam && kind !== 'audio' ? (
          <View style={[st.self, { top: insets.top + 90 }]}>
            <RTCView streamURL={call.local.toURL()} style={{ flex: 1 }} objectFit="cover" mirror zOrder={1} />
          </View>
        ) : null}
        <View style={[st.bar, { bottom: 30 + insets.bottom }]}>
          <Btn icon={mute ? 'mic-off' : 'mic'} on={mute} onPress={() => (call.mute(!mute), setMute(!mute))} />
          {kind === 'audio' ? null : (
            <>
              <Btn icon={cam ? 'videocam' : 'videocam-off'} on={!cam} onPress={() => (call.camera(!cam), setCam(!cam))} />
              <Btn icon="camera-reverse" onPress={() => call.flip()} />
            </>
          )}
          <TouchableOpacity style={[st.round, { backgroundColor: '#FF5A5F' }]} onPress={() => call.end()} accessibilityLabel="Encerrar">
            <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const Btn = ({ icon, on, onPress }) => (
  <TouchableOpacity style={[st.round, { backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.18)' }]} onPress={onPress}>
    <Ionicons name={icon} size={22} color={on ? colors.dark : '#fff'} />
  </TouchableOpacity>
);

const st = StyleSheet.create({
  waitBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D12', paddingHorizontal: 28 },
  waitText: { color: '#fff', marginTop: 10, textAlign: 'center', lineHeight: 20 },
  waitBtn: { marginTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  screenBox: { backgroundColor: '#0B1124', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  screenTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 12, textAlign: 'center' },
  screenText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  flip: { position: 'absolute', right: 16, top: 120, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  invite: { position: 'absolute', left: 12, right: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14, elevation: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  inviteTitle: { color: colors.text, fontWeight: '800' },
  inviteSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  inviteBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  ringBack: { flex: 1, backgroundColor: 'rgba(3,5,10,0.6)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  ringCard: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  ringName: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 10 },
  ringSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  round: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  callName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  callStatus: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  self: { position: 'absolute', right: 16, width: 110, height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#14120E' },
  bar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly' },
});
