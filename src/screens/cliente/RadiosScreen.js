// Rádios: diretório das rádios do Re@lys e cadastro da rádio da empresa.
// A rádio indexa a URL do próprio streaming e passa a tocar na página dela e aqui.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { Screen, Title } from '../../components/ui';
import { RadioCard } from '../../components/RadioKit';
import { allRadios, loadRadios, onRadios, saveRadio, removeRadio, checkUrl, radioOf, playRadio } from '../../radio';
import { MY_COMPANY_ID } from '../../data';
import { moderateText } from '../../moderation';

const EMOJIS = ['📻', '🎙️', '🎶', '🎸', '🎷', '🥁', '⛪', '⚽', '📰', '🤠'];

export default function RadiosScreen() {
  const { state } = useStore();
  const [list, setList] = useState(allRadios());
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  useEffect(() => {
    loadRadios().then(() => setList(allRadios()));
    return onRadios(() => setList(allRadios()));
  }, []);
  const company = state.stores.find((s) => s.id === MY_COMPANY_ID);
  const mine = radioOf(MY_COMPANY_ID);
  const shown = list.filter((r) => !q.trim() || `${r.name} ${r.genre} ${r.city}`.toLowerCase().includes(q.trim().toLowerCase()));

  const openForm = () =>
    setForm(mine ? { ...mine } : { name: (company && company.name) || '', url: '', genre: '', city: 'Passo Fundo, RS', emoji: '📻', storeId: MY_COMPANY_ID });
  const test = () => {
    const bad = checkUrl(form.url);
    if (bad) return Alert.alert('URL da rádio', bad);
    playRadio({ ...form, id: form.id || 'rd-teste' });
  };
  const save = () => {
    if (!form.name.trim()) return Alert.alert('Nome da rádio', 'Escreva o nome da rádio.');
    const bad = checkUrl(form.url);
    if (bad) return Alert.alert('URL da rádio', bad);
    const mod = moderateText(`${form.name} ${form.genre}`);
    if (!mod.ok) return Alert.alert('Não foi possível salvar', mod.why);
    saveRadio({ ...form, name: form.name.trim(), genre: form.genre.trim(), city: form.city.trim() });
    setForm(null);
    Alert.alert('Rádio indexada ✅', 'Sua rádio já toca na página da sua empresa e no diretório de Rádios do Re@lys.');
  };

  return (
    <Screen>
      <Title sub="Rádios ao vivo das empresas do Re@lys">Rádios</Title>

      <TouchableOpacity style={st.own} onPress={openForm} accessibilityLabel={mine ? 'Editar minha rádio' : 'Indexar minha rádio'}>
        <Ionicons name="radio-outline" size={20} color="#fff" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.ownText}>{mine ? 'Editar a rádio da minha empresa' : 'Tem uma rádio? Indexe a sua'}</Text>
          <Text style={st.ownSub}>Cole a URL do streaming e ela toca na página da sua empresa</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </TouchableOpacity>

      {form ? (
        <View style={st.form}>
          <Text style={st.formTitle}>{form.id ? 'Editar rádio' : 'Indexar rádio'}</Text>
          <Text style={st.label}>Nome da rádio</Text>
          <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} style={st.field} placeholder="Ex.: Rádio Planalto FM" placeholderTextColor={colors.muted} maxLength={50} />
          <Text style={st.label}>URL do streaming</Text>
          <TextInput value={form.url} onChangeText={(t) => setForm({ ...form, url: t })} style={st.field} placeholder="https://… (MP3, AAC, .m3u8, .pls ou .m3u)" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <Text style={st.hint}>É o link do áudio que o seu provedor de streaming (Icecast, Shoutcast, Zeno etc.) fornece, não o do site.</Text>
          <Text style={st.label}>Estilo</Text>
          <TextInput value={form.genre} onChangeText={(t) => setForm({ ...form, genre: t })} style={st.field} placeholder="Ex.: Sertanejo, notícias, gospel" placeholderTextColor={colors.muted} maxLength={40} />
          <Text style={st.label}>Cidade</Text>
          <TextInput value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} style={st.field} placeholderTextColor={colors.muted} maxLength={40} />
          <Text style={st.label}>Ícone</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setForm({ ...form, emoji: e })} style={[st.emoji, form.emoji === e && { borderColor: colors.primary }]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <TouchableOpacity style={st.testBtn} onPress={test}>
              <Ionicons name="play-outline" size={16} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: '800', marginLeft: 5 }}>Testar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.saveBtn} onPress={save}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Salvar rádio</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <TouchableOpacity onPress={() => setForm(null)}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
            {form.id ? (
              <TouchableOpacity onPress={() => Alert.alert('Remover rádio', 'A rádio sai da sua página e do diretório.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => (removeRadio(form.id), setForm(null)) },
              ])}>
                <Text style={{ color: '#E5484D', fontWeight: '700' }}>Remover</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={st.search}>
        <Ionicons name="search-outline" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar rádio, estilo ou cidade" placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 8, color: colors.text }} />
      </View>
      {shown.map((r) => <RadioCard key={r.id} radio={r} />)}
      {!shown.length ? <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>Nenhuma rádio encontrada.</Text> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  own: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, padding: 14, marginBottom: 14 },
  ownText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ownSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#EFE6CC' },
  formTitle: { fontWeight: '800', fontSize: 16, color: colors.text, marginBottom: 6 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  field: { borderWidth: 1, borderColor: '#E3DCC8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text },
  hint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', margin: 3, backgroundColor: '#F7F5EF' },
  testBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12, borderWidth: 1, borderColor: '#EFE6CC' },
});
