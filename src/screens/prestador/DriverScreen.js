import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, priceText, serviceType } from '../../store';
import { serviceTypes } from '../../data';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Stat, Section, Empty, Badge, Input, Chip } from '../../components/ui';
import {
  isVisitService,
  visitFee,
  splitFee,
  providerStats,
  rankPosition,
  REALYS_FEE_PCT,
  HIGHLIGHT_PLAN,
  NEW_BOOST_DAYS,
  RANK_DAYS,
  VISIT_STATUS,
} from '../../serviceVisits';

const UNITS = ['hora', 'serviço', 'diária (8h)', 'm²', 'visita', 'corrida + R$ 2,50/km'];

export default function DriverScreen() {
  const { state, dispatch } = useStore();
  const me = state.myProvider;
  const [editing, setEditing] = useState(!me);
  const [service, setService] = useState(me ? me.service : 'eletricista');
  const [functions, setFunctions] = useState(me ? me.functions.join(', ') : '');
  const [price, setPrice] = useState(me ? String(me.price) : '');
  const [unit, setUnit] = useState(me ? me.priceUnit : 'hora');
  const [fee, setFee] = useState(me && me.visitFee != null ? String(me.visitFee) : '');
  const [discount, setDiscount] = useState(me ? !!me.visitDiscount : true);
  const byVisit = isVisitService(service);

  const accepted = state.rides.filter((r) => !r.provider);
  const earnings = accepted.reduce((s, r) => s + r.price, 0);

  const save = () => {
    const v = parseFloat(price.replace(',', '.'));
    const list = functions
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    if (!list.length || isNaN(v)) return Alert.alert('Informe o que você faz e quanto cobra.');
    const f = parseFloat(fee.replace(',', '.'));
    if (byVisit && (isNaN(f) || f <= 0)) return Alert.alert('Informe a taxa de visita', 'É o valor que o cliente paga para você ir até ele avaliar o serviço.');
    dispatch({
      type: 'SAVE_MY_PROVIDER',
      profile: { service, functions: list, price: v, priceUnit: unit, ...(byVisit ? { visitFee: f, visitDiscount: discount } : {}) },
    });
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
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
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
            {byVisit ? (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Taxa de visita</Text>
                <Input placeholder="Valor em R$ (ex.: 60)" keyboardType="decimal-pad" value={fee} onChangeText={setFee} />
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: -4, marginBottom: 10 }}>
                  O cliente paga pelo Realys e o valor fica retido até ele confirmar a visita. Você recebe{' '}
                  {100 - REALYS_FEE_PCT}% e o Realys fica com {REALYS_FEE_PCT}%. O valor do serviço vocês combinam direto, sem taxa.
                </Text>
                <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: colors.text, flex: 1, marginRight: 10 }}>Descontar a taxa de visita do serviço se eu for contratado</Text>
                  <Switch value={discount} onValueChange={setDiscount} trackColor={{ true: colors.primary }} />
                </Row>
              </>
            ) : null}
            <Button title="Salvar cadastro" onPress={save} />
          </Card>
        ) : (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
              {serviceType(me.service).icon} {serviceType(me.service).label}
            </Text>
            <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>{priceText(me)}</Text>
            <Text style={{ color: colors.text, marginTop: 6 }}>{me.functions.join(' · ')}</Text>
            {isVisitService(me.service) ? (
              <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
                Taxa de visita {brl(visitFee(me))}
                {me.visitDiscount ? ' · descontada se você for contratado' : ''}
              </Text>
            ) : null}
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

      {me && isVisitService(me.service) ? <VisitPanel /> : null}

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
                <Text style={{ fontWeight: '700', color: colors.primary }}>
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

// Serviços por visita: pedidos que chegam, visitas aceitas, avaliação do cliente, ranking e plano de destaque.
function VisitPanel() {
  const { state, dispatch } = useStore();
  const me = state.myProvider;
  const st = providerStats(me);
  const rank = rankPosition(state.providers, me);
  const fee = visitFee(me);
  const split = splitFee(fee);
  const boostLeft = Math.max(0, NEW_BOOST_DAYS - st.joinedDays);

  const subscribe = () => {
    if (st.sponsored) {
      return Alert.alert('Cancelar o destaque?', 'Você volta a aparecer só pelo ranking por mérito.', [
        { text: 'Manter', style: 'cancel' },
        { text: 'Cancelar plano', style: 'destructive', onPress: () => dispatch({ type: 'SET_HIGHLIGHT', on: false }) },
      ]);
    }
    if (state.wallet < HIGHLIGHT_PLAN.price) return Alert.alert('Saldo insuficiente', `O plano custa ${brl(HIGHLIGHT_PLAN.price)} por mês.`);
    dispatch({ type: 'SET_HIGHLIGHT', on: true });
    Alert.alert('Destaque ativado ⭐', 'Você aparece no topo da sua categoria com a marca "Patrocinado", separado do ranking por mérito.');
  };

  return (
    <>
      <Section title="Seu ranking">
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
            {state.available && rank.pos ? `#${rank.pos} de ${rank.total} na sua categoria e região` : 'Fique disponível para entrar no ranking'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
            {st.done90} serviços finalizados nos últimos {RANK_DAYS} dias · responde {st.responseRate}% · ~{st.responseMin} min
            {st.noShows ? ` · ${st.noShows} falta(s)` : ''}
          </Text>
          {boostLeft > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Badge label={`Impulso de novato: mais ${boostLeft} dias de visibilidade extra`} color={colors.violet} />
            </View>
          ) : null}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 }}>
            Sobe quem finaliza serviços com nota alta e responde rápido. Recusar um pedido não tira pontos. Faltar numa visita aceita tira.
          </Text>
        </Card>
      </Section>

      <Section title="Pedidos de visita">
        {!state.available ? <Empty text="Fique disponível para receber pedidos de visita." /> : null}
        {state.available && !state.visitRequests.length ? <Empty text="Sem novos pedidos de visita agora." /> : null}
        {state.available &&
          state.visitRequests.map((r) => (
            <Card key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
                  {r.client} <Text style={{ color: colors.accent }}>★ {String(r.clientRating).replace('.', ',')}</Text>
                </Text>
                <Badge label={r.when} color={colors.sponsored} />
              </Row>
              <Text style={{ color: colors.text, marginTop: 4 }}>{r.problem}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                📍 {r.address} · {String(r.distanceKm).replace('.', ',')} km
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
                Taxa paga e retida: {brl(fee)} · você recebe {brl(split.provider)} depois da visita
              </Text>
              <Row style={{ marginTop: 10 }}>
                <Button small title="Aceitar" style={{ flex: 1, marginRight: 8 }} onPress={() => dispatch({ type: 'PROVIDER_VISIT_RESPOND', id: r.id, accept: true })} />
                <Button
                  small
                  variant="dark"
                  title="Recusar"
                  style={{ flex: 1 }}
                  onPress={() => {
                    dispatch({ type: 'PROVIDER_VISIT_RESPOND', id: r.id, accept: false });
                    Alert.alert('Pedido recusado', 'O cliente recebe a taxa de volta. Recusar não tira pontos do seu ranking.');
                  }}
                />
              </Row>
            </Card>
          ))}
      </Section>

      {state.myVisits.length ? (
        <Section title="Minhas visitas">
          {state.myVisits.map((v) => (
            <MyVisit key={v.id} v={v} />
          ))}
        </Section>
      ) : null}

      <Section title="Plano de destaque">
        <Card style={st.sponsored ? { borderColor: colors.sponsored, borderWidth: 1.5 } : null}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{HIGHLIGHT_PLAN.name}</Text>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{brl(HIGHLIGHT_PLAN.price)}/mês</Text>
          </Row>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
            Apareça no topo das buscas da sua categoria, com selo e perfil completo. Você aparece como "Patrocinado", separado de quem está no topo
            por mérito.
          </Text>
          <Button
            small
            variant={st.sponsored ? 'outline' : 'primary'}
            title={st.sponsored ? 'Plano ativo · cancelar' : 'Assinar destaque'}
            style={{ marginTop: 10 }}
            onPress={subscribe}
          />
        </Card>
      </Section>
    </>
  );
}

function MyVisit({ v }) {
  const { dispatch } = useStore();
  const st = VISIT_STATUS[v.status] || VISIT_STATUS.aceita;
  const [stars, setStars] = useState(0);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{v.client}</Text>
        <Badge label={st.label} color={st.color} />
      </Row>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
        {v.problem} · {v.address} · {v.when}
      </Text>
      {v.status === 'aceita' ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            Telefone do cliente liberado. Depois da visita, o cliente confirma e {brl(v.split.provider)} cai na sua carteira.
          </Text>
          <Text style={{ color: colors.sponsored, fontSize: 11, fontWeight: '700', marginTop: 8 }}>Demonstração: simule a confirmação do cliente</Text>
          <Button small title="Cliente confirmou a visita" style={{ marginTop: 6 }} onPress={() => dispatch({ type: 'PROVIDER_VISIT_CONFIRMED', id: v.id, client: v.client })} />
        </>
      ) : null}
      {v.status === 'confirmada' ? (
        <>
          <Text style={{ color: colors.success, fontSize: 12, marginTop: 6 }}>
            {brl(v.split.provider)} liberado na sua carteira. Agora combine o valor do serviço direto com o cliente.
          </Text>
          <Button small title="Serviço concluído" style={{ marginTop: 8 }} onPress={() => dispatch({ type: 'PROVIDER_VISIT_DONE', id: v.id })} />
        </>
      ) : null}
      {v.status === 'concluida' && !v.clientStars ? (
        <>
          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 8 }}>Avalie o cliente</Text>
          <Row style={{ marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setStars(i)} style={{ paddingRight: 6 }} accessibilityLabel={`${i} estrelas`}>
                <Ionicons name={stars >= i ? 'star' : 'star-outline'} size={28} color={colors.gold} />
              </TouchableOpacity>
            ))}
            <Button
              small
              title="Enviar"
              disabled={!stars}
              style={{ marginLeft: 'auto' }}
              onPress={() => dispatch({ type: 'PROVIDER_RATE_CLIENT', id: v.id, stars })}
            />
          </Row>
        </>
      ) : null}
      {v.clientStars ? (
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
          Você avaliou o cliente: {'★'.repeat(v.clientStars)}
          {'☆'.repeat(5 - v.clientStars)}. Isso ajuda outros prestadores a evitar calote e falta.
        </Text>
      ) : null}
    </Card>
  );
}
