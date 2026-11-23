// Janela "Editar foto": abre depois de escolher (ou tirar) uma foto e ANTES de publicar
// (mural, galeria do perfil, posts da Community, páginas). Nada é publicado direto da galeria.
// - Cortar: Original, 1:1, 4:5, 3:4, 9:16 e 16:9; arrasta o quadro para escolher a parte da foto;
//   botões − e + para fechar ou abrir o corte; Girar 90°.
// - Efeitos: os mesmos dos stories (Pele suave, Glow, Estúdio, Cyber…), com prévia da pele lisa.
// - Usar foto: corta, gira e grava o efeito na própria foto (src/photoFx.js).
// Uso: const uri = await editPhoto(uriEscolhida, { title, confirm }); null = cancelou.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, PanResponder, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { colors } from '../theme';
import { STORY_EFFECTS, effectStyle, smoothOf } from '../storyEffects';
import { processPhoto, transformPhoto, sizeOf, canSmooth } from '../photoFx';

const RATIOS = [
  { key: 'orig', label: 'Original', r: null },
  { key: '1:1', label: '1:1', r: 1 },
  { key: '4:5', label: '4:5', r: 4 / 5 },
  { key: '3:4', label: '3:4', r: 3 / 4 },
  { key: '9:16', label: '9:16', r: 9 / 16 },
  { key: '16:9', label: '16:9', r: 16 / 9 },
];
const ZOOMS = [1, 0.85, 0.7, 0.55];
const GOLD = colors.primary || '#D4A830';

// ───────── chamada de qualquer tela ─────────
let openListener = null;
export function editPhoto(uri, opts = {}) {
  if (!uri) return Promise.resolve(null);
  if (!openListener) return Promise.resolve(uri); // sem a janela montada, segue a foto como está
  return new Promise((resolve) => openListener({ uri, opts, resolve }));
}

// Escolhe (galeria ou câmera) e já abre o editor. Devolve a foto editada ou null.
export async function pickAndEditPhoto({ camera = false, title, confirm } = {}) {
  try {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', camera ? 'Permita a câmera para tirar a foto.' : 'Permita o acesso às fotos do celular.');
      return null;
    }
    const opts = { mediaTypes: ['images'], quality: 0.95 };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets || !r.assets[0]) return null;
    return await editPhoto(r.assets[0].uri, { title, confirm });
  } catch (e) {
    Alert.alert('Foto', 'Não deu para abrir a câmera ou a galeria.');
    return null;
  }
}

export function PhotoEditorHost() {
  const [req, setReq] = useState(null);
  useEffect(() => {
    openListener = setReq;
    return () => (openListener = null);
  }, []);
  if (!req) return null;
  const finish = (v) => {
    const r = req;
    setReq(null);
    r.resolve(v);
  };
  return <PhotoEditor key={req.uri} uri={req.uri} opts={req.opts} onDone={finish} />;
}

// ───────── a janela ─────────
function PhotoEditor({ uri: startUri, opts, onDone }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [uri, setUri] = useState(startUri);
  const [size, setSize] = useState(null);
  const [tab, setTab] = useState('efeitos');
  const [ratio, setRatio] = useState(opts.ratio || 'orig');
  const [zoom, setZoom] = useState(0);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [effect, setEffect] = useState('original');
  const [preview, setPreview] = useState(null); // prévia com a pele lisa
  const [busy, setBusy] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    let vivo = true;
    sizeOf(uri).then((s) => vivo && setSize(s));
    return () => (vivo = false);
  }, [uri]);

  // Prévia da pele suave (foto menor, para ser rápida).
  useEffect(() => {
    setPreview(null);
    if (!smoothOf(effect) || !canSmooth()) return;
    const id = ++reqId.current;
    processPhoto(uri, { effect, colors: false, maxSide: 900 }).then((p) => id === reqId.current && p !== uri && setPreview(p));
  }, [effect, uri]);

  // Área da prévia e da foto dentro dela ("contain").
  const boxW = Math.min(width, 720) - 24;
  const boxH = Math.max(260, Math.min(height * 0.56, height - insets.top - insets.bottom - 330));
  const disp = useMemo(() => {
    if (!size) return null;
    const s = Math.min(boxW / size.w, boxH / size.h);
    const w = size.w * s;
    const h = size.h * s;
    return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2, s };
  }, [size, boxW, boxH]);

  // Quadro do corte (em pontos da tela, relativo à foto).
  const crop = useMemo(() => {
    if (!disp) return null;
    const r = (RATIOS.find((x) => x.key === ratio) || RATIOS[0]).r || disp.w / disp.h;
    let cw = disp.w;
    let ch = cw / r;
    if (ch > disp.h) {
      ch = disp.h;
      cw = ch * r;
    }
    const z = ZOOMS[zoom];
    cw *= z;
    ch *= z;
    const cx = Math.min(Math.max(center.x * disp.w, cw / 2), disp.w - cw / 2);
    const cy = Math.min(Math.max(center.y * disp.h, ch / 2), disp.h - ch / 2);
    return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch };
  }, [disp, ratio, zoom, center]);
  const cropOn = !!crop && (ratio !== 'orig' || zoom > 0);

  // Arrastar o quadro.
  const live = useRef({});
  live.current = { disp, crop, center };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => (live.current.start = { ...live.current.center }),
        onPanResponderMove: (_, g) => {
          const { disp: d, start } = live.current;
          if (!d || !start) return;
          setCenter({ x: Math.min(1, Math.max(0, start.x + g.dx / d.w)), y: Math.min(1, Math.max(0, start.y + g.dy / d.h)) });
        },
      }),
    []
  );

  const rotate = async () => {
    if (busy) return;
    setBusy(true);
    const r = await transformPhoto(uri, { rotate: 90 });
    setBusy(false);
    if (r !== uri) {
      setCenter({ x: 0.5, y: 0.5 });
      setUri(r);
    }
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let out = uri;
      if (cropOn && disp && size) {
        const k = size.w / disp.w;
        const c = {
          originX: Math.max(0, Math.round(crop.x * k)),
          originY: Math.max(0, Math.round(crop.y * k)),
          width: Math.round(crop.w * k),
          height: Math.round(crop.h * k),
        };
        c.width = Math.min(c.width, size.w - c.originX);
        c.height = Math.min(c.height, size.h - c.originY);
        out = await transformPhoto(out, { crop: c });
      }
      out = await processPhoto(out, { effect, colors: true });
      onDone(out);
    } catch (e) {
      onDone(uri);
    }
  };

  const fx = effectStyle(effect);
  const shown = preview || uri;
  return (
    <Modal visible animationType="slide" onRequestClose={() => onDone(null)}>
      <View style={[s.wrap, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 10 }]}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => onDone(null)} hitSlop={10} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text numberOfLines={1} style={s.title}>{opts.title || 'Editar foto'}</Text>
          <TouchableOpacity onPress={rotate} hitSlop={10} accessibilityLabel="Girar">
            <Ionicons name="refresh-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ width: boxW, height: boxH, alignSelf: 'center' }}>
          {disp ? (
            <View style={{ position: 'absolute', left: disp.x, top: disp.y, width: disp.w, height: disp.h }}>
              <Image source={{ uri: shown }} style={[{ width: disp.w, height: disp.h }, fx]} resizeMode="cover" />
              {cropOn ? (
                <>
                  <View pointerEvents="none" style={[s.dim, { left: 0, top: 0, width: disp.w, height: crop.y }]} />
                  <View pointerEvents="none" style={[s.dim, { left: 0, top: crop.y + crop.h, width: disp.w, height: disp.h - crop.y - crop.h }]} />
                  <View pointerEvents="none" style={[s.dim, { left: 0, top: crop.y, width: crop.x, height: crop.h }]} />
                  <View pointerEvents="none" style={[s.dim, { left: crop.x + crop.w, top: crop.y, width: disp.w - crop.x - crop.w, height: crop.h }]} />
                  <View {...pan.panHandlers} style={[s.frame, { left: crop.x, top: crop.y, width: crop.w, height: crop.h }]}>
                    <View pointerEvents="none" style={[s.gridV, { left: '33.3%' }]} />
                    <View pointerEvents="none" style={[s.gridV, { left: '66.6%' }]} />
                    <View pointerEvents="none" style={[s.gridH, { top: '33.3%' }]} />
                    <View pointerEvents="none" style={[s.gridH, { top: '66.6%' }]} />
                  </View>
                </>
              ) : null}
            </View>
          ) : (
            <ActivityIndicator color={GOLD} style={{ marginTop: boxH / 2 - 10 }} />
          )}
          {smoothOf(effect) && !preview && canSmooth() ? (
            <View style={s.hint}><ActivityIndicator size="small" color="#fff" /><Text style={s.hintTxt}>  Alisando a pele…</Text></View>
          ) : null}
        </View>

        <View style={s.tabs}>
          {[['efeitos', 'Efeitos', 'color-wand-outline'], ['cortar', 'Cortar', 'crop-outline']].map(([k, l, ic]) => (
            <TouchableOpacity key={k} style={s.tab} onPress={() => setTab(k)}>
              <Ionicons name={ic} size={18} color={tab === k ? GOLD : '#bbb'} />
              <Text numberOfLines={1} style={[s.tabTxt, tab === k && { color: GOLD }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'efeitos' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }} style={{ flexGrow: 0 }}>
            {STORY_EFFECTS.map((e) => {
              const on = e.key === effect;
              return (
                <TouchableOpacity key={e.key} style={s.fx} onPress={() => setEffect(e.key)} accessibilityLabel={e.label}>
                  <Image source={{ uri }} style={[s.fxImg, on && { borderColor: GOLD }, effectStyle(e.key)]} />
                  <Text numberOfLines={1} style={[s.fxTxt, on && { color: GOLD }]}>{e.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }} style={{ flexGrow: 0 }}>
              {RATIOS.map((r) => (
                <TouchableOpacity key={r.key} style={[s.chip, ratio === r.key && s.chipOn]} onPress={() => (setRatio(r.key), setCenter({ x: 0.5, y: 0.5 }))}>
                  <Text numberOfLines={1} style={[s.chipTxt, ratio === r.key && { color: GOLD }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.zoomRow}>
              <TouchableOpacity style={s.zoomBtn} onPress={() => setZoom((z) => Math.max(0, z - 1))} accessibilityLabel="Abrir o corte">
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={s.zoomTxt}>{cropOn ? 'Arraste o quadro para escolher a parte' : 'Escolha um formato ou toque em +'}</Text>
              <TouchableOpacity style={s.zoomBtn} onPress={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} accessibilityLabel="Fechar o corte">
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.bottom}>
          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => onDone(null)}>
            <Text numberOfLines={1} style={[s.btnTxt, { color: '#fff' }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={confirm} disabled={busy}>
            {busy ? <ActivityIndicator color="#111" /> : <Text numberOfLines={1} style={s.btnTxt}>{opts.confirm || 'Usar foto'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0B0C10', justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 48 },
  title: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center', marginHorizontal: 12 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: GOLD },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.55)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.55)' },
  hint: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  hintTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tabs: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8 },
  tabTxt: { color: '#bbb', fontWeight: '800', marginLeft: 6, fontSize: 14 },
  fx: { alignItems: 'center', marginRight: 10, width: 68 },
  fxImg: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#222' },
  fxTxt: { color: '#ddd', fontSize: 11, marginTop: 4, fontWeight: '600' },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: '#333' },
  chipOn: { borderColor: GOLD },
  chipTxt: { color: '#ddd', fontWeight: '700' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10 },
  zoomBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  zoomTxt: { color: '#aaa', fontSize: 12, flex: 1, textAlign: 'center' },
  bottom: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 10 },
  btn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#444', marginLeft: 0, marginRight: 0 },
  btnTxt: { color: '#111', fontWeight: '800', fontSize: 15 },
});
