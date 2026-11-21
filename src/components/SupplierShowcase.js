// Vitrine do fornecedor: a página que as empresas visitam para conhecer o fornecedor e os produtos dele.
// Capa, logo, frase, vantagens, PROMOÇÕES em destaque, produtos em DESTAQUE (cartões grandes com foto),
// todos os produtos em grade e o "sobre". Tocar num produto abre a ficha com fotos e vídeo.
// owner = o próprio fornecedor vendo a vitrine (edita em vez de fazer proposta).
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { brl } from '../theme';
import { Photo } from './ui';
import { hasPromo, unitPriceOf, coverOf } from '../supplierShop';
import { autoDiscount } from '../screens/empresa/B2BScreen';

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

const C = { text: '#14120E', muted: '#5B564B', gold: '#B8860B', bright: '#F5C331', line: '#F0E9DA', soft: '#FBF8F1', red: '#D9363E', green: '#1E9E63', white: '#FFFFFF' };

function LoopVideo({ uri }) {
  const player = EV.useVideoPlayer({ uri }, (pl) => {
    pl.loop = true;
    pl.muted = true;
    pl.play();
  });
  return <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

// Imagem do produto (foto ou emoji grande quando ainda não tem foto).
function ItemImage({ item, style, big }) {
  const uri = coverOf(item);
  if (uri) return <Photo uri={uri} style={style} fallback={item.emoji || '📦'} />;
  return (
    <View style={[style, { backgroundColor: '#F5EFE2', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: big ? 64 : 38 }}>{item.emoji || '📦'}</Text>
    </View>
  );
}

function PriceLine({ item, size = 15 }) {
  if (!hasPromo(item)) return <Text style={[st.price, { fontSize: size }]} numberOfLines={1}>{brl(item.unitPrice)}<Text style={st.unit}> /un.</Text></Text>;
  return (
    <View>
      <Text style={st.old} numberOfLines={1}>{brl(item.unitPrice)}</Text>
      <Text style={[st.price, { fontSize: size, color: C.red }]} numberOfLines={1}>{brl(unitPriceOf(item))}<Text style={st.unit}> /un.</Text></Text>
    </View>
  );
}

const PromoTag = ({ item, style }) =>
  hasPromo(item) ? (
    <View style={[st.promoTag, style]}>
      <Text style={st.promoTagText}>-{item.promo.off}%</Text>
    </View>
  ) : null;

const VideoTag = ({ item }) =>
  item.video ? (
    <View style={st.vTag}>
      <Ionicons name="play" size={10} color="#fff" />
    </View>
  ) : null;

// Conteúdo da vitrine (sem rolagem própria: quem usa decide).
export function SupplierStorefront({ supplierId, owner = false, onEditPage, onEditItem, onAddItem }) {
  const { state } = useStore();
  const win = useWindowDimensions();
  const [item, setItem] = useState(null);
  const sup = state.suppliers.find((s) => s.id === supplierId);
  if (!sup) return null;
  const items = state.supplierItems.filter((i) => i.supplierId === supplierId);
  const promos = items.filter(hasPromo);
  const featured = items.filter((i) => i.featured);
  const all = [...items].sort((a, b) => !!b.featured - !!a.featured || hasPromo(b) - hasPromo(a));
  const cardW = Math.min(300, win.width * 0.72);
  const gridW = (Math.min(win.width, 600) - 32 - 10) / 2;

  return (
    <View>
      {/* Capa com o logo por cima */}
      <View style={st.coverWrap}>
        {sup.cover ? <Photo uri={sup.cover} style={st.cover} fallback={sup.logo} /> : <View style={[st.cover, { backgroundColor: '#F5EFE2' }]} />}
        <View style={st.coverShade} />
        {owner ? (
          <TouchableOpacity style={st.editPage} onPress={onEditPage} accessibilityLabel="Editar vitrine">
            <Ionicons name="color-wand-outline" size={14} color={C.text} />
            <Text style={st.editPageText} numberOfLines={1}>Editar vitrine</Text>
          </TouchableOpacity>
        ) : null}
        <View style={st.logo}>
          <Text style={{ fontSize: 34 }}>{sup.logo}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 44 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={st.name} numberOfLines={2}>{sup.name}</Text>
          <Ionicons name="shield-checkmark" size={18} color={C.gold} style={{ marginLeft: 6 }} />
        </View>
        <Text style={st.city} numberOfLines={1}>Fornecedor verificado · {sup.city}</Text>
        {sup.tagline ? <Text style={st.tagline}>{sup.tagline}</Text> : null}

        <View style={st.stats}>
          <View style={st.stat}><Text style={st.statV}>★ {sup.rating}</Text><Text style={st.statL} numberOfLines={1}>avaliação</Text></View>
          <View style={st.statSep} />
          <View style={st.stat}><Text style={st.statV}>{items.length}</Text><Text style={st.statL} numberOfLines={1}>produtos</Text></View>
          <View style={st.statSep} />
          <View style={st.stat}><Text style={st.statV}>{sup.deals || 0}</Text><Text style={st.statL} numberOfLines={1}>negócios</Text></View>
          {sup.since ? (<><View style={st.statSep} /><View style={st.stat}><Text style={st.statV}>{sup.since}</Text><Text style={st.statL} numberOfLines={1}>desde</Text></View></>) : null}
        </View>

        {sup.perks && sup.perks.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {sup.perks.map((p) => (
              <View key={p} style={st.perk}>
                <Ionicons name="checkmark-circle" size={14} color={C.gold} />
                <Text style={st.perkText} numberOfLines={1}>{p}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* PROMOÇÕES em destaque */}
      {promos.length ? (
        <View style={{ marginTop: 22 }}>
          <View style={st.head}>
            <Ionicons name="flame" size={18} color={C.red} />
            <Text style={st.headText}>Promoções</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {promos.map((i) => (
              <TouchableOpacity key={i.id} style={[st.promoCard, { width: cardW }]} onPress={() => setItem(i)} activeOpacity={0.9}>
                <ItemImage item={i} style={{ width: 110, height: 110, borderRadius: 14 }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={st.promoPill}><Text style={st.promoPillText} numberOfLines={1}>-{i.promo.off}% · até {i.promo.until}</Text></View>
                  <Text style={st.itemName} numberOfLines={2}>{i.name}</Text>
                  <PriceLine item={i} size={17} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* DESTAQUES: cartões grandes com foto */}
      {featured.length ? (
        <View style={{ marginTop: 22 }}>
          <View style={st.head}>
            <Ionicons name="star" size={17} color={C.bright} />
            <Text style={st.headText}>Destaques</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {featured.map((i) => (
              <TouchableOpacity key={i.id} style={[st.featCard, { width: cardW }]} onPress={() => setItem(i)} activeOpacity={0.9}>
                <View>
                  <ItemImage item={i} style={{ width: cardW, height: cardW * 0.7 }} big />
                  <PromoTag item={i} style={{ top: 10, left: 10 }} />
                  <VideoTag item={i} />
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={st.itemName} numberOfLines={1}>{i.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <PriceLine item={i} size={17} />
                    <Text style={st.min} numberOfLines={1}>mín. {i.minQty}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Todos os produtos */}
      <View style={{ marginTop: 22, paddingHorizontal: 16 }}>
        <View style={[st.head, { paddingHorizontal: 0 }]}>
          <Ionicons name="grid-outline" size={16} color={C.gold} />
          <Text style={st.headText}>Todos os produtos</Text>
        </View>
        {owner && onAddItem ? (
          <TouchableOpacity style={st.addInline} onPress={onAddItem}>
            <Ionicons name="add-circle" size={18} color={C.gold} />
            <Text style={st.addInlineText} numberOfLines={1}>Adicionar produto</Text>
          </TouchableOpacity>
        ) : null}
        {!all.length ? <Text style={{ color: C.muted }}>Nenhum produto ainda.</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {all.map((i) => (
            <TouchableOpacity key={i.id} style={[st.gridCard, { width: gridW }]} onPress={() => setItem(i)} activeOpacity={0.9}>
              <View>
                <ItemImage item={i} style={{ width: gridW, height: gridW }} />
                <PromoTag item={i} style={{ top: 8, left: 8 }} />
                {i.featured ? <View style={st.starTag}><Ionicons name="star" size={11} color={C.bright} /></View> : null}
                <VideoTag item={i} />
              </View>
              <View style={{ padding: 10 }}>
                <Text style={st.gridName} numberOfLines={2}>{i.name}</Text>
                <PriceLine item={i} size={14} />
                <Text style={st.min} numberOfLines={1}>mín. {i.minQty} un.</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sobre */}
      {sup.about || (sup.segments && sup.segments.length) ? (
        <View style={st.about}>
          <Text style={st.aboutTitle}>Sobre o fornecedor</Text>
          {sup.about ? <Text style={st.aboutText}>{sup.about}</Text> : null}
          {sup.segments && sup.segments.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              {sup.segments.map((g) => <Text key={g} style={st.seg} numberOfLines={1}>{g}</Text>)}
            </View>
          ) : null}
        </View>
      ) : null}

      {item ? <SupplierItemSheet item={state.supplierItems.find((x) => x.id === item.id) || item} owner={owner} onClose={() => setItem(null)} onEdit={onEditItem} /> : null}
    </View>
  );
}

// Ficha do produto: fotos e vídeo (arrasta para o lado), preço, promoção, descontos por volume,
// descrição e a proposta (empresa) ou o botão de editar (o próprio fornecedor).
export function SupplierItemSheet({ item, owner, onClose, onEdit }) {
  const { state, dispatch } = useStore();
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [qty, setQty] = useState('');
  const [disc, setDisc] = useState('');
  const sup = state.suppliers.find((s) => s.id === item.supplierId) || {};
  const w = Math.min(win.width, 600);
  const slides = [...(item.video && EV ? [{ video: item.video.uri || item.video }] : []), ...(item.photos || []).map((p) => ({ photo: p }))];
  const q = parseInt(qty, 10);
  const auto = !isNaN(q) ? autoDiscount(item, q) : 0;

  const send = () => {
    const d = parseFloat((disc || '0').replace(',', '.'));
    if (isNaN(q) || q < item.minQty) return Alert.alert('Quantidade', `Pedido mínimo: ${item.minQty} unidades.`);
    dispatch({ type: 'SEND_PROPOSAL', itemId: item.id, qty: q, discount: isNaN(d) ? 0 : d });
    onClose();
    Alert.alert('Proposta enviada', `${sup.name} vai responder em Negócios. O pagamento fica retido pelo Realyz até a entrega.`);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={{ width: w, height: w * 0.85, backgroundColor: C.soft, alignSelf: 'center' }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}>
              {slides.length ? (
                slides.map((sl, i) => (
                  <View key={i} style={{ width: w, height: w * 0.85 }}>
                    {sl.video ? <LoopVideo uri={sl.video} /> : <Photo uri={sl.photo} style={{ width: w, height: w * 0.85 }} fallback={item.emoji || '📦'} />}
                    {sl.video ? <View style={st.vBig}><Ionicons name="videocam" size={12} color="#fff" /><Text style={st.vBigText}>VÍDEO</Text></View> : null}
                  </View>
                ))
              ) : (
                <ItemImage item={item} style={{ width: w, height: w * 0.85 }} big />
              )}
            </ScrollView>
            <TouchableOpacity onPress={onClose} style={[st.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <PromoTag item={item} style={{ top: insets.top + 12, right: 14, left: undefined }} />
            {slides.length > 1 ? <View style={st.dots}>{slides.map((_, i) => <View key={i} style={[st.dot, i === page && st.dotOn]} />)}</View> : null}
          </View>

          <View style={{ padding: 16 }}>
            {item.featured ? <Text style={st.featLabel}>★ DESTAQUE DO FORNECEDOR</Text> : null}
            <Text style={st.sheetName}>{item.name}</Text>
            <Text style={st.city} numberOfLines={1}>{sup.logo} {sup.name} · ★ {sup.rating}</Text>
            <View style={{ marginTop: 10 }}>
              <PriceLine item={item} size={24} />
            </View>
            {hasPromo(item) ? <Text style={st.promoNote}>Promoção de {item.promo.off}% válida até {item.promo.until}</Text> : null}
            <Text style={st.minBig}>Pedido mínimo: {item.minQty} unidades</Text>
            {item.tiers && item.tiers.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                {item.tiers.map((t) => <Text key={t.qty} style={st.tier} numberOfLines={1}>{t.off}% acima de {t.qty} un.</Text>)}
              </View>
            ) : null}
            {item.desc ? <Text style={st.desc}>{item.desc}</Text> : null}

            {owner ? (
              onEdit ? (
                <TouchableOpacity style={st.cta} onPress={() => (onClose(), onEdit(item))}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={st.ctaText} numberOfLines={1}>Editar produto</Text>
                </TouchableOpacity>
              ) : null
            ) : (
              <View style={{ marginTop: 18 }}>
                <Text style={st.aboutTitle}>Fazer proposta</Text>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <TextInput placeholder={`Quantidade (mín. ${item.minQty})`} placeholderTextColor={C.muted} keyboardType="number-pad" value={qty} onChangeText={setQty} style={[st.input, { marginRight: 6 }]} />
                  <TextInput placeholder="Desconto %" placeholderTextColor={C.muted} keyboardType="decimal-pad" value={disc} onChangeText={setDisc} style={[st.input, { marginLeft: 6 }]} />
                </View>
                {auto ? <Text style={{ color: C.green, fontWeight: '700', marginTop: 6 }}>Desconto automático por volume: {auto}%</Text> : null}
                {!isNaN(q) && q > 0 ? <Text style={{ color: C.text, marginTop: 6 }}>Total estimado: {brl(q * unitPriceOf(item) * (1 - (parseFloat((disc || '0').replace(',', '.')) || auto) / 100))}</Text> : null}
                <TouchableOpacity style={st.cta} onPress={send}>
                  <Ionicons name="paper-plane" size={17} color="#fff" />
                  <Text style={st.ctaText} numberOfLines={1}>Enviar proposta</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Vitrine aberta de qualquer tela (empresa tocou no fornecedor): dispatch({ type: 'OPEN_SUPPLIER', id }).
export function SupplierShowcaseHost() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const id = state.openSupplierId;
  if (!id) return null;
  const close = () => dispatch({ type: 'OPEN_SUPPLIER', id: null });
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: C.soft }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
          <SupplierStorefront supplierId={id} />
        </ScrollView>
        <TouchableOpacity onPress={close} style={[st.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  coverWrap: { height: 190 },
  cover: { width: '100%', height: 190 },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,18,14,0.18)' },
  logo: { position: 'absolute', left: 16, bottom: -36, width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bright, elevation: 4, shadowColor: '#7A5806', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  editPage: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, height: 30, borderRadius: 15 },
  editPageText: { color: C.text, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  name: { color: C.text, fontSize: 21, fontWeight: '800', flexShrink: 1 },
  city: { color: C.muted, fontSize: 13, marginTop: 2 },
  tagline: { color: C.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, marginTop: 14, elevation: 2, shadowColor: '#7A5806', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  stat: { flex: 1, alignItems: 'center' },
  statV: { color: C.text, fontWeight: '800', fontSize: 15 },
  statL: { color: C.muted, fontSize: 11, marginTop: 1 },
  statSep: { width: 1, height: 26, backgroundColor: C.line },
  perk: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEF', borderColor: '#F0E2B6', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, height: 28, marginRight: 8 },
  perkText: { color: C.text, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  headText: { color: C.text, fontSize: 17, fontWeight: '800', marginLeft: 6 },
  promoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F3', borderRadius: 18, padding: 10, marginRight: 10, borderWidth: 1, borderColor: '#F7D4CF' },
  promoPill: { alignSelf: 'flex-start', backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  promoPillText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  featCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginRight: 12, borderWidth: 1.5, borderColor: 'rgba(245,195,49,0.7)', elevation: 3, shadowColor: '#7A5806', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  gridCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 10, elevation: 2, shadowColor: '#7A5806', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  itemName: { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  gridName: { color: C.text, fontWeight: '700', fontSize: 13, minHeight: 34 },
  price: { color: C.gold, fontWeight: '800' },
  unit: { color: C.muted, fontWeight: '600', fontSize: 11 },
  old: { color: C.muted, fontSize: 11, textDecorationLine: 'line-through' },
  min: { color: C.muted, fontSize: 11, marginTop: 2 },
  promoTag: { position: 'absolute', top: 8, left: 8, backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  promoTagText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  starTag: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(20,18,14,0.7)', alignItems: 'center', justifyContent: 'center' },
  vTag: { position: 'absolute', bottom: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(20,18,14,0.7)', alignItems: 'center', justifyContent: 'center' },
  addInline: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 10 },
  addInlineText: { color: C.gold, fontWeight: '700', marginLeft: 4 },
  about: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginHorizontal: 16, marginTop: 12 },
  aboutTitle: { color: C.text, fontWeight: '800', fontSize: 15 },
  aboutText: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  seg: { color: C.gold, fontWeight: '700', fontSize: 12, borderWidth: 1, borderColor: '#F0E2B6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  back: { position: 'absolute', left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(20,18,14,0.55)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotOn: { backgroundColor: '#fff', width: 16 },
  vBig: { position: 'absolute', top: 60, left: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.6)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  vBigText: { color: '#fff', fontWeight: '800', fontSize: 11, marginLeft: 4 },
  featLabel: { color: C.gold, fontWeight: '800', fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  sheetName: { color: C.text, fontSize: 22, fontWeight: '800' },
  promoNote: { color: C.red, fontWeight: '700', fontSize: 13, marginTop: 4 },
  minBig: { color: C.text, fontSize: 13, marginTop: 6 },
  tier: { color: C.green, fontWeight: '700', fontSize: 12, backgroundColor: '#EAF7F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  desc: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 12 },
  input: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, color: C.text, backgroundColor: C.soft },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 25, backgroundColor: C.gold, marginTop: 16 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 },
});
