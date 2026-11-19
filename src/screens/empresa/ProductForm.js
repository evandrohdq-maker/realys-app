import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Text, TextInput } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, soft } from '../../theme';
import { Card, Row, Button, Photo } from '../../components/ui';
import { SHOP_SECTORS } from '../../shopSectorsData';
import { classifyProduct } from '../../productClass';
import { classifyFood, FOOD_CLASSES, MODOS, rotuloClasse, subclasseByKey } from '../../foodClasses';
import { MAX_PRODUCT_PHOTOS, MAX_VIDEO_SEC, COLORS, suggestFor, groupFromSuggestion, cleanOptions } from '../../productOptions';

// Cadastro de produto pelo administrador da loja: fotos, nome, descrição, preço e estoque.
// O Re@lys descobre sozinho onde o produto aparece no Shop (setor › subgrupo) pelo nome e pela
// descrição; a loja só troca se ele errar. O Re@lys só vende produtos NOVOS (sem uso).
const MAX_PHOTOS = MAX_PRODUCT_PHOTOS; // até 5 fotos por produto
const GOLD = '#F5C331';

async function pickPhotos(limit) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Autorize o Re@lys a ver suas fotos para escolher as do produto.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: limit, quality: 0.8 });
  if (res.canceled) return [];
  return (res.assets || []).map((x) => x.uri);
}

// Vídeo curto do produto (até 5 segundos): da galeria ou gravando na hora (a câmera para sozinha nos 5 s).
async function pickVideo(fromCamera) {
  const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', fromCamera ? 'Autorize a câmera para gravar o vídeo do produto.' : 'Autorize o Re@lys a ver seus vídeos.');
    return null;
  }
  const opts = { mediaTypes: ['videos'], videoMaxDuration: MAX_VIDEO_SEC, allowsEditing: true, quality: 0.7 };
  const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const a = res.assets[0];
  const sec = a.duration ? a.duration / 1000 : 0;
  if (sec > MAX_VIDEO_SEC + 0.6) {
    Alert.alert('Vídeo longo demais', `O vídeo do produto tem até ${MAX_VIDEO_SEC} segundos (esse tem ${Math.round(sec)}). Corte no celular ou grave de novo pelo botão Gravar.`);
    return null;
  }
  return { uri: a.uri, sec: sec ? Math.min(MAX_VIDEO_SEC, Math.round(sec * 10) / 10) : MAX_VIDEO_SEC };
}

// food = loja de comida (Alimentação, Bares, Doces e cafés, Mercado): a classificação vem de
// foodClasses (classe › subclasse) e o cadastro pergunta o modo de atendimento.
export default function ProductForm({ onSave, onCancel, food = false, categoria = 'Alimentação' }) {
  const [photos, setPhotos] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [ship, setShip] = useState(true);
  const [manual, setManual] = useState(null); // { sector, group } (Shop) ou { classe, subclasse } (Food) quando a loja troca
  const [modosManual, setModosManual] = useState(null); // modos escolhidos pela loja (Food)
  const [choosing, setChoosing] = useState(false);
  // Destaque do produto: vídeo de 5 s, opções que o cliente escolhe (cor, metragem, tamanho…) e ficha.
  const [video, setVideo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [touched, setTouched] = useState(false); // a loja mexeu nas opções: não troca mais sozinho
  const [newVal, setNewVal] = useState({});
  const sug = useMemo(() => (food || name.trim().length < 3 ? null : suggestFor(name, desc)), [name, desc, food]);
  useEffect(() => {
    if (!sug || touched) return;
    setGroups(sug.options.map(groupFromSuggestion));
    setSpecs((old) => sug.specs.map((k) => ({ k, v: (old.find((x) => x.k === k) || {}).v || '' })));
  }, [sug]);
  const edit = (fn) => {
    setTouched(true);
    setGroups(fn);
  };
  const toggleVal = (gi, label, hex) =>
    edit((gs) => gs.map((g, i) => {
      if (i !== gi) return g;
      const has = g.values.find((v) => v.label === label);
      if (g.colors) return { ...g, values: has ? g.values.filter((v) => v.label !== label) : [...g.values, { label, hex, on: true }] };
      return { ...g, values: g.values.map((v) => (v.label === label ? { ...v, on: !v.on } : v)) };
    }));
  const addVal = (gi) => {
    const label = (newVal[gi] || '').trim();
    if (!label) return;
    edit((gs) => gs.map((g, i) => (i === gi && !g.values.some((v) => v.label === label) ? { ...g, values: [...g.values, { label, on: true }] } : g)));
    setNewVal({ ...newVal, [gi]: '' });
  };
  const setValStock = (gi, label, n) => edit((gs) => gs.map((g, i) => (i !== gi ? g : { ...g, values: g.values.map((v) => (v.label === label ? { ...v, stock: n.replace(/[^0-9]/g, '') } : v)) })));
  const perStockGroup = groups.findIndex((g) => g.perStock);
  const stockFromOptions = perStockGroup >= 0 ? groups[perStockGroup].values.filter((v) => v.on !== false).reduce((t, v) => t + (parseInt(v.stock, 10) || 0), 0) : null;
  const addVideo = () =>
    Alert.alert('Vídeo do produto (5 s)', 'Mostre o produto de pertinho: girando, ligado, a cor de verdade.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Da galeria', onPress: async () => { const v = await pickVideo(false); if (v) setVideo(v); } },
      { text: 'Gravar agora', onPress: async () => { const v = await pickVideo(true); if (v) setVideo(v); } },
    ]);

  // Classificação automática (refaz enquanto a loja digita o nome e a descrição).
  const auto = useMemo(() => {
    if (name.trim().length < 3) return null;
    if (food) return classifyFood(name, desc, categoria);
    return classifyProduct(name, desc);
  }, [name, desc, food, categoria]);
  const cls = food
    ? manual
      ? { ...manual, label: rotuloClasse(manual.classe, manual.subclasse), modos: auto ? auto.modos : MODOS.map((m) => m.key), maioridade: !!(subclasseByKey(manual.classe, manual.subclasse) || {}).maioridade }
      : auto
    : manual
    ? { ...manual, label: `${SHOP_SECTORS[manual.sector].title} › ${(SHOP_SECTORS[manual.sector].groups.find((g) => g.key === manual.group) || {}).label}` }
    : auto;
  useEffect(() => setChoosing(false), [auto && auto.label]);
  useEffect(() => setModosManual(null), [auto && auto.label]);
  // Modos de atendimento: o que o Re@lys decidiu pelo produto, a menos que a loja mude.
  const modos = modosManual || (cls && cls.modos) || MODOS.map((m) => m.key);
  const toggleModo = (k) => {
    const atual = modos.includes(k) ? modos.filter((x) => x !== k) : [...modos, k];
    if (atual.length) setModosManual(MODOS.map((m) => m.key).filter((x) => atual.includes(x)));
  };

  const addPhotos = async () => {
    const free = MAX_PHOTOS - photos.length;
    if (free <= 0) return Alert.alert(`Até ${MAX_PHOTOS} fotos`, 'Tire uma foto para colocar outra.');
    const got = await pickPhotos(free);
    if (got.length) setPhotos([...photos, ...got].slice(0, MAX_PHOTOS));
  };

  const save = () => {
    const p = parseFloat(price.replace(/\./g, '').replace(',', '.'));
    const c = parseFloat(cost.replace(/\./g, '').replace(',', '.'));
    const q = stockFromOptions != null ? stockFromOptions : parseInt(stock, 10);
    if (!name.trim() || isNaN(p) || isNaN(q)) return Alert.alert('Falta pouco', 'Preencha nome, preço e quantidade disponível.');
    const options = cleanOptions(groups.map((g) => (g.perStock ? g : { ...g, values: g.values.map(({ stock: _s, ...v }) => v) })));
    const ficha = specs.filter((x) => x.k.trim() && String(x.v).trim()).map((x) => ({ k: x.k.trim(), v: String(x.v).trim() }));
    if (!photos.length) return Alert.alert('Coloque uma foto', 'Produto com foto vende muito mais. A primeira foto é a capa.');
    if (!cls) return Alert.alert(food ? 'Em que classe ele entra?' : 'Onde ele aparece no Shop?', 'Não consegui descobrir a categoria pelo nome. Toque em "escolher" e marque a classe do produto.');
    if (food) {
      return onSave({
        name: name.trim(),
        desc: desc.trim(),
        photos,
        price: p,
        cost: isNaN(c) ? p * 0.7 : c,
        stock: q,
        classe: cls.classe,
        subclasse: cls.subclasse,
        modos,
        maioridade: !!cls.maioridade,
        video,
        isNew: true,
        createdAt: Date.now(),
      });
    }
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
      options,
      specs: ficha,
      video,
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
            {!i ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.capa}>CAPA</Text> : null}
            <TouchableOpacity style={styles.phX} onPress={() => setPhotos(photos.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="Tirar foto">
              <Ionicons name="close" size={12} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <TouchableOpacity style={[styles.ph, styles.phAdd]} onPress={addPhotos} accessibilityLabel="Adicionar fotos do produto">
            <Ionicons name="add" size={26} color="#B8860B" />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#B8860B', fontSize: 9, fontWeight: '800' }}>FOTO</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Text style={styles.k}>VÍDEO CURTO · ATÉ {MAX_VIDEO_SEC} SEGUNDOS</Text>
      {video ? (
        <View style={styles.videoRow}>
          <Ionicons name="videocam" size={20} color="#B8860B" />
          <Text style={{ flex: 1, marginLeft: 8, color: colors.text, fontWeight: '700' }} numberOfLines={1}>Vídeo de {String(video.sec).replace('.', ',')} s pronto</Text>
          <TouchableOpacity onPress={addVideo} hitSlop={8}><Text style={styles.chg}>trocar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setVideo(null)} hitSlop={8} style={{ marginLeft: 12 }}><Text style={[styles.chg, { color: colors.danger }]}>tirar</Text></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.videoRow, styles.phAdd, { flexDirection: 'row' }]} onPress={addVideo} accessibilityLabel="Adicionar vídeo de 5 segundos do produto">
          <Ionicons name="videocam-outline" size={20} color="#B8860B" />
          <Text style={{ marginLeft: 8, color: '#B8860B', fontWeight: '800', fontSize: 12.5 }} numberOfLines={1}>Adicionar vídeo do produto</Text>
        </TouchableOpacity>
      )}

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

      <Text style={styles.k}>{food ? 'CLASSE NO CARDÁPIO' : 'ONDE APARECE NO SHOP'}{manual ? '' : ' · AUTOMÁTICO'}</Text>
      {cls ? (
        <View style={styles.auto}>
          <Text style={{ fontSize: 18 }}>{manual ? '✅' : '✨'}</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.autoLabel}>{cls.label}</Text>
            <Text style={styles.why}>{manual ? 'Escolhido por você' : food ? 'O Re@lys classificou pelo nome e pela descrição' : 'O Re@lys classificou pelo nome e pela descrição'}</Text>
          </View>
          <TouchableOpacity onPress={() => setChoosing(!choosing)} hitSlop={8}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.chg}>{choosing ? 'fechar' : 'trocar'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.auto, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ fontSize: 18 }}>🔎</Text>
          <Text style={[styles.why, { flex: 1, marginLeft: 8, marginTop: 0 }]}>
            {name.trim().length < 3 ? 'Digite o nome: o Re@lys descobre a categoria sozinho.' : food ? 'Não reconheci este produto. Escolha a classe dele.' : 'Não reconheci este produto. Escolha onde ele aparece.'}
          </Text>
          {name.trim().length >= 3 ? (
            <TouchableOpacity onPress={() => setChoosing(!choosing)} hitSlop={8}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.chg}>escolher</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {choosing && food ? (
        <View style={styles.chooser}>
          {FOOD_CLASSES.map((c) => (
            <View key={c.key} style={{ marginBottom: 6 }}>
              <Text style={styles.secTitle}>{c.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {c.subs.map((sub) => {
                  const on = cls && cls.classe === c.key && cls.subclasse === sub.key;
                  return (
                    <TouchableOpacity
                      key={sub.key}
                      style={[styles.pill, on && styles.pillOn]}
                      onPress={() => {
                        setManual({ classe: c.key, subclasse: sub.key });
                        setChoosing(false);
                      }}
                    >
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.pillText, on && { color: '#fff' }]}>{sub.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          {manual ? (
            <TouchableOpacity onPress={() => (setManual(null), setChoosing(false))}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chg, { textAlign: 'center', marginTop: 4 }]}>Voltar para a escolha automática</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {choosing && !food ? (
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
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.pillText, on && { color: '#fff' }]}>
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
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chg, { textAlign: 'center', marginTop: 4 }]}>Voltar para a escolha automática</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {food && cls ? (
        <>
          <Text style={styles.k}>COMO ATENDE</Text>
          <Row>
            {MODOS.map((m) => {
              const on = modos.includes(m.key);
              return (
                <TouchableOpacity key={m.key} style={[styles.modo, on && styles.pillOn, { flex: 1 }]} onPress={() => toggleModo(m.key)} activeOpacity={0.85}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.pillText, on && { color: '#fff', fontWeight: '800' }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Row>
          <Text style={styles.why}>
            {modosManual ? 'Ajustado por você.' : 'Definido pelo produto. Toque para mudar.'}
            {cls.maioridade ? ' Bebida alcoólica: só para clientes maiores de 18 anos, com a data de nascimento registrada na conta. Na entrega, basta o código do pedido.' : ''}
          </Text>
        </>
      ) : null}

      {!food && name.trim().length >= 3 ? (
        <>
          <Text style={styles.k}>OPÇÕES PARA O CLIENTE ESCOLHER</Text>
          {groups.map((g, gi) => (
            <View key={gi} style={styles.optBox}>
              <Row>
                <TextInput style={[styles.optName]} value={g.name} onChangeText={(t) => edit((gs) => gs.map((x, i) => (i === gi ? { ...x, name: t } : x)))} maxLength={24} />
                <TouchableOpacity onPress={() => edit((gs) => gs.map((x, i) => (i === gi ? { ...x, perStock: !x.perStock } : { ...x, perStock: false })))} hitSlop={6}>
                  <Text style={[styles.chg, { fontSize: 11 }]}>{g.perStock ? '✓ estoque por opção' : 'estoque por opção'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => edit((gs) => gs.filter((_, i) => i !== gi))} hitSlop={8} style={{ marginLeft: 10 }} accessibilityLabel={`Tirar a opção ${g.name}`}>
                  <Ionicons name="trash-outline" size={16} color={colors.muted} />
                </TouchableOpacity>
              </Row>
              {g.colors ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                  {COLORS.map((c) => {
                    const on = g.values.some((v) => v.label === c.label);
                    return (
                      <TouchableOpacity key={c.label} onPress={() => toggleVal(gi, c.label, c.hex)} style={[styles.swatchWrap, on && { borderColor: '#B8860B' }]} accessibilityLabel={`${on ? 'Tirar' : 'Marcar'} a cor ${c.label}`}>
                        <View style={[styles.swatch, { backgroundColor: c.hex }]}>{on ? <Ionicons name="checkmark" size={13} color={c.hex === '#FFFFFF' || c.hex === '#EAF4FB' || c.hex === '#F5C331' || c.hex === '#E6D5B8' ? '#1B1B1F' : '#fff'} /> : null}</View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                  {g.values.map((v) => (
                    <TouchableOpacity key={v.label} onPress={() => toggleVal(gi, v.label)} style={[styles.pill, v.on !== false && styles.pillOn]}>
                      <Text numberOfLines={1} style={[styles.pillText, v.on !== false && { color: '#fff' }]}>{v.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!g.colors ? (
                <Row>
                  <TextInput style={[styles.in, { flex: 1, marginBottom: 0, paddingVertical: 7 }]} placeholder={`Outro valor (ex.: ${g.name === 'Metragem' ? '15 m' : 'novo'})`} placeholderTextColor={colors.muted} value={newVal[gi] || ''} onChangeText={(t) => setNewVal({ ...newVal, [gi]: t })} onSubmitEditing={() => addVal(gi)} maxLength={20} />
                  <TouchableOpacity onPress={() => addVal(gi)} style={{ marginLeft: 8 }} hitSlop={6}><Text style={styles.chg}>+ incluir</Text></TouchableOpacity>
                </Row>
              ) : null}
              {g.perStock ? (
                <View style={{ marginTop: 6 }}>
                  {g.values.filter((v) => v.on !== false).map((v) => (
                    <Row key={v.label} style={{ marginBottom: 4 }}>
                      {v.hex ? <View style={[styles.swatch, { width: 14, height: 14, backgroundColor: v.hex, marginRight: 6 }]} /> : null}
                      <Text style={{ flex: 1, color: colors.text, fontSize: 12.5 }} numberOfLines={1}>{v.label}</Text>
                      <TextInput style={[styles.in, { width: 90, marginBottom: 0, paddingVertical: 5 }]} placeholder="Qtd." placeholderTextColor={colors.muted} keyboardType="number-pad" value={String(v.stock || '')} onChangeText={(t) => setValStock(gi, v.label, t)} />
                    </Row>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          <TouchableOpacity onPress={() => edit((gs) => [...gs, { name: 'Nova opção', values: [] }])} style={{ marginBottom: 4 }}>
            <Text style={styles.chg}>+ criar outra opção (ex.: Voltagem, Sabor, Acabamento)</Text>
          </TouchableOpacity>
          <Text style={styles.why}>Sugeridas pelo tipo do produto. O cliente escolhe antes de pôr no carrinho.</Text>

          <Text style={styles.k}>FICHA DO PRODUTO</Text>
          {specs.map((x, i) => (
            <Row key={i} style={{ marginBottom: 6 }}>
              <TextInput style={[styles.in, { flex: 0.9, marginBottom: 0, marginRight: 6, fontWeight: '700' }]} value={x.k} onChangeText={(t) => setSpecs(specs.map((y, j) => (j === i ? { ...y, k: t } : y)))} placeholder="Campo" placeholderTextColor={colors.muted} maxLength={30} />
              <TextInput style={[styles.in, { flex: 1.3, marginBottom: 0 }]} value={x.v} onChangeText={(t) => setSpecs(specs.map((y, j) => (j === i ? { ...y, v: t } : y)))} placeholder="Ex.: 2,5 mm²" placeholderTextColor={colors.muted} maxLength={60} />
            </Row>
          ))}
          <TouchableOpacity onPress={() => setSpecs([...specs, { k: '', v: '' }])}><Text style={styles.chg}>+ incluir campo na ficha</Text></TouchableOpacity>
        </>
      ) : null}

      <Text style={styles.k}>PREÇO E QUANTIDADE DISPONÍVEL</Text>
      <Row>
        <TextInput style={[styles.in, { flex: 1, marginRight: 6 }]} placeholder="Preço R$" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        {stockFromOptions != null ? (
          <View style={[styles.in, { flex: 1, marginLeft: 6, justifyContent: 'center' }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{stockFromOptions} un.</Text>
            <Text style={{ color: colors.muted, fontSize: 10 }} numberOfLines={1}>soma por {groups[perStockGroup].name.toLowerCase()}</Text>
          </View>
        ) : (
          <TextInput style={[styles.in, { flex: 1, marginLeft: 6 }]} placeholder="Quantidade" placeholderTextColor={colors.muted} keyboardType="number-pad" value={stock} onChangeText={setStock} />
        )}
      </Row>
      <Text style={[styles.why, { marginBottom: 6 }]}>O cliente vê quantas unidades ainda tem (com poucas, aparece "Últimas unidades").</Text>
      <TextInput style={styles.in} placeholder="Custo R$ (opcional, só você vê)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={cost} onChangeText={setCost} />

      <View style={styles.novo}>
        <Ionicons name="checkmark-circle" size={20} color="#2E9E62" />
        <Text style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 12, lineHeight: 17 }}>
          <Text style={{ fontWeight: '800' }}>Produto novo.</Text> O Re@lys só vende itens novos, sem uso. Anúncio de usado é retirado.
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
  chg: { color: '#B8860B', fontWeight: '800', fontSize: 12 },
  chooser: { backgroundColor: colors.card, borderRadius: 14, padding: 10, marginTop: 6, ...soft },
  secTitle: { color: colors.text, fontWeight: '800', fontSize: 12, marginBottom: 4 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, marginBottom: 5, backgroundColor: colors.card },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  modo: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 9, marginRight: 6, alignItems: 'center', backgroundColor: colors.card },
  pillText: { color: colors.text, fontSize: 11.5 },
  novo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF6EF', borderRadius: 12, padding: 10, marginTop: 8 },
  videoRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, backgroundColor: '#FFFBEF', borderWidth: 1, borderColor: '#F0E2B6' },
  optBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, marginBottom: 8, backgroundColor: colors.card },
  optName: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 14, paddingVertical: 2 },
  swatchWrap: { padding: 2, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', marginRight: 4, marginBottom: 4 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  shipRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
});
