import React, { useState, useEffect } from 'react';
import { LiveNowBadge } from './LiveBits';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { Photo, ProductThumb, Badge, Row } from './ui';
import { artists, artMedia, companyPages } from '../extraData';
import { MY_COMPANY_ID } from '../data';
import { BusinessPageModal } from './BusinessPage';

const count = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',').replace(',0', '') + ' mil' : String(n));

// Página pública: serve para empresas (lojas, restaurantes…) e para artistas.
export function profileById(state, id) {
  const a = artists.find((x) => x.id === id);
  if (a) return { ...a, kind: 'artista', category: a.genre };
  const s = (state.stores || []).find((x) => x.id === id);
  if (!s) return null;
  const page = { ...(companyPages[id] || {}), ...(id === MY_COMPANY_ID ? state.myPage : {}) };
  return { ...s, kind: 'empresa', bio: page.bio || '', hours: page.hours, followers: page.followers || 0, verified: true };
}

// Criações do Estúdio (no Perfil) marcadas para a parte empresarial também aparecem na página da empresa.
const studioMedia = (state, id) =>
  id !== MY_COMPANY_ID
    ? []
    : (state.creations || [])
        .filter((c) => c.dest && c.dest.empresa)
        .map((c) => ({
          id: 'cr-' + c.id,
          ownerId: id,
          kind: c.kind === 'musica' ? 'musica' : c.kind === 'video' ? 'video' : 'obra',
          title: c.title,
          length: c.kind === 'musica' ? '3:30' : c.kind === 'video' ? 'vídeo' : 'do Estúdio',
          plays: 0,
          price: 0,
          cover: c.cover,
          file: c.file,
          studio: true,
        }));
export const mediaOf = (state, id) => [...studioMedia(state, id), ...(state.myMedia || []).filter((m) => m.ownerId === id), ...artMedia.filter((m) => m.ownerId === id)];

// Lista de faixas, vídeos e obras com tocador simples.
export function MediaList({ items, showOwner }) {
  const { state, dispatch } = useStore();
  const [playing, setPlaying] = useState(null);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    setPos(0);
    const id = setInterval(() => setPos((p) => (p >= 100 ? 100 : p + 2)), 600);
    return () => clearInterval(id);
  }, [playing]);

  const owned = (m) => !m.price || state.boughtMedia[m.id] || m.ownerId === MY_COMPANY_ID;
  const play = (m) => {
    if (m.kind === 'obra') return;
    setPlaying(playing === m.id ? null : m.id);
  };
  const buy = (m) => {
    if (m.price > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para comprar.');
    Alert.alert(m.kind === 'obra' ? 'Comprar obra' : 'Comprar faixa', `${m.title} por ${brl(m.price)} com saldo Realys?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Comprar',
        onPress: () => {
          dispatch({ type: 'BUY_MEDIA', id: m.id, price: m.price });
          Alert.alert('Compra feita ✅', m.kind === 'obra' ? 'O artista vai combinar a entrega com você pelo chat.' : 'A faixa completa já está liberada e pode ser baixada em MP3.');
        },
      },
    ]);
  };

  if (!items.length) return <Text style={styles.empty}>Nada publicado ainda.</Text>;
  return (
    <View>
      {items.map((m) => {
        const owner = showOwner ? artists.find((a) => a.id === m.ownerId) : null;
        const on = playing === m.id;
        if (m.kind === 'video') {
          return (
            <TouchableOpacity key={m.id} style={styles.videoCard} activeOpacity={0.9} onPress={() => play(m)}>
              <Photo uri={m.cover} style={styles.video} fallback="🎬" />
              <View style={styles.videoOverlay}>
                <Ionicons name={on ? 'pause-circle' : 'play-circle'} size={52} color="#FFFFFF" />
              </View>
              {on ? <View style={[styles.videoBar, { width: `${pos}%` }]} /> : null}
              <View style={{ padding: 10 }}>
                <Text style={styles.title} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.sub}>
                  {owner ? `${owner.name} · ` : ''}vídeo · {m.length} · {count(m.plays)} visualizações
                </Text>
              </View>
            </TouchableOpacity>
          );
        }
        return (
          <View key={m.id} style={styles.row}>
            <TouchableOpacity onPress={() => (m.kind === 'obra' ? null : play(m))} activeOpacity={0.85}>
              <Photo uri={m.cover} style={m.kind === 'obra' ? styles.art : styles.cover} fallback={m.kind === 'obra' ? '🖼️' : '🎵'} />
              {m.kind === 'musica' ? (
                <View style={styles.playDot}>
                  <Ionicons name={on ? 'pause' : 'play'} size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title} numberOfLines={2}>{m.title}</Text>
              <Text style={styles.sub}>
                {owner ? `${owner.name} · ` : ''}
                {m.kind === 'obra' ? `obra · ${m.length}` : `MP3 · ${m.length} · ${count(m.plays)} plays`}
              </Text>
              {on ? (
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${owned(m) ? pos : Math.min(pos, 30)}%` }]} />
                </View>
              ) : null}
              {on && !owned(m) ? <Text style={[styles.sub, { color: colors.accent }]}>Prévia de 30 s · compre para ouvir inteira</Text> : null}
            </View>
            {m.price && !owned(m) ? (
              <TouchableOpacity style={styles.buy} onPress={() => buy(m)}>
                <Text style={styles.buyText}>{brl(m.price)}</Text>
              </TouchableOpacity>
            ) : m.kind === 'musica' ? (
              <Ionicons name="download-outline" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// Abre por cima de qualquer tela (dispatch OPEN_COMPANY).
export function CompanyProfileModal() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('produtos');
  const p = state.viewCompany ? profileById(state, state.viewCompany) : null;
  const isArtist = p && p.kind === 'artista';
  useEffect(() => setTab(isArtist ? 'musica' : 'produtos'), [state.viewCompany]);
  if (!p) return null;
  // Empresas: página empresarial futurista (onde atua, segmentos, vitrine, depoimentos, propagandas).
  if (!isArtist) return <BusinessPageModal p={p} media={mediaOf(state, p.id)} MediaList={MediaList} />;

  const close = () => dispatch({ type: 'CLOSE_COMPANY' });
  const following = !!state.following[p.id];
  const media = mediaOf(state, p.id);
  const products = state.products.filter((x) => x.storeId === p.id);
  const posts = state.posts.filter((x) => x.storeId === p.id);
  const tabs = isArtist
    ? [['musica', 'Músicas'], ['video', 'Vídeos'], ['obra', 'Obras']]
    : [['produtos', 'Produtos'], ['conteudo', 'Conteúdos'], ['midia', 'Vídeos e músicas']];
  const add = (id) => {
    dispatch({ type: 'ADD_TO_CART', productId: id });
    Alert.alert('No carrinho', 'Produto adicionado. Finalize na aba Loja.');
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <Photo uri={p.cover} style={{ width: '100%', height: 160 }} fallback={p.logo} />
        <TouchableOpacity onPress={close} style={[styles.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.logo}>
            <Text style={{ fontSize: 34 }}>{p.logo}</Text>
          </View>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.sub}>
            {isArtist ? 'Artista' : 'Empresa'} · {p.category} · {p.city} · <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {p.rating}</Text>
          </Text>
          <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {p.verified ? <Badge label={isArtist ? 'Artista verificado' : 'CNPJ verificado'} /> : null}
            {p.shipsBrazil ? <View style={{ marginLeft: 6 }}><Badge label="Envia para todo o Brasil" color={colors.accent} /></View> : null}
            {p.id === MY_COMPANY_ID ? <View style={{ marginLeft: 6 }}><Badge label="Sua página" color={colors.success} /></View> : null}
          </Row>
          {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
          <LiveNowBadge hostType="artista" hostId={p.id} />
          {p.hours ? <Text style={styles.sub}>🕒 {p.hours}</Text> : null}
          <Text style={[styles.sub, { marginTop: 6 }]}>{count(p.followers + (following ? 1 : 0))} seguidores</Text>

          <Row style={{ marginTop: 12 }}>
            <TouchableOpacity style={[styles.btn, following && styles.btnOff]} onPress={() => dispatch({ type: 'FOLLOW', id: p.id })}>
              <Ionicons name={following ? 'checkmark' : 'add'} size={16} color={following ? colors.primary : '#FFFFFF'} />
              <Text style={[styles.btnText, following && { color: colors.primary }]}>{following ? 'Seguindo' : 'Seguir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOff, { marginLeft: 8 }]} onPress={() => Alert.alert('Mensagem', `Conversa com ${p.name} aberta no chat do Realys.`)}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>Mensagem</Text>
            </TouchableOpacity>
          </Row>

          <Row style={styles.tabs}>
            {tabs.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
                <Text style={[styles.tabText, tab === k && { color: colors.primary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </Row>

          {tab === 'produtos' ? (
            products.length ? (
              <View style={styles.grid}>
                {products.map((x) => (
                  <View key={x.id} style={styles.pCard}>
                    <ProductThumb product={x} size={84} />
                    <Text style={styles.title} numberOfLines={2}>{x.name}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '800', marginVertical: 4 }}>{brl(x.price)}</Text>
                    {x.stock > 0 ? (
                      <TouchableOpacity style={styles.addBtn} onPress={() => add(x.id)}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>+ Carrinho</Text>
                      </TouchableOpacity>
                    ) : (
                      <Badge label="Esgotado" color={colors.danger} />
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>Nenhum produto publicado ainda.</Text>
            )
          ) : null}

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
              <Text style={styles.empty}>Nenhum conteúdo publicado ainda.</Text>
            )
          ) : null}

          {tab === 'midia' ? <MediaList items={media} /> : null}
          {isArtist ? <MediaList items={media.filter((m) => m.kind === tab)} /> : null}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 76, height: 76, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: -38 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  bio: { color: colors.text, marginTop: 10, lineHeight: 20 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.primary },
  btnOff: { backgroundColor: '#FFFFFF' },
  btnText: { color: '#FFFFFF', fontWeight: '800', marginLeft: 6 },
  tabs: { marginTop: 16, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  tabText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pCard: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 10, alignItems: 'center' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  post: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden' },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 8 },
  cover: { width: 56, height: 56, borderRadius: 10 },
  art: { width: 72, height: 72, borderRadius: 8 },
  playDot: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  title: { fontWeight: '700', color: colors.text },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: colors.primary },
  buy: { backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  buyText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  videoCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' },
  video: { width: '100%', height: 180 },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,42,68,0.25)' },
  videoBar: { position: 'absolute', top: 177, left: 0, height: 3, backgroundColor: colors.primary },
});
