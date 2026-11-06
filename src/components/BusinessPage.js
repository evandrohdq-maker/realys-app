// Página empresarial pública (não é perfil social: nada de foto pessoal; só equipe, produtos,
// estrutura e dados da empresa): visual futurista (fundo noturno, brilho dourado e azul, anel em órbita),
// onde a empresa atua e os segmentos de cada área, onde atende, vitrine, produtos,
// depoimentos de quem comprou, vídeos de propaganda e conteúdos.
import React, { useState, useEffect, useRef } from 'react';
import { LiveNowBadge } from './LiveBits';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Animated, Easing, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { Photo, ProductThumb } from './ui';
import { ShopProductCard } from './ShopKit';
import { MY_COMPANY_ID } from '../data';
import { memberById } from '../people';
import { businessOf, showcaseOf, sectorByKey, SERVE_MODES, ratingOf, GALLERY_TYPES } from '../companyBusiness';

const NIGHT = '#0B1124';
const NIGHT2 = '#131C38';
const GLASS = 'rgba(255,255,255,0.08)';
const GLASS_BD = 'rgba(226,182,73,0.35)';

const count = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',').replace(',0', '') + ' mil' : String(n));

export function Stars({ value, size = 13, color = colors.gold }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color={color} />
      ))}
    </View>
  );
}

// Quem escreveu o depoimento.
export function reviewer(state, rv) {
  if (rv.who === 'me') return { name: (state.user && state.user.name) || 'Você', photo: state.myProfile && state.myProfile.photo };
  const m = memberById(rv.who);
  return m ? { name: m.name, photo: m.photo } : { name: 'Cliente Realys', photo: null };
}

// Logo com anel em órbita, no mesmo estilo da Lotus.
function OrbitLogo({ logo }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const s = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    s.start();
    p.start();
    return () => {
      s.stop();
      p.stop();
    };
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return (
    <View style={styles.logoWrap}>
      <Animated.View style={[styles.logoGlow, { opacity: glow }]} />
      <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
        <View style={[styles.orbitDot, { top: -4, left: 52 - 4, backgroundColor: colors.gold }]} />
        <View style={[styles.orbitDot, { bottom: -3, left: 52 - 3, width: 6, height: 6, backgroundColor: '#5FA2FF' }]} />
      </Animated.View>
      <View style={styles.logo}>
        <Text style={{ fontSize: 36 }}>{logo}</Text>
      </View>
    </View>
  );
}

function SectorCards({ sectors }) {
  const keys = Object.keys(sectors || {}).filter((k) => sectorByKey(k));
  if (!keys.length) return <Text style={styles.emptyDark}>A empresa ainda não informou onde atua.</Text>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
      {keys.map((k) => {
        const sec = sectorByKey(k);
        const segs = sectors[k] || [];
        return (
          <View key={k} style={styles.sector}>
            <View style={styles.sectorHead}>
              <View style={styles.sectorIcon}>
                <Ionicons name={sec.icon} size={18} color={colors.gold} />
              </View>
              <Text style={styles.sectorLabel} numberOfLines={2}>{sec.label}</Text>
            </View>
            <View style={styles.segWrap}>
              {segs.map((sg) => (
                <View key={sg} style={styles.seg}>
                  <Text style={styles.segText}>{sg}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// Galeria empresarial: equipe, produtos e estrutura.
function Gallery({ photos }) {
  const [type, setType] = useState('todos');
  const [open, setOpen] = useState(null);
  const list = type === 'todos' ? photos : photos.filter((ph) => ph.type === type);
  if (!photos.length) return <Text style={styles.empty}>A empresa ainda não publicou fotos.</Text>;
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
        {[{ key: 'todos', label: 'Todas', icon: 'grid-outline' }, ...GALLERY_TYPES].map((t) => {
          const on = type === t.key;
          const n = t.key === 'todos' ? photos.length : photos.filter((ph) => ph.type === t.key).length;
          if (!n) return null;
          return (
            <TouchableOpacity key={t.key} onPress={() => setType(t.key)} style={[styles.gType, on && styles.gTypeOn]}>
              <Ionicons name={t.icon} size={13} color={on ? '#FFFFFF' : colors.primary} />
              <Text style={[styles.gTypeText, on && { color: '#FFFFFF' }]}>{t.label} · {n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.grid}>
        {list.map((ph) => (
          <TouchableOpacity key={ph.id} style={styles.gItem} activeOpacity={0.9} onPress={() => setOpen(ph)}>
            <Photo uri={ph.photo} style={styles.gImg} fallback="🏢" />
            <View style={styles.gTag}>
              <Text style={styles.gTagText}>{(GALLERY_TYPES.find((t) => t.key === ph.type) || {}).label}</Text>
            </View>
            {ph.caption ? <Text style={styles.gCaption} numberOfLines={2}>{ph.caption}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <TouchableOpacity style={styles.viewer} activeOpacity={1} onPress={() => setOpen(null)}>
          {open ? (
            <>
              <Photo uri={open.photo} style={styles.viewerImg} fallback="🏢" />
              {open.caption ? <Text style={styles.viewerText}>{open.caption}</Text> : null}
            </>
          ) : null}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// Ficha da empresa: dados do CNPJ e do atendimento.
function CompanyFacts({ b }) {
  const rows = [
    ['document-text-outline', 'Razão social', b.legalName],
    ['shield-checkmark-outline', 'CNPJ verificado', b.cnpj],
    ['people-outline', 'Equipe', b.team],
    ['location-outline', 'Endereço', b.address],
    ['call-outline', 'Atendimento', b.contact],
  ].filter((r) => r[2]);
  if (!rows.length) return null;
  return (
    <View style={styles.facts}>
      {rows.map(([icon, label, value], i) => (
        <View key={label} style={[styles.factRow, i > 0 && styles.factSep]}>
          <Ionicons name={icon} size={15} color={colors.gold} />
          <Text style={styles.factLabel}>{label}</Text>
          <Text style={styles.factValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function AdList({ ads }) {
  const [playing, setPlaying] = useState(null);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    setPos(0);
    const id = setInterval(() => setPos((p) => (p >= 100 ? 100 : p + 3)), 400);
    return () => clearInterval(id);
  }, [playing]);
  if (!ads.length) return <Text style={styles.empty}>Nenhum vídeo de propaganda publicado ainda.</Text>;
  return ads.map((ad) => {
    const on = playing === ad.id;
    return (
      <TouchableOpacity key={ad.id} style={styles.ad} activeOpacity={0.9} onPress={() => setPlaying(on ? null : ad.id)}>
        <Photo uri={ad.cover} style={styles.adImg} fallback="🎬" />
        <View style={styles.adShade} />
        <View style={styles.adTag}>
          <Ionicons name="megaphone-outline" size={11} color={NIGHT} />
          <Text style={styles.adTagText}>PROPAGANDA</Text>
        </View>
        <View style={styles.adPlay}>
          <Ionicons name={on ? 'pause' : 'play'} size={26} color="#FFFFFF" />
        </View>
        <View style={styles.adInfo}>
          <Text style={styles.adTitle} numberOfLines={2}>{ad.title}</Text>
          <Text style={styles.adSub}>{ad.length} · {count(ad.views || 0)} visualizações</Text>
        </View>
        {on ? <View style={[styles.adBar, { width: `${pos}%` }]} /> : null}
      </TouchableOpacity>
    );
  });
}

function ReviewCard({ rv }) {
  const { state } = useStore();
  const who = reviewer(state, rv);
  return (
    <View style={styles.review}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Photo uri={who.photo} style={styles.avatar} fallback="🙂" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title}>{who.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Stars value={rv.stars} size={12} />
            <Text style={[styles.sub, { marginLeft: 6, marginTop: 0 }]}>{rv.time}</Text>
          </View>
        </View>
        {rv.verified ? (
          <View style={styles.verified}>
            <Ionicons name="shield-checkmark" size={11} color={colors.success} />
            <Text style={styles.verifiedText}>Compra verificada</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.reviewText}>“{rv.text}”</Text>
      {rv.product ? <Text style={styles.reviewProduct}>Comprou: {rv.product}</Text> : null}
    </View>
  );
}

function ReviewSummary({ reviews }) {
  const shown = reviews.filter((x) => x.shown);
  const avg = ratingOf(reviews);
  if (!avg) return null;
  return (
    <View style={styles.summary}>
      <View style={{ alignItems: 'center', marginRight: 16 }}>
        <Text style={styles.avg}>{avg.toFixed(1).replace('.', ',')}</Text>
        <Stars value={avg} size={13} />
        <Text style={[styles.sub, { color: 'rgba(255,255,255,0.7)' }]}>{shown.length} depoimentos</Text>
      </View>
      <View style={{ flex: 1 }}>
        {[5, 4, 3, 2, 1].map((n) => {
          const c = shown.filter((x) => x.stars === n).length;
          return (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 1.5 }}>
              <Text style={styles.barLabel}>{n}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(c / shown.length) * 100}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function WriteReview({ company, onClose }) {
  const { dispatch } = useStore();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const send = () => {
    if (text.trim().length < 10) return Alert.alert('Conte um pouco mais', 'Escreva pelo menos uma frase sobre a sua compra.');
    const mine = company.id === MY_COMPANY_ID;
    dispatch({
      type: 'ADD_COMPANY_REVIEW',
      id: company.id,
      review: { id: 'rv' + Date.now(), who: 'me', stars, text: text.trim(), product: '', time: 'agora', verified: true, shown: !mine },
    });
    onClose();
    Alert.alert('Depoimento enviado ✅', mine ? 'A empresa decide se ele fica exposto na página.' : 'Obrigado! Seu depoimento já aparece na página da empresa.');
  };
  return (
    <View style={styles.write}>
      <Text style={[styles.title, { marginBottom: 6 }]}>Como foi comprar em {company.name}?</Text>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => setStars(i)} style={{ marginRight: 6 }} accessibilityLabel={`${i} estrelas`}>
            <Ionicons name={stars >= i ? 'star' : 'star-outline'} size={28} color={colors.gold} />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput value={text} onChangeText={setText} placeholder="Conte o que você comprou e como foi" placeholderTextColor={colors.muted} multiline style={styles.writeInput} />
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity style={[styles.cta, { flex: 1 }]} onPress={send}>
          <Text style={styles.ctaText}>Enviar depoimento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaGhost, { marginLeft: 8 }]} onPress={onClose}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductCard({ x, onAdd, big }) {
  // Cartões pequenos com o mesmo visual do Shop; o destaque grande da vitrine continua especial.
  if (!big) return <ShopProductCard p={x} onAdd={() => onAdd(x.id)} />;
  return (
    <View style={[styles.pCard, big && styles.pCardBig]}>
      {big ? <View style={styles.pGlow} /> : null}
      <ProductThumb product={x} size={big ? 110 : 84} />
      {x.launch ? <Text style={styles.launch}>LANÇAMENTO</Text> : null}
      <Text style={[styles.title, { textAlign: 'center', marginTop: 4 }]} numberOfLines={2}>{x.name}</Text>
      {big && x.launch ? <Text style={[styles.sub, { textAlign: 'center' }]} numberOfLines={2}>{x.launch.note}</Text> : null}
      <Text style={styles.price}>{brl(x.price)}</Text>
      {x.stock > 0 ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(x.id)}>
          <Ionicons name="cart-outline" size={14} color="#FFFFFF" />
          <Text style={styles.addText}>Carrinho</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.sub, { color: colors.danger, fontWeight: '700' }]}>Esgotado</Text>
      )}
    </View>
  );
}

// p = profileById(state, id) para empresas. media = músicas e vídeos (aparece só se a empresa tiver).
export function BusinessPageModal({ p, media, MediaList }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('vitrine');
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    setTab('vitrine');
    setWriting(false);
  }, [p.id]);

  const b = businessOf(state, p.id);
  const close = () => dispatch({ type: 'CLOSE_COMPANY' });
  const following = !!state.following[p.id];
  const products = state.products.filter((x) => x.storeId === p.id);
  const showcase = showcaseOf(state, p.id);
  const posts = state.posts.filter((x) => x.storeId === p.id);
  const reviews = b.reviews.filter((x) => x.shown);
  const avg = ratingOf(b.reviews) || p.rating;
  const isMine = p.id === MY_COMPANY_ID;
  const bought = (state.orders || []).some((o) => String(o.store || '').includes(p.name));
  const modes = SERVE_MODES.filter((m) => (b.modes || []).includes(m.key) || (m.key === 'brasil' && p.shipsBrazil && !(b.modes || []).length));

  const tabs = [
    ['vitrine', 'Vitrine', 'sparkles-outline'],
    ['produtos', 'Produtos', 'pricetags-outline'],
    ['depoimentos', 'Depoimentos', 'chatbubbles-outline'],
    ['propagandas', 'Propagandas', 'videocam-outline'],
    ['galeria', 'Galeria', 'images-outline'],
    ['conteudo', 'Novidades', 'newspaper-outline'],
    ...(media.length ? [['midia', 'Músicas', 'musical-notes-outline']] : []),
  ];
  const add = (id) => {
    dispatch({ type: 'ADD_TO_CART', productId: id });
    Alert.alert('No carrinho', 'Produto adicionado. Finalize na aba Loja.');
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        {/* Topo noturno com brilho dourado e azul */}
        <View style={styles.hero}>
          {/* Foto da empresa (estrutura), nunca uma foto pessoal */}
          <Photo uri={((b.gallery || []).find((ph) => ph.type === 'estrutura') || {}).photo || p.cover} style={styles.heroImg} fallback={p.logo} />
          <View style={styles.heroShade} />
          <View style={[styles.blob, { backgroundColor: 'rgba(226,182,73,0.32)', width: 260, height: 260, top: -90, right: -80 }]} />
          <View style={[styles.blob, { backgroundColor: 'rgba(47,116,208,0.30)', width: 220, height: 220, top: 120, left: -90 }]} />
          <View style={styles.gridLine} />
          <TouchableOpacity onPress={close} style={[styles.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={[styles.heroBody, { paddingTop: insets.top + 70 }]}>
            <OrbitLogo logo={p.logo} />
            <Text style={styles.heroName}>{p.name}</Text>
            {b.tagline ? <Text style={styles.tagline}>{b.tagline}</Text> : null}
            <LiveNowBadge hostType="empresa" hostId={p.id} />
            <View style={styles.badges}>
              <View style={styles.glassBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.gold} />
                <Text style={styles.glassBadgeText}>CNPJ verificado</Text>
              </View>
              <View style={styles.glassBadge}>
                <Ionicons name="location-outline" size={12} color="#9CC3FF" />
                <Text style={styles.glassBadgeText}>{p.city}</Text>
              </View>
              {isMine ? (
                <View style={[styles.glassBadge, { borderColor: 'rgba(30,158,99,0.7)' }]}>
                  <Text style={[styles.glassBadgeText, { color: '#7BE0B0' }]}>Sua página</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.stats}>
              {[
                [count(p.followers + (following ? 1 : 0)), 'seguidores'],
                [`★ ${String(avg).replace('.', ',')}`, 'nota'],
                [String(reviews.length), 'depoimentos'],
                [b.since ? String(b.since) : String(products.length), b.since ? 'desde' : 'produtos'],
              ].map(([v, l], i) => (
                <View key={l} style={[styles.stat, i > 0 && styles.statSep]}>
                  <Text style={styles.statValue}>{v}</Text>
                  <Text style={styles.statLabel}>{l}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <TouchableOpacity style={[styles.cta, { flex: 1 }, following && styles.ctaOn]} onPress={() => dispatch({ type: 'FOLLOW', id: p.id })}>
                <Ionicons name={following ? 'checkmark' : 'add'} size={16} color={following ? colors.gold : NIGHT} />
                <Text style={[styles.ctaText, following && { color: colors.gold }]}>{following ? 'Seguindo a empresa' : 'Seguir empresa'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.glassBtn, { flex: 1, marginLeft: 8 }]} onPress={() => Alert.alert('Atendimento', `Atendimento de ${p.name} aberto no chat do Realys.${b.contact ? `\n\n${b.contact}` : ''}`)}>
                <Ionicons name="headset-outline" size={16} color="#FFFFFF" />
                <Text style={styles.glassBtnText}>Atendimento</Text>
              </TouchableOpacity>
            </View>

            {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
            {p.hours ? <Text style={styles.hours}>🕒 {p.hours}</Text> : null}

            <Text style={styles.heroH}>FICHA DA EMPRESA</Text>
            <CompanyFacts b={b} />

            <Text style={styles.heroH}>ONDE ATUA</Text>
            <SectorCards sectors={b.sectors} />

            {b.serves || modes.length ? (
              <>
                <Text style={styles.heroH}>ONDE ATENDE</Text>
                <View style={styles.serve}>
                  {b.serves ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: modes.length ? 8 : 0 }}>
                      <Ionicons name="navigate-circle-outline" size={18} color="#9CC3FF" />
                      <Text style={styles.serveText}>{b.serves}</Text>
                    </View>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {modes.map((m) => (
                      <View key={m.key} style={styles.mode}>
                        <Ionicons name={m.icon} size={12} color={colors.gold} />
                        <Text style={styles.modeText}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* Guias */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}>
          {tabs.map(([k, label, icon]) => {
            const on = tab === k;
            return (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tab, on && styles.tabOn]}>
                <Ionicons name={icon} size={15} color={on ? NIGHT : colors.primary} />
                <Text style={[styles.tabText, on && { color: NIGHT }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          {tab === 'vitrine' ? (
            showcase.length ? (
              <>
                <ProductCard x={showcase[0]} onAdd={add} big />
                <View style={styles.grid}>
                  {showcase.slice(1).map((x) => (
                    <ProductCard key={x.id} x={x} onAdd={add} />
                  ))}
                </View>
                {products.length > showcase.length ? (
                  <TouchableOpacity style={styles.more} onPress={() => setTab('produtos')}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Ver todos os {products.length} produtos</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <Text style={styles.empty}>A vitrine ainda está vazia.</Text>
            )
          ) : null}

          {tab === 'produtos' ? (
            products.length ? (
              <View style={styles.grid}>
                {products.map((x) => (
                  <ProductCard key={x.id} x={x} onAdd={add} />
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>Nenhum produto publicado ainda.</Text>
            )
          ) : null}

          {tab === 'depoimentos' ? (
            <>
              <ReviewSummary reviews={b.reviews} />
              {!isMine && !writing ? (
                bought ? (
                  <TouchableOpacity style={[styles.cta, { marginBottom: 12 }]} onPress={() => setWriting(true)}>
                    <Ionicons name="create-outline" size={16} color={NIGHT} />
                    <Text style={styles.ctaText}>Escrever depoimento</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.sub, { textAlign: 'center', marginBottom: 12 }]}>Só quem comprou aqui pelo Realys pode escrever depoimento.</Text>
                )
              ) : null}
              {writing ? <WriteReview company={p} onClose={() => setWriting(false)} /> : null}
              {reviews.length ? reviews.map((rv) => <ReviewCard key={rv.id} rv={rv} />) : <Text style={styles.empty}>Nenhum depoimento exposto ainda.</Text>}
            </>
          ) : null}

          {tab === 'propagandas' ? <AdList ads={b.ads || []} /> : null}

          {tab === 'galeria' ? <Gallery photos={b.gallery || []} /> : null}

          {tab === 'conteudo' ? (
            posts.length ? (
              posts.map((x) => (
                <View key={x.id} style={styles.post}>
                  <Photo uri={x.image} style={{ width: '100%', height: 220 }} />
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: colors.text }}>{x.text}</Text>
                    <Text style={[styles.sub, { marginTop: 4 }]}>♥ {x.likes} · {x.comments} comentários</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Nenhuma novidade publicada ainda.</Text>
            )
          ) : null}

          {tab === 'midia' && MediaList ? <MediaList items={media} /> : null}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: NIGHT, overflow: 'hidden', paddingBottom: 22 },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, opacity: 0.55 },
  heroShade: { position: 'absolute', top: 120, left: 0, right: 0, height: 140, backgroundColor: NIGHT, opacity: 0.55 },
  blob: { position: 'absolute', borderRadius: 999 },
  gridLine: { position: 'absolute', top: 258, left: 0, right: 0, height: 1, backgroundColor: 'rgba(226,182,73,0.35)' },
  back: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(11,17,36,0.55)', borderWidth: 1, borderColor: GLASS_BD, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  heroBody: { paddingHorizontal: 16 },

  logoWrap: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  logoGlow: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: colors.gold },
  orbit: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: 'rgba(226,182,73,0.8)', borderStyle: 'dashed' },
  orbitDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  logo: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },

  heroName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 12, letterSpacing: 0.3 },
  tagline: { color: colors.gold, fontSize: 14, fontWeight: '700', marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  glassBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BD, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  glassBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 4 },

  stats: { flexDirection: 'row', backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BD, borderRadius: 18, paddingVertical: 12, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statSep: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' },
  statValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 2, textTransform: 'uppercase' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.gold },
  ctaOn: { backgroundColor: 'transparent' },
  ctaText: { color: NIGHT, fontWeight: '800', marginLeft: 6 },
  ctaGhost: { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  glassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS, borderRadius: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  glassBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 },

  bio: { color: 'rgba(255,255,255,0.88)', marginTop: 14, lineHeight: 20 },
  hours: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  heroH: { color: 'rgba(226,182,73,0.9)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginTop: 20, marginBottom: 10 },

  sector: { width: 220, backgroundColor: NIGHT2, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BD, padding: 12, marginRight: 10 },
  sectorHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectorIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,182,73,0.12)' },
  sectorLabel: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8, flex: 1 },
  segWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  seg: { backgroundColor: 'rgba(95,162,255,0.14)', borderWidth: 1, borderColor: 'rgba(95,162,255,0.4)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 5, marginBottom: 5 },
  segText: { color: '#CFE2FF', fontSize: 11, fontWeight: '700' },
  emptyDark: { color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },

  serve: { backgroundColor: GLASS, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', padding: 12 },
  serveText: { color: '#FFFFFF', marginLeft: 6, flex: 1, fontWeight: '600' },
  mode: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: GLASS_BD, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  modeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 4 },

  tabsBar: { backgroundColor: '#FFFDF8', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', marginRight: 8 },
  tabOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13, marginLeft: 5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pCard: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginBottom: 10, alignItems: 'center', ...soft },
  pCardBig: { width: '100%', borderColor: colors.gold, borderWidth: 1.5, paddingVertical: 16, overflow: 'hidden' },
  pGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(226,182,73,0.16)', top: -90 },
  launch: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  price: { color: colors.primary, fontWeight: '800', marginVertical: 5, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  addText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, marginLeft: 4 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },

  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: NIGHT, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: GLASS_BD },
  avg: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  barLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, width: 12 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.gold },
  review: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 10, ...soft },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  verified: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,158,99,0.1)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedText: { color: colors.success, fontSize: 10, fontWeight: '700', marginLeft: 3 },
  reviewText: { color: colors.text, marginTop: 10, lineHeight: 20 },
  reviewProduct: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 6 },
  write: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: colors.gold, padding: 12, marginBottom: 12 },
  writeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, minHeight: 80, textAlignVertical: 'top', color: colors.text },

  ad: { borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: NIGHT, borderWidth: 1, borderColor: GLASS_BD },
  adImg: { width: '100%', height: 200 },
  adShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, backgroundColor: 'rgba(11,17,36,0.72)' },
  adTag: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  adTagText: { color: NIGHT, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginLeft: 3 },
  adPlay: { position: 'absolute', top: 64, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(11,17,36,0.55)', borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  adInfo: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  adTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  adSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  adBar: { position: 'absolute', bottom: 0, left: 0, height: 3, backgroundColor: colors.gold },

  facts: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 12 },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9 },
  factSep: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  factLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', width: 104, marginLeft: 8 },
  factValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', flex: 1 },
  gType: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  gTypeOn: { backgroundColor: NIGHT, borderColor: NIGHT },
  gTypeText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  gItem: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10, overflow: 'hidden', ...soft },
  gImg: { width: '100%', height: 140 },
  gTag: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(11,17,36,0.75)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: GLASS_BD },
  gTagText: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  gCaption: { color: colors.text, fontSize: 12, fontWeight: '600', padding: 8 },
  viewer: { flex: 1, backgroundColor: 'rgba(11,17,36,0.94)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  viewerImg: { width: '100%', height: 360, borderRadius: 16 },
  viewerText: { color: '#FFFFFF', fontWeight: '700', marginTop: 12, textAlign: 'center' },
  post: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 12, overflow: 'hidden', ...soft },
  title: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 20 },
});
