// Desapego: clientes vendendo itens usados entre eles, com a Garantia Re@lys.
// O comprador paga pelo Re@lys, o dinheiro fica retido e só vai para o vendedor quando o comprador
// confirma que recebeu (QR Code na entrega). Sem pagamento por fora, sem golpe.
// Texto passa pela moderação; foto segue a regra de nudez; anúncio com nome real (biometria).
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { colors, brl } from '../../theme';
import { Screen, Title, Card, Row, Photo, Empty } from '../../components/ui';
import { moderateText, PHOTO_RULE } from '../../moderation';
import { DESAPEGO_CATS, DESAPEGO_CONDITIONS, desapegoFee } from '../../desapego';

export default function DesapegoScreen() {
  const { state, dispatch } = useStore();
  const [cat, setCat] = useState('todos');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(false);
  const me = state.user && state.user.name;
  const list = (state.desapego || []).filter((x) => x.status !== 'vendido' && (cat === 'todos' || x.cat === cat) && (!q.trim() || (x.title + ' ' + x.desc).toLowerCase().includes(q.trim().toLowerCase())));
  const mine = (state.desapego || []).filter((x) => x.seller === me || x.buyer === me);

  const buy = (x) => {
    if (state.wallet < x.price) return Alert.alert('Saldo insuficiente', `Seu saldo é ${brl(state.wallet)}. Adicione saldo na Carteira.`);
    Alert.alert(`Comprar ${x.title}`, `${brl(x.price)} pela Garantia Re@lys: o dinheiro fica retido e só vai para ${x.seller.split(' ')[0]} quando você confirmar que recebeu. Não pague por fora.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Comprar', onPress: () => (dispatch({ type: 'DESAPEGO_BUY', id: x.id }), setOpen(null)) },
    ]);
  };

  return (
    <Screen>
      <Title sub="Usados entre pessoas verificadas, com a Garantia Re@lys">Desapego</Title>
      <TouchableOpacity style={st.sell} onPress={() => setForm(true)}>
        <Ionicons name="pricetag-outline" size={20} color="#fff" />
        <Text style={st.sellText}>Anunciar um desapego</Text>
      </TouchableOpacity>
      <TextInput style={st.search} value={q} onChangeText={setQ} placeholder="Buscar: bicicleta, sofá, celular…" placeholderTextColor={colors.muted} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {[['todos', 'Todos'], ...DESAPEGO_CATS].map(([k, l]) => (
          <TouchableOpacity key={k} style={[st.chip, cat === k && st.chipOn]} onPress={() => setCat(k)}>
            <Text style={[st.chipText, cat === k && { color: '#fff' }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {mine.filter((x) => x.status === 'reservado').map((x) => (
        <Card key={'m' + x.id} style={{ borderColor: colors.primary, borderWidth: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{x.buyer === me ? 'Você comprou' : 'Você vendeu'}: {x.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            {brl(x.price)} retido na Garantia Re@lys{x.seller === me ? ` · você recebe ${brl(x.price - desapegoFee(x.price))} quando o comprador confirmar` : ''}
          </Text>
          {x.buyer === me ? (
            <Row style={{ marginTop: 8 }}>
              <TouchableOpacity onPress={() => dispatch({ type: 'DESAPEGO_RECEIVED', id: x.id })} style={{ marginRight: 18 }}>
                <Text style={{ color: colors.success, fontWeight: '700' }}>Recebi, tudo certo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Abrir um caso', 'Conte o problema pelo suporte: o Re@lys analisa o chat, as fotos e o QR da entrega, e o dinheiro continua retido enquanto isso.')}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Deu problema</Text>
              </TouchableOpacity>
            </Row>
          ) : null}
        </Card>
      ))}

      {!list.length ? <Empty text="Nenhum desapego por aqui ainda. Que tal anunciar o primeiro?" /> : null}
      <View style={st.grid}>
        {list.map((x) => (
          <TouchableOpacity key={x.id} style={st.item} onPress={() => setOpen(x)} activeOpacity={0.85}>
            <Photo uri={x.photo} style={st.img} fallback="📦" />
            <Text style={st.price}>{brl(x.price)}</Text>
            <Text style={st.itemTitle} numberOfLines={2}>{x.title}</Text>
            <Text style={st.itemSub} numberOfLines={1}>{x.condition} · {x.place}</Text>
            {x.status === 'reservado' ? <Text style={[st.itemSub, { color: '#C77D12', fontWeight: '700' }]}>Reservado</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      <ItemModal x={open} me={me} onClose={() => setOpen(null)} onBuy={buy} onRemove={(x) => (dispatch({ type: 'DESAPEGO_REMOVE', id: x.id }), setOpen(null))} />
      <SellModal visible={form} onClose={() => setForm(false)} />
    </Screen>
  );
}

function ItemModal({ x, me, onClose, onBuy, onRemove }) {
  const insets = useSafeAreaInsets();
  if (!x) return null;
  const own = x.seller === me;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}>
        <Photo uri={x.photo} style={{ width: '100%', height: 300 }} fallback="📦" />
        <TouchableOpacity onPress={onClose} style={[st.close, { top: insets.top + 10 }]} accessibilityLabel="Fechar">
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{brl(x.price)}</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 }}>{x.title}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{x.condition} · {x.place}</Text>
          <Text style={{ color: colors.text, marginTop: 12, lineHeight: 21 }}>{x.desc}</Text>
          <Text style={{ color: colors.muted, marginTop: 12 }}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primary} /> Vendedor verificado por biometria: {x.seller}
          </Text>
          {own ? (
            <TouchableOpacity style={[st.buy, { backgroundColor: colors.danger }]} onPress={() => onRemove(x)}>
              <Text style={st.buyText}>Tirar o anúncio</Text>
            </TouchableOpacity>
          ) : x.status === 'reservado' ? (
            <Text style={{ color: '#C77D12', fontWeight: '700', marginTop: 16 }}>Reservado para outra pessoa.</Text>
          ) : (
            <TouchableOpacity style={st.buy} onPress={() => onBuy(x)}>
              <Text style={st.buyText}>Comprar com a Garantia Re@lys</Text>
            </TouchableOpacity>
          )}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>Pagou pelo Re@lys, está protegido. Pagamento por fora não tem garantia.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

function SellModal({ visible, onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [place, setPlace] = useState('');
  const [cat, setCat] = useState(DESAPEGO_CATS[0][0]);
  const [condition, setCondition] = useState(DESAPEGO_CONDITIONS[1]);
  const [photo, setPhoto] = useState(null);
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };
  const save = () => {
    const v = Number(String(price).replace(/\./g, '').replace(',', '.'));
    if (!title.trim() || !(v > 0)) return Alert.alert('Faltam dados', 'Informe o que é e o preço.');
    const m = moderateText(`${title} ${desc}`, 'publico');
    if (!m.ok) return Alert.alert('Não foi publicado', m.why);
    const go = () => {
      dispatch({ type: 'DESAPEGO_ADD', item: { title: title.trim(), price: +v.toFixed(2), desc: desc.trim(), place: place.trim() || 'perto de você', cat, condition, photo } });
      setTitle('');
      setPrice('');
      setDesc('');
      setPlace('');
      setPhoto(null);
      onClose();
    };
    if (photo) Alert.alert('Antes de publicar a foto', PHOTO_RULE, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Está dentro da regra', onPress: go }]);
    else go();
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 30 + insets.bottom }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Anunciar desapego</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar">
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </Row>
        <TouchableOpacity style={st.photoBox} onPress={pick}>
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 14 }} /> : <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Foto do item</Text>}
        </TouchableOpacity>
        <TextInput style={st.input} value={title} onChangeText={setTitle} placeholder="O que você está vendendo?" placeholderTextColor={colors.muted} maxLength={80} />
        <TextInput style={st.input} value={price} onChangeText={setPrice} placeholder="Preço (R$)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
        <TextInput style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc} placeholder="Estado, tempo de uso, defeitos…" placeholderTextColor={colors.muted} multiline maxLength={600} />
        <TextInput style={st.input} value={place} onChangeText={setPlace} placeholder="Bairro e cidade (nunca o endereço)" placeholderTextColor={colors.muted} maxLength={60} />
        <Text style={st.label}>Categoria</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DESAPEGO_CATS.map(([k, l]) => (
            <TouchableOpacity key={k} style={[st.chip, cat === k && st.chipOn]} onPress={() => setCat(k)}>
              <Text style={[st.chipText, cat === k && { color: '#fff' }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={st.label}>Estado</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DESAPEGO_CONDITIONS.map((c) => (
            <TouchableOpacity key={c} style={[st.chip, condition === c && st.chipOn]} onPress={() => setCondition(c)}>
              <Text style={[st.chipText, condition === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>
          Taxa do Re@lys: 10% da venda (a mesma dos pedidos), descontada só quando o comprador confirmar. Proibido: armas, remédios, animais, documentos e produtos ilegais.
        </Text>
        <TouchableOpacity style={st.buy} onPress={save}>
          <Text style={st.buyText}>Publicar</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const st = StyleSheet.create({
  sell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, marginBottom: 10 },
  sellText: { color: '#fff', fontWeight: '800', marginLeft: 8 },
  search: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 10 },
  chip: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  item: { width: '48%', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  img: { width: '100%', height: 130 },
  price: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 8, marginHorizontal: 10 },
  itemTitle: { color: colors.text, marginHorizontal: 10, marginTop: 2 },
  itemSub: { color: colors.muted, fontSize: 12, marginHorizontal: 10, marginTop: 2, marginBottom: 8 },
  close: { position: 'absolute', right: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  buy: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  buyText: { color: '#fff', fontWeight: '800' },
  photoBox: { height: 180, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 10 },
  label: { color: colors.text, fontWeight: '800', marginTop: 6, marginBottom: 6 },
});
