import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Easing, useWindowDimensions, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../store';
import { colors, soft, brl } from '../theme';
import { Photo, ProductThumb } from './ui';
import { CLIP_POINTS, CLIP_MS, flashEndsAt, countdown, shortNum, comboOff } from '../adsData';

// Peças de publicidade paga e do setor de Promoções, usadas no Shop e no Food.

// Relógio que anda sozinho (para as contagens regressivas).
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// Abas internas da página (ex.: Vitrine | Promoções), no mesmo estilo leve do menu do topo da
// Community: sem caixa nem bordas, ícone em cima e texto embaixo; a ativa ganha só uma pílula
// clarinha. items: [{ key, label, icon, badge }]
export function SegTabs({ items, value, onChange }) {
  return (
    <View style={styles.seg}>
      {items.map((t) => {
        const on = t.key === value;
        return (
          <TouchableOpacity key={t.key} style={[styles.segItem, on && styles.segOn]} onPress={() => onChange(t.key)} activeOpacity={0.7} accessibilityLabel={t.label}>
            <View>
              <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={19} color={on ? colors.primary : colors.muted} />
              {t.badge ? (
                <View style={styles.segBadge}>
                  <Text style={styles.segBadgeText}>{t.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.segText, on && styles.segTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Vitrine patrocinada: banners grandes que passam sozinhos. Conta visualização e toque.
export function SpotlightCarousel({ ads, onOpen }) {
  const { dispatch } = useStore();
  const { width } = useWindowDimensions();
  const w = width - 32;
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const seen = useRef({});
  const touching = useRef(false);

  useEffect(() => {
    const ad = ads[i];
    if (ad && !seen.current[ad.id]) {
      seen.current[ad.id] = true;
      dispatch({ type: 'AD_EVENT', id: ad.id, ev: 'views' });
    }
  }, [i, ads]);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => {
      if (touching.current) return;
      setI((cur) => {
        const next = (cur + 1) % ads.length;
        if (ref.current) ref.current.scrollTo({ x: next * (w + 10), animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [ads.length, w]);

  if (!ads.length) return null;
  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled={false}
        snapToInterval={w + 10}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          setI(Math.round(e.nativeEvent.contentOffset.x / (w + 10)));
        }}
      >
        {ads.map((ad, k) => (
          <TouchableOpacity
            key={ad.id}
            activeOpacity={0.92}
            style={[styles.spot, { width: w, marginRight: k === ads.length - 1 ? 0 : 10 }]}
            onPress={() => {
              dispatch({ type: 'AD_EVENT', id: ad.id, ev: 'taps' });
              onOpen(ad);
            }}
            accessibilityLabel={`Anúncio patrocinado: ${ad.title}`}
          >
            <Photo uri={ad.photo} style={StyleSheet.absoluteFill} fallback="✨" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,17,36,0.28)' }]} />
            <View style={styles.spotShade} />
            <View style={styles.spotTag}>
              <Ionicons name="sparkles" size={11} color="#E2B649" />
              <Text style={styles.spotTagText}>PATROCINADO</Text>
            </View>
            <View style={styles.spotBody}>
              <Text style={styles.spotTitle} numberOfLines={2}>{ad.title}</Text>
              <Text style={styles.spotSub} numberOfLines={2}>{ad.sub}</Text>
              <View style={[styles.spotCta, { backgroundColor: ad.tint || colors.primary }]}>
                <Text style={styles.spotCtaText}>{ad.cta}</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {ads.map((ad, k) => (
          <View key={ad.id} style={[styles.dotItem, k === i && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

// Clipes: vídeos curtos de produto. Assistiu até o fim, ganha pontos.
export function ClipStrip({ title, clips, food }) {
  const { state } = useStore();
  const [open, setOpen] = useState(null); // índice do clipe aberto
  if (!clips.length) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>{title}</Text>
        <View style={styles.earn}>
          <Ionicons name="star" size={11} color={colors.primaryDark} />
          <Text style={styles.earnText}>Assista e ganhe pontos</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {clips.map((c, k) => {
          const s = storeOf(state, c.storeId) || {};
          const done = !!state.adRewards[c.id];
          return (
            <TouchableOpacity key={c.id} style={styles.clip} activeOpacity={0.9} onPress={() => setOpen(k)} accessibilityLabel={`Assistir clipe: ${c.title}`}>
              <Photo uri={c.photo} style={StyleSheet.absoluteFill} fallback={s.logo || '🎬'} />
              <View style={styles.clipShade} />
              <View style={styles.clipPlay}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
              <View style={[styles.clipPts, done && { backgroundColor: colors.success }]}>
                <Text style={styles.clipPtsText}>{done ? '✓ visto' : `+${CLIP_POINTS} pts`}</Text>
              </View>
              <View style={styles.clipBody}>
                <Text style={styles.clipStore} numberOfLines={1}>{s.logo} {s.name}</Text>
                <Text style={styles.clipTitle} numberOfLines={2}>{c.title}</Text>
                <Text style={styles.clipViews}>
                  <Ionicons name="eye" size={10} color="rgba(255,255,255,0.85)" /> {shortNum(c.views)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ClipPlayer clips={clips} index={open} onIndex={setOpen} onClose={() => setOpen(null)} food={food} />
    </View>
  );
}

function ClipPlayer({ clips, index, onIndex, onClose, food }) {
  const { state, dispatch } = useStore();
  const visible = index !== null && index !== undefined;
  const c = visible ? clips[index] : null;
  const prog = useRef(new Animated.Value(0)).current;
  const [earned, setEarned] = useState(false);
  const [liked, setLiked] = useState({});

  useEffect(() => {
    if (!c) return;
    setEarned(false);
    prog.setValue(0);
    dispatch({ type: 'AD_EVENT', id: c.id, ev: 'views' });
    const anim = Animated.timing(prog, { toValue: 1, duration: CLIP_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (!finished) return;
      dispatch({ type: 'AD_EVENT', id: c.id, ev: 'watched' });
      if (!state.adRewards[c.id]) {
        dispatch({ type: 'AD_REWARD', id: c.id, points: CLIP_POINTS, desc: c.title });
        setEarned(true);
      }
    });
    return () => anim.stop();
  }, [c && c.id]);

  if (!c) return null;
  const s = storeOf(state, c.storeId) || {};
  const p = state.products.find((x) => x.id === c.productId);
  const isLiked = !!liked[c.id];
  const next = () => (index < clips.length - 1 ? onIndex(index + 1) : onClose());
  const add = () => {
    if (!p) return;
    dispatch({ type: 'AD_EVENT', id: c.id, ev: 'taps' });
    dispatch({ type: 'ADD_TO_CART', productId: p.id });
    Alert.alert(food ? 'Pedido no carrinho 🍽️' : 'No carrinho 🛍️', `${p.name} · ${brl(p.price)}`, [
      { text: 'Continuar vendo' },
      { text: 'Ver carrinho', onPress: () => { onClose(); dispatch({ type: 'OPEN_CART' }); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.player}>
        <Photo uri={c.photo} style={StyleSheet.absoluteFill} fallback={s.logo || '🎬'} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,10,0.25)' }]} />
        {/* Barrinhas de progresso, uma por clipe (como stories). */}
        <View style={styles.bars}>
          {clips.map((x, k) => (
            <View key={x.id} style={styles.barBg}>
              {k < index ? <View style={[styles.barFill, { width: '100%' }]} /> : null}
              {k === index ? <Animated.View style={[styles.barFill, { width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /> : null}
            </View>
          ))}
        </View>
        <View style={styles.playerTop}>
          <TouchableOpacity style={styles.playerStore} onPress={() => { onClose(); dispatch({ type: 'OPEN_COMPANY', id: c.storeId }); }}>
            <Text style={{ fontSize: 18 }}>{s.logo}</Text>
            <View style={{ marginLeft: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{s.name} <Ionicons name="shield-checkmark" size={12} color="#E2B649" /></Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Patrocinado · CNPJ verificado</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.playerClose} accessibilityLabel="Fechar clipe">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Toque no lado direito: próximo clipe. */}
        <TouchableOpacity style={styles.tapNext} activeOpacity={1} onPress={next} accessibilityLabel="Próximo clipe" />

        <View style={styles.side}>
          <TouchableOpacity style={styles.sideBtn} onPress={() => setLiked({ ...liked, [c.id]: !isLiked })} accessibilityLabel="Curtir">
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color={isLiked ? '#FF5A7A' : '#fff'} />
            <Text style={styles.sideText}>{shortNum(c.likes + (isLiked ? 1 : 0))}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => Share.share({ message: `${c.title} · ${s.name} no Realys\nRealys · Pessoas reais. Negócios reais.` }).catch(() => {})}
            accessibilityLabel="Compartilhar"
          >
            <Ionicons name="share-social-outline" size={26} color="#fff" />
            <Text style={styles.sideText}>Enviar</Text>
          </TouchableOpacity>
        </View>

        {earned ? (
          <View style={styles.earned}>
            <Ionicons name="star" size={16} color="#0B1124" />
            <Text style={styles.earnedText}>+{CLIP_POINTS} pontos Realys por assistir!</Text>
          </View>
        ) : null}

        <View style={styles.playerBottom}>
          <Text style={styles.playerTitle}>{c.title}</Text>
          {p ? (
            <View style={styles.prodBox}>
              <ProductThumb product={p} size={46} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 2 }}>{brl(p.price)}</Text>
              </View>
              <TouchableOpacity style={styles.buy} onPress={add} accessibilityLabel={`Adicionar ${p.name} ao carrinho`}>
                <Ionicons name={food ? 'restaurant' : 'cart'} size={15} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 5, fontSize: 12 }}>{food ? 'Pedir' : 'Comprar'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Setor de Promoções ----------

const FILTERS = [
  { key: 'tudo', label: 'Tudo', icon: 'flame-outline' },
  { key: 'relampago', label: 'Relâmpago', icon: 'flash-outline' },
  { key: 'cupons', label: 'Cupons', icon: 'ticket-outline' },
  { key: 'combos', label: 'Combos', icon: 'gift-outline' },
];

export function PromoSector({ flash, coupons, combos, food, onOpenStore }) {
  const { state, dispatch } = useStore();
  const now = useNow(1000);
  const [f, setF] = useState('tudo');
  const items = flash
    .map((d) => ({ ...d, p: state.products.find((x) => x.id === d.productId), ends: flashEndsAt(d.hours, now) }))
    .filter((d) => d.p)
    .sort((a, b) => a.ends - b.ends);
  const soonest = items.length ? items[0].ends : now;
  const show = (k) => f === 'tudo' || f === k;
  const has = (id) => (state.promoCredits || []).some((pc) => pc.offerId === id);
  const nameOf = (id) => (storeOf(state, id) || {}).name || '';

  const add = (p) => {
    dispatch({ type: 'ADD_TO_CART', productId: p.id });
    Alert.alert(food ? 'Pedido no carrinho 🍽️' : 'No carrinho 🛍️', `${p.name} entrou com o preço da oferta.`, [
      { text: 'Continuar' },
      { text: 'Ver carrinho', onPress: () => dispatch({ type: 'OPEN_CART' }) },
    ]);
  };

  return (
    <View>
      <View style={styles.flashHero}>
        <View style={styles.flashIcon}>
          <Ionicons name="flash" size={22} color="#0B1124" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.flashHeroTitle}>{food ? 'Promoções do Food' : 'Promoções do Shop'}</Text>
          <Text style={styles.flashHeroSub}>Próxima oferta acaba em</Text>
        </View>
        <Text style={styles.flashClock}>{countdown(soonest - now)}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {FILTERS.map((x) => {
          const on = x.key === f;
          return (
            <TouchableOpacity key={x.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setF(x.key)}>
              <Ionicons name={x.icon} size={15} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{x.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {show('cupons') && coupons.length ? (
        <>
          <View style={styles.head}>
            <Text style={styles.headTitle}>🎟️ Pegue seu cupom</Text>
            <Text style={styles.headHint}>desconta sozinho no carrinho</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {coupons.map((c) => {
              const got = has(c.id);
              const s = storeOf(state, c.storeId) || {};
              return (
                <View key={c.id} style={styles.coupon}>
                  <View style={styles.couponLeft}>
                    <Text style={styles.couponValue}>R$ {c.value}</Text>
                    <Text style={styles.couponOff}>OFF</Text>
                  </View>
                  <View style={styles.couponCut} />
                  <View style={{ flex: 1, padding: 10 }}>
                    <Text numberOfLines={1} style={styles.couponTitle}>{c.title}</Text>
                    <Text numberOfLines={1} style={styles.couponRule}>{s.logo} {c.rule}</Text>
                    {c.sponsored ? <Text style={styles.couponSp}>Patrocinado</Text> : null}
                    <TouchableOpacity
                      style={[styles.couponBtn, got && { backgroundColor: colors.success }]}
                      disabled={got}
                      onPress={() => {
                        dispatch({ type: 'COLLECT_COUPON', coupon: c, partner: s.name });
                        Alert.alert('Cupom guardado 🎟️', `${c.title} na ${s.name}. Ele desconta sozinho quando você comprar lá.`);
                      }}
                    >
                      <Text style={styles.couponBtnText}>{got ? '✓ Guardado' : 'Pegar cupom'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {show('relampago') ? (
        <>
          <View style={styles.head}>
            <Text style={styles.headTitle}>⚡ Ofertas relâmpago</Text>
            <Text style={styles.headHint}>{items.length} ofertas</Text>
          </View>
          <View style={styles.grid}>
            {items.map(({ id, p, off, sold, limit, ends }) => {
              const from = p.price / (1 - off / 100);
              const pct = Math.round(sold * 100);
              return (
                <View key={id} style={styles.flash}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenStore && onOpenStore(p.storeId)} style={{ alignItems: 'center' }}>
                    <ProductThumb product={p} size={76} />
                  </TouchableOpacity>
                  <View style={styles.offBadge}>
                    <Text style={styles.offText}>-{off}%</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.flashName}>{p.name}</Text>
                  <Text numberOfLines={1} style={styles.flashStore}>{nameOf(p.storeId)}</Text>
                  <Text style={styles.flashFrom}>de {brl(from)}</Text>
                  <Text style={styles.flashPrice}>{brl(p.price)}</Text>
                  <View style={styles.soldBg}>
                    <View style={[styles.soldFill, { width: `${pct}%` }]} />
                    <Text style={styles.soldText}>{pct >= 75 ? `🔥 ${pct}% vendido` : `${pct}% vendido`}</Text>
                  </View>
                  <Text style={styles.ends}>
                    <Ionicons name="time-outline" size={11} color="#FF3B5C" /> {countdown(ends - now)}
                  </Text>
                  {limit ? <Text style={styles.limit}>{limit}</Text> : null}
                  <TouchableOpacity style={styles.flashBtn} onPress={() => add(p)} accessibilityLabel={`Aproveitar ${p.name}`}>
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 3 }}>Aproveitar</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {show('combos') && combos.length ? (
        <>
          <View style={styles.head}>
            <Text style={styles.headTitle}>🧺 Leve mais, pague menos</Text>
          </View>
          {combos.map((cb) => {
            const ps = cb.items.map((id) => state.products.find((x) => x.id === id)).filter(Boolean);
            const sum = ps.reduce((s, p) => s + p.price, 0);
            const off = comboOff(cb, ps.map((p) => p.price));
            const s = storeOf(state, cb.storeId) || {};
            return (
              <View key={cb.id} style={styles.combo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.comboTitle}>{cb.title}</Text>
                    <Text style={styles.flashStore}>{s.logo} {s.name}</Text>
                  </View>
                  <View style={styles.comboDeal}>
                    <Text style={styles.offText}>{cb.deal}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                  {ps.map((p) => (
                    <View key={p.id} style={styles.comboItem}>
                      <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
                      <Text numberOfLines={1} style={styles.comboItemText}>{p.name}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.flashFrom}>de {brl(sum)}</Text>
                    <Text style={styles.flashPrice}>por {brl(sum - off)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.flashBtn, { marginTop: 0, paddingHorizontal: 16 }]}
                    onPress={() => {
                      dispatch({ type: 'ADD_COMBO', combo: cb, items: ps.map((p) => p.id), off, partner: s.name });
                      Alert.alert('Combo no carrinho 🧺', `${cb.title}: ${ps.length} itens.\nO desconto de ${brl(off)} sai sozinho no pagamento.`, [
                        { text: 'Continuar' },
                        { text: 'Ver carrinho', onPress: () => dispatch({ type: 'OPEN_CART' }) },
                      ]);
                    }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 3 }}>Adicionar combo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <View style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.noteText}>Só lojas com CNPJ verificado anunciam aqui. Cupons e combos descontam sozinhos no carrinho.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', paddingTop: 2, paddingBottom: 8, marginBottom: 6 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 2, marginHorizontal: 2, borderRadius: 14 },
  segOn: { backgroundColor: colors.primaryLight },
  segText: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 3 },
  segTextOn: { color: colors.primaryDark, fontWeight: '700' },
  segBadge: { position: 'absolute', top: -5, right: -12, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#FF3B5C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  spot: { height: 190, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.dark },
  spotShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: 'rgba(11,17,36,0.55)' },
  spotTag: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(11,17,36,0.7)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(226,182,73,0.6)' },
  spotTagText: { color: '#E2B649', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginLeft: 4 },
  spotBody: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  spotTitle: { color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  spotSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2 },
  spotCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 12, borderRadius: 16, marginTop: 8 },
  spotCtaText: { color: '#fff', fontWeight: '800', fontSize: 12, marginRight: 5 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dotItem: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong, marginHorizontal: 3 },
  dotOn: { width: 18, backgroundColor: colors.primary },

  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  headTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  headHint: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  earn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  earnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', marginLeft: 4 },

  clip: { width: 124, height: 210, borderRadius: 18, overflow: 'hidden', marginRight: 10, backgroundColor: colors.dark },
  clipShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100, backgroundColor: 'rgba(3,5,10,0.55)' },
  clipPlay: { position: 'absolute', top: 70, alignSelf: 'center', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  clipPts: { position: 'absolute', top: 8, right: 8, backgroundColor: '#E2B649', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  clipPtsText: { color: '#0B1124', fontSize: 10, fontWeight: '800' },
  clipBody: { position: 'absolute', left: 8, right: 8, bottom: 8 },
  clipStore: { color: '#E2B649', fontSize: 10, fontWeight: '800' },
  clipTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 },
  clipViews: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 3 },

  player: { flex: 1, backgroundColor: '#03050A' },
  bars: { position: 'absolute', top: 44, left: 10, right: 10, flexDirection: 'row' },
  barBg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: '#fff' },
  playerTop: { position: 'absolute', top: 56, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  playerStore: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  playerClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tapNext: { position: 'absolute', top: 110, bottom: 200, right: 0, width: '40%' },
  side: { position: 'absolute', right: 10, bottom: 190, alignItems: 'center' },
  sideBtn: { alignItems: 'center', marginTop: 18 },
  sideText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  earned: { position: 'absolute', top: 110, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2B649', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  earnedText: { color: '#0B1124', fontWeight: '800', marginLeft: 6 },
  playerBottom: { position: 'absolute', left: 12, right: 12, bottom: 34 },
  playerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10, marginRight: 50 },
  prodBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 10 },
  buy: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, height: 38, paddingHorizontal: 12, borderRadius: 12 },

  flashHero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1124', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(226,182,73,0.45)' },
  flashIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E2B649', alignItems: 'center', justifyContent: 'center' },
  flashHeroTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  flashHeroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  flashClock: { color: '#E2B649', fontWeight: '800', fontSize: 18, fontVariant: ['tabular-nums'] },
  chip: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.cardAlt, marginRight: 8 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 6 },

  coupon: { width: 250, flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong, ...soft },
  couponLeft: { width: 70, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  couponValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  couponOff: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  couponCut: { width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong },
  couponTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  couponRule: { color: colors.muted, fontSize: 11, marginTop: 2 },
  couponSp: { color: colors.sponsored, fontSize: 10, fontWeight: '800', marginTop: 2 },
  couponBtn: { alignSelf: 'flex-start', height: 30, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  couponBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  flash: { width: '48.5%', backgroundColor: colors.card, borderRadius: 18, padding: 10, marginBottom: 10, ...soft },
  offBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FF3B5C', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  offText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  flashName: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 8, minHeight: 34 },
  flashStore: { color: colors.muted, fontSize: 11, marginTop: 1 },
  flashFrom: { color: colors.muted, fontSize: 11, textDecorationLine: 'line-through', marginTop: 4 },
  flashPrice: { color: '#E03131', fontWeight: '800', fontSize: 16 },
  soldBg: { height: 16, borderRadius: 8, backgroundColor: '#FFE3E8', marginTop: 6, overflow: 'hidden', justifyContent: 'center' },
  soldFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FF8FA3' },
  soldText: { color: '#8A1C2E', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  ends: { color: '#FF3B5C', fontSize: 11, fontWeight: '800', marginTop: 5, fontVariant: ['tabular-nums'] },
  limit: { color: colors.muted, fontSize: 10, marginTop: 2 },
  flashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: 11, backgroundColor: '#FF3B5C', marginTop: 8 },

  combo: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 10, ...soft },
  comboTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  comboDeal: { backgroundColor: '#FF3B5C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  comboItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6, maxWidth: '100%' },
  comboItemText: { color: colors.text, fontSize: 11, fontWeight: '600', marginLeft: 4, maxWidth: 140 },

  note: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginTop: 4, marginBottom: 8 },
  noteText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600', marginLeft: 8, flex: 1 },
});
