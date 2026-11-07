import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft, brl } from '../theme';
import { ProductThumb, Badge } from './ui';

// Peças do visual do Shop (aba Shop do rodapé), usadas também no Food, na Loja,
// em Eventos e nas páginas das empresas, para o app inteiro ter a mesma cara.

// Faixa clarinha de título (como o "Você no comando." do Shop).
export function ShopHero({ title, sub, icon }) {
  return (
    <View style={styles.hero}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: 8 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.heroTitle}>{title}</Text>
        {sub ? <Text style={styles.heroSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// Atalhos redondos: ícone pequeno dentro de um círculo, com o nome embaixo (4 por linha).
// items: [{ key, label, ion, color }]. Com `value`, o atalho escolhido fica preenchido.
export function CircleShortcuts({ items, value, onPress }) {
  return (
    <View style={styles.circleGrid}>
      {items.map((c) => {
        const tint = c.color || colors.primary;
        const on = value !== undefined && c.key === value;
        return (
          <TouchableOpacity key={c.key} style={styles.circleItem} onPress={() => onPress(c.key)} activeOpacity={0.8} accessibilityLabel={c.label}>
            <View style={[styles.circle, { borderColor: tint + '66', backgroundColor: on ? tint : tint + '12' }]}>
              <Ionicons name={on ? c.ion.replace('-outline', '') : c.ion} size={18} color={on ? colors.onPrimary : tint} />
            </View>
            <Text
              style={[styles.circleLabel, on && { color: tint }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}


// Vitrine do Shop: botão escuro e dourado ("Você no comando · Categorias"). Tocar abre uma tela por
// cima com todos os setores para escolher o tipo de produto (em vez da grade ocupando a página).
const NIGHT = '#0B1124';
const GOLD = '#E2B649';
export function CategoryPicker({ items, onPick, news }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <TouchableOpacity style={styles.catBar} onPress={() => setOpen(true)} activeOpacity={0.9} accessibilityLabel="Escolher o tipo de produto">
        <View style={styles.catGlow} />
        <View style={styles.catIcon}>
          <Ionicons name="grid" size={18} color={NIGHT} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.catTitle}>Você no comando.</Text>
          <Text style={styles.catSub}>Escolha o tipo de produto · {items.length} setores</Text>
        </View>
        {news ? (
          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
            <Text style={styles.catNum}>{news}</Text>
            <Text style={styles.catNumSub}>novidades</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-down" size={18} color={GOLD} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.pickBack}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.pickSheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.pickGrip} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.pickTitle}>O que você procura?</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.pickX} accessibilityLabel="Fechar">
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.circleGrid}>
                {items.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={styles.circleItem}
                    onPress={() => {
                      setOpen(false);
                      onPick(c.key);
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel={c.label}
                  >
                    <View style={styles.pickCircle}>
                      <Ionicons name={c.ion} size={20} color={GOLD} />
                    </View>
                    <Text style={styles.pickLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Título de seção com ação à direita ("Ver loja", "Ver todas"...).
export function ShopHead({ title, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Cartão de produto do Shop: foto, nome, loja, preço e botão "+ Carrinho".
export function ShopProductCard({ p, storeName, onAdd, style, sponsored, onPress, dark }) {
  // dark: visual da Vitrine (botão azul-noite com letra dourada, patrocinado com borda dourada).
  return (
    <View style={[styles.prod, sponsored && (dark ? styles.prodSpGold : styles.prodSp), style]}>
      <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress}>
        <ProductThumb product={p} size={86} />
      </TouchableOpacity>
      {sponsored ? (
        <View style={[styles.spTag, dark && { backgroundColor: NIGHT }]}>
          <Text style={[styles.spTagText, dark && { color: GOLD }]}>Patrocinado</Text>
        </View>
      ) : null}
      {p.launch ? <Text style={styles.launch}>LANÇAMENTO</Text> : null}
      <Text numberOfLines={2} style={styles.prodName}>
        {p.name}
      </Text>
      {storeName ? <Text style={styles.prodStore}>{storeName}</Text> : null}
      <Text style={styles.prodPrice}>{brl(p.price)}</Text>
      {p.stock === undefined || p.stock > 0 ? (
        <TouchableOpacity style={[styles.addBtn, dark && { backgroundColor: NIGHT }]} onPress={onAdd} accessibilityLabel={`Adicionar ${p.name} ao carrinho`}>
          <Ionicons name="add" size={16} color={dark ? GOLD : colors.onPrimary} />
          <Text style={[styles.addText, dark && { color: GOLD }]}>Carrinho</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.addBtn, { backgroundColor: colors.cardAlt }]}>
          <Text style={[styles.addText, { color: colors.danger }]}>Esgotado</Text>
        </View>
      )}
    </View>
  );
}

// Grade de 2 colunas para os cartões de produto.
export function ShopGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

// Linha de loja: logo num quadradinho, nome, categoria, nota e selo de patrocinado.
export function StoreRow({ s, onPress, extra }) {
  return (
    <TouchableOpacity style={styles.storeRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.storeLogo}>
        <Text style={{ color: colors.text, fontSize: 22 }}>{s.logo}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.storeName}>{s.name}</Text>
        <Text style={styles.storeMeta}>
          {s.category}
          {s.city ? ` · ${s.city}` : ''} · <Text style={{ color: colors.accent, fontWeight: '700' }}>★ {s.rating}</Text>
          {s.shipsBrazil ? ' · envia p/ todo o Brasil' : ''}
        </Text>
        {extra}
      </View>
      {s.sponsored ? <Badge label="Patrocinado" color={colors.sponsored} /> : s.recommended ? <Badge label="Recomendado" /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  heroTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  circleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, marginHorizontal: -4 },
  circleItem: { width: '25%', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  circle: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  circleLabel: { color: colors.text, fontWeight: '700', fontSize: 11, marginTop: 5, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  prod: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 10,
    ...soft,
    marginBottom: 10,
  },
  prodSp: { borderWidth: 1, borderColor: 'rgba(108,92,231,0.35)' },
  prodSpGold: { borderWidth: 1.5, borderColor: 'rgba(226,182,73,0.85)' },
  catBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: NIGHT, borderRadius: 20, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)', overflow: 'hidden' },
  catGlow: { position: 'absolute', right: -40, top: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(226,182,73,0.18)' },
  catIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  catTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  catSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 1 },
  catNum: { color: GOLD, fontWeight: '900', fontSize: 17 },
  catNumSub: { color: 'rgba(255,255,255,0.6)', fontSize: 9 },
  pickBack: { flex: 1, backgroundColor: 'rgba(6,10,24,0.5)' },
  pickSheet: { backgroundColor: NIGHT, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
  pickGrip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  pickTitle: { flex: 1, color: '#fff', fontWeight: '900', fontSize: 17 },
  pickX: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  pickCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: 'rgba(226,182,73,0.75)', backgroundColor: 'rgba(226,182,73,0.12)', alignItems: 'center', justifyContent: 'center' },
  pickLabel: { color: '#fff', fontWeight: '700', fontSize: 11, marginTop: 6, textAlign: 'center' },
  spTag: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.sponsored, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  spTagText: { color: colors.onPrimary, fontSize: 9, fontWeight: '800' },
  launch: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginTop: 6 },
  prodName: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 8, minHeight: 34 },
  prodStore: { color: colors.muted, fontSize: 11, marginTop: 2 },
  prodPrice: { color: colors.primary, fontWeight: '700', fontSize: 15, marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  addText: { color: colors.onPrimary, fontWeight: '700', fontSize: 12, marginLeft: 2 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    ...soft,
  },
  storeLogo: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  storeName: { color: colors.text, fontWeight: '700' },
  storeMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
