import React from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Badge, Empty } from '../../components/ui';

const STEPS = ['Pagamento protegido', 'Preparando', 'A caminho', 'Entregue'];

export default function OrdersScreen() {
  const { state, dispatch } = useStore();
  return (
    <Screen>
      <Title sub="Pagamento só é liberado para a loja quando você confirma a entrega">Meus pedidos</Title>
      {!state.orders.length ? <Empty text="Nenhum pedido ainda." /> : null}
      {state.orders.map((o) => {
        const idx = STEPS.indexOf(o.status);
        return (
          <Card key={o.id}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontWeight: '800', flex: 1 }}>{o.store}</Text>
              <Badge label={o.status} color={o.status === 'Entregue' ? colors.success : colors.accent} />
            </Row>
            {o.items.map((i) => (
              <Text key={i.name} style={{ color: colors.muted }}>
                {i.qty}× {i.name}
              </Text>
            ))}
            <Row style={{ marginTop: 10 }}>
              {STEPS.map((s, i) => (
                <View
                  key={s}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    marginRight: 4,
                    backgroundColor: i <= idx ? colors.primary : colors.border,
                  }}
                />
              ))}
            </Row>
            {o.courier && o.status !== 'Entregue' ? (
              <Text style={{ marginTop: 8, color: colors.text }}>🛵 Entregador: {o.courier}</Text>
            ) : null}
            <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontWeight: '800', color: colors.primary }}>{brl(o.total)}</Text>
              {o.status !== 'Entregue' ? (
                <Button
                  small
                  variant="light"
                  title={o.status === 'A caminho' ? 'Confirmar entrega' : 'Simular próximo passo'}
                  onPress={() => dispatch({ type: 'ADVANCE_ORDER', id: o.id })}
                />
              ) : null}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
