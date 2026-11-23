import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Image, PixelRatio } from 'react-native';
import { Text, TextInput } from '../responsive';
import { colors, soft } from '../theme';

export function Screen({ children, scroll = true, scrollRef, onScroll, onScrollEnd }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screenScroll}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={onScroll ? 100 : undefined}
      onMomentumScrollEnd={onScrollEnd}
      onScrollEndDrag={onScrollEnd}
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children, sub }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

// Cabeçalho dos painéis de trabalho (empresa, prestador): faixa azul-escura com título dourado
// e, dentro dela, os números do resumo. O resto do painel continua branco e clean.
export function PainelHeader({ title, sub, stats }) {
  return (
    <View style={styles.painel}>
      <Text numberOfLines={1} style={styles.painelTitle}>{title}</Text>
      {sub ? <Text numberOfLines={1} style={styles.painelSub}>{sub}</Text> : null}
      {stats && stats.length ? (
        <View style={styles.painelStats}>
          {stats.map((st) => (
            <View key={st.label} style={styles.painelStat}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.painelStatValue}>{st.value}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.painelStatLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Section({ title, right, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
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
    // Visual mais suave: botão branco com contorno fino e letra dourada (sem bloco dourado).
    primary: { bg: colors.card, fg: colors.primaryDark, bd: colors.borderStrong },
    outline: { bg: 'transparent', fg: colors.primary, bd: colors.primary },
    danger: { bg: colors.danger, fg: colors.onPrimary, bd: colors.danger },
    light: { bg: colors.card, fg: colors.primaryDark, bd: colors.border },
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
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.btnText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
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
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.statValue, { color }]}>{value}</Text>
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
// Fotos de exemplo (picsum) vêm em 600x400 mesmo quando aparecem como miniatura de 50 pontos.
// Pede a imagem no tamanho em que ela é mostrada: baixa mais rápido e gasta menos memória.
function fitPhoto(uri, style) {
  const m = /^(https:\/\/picsum\.photos\/seed\/[^/]+)\/(\d+)\/(\d+)$/.exec(String(uri));
  if (!m) return uri;
  const f = StyleSheet.flatten(style) || {};
  if (typeof f.width !== 'number' || typeof f.height !== 'number') return uri;
  const k = Math.min(3, PixelRatio.get() || 2);
  const w = Math.round(f.width * k);
  const h = Math.round(f.height * k);
  return w >= Number(m[2]) || h >= Number(m[3]) ? uri : `${m[1]}/${w}/${h}`;
}

// fit: 'cover' (preenche, pode cortar a borda) ou 'contain' (mostra a foto inteira). blur: desfoque.
// Foto aleatória de banco de imagens (picsum), usada nos exemplos: nunca combina com o que o anúncio
// fala (um relógio aparecia com foto de livro). No lugar dela o app mostra o ícone do assunto.
export const isStockPhoto = (u) => typeof u === 'string' && /picsum\.photos/.test(u);

export function Photo({ uri, style, fallback = '🖼️', fit, blur }) {
  const [failed, setFailed] = useState(false);
  if (failed || !uri || isStockPhoto(uri))
    return (
      <View style={[style, { backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text, fontSize: 34 }}>{fallback}</Text>
      </View>
    );
  return <Image source={{ uri: fitPhoto(uri, style) }} resizeMode={fit} blurRadius={blur} style={[style, { backgroundColor: colors.cardAlt }]} onError={() => setFailed(true)} />;
}

// Proporção real de uma foto (largura / altura), ou null enquanto não sabe.
export function usePhotoRatio(uri) {
  const [ratio, setRatio] = useState(null);
  useEffect(() => {
    if (!uri) return undefined;
    let alive = true;
    setRatio(null);
    Image.getSize(uri, (w, h) => alive && w && h && setRatio(w / h), () => {});
    return () => {
      alive = false;
    };
  }, [uri]);
  return ratio;
}

// Foto de post: a caixa toma o formato da própria foto (de 4:5 em pé até 1.91:1 deitada), então ela
// cabe inteira, sem cortar e sem passar do post. Mais comprida que isso: aparece inteira com fundo
// desfocado da própria foto nas sobras.
export function PostPhoto({ uri, style, fallback }) {
  const ratio = usePhotoRatio(uri);
  const box = ratio ? Math.min(1.91, Math.max(0.8, ratio)) : 4 / 3;
  const exact = ratio && Math.abs(box - ratio) < 0.01;
  return (
    <View style={[{ width: '100%', aspectRatio: box, overflow: 'hidden' }, style, { height: undefined }]}>
      {exact || !uri ? (
        <Photo uri={uri} style={{ width: '100%', height: '100%' }} fallback={fallback} />
      ) : (
        <>
          <Photo uri={uri} style={StyleSheet.absoluteFill} blur={18} fallback={fallback} />
          <Photo uri={uri} style={StyleSheet.absoluteFill} fit="contain" fallback={fallback} />
        </>
      )}
    </View>
  );
}

// Foto de story (tela em pé): a foto aparece inteira; as sobras ficam com ela mesma desfocada atrás.
export function StoryPhoto({ uri, style, fallback, extra }) {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#000' }]}>
      <Photo uri={uri} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} blur={24} fallback={fallback} />
      <Photo uri={uri} style={[StyleSheet.absoluteFill, extra, { backgroundColor: 'transparent' }]} fit="contain" fallback={fallback} />
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chipText, active && { color: colors.primaryDark, fontWeight: '800' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Empty({ text }) {
  return <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  screenScroll: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: 18, paddingBottom: 110, backgroundColor: colors.bg, flexGrow: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  painel: { backgroundColor: colors.navy, borderRadius: 16, padding: 14, marginBottom: 14 },
  painelTitle: { color: colors.onNavy, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  painelSub: { color: colors.onNavyMuted, fontSize: 12, marginTop: 2 },
  painelStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginHorizontal: -4 },
  painelStat: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.navySoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, margin: 4 },
  painelStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  painelStatLabel: { color: colors.onNavyMuted, fontSize: 11, marginTop: 1 },
  // Cartão clean: sem contorno, só uma sombra leve e quente.
  // Visual clean: borda fina no lugar da sombra, cantos e espaços menores.
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statLabel: { fontSize: 11, color: colors.muted },
  statValue: { fontSize: 15, fontWeight: '700', marginTop: 3 },
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
  chipActive: { backgroundColor: colors.card, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
