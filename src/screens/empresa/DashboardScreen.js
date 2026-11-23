import React, { useState } from 'react';
import { UnmetProducts, IntelPanel } from '../../components/Engage';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Text } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore, myProducts } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Stat, BarChart, Section, ProductThumb, Badge, PainelHeader } from '../../components/ui';
import { ALL_ADS, shortNum } from '../../adsData';
import { MY_COMPANY_ID } from '../../data';
import PlanoLojaCard from '../../components/PlanoLojaCard';
import ServerShopOrders from '../../components/ServerShopOrders';
import { CargasLoja, OfertasFornecedor } from '../../components/Logistica';
import ServerEventsPanel from '../../components/ServerEventsPanel';
import AtendenteIA from '../../components/AtendenteIA';
import { ReelComposer } from '../StoriesScreen';

export default function DashboardScreen({ goTo, navigate }) {
  const [reeling, setReeling] = useState(false);
  const { state, dispatch } = useStore();
  const products = myProducts(state);
  const week = state.salesByDay.reduce((s, d) => s + d.value, 0);
  const todayValue = state.salesByDay[state.salesByDay.length - 1].value;
  const avgTicket = 38.6;
  const low = products.filter((p) => p.stock <= p.minStock);
  const best = [...products]
    .map((p) => ({ ...p, margin: p.price - p.cost }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 3);
  const entradas = state.finance.filter((f) => f.type === 'entrada').reduce((s, f) => s + f.value, 0);
  const saidas = state.finance.filter((f) => f.type === 'saida').reduce((s, f) => s + f.value, 0);

  return (
    <Screen>
      <PainelHeader
        title="Painel da empresa"
        sub={`Mercadinho Bom Preço · CNPJ ${state.user.cnpj}`}
        stats={[
          { label: 'Vendas hoje', value: brl(todayValue) },
          { label: 'Últimos 7 dias', value: brl(week) },
          { label: 'Ticket médio', value: brl(avgTicket) },
          { label: 'Saldo do período', value: brl(entradas - saidas) },
        ]}
      />

      <PlanoLojaCard />

      {/* Pedidos de clientes de verdade, pelo servidor do Realyz. */}
      <ServerShopOrders />
      <CargasLoja />
      <OfertasFornecedor />
      <ServerEventsPanel />
      <AtendenteIA />

      {/* Atalhos em bolinhas (visual clean): Hub de Negócios, anúncios, reel de anúncio e presentear clientes. */}
      <View style={dash.atalhos}>
        {[
          { icon: 'headset-outline', label: 'Hub', go: () => (navigate ? navigate({ tab: 'salas' }) : goTo && goTo('salas')) },
          { icon: 'megaphone-outline', label: 'Anúncios', go: () => (navigate ? navigate({ tab: 'anuncie' }) : goTo && goTo('anuncie')) },
          { icon: 'film-outline', label: 'Reel', go: () => setReeling(true) },
          { icon: 'gift-outline', label: 'Presentear', go: () => dispatch({ type: 'OPEN_GIFT', asCompany: true }) },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={dash.atalho} onPress={a.go} activeOpacity={0.8} accessibilityLabel={a.label}>
            <View style={dash.bola}>
              <Ionicons name={a.icon} size={22} color={colors.onNavy} />
            </View>
            <Text numberOfLines={1} style={dash.atalhoTxt}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ReelComposer
        visible={reeling}
        onClose={() => setReeling(false)}
        onPublish={(reel) => {
          setReeling(false);
          dispatch({ type: 'PUBLISH_REEL', reel: { ...reel, ad: true, user: 'Mercadinho Bom Preço' } });
          Alert.alert('Reel de anúncio publicado ✅', 'Ele aparece nos Reels do Realyz com a marca da sua empresa.');
        }}
      />

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>Faturamento por dia</Text>
        <BarChart data={state.salesByDay} format={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v))} />
      </Card>

      <Card style={{ backgroundColor: '#FFF4DC', borderColor: '#E9CF95' }}>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>🤖 Lotus · assistente do Realyz</Text>
        {low.map((p) => (
          <Text key={p.id} style={{ color: colors.text, marginBottom: 4 }}>
            • Seu estoque de <Text style={{ fontWeight: '700' }}>{p.name}</Text> está baixo ({p.stock} un.). Veja ofertas de
            fornecedores na aba Negócios.
          </Text>
        ))}
        <Text style={{ color: colors.text, marginBottom: 4 }}>• Sábado é seu dia de pico. Que tal um vídeo patrocinado na sexta?</Text>
        <Text style={{ color: colors.text }}>• O vídeo patrocinado de 01/11 trouxe 23 vendas (retorno de 12× o valor pago).</Text>
      </Card>

      <AdsPerformance />

      <UnmetProducts onAdd={goTo ? () => goTo('estoque') : null} />
      <IntelPanel />

      <Section title="Produtos com maior lucro">
        {best.map((p) => (
          <Card key={p.id}>
            <Row>
              <ProductThumb product={p} size={46} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Custo {brl(p.cost)} · Venda {brl(p.price)}
                </Text>
              </View>
              <Badge label={`+${Math.round(((p.price - p.cost) / p.price) * 100)}%`} color={colors.success} />
            </Row>
          </Card>
        ))}
      </Section>

      <Section title="Horários de pico">
        <Card>
          <BarChart
            height={100}
            data={[
              { label: '8h', value: 12 },
              { label: '10h', value: 28 },
              { label: '12h', value: 41 },
              { label: '14h', value: 22 },
              { label: '16h', value: 30 },
              { label: '18h', value: 55 },
              { label: '20h', value: 34 },
            ]}
          />
        </Card>
      </Section>
    </Screen>
  );
}

// Desempenho da publicidade paga da minha empresa no Shop e no Food (vitrine e clipes).
// Números da demonstração + o que os clientes fizeram nesta sessão.
function AdsPerformance() {
  const { state } = useStore();
  const ads = ALL_ADS.filter((a) => a.storeId === MY_COMPANY_ID);
  if (!ads.length) return null;
  const base = (a) => (a.views ? { views: a.views, taps: Math.round(a.views * 0.06), watched: Math.round(a.views * 0.41) } : { views: 3180, taps: 214, watched: 0 });
  const rows = ads.map((a) => {
    const b = base(a);
    const live = state.adStats[a.id] || {};
    return { ...a, views: b.views + (live.views || 0), taps: b.taps + (live.taps || 0), watched: b.watched + (live.watched || 0), clip: !!a.views };
  });
  return (
    <Section title="Publicidade paga">
      {rows.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{r.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{r.format}</Text>
            </View>
            <Badge label="No ar" color={colors.success} />
          </Row>
          <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <Metric label="Visualizações" value={shortNum(r.views)} />
            <Metric label={r.clip ? 'Assistiram tudo' : 'Toques'} value={shortNum(r.clip ? r.watched : r.taps)} />
            <Metric label="Cliques" value={`${((r.taps / Math.max(1, r.views)) * 100).toFixed(1).replace('.', ',')}%`} />
          </Row>
        </Card>
      ))}
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
        Clientes ganham pontos Realyz ao assistir seus clipes até o fim: mais atenção no seu produto.
      </Text>
    </Section>
  );
}

function Metric({ label, value }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const dash = StyleSheet.create({
  atalhos: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14, marginTop: 2 },
  atalho: { alignItems: 'center', width: 72 },
  bola: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  atalhoTxt: { color: colors.text, fontSize: 12, marginTop: 5, fontWeight: '600' },
});
