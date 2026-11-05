import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Badge, Empty, Photo } from '../../components/ui';
import { providerTarget } from '../../components/GiftSheet';

const STEPS = ['Pagamento protegido', 'Preparando', 'A caminho', 'Entregue'];

// Motoboy cadastrado no Realys que o restaurante chamou para a entrega. O cliente pode dar gorjeta
// em créditos de presente (sai do saldo, com a taxa do Realys).
function CourierCard({ order: o }) {
  const { state, dispatch } = useStore();
  const p = (state.providers || []).find((x) => x.id === o.courierId) || (state.providers || []).find((x) => x.name === o.courier);
  const tipped = state.gifts.some((g) => g.dir === 'enviado' && g.to.tip && g.to.orderId === o.id);
  return (
    <View style={styles.courier}>
      <Photo uri={p && p.photo} style={styles.courierPhoto} fallback="🛵" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>🛵 {o.courier}{p ? ` · ★ ${String(p.rating).replace('.', ',')}` : ''}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
          {p ? `${p.vehicle} · ${p.plate}` : 'Motoboy do Realys'}
          {o.requestedBy ? ` · chamado por ${o.requestedBy}` : ''}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{o.status === 'Entregue' ? 'Entrega concluída' : o.status === 'A caminho' ? 'A caminho com o seu pedido' : 'Aguardando o pedido ficar pronto'}</Text>
      </View>
      {p ? (
        <TouchableOpacity
          style={[styles.tipBtn, tipped && { backgroundColor: colors.success, borderColor: colors.success }]}
          onPress={() => dispatch({ type: 'OPEN_GIFT', to: { ...providerTarget(p), tip: true, orderId: o.id } })}
          accessibilityLabel={`Dar gorjeta para ${o.courier}`}
        >
          <Ionicons name={tipped ? 'checkmark' : 'gift-outline'} size={14} color={tipped ? '#FFFFFF' : '#0B1124'} />
          <Text style={[styles.tipText, tipped && { color: '#FFFFFF' }]}>{tipped ? 'Gorjeta dada' : 'Gorjeta'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

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
              <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{o.store}</Text>
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
            {o.nfe ? (
              <Text style={{ marginTop: 8, color: colors.success, fontSize: 12, fontWeight: '700' }}>🧾 NF-e nº {o.nfe} emitida automaticamente</Text>
            ) : null}
            {o.courier ? <CourierCard order={o} /> : null}
            {o.promoOff ? <Text style={{ marginTop: 6, color: colors.success, fontSize: 12, fontWeight: '700' }}>🏷️ Crédito de parceiro usado: − {brl(o.promoOff)}</Text> : null}
            <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontWeight: '800', color: colors.primary }}>{brl(o.total)}</Text>
              {o.status === 'Entregue' ? (
                o.rated ? (
                  <Badge label="Avaliado ⭐" color={colors.success} />
                ) : (
                  <Button small title="Avaliar pedido" onPress={() => dispatch({ type: 'OPEN_RATE', kind: 'pedido', refId: o.id })} />
                )
              ) : null}
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

const styles = StyleSheet.create({
  courier: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 10, marginTop: 10 },
  courierPhoto: { width: 44, height: 44, borderRadius: 22 },
  tipBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2B649', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#E2B649', marginLeft: 8 },
  tipText: { color: '#0B1124', fontWeight: '900', fontSize: 12, marginLeft: 4 },
});
