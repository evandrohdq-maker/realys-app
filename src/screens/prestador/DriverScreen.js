import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, Alert } from 'react-native';
import { useStore, priceText, serviceType } from '../../store';
import { serviceTypes } from '../../data';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Stat, Section, Empty, Badge, Input, Chip } from '../../components/ui';

const UNITS = ['hora', 'serviço', 'diária (8h)', 'm²', 'visita', 'corrida + R$ 2,50/km'];

export default function DriverScreen() {
  const { state, dispatch } = useStore();
  const me = state.myProvider;
  const [editing, setEditing] = useState(!me);
  const [service, setService] = useState(me ? me.service : 'eletricista');
  const [functions, setFunctions] = useState(me ? me.functions.join(', ') : '');
  const [price, setPrice] = useState(me ? String(me.price) : '');
  const [unit, setUnit] = useState(me ? me.priceUnit : 'hora');

  const accepted = state.rides.filter((r) => !r.provider);
  const earnings = accepted.reduce((s, r) => s + r.price, 0);

  const save = () => {
    const v = parseFloat(price.replace(',', '.'));
    const list = functions
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    if (!list.length || isNaN(v)) return Alert.alert('Informe o que você faz e quanto cobra.');
    dispatch({ type: 'SAVE_MY_PROVIDER', profile: { service, functions: list, price: v, priceUnit: unit } });
    setEditing(false);
    Alert.alert(
      'Cadastro salvo ✅',
      state.available
        ? 'Você já aparece para os clientes e para a pesquisa por voz da Lotus.'
        : 'Fique disponível (GPS ligado) para aparecer para os clientes e na pesquisa por voz da Lotus.'
    );
  };

  return (
    <Screen>
      <Title sub="Motorista, motoboy, eletricista, mecânico, diarista e qualquer MEI">Painel do prestador</Title>

      <Card style={{ backgroundColor: state.available ? colors.primaryLight : colors.card }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
              {state.available ? '🟢 Disponível (GPS ligado)' : '⚪ Indisponível'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              Ligue para aparecer para clientes e empresas perto de você
            </Text>
          </View>
          <Switch value={state.available} onValueChange={() => dispatch({ type: 'TOGGLE_AVAILABLE' })} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>

      <Section
        title="Meu cadastro profissional"
        right={me && !editing ? <Button small variant="light" title="Editar" onPress={() => setEditing(true)} /> : null}
      >
        {editing ? (
          <Card>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>
              Essas informações são o que a Lotus responde quando um cliente pergunta por voz: "tem eletricista perto
              de mim?".
            </Text>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Tipo de serviço</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {serviceTypes.map((s) => (
                <Chip key={s.key} label={`${s.icon} ${s.label}`} active={service === s.key} onPress={() => setService(s.key)} />
              ))}
            </ScrollView>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>O que você faz (separe por vírgula)</Text>
            <Input
              placeholder="Ex.: Instalação de chuveiro, tomadas, quadro de luz"
              value={functions}
              onChangeText={setFunctions}
              multiline
            />
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Quanto você cobra</Text>
            <Input placeholder="Valor em R$" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
            <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
              {UNITS.map((u) => (
                <View key={u} style={{ marginBottom: 8 }}>
                  <Chip label={`por ${u}`} active={unit === u} onPress={() => setUnit(u)} />
                </View>
              ))}
            </Row>
            <Button title="Salvar cadastro" onPress={save} />
          </Card>
        ) : (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
              {serviceType(me.service).icon} {serviceType(me.service).label}
            </Text>
            <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 4 }}>{priceText(me)}</Text>
            <Text style={{ color: colors.text, marginTop: 6 }}>{me.functions.join(' · ')}</Text>
            <View style={{ marginTop: 8 }}>
              {state.available ? (
                <Badge label="Visível para clientes e na pesquisa por voz" color={colors.success} />
              ) : (
                <Badge label="Fique disponível para aparecer" color={colors.accent} />
              )}
            </View>
          </Card>
        )}
      </Section>

      <Row style={{ marginHorizontal: -4, marginBottom: 14 }}>
        <Stat label="Ganhos hoje" value={brl(86.4 + earnings)} color={colors.success} />
        <Stat label="Avaliação" value="★ 4,9" color={colors.accent} />
        <Stat label="Serviços" value={String(7 + accepted.length)} />
      </Row>

      <Section title="Pedidos perto de você">
        {!state.available ? <Empty text="Fique disponível para receber pedidos." /> : null}
        {state.available && !state.rideRequests.length ? <Empty text="Sem novos pedidos agora." /> : null}
        {state.available &&
          state.rideRequests.map((r) => (
            <Card key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{r.client}</Text>
                <Badge label={r.service} color={colors.sponsored} />
              </Row>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                📍 {r.from}
                {r.to ? ` → ${r.to}` : ''}
              </Text>
              <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontWeight: '800', color: colors.primary }}>
                  {brl(r.price)} · {r.distanceKm} km
                </Text>
                <Button small title="Aceitar" onPress={() => dispatch({ type: 'ACCEPT_RIDE_REQUEST', id: r.id })} />
              </Row>
            </Card>
          ))}
      </Section>

      <Section title="Em andamento">
        {accepted.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{r.client}</Text>
              <Badge label={r.status} color={colors.accent} />
            </Row>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              {r.service} · {r.from}
              {r.to ? ` → ${r.to}` : ''}
            </Text>
          </Card>
        ))}
        {!accepted.length ? <Empty text="Nenhum serviço em andamento." /> : null}
      </Section>
    </Screen>
  );
}
