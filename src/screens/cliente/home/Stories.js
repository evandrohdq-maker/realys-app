import React, { useEffect, useRef, useState } from 'react';
import { KeyboardLift } from '../../../keyboard';
import { PHOTO_RULE } from '../../../moderation';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Pressable, Platform, Image, Alert } from 'react-native';
import { Text, TextInput } from '../../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../theme';
import { Photo, StoryPhoto } from '../../../components/ui';
import { STORY_BACKGROUNDS, STORY_SAMPLE_PHOTOS } from '../../../homeData';
import { useStore } from '../../../store';
import * as ImagePicker from 'expo-image-picker';
import { STORY_EFFECTS, effectStyle, STORY_VIDEO_MAX_S } from '../../../storyEffects';
import { StoryMusicPlayer, MusicSticker, MusicPicker } from '../../../components/StoryMusic';
import StoryCamera from '../../../components/StoryCamera';
import StoryEffectOverlay from '../../../components/StoryEffectOverlay';
import StoryFrame, { storyDesk } from '../../../components/StoryFrame';
import { ShowStoryCard } from '../../../components/ArtistBooking';
import { abrirDestacar } from '../../../components/Destacar';

// Story só de texto sem cor escolhida: fundo claro (marfim) e letra escura. A cor de fundo é opção.
export const STORY_PLAIN = '#FBF8F1';
const isLightBg = (c) => {
  const m = String(c || STORY_PLAIN).replace('#', '');
  if (m.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
};

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

// Vídeo do story: toca uma vez, com som, e para quando o story pausa.
// Com música escolhida, o som do vídeo fica mudo (toca só a música).
function StoryVideo({ uri, paused, style, loop, muted }) {
  const player = EV.useVideoPlayer({ uri }, (p) => {
    p.loop = !!loop;
    p.muted = !!muted;
  });
  useEffect(() => {
    try {
      player.muted = !!muted;
    } catch (e) {}
  }, [muted]);
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused]);
  return <EV.VideoView player={player} style={style} contentFit="cover" nativeControls={false} surfaceType="textureView" allowsFullscreen={false} allowsPictureInPicture={false} />;
}

const STORY_MS = 5000; // tempo de cada story na tela
const TICK = 50;

// Tela cheia do story: barrinhas de progresso, toque à direita avança, à esquerda volta,
// segurar pausa. Dá para responder (vai para Mensagens) e, nos patrocinados, abrir a oferta.
export function StoryViewer({ groups, start, visible, onClose, onSeen, onReply, onCta, isMine, onProfile }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  // Prévia ou perfil aberto por cima (tocou no nome): o story espera parado.
  const covered = !!onProfile && !!(state.viewProfile || state.viewCompany);
  const [gi, setGi] = useState(0);
  const [ii, setIi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  const pos = useRef({ gi: 0, ii: 0 });

  useEffect(() => {
    if (!visible) return;
    setGi(start || 0);
    setIi(0);
    setProgress(0);
    setPaused(false);
    setTyping(false);
    setReply('');
  }, [visible, start]);

  pos.current = { gi, ii };
  const group = groups[gi];
  // Foto e texto ficam 5 s; vídeo fica o tempo dele (até 30 s).
  const cur = group ? group.items[Math.min(ii, group.items.length - 1)] : null;
  const dur = cur && cur.video ? Math.min(STORY_VIDEO_MAX_S, cur.secs || STORY_VIDEO_MAX_S) * 1000 : STORY_MS;

  useEffect(() => {
    if (visible && group) onSeen && onSeen(group.id);
    setSent(false);
  }, [visible, gi]);

  const next = () => {
    const { gi: g, ii: i } = pos.current;
    const grp = groups[g];
    if (!grp) return onClose();
    setProgress(0);
    if (i < grp.items.length - 1) setIi(i + 1);
    else if (g < groups.length - 1) {
      setGi(g + 1);
      setIi(0);
    } else onClose();
  };
  const prev = () => {
    const { gi: g, ii: i } = pos.current;
    setProgress(0);
    if (i > 0) setIi(i - 1);
    else if (g > 0) {
      setGi(g - 1);
      setIi(groups[g - 1].items.length - 1);
    }
  };

  useEffect(() => {
    if (!visible || paused || typing || covered) return;
    const t = setInterval(() => setProgress((p) => Math.min(1, p + TICK / dur)), TICK);
    return () => clearInterval(t);
  }, [visible, paused, typing, covered, gi, ii, dur]);

  // Terminou o tempo do story: passa para o próximo.
  useEffect(() => {
    if (visible && progress >= 1) next();
  }, [progress]);

  if (!group) return null;
  const item = group.items[Math.min(ii, group.items.length - 1)];

  const send = () => {
    const t = reply.trim();
    if (!t) return;
    onReply && onReply(group, t);
    setReply('');
    setTyping(false);
    setSent(true);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={storyDesk()} onRequestClose={onClose} statusBarTranslucent>
      <StoryFrame>
      <KeyboardLift style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {item.video && EV ? (
          <View style={StyleSheet.absoluteFill}>
            <StoryVideo key={item.id} uri={item.video} muted={!!item.music} paused={paused || typing || covered} style={StyleSheet.absoluteFill} />
            <StoryEffectOverlay effect={item.effect} />
          </View>
        ) : item.showCard ? (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
            <ShowStoryCard card={item.showCard} style={{ borderRadius: 0, width: '100%' }} />
          </View>
        ) : item.image ? (
          <View style={StyleSheet.absoluteFill}>
            <StoryPhoto uri={item.image} extra={effectStyle(item.effect)} fallback="🌅" />
            <StoryEffectOverlay effect={item.effect} onImage />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: item.bg || STORY_PLAIN, alignItems: 'center', justifyContent: 'center', padding: 30 }]}>
            <Text style={[styles.textStory, isLightBg(item.bg) && { color: colors.text }]}>{item.text}</Text>
          </View>
        )}
        {visible && item.music ? <StoryMusicPlayer key={item.id} music={item.music} paused={paused || typing || covered} /> : null}
        {(item.image || item.video) && item.text ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 30 }]} pointerEvents="none">
            <Text style={[styles.textStory, styles.textOnPhoto]}>{item.text}</Text>
          </View>
        ) : null}

        {/* Áreas de toque: esquerda volta, direita avança, segurar pausa */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          <Pressable style={{ flex: 3 }} onPress={prev} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} delayLongPress={180} />
          <Pressable style={{ flex: 7 }} onPress={next} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} delayLongPress={180} />
        </View>

        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <View style={styles.bars}>
            {group.items.map((it, k) => (
              <View key={it.id} style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(k < ii ? 1 : k === ii ? progress : 0) * 100}%` }]} />
              </View>
            ))}
          </View>
          <View style={styles.header}>
            {/* Tocar na foto ou no nome: prévia do perfil (ou o perfil, se for amigo). */}
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.8}
              disabled={!onProfile || !!group.mine}
              onPress={() => onProfile && onProfile(group)}
              accessibilityLabel={`Ver perfil de ${group.name}`}
            >
              {isMine && gi === 0 && group.mine ? (
                <View style={[styles.headAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{group.name[0]}</Text>
                </View>
              ) : (
                <Photo uri={group.avatar} style={styles.headAvatar} fallback="🙂" />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.headName} numberOfLines={1}>
                  {group.name} <Ionicons name="shield-checkmark" size={12} color={colors.gold} />
                </Text>
                <Text style={styles.headTime}>{group.sponsored ? 'Patrocinado' : item.time}</Text>
              </View>
            </TouchableOpacity>
            {paused ? <Ionicons name="pause" size={18} color="#fff" style={{ marginRight: 10 }} /> : null}
            <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Fechar story">
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {item.music ? <MusicSticker music={item.music} style={{ marginTop: 10, marginLeft: 4 }} /> : null}
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
          {group.cta ? (
            <TouchableOpacity style={styles.cta} onPress={() => onCta && onCta(group)}>
              <Ionicons name="chevron-up" size={16} color={colors.onPrimary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '700', marginLeft: 6 }}>{group.cta}</Text>
            </TouchableOpacity>
          ) : null}
          {group.mine ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.seenBy, { flex: 1 }]}>
                <Ionicons name="eye-outline" size={16} color="#fff" />
                <Text numberOfLines={1} style={{ color: '#fff', marginLeft: 6, fontWeight: '600' }}>Visto por {item.views || 0} pessoas verificadas</Text>
              </View>
              {/* Destacar: atalho deste story nas pastas de destaque, no mural ou na vitrine. */}
              {item.time !== 'destaque' && !item.ref ? (
                <TouchableOpacity
                  onPress={() => {
                    setPaused(true);
                    abrirDestacar({ kind: 'story', id: item.id, image: item.image || null, video: item.video || null, text: item.text || '' });
                  }}
                  style={styles.destacarBtn}
                  accessibilityLabel="Destacar este story"
                >
                  <Ionicons name="star-outline" size={18} color="#fff" />
                  <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Destacar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={styles.reply}
                placeholder={sent ? 'Resposta enviada ✓' : `Responder a ${group.name.split(' ')[0]}…`}
                placeholderTextColor="rgba(255,255,255,0.8)"
                value={reply}
                onChangeText={setReply}
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={send} accessibilityLabel="Enviar resposta">
                <Ionicons name={reply.trim() ? 'send' : 'heart-outline'} size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardLift>
      </StoryFrame>
    </Modal>
  );
}

// Criar o próprio story: texto sobre uma cor, ou foto/vídeo curto (até 30 s) da câmera ou da galeria,
// com efeitos de imagem (luz, contraste, cor) para melhorar a qualidade.
export function StoryComposer({ visible, onClose, onPublish }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [bg, setBg] = useState(null); // sem fundo colorido: a cor é opção do cliente
  const [media, setMedia] = useState(null); // { kind: 'image' | 'video', uri, secs }
  const [effect, setEffect] = useState('original');
  const [writing, setWriting] = useState(false);
  const [music, setMusic] = useState(null); // música do story (galeria do Realyz)
  const [picking, setPicking] = useState(false);
  const [camera, setCamera] = useState(null); // 'foto' | 'video': câmera do Realyz aberta

  useEffect(() => {
    if (!visible) return;
    setText('');
    setBg(null);
    setMedia(null);
    setEffect('original');
    setWriting(false);
    setMusic(null);
    setPicking(false);
    setCamera(null);
  }, [visible]);

  const take = async (how) => {
    // Foto e vídeo pela câmera do Realyz (sai igual à prévia, sem inverter, e com efeitos na hora).
    if (how !== 'galeria') return setCamera(how);
    try {
      const camera = how !== 'galeria';
      const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão', camera ? 'Permita a câmera para fazer o story.' : 'Permita o acesso às fotos e vídeos do celular.');
      const opts = {
        mediaTypes: how === 'foto' ? ['images'] : how === 'video' ? ['videos'] : ['images', 'videos'],
        quality: 0.9,
        videoMaxDuration: STORY_VIDEO_MAX_S,
      };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      if (a.type === 'video') {
        const secs = a.duration ? Math.round(a.duration / 1000) : 0;
        if (secs > STORY_VIDEO_MAX_S) return Alert.alert('Vídeo longo', `O story aceita vídeo de até ${STORY_VIDEO_MAX_S} segundos. Este tem ${secs} s.`);
        setMedia({ kind: 'video', uri: a.uri, secs: secs || STORY_VIDEO_MAX_S });
      } else setMedia({ kind: 'image', uri: a.uri });
      setEffect('auto'); // já abre com o ajuste automático; a pessoa troca se quiser
    } catch (e) {
      Alert.alert('Story', 'Não deu para abrir a câmera ou a galeria.');
    }
  };

  const ready = !!(text.trim() || media);
  const publish = () => {
    if (!ready) return;
    const item = { id: 'me' + Date.now(), text: text.trim(), bg: bg || STORY_PLAIN, time: 'agora', views: 0 };
    if (music) item.music = music;
    if (media && media.kind === 'image') Object.assign(item, { image: media.uri, effect });
    if (media && media.kind === 'video') Object.assign(item, { video: media.uri, secs: media.secs, effect });
    const go = () => onPublish(item);
    if (!media) return go();
    Alert.alert('Antes de publicar', PHOTO_RULE, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Está dentro da regra', onPress: go },
    ]);
  };

  const fx = effectStyle(effect);
  // Sem foto e sem cor: tela clara, letras e botões escuros.
  const light = !media && isLightBg(bg);
  const ink = light ? colors.text : '#fff';
  // No computador: uma caixa em pé no meio da tela (menos de 1/3 da largura), não a tela inteira.
  const deskBox = storyDesk();
  return (
    <Modal visible={visible} animationType="slide" transparent={deskBox} onRequestClose={onClose}><StoryFrame bg={media ? '#000' : bg || STORY_PLAIN}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: media ? '#000' : bg || STORY_PLAIN }}>
        {media && media.kind === 'video' && EV ? <View style={StyleSheet.absoluteFill}><StoryVideo key={media.uri} uri={media.uri} loop muted={!!music} paused={false} style={StyleSheet.absoluteFill} /><StoryEffectOverlay effect={effect} /></View> : null}
        {visible && music && !picking ? <StoryMusicPlayer music={music} paused={false} /> : null}
        {media && media.kind === 'image' ? <View style={StyleSheet.absoluteFill}><StoryPhoto uri={media.uri} extra={fx} /><StoryEffectOverlay effect={effect} onImage /></View> : null}
        <View style={[styles.composerTop, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.close} onPress={media ? () => setMedia(null) : onClose} accessibilityLabel={media ? 'Tirar a foto ou o vídeo' : 'Cancelar'}>
            <Ionicons name={media ? 'arrow-back' : 'close'} size={24} color={ink} />
          </TouchableOpacity>
          <Text style={{ color: ink, fontWeight: '700', fontSize: 16 }}>Novo story</Text>
          <TouchableOpacity style={[styles.publish, light && { backgroundColor: colors.primary }, !ready && { opacity: 0.5 }]} onPress={publish}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '800' }}>Publicar</Text>
          </TouchableOpacity>
        </View>
        {/* Adicionar música: abre a galeria de músicas do Realyz. Com música, mostra a figurinha (tocar troca). */}
        <View style={{ paddingHorizontal: 14, marginTop: 12, flexDirection: 'row' }}>
          {music ? (
            <MusicSticker music={music} onPress={() => setPicking(true)} />
          ) : (
            <TouchableOpacity onPress={() => setPicking(true)} style={[styles.addText, light && styles.capBtnLight, light && { borderWidth: 1 }]} accessibilityLabel="Adicionar música ao story">
              <Ionicons name="musical-notes-outline" size={16} color={light ? colors.primary : '#fff'} />
              <Text numberOfLines={1} style={{ color: ink, fontWeight: '700', marginLeft: 6 }}>Música</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          {media && !writing && !text ? (
            <TouchableOpacity onPress={() => setWriting(true)} style={styles.addText} accessibilityLabel="Escrever no story">
              <Ionicons name="text-outline" size={16} color="#fff" />
              <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Escrever</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.textStory, media && styles.textOnPhoto, light && { color: colors.text }, { minHeight: 120 }]}
              placeholder="Conte o que você está vivendo…"
              placeholderTextColor={light ? colors.muted : 'rgba(255,255,255,0.75)'}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus={!media || writing}
            />
          )}
        </View>

        <View style={[styles.palette, light && { backgroundColor: 'transparent' }, { paddingBottom: insets.bottom + 16 }]}>
          {media ? (
            <>
              <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 8 }}>Efeitos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {STORY_EFFECTS.map((e) => {
                  const on = effect === e.key;
                  return (
                    <TouchableOpacity key={e.key} onPress={() => setEffect(e.key)} style={styles.fxItem} accessibilityLabel={`Efeito ${e.label}`}>
                      <View style={[styles.fxThumb, on && styles.fxThumbOn]}>
                        {media.kind === 'image' ? (
                          <>
                            <Image source={{ uri: media.uri }} style={[styles.fxImg, effectStyle(e.key)]} />
                            <StoryEffectOverlay effect={e.key} onImage />
                          </>
                        ) : (
                          <Ionicons name={e.icon} size={20} color="#fff" />
                        )}
                      </View>
                      <Text numberOfLines={1} style={[styles.fxLabel, on && { color: colors.gold }]}>{e.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 8 }}>
                {media.kind === 'video' ? `Vídeo de ${media.secs} s · ` : ''}Fica no ar por 24 horas, só para pessoas verificadas.
              </Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {[
                  ['foto', 'camera-outline', 'Foto'],
                  ['video', 'videocam-outline', `Vídeo ${STORY_VIDEO_MAX_S}s`],
                  ['galeria', 'images-outline', 'Galeria'],
                ].map(([k, icon, label]) => (
                  <TouchableOpacity key={k} onPress={() => take(k)} style={[styles.capBtn, light && styles.capBtnLight]} accessibilityLabel={label}>
                    <Ionicons name={icon} size={22} color={light ? colors.primary : '#fff'} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: ink, fontWeight: '700', fontSize: 12, marginTop: 3 }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: ink, fontWeight: '700', marginBottom: 8 }}>Fundo (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Sem fundo: o padrão, claro. */}
                <TouchableOpacity style={[styles.swatch, styles.swatchPlain, !bg && styles.swatchOnLight]} onPress={() => setBg(null)} accessibilityLabel="Sem cor de fundo">
                  <Ionicons name="ban-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
                {STORY_BACKGROUNDS.map((c) => (
                  <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, bg === c && styles.swatchOn]} onPress={() => setBg(c)} accessibilityLabel="Cor de fundo" />
                ))}
                {STORY_SAMPLE_PHOTOS.map((u) => (
                  <TouchableOpacity key={u} onPress={() => (setMedia({ kind: 'image', uri: u }), setEffect('original'))} accessibilityLabel="Foto de fundo">
                    <Image source={{ uri: u }} style={styles.swatch} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{ color: light ? colors.muted : 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 8 }}>Fica no ar por 24 horas, só para pessoas verificadas.</Text>
            </>
          )}
        </View>
      </View>
      <StoryCamera
        visible={!!camera}
        startMode={camera || 'foto'}
        initialEffect={effect === 'original' ? 'auto' : effect}
        onClose={() => setCamera(null)}
        onDone={(m) => {
          setCamera(null);
          setMedia(m.kind === 'video' ? { kind: 'video', uri: m.uri, secs: m.secs } : { kind: 'image', uri: m.uri });
          setEffect(m.effect || 'original');
        }}
      />
      <MusicPicker
        visible={picking}
        current={music}
        onClose={() => setPicking(false)}
        onPick={(m) => (setMusic(m), setPicking(false))}
        onRemove={() => (setMusic(null), setPicking(false))}
      />
    </KeyboardLift></StoryFrame></Modal>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 10 },
  bars: { flexDirection: 'row' },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 2, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
  headAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff' },
  headName: { color: '#fff', fontWeight: '700', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  headTime: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  destacarBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', marginLeft: 8 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  caption: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cta: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', minHeight: 42, paddingHorizontal: 20, borderRadius: 21, backgroundColor: colors.primary, marginBottom: 12 },
  reply: { flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 16, color: '#fff', backgroundColor: 'rgba(0,0,0,0.25)' },
  sendBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  seenBy: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  textStory: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  textOnPhoto: { textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 8 },

  composerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  publish: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  palette: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  swatch: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  swatchOn: { borderColor: '#fff', borderWidth: 3, transform: [{ scale: 1.1 }] },
  capBtnLight: { borderColor: '#EAD7A4', backgroundColor: '#FFF8E4' },
  swatchPlain: { backgroundColor: '#fff', borderColor: '#E3DAC4', alignItems: 'center', justifyContent: 'center' },
  swatchOnLight: { borderColor: colors.primary, borderWidth: 3 },
  capBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58, marginHorizontal: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(0,0,0,0.2)' },
  addText: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 14, minHeight: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)' },
  fxItem: { alignItems: 'center', marginRight: 10, width: 62 },
  fxThumb: { width: 54, height: 54, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  fxThumbOn: { borderColor: colors.gold, borderWidth: 3 },
  fxImg: { width: '100%', height: '100%' },
  fxLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },
});
