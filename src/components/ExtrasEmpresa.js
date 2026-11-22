// Extras, lado da empresa (RH): chamar um extra para um dia/turno com os requisitos, e ver só quem
// cumpre todos (função no nível pedido, disponível no dia e turno, nota, histórico e itens).
// Quem não cumpre não aparece e nem consegue se candidatar.
import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { FUNCOES_EXTRA, NIVEIS, ITENS, EXTRAS_GENTE, funcaoLabel, nivelLabel, faltaPara, dataBR, brlDiaria, DIAS, diaDe } from '../extras';
import { st } from './Extras';

const prox = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const VAZIO = { funcao: 'garcom', vagas: '1', data: prox(1), inicio: '18:00', fim: '00:00', diaria: '', local: '', obs: '', nivel: 'ja-fiz', notaMin: '', feitosMin: '', itens: [] };
const hora = (t) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t || '').trim());

const Chip = ({ on, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]}>
    <Text numberOfLines={1} style={[st.chipTxt, on && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

function Form({ onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState({ ...VAZIO, local: (state.user && state.user.city) || '' });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const publicar = () => {
    const diaria = Number(String(f.diaria).replace(',', '.'));
    if (!(diaria >= 30)) return Alert.alert('Valor da diária', 'Coloque quanto vai pagar pelo turno (a partir de R$ 30).');
    if (!hora(f.inicio) || !hora(f.fim)) return Alert.alert('Horário', 'Use o formato 18:00.');
    dispatch({
      type: 'EXTRA_POST',
      extra: {
        empresa: (state.user && state.user.name) || 'Minha empresa',
        logo: '🏢',
        funcao: f.funcao,
        vagas: Math.max(1, parseInt(f.vagas, 10) || 1),
        data: f.data,
        inicio: f.inicio.trim(),
        fim: f.fim.trim(),
        diaria,
        local: f.local.trim() || 'Passo Fundo',
        obs: f.obs.trim(),
        requisitos: { nivel: f.nivel, notaMin: Number(String(f.notaMin).replace(',', '.')) || 0, feitosMin: parseInt(f.feitosMin, 10) || 0, itens: f.itens },
      },
    });
    onClose();
  };
  const Field = ({ label, k, ph, kb, w }) => (
    <View style={{ flex: w ? undefined : 1, width: w, marginRight: 8 }}>
      <Text style={st.reqTitle}>{label}</Text>
      <TextInput value={String(f[k])} onChangeText={set(k)} placeholder={ph} placeholderTextColor={colors.muted} keyboardType={kb} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EFE6CC', padding: 10, color: colors.text }} />
    </View>
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>Chamar extra</Text>
          <TouchableOpacity onPress={publicar} style={st.save}><Text style={{ color: '#fff', fontWeight: '800' }}>Publicar</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={st.section}>Função</Text>
          <View style={st.wrap}>{FUNCOES_EXTRA.map((x) => <Chip key={x.key} on={f.funcao === x.key} label={x.label} onPress={() => set('funcao')(x.key)} />)}</View>
          <Text style={st.section}>Quando</Text>
          <View style={st.wrap}>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => {
              const d = prox(n);
              const dia = (DIAS.find((x) => x.key === diaDe(d)) || {}).label;
              return <Chip key={d} on={f.data === d} label={n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : `${dia} ${dataBR(d)}`} onPress={() => set('data')(d)} />;
            })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {Field({ label: 'Início', k: 'inicio', ph: '18:00' })}
            {Field({ label: 'Fim', k: 'fim', ph: '00:00' })}
            {Field({ label: 'Vagas', k: 'vagas', ph: '1', kb: 'number-pad' })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {Field({ label: 'Diária (R$)', k: 'diaria', ph: '150', kb: 'decimal-pad' })}
            {Field({ label: 'Bairro / local', k: 'local', ph: 'Centro' })}
          </View>
          {Field({ label: 'Detalhes (opcional)', k: 'obs', ph: 'Ex.: casamento para 200 pessoas, refeição no local' })}

          <Text style={st.section}>Requisitos</Text>
          <Text style={st.hint}>Só quem cumpre tudo consegue se candidatar.</Text>
          <Text style={st.reqTitle}>Experiência mínima na função</Text>
          <View style={st.wrap}>{NIVEIS.map((n) => <Chip key={n.key} on={f.nivel === n.key} label={n.label} onPress={() => set('nivel')(n.key)} />)}</View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {Field({ label: 'Nota mínima (1 a 5)', k: 'notaMin', ph: 'sem mínimo', kb: 'decimal-pad' })}
            {Field({ label: 'Extras feitos (mín.)', k: 'feitosMin', ph: '0', kb: 'number-pad' })}
          </View>
          <Text style={st.reqTitle}>Precisa ter</Text>
          <View style={st.wrap}>{ITENS.map((it) => <Chip key={it} on={f.itens.includes(it)} label={it} onPress={() => setF((x) => ({ ...x, itens: x.itens.includes(it) ? x.itens.filter((y) => y !== it) : [...x.itens, it] }))} />)}</View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ExtrasEmpresa() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <TouchableOpacity style={[st.card, { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary }]} onPress={() => setForm(true)} accessibilityLabel="Chamar extra">
        <Ionicons name="flash" size={22} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.title}>Chamar extra</Text>
          <Text style={st.muted}>Garçom, barman, cozinha, recepção, montagem... para um dia ou turno. Você define os requisitos e só recebe quem sabe fazer.</Text>
        </View>
        <Ionicons name="add-circle" size={24} color={colors.primary} />
      </TouchableOpacity>
      {state.myExtras.map((x) => {
        const aptos = EXTRAS_GENTE.filter((g) => !faltaPara(g.perfil, x).length);
        const cands = (x.candidatos || []).filter((c) => c.status !== 'dispensado');
        const confirmados = cands.filter((c) => c.status === 'confirmado').length;
        const r = x.requisitos || {};
        return (
          <View key={x.id} style={st.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={st.title}>{funcaoLabel(x.funcao)} · {confirmados}/{x.vagas} confirmado(s)</Text>
                <Text style={st.muted}>{dataBR(x.data)} · {x.inicio} às {x.fim} · {brlDiaria(x.diaria)}</Text>
                <Text style={st.muted}>Pede: {nivelLabel(r.nivel)}{r.notaMin ? ` · nota ${r.notaMin}+` : ''}{r.feitosMin ? ` · ${r.feitosMin}+ extras` : ''}{(r.itens || []).length ? ` · ${r.itens.join(', ')}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Cancelar este extra?', 'Quem se candidatou é avisado.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Cancelar extra', style: 'destructive', onPress: () => dispatch({ type: 'EXTRA_REMOVE', id: x.id }) }])}>
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={st.reqTitle}>Candidatos ({cands.length})</Text>
            {cands.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{c.name}{c.status === 'confirmado' ? ' ✅' : ''}</Text>
                {c.status !== 'confirmado' ? (
                  <>
                    <TouchableOpacity onPress={() => dispatch({ type: 'EXTRA_CANDIDATO', id: x.id, cid: c.id, status: 'confirmado' })} style={[st.chip, st.chipOn]}><Text style={[st.chipTxt, { color: '#fff' }]}>Confirmar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => dispatch({ type: 'EXTRA_CANDIDATO', id: x.id, cid: c.id, status: 'dispensado' })} style={st.chip}><Text style={st.chipTxt}>Dispensar</Text></TouchableOpacity>
                  </>
                ) : null}
              </View>
            ))}
            {!cands.length ? <Text style={st.muted}>Ainda ninguém. Quem cumpre os requisitos já está vendo o seu extra.</Text> : null}
            <Text style={st.reqTitle}>Aptos perto de você ({aptos.length})</Text>
            {aptos.map((g) => (
              <Text key={g.id} style={st.muted}>• {g.name} · {g.city} · nota {String(g.perfil.nota || '-').replace('.', ',')} · {g.perfil.feitos} extras</Text>
            ))}
            {!aptos.length ? <Text style={st.muted}>Ninguém perto cumpre todos os requisitos para esse dia e turno. Tente pedir menos experiência ou outro horário.</Text> : null}
          </View>
        );
      })}
      {form ? <Form onClose={() => setForm(false)} /> : null}
    </View>
  );
}
