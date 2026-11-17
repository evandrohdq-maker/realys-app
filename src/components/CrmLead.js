// Atendimento do CRM aberto: etapas, conversa (com mensagens prontas, catálogo e chamadas),
// qualificação passo a passo, tarefas, responsável, valor, fechamento e linha do tempo.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, brl } from '../theme';
import { useStore } from '../store';
import { MY_COMPANY_ID } from '../data';
import { VideoCallModal } from '../screens/cliente/home/Social';
import { useTeam, memberOf, roleOf } from '../team';
import {
  crmStages, crmBoard, CRM_ORIGINS, CRM_LOST_REASONS, CRM_TEMPLATES, QUAL_STEPS, stageOf, stageIndex, qualDone, crmTemp, crmFee,
  crmMove, crmSend, crmUpdate, crmRemove, crmQual, crmTaskAdd, crmTaskToggle, crmTaskRemove, crmReceive, crmSendCatalog, crmCallLog, crmAssign, crmPaid,
} from '../crm';

const dateTime = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const dayOf = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
const TABS = [['conversa', 'Conversa'], ['qualificar', 'Qualificação'], ['dados', 'Dados']];
const DEMO_BACK = ['Oi, ainda tenho interesse. Podemos conversar de novo?', 'Olá! Pensei melhor e quero retomar.', 'Boa tarde, ainda está disponível?'];

export default function CrmLead({ lead, onClose }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const team = useTeam();
  const [text, setText] = useState('');
  const [tab, setTab] = useState('conversa');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [task, setTask] = useState('');
  const [call, setCall] = useState(null); // 'voz' | 'video'
  const [catalog, setCatalog] = useState(false);
  const [picked, setPicked] = useState([]);
  const [assign, setAssign] = useState(false);
  const scroll = useRef(null);
  const leadId = lead ? lead.id : null;
  useEffect(() => {
    if (!lead) return;
    setValue(String(lead.value || '').replace('.', ','));
    setNote(lead.note || '');
    setTab('conversa');
    setText('');
    setTask('');
  }, [leadId]);
  if (!lead) return null;

  const board = lead.board || 'empresa';
  const B = crmBoard(board);
  const STAGES = crmStages(board);
  const idx = stageIndex(lead.stage);
  const lost = lead.stage === 'perdido';
  const won = lead.stage === 'fechado';
  const next = !lost && !won ? STAGES[idx + 1] : null;
  const qd = qualDone(lead);
  const temp = crmTemp(lead);
  const owner = lead.owner ? memberOf(lead.owner) : null;
  const fee = crmFee(board, lead.value);
  const products = board === 'empresa' ? (state.products || []).filter((p) => p.storeId === MY_COMPANY_ID).slice(0, 30) : [];
  const storeName = ((state.companies || []).find((c) => c.id === MY_COMPANY_ID) || {}).name || 'nossa loja';

  const send = (t) => {
    const v = (t || text).trim();
    if (!v) return;
    crmSend(lead.id, v);
    setText('');
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 60);
  };
  const close = () =>
    Alert.alert(`${B.close}?`, `${lead.client} · ${brl(lead.value || 0)}${fee.pct ? `\n\nFechamento registrado no Re@lys: taxa de ${fee.pct}% (${brl(fee.fee)}). Você recebe ${brl(fee.net)}.` : '\n\nFechamento registrado no Re@lys.'}`, [
      { text: 'Ainda não', style: 'cancel' },
      { text: B.close, onPress: () => crmMove(lead.id, 'fechado') },
    ]);
  const goTo = (key) => {
    if (key === lead.stage) return;
    if (key === 'fechado') return close();
    // Antes da proposta, o cliente precisa estar qualificado (dá para seguir mesmo assim).
    if (stageIndex(key) >= 2 && qd < QUAL_STEPS.length && !won) {
      return Alert.alert('Qualificação incompleta', `Faltam ${QUAL_STEPS.length - qd} de ${QUAL_STEPS.length} respostas. Qualificar antes evita proposta para quem não vai comprar.`, [
        { text: 'Qualificar agora', onPress: () => setTab('qualificar') },
        { text: 'Avançar assim mesmo', onPress: () => crmMove(lead.id, key) },
      ]);
    }
    crmMove(lead.id, key);
  };
  const lose = () =>
    Alert.alert('Por que não fechou?', 'Se o cliente voltar a falar, o atendimento recomeça do início.', [
      ...CRM_LOST_REASONS.slice(0, 4).map((r) => ({ text: r, onPress: () => crmMove(lead.id, 'perdido', { lostReason: r }) })),
      { text: 'Voltar', style: 'cancel' },
    ]);
  const remove = () =>
    Alert.alert('Apagar este atendimento?', 'A conversa e o histórico somem.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { crmRemove(lead.id); onClose(); } },
    ]);
  const sendCatalog = () => {
    const items = products.filter((p) => picked.includes(p.id)).map((p) => ({ id: p.id, name: p.name, price: p.price }));
    if (!items.length) return;
    crmSendCatalog(lead.id, items, storeName);
    setPicked([]);
    setCatalog(false);
  };
  const contact = { name: lead.client, photo: null };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={st.back} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{lead.client}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
              {brl(lead.value || 0)}{temp ? ` · ${temp.label}` : ''}{(lead.cycle || 1) > 1 ? ` · voltou (${lead.cycle}ª vez)` : ''}
            </Text>
          </View>
          {/* Chamadas: voz e vídeo */}
          <TouchableOpacity style={st.iconBtn} onPress={() => setCall('voz')} accessibilityLabel="Chamada de voz">
            <Ionicons name="call-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={st.iconBtn} onPress={() => setCall('video')} accessibilityLabel="Chamada de vídeo">
            <Ionicons name="videocam-outline" size={21} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Etapas: tocar leva o atendimento para a etapa */}
        <View style={st.steps}>
          {STAGES.map((s, i) => {
            const done = !lost && i <= idx;
            return (
              <TouchableOpacity key={s.key} style={{ flex: 1, alignItems: 'center' }} onPress={() => goTo(s.key)} accessibilityLabel={`Levar para ${s.label}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                  <View style={[st.line, i === 0 && { opacity: 0 }, done && { backgroundColor: colors.primary }]} />
                  <View style={[st.dot, done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>{i + 1}</Text>}
                  </View>
                  <View style={[st.line, i === STAGES.length - 1 && { opacity: 0 }, !lost && i < idx && { backgroundColor: colors.primary }]} />
                </View>
                <Text style={[st.stepLabel, !lost && i === idx && { color: colors.text, fontWeight: '800' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.short}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {lost ? <Text style={st.lostBar}>Não fechou{lead.lostReason ? ` · ${lead.lostReason}` : ''}. Se o cliente escrever de novo, tudo recomeça do início.</Text> : null}

        <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 }}>
          {TABS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]}>
              <Text numberOfLines={1} style={{ color: tab === k ? colors.text : colors.muted, fontWeight: '800', fontSize: 13 }}>{label}{k === 'qualificar' ? ` ${qd}/${QUAL_STEPS.length}` : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'conversa' ? (
          <>
            <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: false })}>
              {lead.messages.map((m, i) =>
                m.from === 'system' ? (
                  <Text key={i} style={st.system}>{m.text}</Text>
                ) : m.kind === 'catalog' ? (
                  <View key={i} style={[st.bubble, st.mine, { width: '82%' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="pricetags-outline" size={15} color={colors.text} />
                      <Text style={{ color: colors.text, fontWeight: '800', marginLeft: 6 }}>{m.text}</Text>
                    </View>
                    {m.items.map((it) => (
                      <View key={it.id} style={st.catRow}>
                        <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{it.name}</Text>
                        <Text style={{ color: colors.text, fontWeight: '800' }}>{brl(it.price)}</Text>
                      </View>
                    ))}
                    <Text style={{ color: colors.muted, fontSize: 11.5, marginTop: 4 }}>O cliente toca num produto para comprar pelo Re@lys.</Text>
                    <Text style={st.time}>{m.time}</Text>
                  </View>
                ) : (
                  <View key={i} style={[st.bubble, m.from === 'me' ? st.mine : st.theirs]}>
                    <Text style={{ color: colors.text, fontSize: 14.5 }}>{m.text}</Text>
                    <Text style={st.time}>{m.time}</Text>
                  </View>
                )
              )}
              {!lead.messages.length ? <Text style={st.system}>Sem mensagens ainda. Mande a primeira.</Text> : null}
            </ScrollView>
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 + insets.bottom }}>
              {/* Mensagens prontas da etapa */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                {products.length ? (
                  <TouchableOpacity style={[st.chip, { borderColor: colors.primary }]} onPress={() => setCatalog(true)} accessibilityLabel="Enviar catálogo">
                    <Ionicons name="pricetags-outline" size={14} color={colors.text} />
                    <Text numberOfLines={1} style={[st.chipText, { marginLeft: 4 }]}>Enviar catálogo</Text>
                  </TouchableOpacity>
                ) : null}
                {(CRM_TEMPLATES[lead.stage] || []).map((t) => (
                  <TouchableOpacity key={t} style={[st.chip, { maxWidth: 230 }]} onPress={() => setText(t)}>
                    <Text numberOfLines={1} style={st.chipText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!lost && !won ? (
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  {next ? (
                    <TouchableOpacity style={st.advance} onPress={() => goTo(next.key)} accessibilityLabel={`Avançar para ${next.label}`}>
                      <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6, fontSize: 13 }} numberOfLines={1}>{next.key === 'fechado' ? B.close : `Avançar: ${next.short}`}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={st.lose} onPress={lose} accessibilityLabel="Marcar que não fechou">
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Não fechou</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <TextInput value={text} onChangeText={setText} placeholder="Escreva para o cliente" placeholderTextColor={colors.muted} style={st.input} multiline />
                <TouchableOpacity onPress={() => send()} style={st.send} accessibilityLabel="Enviar">
                  <Ionicons name="send" size={17} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {tab === 'qualificar' ? (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
              Quatro respostas dizem se o cliente está pronto para comprar. {(lead.cycle || 1) > 1 ? `Este cliente voltou (${lead.cycle}ª vez): a qualificação recomeçou do zero.` : 'Preencha conforme a conversa anda.'}
            </Text>
            <View style={st.progress}>
              <View style={[st.progressFill, { width: `${(qd / QUAL_STEPS.length) * 100}%` }]} />
            </View>
            {QUAL_STEPS.map((s, i) => {
              const a = (lead.qual || {})[s.key] || {};
              return (
                <View key={s.key} style={[st.qual, a.done && { borderColor: colors.primary }]}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => crmQual(lead.id, s.key, { done: !a.done })} accessibilityLabel={`${s.label}: ${a.done ? 'respondido' : 'falta responder'}`}>
                    <Ionicons name={a.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={a.done ? colors.primary : colors.muted} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.muted, fontSize: 11.5, fontWeight: '700' }}>Passo {i + 1} · {s.label}</Text>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{s.q}</Text>
                    </View>
                  </TouchableOpacity>
                  <TextInput
                    defaultValue={a.text || ''}
                    key={`${lead.id}-${lead.cycle || 1}-${s.key}`}
                    onEndEditing={(e) => { const v = e.nativeEvent.text.trim(); crmQual(lead.id, s.key, { text: v, done: v ? true : a.done }); }}
                    placeholder={s.ph}
                    placeholderTextColor={colors.muted}
                    maxLength={80}
                    style={st.qualInput}
                  />
                </View>
              );
            })}

            <Text style={st.label}>Tarefas (próxima ação)</Text>
            {(lead.tasks || []).map((t) => (
              <View key={t.id} style={st.taskRow}>
                <TouchableOpacity onPress={() => crmTaskToggle(lead.id, t.id)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name={t.done ? 'checkbox' : 'square-outline'} size={21} color={t.done ? colors.primary : colors.muted} />
                  <Text style={{ color: t.done ? colors.muted : colors.text, marginLeft: 8, flex: 1, textDecorationLine: t.done ? 'line-through' : 'none' }} numberOfLines={2}>{t.text}</Text>
                </TouchableOpacity>
                <Text style={{ color: !t.done && t.due < Date.now() - 86400000 ? '#C0392B' : colors.muted, fontSize: 12, marginHorizontal: 6 }}>{dayOf(t.due)}</Text>
                <TouchableOpacity onPress={() => crmTaskRemove(lead.id, t.id)} accessibilityLabel="Apagar tarefa">
                  <Ionicons name="close" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TextInput value={task} onChangeText={setTask} placeholder="Ex.: ligar para confirmar o endereço" placeholderTextColor={colors.muted} maxLength={80} style={st.field} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {[['Hoje', 0], ['Amanhã', 1], ['Em 3 dias', 3], ['Em 1 semana', 7]].map(([label, d]) => (
                <TouchableOpacity key={label} style={[st.chip, !task.trim() && { opacity: 0.5 }]} disabled={!task.trim()} onPress={() => { crmTaskAdd(lead.id, task.trim(), d); setTask(''); }}>
                  <Text numberOfLines={1} style={st.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {tab === 'dados' ? (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
            {/* Fechamento acompanhado pelo Re@lys */}
            {won && lead.closing ? (
              <View style={st.closing}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Fechamento registrado no Re@lys</Text>
                <Text style={st.closeLine}>Valor fechado: {brl(lead.closing.value)}</Text>
                <Text style={st.closeLine}>{lead.closing.pct ? `Taxa do Re@lys (${lead.closing.pct}%): ${brl(lead.closing.fee)}` : 'Sem taxa no fechamento (pago por plano ou por conversa)'}</Text>
                <Text style={st.closeLine}>Você recebe: {brl(lead.closing.net)}</Text>
                {lead.closing.paid ? (
                  <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 6 }}>Pago pelo cliente ✅</Text>
                ) : (
                  <TouchableOpacity style={[st.advance, { marginRight: 0, marginTop: 8, flex: 0 }]} onPress={() => crmPaid(lead.id)} accessibilityLabel="Marcar que o cliente pagou">
                    <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Cliente pagou pelo Re@lys</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            <Text style={[st.label, { marginTop: won ? 14 : 0 }]}>Responsável pelo atendimento</Text>
            <TouchableOpacity style={st.owner} onPress={() => setAssign(true)} accessibilityLabel="Trocar o responsável">
              <Ionicons name="person-circle-outline" size={22} color={colors.menu} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{owner ? owner.name : 'Sem responsável'}</Text>
                {owner && roleOf(owner.roleId) ? <Text style={{ color: colors.muted, fontSize: 12 }}>{roleOf(owner.roleId).name}</Text> : null}
              </View>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12.5 }}>Trocar</Text>
            </TouchableOpacity>

            <Text style={st.label}>Valor do negócio (R$)</Text>
            <TextInput value={value} onChangeText={setValue} onEndEditing={() => crmUpdate(lead.id, { value: num(value) })} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.muted} style={[st.field, { marginTop: 0 }]} />
            {!won && fee.pct ? <Text style={st.hint}>Ao fechar: taxa do Re@lys de {fee.pct}% ({brl(crmFee(board, num(value)).fee)}).</Text> : null}
            <Text style={st.label}>Notas do atendimento (só a equipe vê)</Text>
            <TextInput value={note} onChangeText={setNote} onEndEditing={() => crmUpdate(lead.id, { note: note.trim() })} placeholder="Ex.: prefere entrega de manhã" placeholderTextColor={colors.muted} style={[st.field, { marginTop: 0, minHeight: 70, textAlignVertical: 'top' }]} multiline />
            <Text style={st.label}>Lembrete de retorno</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[['Hoje', 0], ['Amanhã', 1], ['Em 3 dias', 3], ['Em 1 semana', 7]].map(([label, d]) => (
                <TouchableOpacity key={label} style={st.chip} onPress={() => crmUpdate(lead.id, { followUp: Date.now() + d * 86400000 })}>
                  <Text numberOfLines={1} style={st.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
              {lead.followUp ? (
                <TouchableOpacity style={st.chip} onPress={() => crmUpdate(lead.id, { followUp: null })}>
                  <Text numberOfLines={1} style={[st.chipText, { color: colors.muted }]}>Tirar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {lead.followUp ? <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 4 }}>⏰ Retornar em {new Date(lead.followUp).toLocaleDateString('pt-BR')}</Text> : null}

            <Text style={st.label}>Origem do contato</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CRM_ORIGINS.map((o) => (
                <TouchableOpacity key={o} style={[st.chip, lead.origin === o && st.chipOn]} onPress={() => crmUpdate(lead.id, { origin: o })}>
                  <Text numberOfLines={1} style={[st.chipText, lead.origin === o && { color: '#fff' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Linha do tempo</Text>
            {lead.history.map((hst, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Ionicons name={hst.restart ? 'refresh-circle-outline' : stageOf(hst.stage, board).icon} size={17} color={hst.stage === 'perdido' ? colors.muted : colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={1}>{hst.restart ? `Recomeçou (${hst.cycle}ª vez)` : stageOf(hst.stage, board).label}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{dateTime(hst.at)}</Text>
              </View>
            ))}

            {/* Demonstração: sem o servidor, a mensagem do cliente é simulada */}
            <TouchableOpacity style={[st.owner, { marginTop: 16, justifyContent: 'center' }]} onPress={() => { crmReceive(lead.id, DEMO_BACK[lead.messages.length % DEMO_BACK.length]); setTab('conversa'); }} accessibilityLabel="Simular mensagem do cliente">
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>Simular mensagem do cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={remove} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Apagar atendimento</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}

        {/* Chamada de voz ou de vídeo com o cliente */}
        <VideoCallModal audio={call === 'voz'} contact={contact} visible={!!call} onClose={() => setCall(null)} onEnd={(secs) => crmCallLog(lead.id, call === 'voz' ? 'voz' : 'video', secs)} />

        {/* Escolher os produtos do catálogo */}
        <Modal visible={catalog} transparent animationType="slide" onRequestClose={() => setCatalog(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.4)' }} activeOpacity={1} onPress={() => setCatalog(false)} />
          <View style={st.sheet}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Enviar catálogo</Text>
            <Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 2 }}>Escolha os produtos. O cliente recebe na conversa com nome e preço.</Text>
            <ScrollView style={{ maxHeight: 330, marginTop: 8 }}>
              {products.map((p) => {
                const on = picked.includes(p.id);
                return (
                  <TouchableOpacity key={p.id} style={st.pick} onPress={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={21} color={on ? colors.primary : colors.muted} />
                    <Text style={{ color: colors.text, flex: 1, marginLeft: 10 }} numberOfLines={1}>{p.name}</Text>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>{brl(p.price)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[st.lose, { flex: 1, marginRight: 8 }]} onPress={() => setPicked(picked.length === products.length ? [] : products.map((p) => p.id))}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{picked.length === products.length ? 'Desmarcar' : 'Marcar todos'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.advance, { marginRight: 0 }, !picked.length && { opacity: 0.5 }]} disabled={!picked.length} onPress={sendCatalog}>
                <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Enviar {picked.length || ''}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Passar o atendimento para outro funcionário */}
        <Modal visible={assign} transparent animationType="slide" onRequestClose={() => setAssign(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.4)' }} activeOpacity={1} onPress={() => setAssign(false)} />
          <View style={st.sheet}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Direcionar o atendimento</Text>
            <ScrollView style={{ maxHeight: 330, marginTop: 8 }}>
              {team.members.filter((m) => m.active).map((m) => (
                <TouchableOpacity key={m.id} style={st.pick} onPress={() => { if (!m.bio) return Alert.alert('Sem biometria', `${m.name} ainda não tem a biometria cadastrada e não pode atender.`); crmAssign(lead.id, m.id, m.name); setAssign(false); }}>
                  <Ionicons name={lead.owner === m.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={lead.owner === m.id ? colors.primary : colors.muted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: m.bio ? colors.text : colors.muted, fontWeight: '700' }} numberOfLines={1}>{m.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{roleOf(m.roleId) ? roleOf(m.roleId).name : 'Sem classe'}{m.bio ? '' : ' · sem biometria'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={st.pick} onPress={() => { crmAssign(lead.id, null); setAssign(false); }}>
                <Ionicons name={!lead.owner ? 'radio-button-on' : 'radio-button-off'} size={20} color={!lead.owner ? colors.primary : colors.muted} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 10 }}>Sem responsável</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8 },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: colors.muted, fontSize: 10.5, marginTop: 4, paddingHorizontal: 2 },
  lostBar: { color: colors.muted, fontSize: 12.5, textAlign: 'center', paddingBottom: 6, paddingHorizontal: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4 },
  tabOn: { borderBottomColor: colors.primary },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#F6EBC9' },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  time: { color: colors.muted, fontSize: 10.5, marginTop: 3, alignSelf: 'flex-end' },
  system: { color: colors.muted, fontSize: 12, textAlign: 'center', marginVertical: 8, paddingHorizontal: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(20,18,14,0.12)' },
  chip: { flexDirection: 'row', paddingHorizontal: 12, minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  advance: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 12, minHeight: 40, paddingHorizontal: 10, marginRight: 8 },
  lose: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, color: colors.text, maxHeight: 110 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  label: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 14, marginBottom: 6 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  field: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 8 },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginVertical: 10, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  qual: { backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  qualInput: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, marginTop: 6, marginLeft: 32, color: colors.text },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  closing: { backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.primary },
  closeLine: { color: colors.text, fontSize: 13, marginTop: 3 },
  owner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  pick: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
