import React, { useEffect, useRef, useState } from 'react';
import { PHOTO_RULE } from '../../../moderation';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../theme';
import { Photo } from '../../../components/ui';
import { STORY_BACKGROUNDS, STORY_SAMPLE_PHOTOS } from '../../../homeData';

const STORY_MS = 5000; // tempo de cada story na tela
const TICK = 50;

// Tela cheia do story: barrinhas de progresso, toque à direita avança, à esquerda volta,
// segurar pausa. Dá para responder (vai para Mensagens) e, nos patrocinados, abrir a oferta.
export function StoryViewer({ groups, start, visible, onClose, onSeen, onReply, onCta, isMine }) {
  const insets = useSafeAreaInsets();
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
    if (!visible || paused || typing) return;
    const t = setInterval(() => setProgress((p) => Math.min(1, p + TICK / STORY_MS)), TICK);
    return () => clearInterval(t);
  }, [visible, paused, typing, gi, ii]);

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
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {item.image ? (
          <Photo uri={item.image} style={StyleSheet.absoluteFill} fallback="🌅" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: item.bg || colors.primary, alignItems: 'center', justifyContent: 'center', padding: 30 }]}>
            <Text style={styles.textStory}>{item.text}</Text>
          </View>
        )}
        {item.image && item.text ? (
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
            {isMine && gi === 0 && group.mine ? (
              <View style={[styles.headAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{group.name[0]}</Text>
              </View>
            ) : (
              <Photo uri={group.avatar} style={styles.headAvatar} fallback="🙂" />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headName}>
                {group.name} <Ionicons name="shield-checkmark" size={12} color={colors.gold} />
              </Text>
              <Text style={styles.headTime}>{group.sponsored ? 'Patrocinado' : item.time}</Text>
            </View>
            {paused ? <Ionicons name="pause" size={18} color="#fff" style={{ marginRight: 10 }} /> : null}
            <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Fechar story">
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
          {group.cta ? (
            <TouchableOpacity style={styles.cta} onPress={() => onCta && onCta(group)}>
              <Ionicons name="chevron-up" size={16} color={colors.onPrimary} />
              <Text style={{ color: colors.onPrimary, fontWeight: '700', marginLeft: 6 }}>{group.cta}</Text>
            </TouchableOpacity>
          ) : null}
          {group.mine ? (
            <View style={styles.seenBy}>
              <Ionicons name="eye-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '600' }}>Visto por {item.views || 0} pessoas verificadas</Text>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Criar o próprio story: texto sobre uma cor ou sobre uma foto de exemplo.
export function StoryComposer({ visible, onClose, onPublish }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [bg, setBg] = useState(STORY_BACKGROUNDS[0]);
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setBg(STORY_BACKGROUNDS[0]);
    setImage(null);
  }, [visible]);

  const publish = () => {
    if (!text.trim() && !image) return;
    const go = () => onPublish({ id: 'me' + Date.now(), text: text.trim(), bg, image, time: 'agora', views: 0 });
    if (!image) return go();
    Alert.alert('Antes de publicar a foto', PHOTO_RULE, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Está dentro da regra', onPress: go },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: image ? '#000' : bg }}>
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} /> : null}
        <View style={[styles.composerTop, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Novo story</Text>
          <TouchableOpacity style={[styles.publish, !(text.trim() || image) && { opacity: 0.5 }]} onPress={publish}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Publicar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <TextInput
            style={[styles.textStory, image && styles.textOnPhoto, { minHeight: 120 }]}
            placeholder="Conte o que você está vivendo…"
            placeholderTextColor="rgba(255,255,255,0.75)"
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
          />
        </View>

        <View style={[styles.palette, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 8 }}>Fundo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STORY_BACKGROUNDS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.swatch, { backgroundColor: c }, !image && bg === c && styles.swatchOn]}
                onPress={() => {
                  setBg(c);
                  setImage(null);
                }}
                accessibilityLabel="Cor de fundo"
              />
            ))}
            {STORY_SAMPLE_PHOTOS.map((u) => (
              <TouchableOpacity key={u} onPress={() => setImage(u)} accessibilityLabel="Foto de fundo">
                <Image source={{ uri: u }} style={[styles.swatch, image === u && styles.swatchOn]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 8 }}>Fica no ar por 24 horas, só para pessoas verificadas.</Text>
        </View>
      </View>
    </Modal>
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
  cta: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', height: 42, paddingHorizontal: 20, borderRadius: 21, backgroundColor: colors.primary, marginBottom: 12 },
  reply: { flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 16, color: '#fff', backgroundColor: 'rgba(0,0,0,0.25)' },
  sendBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  seenBy: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  textStory: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  textOnPhoto: { textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 8 },

  composerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  publish: { height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  palette: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  swatch: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  swatchOn: { borderColor: '#fff', borderWidth: 3, transform: [{ scale: 1.1 }] },
});
