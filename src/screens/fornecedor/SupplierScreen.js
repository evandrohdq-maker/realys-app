import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../../store';
import { MY_SUPPLIER_ID } from '../../data';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, Badge, Section, Stat, Empty } from '../../components/ui';
import { STATUS_COLOR } from '../empresa/B2BScreen';

export default function SupplierScreen() {
  const { state, dispatch } = useStore();
  const [counter, setCounter] = useState({});
  const myItems = state.supplierItems.filter((i) => i.supplierId === MY_SUPPLIER_ID);
  const incoming = state.proposals.filter((p) => myItems.some((i) => i.id === p.itemId));
  const closed = incoming
    .filter((p) => p.status === 'aceita')
    .reduce((s, p) => {
      const i = myItems.find((x) => x.id === p.itemId);
      return s + p.qty * i.unitPrice * (1 - p.discount / 100);
    }, 0);

  return (
    <Screen>
      <Title sub="Distribuidora Real Alimentos · atacado B2B">Painel do fornecedor</Title>

      <Row style={{ marginHorizontal: -4, marginBottom: 14 }}>
        <Stat label="Negócios fechados" value={brl(closed)} color={colors.success} />
        <Stat label="Propostas pendentes" value={String(incoming.filter((p) => p.status === 'pendente').length)} color={colors.accent} />
      </Row>

      <Section title="Propostas recebidas">
        {!incoming.length ? <Empty text="Nenhuma proposta ainda." /> : null}
        {incoming.map((p) => {
          const item = myItems.find((i) => i.id === p.itemId);
          const total = p.qty * item.unitPrice * (1 - p.discount / 100);
          return (
            <Card key={p.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', flex: 1 }}>{p.buyer}</Text>
                <Badge label={p.status} color={STATUS_COLOR[p.status]} />
              </Row>
              <Text style={{ marginTop: 4 }}>
                {p.qty}× {item.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Pede {p.discount}% de desconto · total {brl(total)} · {p.createdAt}
              </Text>
              {p.status === 'pendente' ? (
                <View style={{ marginTop: 10 }}>
                  <Row>
                    <Button small title="Aceitar" onPress={() => dispatch({ type: 'SUPPLIER_RESPOND', id: p.id, answer: 'aceitar' })} style={{ marginRight: 6 }} />
                    <Button small variant="danger" title="Recusar" onPress={() => dispatch({ type: 'SUPPLIER_RESPOND', id: p.id, answer: 'recusar' })} />
                  </Row>
                  <Row style={{ marginTop: 8 }}>
                    <Input
                      placeholder="Contraproposta %"
                      keyboardType="decimal-pad"
                      value={counter[p.id] || ''}
                      onChangeText={(v) => setCounter({ ...counter, [p.id]: v })}
                      style={{ flex: 1, marginBottom: 0, marginRight: 6 }}
                    />
                    <Button
                      small
                      variant="outline"
                      title="Enviar"
                      onPress={() => {
                        const c = parseFloat((counter[p.id] || '').replace(',', '.'));
                        if (!isNaN(c)) dispatch({ type: 'SUPPLIER_RESPOND', id: p.id, answer: 'contra', counter: c });
                      }}
                    />
                  </Row>
                </View>
              ) : null}
              {p.status === 'contraproposta' ? (
                <Text style={{ color: colors.sponsored, marginTop: 6, fontWeight: '600' }}>
                  Você ofereceu {p.counter}%. Aguardando o comprador.
                </Text>
              ) : null}
            </Card>
          );
        })}
      </Section>

      <Section title="Meu catálogo atacado">
        {myItems.map((i) => (
          <Card key={i.id}>
            <Row>
              <Text style={{ fontSize: 28, marginRight: 10 }}>{i.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{i.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>
                  {brl(i.unitPrice)} /un. · mín. {i.minQty}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {i.tiers.map((t) => `${t.off}% acima de ${t.qty}`).join(' · ')}
                </Text>
              </View>
            </Row>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
