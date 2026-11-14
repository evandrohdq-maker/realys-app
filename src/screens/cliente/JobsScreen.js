// Empregos (lado do usuário): vagas de empresas com CNPJ conferido, perto de você.
// - Currículo Re@lys: montado do perfil verificado; a pessoa completa habilidades e disponibilidade.
// - Compatibilidade: cada vaga mostra o quanto combina com o currículo (habilidades e distância).
// - Candidatura rápida com um toque, vagas salvas e o andamento de cada candidatura
//   (enviada → vista → entrevista → resultado), com o mesmo status que a empresa marca no RH.
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, allJobs } from '../../store';
import { colors, soft } from '../../theme';
import { Screen, Title, Empty, Photo } from '../../components/ui';
import { SearchBar } from '../../components/Search';
import { JOB_AREAS, salaryText, matchScore, APP_STEPS, AVAILABILITY, SKILL_SUGGESTIONS } from '../../jobsData';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const km = (d) => (d >= 10 ? `${Math.round(d)} km` : `${d.toFixed(1).replace('.', ',')} km`);
const matchColor = (m) => (m >= 85 ? '#1E9E63' : m >= 70 ? '#A8790A' : '#6E7891');

const QUICK = [
  { key: 'perto', label: 'Até 5 km', icon: 'location-outline' },
  { key: 'semexp', label: 'Sem experiência', icon: 'sparkles-outline' },
  { key: 'salario', label: 'Maior salário', icon: 'trending-up-outline' },
];

// Quanto do currículo está preenchido.
const resumeDone = (r) => {
  const parts = [r.headline, r.exp, r.edu, (r.skills || []).length >= 2, (r.avail || []).length, r.wish];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
};

export default function JobsScreen({ explore }) {
  const { state, dispatch } = useStore();
  const resume = state.resume || {};
  const saved = state.savedJobs || {};
  const [area, setArea] = useState('todas');
  const [seg, setSeg] = useState('vagas'); // vagas | salvas | minhas
  const [quick, setQuick] = useState({});
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!explore) return;
    if (explore.area) setArea(explore.area);
    if (explore.seg) setSeg(explore.seg);
    if (explore.job) setOpen(explore.job);
  }, [explore]);

  const every = useMemo(() => allJobs(state).map((j) => ({ ...j, match: matchScore(resume, j) })), [state.jobs, state.myJobs, resume]);
  const list = useMemo(() => {
    const term = norm(q.trim());
    const out = every
      .filter((j) => area === 'todas' || j.area === area)
      .filter((j) => !quick.perto || j.distanceKm <= 5)
      .filter((j) => !quick.semexp || j.noExp)
      .filter((j) => !term || norm(`${j.title} ${j.company} ${j.area} ${j.city} ${j.type} ${(j.skills || []).join(' ')}`).includes(term));
    return out.sort((a, b) =>
      quick.salario ? b.salary - a.salary : (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || b.match - a.match || a.distanceKm - b.distanceKm
    );
  }, [every, area, q, quick]);

  const applied = every.filter((j) => state.applications[j.id]);
  const savedList = every.filter((j) => saved[j.id]);
  const job = open ? every.find((j) => j.id === open) : null;

  // Andamento da candidatura: nas vagas da minha empresa, segue o que o RH marcou.
  const progressOf = (j) => {
    const mine = state.myJobs.find((x) => x.id === j.id);
    const c = mine && mine.candidates.find((x) => x.id === 'cand-me');
    if (!c) return { step: 0, label: 'Enviada' };
    if (c.status === 'contratado') return { step: 3, label: 'Você foi contratado(a)! 🎉', ok: true };
    if (c.status === 'recusado') return { step: 3, label: 'Não selecionado desta vez', no: true };
    if (c.status === 'entrevista') return { step: 2, label: 'Entrevista marcada', interview: c.interview };
    return { step: c.seen ? 1 : 0, label: c.seen ? 'Vista pela empresa' : 'Enviada' };
  };

  const quickApply = (j, msg = '') => {
    if (state.applications[j.id]) return;
    dispatch({ type: 'APPLY_JOB', id: j.id, note: msg.trim(), match: j.match });
    Alert.alert('Candidatura enviada ✅', `${j.company} recebeu seu currículo Re@lys, com identidade verificada. Acompanhe em "Candidaturas".`);
  };

  const done = resumeDone(resume);
  const tabs = [
    { key: 'vagas', label: 'Para você' },
    { key: 'salvas', label: `Salvas${savedList.length ? ` · ${savedList.length}` : ''}` },
    { key: 'minhas', label: `Candidaturas${applied.length ? ` · ${applied.length}` : ''}` },
  ];

  return (
    <Screen>
      <Title sub="Vagas de empresas verificadas, perto de você">Empregos</Title>

      {/* Currículo Re@lys */}
      <TouchableOpacity style={styles.resume} activeOpacity={0.9} onPress={() => setEditing(true)} accessibilityLabel="Editar meu currículo">
        <View style={styles.resAvatar}>
          {state.myProfile && state.myProfile.photo ? (
            <Photo uri={state.myProfile.photo} style={{ width: 52, height: 52, borderRadius: 26 }} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 22 }}>{(state.user && state.user.name[0]) || 'R'}</Text>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.resName} numberOfLines={1}>{(state.user && state.user.name) || 'Meu currículo'}</Text>
          <Text style={styles.resHead} numberOfLines={1}>{resume.headline || 'Diga o que você faz de melhor'}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${done}%` }]} />
          </View>
          <Text style={styles.resPct}>Currículo {done}% completo{resume.open ? ' · aberto a propostas' : ''}</Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.tabs}>
        {tabs.map((t) => {
          const on = t.key === seg;
          return (
            <TouchableOpacity key={t.key} onPress={() => setSeg(t.key)} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {seg === 'vagas' ? (
        <>
          <SearchBar value={q} onChangeText={setQ} onSubmit={setQ} placeholder="Cargo, empresa, habilidade ou cidade" voicePrompt="Que vaga você procura?" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {QUICK.map((f) => {
              const on = !!quick[f.key];
              return (
                <TouchableOpacity key={f.key} onPress={() => setQuick({ ...quick, [f.key]: !on })} style={[styles.chip, on && styles.chipOn]}>
                  <Ionicons name={f.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                  <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {JOB_AREAS.map((a) => {
              const on = a.key === area;
              return (
                <TouchableOpacity key={a.key} onPress={() => setArea(a.key)} style={[styles.areaChip, on && styles.areaOn]}>
                  <Text style={[styles.areaText, on && { color: colors.primaryDark, fontWeight: '800' }]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.count}>{list.length} vaga{list.length === 1 ? '' : 's'} · ordenadas pelo que combina com você</Text>
          {list.map((j) => (
            <JobCard key={j.id} j={j} applied={!!state.applications[j.id]} saved={!!saved[j.id]} onPress={() => setOpen(j.id)} onSave={() => dispatch({ type: 'TOGGLE_SAVE_JOB', id: j.id })} onApply={() => quickApply(j)} />
          ))}
          {!list.length ? <Empty text="Nenhuma vaga com esses filtros. Tire algum filtro para ver mais." /> : null}
        </>
      ) : null}

      {seg === 'salvas' ? (
        <>
          {savedList.map((j) => (
            <JobCard key={j.id} j={j} applied={!!state.applications[j.id]} saved onPress={() => setOpen(j.id)} onSave={() => dispatch({ type: 'TOGGLE_SAVE_JOB', id: j.id })} onApply={() => quickApply(j)} />
          ))}
          {!savedList.length ? <Empty text="Toque no marcador de uma vaga para guardar e ver depois." /> : null}
        </>
      ) : null}

      {seg === 'minhas' ? (
        <>
          {applied.map((j) => {
            const p = progressOf(j);
            return (
              <TouchableOpacity key={j.id} style={styles.card} activeOpacity={0.88} onPress={() => setOpen(j.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.logo}><Text style={{ fontSize: 22 }}>{j.logo}</Text></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.title} numberOfLines={1}>{j.title}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{j.company}</Text>
                  </View>
                </View>
                <Steps step={p.step} ok={p.ok} no={p.no} />
                <Text style={[styles.stepLabel, p.ok && { color: colors.success }, p.no && { color: colors.muted }]}>{p.label}</Text>
                {p.interview ? (
                  <View style={styles.interview}>
                    <Ionicons name={p.interview.mode === 'video' ? 'videocam' : 'business'} size={16} color={colors.primary} />
                    <Text style={{ marginLeft: 6, color: colors.text, flex: 1 }}>
                      {p.interview.when} · {p.interview.mode === 'video' ? 'por vídeo no Re@lys' : 'na empresa'}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
          {!applied.length ? <Empty text="Você ainda não se candidatou. Em 'Para você' tem vagas que combinam com seu currículo." /> : null}
        </>
      ) : null}

      <View style={styles.cta}>
        <Ionicons name="business-outline" size={20} color={colors.primary} />
        <Text style={styles.ctaText}>Tem empresa? Anuncie vagas, receba candidatos verificados e convide talentos pela área empresarial (RH).</Text>
      </View>

      {/* Detalhe da vaga */}
      <Modal visible={!!job} animationType="slide" transparent onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {job ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.logoBig}><Text style={{ fontSize: 30 }}>{job.logo}</Text></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetTitle}>{job.title}</Text>
                    <TouchableOpacity onPress={() => { setOpen(null); dispatch({ type: 'OPEN_COMPANY', id: job.companyId }); }}>
                      <Text style={styles.company}>{job.company} <Ionicons name="shield-checkmark" size={12} color={colors.primary} /> ›</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setOpen(null)} accessibilityLabel="Fechar">
                    <Ionicons name="close" size={26} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.salaryBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.salary}>{salaryText(job)}</Text>
                    <Text style={styles.meta}>{job.type} · {job.shift || 'Horário a combinar'} · {km(job.distanceKm)}</Text>
                  </View>
                  <View style={[styles.matchBig, { borderColor: matchColor(job.match) }]}>
                    <Text style={[styles.matchBigN, { color: matchColor(job.match) }]}>{job.match}%</Text>
                    <Text style={styles.matchBigL}>combina</Text>
                  </View>
                </View>

                {job.skills && job.skills.length ? (
                  <>
                    <Text style={styles.h3}>Habilidades da vaga</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {job.skills.map((sk) => {
                        const have = (resume.skills || []).some((m) => norm(m).includes(norm(sk)) || norm(sk).includes(norm(m)));
                        return (
                          <View key={sk} style={[styles.skill, have && styles.skillHave]}>
                            <Ionicons name={have ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={have ? colors.success : colors.muted} />
                            <Text style={[styles.skillText, have && { color: colors.success }]}>{sk}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.hint}>Verde: você já tem no currículo.</Text>
                  </>
                ) : null}

                {job.benefits ? (
                  <>
                    <Text style={styles.h3}>Benefícios</Text>
                    <Text style={styles.body}>🎁 {job.benefits}</Text>
                  </>
                ) : null}
                <Text style={styles.h3}>Sobre a vaga</Text>
                <Text style={styles.body}>{job.desc}</Text>
                {job.reqs && job.reqs.length ? (
                  <>
                    <Text style={styles.h3}>Requisitos</Text>
                    {job.reqs.map((r) => <Text key={r} style={styles.body}>• {r}</Text>)}
                  </>
                ) : null}
                {job.noExp ? <Text style={[styles.body, { color: colors.success, fontWeight: '700', marginTop: 6 }]}>✓ Aceita quem está começando</Text> : null}

                {state.applications[job.id] ? (
                  <>
                    <Steps step={progressOf(job).step} ok={progressOf(job).ok} no={progressOf(job).no} />
                    <Text style={styles.stepLabel}>{progressOf(job).label}</Text>
                    <TouchableOpacity onPress={() => dispatch({ type: 'CANCEL_APPLICATION', id: job.id })} style={{ marginTop: 12, alignSelf: 'center' }}>
                      <Text style={{ color: colors.danger, fontWeight: '700' }}>Cancelar candidatura</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.h3}>Mensagem para a empresa (opcional)</Text>
                    <TextInput placeholder="Ex.: Tenho 2 anos de experiência e moro perto" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} style={styles.input} multiline />
                    <Text style={styles.hint}>Vai junto o seu currículo Re@lys, com nome e foto verificados por biometria.</Text>
                    <TouchableOpacity style={styles.applyBig} onPress={() => { quickApply(job, note); setNote(''); setOpen(null); }}>
                      <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Candidatar-se</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_SAVE_JOB', id: job.id })} style={{ marginTop: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={saved[job.id] ? 'bookmark' : 'bookmark-outline'} size={17} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 5 }}>{saved[job.id] ? 'Salva' : 'Salvar vaga'}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <ResumeEditor visible={editing} onClose={() => setEditing(false)} />
    </Screen>
  );
}

// Etapas da candidatura em bolinhas ligadas.
function Steps({ step, ok, no }) {
  return (
    <View style={styles.steps}>
      {APP_STEPS.map((s, i) => {
        const on = i <= step;
        const last = i === APP_STEPS.length - 1;
        const col = last && on ? (no ? colors.muted : colors.success) : on ? colors.primary : colors.border;
        return (
          <React.Fragment key={s.key}>
            <View style={{ alignItems: 'center', width: 64 }}>
              <View style={[styles.dot, { backgroundColor: col }]}>
                {on ? <Ionicons name={last && no ? 'close' : 'checkmark'} size={11} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.dotLabel, on && { color: colors.text }]} numberOfLines={2}>{last && ok ? 'Contratado' : s.label}</Text>
            </View>
            {!last ? <View style={[styles.line, { backgroundColor: i < step ? colors.primary : colors.border }]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function JobCard({ j, applied, saved, onPress, onSave, onApply }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={styles.logo}><Text style={{ fontSize: 24 }}>{j.logo}</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title} numberOfLines={1}>{j.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {j.company} <Ionicons name="shield-checkmark" size={11} color={colors.primary} /> · {km(j.distanceKm)}
          </Text>
          <Text style={styles.salarySmall}>{salaryText(j)}</Text>
        </View>
        <TouchableOpacity onPress={onSave} hitSlop={10} accessibilityLabel={saved ? 'Tirar das salvas' : 'Salvar vaga'}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={21} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <View style={[styles.matchPill, { backgroundColor: matchColor(j.match) + '1A' }]}>
          <Ionicons name="flash" size={11} color={matchColor(j.match)} />
          <Text style={[styles.matchText, { color: matchColor(j.match) }]}>{j.match}% combina</Text>
        </View>
        <View style={styles.tag}><Text style={styles.tagText}>{j.type}</Text></View>
        {j.noExp ? <View style={styles.tag}><Text style={styles.tagText}>Sem experiência</Text></View> : null}
        {j.sponsored ? <View style={[styles.tag, { backgroundColor: colors.sponsored + '22' }]}><Text style={[styles.tagText, { color: colors.sponsored }]}>Destaque</Text></View> : null}
        <Text style={styles.posted}>{j.posted}</Text>
      </View>
      {applied ? (
        <View style={styles.appliedRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ color: colors.success, fontWeight: '700', marginLeft: 5 }}>Candidatura enviada</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.applyBtn} onPress={onApply} accessibilityLabel={`Candidatura rápida para ${j.title}`}>
          <Ionicons name="flash-outline" size={15} color={colors.onPrimary} />
          <Text style={{ color: colors.onPrimary, fontWeight: '800', marginLeft: 5 }}>Candidatura rápida</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// Editor do currículo Re@lys.
function ResumeEditor({ visible, onClose }) {
  const { state, dispatch } = useStore();
  const [r, setR] = useState(state.resume || {});
  const [custom, setCustom] = useState('');
  useEffect(() => {
    if (visible) setR(state.resume || {});
  }, [visible]);
  const toggle = (field, v) => {
    const has = (r[field] || []).includes(v);
    setR({ ...r, [field]: has ? r[field].filter((x) => x !== v) : [...(r[field] || []), v] });
  };
  const addSkill = () => {
    const t = custom.trim();
    if (!t) return;
    if (!(r.skills || []).includes(t)) setR({ ...r, skills: [...(r.skills || []), t] });
    setCustom('');
  };
  const save = () => {
    dispatch({ type: 'SET_RESUME', resume: r });
    onClose();
  };
  const skills = Array.from(new Set([...(r.skills || []), ...SKILL_SUGGESTIONS]));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.sheetTitle, { flex: 1, marginTop: 0 }]}>Meu currículo</Text>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar"><Ionicons name="close" size={26} color={colors.muted} /></TouchableOpacity>
            </View>
            <Text style={styles.hint}>Nome, foto e cidade vêm do seu perfil verificado. Complete o resto para as vagas combinarem com você.</Text>
            <Text style={styles.h3}>O que você faz</Text>
            <TextInput value={r.headline} onChangeText={(headline) => setR({ ...r, headline })} placeholder="Ex.: Atendente e operadora de caixa" placeholderTextColor={colors.muted} style={styles.input} maxLength={60} />
            <Text style={styles.h3}>Experiência</Text>
            <TextInput value={r.exp} onChangeText={(exp) => setR({ ...r, exp })} placeholder="Ex.: 2 anos como caixa no Mercado Central" placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 70 }]} multiline />
            <Text style={styles.h3}>Formação</Text>
            <TextInput value={r.edu} onChangeText={(edu) => setR({ ...r, edu })} placeholder="Ex.: Ensino médio completo" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.h3}>Habilidades</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {skills.map((sk) => {
                const on = (r.skills || []).includes(sk);
                return (
                  <TouchableOpacity key={sk} onPress={() => toggle('skills', sk)} style={[styles.pick, on && styles.pickOn]}>
                    <Text style={[styles.pickText, on && { color: colors.onPrimary }]}>{sk}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <TextInput value={custom} onChangeText={setCustom} placeholder="Outra habilidade" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} onSubmitEditing={addSkill} />
              <TouchableOpacity onPress={addSkill} style={styles.addBtn}><Ionicons name="add" size={20} color="#FFFFFF" /></TouchableOpacity>
            </View>
            <Text style={styles.h3}>Disponibilidade</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {AVAILABILITY.map((a) => {
                const on = (r.avail || []).includes(a);
                return (
                  <TouchableOpacity key={a} onPress={() => toggle('avail', a)} style={[styles.pick, on && styles.pickOn]}>
                    <Text style={[styles.pickText, on && { color: colors.onPrimary }]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.h3}>Pretensão salarial (opcional)</Text>
            <TextInput value={r.wish} onChangeText={(wish) => setR({ ...r, wish })} placeholder="Ex.: R$ 2.000" placeholderTextColor={colors.muted} style={styles.input} keyboardType="default" />
            <View style={styles.openRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Aberto a propostas</Text>
                <Text style={styles.hint}>Empresas perto de você podem encontrar seu currículo e te convidar para vagas.</Text>
              </View>
              <Switch value={!!r.open} onValueChange={(open) => setR({ ...r, open })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
            </View>
            <TouchableOpacity style={styles.applyBig} onPress={save}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Salvar currículo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  resume: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 20, padding: 14, marginBottom: 12, ...soft },
  resAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  resName: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  resHead: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 1 },
  barBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 8, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  resPct: { color: 'rgba(255,255,255,0.88)', fontSize: 11, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 4, marginBottom: 12 },
  tab: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: '#FFFFFF', ...soft },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  tabTextOn: { color: colors.primaryDark, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { marginLeft: 5, fontWeight: '700', color: colors.primary, fontSize: 12 },
  areaChip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', marginRight: 4 },
  areaOn: { backgroundColor: colors.primaryLight },
  areaText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  count: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 10, ...soft },
  logo: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  logoBig: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', color: colors.text, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  salarySmall: { color: colors.primary, fontWeight: '800', marginTop: 4, fontSize: 14 },
  matchPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 24, borderRadius: 12, marginRight: 6, marginBottom: 4 },
  matchText: { fontWeight: '800', fontSize: 11, marginLeft: 3 },
  tag: { paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: colors.cardAlt, justifyContent: 'center', marginRight: 6, marginBottom: 4 },
  tagText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  posted: { color: colors.muted, fontSize: 11, marginLeft: 'auto' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 19, backgroundColor: colors.primary, marginTop: 10 },
  appliedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 19, backgroundColor: '#E8F6EE', marginTop: 10 },
  steps: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotLabel: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 4 },
  line: { flex: 1, height: 2, marginTop: 9 },
  stepLabel: { color: colors.primaryDark, fontWeight: '800', marginTop: 8 },
  interview: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginTop: 8 },
  cta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12, marginTop: 8 },
  ctaText: { flex: 1, marginLeft: 8, color: colors.muted, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, maxHeight: '92%' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  company: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  salaryBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginTop: 14, ...soft },
  salary: { fontSize: 20, fontWeight: '800', color: colors.primary },
  matchBig: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  matchBigN: { fontWeight: '800', fontSize: 17 },
  matchBigL: { color: colors.muted, fontSize: 10 },
  skill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  skillHave: { backgroundColor: '#E8F6EE' },
  skillText: { marginLeft: 5, color: colors.text, fontWeight: '600', fontSize: 12 },
  h3: { fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 6 },
  body: { color: colors.text, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 6 },
  applyBig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 25, backgroundColor: colors.primary, marginTop: 12 },
  pick: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  pickOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 6 },
  openRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: 14 },
});
