// Aba Stream (topo da Community): rádios e TV online num lugar só.
// Rádios: o diretório de rádios do Re@lys (o player é um só no app; ver src/radio.js).
// TV online: canais que indexaram a URL do próprio sinal de vídeo (ver src/tv.js).
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from '../../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft } from '../../../theme';
import { Screen } from '../../../components/ui';
import { SegTabs } from '../../../components/AdKit';
import { RadioCard } from '../../../components/RadioKit';
import { allRadios, loadRadios, onRadios, stopRadio } from '../../../radio';
import { allTvs, loadTvs, onTvs, saveTv, removeTv, checkTvUrl, playTv, stopTv } from '../../../tv';
import { useTvNow } from '../../../components/FloatPlayers';
import { moderateText } from '../../../moderation';
import { MY_COMPANY_ID } from '../../../data';
import MusicTab from './MusicTab';

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
      {seg === 'tv' ? <TvList /> : seg === 'musicas' ? <MusicTab /> : <RadioList navigate={navigate} />}
    </Screen>
  );
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

function RadioList({ navigate }) {
  const [list, setList] = useState(allRadios());
  const [q, setQ] = useState('');
  useEffect(() => {
    loadRadios().then(() => setList(allRadios()));
    return onRadios(() => setList(allRadios()));
  }, []);
  const term = q.trim().toLowerCase();
  const shown = list.filter((r) => !term || `${r.name} ${r.genre} ${r.city}`.toLowerCase().includes(term));
  return (
    <View>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar rádio, estilo ou cidade" />
      {shown.map((r) => (
        <RadioCard key={r.id} radio={r} />
      ))}
      {!shown.length ? <Text style={st.empty}>Nenhuma rádio encontrada.</Text> : null}
      <OwnBar
        icon="radio-outline"
        title="Tem uma rádio? Indexe a sua"
        sub="Cole a URL do streaming e ela toca aqui e na página da sua empresa"
        onPress={() => navigate && navigate({ tab: 'radios' })}
      />
    </View>
  );
}

function TvList() {
  const [list, setList] = useState(allTvs());
  const [q, setQ] = useState('');
  // Canal no ar: o vídeo fica na janela flutuante do app (FloatPlayers), não nesta tela.
  const on = useTvNow().channel;
  const [form, setForm] = useState(null);
  useEffect(() => {
    loadTvs().then(() => setList(allTvs()));
    return onTvs(() => setList(allTvs()));
  }, []);
  const term = q.trim().toLowerCase();
  const shown = list.filter((t) => !term || `${t.name} ${t.genre} ${t.city}`.toLowerCase().includes(term));
  const mine = list.find((t) => t.storeId === MY_COMPANY_ID) || null;

  const watch = (t) => {
    if (on && on.id === t.id) return stopTv();
    stopRadio(); // um som só por vez: a TV entra, a rádio sai
    playTv(t);
  };
  const openForm = () => setForm(mine ? { ...mine } : { name: '', url: '', genre: '', city: 'Passo Fundo, RS', emoji: '📺', storeId: MY_COMPANY_ID });
  const save = () => {
    if (!form.name.trim()) return Alert.alert('Nome do canal', 'Escreva o nome do canal.');
    const bad = checkTvUrl(form.url);
    if (bad) return Alert.alert('URL do canal', bad);
    const mod = moderateText(`${form.name} ${form.genre}`);
    if (!mod.ok) return Alert.alert('Não foi possível salvar', mod.why);
    saveTv({ ...form, name: form.name.trim(), url: form.url.trim(), genre: form.genre.trim(), city: form.city.trim() });
    setForm(null);
    Alert.alert('Canal indexado ✅', 'O seu canal já aparece na TV online do Re@lys.');
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
      {shown.map((t) => {
        const playing = on && on.id === t.id;
        return (
          <TouchableOpacity key={t.id} style={[st.card, playing && st.cardOn]} onPress={() => watch(t)} activeOpacity={0.85} accessibilityLabel={playing ? `Fechar ${t.name}` : `Assistir ${t.name}`}>
            <View style={st.logo}>
              <Text style={{ fontSize: 28 }}>{t.emoji || '📺'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={st.dot} />
                <Text style={st.live}>AO VIVO</Text>
                {t.example ? <Text style={st.example}>  · exemplo</Text> : null}
              </View>
              <Text style={st.name} numberOfLines={1}>{t.name}</Text>
              <Text style={st.meta} numberOfLines={1}>{[t.genre, t.city].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={st.play}>
              <Ionicons name={playing ? 'stop' : 'play'} size={22} color="#fff" style={playing ? null : { marginLeft: 3 }} />
            </View>
          </TouchableOpacity>
        );
      })}
      {!shown.length ? <Text style={st.empty}>Nenhum canal encontrado.</Text> : null}

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
          <Text style={st.label}>Ícone</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TV_EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setForm({ ...form, emoji: e })} style={[st.emoji, form.emoji === e && { borderColor: colors.primary }]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={st.saveBtn} onPress={save}>
            <Text style={st.saveText}>Salvar canal</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity onPress={() => setForm(null)}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            {form.id ? (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Remover canal', 'O canal sai da TV online do Re@lys.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Remover', style: 'destructive', onPress: () => { if (on && on.id === form.id) stopTv(); removeTv(form.id); setForm(null); } },
                  ])
                }
              >
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Remover</Text>
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
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 20 },

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
