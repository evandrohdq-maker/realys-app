import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, Badge, Photo, Stat, Empty } from '../../components/ui';
import { JOB_AREAS, JOB_TYPES, CANDIDATE_STATUS, salaryText } from '../../jobsData';

const EMPTY = { title: '', salary: '', shift: '', desc: '', reqs: '', area: 'Comércio', type: 'CLT' };

// RH da empresa: anunciar vagas e acompanhar os candidatos (todos com identidade verificada).
export default function HRScreen() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(null);
  const [openJob, setOpenJob] = useState(state.myJobs[0] ? state.myJobs[0].id : null);

  const open = state.myJobs.filter((j) => j.status === 'aberta');
  const allCands = state.myJobs.flatMap((j) => j.candidates);
  const newOnes = allCands.filter((c) => c.status === 'novo').length;
  const hired = allCands.filter((c) => c.status === 'contratado').length;

  const save = () => {
    const salary = parseFloat(String(form.salary).replace(/\./g, '').replace(',', '.'));
    if (!form.title.trim() || isNaN(salary)) return Alert.alert('Preencha o cargo e o salário.');
    dispatch({
      type: 'POST_JOB',
      job: {
        title: form.title.trim(),
        salary,
        shift: form.shift.trim(),
        desc: form.desc.trim() || 'Vaga anunciada pelo Re@lys.',
        reqs: form.reqs.split(',').map((r) => r.trim()).filter(Boolean),
        area: form.area,
        type: form.type,
      },
    });
    setForm(null);
    Alert.alert('Vaga publicada ✅', 'Ela já aparece em Empregos para os clientes perto da sua empresa.');
  };

  const setStatus = (job, cand, status) => {
    dispatch({ type: 'CANDIDATE_STATUS', jobId: job.id, candId: cand.id, status });
    if (status === 'entrevista') Alert.alert('Entrevista', `Convite enviado para ${cand.name.split(' ')[0]} pelas mensagens do Re@lys.`);
    if (status === 'contratado') Alert.alert('Contratação 🎉', `${cand.name} foi contratado(a). Na versão real, o cadastro segue para o eSocial e a folha.`);
  };

  return (
    <Screen>
      <Title sub="Anuncie vagas e receba candidatos verificados">RH</Title>

      <Row style={{ marginHorizontal: -4, marginBottom: 12 }}>
        <Stat label="Vagas abertas" value={String(open.length)} />
        <Stat label="Candidatos novos" value={String(newOnes)} color={colors.accent} />
        <Stat label="Contratados" value={String(hired)} color={colors.success} />
      </Row>

      {form ? (
        <Card>
          <Text style={styles.h3}>Nova vaga</Text>
          <Input placeholder="Cargo (ex.: Auxiliar de cozinha)" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
          <Input placeholder="Salário R$ (por mês)" keyboardType="decimal-pad" value={form.salary} onChangeText={(salary) => setForm({ ...form, salary })} />
          <Input placeholder="Horário (ex.: Manhã, 7h às 15h)" value={form.shift} onChangeText={(shift) => setForm({ ...form, shift })} />
          <Input placeholder="O que a pessoa vai fazer" value={form.desc} onChangeText={(desc) => setForm({ ...form, desc })} multiline />
          <Input placeholder="Requisitos, separados por vírgula" value={form.reqs} onChangeText={(reqs) => setForm({ ...form, reqs })} />
          <Text style={styles.label}>Área</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {JOB_AREAS.filter((a) => a.key !== 'todas').map((a) => (
              <Pill key={a.key} label={a.label} on={form.area === a.key} onPress={() => setForm({ ...form, area: a.key })} />
            ))}
          </ScrollView>
          <Text style={styles.label}>Contrato</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {JOB_TYPES.map((t) => (
              <Pill key={t} label={t} on={form.type === t} onPress={() => setForm({ ...form, type: t })} />
            ))}
          </ScrollView>
          <Row>
            <Button title="Publicar vaga" onPress={save} style={{ flex: 1, marginRight: 6 }} />
            <Button title="Cancelar" variant="outline" onPress={() => setForm(null)} style={{ flex: 1, marginLeft: 6 }} />
          </Row>
        </Card>
      ) : (
        <Button title="+ Anunciar vaga" onPress={() => setForm(EMPTY)} style={{ marginBottom: 12 }} />
      )}

      {!state.myJobs.length ? <Empty text="Nenhuma vaga anunciada ainda." /> : null}

      {state.myJobs.map((j) => {
        const expanded = openJob === j.id;
        const closed = j.status !== 'aberta';
        return (
          <Card key={j.id}>
            <TouchableOpacity onPress={() => setOpenJob(expanded ? null : j.id)} activeOpacity={0.8}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{j.title}</Text>
                  <Text style={styles.meta}>{salaryText(j)} · {j.type} · {j.posted}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Row>
              <Row style={{ marginTop: 6 }}>
                <Badge label={closed ? 'Encerrada' : 'Aberta'} color={closed ? colors.muted : colors.success} />
                <Badge label={`${j.candidates.length} candidato${j.candidates.length === 1 ? '' : 's'}`} color={colors.accent} />
              </Row>
            </TouchableOpacity>

            {expanded ? (
              <View style={{ marginTop: 8 }}>
                {!j.candidates.length ? <Text style={styles.meta}>Ainda sem candidatos. A vaga aparece para quem está perto da empresa.</Text> : null}
                {j.candidates.map((c) => {
                  const st = CANDIDATE_STATUS[c.status];
                  const done = c.status === 'contratado' || c.status === 'recusado';
                  return (
                    <View key={c.id} style={styles.cand}>
                      <Row>
                        <Photo uri={c.photo} style={styles.avatar} fallback="👤" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Row>
                            <Text style={styles.candName} numberOfLines={1}>{c.name}</Text>
                            <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                          </Row>
                          <Text style={styles.meta}>{c.city}</Text>
                          <Text style={styles.exp}>{c.exp}</Text>
                        </View>
                      </Row>
                      <Row style={{ marginTop: 8, justifyContent: 'space-between' }}>
                        <Badge label={st.label} color={st.color} />
                        {!done ? (
                          <Row>
                            {c.status === 'novo' ? (
                              <Button small variant="light" title="Entrevistar" onPress={() => setStatus(j, c, 'entrevista')} style={{ marginRight: 6 }} />
                            ) : (
                              <Button small title="Contratar" onPress={() => setStatus(j, c, 'contratado')} style={{ marginRight: 6 }} />
                            )}
                            <Button small variant="outline" title="Recusar" onPress={() => setStatus(j, c, 'recusado')} />
                          </Row>
                        ) : null}
                      </Row>
                    </View>
                  );
                })}
                <TouchableOpacity onPress={() => dispatch({ type: 'CLOSE_JOB', id: j.id })} style={{ marginTop: 10 }}>
                  <Text style={{ color: closed ? colors.primary : colors.danger, fontWeight: '700' }}>{closed ? 'Reabrir vaga' : 'Encerrar vaga'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Card>
        );
      })}

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13 }}>
          🔒 Todo candidato tem identidade verificada por biometria. Vagas em destaque aparecem primeiro para quem procura emprego perto da sua empresa.
        </Text>
      </Card>
    </Screen>
  );
}

function Pill({ label, on, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, on && styles.pillOn]}>
      <Text style={[styles.pillText, on && { color: colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  h3: { color: colors.text, fontWeight: '700', marginBottom: 8, fontSize: 16 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  title: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  exp: { color: colors.text, fontSize: 12, marginTop: 2 },
  cand: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
  candName: { color: colors.text, fontWeight: '700', flexShrink: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  pill: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', marginRight: 6 },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontWeight: '700', color: colors.primary, fontSize: 12 },
});
