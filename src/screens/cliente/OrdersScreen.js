import React, { useEffect, useState } from 'react';
import { GuaranteeButton } from '../../components/Guarantee';
import { orderCovered, protectionFee, PROTECTION_TEXT } from '../../guarantee';
import { ReversePost, Subscriptions, LotusNudges } from '../../components/Engage';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, cartTotal, storeOf } from '../../store';
import { SegTabs } from '../../components/AdKit';
import { ProductThumb } from '../../components/ui';
import { promoDiscount } from '../../rewards';
import { isFoodStore } from '../../data';
import { useBack } from '../../back';
import { askPix } from '../../components/PixPay';
import DeliveryTracker from '../../components/DeliveryTracker';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Button, Badge, Empty, Photo } from '../../components/ui';
import { providerTarget } from '../../components/GiftSheet';

const STEPS = ['Pagamento protegido', 'Preparando', 'A caminho', 'Entregue'];
// Como o cliente vê cada passo: primeiro a loja aceita, depois o motoboy/entregador leva.
const statusText = (o, food) =>
  ({
    'Pagamento protegido': food ? 'Aguardando o restaurante aceitar' : 'Aguardando a loja aceitar',
    Preparando: food ? 'Aceito · preparando' : 'Aceito · separando o pedido',
    'A caminho': food ? 'Com o motoboy · a caminho' : 'Com o entregador · a caminho',
    Entregue: 'Entregue',
    Reembolsado: 'Reembolsado pela Garantia Realys',
  }[o.status] || o.status);

// Motoboy cadastrado no Realys que o restaurante chamou para a entrega. O cliente pode dar gorjeta
// em créditos de presente (sai do saldo só o valor; a taxa do Realys sai de dentro da gorjeta).
function CourierCard({ order: o }) {
  const { state, dispatch } = useStore();
  const p = (state.providers || []).find((x) => x.id === o.courierId) || (state.providers || []).find((x) => x.name === o.courier);
  const tipped = state.gifts.some((g) => g.dir === 'enviado' && g.to.tip && g.to.orderId === o.id);
  return (
    <View style={styles.courier}>
      <Photo uri={p && p.photo} style={styles.courierPhoto} fallback="🛵" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>🛵 {o.courier}{p ? ` · ★ ${String(p.rating).replace('.', ',')}` : ''}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
          {p ? `${p.vehicle} · ${p.plate}` : 'Motoboy do Realys'}
          {o.requestedBy ? ` · chamado por ${o.requestedBy}` : ''}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{o.status === 'Entregue' ? 'Entrega concluída' : o.status === 'A caminho' ? 'A caminho com o seu pedido · GPS ligado' : o.status === 'Preparando' ? 'Indo buscar o pedido no restaurante' : 'Aguardando o restaurante aceitar o pedido'}</Text>
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

// Serviços contratados (motorista, motoboy, eletricista, diarista…): aparecem em Pedidos também.
function ServiceOrder({ r, onTrack }) {
  const { dispatch } = useStore();
  const p = r.provider;
  const status = r.done ? 'Concluído' : r.when ? `Agendado: ${r.when}` : r.status;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{r.icon || '🧑‍🔧'} {r.serviceLabel}</Text>
        <Badge label={status} color={r.done ? colors.success : r.when ? colors.primary : colors.accent} />
      </Row>
      <Row>
        <Photo uri={p.photo} style={styles.courierPhoto} fallback="🧑" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name} · <Text style={{ color: colors.accent }}>★ {String(p.rating).replace('.', ',')}</Text></Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
            {p.vehicle ? `${p.vehicle}${p.plate ? ` · ${p.plate}` : ''} · ` : ''}{r.from && r.from !== 'Sua localização atual' ? `saindo de ${r.from}` : 'no seu endereço'}
          </Text>
          {r.forOther ? (
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }} numberOfLines={2}>
              👤 Para {r.forOther.name}{r.to && r.to !== '-' ? ` · até ${r.to}` : ''}
            </Text>
          ) : null}
          {!r.done && !r.when ? <Text style={{ color: colors.muted, fontSize: 12 }}>Chega em cerca de {r.eta} min</Text> : null}
        </View>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ fontWeight: '700', color: colors.primary }}>{r.price ? brl(r.price) : ''}</Text>
        <Row>
          {!r.done && !r.when ? <Button small variant="light" title="📍 Acompanhar no mapa" onPress={onTrack} /> : null}
          {r.done && !r.rated ? <Button small title="Avaliar" onPress={() => dispatch({ type: 'OPEN_RATE', kind: 'servico', refId: r.id })} /> : null}
          {r.done && r.rated ? <Badge label="Avaliado ⭐" color={colors.success} /> : null}
          <TouchableOpacity
            style={[styles.tipBtn, { marginLeft: 8 }]}
            onPress={() => dispatch({ type: 'OPEN_GIFT', to: { ...providerTarget(p), tip: true, orderId: r.id } })}
            accessibilityLabel={`Gorjeta para ${p.name}`}
          >
            <Ionicons name="gift-outline" size={14} color="#0B1124" />
            <Text style={styles.tipText}>Gorjeta</Text>
          </TouchableOpacity>
        </Row>
      </Row>
    </Card>
  );
}

// Carrinho dentro de Pedidos: o que ainda não foi pago, com quantidade, total e pagamento.
function CartTab({ onPaid }) {
  const { state, dispatch } = useStore();
  const lines = state.cart.map((c) => ({ ...c, p: state.products.find((x) => x.id === c.productId) })).filter((l) => l.p);
  if (!lines.length) return <Empty text="Seu carrinho está vazio. Adicione produtos no Shop, no Food ou pela Lotus." />;
  const promo = promoDiscount(state, lines.map((l) => ({ ...l, product: l.p })));
  const protection = protectionFee(state);
  const total = +(cartTotal(state) - promo.off + protection).toFixed(2);
  const fromGift = Math.min(state.giftCredits || 0, total);
  const hasFood = lines.some((l) => isFoodStore(storeOf(state, l.p.storeId)));
  const pay = () => {
    const avail = state.wallet + (state.giftCredits || 0);
    if (total > avail) return askPix({ amount: total, available: avail, label: 'Carrinho', onPaid: finish });
    finish();
  };
  const finish = () => {
    dispatch({ type: 'CHECKOUT' });
    onPaid(hasFood);
    Alert.alert('Pedido confirmado! ✅', 'Pagamento protegido: o valor fica retido pelo Realys e só é liberado para a loja quando você confirmar a entrega.');
  };
  return (
    <View>
      {lines.map(({ p, qty }) => (
        <Card key={p.id}>
          <Row>
            <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: p.storeId, product: p.id })} activeOpacity={0.7} accessibilityLabel={`Ver ${p.name} na loja`}>
              <ProductThumb product={p} size={52} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                  {(storeOf(state, p.storeId) || {}).name} · <Text style={{ color: colors.gold, fontWeight: '700' }}>ver loja ›</Text>
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 2 }}>{brl(p.price * qty)}</Text>
              </View>
            </TouchableOpacity>
            <Row>
              <TouchableOpacity style={styles.qBtn} onPress={() => dispatch({ type: 'CART_QTY', productId: p.id, delta: -1 })} accessibilityLabel={`Tirar um ${p.name}`}>
                <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={15} color={qty === 1 ? colors.danger : colors.text} />
              </TouchableOpacity>
              <Text style={styles.qNum}>{qty}</Text>
              <TouchableOpacity style={styles.qBtn} onPress={() => dispatch({ type: 'CART_QTY', productId: p.id, delta: 1 })} accessibilityLabel={`Mais um ${p.name}`}>
                <Ionicons name="add" size={15} color={colors.text} />
              </TouchableOpacity>
            </Row>
          </Row>
        </Card>
      ))}
      <Card>
        {/* Taxa de proteção Realys: aparece desde o primeiro item, com a explicação ao tocar. */}
        <TouchableOpacity onPress={() => Alert.alert('Taxa de proteção Realys', PROTECTION_TEXT)} accessibilityLabel="O que é a taxa de proteção Realys">
          <Row style={styles.sumRow}>
            <Text style={styles.sumLabel}>🛡️ Taxa de proteção Realys <Text style={{ color: colors.primary, fontWeight: '700' }}>ⓘ</Text></Text>
            <Text style={styles.sumValue}>{protection ? brl(protection) : 'Grátis (Score Diamante)'}</Text>
          </Row>
        </TouchableOpacity>
        {promo.off > 0 ? (
          <Row style={styles.sumRow}>
            <Text style={styles.sumLabel}>🏷️ Créditos de parceiros</Text>
            <Text style={[styles.sumValue, { color: colors.success }]}>− {brl(promo.off)}</Text>
          </Row>
        ) : null}
        {fromGift > 0 ? (
          <Row style={styles.sumRow}>
            <Text style={styles.sumLabel}>🎁 Créditos de presente</Text>
            <Text style={[styles.sumValue, { color: colors.success }]}>− {brl(fromGift)}</Text>
          </Row>
        ) : null}
        <Row style={styles.sumRow}>
          <Text style={styles.sumLabel}>Do saldo Realys ({brl(state.wallet)})</Text>
          <Text style={styles.sumValue}>{brl(total - fromGift)}</Text>
        </Row>
        <Row style={[styles.sumRow, { marginTop: 4 }]}>
          <Text style={[styles.sumLabel, { color: colors.text, fontWeight: '800' }]}>Total</Text>
          <Text style={[styles.sumValue, { color: colors.primary, fontSize: 18 }]}>{brl(total)}</Text>
        </Row>
        <Button title="Pagar com saldo Realys" onPress={pay} style={{ marginTop: 10 }} />
        <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Pagamento protegido · NF-e emitida automaticamente</Text>
      </Card>
    </View>
  );
}

// Ingresso de evento ou passagem comprada no Realys.
function TicketOrder({ t }) {
  const { dispatch } = useStore();
  const ev = t.kind === 'evento' || !!t.eventId;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{ev ? '🎟️' : '🚌'} {t.title || t.name}</Text>
        <Badge label={t.used ? (ev ? 'Usado' : 'Viagem feita') : 'Válido'} color={t.used ? colors.success : colors.accent} />
      </Row>
      <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
        {ev ? t.name : [t.name, t.when, t.seat ? `poltrona ${t.seat}` : null].filter(Boolean).join(' · ')}
        {t.table ? ` · Mesa ${t.table} reservada` : ''}
      </Text>
      {t.code ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Código {t.code}</Text> : null}
      <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ fontWeight: '700', color: colors.primary }}>{t.price ? brl(t.price) : 'Grátis'}</Text>
        <Button small variant="light" title={t.used ? 'Desfazer' : ev ? 'Já entrei no evento' : 'Já viajei'} onPress={() => dispatch({ type: 'TICKET_USED', id: t.id })} />
      </Row>
    </Card>
  );
}

// Pedido feito na mesa/balcão do lugar do evento (comanda).
function VenueOrder({ o }) {
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>🍹 {o.venue}{o.table ? ` · Mesa ${o.table}` : ' · Balcão'}</Text>
        <Badge label={o.status} color={o.status === 'Entregue' ? colors.success : colors.accent} />
      </Row>
      {o.items.map((i) => (
        <Text key={i.name} style={{ color: colors.muted }}>{i.qty}× {i.name}</Text>
      ))}
      <Text style={{ fontWeight: '700', color: colors.primary, marginTop: 8 }}>{brl(o.total)}</Text>
    </Card>
  );
}

// Despesas: tudo o que saiu do bolso no Realys, por setor, com o total.
function Expenses({ rows }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  const bySector = {};
  rows.forEach((r) => (bySector[r.sector] = (bySector[r.sector] || 0) + r.value));
  if (!rows.length) return <Empty text="Nenhuma despesa ainda. Tudo o que você comprar ou contratar aparece aqui." />;
  return (
    <View>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Total gasto no Realys</Text>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 24, marginBottom: 6 }}>{brl(total)}</Text>
        {Object.keys(bySector).map((k) => (
          <Row key={k} style={styles.sumRow}>
            <Text style={styles.sumLabel}>{k}</Text>
            <Text style={styles.sumValue}>{brl(bySector[k])}</Text>
          </Row>
        ))}
      </Card>
      <Card>
        {rows.map((r, i) => (
          <Row key={r.id} style={[styles.sumRow, i ? { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 5 } : null]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{r.icon} {r.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>{r.sector}{r.done ? ' · concluído' : ' · em andamento'}</Text>
            </View>
            <Text style={[styles.sumValue, { color: colors.danger }]}>− {brl(r.value)}</Text>
          </Row>
        ))}
      </Card>
    </View>
  );
}

// Meus pedidos: registro de tudo o que foi comprado. Em andamento · Concluídos · Despesas,
// e por setor: Carrinho, Compras, Comida, Ingressos (eventos, passagens e comanda), Serviços, Propostas e Assinaturas.
export default function OrdersScreen({ navigate, explore }) {
  const { state, dispatch } = useStore();
  // Serviços que o cliente contratou (não os que ele recebe como prestador).
  const services = state.rides.filter((r) => r.provider && r.serviceKey);
  const isFood = (o) => !!o.courier || isFoodStore((state.stores || []).find((x) => x.name === o.store));
  const food = state.orders.filter(isFood);
  const buys = state.orders.filter((o) => !isFood(o));
  const tickets = state.tickets || [];
  const venueOrders = state.venueOrders || [];
  const cartCount = state.cart.reduce((n, c) => n + c.qty, 0);
  const [seg, setSeg] = useState(cartCount ? 'carrinho' : 'compras');
  // Em andamento · Concluídos · Despesas (vale para Compras, Comida, Ingressos e Serviços).
  const [view, setView] = useState('andamento');
  useEffect(() => {
    if (explore && explore.tab === 'pedidos' && explore.seg) {
      setSeg(explore.seg);
      setView('andamento');
    }
  }, [explore]);
  useBack(view !== 'andamento' || seg !== 'compras', () => (view !== 'andamento' ? setView('andamento') : setSeg('compras')));
  const orderDone = (o) => o.status === 'Entregue' || o.status === 'Reembolsado';
  const venueDone = (o) => o.status === 'Entregue';
  const showDone = view === 'concluidos';
  const pick = (arr, done) => arr.filter((x) => (showDone ? done(x) : !done(x)));
  const SEGS = [
    { key: 'carrinho', label: 'Carrinho', icon: 'bag-handle-outline', badge: cartCount || null },
    { key: 'compras', label: 'Compras', icon: 'cube-outline', badge: buys.filter((o) => !orderDone(o)).length || null },
    { key: 'comida', label: 'Comida', icon: 'restaurant-outline', badge: food.filter((o) => !orderDone(o)).length || null },
    { key: 'ingressos', label: 'Ingressos', icon: 'ticket-outline', badge: tickets.filter((t) => !t.used).length + venueOrders.filter((o) => !venueDone(o)).length || null },
    { key: 'servicos', label: 'Serviços', icon: 'construct-outline', badge: services.filter((r) => !r.done).length || null },
    { key: 'propostas', label: 'Propostas', icon: 'megaphone-outline', badge: state.reverseRequests.filter((r) => r.status === 'aberto' && r.offers.length).length || null },
    { key: 'assinaturas', label: 'Assinaturas', icon: 'repeat-outline', badge: state.subscriptions.filter((x) => x.status === 'ativa').length || null },
  ];
  const list = pick(seg === 'comida' ? food : buys, orderDone);
  const svcList = pick(services, (r) => !!r.done);
  const tkList = pick(tickets, (t) => !!t.used);
  const voList = pick(venueOrders, venueDone);
  // Despesas: tudo o que foi pago (pedidos, ingressos, comandas e serviços), do mais novo ao mais antigo.
  const expenses = [
    ...state.orders.filter((o) => o.total && o.status !== 'Reembolsado').map((o) => ({ id: o.id, at: o.at || 0, icon: isFood(o) ? '🍽️' : '📦', title: o.items.map((i) => i.name).join(', ') || o.store, sector: isFood(o) ? 'Comida' : 'Compras', value: o.total, done: orderDone(o) })),
    ...tickets.filter((t) => t.price).map((t) => ({ id: t.id, at: t.at || 0, icon: t.eventId ? '🎟️' : '🚌', title: t.title || t.name, sector: t.eventId ? 'Ingressos' : 'Passagens', value: t.price, done: !!t.used })),
    ...venueOrders.map((o) => ({ id: o.id, at: o.at || 0, icon: '🍹', title: `${o.venue} · ${o.items.map((i) => i.name).join(', ')}`, sector: 'No evento', value: o.total, done: venueDone(o) })),
    ...services.filter((r) => r.price).map((r) => ({ id: r.id, at: r.acceptedAt || 0, icon: r.icon || '🧑‍🔧', title: `${r.serviceLabel} · ${r.provider.name}`, sector: 'Serviços', value: r.price, done: !!r.done })),
  ].sort((a, b) => b.at - a.at);
  const statusSeg = ['compras', 'comida', 'ingressos', 'servicos'].includes(seg);
  // Acompanhar ao vivo: { order } para entregas, { ride } para motorista e prestadores.
  const [track, setTrack] = useState(null);
  const courierOf = (o) => (state.providers || []).find((x) => x.id === o.courierId) || (state.providers || []).find((x) => x.name === o.courier) || { name: o.courier || 'Entregador Realys' };
  return (
    <Screen>
      <Title sub="Pagamento só é liberado para a loja ou o prestador quando você confirma a entrega">Meus pedidos</Title>
      <View style={styles.viewRow}>
        {[['andamento', 'Em andamento'], ['concluidos', 'Concluídos'], ['despesas', 'Despesas']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setView(k)} style={[styles.viewItem, view === k && styles.viewOn]} accessibilityLabel={l}>
            <Text style={[styles.viewText, view === k && styles.viewTextOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {view === 'despesas' ? <Expenses rows={expenses} /> : null}
      {view !== 'despesas' ? <SegTabs items={SEGS} value={seg} onChange={setSeg} /> : null}
      {view === 'despesas' ? null : (
      <>
      {/* A Lotus avisa antes: uma oferta por vez, passando sozinha; "Ver todas" abre a lista. */}
      {view === 'andamento' && (seg === 'compras' || seg === 'servicos') ? <LotusNudges /> : null}
      {!statusSeg && view === 'concluidos' ? <Text style={styles.hint}>Os concluídos ficam em Compras, Comida, Ingressos e Serviços.</Text> : null}

      {seg === 'ingressos' ? (
        tkList.length || voList.length ? (
          <>
            {tkList.map((t) => <TicketOrder key={t.id} t={t} />)}
            {voList.length ? <Text style={styles.h2}>Pedidos no local do evento</Text> : null}
            {voList.map((o) => <VenueOrder key={o.id} o={o} />)}
          </>
        ) : (
          <Empty text={showDone ? 'Nenhum ingresso usado ainda.' : 'Nenhum ingresso ou passagem ativa. Compre em Eventos, Transporte ou pela Lotus.'} />
        )
      ) : null}

      {seg === 'propostas' ? <ReversePost kinds={['servico', 'produto']} /> : null}
      {seg === 'assinaturas' ? <Subscriptions /> : null}
      {seg === 'carrinho' ? <CartTab onPaid={(hasFood) => setSeg(hasFood ? 'comida' : 'compras')} /> : null}

      {seg === 'servicos' ? (
        svcList.length ? (
          svcList.map((r) => <ServiceOrder key={r.id} r={r} onTrack={() => setTrack({ ride: r })} />)
        ) : (
          <Empty text={showDone ? 'Nenhum serviço concluído ainda.' : 'Nenhum serviço em andamento. Peça um eletricista, motorista ou outro prestador em Serviços ou pela Lotus.'} />
        )
      ) : null}

      {(seg === 'compras' || seg === 'comida') && !list.length ? (
        <Empty text={showDone ? `Nenhum pedido ${seg === 'comida' ? 'de comida ' : ''}concluído ainda.` : seg === 'comida' ? 'Nenhum pedido de comida em andamento. Peça no Food ou pela Lotus.' : 'Nenhuma compra em andamento. Os produtos que você comprar no Shop aparecem aqui.'} />
      ) : null}
      {(seg === 'compras' || seg === 'comida' ? list : []).map((o) => {
        const idx = STEPS.indexOf(o.status);
        return (
          <Card key={o.id}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{o.store}</Text>
              <Badge label={statusText(o, isFood(o))} color={o.status === 'Entregue' ? colors.success : colors.accent} />
            </Row>
            {o.items.map((i) => {
              // Tocar no item leva ao produto dentro da loja de quem vendeu (para ver mais produtos dela).
              const prod = state.products.find((x) => x.name === i.name);
              const store = (state.stores || []).find((x) => (prod && x.id === prod.storeId) || x.name === o.store);
              return (
                <TouchableOpacity
                  key={i.name}
                  disabled={!store}
                  onPress={() => store && dispatch({ type: 'OPEN_COMPANY', id: store.id, product: prod ? prod.id : null })}
                  accessibilityLabel={`Ver ${i.name} na loja`}
                >
                  <Text style={{ color: colors.muted }}>
                    {i.qty}× {i.name}
                    {store ? <Text style={{ color: colors.gold, fontWeight: '700' }}>  ver na loja ›</Text> : null}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {o.status === 'A caminho' ? (
              <TouchableOpacity style={styles.trackBtn} onPress={() => setTrack({ order: o })} activeOpacity={0.85} accessibilityLabel="Acompanhar a entrega no mapa">
                <Ionicons name="navigate" size={16} color="#0B1124" />
                <Text style={styles.trackText}>Acompanhar {isFood(o) ? 'o motoboy' : 'a entrega'} no mapa</Text>
                <View style={styles.trackLive} />
              </TouchableOpacity>
            ) : null}
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
              <Text style={{ fontWeight: '700', color: colors.primary }}>{brl(o.total)}</Text>
              {o.status === 'Entregue' ? (
                o.rated ? (
                  <Badge label="Avaliado ⭐" color={colors.success} />
                ) : (
                  <Button small title="Avaliar pedido" onPress={() => dispatch({ type: 'OPEN_RATE', kind: 'pedido', refId: o.id })} />
                )
              ) : null}
              {o.status !== 'Entregue' && o.status !== 'Reembolsado' ? (
                <Button
                  small
                  variant="light"
                  title={o.status === 'A caminho' ? 'Confirmar entrega' : o.status === 'Preparando' ? 'Simular: saiu para entrega' : 'Simular: loja aceitou'}
                  onPress={() => dispatch({ type: 'ADVANCE_ORDER', id: o.id })}
                />
              ) : null}
            </Row>
            {/* Garantia Realys: deu problema, abre um caso e o dinheiro volta. */}
            {orderCovered(o) || (state.disputes || []).some((d) => d.refId === o.id) ? (
              <GuaranteeButton kind="pedido" refId={o.id} title={`Pedido ${o.store}`} amount={o.total} deliveredAt={o.status === 'Entregue' ? o.deliveredAt : null} />
            ) : null}
          </Card>
        );
      })}
      </>
      )}
      {track && track.order ? (
        <DeliveryTracker
          visible
          onClose={() => setTrack(null)}
          trackId={track.order.id}
          kind={isFood(track.order) ? 'motoboy' : 'entregador'}
          who={courierOf(track.order)}
          from={track.order.store}
          to="Seu endereço"
          etaMin={isFood(track.order) ? 14 : 25}
          onArrived={() => {
            dispatch({ type: 'ADVANCE_ORDER', id: track.order.id });
            setTrack(null);
          }}
        />
      ) : null}
      {track && track.ride ? (
        <DeliveryTracker
          visible
          onClose={() => setTrack(null)}
          trackId={track.ride.id}
          kind={/motorista|carro|transporte|uber/i.test(`${track.ride.serviceKey} ${track.ride.serviceLabel}`) ? 'motorista' : /motoboy|entrega/i.test(`${track.ride.serviceKey} ${track.ride.serviceLabel}`) ? 'motoboy' : 'prestador'}
          who={track.ride.provider}
          from={track.ride.from && track.ride.from !== 'Sua localização atual' ? track.ride.from : `Saindo de perto de você`}
          to={track.ride.to || track.ride.address || 'Seu endereço'}
          etaMin={track.ride.eta || 10}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2B649', borderRadius: 12, paddingVertical: 10, marginTop: 10 },
  trackText: { color: '#0B1124', fontWeight: '800', marginLeft: 6 },
  trackLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginLeft: 8 },
  qBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  qNum: { width: 26, textAlign: 'center', fontWeight: '800', color: colors.text },
  sumRow: { justifyContent: 'space-between', paddingVertical: 3 },
  sumLabel: { color: colors.muted, fontSize: 13 },
  sumValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
  viewRow: { flexDirection: 'row', marginTop: -8, marginBottom: 10 },
  viewItem: { paddingVertical: 6, paddingHorizontal: 10, marginRight: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  viewOn: { borderBottomColor: colors.gold },
  viewText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  viewTextOn: { color: colors.text, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 10 },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4, marginBottom: 8 },
  courier: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 10, marginTop: 10 },
  courierPhoto: { width: 44, height: 44, borderRadius: 22 },
  tipBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2B649', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#E2B649', marginLeft: 8 },
  tipText: { color: '#0B1124', fontWeight: '800', fontSize: 12, marginLeft: 4 },
});
