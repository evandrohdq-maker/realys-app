// Aba Stream (topo da Community): rádios e TV online num lugar só.
// Rádios: o diretório de rádios do Realyz (o player é um só no app; ver src/radio.js).
// TV online: canais que indexaram a URL do próprio sinal de vídeo (ver src/tv.js).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from '../../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft } from '../../../theme';
import { Screen, Photo } from '../../../components/ui';
import { SegTabs } from '../../../components/AdKit';
import { RadioCard, StationLogo, useRadioNow } from '../../../components/RadioKit';
import { CatChips, StationFormExtras, FeaturedStation } from '../../../components/StationKit';
import { stationCat, catsOf, openStation } from '../../../streamCats';
import { allRadios, loadRadios, onRadios, stopRadio, playRadio } from '../../../radio';
import { allTvs, loadTvs, onTvs, saveTv, removeTv, checkTvUrl, playTv, stopTv } from '../../../tv';
import { useTvNow } from '../../../components/FloatPlayers';
import { moderateText } from '../../../moderation';
import { MY_COMPANY_ID } from '../../../data';
import { podeTrabalhar, MSG_SEM_CNPJ } from '../../../trabalhoApp';
import { useStore } from '../../../store';
import MusicTab from './MusicTab';
import { FavHeart, FavStrip } from '../../../components/FavKit';
import { favList } from '../../../favorites';
import { radioById } from '../../../radio';
import { tvById } from '../../../tv';
import { trackById, playTrack } from '../../../music';

const SEGS = [
  { key: 'radios', label: 'Rádios', icon: 'radio-outline' },
  { key: 'tv', label: 'TV online', icon: 'tv-outline' },
  { key: 'musicas', label: 'Músicas', icon: 'musical-notes-outline' },
];
const TV_EMOJIS = ['📺', '🎬', '📰', '⚽', '⛪', '🎵', '🤠', '🎓'];

export default function StreamTab({ seg, setSeg, navigate }) {
  return (
    <Screen>
      <SegTabs items={SEGS} value={seg} onChange={setSeg} />
      <StreamFavs seg={seg} />
      {seg === 'tv' ? <TvList /> : seg === 'musicas' ? <MusicTab /> : <RadioList navigate={navigate} />}
    </Screen>
  );
}

// Favoritos no topo de cada aba do Stream: rádios nas Rádios, canais na TV, músicas nas Músicas.
// Tocar já começa a tocar (um som só por vez).
function StreamFavs({ seg }) {
  const kind = seg === 'tv' ? 'tv' : seg === 'musicas' ? 'music' : 'radio';
  const pick = (k, it) => {
    if (k === 'radio') {
      const r = radioById(it.id);
      if (r) (stopTv(), playRadio(r));
    } else if (k === 'tv') {
      const t = tvById(it.id);
      if (t) (stopRadio(), playTv(t));
    } else {
      const t = trackById(it.id);
      if (t) (stopTv(), playTrack(t, favList('music').map((x) => trackById(x.id)).filter(Boolean)));
    }
  };
  const logo = (k, it) => {
    const s = k === 'radio' ? radioById(it.id) : k === 'tv' ? tvById(it.id) : null;
    if (s) return <StationLogo s={s} kind={k} size={62} radius={31} />;
    const t = k === 'music' ? trackById(it.id) : null;
    return t && t.cover ? <Photo uri={t.cover} style={StyleSheet.absoluteFill} fallback={t.emoji} /> : <Text style={{ fontSize: 24 }}>{it.emoji || '⭐'}</Text>;
  };
  return <FavStrip kinds={[kind]} title={kind === 'music' ? 'Músicas favoritas' : kind === 'tv' ? 'Canais favoritos' : 'Rádios favoritas'} onPick={pick} renderLogo={logo} />;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <View style={st.search}>
      <Ionicons name="search-outline" size={17} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={st.searchInput} />
    </View>
  );
}

function OwnBar({ icon, title, sub, onPress }) {
  return (
    <TouchableOpacity style={st.own} onPress={onPress} activeOpacity={0.85} accessibilityLabel={title}>
      <Ionicons name={icon} size={20} color="#fff" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={st.ownText}>{title}</Text>
        <Text style={st.ownSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#fff" />
    </TouchableOpacity>
  );
}

// Conta quantas estações há em cada categoria (para os chips).
const countBy = (kind, list) => list.reduce((o, x) => ((o[stationCat(kind, x).key] = (o[stationCat(kind, x).key] || 0) + 1), o), {});

function RadioList({ navigate }) {
  const [list, setList] = useState(allRadios());
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const now = useRadioNow();
  useEffect(() => {
    loadRadios().then(() => setList(allRadios()));
    return onRadios(() => setList(allRadios()));
  }, []);
  const term = q.trim().toLowerCase();
  const featured = list.find((r) => r.featured);
  const featOn = !!(featured && now.radio && now.radio.id === featured.id && now.status !== 'parado');
  const match = (r) => !term || `${r.name} ${r.genre} ${r.city} ${stationCat('radio', r).label}`.toLowerCase().includes(term);
  const shown = list.filter((r) => match(r) && (cat === 'todas' || stationCat('radio', r).key === cat));
  const catInfo = cat !== 'todas' ? catsOf('radio').find((c) => c.key === cat) : null;
  // "Todas": separadas por categoria, cada uma com o seu título.
  const groups = cat === 'todas' && !term ? catsOf('radio').map((c) => ({ c, items: shown.filter((r) => stationCat('radio', r).key === c.key && !r.featured) })).filter((g) => g.items.length) : null;
  return (
    <View>
      {featured && cat === 'todas' && !term ? (
        <FeaturedStation s={featured} on={featOn} onPlay={() => (featOn ? stopRadio() : (stopTv(), playRadio(featured)))} />
      ) : null}
      <SearchBox value={q} onChange={setQ} placeholder="Buscar rádio, estilo ou cidade" />
      <CatChips kind="radio" value={cat} onChange={setCat} counts={countBy('radio', list)} />
      {groups
        ? groups.map((g) => (
            <View key={g.c.key}>
              <TouchableOpacity style={st.groupHead} onPress={() => setCat(g.c.key)} accessibilityLabel={`Ver todas de ${g.c.label}`}>
                <Text style={{ fontSize: 15 }}>{g.c.emoji}</Text>
                <Text style={st.groupTitle} numberOfLines={1}>{g.c.label}</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
              </TouchableOpacity>
              {g.items.map((r) => <RadioCard key={r.id} radio={r} />)}
            </View>
          ))
        : shown.map((r) => <RadioCard key={r.id} radio={r} />)}
      {!shown.length ? (
        <Text style={st.empty}>{catInfo ? `Ainda não tem rádio ${catInfo.label.toLowerCase()} no Realyz. Tem uma? Indexe a sua e seja a primeira.` : 'Nenhuma rádio encontrada.'}</Text>
      ) : null}
      <OwnBar
        icon="radio-outline"
        title="Tem uma rádio? Indexe a sua"
        sub="Link do streaming, logo e categoria: ela ganha perfil e toca no app todo"
        onPress={() => navigate && navigate({ tab: 'radios' })}
      />
    </View>
  );
}

function TvList() {
  const { state } = useStore();
  const [list, setList] = useState(allTvs());
  const [q, setQ] = useState('');
  // Canal no ar: o vídeo fica na janela flutuante do app (FloatPlayers), não nesta tela.
  const on = useTvNow().channel;
  const [form, setForm] = useState(null);
  const [cat, setCat] = useState('todas');
  useEffect(() => {
    loadTvs().then(() => setList(allTvs()));
    return onTvs(() => setList(allTvs()));
  }, []);
  const term = q.trim().toLowerCase();
  const shown = list.filter((t) => (!term || `${t.name} ${t.genre} ${t.city} ${stationCat('tv', t).label}`.toLowerCase().includes(term)) && (cat === 'todas' || stationCat('tv', t).key === cat));
  const tvCat = cat !== 'todas' ? catsOf('tv').find((c) => c.key === cat) : null;
  const mine = list.find((t) => t.storeId === MY_COMPANY_ID) || null;

  const watch = (t) => {
    if (on && on.id === t.id) return stopTv();
    stopRadio(); // um som só por vez: a TV entra, a rádio sai
    playTv(t);
  };
  const openForm = () => setForm(mine ? { ...mine } : { name: '', url: '', genre: '', city: 'Passo Fundo, RS', emoji: '📺', storeId: MY_COMPANY_ID });
  const save = () => {
    // Indexar canal é trabalho de rádio/TV: só com o perfil de trabalho com CNPJ.
    if (!podeTrabalhar(state, 'radio')) return Alert.alert('Perfil de trabalho', MSG_SEM_CNPJ('indexar o seu canal'));
    if (!form.name.trim()) return Alert.alert('Nome do canal', 'Escreva o nome do canal.');
    const bad = checkTvUrl(form.url);
    if (bad) return Alert.alert('URL do canal', bad);
    const mod = moderateText(`${form.name} ${form.genre}`);
    if (!mod.ok) return Alert.alert('Não foi possível salvar', mod.why);
    saveTv({ ...form, name: form.name.trim(), url: form.url.trim(), genre: form.genre.trim(), city: form.city.trim() });
    setForm(null);
    Alert.alert('Canal indexado ✅', 'O seu canal já aparece na TV online do Realyz.');
  };

  return (
    <View>
      {on ? (
        <View style={st.nowBox}>
          <Ionicons name="tv" size={18} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.nowName} numberOfLines={1}>No ar: {on.name}</Text>
            <Text style={st.meta}>O vídeo tá na janelinha. Segura e arrasta pra mudar de canto. O botão de janela (ou sair do app) deixa o canal num cantinho da tela enquanto você usa o celular.</Text>
          </View>
          <TouchableOpacity onPress={stopTv} style={st.closeBtn} accessibilityLabel="Fechar o canal">
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : null}

      <SearchBox value={q} onChange={setQ} placeholder="Buscar canal, estilo ou cidade" />
      <CatChips kind="tv" value={cat} onChange={setCat} counts={countBy('tv', list)} />
      {shown.map((t) => {
        const playing = on && on.id === t.id;
        return (
          <TouchableOpacity key={t.id} style={[st.card, playing && st.cardOn]} onPress={() => watch(t)} activeOpacity={0.85} accessibilityLabel={playing ? `Fechar ${t.name}` : `Assistir ${t.name}`}>
            <TouchableOpacity onPress={() => openStation('tv', t.id)} accessibilityLabel={`Abrir o perfil de ${t.name}`}>
              <StationLogo s={t} kind="tv" size={56} />
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, marginLeft: 12 }} onPress={() => openStation('tv', t.id)} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={st.dot} />
                <Text style={st.live}>AO VIVO</Text>
                {t.example ? <Text style={st.example}>  · exemplo</Text> : null}
              </View>
              <Text style={st.name} numberOfLines={1}>{t.name}</Text>
              <Text style={st.meta} numberOfLines={1}>{[stationCat('tv', t).label, t.city].filter(Boolean).join(' · ')}</Text>
            </TouchableOpacity>
            <FavHeart kind="tv" item={t} size={22} color={colors.muted} style={{ marginLeft: 8, padding: 4 }} />
            <View style={st.play}>
              <Ionicons name={playing ? 'stop' : 'play'} size={22} color="#fff" style={playing ? null : { marginLeft: 3 }} />
            </View>
          </TouchableOpacity>
        );
      })}
      {!shown.length ? <Text style={st.empty}>{tvCat ? `Ainda não tem canal de ${tvCat.label.toLowerCase()} no Realyz. Tem um? Indexe o seu.` : 'Nenhum canal encontrado.'}</Text> : null}

      <OwnBar
        icon="tv-outline"
        title={mine ? 'Editar o canal da minha empresa' : 'Tem um canal de TV? Indexe o seu'}
        sub="Cole a URL do sinal (.m3u8) e o canal passa a aparecer aqui"
        onPress={openForm}
      />

      {form ? (
        <View style={st.form}>
          <Text style={st.formTitle}>{form.id ? 'Editar canal' : 'Indexar canal de TV'}</Text>
          <Text style={st.label}>Nome do canal</Text>
          <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={st.field} placeholder="Ex.: TV Planalto" placeholderTextColor={colors.muted} maxLength={50} />
          <Text style={st.label}>URL do sinal</Text>
          <TextInput value={form.url} onChangeText={(v) => setForm({ ...form, url: v })} style={st.field} placeholder="https://… (.m3u8 ou .mp4)" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <Text style={st.hint}>É o link do vídeo ao vivo que o seu provedor de streaming fornece, não o do site.</Text>
          <Text style={st.label}>Programação</Text>
          <TextInput value={form.genre} onChangeText={(v) => setForm({ ...form, genre: v })} style={st.field} placeholder="Ex.: Notícias, esportes, gospel" placeholderTextColor={colors.muted} maxLength={40} />
          <Text style={st.label}>Cidade</Text>
          <TextInput value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} style={st.field} placeholderTextColor={colors.muted} maxLength={40} />
          <StationFormExtras kind="tv" form={form} setForm={setForm} />
          <Text style={st.label}>Ícone (sem logo)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TV_EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setForm({ ...form, emoji: e })} style={[st.emoji, form.emoji === e && { borderColor: colors.primary }]}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={st.saveBtn} onPress={save}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.saveText}>Salvar canal</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity onPress={() => setForm(null)}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.muted, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            {form.id ? (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Remover canal', 'O canal sai da TV online do Realyz.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Remover', style: 'destructive', onPress: () => { if (on && on.id === form.id) stopTv(); removeTv(form.id); setForm(null); } },
                  ])
                }
              >
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.danger, fontWeight: '700' }}>Remover</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 8, color: colors.text, paddingVertical: 0 },
  own: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, padding: 14, marginTop: 6, marginBottom: 14 },
  ownText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ownSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 20, paddingHorizontal: 12 },
  groupHead: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  groupTitle: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 6 },

  nowBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 14, ...soft },
  screen: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  screenMsg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 16 },
  screenMsgText: { color: '#fff', textAlign: 'center', marginTop: 6, fontSize: 13 },
  nowRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  nowName: { color: colors.text, fontWeight: '800', fontSize: 15 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, marginLeft: 10 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardOn: { borderColor: colors.primary },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5484D', marginRight: 5 },
  live: { color: '#E5484D', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  example: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  name: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  play: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

  form: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  formTitle: { fontWeight: '800', fontSize: 16, color: colors.text, marginBottom: 6 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  field: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text },
  hint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', margin: 3, backgroundColor: colors.cardAlt },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 14 },
  saveText: { color: '#fff', fontWeight: '800' },
});
