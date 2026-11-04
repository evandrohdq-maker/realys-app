import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Screen, Title, Photo, Badge, Row } from '../../components/ui';
import { SearchBar, GlobalResults } from '../../components/Search';
import { SHOP_SECTORS, shopSectorItems } from '../../shopSectorsData';
import { useBuy, priceText } from './TechAgroScreen';

// Setores do Shop com subgrupos (mesmo jeito do Agro): Eletrônicos, Vestuário e Utensílios domésticos.
// Uma tela só serve para os três; muda a cor, os subgrupos e os produtos.

const nq = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Itens de um setor e subgrupo. Patrocinados primeiro, depois lançamentos.
export function shopItemsFor(sector, group = 'todos', term = '', onlyShip = false) {
  return shopSectorItems
    .filter((it) => it.sector === sector)
    .filter((it) => group === 'todos' || (it.groups || []).includes(group))
    .filter((it) => !onlyShip || it.ship)
    .filter((it) => !term || nq(`${it.title} ${it.who} ${it.detail}`).includes(nq(term)))
    .sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || (b.launch ? 1 : 0) - (a.launch ? 1 : 0));
}

function ItemCard({ it, onPress, tint }) {
  return (
    <View style={styles.card}>
      <Photo uri={it.photo} style={styles.cardImg} fallback={it.icon} />
      <View style={{ padding: 12 }}>
        <Row style={{ flexWrap: 'wrap' }}>
          {it.sponsored ? <Badge label="Patrocinado" color={colors.sponsored} /> : null}
          {it.launch ? <Badge label="Lançamento" color={tint} /> : null}
          {it.ship ? <Badge label="Envia para todo o Brasil" color={colors.success} /> : null}
        </Row>
        <Text style={styles.cardTitle}>{it.icon} {it.title}</Text>
        <Text style={[styles.who, { color: tint }]}>{it.who} · verificado</Text>
        <Text style={styles.detail}>{it.detail}</Text>
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={styles.price}>{priceText(it)}</Text>
          <TouchableOpacity style={[styles.cta, { backgroundColor: tint }]} onPress={() => onPress(it)} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{it.cta}</Text>
          </TouchableOpacity>
        </Row>
      </View>
    </View>
  );
}

function SectorScreen({ sectorKey, explore, navigate }) {
  const sector = SHOP_SECTORS[sectorKey];
  const tint = sector.color;
  const [group, setGroup] = useState('todos');
  const [onlyShip, setOnlyShip] = useState(false);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');
  const buy = useBuy(navigate);

  useEffect(() => {
    if (explore && explore.tab === sectorKey) setGroup(explore.group || 'todos');
  }, [explore, sectorKey]);

  const list = shopItemsFor(sectorKey, group, q.trim(), onlyShip);
  const groupLabel = (sector.groups.find((g) => g.key === group) || {}).label;
  const launches = shopItemsFor(sectorKey, group).filter((it) => it.launch);

  return (
    <Screen>
      <Title sub={sector.sub}>{sector.title}</Title>
      <SearchBar
        value={q}
        onChangeText={(t) => {
          setQ(t);
          if (!t) setSearched('');
        }}
        onSubmit={setSearched}
        placeholder={sector.placeholder}
        voicePrompt={sector.voicePrompt}
      />

      {/* Subgrupos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {sector.groups.map((g) => {
          const on = g.key === group;
          return (
            <TouchableOpacity
              key={g.key}
              onPress={() => setGroup(g.key)}
              style={[styles.groupBtn, { borderColor: tint + '55' }, on && { backgroundColor: tint, borderColor: tint }]}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 22 }}>{g.icon}</Text>
              <Text style={[styles.groupText, { color: on ? '#FFFFFF' : tint }]} numberOfLines={1}>
                {g.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.hero, { backgroundColor: tint + '12', borderColor: tint + '33' }]}>
        <Ionicons name={sector.ion} size={22} color={tint} />
        <Text style={styles.heroText}>{sector.banner}</Text>
      </View>

      {/* Lançamentos do subgrupo: o que mais chama a atenção do cliente */}
      {launches.length > 0 && !q ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.kicker}>LANÇAMENTOS{group !== 'todos' ? ` · ${groupLabel.toUpperCase()}` : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {launches.map((it) => (
              <TouchableOpacity key={it.id} style={styles.launch} onPress={() => buy(it)} activeOpacity={0.85}>
                <Photo uri={it.photo} style={styles.launchImg} fallback={it.icon} />
                <Text style={styles.launchTitle} numberOfLines={2}>
                  {it.title}
                </Text>
                <Text style={[styles.launchPrice, { color: tint }]}>{priceText(it)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={styles.count}>
          {list.length} {list.length === 1 ? 'oferta' : 'ofertas'}
          {group !== 'todos' ? ` em ${groupLabel}` : ''}
        </Text>
        <TouchableOpacity onPress={() => setOnlyShip((v) => !v)} style={[styles.toggle, onlyShip && { backgroundColor: colors.success, borderColor: colors.success }]}>
          <Ionicons name="cube-outline" size={14} color={onlyShip ? '#FFFFFF' : colors.success} />
          <Text style={[styles.toggleText, { color: onlyShip ? '#FFFFFF' : colors.success }]}>Envia para o Brasil</Text>
        </TouchableOpacity>
      </Row>

      {list.length ? (
        list.map((it) => <ItemCard key={it.id} it={it} onPress={buy} tint={tint} />)
      ) : searched ? (
        <GlobalResults query={searched} navigate={navigate} />
      ) : (
        <Text style={styles.empty}>Nada neste subgrupo ainda. Toque em outro subgrupo acima.</Text>
      )}

      <View style={styles.tipBox}>
        <Ionicons name="storefront-outline" size={18} color={tint} />
        <Text style={[styles.detail, { flex: 1, marginLeft: 8, marginTop: 0 }]}>
          Tem loja de {sector.title.toLowerCase()}? Cadastre o CNPJ e use "Lançar no Shop" no Estoque para seus produtos aparecerem aqui, no subgrupo certo.
        </Text>
      </View>
    </Screen>
  );
}

export const ElectronicsScreen = (props) => <SectorScreen sectorKey="eletronicos" {...props} />;
export const FashionScreen = (props) => <SectorScreen sectorKey="vestuario" {...props} />;
export const HomeGoodsScreen = (props) => <SectorScreen sectorKey="casa" {...props} />;

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1 },
  heroText: { flex: 1, marginLeft: 10, color: colors.text, fontSize: 13 },
  groupBtn: { alignItems: 'center', justifyContent: 'center', width: 86, height: 70, borderRadius: 16, borderWidth: 1, backgroundColor: '#FFFFFF', marginRight: 8, paddingHorizontal: 4 },
  groupText: { fontWeight: '800', fontSize: 11, marginTop: 3 },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  launch: { width: 140, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginRight: 8, overflow: 'hidden' },
  launchImg: { width: '100%', height: 84 },
  launchTitle: { color: colors.text, fontWeight: '700', fontSize: 12, paddingHorizontal: 8, marginTop: 6 },
  launchPrice: { fontWeight: '800', fontSize: 12, paddingHorizontal: 8, marginTop: 2, marginBottom: 8 },
  count: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.success, borderRadius: 14, paddingHorizontal: 10, height: 28, backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 11, fontWeight: '800', marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden' },
  cardImg: { width: '100%', height: 130 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 2 },
  who: { fontWeight: '700', fontSize: 12, marginTop: 3 },
  detail: { color: colors.muted, fontSize: 13, marginTop: 4 },
  price: { color: colors.primary, fontWeight: '800', fontSize: 14, flex: 1 },
  cta: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', padding: 20 },
  tipBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12, marginTop: 4 },
});
