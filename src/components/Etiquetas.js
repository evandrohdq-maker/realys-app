// Etiquetas do Stream: a pessoa cria as dela ("Trabalho", "Carro", "Futebol", "Para dormir"…) e põe
// nas rádios e nos canais de TV, para organizar o que gosta de ouvir e assistir.
//   - EtiquetaChips: a fileira no cabeçalho das Rádios / da TV (Todas · as etiquetas · + Nova).
//   - EtiquetaBtn: o botãozinho de etiqueta em cada rádio/canal (abre a lista para marcar).
//   - temEtiqueta: filtro da lista.
// Ficam na conta (vão para o servidor junto com o perfil): iguais no app e no site.
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { colors } from '../theme';

const EMOJIS = ['⭐', '🚗', '💼', '⚽', '🙏', '🎉', '😴', '📰', '🎸', '🤠', '🎧', '❤️'];
const vazio = { tags: [], de: {} };
const dadosDe = (state, kind) => (state.etiquetas && state.etiquetas[kind]) || vazio;
export const temEtiqueta = (state, kind, id, tagId) => (dadosDe(state, kind).de[id] || []).includes(tagId);

function useEtiquetas(kind) {
  const { state, dispatch } = useStore();
  const d = dadosDe(state, kind);
  const salvar = (data) => dispatch({ type: 'ETIQUETAS_SET', kind, data });
  const criar = (nome, emoji) => {
    const n = String(nome || '').trim().slice(0, 24);
    if (!n) return null;
    if (d.tags.some((t) => t.nome.toLowerCase() === n.toLowerCase())) {
      Alert.alert('Etiqueta', 'Você já tem uma etiqueta com esse nome.');
      return null;
    }
    if (d.tags.length >= 20) {
      Alert.alert('Etiqueta', 'Dá para ter até 20 etiquetas.');
      return null;
    }
    const tag = { id: 'tg' + Date.now().toString(36), nome: n, emoji: emoji || '⭐' };
    salvar({ ...d, tags: [...d.tags, tag] });
    return tag;
  };
  const apagar = (tagId) => {
    const de = {};
    Object.entries(d.de).forEach(([k, l]) => {
      const f = l.filter((x) => x !== tagId);
      if (f.length) de[k] = f;
    });
    salvar({ tags: d.tags.filter((t) => t.id !== tagId), de });
  };
  // Marca/desmarca. base: dados já atualizados (quando acabou de criar a etiqueta).
  const marcar = (id, tagId, base = d) => {
    const atual = base.de[id] || [];
    const novo = atual.includes(tagId) ? atual.filter((x) => x !== tagId) : [...atual, tagId];
    const de = { ...base.de };
    if (novo.length) de[id] = novo;
    else delete de[id];
    salvar({ ...base, de });
  };
  return { ...d, criar, apagar, marcar };
}

// Criar etiqueta (nome + emoji).
function NovaEtiqueta({ visible, onClose, onCriar }) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState('⭐');
  const ok = () => {
    if (onCriar(nome, emoji)) {
      setNome('');
      onClose();
    }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.back}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <KeyboardLift style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={st.title}>Nova etiqueta</Text>
          <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Trabalho, Carro, Futebol" placeholderTextColor={colors.muted} maxLength={24} style={st.field} autoFocus onSubmitEditing={ok} />
          <View style={st.wrap}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setEmoji(e)} style={[st.emoji, emoji === e && st.emojiOn]} accessibilityLabel={`Emoji ${e}`}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={ok} style={st.ok} accessibilityLabel="Criar etiqueta">
            <Text style={st.okT}>Criar</Text>
          </TouchableOpacity>
        </KeyboardLift>
      </View>
    </Modal>
  );
}

// Fileira do cabeçalho: filtra a lista pela etiqueta escolhida.
export function EtiquetaChips({ kind, value, onChange }) {
  const e = useEtiquetas(kind);
  const [nova, setNova] = useState(false);
  const segurar = (t) =>
    Alert.alert(`${t.emoji} ${t.nome}`, `Apagar esta etiqueta? ${kind === 'tv' ? 'Os canais continuam' : 'As rádios continuam'} no app, só saem dela.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { e.apagar(t.id); if (value === t.id) onChange(null); } },
    ]);
  const contar = (tagId) => Object.values(e.de).filter((l) => l.includes(tagId)).length;
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={st.headRow}>
        <Ionicons name="pricetags-outline" size={14} color={colors.muted} />
        <Text style={st.head}>Minhas etiquetas</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
        {e.tags.length ? (
          <TouchableOpacity onPress={() => onChange(null)} style={[st.chip, !value && st.chipOn]} accessibilityLabel="Todas, sem filtro de etiqueta">
            <Text style={[st.chipT, !value && st.chipTOn]}>Todas</Text>
          </TouchableOpacity>
        ) : null}
        {e.tags.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => onChange(value === t.id ? null : t.id)} onLongPress={() => segurar(t)} style={[st.chip, value === t.id && st.chipOn]} accessibilityLabel={`Etiqueta ${t.nome}, ${contar(t.id)}. Segure para apagar`}>
            <Text style={[st.chipT, value === t.id && st.chipTOn]} numberOfLines={1}>{t.emoji} {t.nome} · {contar(t.id)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setNova(true)} style={[st.chip, st.chipNova]} accessibilityLabel="Criar uma etiqueta">
          <Ionicons name="add" size={14} color={colors.primary} />
          <Text style={[st.chipT, { color: colors.primary }]}>{e.tags.length ? 'Nova' : `Criar etiqueta para organizar ${kind === 'tv' ? 'os canais' : 'as rádios'}`}</Text>
        </TouchableOpacity>
      </ScrollView>
      {e.tags.length ? <Text style={st.dica}>Toque na etiqueta 🏷 de {kind === 'tv' ? 'um canal' : 'uma rádio'} para organizar. Segure uma etiqueta para apagar.</Text> : null}
      <NovaEtiqueta visible={nova} onClose={() => setNova(false)} onCriar={e.criar} />
    </View>
  );
}

// Botãozinho de etiqueta no cartão da rádio/canal.
export function EtiquetaBtn({ kind, item, color = colors.muted, size = 19, style }) {
  const e = useEtiquetas(kind);
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState(false);
  const [nova, setNova] = useState(false);
  if (!item) return null;
  const minhas = e.de[item.id] || [];
  const criarEMarcar = (n, em) => {
    const t = e.criar(n, em);
    if (t) e.marcar(item.id, t.id, { tags: [...e.tags, t], de: e.de });
    return t;
  };
  return (
    <>
      <TouchableOpacity onPress={() => setAberto(true)} hitSlop={6} style={[{ padding: 4 }, style]} accessibilityLabel={minhas.length ? `${item.name} está em ${minhas.length} etiquetas. Mudar` : `Pôr ${item.name} numa etiqueta`}>
        <Ionicons name={minhas.length ? 'pricetag' : 'pricetag-outline'} size={size} color={minhas.length ? colors.primary : color} />
      </TouchableOpacity>
      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={st.back}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAberto(false)} />
          <View style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={st.title} numberOfLines={1}>Etiquetas de {item.name}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {e.tags.map((t) => {
                const on = minhas.includes(t.id);
                return (
                  <TouchableOpacity key={t.id} style={st.row} onPress={() => e.marcar(item.id, t.id)} accessibilityLabel={`${on ? 'Tirar de' : 'Pôr em'} ${t.nome}`}>
                    <Text style={{ fontSize: 20, width: 30 }}>{t.emoji}</Text>
                    <Text style={st.rowT} numberOfLines={1}>{t.nome}</Text>
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.borderStrong} />
                  </TouchableOpacity>
                );
              })}
              {!e.tags.length ? <Text style={st.dica}>Você ainda não tem etiquetas. Crie a primeira.</Text> : null}
            </ScrollView>
            <TouchableOpacity onPress={() => setNova(true)} style={[st.ok, { backgroundColor: colors.cardAlt }]} accessibilityLabel="Criar etiqueta">
              <Text style={[st.okT, { color: colors.text }]}>+ Nova etiqueta</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAberto(false)} style={st.ok} accessibilityLabel="Pronto">
              <Text style={st.okT}>Pronto</Text>
            </TouchableOpacity>
          </View>
        </View>
        <NovaEtiqueta visible={nova} onClose={() => setNova(false)} onCriar={criarEMarcar} />
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  head: { color: colors.muted, fontSize: 12, fontWeight: '800', marginLeft: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 11, paddingVertical: 6, marginRight: 6, backgroundColor: colors.card, maxWidth: 260 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipNova: { borderStyle: 'dashed', borderColor: colors.primary },
  chipT: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  chipTOn: { color: '#fff' },
  dica: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  back: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  field: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.bg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  emoji: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  emojiOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryLight },
  ok: { backgroundColor: colors.text, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  okT: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowT: { color: colors.text, fontWeight: '700', flex: 1 },
});
