import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, soft } from '../../theme';
import { Card, Row, Button, Photo } from '../../components/ui';
import { SHOP_SECTORS } from '../../shopSectorsData';
import { classifyProduct } from '../../productClass';

// Cadastro de produto pelo administrador da loja: fotos, nome, descrição, preço e estoque.
// O Realys descobre sozinho onde o produto aparece no Shop (setor › subgrupo) pelo nome e pela
// descrição; a loja só troca se ele errar. O Realys só vende produtos NOVOS (sem uso).
const MAX_PHOTOS = 6;
const GOLD = '#E2B649';

async function pickPhotos(limit) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Autorize o Realys a ver suas fotos para escolher as do produto.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: limit, quality: 0.8 });
  if (res.canceled) return [];
  return (res.assets || []).map((x) => x.uri);
}

export default function ProductForm({ onSave, onCancel }) {
  const [photos, setPhotos] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [ship, setShip] = useState(true);
  const [manual, setManual] = useState(null); // { sector, group } quando a loja troca
  const [choosing, setChoosing] = useState(false);

  // Classificação automática (refaz enquanto a loja digita o nome e a descrição).
  const auto = useMemo(() => (name.trim().length >= 3 ? classifyProduct(name, desc) : null), [name, desc]);
  const cls = manual
    ? { ...manual, label: `${SHOP_SECTORS[manual.sector].title} › ${(SHOP_SECTORS[manual.sector].groups.find((g) => g.key === manual.group) || {}).label}` }
    : auto;
  useEffect(() => setChoosing(false), [auto && auto.label]);

  const addPhotos = async () => {
    const free = MAX_PHOTOS - photos.length;
    if (free <= 0) return Alert.alert('Até 6 fotos', 'Tire uma foto para colocar outra.');
    const got = await pickPhotos(free);
    if (got.length) setPhotos([...photos, ...got].slice(0, MAX_PHOTOS));
  };

  const save = () => {
    const p = parseFloat(price.replace(/\./g, '').replace(',', '.'));
    const c = parseFloat(cost.replace(/\./g, '').replace(',', '.'));
    const q = parseInt(stock, 10);
    if (!name.trim() || isNaN(p) || isNaN(q)) return Alert.alert('Falta pouco', 'Preencha nome, preço e quantidade.');
    if (!photos.length) return Alert.alert('Coloque uma foto', 'Produto com foto vende muito mais. A primeira foto é a capa.');
    if (!cls) return Alert.alert('Onde ele aparece no Shop?', 'Não consegui descobrir a categoria pelo nome. Toque em "escolher" e marque o setor do produto.');
    onSave({
      name: name.trim(),
      desc: desc.trim(),
      photos,
      price: p,
      cost: isNaN(c) ? p * 0.7 : c,
      stock: q,
      sector: cls.sector,
      group: cls.group,
      ship,
      isNew: true,
      createdAt: Date.now(),
    });
  };

  return (
    <Card>
      <Text style={styles.title}>Novo produto</Text>

      <Text style={styles.k}>FOTOS DO PRODUTO (ATÉ {MAX_PHOTOS}) · A PRIMEIRA É A CAPA</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((u, i) => (
          <TouchableOpacity key={u + i} onPress={() => setPhotos([u, ...photos.filter((_, j) => j !== i)])} activeOpacity={0.85} style={{ marginRight: 6 }}>
            <Photo uri={u} style={styles.ph} fallback="📦" />
            {!i ? <Text style={styles.capa}>CAPA</Text> : null}
            <TouchableOpacity style={styles.phX} onPress={() => setPhotos(photos.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="Tirar foto">
              <Ionicons name="close" size={12} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <TouchableOpacity style={[styles.ph, styles.phAdd]} onPress={addPhotos} accessibilityLabel="Adicionar fotos do produto">
            <Ionicons name="add" size={26} color="#A8790A" />
            <Text style={{ color: '#A8790A', fontSize: 9, fontWeight: '800' }}>FOTO</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Text style={styles.k}>NOME E DESCRIÇÃO</Text>
      <TextInput style={styles.in} placeholder="Ex.: Tênis Casual Unissex Branco" placeholderTextColor={colors.muted} value={name} onChangeText={setName} maxLength={80} />
      <TextInput
        style={[styles.in, { minHeight: 70, textAlignVertical: 'top' }]}
        placeholder="Material, tamanhos, cores, o que vem na caixa…"
        placeholderTextColor={colors.muted}
        value={desc}
        onChangeText={setDesc}
        multiline
        maxLength={600}
      />

      <Text style={styles.k}>ONDE APARECE NO SHOP{manual ? '' : ' · AUTOMÁTICO'}</Text>
      {cls ? (
        <View style={styles.auto}>
          <Text style={{ fontSize: 18 }}>{manual ? '✅' : '✨'}</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.autoLabel}>{cls.label}</Text>
            <Text style={styles.why}>{manual ? 'Escolhido por você' : 'O Realys classificou pelo nome e pela descrição'}</Text>
          </View>
          <TouchableOpacity onPress={() => setChoosing(!choosing)} hitSlop={8}>
            <Text style={styles.chg}>{choosing ? 'fechar' : 'trocar'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.auto, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ fontSize: 18 }}>🔎</Text>
          <Text style={[styles.why, { flex: 1, marginLeft: 8, marginTop: 0 }]}>
            {name.trim().length < 3 ? 'Digite o nome: o Realys descobre a categoria sozinho.' : 'Não reconheci este produto. Escolha onde ele aparece.'}
          </Text>
          {name.trim().length >= 3 ? (
            <TouchableOpacity onPress={() => setChoosing(!choosing)} hitSlop={8}>
              <Text style={styles.chg}>escolher</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {choosing ? (
        <View style={styles.chooser}>
          {Object.values(SHOP_SECTORS).map((s) => (
            <View key={s.key} style={{ marginBottom: 6 }}>
              <Text style={styles.secTitle}>{s.title}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {s.groups
                  .filter((g) => g.key !== 'todos')
                  .map((g) => {
                    const on = cls && cls.sector === s.key && cls.group === g.key;
                    return (
                      <TouchableOpacity
                        key={g.key}
                        style={[styles.pill, on && styles.pillOn]}
                        onPress={() => {
                          setManual({ sector: s.key, group: g.key });
                          setChoosing(false);
                        }}
                      >
                        <Text style={[styles.pillText, on && { color: '#fff' }]}>
                          {g.icon} {g.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          ))}
          {manual ? (
            <TouchableOpacity onPress={() => (setManual(null), setChoosing(false))}>
              <Text style={[styles.chg, { textAlign: 'center', marginTop: 4 }]}>Voltar para a escolha automática</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.k}>PREÇO E ESTOQUE</Text>
      <Row>
        <TextInput style={[styles.in, { flex: 1, marginRight: 6 }]} placeholder="Preço R$" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <TextInput style={[styles.in, { flex: 1, marginLeft: 6 }]} placeholder="Quantidade" placeholderTextColor={colors.muted} keyboardType="number-pad" value={stock} onChangeText={setStock} />
      </Row>
      <TextInput style={styles.in} placeholder="Custo R$ (opcional, só você vê)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={cost} onChangeText={setCost} />

      <View style={styles.novo}>
        <Ionicons name="checkmark-circle" size={20} color="#2E9E62" />
        <Text style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 12, lineHeight: 17 }}>
          <Text style={{ fontWeight: '800' }}>Produto novo.</Text> O Realys só vende itens novos, sem uso. Anúncio de usado é retirado.
        </Text>
      </View>
      <Row style={styles.shipRow}>
        <Text style={{ color: colors.text, flex: 1 }}>Envia para todo o Brasil</Text>
        <Switch value={ship} onValueChange={setShip} trackColor={{ true: GOLD, false: colors.border }} thumbColor="#fff" />
      </Row>

      <Button title="Publicar na minha loja e no Shop" onPress={save} style={{ marginTop: 10 }} />
      <Button title="Cancelar" variant="outline" onPress={onCancel} style={{ marginTop: 8 }} />
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Aparece na sua página e no Shop logo depois de publicar</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 2 },
  k: { color: colors.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  ph: { width: 72, height: 72, borderRadius: 12 },
  phAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: GOLD, backgroundColor: '#FFFBEF', alignItems: 'center', justifyContent: 'center' },
  capa: { position: 'absolute', left: 4, bottom: 4, backgroundColor: GOLD, color: '#fff', fontSize: 8, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  phX: { position: 'absolute', right: 4, top: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  in: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14, marginBottom: 6 },
  auto: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEF', borderWidth: 1.5, borderColor: GOLD, borderRadius: 14, padding: 10 },
  autoLabel: { color: colors.text, fontWeight: '800', fontSize: 14 },
  why: { color: colors.muted, fontSize: 11, marginTop: 2 },
  chg: { color: '#A8790A', fontWeight: '800', fontSize: 12 },
  chooser: { backgroundColor: colors.card, borderRadius: 14, padding: 10, marginTop: 6, ...soft },
  secTitle: { color: colors.text, fontWeight: '800', fontSize: 12, marginBottom: 4 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, marginBottom: 5, backgroundColor: colors.card },
  pillOn: { backgroundColor: '#1F2A44', borderColor: '#1F2A44' },
  pillText: { color: colors.text, fontSize: 11.5 },
  novo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF6EF', borderRadius: 12, padding: 10, marginTop: 8 },
  shipRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
});
