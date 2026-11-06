import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useStore, myProducts } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, ProductThumb, Badge } from '../../components/ui';

export default function InventoryScreen() {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', cost: '', stock: '' });
  const products = myProducts(state);
  const totalValue = products.reduce((s, p) => s + p.cost * p.stock, 0);

  const save = () => {
    const price = parseFloat(form.price.replace(',', '.'));
    const cost = parseFloat(form.cost.replace(',', '.'));
    const stock = parseInt(form.stock, 10);
    if (!form.name || isNaN(price) || isNaN(stock)) return Alert.alert('Preencha nome, preço e quantidade.');
    dispatch({ type: 'ADD_PRODUCT', product: { name: form.name, price, cost: isNaN(cost) ? price * 0.7 : cost, stock } });
    setForm({ name: '', price: '', cost: '', stock: '' });
    setAdding(false);
  };

  return (
    <Screen>
      <Title sub={`${products.length} produtos · ${brl(totalValue)} em estoque (custo)`}>Estoque</Title>

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13 }}>
          🔗 Ligado à sua vitrine: cada venda no app baixa o estoque sozinha e emite a nota fiscal (NF-e). Produto zerado
          aparece como "Esgotado" para o cliente. Toque em "Lançar no Shop" para mostrar um produto novo no topo da loja.
        </Text>
      </Card>

      {adding ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Novo produto</Text>
          <Button small variant="light" title="📷 Ler código de barras (em breve)" onPress={() => Alert.alert('Em breve', 'A leitura pela câmera entra na próxima versão.')} style={{ marginBottom: 10 }} />
          <Input placeholder="Nome do produto" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
          <Row>
            <Input placeholder="Preço R$" keyboardType="decimal-pad" value={form.price} onChangeText={(price) => setForm({ ...form, price })} style={{ flex: 1, marginRight: 6 }} />
            <Input placeholder="Custo R$" keyboardType="decimal-pad" value={form.cost} onChangeText={(cost) => setForm({ ...form, cost })} style={{ flex: 1, marginLeft: 6 }} />
          </Row>
          <Input placeholder="Quantidade" keyboardType="number-pad" value={form.stock} onChangeText={(stock) => setForm({ ...form, stock })} />
          <Row>
            <Button title="Salvar" onPress={save} style={{ flex: 1, marginRight: 6 }} />
            <Button title="Cancelar" variant="outline" onPress={() => setAdding(false)} style={{ flex: 1, marginLeft: 6 }} />
          </Row>
        </Card>
      ) : (
        <Button title="+ Cadastrar produto" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      )}

      {products.map((p) => {
        const low = p.stock <= p.minStock;
        return (
          <Card key={p.id}>
            <Row>
              <ProductThumb product={p} size={52} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Venda {brl(p.price)} · Custo {brl(p.cost)}
                </Text>
                <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {p.launch ? <Badge label="Lançamento" color={colors.accent} /> : null}
                  {p.stock === 0 ? (
                    <Badge label="Esgotado" color={colors.danger} />
                  ) : low ? (
                    <Badge label={`Estoque baixo (mín. ${p.minStock})`} color={colors.accent} />
                  ) : (
                    <Badge label="Estoque ok" color={colors.success} />
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Row>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch({ type: 'UPDATE_STOCK', id: p.id, delta: -1 })}>
                    <Text style={styles.qtyTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.qty, { color: colors.text }]}>{p.stock}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch({ type: 'UPDATE_STOCK', id: p.id, delta: 1 })}>
                    <Text style={styles.qtyTxt}>+</Text>
                  </TouchableOpacity>
                </Row>
                <TouchableOpacity onPress={() => dispatch({ type: 'COUNTER_SALE', id: p.id })}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Venda no balcão</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    dispatch({ type: 'TOGGLE_LAUNCH', id: p.id });
                    if (!p.launch) Alert.alert('Lançamento publicado 🚀', `${p.name} agora aparece em Lançamentos, no topo do Shop dos clientes.`);
                  }}
                >
                  <Text style={{ color: p.launch ? colors.danger : colors.accent, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                    {p.launch ? 'Tirar dos lançamentos' : '🚀 Lançar no Shop'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyTxt: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  qty: { width: 36, textAlign: 'center', fontWeight: '700', fontSize: 16 },
});
