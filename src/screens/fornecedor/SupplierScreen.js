import React, { useState } from 'react';
import { OpenRequests } from '../../components/Engage';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { MY_SUPPLIER_ID } from '../../data';
import { colors, brl, soft } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, Badge, Section, Stat, Empty } from '../../components/ui';
import { STATUS_COLOR } from '../empresa/B2BScreen';

const SEGS = [
  ['enviar', 'Enviar proposta', 'paper-plane-outline'],
  ['enviadas', 'Enviadas', 'send-outline'],
  ['recebidas', 'Recebidas', 'mail-unread-outline'],
  ['produtos', 'Meus produtos', 'cube-outline'],
];
const VALIDITY = ['hoje', 'amanhã', 'sexta', '7 dias', '30 dias'];
const EMOJIS = ['📦', '🥫', '🧀', '🥩', '🍷', '🧴', '🧻', '🥤', '🍞', '🛠️'];

export default function SupplierScreen() {
  const { state, dispatch } = useStore();
  const [seg, setSeg] = useState('enviar');
  const myItems = state.supplierItems.filter((i) => i.supplierId === MY_SUPPLIER_ID).sort((a, b) => !!b.featured - !!a.featured);
  const incoming = state.proposals.filter((p) => myItems.some((i) => i.id === p.itemId));
  const sent = state.offers.filter((o) => myItems.some((i) => i.id === o.itemId));
  const itemOf = (id) => myItems.find((i) => i.id === id);
  const value = (itemId, qty, disc) => qty * itemOf(itemId).unitPrice * (1 - disc / 100);
  const closed =
    incoming.filter((p) => p.status === 'aceita').reduce((s, p) => s + value(p.itemId, p.qty, p.discount), 0) +
    sent.filter((o) => o.status === 'aceita').reduce((s, o) => s + value(o.itemId, o.qty, o.discount), 0);
  const waiting = incoming.filter((p) => p.status === 'pendente').length + sent.filter((o) => o.status === 'contraproposta').length;

  return (
    <Screen>
      <Title sub="Distribuidora Real Alimentos · atacado B2B">Painel do fornecedor</Title>
      <OpenRequests kind="b2b" />

      <Row style={{ marginHorizontal: -4, marginBottom: 14 }}>
        <Stat label="Negócios fechados" value={brl(closed)} color={colors.success} />
        <Stat label="Pedem sua resposta" value={String(waiting)} color={colors.accent} />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {SEGS.map(([k, label, icon]) => {
          const on = k === seg;
          return (
            <TouchableOpacity key={k} style={[styles.chip, on && styles.chipOn]} onPress={() => setSeg(k)}>
              <Ionicons name={icon} size={15} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {seg === 'enviar' ? <SendOffer items={myItems} onSent={() => setSeg('enviadas')} /> : null}

      {seg === 'enviadas' ? (
        <Section title="Propostas que você enviou">
          {!sent.length ? <Empty text="Você ainda não enviou propostas." /> : null}
          {sent.map((o) => {
            const item = itemOf(o.itemId);
            const company = state.stores.find((s) => s.id === o.companyId) || {};
            return (
              <Card key={o.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
                    {company.logo} {company.name}
                  </Text>
                  <Badge label={o.status} color={STATUS_COLOR[o.status]} />
                </Row>
                <Text style={{ color: colors.text, marginTop: 4 }}>
                  {o.qty}× {item.emoji} {item.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {o.discount}% de desconto · total {brl(value(o.itemId, o.qty, o.discount))} · válida até {o.validUntil} · {o.createdAt}
                </Text>
                {o.note ? <Text style={{ color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>“{o.note}”</Text> : null}
                {o.status === 'contraproposta' ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: colors.sponsored, fontWeight: '700' }}>
                      A empresa pediu {o.counter}% · total {brl(value(o.itemId, o.qty, o.counter))}
                    </Text>
                    <Button small title="Aceitar contraproposta" style={{ marginTop: 8 }} onPress={() => dispatch({ type: 'SUPPLIER_ACCEPT_COUNTER', id: o.id })} />
                  </View>
                ) : null}
                {o.status === 'aceita' ? (
                  <Text style={{ fontSize: 12, color: colors.success, marginTop: 4 }}>✓ Negócio fechado. Pagamento retido pelo Realys até a entrega.</Text>
                ) : null}
              </Card>
            );
          })}
        </Section>
      ) : null}

      {seg === 'recebidas' ? <Received incoming={incoming} itemOf={itemOf} value={value} /> : null}

      {seg === 'produtos' ? <MyProducts items={myItems} /> : null}
    </Screen>
  );
}

// Monta a proposta: produto, empresas, quantidade, desconto, validade e mensagem.
function SendOffer({ items, onSent }) {
  const { state, dispatch } = useStore();
  const [itemId, setItemId] = useState(items[0] ? items[0].id : null);
  const [picked, setPicked] = useState({});
  const [qty, setQty] = useState('');
  const [disc, setDisc] = useState('');
  const [valid, setValid] = useState('sexta');
  const [note, setNote] = useState('');
  const item = items.find((i) => i.id === itemId);
  const companies = [...state.stores].sort((a, b) => b.rating - a.rating);
  const chosen = companies.filter((c) => picked[c.id]);
  const q = parseInt(qty, 10) || (item ? item.minQty : 0);
  const d = parseFloat((disc || '0').replace(',', '.')) || 0;
  const unit = item ? item.unitPrice * (1 - d / 100) : 0;

  const send = () => {
    if (!item) return Alert.alert('Escolha um produto.');
    if (!chosen.length) return Alert.alert('Escolha pelo menos uma empresa.');
    if (q < item.minQty) return Alert.alert(`Quantidade mínima deste produto: ${item.minQty}.`);
    if (d < 0 || d > 90) return Alert.alert('Desconto entre 0% e 90%.');
    dispatch({ type: 'SUPPLIER_SEND_OFFER', itemId: item.id, companyIds: chosen.map((c) => c.id), qty: q, discount: d, note: note.trim(), validUntil: valid });
    Alert.alert(
      'Proposta enviada',
      `${chosen.length === 1 ? chosen[0].name : chosen.length + ' empresas'} ${chosen.length === 1 ? 'recebeu' : 'receberam'} sua proposta de ${item.name}. Na demonstração, troque para o perfil Empresa (Negócios) para responder.`
    );
    setPicked({});
    setQty('');
    setDisc('');
    setNote('');
    onSent();
  };

  if (!items.length) return <Empty text="Cadastre um produto em Meus produtos para enviar propostas." />;

  return (
    <View>
      <Section title="1. Produto">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {items.map((i) => {
            const on = i.id === itemId;
            return (
              <TouchableOpacity key={i.id} style={[styles.prod, on && styles.prodOn]} onPress={() => setItemId(i.id)} activeOpacity={0.85}>
                {i.featured ? <Ionicons name="star" size={13} color={colors.gold} style={{ position: 'absolute', top: 8, right: 8 }} /> : null}
                <Text style={{ fontSize: 26 }}>{i.emoji}</Text>
                <Text numberOfLines={2} style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
                  {i.name}
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 2 }}>{brl(i.unitPrice)}/un.</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Section>

      <Section
        title="2. Empresas que vão receber"
        right={
          <TouchableOpacity
            onPress={() => setPicked(chosen.length === companies.length ? {} : Object.fromEntries(companies.map((c) => [c.id, true])))}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{chosen.length === companies.length ? 'Limpar' : 'Selecionar todas'}</Text>
          </TouchableOpacity>
        }
      >
        {companies.map((c) => {
          const on = !!picked[c.id];
          return (
            <TouchableOpacity key={c.id} style={[styles.company, on && styles.companyOn]} onPress={() => setPicked({ ...picked, [c.id]: !on })} activeOpacity={0.85}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>{c.logo}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{c.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {c.category} · {c.city} · <Text style={{ color: colors.accent, fontWeight: '700' }}>★ {c.rating}</Text>
                </Text>
              </View>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.muted} />
            </TouchableOpacity>
          );
        })}
      </Section>

      <Section title="3. Condições">
        <Row>
          <Input placeholder={item ? `Quantidade (mín. ${item.minQty})` : 'Quantidade'} keyboardType="number-pad" value={qty} onChangeText={setQty} style={{ flex: 1, marginRight: 6 }} />
          <Input placeholder="Desconto %" keyboardType="decimal-pad" value={disc} onChangeText={setDisc} style={{ flex: 1, marginLeft: 6 }} />
        </Row>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Válida até</Text>
        <Row style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {VALIDITY.map((v) => (
            <TouchableOpacity key={v} style={[styles.small, valid === v && styles.smallOn]} onPress={() => setValid(v)}>
              <Text style={{ color: valid === v ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700' }}>{v}</Text>
            </TouchableOpacity>
          ))}
        </Row>
        <Input placeholder="Mensagem para a empresa (ex.: frete grátis, entrega em 24 h)" value={note} onChangeText={setNote} multiline style={{ minHeight: 64, textAlignVertical: 'top' }} />
      </Section>

      {item ? (
        <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(226,182,73,0.6)' }}>
          <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Resumo</Text>
          <Text style={{ color: colors.text, marginTop: 4 }}>
            {q}× {item.name} por {brl(unit)}/un.{d ? ` (${d}% off)` : ''}
          </Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 2 }}>
            {brl(q * unit)} por empresa{chosen.length > 1 ? ` · ${chosen.length} empresas` : ''}
          </Text>
        </Card>
      ) : null}
      <Button title={chosen.length > 1 ? `Enviar para ${chosen.length} empresas` : 'Enviar proposta'} onPress={send} />
    </View>
  );
}

// Propostas que as empresas mandaram (pedidos de desconto).
function Received({ incoming, itemOf, value }) {
  const { dispatch } = useStore();
  const [counter, setCounter] = useState({});
  return (
    <Section title="Propostas recebidas das empresas">
      {!incoming.length ? <Empty text="Nenhuma proposta ainda." /> : null}
      {incoming.map((p) => {
        const item = itemOf(p.itemId);
        return (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{p.buyer}</Text>
              <Badge label={p.status} color={STATUS_COLOR[p.status]} />
            </Row>
            <Text style={{ color: colors.text, marginTop: 4 }}>
              {p.qty}× {item.name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Pede {p.discount}% de desconto · total {brl(value(p.itemId, p.qty, p.discount))} · {p.createdAt}
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
              <Text style={{ color: colors.sponsored, marginTop: 6, fontWeight: '600' }}>Você ofereceu {p.counter}%. Aguardando o comprador.</Text>
            ) : null}
          </Card>
        );
      })}
    </Section>
  );
}

// Catálogo: destacar produtos (aparecem primeiro para as empresas) e cadastrar novos.
function MyProducts({ items }) {
  const { dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [min, setMin] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const add = () => {
    const p = parseFloat(price.replace(',', '.'));
    const m = parseInt(min, 10);
    if (!name.trim() || isNaN(p) || p <= 0) return Alert.alert('Informe o nome e o preço por unidade.');
    dispatch({ type: 'SUPPLIER_ADD_ITEM', item: { name: name.trim(), unitPrice: p, minQty: isNaN(m) ? 1 : m, emoji } });
    setName('');
    setPrice('');
    setMin('');
    setAdding(false);
  };

  return (
    <View>
      <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(226,182,73,0.6)' }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13 }}>
          <Ionicons name="star" size={13} color={colors.gold} /> Produtos em destaque aparecem primeiro no catálogo atacado de todas as empresas do Realys.
        </Text>
      </Card>

      {adding ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Novo produto</Text>
          <Input placeholder="Nome (ex.: Açúcar Refinado 1kg)" value={name} onChangeText={setName} />
          <Row>
            <Input placeholder="Preço por unidade" keyboardType="decimal-pad" value={price} onChangeText={setPrice} style={{ flex: 1, marginRight: 6 }} />
            <Input placeholder="Pedido mínimo" keyboardType="number-pad" value={min} onChangeText={setMin} style={{ flex: 1, marginLeft: 6 }} />
          </Row>
          <Row style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} style={[styles.emoji, emoji === e && styles.emojiOn]} onPress={() => setEmoji(e)}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </Row>
          <Row>
            <Button small title="Salvar e destacar" onPress={add} style={{ marginRight: 6 }} />
            <Button small variant="dark" title="Cancelar" onPress={() => setAdding(false)} />
          </Row>
        </Card>
      ) : (
        <Button variant="outline" title="+ Cadastrar produto" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      )}

      {items.map((i) => (
        <Card key={i.id} style={i.featured ? { borderColor: 'rgba(226,182,73,0.8)', borderWidth: 1.5 } : null}>
          <Row>
            <Text style={{ fontSize: 28, marginRight: 10 }}>{i.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{i.name}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {brl(i.unitPrice)} /un. · mín. {i.minQty}
              </Text>
              {i.tiers.length ? <Text style={{ fontSize: 11, color: colors.muted }}>{i.tiers.map((t) => `${t.off}% acima de ${t.qty}`).join(' · ')}</Text> : null}
            </View>
            <TouchableOpacity
              style={[styles.star, i.featured && styles.starOn]}
              onPress={() => dispatch({ type: 'SUPPLIER_TOGGLE_FEATURED', id: i.id })}
              accessibilityLabel={i.featured ? 'Tirar do destaque' : 'Destacar produto'}
            >
              <Ionicons name={i.featured ? 'star' : 'star-outline'} size={16} color={i.featured ? colors.onPrimary : colors.primary} />
              <Text style={{ color: i.featured ? colors.onPrimary : colors.primary, fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                {i.featured ? 'Destaque' : 'Destacar'}
              </Text>
            </TouchableOpacity>
          </Row>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 12, marginLeft: 6 },
  prod: { width: 118, borderRadius: 16, backgroundColor: colors.card, padding: 10, marginRight: 8, ...soft },
  prodOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryLight },
  company: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    ...soft,
  },
  companyOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  small: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  smallOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  emoji: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  emojiOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  star: { flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.primary },
  starOn: { backgroundColor: colors.primary },
});
