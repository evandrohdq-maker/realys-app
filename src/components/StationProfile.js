// Perfil de uma rádio ou TV do Re@lys (abre ao tocar no nome ou na logo em qualquer lugar do app).
// Capa, logo, categoria, seguidores, botão de ouvir/assistir, link para divulgar e os posts da estação.
// A dona da estação (empresa com CNPJ) publica no feed com o link para os ouvintes tocarem na hora.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Image, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { MY_COMPANY_ID } from '../data';
import { moderateText } from '../moderation';
import { stationCat, onStationOpen, stationOpen, closeStation, openStation } from '../streamCats';
import { radioById, onRadios, playRadio, stopRadio, isFollowing, toggleFollow, stationLink } from '../radio';
import { tvById, onTvs, playTv, stopTv } from '../tv';
import { StationLogo, logoSource, useRadioNow } from './RadioKit';
import { useTvNow } from './FloatPlayers';

const C = { text: '#1B1B1F', muted: '#7A7468', gold: '#B8860B', line: '#EFE6CC', red: '#E5484D', soft: '#FAF7EF' };
const hash = (s) => String(s).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const getStation = (kind, id) => (kind === 'tv' ? tvById(id) : radioById(id));

// Tocar/parar uma estação (um som só por vez: rádio e TV se revezam).
function useOnAir(kind, s) {
  const r = useRadioNow();
  const t = useTvNow();
  const on = kind === 'tv' ? !!(t.channel && s && t.channel.id === s.id) : !!(r.radio && s && r.radio.id === s.id && r.status !== 'parado');
  const toggle = () => {
    if (!s) return;
    if (on) return kind === 'tv' ? stopTv() : stopRadio();
    if (kind === 'tv') {
      stopRadio();
      playTv(s);
    } else {
      stopTv();
      playRadio(s);
    }
  };
  return [on, toggle, kind === 'radio' && on && r.status === 'carregando'];
}

// Botão dentro do post do feed: "Ouvir agora" / "Assistir agora".
export function StationPostPlayer({ station }) {
  const s = getStation(station.kind, station.id);
  const [on, toggle] = useOnAir(station.kind, s);
  if (!s) return null;
  return (
    <TouchableOpacity style={[st.postPlay, on && { backgroundColor: C.text }]} onPress={toggle} activeOpacity={0.85} accessibilityLabel={on ? `Parar ${s.name}` : `Tocar ${s.name}`}>
      <StationLogo s={s} kind={station.kind} size={40} radius={10} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: on ? '#fff' : C.text, fontWeight: '800' }} numberOfLines={1}>{s.name}</Text>
        <Text style={{ color: on ? 'rgba(255,255,255,0.7)' : C.muted, fontSize: 12 }} numberOfLines={1}>{on ? 'No ar agora' : station.kind === 'tv' ? 'Toque para assistir ao vivo' : 'Toque para ouvir ao vivo'}</Text>
      </View>
      <Ionicons name={on ? 'stop-circle' : 'play-circle'} size={34} color={on ? '#fff' : C.gold} />
    </TouchableOpacity>
  );
}

export function StationProfileHost() {
  const [open, setOpen] = useState(stationOpen());
  useEffect(() => onStationOpen(setOpen), []);
  if (!open) return null;
  return <StationProfile kind={open.kind} id={open.id} />;
}

function StationProfile({ kind, id }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [, tick] = useState(0);
  useEffect(() => (kind === 'tv' ? onTvs : onRadios)(() => tick((n) => n + 1)), [kind]);
  const s = getStation(kind, id);
  const [on, toggle, loading] = useOnAir(kind, s);
  const [writing, setWriting] = useState(null);
  if (!s) return null;
  const cat = stationCat(kind, s);
  const following = isFollowing(s.id);
  const followers = 120 + (hash(s.id) % 4800) + (following ? 1 : 0);
  const mine = s.storeId && s.storeId === MY_COMPANY_ID;
  const company = s.storeId ? (state.stores || []).find((x) => x.id === s.storeId) : null;
  const posts = (state.communityPosts || []).filter((p) => p.station && p.station.id === s.id);
  const link = stationLink(s, kind);
  const cover = logoSource(s.cover);

  const share = () => Share.share({ message: `${kind === 'tv' ? 'Assista' : 'Ouça'} ${s.name} ao vivo no Re@lys: ${link}` }).catch(() => {});
  const publish = () => {
    const text = (writing || '').trim();
    if (!text) return;
    const mod = moderateText(text);
    if (!mod.ok) return Alert.alert('Não foi possível publicar', mod.why);
    dispatch({ type: 'POST_PUBLISH', post: { id: 'st' + Date.now(), author: s.name, text, image: null, likes: 0, comments: 0, time: 'agora', station: { kind, id: s.id } } });
    setWriting(null);
    Alert.alert('Publicado ✅', `O post de ${s.name} já está no feed, com o botão para ${kind === 'tv' ? 'assistir' : 'ouvir'} na hora.`);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={closeStation}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        {/* Capa: a imagem da estação ou a cor da categoria */}
        <View style={[st.cover, { backgroundColor: cat.tint, paddingTop: insets.top }]}>
          {cover ? <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={st.coverEmoji}>{cat.emoji}</Text>}
          <View style={st.coverShade} />
          <TouchableOpacity onPress={closeStation} style={[st.back, { top: insets.top + 8 }]} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={share} style={[st.back, { top: insets.top + 8, left: undefined, right: 12 }]} accessibilityLabel="Divulgar o link">
            <Ionicons name="share-social-outline" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={st.head}>
          <View style={st.logoRing}><StationLogo s={s} kind={kind} size={92} radius={24} /></View>
          <Text style={st.name} numberOfLines={2}>{s.name} {s.verified || s.storeId ? <Ionicons name="shield-checkmark" size={16} color={C.gold} /> : null}</Text>
          <Text style={st.meta} numberOfLines={1}>{kind === 'tv' ? 'TV online' : 'Rádio'} · {cat.label}{s.city ? ` · ${s.city}` : ''}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View style={st.liveDot} />
            <Text style={{ color: C.red, fontWeight: '800', fontSize: 12 }}>AO VIVO</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>  ·  {followers.toLocaleString('pt-BR')} seguidores</Text>
          </View>
          <View style={st.actions}>
            <TouchableOpacity style={[st.playBig, on && { backgroundColor: C.text }]} onPress={() => (toggle(), kind === 'tv' && !on && closeStation())} accessibilityLabel={on ? 'Parar' : kind === 'tv' ? 'Assistir ao vivo' : 'Ouvir ao vivo'}>
              <Ionicons name={on ? 'stop' : 'play'} size={20} color="#fff" />
              <Text numberOfLines={1} style={st.playText}>{loading ? 'Conectando…' : on ? 'Parar' : kind === 'tv' ? 'Assistir' : 'Ouvir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.follow, following && st.followOn]} onPress={() => (toggleFollow(s.id), tick((n) => n + 1))} accessibilityLabel={following ? 'Deixar de seguir' : 'Seguir'}>
              <Text numberOfLines={1} style={{ color: following ? C.gold : C.text, fontWeight: '800' }}>{following ? 'Seguindo' : 'Seguir'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {s.desc ? <Text style={st.about}>{s.desc}</Text> : null}
        {company ? (
          <TouchableOpacity style={st.row} onPress={() => (closeStation(), dispatch({ type: 'OPEN_COMPANY', id: company.id }))}>
            <Ionicons name="business-outline" size={18} color={C.gold} />
            <Text style={{ flex: 1, marginLeft: 10, color: C.text, fontWeight: '700' }} numberOfLines={1}>Página da empresa: {company.name}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </TouchableOpacity>
        ) : null}

        {mine ? (
          <View style={st.ownerBox}>
            <Text style={st.section}>SUA {kind === 'tv' ? 'TV' : 'RÁDIO'}</Text>
            {writing != null ? (
              <>
                <TextInput value={writing} onChangeText={setWriting} multiline placeholder={`Ex.: Estamos ao vivo! ${kind === 'tv' ? 'Assista' : 'Ouça'} agora a ${s.name}.`} placeholderTextColor={C.muted} style={st.field} maxLength={400} />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setWriting(null)} style={{ padding: 10 }}><Text style={{ color: C.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={publish} style={st.pubBtn}><Text style={{ color: '#fff', fontWeight: '800' }}>Publicar no feed</Text></TouchableOpacity>
                </View>
                <Text style={st.hint}>O post vai com o botão para {kind === 'tv' ? 'assistir' : 'ouvir'} na hora, direto do feed.</Text>
              </>
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[st.ownBtn, { marginRight: 8 }]} onPress={() => setWriting(`🔴 Estamos ao vivo! ${kind === 'tv' ? 'Assista' : 'Ouça'} agora a ${s.name} no Re@lys.`)}>
                  <Ionicons name="create-outline" size={16} color={C.gold} />
                  <Text numberOfLines={1} style={st.ownBtnText}>Publicar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.ownBtn} onPress={() => (closeStation(), dispatch({ type: 'NAV_REQUEST', go: kind === 'tv' ? { tab: 'home', top: 'stream', stream: 'tv' } : { tab: 'radios' } }))}>
                  <Ionicons name="settings-outline" size={16} color={C.gold} />
                  <Text numberOfLines={1} style={st.ownBtnText}>Editar logo e link</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        <Text style={[st.section, { marginHorizontal: 16 }]}>PUBLICAÇÕES</Text>
        {posts.length ? posts.map((p) => (
          <View key={p.id} style={st.post}>
            <Text style={{ color: C.muted, fontSize: 11 }}>{p.time}</Text>
            <Text style={{ color: C.text, marginTop: 4, lineHeight: 20 }}>{p.text}</Text>
          </View>
        )) : <Text style={st.empty}>{mine ? 'Publique o primeiro post e chame os ouvintes.' : 'Nenhuma publicação ainda.'}</Text>}
      </ScrollView>
    </Modal>
  );
}

const st = StyleSheet.create({
  cover: { height: 170, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverEmoji: { fontSize: 64, opacity: 0.35 },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  back: { position: 'absolute', left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'center', marginTop: -50, paddingHorizontal: 16 },
  logoRing: { padding: 4, backgroundColor: '#fff', borderRadius: 28, elevation: 4 },
  name: { fontSize: 21, fontWeight: '800', color: C.text, marginTop: 10, textAlign: 'center' },
  meta: { color: C.muted, marginTop: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, marginRight: 5 },
  actions: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  playBig: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold, borderRadius: 14, paddingVertical: 12, marginRight: 8 },
  playText: { color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 6 },
  follow: { paddingHorizontal: 22, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  followOn: { borderColor: C.gold, backgroundColor: C.soft },
  about: { color: C.text, marginHorizontal: 16, marginTop: 16, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line },
  ownerBox: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: C.soft },
  ownBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.gold, borderRadius: 12, paddingVertical: 10, backgroundColor: '#fff' },
  ownBtnText: { color: C.text, fontWeight: '800', marginLeft: 6, fontSize: 13 },
  field: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, minHeight: 80, color: C.text, backgroundColor: '#fff', textAlignVertical: 'top' },
  pubBtn: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  hint: { color: C.muted, fontSize: 11.5, marginTop: 6 },
  section: { color: C.muted, fontWeight: '800', fontSize: 11.5, letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  post: { marginHorizontal: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, marginBottom: 8 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 8 },
  postPlay: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 14, padding: 10, marginTop: 10, borderWidth: 1, borderColor: C.line },
});

export { openStation };
