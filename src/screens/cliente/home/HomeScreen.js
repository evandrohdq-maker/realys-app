import { openProduct } from '../../../components/ProductSheet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { openMedia } from '../../../components/MediaViewer';
import { openServerProfile } from '../../../components/ServerProfile';
import { mediaUrl } from '../../../api';
import { abrirDestacar } from '../../../components/Destacar';
import ServerInbox from '../../../components/ServerInbox';
import { useServerFeed, curtir, comentarios, comentar } from '../../../serverSocial';
import { CampanhaCard, OngPage } from '../OngsScreen';
import { campanhaDoFeed, pedeDoacao } from '../../../ongs';
import { useServerFriends, addFriend, removeFriend } from '../../../serverFriends';
import { conectado } from '../../../serverShop';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Platform, ToastAndroid, Dimensions } from 'react-native';
import { Text, TextInput } from '../../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../../../store';
import { soft, colors, brl } from '../../../theme';
import { Screen, Photo, PostPhoto, ProductThumb, Badge } from '../../../components/ui';
import { venueOfEvent, freeTable, ticketPrice } from '../../../venueData';
import { promos, listings, LISTING_KINDS, LISTING_CTA, communityPosts, contacts, lives, events, EVENT_GROUPS } from '../../../homeData';
import { comprarIngresso } from '../../../serverEvents';
import { ChatModal, VideoCallModal, LiveModal } from './Social';
import LivesTab from './LivesTab';
import TrendsTab from './TrendsTab';
import NewsTab from './NewsTab';
import StreamTab from './StreamTab';
import { StationLogo } from '../../../components/RadioKit';
import { StationPostPlayer } from '../../../components/StationProfile';
import { openStation } from '../../../streamCats';
import { radioById } from '../../../radio';
import { tvById } from '../../../tv';
import ConvList from '../../../components/ConvList';
import { members, memberByName } from '../../../people';
import { PeopleSearchModal, PersonRow } from '../../../components/People';
import { LaunchStrip } from '../../../components/Launches';
import SugestoesCarrossel from '../../../components/SugestoesCarrossel';
import { SHOP_SECTORS, SHOP_SECTOR_KEYS } from '../../../shopSectorsData';
import { askPix } from '../../../components/PixPay';
import { useBack } from '../../../back';
import { TestimonialCard, DepCenter } from '../../../components/SocialProfile';
import { ServerTestimonialCard, ServerPendingTestimonials } from '../../../components/ServerTestimonials';
import { useServerTestimonials } from '../../../serverTestimonials';
import NotifList, { buildNotifs, unseenNotifs } from '../../../components/Notifications';
import { ShopHero, CircleShortcuts, ShopProductCard, ShopGrid, StoreRow, CategoryPicker } from '../../../components/ShopKit';
import { SegTabs, SpotlightCarousel, ClipStrip, PromoSector } from '../../../components/AdKit';
import { SearchBar } from '../../../components/Search';
import { isFoodStore } from '../../../data';
import { byStoreTrust } from '../../../storeTrust';
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

// Barra do topo da Community: Notícias, Eventos, Stream e Lives. 'comunidade' é o feed
// (aberto pelo botão Community do rodapé), não aparece como botão no topo.
export const COMMUNITY_TOP = [
  { key: 'comunidade', label: 'Comunidade', icon: 'people-circle-outline' },
  { key: 'noticias', label: 'News', icon: 'newspaper-outline' },
  { key: 'eventos', label: 'Eventos', icon: 'sparkles-outline' },
  // Stream: rádios e TV online (entrou no lugar dos botões Promoções e Anúncios).
  { key: 'stream', label: 'Stream', icon: 'tv-outline' },
  // Trends: o que está em alta (Reels, publicações, IA e assuntos). Também abre arrastando para o lado.
  { key: 'trends', label: 'Trends', icon: 'flame-outline' },
  { key: 'lives', label: 'Lives', icon: 'radio-outline', red: true }, // em vermelho, como AO VIVO
  // Sem botão no topo: continuam abrindo pelo menu ⋮, pela busca e pela Lotus.
  { key: 'promo', label: 'Promoções', icon: 'pricetags-outline', hidden: true },
  { key: 'anuncios', label: 'Anúncios', icon: 'megaphone-outline', hidden: true },
];
export const COMMUNITY_TOP_KEYS = COMMUNITY_TOP.map((t) => t.key);

export function TopTabs({ items, value, onChange }) {
  return (
    <View style={styles.topTabs}>
      {items.map((t) => {
        const on = t.key === value;
        const red = t.red ? '#E5484D' : null; // Lives: vermelhinho, como o AO VIVO
        return (
          <TouchableOpacity key={t.key} style={[styles.topTab, on && styles.topTabOn]} onPress={() => onChange(t.key)} accessibilityLabel={t.label}>
            <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={19} color={red || (on ? colors.text : colors.menu)} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.topTabText, red && { color: red }, on && { color: red || colors.text, fontWeight: '800' }]}>
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
  const [streamSeg, setStreamSeg] = useState('radios'); // Stream: 'radios' ou 'tv'

  // Veio do menu ⋮, da busca ou da Lotus (ex.: Imóveis → Alugar)
  useEffect(() => {
    if (!explore) return;
    if (explore.kind) setKind(explore.kind);
    if (explore.live) setLiveFilter(explore.live);
    if (explore.group) setEvGroup(explore.group);
    if (explore.stream) setStreamSeg(['tv', 'musicas'].includes(explore.stream) ? explore.stream : 'radios');
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
      {top === 'stream' ? <StreamTab seg={streamSeg} setSeg={setStreamSeg} navigate={navigate} /> : null}
      {top === 'trends' ? <TrendsTab navigate={navigate} /> : null}
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
  const stores = state.stores.filter((st) => !isFoodStore(st)).sort(byStoreTrust(state));
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
          <ClipStrip title="🎬 Reels das lojas" clips={SHOP_CLIPS} />
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
  const { state: st0 } = useStore();
  // Eventos de verdade (publicados por empresas no servidor) vêm primeiro.
  const reais = st0.serverEvents || [];
  const festas = [...reais, ...sortEv(events.filter((e) => e.group === 'festa-promo'))];
  const anuncios = sortEv(events.filter((e) => e.group === 'promo-anuncio'));
  const outros = events.filter((e) => !['festa-promo', 'promo-anuncio'].includes(e.group));
  const list = group === 'festa-promo' ? festas : sortEv(events.filter((e) => e.group === group));
  const { state, dispatch } = useStore();
  const ticketOf = (e) => (state.tickets || []).find((t) => t.eventId === e.id);
  // Comprar ingresso (com ou sem mesa reservada). Com ingresso, no local: abre a comanda para pedir.
  const act = (e) => {
    // Evento de verdade: compra pelo servidor e o ingresso chega com o código para a portaria.
    if (e.serverId) {
      if (e.status === 'esgotado') return Alert.alert('Esgotado', 'Os ingressos desse evento acabaram.');
      const comprar = (qty) =>
        comprarIngresso(state, dispatch, e, qty).then((r) =>
          r.ok
            ? Alert.alert('Ingresso garantido 🎟️', `${e.title} · ${e.who} · ${e.when}\n\nCódigo${r.codes.length > 1 ? 's' : ''}: ${r.codes.join(', ')}\nMostre na entrada (fica em Pedidos › Ingressos).`)
            : Alert.alert('Compra não feita', r.message)
        );
      return Alert.alert(e.title, `${e.who} · ${e.when}\n${e.place}\n${e.price} por ingresso`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: '1 ingresso', onPress: () => comprar(1) },
        { text: '2 ingressos', onPress: () => comprar(2) },
      ]);
    }
    const tk = ticketOf(e);
    const venue = venueOfEvent(e);
    if (tk) return dispatch({ type: 'VENUE_ENTER', venue, table: tk.table, open: true, eventId: e.id });
    const price = ticketPrice(e.price);
    const buy = (withTable) => {
      const table = withTable ? freeTable() : null;
      dispatch({ type: 'BUY_TICKET', ticket: { id: 'tk' + Date.now(), eventId: e.id, title: e.title, name: e.who, price, table } });
      if (table) dispatch({ type: 'VENUE_RESERVE', venueId: venue.id, table });
      Alert.alert(
        'Ingresso garantido 🎟️',
        `${e.title} · ${e.who} · ${e.when}${table ? `\n\nMesa ${table} reservada para você.` : ''}\n\nQuando chegar, toque em "No local · pedir" para pedir bebidas e comidas pelo app${table ? ', direto na sua mesa' : ''}.`,
      );
    };
    // Sem saldo: escolhe ingresso ou ingresso + mesa e paga no Pix (valor inteiro ou saldo + restante).
    const pay = (withTable) => (price > state.wallet ? askPix({ amount: price, available: state.wallet, label: `Ingresso · ${e.title}`, onPaid: () => buy(withTable) }) : buy(withTable));
    Alert.alert(e.cta, `${e.title}\n${e.who} · ${e.when}\n${price ? brl(price) : 'Grátis'} pelo Realyz`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Só ingresso', onPress: () => pay(false) },
      { text: 'Ingresso + mesa', onPress: () => pay(true) },
    ]);
  };
  const withCta = (e) => (ticketOf(e) ? { ...e, cta: 'No local · pedir' } : e);
  return (
    <Screen>
      <ShopHero title="Eventos e festas" sub="O rolê de hoje: festa com desconto, lista VIP e promo da noite" />
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
        onPress={() => Alert.alert('Divulgar no Realyz', 'Casas noturnas, bares, restaurantes e organizadores podem anunciar festas e promoções para pessoas verificadas por biometria. Patrocinados aparecem primeiro.')}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Divulgar festa ou promoção</Text>
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
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '700' }}>{e.cta}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adBtn, { marginRight: 0 }]} onPress={onContact}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '600' }}>Mensagem</Text>
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
          <Text style={{ color: colors.onPrimary, fontSize: 12 }}>Preços exclusivos para quem compra pelo Realyz</Text>
        </View>
      </View>
      {items.map(({ p, off, until }) => {
        const from = p.price / (1 - off / 100);
        return (
          <View key={p.id} style={styles.promo}>
            <View>
              <TouchableOpacity activeOpacity={0.85} onPress={() => openProduct(p)} accessibilityLabel={`Ver ${p.name}`}><ProductThumb product={p} size={74} /></TouchableOpacity>
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
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.chipText, on && { color: colors.onPrimary }]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.announce}
        onPress={() => Alert.alert('Anunciar no Realyz', 'Imóveis, veículos, máquinas e produtos. Pessoas verificadas por biometria veem o seu anúncio.')}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Criar anúncio</Text>
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
            {/* Rodapé do cartão: um botão em cima do outro, na largura toda */}
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity style={[styles.adBtn, styles.adBtnMain, styles.adBtnStack]} onPress={() => onContact(l)}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '700' }}>Tenho interesse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adBtn, styles.adBtnStack, { marginTop: 8 }]}
                onPress={() => Alert.alert(cta(l), `Pedido enviado para ${l.who}. A confirmação chega nas suas mensagens.`)}
              >
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '600' }}>{cta(l)}</Text>
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
  // Tocar em Community no rodapé (ou ir para a Community por outro caminho) sempre volta para o feed,
  // saindo de Mensagens, Contatos ou Notificações; só abre outra parte quando ela vem pedida (seg).
  useEffect(() => {
    if (explore && explore.tab === 'stories') setSeg(explore.seg || 'posts');
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
        homeTick={explore && explore.tab === 'stories' && !explore.seg && !explore.story ? explore.at : 0}
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

// Contato de conta real: toca para abrir o perfil; amigo tem Mensagem; pedido recebido tem Aceitar/Recusar;
// pedido enviado mostra "Aguardando" e dá para cancelar.
function RealContact({ u, onChat }) {
  const [busy, setBusy] = useState(false);
  const first = (u.name || '').split(' ')[0];
  const run = (fn) => {
    setBusy(true);
    fn()
      .catch((e) => Alert.alert('Não deu certo', e.message))
      .finally(() => setBusy(false));
  };
  return (
    <View style={styles.convRow}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => openServerProfile(u.id)} activeOpacity={0.7} accessibilityLabel={`Ver perfil de ${u.name}`}>
        {u.photo ? (
          <Photo uri={mediaUrl(u.photo)} style={styles.convAvatar} fallback="🙂" />
        ) : (
          <View style={[styles.convAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{first.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{u.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {u.username ? `*${u.username} · ` : ''}
            {u.friend === 'amigos' ? 'amigo no Realyz' : u.friend === 'enviado' ? 'aguardando resposta' : 'quer ser seu amigo'}
          </Text>
        </View>
      </TouchableOpacity>
      {u.friend === 'amigos' ? (
        <TouchableOpacity style={styles.roundSm} onPress={onChat} accessibilityLabel={`Mensagem para ${u.name}`}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : u.friend === 'recebido' ? (
        <>
          <TouchableOpacity style={[styles.roundSm, { backgroundColor: colors.primary }]} onPress={busy ? undefined : () => run(() => addFriend(u.id))} accessibilityLabel={`Aceitar ${u.name}`}>
            <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roundSm, { marginLeft: 8 }]} onPress={busy ? undefined : () => run(() => removeFriend(u.id))} accessibilityLabel={`Recusar ${u.name}`}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.roundSm} onPress={() => Alert.alert('Cancelar o pedido?', `${first} ainda não respondeu.`, [{ text: 'Manter', style: 'cancel' }, { text: 'Cancelar pedido', style: 'destructive', onPress: () => run(() => removeFriend(u.id)) }])} accessibilityLabel={`Pedido para ${u.name} aguardando resposta`}>
          <Ionicons name="time-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CommunityTab({ top, homeTick, seg, setSeg, convs, contactOf, onChat, onVideo, onGoLive, userName }) {
  const { state, dispatch } = useStore();
  const [ongAberta, setOngAberta] = useState(null);
  // Tocar em Community (ou na logo) de novo: o feed volta para o topo e se reorganiza, com as
  // publicações novas (ainda não vistas) primeiro.
  const feedRef = useRef(null);
  const [, setFresh] = useState(0);
  useEffect(() => {
    if (!homeTick) return;
    setFresh((n) => n + 1);
    if (feedRef.current && feedRef.current.scrollTo) feedRef.current.scrollTo({ y: 0, animated: true });
  }, [homeTick]);
  const [searching, setSearching] = useState(false);
  // Tocar em quem postou abre o perfil da pessoa (com o botão de amizade).
  const openAuthor = (name) => {
    // Prestador de serviço: só a prévia do perfil de trabalho (sem adicionar).
    const pv = (state.providers || []).find((x) => x.name === name);
    if (pv) return dispatch({ type: 'PREVIEW_PROVIDER', id: pv.id });
    const m = memberByName(name);
    if (m) return dispatch({ type: 'OPEN_PROFILE', id: m.id });
    // Post de empresa: abre a página pública da empresa.
    const store = state.stores.find((s) => s.name === name);
    if (store) dispatch({ type: 'OPEN_COMPANY', id: store.id });
  };
  const requests = members.filter((m) => state.friends[m.id] === 'recebido');
  // Amizades das contas reais (servidor): amigos, pedidos recebidos e pedidos aguardando resposta.
  const real = useServerFriends(conectado(state));
  const [depOpen, setDepOpen] = useState(false);
  const notifCount = unseenNotifs(state);
  // Abriu o sininho: o que está na lista passa a contar como visto (o pontinho some na próxima vez).
  useEffect(() => {
    if (seg === 'notifs') dispatch({ type: 'NOTIF_SEEN', ids: buildNotifs(state).map((x) => x.id) });
  }, [seg === 'notifs' ? notifCount : -1]);
  const friends = members
    .filter((m) => state.friends[m.id] === 'amigo')
    .map((m) => ({ ...(contacts.find((c) => c.id === m.id) || { status: 'amigo no Realyz' }), id: m.id, name: m.name, photo: m.photo }));
  // Lojas que o cliente segue (seguir não é amizade: sem mensagem e sem ligação).
  const people = [...friends, ...contacts.filter((c) => c.business)];
  // Conta real: posts dos amigos (servidor) primeiro, depois os do app. Os meus que já subiram não repetem.
  const srv = useServerFeed(conectado(state));
  const meusNoServidor = new Set((state.communityPosts || []).map((p) => p.serverId).filter(Boolean));
  // Conta real: o feed é só de gente de verdade (servidor) + o que eu publiquei e ainda está subindo.
  // Os posts de exemplo ficam só no modo demonstração (sem conta no servidor).
  const meuNome = state.user ? state.user.name : null;
  const locais = conectado(state) ? (state.communityPosts || []).filter((p) => !p.serverId && (p.mine || p.author === meuNome)) : state.communityPosts;
  const posts = [...srv.posts.filter((p) => !meusNoServidor.has(p.serverId)), ...locais];
  const [srvCmts, setSrvCmts] = useState({}); // comentários carregados do servidor: { postId: [...] }
  const [liked, setLiked] = useState({});
  const [cmts, setCmts] = useState({}); // comentários feitos aqui: { postId: [texto] }
  const [openCmt, setOpenCmt] = useState(null);
  const [cmtText, setCmtText] = useState('');
  const [shared, setShared] = useState({});
  // Anúncio pago pedindo doação não entra: pedido de doação só pelo perfil da ONG (src/ongs.js).
  // Conta real: anúncios e campanhas de exemplo não aparecem (só os de anunciantes de verdade, quando houver).
  const ads = useMemo(() => (conectado(state) ? [] : state.posts.filter((p) => p.sponsored && !pedeDoacao(p.text))), [state.posts, state.user]);
  // Depoimentos: conta real = os aceitos no servidor; sem conta = os de exemplo.
  const srvDeps = useServerTestimonials(conectado(state));
  const testimonials = conectado(state) ? srvDeps.feed : state.testimonials.filter((t) => t.status === 'aprovado');
  const pendingMine = state.testimonials.filter((t) => t.to === 'me' && t.status === 'pendente').length;
  const sharePost = async (p) => {
    try {
      const r = await Share.share({ message: `${p.author} no Realyz:\n\n${p.text}\n\nRealyz · Pessoas reais. Negócios reais.` });
      if (!r || r.action !== Share.dismissedAction) setShared((x) => ({ ...x, [p.id]: (x[p.id] || 0) + 1 }));
    } catch (e) {}
  };
  const sendCmt = (id) => {
    const v = cmtText.trim();
    if (!v) return;
    const p = posts.find((x) => x.id === id);
    if (p && p.server) {
      comentar(p.serverId, v)
        .then((c) => setSrvCmts((x) => ({ ...x, [id]: [...(x[id] || []), c] })))
        .catch((e) => Alert.alert('Comentário', e.message));
      setCmtText('');
      return;
    }
    setCmts((x) => ({ ...x, [id]: [...(x[id] || []), v] }));
    setCmtText('');
  };
  // Abrir os comentários de um post real carrega os de todo mundo.
  const abrirCmts = (p) => {
    setOpenCmt(openCmt === p.id ? null : p.id);
    setCmtText('');
    if (p.server && openCmt !== p.id) comentarios(p.serverId).then((l) => setSrvCmts((x) => ({ ...x, [p.id]: l }))).catch(() => {});
  };


  // Feed único: posts da comunidade e depoimentos aprovados, intercalados.
  // A cada 2 posts entra 1 anúncio: é aqui que a publicidade chega ao usuário.
  const feed = [];
  const ongFeed = conectado(state) ? null : campanhaDoFeed(state.ongs, new Date().getDate());
  const n = Math.max(posts.length, testimonials.length);
  for (let i = 0; i < n; i++) {
    if (posts[i]) feed.push({ type: 'post', p: posts[i] });
    if (testimonials[i]) feed.push({ type: 'dep', t: testimonials[i] });
    if (i % 2 === 1 && ads.length) feed.push({ type: 'ad', p: ads[Math.floor(i / 2) % ads.length] });
    // Uma campanha de ONG por vez no feed (a do mês, girando entre as ONGs), depois do 3º post.
    if (i === 2 && ongFeed) feed.push({ type: 'ong', o: ongFeed });
  }

  // Sugestões de amizade (como no Instagram): um carrossel depois dos dois primeiros itens do feed.
  if (conectado(state) && feed.length) feed.splice(Math.min(2, feed.length), 0, { type: 'sug' });

  // Post que passou na tela (rolando o feed) conta como visto: some a borda roxa do amigo
  // na faixa de stories. Guarda onde cada post fica e confere quando a rolagem para.
  const feedY = useRef(0);
  const postPos = useRef({});
  const scrollY = useRef(0);
  const checkSeen = (y) => {
    if (y != null) scrollY.current = y;
    const h = Dimensions.get('window').height;
    const top0 = scrollY.current, bottom0 = top0 + h * 0.85;
    const ids = Object.keys(postPos.current).filter((id) => {
      const p = postPos.current[id];
      const mid = feedY.current + p.y + Math.min(p.h, h * 0.5) / 2;
      return mid > top0 && mid < bottom0;
    });
    if (ids.length && scrollY.current > 0) dispatch({ type: 'POSTS_SEEN', ids });
  };
  const onFeedScroll = (e) => (scrollY.current = e.nativeEvent.contentOffset.y);
  const onFeedEnd = (e) => checkSeen(e.nativeEvent.contentOffset.y);

  return (
    <Screen scrollRef={feedRef} onScroll={seg === 'posts' ? onFeedScroll : undefined} onScrollEnd={seg === 'posts' ? onFeedEnd : undefined}>
      {top}
      {/* Sino e balão de mensagens ficam no cabeçalho do app (App.js). Aqui, fora do feed, só a setinha de voltar
          com o nome da parte; Contatos virou uma aba dentro de Mensagens (Conversas · Contatos). */}
      {seg !== 'posts' ? (
        <View style={styles.corner}>
          <TouchableOpacity onPress={() => setSeg('posts')} style={styles.cornerBack} hitSlop={6} accessibilityLabel="Voltar para o feed">
            <Ionicons name="chevron-back" size={15} color={colors.menu} />
            <Text style={styles.cornerBackTxt}>{seg === 'notifs' ? 'Notificações' : 'Mensagens'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {seg === 'msgs' || seg === 'contatos' ? (
        <SegTabs
          items={[
            { key: 'msgs', label: 'Conversas', icon: 'chatbubbles-outline', badge: convs.reduce((n, c) => n + c.unread, 0) || null },
            { key: 'contatos', label: 'Contatos', icon: 'people-outline', badge: requests.length + real.received.length || null },
          ]}
          value={seg}
          onChange={setSeg}
        />
      ) : null}


      {seg === 'notifs' ? (
        <NotifList onDep={() => setDepOpen(true)} onGo={(go) => dispatch({ type: 'NAV_REQUEST', go })} />
      ) : null}
      <DepCenter visible={depOpen} onClose={() => setDepOpen(false)} />
      {ongAberta ? <OngPage ong={ongAberta} onClose={() => setOngAberta(null)} /> : null}

      {seg === 'posts' ? (
        <View onLayout={(e) => (feedY.current = e.nativeEvent.layout.y)}>
          <ServerPendingTestimonials pending={srvDeps.pending} />
          {/* Feed vazio (conta nova, sem amigos ainda): convite para publicar e achar pessoas. */}
          {!feed.length ? (
            <View style={styles.emptyFeed}>
              <Ionicons name="sparkles-outline" size={30} color={colors.primary} />
              <Text style={styles.emptyTitle}>Sua Community começa aqui</Text>
              <Text style={styles.emptyText}>Publique algo ou adicione amigos. As publicações e os stories deles aparecem neste feed.</Text>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => dispatch({ type: 'NAV_REQUEST', go: { tab: 'stories', top: 'comunidade', story: 'add' } })} accessibilityLabel="Publicar">
                  <Ionicons name="add" size={16} color={colors.onPrimary} />
                  <Text numberOfLines={1} style={styles.emptyBtnText}>Publicar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.emptyBtn, styles.emptyBtnLine]} onPress={() => setSearching(true)} accessibilityLabel="Encontrar amigos">
                  <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                  <Text numberOfLines={1} style={[styles.emptyBtnText, { color: colors.primary }]}>Encontrar amigos</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {!feed.length ? <SugestoesCarrossel on={conectado(state)} /> : null}
          {feed.map((it, idx) =>
            it.type === 'sug' ? (
              <SugestoesCarrossel key="sugestoes" on />
            ) : it.type === 'ong' ? (
              <CampanhaCard key={'ong' + it.o.ong.id} ong={it.o.ong} c={it.o.c} compacto onOpen={() => setOngAberta(it.o.ong)} />
            ) : it.type === 'dep' ? (
              it.t.server ? <ServerTestimonialCard key={it.t.id} t={it.t} /> : <TestimonialCard key={it.t.id} t={it.t} />
            ) : it.type === 'post' ? (
              <View
                key={it.p.id}
                style={styles.post}
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  postPos.current[it.p.id] = { y, h: height };
                }}
              >
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  activeOpacity={0.7}
                  onPress={() => {
                    dispatch({ type: 'POSTS_SEEN', ids: [it.p.id] });
                    it.p.server ? openServerProfile(it.p.authorId) : it.p.station ? openStation(it.p.station.kind, it.p.station.id) : openAuthor(it.p.author);
                  }}
                  accessibilityLabel={`Ver perfil de ${it.p.author}`}
                >
                  {it.p.server && it.p.authorPhoto ? (
                    <Photo uri={it.p.authorPhoto} style={[styles.avatar, { padding: 0 }]} fallback="🙂" />
                  ) : it.p.station ? (
                    <StationLogo s={(it.p.station.kind === 'tv' ? tvById : radioById)(it.p.station.id) || { emoji: '📻' }} kind={it.p.station.kind} size={40} radius={20} />
                  ) : memberByName(it.p.author) ? (
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
                    <Text style={{ color: '#8A5A0B', fontSize: 12, fontWeight: '700', marginLeft: 5, flex: 1 }}>Em verificação: a IA do Realyz achou sinais de informação falsa</Text>
                  </View>
                ) : null}
                <Text style={{ color: colors.text, marginTop: 10, lineHeight: 20 }}>{it.p.text}</Text>
                {/* Tocar na foto abre ela grande, em destaque (src/components/MediaViewer.js). */}
                {it.p.image ? (
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([{ photo: it.p.image, title: it.p.author, sub: it.p.text }])} accessibilityLabel={`Ver a foto de ${it.p.author}`}>
                    <PostPhoto uri={it.p.image} style={styles.postImg} />
                  </TouchableOpacity>
                ) : null}
                {it.p.video ? (
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openMedia([{ video: it.p.video, title: it.p.author, sub: it.p.text }])} style={[styles.postImg, { backgroundColor: '#14120E', alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel={`Ver o vídeo de ${it.p.author}`}>
                    <Ionicons name="play-circle" size={56} color="#F5C331" />
                  </TouchableOpacity>
                ) : null}
                {it.p.station ? <StationPostPlayer station={it.p.station} /> : null}
                {/* Ações no estilo clean: ícones com números, salvar no mural à direita. */}
                <View style={styles.actRow}>
                  <TouchableOpacity style={styles.postAct} onPress={() => (it.p.server ? curtir(it.p.serverId).catch((e) => Alert.alert('Curtir', e.message)) : setLiked({ ...liked, [it.p.id]: !liked[it.p.id] }))} hitSlop={6} accessibilityLabel="Curtir">
                    <Ionicons name={(it.p.server ? it.p.liked : liked[it.p.id]) ? 'heart' : 'heart-outline'} size={22} color={(it.p.server ? it.p.liked : liked[it.p.id]) ? '#E0245E' : colors.text} />
                    <Text numberOfLines={1} style={styles.postActText}>{it.p.server ? it.p.likes : it.p.likes + (liked[it.p.id] ? 1 : 0)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.postAct} onPress={() => abrirCmts(it.p)} hitSlop={6} accessibilityLabel="Comentar">
                    <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
                    <Text numberOfLines={1} style={styles.postActText}>{it.p.server ? it.p.comments : it.p.comments + (cmts[it.p.id] || []).length}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.postAct} onPress={() => sharePost(it.p)} hitSlop={6} accessibilityLabel="Compartilhar">
                    <Ionicons name="paper-plane-outline" size={20} color={colors.text} />
                    {shared[it.p.id] ? <Text numberOfLines={1} style={styles.postActText}>{shared[it.p.id]}</Text> : null}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  {/* Meu post: destacar (atalho no mural, na vitrine ou numa pasta de destaques).
                      Post dos outros: fixar no mural do meu perfil (posts que curti). */}
                  <TouchableOpacity
                    style={[styles.postAct, { marginRight: 0 }]}
                    hitSlop={6}
                    onPress={() => {
                      if (it.p.author === userName || (it.p.server && state.user && it.p.authorId === state.user.serverId)) {
                        return abrirDestacar({ kind: 'post', id: it.p.serverId || it.p.id, image: it.p.image || null, video: it.p.video || null, text: it.p.text || '' });
                      }
                      dispatch({ type: 'MURAL_ADD', item: { id: 'm' + Date.now(), at: Date.now(), time: 'agora', type: 'post', postId: it.p.id, author: it.p.author, text: it.p.text, image: it.p.image } });
                      if (Platform.OS === 'android') ToastAndroid.show('Fixado no seu mural', ToastAndroid.SHORT);
                    }}
                    accessibilityLabel="Fixar no meu mural"
                  >
                    <Ionicons name={(state.mural && state.mural.items.some((x) => x.postId === it.p.id)) ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {(it.p.server ? it.p.likes : it.p.likes + (liked[it.p.id] ? 1 : 0)) > 0 ? (
                  <Text style={styles.curtidas}>
                    Curtido por <Text style={{ fontWeight: '700' }}>{(() => { const n = it.p.server ? it.p.likes : it.p.likes + (liked[it.p.id] ? 1 : 0); return n === 1 ? '1 pessoa' : `${n} pessoas`; })()}</Text>
                  </Text>
                ) : null}
                {it.p.server && openCmt === it.p.id
                  ? (srvCmts[it.p.id] || []).map((c) => (
                      <View key={c.id} style={styles.cmt}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{c.author.name}</Text>
                        <Text style={{ color: colors.text, fontSize: 13 }}>{c.text}</Text>
                      </View>
                    ))
                  : null}
                {(it.p.server ? [] : cmts[it.p.id] || []).map((c, k) => (
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
                <PostPhoto uri={it.p.image} style={styles.postImg} />
                <Text style={{ color: colors.text, marginTop: 8 }}>{it.p.text}</Text>
              </View>
            )
          )}
        </View>
      ) : null}

      {seg === 'msgs' ? (
        <>
          <ServerInbox />
          {/* Conversas guardadas só neste aparelho (exemplos e respostas antigas): conta real sem nenhuma não vê a seção. */}
          {conectado(state) && !(convs || []).length ? null : (
            <>
              {conectado(state) ? <Text style={styles.contactsTitle}>Outras conversas</Text> : null}
              <ConvList convs={convs} contactOf={contactOf} onChat={onChat} />
            </>
          )}
        </>
      ) : null}

      {seg === 'contatos' ? (
        <View>
          <TouchableOpacity style={styles.findPeople} onPress={() => setSearching(true)} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.muted, marginLeft: 8, flex: 1 }}>Buscar pessoas por nome ou @usuário</Text>
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
          {/* Contas reais: pedidos recebidos, amigos e pedidos que você mandou (aguardando). */}
          {real.received.length ? (
            <>
              <Text style={styles.contactsTitle}>Pedidos de amizade recebidos ({real.received.length})</Text>
              {real.received.map((u) => (
                <RealContact key={u.id} u={u} onChat={() => dispatch({ type: 'OPEN_SERVER_CHAT', userId: u.id, name: u.name })} />
              ))}
            </>
          ) : null}
          {real.friends.length ? (
            <>
              <Text style={styles.contactsTitle}>Seus amigos no Realyz ({real.friends.length})</Text>
              {real.friends.map((u) => (
                <RealContact key={u.id} u={u} onChat={() => dispatch({ type: 'OPEN_SERVER_CHAT', userId: u.id, name: u.name })} />
              ))}
            </>
          ) : null}
          {real.sent.length ? (
            <>
              <Text style={styles.contactsTitle}>Aguardando resposta ({real.sent.length})</Text>
              {real.sent.map((u) => (
                <RealContact key={u.id} u={u} />
              ))}
            </>
          ) : null}
          <Text style={styles.contactsTitle}>{real.friends.length || real.sent.length || real.received.length ? 'Perfis de exemplo' : 'Amigos e contatos'} ({people.length})</Text>
          <TouchableOpacity
            style={styles.announce}
            onPress={() => Alert.alert('Convidar amigos', 'Mande o convite: quem entra no Realyz passa pela verificação por biometria.')}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Convidar para o Realyz</Text>
          </TouchableOpacity>
          {people.map((ct) => (
            <View key={ct.id} style={styles.convRow}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => (ct.business ? openAuthor(ct.name) : dispatch({ type: 'OPEN_PROFILE', id: ct.id }))}
                activeOpacity={0.7}
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
              {ct.business ? (
                // Loja: o cliente segue, mas não manda mensagem nem liga. Conversa só dentro dos pedidos.
                <View style={styles.followChip}>
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                  <Text numberOfLines={1} style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Seguindo</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.roundSm} onPress={() => onChat(ct)} accessibilityLabel={`Mensagem para ${ct.name}`}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roundSm, { marginLeft: 8 }]} onPress={() => onVideo(ct)} accessibilityLabel={`Chamada de vídeo com ${ct.name}`}>
                    <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
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
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyFeed: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 22, marginVertical: 10 },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 8, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14, marginHorizontal: 4 },
  emptyBtnLine: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  emptyBtnText: { color: colors.onPrimary, fontWeight: '800', marginLeft: 6, fontSize: 13 },
  // Cantinho da Community: Mensagens e Contatos só com o símbolo.
  corner: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, minHeight: 34 },
  cornerBtn: { width: 36, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  cornerOn: { backgroundColor: colors.primaryLight },
  cornerBadge: { position: 'absolute', top: 1, right: 1, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cornerBack: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  cornerBackTxt: { color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 2 },
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
  topTabOn: { backgroundColor: '#F6EDD6' }, // escolhido: dourado suave, sem bloco amarelo forte
  foodHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1E6', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(232,89,12,0.3)' },
  sectorHit: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 10, marginBottom: 8, ...soft },
  sectorIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  promoTeaser: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B5C', borderRadius: 18, padding: 13, marginBottom: 16, borderWidth: 1, borderColor: '#FF7A45' },
  topTabText: { color: colors.menu, fontSize: 11, fontWeight: '700', marginTop: 3 },
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
    minHeight: 38,
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
    minHeight: 46,
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
  adBtn: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: '#F0E9DA', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  adBtnMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  adBtnStack: { flex: 0, alignSelf: 'stretch', marginRight: 0, minHeight: 44 },
  segRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segOn: { borderColor: colors.primary, backgroundColor: 'rgba(168,121,10,0.1)' },
  segText: { color: colors.muted, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  unread: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 5, paddingHorizontal: 4 },
  liveBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#FF3B5C', marginLeft: 'auto' },
  composer: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 12, ...soft },
  findPeople: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, minHeight: 46, marginBottom: 6 },
  contactsTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 12, marginBottom: 8 },
  composerInput: { color: colors.text, fontSize: 15, minHeight: 44, textAlignVertical: 'top' },
  depBtn: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, marginTop: 6, marginRight: 8 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(168,121,10,0.3)' },
  cmt: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  cmtBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingLeft: 12, marginTop: 8, backgroundColor: colors.bg },
  publish: { alignSelf: 'flex-end', height: 36, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  post: { backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  postImg: { width: '100%', aspectRatio: 1, maxHeight: 420, borderRadius: 10, marginTop: 10, overflow: 'hidden' },
  actRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  postAct: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  postActText: { color: colors.text, fontSize: 13, fontWeight: '600', marginLeft: 5 },
  curtidas: { color: colors.text, fontSize: 12, marginTop: 6 },
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
  followChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.primary },
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
