// Agenda do prestador: próximos trabalhos, calendário do mês, trabalhos já feitos e horário de trabalho.
// Regras e datas em src/agenda.js. As visitas aceitas pelo Realys entram sozinhas.
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { colors, brl, soft } from '../../theme';
import { Screen, Title, Row, Input, Chip, Empty, Button } from '../../components/ui';
import { SegTabs, useNow } from '../../components/AdKit';
import { useBack } from '../../back';
import {
  buildAgenda,
  upcoming,
  history,
  overdue,
  onDay,
  nextJob,
  groupByDay,
  conflicts,
  freeSlots,
  dayLoad,
  agendaStats,
  historyFilter,
  monthGrid,
  startOfDay,
  addDays,
  at,
  sameDay,
  dayLabel,
  untilText,
  hhmm,
  ddmm,
  durText,
  endOf,
  isBlock,
  STATUS,
  ORIGIN,
  DURATIONS,
  REMINDERS,
  reminderText,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  MONTHS,
  TIME_OPTIONS,
} from '../../agenda';

const SEGS = [
  { key: 'proximos', label: 'Próximos', icon: 'calendar-outline' },
  { key: 'mes', label: 'Calendário', icon: 'grid-outline' },
  { key: 'feitos', label: 'Feitos', icon: 'checkmark-done-outline' },
  { key: 'horarios', label: 'Horários', icon: 'time-outline' },
];

export default function AgendaScreen() {
  const { state } = useStore();
  const now = useNow(60000);
  const items = useMemo(() => buildAgenda(state, now), [state.agenda, state.myVisits, state.rides, now]);
  const stats = agendaStats(items, now);
  const late = overdue(items, now);
  const [seg, setSeg] = useState('proximos');
  const [open, setOpen] = useState(null); // compromisso aberto nos detalhes
  const [form, setForm] = useState(null); // { item?, day?, block? }
  useBack(seg !== 'proximos', () => setSeg('proximos'));

  const segs = SEGS.map((s) => (s.key === 'proximos' && late.length ? { ...s, badge: late.length } : s));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <Title sub="Seus próximos trabalhos, o que já fez e os seus horários">Minha agenda</Title>

        <NextJob item={nextJob(items, now)} now={now} onOpen={setOpen} />

        <Row style={{ marginHorizontal: -4, marginBottom: 16 }}>
          <MiniStat icon="today-outline" label="Hoje" value={String(stats.today)} />
          <MiniStat icon="calendar-number-outline" label="Próx. 7 dias" value={String(stats.week)} />
          <MiniStat icon="trending-up-outline" label="Ganhos do mês" value={brl(stats.monthEarned)} color={colors.success} />
        </Row>

        <SegTabs items={segs} value={seg} onChange={setSeg} />

        {seg === 'proximos' ? <Upcoming items={items} now={now} late={late} onOpen={setOpen} onNew={(day) => setForm({ day })} /> : null}
        {seg === 'mes' ? <MonthView items={items} now={now} onOpen={setOpen} onNew={(day) => setForm({ day })} /> : null}
        {seg === 'feitos' ? <Done items={items} now={now} stats={stats} onOpen={setOpen} /> : null}
        {seg === 'horarios' ? <Hours onBlock={() => setForm({ block: true })} /> : null}
      </Screen>

      {/* Botão de novo compromisso */}
      <TouchableOpacity style={[styles.fab, soft]} onPress={() => setForm({})} activeOpacity={0.85} accessibilityLabel="Novo compromisso">
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={styles.fabText}>Novo</Text>
      </TouchableOpacity>

      <JobSheet item={open} now={now} onClose={() => setOpen(null)} onEdit={(it) => { setOpen(null); setForm({ item: it }); }} />
      <FormSheet form={form} items={items} onClose={() => setForm(null)} />
    </View>
  );
}

function MiniStat({ icon, label, value, color = colors.text }) {
  return (
    <View style={[styles.mini, soft]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.miniValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.miniLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// Cartão grande do próximo trabalho, com contagem e atalho para a rota.
function NextJob({ item, now, onOpen }) {
  if (!item) {
    return (
      <View style={[styles.next, soft]}>
        <Text style={styles.nextKicker}>PRÓXIMO TRABALHO</Text>
        <Text style={styles.nextTitle}>Agenda livre</Text>
        <Text style={styles.nextSub}>Fique disponível no painel Trabalhar para receber pedidos, ou marque um cliente particular no botão Novo.</Text>
      </View>
    );
  }
  const live = item.start <= now;
  return (
    <TouchableOpacity style={[styles.next, soft]} onPress={() => onOpen(item)} activeOpacity={0.85}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.nextKicker}>{live ? 'ACONTECENDO AGORA' : 'PRÓXIMO TRABALHO'}</Text>
        <View style={styles.countPill}>
          <Ionicons name={live ? 'radio-button-on' : 'time-outline'} size={12} color={colors.primaryDark} />
          <Text style={styles.countText}>{live ? 'agora' : untilText(item.start, now)}</Text>
        </View>
      </Row>
      <Text style={styles.nextTitle}>{item.service}</Text>
      <Text style={styles.nextSub}>
        {dayLabel(item.start, now)} · {hhmm(item.start)} às {hhmm(endOf(item))} · {item.client}
      </Text>
      {item.address ? (
        <Row style={{ marginTop: 10 }}>
          <Ionicons name="location-outline" size={15} color={colors.muted} />
          <Text style={[styles.nextSub, { marginTop: 0, marginLeft: 4, flex: 1 }]} numberOfLines={1}>{item.address}</Text>
          <TouchableOpacity style={styles.routeBtn} onPress={() => openRoute(item.address)} accessibilityLabel="Abrir rota">
            <Ionicons name="navigate" size={14} color={colors.onPrimary} />
            <Text style={styles.routeText}>Rota</Text>
          </TouchableOpacity>
        </Row>
      ) : null}
    </TouchableOpacity>
  );
}

const openRoute = (address) =>
  Linking.openURL(`geo:0,0?q=${encodeURIComponent(address)}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => {})
  );

// ---------- Próximos ----------
function Upcoming({ items, now, late, onOpen, onNew }) {
  const { state } = useStore();
  const [day, setDay] = useState(null); // null = todos os próximos
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(now), i));
  const list = day ? onDay(items, day).filter((it) => it.status !== 'cancelado') : upcoming(items, now);
  const groups = groupByDay(list);
  const free = day ? freeSlots(items, day, state.workHours, now) : [];
  const wh = day ? state.workHours[new Date(day).getDay()] : null;

  return (
    <View style={{ marginTop: 14 }}>
      {late.length ? (
        <View style={styles.lateBox}>
          <Row>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.lateTitle}>
              {late.length === 1 ? '1 trabalho passou do horário' : `${late.length} trabalhos passaram do horário`}
            </Text>
          </Row>
          <Text style={styles.lateText}>Marque como concluído para entrar no seu histórico e nos ganhos.</Text>
          {late.map((it) => (
            <JobRow key={it.id} it={it} now={now} onPress={() => onOpen(it)} compact />
          ))}
        </View>
      ) : null}

      {/* Faixa dos próximos 14 dias */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ paddingRight: 8 }}>
        <TouchableOpacity style={[styles.dayChip, !day && styles.dayChipOn]} onPress={() => setDay(null)}>
          <Text style={[styles.dayWeek, !day && styles.dayOnText]}>Todos</Text>
          <Ionicons name="list" size={16} color={!day ? colors.onPrimary : colors.primary} style={{ marginTop: 4 }} />
        </TouchableOpacity>
        {days.map((d) => {
          const on = day && sameDay(d, day);
          const count = onDay(items, d).filter((it) => !isBlock(it) && it.status !== 'cancelado').length;
          const blocked = onDay(items, d).some(isBlock);
          const off = !state.workHours[new Date(d).getDay()].on;
          return (
            <TouchableOpacity key={d} style={[styles.dayChip, on && styles.dayChipOn, off && !on && { opacity: 0.55 }]} onPress={() => setDay(d)}>
              <Text style={[styles.dayWeek, on && styles.dayOnText]}>{sameDay(d, now) ? 'Hoje' : WEEKDAYS_SHORT[new Date(d).getDay()]}</Text>
              <Text style={[styles.dayNum, on && styles.dayOnText]}>{new Date(d).getDate()}</Text>
              <Row style={{ height: 6, marginTop: 3 }}>
                {Array.from({ length: Math.min(3, count) }).map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: on ? colors.onPrimary : colors.primary }]} />
                ))}
                {blocked ? <View style={[styles.dot, { backgroundColor: on ? colors.onPrimary : colors.muted }]} /> : null}
              </Row>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {day ? (
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={styles.groupTitle}>{dayLabel(day, now)}</Text>
          <Text style={styles.groupSub}>{wh && wh.on ? `Expediente ${wh.from}h às ${wh.to}h` : 'Dia de folga'}</Text>
        </Row>
      ) : null}

      {!groups.length ? <Empty text={day ? 'Nada marcado neste dia.' : 'Nenhum trabalho marcado. Toque em Novo para agendar.'} /> : null}

      {groups.map((g) => (
        <View key={g.day} style={{ marginBottom: 8 }}>
          {!day ? (
            <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.groupTitle}>{dayLabel(g.day, now)}</Text>
              <Text style={styles.groupSub}>{groupSummary(g.items)}</Text>
            </Row>
          ) : null}
          {g.items.map((it, i) => (
            <JobRow key={it.id} it={it} now={now} last={i === g.items.length - 1} onPress={() => onOpen(it)} />
          ))}
        </View>
      ))}

      {day && free.length ? (
        <View style={{ marginTop: 4 }}>
          <Text style={[styles.groupSub, { marginBottom: 8 }]}>Horários livres para encaixar um cliente</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {free.map((f) => (
              <TouchableOpacity key={f.from} style={styles.freeChip} onPress={() => onNew(f.from)}>
                <Ionicons name="add-circle-outline" size={14} color={colors.success} />
                <Text style={styles.freeText}>
                  {hhmm(f.from)} – {hhmm(f.to)}
                </Text>
              </TouchableOpacity>
            ))}
          </Row>
        </View>
      ) : null}
    </View>
  );
}

// "2 trabalhos · R$ 430,00" ou "Horário bloqueado".
function groupSummary(list) {
  const jobs = list.filter((it) => !isBlock(it));
  if (!jobs.length) return 'Horário bloqueado';
  const total = jobs.reduce((s, it) => s + (Number(it.value) || 0), 0);
  return `${jobs.length} ${jobs.length === 1 ? 'trabalho' : 'trabalhos'}${total ? ` · ${brl(total)}` : ''}`;
}

// Linha da linha do tempo: hora à esquerda, trilho colorido e o cartão do trabalho.
function JobRow({ it, now, onPress, last, compact }) {
  const st = STATUS[it.status] || STATUS.agendado;
  const block = isBlock(it);
  const live = !block && it.start <= now && endOf(it) >= now && it.status !== 'feito' && it.status !== 'cancelado';
  return (
    <TouchableOpacity style={styles.tlRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.tlTime}>
        <Text style={styles.tlHour}>{hhmm(it.start)}</Text>
        <Text style={styles.tlDur}>{durText(it.dur)}</Text>
      </View>
      {!compact ? (
        <View style={styles.tlRail}>
          <View style={[styles.tlDot, { backgroundColor: live ? colors.sponsored : st.color }]} />
          {!last ? <View style={styles.tlLine} /> : null}
        </View>
      ) : null}
      <View style={[styles.tlCard, soft, block && styles.tlBlock, live && { borderLeftWidth: 3, borderLeftColor: colors.sponsored }]}>
        {block ? (
          <Row>
            <Ionicons name="lock-closed-outline" size={15} color={colors.muted} />
            <Text style={[styles.tlTitle, { color: colors.muted, marginLeft: 6 }]}>{it.service}</Text>
          </Row>
        ) : (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.tlTitle} numberOfLines={1}>{it.client}</Text>
              {it.value ? <Text style={styles.tlValue}>{brl(it.value)}</Text> : null}
            </Row>
            <Text style={styles.tlService} numberOfLines={1}>{it.service}</Text>
            <Row style={{ marginTop: 6, justifyContent: 'space-between' }}>
              <Row style={{ flex: 1 }}>
                <Ionicons name={(ORIGIN[it.origin] || ORIGIN.realys).icon} size={12} color={colors.muted} />
                <Text style={styles.tlOrigin} numberOfLines={1}>{(ORIGIN[it.origin] || ORIGIN.realys).label}</Text>
              </Row>
              <View style={[styles.pill, { backgroundColor: (live ? colors.sponsored : st.color) + '1F' }]}>
                <Text style={[styles.pillText, { color: live ? colors.sponsored : st.color }]}>{live ? 'Agora' : st.label}</Text>
              </View>
            </Row>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ---------- Calendário do mês ----------
function MonthView({ items, now, onOpen, onNew }) {
  const { state } = useStore();
  const [ym, setYm] = useState(() => ({ y: new Date(now).getFullYear(), m: new Date(now).getMonth() }));
  const [day, setDay] = useState(startOfDay(now));
  const weeks = monthGrid(ym.y, ym.m);
  const move = (n) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  const list = onDay(items, day);
  const monthItems = items.filter((it) => {
    const d = new Date(it.start);
    return d.getFullYear() === ym.y && d.getMonth() === ym.m && !isBlock(it);
  });
  const monthValue = monthItems.filter((it) => it.status !== 'cancelado').reduce((s, it) => s + (Number(it.value) || 0), 0);

  return (
    <View style={{ marginTop: 14 }}>
      <View style={[styles.calBox, soft]}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => move(-1)} style={styles.calArrow} accessibilityLabel="Mês anterior">
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.calMonth}>
              {MONTHS[ym.m]} {ym.y}
            </Text>
            <Text style={styles.groupSub}>
              {monthItems.filter((it) => it.status !== 'cancelado').length} trabalhos · {brl(monthValue)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => move(1)} style={styles.calArrow} accessibilityLabel="Próximo mês">
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </Row>
        <Row>
          {WEEKDAYS_SHORT.map((w) => (
            <Text key={w} style={styles.calHead}>{w[0]}</Text>
          ))}
        </Row>
        {weeks.map((w, i) => (
          <Row key={i}>
            {w.map((d, j) => {
              if (!d) return <View key={j} style={styles.calCell} />;
              const on = sameDay(d, day);
              const today = sameDay(d, now);
              const load = dayLoad(items, d, state.workHours);
              const dayItems = onDay(items, d).filter((it) => it.status !== 'cancelado');
              const hasDone = dayItems.some((it) => it.status === 'feito');
              const hasOpen = dayItems.some((it) => !isBlock(it) && it.status !== 'feito');
              const blocked = dayItems.some(isBlock);
              const off = !state.workHours[new Date(d).getDay()].on;
              return (
                <TouchableOpacity key={j} style={styles.calCell} onPress={() => setDay(d)} accessibilityLabel={`${dayLabel(d, now)}, ${dayItems.length} compromissos`}>
                  <View
                    style={[
                      styles.calDay,
                      load > 0 && { backgroundColor: `rgba(226,182,73,${0.12 + load * 0.45})` },
                      today && styles.calToday,
                      on && styles.calOn,
                    ]}
                  >
                    <Text style={[styles.calNum, off && { color: colors.muted }, on && { color: colors.onPrimary, fontWeight: '700' }]}>{new Date(d).getDate()}</Text>
                  </View>
                  <Row style={{ height: 5, marginTop: 2 }}>
                    {hasOpen ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                    {hasDone ? <View style={[styles.dot, { backgroundColor: colors.success }]} /> : null}
                    {blocked ? <View style={[styles.dot, { backgroundColor: colors.muted }]} /> : null}
                  </Row>
                </TouchableOpacity>
              );
            })}
          </Row>
        ))}
        <Row style={{ justifyContent: 'center', marginTop: 8 }}>
          <Legend color={colors.primary} label="Marcado" />
          <Legend color={colors.success} label="Feito" />
          <Legend color={colors.muted} label="Bloqueado" />
        </Row>
      </View>

      <Row style={{ justifyContent: 'space-between', marginTop: 16, marginBottom: 10 }}>
        <Text style={styles.groupTitle}>{dayLabel(day, now)}</Text>
        {startOfDay(day) >= startOfDay(now) ? (
          <TouchableOpacity onPress={() => onNew(day)} style={styles.linkBtn}>
            <Ionicons name="add" size={15} color={colors.primary} />
            <Text style={styles.linkText}>Marcar neste dia</Text>
          </TouchableOpacity>
        ) : null}
      </Row>
      {!list.length ? <Empty text="Nada neste dia." /> : null}
      {list.map((it, i) => (
        <JobRow key={it.id} it={it} now={now} last={i === list.length - 1} onPress={() => onOpen(it)} />
      ))}
    </View>
  );
}

function Legend({ color, label }) {
  return (
    <Row style={{ marginHorizontal: 8 }}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.groupSub, { marginLeft: 2 }]}>{label}</Text>
    </Row>
  );
}

// ---------- Feitos (histórico) ----------
const PERIODS = [
  { key: 'mes', label: 'Este mês' },
  { key: 'passado', label: 'Mês passado' },
  { key: 'tudo', label: 'Tudo' },
];

function Done({ items, now, stats, onOpen }) {
  const [period, setPeriod] = useState('mes');
  const all = history(items).filter((it) => !isBlock(it));
  const list = historyFilter(all, period, now);
  const done = list.filter((it) => it.status === 'feito');
  const earned = done.reduce((s, it) => s + (Number(it.value) || 0), 0);
  const canceled = list.length - done.length;
  const groups = groupByDay(list);

  return (
    <View style={{ marginTop: 14 }}>
      <Row style={{ marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <Chip key={p.key} label={p.label} active={period === p.key} onPress={() => setPeriod(p.key)} />
        ))}
      </Row>

      <View style={[styles.sumBox, soft]}>
        <Row>
          <SumCol label="Recebido" value={brl(earned)} color={colors.success} />
          <SumCol label="Concluídos" value={String(done.length)} />
          <SumCol label="Nota média" value={stats.avgStars ? `★ ${stats.avgStars.toFixed(1).replace('.', ',')}` : '-'} color={colors.gold} />
        </Row>
        {canceled ? <Text style={[styles.groupSub, { marginTop: 8, textAlign: 'center' }]}>{canceled} cancelado(s) no período</Text> : null}
      </View>

      {!groups.length ? <Empty text="Nenhum trabalho neste período." /> : null}
      {groups.map((g) => (
        <View key={g.day} style={{ marginBottom: 6 }}>
          <Text style={[styles.groupTitle, { marginBottom: 8 }]}>{dayLabel(g.day, now)}</Text>
          {g.items.map((it) => (
            <TouchableOpacity key={it.id} style={[styles.histCard, soft]} onPress={() => onOpen(it)} activeOpacity={0.8}>
              <View style={[styles.histIcon, { backgroundColor: (STATUS[it.status] || STATUS.feito).color + '1F' }]}>
                <Ionicons name={it.status === 'feito' ? 'checkmark' : 'close'} size={16} color={(STATUS[it.status] || STATUS.feito).color} />
              </View>
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.tlTitle} numberOfLines={1}>{it.client}</Text>
                  <Text style={[styles.tlValue, it.status !== 'feito' && { color: colors.muted, textDecorationLine: 'line-through' }]}>{brl(it.value || 0)}</Text>
                </Row>
                <Text style={styles.tlService} numberOfLines={1}>
                  {hhmm(it.start)} · {it.service}
                </Text>
                {it.stars ? (
                  <Text style={styles.histStars}>
                    {'★'.repeat(it.stars)}
                    {'☆'.repeat(5 - it.stars)}
                    {it.review ? <Text style={styles.histReview}>  "{it.review}"</Text> : null}
                  </Text>
                ) : it.status === 'feito' && it.origin === 'particular' ? (
                  <Text style={styles.histReview}>Cliente particular, sem avaliação no app</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

function SumCol({ label, value, color = colors.text }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.sumValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

// ---------- Horário de trabalho ----------
const HOUR_CHOICES = Array.from({ length: 19 }, (_, i) => 5 + i); // 5h às 23h

function Hours({ onBlock }) {
  const { state, dispatch } = useStore();
  const order = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro
  const step = (day, field, delta) => {
    const h = state.workHours[day];
    const v = h[field] + delta;
    if (field === 'from' && (v < 5 || v >= h.to)) return;
    if (field === 'to' && (v > 23 || v <= h.from)) return;
    dispatch({ type: 'AGENDA_HOURS', day, patch: { [field]: v } });
  };
  const weekly = state.workHours.reduce((s, h) => s + (h.on ? h.to - h.from : 0), 0);

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.groupSub, { marginBottom: 10 }]}>
        Os clientes só conseguem marcar dentro desses horários. Você trabalha {weekly} h por semana.
      </Text>
      <View style={[styles.calBox, soft, { paddingVertical: 6 }]}>
        {order.map((d, i) => {
          const h = state.workHours[d];
          return (
            <View key={d} style={[styles.hourRow, i === order.length - 1 && { borderBottomWidth: 0 }]}>
              <TouchableOpacity style={styles.hourDay} onPress={() => dispatch({ type: 'AGENDA_HOURS', day: d, patch: { on: !h.on } })} accessibilityLabel={`${WEEKDAYS[d]}: ${h.on ? 'trabalho' : 'folga'}`}>
                <Ionicons name={h.on ? 'checkbox' : 'square-outline'} size={20} color={h.on ? colors.primary : colors.muted} />
                <Text style={[styles.hourName, !h.on && { color: colors.muted }]}>{WEEKDAYS[d]}</Text>
              </TouchableOpacity>
              {h.on ? (
                <Row>
                  <Stepper value={`${h.from}h`} onMinus={() => step(d, 'from', -1)} onPlus={() => step(d, 'from', 1)} />
                  <Text style={styles.groupSub}> às </Text>
                  <Stepper value={`${h.to}h`} onMinus={() => step(d, 'to', -1)} onPlus={() => step(d, 'to', 1)} />
                </Row>
              ) : (
                <Text style={styles.groupSub}>Folga</Text>
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.groupTitle, { marginTop: 18, marginBottom: 8 }]}>Aviso antes de cada trabalho</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        {REMINDERS.map((m) => (
          <View key={m} style={{ marginBottom: 8 }}>
            <Chip label={reminderText(m)} active={state.agendaRemind === m} onPress={() => dispatch({ type: 'AGENDA_REMIND', min: m })} />
          </View>
        ))}
      </Row>
      <Text style={[styles.groupSub, { marginBottom: 18 }]}>A Lotus avisa por voz e notificação, com o endereço e a rota.</Text>

      <Button variant="light" title="Bloquear um horário (folga, almoço, médico…)" onPress={onBlock} />
    </View>
  );
}

function Stepper({ value, onMinus, onPlus }) {
  return (
    <Row style={styles.stepper}>
      <TouchableOpacity onPress={onMinus} style={styles.stepBtn} accessibilityLabel="Menos uma hora">
        <Ionicons name="remove" size={14} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity onPress={onPlus} style={styles.stepBtn} accessibilityLabel="Mais uma hora">
        <Ionicons name="add" size={14} color={colors.primary} />
      </TouchableOpacity>
    </Row>
  );
}

// ---------- Detalhes do compromisso ----------
function JobSheet({ item, now, onClose, onEdit }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  if (!item) return null;
  const st = STATUS[item.status] || STATUS.agendado;
  const block = isBlock(item);
  const own = !item.visitId && !item.rideId; // compromisso da própria agenda (dá para editar)
  const open = item.status !== 'feito' && item.status !== 'cancelado';
  const started = item.start <= now;

  const finish = () => {
    if (item.visitId) {
      if (item.visitStatus === 'aceita') dispatch({ type: 'PROVIDER_VISIT_CONFIRMED', id: item.visitId, client: item.client });
      else if (item.visitStatus === 'confirmada') dispatch({ type: 'PROVIDER_VISIT_DONE', id: item.visitId });
    } else if (own) {
      dispatch({ type: 'AGENDA_UPDATE', id: item.id, patch: { status: 'feito' } });
    }
    onClose();
  };
  const cancel = () =>
    Alert.alert(block ? 'Liberar este horário?' : 'Cancelar este trabalho?', block ? 'O horário volta a ficar livre para clientes.' : 'O cliente é avisado pelo Realys.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: block ? 'Liberar' : 'Cancelar trabalho',
        style: 'destructive',
        onPress: () => {
          if (block) dispatch({ type: 'AGENDA_REMOVE', id: item.id });
          else dispatch({ type: 'AGENDA_UPDATE', id: item.id, patch: { status: 'cancelado' } });
          onClose();
        },
      },
    ]);

  const finishLabel = item.visitId
    ? item.visitStatus === 'aceita'
      ? 'Cliente confirmou a visita'
      : 'Serviço concluído'
    : 'Marcar como concluído';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.grip} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={[styles.pill, { backgroundColor: st.color + '1F' }]}>
            <Text style={[styles.pillText, { color: st.color }]}>{st.label}</Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={colors.muted} />
          </TouchableOpacity>
        </Row>
        <Text style={styles.sheetTitle}>{block ? item.service : item.client}</Text>
        {!block ? <Text style={styles.sheetSub}>{item.service}</Text> : null}

        <View style={styles.infoBox}>
          <Info icon="calendar-outline" text={`${dayLabel(item.start, now)} · ${hhmm(item.start)} às ${hhmm(endOf(item))} (${durText(item.dur)})`} />
          {item.address ? <Info icon="location-outline" text={item.address} /> : null}
          {!block ? <Info icon="cash-outline" text={item.value ? brl(item.value) : 'Valor a combinar'} sub={item.valueNote} /> : null}
          <Info icon={(ORIGIN[item.origin] || ORIGIN.realys).icon} text={(ORIGIN[item.origin] || ORIGIN.realys).label} sub={item.origin === 'particular' ? 'Marcado por você. Fora do pagamento protegido do Realys.' : null} />
          {item.note ? <Info icon="document-text-outline" text={item.note} /> : null}
          {item.stars ? <Info icon="star-outline" text={`Cliente avaliou: ${'★'.repeat(item.stars)}${'☆'.repeat(5 - item.stars)}`} sub={item.review ? `"${item.review}"` : null} /> : null}
          {item.clientStars ? <Info icon="person-circle-outline" text={`Você avaliou o cliente: ${'★'.repeat(item.clientStars)}`} /> : null}
        </View>

        {open && !block ? (
          <>
            {item.address ? <Button title="Abrir rota no mapa" onPress={() => openRoute(item.address)} style={{ marginBottom: 8 }} /> : null}
            {(started || item.visitId) && (own || item.visitId) ? <Button variant="light" title={finishLabel} onPress={finish} style={{ marginBottom: 8 }} /> : null}
            {item.rideId ? <Text style={[styles.groupSub, { textAlign: 'center', marginBottom: 8 }]}>Acompanhe este pedido no painel Trabalhar.</Text> : null}
            {item.visitId && item.visitStatus === 'aceita' ? (
              <Text style={[styles.groupSub, { textAlign: 'center', marginBottom: 8 }]}>Demonstração: o botão acima simula a confirmação do cliente.</Text>
            ) : null}
          </>
        ) : null}
        {open && own ? (
          <Row>
            <Button variant="dark" title="Reagendar" small style={{ flex: 1, marginRight: 8 }} onPress={() => onEdit(item)} />
            <Button variant="dark" title={block ? 'Liberar horário' : 'Cancelar'} small style={{ flex: 1 }} onPress={cancel} />
          </Row>
        ) : null}
        {!open && own && item.status === 'cancelado' ? (
          <Button variant="light" title="Remarcar" onPress={() => { dispatch({ type: 'AGENDA_UPDATE', id: item.id, patch: { status: 'agendado' } }); onEdit({ ...item, status: 'agendado' }); }} />
        ) : null}
      </View>
    </Modal>
  );
}

function Info({ icon, text, sub }) {
  return (
    <Row style={{ alignItems: 'flex-start', marginBottom: 10 }}>
      <Ionicons name={icon} size={17} color={colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: colors.text, fontSize: 14 }}>{text}</Text>
        {sub ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </Row>
  );
}

// ---------- Novo / reagendar ----------
function FormSheet({ form, items, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const now = Date.now();
  const editing = form && form.item;
  const [block, setBlock] = useState(false);
  const [client, setClient] = useState('');
  const [service, setService] = useState('');
  const [address, setAddress] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(startOfDay(now));
  const [time, setTime] = useState({ h: 9, m: 0 });
  const [dur, setDur] = useState(60);

  useEffect(() => {
    if (!form) return;
    const it = form.item;
    const base = it ? it.start : form.day || null;
    let d = base ? startOfDay(base) : startOfDay(now);
    if (d < startOfDay(now)) d = startOfDay(now);
    const bd = base ? new Date(base) : null;
    // Toque num dia (sem hora): primeiro horário livre do expediente.
    let t = bd && (bd.getHours() || bd.getMinutes()) ? { h: bd.getHours(), m: bd.getMinutes() } : null;
    if (!t) {
      const free = freeSlots(items, d, state.workHours, now, 30)[0];
      t = free ? { h: new Date(free.from).getHours(), m: new Date(free.from).getMinutes() } : { h: 9, m: 0 };
    }
    setBlock(it ? isBlock(it) : !!form.block);
    setClient(it ? it.client || '' : '');
    setService(it ? it.service || '' : form.block ? 'Folga' : (state.myProvider && state.myProvider.functions && state.myProvider.functions[0]) || '');
    setAddress(it ? it.address || '' : '');
    setValue(it && it.value ? String(it.value).replace('.', ',') : '');
    setNote(it ? it.note || '' : '');
    setDay(d);
    setTime(t);
    setDur(it ? it.dur : form.block ? 480 : 60);
  }, [form]);

  if (!form) return null;
  const days = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(now), i));
  const start = dur >= 480 ? at(day, 0) : at(day, time.h, time.m);
  const realDur = dur >= 480 ? 24 * 60 - 1 : dur;
  const clash = conflicts(items, start, realDur, editing ? form.item.id : null);
  const wh = state.workHours[new Date(day).getDay()];
  const outside = !block && dur < 480 && (!wh.on || time.h < wh.from || time.h + time.m / 60 + dur / 60 > wh.to);
  const busyAt = (o) => conflicts(items, at(day, o.h, o.m), 30, editing ? form.item.id : null).length > 0 || at(day, o.h, o.m) < now;

  const save = () => {
    if (!block && !client.trim()) return Alert.alert('Quem é o cliente?', 'Informe o nome do cliente.');
    if (!service.trim()) return Alert.alert(block ? 'Motivo do bloqueio' : 'Qual é o serviço?', block ? 'Ex.: folga, almoço, médico.' : 'Descreva o serviço.');
    const v = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
    const item = {
      start,
      dur: realDur,
      service: service.trim(),
      ...(block
        ? { origin: 'bloqueio', status: 'bloqueio' }
        : {
            client: client.trim(),
            address: address.trim(),
            value: isNaN(v) ? 0 : v,
            note: note.trim(),
            origin: editing ? form.item.origin : 'particular',
            status: editing && form.item.status !== 'bloqueio' ? form.item.status : 'agendado',
          }),
    };
    const done = () => {
      if (editing) dispatch({ type: 'AGENDA_UPDATE', id: form.item.id, patch: item });
      else dispatch({ type: 'AGENDA_ADD', item });
      onClose();
    };
    if (clash.length) {
      return Alert.alert('Horário ocupado', `Já tem ${clash.map((c) => (isBlock(c) ? c.service : c.client)).join(', ')} nesse horário. Marcar mesmo assim?`, [
        { text: 'Escolher outro', style: 'cancel' },
        { text: 'Marcar assim mesmo', onPress: done },
      ]);
    }
    done();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { maxHeight: '88%', paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.grip} />
          <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={styles.sheetTitle}>{editing ? 'Reagendar' : block ? 'Bloquear horário' : 'Novo compromisso'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!editing ? (
              <Row style={{ marginBottom: 12 }}>
                <Chip label="👤 Cliente" active={!block} onPress={() => { setBlock(false); if (service === 'Folga') setService(''); if (dur >= 480) setDur(60); }} />
                <Chip label="🔒 Bloquear horário" active={block} onPress={() => { setBlock(true); if (!service) setService('Folga'); }} />
              </Row>
            ) : null}

            {block ? (
              <>
                <Text style={styles.label}>Motivo</Text>
                <Row style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                  {['Folga', 'Almoço', 'Médico', 'Compromisso pessoal'].map((r) => (
                    <View key={r} style={{ marginBottom: 8 }}>
                      <Chip label={r} active={service === r} onPress={() => setService(r)} />
                    </View>
                  ))}
                </Row>
                <Input placeholder="Ou escreva o motivo" value={service} onChangeText={setService} />
              </>
            ) : (
              <>
                <Text style={styles.label}>Cliente</Text>
                <Input placeholder="Nome do cliente" value={client} onChangeText={setClient} />
                <Text style={styles.label}>Serviço</Text>
                <Input placeholder="O que vai fazer" value={service} onChangeText={setService} />
                <Text style={styles.label}>Endereço</Text>
                <Input placeholder="Rua, número e bairro" value={address} onChangeText={setAddress} />
              </>
            )}

            <Text style={styles.label}>Dia</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {days.map((d) => {
                const on = sameDay(d, day);
                const off = !state.workHours[new Date(d).getDay()].on;
                return (
                  <TouchableOpacity key={d} style={[styles.dayChip, on && styles.dayChipOn, off && !on && { opacity: 0.55 }]} onPress={() => setDay(d)}>
                    <Text style={[styles.dayWeek, on && styles.dayOnText]}>{sameDay(d, now) ? 'Hoje' : WEEKDAYS_SHORT[new Date(d).getDay()]}</Text>
                    <Text style={[styles.dayNum, on && styles.dayOnText]}>{new Date(d).getDate()}</Text>
                    <Text style={[styles.dayMonth, on && styles.dayOnText]}>{MONTHS[new Date(d).getMonth()].slice(0, 3)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Duração</Text>
            <Row style={{ flexWrap: 'wrap', marginBottom: 4 }}>
              {DURATIONS.map((o) => (
                <View key={o.min} style={{ marginBottom: 8 }}>
                  <Chip label={o.label} active={dur === o.min || (o.min === 480 && dur >= 480)} onPress={() => setDur(o.min)} />
                </View>
              ))}
            </Row>

            {dur < 480 ? (
              <>
                <Text style={styles.label}>Horário de início</Text>
                <Row style={{ flexWrap: 'wrap', marginBottom: 6 }}>
                  {TIME_OPTIONS.map((o) => {
                    const on = o.h === time.h && o.m === time.m;
                    const busy = busyAt(o);
                    const offHours = !wh.on || o.h < wh.from || o.h >= wh.to;
                    return (
                      <TouchableOpacity
                        key={`${o.h}:${o.m}`}
                        onPress={() => setTime(o)}
                        style={[styles.timeChip, offHours && !on && { opacity: 0.45 }, busy && !on && styles.timeBusy, on && styles.timeOn]}
                      >
                        <Text style={[styles.timeText, busy && !on && { color: colors.muted, textDecorationLine: 'line-through' }, on && { color: colors.onPrimary }]}>
                          {o.m ? `${o.h}:30` : `${o.h}:00`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </Row>
              </>
            ) : null}

            {clash.length ? (
              <Text style={styles.warn}>⚠️ Conflita com {clash.map((c) => (isBlock(c) ? c.service : c.client)).join(', ')}</Text>
            ) : null}
            {outside ? <Text style={styles.warn}>⏰ Fora do seu horário de trabalho ({wh.on ? `${wh.from}h às ${wh.to}h` : 'dia de folga'})</Text> : null}

            {!block ? (
              <>
                <Text style={styles.label}>Valor combinado (opcional)</Text>
                <Input placeholder="R$" keyboardType="decimal-pad" value={value} onChangeText={setValue} />
                <Text style={styles.label}>Observação (opcional)</Text>
                <Input placeholder="Ex.: levar escada, portão azul" value={note} onChangeText={setNote} multiline />
              </>
            ) : null}

            <View style={styles.summary}>
              <Ionicons name="calendar" size={16} color={colors.primaryDark} />
              <Text style={styles.summaryText}>
                {dayLabel(day, now)}
                {dur >= 480 ? ' · dia todo' : ` · ${hhmm(start)} às ${hhmm(start + dur * 60000)}`}
              </Text>
            </View>
            <Button title={editing ? 'Salvar alterações' : block ? 'Bloquear horário' : 'Agendar'} onPress={save} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    // Centralizado embaixo: a Lotus fica à direita e as ferramentas do administrador à esquerda.
    position: 'absolute',
    alignSelf: 'center',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  fabText: { color: colors.onPrimary, fontWeight: '700', marginLeft: 4, fontSize: 14 },

  next: { backgroundColor: colors.primaryLight, borderRadius: 22, padding: 18, marginBottom: 14 },
  nextKicker: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  nextTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 6, letterSpacing: -0.3 },
  nextSub: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  countPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFFAA', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  countText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  routeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, marginLeft: 8 },
  routeText: { color: colors.onPrimary, fontWeight: '700', fontSize: 12, marginLeft: 4 },

  mini: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, marginHorizontal: 4, alignItems: 'center' },
  miniValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  miniLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },

  lateBox: { backgroundColor: '#FDF1F0', borderRadius: 18, padding: 14, marginBottom: 14 },
  lateTitle: { color: colors.danger, fontWeight: '700', marginLeft: 6 },
  lateText: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 10 },

  dayChip: { width: 54, alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: colors.card, marginRight: 8, ...soft },
  dayChipOn: { backgroundColor: colors.primary },
  dayWeek: { color: colors.muted, fontSize: 11 },
  dayNum: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  dayMonth: { color: colors.muted, fontSize: 10 },
  dayOnText: { color: colors.onPrimary },
  dot: { width: 5, height: 5, borderRadius: 3, marginHorizontal: 1 },

  groupTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  groupSub: { color: colors.muted, fontSize: 12 },

  tlRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 2 },
  tlTime: { width: 48, paddingTop: 12 },
  tlHour: { color: colors.text, fontWeight: '700', fontSize: 14 },
  tlDur: { color: colors.muted, fontSize: 10, marginTop: 1 },
  tlRail: { width: 16, alignItems: 'center' },
  tlDot: { width: 10, height: 10, borderRadius: 5, marginTop: 16 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  tlCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10, marginLeft: 6 },
  tlBlock: { backgroundColor: colors.cardAlt, elevation: 0, shadowOpacity: 0 },
  tlTitle: { color: colors.text, fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 },
  tlValue: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  tlService: { color: colors.text, fontSize: 13, marginTop: 2 },
  tlOrigin: { color: colors.muted, fontSize: 11, marginLeft: 4, flex: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '700' },

  freeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9F7F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  freeText: { color: colors.success, fontWeight: '700', fontSize: 12, marginLeft: 4 },

  calBox: { backgroundColor: colors.card, borderRadius: 20, padding: 14 },
  calArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  calMonth: { color: colors.text, fontWeight: '700', fontSize: 16 },
  calHead: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, marginBottom: 6 },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: colors.primary },
  calOn: { backgroundColor: colors.primary },
  calNum: { color: colors.text, fontSize: 14 },
  linkBtn: { flexDirection: 'row', alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 2 },

  sumBox: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16 },
  sumValue: { fontSize: 18, fontWeight: '700' },
  histCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10 },
  histIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  histStars: { color: colors.gold, fontSize: 13, marginTop: 4 },
  histReview: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },

  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  hourDay: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  hourName: { color: colors.text, fontWeight: '700', marginLeft: 8 },
  stepper: { backgroundColor: colors.bg, borderRadius: 999 },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stepValue: { color: colors.text, fontWeight: '700', minWidth: 30, textAlign: 'center', fontSize: 13 },

  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.35)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18 },
  grip: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
  sheetSub: { color: colors.muted, fontSize: 14, marginTop: 2 },
  infoBox: { backgroundColor: colors.bg, borderRadius: 16, padding: 14, paddingBottom: 4, marginVertical: 14 },
  label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
  timeChip: { width: '18%', marginRight: '2%', marginBottom: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center' },
  timeBusy: { backgroundColor: colors.cardAlt },
  timeOn: { backgroundColor: colors.primary },
  timeText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  warn: { color: colors.danger, fontSize: 12, marginBottom: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, marginVertical: 10 },
  summaryText: { color: colors.primaryDark, fontWeight: '700', marginLeft: 8 },
});
