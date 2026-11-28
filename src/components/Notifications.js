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
import { wantsNotify, favLiveAlerts, streamerKey, useFavs } from '../favorites';
import { lives as demoLives } from '../homeData';

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
  // Streamers favoritos com o sininho ligado: avisa quando entram ao vivo.
  const seenLive = {};
  favLiveAlerts().forEach((l) => {
    seenLive[streamerKey(l)] = true;
    out.push({ id: 'favlive-' + l.id, at: l.at, icon: 'radio-outline', text: `${l.host} está ao vivo agora 🔴`, sub: l.title || 'Toque para assistir', go: { live: l } });
  });
  demoLives.forEach((l) => {
    if (l.mine || seenLive[streamerKey(l)] || !wantsNotify(l)) return;
    seenLive[streamerKey(l)] = true;
    out.push({ id: 'favlive-' + l.id, icon: 'radio-outline', text: `${l.host} está ao vivo agora 🔴`, sub: l.title || 'Toque para assistir', go: { watch: l.id } });
  });
  return out.sort((a, b) => (b.at || Date.now()) - (a.at || Date.now())).slice(0, 40);
}

// Separação por dia, como no Instagram: Hoje, Ontem, Esta semana e Anteriores (sem data = agora).
const inicioDoDia = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export function grupoDaNotif(n, agora = Date.now()) {
  const hoje = inicioDoDia(agora);
  const at = n.at || agora;
  if (at >= hoje) return 'Hoje';
  if (at >= hoje - DAY) return 'Ontem';
  if (at >= hoje - 6 * DAY) return 'Esta semana';
  return 'Anteriores';
}

export const unseenNotifs = (state) => buildNotifs(state).filter((n) => !(state.notifSeen || {})[n.id]).length;

export default function NotifList({ onDep, onGo }) {
  const { state, dispatch } = useStore();
  useFavs();
  const go = (g) => (g.dep ? onDep() : g.live ? dispatch({ type: 'LIVE_OPEN', live: g.live }) : g.watch ? dispatch({ type: 'WATCH_LIVE', id: g.watch }) : onGo(g));
  const list = buildNotifs(state);
  const seen = state.notifSeen || {};
  if (!list.length) {
    return (
      <View style={st.empty}>
        <Ionicons name="notifications-outline" size={28} color={colors.muted} />
        <Text style={st.emptyText}>Tudo em dia por aqui.{'\n'}Depoimentos, pedidos, chamados e as lives dos seus streamers favoritos aparecem neste sininho.</Text>
      </View>
    );
  }
  return (
    <View>
      {list.map((n, i) => {
        const fresh = !seen[n.id];
        const grupo = grupoDaNotif(n);
        const titulo = i === 0 || grupoDaNotif(list[i - 1]) !== grupo ? <Text style={st.grupo}>{grupo}</Text> : null;
        return (
          <React.Fragment key={n.id}>
          {titulo}
          <TouchableOpacity
            style={st.row}
            activeOpacity={n.go ? 0.7 : 1}
            onPress={() => (n.go ? go(n.go) : null)}
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
          </React.Fragment>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  grupo: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 14, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 6 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: colors.muted, fontSize: 12.5, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
