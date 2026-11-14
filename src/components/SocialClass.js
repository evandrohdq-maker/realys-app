// Selo do perfil social (ex.: 🎮 Gamer · Streamer) e o questionário que define o perfil no cadastro.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, soft } from '../theme';
import { CLASSES, QUIZ_HOBBIES, classById, subOf, classifyProfile } from '../socialClasses';

// Selo com ícone em anel, no estilo futurista do app. size: 'sm' (listas) ou 'md' (perfil).
export function SocialBadge({ social, size = 'md', showExtra = true, onPress, style }) {
  if (!social || !social.cls) return null;
  const c = classById(social.cls);
  const s = subOf(c, social.sub);
  const sm = size === 'sm';
  const body = (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, style]}>
      <View style={[styles.badge, sm && styles.badgeSm, { borderColor: c.color + '66', backgroundColor: c.color + '14' }]}>
        <View style={[styles.ring, sm && styles.ringSm, { borderColor: c.color }]}>
          <Ionicons name={c.icon} size={sm ? 10 : 13} color={c.color} />
        </View>
        <Text style={[styles.badgeText, sm && { fontSize: 11 }, { color: c.color }]} numberOfLines={1}>
          {c.label}
          {s ? <Text style={{ fontWeight: '600' }}>{` · ${s.label}`}</Text> : null}
        </Text>
      </View>
      {showExtra
        ? (social.extra || []).map((id) => {
            const x = classById(id);
            return (
              <View key={id} style={[styles.badge, styles.badgeSm, { borderColor: x.color + '44', backgroundColor: colors.card }]}>
                <Ionicons name={x.icon} size={10} color={x.color} style={{ marginRight: 4 }} />
                <Text style={{ color: x.color, fontSize: 11, fontWeight: '700' }}>{x.label}</Text>
              </View>
            );
          })
        : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="Perfil social">
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

// Questionário simples: a pessoa se descreve, marca o que gosta de fazer e o app define o perfil.
// value = { about, work, hobbies, social, manual }  ·  onChange(novoValor)
export function ProfileQuiz({ value, onChange }) {
  const v = value || {};
  const hobbies = v.hobbies || [];
  const [picker, setPicker] = useState(false);

  // Sempre que a descrição muda, o perfil é recalculado (a não ser que a pessoa tenha escolhido à mão).
  const auto = useMemo(() => classifyProfile(`${v.about || ''} ${v.work || ''}`, hobbies), [v.about, v.work, hobbies.join(',')]);
  const social = v.manual && v.social ? v.social : auto;

  const set = (patch) => {
    const next = { ...v, ...patch };
    if (!next.manual) next.social = classifyProfile(`${next.about || ''} ${next.work || ''}`, next.hobbies || []);
    onChange(next);
  };
  const toggleHobby = (id) => set({ hobbies: hobbies.includes(id) ? hobbies.filter((h) => h !== id) : [...hobbies, id] });

  const c = classById(social.cls);
  const s = subOf(c, social.sub);
  const empty = !`${v.about || ''}${v.work || ''}`.trim() && !hobbies.length;

  return (
    <View style={styles.quiz}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.ring, { width: 30, height: 30, borderRadius: 15, borderColor: colors.gold }]}>
          <Ionicons name="planet" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.qTitle}>Seu perfil social</Text>
          <Text style={styles.qSub}>Responda rapidinho. O Re@lys entende quem você é e cria seu selo.</Text>
        </View>
      </View>

      <Text style={styles.q}>1. Como você se descreve?</Text>
      <TextInput
        style={styles.area}
        multiline
        placeholder="Ex.: Jogo Free Fire todo dia e faço live na Twitch. Também gravo vídeos curtos."
        placeholderTextColor={colors.muted}
        value={v.about || ''}
        onChangeText={(t) => set({ about: t })}
        maxLength={240}
      />

      <Text style={styles.q}>2. O que você mais gosta de fazer?</Text>
      <View style={styles.chips}>
        {QUIZ_HOBBIES.map((h) => {
          const on = hobbies.includes(h.id);
          return (
            <TouchableOpacity key={h.id} onPress={() => toggleHobby(h.id)} style={[styles.chip, on && styles.chipOn]} activeOpacity={0.85}>
              <Ionicons name={h.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{h.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.q}>3. Trabalha ou estuda com o quê? (opcional)</Text>
      <TextInput
        style={[styles.area, { minHeight: 44 }]}
        placeholder="Ex.: professora de inglês, estudante de direito, eletricista"
        placeholderTextColor={colors.muted}
        value={v.work || ''}
        onChangeText={(t) => set({ work: t })}
        maxLength={80}
      />

      {/* Resultado ao vivo. */}
      <View style={[styles.result, { borderColor: c.color + '66' }]}>
        <View style={[styles.bigRing, { borderColor: c.color, shadowColor: c.color }]}>
          <Ionicons name={c.icon} size={26} color={c.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.resultKicker}>{empty ? 'SEU PERFIL APARECE AQUI' : v.manual ? 'VOCÊ ESCOLHEU' : 'O RE@LYS ENTENDEU QUE VOCÊ É'}</Text>
          <Text style={[styles.resultTitle, { color: c.color }]}>{c.label}</Text>
          {s ? <Text style={styles.resultSub}>Subclasse: {s.label}</Text> : null}
          {(social.extra || []).length ? (
            <Text style={styles.resultSub}>Também: {social.extra.map((id) => classById(id).label).join(', ')}</Text>
          ) : null}
          {!v.manual && social.why && social.why.length ? <Text style={styles.why}>Pelas palavras: {social.why.join(', ')}</Text> : null}
        </View>
      </View>
      <TouchableOpacity onPress={() => setPicker(true)} style={styles.change} activeOpacity={0.8}>
        <Ionicons name="swap-horizontal" size={15} color={colors.accent} />
        <Text style={styles.changeText}>{v.manual ? 'Trocar perfil' : 'Não é isso? Escolher outro'}</Text>
      </TouchableOpacity>
      {v.manual ? (
        <TouchableOpacity onPress={() => set({ manual: false })} style={[styles.change, { marginTop: 0 }]}>
          <Ionicons name="sparkles" size={15} color={colors.primary} />
          <Text style={[styles.changeText, { color: colors.primary }]}>Voltar para o automático</Text>
        </TouchableOpacity>
      ) : null}

      <ClassPicker
        visible={picker}
        current={social}
        onClose={() => setPicker(false)}
        onPick={(cls, sub) => {
          setPicker(false);
          onChange({ ...v, manual: true, social: { cls, sub, extra: (social.extra || []).filter((x) => x !== cls), why: [] } });
        }}
      />
    </View>
  );
}

// Lista de todas as classes e subclasses para escolher à mão.
export function ClassPicker({ visible, current, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(current ? current.cls : null);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.qTitle, { flex: 1 }]}>Escolha seu perfil</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar" hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {CLASSES.map((c) => (
              <View key={c.id}>
                <TouchableOpacity style={styles.pRow} onPress={() => setOpen(open === c.id ? null : c.id)} activeOpacity={0.85}>
                  <View style={[styles.ring, { width: 34, height: 34, borderRadius: 17, borderColor: c.color }]}>
                    <Ionicons name={c.icon} size={17} color={c.color} />
                  </View>
                  <Text style={styles.pLabel}>{c.label}</Text>
                  <Ionicons name={open === c.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </TouchableOpacity>
                {open === c.id ? (
                  <View style={[styles.chips, { paddingLeft: 44, paddingBottom: 8 }]}>
                    {c.subs.map((s) => {
                      const on = current && current.cls === c.id && current.sub === s.id;
                      return (
                        <TouchableOpacity key={s.id} onPress={() => onPick(c.id, s.id)} style={[styles.chip, on && { backgroundColor: c.color, borderColor: c.color }]}>
                          <Text style={[styles.chipText, { color: on ? '#fff' : c.color }]}>{s.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity onPress={() => onPick(c.id, null)} style={styles.chip}>
                      <Text style={[styles.chipText, { color: colors.muted }]}>Só {c.label}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Janela para refazer o questionário depois do cadastro (aba Perfil).
export function ProfileQuizModal({ visible, initial, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState(initial || {});
  React.useEffect(() => {
    if (visible) setV(initial || {});
  }, [visible]);
  const result = v.manual && v.social ? v.social : classifyProfile(`${v.about || ''} ${v.work || ''}`, v.hobbies || []);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: 16 + insets.top, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Voltar" style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }}>Meu perfil social</Text>
        </View>
        <ProfileQuiz value={v} onChange={setV} />
        <TouchableOpacity style={styles.save} onPress={() => onSave({ ...v, social: result })} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 15, marginLeft: 8 }}>Salvar perfil</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 10, marginRight: 6, marginTop: 4, maxWidth: '100%' },
  badgeSm: { paddingVertical: 2, paddingLeft: 3, paddingRight: 8 },
  badgeText: { fontWeight: '700', fontSize: 12.5, flexShrink: 1 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginRight: 6 },
  ringSm: { width: 16, height: 16, borderRadius: 8, marginRight: 4 },
  quiz: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: colors.card, ...soft },
  qTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  qSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  q: { color: colors.text, fontWeight: '700', fontSize: 13.5, marginTop: 14, marginBottom: 6 },
  area: { minHeight: 74, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, color: colors.text, backgroundColor: colors.bg, textAlignVertical: 'top', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, marginRight: 6, marginBottom: 6, backgroundColor: colors.card, ...soft },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 4 },
  result: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 16, borderWidth: 1.5, backgroundColor: colors.primaryLight },
  bigRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  resultKicker: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  resultTitle: { fontSize: 20, fontWeight: '800', marginTop: 1 },
  resultSub: { color: colors.text, fontSize: 12.5, marginTop: 1 },
  why: { color: colors.muted, fontSize: 11, marginTop: 3, fontStyle: 'italic' },
  change: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  changeText: { color: colors.accent, fontWeight: '700', fontSize: 13, marginLeft: 5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  pRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  pLabel: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 15, marginLeft: 4 },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
});
