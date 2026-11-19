// Notificações da Community: um sininho discreto no cantinho, junto de Mensagens e Contatos.
// Junta o que aconteceu com o usuário: depoimentos, pedidos, chamados, atendimentos e dinheiro recebido.
// Pedidos de amizade ficam no símbolo de Contatos (com o contador), não aqui.
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { memberById } from '../people';

const DAY = 24 * 60 * 60 * 1000;
const nameOf = (id) => (memberById(id) || {}).name || 'Alguém';
const first = (n) => String(n || '').split(' ')[0];

// Monta a lista a partir do que já existe no app. go: para onde o toque leva.
export function buildNotifs(state) {
  const out = [];
  (state.testimonials || []).forEach((t) => {
    if (t.to === 'me' && t.status === 'pendente') out.push({ id: 'dep-' + t.id, icon: 'chatbox-ellipses-outline', text: `${nameOf(t.from)} deixou um depoimento para você`, sub: 'Toque para ler e aprovar', go: { dep: true } });
    if (t.from === 'me' && t.status === 'aprovado' && t.time === 'agora') out.push({ id: 'depok-' + t.id, icon: 'checkmark-done-outline', text: `${first(nameOf(t.to))} aceitou o seu depoimento`, sub: 'Já aparece no perfil', go: { dep: true } });
  });
  (state.orders || []).forEach((o) => {
    if (o.status === 'Entregue' || o.status === 'Reembolsado') return;
    out.push({ id: `ped-${o.id}-${o.status}`, at: o.at, icon: o.courier ? 'bicycle-outline' : 'cube-outline', text: `Pedido ${o.store ? `em ${o.store}` : ''}: ${String(o.status).toLowerCase()}`, sub: 'Ver em Pedidos', go: { tab: 'pedidos', seg: o.courier ? 'comida' : 'compras' } });
  });
  (state.visits || []).forEach((v) => {
    if (v.status === 'aceita') out.push({ id: `vis-${v.id}-aceita`, at: v.at, icon: 'construct-outline', text: `${first(v.provider && v.provider.name)} aceitou o seu chamado`, sub: v.serviceLabel || 'Serviço', go: { tab: 'pedidos', seg: 'servicos' } });
    if (v.status === 'recusada') out.push({ id: `vis-${v.id}-recusada`, at: v.at, icon: 'close-circle-outline', text: `${first(v.provider && v.provider.name)} não pôde atender`, sub: 'A taxa de visita voltou para o seu saldo', go: { tab: 'pedidos', seg: 'servicos' } });
  });
  (state.onlineAppts || []).forEach((x) => {
    if (x.status === 'confirmado') out.push({ id: `onl-${x.id}`, at: x.at, icon: 'videocam-outline', text: `${first(x.p && x.p.name)} confirmou o atendimento online`, sub: x.when || '', go: { tab: 'pedidos', seg: 'servicos' } });
  });
  (state.walletTx || []).forEach((tx) => {
    if (tx.kind === 'recebido' && Date.now() - (tx.ts || 0) < 3 * DAY) out.push({ id: 'pix-' + tx.id, at: tx.ts, icon: 'wallet-outline', text: `Você recebeu ${brl(tx.amount)}`, sub: tx.desc || tx.cat || '' });
  });
  return out.sort((a, b) => (b.at || Date.now()) - (a.at || Date.now())).slice(0, 40);
}

export const unseenNotifs = (state) => buildNotifs(state).filter((n) => !(state.notifSeen || {})[n.id]).length;

export default function NotifList({ onDep, onGo }) {
  const { state } = useStore();
  const list = buildNotifs(state);
  const seen = state.notifSeen || {};
  if (!list.length) {
    return (
      <View style={st.empty}>
        <Ionicons name="notifications-outline" size={28} color={colors.muted} />
        <Text style={st.emptyText}>Tudo em dia por aqui.{'\n'}Depoimentos, pedidos e chamados aparecem neste sininho.</Text>
      </View>
    );
  }
  return (
    <View>
      {list.map((n) => {
        const fresh = !seen[n.id];
        return (
          <TouchableOpacity
            key={n.id}
            style={st.row}
            activeOpacity={n.go ? 0.7 : 1}
            onPress={() => (n.go ? (n.go.dep ? onDep() : onGo(n.go)) : null)}
            accessibilityLabel={`${n.text}. ${n.sub || ''}`}
          >
            <View style={st.icon}>
              <Ionicons name={n.icon} size={17} color={colors.menu} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[st.text, fresh && { fontWeight: '800' }]} numberOfLines={2}>{n.text}</Text>
              {n.sub ? <Text style={st.sub} numberOfLines={1}>{n.sub}</Text> : null}
            </View>
            {fresh ? <View style={st.dot} /> : null}
            {n.go ? <Ionicons name="chevron-forward" size={15} color={colors.muted} style={{ marginLeft: 6 }} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 6 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: colors.muted, fontSize: 12.5, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
