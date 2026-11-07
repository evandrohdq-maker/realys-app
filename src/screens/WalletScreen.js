// Carteira Realys: saldo, depositar, sacar, extrato (depósitos, gastos, recebidos e saques)
// e o balanço do mês com gastos por categoria e um limite de gastos definido pelo usuário.
// Vale para qualquer conta: o usuário que consome e o prestador que recebe pelos serviços.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { GIFT_FEE_PCT, LIVE_CONVERT_MIN, liveGiftOf } from '../gifts';
import { POINTS_PER_RATING, POINTS_COMMENT_BONUS, POINT_RULES } from '../rewards';
import { BoostOffers, MyBoosts } from '../components/Boost';
import { levelOf, nextLevel, ORDERS_FOR_BONUS, BONUS, STAMPS_FOR_REWARD, STAMP_BACK_PCT, initialLoyalty } from '../loyalty';

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
              <BigBtn icon="arrow-up-circle-outline" label="Sacar" onPress={() => setAction('saque')} style={{ marginLeft: 8 }} />
              <BigBtn icon="gift-outline" label="Presentear" onPress={() => dispatch({ type: 'OPEN_GIFT', asCompany: state.activeRole === 'empresa' })} style={{ marginLeft: 8 }} />
            </View>
          </View>

          {/* Créditos de presente: não sacam, só compram no Realys */}
          <View style={styles.giftCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="gift" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Créditos de presente</Text>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{brl(state.giftCredits)}</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
              Só dentro do Realys: lojas, Food, Shop, Tecnologia, Agro e contratação de serviços. Não podem ser sacados. São usados primeiro, antes do saldo.
            </Text>
            {state.gifts.slice(0, 6).map((g) => (
              <View key={g.id} style={styles.giftRow}>
                <Text style={{ fontSize: 16, width: 26 }}>{g.dir === 'recebido' ? (g.from.logo || '🎁') : g.dir === 'enviado' ? '💝' : '🛍️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                    {g.dir === 'recebido' ? `De ${g.from.name}` : g.dir === 'enviado' ? `Para ${g.to.name}${g.to.tip ? ' (gorjeta)' : ''}` : `Usado em ${g.desc}`}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>
                    {g.dir === 'usado' ? fmtDate(g.at) : `${g.occasion || 'Presente'}${g.message ? ` · ${g.message}` : ''}`}
                    {g.dir === 'enviado' ? ` · taxa ${brl(g.fee)}` : ''}
                  </Text>
                </View>
                <Text style={{ color: g.dir === 'recebido' ? '#7BE0B0' : '#FFFFFF', fontWeight: '800' }}>
                  {g.dir === 'recebido' ? '+' : '−'} {brl(g.amount)}
                </Text>
              </View>
            ))}
            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 8 }}>
              Presentear sai do seu saldo, com taxa de {GIFT_FEE_PCT}% do Realys. Quem recebe não precisa aceitar: entra na hora.
            </Text>
          </View>

          {/* Créditos de live: presentes recebidos nas minhas lives, que viram moeda Realys */}
          <View style={styles.liveCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.liveIcon}>
                <Ionicons name="radio" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Créditos de live</Text>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{brl(state.liveCredits)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.convertBtn, state.liveCredits < LIVE_CONVERT_MIN && { opacity: 0.45 }]}
                onPress={() => {
                  if (state.liveCredits < LIVE_CONVERT_MIN) return Alert.alert('Ainda não dá', `Junte pelo menos ${LIVE_CONVERT_MIN} créditos de live para converter.`);
                  const v = state.liveCredits;
                  Alert.alert('Converter em moeda Realys', `${brl(v)} em créditos de live viram ${v.toFixed(2).replace('.', ',')} RLS no seu saldo. Confirmar?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Converter', onPress: () => dispatch({ type: 'CONVERT_LIVE_CREDITS', amount: v }) },
                  ]);
                }}
              >
                <Ionicons name="swap-horizontal" size={14} color="#0B1124" />
                <Text style={styles.convertText}>Converter em RLS</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
              Presentes que você ganha quando transmite ao vivo. Converta em moeda Realys (1 crédito = 1 RLS) e use como saldo normal: comprar, presentear ou sacar.
            </Text>
            {state.liveGifts.slice(0, 5).map((g) => {
              const lg = liveGiftOf(g.gift);
              return (
                <View key={g.id} style={styles.liveRow}>
                  <Text style={{ fontSize: 18, width: 28 }}>{lg.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{g.from} · {lg.name}{g.qty > 1 ? ` x${g.qty}` : ''}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{g.live} · {fmtDate(g.at)}</Text>
                  </View>
                  <Text style={{ color: '#1E9E63', fontWeight: '800' }}>+ {brl(g.value)}</Text>
                </View>
              );
            })}
          </View>

          {/* Clube Realys: nível, bônus a cada 20 pedidos e selos por loja */}
          {(() => {
            const ly = state.loyalty || initialLoyalty;
            const lvl = levelOf(ly.orders);
            const nxt = nextLevel(ly.orders);
            const toBonus = ORDERS_FOR_BONUS - (ly.orders % ORDERS_FOR_BONUS);
            const stamps = Object.entries(ly.stamps || {}).filter(([, v]) => v.count > 0);
            return (
              <View style={styles.clubCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 26 }}>{lvl.icon}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Clube Realys · nível {lvl.label}</Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{ly.orders} pedidos entregues</Text>
                  </View>
                </View>
                <Text style={styles.clubLabel}>Faltam {toBonus} {toBonus === 1 ? 'pedido' : 'pedidos'} para ganhar {BONUS.pct}% no próximo (até {brl(BONUS.cap)})</Text>
                <View style={styles.clubTrack}>
                  <View style={[styles.clubFill, { width: `${((ORDERS_FOR_BONUS - toBonus) / ORDERS_FOR_BONUS) * 100}%` }]} />
                </View>
                {nxt ? <Text style={styles.clubSmall}>Nível {nxt.label} {nxt.icon} com {nxt.min} pedidos: {Math.round((nxt.mult - 1) * 100)}% a mais de pontos</Text> : null}
                {stamps.length ? <Text style={styles.clubLabel}>Selos nas lojas ({STAMPS_FOR_REWARD} selos = {STAMP_BACK_PCT}% de volta)</Text> : null}
                {stamps.map(([id, v]) => {
                  const st = state.stores.find((x) => x.id === id) || {};
                  return (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <Text style={{ width: 26, fontSize: 16 }}>{st.logo || '🏪'}</Text>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', width: 120 }} numberOfLines={1}>{st.name}</Text>
                      <View style={{ flex: 1, flexDirection: 'row' }}>
                        {Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => (
                          <View key={i} style={[styles.stamp, i < v.count && styles.stampOn]} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Pontos Realys: ganha avaliando, comprando e assistindo; troca só por boosts e anúncios */}
          <View style={styles.pointsCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="trophy" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Pontos Realys</Text>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{state.points} pontos</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              Ganhe {POINTS_PER_RATING} pontos a cada avaliação (+{POINTS_COMMENT_BONUS} com comentário), comprando e assistindo lives e clipes (até {POINT_RULES.watchDailyCap} por dia). Troque por boosts e anúncios do Realys. Pontos não viram saldo, não são sacados e vencem em {POINT_RULES.validityMonths} meses.
            </Text>
            {(state.promoCredits || []).filter((pc) => !pc.used).length ? (
              <>
                <Text style={styles.pointsH}>Seus cupons e créditos de lojas</Text>
                {state.promoCredits.filter((pc) => !pc.used).map((pc) => (
                  <View key={pc.id} style={styles.offer}>
                    <Text style={{ fontSize: 20, width: 30 }}>{pc.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{pc.title}</Text>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>{pc.partner} · {pc.kind === 'loja' ? 'desconta sozinho na próxima compra lá' : pc.kind === 'cupom' ? `pedido mínimo de ${brl(pc.minOrder || 0)}, desconta sozinho` : 'vale no próximo serviço'}</Text>
                    </View>
                    <Text style={{ color: colors.success, fontWeight: '800' }}>{brl(pc.value)}</Text>
                  </View>
                ))}
              </>
            ) : null}
            <MyBoosts />
            <Text style={styles.pointsH}>Trocar pontos (ou pagar em R$)</Text>
            <BoostOffers />
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
              <Text style={{ color: colors.text, fontWeight: '700' }}>Resultado do período</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Entradas (depósitos + recebidos) menos saídas (gastos + saques)</Text>
            </View>
            <Text style={{ color: balance >= 0 ? colors.success : colors.danger, fontWeight: '800', fontSize: 16 }}>
              {balance >= 0 ? '+' : '−'}
              {brl(Math.abs(balance))}
            </Text>
          </View>

          {/* Limite de gastos */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>Limite de gastos do mês</Text>
              <TouchableOpacity onPress={() => setAction('limite')}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Ajustar</Text>
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
              <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Para onde foi o dinheiro</Text>
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
                  <Text style={{ color: k.color, fontWeight: '800' }}>
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
      <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 6 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tile({ label, value, color, icon }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{label}</Text>
      <Text style={{ color, fontWeight: '800', fontSize: 16, marginTop: 2 }}>{brl(value)}</Text>
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
  title: { color: colors.text, fontWeight: '800', fontSize: 18 },
  clubCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  clubLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 12 },
  clubSmall: { color: colors.muted, fontSize: 11, marginTop: 6 },
  clubTrack: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, marginTop: 6, overflow: 'hidden' },
  clubFill: { height: 8, backgroundColor: '#E2B649' },
  stamp: { flex: 1, height: 10, borderRadius: 5, marginRight: 3, borderWidth: 1, borderColor: 'rgba(226,182,73,0.5)' },
  stampOn: { backgroundColor: '#E2B649' },
  pointsCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 10, borderWidth: 1.5, borderColor: colors.gold },
  pointsH: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 4 },
  offer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  redeem: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
  giftCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  liveCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,59,92,0.35)' },
  liveIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF3B5C', alignItems: 'center', justifyContent: 'center' },
  convertBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2B649', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  convertText: { color: '#0B1124', fontWeight: '800', fontSize: 12, marginLeft: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  giftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 16 },
  balance: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 4 },
  bigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, backgroundColor: '#fff' },
  periods: { flexDirection: 'row', marginTop: 16 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 14, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48.5%', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8, ...soft },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10, ...soft },
  track: { height: 10, borderRadius: 6, backgroundColor: colors.cardAlt, overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', borderRadius: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.card, marginRight: 8, marginBottom: 6, ...soft },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { color: colors.text, fontWeight: '700', fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 10, marginBottom: 8, ...soft },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 48, color: colors.text, fontSize: 16 },
  primary: { height: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
});
