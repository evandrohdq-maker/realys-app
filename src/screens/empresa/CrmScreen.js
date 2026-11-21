// Clientes (CRM): as conversas com clientes organizadas em etapas, do primeiro contato até a venda.
// Em cima, os números do funil. No meio, as etapas. Embaixo, os atendimentos da etapa escolhida.
// Tocar num atendimento abre tudo: etapas, conversa, valor, notas e a linha do tempo.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardLift } from '../../keyboard';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, brl, soft } from '../../theme';
import { Screen, Title } from '../../components/ui';
import CrmLead from '../../components/CrmLead';
import TeamModal from '../../components/TeamModal';
import { useTeam, memberOf } from '../../team';
import { useCrm, crmStages, crmBoard, CRM_LOST, CRM_ORIGINS, CRM_LOST_REASONS, stageOf, stageIndex, crmMove, crmSend, crmRead, crmUpdate, crmAdd, crmRemove, crmSummary, crmIdle, crmTemp, crmToday, crmReport, qualDone, QUAL_STEPS, useCampaigns, crmCampaign, crmCampaignToggle, crmCampaignRemove } from '../../crm';

const dateTime = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

// board: 'empresa' (loja), 'prestador', 'imoveis' ou 'veiculos'. Cada um tem os seus atendimentos e nomes de etapa.
// boards: lista de quadros para escolher no topo (ex.: prestador com Serviços, Aulas e Online).
export default function CrmScreen({ board: firstBoard = 'empresa', boards }) {
  const [board, setBoard] = useState(firstBoard);
  const leads = useCrm(board);
  const B = crmBoard(board);
  const stages = crmStages(board);
  const sum = crmSummary(who ? leads.filter((l) => l.owner === who) : leads);
  const [stage, setStage] = useState('novo');
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [view, setView] = useState('funil'); // funil · hoje · relatorio
  const [teamOpen, setTeamOpen] = useState(false);
  const [who, setWho] = useState(null); // filtro por funcionário (null = todos)
  const team = useTeam();
  const all = [...stages, CRM_LOST];
  const mineOf = (list) => (who ? list.filter((l) => l.owner === who) : list);
  const scoped = mineOf(leads);
  const shown = scoped.filter((l) => (q.trim() ? (l.client + ' ' + l.interest).toLowerCase().includes(q.trim().toLowerCase()) : l.stage === stage));
  const today = crmToday(scoped);
  const todayCount = today.unread.length + today.follow.length + today.tasks.length + today.stalled.length + today.toPay.length;
  const rep = view === 'relatorio' ? crmReport(scoped, board) : null;
  const openLead = (id) => { setOpenId(id); crmRead(id); };
  const open = leads.find((l) => l.id === openId) || null;

  return (
    <Screen>
      <Title sub={B.sub}>{B.title}</Title>
      {boards && boards.length > 1 ? (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {boards.map((b) => (
            <TouchableOpacity key={b} onPress={() => { setBoard(b); setStage('novo'); setQ(''); }} style={[st.chip, { flex: 1, marginRight: 6 }, board === b && { backgroundColor: '#FFFFFF', borderColor: colors.primary }]} accessibilityLabel={crmBoard(b).tab || crmBoard(b).title}>
              <Text style={{ color: board === b ? colors.primaryDark : colors.text, fontWeight: '800', fontSize: 13 }}>{crmBoard(b).tab || crmBoard(b).title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Números do funil */}
      <View style={st.kpis}>
        <View style={st.kpi}>
          <Text style={st.kpiN}>{sum.openCount}</Text>
          <Text style={st.kpiL}>em andamento</Text>
          <Text style={st.kpiS}>{brl(sum.openValue)}</Text>
        </View>
        <View style={st.kpi}>
          <Text style={st.kpiN}>{sum.wonCount}</Text>
          <Text style={st.kpiL}>{B.won}</Text>
          <Text style={st.kpiS}>{brl(sum.wonValue)}</Text>
        </View>
        <View style={st.kpi}>
          <Text style={st.kpiN}>{sum.rate}%</Text>
          <Text style={st.kpiL}>fecham negócio</Text>
          <Text style={st.kpiS}>{sum.unread ? `${sum.unread} sem resposta` : 'tudo respondido'}</Text>
        </View>
      </View>

      {/* Visões: funil, o que fazer hoje e relatório. Ao lado, a equipe. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        {[['funil', 'Funil'], ['hoje', todayCount ? `Hoje ${todayCount}` : 'Hoje'], ['relatorio', 'Relatório']].map(([k, label]) => (
          <TouchableOpacity key={k} style={[st.view, view === k && st.viewOn]} onPress={() => setView(k)} accessibilityLabel={label}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: view === k ? colors.text : colors.menu, fontWeight: view === k ? '800' : '700', fontSize: 13 }}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={st.addBtn} onPress={() => setTeamOpen(true)} accessibilityLabel="Equipe: funcionários e classes">
          <Ionicons name="people-outline" size={16} color={colors.text} />
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 4 }}>Equipe</Text>
        </TouchableOpacity>
      </View>
      {/* Atendimento direcionado: ver de todos ou de um funcionário */}
      {team.members.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          {[{ id: null, name: 'Todos' }, ...team.members.filter((m) => m.active)].map((m) => (
            <TouchableOpacity key={m.id || 'todos'} style={[st.chip, { marginBottom: 0 }, who === m.id && { backgroundColor: '#FFFFFF', borderColor: colors.primary }]} onPress={() => setWho(m.id)}>
              <Text numberOfLines={1} style={{ color: who === m.id ? colors.primaryDark : colors.text, fontWeight: '700', fontSize: 12.5 }}>{m.name.split(' ')[0]}{m.id ? ` ${leads.filter((l) => l.owner === m.id && l.stage !== 'fechado' && l.stage !== 'perdido').length}` : ''}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {view === 'hoje' ? <TodayView today={today} board={board} onOpen={openLead} /> : null}
      {view === 'relatorio' && rep ? <ReportView rep={rep} sum={sum} B={B} /> : null}
      {view === 'funil' ? (
      <>
      <LeadCapture board={board} />

      <View style={st.search}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar cliente ou pedido" placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 8, color: colors.text, paddingVertical: 8 }} />
        <TouchableOpacity onPress={() => setAdding(true)} style={st.addBtn} accessibilityLabel="Novo atendimento">
          <Ionicons name="add" size={18} color={colors.text} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 2 }}>Novo</Text>
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
      {!q.trim() && stageOf(stage, board).hint ? <Text style={st.hint}>{stageOf(stage, board).hint}</Text> : null}

      {shown.map((l) => (
        <TouchableOpacity key={l.id} style={st.card} onPress={() => openLead(l.id)} activeOpacity={0.85} accessibilityLabel={`Atendimento de ${l.client}`}>
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
            <LeadBadges l={l} />
            {q.trim() ? <View style={st.tag}><Text style={st.tagText}>{stageOf(l.stage, board).short}</Text></View> : null}
            {l.stage === 'perdido' && l.lostReason ? <View style={st.tag}><Text style={st.tagText}>{l.lostReason}</Text></View> : null}
            <Text style={{ color: colors.muted, fontSize: 12, flex: 1, textAlign: 'right' }}>nesta etapa {crmIdle(l)}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {!shown.length ? <Text style={st.empty}>{q.trim() ? 'Nenhum atendimento com esse nome.' : 'Nenhum atendimento nesta etapa.'}</Text> : null}
      </>
      ) : null}

      <CrmLead lead={open} onClose={() => setOpenId(null)} />
      <TeamModal visible={teamOpen} onClose={() => setTeamOpen(false)} />
      <AddModal board={board} open={adding} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); setStage('novo'); setOpenId(id); }} />
    </Screen>
  );
}

// Selos do atendimento: temperatura, qualificação, cliente que voltou e responsável.
function LeadBadges({ l }) {
  const temp = crmTemp(l);
  const owner = l.owner ? memberOf(l.owner) : null;
  return (
    <>
      {temp ? <View style={[st.tag, { backgroundColor: 'transparent', borderWidth: 1, borderColor: temp.color }]}><Text style={[st.tagText, { color: temp.color }]}>{temp.label}</Text></View> : null}
      {l.stage !== 'fechado' && l.stage !== 'perdido' ? <View style={st.tag}><Text style={st.tagText}>Qualif. {qualDone(l)}/{QUAL_STEPS.length}</Text></View> : null}
      {(l.cycle || 1) > 1 ? <View style={st.tag}><Text style={st.tagText}>Voltou · {l.cycle}ª vez</Text></View> : null}
      {owner ? <View style={st.tag}><Text style={st.tagText}>{owner.name.split(' ')[0]}</Text></View> : null}
    </>
  );
}

// Hoje: tudo que pede ação agora.
function TodayView({ today, board, onOpen }) {
  const Group = ({ title, icon, items, render }) =>
    items.length ? (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name={icon} size={17} color={colors.primary} />
          <Text style={{ color: colors.text, fontWeight: '800', marginLeft: 6 }}>{title} · {items.length}</Text>
        </View>
        {items.map(render)}
      </View>
    ) : null;
  const row = (l, sub, key) => (
    <TouchableOpacity key={key || l.id} style={st.card} onPress={() => onOpen(l.id)} accessibilityLabel={`Abrir ${l.client}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{l.client}</Text>
          <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{sub}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{stageOf(l.stage, board).short}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
  const empty = !today.unread.length && !today.follow.length && !today.tasks.length && !today.stalled.length && !today.toPay.length;
  return (
    <View>
      <Group title="Responder" icon="chatbubble-ellipses-outline" items={today.unread} render={(l) => row(l, `${l.unread} mensagem(ns) sem resposta`)} />
      <Group title="Tarefas" icon="checkbox-outline" items={today.tasks} render={(x) => row(x.lead, `${x.late ? 'Atrasada · ' : ''}${x.task.text}`, x.task.id)} />
      <Group title="Retornar hoje" icon="alarm-outline" items={today.follow} render={(l) => row(l, l.interest)} />
      <Group title="Parados há mais de 2 dias" icon="hourglass-outline" items={today.stalled} render={(l) => row(l, `Nesta etapa ${crmIdle(l)}`)} />
      <Group title="Fechados, aguardando pagamento" icon="cash-outline" items={today.toPay} render={(l) => row(l, `${brl(l.closing.value)} · taxa Realyz ${brl(l.closing.fee)}`)} />
      {empty ? <Text style={st.empty}>Nada pendente por aqui. Tudo em dia.</Text> : null}
    </View>
  );
}

// Relatório: funil, conversão, tempo para fechar, motivos de perda e origens.
function ReportView({ rep, sum, B }) {
  const Bar = ({ label, value, pct, right }) => (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row' }}>
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1, fontSize: 13 }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: colors.muted, fontSize: 12.5 }}>{right != null ? right : value}</Text>
      </View>
      <View style={st.barTrack}><View style={[st.barFill, { width: `${Math.max(2, Math.min(100, pct))}%` }]} /></View>
    </View>
  );
  const maxOrigin = Math.max(1, ...rep.origins.map(([, o]) => o.total));
  const maxReason = Math.max(1, ...rep.reasons.map(([, n]) => n));
  return (
    <View>
      <View style={st.kpis}>
        <View style={st.kpi}><Text style={st.kpiN}>{sum.rate}%</Text><Text style={st.kpiL}>conversão</Text></View>
        <View style={st.kpi}><Text style={st.kpiN}>{rep.avgCloseDays != null ? String(rep.avgCloseDays).replace('.', ',') : '–'}</Text><Text style={st.kpiL}>dias para fechar</Text></View>
        <View style={st.kpi}><Text style={st.kpiN} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{brl(rep.ticket)}</Text><Text style={st.kpiL}>valor médio</Text></View>
      </View>
      <View style={st.repBox}>
        <Text style={st.repTitle}>Funil (quantos chegaram a cada etapa)</Text>
        {rep.funnel.map((f) => <Bar key={f.key} label={f.label} pct={f.pct} right={`${f.count} · ${f.pct}%`} />)}
      </View>
      <View style={st.repBox}>
        <Text style={st.repTitle}>De onde vêm os clientes</Text>
        {rep.origins.map(([o, v]) => <Bar key={o} label={o} pct={(v.total / maxOrigin) * 100} right={`${v.total} · ${v.won} fechado(s)`} />)}
      </View>
      {rep.reasons.length ? (
        <View style={st.repBox}>
          <Text style={st.repTitle}>Por que não fecharam</Text>
          {rep.reasons.map(([r, n]) => <Bar key={r} label={r} pct={(n / maxReason) * 100} value={n} />)}
        </View>
      ) : null}
      <View style={st.repBox}>
        <Text style={st.repTitle}>Fechamentos acompanhados pelo Realyz</Text>
        <Text style={{ color: colors.text, fontSize: 13 }}>{sum.wonCount} {B.won} · {brl(sum.wonValue)}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Taxa do Realyz sobre os fechamentos: {brl(rep.fee)}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Clientes que voltaram depois de não fechar: {rep.returned}</Text>
      </View>
    </View>
  );
}

// Captar leads: campanhas que trazem interessados direto para a etapa "Novo contato".
const AUDIENCES = ['Pessoas da cidade', 'Empresas (CNPJ)', 'Quem já comprou', 'Seguidores da página'];
function LeadCapture({ board }) {
  const camps = useCampaigns(board);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', offer: '', audience: AUDIENCES[0] });
  const total = camps.reduce((s, c) => s + c.leads, 0);
  const create = () => {
    if (!f.title.trim()) return Alert.alert('Falta o título', 'Diga o que você está oferecendo. Ex.: "Orçamento grátis para festas".');
    crmCampaign({ title: f.title.trim(), offer: f.offer.trim(), audience: f.audience, board });
    setF({ title: '', offer: '', audience: f.audience });
    setOpen(false);
    Alert.alert('Campanha no ar ✅', 'Quem se interessar deixa o contato e cai aqui em "Novo contato".');
  };
  return (
    <View style={st.leadBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="magnet-outline" size={19} color={colors.text} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Captar leads</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{camps.length ? `${camps.filter((c) => c.on).length} campanha(s) no ar · ${total} interessado(s) captado(s)` : 'Publique uma oferta e receba interessados prontos para atender.'}</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={() => setOpen(true)} accessibilityLabel="Criar campanha de leads">
          <Ionicons name="add" size={17} color={colors.text} />
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 2 }}>Campanha</Text>
        </TouchableOpacity>
      </View>
      {camps.map((c) => (
        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{c.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{c.audience} · {c.leads} lead(s) · {c.on ? 'no ar' : 'pausada'}</Text>
          </View>
          <TouchableOpacity style={{ padding: 6 }} onPress={() => crmCampaignToggle(c.id)} accessibilityLabel={c.on ? 'Pausar campanha' : 'Retomar campanha'}>
            <Ionicons name={c.on ? 'pause-circle-outline' : 'play-circle-outline'} size={22} color={colors.menu} />
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 6 }} onPress={() => Alert.alert('Apagar a campanha?', c.title, [{ text: 'Voltar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: () => crmCampaignRemove(c.id) }])} accessibilityLabel="Apagar campanha">
            <Ionicons name="trash-outline" size={19} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ))}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><KeyboardLift style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.45)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 18 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>Campanha de leads</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Uma oferta com o botão "Tenho interesse". Quem tocar vira um contato novo aqui.</Text>
            <TextInput value={f.title} onChangeText={(t) => setF({ ...f, title: t })} placeholder="O que você oferece" placeholderTextColor={colors.muted} maxLength={60} style={st.field} />
            <TextInput value={f.offer} onChangeText={(t) => setF({ ...f, offer: t })} placeholder="Detalhe ou vantagem (opcional)" placeholderTextColor={colors.muted} maxLength={120} style={st.field} />
            <Text style={st.label}>Para quem mostrar</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {AUDIENCES.map((a) => (
                <TouchableOpacity key={a} style={[st.chip, f.audience === a && { backgroundColor: '#FFFFFF', borderColor: colors.primary }]} onPress={() => setF({ ...f, audience: a })}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: f.audience === a ? colors.primaryDark : colors.text, fontWeight: '700', fontSize: 12.5 }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[st.btn, { backgroundColor: colors.cardAlt, marginRight: 8 }]} onPress={() => setOpen(false)}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700' }}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderStrong }]} onPress={create}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primaryDark, fontWeight: '800' }}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardLift></Modal>
    </View>
  );
}

function AddModal({ open, onClose, onCreated, board }) {
  const [f, setF] = useState({ client: '', interest: '', value: '', origin: 'Indicação' });
  const create = () => {
    if (!f.client.trim()) return Alert.alert('Falta o nome', 'Escreva o nome do cliente.');
    const id = crmAdd({ client: f.client.trim(), interest: f.interest.trim() || 'Sem descrição', value: num(f.value), origin: f.origin, board });
    setF({ client: '', interest: '', value: '', origin: 'Indicação' });
    onCreated(id);
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.45)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 18 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>Novo atendimento</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>Para o cliente que chegou por telefone, balcão ou indicação.</Text>
          <TextInput value={f.client} onChangeText={(t) => setF({ ...f, client: t })} placeholder="Nome do cliente" placeholderTextColor={colors.muted} style={st.field} />
          <TextInput value={f.interest} onChangeText={(t) => setF({ ...f, interest: t })} placeholder="O que ele quer" placeholderTextColor={colors.muted} style={st.field} />
          <TextInput value={f.value} onChangeText={(t) => setF({ ...f, value: t })} placeholder="Valor estimado (R$)" keyboardType="decimal-pad" placeholderTextColor={colors.muted} style={st.field} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            {CRM_ORIGINS.map((o) => (
              <TouchableOpacity key={o} style={[st.chip, f.origin === o && { backgroundColor: '#FFFFFF', borderColor: colors.primary }]} onPress={() => setF({ ...f, origin: o })}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: f.origin === o ? colors.primaryDark : colors.text, fontWeight: '700', fontSize: 12.5 }}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={[st.btn, { backgroundColor: colors.cardAlt, marginRight: 8 }]} onPress={onClose}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700' }}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderStrong }]} onPress={create}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primaryDark, fontWeight: '800' }}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardLift></Modal>
  );
}

const st = StyleSheet.create({
  view: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  viewOn: { borderBottomColor: colors.primary },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 4, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  repBox: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  repTitle: { color: colors.text, fontWeight: '800', marginBottom: 8 },
  leadBox: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
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
  tag: { backgroundColor: colors.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
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
