// Carteira Realys: saldo, depositar, sacar, extrato (depósitos, gastos, recebidos e saques)
// e o balanço do mês com gastos por categoria e um limite de gastos definido pelo usuário.
// Vale para qualquer conta: o usuário que consome e o prestador que recebe pelos serviços.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl } from '../theme';

const KIND = {
  deposito: { label: 'Depósito', icon: 'arrow-down-circle', color: colors.success, sign: '+' },
  recebido: { label: 'Recebido', icon: 'cash', color: colors.success, sign: '+' },
  gasto: { label: 'Gasto', icon: 'cart', color: colors.danger, sign: '−' },
  saque: { label: 'Saque', icon: 'arrow-up-circle', color: colors.accent, sign: '−' },
};
const FILTERS = [
  ['todos', 'Tudo'],
  ['deposito', 'Depósitos'],
  ['gasto', 'Gastos'],
  ['recebido', 'Recebidos'],
  ['saque', 'Saques'],
];
const PERIODS = [
  ['mes', 'Este mês'],
  ['30', '30 dias'],
  ['tudo', 'Tudo'],
];
const isIn = (ts) => ts > 0;
const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const toNumber = (t) => Number(String(t || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

export default function WalletScreen({ visible, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('mes');
  const [filter, setFilter] = useState('todos');
  const [action, setAction] = useState(null); // 'deposito' | 'saque' | 'limite'
  const isProvider = state.user && state.user.roles.includes('prestador');

  const inPeriod = useMemo(() => {
    const now = new Date();
    return state.walletTx.filter((t) => {
      if (period === 'tudo') return isIn(t.ts);
      if (period === '30') return t.ts >= Date.now() - 30 * 86400000;
      const d = new Date(t.ts);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [state.walletTx, period]);

  const sum = (k) => inPeriod.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0);
  const deposits = sum('deposito');
  const received = sum('recebido');
  const spent = sum('gasto');
  const withdrawn = sum('saque');
  const balance = deposits + received - spent - withdrawn;

  // Gastos por categoria (no período).
  const byCat = Object.entries(
    inPeriod.filter((t) => t.kind === 'gasto').reduce((m, t) => ({ ...m, [t.cat]: (m[t.cat] || 0) + t.amount }), {})
  ).sort((a, b) => b[1] - a[1]);
  const maxCat = byCat.length ? byCat[0][1] : 1;

  // Limite do mês: sempre olha o mês atual.
  const now = new Date();
  const monthSpent = state.walletTx
    .filter((t) => t.kind === 'gasto' && new Date(t.ts).getMonth() === now.getMonth() && new Date(t.ts).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + t.amount, 0);
  const limitPct = state.spendLimit ? Math.min(1, monthSpent / state.spendLimit) : 0;
  const limitColor = limitPct >= 1 ? colors.danger : limitPct >= 0.8 ? '#E08A00' : colors.success;

  const list = inPeriod.filter((t) => filter === 'todos' || t.kind === filter).sort((a, b) => b.ts - a.ts);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Minha carteira</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
          {/* Saldo */}
          <View style={styles.balanceCard}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Saldo disponível</Text>
            <Text style={styles.balance}>{brl(state.wallet)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Moeda Realys · 1 RLS = R$ 1,00 na demonstração</Text>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <BigBtn icon="add-circle-outline" label="Depositar" onPress={() => setAction('deposito')} />
              <BigBtn icon="arrow-up-circle-outline" label="Sacar" onPress={() => setAction('saque')} style={{ marginLeft: 10 }} />
            </View>
          </View>

          {/* Balanço */}
          <View style={styles.periods}>
            {PERIODS.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setPeriod(k)} style={[styles.chip, period === k && styles.chipOn]}>
                <Text style={[styles.chipTxt, period === k && { color: colors.onPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.section}>Balanço</Text>
          <View style={styles.grid}>
            <Tile label="Depósitos" value={deposits} color={colors.success} icon="arrow-down-circle-outline" />
            <Tile label={isProvider ? 'Recebido por serviços' : 'Recebido'} value={received} color={colors.success} icon="cash-outline" />
            <Tile label="Gastos" value={spent} color={colors.danger} icon="cart-outline" />
            <Tile label="Saques" value={withdrawn} color={colors.accent} icon="arrow-up-circle-outline" />
          </View>
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <Ionicons name={balance >= 0 ? 'trending-up' : 'trending-down'} size={22} color={balance >= 0 ? colors.success : colors.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Resultado do período</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Entradas (depósitos + recebidos) menos saídas (gastos + saques)</Text>
            </View>
            <Text style={{ color: balance >= 0 ? colors.success : colors.danger, fontWeight: '900', fontSize: 16 }}>
              {balance >= 0 ? '+' : '−'}
              {brl(Math.abs(balance))}
            </Text>
          </View>

          {/* Limite de gastos */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>Limite de gastos do mês</Text>
              <TouchableOpacity onPress={() => setAction('limite')}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>Ajustar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${limitPct * 100}%`, backgroundColor: limitColor }]} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
              {state.spendLimit
                ? `Você gastou ${brl(monthSpent)} de ${brl(state.spendLimit)} (${Math.round((monthSpent / state.spendLimit) * 100)}%).${
                    limitPct >= 1 ? ' Limite atingido!' : ` Ainda pode gastar ${brl(Math.max(0, state.spendLimit - monthSpent))}.`
                  }`
                : 'Sem limite definido.'}
            </Text>
          </View>

          {byCat.length ? (
            <View style={styles.card}>
              <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 8 }}>Para onde foi o dinheiro</Text>
              {byCat.map(([cat, v]) => (
                <View key={cat} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{cat}</Text>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                      {brl(v)} · {spent ? Math.round((v / spent) * 100) : 0}%
                    </Text>
                  </View>
                  <View style={[styles.track, { height: 7, marginTop: 4 }]}>
                    <View style={[styles.fill, { width: `${(v / maxCat) * 100}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Extrato */}
          <Text style={styles.section}>Extrato</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {FILTERS.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[styles.chip, filter === k && styles.chipOn]}>
                <Text style={[styles.chipTxt, filter === k && { color: colors.onPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {list.length ? (
            list.map((t) => {
              const k = KIND[t.kind] || KIND.gasto;
              return (
                <View key={t.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: k.color + '1A' }]}>
                    <Ionicons name={k.icon} size={20} color={k.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>
                      {t.desc}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {t.cat} · {fmtDate(t.ts)}
                    </Text>
                  </View>
                  <Text style={{ color: k.color, fontWeight: '900' }}>
                    {k.sign} {brl(t.amount)}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>Nada neste período.</Text>
          )}
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 }}>
            Demonstração: depósitos e saques são simulados. Na versão real passam pelo banco parceiro e pelo Banco Central.
          </Text>
        </ScrollView>

        <ActionSheet kind={action} onClose={() => setAction(null)} wallet={state.wallet} limit={state.spendLimit} dispatch={dispatch} />
      </View>
    </Modal>
  );
}

function BigBtn({ icon, label, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.bigBtn, style]} onPress={onPress} activeOpacity={0.85} accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '900', marginLeft: 6 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tile({ label, value, color, icon }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{label}</Text>
      <Text style={{ color, fontWeight: '900', fontSize: 16, marginTop: 2 }}>{brl(value)}</Text>
    </View>
  );
}

// Depositar, sacar ou ajustar o limite.
function ActionSheet({ kind, onClose, wallet, limit, dispatch }) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [method, setMethod] = useState('Pix');
  const [dest, setDest] = useState('');
  const [done, setDone] = useState(null);
  const open = !!kind;
  const v = toNumber(value);

  const reset = () => {
    setValue('');
    setMethod('Pix');
    setDest('');
    setDone(null);
    onClose();
  };
  const confirm = () => {
    if (kind === 'limite') {
      dispatch({ type: 'WALLET_LIMIT', value: v });
      return reset();
    }
    if (!(v > 0)) return Alert.alert('Valor inválido', 'Digite quanto você quer movimentar.');
    if (kind === 'saque') {
      if (v > wallet) return Alert.alert('Saldo insuficiente', `Você pode sacar até ${brl(wallet)}.`);
      if (!dest.trim()) return Alert.alert('Chave Pix', 'Informe a chave Pix da conta que vai receber (CPF, e-mail, celular ou chave aleatória).');
      dispatch({ type: 'WALLET_WITHDRAW', amount: v, dest: dest.trim() });
      return setDone(`Saque de ${brl(v)} enviado por Pix para ${dest.trim()}. Cai na sua conta em instantes.`);
    }
    dispatch({ type: 'WALLET_DEPOSIT', amount: v, method });
    setDone(`Depósito de ${brl(v)} por ${method} confirmado. O saldo já está disponível.`);
  };

  const title = kind === 'saque' ? 'Sacar' : kind === 'limite' ? 'Limite de gastos do mês' : 'Depositar';
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={reset}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.title, { flex: 1 }]}>{title}</Text>
            <TouchableOpacity onPress={reset} accessibilityLabel="Fechar">
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {done ? (
            <>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>{done}</Text>
              </View>
              <TouchableOpacity style={styles.primary} onPress={reset}>
                <Text style={styles.primaryTxt}>Concluir</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>{kind === 'limite' ? `Limite atual: ${limit ? brl(limit) : 'sem limite'}` : kind === 'saque' ? `Disponível para saque: ${brl(wallet)}` : 'Quanto você quer colocar?'}</Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder="R$ 0,00"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {(kind === 'saque' ? [50, 100, Math.floor(wallet)] : [50, 100, 200, 500]).filter((x) => x > 0).map((x, i) => (
                  <TouchableOpacity key={i} style={styles.chip} onPress={() => setValue(String(x))}>
                    <Text style={styles.chipTxt}>{kind === 'saque' && x === Math.floor(wallet) ? `Tudo (${brl(x)})` : brl(x)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {kind === 'deposito' ? (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>Como você vai pagar?</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {['Pix', 'cartão', 'boleto'].map((m) => (
                      <TouchableOpacity key={m} style={[styles.chip, method === m && styles.chipOn]} onPress={() => setMethod(m)}>
                        <Text style={[styles.chipTxt, method === m && { color: colors.onPrimary }]}>{m === 'Pix' ? 'Pix' : m[0].toUpperCase() + m.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
              {kind === 'saque' ? (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>Chave Pix de destino</Text>
                  <TextInput value={dest} onChangeText={setDest} placeholder="CPF, e-mail, celular ou chave aleatória" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Só para contas no seu nome (mesmo CPF ou CNPJ verificado por biometria).</Text>
                </>
              ) : null}
              <TouchableOpacity style={styles.primary} onPress={confirm}>
                <Text style={styles.primaryTxt}>{kind === 'saque' ? 'Confirmar saque' : kind === 'limite' ? 'Salvar limite' : 'Confirmar depósito'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '900', fontSize: 18 },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 16 },
  balance: { color: '#fff', fontSize: 32, fontWeight: '900', marginVertical: 4 },
  bigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, backgroundColor: '#fff' },
  periods: { flexDirection: 'row', marginTop: 16 },
  section: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 14, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48.5%', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  track: { height: 10, borderRadius: 6, backgroundColor: colors.cardAlt, overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', borderRadius: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { color: colors.text, fontWeight: '700', fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 8 },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 48, color: colors.text, fontSize: 16 },
  primary: { height: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryTxt: { color: colors.onPrimary, fontWeight: '900', fontSize: 15 },
});
