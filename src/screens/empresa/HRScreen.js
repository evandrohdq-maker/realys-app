// RH da empresa: anunciar vagas e acompanhar os candidatos (todos com identidade verificada).
// - Funil por vaga: Novos → Entrevista → Contratados (e Não selecionados), com a compatibilidade de cada um.
// - Currículo completo do candidato, entrevista marcada com dia, hora e formato (na empresa ou por vídeo).
// - Banco de talentos: pessoas abertas a propostas perto da empresa, para convidar para a vaga.
// - Nova vaga com benefícios, habilidades, "aceita sem experiência" e destaque.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, soft } from '../../theme';
import { Screen, Title, Photo, Empty } from '../../components/ui';
import { JOB_AREAS, JOB_TYPES, CANDIDATE_STATUS, salaryText, BENEFITS, SKILL_SUGGESTIONS, TALENTS } from '../../jobsData';

const EMPTY = { title: '', salary: '', shift: '', desc: '', reqs: '', area: 'Comércio', type: 'CLT', benefits: [], skills: [], noExp: false, sponsored: false };
const STAGES = [
  { key: 'novos', label: 'Novos', has: (c) => c.status === 'novo' || c.status === 'convidado' },
  { key: 'entrevista', label: 'Entrevista', has: (c) => c.status === 'entrevista' },
  { key: 'contratado', label: 'Contratados', has: (c) => c.status === 'contratado' },
  { key: 'recusado', label: 'Não selecionados', has: (c) => c.status === 'recusado' },
];
const DAYS = ['Hoje', 'Amanhã', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const HOURS = ['9h', '10h', '11h', '14h', '15h', '16h', '17h'];
const matchColor = (m) => (m >= 85 ? '#1E9E63' : m >= 70 ? '#A8790A' : '#6E7891');

export default function HRScreen() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(null);
  const [jobId, setJobId] = useState(state.myJobs[0] ? state.myJobs[0].id : null);
  const [stage, setStage] = useState('novos');
  const [cv, setCv] = useState(null); // candidato aberto
  const [meet, setMeet] = useState(null); // { cand, day, hour, mode }
  const [talents, setTalents] = useState(false);

  const open = state.myJobs.filter((j) => j.status === 'aberta');
  const allCands = state.myJobs.flatMap((j) => j.candidates);
  const newOnes = allCands.filter((c) => c.status === 'novo').length;
  const interviews = allCands.filter((c) => c.status === 'entrevista').length;
  const hired = allCands.filter((c) => c.status === 'contratado').length;
  const job = state.myJobs.find((j) => j.id === jobId) || state.myJobs[0];
  const st = STAGES.find((s) => s.key === stage);
  const cands = job ? job.candidates.filter(st.has).sort((a, b) => (b.match || 0) - (a.match || 0)) : [];

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
        benefits: form.benefits.join(', '),
        skills: form.skills,
        noExp: form.noExp,
        sponsored: form.sponsored,
      },
    });
    setForm(null);
    setStage('novos');
    Alert.alert('Vaga publicada ✅', `Ela já aparece em Empregos para quem está perto da sua empresa${form.sponsored ? ', em destaque' : ''}.`);
  };

  const openCv = (c) => {
    if (!c.seen) dispatch({ type: 'SEE_CANDIDATE', jobId: job.id, candId: c.id });
    setCv(c);
  };
  const setStatus = (c, status, interview) => {
    dispatch({ type: 'CANDIDATE_STATUS', jobId: job.id, candId: c.id, status, interview });
    setCv(null);
    const first = c.name.split(' ')[0];
    if (status === 'contratado') Alert.alert('Contratação 🎉', `${c.name} foi contratado(a). Na versão real, o cadastro segue para o eSocial e a folha.`);
    if (status === 'recusado') Alert.alert('Retorno enviado', `${first} recebeu uma resposta educada de que não foi selecionado(a) desta vez. Ninguém fica sem retorno no Re@lys.`);
  };
  const confirmMeet = () => {
    const when = `${meet.day} às ${meet.hour}`;
    setStatus(meet.cand, 'entrevista', { when, mode: meet.mode });
    Alert.alert('Entrevista marcada', `${meet.cand.name.split(' ')[0]} recebeu o convite: ${when}, ${meet.mode === 'video' ? 'por vídeo no Re@lys' : 'na empresa'}.`);
    setMeet(null);
  };
  const invite = (t) => {
    if (!job) return;
    dispatch({ type: 'INVITE_TALENT', jobId: job.id, talent: t });
    Alert.alert('Convite enviado', `${t.name.split(' ')[0]} recebeu o convite para a vaga de ${job.title}.`);
  };
  const toggle = (field, v) => setForm({ ...form, [field]: form[field].includes(v) ? form[field].filter((x) => x !== v) : [...form[field], v] });

  return (
    <Screen>
      <Title sub="Anuncie vagas e contrate pessoas verificadas">RH</Title>

      <View style={styles.stats}>
        {[
          [open.length, 'Vagas abertas', colors.primary],
          [newOnes, 'Novos', '#2F74D0'],
          [interviews, 'Entrevistas', '#A8790A'],
          [hired, 'Contratados', colors.success],
        ].map(([n, l, c]) => (
          <View key={l} style={styles.stat}>
            <Text style={[styles.statN, { color: c }]}>{n}</Text>
            <Text style={styles.statL}>{l}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <TouchableOpacity style={[styles.bigBtn, { marginRight: 8 }]} onPress={() => setForm(EMPTY)}>
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.bigBtnText}>Anunciar vaga</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bigBtn, styles.bigBtnLight]} onPress={() => setTalents(true)}>
          <Ionicons name="people" size={18} color={colors.primary} />
          <Text style={[styles.bigBtnText, { color: colors.primary }]}>Banco de talentos</Text>
        </TouchableOpacity>
      </View>

      {!state.myJobs.length ? <Empty text="Nenhuma vaga anunciada ainda." /> : null}

      {/* Vagas (toque para ver o funil de candidatos) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {state.myJobs.map((j) => {
          const on = job && j.id === job.id;
          const closed = j.status !== 'aberta';
          const nNew = j.candidates.filter((c) => c.status === 'novo' && !c.seen).length;
          return (
            <TouchableOpacity key={j.id} onPress={() => setJobId(j.id)} style={[styles.jobTab, on && styles.jobTabOn]}>
              <Text style={[styles.jobTabTitle, on && { color: '#FFFFFF' }]} numberOfLines={1}>{j.title}</Text>
              <Text style={[styles.jobTabMeta, on && { color: 'rgba(255,255,255,0.85)' }]}>
                {closed ? 'Encerrada' : `${j.candidates.length} candidato${j.candidates.length === 1 ? '' : 's'}`}
              </Text>
              {nNew ? <View style={styles.newDot}><Text style={styles.newDotText}>{nNew}</Text></View> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {job ? (
        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{job.title}</Text>
              <Text style={styles.meta}>{salaryText(job)} · {job.type} · {job.posted}</Text>
            </View>
            <TouchableOpacity onPress={() => dispatch({ type: 'CLOSE_JOB', id: job.id })}>
              <Text style={{ color: job.status !== 'aberta' ? colors.primary : colors.danger, fontWeight: '700', fontSize: 12 }}>{job.status !== 'aberta' ? 'Reabrir' : 'Encerrar'}</Text>
            </TouchableOpacity>
          </View>
          {/* Funil */}
          <View style={styles.stages}>
            {STAGES.map((s) => {
              const n = job.candidates.filter(s.has).length;
              const on = s.key === stage;
              return (
                <TouchableOpacity key={s.key} onPress={() => setStage(s.key)} style={[styles.stage, on && styles.stageOn]}>
                  <Text style={[styles.stageN, on && { color: colors.primaryDark }]}>{n}</Text>
                  <Text style={[styles.stageL, on && { color: colors.primaryDark, fontWeight: '800' }]} numberOfLines={1}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!cands.length ? (
            <Text style={[styles.meta, { textAlign: 'center', paddingVertical: 14 }]}>
              {stage === 'novos' ? 'Ainda sem candidatos novos. Convide pessoas no Banco de talentos.' : 'Ninguém nesta etapa.'}
            </Text>
          ) : null}
          {cands.map((c) => {
            const s = CANDIDATE_STATUS[c.status];
            return (
              <TouchableOpacity key={c.id} style={styles.cand} onPress={() => openCv(c)} activeOpacity={0.85}>
                <Photo uri={c.photo} style={styles.avatar} fallback="👤" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.candName} numberOfLines={1}>{c.name}</Text>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                    {!c.seen && c.status === 'novo' ? <View style={styles.unseen} /> : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>{c.headline || c.exp}</Text>
                  <Text style={[styles.meta, { color: s.color, fontWeight: '700' }]} numberOfLines={1}>
                    {c.status === 'entrevista' && c.interview ? `Entrevista ${c.interview.when}` : s.label}
                  </Text>
                </View>
                {c.match ? (
                  <View style={[styles.match, { borderColor: matchColor(c.match) }]}>
                    <Text style={[styles.matchN, { color: matchColor(c.match) }]}>{c.match}%</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.note}>
        <Ionicons name="lock-closed" size={15} color={colors.primaryDark} />
        <Text style={{ color: colors.primaryDark, fontSize: 12, marginLeft: 6, flex: 1 }}>
          Todo candidato tem identidade verificada por biometria. Vagas em destaque aparecem primeiro para quem procura emprego perto da sua empresa.
        </Text>
      </View>

      {/* Currículo do candidato */}
      <Modal visible={!!cv} animationType="slide" transparent onRequestClose={() => setCv(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {cv ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Photo uri={cv.photo} style={{ width: 64, height: 64, borderRadius: 32 }} fallback="👤" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetTitle}>{cv.name} <Ionicons name="shield-checkmark" size={15} color={colors.primary} /></Text>
                    <Text style={styles.meta}>{cv.city}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCv(null)} accessibilityLabel="Fechar"><Ionicons name="close" size={26} color={colors.muted} /></TouchableOpacity>
                </View>
                {cv.match ? <Text style={[styles.cvMatch, { color: matchColor(cv.match) }]}>⚡ {cv.match}% compatível com a vaga</Text> : null}
                {cv.headline ? <Field label="O que faz" text={cv.headline} /> : null}
                <Field label="Experiência" text={cv.exp} />
                {cv.edu ? <Field label="Formação" text={cv.edu} /> : null}
                {cv.avail ? <Field label="Disponibilidade" text={cv.avail} /> : null}
                {cv.skills && cv.skills.length ? (
                  <>
                    <Text style={styles.h3}>Habilidades</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {cv.skills.map((s) => <View key={s} style={styles.skill}><Text style={styles.skillText}>{s}</Text></View>)}
                    </View>
                  </>
                ) : null}
                {cv.status === 'novo' || cv.status === 'convidado' ? (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => (setMeet({ cand: cv, day: 'Amanhã', hour: '10h', mode: 'presencial' }), setCv(null))}>
                    <Ionicons name="calendar" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryText}>Marcar entrevista</Text>
                  </TouchableOpacity>
                ) : null}
                {cv.status === 'entrevista' ? (
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.success }]} onPress={() => setStatus(cv, 'contratado')}>
                    <Ionicons name="checkmark-done" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryText}>Contratar</Text>
                  </TouchableOpacity>
                ) : null}
                {cv.status !== 'contratado' && cv.status !== 'recusado' ? (
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity style={[styles.ghostBtn, { marginRight: 8 }]} onPress={() => Alert.alert('Mensagem', `Conversa com ${cv.name.split(' ')[0]} aberta no chat do Re@lys.`)}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                      <Text style={styles.ghostText}>Mensagem</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => setStatus(cv, 'recusado')}>
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.ghostText, { color: colors.danger }]}>Não seguir</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Marcar entrevista */}
      <Modal visible={!!meet} animationType="fade" transparent onRequestClose={() => setMeet(null)}>
        <View style={[styles.backdrop, { justifyContent: 'center', padding: 20 }]}>
          {meet ? (
            <View style={[styles.sheet, { borderRadius: 24 }]}>
              <Text style={styles.sheetTitle}>Entrevista com {meet.cand.name.split(' ')[0]}</Text>
              <Text style={styles.h3}>Formato</Text>
              <View style={{ flexDirection: 'row' }}>
                {[['presencial', 'Na empresa', 'business-outline'], ['video', 'Por vídeo', 'videocam-outline']].map(([k, l, i]) => (
                  <TouchableOpacity key={k} onPress={() => setMeet({ ...meet, mode: k })} style={[styles.pick, { flex: 1, marginRight: 6, height: 40, flexDirection: 'row' }, meet.mode === k && styles.pickOn]}>
                    <Ionicons name={i} size={15} color={meet.mode === k ? '#FFFFFF' : colors.primary} />
                    <Text style={[styles.pickText, { marginLeft: 5 }, meet.mode === k && { color: '#FFFFFF' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.h3}>Dia</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {DAYS.map((d) => (
                  <TouchableOpacity key={d} onPress={() => setMeet({ ...meet, day: d })} style={[styles.pick, meet.day === d && styles.pickOn]}>
                    <Text style={[styles.pickText, meet.day === d && { color: '#FFFFFF' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.h3}>Horário</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {HOURS.map((h) => (
                  <TouchableOpacity key={h} onPress={() => setMeet({ ...meet, hour: h })} style={[styles.pick, meet.hour === h && styles.pickOn]}>
                    <Text style={[styles.pickText, meet.hour === h && { color: '#FFFFFF' }]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={confirmMeet}>
                <Text style={styles.primaryText}>Enviar convite</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMeet(null)} style={{ alignSelf: 'center', marginTop: 10 }}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Banco de talentos */}
      <Modal visible={talents} animationType="slide" transparent onRequestClose={() => setTalents(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Banco de talentos</Text>
                <Text style={styles.meta}>Pessoas verificadas, abertas a propostas, perto da sua empresa{job ? ` · para: ${job.title}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setTalents(false)}><Ionicons name="close" size={26} color={colors.muted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {TALENTS.map((t) => {
                const invited = job && job.candidates.some((c) => c.id === t.id);
                return (
                  <View key={t.id} style={styles.talent}>
                    <Photo uri={t.photo} style={styles.avatar} fallback="👤" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.candName}>{t.name} <Ionicons name="checkmark-circle" size={13} color={colors.primary} /></Text>
                      <Text style={styles.meta}>{t.headline} · {t.city}</Text>
                      <Text style={[styles.meta, { color: matchColor(t.match), fontWeight: '800' }]}>⚡ {t.match}% compatível</Text>
                    </View>
                    <TouchableOpacity disabled={invited || !job} onPress={() => invite(t)} style={[styles.inviteBtn, invited && { backgroundColor: colors.cardAlt }]}>
                      <Text style={{ color: invited ? colors.muted : '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{invited ? 'Convidado' : 'Convidar'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Nova vaga */}
      <Modal visible={!!form} animationType="slide" transparent onRequestClose={() => setForm(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {form ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.sheetTitle, { flex: 1 }]}>Nova vaga</Text>
                  <TouchableOpacity onPress={() => setForm(null)}><Ionicons name="close" size={26} color={colors.muted} /></TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Cargo (ex.: Auxiliar de cozinha)" placeholderTextColor={colors.muted} value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
                <TextInput style={styles.input} placeholder="Salário R$ por mês" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={form.salary} onChangeText={(salary) => setForm({ ...form, salary })} />
                <TextInput style={styles.input} placeholder="Horário (ex.: Manhã, 7h às 15h)" placeholderTextColor={colors.muted} value={form.shift} onChangeText={(shift) => setForm({ ...form, shift })} />
                <TextInput style={[styles.input, { minHeight: 70 }]} placeholder="O que a pessoa vai fazer" placeholderTextColor={colors.muted} value={form.desc} onChangeText={(desc) => setForm({ ...form, desc })} multiline />
                <TextInput style={styles.input} placeholder="Requisitos, separados por vírgula" placeholderTextColor={colors.muted} value={form.reqs} onChangeText={(reqs) => setForm({ ...form, reqs })} />
                <Text style={styles.h3}>Área</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {JOB_AREAS.filter((a) => a.key !== 'todas').map((a) => (
                    <TouchableOpacity key={a.key} onPress={() => setForm({ ...form, area: a.key })} style={[styles.pick, form.area === a.key && styles.pickOn]}>
                      <Text style={[styles.pickText, form.area === a.key && { color: '#FFFFFF' }]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.h3}>Contrato</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {JOB_TYPES.map((t) => (
                    <TouchableOpacity key={t} onPress={() => setForm({ ...form, type: t })} style={[styles.pick, form.type === t && styles.pickOn]}>
                      <Text style={[styles.pickText, form.type === t && { color: '#FFFFFF' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.h3}>Benefícios</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {BENEFITS.map((b) => (
                    <TouchableOpacity key={b} onPress={() => toggle('benefits', b)} style={[styles.pick, form.benefits.includes(b) && styles.pickOn]}>
                      <Text style={[styles.pickText, form.benefits.includes(b) && { color: '#FFFFFF' }]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.h3}>Habilidades (ajudam a achar quem combina)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {SKILL_SUGGESTIONS.map((s) => (
                    <TouchableOpacity key={s} onPress={() => toggle('skills', s)} style={[styles.pick, form.skills.includes(s) && styles.pickOn]}>
                      <Text style={[styles.pickText, form.skills.includes(s) && { color: '#FFFFFF' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.switchRow}>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>Aceita quem está começando</Text>
                  <Switch value={form.noExp} onValueChange={(noExp) => setForm({ ...form, noExp })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
                </View>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Destacar a vaga</Text>
                    <Text style={styles.meta}>Aparece primeiro para quem procura emprego perto da empresa</Text>
                  </View>
                  <Switch value={form.sponsored} onValueChange={(sponsored) => setForm({ ...form, sponsored })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={save}>
                  <Text style={styles.primaryText}>Publicar vaga</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Field({ label, text }) {
  return (
    <>
      <Text style={styles.h3}>{label}</Text>
      <Text style={{ color: colors.text, lineHeight: 20 }}>{text}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 12, marginBottom: 12, ...soft },
  stat: { flex: 1, alignItems: 'center' },
  statN: { fontWeight: '800', fontSize: 20 },
  statL: { color: colors.muted, fontSize: 11, marginTop: 1 },
  bigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 23, backgroundColor: colors.primary },
  bigBtnLight: { backgroundColor: colors.primaryLight },
  bigBtnText: { color: '#FFFFFF', fontWeight: '800', marginLeft: 6 },
  jobTab: { width: 170, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', marginRight: 8, ...soft },
  jobTabOn: { backgroundColor: colors.primary },
  jobTabTitle: { color: colors.text, fontWeight: '800' },
  jobTabMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newDot: { position: 'absolute', right: 8, top: 8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#2F74D0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  newDotText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 12, ...soft },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  stages: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 4, marginTop: 12, marginBottom: 6 },
  stage: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 11 },
  stageOn: { backgroundColor: '#FFFFFF' },
  stageN: { color: colors.muted, fontWeight: '800', fontSize: 16 },
  stageL: { color: colors.muted, fontSize: 10 },
  cand: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  candName: { color: colors.text, fontWeight: '700', flexShrink: 1 },
  unseen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2F74D0', marginLeft: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  match: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  matchN: { fontWeight: '800', fontSize: 12 },
  note: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, maxHeight: '90%' },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  cvMatch: { fontWeight: '800', marginTop: 12 },
  h3: { fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 6 },
  skill: { paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: colors.cardAlt, justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  skillText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, backgroundColor: colors.primary, marginTop: 16 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginLeft: 6 },
  ghostBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  ghostText: { color: colors.primary, fontWeight: '700', marginLeft: 5 },
  pick: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  pickOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  talent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginBottom: 8, ...soft },
  inviteBtn: { paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: colors.primary, justifyContent: 'center' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: 12 },
});
