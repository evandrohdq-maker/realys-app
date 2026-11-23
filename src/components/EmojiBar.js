// Barra de emojis e símbolos para as caixas de texto do Realyz (depoimento, conversa, publicação).
// Toque no rostinho para abrir; toque num emoji para pôr no fim do texto.
import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors } from '../theme';

export const EMOJI_GRUPOS = [
  { key: 'rostos', icon: '😊', itens: ['😊', '😂', '🥰', '😍', '😎', '🤩', '😉', '🙂', '😅', '🤗', '🥳', '😇', '🤔', '😢', '😭', '😡', '😴', '🙏', '👏', '👍', '💪', '🙌', '🤝', '✌️'] },
  { key: 'coracao', icon: '❤️', itens: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💕', '💞', '💯', '✨', '⭐', '🌟', '🔥', '🌹', '🌻', '🌸', '🍀'] },
  { key: 'festa', icon: '🎉', itens: ['🎉', '🎂', '🎁', '🎶', '🎵', '🎤', '🎧', '📻', '📺', '⚽', '🏆', '🍕', '🍔', '🍺', '☕', '🍰', '🏖️', '✈️', '🚗', '🏠'] },
  { key: 'simbolos', icon: '✔️', itens: ['✔️', '✅', '❌', '⚠️', '❗', '❓', '👉', '👈', '👆', '👇', '➡️', '⬅️', '📍', '📞', '💬', '📷', '🎬', '💰', '🛒', '🔔'] },
];

export function EmojiButton({ open, onPress, size = 22 }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 4 }} accessibilityLabel={open ? 'Fechar emojis' : 'Emojis'}>
      <Ionicons name={open ? 'close-circle-outline' : 'happy-outline'} size={size} color={colors.primary} />
    </TouchableOpacity>
  );
}

export default function EmojiBar({ onPick, style }) {
  const [g, setG] = useState(EMOJI_GRUPOS[0].key);
  const grupo = EMOJI_GRUPOS.find((x) => x.key === g) || EMOJI_GRUPOS[0];
  return (
    <View style={[st.box, style]}>
      <View style={st.tabs}>
        {EMOJI_GRUPOS.map((x) => (
          <TouchableOpacity key={x.key} onPress={() => setG(x.key)} style={[st.tab, g === x.key && st.tabOn]} accessibilityLabel={`Emojis ${x.key}`}>
            <Text style={{ fontSize: 18 }}>{x.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always">
        {grupo.itens.map((e) => (
          <TouchableOpacity key={e} onPress={() => onPick(e)} style={st.emoji} accessibilityLabel={`Pôr ${e}`}>
            <Text style={{ fontSize: 24 }}>{e}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, marginTop: 6 },
  tabs: { flexDirection: 'row', paddingHorizontal: 6, marginBottom: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 4 },
  tabOn: { backgroundColor: colors.cardAlt },
  emoji: { paddingHorizontal: 6, paddingVertical: 4 },
});
