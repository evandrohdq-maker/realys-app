// Reels do Re@lys (estilo Instagram): vídeo vertical em tela cheia, arrasta para cima para o próximo.
// Toque pausa, toque duplo curte. Do lado: loja, curtir, comentar, enviar e som.
// Embaixo: loja verificada, título e o produto com o botão Comprar (Shop) ou Pedir (Food).
// Assistiu até o fim, ganha pontos Re@lys (uma vez por Reel).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Animated, Alert, Share, Image,
  TextInput, KeyboardAvoidingView, Platform, Pressable, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, storeOf } from '../store';
import { colors, brl } from '../theme';
import { Photo, ProductThumb } from './ui';
import { CLIP_POINTS, shortNum } from '../adsData';

// expo-video só existe no APK novo: sem ele, os Reels mostram a capa (não fecham o app).
let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

const WATCH_MS = 6000; // tempo assistido para ganhar os pontos

// Comentários de exemplo (o servidor guarda os de verdade).
const SEED_COMMENTS = [
  { who: 'Ana', text: 'Chegou rapidinho, recomendo! 😍' },
  { who: 'Diego', text: 'Tem em outra cor?' },
  { who: 'Carla', text: 'Comprei semana passada, muito bom.' },
];

function Heart({ show }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    a.setValue(0);
    Animated.sequence([
      Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(a, { toValue: 0, duration: 350, delay: 250, useNativeDriver: true }),
    ]).start();
  }, [show]);
  return (
    <Animated.View pointerEvents="none" style={[styles.bigHeart, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) }] }]}>
      <Ionicons name="heart" size={110} color="#fff" />
    </Animated.View>
  );
}

function Video({ reel, active, muted, paused, onProgress }) {
  const player = EV.useVideoPlayer(reel.video, (p) => {
    p.loop = true;
    p.muted = muted;
    p.timeUpdateEventInterval = 0.2;
  });
  useEffect(() => {
    player.muted = muted;
  }, [muted]);
  useEffect(() => {
    if (active && !paused) player.play();
    else player.pause();
  }, [active, paused]);
  useEffect(() => {
    if (!active) {
      try {
        player.currentTime = 0;
      } catch (e) {}
    }
  }, [active]);
  useEffect(() => {
    const sub = player.addListener('timeUpdate', (e) => {
      const d = player.duration || 0;
      if (d > 0 && e && typeof e.currentTime === 'number') onProgress(e.currentTime / d);
    });
    return () => sub.remove();
  }, [player]);
  return <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />;
}

function ReelItem({ reel, active, height, muted, onMute, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(0);
  const [earned, setEarned] = useState(false);
  const [comments, setComments] = useState(null); // null = fechado
  const [list, setList] = useState(SEED_COMMENTS);
  const [draft, setDraft] = useState('');
  const prog = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const tapTimer = useRef(null);
  const s = storeOf(state, reel.storeId) || {};
  const p = state.products.find((x) => x.id === reel.productId);
  const food = reel.kind === 'food';

  // Saiu da tela: volta a tocar do começo quando voltar.
  useEffect(() => {
    if (!active) {
      setPaused(false);
      prog.setValue(0);
      return;
    }
    dispatch({ type: 'AD_EVENT', id: reel.id, ev: 'views' });
    if (state.adRewards[reel.id]) return;
    const t = setTimeout(() => {
      dispatch({ type: 'AD_EVENT', id: reel.id, ev: 'watched' });
      dispatch({ type: 'AD_REWARD', id: reel.id, points: CLIP_POINTS, desc: reel.title });
      setEarned(true);
      setTimeout(() => setEarned(false), 2500);
    }, WATCH_MS);
    return () => clearTimeout(t);
  }, [active]);

  const like = () => {
    if (!liked) dispatch({ type: 'AD_EVENT', id: reel.id, ev: 'taps' });
    setLiked(!liked);
  };
  // Toque: pausa/continua. Toque duplo: curte (com o coração grande no meio).
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (!liked) like();
      setBurst((n) => n + 1);
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => setPaused((v) => !v), 280);
  };
  const add = () => {
    if (!p) return;
    dispatch({ type: 'AD_EVENT', id: reel.id, ev: 'taps' });
    dispatch({ type: 'ADD_TO_CART', productId: p.id });
    Alert.alert(food ? 'Pedido no carrinho 🍽️' : 'No carrinho 🛍️', `${p.name} · ${brl(p.price)}`, [
      { text: 'Continuar vendo' },
      { text: 'Ver carrinho', onPress: () => { onClose && onClose(); dispatch({ type: 'OPEN_CART' }); } },
    ]);
  };
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    setList((l) => [...l, { who: (state.user && state.user.name && state.user.name.split(' ')[0]) || 'Você', text: t }]);
    setDraft('');
  };

  return (
    <View style={{ height, backgroundColor: '#000' }}>
      {EV && reel.video ? (
        <Video reel={reel} active={active} muted={muted} paused={paused} onProgress={(v) => prog.setValue(v)} />
      ) : (
        <Image source={reel.poster} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <View pointerEvents="none" style={styles.shadeTop} />
      <View pointerEvents="none" style={styles.shadeBottom} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityLabel={paused ? 'Continuar o vídeo' : 'Pausar o vídeo'} />
      {paused ? (
        <View pointerEvents="none" style={styles.pauseIcon}>
          <Ionicons name="play" size={54} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}
      <Heart show={burst} />

      {earned ? (
        <View style={[styles.earned, { top: insets.top + 56 }]}>
          <Ionicons name="star" size={15} color="#0B1124" />
          <Text style={styles.earnedText}>+{CLIP_POINTS} pontos Re@lys por assistir!</Text>
        </View>
      ) : null}

      {/* Lado direito */}
      <View style={[styles.side, { bottom: 150 + (p ? 0 : -60) }]}>
        <TouchableOpacity style={styles.avatar} onPress={() => { onClose && onClose(); dispatch({ type: 'OPEN_COMPANY', id: reel.storeId }); }} accessibilityLabel={`Abrir a página de ${s.name}`}>
          <Text style={{ fontSize: 22 }}>{s.logo || '🏪'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={like} accessibilityLabel="Curtir">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={31} color={liked ? '#FF3B5C' : '#fff'} />
          <Text style={styles.sideText}>{shortNum((reel.likes || 0) + (liked ? 1 : 0))}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={() => setComments(true)} accessibilityLabel="Comentários">
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={styles.sideText}>{list.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => Share.share({ message: `${reel.title} · ${s.name} no Re@lys\nRe@lys · Pessoas reais. Negócios reais.` }).catch(() => {})}
          accessibilityLabel="Enviar"
        >
          <Ionicons name="paper-plane-outline" size={27} color="#fff" />
          <Text style={styles.sideText}>Enviar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={onMute} accessibilityLabel={muted ? 'Ligar o som' : 'Tirar o som'}>
          <Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Embaixo: loja, título e produto */}
      <View style={styles.bottom}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => { onClose && onClose(); dispatch({ type: 'OPEN_COMPANY', id: reel.storeId }); }}>
          <Text style={styles.store}>{s.name}</Text>
          <Ionicons name="shield-checkmark" size={13} color="#E2B649" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
        <Text style={styles.sponsor}>Patrocinado · CNPJ verificado</Text>
        <Text style={styles.title} numberOfLines={2}>{reel.title}</Text>
        {p ? (
          <View style={styles.prodBox}>
            <ProductThumb product={p} size={42} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
              <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 2 }}>{brl(p.price)}</Text>
            </View>
            <TouchableOpacity style={styles.buy} onPress={add} accessibilityLabel={`${food ? 'Pedir' : 'Comprar'} ${p.name}`}>
              <Ionicons name={food ? 'restaurant' : 'cart'} size={15} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 5, fontSize: 13 }}>{food ? 'Pedir' : 'Comprar'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Barrinha de progresso do vídeo */}
      <View style={styles.progBg}>
        <Animated.View style={[styles.progFill, { width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]} />
      </View>

      <Modal visible={!!comments} transparent animationType="slide" onRequestClose={() => setComments(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setComments(null)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Comentários</Text>
          {list.map((c, i) => (
            <View key={i} style={styles.comment}>
              <View style={styles.cAvatar}><Text style={{ fontWeight: '800', color: colors.primaryDark }}>{c.who[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 13 }}>{c.who}</Text>
                <Text style={{ color: colors.text, marginTop: 1 }}>{c.text}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.inputRow, { marginBottom: insets.bottom + 8 }]}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Escreva um comentário…" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={send} returnKeyType="send" />
            <TouchableOpacity onPress={send} style={styles.sendBtn} accessibilityLabel="Publicar comentário">
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Lista vertical de Reels. `height` = altura de cada Reel (a tela inteira ou o espaço da aba).
export function ReelsFeed({ reels, start = 0, onClose, visible = true }) {
  const [h, setH] = useState(0);
  const [index, setIndex] = useState(start);
  const [muted, setMuted] = useState(false);
  const [appOn, setAppOn] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppOn(s === 'active'));
    return () => sub.remove();
  }, []);
  const onViewable = useRef(({ viewableItems }) => {
    const v = viewableItems.find((x) => x.isViewable);
    if (v && typeof v.index === 'number') setIndex(v.index);
  }).current;
  const render = useCallback(
    ({ item, index: i }) => <ReelItem reel={item} active={visible && appOn && i === index} height={h} muted={muted} onMute={() => setMuted((m) => !m)} onClose={onClose} />,
    [h, index, muted, visible, appOn],
  );
  // Cada Reel ocupa exatamente a altura da tela. Se a altura mudar depois de abrir (barra de status,
  // barra de navegação), a lista é refeita e volta para o Reel certo, encaixado no topo.
  const list = useRef(null);
  const cur = useRef(start);
  cur.current = index;
  const onLayout = (e) => {
    const nh = Math.round(e.nativeEvent.layout.height);
    if (nh && nh !== h) setH(nh);
  };
  useEffect(() => {
    if (!h || !list.current) return;
    const t = setTimeout(() => list.current && list.current.scrollToOffset({ offset: cur.current * h, animated: false }), 0);
    return () => clearTimeout(t);
  }, [h]);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayout}>
      {h ? (
        <FlatList
          key={h}
          ref={list}
          data={reels}
          keyExtractor={(r) => r.id}
          renderItem={render}
          pagingEnabled
          snapToInterval={h}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.min(cur.current, reels.length - 1)}
          getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          removeClippedSubviews
        />
      ) : null}
    </View>
  );
}

// Reels em tela cheia (aberto pelos cards do Shop e do Food).
export function ReelsViewer({ reels, index, onClose }) {
  const insets = useSafeAreaInsets();
  const visible = index !== null && index !== undefined;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {visible ? <ReelsFeed reels={reels} start={index} onClose={onClose} /> : null}
      <TouchableOpacity onPress={onClose} style={[styles.close, { top: insets.top + 10 }]} accessibilityLabel="Fechar Reels">
        <Ionicons name="chevron-down" size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={[styles.brandTop, { top: insets.top + 14 }]}>Reels</Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.18)' },
  shadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(0,0,0,0.28)' },
  pauseIcon: { position: 'absolute', top: '45%', alignSelf: 'center', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  bigHeart: { position: 'absolute', top: '38%', alignSelf: 'center' },
  side: { position: 'absolute', right: 10, alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E2B649', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  sideBtn: { alignItems: 'center', marginBottom: 18 },
  sideText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 },
  bottom: { position: 'absolute', left: 14, right: 74, bottom: 22 },
  store: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sponsor: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  title: { color: '#fff', fontSize: 14, marginTop: 6, fontWeight: '600' },
  prodBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, marginTop: 10 },
  buy: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  progBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  progFill: { height: 3, backgroundColor: '#fff' },
  earned: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD66B', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  earnedText: { color: '#0B1124', fontWeight: '800', marginLeft: 6, fontSize: 13 },
  close: { position: 'absolute', left: 12, padding: 4 },
  brandTop: { position: 'absolute', alignSelf: 'center', color: '#fff', fontWeight: '800', fontSize: 17 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, maxHeight: '70%' },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 8 },
  sheetTitle: { textAlign: 'center', fontWeight: '800', color: colors.text, marginBottom: 10 },
  comment: { flexDirection: 'row', marginBottom: 12 },
  cAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F6EBCB', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e5e5', paddingTop: 8 },
  input: { flex: 1, backgroundColor: '#F4F4F6', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, color: colors.text },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
