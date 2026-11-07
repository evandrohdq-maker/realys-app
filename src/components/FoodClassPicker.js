// Escolha de classe e subclasse do Food em "tela sobre tela", com o mesmo visual do escolhedor de
// profissionais: primeiro a classe (Pizzaria, Lanches, Bar…), depois a subclasse (Pizza salgada…),
// com quantas lojas têm o item. Filtra a lista de restaurantes e bares da aba Food.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FOOD_CLASSES } from '../foodClasses';
import { colors, soft } from '../theme';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// selected: { classe, subclasse } ou null (Tudo). counts: Map com 'classe' e 'classe:subclasse' → nº de lojas.
export default function FoodClassPicker({ selected, counts, onPick }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [cls, setCls] = useState(null);
  const [q, setQ] = useState('');
  const current = cls && FOOD_CLASSES.find((c) => c.key === cls);
  const selClasse = selected ? FOOD_CLASSES.find((c) => c.key === selected.classe) : null;
  const selSub = selClasse && selected.subclasse ? selClasse.subs.find((s) => s.key === selected.subclasse) : null;
  const close = () => {
    setOpen(false);
    setCls(null);
    setQ('');
  };
  const pick = (sel) => {
    close();
    onPick(sel);
  };
  // Busca: procura entre todas as subclasses, com a classe ao lado.
  const found = q.trim()
    ? FOOD_CLASSES.flatMap((c) => c.subs.filter((s) => norm(s.label).includes(norm(q)) || norm(c.label).includes(norm(q))).map((s) => ({ c, s })))
    : null;
  const n = (k) => counts.get(k) || 0;

  return (
    <>
      <TouchableOpacity style={styles.bar} onPress={() => setOpen(true)} activeOpacity={0.9} accessibilityLabel="Escolher classe de comida">
        <View style={styles.barIcon}>
          <Ionicons name={selClasse ? selClasse.icon : 'restaurant-outline'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.barTitle} numberOfLines={1}>
            {selClasse ? (selSub ? `${selClasse.label} › ${selSub.label}` : selClasse.label) : 'Todas as classes'}
          </Text>
          <Text style={styles.barSub} numberOfLines={1}>
            {selected ? `${n(selSub ? `${selected.classe}:${selected.subclasse}` : selected.classe)} lojas com este item` : 'Escolha a classe ou a subclasse do que você quer'}
          </Text>
        </View>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.primary} style={{ paddingHorizontal: 6 }} />
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
                {found ? 'Resultados' : current ? current.label : 'O que você quer comer?'}
              </Text>
              <TouchableOpacity onPress={close} style={styles.roundBtn} accessibilityLabel="Fechar">
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Buscar: pizza, sushi, chope, café…" placeholderTextColor={colors.muted} style={styles.searchInput} />
              {q ? (
                <TouchableOpacity onPress={() => setQ('')}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 470 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {found ? (
                found.length ? (
                  found.slice(0, 30).map(({ c, s }) => (
                    <SubRow key={`${c.key}:${s.key}`} icon={c.icon} label={s.label} meta={c.label} count={n(`${c.key}:${s.key}`)} on={selected && selected.subclasse === s.key} onPress={() => pick({ classe: c.key, subclasse: s.key })} />
                  ))
                ) : (
                  <Text style={styles.empty}>Nenhuma classe com esse nome.</Text>
                )
              ) : current ? (
                <>
                  <SubRow icon={current.icon} label={`Tudo de ${current.label.toLowerCase()}`} meta="Todas as subclasses" count={n(current.key)} on={selected && selected.classe === current.key && !selected.subclasse} onPress={() => pick({ classe: current.key, subclasse: null })} />
                  {current.subs.map((s) => (
                    <SubRow key={s.key} icon={current.icon} label={s.label} meta={current.label} count={n(`${current.key}:${s.key}`)} on={selected && selected.subclasse === s.key} onPress={() => pick({ classe: current.key, subclasse: s.key })} />
                  ))}
                </>
              ) : (
                <View style={styles.grid}>
                  <TouchableOpacity style={styles.item} onPress={() => pick(null)} activeOpacity={0.8} accessibilityLabel="Todas as classes">
                    <View style={[styles.circle, !selected && styles.circleOn]}>
                      <Ionicons name="grid-outline" size={22} color={colors.primary} />
                    </View>
                    <Text style={styles.itemLabel} numberOfLines={2}>Tudo</Text>
                  </TouchableOpacity>
                  {FOOD_CLASSES.map((c) => {
                    const on = selClasse && selClasse.key === c.key;
                    return (
                      <TouchableOpacity key={c.key} style={styles.item} onPress={() => setCls(c.key)} activeOpacity={0.8} accessibilityLabel={c.label}>
                        <View style={[styles.circle, on && styles.circleOn]}>
                          <Ionicons name={c.icon} size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.itemLabel} numberOfLines={2}>{c.label}</Text>
                        {n(c.key) ? <Text style={styles.itemSub}>{n(c.key)} lojas</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SubRow({ icon, label, meta, count, on, onPress }) {
  return (
    <TouchableOpacity style={[styles.subRow, on && styles.subRowOn]} onPress={onPress} activeOpacity={0.8} accessibilityLabel={label}>
      <View style={styles.subIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.subLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.subMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <Text style={[styles.subCount, !count && { color: colors.muted, fontWeight: '600' }]}>{count ? `${count} lojas` : 'em breve'}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...soft },
  barIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  barTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  barSub: { color: colors.muted, fontSize: 11.5, marginTop: 1 },
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
