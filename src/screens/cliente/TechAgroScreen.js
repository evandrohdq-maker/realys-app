import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Photo, Badge, Row } from '../../components/ui';
import { SearchBar, GlobalResults } from '../../components/Search';
import { TECH_SEGMENTS, AGRO_SEGMENTS, sectorItems, agroQuotes, agroWeather, leafDiagnoses } from '../../techAgroData';

const GREEN = '#2E8B57';

const nq = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const priceText = (it) => (it.price == null ? 'Sob orçamento' : it.price === 0 ? 'Grátis' : `${brl(it.price)} / ${it.unit}`);

// Itens de uma aba: os do próprio setor + os "agro é tech" do outro setor.
function itemsFor(sector, seg, term) {
  return sectorItems
    .filter((it) => it.sector === sector || it.agrotech)
    .filter((it) => (seg === 'todos' ? it.sector === sector || it.agrotech : seg === 'agrotech' ? it.agrotech : it.sector === sector && it.seg === seg))
    .filter((it) => !term || nq(`${it.title} ${it.who} ${it.detail}`).includes(nq(term)))
    .sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
}

function useBuy(navigate) {
  const { state, dispatch } = useStore();
  return (it) => {
    if (it.go) return navigate && navigate(it.go);
    if (it.price == null) {
      return Alert.alert('Orçamento pedido', `${it.who} recebeu seu pedido e responde em Comunidade › Mensagens. (Na demonstração a resposta é simulada.)`);
    }
    if (it.price === 0) {
      dispatch({ type: 'SECTOR_ORDER', item: it });
      return Alert.alert('Inscrição feita', `Você está inscrito em "${it.title}". Acompanhe em Pedidos.`);
    }
    if (it.price > state.wallet) return Alert.alert('Saldo insuficiente', 'Adicione saldo Realys para continuar.');
    Alert.alert(it.cta, `${it.title}\n${it.who}\n\n${priceText(it)} com saldo Realys (pagamento protegido).`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => {
          dispatch({ type: 'SECTOR_ORDER', item: it });
          Alert.alert('Pronto!', 'Pedido feito, com NF-e emitida automaticamente. Acompanhe na aba Pedidos.');
        },
      },
    ]);
  };
}

function ItemCard({ it, onPress, otherLabel }) {
  return (
    <View style={styles.card}>
      <Photo uri={it.photo} style={styles.cardImg} fallback={it.icon} />
      <View style={{ padding: 12 }}>
        <Row style={{ flexWrap: 'wrap' }}>
          {it.sponsored ? <Badge label="Patrocinado" color={colors.sponsored} /> : null}
          {it.agrotech ? <Badge label={`Agro é tech · ${otherLabel(it)}`} color={GREEN} /> : null}
        </Row>
        <Text style={styles.cardTitle}>{it.icon} {it.title}</Text>
        <Text style={styles.who}>{it.who} · verificado</Text>
        <Text style={styles.detail}>{it.detail}</Text>
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={styles.price}>{priceText(it)}</Text>
          <TouchableOpacity style={styles.cta} onPress={() => onPress(it)} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{it.cta}</Text>
          </TouchableOpacity>
        </Row>
      </View>
    </View>
  );
}

function Segments({ list, value, onChange, tint }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
      {list.map((s) => {
        const on = s.key === value;
        const c = s.key === 'agrotech' ? GREEN : tint;
        return (
          <TouchableOpacity key={s.key} onPress={() => onChange(s.key)} style={[styles.chip, { borderColor: on ? c : colors.border }, on && { backgroundColor: c }]}>
            <Ionicons name={s.icon} size={14} color={on ? '#FFFFFF' : c} />
            <Text style={[styles.chipText, { color: on ? '#FFFFFF' : c }]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Faixa que liga uma aba à outra.
function Bridge({ text, button, onPress }) {
  return (
    <TouchableOpacity style={styles.bridge} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.bridgeIcon}>
        <Ionicons name="git-merge-outline" size={20} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bridgeTitle}>Agro é tech</Text>
        <Text style={styles.bridgeText}>{text}</Text>
      </View>
      <Text style={styles.bridgeBtn}>{button} ›</Text>
    </TouchableOpacity>
  );
}

function SectorList({ sector, seg, term, navigate, searched }) {
  const buy = useBuy(navigate);
  const list = itemsFor(sector, seg, term);
  const otherLabel = (it) => (it.sector === 'tech' ? 'Tecnologia' : 'Agro');
  if (!list.length) return searched ? <GlobalResults query={searched} navigate={navigate} /> : <Text style={styles.empty}>Nada aqui ainda.</Text>;
  return list.map((it) => <ItemCard key={it.id} it={it} onPress={buy} otherLabel={otherLabel} />);
}

// ───────────────────────── Tecnologia ─────────────────────────
export function TechScreen({ explore, navigate }) {
  const [seg, setSeg] = useState('todos');
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');
  useEffect(() => {
    if (explore && explore.tab === 'tecnologia') setSeg(explore.seg || 'todos');
  }, [explore]);

  return (
    <Screen>
      <Title sub="Inteligência artificial, robótica, apps e cursos de empresas verificadas">Tecnologia</Title>
      <SearchBar value={q} onChangeText={(t) => { setQ(t); if (!t) setSearched(''); }} onSubmit={setSearched} placeholder="Buscar IA, robô, app, curso…" voicePrompt="O que você procura em tecnologia?" />

      <View style={styles.hero}>
        <Ionicons name="sparkles" size={22} color={colors.accent} />
        <Text style={styles.heroText}>
          Empresas de tecnologia mostram soluções aqui e recebem pedidos direto no app. Quem desenvolve para o campo aparece também na aba Agro.
        </Text>
      </View>

      <Segments list={TECH_SEGMENTS} value={seg} onChange={setSeg} tint={colors.accent} />
      {seg !== 'agrotech' ? (
        <Bridge text="Drones, sensores, IA e robôs para a lavoura" button="Ver no Agro" onPress={() => navigate && navigate({ tab: 'agro', seg: 'agrotech' })} />
      ) : null}
      <SectorList sector="tech" seg={seg} term={q.trim()} navigate={navigate} searched={searched} />
    </Screen>
  );
}

// ───────────────────────── Agro ─────────────────────────
export function AgroScreen({ explore, navigate }) {
  const [seg, setSeg] = useState('todos');
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');
  useEffect(() => {
    if (explore && explore.tab === 'agro') setSeg(explore.seg || 'todos');
  }, [explore]);

  return (
    <Screen>
      <Title sub="Insumos, máquinas, agrônomos e venda direta do produtor">Agro</Title>
      <SearchBar value={q} onChangeText={(t) => { setQ(t); if (!t) setSearched(''); }} onSubmit={setSearched} placeholder="Buscar semente, trator, agrônomo…" voicePrompt="O que você procura no agro?" />

      <Row style={{ marginBottom: 12, alignItems: 'stretch' }}>
        <View style={[styles.box, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.boxKicker}>CLIMA · {agroWeather.place.split(' - ')[0]}</Text>
          <Text style={styles.boxBig}>{agroWeather.temp}°C</Text>
          <Text style={styles.boxSmall}>Chuva {agroWeather.rain}% · vento {agroWeather.wind} km/h</Text>
          <Text style={[styles.boxSmall, { color: GREEN, marginTop: 4 }]}>{agroWeather.tip}</Text>
        </View>
        <View style={[styles.box, { flex: 1.1 }]}>
          <Text style={styles.boxKicker}>COTAÇÕES (EXEMPLO)</Text>
          {agroQuotes.map((c) => (
            <Row key={c.key} style={{ justifyContent: 'space-between', marginTop: 3 }}>
              <Text style={styles.quoteName} numberOfLines={1}>{c.label}</Text>
              <Text style={styles.quoteVal}>
                {brl(c.value)} <Text style={{ color: c.change >= 0 ? colors.success : colors.danger }}>{c.change >= 0 ? '▲' : '▼'}{Math.abs(c.change).toFixed(1).replace('.', ',')}%</Text>
              </Text>
            </Row>
          ))}
        </View>
      </Row>

      <LeafDoctor navigate={navigate} />

      <Segments list={AGRO_SEGMENTS} value={seg} onChange={setSeg} tint={GREEN} />
      {seg !== 'agrotech' ? (
        <Bridge text="Apps, IA e robótica feitos para o campo" button="Ver em Tecnologia" onPress={() => navigate && navigate({ tab: 'tecnologia', seg: 'agrotech' })} />
      ) : null}
      <SectorList sector="agro" seg={seg} term={q.trim()} navigate={navigate} searched={searched} />

      <View style={styles.tipBox}>
        <Ionicons name="swap-horizontal-outline" size={18} color={GREEN} />
        <Text style={[styles.detail, { flex: 1, marginLeft: 8, marginTop: 0 }]}>
          Produtor com CNPJ ou MEI rural: venda a safra direto para empresas e receba propostas pela área empresarial (Negócios).
        </Text>
      </View>
    </Screen>
  );
}

// Diagnóstico da folha por IA (simulado): a tecnologia trabalhando para o agro.
function LeafDoctor({ navigate }) {
  const [step, setStep] = useState('idle'); // idle | busy | done
  const [res, setRes] = useState(null);
  const scan = () => {
    setStep('busy');
    setTimeout(() => {
      setRes(leafDiagnoses[Math.floor(Math.random() * leafDiagnoses.length)]);
      setStep('done');
    }, 1600);
  };
  return (
    <View style={styles.doctor}>
      <Row>
        <View style={[styles.bridgeIcon, { backgroundColor: 'rgba(47,116,208,0.1)' }]}>
          <Ionicons name="scan-outline" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Doutor da lavoura (IA)</Text>
          <Text style={styles.detail}>Fotografe a folha e a IA aponta a praga ou a doença provável.</Text>
        </View>
      </Row>
      {step === 'idle' ? (
        <TouchableOpacity style={[styles.cta, { alignSelf: 'stretch', alignItems: 'center', marginTop: 10, backgroundColor: GREEN }]} onPress={scan}>
          <Text style={styles.ctaText}>📷 Fotografar a folha</Text>
        </TouchableOpacity>
      ) : null}
      {step === 'busy' ? (
        <Row style={{ marginTop: 12 }}>
          <ActivityIndicator color={GREEN} />
          <Text style={[styles.detail, { marginLeft: 8, marginTop: 0 }]}>Analisando a imagem…</Text>
        </Row>
      ) : null}
      {step === 'done' && res ? (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.who}>{res.crop} · confiança {res.confidence}%</Text>
          <Text style={[styles.cardTitle, { color: colors.danger, marginTop: 2 }]}>Possível {res.problem.toLowerCase()}</Text>
          <Text style={styles.detail}>{res.advice}</Text>
          <Row style={{ marginTop: 10 }}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: GREEN, marginRight: 8 }]} onPress={() => navigate && navigate({ tab: 'servicos', service: 'agronomo' })}>
              <Text style={styles.ctaText}>Chamar agrônomo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.cardAlt }]} onPress={() => setStep('idle')}>
              <Text style={[styles.ctaText, { color: colors.text }]}>Nova foto</Text>
            </TouchableOpacity>
          </Row>
          <Text style={[styles.boxSmall, { marginTop: 8 }]}>Demonstração: o resultado é de exemplo e não substitui a avaliação de um agrônomo.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(47,116,208,0.07)', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(47,116,208,0.2)' },
  heroText: { flex: 1, marginLeft: 10, color: colors.text, fontSize: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, backgroundColor: '#FFFFFF', marginRight: 6 },
  chipText: { marginLeft: 5, fontWeight: '700', fontSize: 12 },
  bridge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46,139,87,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(46,139,87,0.3)', padding: 10, marginBottom: 12 },
  bridgeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(46,139,87,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  bridgeTitle: { color: GREEN, fontWeight: '800', fontSize: 14 },
  bridgeText: { color: colors.text, fontSize: 12, marginTop: 1 },
  bridgeBtn: { color: GREEN, fontWeight: '800', fontSize: 12, marginLeft: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden' },
  cardImg: { width: '100%', height: 130 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 2 },
  who: { color: colors.accent, fontWeight: '700', fontSize: 12, marginTop: 3 },
  detail: { color: colors.muted, fontSize: 13, marginTop: 4 },
  price: { color: colors.primary, fontWeight: '800', fontSize: 14, flex: 1 },
  cta: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', padding: 20 },
  box: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10 },
  boxKicker: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  boxBig: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  boxSmall: { color: colors.muted, fontSize: 11 },
  quoteName: { color: colors.text, fontSize: 12, fontWeight: '600', flex: 1 },
  quoteVal: { color: colors.text, fontSize: 12, fontWeight: '700' },
  doctor: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(47,116,208,0.25)', padding: 12, marginBottom: 12 },
  tipBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12, marginTop: 4 },
});
