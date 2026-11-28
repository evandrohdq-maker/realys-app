import React, { useState } from 'react';
import { OpenRequests } from '../../components/Engage';
import { View, TouchableOpacity, ScrollView, Alert, StyleSheet, Switch } from 'react-native';
import { Text } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { MY_SUPPLIER_ID } from '../../data';
import { colors, brl, soft } from '../../theme';
import { Screen, Title, Card, Row, Button, Input, Badge, Section, Stat, Empty, Photo } from '../../components/ui';
import { STATUS_COLOR } from '../empresa/B2BScreen';
import { pickPhotos, pickVideo } from '../empresa/ProductForm';
import { MAX_PRODUCT_PHOTOS, MAX_VIDEO_SEC } from '../../productOptions';
import { SupplierStorefront } from '../../components/SupplierShowcase';
import { hasPromo, unitPriceOf, coverOf, PROMO_UNTIL } from '../../supplierShop';

// "Meus produtos" vem primeiro e em destaque: o fornecedor começa cadastrando os produtos dele.
const SEGS = [
  ['produtos', 'Meus produtos', 'cube'],
  ['vitrine', 'Minha vitrine', 'storefront-outline'],
  ['enviar', 'Enviar proposta', 'paper-plane-outline'],
  ['enviadas', 'Enviadas', 'send-outline'],
  ['recebidas', 'Recebidas', 'mail-unread-outline'],
];
const VALIDITY = ['hoje', 'amanhã', 'sexta', '7 dias', '30 dias'];
const EMOJIS = ['📦', '🥫', '🧀', '🥩', '🍷', '🧴', '🧻', '🥤', '🍞', '🛠️'];

export default function SupplierScreen() {
  const { state, dispatch } = useStore();
  const [seg, setSeg] = useState('produtos');
  const [form, setForm] = useState(null); // null | 'novo' | item (editar)
  const [editPage, setEditPage] = useState(false);
  const me = state.suppliers.find((x) => x.id === MY_SUPPLIER_ID) || {};
  const myItems = state.supplierItems.filter((i) => i.supplierId === MY_SUPPLIER_ID).sort((a, b) => !!b.featured - !!a.featured);
  const incoming = state.proposals.filter((p) => myItems.some((i) => i.id === p.itemId));
  const sent = state.offers.filter((o) => myItems.some((i) => i.id === o.itemId));
  const itemOf = (id) => myItems.find((i) => i.id === id);
  const value = (itemId, qty, disc) => qty * unitPriceOf(itemOf(itemId)) * (1 - disc / 100);
  const closed =
    incoming.filter((p) => p.status === 'aceita').reduce((s, p) => s + value(p.itemId, p.qty, p.discount), 0) +
    sent.filter((o) => o.status === 'aceita').reduce((s, o) => s + value(o.itemId, o.qty, o.discount), 0);
  const waiting = incoming.filter((p) => p.status === 'pendente').length + sent.filter((o) => o.status === 'contraproposta').length;

  return (
    <Screen>
      <Title sub={`${me.name || 'Fornecedor'} · atacado B2B`}>Painel do fornecedor</Title>
      {/* Em destaque: cadastrar os produtos do fornecedor */}
      <TouchableOpacity style={styles.hero} activeOpacity={0.9} onPress={() => (setSeg('produtos'), setForm('novo'))} accessibilityLabel="Adicionar produto">
        <View style={styles.heroIcon}>
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.heroTitle} numberOfLines={1}>Adicionar produto</Text>
          <Text style={styles.heroSub} numberOfLines={2}>Fotos, vídeo, preço de atacado e promoção. Aparece na sua vitrine para todas as empresas.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
      </TouchableOpacity>
      <OpenRequests kind="b2b" />

      <Row style={{ marginHorizontal: -4, marginBottom: 14 }}>
        <Stat label="Negócios fechados" value={brl(closed)} color={colors.success} />
        <Stat label="Pedem sua resposta" value={String(waiting)} color={colors.accent} />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {SEGS.map(([k, label, icon]) => {
          const on = k === seg;
          const main = k === 'produtos';
          return (
            <TouchableOpacity key={k} style={[styles.chip, main && styles.chipMain, on && styles.chipOn]} onPress={() => setSeg(k)}>
              <Ionicons name={icon} size={main ? 17 : 15} color={on ? colors.onPrimary : colors.primary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chipText, on && { color: colors.onPrimary }]}>{label}</Text>
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
                  <Text style={{ fontSize: 12, color: colors.success, marginTop: 4 }}>✓ Negócio fechado. Pagamento retido pelo Realyz até a entrega.</Text>
                ) : null}
              </Card>
            );
          })}
        </Section>
      ) : null}

      {seg === 'recebidas' ? <Received incoming={incoming} itemOf={itemOf} value={value} /> : null}

      {seg === 'produtos' ? <MyProducts items={myItems} form={form} setForm={setForm} /> : null}

      {seg === 'vitrine' ? (
        <View>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>É assim que as empresas veem a sua página. Capriche nas fotos e nas promoções.</Text>
          <View style={styles.preview}>
            <SupplierStorefront
              supplierId={MY_SUPPLIER_ID}
              owner
              onEditPage={() => setEditPage(true)}
              onEditItem={(it) => (setSeg('produtos'), setForm(it))}
              onAddItem={() => (setSeg('produtos'), setForm('novo'))}
            />
            <View style={{ height: 16 }} />
          </View>
        </View>
      ) : null}
      {editPage ? <EditPage me={me} onClose={() => setEditPage(false)} /> : null}
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
  const unit = item ? unitPriceOf(item) * (1 - d / 100) : 0;

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
                {coverOf(i) ? <Photo uri={coverOf(i)} style={{ width: 98, height: 70, borderRadius: 10 }} fallback={i.emoji} /> : <Text style={{ fontSize: 26 }}>{i.emoji}</Text>}
                <Text numberOfLines={2} style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
                  {i.name}
                </Text>
                <Text style={{ color: hasPromo(i) ? colors.danger : colors.primary, fontWeight: '700', fontSize: 12, marginTop: 2 }}>{brl(unitPriceOf(i))}/un.{hasPromo(i) ? ` · -${i.promo.off}%` : ''}</Text>
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
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{chosen.length === companies.length ? 'Limpar' : 'Selecionar todas'}</Text>
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
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: valid === v ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: '700' }}>{v}</Text>
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

// Meus produtos: cadastrar com fotos e vídeo, destacar, pôr em promoção e editar.
function MyProducts({ items, form, setForm }) {
  const { dispatch } = useStore();
  const promos = items.filter(hasPromo).length;
  const feats = items.filter((i) => i.featured).length;

  if (form) return <ItemForm key={form === 'novo' ? 'novo' : form.id} initial={form === 'novo' ? null : form} onClose={() => setForm(null)} />;

  return (
    <View>
      <Row style={{ marginHorizontal: -4, marginBottom: 12 }}>
        <Stat label="Produtos" value={String(items.length)} />
        <Stat label="Em destaque" value={String(feats)} color={colors.primary} />
        <Stat label="Em promoção" value={String(promos)} color={colors.danger} />
      </Row>

      {!items.length ? <Empty text="Você ainda não tem produtos. Toque em Adicionar produto." /> : null}

      {items.map((i) => (
        <Card key={i.id} style={i.featured ? { borderColor: 'rgba(226,182,73,0.8)', borderWidth: 1.5 } : null}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setForm(i)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View>
                {coverOf(i) ? (
                  <Photo uri={coverOf(i)} style={styles.thumb} fallback={i.emoji} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Text style={{ fontSize: 30 }}>{i.emoji || '📦'}</Text>
                  </View>
                )}
                {i.video ? (
                  <View style={styles.thumbVideo}>
                    <Ionicons name="play" size={10} color="#fff" />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>{i.name}</Text>
                {hasPromo(i) ? (
                  <Text style={{ color: colors.muted, fontSize: 11, textDecorationLine: 'line-through' }}>{brl(i.unitPrice)}</Text>
                ) : null}
                <Text style={{ color: hasPromo(i) ? colors.danger : colors.primary, fontWeight: '700' }} numberOfLines={1}>
                  {brl(unitPriceOf(i))} /un. · mín. {i.minQty}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={1}>
                  {(i.photos || []).length} foto{(i.photos || []).length === 1 ? '' : 's'}{i.video ? ' · vídeo' : ''}
                  {hasPromo(i) ? ` · promoção até ${i.promo.until}` : ''}
                </Text>
              </View>
            </Row>
          </TouchableOpacity>
          <Row style={{ marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.star, i.featured && styles.starOn]}
              onPress={() => dispatch({ type: 'SUPPLIER_TOGGLE_FEATURED', id: i.id })}
              accessibilityLabel={i.featured ? 'Tirar do destaque' : 'Destacar produto'}
            >
              <Ionicons name={i.featured ? 'star' : 'star-outline'} size={14} color={i.featured ? colors.onPrimary : colors.primary} />
              <Text numberOfLines={1} style={[styles.starText, i.featured && { color: colors.onPrimary }]}>{i.featured ? 'Destaque' : 'Destacar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.star, styles.promoBtn, hasPromo(i) && styles.promoBtnOn]}
              onPress={() => (hasPromo(i) ? dispatch({ type: 'SUPPLIER_EDIT_ITEM', id: i.id, patch: { promo: null } }) : setForm({ ...i, _promo: true }))}
              accessibilityLabel={hasPromo(i) ? 'Encerrar promoção' : 'Criar promoção'}
            >
              <Ionicons name="flame" size={14} color={hasPromo(i) ? '#fff' : colors.danger} />
              <Text numberOfLines={1} style={[styles.starText, { color: hasPromo(i) ? '#fff' : colors.danger }]}>{hasPromo(i) ? `-${i.promo.off}% · encerrar` : 'Promoção'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.star, { borderColor: colors.border }]} onPress={() => setForm(i)} accessibilityLabel="Editar produto">
              <Ionicons name="create-outline" size={14} color={colors.text} />
              <Text numberOfLines={1} style={[styles.starText, { color: colors.text }]}>Editar</Text>
            </TouchableOpacity>
          </Row>
        </Card>
      ))}
    </View>
  );
}

// Cadastro / edição do produto: fotos (a 1ª é a capa), vídeo curto, nome, descrição, preço,
// pedido mínimo, destaque e promoção.
function ItemForm({ initial, onClose }) {
  const { dispatch } = useStore();
  const [photos, setPhotos] = useState(initial ? initial.photos || [] : []);
  const [video, setVideo] = useState(initial ? initial.video || null : null);
  const [name, setName] = useState(initial ? initial.name : '');
  const [desc, setDesc] = useState(initial ? initial.desc || '' : '');
  const [price, setPrice] = useState(initial ? String(initial.unitPrice).replace('.', ',') : '');
  const [min, setMin] = useState(initial ? String(initial.minQty) : '');
  const [emoji, setEmoji] = useState(initial ? initial.emoji || EMOJIS[0] : EMOJIS[0]);
  const [featured, setFeatured] = useState(initial ? !!initial.featured : true);
  const [promoOn, setPromoOn] = useState(initial ? hasPromo(initial) || !!initial._promo : false);
  const [promoOff, setPromoOff] = useState(initial && hasPromo(initial) ? String(initial.promo.off) : '');
  const [promoUntil, setPromoUntil] = useState(initial && hasPromo(initial) ? initial.promo.until : 'sexta');

  const p = parseFloat((price || '').replace(/\./g, '').replace(',', '.'));
  const off = parseFloat((promoOff || '').replace(',', '.'));
  const promoPrice = promoOn && !isNaN(p) && off > 0 ? p * (1 - off / 100) : null;

  const addPhotos = async () => {
    const free = MAX_PRODUCT_PHOTOS - photos.length;
    if (free <= 0) return Alert.alert(`Até ${MAX_PRODUCT_PHOTOS} fotos`, 'Tire uma foto para colocar outra.');
    const got = await pickPhotos(free);
    if (got.length) setPhotos([...photos, ...got].slice(0, MAX_PRODUCT_PHOTOS));
  };
  const addVideo = (fromCamera) => async () => {
    const v = await pickVideo(fromCamera);
    if (v) setVideo(v);
  };

  const save = () => {
    const m = parseInt(min, 10);
    if (!name.trim() || isNaN(p) || p <= 0) return Alert.alert('Falta pouco', 'Informe o nome e o preço por unidade.');
    if (!photos.length) return Alert.alert('Coloque uma foto', 'Produto com foto chama muito mais a atenção das empresas. A primeira foto é a capa.');
    if (promoOn && (isNaN(off) || off <= 0 || off > 90)) return Alert.alert('Promoção', 'Informe o desconto da promoção entre 1% e 90%.');
    const data = {
      name: name.trim(),
      desc: desc.trim(),
      unitPrice: +p.toFixed(2),
      minQty: isNaN(m) || m < 1 ? 1 : m,
      emoji,
      photos,
      video,
      featured,
      promo: promoOn ? { off: Math.round(off * 10) / 10, until: promoUntil } : null,
    };
    if (initial) dispatch({ type: 'SUPPLIER_EDIT_ITEM', id: initial.id, patch: data });
    else dispatch({ type: 'SUPPLIER_ADD_ITEM', item: data });
    onClose();
  };

  const remove = () =>
    Alert.alert('Tirar do catálogo?', `${initial.name} sai da sua vitrine.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => (dispatch({ type: 'SUPPLIER_REMOVE_ITEM', id: initial.id }), onClose()) },
    ]);

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{initial ? 'Editar produto' : 'Novo produto'}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="Fechar">
          <Ionicons name="close" size={22} color={colors.muted} />
        </TouchableOpacity>
      </Row>

      {/* Fotos: a primeira é a capa; tocar numa foto faz dela a capa */}
      <Text style={styles.label}>Fotos ({photos.length}/{MAX_PRODUCT_PHOTOS}) · a primeira é a capa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {photos.map((u, i) => (
          <TouchableOpacity key={u + i} onPress={() => setPhotos([u, ...photos.filter((_, j) => j !== i)])} activeOpacity={0.85} style={{ marginRight: 8 }}>
            <Photo uri={u} style={styles.ph} />
            {i === 0 ? <Text style={styles.capa}>CAPA</Text> : null}
            <TouchableOpacity style={styles.phX} onPress={() => setPhotos(photos.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="Tirar foto">
              <Ionicons name="close" size={12} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {photos.length < MAX_PRODUCT_PHOTOS ? (
          <TouchableOpacity style={[styles.ph, styles.phAdd]} onPress={addPhotos} accessibilityLabel="Adicionar fotos">
            <Ionicons name="images-outline" size={24} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11, marginTop: 4 }} numberOfLines={1}>Fotos</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Vídeo curto */}
      <Text style={styles.label}>Vídeo do produto (até {MAX_VIDEO_SEC} s)</Text>
      {video ? (
        <View style={styles.videoRow}>
          <Ionicons name="videocam" size={20} color={colors.primary} />
          <Text style={{ flex: 1, marginLeft: 8, color: colors.text, fontWeight: '700' }} numberOfLines={1}>Vídeo de {String(video.sec || MAX_VIDEO_SEC).replace('.', ',')} s pronto</Text>
          <TouchableOpacity onPress={() => setVideo(null)} hitSlop={8} accessibilityLabel="Tirar vídeo">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <Row style={{ marginBottom: 12 }}>
          <TouchableOpacity style={[styles.videoBtn, { marginRight: 6 }]} onPress={addVideo(false)}>
            <Ionicons name="film-outline" size={18} color={colors.primary} />
            <Text style={styles.videoBtnText} numberOfLines={1}>Da galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.videoBtn, { marginLeft: 6 }]} onPress={addVideo(true)}>
            <Ionicons name="videocam-outline" size={18} color={colors.primary} />
            <Text style={styles.videoBtnText} numberOfLines={1}>Gravar</Text>
          </TouchableOpacity>
        </Row>
      )}
      {video ? <View style={{ height: 12 }} /> : null}

      <Input placeholder="Nome (ex.: Açúcar Refinado 1kg)" value={name} onChangeText={setName} />
      <Input placeholder="Descrição (embalagem, marca, validade, entrega…)" value={desc} onChangeText={setDesc} multiline style={{ minHeight: 64, textAlignVertical: 'top' }} />
      <Row>
        <Input placeholder="Preço por unidade" keyboardType="decimal-pad" value={price} onChangeText={setPrice} style={{ flex: 1, marginRight: 6 }} />
        <Input placeholder="Pedido mínimo" keyboardType="number-pad" value={min} onChangeText={setMin} style={{ flex: 1, marginLeft: 6 }} />
      </Row>

      <Text style={styles.label}>Ícone (aparece se a foto não carregar)</Text>
      <Row style={{ flexWrap: 'wrap', marginBottom: 6 }}>
        {EMOJIS.map((e) => (
          <TouchableOpacity key={e} style={[styles.emoji, emoji === e && styles.emojiOn]} onPress={() => setEmoji(e)}>
            <Text numberOfLines={1} style={{ fontSize: 20 }}>{e}</Text>
          </TouchableOpacity>
        ))}
      </Row>

      {/* Destaque */}
      <View style={styles.toggle}>
        <Ionicons name="star" size={18} color={colors.gold} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>Produto em destaque</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>Aparece grande na sua vitrine e primeiro no catálogo das empresas.</Text>
        </View>
        <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: colors.gold }} />
      </View>

      {/* Promoção */}
      <View style={[styles.toggle, promoOn && { backgroundColor: '#FFF5F3', borderColor: '#F7D4CF' }]}>
        <Ionicons name="flame" size={18} color={colors.danger} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>Promoção</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>Fica em destaque no topo da vitrine, com o preço riscado.</Text>
        </View>
        <Switch value={promoOn} onValueChange={setPromoOn} trackColor={{ true: colors.danger }} />
      </View>
      {promoOn ? (
        <View style={{ marginBottom: 6 }}>
          <Input placeholder="Desconto da promoção %" keyboardType="decimal-pad" value={promoOff} onChangeText={setPromoOff} />
          <Text style={styles.label}>Válida até</Text>
          <Row style={{ flexWrap: 'wrap', marginBottom: 6 }}>
            {PROMO_UNTIL.map((v) => (
              <TouchableOpacity key={v} style={[styles.small, promoUntil === v && styles.smallPromo]} onPress={() => setPromoUntil(v)}>
                <Text numberOfLines={1} style={{ color: promoUntil === v ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </Row>
          {promoPrice != null ? (
            <Text style={{ color: colors.danger, fontWeight: '800', marginBottom: 6 }}>
              De {brl(p)} por {brl(promoPrice)} /un.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Button title={initial ? 'Salvar alterações' : 'Publicar na vitrine'} onPress={save} style={{ marginTop: 6 }} />
      {initial ? <Button variant="outline" title="Tirar do catálogo" onPress={remove} style={{ marginTop: 8 }} /> : null}
    </Card>
  );
}

// Editar a página (vitrine): capa, frase de apresentação e "sobre".
function EditPage({ me, onClose }) {
  const { dispatch } = useStore();
  const [cover, setCover] = useState(me.cover || null);
  const [tagline, setTagline] = useState(me.tagline || '');
  const [about, setAbout] = useState(me.about || '');
  const [perks, setPerks] = useState((me.perks || []).join(', '));
  const pickCover = async () => {
    const got = await pickPhotos(1);
    if (got[0]) setCover(got[0]);
  };
  const save = () => {
    dispatch({
      type: 'SUPPLIER_EDIT_PAGE',
      patch: { cover, tagline: tagline.trim(), about: about.trim(), perks: perks.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 6) },
    });
    onClose();
  };
  return (
    <Card style={{ marginTop: 12 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Editar vitrine</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="Fechar">
          <Ionicons name="close" size={22} color={colors.muted} />
        </TouchableOpacity>
      </Row>
      <TouchableOpacity onPress={pickCover} activeOpacity={0.85}>
        {cover ? <Photo uri={cover} style={styles.coverEdit} /> : <View style={[styles.coverEdit, styles.phAdd]} />}
        <View style={styles.coverBtn}>
          <Ionicons name="image-outline" size={14} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginLeft: 4 }} numberOfLines={1}>Trocar capa</Text>
        </View>
      </TouchableOpacity>
      <Input placeholder="Frase da vitrine (ex.: Direto do produtor para a sua empresa)" value={tagline} onChangeText={setTagline} style={{ marginTop: 12 }} />
      <Input placeholder="Sobre o fornecedor" value={about} onChangeText={setAbout} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <Input placeholder="Vantagens, separadas por vírgula (ex.: Entrega em 24 h, Nota fiscal)" value={perks} onChangeText={setPerks} />
      <Button title="Salvar vitrine" onPress={save} />
    </Card>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
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
  small: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  smallOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  emoji: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  emojiOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  star: { flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, marginRight: 6 },
  starOn: { backgroundColor: colors.primary },
  starText: { color: colors.primary, fontSize: 11, fontWeight: '700', marginLeft: 4 },
  promoBtn: { borderColor: '#F2B8B5' },
  promoBtnOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipMain: { minHeight: 42, paddingHorizontal: 16, borderRadius: 21, borderColor: colors.gold, borderWidth: 1.5 },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.gold, ...soft },
  heroIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  heroSub: { color: colors.primaryDark, fontSize: 12, marginTop: 2, lineHeight: 16 },
  preview: { marginHorizontal: -18, backgroundColor: colors.bg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  thumb: { width: 72, height: 72, borderRadius: 14 },
  thumbEmpty: { backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  thumbVideo: { position: 'absolute', right: 4, bottom: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(20,18,14,0.7)', alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  ph: { width: 84, height: 84, borderRadius: 14 },
  phAdd: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFFBEF', alignItems: 'center', justifyContent: 'center' },
  phX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(20,18,14,0.7)', alignItems: 'center', justifyContent: 'center' },
  capa: { position: 'absolute', bottom: 4, left: 4, backgroundColor: colors.primary, color: '#fff', fontSize: 9, fontWeight: '800', paddingHorizontal: 5, borderRadius: 6, overflow: 'hidden' },
  videoRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, backgroundColor: '#FFFBEF', borderWidth: 1, borderColor: '#F0E2B6' },
  videoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFFBEF' },
  videoBtnText: { color: colors.primary, fontWeight: '700', marginLeft: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, marginBottom: 10 },
  smallPromo: { backgroundColor: colors.danger, borderColor: colors.danger },
  coverEdit: { width: '100%', height: 140, borderRadius: 14 },
  coverBtn: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, height: 28, borderRadius: 14 },
});
