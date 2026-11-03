import React from 'react';
import { View, Text } from 'react-native';
import { useStore, myProducts } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Stat, BarChart, Section, ProductThumb, Badge } from '../../components/ui';

export default function DashboardScreen() {
  const { state } = useStore();
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
      <Title sub={`Mercadinho Bom Preço · CNPJ ${state.user.cnpj}`}>Painel da empresa</Title>

      <Row style={{ marginHorizontal: -4, marginBottom: 8 }}>
        <Stat label="Vendas hoje" value={brl(todayValue)} color={colors.primary} />
        <Stat label="Últimos 7 dias" value={brl(week)} />
      </Row>
      <Row style={{ marginHorizontal: -4, marginBottom: 16 }}>
        <Stat label="Ticket médio" value={brl(avgTicket)} />
        <Stat label="Saldo do período" value={brl(entradas - saidas)} color={entradas - saidas >= 0 ? colors.success : colors.danger} />
      </Row>

      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 10 }}>Faturamento por dia</Text>
        <BarChart data={state.salesByDay} format={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v))} />
      </Card>

      <Card style={{ backgroundColor: '#FFF8E8', borderColor: '#F7D58A' }}>
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>🤖 Assistente Realys</Text>
        {low.map((p) => (
          <Text key={p.id} style={{ color: colors.text, marginBottom: 4 }}>
            • Seu estoque de <Text style={{ fontWeight: '700' }}>{p.name}</Text> está baixo ({p.stock} un.). Veja ofertas de
            fornecedores na aba Negócios.
          </Text>
        ))}
        <Text style={{ color: colors.text, marginBottom: 4 }}>• Sábado é seu dia de pico. Que tal um vídeo patrocinado na sexta?</Text>
        <Text style={{ color: colors.text }}>• O vídeo patrocinado de 01/11 trouxe 23 vendas (retorno de 12× o valor pago).</Text>
      </Card>

      <Section title="Produtos com maior lucro">
        {best.map((p) => (
          <Card key={p.id}>
            <Row>
              <ProductThumb product={p} size={46} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: '700' }}>{p.name}</Text>
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
