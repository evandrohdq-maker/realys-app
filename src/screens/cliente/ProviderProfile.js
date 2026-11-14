import React, { useState } from 'react';
import { LiveNowBadge } from '../../components/LiveBits';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, soft } from '../../theme';
import { serviceType, priceText, useStore } from '../../store';
import { providerTarget } from '../../components/GiftSheet';
import { Photo } from '../../components/ui';
import { reviewsCount, jobsDone, kmText, ratingText, sampleReviews, etaMin } from '../../providerInfo';
import { brl } from '../../theme';
import { teamOf, teamMembers, TEAM_RULES } from '../../teams';
import { isVisitService, visitFee, visitDiscount, providerStats, isNewProvider, rankPosition } from '../../serviceVisits';

const TABS = [
  ['serv', 'Serviços e valores'],
  ['rev', 'Avaliações'],
  ['fotos', 'Fotos'],
];

// Perfil completo do prestador: o que faz, quanto cobra, avaliações e fotos.
export default function ProviderProfile({ provider: p, visible, onClose, onHire, onQuote, onMessage }) {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState('serv');
  const [fav, setFav] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const insets = useSafeAreaInsets();
  if (!p) return null;
  const type = serviceType(p.service) || { label: 'Prestador', ion: 'person-outline' };
  const team = teamOf(p);
  const byVisit = isVisitService(p.service);
  const st = providerStats(p);
  const rank = rankPosition(state.providers, p);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={[styles.cover, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={onClose} style={styles.roundBtn} accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFav(!fav)} style={styles.roundBtn} accessibilityLabel="Salvar nos favoritos">
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: -46 }}>
            <View style={styles.avatarWrap}>
              <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
            </View>
            <Text style={styles.name}>{p.name}</Text>
            <LiveNowBadge hostType="prestador" hostId={p.id} style={{ alignSelf: 'stretch', marginHorizontal: 16 }} />
            <Text style={styles.role}>
              {type.label}
              {p.vehicle ? ` · ${p.vehicle}` : ''}
            </Text>
            <View style={styles.badges}>
              <View style={[styles.pill, styles.pillOn]}>
                <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                <Text style={[styles.pillText, { color: colors.primary }]}>ID biométrico verificado</Text>
              </View>
              <View style={styles.pill}>
                <View style={styles.dot} />
                <Text style={styles.pillText}>
                  Disponível · {kmText(p.distanceKm)} · ~{etaMin(p)} min
                </Text>
              </View>
              {team ? (
                <TouchableOpacity style={[styles.pill, styles.pillOn]} onPress={() => setShowTeam(!showTeam)} accessibilityLabel={`Ver a equipe ${team.name}`}>
                  <Ionicons name="people" size={13} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.primary }]}>Equipe {team.name} · {team.members.length} MEIs</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {team && showTeam ? (
              <View style={styles.teamBox}>
                <Text style={styles.teamTitle}>Equipe {team.name}</Text>
                <Text style={styles.teamText}>{team.about} Juntos desde {team.since}.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  {teamMembers(team).map((m) => (
                    <View key={m.id} style={styles.teamMember}>
                      <Photo uri={m.photo} style={styles.teamAvatar} fallback="🧑" />
                      <Text style={styles.teamName} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                    </View>
                  ))}
                </View>
                {TEAM_RULES.slice(0, 2).map((r) => (
                  <Text key={r} style={styles.teamRule}>• {r}</Text>
                ))}
              </View>
            ) : null}

            <View style={styles.stats}>
              <Stat value={ratingText(p.rating)} label={`${reviewsCount(p)} avaliações`} color={colors.accent} />
              <Stat value={String(jobsDone(p))} label="serviços feitos" />
              <Stat value={`R$ ${p.price}`} label={`por ${p.priceUnit}`} />
            </View>

            {byVisit ? (
              <View style={styles.visitBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Taxa de visita</Text>
                  <Text style={styles.price}>{brl(visitFee(p))}</Text>
                </View>
                <Text style={styles.visitLine}>
                  {st.sponsored ? 'Patrocinado · ' : ''}
                  {rank.pos ? `#${rank.pos} de ${rank.total} em ${type.label.toLowerCase()} na região` : ''}
                  {isNewProvider(p) ? ' · Novo no Re@lys' : ''}
                </Text>
                <Text style={styles.visitLine}>
                  {st.done90} serviços nos últimos 90 dias · responde {st.responseRate}% dos pedidos em ~{st.responseMin} min
                </Text>
                {visitDiscount(p) ? <Text style={[styles.visitLine, { color: colors.success }]}>Desconta a taxa de visita do serviço se for contratado</Text> : null}
                <Text style={styles.visitLine}>Telefone liberado depois que a taxa de visita é paga. Antes disso, converse pelo chat do Re@lys.</Text>
              </View>
            ) : null}

            <View style={styles.tabs}>
              {TABS.map(([k, label]) => {
                const on = k === tab;
                return (
                  <TouchableOpacity key={k} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(k)}>
                    <Text style={[styles.tabText, on && { color: colors.onPrimary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tab === 'serv' ? (
              <View>
                {p.functions.map((f) => (
                  <View key={f} style={styles.item}>
                    <View style={styles.itemIcon}>
                      <Ionicons name={type.ion || 'flash-outline'} size={17} color={colors.primary} />
                    </View>
                    <Text style={styles.itemName}>{f}</Text>
                  </View>
                ))}
                <View style={[styles.item, { borderColor: colors.primary }]}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="pricetag-outline" size={17} color={colors.primary} />
                  </View>
                  <Text style={[styles.itemName, { flex: 1 }]}>Valor cobrado</Text>
                  <Text style={styles.price}>{priceText(p)}</Text>
                </View>
                <Text style={styles.note}>Valores informados pelo próprio prestador no cadastro do Re@lys.</Text>
              </View>
            ) : null}

            {tab === 'rev'
              ? sampleReviews(p).map((r) => (
                  <View key={r.who} style={styles.review}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{r.who}</Text>
                      <Text style={{ color: colors.accent }}>{'★'.repeat(r.stars) + '☆'.repeat(5 - r.stars)}</Text>
                    </View>
                    <Text style={{ color: colors.text, marginTop: 6, lineHeight: 19 }}>{r.text}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Cliente verificado</Text>
                  </View>
                ))
              : null}

            {tab === 'fotos' ? (
              <View style={styles.photos}>
                {p.functions.concat(['Antes e depois', 'Equipamento']).slice(0, 6).map((f, i) => (
                  <View key={f} style={styles.photoTile}>
                    <Photo uri={`https://picsum.photos/seed/${p.id}-${i}/300/300`} style={StyleSheet.absoluteFill} fallback="🛠️" />
                    <Text numberOfLines={1} style={styles.photoLabel}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]}>
          <TouchableOpacity style={styles.barIcon} onPress={() => onMessage(p)} accessibilityLabel="Enviar mensagem">
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.barIcon, { marginLeft: 8 }]} onPress={() => dispatch({ type: 'OPEN_GIFT', to: providerTarget(p) })} accessibilityLabel={`Presentear ${p.name}`}>
            <Ionicons name="gift-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.barBtn, styles.barGhost]} onPress={() => onQuote(p)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Orçamento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.barBtn, styles.barMain]} onPress={() => onHire(p)}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>
              {byVisit ? 'Pedir visita' : `Contratar ${p.name.split(' ')[0]}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ value, label, color = colors.text }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 150,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: { width: '100%', height: '100%' },
  name: { color: colors.text, fontSize: 23, fontWeight: '700', marginTop: 12 },
  role: { color: colors.muted, fontSize: 13, marginTop: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  teamBox: { borderWidth: 1, borderColor: 'rgba(168,121,10,0.35)', backgroundColor: 'rgba(168,121,10,0.05)', borderRadius: 14, padding: 12, marginTop: 4 },
  teamTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  teamText: { color: colors.muted, fontSize: 13, marginTop: 3 },
  teamMember: { width: 58, alignItems: 'center', marginRight: 6, marginBottom: 6 },
  teamAvatar: { width: 40, height: 40, borderRadius: 20 },
  teamName: { color: colors.text, fontSize: 11, marginTop: 3 },
  teamRule: { color: colors.muted, fontSize: 11, marginTop: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  pillOn: { borderColor: 'rgba(168,121,10,0.4)', backgroundColor: 'rgba(168,121,10,0.06)' },
  pillText: { color: colors.text, fontSize: 12, marginLeft: 6, fontWeight: '500' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  stats: { flexDirection: 'row', marginTop: 10, marginHorizontal: -4 },
  stat: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    ...soft,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
    padding: 4,
    backgroundColor: colors.card,
    borderRadius: 14,
    ...soft,
  },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    marginBottom: 8,
    ...soft,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(168,121,10,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  price: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  note: { color: colors.muted, fontSize: 11, marginTop: 4 },
  visitBox: { marginTop: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,121,10,0.4)', backgroundColor: 'rgba(168,121,10,0.06)' },
  visitLine: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  review: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    marginBottom: 8,
    ...soft,
  },
  photos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoTile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
    justifyContent: 'flex-end',
    backgroundColor: colors.card,
  },
  photoLabel: {
    color: colors.text,
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    margin: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  barBtn: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  barGhost: { flex: 1, borderWidth: 1, borderColor: 'rgba(168,121,10,0.55)', marginRight: 10 },
  barMain: { flex: 1.4, backgroundColor: colors.primary },
});
