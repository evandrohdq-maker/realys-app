// Perfil de uma conta real (servidor): abre ao tocar no nome ou na foto de quem está no Realyz de
// verdade (busca de pessoas, Contatos, pedidos de amizade). Mostra foto, nome, *usuário, o que a
// pessoa escreveu sobre ela, a amizade (Adicionar, Aceitar, Enviado, Amigos), Mensagem e as
// publicações e depoimentos que ela deixou visíveis.
// Perfil social é atividade entre amigos: quem pode ver o social vê tudo — capa, publicações,
// galeria (fotos, vídeos, destaques), mural e depoimentos — e pode conversar.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Photo, PostPhoto } from './ui';
import { api, API_URL } from '../api';
import { addFriend, removeFriend } from '../serverFriends';
import { openMedia } from './MediaViewer';
import { futureTheme } from './ThemeArt';
import { GamerCard } from './GamerProfile';
import { TestimonialComposer } from './SocialProfile';

import { openServerProfile, useServerProfileOpen, bindProfileHost, setOpenNow } from '../profileOpen';
export { openServerProfile, useServerProfileOpen };
const full = (u) => (u && u.startsWith('/') ? API_URL + u : u || null);

export function ServerProfileHost() {
  const [aberto, setAberto] = useState(null); // { id, preview }
  useEffect(() => bindProfileHost((id, preview) => setAberto({ id, preview: preview || null })), []);
  const id = aberto ? aberto.id : null;
  useEffect(() => setOpenNow(!!id), [id]);
  if (!id) return null;
  return <ServerProfile key={id} id={id} preview={aberto.preview} onClose={() => setAberto(null)} />;
}

function ServerProfile({ id, preview, onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [aba, setAba] = useState('posts');
  const [depOpen, setDepOpen] = useState(false); // escrever depoimento para esta pessoa (só amigos)
  const { width } = useWindowDimensions();
  const load = () => {
    setErr(null);
    // Nunca fica carregando para sempre: sem resposta em 12 s, avisa e oferece tentar de novo.
    let respondeu = false;
    const t = setTimeout(() => !respondeu && setErr('O perfil demorou para abrir. Confira a internet e tente de novo.'), 12000);
    return api('GET', `/users/${id}`)
      .then((d) => { respondeu = true; setErr(null); setP(d && d.id ? d : { id, name: (preview && preview.name) || '', friend: null }); })
      .catch((e) => { respondeu = true; setErr(e.message || 'Não deu para abrir este perfil.'); })
      .finally(() => clearTimeout(t));
  };
  useEffect(() => {
    load();
  }, [id]);
  const first = p ? (p.name || '').split(' ')[0] : '';
  const act = (fn, next) => {
    setBusy(true);
    fn()
      .then((r) => {
        // Mostra o resultado na hora (Aceitar vira Amigos), sem esperar o perfil recarregar.
        const status = (r && r.status) || next;
        if (status !== undefined) setP((x) => (x ? { ...x, friend: status === 'amigos' ? 'amigos' : status } : x));
        return load();
      })
      .catch((e) => Alert.alert('Não deu certo', e.message || 'Confira a internet e tente de novo.'))
      .finally(() => setBusy(false));
  };
  const aceitar = () => act(() => addFriend(id), 'amigos');
  const recusar = () => act(() => removeFriend(id), null);
  const adicionar = () => act(() => addFriend(id), 'enviado');
  const unfriend = () =>
    Alert.alert('Desfazer amizade?', `Você e ${first} deixam de ser amigos no Realyz.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Desfazer', style: 'destructive', onPress: () => act(() => removeFriend(id)) },
    ]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[st.cover, { height: 140 + insets.top, paddingTop: insets.top + 8 }]}>
          {p && p.cover ? <Photo uri={full(p.cover)} style={StyleSheet.absoluteFill} fallback="" /> : null}
          {/* Faixa escura em cima: hora e bateria do celular continuam legíveis por cima da capa. */}
          {p && p.cover ? <View pointerEvents="none" style={[st.coverShade, { height: insets.top + 10 }]} /> : null}
          <TouchableOpacity onPress={onClose} style={st.back} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        {!p && preview ? (
          // Prévia na hora (nome e foto de quem postou): já dá para adicionar enquanto o resto carrega.
          <View style={{ paddingHorizontal: 16 }}>
            <View style={st.avatarWrap}>
              {preview.photo ? <Photo uri={full(preview.photo)} style={st.avatar} fallback="🙂" /> : (
                <View style={[st.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: colors.onPrimary, fontWeight: '900', fontSize: 34 }}>{(preview.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={st.name}>{preview.name}</Text>
            {preview.username ? <Text style={st.handle}>*{preview.username}</Text> : null}
            {preview.friend === 'recebido' ? <Text style={st.ask}>{(preview.name || '').split(' ')[0]} quer ser seu amigo no Realyz.</Text> : null}
            <View style={st.row}>
              {preview.friend === 'recebido' ? (
                <>
                  <Btn icon="checkmark" label={busy ? 'Aceitando…' : 'Aceitar'} solid onPress={busy ? undefined : aceitar} />
                  <Btn icon="close" label="Recusar" onPress={busy ? undefined : recusar} />
                </>
              ) : preview.friend === 'amigos' || preview.friend === 'enviado' ? null : (
                <Btn icon="person-add" label={busy ? '…' : 'Adicionar'} solid onPress={busy ? undefined : adicionar} />
              )}
            </View>
          </View>
        ) : null}
        {!p && !err ? <ActivityIndicator color={colors.primary} style={{ marginTop: preview ? 16 : 40 }} /> : null}
        {err ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={st.err}>{err}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }} accessibilityLabel="Tentar de novo">
              <Text style={{ color: colors.primary, fontWeight: '800' }}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {p ? (
          <View style={{ paddingHorizontal: 16 }}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => p.photo && openMedia([{ photo: full(p.photo), title: p.name }])} style={st.avatarWrap} accessibilityLabel={`Foto de ${p.name}`}>
              {p.photo ? (
                <Photo uri={full(p.photo)} style={st.avatar} fallback="🙂" />
              ) : (
                <View style={[st.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: colors.onPrimary, fontWeight: '900', fontSize: 34 }}>{first.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={st.name}>
              {p.name}{p.verified ? <> <Ionicons name="shield-checkmark" size={16} color={colors.primary} /></> : null}
            </Text>
            {p.username ? <Text style={st.handle}>*{p.username}</Text> : null}
            {p.teste ? <Text style={st.teste}>Conta de teste</Text> : null}
            {p.about ? <Text style={st.about}>{p.about}</Text> : null}
            {!p.negocio && p.visible !== false ? (
              <View style={st.stats}>
                {[[(p.posts || []).length, (p.posts || []).length === 1 ? 'publicação' : 'publicações', 'posts'], [(p.testimonials || []).length, (p.testimonials || []).length === 1 ? 'depoimento' : 'depoimentos', 'dep']].map(([n, l, k]) => (
                  <TouchableOpacity key={k} style={st.stat} onPress={() => setAba(k)} accessibilityLabel={`${n} ${l}`}>
                    <Text style={st.statN}>{n}</Text>
                    <Text style={st.statL}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {p.friend === 'recebido' && !p.negocio ? <Text style={st.ask}>{first} quer ser seu amigo no Realyz.</Text> : null}

            {p.negocio && p.friend !== 'amigos' ? (
              // Perfil profissional (empresa ou prestador): página para seguir, como nas redes grandes.
              // Não é contato: sem "Adicionar" e sem mensagem. Comprar e contratar é pela vitrine.
              <>
                <Text style={st.pagina}>
                  {p.seguidores || 0} seguidor{(p.seguidores || 0) === 1 ? '' : 'es'} · {p.curtidas || 0} curtida{(p.curtidas || 0) === 1 ? '' : 's'}
                </Text>
                <View style={st.row}>
                  <Btn icon={p.seguindo ? 'checkmark' : 'add'} label={busy ? '…' : p.seguindo ? 'Seguindo' : 'Seguir'} solid={!p.seguindo} onPress={busy ? undefined : () => act(() => api('POST', `/seguir/${id}`))} />
                  <Btn icon={p.curtiu ? 'heart' : 'heart-outline'} label="Curtir" onPress={busy ? undefined : () => act(() => api('POST', `/curtir-perfil/${id}`))} />
                  <Btn icon="create-outline" label="Depoimento" onPress={() => setDepOpen(true)} />
                </View>
                <View style={[st.row, { marginTop: 8 }]}>
                  <Btn
                    icon={p.kind === 'empresa' ? 'storefront-outline' : 'construct-outline'}
                    label={p.kind === 'empresa' ? 'Ver vitrine' : 'Contratar'}
                    solid
                    onPress={() => {
                      onClose();
                      if (p.kind === 'empresa' && p.company) dispatch({ type: 'OPEN_COMPANY', id: p.company.id });
                      else dispatch({ type: 'NAV_REQUEST', go: { tab: 'servicos' } });
                    }}
                  />
                </View>
              </>
            ) : (
            <View style={st.row}>
              {p.friend === 'amigos' ? (
                <>
                  <Btn icon="chatbubble-ellipses" label="Mensagem" solid onPress={() => (onClose(), dispatch({ type: 'OPEN_SERVER_CHAT', userId: p.id, name: p.name }))} />
                  <Btn icon="create-outline" label="Depoimento" onPress={() => setDepOpen(true)} />
                  <Btn icon="checkmark-circle" label="Amigos" onPress={unfriend} />
                </>
              ) : p.friend === 'enviado' ? (
                <Btn icon="time-outline" label="Pedido enviado" onPress={() => Alert.alert('Pedido enviado', `Quando ${first} aceitar, vocês viram amigos.`)} />
              ) : p.friend === 'recebido' ? (
                <>
                  <Btn icon="checkmark" label={busy ? 'Aceitando…' : 'Aceitar'} solid onPress={busy ? undefined : aceitar} />
                  <Btn icon="close" label="Recusar" onPress={busy ? undefined : recusar} />
                </>
              ) : (
                <Btn icon="person-add" label={busy ? '…' : 'Adicionar'} solid onPress={busy ? undefined : adicionar} />
              )}
            </View>
            )}

            {p.visible === false ? (
              <View style={st.locked}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <Text style={[st.small, { marginLeft: 8, flex: 1 }]}>{first} mostra as publicações só para amigos.</Text>
              </View>
            ) : null}

            {p.visible !== false && p.gamer ? <GamerCard g={p.gamer} /> : null}

            {p.visible !== false ? (
              <View style={st.tabs}>
                {[['posts', 'Publicações'], ['galeria', 'Galeria'], ['mural', 'Mural'], ['dep', 'Depoimentos']].map(([k, l]) => (
                  <TouchableOpacity key={k} onPress={() => setAba(k)} style={st.tab} accessibilityLabel={l}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[st.tabText, aba === k && st.tabOn]}>{l}</Text>
                    {aba === k ? <View style={st.tabLine} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {p.visible !== false && aba === 'posts' ? (
              <>
                {(p.posts || []).map((x) => (
                  <View key={x.id} style={st.post}>
                    {x.text ? <Text style={{ color: colors.text, lineHeight: 20 }}>{x.text}</Text> : null}
                    {x.media ? (
                      <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(x.media) ? { video: full(x.media) } : { photo: full(x.media) }])}>
                        <PostPhoto uri={full(x.media)} style={st.postImg} fallback="🖼️" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
                {!(p.posts || []).length ? <Text style={st.small}>{first} ainda não publicou nada.</Text> : null}
              </>
            ) : null}

            {p.visible !== false && aba === 'galeria' ? <Galeria g={p.gallery} first={first} width={width} /> : null}
            {p.visible !== false && aba === 'mural' ? <MuralAmigo m={p.mural} first={first} /> : null}

            {aba === 'dep' || p.visible === false ? (
              <>
                {(p.testimonials || []).length ? <Text style={st.h}>Depoimentos</Text> : null}
                {(p.testimonials || []).map((t) => (
                  <View key={t.id} style={st.post}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{t.fromName}</Text>
                    <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{t.text}</Text>
                  </View>
                ))}
                {p.visible !== false && !(p.testimonials || []).length ? <Text style={st.small}>{first} ainda não tem depoimentos.</Text> : null}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {p ? <TestimonialComposer visible={depOpen} toId={p.id} onClose={() => setDepOpen(false)} /> : null}
    </Modal>
  );
}

// Galeria do amigo: fotos em grade, vídeos e destaques (toque abre em tela cheia).
function Galeria({ g, first, width }) {
  const photos = (g && g.photos) || [];
  const videos = (g && g.videos) || [];
  const highlights = (g && g.highlights) || [];
  const tile = Math.floor((width - 32 - 8) / 3);
  if (!photos.length && !videos.length && !highlights.length) return <Text style={st.small}>{first} ainda não colocou nada na galeria.</Text>;
  const fotos = photos.map((x) => ({ photo: full(x.uri) }));
  return (
    <View>
      {highlights.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {highlights.map((h) => (
            <TouchableOpacity key={h.id} style={{ alignItems: 'center', marginRight: 14, width: 68 }} onPress={() => openMedia(h.items.map((i) => (i.video ? { video: full(i.video), photo: full(i.image), title: i.caption || h.title } : { photo: full(i.image), title: i.caption || h.title })))} accessibilityLabel={`Destaque ${h.title}`}>
              <Photo uri={full(h.cover || (h.items[0] && h.items[0].image))} style={st.hl} fallback="✨" />
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>{h.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {photos.length ? <Text style={st.h}>Fotos</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {photos.map((x, i) => (
          <TouchableOpacity key={x.id} activeOpacity={0.9} onPress={() => openMedia(fotos, i)} style={{ marginRight: i % 3 === 2 ? 0 : 4, marginBottom: 4 }} accessibilityLabel="Abrir foto">
            <Photo uri={full(x.uri)} style={{ width: tile, height: tile, borderRadius: 8 }} fallback="🖼️" />
          </TouchableOpacity>
        ))}
      </View>
      {videos.length ? <Text style={st.h}>Vídeos</Text> : null}
      {videos.map((v) => (
        <TouchableOpacity key={v.id} activeOpacity={0.9} onPress={() => openMedia([{ video: full(v.uri || v.video), title: v.title }])} style={st.video} accessibilityLabel={`Vídeo ${v.title || ''}`}>
          <Ionicons name="play-circle" size={30} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>{v.title || 'Vídeo'}</Text>
            {v.duration ? <Text style={st.small}>{v.duration}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Mural do amigo: do jeito que ele montou (tema, fixados em cima, recados e fotos).
function MuralAmigo({ m, first }) {
  const items = ((m && m.items) || []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.at || 0) - (a.at || 0));
  if (!items.length) return <Text style={st.small}>{first} ainda não montou o mural.</Text>;
  const t = futureTheme(m.theme) || {};
  return (
    <View style={[st.mural, { backgroundColor: t.from || '#04121C' }]}>
      {items.map((x) => (
        <View key={x.id} style={[st.muralItem, { backgroundColor: x.type === 'recado' ? x.color || '#FFF3C4' : t.card || 'rgba(255,255,255,0.1)' }]}>
          {x.pinned ? <Ionicons name="pin" size={13} color="#8A6208" style={{ alignSelf: 'flex-end' }} /> : null}
          {x.type === 'post' && (x.image || x.video) ? (
            <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([x.video ? { video: full(x.video), photo: full(x.image) } : { photo: full(x.image), title: x.text }])}>
              {x.image ? <Photo uri={full(x.image)} style={{ width: '100%', height: x.big ? 240 : 170, borderRadius: 10 }} fallback="🖼️" /> : (
                <View style={{ height: 150, borderRadius: 10, backgroundColor: '#14120E', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play-circle" size={44} color="#F5C331" /></View>
              )}
            </TouchableOpacity>
          ) : null}
          {x.type === 'foto' ? (
            <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([{ photo: full(x.uri), title: x.text }])}>
              <Photo uri={full(x.uri)} style={{ width: '100%', height: x.big ? 240 : 170, borderRadius: 10 }} fallback="🖼️" />
            </TouchableOpacity>
          ) : null}
          {x.text ? <Text style={{ color: x.type === 'recado' ? '#1B1B1B' : t.text || '#fff', marginTop: x.type === 'recado' ? 0 : 6, fontSize: x.big ? 17 : 15, lineHeight: 21 }}>{x.text}</Text> : null}
          {x.time ? <Text style={{ color: x.type === 'recado' ? '#6B6B6B' : t.muted || '#ccc', fontSize: 11, marginTop: 4 }}>{x.time}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Btn({ icon, label, onPress, solid }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.btn, solid ? st.btnSolid : st.btnLine]} activeOpacity={0.85} accessibilityLabel={label}>
      <Ionicons name={icon} size={16} color={solid ? colors.onPrimary : colors.primary} />
      <Text numberOfLines={1} style={[st.btnText, { color: solid ? colors.onPrimary : colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  pagina: { color: colors.muted, fontSize: 12.5, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 2 },
  cover: { height: 140, backgroundColor: '#F1E7CF', paddingHorizontal: 14, overflow: 'hidden' },
  coverShade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  ask: { color: colors.text, marginTop: 10, fontWeight: '600' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { marginTop: -48, alignSelf: 'flex-start', borderRadius: 50, borderWidth: 3, borderColor: colors.gold, backgroundColor: colors.bg },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  handle: { color: colors.muted, marginTop: 2 },
  about: { color: colors.text, marginTop: 10, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 18, marginRight: 6, marginBottom: 8 },
  btnSolid: { backgroundColor: colors.primary },
  btnLine: { backgroundColor: 'transparent', paddingHorizontal: 10 },
  btnText: { fontWeight: '700', marginLeft: 6 },
  stats: { flexDirection: 'row', marginTop: 12 },
  stat: { marginRight: 22 },
  statN: { color: colors.text, fontWeight: '800', fontSize: 16 },
  statL: { color: colors.muted, fontSize: 12 },
  teste: { alignSelf: 'flex-start', marginTop: 4, color: '#7A5806', backgroundColor: '#FFF4D6', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  locked: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 12, padding: 12, marginTop: 8 },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  post: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, ...soft },
  postImg: { width: '100%', height: 220, borderRadius: 10, marginTop: 8 },
  small: { color: colors.muted, fontSize: 13, marginTop: 8 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 16, marginBottom: 10 },
  tab: { flexGrow: 1, flexShrink: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  tabOn: { color: colors.text },
  tabLine: { position: 'absolute', bottom: -1, height: 2, width: 28, borderRadius: 1, backgroundColor: colors.text },
  hl: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: colors.gold || colors.primary },
  video: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, ...soft },
  mural: { borderRadius: 16, padding: 10 },
  muralItem: { borderRadius: 12, padding: 12, marginBottom: 10 },
  err: { color: colors.danger, textAlign: 'center', marginTop: 30, paddingHorizontal: 24 },
});
