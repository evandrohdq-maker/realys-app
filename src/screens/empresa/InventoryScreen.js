import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useStore, myProducts } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, ProductThumb, Badge } from '../../components/ui';
import ProductForm from './ProductForm';
import { BoostButton } from '../../components/Boost';
import { SHOP_SECTORS } from '../../shopSectorsData';

export default function InventoryScreen() {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const products = myProducts(state);
  const totalValue = products.reduce((s, p) => s + p.cost * p.stock, 0);

  // Produto novo publicado: vai para a página da loja e para o Shop, no setor que o Realys classificou.
  const save = (product) => {
    dispatch({ type: 'ADD_PRODUCT', product });
    setAdding(false);
    const sec = SHOP_SECTORS[product.sector];
    Alert.alert('Produto publicado ✅', `${product.name} já está na sua página e no Shop, em ${sec ? sec.title : 'Shop'}.`);
  };

  return (
    <Screen>
      <Title sub={`${products.length} produtos · ${brl(totalValue)} em estoque (custo)`}>Estoque</Title>
      <BoostButton target="produto" label="Boost nos seus produtos" hint="Destaque no Shop e nas buscas, com pontos ou saldo. Anúncios de 30 s também." />

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13 }}>
          🔗 Ligado à sua vitrine: cada venda no app baixa o estoque sozinha e emite a nota fiscal (NF-e). Produto zerado
          aparece como "Esgotado" para o cliente. Toque em "Lançar no Shop" para mostrar um produto novo no topo da loja.
        </Text>
      </Card>

      {adding ? (
        <ProductForm onSave={save} onCancel={() => setAdding(false)} />
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
                {p.sector && SHOP_SECTORS[p.sector] ? (
                  <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>
                    No Shop: {SHOP_SECTORS[p.sector].title} › {(SHOP_SECTORS[p.sector].groups.find((g) => g.key === p.group) || {}).label}
                  </Text>
                ) : null}
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
