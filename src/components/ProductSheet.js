// Tela do produto para o cliente (abre ao tocar na foto ou no nome do produto, em qualquer vitrine).
// Fotos (até 5, arrasta para o lado), vídeo curto de 5 s, quantidade disponível, as opções que a loja
// cadastrou (cor com a bolinha da cor, metragem, tamanho, voltagem…) e a ficha do produto.
// Com opções, o cliente escolhe antes de pôr no carrinho; a escolha vai junto no pedido.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../store';
import { brl } from '../theme';
import { Photo } from './ui';
import { stockOf } from '../productOptions';

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

const C = { text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', line: '#EFE6CC', soft: '#FAF7EF', red: '#E5484D', green: '#2FB463' };

// Abrir de qualquer lugar: openProduct(produto) / closeProduct().
let current = null;
const subs = new Set();
export const openProduct = (p) => {
  current = p ? p.id : null;
  subs.forEach((fn) => fn(current));
};
export const closeProduct = () => openProduct(null);
// O produto precisa da tela antes do carrinho (tem opções para escolher)?
export const needsChoice = (p) => !!(p && p.options && p.options.length);

function ProductVideo({ uri }) {
  const player = EV.useVideoPlayer({ uri }, (pl) => {
    pl.loop = true;
    pl.muted = true;
    pl.play();
  });
  return <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

export function ProductSheetHost() {
  const [id, setId] = useState(current);
  useEffect(() => {
    subs.add(setId);
    return () => subs.delete(setId);
  }, []);
  const { state } = useStore();
  const p = id ? (state.products || []).find((x) => x.id === id) : null;
  if (!p) return null;
  return <Sheet key={p.id} p={p} />;
}

function Sheet({ p }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [picked, setPicked] = useState({});
  const [qty, setQty] = useState(1);
  const [page, setPage] = useState(0);
  const store = storeOf(state, p.storeId) || {};
  const photos = (p.photos && p.photos.length ? p.photos : p.photo ? [p.photo] : []).slice(0, 5);
  const slides = [...(p.video && p.video.uri ? [{ video: p.video.uri }] : []), ...photos.map((u) => ({ photo: u }))];
  const left = stockOf(p, picked);
  const missing = (p.options || []).filter((g) => !picked[g.name]);
  const add = () => {
    if (left <= 0) return;
    if (missing.length) return Alert.alert('Falta escolher', `Escolha ${missing.map((g) => g.name.toLowerCase()).join(' e ')} antes de pôr no carrinho.`);
    dispatch({ type: 'ADD_TO_CART', productId: p.id, qty, options: p.options && p.options.length ? picked : undefined });
    closeProduct();
    Alert.alert('No carrinho 🛒', `${qty} × ${p.name}${Object.keys(picked).length ? `\n${Object.entries(picked).map(([k, v]) => `${k}: ${v}`).join(' · ')}` : ''}`);
  };
  const w = win.width;
  return (
    <Modal visible animationType="slide" onRequestClose={closeProduct}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
          {/* Vídeo e fotos: arrasta para o lado */}
          <View style={{ width: w, height: w, backgroundColor: C.soft }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}>
              {slides.length ? slides.map((sl, i) => (
                <View key={i} style={{ width: w, height: w }}>
                  {sl.video && EV ? <ProductVideo uri={sl.video} /> : sl.photo ? <Photo uri={sl.photo} style={{ width: w, height: w }} fallback={p.emoji || '📦'} /> : <View style={st.center}><Text style={{ fontSize: 80 }}>{p.emoji || '📦'}</Text></View>}
                  {sl.video ? <View style={st.vTag}><Ionicons name="videocam" size={12} color="#fff" /><Text style={st.vTagText}>VÍDEO</Text></View> : null}
                </View>
              )) : <View style={[st.center, { width: w, height: w }]}><Text style={{ fontSize: 80 }}>{p.emoji || '📦'}</Text></View>}
            </ScrollView>
            <TouchableOpacity onPress={closeProduct} style={[st.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            {slides.length > 1 ? (
              <View style={st.dots}>{slides.map((_, i) => <View key={i} style={[st.dot, i === page && st.dotOn]} />)}</View>
            ) : null}
          </View>

          <View style={{ padding: 16 }}>
            {p.launch || p.isNew ? <Text style={st.newTag}>LANÇAMENTO</Text> : null}
            <Text style={st.name}>{p.name}</Text>
            <TouchableOpacity onPress={() => (closeProduct(), dispatch({ type: 'OPEN_COMPANY', id: p.storeId }))}>
              <Text style={st.store}>{store.name || 'Loja'} <Ionicons name="shield-checkmark" size={12} color={C.gold} /> · ver loja</Text>
            </TouchableOpacity>
            <Text style={st.price}>{brl(p.price)}</Text>
            {/* Quantidade disponível */}
            <View style={[st.stock, left <= 0 ? { backgroundColor: '#FDECEC' } : left <= 10 ? { backgroundColor: '#FFF4DC' } : null]}>
              <Ionicons name={left <= 0 ? 'close-circle' : 'cube-outline'} size={16} color={left <= 0 ? C.red : left <= 10 ? '#C77D12' : C.green} />
              <Text style={[st.stockText, { color: left <= 0 ? C.red : left <= 10 ? '#8A5A0B' : C.text }]}>
                {left <= 0 ? 'Esgotado' + (missing.length ? '' : ' nesta opção') : left <= 10 ? `Últimas ${left} unidades` : `${left} disponíveis`}
              </Text>
            </View>

            {(p.options || []).map((g) => (
              <View key={g.name} style={{ marginTop: 16 }}>
                <Text style={st.optTitle}>{g.name}{picked[g.name] ? <Text style={{ color: C.muted, fontWeight: '600' }}>: {picked[g.name]}</Text> : null}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  {g.values.map((v) => {
                    const on = picked[g.name] === v.label;
                    const out = v.stock === 0;
                    return v.hex ? (
                      <TouchableOpacity key={v.label} disabled={out} onPress={() => setPicked({ ...picked, [g.name]: v.label })} style={[st.swWrap, on && { borderColor: C.gold }, out && { opacity: 0.3 }]} accessibilityLabel={`${g.name} ${v.label}${out ? ', esgotado' : ''}`}>
                        <View style={[st.sw, { backgroundColor: v.hex }]} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity key={v.label} disabled={out} onPress={() => setPicked({ ...picked, [g.name]: v.label })} style={[st.opt, on && st.optOn, out && { opacity: 0.35 }]}>
                        <Text numberOfLines={1} style={[st.optText, on && { color: '#fff' }]}>{v.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {p.desc || p.description ? (
              <>
                <Text style={[st.optTitle, { marginTop: 18 }]}>Descrição</Text>
                <Text style={{ color: C.text, marginTop: 6, lineHeight: 20 }}>{p.desc || p.description}</Text>
              </>
            ) : null}
            {p.specs && p.specs.length ? (
              <>
                <Text style={[st.optTitle, { marginTop: 18 }]}>Ficha do produto</Text>
                <View style={st.specs}>
                  {p.specs.map((x, i) => (
                    <View key={i} style={[st.specRow, i % 2 === 1 && { backgroundColor: C.soft }]}>
                      <Text style={st.specK} numberOfLines={2}>{x.k}</Text>
                      <Text style={st.specV} numberOfLines={3}>{x.v}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <View style={st.guar}>
              <Ionicons name="shield-checkmark-outline" size={16} color={C.gold} />
              <Text style={{ flex: 1, marginLeft: 8, color: C.muted, fontSize: 12 }}>Produto novo, de loja verificada. Pagando pelo Re@lys, vale a Garantia: se der problema, o dinheiro volta.</Text>
            </View>
          </View>
        </ScrollView>

        {/* Rodapé: quantidade + carrinho */}
        <View style={[st.foot, { paddingBottom: 12 + insets.bottom }]}>
          <View style={st.qty}>
            <TouchableOpacity onPress={() => setQty(Math.max(1, qty - 1))} style={st.qBtn} accessibilityLabel="Menos um"><Ionicons name="remove" size={18} color={C.text} /></TouchableOpacity>
            <Text style={{ fontWeight: '800', color: C.text, minWidth: 22, textAlign: 'center' }}>{qty}</Text>
            <TouchableOpacity onPress={() => setQty(Math.min(Math.max(1, left), qty + 1))} style={st.qBtn} accessibilityLabel="Mais um"><Ionicons name="add" size={18} color={C.text} /></TouchableOpacity>
          </View>
          <TouchableOpacity disabled={left <= 0} onPress={add} style={[st.addBtn, left <= 0 && { backgroundColor: '#CFC8B8' }]} accessibilityLabel="Pôr no carrinho">
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text numberOfLines={1} style={st.addText}>{left <= 0 ? 'Esgotado' : `Carrinho · ${brl(p.price * qty)}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotOn: { backgroundColor: C.gold, width: 18 },
  vTag: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  vTagText: { color: '#fff', fontSize: 10, fontWeight: '800', marginLeft: 4 },
  newTag: { color: C.gold, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  name: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 2 },
  store: { color: C.muted, marginTop: 4 },
  price: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 10 },
  stock: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EEF6EF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  stockText: { fontWeight: '800', fontSize: 13, marginLeft: 6 },
  optTitle: { color: C.text, fontWeight: '800', fontSize: 15 },
  opt: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  optOn: { backgroundColor: C.text, borderColor: C.text },
  optText: { color: C.text, fontWeight: '700' },
  swWrap: { padding: 3, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', marginRight: 6, marginBottom: 6 },
  sw: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  specs: { borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  specRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9 },
  specK: { flex: 1, color: C.muted, fontWeight: '700', fontSize: 13 },
  specV: { flex: 1.4, color: C.text, fontSize: 13 },
  guar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 12, padding: 10, marginTop: 18 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 14, paddingTop: 12 },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 14, marginRight: 10 },
  qBtn: { padding: 10 },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14 },
  addText: { color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 },
});

// Botão "Carrinho" das vitrines: produto com opções (cor, metragem…) abre a tela para escolher;
// sem opções, vai direto. Devolve true quando foi direto para o carrinho.
export function addOrChoose(dispatch, p) {
  if (!p) return false;
  if (needsChoice(p)) {
    openProduct(p);
    return false;
  }
  dispatch({ type: 'ADD_TO_CART', productId: p.id });
  return true;
}
