import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useStore, buildServiceCall, callReply, serviceType, priceText, detectService } from '../../store';
import { SearchBar, GlobalResults } from '../../components/Search';
import { serviceTypes } from '../../data';
import { colors } from '../../theme';
import { Screen, Title, Card, Row, Input, Photo, Badge } from '../../components/ui';
import { etaMin, mapPos, kmText, ratingText, reviewsCount } from '../../providerInfo';
import ProviderProfile from './ProviderProfile';
import TrackingScreen from './TrackingScreen';
import { speakSoft } from '../../voice';

// Cartão do chamado (usado também pelo assistente de voz).
export function ServiceCallCard({ call }) {
  const p = call.provider;
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <Row style={{ marginBottom: 8 }}>
        <Ionicons name={(serviceType(call.serviceKey) || {}).ion || 'navigate'} size={16} color={colors.primary} />
        <Text style={{ fontWeight: '800', color: colors.primary, marginLeft: 6 }}>{call.status}</Text>
      </Row>
      <Row>
        <Photo uri={p.photo} style={styles.avatarSm} fallback="🧑" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>
            {p.name} · <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {ratingText(p.rating)}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {call.serviceLabel}
            {p.vehicle ? ` · ${p.vehicle}` : ''}
          </Text>
          {p.plate ? <Text style={{ fontWeight: '800', letterSpacing: 1, color: colors.text }}>Placa {p.plate}</Text> : null}
        </View>
      </Row>
      <Text style={{ color: colors.muted, marginTop: 10, fontSize: 13 }}>
        Chega em {call.eta} min · {priceText(p)} · acompanhe pelo GPS na aba Serviços
      </Text>
    </Card>
  );
}

const SORTS = [
  ['dist', 'Mais próximo'],
  ['rating', 'Melhor avaliado'],
  ['price', 'Menor preço'],
];

export default function ServicesScreen({ explore, navigate }) {
  const { state, dispatch } = useStore();
  const [address, setAddress] = useState('');
  const [selected, setSelected] = useState('eletricista');
  const [sort, setSort] = useState('dist');
  const [selId, setSelId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');
  const [found, setFound] = useState(null); // tipo de serviço achado pela pesquisa

  // Veio do menu ⋮ (ex.: Serviços gerais → Eletricista)
  useEffect(() => {
    if (explore && explore.service) setSelected(explore.service);
  }, [explore]);
  useEffect(() => setSelId(null), [selected]);

  const type = serviceType(selected);
  const byDist = [...state.providers].filter((p) => p.service === selected).sort((a, b) => a.distanceKm - b.distanceKm);
  const list = [...byDist];
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (sort === 'price') list.sort((a, b) => a.price - b.price);
  const nearestP = byDist[0];
  const bestId = [...byDist].sort((a, b) => b.rating - a.rating)[0]?.id;
  const cheapestId = [...byDist].sort((a, b) => a.price - b.price)[0]?.id;
  const num = {};
  byDist.forEach((p, i) => (num[p.id] = i + 1));
  const sel = byDist.find((p) => p.id === selId) || nearestP;
  const lastCall = state.rides.find((r) => r.provider && r.serviceKey && !r.done);
  const toRate = state.rides.find((r) => r.provider && r.serviceKey && r.done && !r.rated);

  const hire = (p) => {
    if (!p) return;
    const c = buildServiceCall(state, address.trim(), p.service);
    if (!c) return;
    c.provider = p;
    c.eta = etaMin(p);
    dispatch({ type: 'REQUEST_RIDE', ride: c });
    speakSoft(callReply(c));
    setProfile(null);
    setTracking(c);
  };
  const quote = (p) =>
    Alert.alert('Orçamento pedido', `${p.name} recebeu seu pedido. A proposta chega no chat do Realys.`);
  const message = (p) => Alert.alert('Mensagem', `Conversa com ${p.name.split(' ')[0]} aberta no chat do Realys.`);

  return (
    <Screen>
      <Title sub="Escolha quem você quer: veja nota, distância e preço de cada um">Serviços</Title>

      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Pesquisar: eletricista, hotel, Pedro…"
        voicePrompt="Que serviço você procura?"
        onSubmit={(text) => {
          setSearched(text);
          const key = text ? detectService(text) : null;
          setFound(key);
          if (key) setSelected(key);
        }}
      />
      {searched ? (
        <>
          {found ? (
            <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: 8 }}>
              Mostrando {serviceType(found).label.toLowerCase()} perto de você no mapa abaixo ↓
            </Text>
          ) : null}
          <GlobalResults query={searched} navigate={navigate} max={found ? 4 : 8} title={found ? 'Também no Realys' : 'Resultados da pesquisa'} hideEmpty={!!found} />
        </>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {serviceTypes.map((s) => {
          const on = s.key === selected;
          return (
            <TouchableOpacity key={s.key} onPress={() => setSelected(s.key)} style={[styles.typeChip, on && styles.typeChipOn]}>
              <Ionicons name={s.ion} size={18} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.typeText, on && { color: colors.onPrimary }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
        {/* Hotelaria faz parte da prestação de serviços */}
        <TouchableOpacity onPress={() => navigate && navigate({ tab: 'home', top: 'anuncios', kind: 'hotel' })} style={styles.typeChip}>
          <Ionicons name="bed-outline" size={18} color={colors.primary} />
          <Text style={styles.typeText}>Hotéis e pousadas</Text>
        </TouchableOpacity>
      </ScrollView>

      <Input placeholder="Endereço (opcional): Rua Augusta, 1200" value={address} onChangeText={setAddress} />

      {/* Mapa com os prestadores próximos */}
      <View style={styles.map}>
        {[...Array(14)].map((_, i) => (
          <View key={'v' + i} style={[styles.gridV, { left: `${i * 7.5}%` }]} />
        ))}
        {[...Array(8)].map((_, i) => (
          <View key={'h' + i} style={[styles.gridH, { top: `${i * 14}%` }]} />
        ))}
        <View style={[styles.road, { top: '46%', transform: [{ rotate: '-8deg' }] }]} />
        <View style={[styles.roadV, { left: '38%', transform: [{ rotate: '14deg' }] }]} />
        <View style={styles.me}>
          <View style={styles.meDot} />
        </View>
        {byDist.map((p) => {
          const pos = mapPos(p);
          const on = sel && p.id === sel.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setSelId(p.id)}
              accessibilityLabel={`Selecionar ${p.name}`}
              style={[
                styles.pin,
                { left: `${Math.min(92, Math.max(4, pos.left))}%`, top: `${Math.min(84, Math.max(6, pos.top))}%` },
                on && styles.pinOn,
              ]}
            >
              <Text style={[styles.pinText, on && { color: colors.onPrimary }]}>{num[p.id]}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={styles.mapLabel}>
          {byDist.length} {type.label.toLowerCase()}(s) com GPS ligado · você em roxo
        </Text>
      </View>

      {byDist.length ? (
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.quickBtn, styles.quickGhost]} onPress={() => hire(nearestP)}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>O mais próximo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, styles.quickMain]} onPress={() => hire(sel)}>
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }} numberOfLines={1}>
              Contratar {sel.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {toRate ? (
        <TouchableOpacity style={[styles.activeCall, { borderColor: colors.gold }]} onPress={() => dispatch({ type: 'OPEN_RATE', kind: 'servico', refId: toRate.id })} activeOpacity={0.85}>
          <Ionicons name="star" size={20} color={colors.gold} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>Avalie {toRate.provider.name.split(' ')[0]} · {toRate.serviceLabel}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Serviço concluído. Sua nota vale pontos Realys.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
      {lastCall ? (
        <TouchableOpacity style={styles.activeCall} onPress={() => setTracking(lastCall)} activeOpacity={0.85}>
          <Ionicons name="navigate-circle" size={26} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {lastCall.provider.name.split(' ')[0]} · {lastCall.serviceLabel}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Toque para acompanhar pelo GPS</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {SORTS.map(([k, label]) => {
          const on = k === sort;
          return (
            <TouchableOpacity key={k} onPress={() => setSort(k)} style={[styles.sort, on && styles.sortOn]}>
              <Text style={[styles.sortText, on && { color: colors.primary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!list.length ? (
        <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>
          Nenhum {type.label.toLowerCase()} disponível agora perto de você.
        </Text>
      ) : null}

      {list.map((p) => {
        const on = sel && p.id === sel.id;
        return (
          <TouchableOpacity key={p.id} activeOpacity={0.9} onPress={() => setSelId(p.id)} style={[styles.pCard, on && styles.pCardOn]}>
            <Row>
              <View style={[styles.num, on && { backgroundColor: colors.primary }]}>
                <Text style={[styles.numText, on && { color: colors.onPrimary }]}>{num[p.id]}</Text>
              </View>
              <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.pName}>{p.name}</Text>
                <Text style={styles.pMeta}>
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {ratingText(p.rating)}</Text> ({reviewsCount(p)}) · {kmText(p.distanceKm)} · ~{etaMin(p)} min
                </Text>
                <Text style={styles.pPrice}>{priceText(p)}</Text>
              </View>
            </Row>
            <View style={styles.badges}>
              {nearestP && p.id === nearestP.id ? <Badge label="Mais próximo" color={colors.primary} /> : null}
              {p.id === bestId ? <Badge label="Melhor avaliado" color={colors.accent} /> : null}
              {p.id === cheapestId && byDist.length > 1 ? <Badge label="Menor preço" color={colors.success} /> : null}
            </View>
            <Text style={styles.pFunc} numberOfLines={2}>
              {p.functions.join(' · ')}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.act, styles.actMain]} onPress={() => hire(p)}>
                <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 13 }}>Contratar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.act} onPress={() => quote(p)}>
                <Text style={styles.actText}>Orçamento</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.act, { marginRight: 0 }]} onPress={() => setProfile(p)}>
                <Text style={styles.actText}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(168,121,10,0.3)', marginTop: 6 }}>
        <Row>
          <Ionicons name="mic-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 13, marginLeft: 8, flex: 1 }}>
            Pela voz também funciona: "abrir Lotus, preciso de um eletricista na Rua Tamandaré".
          </Text>
        </Row>
      </Card>

      <ProviderProfile
        provider={profile}
        visible={!!profile}
        onClose={() => setProfile(null)}
        onHire={hire}
        onQuote={quote}
        onMessage={message}
      />
      <TrackingScreen call={tracking} visible={!!tracking} onClose={() => setTracking(null)} onOpenProfile={(p) => setProfile(p)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarSm: { width: 48, height: 48, borderRadius: 16 },
  avatar: { width: 48, height: 48, borderRadius: 15 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  typeChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.text, fontWeight: '600', fontSize: 13, marginLeft: 6 },
  map: {
    height: 200,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 12,
  },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(168,121,10,0.06)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(168,121,10,0.06)' },
  road: { position: 'absolute', left: -30, right: -30, height: 10, backgroundColor: '#F5EFE2' },
  roadV: { position: 'absolute', top: -30, bottom: -30, width: 10, backgroundColor: '#F5EFE2' },
  me: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(108,92,231,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6C5CE7', borderWidth: 2, borderColor: colors.bg },
  pin: {
    position: 'absolute',
    marginLeft: -15,
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: -19,
    marginTop: -19,
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  pinText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  mapLabel: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    color: colors.text,
    fontSize: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quickRow: { flexDirection: 'row', marginBottom: 12 },
  quickBtn: { flex: 1, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  quickGhost: { borderWidth: 1, borderColor: 'rgba(168,121,10,0.55)', marginRight: 10 },
  quickMain: { backgroundColor: colors.primary, paddingHorizontal: 10 },
  activeCall: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    marginBottom: 12,
  },
  sort: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    marginRight: 8,
  },
  sortOn: { borderColor: colors.primary, backgroundColor: 'rgba(168,121,10,0.12)' },
  sortText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  pCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  pCardOn: { borderColor: colors.primary, backgroundColor: '#FFFFFF' },
  num: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(168,121,10,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  numText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  pName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  pMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  pPrice: { color: colors.primary, fontWeight: '800', fontSize: 13, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  pFunc: { color: colors.muted, fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', marginTop: 10 },
  act: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EADFC8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  actText: { color: colors.text, fontWeight: '600', fontSize: 13 },
});
