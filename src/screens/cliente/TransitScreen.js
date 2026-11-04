import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Badge, Input, Button } from '../../components/ui';
import { SearchBar, GlobalResults } from '../../components/Search';
import { TRANSIT_SCOPES, transitCompanies, busStops, transitLines, trips, MY_SPOT } from '../../extraData';

const company = (id) => transitCompanies.find((c) => c.id === id) || {};
const line = (id) => transitLines.find((l) => l.id === id) || {};
const crowdColor = { Vazio: colors.success, 'Pouco cheio': colors.accent, Cheio: colors.danger };

// Transporte público: ônibus e metrô da cidade, linhas entre cidades e entre estados.
// Cada empresa liga o GPS da frota e o cliente vê onde o ônibus está.
export default function TransitScreen({ explore, navigate }) {
  const { state, dispatch } = useStore();
  const [scope, setScope] = useState('municipal');
  const [dest, setDest] = useState('');
  const [searched, setSearched] = useState('');
  const [tracking, setTracking] = useState(null); // { lineId, bus, min, stopName } ou { tripId }
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (explore && explore.scope) setScope(explore.scope);
  }, [explore]);

  const buy = (t) => {
    if (t.price > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para comprar a passagem.');
    const tk = { ...t, id: 'tk' + Date.now(), code: 'RLY-' + Math.floor(100000 + Math.random() * 899999), seat: t.seat || null };
    dispatch({ type: 'BUY_TICKET', ticket: tk });
    setTicket(tk);
  };

  if (ticket) return <TicketView t={ticket} onBack={() => setTicket(null)} onTrack={() => { setTicket(null); setTracking(ticket.track); }} />;
  if (tracking) return <TrackView tr={tracking} onBack={() => setTracking(null)} />;

  const nq = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchLines = searched
    ? transitLines.filter((l) => nq(l.code + ' ' + l.name + ' ' + l.stops.join(' ')).includes(nq(searched)))
    : [];
  const list = trips
    .filter((t) => t.scope === scope)
    .filter((t) => !dest.trim() || nq(t.to).includes(nq(dest.trim())));

  return (
    <Screen>
      <Title sub="Ônibus, metrô e viagens com o veículo acompanhado pelo GPS">Transporte público</Title>

      <View style={styles.gps}>
        <Ionicons name="locate" size={14} color={colors.accent} />
        <Text style={styles.gpsText} numberOfLines={1}>GPS ligado · {MY_SPOT}</Text>
      </View>

      <Row style={{ marginBottom: 14 }}>
        {TRANSIT_SCOPES.map((s) => {
          const on = s.key === scope;
          return (
            <TouchableOpacity key={s.key} onPress={() => { setScope(s.key); setDest(''); setSearched(''); }} style={[styles.scope, on && styles.scopeOn]}>
              <Ionicons name={s.icon} size={18} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.scopeText, on && { color: colors.onPrimary }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </Row>

      {state.tickets.length ? (
        <Card style={{ borderColor: colors.primary, borderWidth: 1 }}>
          <Text style={styles.name}>🎫 Suas passagens ({state.tickets.length})</Text>
          {state.tickets.slice(0, 3).map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setTicket(t)} style={styles.tkRow}>
              <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{t.title}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Abrir ›</Text>
            </TouchableOpacity>
          ))}
        </Card>
      ) : null}

      {scope === 'municipal' ? (
        <>
          <SearchBar value={dest} onChangeText={(t) => { setDest(t); if (!t) setSearched(''); }} onSubmit={setSearched} placeholder="Linha, bairro ou destino (ex.: Aeroporto)" voicePrompt="Para onde você quer ir?" />
          {searched ? (
            <>
              <Text style={styles.h2}>Linhas para "{searched}"</Text>
              {matchLines.length === 0 ? <Text style={[styles.sub, { marginBottom: 12 }]}>Nenhuma linha passa por esse lugar ainda.</Text> : null}
              {matchLines.map((l) => (
                <TouchableOpacity key={l.id} style={styles.arr} onPress={() => setTracking({ lineId: l.id, bus: 'próximo ônibus', min: 6, stopName: 'Paulista' })}>
                  <View style={styles.codeBox}>
                    <Text style={styles.code}>{l.code}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{l.name}</Text>
                    <Text style={styles.sub} numberOfLines={1}>Passa por: {l.stops.join(', ')}</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>GPS ›</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 12 }} />
            </>
          ) : null}
          <Text style={styles.h2}>Pontos perto de você</Text>
          {busStops.map((s) => (
            <Card key={s.id}>
              <Row>
                <Ionicons name="pin" size={18} color={colors.primary} />
                <Text style={[styles.name, { marginLeft: 6, flex: 1 }]}>{s.name}</Text>
                <Text style={styles.sub}>{s.distanceM} m a pé</Text>
              </Row>
              {s.arrivals.map((a, i) => {
                const l = line(a.lineId);
                const c = company(l.companyId);
                return (
                  <TouchableOpacity key={i} style={styles.arr} onPress={() => setTracking({ lineId: a.lineId, bus: a.bus, min: a.min, stopName: s.name })} activeOpacity={0.8}>
                    <View style={styles.codeBox}>
                      <Text style={styles.code}>{l.code}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{l.name}</Text>
                      <Text style={styles.sub}>
                        {c.logo} {c.name} · <Text style={{ color: crowdColor[a.crowd] }}>{a.crowd}</Text>
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.min}>{a.min} min</Text>
                      <Text style={styles.live}>● ao vivo</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          ))}

          <Text style={styles.h2}>Linhas</Text>
          {transitLines.map((l) => (
            <Card key={l.id}>
              <Row>
                <View style={styles.codeBox}>
                  <Text style={styles.code}>{l.code}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{l.name}</Text>
                  <Text style={styles.sub}>{company(l.companyId).name} · tarifa {brl(l.fare)}</Text>
                </View>
              </Row>
              <Row style={{ marginTop: 8 }}>
                {l.accessible ? <Badge label="♿ Acessível" color={colors.accent} /> : null}
                {l.ac ? <View style={{ marginLeft: 6 }}><Badge label="Ar-condicionado" color={colors.success} /></View> : null}
              </Row>
              <Row style={{ marginTop: 10 }}>
                <Button small title={`Pagar passagem ${brl(l.fare)}`} onPress={() => buy({ title: `${l.code} · ${l.name}`, price: l.fare, company: company(l.companyId).name, when: 'Válida por 3 h', track: { lineId: l.id, bus: 'próximo ônibus', min: 4, stopName: 'Paulista' } })} />
              </Row>
            </Card>
          ))}
        </>
      ) : (
        <>
          <SearchBar value={dest} onChangeText={(t) => { setDest(t); if (!t) setSearched(''); }} onSubmit={setSearched} placeholder="Para onde? (ex.: Campinas, Rio de Janeiro)" voicePrompt="Para onde você vai?" />
          <Text style={styles.h2}>Saindo de São Paulo - SP hoje</Text>
          {list.length === 0 ? <Text style={styles.sub}>Nenhuma viagem {scope === 'interestadual' ? 'entre estados' : 'entre cidades'} para esse destino hoje.</Text> : null}
          {searched && list.length === 0 ? <GlobalResults query={searched} navigate={navigate} hideEmpty title="Outras opções no Realys" /> : null}
          {list.map((t) => {
            const c = company(t.companyId);
            return (
              <Card key={t.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.name}>{c.logo} {c.name}</Text>
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {c.rating.toFixed(1).replace('.', ',')}</Text>
                </Row>
                <Row style={{ marginTop: 10, alignItems: 'center' }}>
                  <View>
                    <Text style={styles.time}>{t.depart}</Text>
                    <Text style={styles.sub}>{t.from.split(' - ')[0]}</Text>
                  </View>
                  <View style={styles.dash} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.time}>{t.arrive}</Text>
                    <Text style={styles.sub}>{t.to.split(' - ')[0]}</Text>
                  </View>
                </Row>
                <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
                  <Text style={styles.sub}>{t.kind} · {t.seatsLeft} poltronas livres · GPS da frota</Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>{brl(t.price)}</Text>
                </Row>
                <Row style={{ marginTop: 10 }}>
                  <Button
                    small
                    title="Comprar passagem"
                    onPress={() =>
                      buy({ title: `${t.from.split(' - ')[0]} → ${t.to.split(' - ')[0]} · ${t.depart}`, price: t.price, company: c.name, when: `Hoje, embarque ${t.depart}`, seat: String(10 + Math.floor(Math.random() * 30)), track: { tripId: t.id } })
                    }
                  />
                  <View style={{ width: 8 }} />
                  <Button small variant="outline" title="Ver ônibus no GPS" onPress={() => setTracking({ tripId: t.id })} />
                </Row>
              </Card>
            );
          })}
        </>
      )}

      <Card style={{ backgroundColor: colors.cardAlt }}>
        <Text style={styles.name}>🚌 É empresa de transporte?</Text>
        <Text style={[styles.sub, { marginTop: 4 }]}>
          Municipal, intermunicipal ou interestadual: cadastre suas linhas e horários com o CNPJ, ligue o GPS da frota e venda passagens pelo Realys.
        </Text>
      </Card>
    </Screen>
  );
}

// Acompanhar o ônibus pelo GPS: a posição avança sozinha enquanto a tela está aberta.
function TrackView({ tr, onBack }) {
  const isTrip = !!tr.tripId;
  const t = isTrip ? trips.find((x) => x.id === tr.tripId) : null;
  const l = isTrip ? null : line(tr.lineId);
  const stops = isTrip ? [t.from.split(' - ')[0], 'Rodoviária', 'Posto de parada', t.to.split(' - ')[0]] : l.stops;
  const myIdx = isTrip ? 0 : Math.max(0, stops.findIndex((s) => tr.stopName.includes(s) || s === 'Paulista' || s === 'Consolação'));
  const [left, setLeft] = useState(isTrip ? 12 : tr.min);
  useEffect(() => {
    const id = setInterval(() => setLeft((m) => Math.max(0, m - 1)), 4000);
    return () => clearInterval(id);
  }, []);
  // Ônibus vem das paradas anteriores até a parada do cliente.
  const total = isTrip ? 12 : Math.max(tr.min, 1);
  const progress = 1 - left / total;
  const busAt = Math.max(0, myIdx - 1) + progress * (myIdx > 0 ? 1 : 0.0001);

  return (
    <Screen>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Transporte público</Text>
      </TouchableOpacity>
      <Text style={styles.h1}>{isTrip ? `${t.from.split(' - ')[0]} → ${t.to.split(' - ')[0]}` : `${l.code} · ${l.name}`}</Text>
      <Text style={styles.sub}>{isTrip ? company(t.companyId).name : `${company(l.companyId).name} · veículo ${tr.bus}`}</Text>

      <Card style={{ marginTop: 12, borderColor: colors.accent, borderWidth: 1.5 }}>
        <Row>
          <Ionicons name="bus" size={22} color={colors.accent} />
          <Text style={{ marginLeft: 8, fontWeight: '800', color: colors.text, fontSize: 16, flex: 1 }}>
            {left > 0 ? `Chega ${isTrip ? 'na plataforma' : 'no seu ponto'} em ${left} min` : 'O ônibus chegou! 🚏'}
          </Text>
        </Row>
        <Text style={[styles.live, { marginTop: 6 }]}>● Posição ao vivo pelo GPS do ônibus</Text>
      </Card>

      <View style={{ marginTop: 6 }}>
        {stops.map((s, i) => {
          const passed = i < busAt;
          const here = Math.floor(busAt) === i && left > 0;
          return (
            <View key={s + i} style={styles.stopRow}>
              <View style={styles.rail}>
                <View style={[styles.railLine, i === 0 && { top: '50%' }, i === stops.length - 1 && { bottom: '50%' }, passed && { backgroundColor: colors.accent }]} />
                <View style={[styles.dot, passed && { backgroundColor: colors.accent, borderColor: colors.accent }, i === myIdx && styles.dotMe]} />
              </View>
              <Text style={[styles.stopName, i === myIdx && { color: colors.primary, fontWeight: '800' }]}>
                {s}
                {i === myIdx ? '  · você está aqui' : ''}
              </Text>
              {here ? (
                <View style={styles.busTag}>
                  <Ionicons name="bus" size={13} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function TicketView({ t, onBack, onTrack }) {
  return (
    <Screen>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Transporte público</Text>
      </TouchableOpacity>
      <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={styles.kicker}>PASSAGEM REALYS</Text>
        <Text style={[styles.h1, { textAlign: 'center' }]}>{t.title}</Text>
        <Text style={styles.sub}>{t.company} · {t.when}</Text>
        {t.seat ? <Text style={[styles.name, { marginTop: 6 }]}>Poltrona {t.seat}</Text> : null}
        <View style={styles.qr}>
          {[...Array(49)].map((_, i) => (
            <View key={i} style={[styles.qrCell, ((i * 7 + (t.code.charCodeAt(i % t.code.length) || 0)) % 3 === 0 || [0, 6, 42, 48, 24].includes(i)) && { backgroundColor: colors.text }]} />
          ))}
        </View>
        <Text style={styles.code2}>{t.code}</Text>
        <Text style={[styles.sub, { textAlign: 'center' }]}>Mostre este código na catraca ou ao motorista. Pago com saldo Realys: {brl(t.price)}</Text>
      </Card>
      {t.track ? <Button title="Acompanhar ônibus pelo GPS" onPress={onTrack} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gps: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(47,116,208,0.08)', marginBottom: 12 },
  gpsText: { color: colors.accent, fontWeight: '600', fontSize: 12, marginLeft: 6, flex: 1 },
  scope: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', marginHorizontal: 3 },
  scopeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  scopeText: { fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 4 },
  h1: { fontSize: 20, fontWeight: '800', color: colors.text },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8, marginTop: 4 },
  name: { fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  arr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  codeBox: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  code: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  min: { fontWeight: '900', color: colors.text, fontSize: 16 },
  live: { color: colors.success, fontSize: 11, fontWeight: '700' },
  time: { fontSize: 20, fontWeight: '900', color: colors.text },
  dash: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 12 },
  tkRow: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  back: { color: colors.primary, fontWeight: '700', marginBottom: 10 },
  stopRow: { flexDirection: 'row', alignItems: 'center', height: 54 },
  rail: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 4, backgroundColor: colors.border, borderRadius: 2 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: colors.border },
  dotMe: { width: 20, height: 20, borderRadius: 10, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  stopName: { marginLeft: 10, color: colors.text, flex: 1 },
  busTag: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  qr: { width: 154, height: 154, flexDirection: 'row', flexWrap: 'wrap', marginVertical: 14, padding: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  qrCell: { width: 20, height: 20 },
  code2: { fontWeight: '900', letterSpacing: 2, color: colors.text, fontSize: 16, marginBottom: 6 },
});
