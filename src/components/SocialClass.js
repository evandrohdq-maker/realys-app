// Selo do perfil social (ex.: 🎮 Gamer · Streamer) e o questionário que define o perfil no cadastro.
import React, { useMemo, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, soft } from '../theme';
import { CLASSES, QUIZ_HOBBIES, classById, subOf, classifyProfile } from '../socialClasses';
import { classeDaProfissao, profissaoPorKey } from '../providerSegments';
import ProfissaoBusca from './ProfissaoBusca';

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

// Perfil no cadastro, direto ao ponto:
//  1. Profissão: digita e escolhe entre as 4 que mais combinam (ou usa o que escreveu).
//  2. Uma frase sobre você (opcional).
//  3. O Realyz mostra o selo do perfil (ex.: Música · Cantor). Não é isso? Escolhe outro.
//  Interesses ficam num botão opcional, para não encher a tela.
// value = { about, work, prof, hobbies, social, manual }  ·  onChange(novoValor)
// A profissão escolhida aqui já vale para o painel de prestador (não precisa escolher de novo).
export function calcSocial(v) {
  const hobbies = v.hobbies || [];
  const fixa = v.prof ? classeDaProfissao(v.prof) : null;
  if (fixa) return { ...fixa, extra: [], why: [], prof: v.prof };
  const prof = v.prof ? profissaoPorKey(v.prof) : null;
  const palavras = prof ? `${prof.label} ${(prof.words || []).join(' ')}` : '';
  const r = classifyProfile(`${v.about || ''} ${v.work || ''} ${palavras}`, hobbies);
  const semClasse = !r || !r.cls || r.cls === 'membro';
  return { ...(semClasse && (v.prof || (v.work || '').trim()) ? { cls: 'servicos', sub: null, extra: [], why: [] } : r), prof: v.prof || null };
}

export function ProfileQuiz({ value, onChange }) {
  const v = value || {};
  const hobbies = v.hobbies || [];
  const [picker, setPicker] = useState(false);
  const [interesses, setInteresses] = useState(hobbies.length > 0);

  const auto = useMemo(() => calcSocial(v), [v.about, v.work, v.prof, hobbies.join(',')]);
  const social = v.manual && v.social ? v.social : auto;
  const set = (patch) => {
    const next = { ...v, ...patch };
    if (!next.manual) next.social = calcSocial(next);
    onChange(next);
  };
  const toggleHobby = (id) => set({ hobbies: hobbies.includes(id) ? hobbies.filter((h) => h !== id) : [...hobbies, id] });

  const c = classById(social.cls);
  const s = subOf(c, social.sub);
  const empty = !v.prof && !`${v.about || ''}${v.work || ''}`.trim() && !hobbies.length;

  return (
    <View style={styles.quiz}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.ring, { width: 30, height: 30, borderRadius: 15, borderColor: colors.gold }]}>
          <Ionicons name="planet" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.qTitle}>Seu perfil</Text>
          <Text style={styles.qSub}>Duas respostas rápidas e o Realyz monta o seu selo.</Text>
        </View>
      </View>

      <Text style={styles.q}>Qual é a sua profissão ou o que você faz?</Text>
      <ProfissaoBusca
        value={v.prof || null}
        livre
        placeholder="Digite (ex.: eletricista, cantora, estudante)"
        onPick={(p) => set(p ? { prof: p.key || null, work: p.label } : { prof: null, work: '' })}
      />
      {!v.prof && (v.work || '').trim() ? <Text style={styles.why}>Você escreveu: {v.work}</Text> : null}

      <Text style={styles.q}>Uma frase sobre você (opcional)</Text>
      <TextInput
        style={[styles.area, { minHeight: 54 }]}
        multiline
        placeholder="Ex.: Toco em casamentos e bares da região."
        placeholderTextColor={colors.muted}
        value={v.about || ''}
        onChangeText={(t) => set({ about: t })}
        maxLength={160}
      />

      {interesses ? (
        <>
          <Text style={styles.q}>Interesses (opcional)</Text>
          <View style={styles.chips}>
            {QUIZ_HOBBIES.map((h) => {
              const on = hobbies.includes(h.id);
              return (
                <TouchableOpacity key={h.id} onPress={() => toggleHobby(h.id)} style={[styles.chip, on && styles.chipOn]} activeOpacity={0.85}>
                  <Ionicons name={h.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chipText, on && { color: colors.onPrimary }]}>{h.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <TouchableOpacity onPress={() => setInteresses(true)} style={styles.change} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
          <Text style={[styles.changeText, { color: colors.primary }]}>Adicionar interesses</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.result, { borderColor: c.color + '66' }]}>
        <View style={[styles.bigRing, { borderColor: c.color, shadowColor: c.color }]}>
          <Ionicons name={c.icon} size={26} color={c.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.resultKicker}>{empty ? 'SEU SELO APARECE AQUI' : v.manual ? 'VOCÊ ESCOLHEU' : 'SEU SELO NO REALYZ'}</Text>
          <Text style={[styles.resultTitle, { color: c.color }]}>{c.label}</Text>
          {s ? <Text style={styles.resultSub}>{s.label}</Text> : null}
        </View>
      </View>
      <TouchableOpacity onPress={() => setPicker(true)} style={styles.change} activeOpacity={0.8}>
        <Ionicons name="swap-horizontal" size={15} color={colors.accent} />
        <Text numberOfLines={1} style={styles.changeText}>{v.manual ? 'Trocar selo' : 'Não é isso? Escolher outro'}</Text>
      </TouchableOpacity>
      {v.manual ? (
        <TouchableOpacity onPress={() => set({ manual: false })} style={[styles.change, { marginTop: 0 }]}>
          <Ionicons name="sparkles" size={15} color={colors.primary} />
          <Text numberOfLines={1} style={[styles.changeText, { color: colors.primary }]}>Voltar para o automático</Text>
        </TouchableOpacity>
      ) : null}

      <ClassPicker
        visible={picker}
        current={social}
        onClose={() => setPicker(false)}
        onPick={(cls, sub) => {
          setPicker(false);
          onChange({ ...v, manual: true, social: { cls, sub, extra: [], why: [], prof: v.prof || null } });
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
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
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.pLabel}>{c.label}</Text>
                  <Ionicons name={open === c.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </TouchableOpacity>
                {open === c.id ? (
                  <View style={[styles.chips, { paddingLeft: 44, paddingBottom: 8 }]}>
                    {c.subs.map((s) => {
                      const on = current && current.cls === c.id && current.sub === s.id;
                      return (
                        <TouchableOpacity key={s.id} onPress={() => onPick(c.id, s.id)} style={[styles.chip, on && { backgroundColor: c.color, borderColor: c.color }]}>
                          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chipText, { color: on ? '#fff' : c.color }]}>{s.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity onPress={() => onPick(c.id, null)} style={styles.chip}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chipText, { color: colors.muted }]}>Só {c.label}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </KeyboardLift></Modal>
  );
}

// Janela para refazer o questionário depois do cadastro (aba Perfil).
export function ProfileQuizModal({ visible, initial, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState(initial || {});
  React.useEffect(() => {
    if (visible) setV(initial || {});
  }, [visible]);
  const result = v.manual && v.social ? v.social : calcSocial(v);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
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
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 15, marginLeft: 8 }}>Salvar perfil</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardLift></Modal>
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
