// Administrador › Suporte: a fila de chamados dos usuários. Quem está esperando vem primeiro, e os
// assuntos urgentes (pagamento, conta, biometria) entram na frente.
import React, { useState } from 'react';
import { KeyboardLift } from '../../keyboard';
import { View, StyleSheet, TouchableOpacity, Modal, Platform, Alert } from 'react-native';
import { useStore } from '../../store';
import { AnalystBanner } from './AdminScreens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft } from '../../theme';
import { Screen, Title } from '../../components/ui';
import { useSupport, supportQueue, supportSummary, topicOf, STATUS_LABEL, teamReply, QUICK_REPLIES } from '../../support';
import { TicketThread } from '../../components/SupportCenter';

const when = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const FILTERS = [
  ['aberto', 'Aguardando'],
  ['respondido', 'Respondidos'],
  ['resolvido', 'Resolvidos'],
];

export default function AdminSupport() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const readOnly = !!(state.user && state.user.readOnly);
  useSupport();
  const sum = supportSummary();
  const [filter, setFilter] = useState('aberto');
  const [openId, setOpenId] = useState(null);
  const queue = supportQueue();
  const list = queue.filter((t) => t.status === filter);
  const open = queue.find((t) => t.id === openId) || null;

  return (
    <Screen>
      <AnalystBanner />
      <Title sub="Chamados dos usuários. Os urgentes entram na frente da fila.">Suporte</Title>
      <View style={st.kpis}>
        {[
          [sum.waiting, 'aguardando'],
          [sum.urgent, 'urgentes'],
          [sum.solved, 'resolvidos'],
          [sum.rating ? String(sum.rating).replace('.', ',') : '–', 'nota'],
        ].map(([n, l]) => (
          <View key={l} style={st.kpi}>
            <Text numberOfLines={1} style={st.kpiN}>{n}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.kpiL}>{l}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {FILTERS.map(([k, label]) => (
          <TouchableOpacity key={k} style={[st.seg, filter === k && st.segOn]} onPress={() => setFilter(k)}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: filter === k ? colors.text : colors.menu, fontWeight: filter === k ? '800' : '700', fontSize: 13 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {list.map((t) => (
        <TouchableOpacity key={t.id} style={st.row} onPress={() => setOpenId(t.id)} accessibilityLabel={`Chamado ${t.n} de ${t.userName}`}>
          <Ionicons name={topicOf(t.topic).icon} size={20} color={colors.menu} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>nº {t.n} · {t.userName}</Text>
            <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{t.messages[0] ? t.messages[0].text : topicOf(t.topic).label}</Text>
            <Text style={{ color: colors.muted, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>{topicOf(t.topic).label} · {when(t.updatedAt)}{t.lotusTried ? ' · Lotus já tentou' : ''}</Text>
          </View>
          {t.urgent && t.status === 'aberto' ? <Text style={st.urgent}>Urgente</Text> : <Ionicons name="chevron-forward" size={17} color={colors.muted} />}
        </TouchableOpacity>
      ))}
      {!list.length ? <Text style={st.empty}>{filter === 'aberto' ? 'Nenhum chamado esperando. Fila em dia.' : `Nenhum chamado em "${STATUS_LABEL[filter]}".`}</Text> : null}

      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpenId(null)}>
        <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 }}>
            <TouchableOpacity onPress={() => setOpenId(null)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Voltar">
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{open ? `Chamado nº ${open.n}` : ''}</Text>
          </View>
          {open ? <TicketThread ticket={open} bottom={insets.bottom} asTeam quick={QUICK_REPLIES} onSend={(v) => (readOnly ? Alert.alert('Acesso de analista', 'Você pode ler os chamados, mas responder é com a equipe de suporte.') : teamReply(open.id, v))} /> : null}
        </KeyboardLift>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  kpis: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4, marginHorizontal: 4, alignItems: 'center', ...soft },
  kpiN: { color: colors.text, fontWeight: '800', fontSize: 16 },
  kpiL: { color: colors.muted, fontSize: 11 },
  seg: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  segOn: { borderBottomColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, ...soft },
  urgent: { color: colors.primary, fontWeight: '800', fontSize: 11.5 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 26 },
});
