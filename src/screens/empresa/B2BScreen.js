import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { useStore } from '../../store';
import { MY_COMPANY_ID } from '../../data';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, Badge, Section } from '../../components/ui';

export const STATUS_COLOR = {
  pendente: colors.accent,
  aceita: colors.success,
  recusada: colors.danger,
  contraproposta: colors.sponsored,
};

export const autoDiscount = (item, qty) =>
  item.tiers.reduce((best, t) => (qty >= t.qty && t.off > best ? t.off : best), 0);

export default function B2BScreen() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(null);
  const [qty, setQty] = useState('');
  const [disc, setDisc] = useState('');
  const [counter, setCounter] = useState({});
  const offers = state.offers.filter((o) => o.companyId === MY_COMPANY_ID);
  const catalog = [...state.supplierItems].sort((a, b) => !!b.featured - !!a.featured);

  const send = (item) => {
    const q = parseInt(qty, 10);
    const d = parseFloat((disc || '0').replace(',', '.'));
    if (isNaN(q) || q < item.minQty) return Alert.alert(`Pedido mínimo: ${item.minQty} unidades.`);
    dispatch({ type: 'SEND_PROPOSAL', itemId: item.id, qty: q, discount: isNaN(d) ? 0 : d });
    setOpen(null);
    setQty('');
    setDisc('');
    Alert.alert('Proposta enviada', 'O fornecedor vai responder por aqui. (Na demonstração, troque para o perfil Fornecedor para responder.)');
  };

  return (
    <Screen>
      <Title sub="Compre no atacado e negocie descontos com empresas verificadas">Negócios Realys</Title>

      <Section title="Propostas de fornecedores">
        {!offers.length ? <Text style={{ color: colors.muted, marginBottom: 8 }}>Nenhuma proposta recebida.</Text> : null}
        {offers.map((o) => {
          const item = state.supplierItems.find((i) => i.id === o.itemId);
          const sup = state.suppliers.find((x) => x.id === item.supplierId);
          const unit = item.unitPrice * (1 - o.discount / 100);
          return (
            <Card key={o.id} style={o.status === 'pendente' ? { borderColor: 'rgba(226,182,73,0.8)', borderWidth: 1.5 } : null}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
                  {sup.logo} {sup.name} <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {sup.rating}</Text>
                </Text>
                <Badge label={o.status} color={STATUS_COLOR[o.status]} />
              </Row>
              <Text style={{ color: colors.text, marginTop: 4 }}>
                {o.qty}× {item.emoji} {item.name}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 2 }}>
                {brl(unit)}/un. ({o.discount}% off) · total {brl(o.qty * unit)}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Válida até {o.validUntil} · {o.createdAt}</Text>
              {o.note ? <Text style={{ color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>“{o.note}”</Text> : null}
              {o.status === 'pendente' ? (
                <View style={{ marginTop: 10 }}>
                  <Row>
                    <Button small title="Aceitar" style={{ marginRight: 6 }} onPress={() => dispatch({ type: 'COMPANY_RESPOND_OFFER', id: o.id, answer: 'aceitar' })} />
                    <Button small variant="danger" title="Recusar" onPress={() => dispatch({ type: 'COMPANY_RESPOND_OFFER', id: o.id, answer: 'recusar' })} />
                  </Row>
                  <Row style={{ marginTop: 8 }}>
                    <Input
                      placeholder="Pedir outro desconto %"
                      keyboardType="decimal-pad"
                      value={counter[o.id] || ''}
                      onChangeText={(v) => setCounter({ ...counter, [o.id]: v })}
                      style={{ flex: 1, marginBottom: 0, marginRight: 6 }}
                    />
                    <Button
                      small
                      variant="outline"
                      title="Enviar"
                      onPress={() => {
                        const c = parseFloat((counter[o.id] || '').replace(',', '.'));
                        if (!isNaN(c)) dispatch({ type: 'COMPANY_RESPOND_OFFER', id: o.id, answer: 'contra', counter: c });
                      }}
                    />
                  </Row>
                </View>
              ) : null}
              {o.status === 'contraproposta' ? (
                <Text style={{ color: colors.sponsored, marginTop: 6, fontWeight: '600' }}>Você pediu {o.counter}%. Aguardando o fornecedor.</Text>
              ) : null}
              {o.status === 'aceita' ? (
                <Text style={{ fontSize: 12, color: colors.success, marginTop: 4 }}>✓ Entrou no seu estoque e no contas a pagar. Pagamento retido até a entrega.</Text>
              ) : null}
            </Card>
          );
        })}
      </Section>

      <Card style={{ backgroundColor: '#EFEAFF', borderColor: '#CFC6FF' }}>
        <Text style={{ fontWeight: '800', color: colors.sponsored }}>🤝 Compra coletiva aberta</Text>
        <Text style={{ marginTop: 4, color: colors.text, fontSize: 13 }}>
          7 mercados da sua região estão juntando pedido de Óleo de Soja 900ml para pagar preço de atacado: 380 de 500
          unidades.
        </Text>
        <View style={{ height: 8, backgroundColor: colors.cardAlt, borderRadius: 4, marginVertical: 10 }}>
          <View style={{ width: '76%', height: 8, backgroundColor: colors.sponsored, borderRadius: 4 }} />
        </View>
        <Button small title="Participar" variant="dark" onPress={() => Alert.alert('Você entrou na compra coletiva!')} />
      </Card>

      <Card style={{ backgroundColor: '#FFF4DC', borderColor: '#E9CF95' }}>
        <Text style={{ fontSize: 13, color: colors.text }}>
          🤖 Você paga {brl(6.1)} no Feijão Carioca. A Distribuidora Real Alimentos, a 92 km, vende por {brl(5.6)} e dá até
          10% em volume.
        </Text>
      </Card>

      <Section title="Catálogo atacado">
        {catalog.map((item) => {
          const sup = state.suppliers.find((s) => s.id === item.supplierId);
          const q = parseInt(qty, 10);
          const auto = open === item.id && !isNaN(q) ? autoDiscount(item, q) : 0;
          return (
            <Card key={item.id}>
              <TouchableOpacity onPress={() => setOpen(open === item.id ? null : item.id)}>
                <Row>
                  <Text style={{ color: colors.text, fontSize: 30, marginRight: 10 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Row>
                      <Text style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }}>{item.name}</Text>
                      {item.featured ? (
                        <View style={{ marginLeft: 6 }}>
                          <Badge label="★ Destaque" color={colors.primary} />
                        </View>
                      ) : null}
                    </Row>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {sup.logo} {sup.name} · <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {sup.rating}</Text>
                    </Text>
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>
                      {brl(item.unitPrice)} /un. · mín. {item.minQty}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {item.tiers.length ? '' : 'Preço único'}{item.tiers.map((t) => `${t.off}% acima de ${t.qty}`).join(' · ')}
                    </Text>
                  </View>
                </Row>
              </TouchableOpacity>
              {open === item.id ? (
                <View style={{ marginTop: 10 }}>
                  <Row>
                    <Input placeholder="Quantidade" keyboardType="number-pad" value={qty} onChangeText={setQty} style={{ flex: 1, marginRight: 6 }} />
                    <Input placeholder="Desconto %" keyboardType="decimal-pad" value={disc} onChangeText={setDisc} style={{ flex: 1, marginLeft: 6 }} />
                  </Row>
                  {auto ? (
                    <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 8 }}>
                      Desconto automático por volume: {auto}%
                    </Text>
                  ) : null}
                  <Button title="Enviar proposta" onPress={() => send(item)} />
                </View>
              ) : null}
            </Card>
          );
        })}
      </Section>

      <Section title="Minhas propostas">
        {state.proposals.map((p) => {
          const item = state.supplierItems.find((i) => i.id === p.itemId);
          const total = p.qty * item.unitPrice * (1 - (p.status === 'contraproposta' ? p.counter : p.discount) / 100);
          return (
            <Card key={p.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
                  {p.qty}× {item.name}
                </Text>
                <Badge label={p.status} color={STATUS_COLOR[p.status]} />
              </Row>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                Pedido: {p.discount}% de desconto · {p.createdAt}
              </Text>
              {p.status === 'contraproposta' ? (
                <>
                  <Text style={{ marginTop: 6, color: colors.sponsored, fontWeight: '700' }}>
                    Fornecedor ofereceu {p.counter}% · total {brl(total)}
                  </Text>
                  <Button small title="Aceitar contraproposta" style={{ marginTop: 8 }} onPress={() => dispatch({ type: 'BUYER_ACCEPT_COUNTER', id: p.id })} />
                </>
              ) : (
                <Text style={{ color: colors.text, marginTop: 6, fontWeight: '700' }}>Total: {brl(total)}</Text>
              )}
              {p.status === 'aceita' ? (
                <Text style={{ fontSize: 12, color: colors.success, marginTop: 4 }}>
                  ✓ Entrou no seu estoque e no contas a pagar. Pagamento retido até a entrega.
                </Text>
              ) : null}
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}
