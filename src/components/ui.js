import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Image } from 'react-native';
import { colors, soft } from '../theme';

export function Screen({ children, scroll = true }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Title({ children, sub }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Section({ title, right, children }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const C = onPress ? TouchableOpacity : View;
  return (
    <C onPress={onPress} activeOpacity={0.8} style={[styles.card, style]}>
      {children}
    </C>
  );
}

export function Button({ title, onPress, variant = 'primary', small, style, disabled }) {
  const v = {
    primary: { bg: colors.primary, fg: colors.onPrimary, bd: colors.primary },
    outline: { bg: 'transparent', fg: colors.primary, bd: colors.primary },
    danger: { bg: colors.danger, fg: colors.onPrimary, bd: colors.danger },
    light: { bg: colors.primaryLight, fg: colors.primaryDark, bd: colors.primaryLight },
    dark: { bg: colors.cardAlt, fg: colors.text, bd: colors.cardAlt },
  }[variant];
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.bd, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, color = colors.primary, bg }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg || color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Input(props) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Stat({ label, value, color = colors.text, hint }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

// Gráfico de barras simples, sem bibliotecas externas.
export function BarChart({ data, format = (v) => v, height = 140 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height }}>
        {data.map((d, i) => {
          const last = i === data.length - 1;
          return (
            <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={styles.barValue}>{format(d.value)}</Text>
              <View
                style={{
                  width: '60%',
                  height: Math.max(4, (d.value / max) * (height - 22)),
                  backgroundColor: last ? colors.accent : colors.primary,
                  borderTopLeftRadius: 5,
                  borderTopRightRadius: 5,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map((d) => (
          <Text key={d.label} style={styles.barLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// "Foto" do produto: bloco colorido com ícone. Funciona sem internet.
export function ProductThumb({ product, size = 64 }) {
  // Produto cadastrado pela loja com foto: mostra a capa (primeira foto).
  const cover = product && product.photos && product.photos[0];
  if (cover) return <Photo uri={cover} style={[styles.thumb, { width: size, height: size }]} fallback={product.emoji || '📦'} />;
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: (product.tint || '#EEF2F5') + '26' }]}>
      <Text style={{ color: colors.text, fontSize: size * 0.5 }}>{product.emoji}</Text>
    </View>
  );
}

// Foto da internet com fundo de reserva caso esteja sem conexão.
export function Photo({ uri, style, fallback = '🖼️' }) {
  const [failed, setFailed] = useState(false);
  if (failed || !uri)
    return (
      <View style={[style, { backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text, fontSize: 34 }}>{fallback}</Text>
      </View>
    );
  return <Image source={{ uri }} style={[style, { backgroundColor: colors.cardAlt }]} onError={() => setFailed(true)} />;
}

export function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Empty({ text }) {
  return <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  screenScroll: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: 18, paddingBottom: 110, backgroundColor: colors.bg, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  // Cartão clean: sem contorno, só uma sombra leve e quente.
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...soft,
  },
  btn: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', marginRight: 6, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    ...soft,
  },
  statLabel: { fontSize: 12, color: colors.muted },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statHint: { fontSize: 11, color: colors.muted, marginTop: 2 },
  barValue: { fontSize: 9, color: colors.muted, marginBottom: 3 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.muted },
  thumb: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  // Chip clean: fundo marfim, sem contorno; ativo fica dourado.
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
