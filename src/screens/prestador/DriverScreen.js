import React, { useState } from 'react';
import { UnmetServices, OpenRequests } from '../../components/Engage';
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

import ProfessionPicker from '../../components/ProfessionPicker';
import PrestacaoScreen from './PrestacaoScreen';
import { BoostButton } from '../../components/Boost';
import { CAR_FEATURES, featuresOf, featureIcon, featureLabel } from '../../vehicleInfo';
import { buildAgenda, nextJob, agendaStats, dayLabel, hhmm, untilText } from '../../agenda';
import { panicConfig, savePanic, onPanicChange, phraseOk, PANIC_EXAMPLES } from '../../panic';
import { askCallPermission } from '../../phone';
import { isTransport, isWaiting, WaitCountdown, NO_SHOW_MIN } from '../../rideRules';
import { checkFair, priceRef, refText, fareQuote, driverEarnings, TARIFFS, RIDE_FEE_PCT, SURGE_MAX } from '../../pricing';

// Tarifa do Realys para motorista e motoboy: quanto o cliente paga e quanto fica com o prestador.
function RideEarnings({ service }) {
  const t = TARIFFS[service];
  if (!t) return null;
  const now = fareQuote(service, 5);
  const peak = fareQuote(service, 5, { at: (() => { const d = new Date(); d.setHours(18, 0, 0, 0); if (d.getDay() === 0) d.setDate(d.getDate() + 1); if (d.getDay() === 6) d.setDate(d.getDate() + 2); return d; })() });
  const e1 = driverEarnings(now, service === 'motoboy' ? { kmPerLiter: 35 } : {});
  const e2 = driverEarnings(peak, service === 'motoboy' ? { kmPerLiter: 35 } : {});
  const line = (label, q, e) => (
    <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{brl(q.total)} → você {brl(q.driverGets)}</Text>
    </Row>
  );
  return (
    <Card>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Tarifa Realys ({t.label})</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
        Igual para todos: {brl(t.base)} de saída{t.kmFree ? ` (até ${t.kmFree} km)` : ''} + {brl(t.km)} por km + {brl(t.min)} por minuto, mínimo {brl(t.minimo)}. O Realys fica com {RIDE_FEE_PCT}%.
      </Text>
      {line(`Corrida de 5 km agora (${now.minutes} min)`, now, e1)}
      {line(`No pico (18h, ${peak.minutes} min)`, peak, e2)}
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
        No pico e com muita procura o valor sobe (no máximo {String(SURGE_MAX).replace('.', ',')}x), porque o trânsito parado gasta mais combustível e tempo. Combustível estimado: {brl(e1.fuel)} agora, {brl(e2.fuel)} no pico. Ganho líquido estimado: {brl(e1.net)} ({brl(e1.perHour)}/h) agora e {brl(e2.net)} ({brl(e2.perHour)}/h) no pico.
      </Text>
    </Card>
  );
}

// Chave de segurança: "Lotus" + frase secreta = alerta silencioso com GPS e ligação para a polícia.
function SafetyKey() {
  const [cfg, setCfg] = useState(panicConfig());
  const [editing, setEditing] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [call190, setCall190] = useState(true);
  React.useEffect(() => onPanicChange(setCfg), []);
  const start = () => {
    setPhrase(cfg ? cfg.phrase : '');
    setCall190(cfg ? cfg.call190 !== false : true);
    setEditing(true);
  };
  const save = async () => {
    const p = phrase.trim().replace(/^l[oó]tus[,\s]*/i, '');
    if (!phraseOk(p)) return Alert.alert('Frase curta demais', 'Use pelo menos 3 palavras, de um pedido comum (ex.: "toca a playlist da viagem"). Nunca use "socorro".');
    if (call190) await askCallPermission();
    await savePanic({ phrase: p, call190, on: true, decoy: 'Certo.' });
    setEditing(false);
    Alert.alert('Chave de segurança ativada', `Em perigo, com o Realys aberto, diga: "Lotus, ${p}". A Lotus só responde "Certo." e, em silêncio, envia o alerta com sua localização${call190 ? ' e liga para o 190' : ''}.`);
  };
  return (
    <Card style={{ borderColor: '#C0392B', borderWidth: 1 }}>
      <Row>
        <Ionicons name="shield-half-outline" size={22} color="#C0392B" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Chave de segurança</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            {cfg && cfg.on !== false
              ? `Ativa. Diga "Lotus, ${cfg.phrase}" em caso de perigo${cfg.call190 !== false ? ' (liga para o 190)' : ''}.`
              : 'Em perigo (assalto, ameaça), diga "Lotus" + uma frase secreta: a Lotus avisa a polícia em silêncio, sem aparecer nada na tela.'}
          </Text>
        </View>
      </Row>
      {editing ? (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: colors.text, fontSize: 13, marginBottom: 6 }}>Sua frase secreta (parece um pedido comum):</Text>
          <Row>
            <Text style={{ color: colors.text, fontWeight: '700', marginRight: 6 }}>Lotus,</Text>
            <View style={{ flex: 1 }}>
              <Input value={phrase} onChangeText={setPhrase} placeholder={PANIC_EXAMPLES[0]} autoCapitalize="none" />
            </View>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {PANIC_EXAMPLES.map((x) => (
              <Chip key={x} label={x} active={phrase === x} onPress={() => setPhrase(x)} />
            ))}
          </View>
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>Ligar para o 190 (Polícia Militar / Brigada Militar)</Text>
            <Switch value={call190} onValueChange={setCall190} trackColor={{ true: colors.primary }} />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            Use só em perigo real: acionar a polícia sem motivo é crime (trote). A frase fica só neste celular.
          </Text>
          <Row style={{ marginTop: 10 }}>
            <Button small title="Salvar chave" onPress={save} style={{ flex: 1, marginRight: 8 }} />
            <Button small variant="outline" title="Cancelar" onPress={() => setEditing(false)} style={{ flex: 1 }} />
          </Row>
        </View>
      ) : (
        <Row style={{ marginTop: 10 }}>
          <Button small title={cfg ? 'Trocar frase' : 'Criar minha chave'} onPress={start} style={{ flex: 1, marginRight: cfg ? 8 : 0 }} />
          {cfg ? <Button small variant="outline" title="Desativar" onPress={() => savePanic(null)} style={{ flex: 1 }} /> : null}
        </Row>
      )}
    </Card>
  );
}

const UNITS = ['mês', 'hora', 'serviço', 'diária (8h)', 'm²', 'visita', 'corrida + R$ 2,50/km'];

function DriverMain({ goTo, onCadastro }) {
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
  // Veículo (motorista, motoboy, frete…): modelo, placa, ano, lugares e recursos (cadeirinha, pet…).
  const moves = (serviceType(service) || {}).group === 'Transporte';
  const [vehicle, setVehicle] = useState(me && me.vehicle ? me.vehicle : '');
  const [plate, setPlate] = useState(me && me.plate ? me.plate : '');
  const [year, setYear] = useState(me && me.car && me.car.year ? String(me.car.year) : '');
  const [seats, setSeats] = useState(me && me.car && me.car.seats ? String(me.car.seats) : '');
  const [feats, setFeats] = useState(me ? featuresOf(me) : []);
  const toggleFeat = (k) => setFeats((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

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
    // Faixa justa: ninguém cobra acima do teto (justo para o cliente e equilibrado entre prestadores).
    const online = (serviceType(service) || {}).mode === 'online';
    const fv = byVisit ? checkFair(service, 'visita', f) : { ok: true };
    const fp = checkFair(service, unit, v, { online });
    if (!fv.ok) return Alert.alert('Taxa de visita acima da faixa justa', `Para ${(serviceType(service) || {}).label || 'este serviço'}, a visita no Realys vai de ${refText(fv.ref)}. Ajuste para no máximo R$ ${fv.ref.max}.`);
    if (!fp.ok) return Alert.alert('Valor acima da faixa justa', `A faixa justa é de ${refText(fp.ref)}. Ajuste para no máximo R$ ${fp.ref.max}.`);
    if (fv.level === 'baixo' || fp.level === 'baixo') Alert.alert('Valor abaixo do comum', 'Seu valor está abaixo da faixa de referência. Pode não cobrir seus custos (deslocamento, ferramentas, impostos). Você pode manter assim se quiser.');
    if (moves && (!vehicle.trim() || !plate.trim())) return Alert.alert('Dados do veículo', 'Informe o modelo e a placa. O cliente vê esses dados antes de embarcar.');
    const car = {};
    feats.forEach((k) => (car[k] = true));
    if (parseInt(year, 10)) car.year = parseInt(year, 10);
    if (parseInt(seats, 10)) car.seats = parseInt(seats, 10);
    dispatch({
      type: 'SAVE_MY_PROVIDER',
      profile: {
        service,
        functions: list,
        price: v,
        priceUnit: unit,
        ...(byVisit ? { visitFee: f, visitDiscount: discount } : {}),
        ...(moves ? { vehicle: vehicle.trim(), plate: plate.trim().toUpperCase(), car } : {}),
      },
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
      <BoostButton target="prestador" label="Boost: pegar trabalho mais rápido" hint="Fique no topo das indicações da sua região por algumas horas" />
      <Button title="Cadastro, empresa e mandados de serviço" variant="light" onPress={onCadastro} style={{ marginBottom: 12 }} />
      <UnmetServices />
      <OpenRequests kind="servico" service={state.myProvider && state.myProvider.service} />

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
      <SafetyKey />
      {me && TARIFFS[me.service] ? <RideEarnings service={me.service} /> : null}
      <Card onPress={() => dispatch({ type: 'OPEN_DOCS', mode: 'lista' })}>
        <Row>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Contratos e receitas</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Contrato do serviço com o cliente e, se a sua profissão permite, receitas no atendimento (por voz ou digitando).</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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
            <ProfessionPicker selected={service} types={serviceTypes} onPick={setService} />
            {moves ? (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Seu veículo</Text>
                <Input placeholder="Modelo e cor (ex.: Chevrolet Onix prata)" value={vehicle} onChangeText={setVehicle} />
                <Row style={{ marginHorizontal: -4 }}>
                  <View style={{ flex: 1, marginHorizontal: 4 }}>
                    <Input placeholder="Placa" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 4 }}>
                    <Input placeholder="Ano" keyboardType="number-pad" value={year} onChangeText={setYear} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 4 }}>
                    <Input placeholder="Lugares" keyboardType="number-pad" value={seats} onChangeText={setSeats} />
                  </View>
                </Row>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>O que o seu veículo tem</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                  O cliente filtra por isso. Ex.: quem pede para buscar os filhos só vê motoristas com cadeirinha.
                </Text>
                <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                  {CAR_FEATURES.map(([k, label, icon]) => (
                    <View key={k} style={{ marginBottom: 8 }}>
                      <Chip label={`${icon} ${label}`} active={feats.includes(k)} onPress={() => toggleFeat(k)} />
                    </View>
                  ))}
                </Row>
              </>
            ) : null}
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>O que você faz (separe por vírgula)</Text>
            <Input
              placeholder="Ex.: Instalação de chuveiro, tomadas, quadro de luz"
              value={functions}
              onChangeText={setFunctions}
              multiline
            />
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Quanto você cobra</Text>
            {TARIFFS[service] ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>Motorista e motoboy seguem a Tarifa Realys, igual para todos (com valor dinâmico no pico). O valor abaixo fica só como referência sua.</Text>
            ) : null}
            <Input placeholder="Valor em R$" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
            {priceRef(service, unit, { online: (serviceType(service) || {}).mode === 'online' }) ? (
              <Text style={{ color: colors.primary, fontSize: 12, marginTop: -4, marginBottom: 8 }}>
                Faixa justa Realys: {refText(priceRef(service, unit, { online: (serviceType(service) || {}).mode === 'online' }))}
              </Text>
            ) : null}
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
                {priceRef(service, 'visita') ? (
                  <Text style={{ color: colors.primary, fontSize: 12, marginTop: -4, marginBottom: 6 }}>Faixa justa da visita: {refText(priceRef(service, 'visita'))}</Text>
                ) : null}
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
            {me.vehicle ? (
              <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
                🚗 {me.vehicle}
                {me.plate ? ` · ${me.plate}` : ''}
                {me.car && me.car.year ? ` · ${me.car.year}` : ''}
                {me.car && me.car.seats ? ` · ${me.car.seats} lugares` : ''}
              </Text>
            ) : null}
            {featuresOf(me).length ? (
              <Text style={{ color: colors.text, marginTop: 4, fontSize: 12 }}>{featuresOf(me).map((k) => `${featureIcon(k)} ${featureLabel(k)}`).join('   ')}</Text>
            ) : null}
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

      <AgendaShortcut onOpen={() => goTo && goTo('agenda')} />

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
            {/* Espera no embarque: o passageiro tem 10 minutos depois do "Cheguei". */}
            {isTransport(r) && !r.done && !r.arrivedAt ? (
              <Button small title="Cheguei no local de embarque" style={{ marginTop: 10 }} onPress={() => dispatch({ type: 'RIDE_ARRIVED', id: r.id })} />
            ) : null}
            {isWaiting(r) ? (
              <View style={{ marginTop: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>Passageiro avisado. Se não embarcar em {NO_SHOW_MIN} min, a corrida é encerrada e o valor fica com você.</Text>
                  <WaitCountdown ride={r} style={{ marginLeft: 10 }} />
                </Row>
                <Button small title="Passageiro embarcou" style={{ marginTop: 8 }} onPress={() => dispatch({ type: 'RIDE_BOARDED', id: r.id })} />
              </View>
            ) : null}
            {r.noShow ? <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>Passageiro não embarcou em {NO_SHOW_MIN} min: valor da corrida garantido para você.</Text> : null}
          </Card>
        ))}
        {!accepted.length ? <Empty text="Nenhum serviço em andamento." /> : null}
      </Section>
    </Screen>
  );
}

// Botão da Agenda no painel: mostra o próximo trabalho e abre a agenda completa.
function AgendaShortcut({ onOpen }) {
  const { state } = useStore();
  const now = Date.now();
  const items = buildAgenda(state, now);
  const next = nextJob(items, now);
  const st = agendaStats(items, now);
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.85} accessibilityLabel="Abrir minha agenda">
      <Card style={{ backgroundColor: colors.primaryLight }}>
        <Row>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="calendar" size={22} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Minha agenda</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
              {next ? `Próximo: ${next.client}, ${dayLabel(next.start, now).toLowerCase()} às ${hhmm(next.start)} (${untilText(next.start, now)})` : 'Nenhum trabalho marcado'}
            </Text>
            <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
              {st.today} hoje · {st.week} nos próximos 7 dias
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Row>
      </Card>
    </TouchableOpacity>
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

// Painel do prestador + tela de cadastro, empresa e mandados (tudo no aplicativo, em demonstração).
export default function DriverScreen(props) {
  const [tela, setTela] = useState(null);
  if (tela === 'cadastro') return <PrestacaoScreen onClose={() => setTela(null)} />;
  return <DriverMain {...props} onCadastro={() => setTela('cadastro')} />;
}
