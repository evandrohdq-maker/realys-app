// Clientes (CRM): as conversas com clientes organizadas em etapas, do primeiro contato até a venda.
// Em cima, os números do funil. No meio, as etapas. Embaixo, os atendimentos da etapa escolhida.
// Tocar num atendimento abre tudo: etapas, conversa, valor, notas e a linha do tempo.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, brl, soft } from '../../theme';
import { Screen, Title } from '../../components/ui';
import { useCrm, CRM_STAGES, CRM_LOST, CRM_ORIGINS, CRM_LOST_REASONS, stageOf, stageIndex, crmMove, crmSend, crmRead, crmUpdate, crmAdd, crmRemove, crmSummary, crmIdle } from '../../crm';

const dateTime = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

export default function CrmScreen() {
  const leads = useCrm();
  const sum = crmSummary(leads);
  const [stage, setStage] = useState('novo');
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const all = [...CRM_STAGES, CRM_LOST];
  const shown = leads.filter((l) => (q.trim() ? (l.client + ' ' + l.interest).toLowerCase().includes(q.trim().toLowerCase()) : l.stage === stage));
  const open = leads.find((l) => l.id === openId) || null;

  return (
    <Screen>
      <Title sub="Do primeiro contato até a venda fechada, etapa por etapa.">Clientes</Title>

      {/* Números do funil */}
      <View style={st.kpis}>
        <View style={st.kpi}>
          <Text style={st.kpiN}>{sum.openCount}</Text>
          <Text style={st.kpiL}>em andamento</Text>
          <Text style={st.kpiS}>{brl(sum.openValue)}</Text>
        </View>
        <View style={st.kpi}>
          <Text style={st.kpiN}>{sum.wonCount}</Text>
          <Text style={st.kpiL}>vendas fechadas</Text>
          <Text style={st.kpiS}>{brl(sum.wonValue)}</Text>
        </View>
        <View style={st.kpi}>
          <Text style={st.kpiN}>{sum.rate}%</Text>
          <Text style={st.kpiL}>fecham negócio</Text>
          <Text style={st.kpiS}>{sum.unread ? `${sum.unread} sem resposta` : 'tudo respondido'}</Text>
        </View>
      </View>

      <View style={st.search}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar cliente ou pedido" placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 8, color: colors.text, paddingVertical: 8 }} />
        <TouchableOpacity onPress={() => setAdding(true)} style={st.addBtn} accessibilityLabel="Novo atendimento">
          <Ionicons name="add" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 2 }}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Etapas */}
      {!q.trim() ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          {all.map((s, i) => {
            const list = leads.filter((l) => l.stage === s.key);
            const on = stage === s.key;
            return (
              <TouchableOpacity key={s.key} onPress={() => setStage(s.key)} style={[st.stage, on && st.stageOn]} activeOpacity={0.85} accessibilityLabel={`${s.label}, ${list.length}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[st.stageStep, on && { color: colors.primary }]}>{s.key === 'perdido' ? '×' : i + 1}</Text>
                  <Text style={[st.stageLabel, on && { color: colors.text }]} numberOfLines={1}>{s.short}</Text>
                </View>
                <Text style={[st.stageCount, on && { color: colors.text }]}>{list.length}</Text>
                <Text style={st.stageValue} numberOfLines={1}>{brl(list.reduce((t, l) => t + (l.value || 0), 0))}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
      {!q.trim() && stageOf(stage).hint ? <Text style={st.hint}>{stageOf(stage).hint}</Text> : null}

      {shown.map((l) => (
        <TouchableOpacity key={l.id} style={st.card} onPress={() => { setOpenId(l.id); crmRead(l.id); }} activeOpacity={0.85} accessibilityLabel={`Atendimento de ${l.client}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={st.avatar}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{l.client.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{l.client}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>{l.interest}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{brl(l.value || 0)}</Text>
              {l.unread ? (
                <View style={st.unread}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{l.unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <View style={st.tag}><Text style={st.tagText}>{l.origin}</Text></View>
            {q.trim() ? <View style={st.tag}><Text style={st.tagText}>{stageOf(l.stage).short}</Text></View> : null}
            {l.stage === 'perdido' && l.lostReason ? <View style={st.tag}><Text style={st.tagText}>{l.lostReason}</Text></View> : null}
            <Text style={{ color: colors.muted, fontSize: 12, flex: 1, textAlign: 'right' }}>nesta etapa {crmIdle(l)}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {!shown.length ? <Text style={st.empty}>{q.trim() ? 'Nenhum atendimento com esse nome.' : 'Nenhum atendimento nesta etapa.'}</Text> : null}

      <LeadModal lead={open} onClose={() => setOpenId(null)} />
      <AddModal open={adding} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); setStage('novo'); setOpenId(id); }} />
    </Screen>
  );
}

function LeadModal({ lead, onClose }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [tab, setTab] = useState('conversa'); // conversa · dados
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const scroll = useRef(null);
  const leadId = lead ? lead.id : null;
  // Abriu outro atendimento: carrega o valor e as notas dele.
  useEffect(() => {
    if (!lead) return;
    setValue(String(lead.value || '').replace('.', ','));
    setNote(lead.note || '');
    setTab('conversa');
    setText('');
  }, [leadId]);
  if (!lead) return null;
  const idx = stageIndex(lead.stage);
  const lost = lead.stage === 'perdido';
  const won = lead.stage === 'fechado';
  const next = !lost && !won ? CRM_STAGES[idx + 1] : null;
  const send = () => {
    const t = text.trim();
    if (!t) return;
    crmSend(lead.id, t);
    setText('');
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 60);
  };
  const advance = () => {
    if (!next) return;
    if (next.key === 'fechado') {
      return Alert.alert('Fechar a venda?', `${lead.client} · ${brl(lead.value || 0)}`, [
        { text: 'Ainda não', style: 'cancel' },
        { text: 'Venda fechada', onPress: () => crmMove(lead.id, 'fechado') },
      ]);
    }
    crmMove(lead.id, next.key);
  };
  const lose = () =>
    Alert.alert('Por que não fechou?', 'Saber o motivo ajuda a vender melhor da próxima vez.', [
      ...CRM_LOST_REASONS.slice(0, 4).map((r) => ({ text: r, onPress: () => crmMove(lead.id, 'perdido', { lostReason: r }) })),
      { text: 'Voltar', style: 'cancel' },
    ]);
  const remove = () =>
    Alert.alert('Apagar este atendimento?', 'A conversa e o histórico somem.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { crmRemove(lead.id); onClose(); } },
    ]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{lead.client}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{lead.interest}</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '800', marginRight: 12 }}>{brl(lead.value || 0)}</Text>
        </View>

        {/* Etapas: tocar numa etapa leva o atendimento para ela */}
        <View style={st.steps}>
          {CRM_STAGES.map((s, i) => {
            const done = !lost && i <= idx;
            return (
              <TouchableOpacity key={s.key} style={{ flex: 1, alignItems: 'center' }} onPress={() => crmMove(lead.id, s.key)} accessibilityLabel={`Levar para ${s.label}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                  <View style={[st.line, i === 0 && { opacity: 0 }, done && { backgroundColor: colors.primary }]} />
                  <View style={[st.dot, done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>{i + 1}</Text>}
                  </View>
                  <View style={[st.line, i === CRM_STAGES.length - 1 && { opacity: 0 }, !lost && i < idx && { backgroundColor: colors.primary }]} />
                </View>
                <Text style={[st.stepLabel, !lost && i === idx && { color: colors.text, fontWeight: '800' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.short}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {lost ? <Text style={st.lostBar}>Não fechou{lead.lostReason ? ` · ${lead.lostReason}` : ''}. Toque numa etapa para reabrir.</Text> : null}

        <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 }}>
          {[['conversa', 'Conversa'], ['dados', 'Dados e histórico']].map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]}>
              <Text style={{ color: tab === k ? colors.text : colors.muted, fontWeight: '800', fontSize: 13 }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'conversa' ? (
          <>
            <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: false })}>
              {lead.messages.map((m, i) => (
                <View key={i} style={[st.bubble, m.from === 'me' ? st.mine : st.theirs]}>
                  <Text style={{ color: colors.text, fontSize: 14.5 }}>{m.text}</Text>
                  <Text style={{ color: colors.muted, fontSize: 10.5, marginTop: 3, alignSelf: 'flex-end' }}>{m.time}</Text>
                </View>
              ))}
              {!lead.messages.length ? <Text style={st.empty}>Sem mensagens ainda. Mande a primeira.</Text> : null}
            </ScrollView>
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 + insets.bottom }}>
              {next || (!lost && !won) ? (
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  {next ? (
                    <TouchableOpacity style={st.advance} onPress={advance} accessibilityLabel={`Avançar para ${next.label}`}>
                      <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6, fontSize: 13 }} numberOfLines={1}>{next.key === 'fechado' ? 'Fechar a venda' : `Avançar: ${next.short}`}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={st.lose} onPress={lose} accessibilityLabel="Marcar que não fechou">
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Não fechou</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={st.inputRow}>
                <TextInput value={text} onChangeText={setText} placeholder="Escreva para o cliente" placeholderTextColor={colors.muted} style={st.input} multiline onSubmitEditing={send} />
                <TouchableOpacity onPress={send} style={st.send} accessibilityLabel="Enviar">
                  <Ionicons name="send" size={17} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Text style={st.label}>Valor do negócio (R$)</Text>
            <TextInput value={value} onChangeText={setValue} onEndEditing={() => crmUpdate(lead.id, { value: num(value) })} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.muted} style={st.field} />
            <Text style={st.label}>Notas do atendimento (só a empresa vê)</Text>
            <TextInput value={note} onChangeText={setNote} onEndEditing={() => crmUpdate(lead.id, { note: note.trim() })} placeholder="Ex.: prefere entrega de manhã" placeholderTextColor={colors.muted} style={[st.field, { minHeight: 70, textAlignVertical: 'top' }]} multiline />
            <Text style={st.label}>Lembrete de retorno</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[['Hoje', 0], ['Amanhã', 1], ['Em 3 dias', 3], ['Em 1 semana', 7]].map(([label, d]) => (
                <TouchableOpacity key={label} style={st.chip} onPress={() => crmUpdate(lead.id, { followUp: Date.now() + d * 86400000 })}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5 }}>{label}</Text>
                </TouchableOpacity>
              ))}
              {lead.followUp ? (
                <TouchableOpacity style={st.chip} onPress={() => crmUpdate(lead.id, { followUp: null })}>
                  <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12.5 }}>Tirar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {lead.followUp ? <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 4 }}>⏰ Retornar em {new Date(lead.followUp).toLocaleDateString('pt-BR')}</Text> : null}

            <Text style={st.label}>Origem do contato</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CRM_ORIGINS.map((o) => (
                <TouchableOpacity key={o} style={[st.chip, lead.origin === o && { backgroundColor: colors.text, borderColor: colors.text }]} onPress={() => crmUpdate(lead.id, { origin: o })}>
                  <Text style={{ color: lead.origin === o ? '#fff' : colors.text, fontWeight: '700', fontSize: 12.5 }}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Linha do tempo</Text>
            {lead.history.map((hst, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Ionicons name={stageOf(hst.stage).icon} size={17} color={hst.stage === 'perdido' ? colors.muted : colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }}>{stageOf(hst.stage).label}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{dateTime(hst.at)}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={remove} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Apagar atendimento</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddModal({ open, onClose, onCreated }) {
  const [f, setF] = useState({ client: '', interest: '', value: '', origin: 'Indicação' });
  const create = () => {
    if (!f.client.trim()) return Alert.alert('Falta o nome', 'Escreva o nome do cliente.');
    const id = crmAdd({ client: f.client.trim(), interest: f.interest.trim() || 'Sem descrição', value: num(f.value), origin: f.origin });
    setF({ client: '', interest: '', value: '', origin: 'Indicação' });
    onCreated(id);
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.45)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 18 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>Novo atendimento</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Para o cliente que chegou por telefone, balcão ou indicação.</Text>
          <TextInput value={f.client} onChangeText={(t) => setF({ ...f, client: t })} placeholder="Nome do cliente" placeholderTextColor={colors.muted} style={st.field} />
          <TextInput value={f.interest} onChangeText={(t) => setF({ ...f, interest: t })} placeholder="O que ele quer" placeholderTextColor={colors.muted} style={st.field} />
          <TextInput value={f.value} onChangeText={(t) => setF({ ...f, value: t })} placeholder="Valor estimado (R$)" keyboardType="decimal-pad" placeholderTextColor={colors.muted} style={st.field} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            {CRM_ORIGINS.map((o) => (
              <TouchableOpacity key={o} style={[st.chip, f.origin === o && { backgroundColor: colors.text, borderColor: colors.text }]} onPress={() => setF({ ...f, origin: o })}>
                <Text style={{ color: f.origin === o ? '#fff' : colors.text, fontWeight: '700', fontSize: 12.5 }}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={[st.btn, { backgroundColor: colors.cardAlt, marginRight: 8 }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { backgroundColor: colors.text }]} onPress={create}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  kpis: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 10, marginHorizontal: 4, alignItems: 'center', ...soft },
  kpiN: { color: colors.text, fontWeight: '800', fontSize: 20 },
  kpiL: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  kpiS: { color: colors.primary, fontWeight: '700', fontSize: 11.5, marginTop: 3, textAlign: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingLeft: 12, paddingRight: 6, minHeight: 44, borderWidth: 1, borderColor: colors.border },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 10, paddingHorizontal: 10, minHeight: 32 },
  stage: { width: 112, backgroundColor: colors.card, borderRadius: 14, padding: 10, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  stageOn: { borderColor: colors.primary, borderWidth: 1.5 },
  stageStep: { color: colors.muted, fontWeight: '800', fontSize: 12, marginRight: 5 },
  stageLabel: { color: colors.menu, fontWeight: '700', fontSize: 12.5, flexShrink: 1 },
  stageCount: { color: colors.menu, fontWeight: '800', fontSize: 20, marginTop: 4 },
  stageValue: { color: colors.muted, fontSize: 11 },
  hint: { color: colors.muted, fontSize: 12.5, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 8, ...soft },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  unread: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginTop: 3 },
  tag: { backgroundColor: colors.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 },
  tagText: { color: colors.menu, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 26 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  steps: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8 },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: colors.muted, fontSize: 10.5, marginTop: 4, paddingHorizontal: 2 },
  lostBar: { color: colors.muted, fontSize: 12.5, textAlign: 'center', paddingBottom: 6, paddingHorizontal: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 6 },
  tabOn: { borderBottomColor: colors.primary },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#F6EBC9' },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  advance: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 12, minHeight: 40, paddingHorizontal: 10, marginRight: 8 },
  lose: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, color: colors.text, maxHeight: 110 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  label: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 14, marginBottom: 6 },
  field: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 8 },
  chip: { paddingHorizontal: 12, minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  btn: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
