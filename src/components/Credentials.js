// Perfil › Carteira profissional: cadastrar a carteira da profissão e, depois de aprovada, escolher se
// quer receber casos da plataforma (servidor público atende de graça, sem taxa do Realys).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';
import { colors } from '../theme';
import { PROFESSIONS, professionOf, casesFor, roughPlace } from '../credentials';

const STATUS = { em_analise: ['Em análise', '#C77D12'], aprovado: ['Aprovada', '#1E9E63'], recusado: ['Recusada', '#C0392B'] };

export default function Credentials() {
  const { state, dispatch } = useStore();
  const uid = state.user && state.user.id;
  const mine = (state.credentials || []).filter((c) => !c.userId || c.userId === uid);
  const [adding, setAdding] = useState(false);
  const [prof, setProf] = useState(null);
  const [number, setNumber] = useState('');
  const [uf, setUf] = useState('');
  const [orgao, setOrgao] = useState('');
  const [photo, setPhoto] = useState(null);
  const [gov, setGov] = useState(false);
  const p = professionOf(prof);

  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Câmera', 'Libere a câmera para fotografar a carteira.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };
  const save = () => {
    if (!p) return Alert.alert('Profissão', 'Escolha a sua profissão.');
    if (!number.trim()) return Alert.alert('Número', `Informe o número da ${p.doc.replace('Carteira ', '').replace('funcional ', 'carteira ')}.`);
    if (!photo) return Alert.alert('Foto da carteira', `Fotografe a ${p.doc}.`);
    dispatch({ type: 'CRED_ADD', cred: { prof: p.key, label: p.label, doc: p.doc, number: number.trim(), uf: uf.trim().toUpperCase().slice(0, 2), orgao: orgao.trim(), photo, gov: !!(p.gov || gov) } });
    setAdding(false);
    setProf(null);
    setNumber('');
    setUf('');
    setOrgao('');
    setPhoto(null);
    setGov(false);
    Alert.alert('Carteira enviada', 'A equipe do Realys confere com o conselho ou o órgão e avisa você. Depois de aprovada, você escolhe se quer receber casos.');
  };

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="id-card-outline" size={22} color={colors.primary} />
        <Text style={st.title}>Carteira profissional</Text>
      </View>
      <Text style={st.sub}>Advogado, médico, policial, bombeiro... Para se apresentar com a profissão, cadastre a carteira dela (OAB, CRM, carteira funcional). É opcional.</Text>

      {mine.map((c) => {
        const [label, color] = STATUS[c.status] || STATUS.em_analise;
        const cases = casesFor(c, state.sosRequests);
        return (
          <View key={c.id} style={st.item}>
            <Text style={st.itemTitle}>{c.label}</Text>
            <Text style={st.itemSub}>
              {c.doc} nº {c.number}
              {c.uf ? `/${c.uf}` : ''} · <Text style={{ color, fontWeight: '800' }}>{label}</Text>
            </Text>
            {c.gov ? <Text style={st.itemSub}>Servidor público: se atender pelo Realys, atende de graça (sem taxa do Realys).</Text> : null}
            {c.status === 'aprovado' ? (
              <View style={st.switchRow}>
                <Text style={st.switchText}>Receber casos da plataforma para analisar</Text>
                <Switch value={!!c.receiveCases} onValueChange={(v) => dispatch({ type: 'CRED_SET', id: c.id, patch: { receiveCases: v } })} />
              </View>
            ) : null}
            {cases.map((r) => (
              <View key={r.id} style={st.case}>
                <Text style={st.caseTitle}>
                  {r.tipo} · {r.protocol}
                </Text>
                <Text style={st.itemSub}>{roughPlace(r)}{r.texto ? ` · ${r.texto.slice(0, 120)}` : ''}</Text>
                {(r.followers || []).includes(state.user && state.user.name) ? (
                  <Text style={[st.itemSub, { color: '#1E9E63', fontWeight: '700' }]}>Você está acompanhando</Text>
                ) : (
                  <TouchableOpacity onPress={() => dispatch({ type: 'CASE_FOLLOW', id: r.id, who: state.user ? state.user.name : 'Profissional' })}>
                    <Text style={st.link}>Quero acompanhar este caso</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => dispatch({ type: 'CRED_REMOVE', id: c.id })}>
              <Text style={[st.link, { color: colors.muted }]}>Remover</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {!adding ? (
        <TouchableOpacity onPress={() => setAdding(true)}>
          <Text style={st.link}>+ Cadastrar carteira profissional</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 10 }}>
          <View style={st.chips}>
            {PROFESSIONS.map((x) => (
              <TouchableOpacity key={x.key} style={[st.chip, prof === x.key && st.chipOn]} onPress={() => setProf(x.key)}>
                <Text style={[st.chipText, prof === x.key && { color: '#fff' }]}>{x.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {p ? (
            <>
              <Text style={st.label}>{p.doc}</Text>
              <TextInput style={st.input} value={number} onChangeText={setNumber} placeholder={`Número (${p.conselho})`} placeholderTextColor={colors.muted} />
              <View style={{ flexDirection: 'row' }}>
                <TextInput style={[st.input, { width: 70, marginRight: 8 }]} value={uf} onChangeText={setUf} placeholder="UF" placeholderTextColor={colors.muted} autoCapitalize="characters" maxLength={2} />
                {p.gov ? <TextInput style={[st.input, { flex: 1 }]} value={orgao} onChangeText={setOrgao} placeholder="Órgão (ex.: Brigada Militar - RS)" placeholderTextColor={colors.muted} /> : null}
              </View>
              {!p.gov ? (
                <View style={st.switchRow}>
                  <Text style={st.switchText}>Trabalho para o governo (atendo de graça pelo Realys)</Text>
                  <Switch value={gov} onValueChange={setGov} />
                </View>
              ) : null}
              <TouchableOpacity style={st.photoBtn} onPress={pick}>
                <Ionicons name={photo ? 'checkmark-circle' : 'camera-outline'} size={20} color={colors.primary} />
                <Text style={[st.link, { marginTop: 0, marginLeft: 6 }]}>{photo ? 'Foto da carteira tirada' : `Fotografar a ${p.doc}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.btn} onPress={save}>
                <Text style={st.btnText}>Enviar para análise</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity onPress={() => setAdding(false)}>
            <Text style={[st.link, { color: colors.muted }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 8 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  itemTitle: { color: colors.text, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  case: { backgroundColor: '#F6F3FA', borderRadius: 10, padding: 10, marginTop: 8 },
  caseTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  label: { color: colors.text, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  switchText: { color: colors.text, flex: 1, marginRight: 8, fontSize: 13 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
});
