import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../../../store';
import { soft, colors, brl } from '../../../theme';
import { Screen, Photo, ProductThumb, Badge } from '../../../components/ui';
import { venueOfEvent, freeTable, ticketPrice } from '../../../venueData';
import { promos, listings, LISTING_KINDS, LISTING_CTA, communityPosts, contacts, lives, events, EVENT_GROUPS } from '../../../homeData';
import { ChatModal, VideoCallModal, LiveModal } from './Social';
import LivesTab from './LivesTab';
import NewsTab from './NewsTab';
import { members, memberByName } from '../../../people';
import { PeopleSearchModal, PersonRow } from '../../../components/People';
import { LaunchStrip } from '../../../components/Launches';
import { SHOP_SECTORS, SHOP_SECTOR_KEYS } from '../../../shopSectorsData';
import { askPix } from '../../../components/PixPay';
import { useBack } from '../../../back';
import { TestimonialCard } from '../../../components/SocialProfile';
import { ShopHero, CircleShortcuts, ShopProductCard, ShopGrid, StoreRow, CategoryPicker } from '../../../components/ShopKit';
import { SegTabs, SpotlightCarousel, ClipStrip, PromoSector } from '../../../components/AdKit';
import { SearchBar } from '../../../components/Search';
import { isFoodStore } from '../../../data';
import { shopSectorItems } from '../../../shopSectorsData';
import { SHOP_SPOTLIGHT, SHOP_CLIPS, SHOP_SPONSORED_PRODUCTS, SHOP_FLASH, SHOP_COUPONS, SHOP_COMBOS } from '../../../adsData';

// Aba Shop (barra de baixo): só a loja. Eventos, Promoções, Anúncios e Lives
// agora ficam na barra do topo da página Community (ver CommunityExtras abaixo).
export default function HomeScreen({ goTo, explore, navigate }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ShopTab goTo={goTo} explore={explore} navigate={navigate} />
    </View>
  );
}

// Barra do topo da Community: as opções que vieram do Shop. 'comunidade' é o feed
// (aberto pelo botão Community do rodapé), não aparece como botão no topo.
export const COMMUNITY_TOP = [
  { key: 'comunidade', label: 'Comunidade', icon: 'people-circle-outline' },
  { key: 'noticias', label: 'Notícias', icon: 'newspaper-outline' },
  { key: 'eventos', label: 'Eventos', icon: 'sparkles-outline' },
  { key: 'promo', label: 'Promoções', icon: 'pricetags-outline' },
  { key: 'anuncios', label: 'Anúncios', icon: 'megaphone-outline' },
  { key: 'lives', label: 'Lives', icon: 'radio-outline' },
];
export const COMMUNITY_TOP_KEYS = COMMUNITY_TOP.map((t) => t.key);

export function TopTabs({ items, value, onChange }) {
  return (
    <View style={styles.topTabs}>
      {items.map((t) => {
        const on = t.key === value;
        return (
          <TouchableOpacity key={t.key} style={[styles.topTab, on && styles.topTabOn]} onPress={() => onChange(t.key)} accessibilityLabel={t.label}>
            <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={19} color={on ? colors.primary : colors.muted} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.topTabText, on && { color: colors.primaryDark, fontWeight: '700' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Eventos, Promoções, Anúncios e Lives dentro da Community. Fica sempre montado para
// guardar os filtros escolhidos; mostra o conteúdo só quando `top` é uma dessas abas.
export function CommunityExtras({ top, explore, navigate }) {
  const { state, dispatch } = useStore();
  const [kind, setKind] = useState('todos');
  const [evGroup, setEvGroup] = useState('destaques');
  const convs = state.conversations;
  const setConvs = (fn) => dispatch({ type: 'UPDATE_CONVS', fn: typeof fn === 'function' ? fn : () => fn });
  const [chatWith, setChatWith] = useState(null);
  const [videoWith, setVideoWith] = useState(null);
  const [live, setLive] = useState(null); // { live, mine }
  const [liveFilter, setLiveFilter] = useState('todas');

  // Veio do menu ⋮, da busca ou da Lotus (ex.: Imóveis → Alugar)
  useEffect(() => {
    if (!explore) return;
    if (explore.kind) setKind(explore.kind);
    if (explore.live) setLiveFilter(explore.live);
    if (explore.group) setEvGroup(explore.group);
  }, [explore]);

  const openChat = (contact) => {
    if (!convs.find((c) => c.contactId === contact.id)) {
      setConvs((cs) => [{ id: 'm' + Date.now(), contactId: contact.id, unread: 0, messages: [], extra: contact }, ...cs]);
    }
    setConvs((cs) => cs.map((c) => (c.contactId === contact.id ? { ...c, unread: 0 } : c)));
    setChatWith(contact);
  };
  const sendTo = (contactId, msg) =>
    setConvs((cs) => cs.map((c) => (c.contactId === contactId ? { ...c, messages: [...c.messages, msg] } : c)));
  // Anunciante vira um contato para a conversa sobre o anúncio.
  const contactAdvertiser = (l) =>
    openChat({ id: 'adv-' + l.who, name: l.who, status: 'anunciante verificado', photo: `https://picsum.photos/seed/${encodeURIComponent(l.who)}/200/200` });
  const chatConv = chatWith ? convs.find((c) => c.contactId === chatWith.id) : null;
  const active = top !== 'comunidade';

  return (
    <View style={active ? { flex: 1 } : null}>
      {top === 'eventos' ? <EventsTab group={evGroup} setGroup={setEvGroup} onContact={contactAdvertiser} /> : null}
      {top === 'promo' ? <PromoTab /> : null}
      {top === 'anuncios' ? <AdsTab kind={kind} setKind={setKind} onContact={contactAdvertiser} /> : null}
      {top === 'noticias' ? <NewsTab onWatch={(l) => setLive({ live: l, mine: false })} navigate={navigate} /> : null}
      {top === 'lives' ? <LivesTab filter={liveFilter} setFilter={setLiveFilter} onWatch={(l) => setLive({ live: l, mine: false })} onGoLive={() => setLive({ live: null, mine: true })} navigate={navigate} /> : null}

      <ChatModal
        contact={chatWith}
        visible={!!chatWith}
        messages={chatConv ? chatConv.messages : []}
        onClose={() => setChatWith(null)}
        onSend={(msg) => sendTo(chatWith.id, msg)}
        onVideo={() => setVideoWith(chatWith)}
      />
      <VideoCallModal contact={videoWith} visible={!!videoWith} onClose={() => setVideoWith(null)} />
      <LiveModal
        live={live && live.live}
        mine={!!(live && live.mine)}
        visible={!!live}
        onClose={() => setLive(null)}
        userName={state.user ? state.user.name : 'Você'}
      />
    </View>
  );
}

// Atalhos do Shop: ícones pequenos dentro de um círculo, com o nome embaixo.
// Tecnologia e Agro (que se conversam: agro é tech) e os setores com subgrupos, incluindo Vários.
const SHOP_SHORTCUTS = [
  { key: 'tecnologia', label: 'Tecnologia', ion: 'hardware-chip-outline', color: colors.accent },
  { key: 'agro', label: 'Agro', ion: 'leaf-outline', color: '#2E8B57' },
  ...SHOP_SECTOR_KEYS.map((k) => ({
    key: k,
    label: { casa: 'Utensílios', eletrodomesticos: 'Eletrodomésticos', moveis: 'Móveis' }[k] || SHOP_SECTORS[k].title,
    ion: SHOP_SECTORS[k].ion,
    color: SHOP_SECTORS[k].color,
  })),
];

// Abas internas do Shop: a Vitrine (com a publicidade paga) e o setor separado de Promoções.
const SHOP_SEGS = [
  { key: 'vitrine', label: 'Vitrine', icon: 'storefront-outline' },
  { key: 'promo', label: 'Promoções', icon: 'flame-outline', hot: true, badge: SHOP_FLASH.length },
];

// Patrocinados primeiro e depois intercalados (1 a cada 3) com os destaques.
function withSponsored(featured, sponsored) {
  const rest = featured.filter((p) => !sponsored.some((x) => x.id === p.id));
  const out = [];
  let k = 0;
  rest.forEach((p, i) => {
    if (i % 2 === 0 && sponsored[k]) out.push({ p: sponsored[k++], sp: true });
    out.push({ p, sp: false });
  });
  while (sponsored[k]) out.push({ p: sponsored[k++], sp: true });
  return out;
}

const plain = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function ShopTab({ goTo, explore, navigate }) {
  const { state, dispatch } = useStore();
  const [seg, setSeg] = useState('vitrine');
  const [q, setQ] = useState('');
  useBack(seg !== 'vitrine', () => setSeg('vitrine'));
  useBack(!!q, () => setQ(''));
  // O Shop não mostra nada de comida: alimentação (restaurantes, bares, cafés e mercado) fica no Food.
  const notFood = (p) => !isFoodStore(storeOf(state, p.storeId));
  // Veio da Lotus, da busca ou do menu: "promoções do shop", "ofertas relâmpago".
  useEffect(() => {
    if (explore && explore.tab === 'home' && explore.seg) setSeg(explore.seg);
  }, [explore]);
  const featured = state.products.filter((p) => p.featured && notFood(p));
  const sponsored = SHOP_SPONSORED_PRODUCTS.map((id) => state.products.find((p) => p.id === id)).filter(Boolean);
  const grid = withSponsored(featured, sponsored);
  const stores = state.stores.filter((st) => !isFoodStore(st)).sort((a, b) => b.sponsored - a.sponsored || b.recommended - a.recommended || b.rating - a.rating);
  const add = (p) => dispatch({ type: 'ADD_TO_CART', productId: p.id });
  // Toque no anúncio da vitrine: mostra o produto e leva para a loja ou para o carrinho.
  const openAd = (ad) => {
    const p = state.products.find((x) => x.id === ad.productId);
    const s = storeOf(state, ad.storeId) || {};
    Alert.alert(ad.title, `${s.name}${p ? `\n${p.name} · ${brl(p.price)}` : ''}\n\n${ad.sub}`, [
      { text: 'Ver loja', onPress: () => dispatch({ type: 'OPEN_COMPANY', id: ad.storeId }) },
      p ? { text: 'Pôr no carrinho', onPress: () => add(p) } : { text: 'OK' },
    ]);
  };
  return (
    <Screen>
      {/* Menu Vitrine | Promoções acima da busca, como no Food */}
      <SegTabs items={SHOP_SEGS} value={seg} onChange={(k) => { setSeg(k); setQ(''); }} />
      <SearchBar
        value={q}
        onChangeText={setQ}
        onSubmit={setQ}
        placeholder="Buscar no Shop: celular, tênis, geladeira…"
        voicePrompt="O que você procura no Shop?"
        style={{ marginBottom: 12 }}
      />
      {q.trim() ? (
        <ShopSearchResults q={q} notFood={notFood} goTo={goTo} navigate={navigate} onAdd={add} />
      ) : (
      <>
      {seg === 'promo' ? (
        <PromoSector flash={SHOP_FLASH} coupons={SHOP_COUPONS} combos={SHOP_COMBOS} onOpenStore={(id) => dispatch({ type: 'OPEN_COMPANY', id })} />
      ) : (
        <>
          {/* Botão que abre os setores numa tela por cima (só os três pontinhos, sem contagem). */}
          <CategoryPicker items={SHOP_SHORTCUTS} onPick={goTo} />
          {/* Patrocinados logo abaixo do "Você no comando". */}
          <SpotlightCarousel ads={SHOP_SPOTLIGHT} onOpen={openAd} />
          <LaunchStrip only={notFood} />
          <ClipStrip title="🎬 Clipes das lojas" clips={SHOP_CLIPS} />
          <TouchableOpacity style={styles.promoTeaser} activeOpacity={0.9} onPress={() => setSeg('promo')}>
            <Ionicons name="flash" size={20} color="#fff" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Ofertas relâmpago, cupons e combos</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>Até 40% off · acaba hoje</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
          <SectionHead title="⭐ Destaques para você" action="Ver loja" onAction={() => goTo('loja')} />
          <ShopGrid>
            {grid.map(({ p, sp }) => (
              <ShopProductCard key={p.id} dark p={p} sponsored={sp} storeName={(storeOf(state, p.storeId) || {}).name} onAdd={() => add(p)} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: p.storeId, product: p.id })} />
            ))}
          </ShopGrid>
          <SectionHead title="🏬 Lojas em destaque" />
          {stores.map((s) => (
            <StoreRow key={s.id} s={{ ...s, city: null, recommended: false }} onPress={() => goTo('loja')} />
          ))}
        </>
      )}
      </>
      )}
    </Screen>
  );
}

// Resultado da busca do Shop: produtos, itens dos setores (Eletrônicos, Vestuário…) e lojas.
// Comida nunca aparece aqui: se a pessoa procurar comida, o Shop manda para o Food.
function ShopSearchResults({ q, notFood, goTo, navigate, onAdd }) {
  const { state, dispatch } = useStore();
  const t = plain(q.trim());
  const hit = (...xs) => xs.some((x) => plain(x).includes(t));
  const products = state.products.filter((p) => notFood(p) && hit(p.name, (storeOf(state, p.storeId) || {}).name));
  const items = shopSectorItems.filter((it) => hit(it.title, it.who, it.detail, (SHOP_SECTORS[it.sector] || {}).title));
  const stores = state.stores.filter((st) => !isFoodStore(st) && hit(st.name, st.category));
  const foodHit =
    state.products.some((p) => !notFood(p) && hit(p.name)) || state.stores.some((st) => isFoodStore(st) && hit(st.name, st.category));
  const none = !products.length && !items.length && !stores.length;
  const toFood = () => (navigate ? navigate({ tab: 'food', cat: 'Todos', q: q.trim() }) : goTo('food'));
  return (
    <View>
      {foodHit ? (
        <TouchableOpacity style={styles.foodHint} activeOpacity={0.9} onPress={toFood}>
          <Ionicons name="restaurant" size={18} color="#E8590C" />
          <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1, fontSize: 13 }}>Comida e mercado ficam no Food. Ver "{q.trim()}" no Food</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
      {products.length ? (
        <>
          <SectionHead title={`Produtos (${products.length})`} />
          <ShopGrid>
            {products.map((p) => (
              <ShopProductCard key={p.id} p={p} storeName={(storeOf(state, p.storeId) || {}).name} onAdd={() => onAdd(p)} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: p.storeId })} />
            ))}
          </ShopGrid>
        </>
      ) : null}
      {items.length ? (
        <>
          <SectionHead title={`Nos setores do Shop (${items.length})`} />
          {items.map((it) => (
            <TouchableOpacity key={it.id} style={styles.sectorHit} activeOpacity={0.85} onPress={() => goTo(it.sector)}>
              <View style={styles.sectorIcon}>
                <Text style={{ fontSize: 22 }}>{it.icon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>{it.title}</Text>
                <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{(SHOP_SECTORS[it.sector] || {}).title} · {it.who}</Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{brl(it.price)}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      {stores.length ? (
        <>
          <SectionHead title="Lojas" />
          {stores.map((st) => (
            <StoreRow key={st.id} s={st} onPress={() => dispatch({ type: 'OPEN_COMPANY', id: st.id })} />
          ))}
        </>
      ) : null}
      {none && !foodHit ? <Text style={{ color: colors.muted, textAlign: 'center', marginVertical: 24 }}>Nada encontrado no Shop para "{q.trim()}".</Text> : null}
    </View>
  );
}

// Eventos: festas promocionais e anúncios de promoções em destaque.
// Atalhos redondos (mesmo visual do Shop); os grupos em destaque ficam em rosa.
const EVENT_SHORT = { 'festa-promo': 'Festas', 'promo-anuncio': 'Promoções', shows: 'Shows', espacos: 'Espaços', gratis: 'Grátis' };
const EVENT_SHORTCUTS = EVENT_GROUPS.map((g) => ({ key: g.key, label: EVENT_SHORT[g.key] || g.label, ion: g.icon, color: g.highlight ? '#FF3B5C' : colors.primary }));
const sortEv = (list) => [...list].sort((a, b) => b.sponsored - a.sponsored);

function EventsTab({ group, setGroup, onContact }) {
  const festas = sortEv(events.filter((e) => e.group === 'festa-promo'));
  const anuncios = sortEv(events.filter((e) => e.group === 'promo-anuncio'));
  const outros = events.filter((e) => !['festa-promo', 'promo-anuncio'].includes(e.group));
  const list = sortEv(events.filter((e) => e.group === group));
  const { state, dispatch } = useStore();
  const ticketOf = (e) => (state.tickets || []).find((t) => t.eventId === e.id);
  // Comprar ingresso (com ou sem mesa reservada). Com ingresso, no local: abre a comanda para pedir.
  const act = (e) => {
    const tk = ticketOf(e);
    const venue = venueOfEvent(e);
    if (tk) return dispatch({ type: 'VENUE_ENTER', venue, table: tk.table, open: true });
    const price = ticketPrice(e.price);
    const buy = (withTable) => {
      const table = withTable ? freeTable() : null;
      dispatch({ type: 'BUY_TICKET', ticket: { id: 'tk' + Date.now(), eventId: e.id, title: e.title, name: e.who, price, table } });
      if (table) dispatch({ type: 'VENUE_RESERVE', venueId: venue.id, table });
      Alert.alert(
        'Ingresso garantido 🎟️',
        `${e.title} · ${e.who} · ${e.when}${table ? `\n\nMesa ${table} reservada para você.` : ''}\n\nQuando chegar, toque em "Estou no local" para pedir bebidas e comidas pelo app${table ? ', direto na sua mesa' : ''}.`,
      );
    };
    // Sem saldo: escolhe ingresso ou ingresso + mesa e paga no Pix (valor inteiro ou saldo + restante).
    const pay = (withTable) => (price > state.wallet ? askPix({ amount: price, available: state.wallet, label: `Ingresso · ${e.title}`, onPaid: () => buy(withTable) }) : buy(withTable));
    Alert.alert(e.cta, `${e.title}\n${e.who} · ${e.when}\n${price ? brl(price) : 'Grátis'} pelo Realys`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Só ingresso', onPress: () => pay(false) },
      { text: 'Ingresso + mesa', onPress: () => pay(true) },
    ]);
  };
  const withCta = (e) => (ticketOf(e) ? { ...e, cta: 'Estou no local · pedir' } : e);
  return (
    <Screen>
      <ShopHero title="Eventos e festas" sub="Festas com desconto, listas VIP e promoções da noite" />
      <CircleShortcuts items={EVENT_SHORTCUTS} value={group} onPress={setGroup} />

      {group === 'destaques' ? (
        <>
          <SectionHead title="🔥 Festas promocionais" action="Ver todas" onAction={() => setGroup('festa-promo')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {festas.map((e) => (
              <EventPromoCard key={e.id} e={withCta(e)} onPress={() => act(e)} />
            ))}
          </ScrollView>

          <SectionHead title="📣 Anúncios de promoções" action="Ver todos" onAction={() => setGroup('promo-anuncio')} />
          {anuncios.map((e) => (
            <EventRow key={e.id} e={withCta(e)} onAct={() => act(e)} onContact={() => onContact(e)} />
          ))}

          <SectionHead title="Mais eventos" />
          {outros.map((e) => (
            <EventRow key={e.id} e={withCta(e)} onAct={() => act(e)} onContact={() => onContact(e)} />
          ))}
        </>
      ) : (
        list.map((e) => <EventRow key={e.id} e={withCta(e)} big onAct={() => act(e)} onContact={() => onContact(e)} />)
      )}

      <TouchableOpacity
        style={[styles.announce, { marginTop: 4 }]}
        onPress={() => Alert.alert('Divulgar no Realys', 'Casas noturnas, bares, restaurantes e organizadores podem anunciar festas e promoções para pessoas verificadas por biometria. Patrocinados aparecem primeiro.')}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Divulgar festa ou promoção</Text>
      </TouchableOpacity>
    </Screen>
  );
}

function EventPromoCard({ e, onPress }) {
  return (
    <TouchableOpacity style={styles.evCard} activeOpacity={0.9} onPress={onPress}>
      <View>
        <Photo uri={e.photo} style={styles.evCardPhoto} fallback="🎉" />
        <View style={styles.evDeal}>
          <Text style={styles.offText}>{e.deal}</Text>
        </View>
        {e.sponsored ? (
          <View style={styles.adSponsored}>
            <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>PATROCINADO</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={styles.adTitle}>{e.title}</Text>
        <Text numberOfLines={1} style={styles.adDetail}>{e.who} · {e.when}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
          <Text style={[styles.adPrice, { fontSize: 17 }]}>{e.price}</Text>
          {e.from ? <Text style={styles.evFrom}>{e.from}</Text> : null}
        </View>
        <View style={[styles.adBtn, styles.adBtnMain, { flex: 0, marginRight: 0, marginTop: 8, height: 36 }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 12 }}>{e.cta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EventRow({ e, big, onAct, onContact }) {
  return (
    <View style={styles.ad}>
      <View>
        <Photo uri={e.photo} style={[styles.adPhoto, !big && { height: 130 }]} fallback="🎉" />
        {e.deal ? (
          <View style={styles.evDeal}>
            <Text style={styles.offText}>{e.deal}</Text>
          </View>
        ) : null}
        {e.sponsored ? (
          <View style={styles.adSponsored}>
            <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>PATROCINADO</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={styles.adPrice}>{e.price}</Text>
          {e.from ? <Text style={styles.evFrom}>{e.from}</Text> : null}
        </View>
        <Text style={styles.adTitle}>{e.title}</Text>
        <Text style={styles.adDetail}>{e.detail}</Text>
        <Text style={styles.adPlace}>
          <Ionicons name="calendar-outline" size={12} color={colors.muted} /> {e.when}   <Ionicons name="location-outline" size={12} color={colors.muted} /> {e.place}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 12, marginLeft: 5 }}>{e.who}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <TouchableOpacity style={[styles.adBtn, styles.adBtnMain]} onPress={onAct}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{e.cta}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adBtn, { marginRight: 0 }]} onPress={onContact}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Mensagem</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PromoTab() {
  const { state, dispatch } = useStore();
  const items = promos.map((pr) => ({ ...pr, p: state.products.find((x) => x.id === pr.productId) })).filter((x) => x.p);
  return (
    <Screen>
      <View style={styles.promoBanner}>
        <Ionicons name="flash" size={22} color={colors.onPrimary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 16 }}>Ofertas relâmpago</Text>
          <Text style={{ color: colors.onPrimary, fontSize: 12 }}>Preços exclusivos para quem compra pelo Realys</Text>
        </View>
      </View>
      {items.map(({ p, off, until }) => {
        const from = p.price / (1 - off / 100);
        return (
          <View key={p.id} style={styles.promo}>
            <View>
              <ProductThumb product={p} size={74} />
              <View style={styles.offBadge}>
                <Text style={styles.offText}>-{off}%</Text>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.prodName} numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={styles.prodStore}>{(storeOf(state, p.storeId) || {}).name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, textDecorationLine: 'line-through', marginTop: 4 }}>de {brl(from)}</Text>
              <Text style={styles.promoPrice}>por {brl(p.price)}</Text>
              <Text style={{ color: colors.accent, fontSize: 11, marginTop: 2 }}>
                <Ionicons name="time-outline" size={11} color={colors.accent} /> {until}
              </Text>
            </View>
            <TouchableOpacity style={styles.addRound} onPress={() => dispatch({ type: 'ADD_TO_CART', productId: p.id })} accessibilityLabel="Adicionar ao carrinho">
              <Ionicons name="cart" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        );
      })}
    </Screen>
  );
}

function AdsTab({ kind, setKind, onContact }) {
  const list = listings
    .filter((l) => kind === 'todos' || l.kind === kind)
    .sort((a, b) => b.sponsored - a.sponsored);
  const cta = (l) => l.cta || LISTING_CTA[l.kind] || 'Reservar';
  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {LISTING_KINDS.map((k) => {
          const on = k.key === kind;
          return (
            <TouchableOpacity key={k.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setKind(k.key)}>
              <Ionicons name={k.icon} size={15} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.announce}
        onPress={() => Alert.alert('Anunciar no Realys', 'Imóveis, veículos, máquinas e produtos. Pessoas verificadas por biometria veem o seu anúncio.')}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Criar anúncio</Text>
      </TouchableOpacity>

      {list.map((l) => (
        <View key={l.id} style={styles.ad}>
          <View>
            <Photo uri={l.photo} style={styles.adPhoto} fallback="🏠" />
            <View style={styles.adKind}>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{LISTING_KINDS.find((k) => k.key === l.kind).label}</Text>
            </View>
            {l.sponsored ? (
              <View style={styles.adSponsored}>
                <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>PATROCINADO</Text>
              </View>
            ) : null}
          </View>
          <View style={{ padding: 12 }}>
            <Text style={styles.adPrice}>{l.price}</Text>
            <Text style={styles.adTitle}>{l.title}</Text>
            <Text style={styles.adDetail}>{l.detail}</Text>
            <Text style={styles.adPlace}>
              <Ionicons name="location-outline" size={12} color={colors.muted} /> {l.place}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 12, marginLeft: 5 }}>{l.who}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.adBtn, styles.adBtnMain]} onPress={() => onContact(l)}>
                <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Tenho interesse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adBtn, { marginRight: 0 }]}
                onPress={() => Alert.alert(cta(l), `Pedido enviado para ${l.who}. A confirmação chega nas suas mensagens.`)}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{cta(l)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </Screen>
  );
}

// Comunidade completa (feed, mensagens, contatos, live), usada na página de Stories.
// `top` é o que vem antes das abas (a faixa de stories).
export function CommunityHub({ top, explore }) {
  const { state, dispatch } = useStore();
  const [seg, setSeg] = useState('posts');
  const convs = state.conversations;
  const setConvs = (fn) => dispatch({ type: 'UPDATE_CONVS', fn: typeof fn === 'function' ? fn : () => fn });
  const [chatWith, setChatWith] = useState(null);
  const [videoWith, setVideoWith] = useState(null);
  const [live, setLive] = useState(null);
  useBack(seg !== 'posts', () => setSeg('posts'));
  useEffect(() => {
    if (explore && explore.tab === 'stories' && explore.seg) setSeg(explore.seg);
  }, [explore]);
  const contactOf = (id) => contacts.find((c) => c.id === id) || (convs.find((c) => c.contactId === id) || {}).extra;
  const openChat = (contact) => {
    if (!convs.find((c) => c.contactId === contact.id)) {
      setConvs((cs) => [{ id: 'm' + Date.now(), contactId: contact.id, unread: 0, messages: [], extra: contact }, ...cs]);
    }
    setConvs((cs) => cs.map((c) => (c.contactId === contact.id ? { ...c, unread: 0 } : c)));
    setChatWith(contact);
  };
  const chatConv = chatWith ? convs.find((c) => c.contactId === chatWith.id) : null;
  return (
    <View style={{ flex: 1 }}>
      <CommunityTab
        top={top}
        seg={seg}
        setSeg={setSeg}
        convs={convs}
        contactOf={contactOf}
        onChat={openChat}
        onVideo={(c) => setVideoWith(c)}
        onGoLive={() => setLive({ live: null, mine: true })}
        userName={state.user ? state.user.name : 'Você'}
      />
      <ChatModal
        contact={chatWith}
        visible={!!chatWith}
        messages={chatConv ? chatConv.messages : []}
        onClose={() => setChatWith(null)}
        onSend={(msg) => setConvs((cs) => cs.map((c) => (c.contactId === chatWith.id ? { ...c, messages: [...c.messages, msg] } : c)))}
        onVideo={() => setVideoWith(chatWith)}
      />
      <VideoCallModal contact={videoWith} visible={!!videoWith} onClose={() => setVideoWith(null)} />
      <LiveModal live={live && live.live} mine={!!(live && live.mine)} visible={!!live} onClose={() => setLive(null)} userName={state.user ? state.user.name : 'Você'} />
    </View>
  );
}

function CommunityTab({ top, seg, setSeg, convs, contactOf, onChat, onVideo, onGoLive, userName }) {
  const { state, dispatch } = useStore();
  const [searching, setSearching] = useState(false);
  // Tocar em quem postou abre o perfil da pessoa (com o botão de amizade).
  const openAuthor = (name) => {
    const m = memberByName(name);
    if (m) return dispatch({ type: 'OPEN_PROFILE', id: m.id });
    // Post de empresa: abre a página pública da empresa.
    const store = state.stores.find((s) => s.name === name);
    if (store) dispatch({ type: 'OPEN_COMPANY', id: store.id });
  };
  const requests = members.filter((m) => state.friends[m.id] === 'recebido');
  const friends = members
    .filter((m) => state.friends[m.id] === 'amigo')
    .map((m) => ({ ...(contacts.find((c) => c.id === m.id) || { status: 'amigo no Realys' }), id: m.id, name: m.name, photo: m.photo }));
  const people = [...friends, ...contacts.filter((c) => c.business)];
  const posts = state.communityPosts;
  const [liked, setLiked] = useState({});
  const [cmts, setCmts] = useState({}); // comentários feitos aqui: { postId: [texto] }
  const [openCmt, setOpenCmt] = useState(null);
  const [cmtText, setCmtText] = useState('');
  const [shared, setShared] = useState({});
  const ads = useMemo(() => state.posts.filter((p) => p.sponsored), [state.posts]);
  const testimonials = state.testimonials.filter((t) => t.status === 'aprovado');
  const pendingMine = state.testimonials.filter((t) => t.to === 'me' && t.status === 'pendente').length;
  const sharePost = async (p) => {
    try {
      const r = await Share.share({ message: `${p.author} no Realys:\n\n${p.text}\n\nRealys · Pessoas reais. Negócios reais.` });
      if (!r || r.action !== Share.dismissedAction) setShared((x) => ({ ...x, [p.id]: (x[p.id] || 0) + 1 }));
    } catch (e) {}
  };
  const sendCmt = (id) => {
    const v = cmtText.trim();
    if (!v) return;
    setCmts((x) => ({ ...x, [id]: [...(x[id] || []), v] }));
    setCmtText('');
  };


  // Feed único: posts da comunidade e depoimentos aprovados, intercalados.
  // A cada 2 posts entra 1 anúncio: é aqui que a publicidade chega ao usuário.
  const feed = [];
  const n = Math.max(posts.length, testimonials.length);
  for (let i = 0; i < n; i++) {
    if (posts[i]) feed.push({ type: 'post', p: posts[i] });
    if (testimonials[i]) feed.push({ type: 'dep', t: testimonials[i] });
    if (i % 2 === 1 && ads.length) feed.push({ type: 'ad', p: ads[Math.floor(i / 2) % ads.length] });
  }

  return (
    <Screen>
      {top}
      <View style={[styles.segRow, { paddingHorizontal: 0, paddingTop: 0, marginBottom: 12 }]}>
        {[
          ['posts', 'Feed', 'newspaper-outline'],
          ['msgs', 'Mensagens', 'mail-outline'],
          ['contatos', 'Contatos', 'person-add-outline'],
        ].map(([k, label, icon]) => {
          const on = k === seg;
          const unread = k === 'msgs' ? convs.reduce((s, c) => s + c.unread, 0) : 0;
          return (
            <TouchableOpacity key={k} style={[styles.seg, on && styles.segOn]} onPress={() => setSeg(k)}>
              <Ionicons name={icon} size={16} color={on ? colors.primary : colors.muted} />
              <Text style={[styles.segText, on && { color: colors.primary }]}>{label}</Text>
              {unread ? (
                <View style={styles.unread}>
                  <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>{unread}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.liveBtn} onPress={onGoLive} accessibilityLabel="Abrir live">
          <Ionicons name="radio" size={15} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Live</Text>
        </TouchableOpacity>
      </View>

      {seg === 'posts' ? (
        <View>
          {pendingMine ? (
            <View style={styles.pendingBanner}>
              <Ionicons name="mail-unread-outline" size={18} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: '700', marginLeft: 8, flex: 1, fontSize: 13 }}>
                Você tem {pendingMine} depoimento{pendingMine > 1 ? 's' : ''} esperando aprovação. Veja em Perfil › Depoimentos.
              </Text>
            </View>
          ) : null}

          {feed.map((it, idx) =>
            it.type === 'dep' ? (
              <TestimonialCard key={it.t.id} t={it.t} />
            ) : it.type === 'post' ? (
              <View key={it.p.id} style={styles.post}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  activeOpacity={0.7}
                  onPress={() => openAuthor(it.p.author)}
                  accessibilityLabel={`Ver perfil de ${it.p.author}`}
                >
                  {memberByName(it.p.author) ? (
                    <Photo uri={memberByName(it.p.author).photo} style={[styles.avatar, { padding: 0 }]} fallback="🙂" />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{it.p.author[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {it.p.author} <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{it.p.time}</Text>
                  </View>
                </TouchableOpacity>
                {it.p.flagged ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4DC', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, marginTop: 10 }}>
                    <Ionicons name="alert-circle-outline" size={14} color="#C77D12" />
                    <Text style={{ color: '#8A5A0B', fontSize: 12, fontWeight: '700', marginLeft: 5, flex: 1 }}>Em verificação: a IA do Realys achou sinais de informação falsa</Text>
                  </View>
                ) : null}
                <Text style={{ color: colors.text, marginTop: 10, lineHeight: 20 }}>{it.p.text}</Text>
                {it.p.image ? <Photo uri={it.p.image} style={styles.postImg} /> : null}
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity style={styles.postAct} onPress={() => setLiked({ ...liked, [it.p.id]: !liked[it.p.id] })} accessibilityLabel="Curtir">
                    <Ionicons name={liked[it.p.id] ? 'heart' : 'heart-outline'} size={18} color={liked[it.p.id] ? '#FF5A7A' : colors.muted} />
                    <Text style={styles.postActText}>{it.p.likes + (liked[it.p.id] ? 1 : 0)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.postAct}
                    onPress={() => {
                      setOpenCmt(openCmt === it.p.id ? null : it.p.id);
                      setCmtText('');
                    }}
                    accessibilityLabel="Comentar"
                  >
                    <Ionicons name="chatbubble-outline" size={17} color={colors.muted} />
                    <Text style={styles.postActText}>{it.p.comments + (cmts[it.p.id] || []).length}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.postAct} onPress={() => sharePost(it.p)} accessibilityLabel="Compartilhar">
                    <Ionicons name="share-social-outline" size={17} color={colors.muted} />
                    <Text style={styles.postActText}>{shared[it.p.id] ? `Compartilhado ${shared[it.p.id]}x` : 'Compartilhar'}</Text>
                  </TouchableOpacity>
                </View>
                {(cmts[it.p.id] || []).map((c, k) => (
                  <View key={k} style={styles.cmt}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{userName}</Text>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{c}</Text>
                  </View>
                ))}
                {openCmt === it.p.id ? (
                  <View style={styles.cmtBox}>
                    <TextInput
                      value={cmtText}
                      onChangeText={setCmtText}
                      placeholder="Escreva um comentário…"
                      placeholderTextColor={colors.muted}
                      style={{ flex: 1, color: colors.text, height: 40 }}
                      onSubmitEditing={() => sendCmt(it.p.id)}
                      returnKeyType="send"
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => sendCmt(it.p.id)} style={{ padding: 6 }} accessibilityLabel="Enviar comentário">
                      <Ionicons name="send" size={18} color={cmtText.trim() ? colors.primary : colors.muted} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : (
              <View key={'ad' + idx} style={[styles.post, { borderColor: 'rgba(108,92,231,0.45)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{it.p.author}</Text>
                  <Badge label="Patrocinado" color={colors.sponsored} />
                </View>
                <Photo uri={it.p.image} style={styles.postImg} />
                <Text style={{ color: colors.text, marginTop: 8 }}>{it.p.text}</Text>
              </View>
            )
          )}
        </View>
      ) : null}

      {seg === 'msgs' ? (
        <View>
          {convs.map((c) => {
            const ct = contactOf(c.contactId);
            if (!ct) return null;
            const last = c.messages[c.messages.length - 1];
            return (
              <TouchableOpacity key={c.id} style={styles.convRow} onPress={() => onChat(ct)} activeOpacity={0.85}>
                <Photo uri={ct.photo} style={styles.convAvatar} fallback="🙂" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{ct.name}</Text>
                  <Text numberOfLines={1} style={{ color: c.unread ? colors.text : colors.muted, fontSize: 13, marginTop: 2 }}>
                    {last ? (last.from === 'me' ? 'Você: ' : '') + last.text : 'Nova conversa'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{last ? last.time : ''}</Text>
                  {c.unread ? (
                    <View style={[styles.unread, { marginTop: 4, marginLeft: 0 }]}>
                      <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>{c.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {seg === 'contatos' ? (
        <View>
          <TouchableOpacity style={styles.findPeople} onPress={() => setSearching(true)} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <Text style={{ color: colors.muted, marginLeft: 8, flex: 1 }}>Buscar pessoas por nome ou @usuário</Text>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          {requests.length ? (
            <>
              <Text style={styles.contactsTitle}>Pedidos de amizade ({requests.length})</Text>
              {requests.map((m) => (
                <PersonRow key={m.id} m={m} onOpen={() => dispatch({ type: 'OPEN_PROFILE', id: m.id })} />
              ))}
            </>
          ) : null}
          <Text style={styles.contactsTitle}>Amigos e contatos ({people.length})</Text>
          <TouchableOpacity
            style={styles.announce}
            onPress={() => Alert.alert('Convidar amigos', 'Mande o convite: quem entra no Realys passa pela verificação por biometria.')}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Convidar para o Realys</Text>
          </TouchableOpacity>
          {people.map((ct) => (
            <View key={ct.id} style={styles.convRow}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => !ct.business && dispatch({ type: 'OPEN_PROFILE', id: ct.id })}
                activeOpacity={ct.business ? 1 : 0.7}
                accessibilityLabel={`Ver perfil de ${ct.name}`}
              >
              <View>
                <Photo uri={ct.photo} style={styles.convAvatar} fallback="🙂" />
                {ct.status === 'online' ? <View style={styles.onlineDot} /> : null}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{ct.name}</Text>
                <Text style={{ color: ct.status === 'online' ? colors.success : colors.muted, fontSize: 12 }}>{ct.status}</Text>
              </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundSm} onPress={() => onChat(ct)} accessibilityLabel={`Mensagem para ${ct.name}`}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roundSm, { marginLeft: 8 }]} onPress={() => onVideo(ct)} accessibilityLabel={`Chamada de vídeo com ${ct.name}`}>
                <Ionicons name="videocam-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      <PeopleSearchModal visible={searching} onClose={() => setSearching(false)} />
    </Screen>
  );
}

function SectionHead({ title, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Abas do topo clean: sem caixinhas; a ativa ganha uma pílula clarinha e o ícone dourado.
  topTabs: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    marginHorizontal: 2,
    borderRadius: 14,
  },
  topTabOn: { backgroundColor: colors.primaryLight },
  foodHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1E6', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(232,89,12,0.3)' },
  sectorHit: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 10, marginBottom: 8, ...soft },
  sectorIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  promoTeaser: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B5C', borderRadius: 18, padding: 13, marginBottom: 16, borderWidth: 1, borderColor: '#FF7A45' },
  topTabText: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  prodName: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 8 },
  prodStore: { color: colors.muted, fontSize: 11, marginTop: 2 },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    ...soft,
  },
  offBadge: { position: 'absolute', top: -6, left: -6, backgroundColor: '#FF3B5C', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  offText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  promoPrice: { color: colors.accent, fontWeight: '800', fontSize: 17 },
  addRound: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.cardAlt,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipHot: { borderColor: '#FF3B5C', backgroundColor: '#FFF0F3' },
  evCard: { width: 210, marginRight: 12, marginBottom: 6, backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', ...soft },
  evCardPhoto: { width: '100%', height: 120 },
  evDeal: { position: 'absolute', left: 10, top: 10, backgroundColor: '#FF3B5C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  evFrom: { color: colors.muted, fontSize: 12, textDecorationLine: 'line-through', marginLeft: 8 },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 12, marginLeft: 6 },
  announce: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(168,121,10,0.5)',
    marginBottom: 12,
  },
  ad: { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', marginBottom: 16, ...soft },
  adPhoto: { width: '100%', height: 170 },
  adKind: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adSponsored: { position: 'absolute', right: 10, top: 10, backgroundColor: colors.sponsored, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adPrice: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  adTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 2 },
  adDetail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  adPlace: { color: colors.muted, fontSize: 12, marginTop: 4 },
  adBtn: { flex: 1, height: 38, borderRadius: 11, borderWidth: 1, borderColor: '#F0E9DA', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  adBtnMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  segRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segOn: { borderColor: colors.primary, backgroundColor: 'rgba(168,121,10,0.1)' },
  segText: { color: colors.muted, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  unread: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 5, paddingHorizontal: 4 },
  liveBtn: { flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#FF3B5C', marginLeft: 'auto' },
  composer: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 12, ...soft },
  findPeople: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, height: 46, marginBottom: 6 },
  contactsTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 12, marginBottom: 8 },
  composerInput: { color: colors.text, fontSize: 15, minHeight: 44, textAlignVertical: 'top' },
  depBtn: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, marginTop: 6, marginRight: 8 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(168,121,10,0.3)' },
  cmt: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  cmtBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingLeft: 12, marginTop: 8, backgroundColor: colors.bg },
  publish: { alignSelf: 'flex-end', height: 36, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  post: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 12, ...soft },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  postImg: { width: '100%', height: 200, borderRadius: 14, marginTop: 10 },
  postAct: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  postActText: { color: colors.muted, fontSize: 12, marginLeft: 5 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    ...soft,
  },
  convAvatar: { width: 46, height: 46, borderRadius: 23 },
  onlineDot: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.card },
  roundSm: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(168,121,10,0.45)', alignItems: 'center', justifyContent: 'center' },
  goLiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.5)',
    padding: 14,
    marginBottom: 16,
  },
  goLiveIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FF3B5C', alignItems: 'center', justifyContent: 'center' },
  liveCard: { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', marginBottom: 14, ...soft },
  livePhoto: { width: '100%', height: 180 },
  liveOverlay: { position: 'absolute', left: 10, top: 10, right: 10 },
  liveTag: { backgroundColor: '#FF3B5C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  liveViewers: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(3,5,10,0.65)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
});
