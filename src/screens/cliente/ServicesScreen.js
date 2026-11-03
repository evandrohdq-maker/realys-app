import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { useStore, buildServiceCall, callReply, serviceType, priceText } from '../../store';
import { serviceTypes } from '../../data';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, Photo, Badge, Section } from '../../components/ui';

// Cartão do chamado: serve para corrida, entrega, eletricista, mecânico, qualquer serviço.
export function ServiceCallCard({ call }) {
  const p = call.provider;
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <Text style={{ fontWeight: '800', color: colors.primaryDark, marginBottom: 8 }}>
        {call.icon} {call.status}
      </Text>
      <Row>
        <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontWeight: '700' }}>
            {p.name} · ⭐ {p.rating}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {call.serviceLabel}
            {p.vehicle ? ` · ${p.vehicle}` : ''}
          </Text>
          {p.plate ? <Text style={{ fontWeight: '800', letterSpacing: 1 }}>Placa {p.plate}</Text> : null}
        </View>
      </Row>
      <View style={styles.map}>
        <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>📍 {call.from}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          Chega em {call.eta} min · {priceText(p)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: '35%' }]} />
          <Text style={styles.moving}>{call.icon}</Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.muted }}>Acompanhe em tempo real até chegar até você</Text>
      </View>
    </Card>
  );
}

export default function ServicesScreen() {
  const { state, dispatch } = useStore();
  const [address, setAddress] = useState('');
  const [selected, setSelected] = useState('motorista');

  const type = serviceType(selected);
  const list = [...state.providers]
    .filter((p) => p.service === selected)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const groups = [...new Set(serviceTypes.map((s) => s.group))];
  const lastCall = state.rides.find((r) => r.provider);

  const call = (serviceKey, providerId) => {
    const c = buildServiceCall(state, address.trim(), serviceKey);
    if (!c) return;
    if (providerId) c.provider = state.providers.find((p) => p.id === providerId);
    dispatch({ type: 'REQUEST_RIDE', ride: c });
    Speech.stop();
    Speech.speak(callReply(c), { language: 'pt-BR' });
  };

  return (
    <Screen>
      <Title sub="Qualquer prestador perto de você, com nota e acompanhamento">Serviços</Title>

      {groups.map((g) => (
        <View key={g} style={{ marginBottom: 6 }}>
          <Text style={styles.group}>{g}</Text>
          <View style={styles.grid}>
            {serviceTypes
              .filter((s) => s.group === g)
              .map((s) => {
                const on = s.key === selected;
                return (
                  <TouchableOpacity key={s.key} onPress={() => setSelected(s.key)} style={[styles.tile, on && styles.tileOn]}>
                    <Text style={{ fontSize: 26 }}>{s.icon}</Text>
                    <Text numberOfLines={2} style={[styles.tileText, on && { color: '#fff' }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      ))}

      <Card>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>
          {type.icon} Onde você precisa de {type.label.toLowerCase()}?
        </Text>
        <Input placeholder="Ex.: Rua Augusta, 1200" value={address} onChangeText={setAddress} />
        <Button title={`Chamar o ${type.label.toLowerCase()} mais próximo`} onPress={() => call(selected)} />
      </Card>

      {lastCall ? <ServiceCallCard call={lastCall} /> : null}

      <Section title={`${type.label}: mais próximos de você`}>
        {list.map((p) => (
          <Card key={p.id}>
            <Row>
              <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  ⭐ {p.rating} · {p.distanceKm.toFixed(1)} km
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>{priceText(p)}</Text>
                <Text style={{ color: colors.text, fontSize: 12, marginTop: 2 }}>{p.functions.join(' · ')}</Text>
                <View style={{ marginTop: 4 }}>
                  <Badge label="🟢 Disponível · GPS ligado" color={colors.success} />
                </View>
              </View>
              <Button small title="Chamar" variant="light" onPress={() => call(selected, p.id)} />
            </Row>
          </Card>
        ))}
      </Section>

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13 }}>
          🎙️ Pelo assistente de voz também funciona: "Realys, preciso de um eletricista na Rua Tamandaré" ou "Realys, meu
          carro quebrou, chama um mecânico".
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 54, height: 54, borderRadius: 27 },
  group: { fontWeight: '800', color: colors.muted, fontSize: 12, textTransform: 'uppercase', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    width: '23%',
    marginRight: '2%',
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tileOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tileText: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 4 },
  map: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12, marginTop: 12 },
  track: { height: 8, backgroundColor: '#fff', borderRadius: 4, marginVertical: 12, justifyContent: 'center' },
  trackFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  moving: { position: 'absolute', left: '32%', top: -10, fontSize: 18 },
});
