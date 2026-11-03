import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Stat, Button, Input, Section, Chip } from '../../components/ui';

export default function FinanceScreen() {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('todos');
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');

  const entradas = state.finance.filter((f) => f.type === 'entrada').reduce((s, f) => s + f.value, 0);
  const saidas = state.finance.filter((f) => f.type === 'saida').reduce((s, f) => s + f.value, 0);
  const saldo = 18450.0 + entradas - saidas; // saldo inicial de exemplo
  const contas = state.bills.reduce((s, b) => s + b.value, 0);
  const mediaDia = state.salesByDay.reduce((s, d) => s + d.value, 0) / state.salesByDay.length;
  const proj = (days) => saldo + mediaDia * days - contas * (days / 30) * 1.0 - 2500 * (days / 30);

  const list = state.finance.filter((f) => filter === 'todos' || f.type === filter);

  const addExpense = () => {
    const v = parseFloat(value.replace(',', '.'));
    if (!desc || isNaN(v)) return Alert.alert('Informe descrição e valor.');
    dispatch({ type: 'ADD_EXPENSE', entry: { desc, value: v } });
    setDesc('');
    setValue('');
  };

  return (
    <Screen>
      <Title sub="Entradas do app entram aqui automaticamente">Fluxo de caixa</Title>

      <Card style={{ backgroundColor: colors.dark, borderColor: colors.primary }}>
        <Text style={{ color: '#B8C6CF' }}>Saldo da empresa</Text>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 2 }}>{brl(saldo)}</Text>
        <Text style={{ color: '#B8C6CF', fontSize: 12, marginTop: 4 }}>Separado das suas contas pessoais</Text>
      </Card>

      <Row style={{ marginHorizontal: -4, marginBottom: 14 }}>
        <Stat label="Entradas" value={brl(entradas)} color={colors.success} />
        <Stat label="Saídas" value={brl(saidas)} color={colors.danger} />
      </Row>

      <Section title="Saldo projetado">
        <Row style={{ marginHorizontal: -4 }}>
          <Stat label="30 dias" value={brl(proj(30))} hint="estimado" />
          <Stat label="60 dias" value={brl(proj(60))} hint="estimado" />
          <Stat label="90 dias" value={brl(proj(90))} hint="estimado" />
        </Row>
      </Section>

      <Section title="Contas a pagar">
        {state.bills.map((b) => (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontWeight: '700' }}>{b.desc}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Vence {b.due}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: colors.danger }}>{brl(b.value)}</Text>
            </Row>
          </Card>
        ))}
      </Section>

      <Section title="Lançar despesa">
        <Card>
          <Input placeholder="Descrição (ex.: Gás, manutenção)" value={desc} onChangeText={setDesc} />
          <Input placeholder="Valor R$" keyboardType="decimal-pad" value={value} onChangeText={setValue} />
          <Button title="Lançar saída" variant="dark" onPress={addExpense} />
        </Card>
      </Section>

      <Section title="Movimentações">
        <Row style={{ marginBottom: 10 }}>
          <Chip label="Todas" active={filter === 'todos'} onPress={() => setFilter('todos')} />
          <Chip label="Entradas" active={filter === 'entrada'} onPress={() => setFilter('entrada')} />
          <Chip label="Saídas" active={filter === 'saida'} onPress={() => setFilter('saida')} />
        </Row>
        {list.map((f) => (
          <Card key={f.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{f.desc}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{f.date}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: f.type === 'entrada' ? colors.success : colors.danger }}>
                {f.type === 'entrada' ? '+' : '−'} {brl(f.value)}
              </Text>
            </Row>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
