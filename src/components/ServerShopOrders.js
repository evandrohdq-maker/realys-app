// Painel da empresa: pedidos que chegaram pelo servidor do Realyz (clientes de verdade).
// A loja avança o status (Preparando → A caminho → Entregue) ou cancela, e o cliente vê na hora.
// Mudar um pedido pede a confirmação do rosto (quando o servidor exige).
import React, { useEffect, useState, useCallback } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { Text } from '../responsive';
import { useStore } from '../store';
import { api } from '../api';
import { colors, brl } from '../theme';
import { Card, Row, Button, Badge } from './ui';
import FaceCheck from './FaceCheck';
import { ChamarEntregador } from './Logistica';
import { conectado, carregarCarteira } from '../serverShop';

const NEXT = { Recebido: 'Preparando', Preparando: 'A caminho', 'A caminho': 'Entregue' };
const LABEL = { Preparando: 'Aceitar e preparar', 'A caminho': 'Saiu para entrega', Entregue: 'Marcar entregue' };

export default function ServerShopOrders() {
  const { state, dispatch } = useStore();
  const [list, setList] = useState(null);
  const [face, setFace] = useState(null); // { id, status }
  const on = conectado(state) && (state.user.roles || []).includes('empresa');

  const load = useCallback(() => {
    api('GET', '/companies/me/orders').then(setList).catch(() => setList([]));
  }, []);
  useEffect(() => {
    if (!on) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [on, state.orders.length]);

  if (!on) return null;

  const mudar = async (id, status) => {
    try {
      await api('PATCH', `/orders/${id}`, { status });
      load();
      carregarCarteira(dispatch).catch(() => {});
    } catch (e) {
      if (e.code === 'verificacao_facial') return setFace({ id, status });
      Alert.alert('Pedido não atualizado', e.message);
    }
  };
  const cancelar = (o) =>
    Alert.alert('Cancelar pedido?', `O cliente recebe de volta ${brl(o.total + (o.protection || 0))}, e o estoque volta.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: () => mudar(o.id, 'Cancelado') },
    ]);

  const abertos = (list || []).filter((o) => o.status !== 'Entregue' && o.status !== 'Cancelado');
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontWeight: '800', color: colors.text }}>🛍️ Pedidos do Realyz</Text>
        <TouchableOpacity onPress={load} accessibilityLabel="Atualizar pedidos">
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Atualizar</Text>
        </TouchableOpacity>
      </Row>
      {list === null ? <Text style={{ color: colors.muted }}>Carregando…</Text> : null}
      {list && !list.length ? <Text style={{ color: colors.muted }}>Nenhum pedido ainda. Os produtos que você publica aparecem no Shop e no Food para todos.</Text> : null}
      {(list || []).slice(0, 20).map((o) => (
        <View key={o.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{o.buyer}</Text>
            <Badge label={o.status} color={o.status === 'Cancelado' ? colors.danger : o.status === 'Entregue' ? colors.success : colors.primary} />
          </Row>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
            {o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}{o.address ? ` · ${o.address}` : ''}
          </Text>
          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>{brl(o.total)}</Text>
          {o.status !== 'Cancelado' && o.status !== 'Entregue' ? <ChamarEntregador order={o} /> : null}
          {NEXT[o.status] ? (
            <Row style={{ marginTop: 6 }}>
              <Button small title={LABEL[NEXT[o.status]]} onPress={() => mudar(o.id, NEXT[o.status])} />
              <View style={{ width: 8 }} />
              <Button small variant="light" title="Cancelar" onPress={() => cancelar(o)} />
            </Row>
          ) : null}
        </View>
      ))}
      {abertos.length ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{abertos.length} em andamento</Text> : null}
      <FaceCheck
        visible={!!face}
        purpose="venda"
        refId={face && face.id}
        title="Confirme seu rosto para mudar o pedido"
        onDone={(ok) => {
          const f = face;
          setFace(null);
          if (ok && f) mudar(f.id, f.status);
        }}
        onClose={() => setFace(null)}
      />
    </Card>
  );
}
