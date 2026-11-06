// Barra de pesquisa padrão do Realys: digitar + OK (ou a lupa) pesquisa, e o microfone pesquisa por voz.
// Usada em todas as buscas do app (serviços, loja, pessoas, artistas, transporte…).
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Photo } from './ui';
import { searchAll } from '../search';

// Abre o reconhecimento de voz do Android e devolve o que a pessoa falou.
export async function listenOnce(prompt = 'Fale o que você procura') {
  if (Platform.OS !== 'android') return null;
  try {
    const result = await IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
      extra: {
        'android.speech.extra.LANGUAGE_MODEL': 'free_form',
        'android.speech.extra.LANGUAGE': 'pt-BR',
        'android.speech.extra.PROMPT': prompt,
      },
    });
    const said = result && result.extra && result.extra['android.speech.extra.RESULTS'];
    return said && said.length ? String(said[0]) : null;
  } catch (e) {
    Alert.alert('Microfone', 'Não consegui abrir o microfone. Digite o que procura e toque em OK.');
    return null;
  }
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Pesquisar', autoFocus, style, voicePrompt }) {
  const [listening, setListening] = useState(false);
  const submit = (text) => {
    const q = String(text != null ? text : value || '').trim();
    Keyboard.dismiss();
    if (onSubmit) onSubmit(q);
  };
  const voice = async () => {
    setListening(true);
    const said = await listenOnce(voicePrompt || placeholder);
    setListening(false);
    if (!said) return;
    onChangeText(said);
    submit(said);
  };
  return (
    <View style={[styles.bar, style]}>
      <TouchableOpacity onPress={() => submit()} accessibilityLabel="Pesquisar" style={styles.icon}>
        <Ionicons name="search" size={19} color={colors.primary} />
      </TouchableOpacity>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => submit()}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoFocus={autoFocus}
        style={styles.input}
      />
      {value ? (
        <TouchableOpacity onPress={() => { onChangeText(''); if (onSubmit) onSubmit(''); }} accessibilityLabel="Limpar busca" style={styles.icon}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={voice} accessibilityLabel="Pesquisar por voz" style={[styles.mic, listening && { backgroundColor: colors.accent }]}>
        <Ionicons name={listening ? 'radio' : 'mic'} size={18} color={listening ? '#FFFFFF' : colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// Resultados da pesquisa em TODO o conteúdo do Realys (mesma busca do assistente de voz).
export function GlobalResults({ query, navigate, title = 'Encontrado no Realys', max = 8, hideEmpty }) {
  const { state, dispatch } = useStore();
  if (!query || !query.trim()) return null;
  const { results } = searchAll(state, query, max);
  if (!results.length) {
    return hideEmpty ? null : <Text style={styles.empty}>Nada encontrado para "{query}". Tente outra palavra.</Text>;
  }
  const open = (r) => {
    if (r.profileId) return dispatch({ type: 'OPEN_PROFILE', id: r.profileId });
    if (r.companyId) return dispatch({ type: 'OPEN_COMPANY', id: r.companyId });
    if (r.go && navigate) navigate(r.go);
  };
  const priceOf = (r) => r.price || (r.priceValue != null ? `R$ ${r.priceValue.toFixed(2).replace('.', ',')}${r.priceUnit ? ' por ' + r.priceUnit : ''}` : '');
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.title}>{title} · {results.length}</Text>
      {results.map((r) => (
        <TouchableOpacity key={r.id} style={styles.row} activeOpacity={0.85} onPress={() => open(r)}>
          <Photo uri={r.photo} style={styles.photo} fallback={r.icon || '🔎'} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.section}>{r.section}{r.sponsored ? ' · Patrocinado' : ''}</Text>
            <Text style={styles.name} numberOfLines={2}>{r.title}</Text>
            {r.subtitle ? <Text style={styles.sub} numberOfLines={1}>{r.subtitle}</Text> : null}
            {priceOf(r) ? <Text style={styles.price}>{priceOf(r)}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingLeft: 4, paddingRight: 4, minHeight: 48, marginBottom: 12, ...soft },
  icon: { padding: 8 },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 },
  mic: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, marginBottom: 8, ...soft },
  photo: { width: 52, height: 52, borderRadius: 10 },
  section: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  name: { color: colors.text, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 12 },
  price: { color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, marginVertical: 10 },
});
