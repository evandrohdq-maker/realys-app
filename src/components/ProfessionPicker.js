// Escolha de profissional em "tela sobre tela": primeiro a classe (Casa e reparos, Beleza…),
// depois a subclasse (Eletricista, Manicure…) com quantos estão perto. Mesmo visual do Shop.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PROF_CLASSES } from '../professionsData';
import { serviceTypes } from '../data';
import { colors, soft } from '../theme';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// types: as profissões que cabem na aba atual; counts: { chave: prestadores perto }
export default function ProfessionPicker({ selected, types, counts = {}, onPick, extra }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [cls, setCls] = useState(null);
  const [q, setQ] = useState('');
  const allowed = new Set(types.map((t) => t.key));
  const sel = serviceTypes.find((t) => t.key === selected);
  const classes = PROF_CLASSES.map((c) => ({ ...c, types: types.filter((t) => t.group === c.label) })).filter((c) => c.types.length);
  const total = types.length;
  const near = (list) => list.reduce((n, t) => n + (counts[t.key] || 0), 0);
  const close = () => {
    setOpen(false);
    setCls(null);
    setQ('');
  };
  const pick = (k) => {
    close();
    onPick(k);
  };
  const found = q.trim()
    ? types.filter((t) => norm(t.label).includes(norm(q)) || (t.words || []).some((w) => w.includes(norm(q)))).slice(0, 30)
    : null;
  const current = cls && classes.find((c) => c.key === cls);
  const list = found || (current ? current.types : null);

  return (
    <>
      <TouchableOpacity style={styles.bar} onPress={() => setOpen(true)} activeOpacity={0.9} accessibilityLabel="Escolher o tipo de profissional">
        <View style={styles.barIcon}>
          <Ionicons name={sel ? sel.ion : 'briefcase-outline'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.barTitle} numberOfLines={1}>{sel ? sel.label : 'Escolha o profissional'}</Text>
          <Text style={styles.barSub} numberOfLines={1}>
            {sel ? `${sel.group} · trocar profissão` : `${classes.length} classes · ${total} profissões`}
          </Text>
        </View>
        <Text style={styles.barSwap}>Trocar</Text>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => (cls || q ? (setCls(null), setQ('')) : close())} statusBarTranslucent>
        <View style={styles.back}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.grip} />
            <View style={styles.headRow}>
              {current && !found ? (
                <TouchableOpacity onPress={() => setCls(null)} style={styles.roundBtn} accessibilityLabel="Voltar às classes">
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.title} numberOfLines={1}>
                {found ? 'Resultados' : current ? current.label : 'Qual profissional você precisa?'}
              </Text>
              <TouchableOpacity onPress={close} style={styles.roundBtn} accessibilityLabel="Fechar">
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Buscar profissão: manicure, pedreiro, babá…"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
              />
              {q ? (
                <TouchableOpacity onPress={() => setQ('')}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 470 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {list ? (
                list.length ? (
                  list.map((t) => {
                    const n = counts[t.key] || 0;
                    const on = t.key === selected;
                    return (
                      <TouchableOpacity key={t.key} style={[styles.subRow, on && styles.subRowOn]} onPress={() => pick(t.key)} activeOpacity={0.8} accessibilityLabel={t.label}>
                        <View style={styles.subIcon}>
                          <Ionicons name={t.ion || 'briefcase-outline'} size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.subLabel} numberOfLines={1}>{t.label}</Text>
                          <Text style={styles.subMeta} numberOfLines={1}>
                            {t.mode === 'online' ? 'Online por vídeo' : t.group === 'Transporte' ? 'Chamado na hora' : 'Visita no endereço'}
                            {found ? ` · ${t.group}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.subCount, !n && { color: colors.muted, fontWeight: '600' }]}>{n ? `${n} perto` : 'em breve'}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.empty}>Nenhuma profissão com esse nome nesta aba.</Text>
                )
              ) : (
                <View style={styles.grid}>
                  {classes.map((c) => {
                    const n = near(c.types);
                    const on = sel && sel.group === c.label;
                    return (
                      <TouchableOpacity key={c.key} style={styles.item} onPress={() => setCls(c.key)} activeOpacity={0.8} accessibilityLabel={c.label}>
                        <View style={[styles.circle, on && styles.circleOn]}>
                          <Ionicons name={c.ion} size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.itemLabel} numberOfLines={2}>{c.label}</Text>
                        <Text style={styles.itemSub}>{c.types.length} tipos{n ? ` · ${n} perto` : ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {extra
                    ? extra.map((x) => (
                        <TouchableOpacity key={x.label} style={styles.item} onPress={() => (close(), x.onPress())} activeOpacity={0.8} accessibilityLabel={x.label}>
                          <View style={styles.circle}>
                            <Ionicons name={x.ion} size={22} color={colors.primary} />
                          </View>
                          <Text style={styles.itemLabel} numberOfLines={2}>{x.label}</Text>
                          <Text style={styles.itemSub}>{x.sub || ''}</Text>
                        </TouchableOpacity>
                      ))
                    : null}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...soft },
  barIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  barTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  barSub: { color: colors.muted, fontSize: 11.5, marginTop: 1 },
  barSwap: { color: colors.primary, fontWeight: '800', fontSize: 13, marginRight: 2 },
  back: { flex: 1, backgroundColor: 'rgba(31,42,68,0.25)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8 },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 17, marginHorizontal: 6 },
  roundBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, height: 42, marginBottom: 14, ...soft },
  searchInput: { flex: 1, color: colors.text, marginLeft: 8, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  item: { width: '33.33%', alignItems: 'center', paddingHorizontal: 4, marginBottom: 14 },
  circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', ...soft },
  circleOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  itemLabel: { color: colors.text, fontWeight: '700', fontSize: 11.5, marginTop: 6, textAlign: 'center' },
  itemSub: { color: colors.muted, fontSize: 10, marginTop: 1, textAlign: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent', ...soft },
  subRowOn: { borderColor: colors.primary },
  subIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  subLabel: { color: colors.text, fontWeight: '800', fontSize: 14 },
  subMeta: { color: colors.muted, fontSize: 11, marginTop: 1 },
  subCount: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 24 },
});
