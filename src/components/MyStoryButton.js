// Bolinha do canto superior esquerdo do app: mostra a sua última publicação de story
// (a foto, ou o texto sobre a cor). Tocar abre seus stories; o "+" no canto cria o próximo.
// Sem story ainda: mostra a inicial do seu nome e tocar já abre para criar.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';
import { StoryViewer, StoryComposer } from '../screens/cliente/home/Stories';

const SIZE = 40;

export default function MyStoryButton() {
  const { state, dispatch } = useStore();
  const [viewing, setViewing] = useState(false);
  const [composing, setComposing] = useState(false);
  const name = state.user ? state.user.name : 'Você';
  const items = state.myStories;
  const last = items[items.length - 1];
  const group = { id: 'mine', mine: true, name, items };

  return (
    <View style={{ marginRight: 10 }}>
      <TouchableOpacity
        onPress={() => (last ? setViewing(true) : setComposing(true))}
        activeOpacity={0.85}
        accessibilityLabel={last ? 'Ver seus stories' : 'Criar seu primeiro story'}
        style={[styles.ring, { borderColor: last ? colors.gold : colors.border }]}
      >
        {last && last.image ? (
          <Photo uri={last.image} style={styles.inner} fallback="🌅" />
        ) : last ? (
          <View style={[styles.inner, { backgroundColor: last.bg || colors.primary, padding: 3 }]}>
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.status}>
              {last.text}
            </Text>
          </View>
        ) : (
          <View style={[styles.inner, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 16 }}>{name[0].toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.plus} onPress={() => setComposing(true)} accessibilityLabel="Criar novo story" hitSlop={8}>
        <Ionicons name="add" size={12} color="#fff" />
      </TouchableOpacity>

      <StoryViewer
        visible={viewing}
        groups={items.length ? [group] : []}
        start={0}
        isMine
        onClose={() => setViewing(false)}
        onSeen={() => {}}
        onReply={() => {}}
        onCta={() => {}}
      />
      <StoryComposer
        visible={composing}
        onClose={() => setComposing(false)}
        onPublish={(item) => {
          dispatch({ type: 'PUBLISH_STORY', item });
          setComposing(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { width: SIZE + 6, height: SIZE + 6, borderRadius: (SIZE + 6) / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  inner: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  status: { color: '#fff', fontWeight: '800', fontSize: 9, textAlign: 'center' },
  plus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
