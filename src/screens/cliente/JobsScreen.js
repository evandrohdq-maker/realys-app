import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, allJobs } from '../../store';
import { colors, soft } from '../../theme';
import { Screen, Title, Badge, Row, Button, Input, Empty } from '../../components/ui';
import { SearchBar } from '../../components/Search';
import { JOB_AREAS, salaryText } from '../../jobsData';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const km = (d) => (d >= 10 ? `${Math.round(d)} km` : `${d.toFixed(1).replace('.', ',')} km`);

// Empregos: vagas de empresas verificadas, perto de você. Candidatura com um toque, usando o perfil.
export default function JobsScreen({ explore }) {
  const { state, dispatch } = useStore();
  const [area, setArea] = useState('todas');
  const [seg, setSeg] = useState('vagas'); // vagas | minhas
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!explore) return;
    if (explore.area) setArea(explore.area);
    if (explore.seg) setSeg(explore.seg);
    if (explore.job) setOpen(explore.job);
  }, [explore]);

  const list = useMemo(() => {
    const term = norm(q.trim());
    return allJobs(state)
      .filter((j) => area === 'todas' || j.area === area)
      .filter((j) => !term || norm(`${j.title} ${j.company} ${j.area} ${j.city} ${j.type}`).includes(term))
      .sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || a.distanceKm - b.distanceKm);
  }, [state.jobs, state.myJobs, area, q]);

  const applied = allJobs(state).filter((j) => state.applications[j.id]);
  const job = open ? allJobs(state).find((j) => j.id === open) : null;

  const apply = () => {
    dispatch({ type: 'APPLY_JOB', id: job.id, note: note.trim() });
    setNote('');
    setOpen(null);
    Alert.alert(
      'Candidatura enviada ✅',
      `${job.company} recebeu seu perfil verificado. A resposta chega nas suas mensagens.`
    );
  };

  return (
    <Screen>
      <Title sub="Vagas de empresas verificadas, perto de você">Empregos</Title>

      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={22} color={colors.onPrimary} />
        <Text style={styles.bannerText}>Sem vaga falsa: toda empresa tem CNPJ conferido e todo candidato tem identidade verificada.</Text>
      </View>

      <Row style={{ marginBottom: 12 }}>
        {[
          { key: 'vagas', label: 'Vagas' },
          { key: 'minhas', label: `Minhas candidaturas${applied.length ? ` (${applied.length})` : ''}` },
        ].map((t) => {
          const on = t.key === seg;
          return (
            <TouchableOpacity key={t.key} onPress={() => setSeg(t.key)} style={[styles.seg, on && styles.segOn]}>
              <Text style={[styles.segText, on && { color: colors.onPrimary }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </Row>

      {seg === 'vagas' ? (
        <>
          <SearchBar value={q} onChangeText={setQ} onSubmit={setQ} placeholder="Cargo, empresa ou cidade" voicePrompt="Que vaga você procura?" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {JOB_AREAS.map((a) => {
              const on = a.key === area;
              return (
                <TouchableOpacity key={a.key} onPress={() => setArea(a.key)} style={[styles.chip, on && styles.chipOn]}>
                  <Ionicons name={a.icon} size={14} color={on ? colors.onPrimary : colors.primary} />
                  <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {list.map((j) => (
            <JobCard key={j.id} j={j} applied={!!state.applications[j.id]} onPress={() => setOpen(j.id)} />
          ))}
          {!list.length ? <Empty text="Nenhuma vaga encontrada com esse filtro." /> : null}
        </>
      ) : (
        <>
          {applied.map((j) => (
            <JobCard key={j.id} j={j} applied onPress={() => setOpen(j.id)} />
          ))}
          {!applied.length ? <Empty text="Você ainda não se candidatou a nenhuma vaga." /> : null}
        </>
      )}

      <View style={styles.cta}>
        <Ionicons name="business-outline" size={20} color={colors.primary} />
        <Text style={styles.ctaText}>Tem empresa? Anuncie vagas e receba candidatos verificados pela área empresarial (aba RH).</Text>
      </View>

      <Modal visible={!!job} animationType="slide" transparent onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {job ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={styles.logo}><Text style={{ fontSize: 26 }}>{job.logo}</Text></View>
                  <TouchableOpacity onPress={() => setOpen(null)} accessibilityLabel="Fechar">
                    <Ionicons name="close" size={26} color={colors.muted} />
                  </TouchableOpacity>
                </Row>
                <Text style={styles.sheetTitle}>{job.title}</Text>
                <Text style={styles.meta}>{job.company} · {job.city}</Text>
                <Row style={{ flexWrap: 'wrap', marginVertical: 8 }}>
                  <Badge label={job.type} />
                  <Badge label={km(job.distanceKm)} color={colors.accent} />
                  {job.sponsored ? <Badge label="Destaque" color={colors.sponsored} /> : null}
                </Row>
                <Text style={styles.salary}>{salaryText(job)}</Text>
                {job.benefits ? <Text style={styles.line}>🎁 {job.benefits}</Text> : null}
                {job.shift ? <Text style={styles.line}>🕒 {job.shift}</Text> : null}
                <Text style={styles.h3}>Sobre a vaga</Text>
                <Text style={styles.body}>{job.desc}</Text>
                {job.reqs && job.reqs.length ? (
                  <>
                    <Text style={styles.h3}>Requisitos</Text>
                    {job.reqs.map((r) => (
                      <Text key={r} style={styles.body}>• {r}</Text>
                    ))}
                  </>
                ) : null}
                {state.applications[job.id] ? (
                  <>
                    <View style={styles.sent}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={{ color: colors.success, fontWeight: '700', marginLeft: 6 }}>Candidatura enviada</Text>
                    </View>
                    <Button variant="outline" title="Cancelar candidatura" onPress={() => dispatch({ type: 'CANCEL_APPLICATION', id: job.id })} />
                  </>
                ) : (
                  <>
                    <Text style={styles.h3}>Mensagem para a empresa (opcional)</Text>
                    <Input placeholder="Conte sua experiência em uma frase" value={note} onChangeText={setNote} />
                    <Text style={styles.hint}>Seu perfil verificado (nome, cidade e foto) vai junto, como currículo.</Text>
                    <Button title="Candidatar-se com meu perfil" onPress={apply} />
                  </>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function JobCard({ j, applied, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <Row>
        <View style={styles.logo}><Text style={{ fontSize: 24 }}>{j.logo}</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title} numberOfLines={1}>{j.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>{j.company} · {km(j.distanceKm)}</Text>
          <Text style={styles.salarySmall}>{salaryText(j)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Row>
      <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
        <Badge label={j.type} />
        <Badge label={j.area} color={colors.accent} />
        {j.sponsored ? <Badge label="Destaque" color={colors.sponsored} /> : null}
        {applied ? <Badge label="Candidatura enviada" color={colors.success} /> : null}
        <Text style={styles.posted}>{j.posted}</Text>
      </Row>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, padding: 14, marginBottom: 12 },
  bannerText: { flex: 1, marginLeft: 10, color: colors.onPrimary, fontWeight: '600', fontSize: 13 },
  seg: { flex: 1, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  segOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontWeight: '700', color: colors.primary, fontSize: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { marginLeft: 5, fontWeight: '700', color: colors.primary, fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10, ...soft },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  salarySmall: { color: colors.primary, fontWeight: '700', marginTop: 4 },
  posted: { color: colors.muted, fontSize: 11, marginLeft: 'auto' },
  cta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12, marginTop: 8 },
  ctaText: { flex: 1, marginLeft: 8, color: colors.muted, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '88%' },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 10 },
  salary: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 6 },
  line: { color: colors.text, marginBottom: 4 },
  h3: { fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 6 },
  body: { color: colors.text, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  sent: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
});
