// Extras, lado de quem quer trabalhar: o perfil de extra (funções que faz e em que nível, dias,
// turnos e itens que tem) e as vagas de extra perto. Cada vaga diz na hora se a pessoa pode se
// candidatar ou o que falta. Sem cumprir os requisitos, o botão não libera.
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../responsive';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { FUNCOES_EXTRA, NIVEIS, DIAS, TURNOS, ITENS, funcaoLabel, nivelLabel, faltaPara, dataBR, diaDe, brlDiaria } from '../extras';

const Chip = ({ on, label, onPress, icon }) => (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]} accessibilityState={{ selected: !!on }}>
    {icon ? <Ionicons name={icon} size={13} color={on ? '#fff' : colors.primary} style={{ marginRight: 4 }} /> : null}
    <Text numberOfLines={1} style={[st.chipTxt, on && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

export function ExtraCard({ x, perfil, onApply, onQuit }) {
  const falta = faltaPara(perfil, x);
  const fui = (x.candidatos || []).find((c) => c.id === 'cand-me');
  const r = x.requisitos || {};
  const dia = (DIAS.find((d) => d.key === diaDe(x.data)) || {}).label;
  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, marginRight: 10 }}>{x.logo || '🏢'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.title} numberOfLines={1}>{funcaoLabel(x.funcao)}{x.vagas > 1 ? ` · ${x.vagas} vagas` : ''}</Text>
          <Text style={st.muted} numberOfLines={1}>{x.empresa} · {x.local}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={st.pay}>{brlDiaria(x.diaria)}</Text>
          <Text style={st.muted}>a diária</Text>
        </View>
      </View>
      <Text style={st.when}>📅 {dia} {dataBR(x.data)} · {x.inicio} às {x.fim}</Text>
      {x.obs ? <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{x.obs}</Text> : null}
      <Text style={st.reqTitle}>Requisitos</Text>
      <Text style={st.req}>• {nivelLabel(r.nivel || 'aprendiz')}</Text>
      {r.notaMin ? <Text style={st.req}>• Nota {String(r.notaMin).replace('.', ',')} ou mais em extras</Text> : null}
      {r.feitosMin ? <Text style={st.req}>• {r.feitosMin} extras feitos pelo Realyz</Text> : null}
      {(r.itens || []).map((it) => <Text key={it} style={st.req}>• {it}</Text>)}
      {fui ? (
        <View style={[st.status, { backgroundColor: '#E8F6EE' }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ color: colors.success, fontWeight: '700', marginLeft: 6, flex: 1 }}>
            {fui.status === 'confirmado' ? 'Você foi confirmado(a)! Chegue 15 min antes.' : fui.status === 'dispensado' ? 'A empresa já fechou a equipe.' : 'Candidatura enviada. A empresa confirma por aqui.'}
          </Text>
          {fui.status === 'candidato' ? <TouchableOpacity onPress={onQuit}><Text style={{ color: colors.muted, fontWeight: '700' }}>Desistir</Text></TouchableOpacity> : null}
        </View>
      ) : falta.length ? (
        <View style={[st.status, { backgroundColor: '#FBF1E1', alignItems: 'flex-start' }]}>
          <Ionicons name="lock-closed" size={15} color="#A0670B" style={{ marginTop: 2 }} />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <Text style={{ color: '#A0670B', fontWeight: '800' }}>Você ainda não pode se candidatar</Text>
            {falta.map((f) => <Text key={f} style={{ color: '#7A5A20', fontSize: 12.5 }}>– {f}</Text>)}
          </View>
        </View>
      ) : (
        <TouchableOpacity style={st.apply} onPress={onApply} accessibilityLabel={`Candidatar-se ao extra de ${funcaoLabel(x.funcao)}`}>
          <Ionicons name="flash" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6 }}>Quero esse extra</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ExtraPerfilEditor({ visible, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState(state.extraPerfil);
  React.useEffect(() => {
    if (visible) setP(state.extraPerfil);
  }, [visible]);
  if (!visible) return null;
  const tog = (k, v) => setP((x) => ({ ...x, [k]: (x[k] || []).includes(v) ? x[k].filter((y) => y !== v) : [...(x[k] || []), v] }));
  const nivelDe = (f) => ((p.funcoes || []).find((x) => x.funcao === f) || {}).nivel;
  const setFuncao = (f, nivel) =>
    setP((x) => {
      const rest = (x.funcoes || []).filter((y) => y.funcao !== f);
      return { ...x, funcoes: nivel ? [...rest, { funcao: f, nivel }] : rest };
    });
  const salvar = () => {
    if (p.disponivel && !(p.funcoes || []).length) return Alert.alert('Escolha pelo menos uma função', 'Diga o que você sabe fazer e em que nível.');
    dispatch({ type: 'SET_EXTRA_PERFIL', perfil: p });
    onClose();
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Fechar"><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>Meu perfil de extra</Text>
          <TouchableOpacity onPress={salvar} style={st.save}><Text style={{ color: '#fff', fontWeight: '800' }}>Salvar</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
          <View style={[st.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>Disponível para extras</Text>
              <Text style={st.muted}>Empresas perto veem você quando precisam de alguém para um dia ou turno.</Text>
            </View>
            <Switch value={!!p.disponivel} onValueChange={(v) => setP((x) => ({ ...x, disponivel: v }))} />
          </View>

          <Text style={st.section}>O que você sabe fazer</Text>
          <Text style={st.hint}>Seja sincero: a empresa avalia depois de cada extra. Nota baixa ou falta sem avisar tira você das vagas.</Text>
          {FUNCOES_EXTRA.map((f) => {
            const n = nivelDe(f.key);
            return (
              <View key={f.key} style={[st.card, { paddingVertical: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={f.icon} size={18} color={n ? colors.primary : colors.muted} />
                  <Text style={{ color: colors.text, fontWeight: n ? '800' : '600', marginLeft: 8, flex: 1 }}>{f.label}</Text>
                  {n ? <TouchableOpacity onPress={() => setFuncao(f.key, null)}><Text style={{ color: colors.muted, fontSize: 12 }}>Tirar</Text></TouchableOpacity> : null}
                </View>
                <View style={st.wrap}>
                  {NIVEIS.map((nv) => <Chip key={nv.key} on={n === nv.key} label={nv.label} onPress={() => setFuncao(f.key, nv.key)} />)}
                </View>
              </View>
            );
          })}

          <Text style={st.section}>Dias que pode</Text>
          <View style={st.wrap}>{DIAS.map((d) => <Chip key={d.key} on={(p.dias || []).includes(d.key)} label={d.label} onPress={() => tog('dias', d.key)} />)}</View>
          <Text style={st.section}>Turnos</Text>
          <View style={st.wrap}>{TURNOS.map((t) => <Chip key={t.key} on={(p.turnos || []).includes(t.key)} label={t.label} onPress={() => tog('turnos', t.key)} />)}</View>
          <Text style={st.section}>O que você tem</Text>
          <Text style={st.hint}>A empresa pode pedir para mostrar no dia (certificado, documento).</Text>
          <View style={st.wrap}>{ITENS.map((it) => <Chip key={it} on={(p.itens || []).includes(it)} label={it} onPress={() => tog('itens', it)} />)}</View>

          <Text style={st.section}>Seu histórico no Realyz</Text>
          <Text style={st.hint}>
            {p.feitos ? `${p.feitos} extras feitos · nota ${String(p.nota || '-').replace('.', ',')}` : 'Ainda nenhum extra pelo Realyz. Comece pelas vagas que aceitam quem está aprendendo.'}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ExtrasTab() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const [soAptas, setSoAptas] = useState(false);
  const p = state.extraPerfil;
  const todas = [...state.myExtras, ...state.extras].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const lista = soAptas ? todas.filter((x) => !faltaPara(p, x).length) : todas;
  const aptas = todas.filter((x) => !faltaPara(p, x).length).length;
  const funcs = (p.funcoes || []).map((f) => funcaoLabel(f.funcao).split(' /')[0]).join(', ');
  const apply = (x) =>
    Alert.alert('Confirmar candidatura?', `${funcaoLabel(x.funcao)} na ${x.empresa}, ${dataBR(x.data)} das ${x.inicio} às ${x.fim}, por ${brlDiaria(x.diaria)}.\n\nSe for confirmado(a) e faltar sem avisar, você perde pontos e pode ficar fora dos extras.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Candidatar', onPress: () => dispatch({ type: 'EXTRA_APPLY', id: x.id }) },
    ]);
  return (
    <View>
      <TouchableOpacity style={[st.card, { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: p.disponivel ? colors.success : colors.primary }]} onPress={() => setEditing(true)} accessibilityLabel="Editar meu perfil de extra">
        <Ionicons name={p.disponivel ? 'flash' : 'flash-outline'} size={22} color={p.disponivel ? colors.success : colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.title}>{p.disponivel ? 'Disponível para extras' : 'Quero fazer extras'}</Text>
          <Text style={st.muted} numberOfLines={2}>{p.disponivel && funcs ? `${funcs} · ${aptas} vaga(s) para você` : 'Diga o que você sabe fazer, os dias e os turnos. Só aparecem para você os extras que você pode pegar.'}</Text>
        </View>
        <Ionicons name="create-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
      <View style={[st.wrap, { marginBottom: 8 }]}>
        <Chip on={!soAptas} label={`Todos (${todas.length})`} onPress={() => setSoAptas(false)} />
        <Chip on={soAptas} label={`Posso pegar (${aptas})`} icon="checkmark-circle-outline" onPress={() => setSoAptas(true)} />
      </View>
      {lista.map((x) => (
        <ExtraCard key={x.id} x={x} perfil={p} onApply={() => apply(x)} onQuit={() => dispatch({ type: 'EXTRA_DESISTIR', id: x.id })} />
      ))}
      {!lista.length ? <Text style={[st.muted, { textAlign: 'center', marginVertical: 20 }]}>Nenhum extra que combine com você agora. Complete o perfil de extra para aparecerem mais.</Text> : null}
      <ExtraPerfilEditor visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

export const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...soft },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 12.5 },
  pay: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  when: { color: colors.text, fontWeight: '700', marginTop: 10 },
  reqTitle: { color: colors.text, fontWeight: '800', fontSize: 12.5, marginTop: 10, marginBottom: 2 },
  req: { color: colors.muted, fontSize: 12.5 },
  status: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, marginTop: 10 },
  apply: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginTop: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipTxt: { color: colors.text, fontSize: 12, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFE6CC' },
  save: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  section: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 16, marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 12.5, marginBottom: 6 },
});
