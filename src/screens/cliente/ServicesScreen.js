import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, buildServiceCall, callReply, serviceType, priceText, detectService } from '../../store';
import { SearchBar, GlobalResults } from '../../components/Search';
import { serviceTypes } from '../../data';
import { colors, brl, soft } from '../../theme';
import { Screen, Card, Row, Photo, Badge } from '../../components/ui';
import { etaMin, mapPos, kmText, ratingText, reviewsCount } from '../../providerInfo';
import ProviderProfile from './ProviderProfile';
import { ProviderPreviewModal } from '../../components/ProviderPreview';
import TrackingScreen from './TrackingScreen';
import { speakSoft } from '../../voice';
import { isVisitService, rankProviders, providerStats, isNewProvider, visitFee, visitDiscount } from '../../serviceVisits';
import { VisitRequestSheet, VisitCard } from '../../components/VisitSheet';
import { SegTabs } from '../../components/AdKit';
import ProfessionPicker from '../../components/ProfessionPicker';
import { CAR_FEATURES, featuresOf, featureIcon, featureLabel, hasAll, isPassenger } from '../../vehicleInfo';
import { useBack } from '../../back';
import { lives } from '../../homeData';
import { isTransport, isWaiting, WaitCountdown, NO_SHOW_MIN } from '../../rideRules';
import { surgeText } from '../../pricing';
import { SERVICE_TABS, SERVICE_TAB_KEYS, TAB_TYPES, isOnlineType, tabOfType, OnlineTab, CoursesTab, LiveClasses } from './ServiceTabs';

// Cartão do chamado (usado também pelo assistente de voz).
// Demonstração (um celular só faz os dois lados): simula o motorista chegando no local.
function DemoArrive({ call }) {
  const { state, dispatch } = useStore();
  const r = state.rides.find((x) => x.id === call.id) || call;
  if (!isTransport(r) || r.done || r.arrivedAt || r.when) return null;
  return (
    <TouchableOpacity onPress={() => dispatch({ type: 'RIDE_ARRIVED', id: r.id })} style={{ marginTop: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 11, textDecorationLine: 'underline' }}>Demonstração: simular motorista chegando</Text>
    </TouchableOpacity>
  );
}

export function ServiceCallCard({ call }) {
  const p = call.provider;
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <Row style={{ marginBottom: 8 }}>
        <Ionicons name={(serviceType(call.serviceKey) || {}).ion || 'navigate'} size={16} color={colors.primary} />
        <Text style={{ fontWeight: '700', color: colors.primary, marginLeft: 6 }}>{call.status}</Text>
      </Row>
      <Row>
        <Photo uri={p.photo} style={styles.avatarSm} fallback="🧑" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>
            {p.name} · <Text style={{ color: colors.accent, fontWeight: '700' }}>★ {ratingText(p.rating)}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {call.serviceLabel}
            {p.vehicle ? ` · ${p.vehicle}` : ''}
          </Text>
          {p.plate ? <Text style={{ fontWeight: '700', letterSpacing: 1, color: colors.text }}>Placa {p.plate}</Text> : null}
        </View>
      </Row>
      {call.forOther ? (
        <Text style={{ color: colors.text, marginTop: 10, fontSize: 13, fontWeight: '700' }}>
          👤 Para {call.forOther.name}
          {call.forOther.phone ? ` · ${call.forOther.phone}` : ''}
          {'\n'}
          <Text style={{ fontWeight: '400', color: colors.muted }}>
            Buscar em {call.from}
            {call.to && call.to !== '-' ? ` → ${call.to}` : ''}
          </Text>
        </Text>
      ) : null}
      {isWaiting(call) ? (
        <View style={{ marginTop: 10, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 13, flex: 1, fontWeight: '700' }}>
              {first(p.name)} está no local. Embarque em até {NO_SHOW_MIN} min: depois disso a corrida é cobrada e encerrada.
            </Text>
            <WaitCountdown ride={call} style={{ marginLeft: 10 }} />
          </Row>
        </View>
      ) : call.noShow ? (
        <Text style={{ color: '#C0392B', marginTop: 10, fontSize: 13, fontWeight: '700' }}>
          Corrida encerrada: você não embarcou em {NO_SHOW_MIN} minutos. O valor foi pago ao motorista.
        </Text>
      ) : (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Chega em {call.eta} min · {call.fare ? `corrida estimada ${brl(call.fare.total)} (${call.fare.km} km, ~${call.fare.minutes} min)` : priceText(p)} · acompanhe pelo GPS na aba Serviços
          </Text>
          {call.fare && call.fare.mult > 1 ? (
            <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
              Valor dinâmico {String(call.fare.mult).replace('.', ',')}x: {surgeText(call.fare)}. Normal seria {brl(call.fare.normal)}.
            </Text>
          ) : null}
        </View>
      )}
      {DemoArrive ? <DemoArrive call={call} /> : null}
    </Card>
  );
}

const SORTS = [
  ['rank', 'Recomendados', 'ribbon-outline'],
  ['dist', 'Perto', 'navigate-outline'],
  ['rating', 'Nota', 'star-outline'],
  ['price', 'Preço', 'pricetag-outline'],
];

// Grupos de serviço na ordem em que aparecem (Casa e reparos, Veículos, Agro…).
const GROUPS = serviceTypes.reduce((acc, t) => (acc.includes(t.group) ? acc : [...acc, t.group]), []);
const GROUP_ION = {
  'Casa e reparos': 'home-outline',
  Veículos: 'car-outline',
  Agro: 'leaf-outline',
  Tecnologia: 'hardware-chip-outline',
  'Festas e eventos': 'musical-notes-outline',
  Aulas: 'school-outline',
  Transporte: 'bus-outline',
  'Saúde e bem-estar': 'heart-circle-outline',
  'Jurídico e finanças': 'briefcase-outline',
};
const first = (name) => String(name || '').split(' ')[0];

export default function ServicesScreen({ explore, navigate }) {
  const { state, dispatch } = useStore();
  const [address, setAddress] = useState('');
  const [selected, setSelected] = useState('eletricista');
  const [sort, setSort] = useState('rank');
  const [visitFor, setVisitFor] = useState(null); // prestador para quem o cliente está pedindo visita
  const [selId, setSelId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [preview, setPreview] = useState(null); // prévia só para analisar (sem mensagem nem chamar)
  const [tracking, setTracking] = useState(null);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');
  const [found, setFound] = useState(null); // tipo de serviço achado pela pesquisa
  const [howOpen, setHowOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  // Prestador em destaque acima do GPS: rolagem até ele e tamanho do mapa (para a linha até o pino).
  const scrollRef = useRef(null);
  const [featY, setFeatY] = useState(0);
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  // Pedir para outra pessoa (buscar a esposa, os filhos…) e o que o carro precisa ter.
  const [forOther, setForOther] = useState(false);
  const [other, setOther] = useState({ name: '', phone: '', from: '', to: '' });
  const [needs, setNeeds] = useState([]);
  // Abas: Serviços (geral, tudo) | Cursos | Visitas | Aulas | Online
  const [tab, setTab] = useState('servicos');
  const [appts, setAppts] = useState([]); // atendimentos online agendados
  const [onlineFocus, setOnlineFocus] = useState(null);
  useBack(tab !== 'servicos', () => setTab('servicos'));

  // Veio do menu ⋮ (ex.: Serviços gerais → Eletricista)
  useEffect(() => {
    if (explore && explore.service) setSelected(explore.service);
    if (explore && SERVICE_TAB_KEYS.includes(explore.seg)) setTab(explore.seg);
  }, [explore]);
  // Visitas e Aulas mostram só as funções compatíveis; se a função escolhida não cabe na aba, pega a primeira.
  const tabKeys = TAB_TYPES[tab] || null;
  useEffect(() => {
    if (tabKeys && !tabKeys.includes(selected)) setSelected(tabKeys[0]);
  }, [tab]);
  const changeTab = (k) => {
    setTab(k);
    setQ('');
    setSearched('');
    setFound(null);
  };
  useEffect(() => setSelId(null), [selected]);

  const type = serviceType(selected);
  const group = type.group;
  const inTab = (t) => !tabKeys || tabKeys.includes(t.key);
  const groupTypes = serviceTypes.filter((t) => t.group === group && inTab(t));
  const tabGroups = GROUPS.filter((g) => serviceTypes.some((t) => t.group === g && inTab(t)));
  const onlineSel = isOnlineType(selected);
  const pickGroup = (g) => {
    const t = serviceTypes.find((x) => x.group === g && inTab(x));
    if (t) setSelected(t.key);
  };

  const transport = type.group === 'Transporte';
  const passenger = isPassenger(selected);
  const activeNeeds = passenger ? needs : [];
  const pool = state.providers.filter((p) => hasAll(p, activeNeeds));
  const counts = {};
  state.providers.forEach((p) => (counts[p.service] = (counts[p.service] || 0) + 1));
  const toggleNeed = (k) => setNeeds((n) => (n.includes(k) ? n.filter((x) => x !== k) : [...n, k]));
  const setO = (k) => (v) => setOther((o) => ({ ...o, [k]: v }));

  const byDist = [...pool].filter((p) => p.service === selected).sort((a, b) => a.distanceKm - b.distanceKm);
  // Ranking por mérito (nota + serviços em 90 dias + resposta + proximidade + impulso de novato)
  // e, separado, quem paga o plano de destaque.
  const ranking = rankProviders(pool, selected);
  const meritPos = {};
  ranking.merit.forEach((p, i) => (meritPos[p.id] = i + 1));
  const sponsoredP = sort === 'rank' ? ranking.sponsored[0] : null;
  const isVisit = isVisitService(selected);
  const list = sort === 'rank' ? [...ranking.merit] : [...byDist];
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (sort === 'price') list.sort((a, b) => a.price - b.price);
  const nearestP = byDist[0];
  const bestId = [...byDist].sort((a, b) => b.rating - a.rating)[0]?.id;
  const cheapestId = [...byDist].sort((a, b) => a.price - b.price)[0]?.id;
  const num = {};
  byDist.forEach((p, i) => (num[p.id] = i + 1));
  // Em destaque acima do GPS: o primeiro da categoria pesquisada (como aparece na lista)
  // até o cliente escolher outro; aí o escolhido toma o lugar dele.
  const firstP = sponsoredP || list[0] || nearestP;
  const sel = byDist.find((p) => p.id === selId) || firstP;
  const selPos = sel ? mapPos(sel) : null;
  const pinLeft = selPos ? Math.min(92, Math.max(4, selPos.left)) : 50;
  const pinTop = selPos ? Math.min(84, Math.max(6, selPos.top)) : 50;
  // Linha do "você" (centro do mapa) até o pino do prestador em destaque.
  const routeLine = (() => {
    if (!sel || !mapSize.w) return null;
    const dx = ((pinLeft - 50) / 100) * mapSize.w;
    const dy = ((pinTop - 50) / 100) * mapSize.h;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 4) return null;
    return {
      left: mapSize.w / 2 + dx / 2 - len / 2,
      top: mapSize.h / 2 + dy / 2 - 1,
      width: len,
      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
    };
  })();
  // Escolher outro prestador: ele sobe para o destaque e a tela volta até o GPS.
  const pick = (p) => {
    setSelId(p.id);
    if (scrollRef.current) scrollRef.current.scrollTo({ y: Math.max(0, featY - 8), animated: true });
  };
  const lastCall = state.rides.find((r) => r.provider && r.serviceKey && !r.done);
  const toRate = state.rides.find((r) => r.provider && r.serviceKey && r.done && !r.rated);
  // Visitas em andamento primeiro; as encerradas somem depois de avaliadas.
  const myVisits = (state.visits || []).filter((v) => !(v.status === 'concluida' && v.rated)).slice(0, 4);
  const minFee = isVisit && byDist.length ? Math.min(...byDist.map(visitFee)) : null;

  const hire = (p) => {
    if (!p) return;
    // Atendimento online: agenda a chamada de vídeo na aba Online.
    if (isOnlineType(p.service)) {
      setProfile(null);
      setOnlineFocus(p.id);
      changeTab('online');
      return;
    }
    // Serviços por visita: o cliente paga a taxa de visita, que fica retida até a visita acontecer.
    if (isVisitService(p.service)) {
      setProfile(null);
      setVisitFor(p);
      return;
    }
    if (transport && forOther && (!other.name.trim() || !other.from.trim())) {
      Alert.alert('Para quem é?', `Informe o nome da pessoa e o endereço onde ${selected === 'motoboy' ? 'o motoboy vai buscar' : 'ela vai ser buscada'}.`);
      return;
    }
    const c = buildServiceCall(state, (transport && forOther ? other.from : address).trim(), p.service);
    if (!c) return;
    c.provider = p;
    c.eta = etaMin(p);
    if (transport && forOther) {
      c.forOther = { name: other.name.trim(), phone: other.phone.trim() };
      c.to = other.to.trim() || '-';
    }
    if (activeNeeds.length) c.needs = activeNeeds;
    dispatch({ type: 'REQUEST_RIDE', ride: c });
    speakSoft(callReply(c));
    setProfile(null);
    setTracking(c);
  };
  const quote = (p) => Alert.alert('Orçamento pedido', `${p.name} recebeu seu pedido. A proposta chega no chat do Realys.`);
  const message = (p) => Alert.alert('Mensagem', `Conversa com ${first(p.name)} aberta no chat do Realys.`);

  // Cartão de um prestador na lista (também usado no bloco Patrocinado).
  const renderCard = (p, isSponsored, featured) => {
    const visitService = isVisitService(p.service);
    const stats = providerStats(p);
    const on = !!featured;
    const badges = [];
    if (isSponsored) badges.push(['Patrocinado', colors.sponsored]);
    else if (sort === 'rank' && meritPos[p.id]) badges.push([`#${meritPos[p.id]} por mérito`, colors.primary]);
    if (isNewProvider(p)) badges.push(['Novo no Realys', colors.violet]);
    if (nearestP && p.id === nearestP.id) badges.push(['Mais perto', colors.accent]);
    if (p.id === bestId && sort !== 'rank') badges.push(['Melhor nota', colors.accent]);
    if (p.id === cheapestId && byDist.length > 1) badges.push(['Menor preço', colors.success]);
    if (visitService && visitDiscount(p)) badges.push(['Visita descontada', colors.success]);
    if (p.online) badges.unshift([isOnlineType(p.service) ? 'Só online' : 'Também online', colors.primary]);

    return (
      <TouchableOpacity
        key={(featured ? 'ft-' : isSponsored ? 'sp-' : '') + p.id}
        activeOpacity={0.92}
        // No destaque, tocar abre a prévia do perfil; na lista, tocar leva o prestador para o destaque.
        onPress={() => (featured ? setPreview(p) : pick(p))}
        style={[styles.pCard, on && styles.pCardOn, isSponsored && styles.pCardSponsored]}
      >
        <Row style={{ alignItems: 'flex-start' }}>
          <View>
            <Photo uri={p.photo} style={styles.avatar} fallback="🧑" />
            <View style={[styles.numDot, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.numText, on && { color: colors.onPrimary }]}>{num[p.id]}</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Row>
              <Text style={styles.pName} numberOfLines={1}>
                {p.name}
              </Text>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
            </Row>
            <Text style={styles.pMeta}>
              {kmText(p.distanceKm)} · ~{etaMin(p)} min · {reviewsCount(p)} avaliações
            </Text>
            <Text style={styles.pPrice}>{priceText(p)}</Text>
          </View>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={colors.gold} />
            <Text style={styles.ratingText}>{ratingText(p.rating)}</Text>
          </View>
        </Row>

        {badges.length ? (
          <View style={styles.badges}>
            {badges.slice(0, 3).map(([label, color]) => (
              <Badge key={label} label={label} color={color} />
            ))}
          </View>
        ) : null}

        <Text style={styles.pFunc} numberOfLines={1}>
          {p.functions.join(' · ')}
        </Text>
        {featuresOf(p).length ? (
          <View style={styles.carRow}>
            {p.car && p.car.seats ? <Text style={styles.carChip}>💺 {p.car.seats} lugares</Text> : null}
            {featuresOf(p).map((k) => (
              <Text key={k} style={[styles.carChip, activeNeeds.includes(k) && styles.carChipOn]}>
                {featureIcon(k)} {featureLabel(k)}
              </Text>
            ))}
          </View>
        ) : null}
        {visitService ? (
          <View style={styles.statsRow}>
            <MiniStat icon="checkmark-done-outline" text={`${stats.done90} em 90 dias`} />
            <MiniStat icon="flash-outline" text={`responde ${stats.responseRate}%`} />
            <MiniStat icon="time-outline" text={`~${stats.responseMin} min`} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actMain} onPress={() => hire(p)}>
            <Ionicons name={isOnlineType(p.service) ? 'videocam' : visitService ? 'home-outline' : 'flash'} size={16} color={colors.onPrimary} />
            <Text style={styles.actMainText} numberOfLines={1}>
              {isOnlineType(p.service) ? 'Agendar por vídeo' : visitService ? `Pedir visita · ${brl(visitFee(p))}` : 'Contratar agora'}
            </Text>
          </TouchableOpacity>
          <IconBtn icon="document-text-outline" label={`Pedir orçamento a ${p.name}`} onPress={() => quote(p)} />
          <IconBtn icon="person-outline" label={`Ver prévia do perfil de ${p.name}`} onPress={() => setPreview(p)} />
        </View>
      </TouchableOpacity>
    );
  };

  const hasActivity = toRate || lastCall || myVisits.length;
  const menu = <SegTabs items={SERVICE_TABS} value={tab} onChange={changeTab} />;

  // Cursos e Online têm conteúdo próprio (não usam mapa nem visita).
  if (tab === 'cursos' || tab === 'online') {
    return (
      <Screen>
        {menu}
        {tab === 'online' ? <OnlineTab appts={appts} setAppts={setAppts} focus={onlineFocus} /> : <CoursesTab navigate={navigate} />}
      </Screen>
    );
  }

  return (
    <Screen scrollRef={scrollRef}>
      {menu}

      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Eletricista, vazamento, diarista, Pedro…"
        voicePrompt="Que serviço você procura?"
        onSubmit={(text) => {
          setSearched(text);
          const key = text ? detectService(text) : null;
          setFound(key);
          if (key) {
            if (tabKeys && !tabKeys.includes(key)) setTab('servicos'); // o geral tem tudo
            setSelected(key);
          }
        }}
      />
      {searched ? (
        <>
          {found ? (
            <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: 8 }}>
              Mostrando {serviceType(found).label.toLowerCase()} perto de você ↓
            </Text>
          ) : null}
          <GlobalResults query={searched} navigate={navigate} max={found ? 4 : 8} title={found ? 'Também no Realys' : 'Resultados da pesquisa'} hideEmpty={!!found} />
          {/* Não achou? Pedido ao contrário: os prestadores mandam propostas. */}
          <TouchableOpacity style={styles.askOffers} onPress={() => navigate && navigate({ tab: 'pedidos', seg: 'propostas' })} activeOpacity={0.85}>
            <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1, marginLeft: 8 }}>Não achou? Peça propostas aos prestadores</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </>
      ) : null}

      {/* Acompanhando: visitas, chamado no GPS e avaliação pendente, sempre no topo */}
      {hasActivity ? (
        <View style={{ marginBottom: 8 }}>
          <SectionHead title="Acompanhando" />
          {toRate ? (
            <TouchableOpacity style={[styles.activeCall, { borderColor: colors.gold }]} onPress={() => dispatch({ type: 'OPEN_RATE', kind: 'servico', refId: toRate.id })} activeOpacity={0.85}>
              <View style={[styles.activeIcon, { backgroundColor: 'rgba(226,182,73,0.18)' }]}>
                <Ionicons name="star" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activeTitle}>
                  Avalie {first(toRate.provider.name)} · {toRate.serviceLabel}
                </Text>
                <Text style={styles.activeSub}>Serviço concluído. Sua nota vale pontos Realys.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
          {lastCall ? (
            <TouchableOpacity style={styles.activeCall} onPress={() => setTracking(lastCall)} activeOpacity={0.85}>
              <View style={styles.activeIcon}>
                <Ionicons name="navigate" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activeTitle}>
                  {first(lastCall.provider.name)} · {lastCall.serviceLabel}
                </Text>
                <Text style={styles.activeSub}>Toque para acompanhar pelo GPS</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
          {myVisits.map((v) => (
            <VisitCard key={v.id} visit={v} />
          ))}
        </View>
      ) : null}

      {/* Profissões em classes e subclasses: o botão abre a tela por cima */}
      <ProfessionPicker
        selected={selected}
        types={serviceTypes.filter(inTab)}
        counts={counts}
        onPick={setSelected}
        extra={
          tab === 'servicos'
            ? [{ label: 'Hotelaria', ion: 'bed-outline', sub: 'hotéis e pousadas', onPress: () => navigate && navigate({ tab: 'home', top: 'anuncios', kind: 'hotel' }) }]
            : null
        }
      />

      {/* Transporte: pedir para outra pessoa (esposa, filhos…) e o que o veículo precisa ter */}
      {transport ? (
        <View style={styles.otherCard}>
          <Text style={styles.otherTitle}>{selected === 'motoboy' || selected === 'frete' || selected === 'bikeentrega' ? 'Onde buscar e entregar?' : 'Para quem é a corrida?'}</Text>
          <View style={styles.otherSeg}>
            {[
              [false, 'Para mim', 'person'],
              [true, selected === 'motoboy' || selected === 'frete' || selected === 'bikeentrega' ? 'Outro endereço' : 'Outra pessoa', 'people'],
            ].map(([v, label, icon]) => (
              <TouchableOpacity key={label} onPress={() => setForOther(v)} style={[styles.otherSegBtn, forOther === v && styles.otherSegOn]}>
                <Ionicons name={icon} size={14} color={forOther === v ? '#fff' : colors.text} />
                <Text style={[styles.otherSegText, forOther === v && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {forOther ? (
            <>
              <Text style={styles.otherHint}>
                {passenger
                  ? 'Você paga pelo Realys e acompanha a corrida. A pessoa recebe o nome do motorista, a placa e o código de embarque por mensagem.'
                  : 'O motoboy busca no endereço indicado e entrega onde você pedir. Você acompanha tudo pelo GPS.'}
              </Text>
              <TextInput placeholder={passenger ? 'Nome de quem vai (ex.: Ana, minha esposa)' : 'Quem entrega / recebe (nome)'} placeholderTextColor={colors.muted} value={other.name} onChangeText={setO('name')} style={styles.otherInput} />
              <TextInput placeholder="Telefone da pessoa (opcional)" placeholderTextColor={colors.muted} value={other.phone} onChangeText={setO('phone')} keyboardType="phone-pad" style={styles.otherInput} />
              <TextInput placeholder={passenger ? 'Buscar em (ex.: Escola Pequeno Príncipe)' : 'Retirar em'} placeholderTextColor={colors.muted} value={other.from} onChangeText={setO('from')} style={styles.otherInput} />
              <TextInput placeholder={passenger ? 'Levar para (ex.: minha casa)' : 'Entregar em'} placeholderTextColor={colors.muted} value={other.to} onChangeText={setO('to')} style={styles.otherInput} />
            </>
          ) : null}
          {passenger ? (
            <>
              <Text style={[styles.otherTitle, { fontSize: 13, marginTop: 10 }]}>O veículo precisa ter</Text>
              <View style={styles.needRow}>
                {CAR_FEATURES.map(([k, label, icon]) => {
                  const on = needs.includes(k);
                  return (
                    <TouchableOpacity key={k} onPress={() => toggleNeed(k)} style={[styles.needChip, on && styles.needChipOn]} accessibilityLabel={label}>
                      <Text style={[styles.needText, on && { color: '#fff' }]}>
                        {icon} {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Função online (psicólogo, advogado…): não tem endereço nem mapa, é por chamada de vídeo */}
      {onlineSel ? (
        <TouchableOpacity style={styles.howBox} onPress={() => changeTab('online')} activeOpacity={0.85}>
          <Row>
            <Ionicons name="videocam" size={18} color={colors.primary} />
            <Text style={styles.howTitle}>Atendimento por chamada de vídeo · ver horários na aba Online</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
        </TouchableOpacity>
      ) : null}

      {/* Prestador em destaque: o primeiro da categoria, ou o que o cliente escolheu. O GPS vem logo abaixo dele. */}
      {!onlineSel && sel ? (
        <View onLayout={(e) => setFeatY(e.nativeEvent.layout.y)}>
          <SectionHead title={selId ? 'Você escolheu' : `Primeiro em ${type.label.toLowerCase()}`} right="no GPS abaixo ↓" />
          {renderCard(sel, !!(sponsoredP && sel.id === sponsoredP.id), true)}
        </View>
      ) : null}

      {/* Onde: endereço + mapa (dá para esconder o mapa) */}
      {!onlineSel ? (
      <View style={styles.whereCard}>
        <Row>
          <Ionicons name="location" size={18} color={colors.primary} />
          <TextInput
            placeholder={transport && forOther ? 'Seu endereço (só para referência)' : 'Seu endereço (opcional): Rua Augusta, 1200'}
            placeholderTextColor={colors.muted}
            value={address}
            onChangeText={setAddress}
            style={styles.addrInput}
          />
          <TouchableOpacity onPress={() => setShowMap(!showMap)} style={styles.mapToggle} accessibilityLabel={showMap ? 'Esconder mapa' : 'Mostrar mapa'}>
            <Ionicons name={showMap ? 'map' : 'map-outline'} size={16} color={colors.primary} />
          </TouchableOpacity>
        </Row>
        {showMap ? (
          <View style={styles.map} onLayout={(e) => setMapSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {[...Array(14)].map((_, i) => (
              <View key={'v' + i} style={[styles.gridV, { left: `${i * 7.5}%` }]} />
            ))}
            {[...Array(8)].map((_, i) => (
              <View key={'h' + i} style={[styles.gridH, { top: `${i * 14}%` }]} />
            ))}
            <View style={[styles.road, { top: '46%', transform: [{ rotate: '-8deg' }] }]} />
            <View style={[styles.roadV, { left: '38%', transform: [{ rotate: '14deg' }] }]} />
            {routeLine ? <View style={[styles.routeLine, routeLine]} /> : null}
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
                  hitSlop={6}
                  accessibilityLabel={`Selecionar ${p.name}`}
                  style={[styles.pin, { left: `${Math.min(92, Math.max(4, pos.left))}%`, top: `${Math.min(84, Math.max(6, pos.top))}%` }, on && styles.pinOn]}
                >
                  <Text style={[styles.pinText, on && { color: colors.onPrimary }]}>{num[p.id]}</Text>
                </TouchableOpacity>
              );
            })}
            {sel ? (
              <View style={styles.mapSel}>
                <Ionicons name="navigate" size={12} color={colors.primary} />
                <Text style={styles.mapSelText} numberOfLines={1}>
                  {first(sel.name)} · {kmText(sel.distanceKm)} · ~{etaMin(sel)} min
                </Text>
              </View>
            ) : null}
            <Text style={styles.mapLabel}>
              {byDist.length} {type.label.toLowerCase()}(s) com GPS ligado · você em roxo
            </Text>
          </View>
        ) : null}
        {byDist.length ? (
          <View style={styles.quickRow}>
            {nearestP && sel && nearestP.id !== sel.id ? (
              <TouchableOpacity style={[styles.quickBtn, styles.quickGhost]} onPress={() => setSelId(nearestP.id)}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>Ver o mais perto</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.quickBtn, styles.quickMain]} onPress={() => hire(sel)}>
              <Text style={{ color: colors.onPrimary, fontWeight: '700' }} numberOfLines={1}>
                {isVisit ? 'Pedir visita a' : 'Contratar'} {first(sel.name)}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      ) : null}

      {/* Como funciona a visita (abre e fecha) */}
      {isVisit ? (
        <TouchableOpacity style={styles.howBox} onPress={() => setHowOpen(!howOpen)} activeOpacity={0.85}>
          <Row>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.howTitle}>
              Pagamento protegido{minFee != null ? ` · visita a partir de ${brl(minFee)}` : ''}
            </Text>
            <Ionicons name={howOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
          </Row>
          {howOpen ? (
            <View style={{ marginTop: 8 }}>
              <HowStep n="1" text="Você paga só a taxa de visita. Ela fica retida no Realys." />
              <HowStep n="2" text="O prestador aceita ou recusa. Recusou, o valor volta na hora." />
              <HowStep n="3" text="Depois da visita, você confirma. Se ele não vier, o valor volta." />
              <HowStep n="4" text="O preço do serviço vocês combinam direto, sem taxa do Realys." />
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {/* Lista */}
      <SectionHead title={onlineSel ? `${type.label} online` : `${type.label} perto de você`} right={`${byDist.length} disponível(is)`} />
      <View style={styles.segment}>
        {SORTS.map(([k, label, icon]) => {
          const on = k === sort;
          return (
            <TouchableOpacity key={k} onPress={() => setSort(k)} style={[styles.segBtn, k === 'rank' && { flex: 1.5 }, on && styles.segBtnOn]}>
              <Ionicons name={icon} size={13} color={on ? colors.primaryDark : colors.muted} />
              <Text style={[styles.segText, on && { color: colors.primaryDark }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!list.length ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={28} color={colors.muted} />
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>Nenhum {type.label.toLowerCase()} disponível agora perto de você.</Text>
        </View>
      ) : null}

      {sponsoredP && !(sel && !onlineSel && sel.id === sponsoredP.id) ? (
        <>
          <Text style={styles.listLabel}>PATROCINADO</Text>
          {renderCard(sponsoredP, true)}
          <Text style={styles.listLabel}>RANKING POR MÉRITO</Text>
        </>
      ) : null}
      {/* O prestador em destaque já está acima do GPS, então sai da lista (troca de lugar com o escolhido). */}
      {list.filter((p) => onlineSel || !sel || p.id !== sel.id).map((p) => renderCard(p, false))}

      {tab === 'aulas' ? <LiveClasses items={lives.filter((l) => l.aula)} navigate={navigate} /> : null}

      <View style={styles.voiceTip}>
        <View style={styles.voiceIcon}>
          <Ionicons name="mic" size={16} color={colors.primary} />
        </View>
        <Text style={styles.voiceText}>Pela voz também funciona: "abrir Lotus, preciso de um eletricista na Rua Tamandaré".</Text>
      </View>

      <ProviderProfile provider={profile} visible={!!profile} onClose={() => setProfile(null)} onHire={hire} onQuote={quote} onMessage={message} />
      <ProviderPreviewModal provider={preview} onClose={() => setPreview(null)} />
      <VisitRequestSheet provider={visitFor} visible={!!visitFor} onClose={() => setVisitFor(null)} address={address} />
      <TrackingScreen call={tracking} visible={!!tracking} onClose={() => setTracking(null)} onOpenProfile={(p) => setProfile(p)} />
    </Screen>
  );
}

function SectionHead({ title, right }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? <Text style={styles.sectionRight}>{right}</Text> : null}
    </View>
  );
}

function MiniStat({ icon, text }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={12} color={colors.muted} />
      <Text style={styles.miniStatText}>{text}</Text>
    </View>
  );
}

function IconBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress} accessibilityLabel={label}>
      <Ionicons name={icon} size={19} color={colors.text} />
    </TouchableOpacity>
  );
}

function HowStep({ n, text }) {
  return (
    <Row style={{ alignItems: 'flex-start', marginTop: 6 }}>
      <View style={styles.howNum}>
        <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 11 }}>{n}</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>{text}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  askOffers: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, marginBottom: 12 },
  avatarSm: { width: 48, height: 48, borderRadius: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  sectionRight: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  // Categorias
  groupPill: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 13, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  groupPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupText: { color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 6 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 10 },
  typeTile: { width: '23%', marginHorizontal: '1%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16, backgroundColor: colors.card, marginBottom: 8, ...soft },
  typeTileOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,121,10,0.1)', alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: colors.text, fontWeight: '700', fontSize: 11.5, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  typeCount: { color: colors.muted, fontSize: 10, marginTop: 2 },
  // Endereço e mapa
  otherCard: { backgroundColor: colors.card, borderRadius: 22, padding: 12, marginBottom: 12, ...soft },
  otherTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 8 },
  otherSeg: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 14, padding: 3 },
  otherSegBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 11 },
  otherSegOn: { backgroundColor: colors.primary },
  otherSegText: { color: colors.text, fontWeight: '700', marginLeft: 6, fontSize: 13 },
  otherHint: { color: colors.muted, fontSize: 12, marginTop: 8, marginBottom: 4 },
  otherInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 6, color: colors.text, fontSize: 14 },
  needRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  needChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, margin: 3 },
  needChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  needText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  carRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, marginHorizontal: -2 },
  carChip: { fontSize: 11, color: colors.text, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, margin: 2, overflow: 'hidden' },
  carChipOn: { backgroundColor: colors.primaryLight, color: colors.primaryDark, fontWeight: '700' },
  whereCard: { backgroundColor: colors.card, borderRadius: 22, padding: 12, marginBottom: 12, ...soft },
  addrInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 8, paddingVertical: 6 },
  mapToggle: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  map: { height: 180, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden', marginTop: 10, ...soft },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(168,121,10,0.06)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(168,121,10,0.06)' },
  road: { position: 'absolute', left: -30, right: -30, height: 10, backgroundColor: '#F5EFE2' },
  roadV: { position: 'absolute', top: -30, bottom: -30, width: 10, backgroundColor: '#F5EFE2' },
  me: { position: 'absolute', left: '50%', top: '50%', marginLeft: -15, marginTop: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(108,92,231,0.2)', alignItems: 'center', justifyContent: 'center' },
  meDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6C5CE7', borderWidth: 2, borderColor: colors.bg },
  pin: { position: 'absolute', marginLeft: -15, marginTop: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pinOn: { width: 38, height: 38, borderRadius: 19, marginLeft: -19, marginTop: -19, backgroundColor: colors.primary, borderColor: '#FFFFFF', borderWidth: 2, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 12, elevation: 8 },
  pinText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  routeLine: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: colors.primary, opacity: 0.55 },
  mapSel: { position: 'absolute', left: 10, top: 10, maxWidth: '80%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mapSelText: { color: colors.text, fontSize: 11, fontWeight: '700', marginLeft: 4, flexShrink: 1 },
  mapLabel: { position: 'absolute', left: 10, bottom: 10, color: colors.text, fontSize: 11, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  quickRow: { flexDirection: 'row', marginTop: 10 },
  quickBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  quickGhost: { borderWidth: 1, borderColor: 'rgba(168,121,10,0.55)', marginRight: 8 },
  quickMain: { flex: 1.4, backgroundColor: colors.primary, paddingHorizontal: 10 },
  // Acompanhando
  activeCall: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card, marginBottom: 10 },
  activeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  activeTitle: { color: colors.text, fontWeight: '700' },
  activeSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  // Como funciona
  howBox: { backgroundColor: colors.primaryLight, borderRadius: 16, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(168,121,10,0.25)' },
  howTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 8, flex: 1 },
  howNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: -1 },
  // Lista
  segment: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 4, marginBottom: 12 },
  segBtn: { flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 4 },
  segBtnOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segText: { color: colors.muted, fontWeight: '700', fontSize: 12, marginLeft: 4, flexShrink: 1 },
  listLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8, marginTop: 2 },
  empty: { alignItems: 'center', padding: 24, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginBottom: 12 },
  pCard: { backgroundColor: colors.card, borderRadius: 22, padding: 14, marginBottom: 12, ...soft },
  pCardOn: { borderColor: colors.primary, borderWidth: 1.5 },
  pCardSponsored: { borderColor: 'rgba(108,92,231,0.45)', backgroundColor: '#FBFAFF' },
  avatar: { width: 60, height: 60, borderRadius: 20 },
  numDot: { position: 'absolute', right: -6, bottom: -6, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  numText: { color: colors.primary, fontWeight: '800', fontSize: 11 },
  pName: { color: colors.text, fontWeight: '700', fontSize: 16, flexShrink: 1 },
  pMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  pPrice: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 3 },
  rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  ratingText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12, marginLeft: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  pFunc: { color: colors.text, fontSize: 12.5, marginTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  miniStat: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  miniStatText: { color: colors.muted, fontSize: 11, marginLeft: 4, fontWeight: '600' },
  actions: { flexDirection: 'row', marginTop: 12 },
  actMain: { flex: 1, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10 },
  actMainText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14, marginLeft: 6 },
  iconBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 8, backgroundColor: '#FFFFFF' },
  // Voz
  voiceTip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 12, marginTop: 4, ...soft },
  voiceIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  voiceText: { color: colors.text, fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 },
});
