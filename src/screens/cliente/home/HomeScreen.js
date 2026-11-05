import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, storeOf } from '../../../store';
import { colors, brl } from '../../../theme';
import { Screen, Photo, ProductThumb, Badge } from '../../../components/ui';
import { promos, listings, LISTING_KINDS, LISTING_CTA, communityPosts, contacts, lives, events, EVENT_GROUPS } from '../../../homeData';
import { ChatModal, VideoCallModal, LiveModal } from './Social';
import { members, memberByName } from '../../../people';
import { PeopleSearchModal, PersonRow } from '../../../components/People';
import { LaunchStrip } from '../../../components/Launches';
import { SHOP_SECTORS, SHOP_SECTOR_KEYS } from '../../../shopSectorsData';
import { useBack } from '../../../back';
import { TestimonialCard, TestimonialComposer } from '../../../components/SocialProfile';

// Abas do topo do Início do cliente. A Comunidade foi para a página de Stories.
const TOP = [
  { key: 'shop', label: 'Shop', icon: 'bag-handle-outline' },
  { key: 'eventos', label: 'Eventos', icon: 'sparkles-outline' },
  { key: 'promo', label: 'Promoções', icon: 'pricetags-outline' },
  { key: 'anuncios', label: 'Anúncios', icon: 'megaphone-outline' },
  { key: 'lives', label: 'Lives', icon: 'radio-outline' },
];

export default function HomeScreen({ goTo, explore }) {
  const { state, dispatch } = useStore();
  const [top, setTop] = useState('shop');
  const [kind, setKind] = useState('todos');
  const [seg, setSeg] = useState('posts');
  const [evGroup, setEvGroup] = useState('destaques');
  // Conversas ficam no estado do app (as respostas aos stories também caem aqui).
  const convs = state.conversations;
  const setConvs = (fn) => dispatch({ type: 'UPDATE_CONVS', fn: typeof fn === 'function' ? fn : () => fn });
  const [chatWith, setChatWith] = useState(null);
  const [videoWith, setVideoWith] = useState(null);
  const [live, setLive] = useState(null); // { live, mine }
  const [liveFilter, setLiveFilter] = useState('todas');
  // Voltar do celular: das outras abas do topo (Eventos, Promoções…) volta para o Shop.
  useBack(top !== 'shop', () => setTop('shop'));

  // Veio do menu ⋮ (ex.: Imóveis → Alugar)
  useEffect(() => {
    if (!explore || !explore.top) return;
    if (explore.top === 'comunidade') return; // agora fica na página de Stories
    setTop(explore.top);
    if (explore.kind) setKind(explore.kind);
    if (explore.seg) setSeg(explore.seg);
    if (explore.live) setLiveFilter(explore.live);
    if (explore.group) setEvGroup(explore.group);
  }, [explore]);

  const contactOf = (id) => contacts.find((c) => c.id === id);
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
  const anyContact = (id) => contactOf(id) || (convs.find((c) => c.contactId === id) || {}).extra;

  const chatConv = chatWith ? convs.find((c) => c.contactId === chatWith.id) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.topTabs}>
        {TOP.map((t) => {
          const on = t.key === top;
          return (
            <TouchableOpacity key={t.key} style={[styles.topTab, on && styles.topTabOn]} onPress={() => setTop(t.key)}>
              <Ionicons name={on ? t.icon.replace('-outline', '') : t.icon} size={19} color={on ? colors.onPrimary : colors.primary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.topTabText, on && { color: colors.onPrimary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {top === 'shop' ? <ShopTab goTo={goTo} /> : null}
        {top === 'eventos' ? <EventsTab group={evGroup} setGroup={setEvGroup} onContact={contactAdvertiser} /> : null}
        {top === 'promo' ? <PromoTab /> : null}
        {top === 'anuncios' ? <AdsTab kind={kind} setKind={setKind} onContact={contactAdvertiser} /> : null}
        {top === 'lives' ? <LivesTab filter={liveFilter} setFilter={setLiveFilter} onWatch={(l) => setLive({ live: l, mine: false })} onGoLive={() => setLive({ live: null, mine: true })} /> : null}
      </View>

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

function Hero() {
  return (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>Você no comando.</Text>
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

function ShopTab({ goTo }) {
  const { state, dispatch } = useStore();
  const featured = state.products.filter((p) => p.featured);
  const stores = [...state.stores].sort((a, b) => b.sponsored - a.sponsored || b.recommended - a.recommended || b.rating - a.rating);
  return (
    <Screen>
      <Hero />
      <View style={styles.circleGrid}>
        {SHOP_SHORTCUTS.map((c) => (
          <TouchableOpacity key={c.key} style={styles.circleItem} onPress={() => goTo(c.key)} activeOpacity={0.8} accessibilityLabel={c.label}>
            <View style={[styles.circle, { borderColor: c.color + '66', backgroundColor: c.color + '12' }]}>
              <Ionicons name={c.ion} size={18} color={c.color} />
            </View>
            <Text style={styles.circleLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <LaunchStrip />
      <SectionHead title="Destaques para você" action="Ver loja" onAction={() => goTo('loja')} />
      <View style={styles.grid}>
        {featured.map((p) => (
          <View key={p.id} style={styles.prod}>
            <ProductThumb product={p} size={86} />
            <Text numberOfLines={2} style={styles.prodName}>
              {p.name}
            </Text>
            <Text style={styles.prodStore}>{(storeOf(state, p.storeId) || {}).name}</Text>
            <Text style={styles.prodPrice}>{brl(p.price)}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => dispatch({ type: 'ADD_TO_CART', productId: p.id })}>
              <Ionicons name="add" size={16} color={colors.onPrimary} />
              <Text style={styles.addText}>Carrinho</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <SectionHead title="Lojas em destaque" />
      {stores.map((s) => (
        <TouchableOpacity key={s.id} style={styles.storeRow} onPress={() => goTo('loja')} activeOpacity={0.85}>
          <View style={styles.storeLogo}>
            <Text style={{ color: colors.text, fontSize: 22 }}>{s.logo}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.storeName}>{s.name}</Text>
            <Text style={styles.storeMeta}>
              {s.category} · <Text style={{ color: colors.accent, fontWeight: '800' }}>★ {s.rating}</Text>
              {s.shipsBrazil ? ' · envia p/ todo o Brasil' : ''}
            </Text>
          </View>
          {s.sponsored ? <Badge label="Patrocinado" color={colors.sponsored} /> : null}
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

// Eventos: festas promocionais e anúncios de promoções em destaque.
const sortEv = (list) => [...list].sort((a, b) => b.sponsored - a.sponsored);

function EventsTab({ group, setGroup, onContact }) {
  const festas = sortEv(events.filter((e) => e.group === 'festa-promo'));
  const anuncios = sortEv(events.filter((e) => e.group === 'promo-anuncio'));
  const outros = events.filter((e) => !['festa-promo', 'promo-anuncio'].includes(e.group));
  const list = sortEv(events.filter((e) => e.group === group));
  const act = (e) => Alert.alert(e.cta, `${e.title}\n${e.who} · ${e.when}\n\nPedido enviado. A confirmação chega nas suas mensagens.`);
  return (
    <Screen>
      <View style={styles.evBanner}>
        <Ionicons name="sparkles" size={24} color={colors.onPrimary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.onPrimary, fontWeight: '900', fontSize: 17 }}>Eventos e festas</Text>
          <Text style={{ color: colors.onPrimary, fontSize: 12, marginTop: 2 }}>Festas com desconto, listas VIP e promoções da noite</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {EVENT_GROUPS.map((g) => {
          const on = g.key === group;
          return (
            <TouchableOpacity key={g.key} style={[styles.chip, g.highlight && !on && styles.chipHot, on && styles.chipOn]} onPress={() => setGroup(g.key)}>
              <Ionicons name={g.icon} size={15} color={on ? colors.onPrimary : g.highlight ? '#FF3B5C' : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {group === 'destaques' ? (
        <>
          <SectionHead title="🔥 Festas promocionais" action="Ver todas" onAction={() => setGroup('festa-promo')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {festas.map((e) => (
              <EventPromoCard key={e.id} e={e} onPress={() => act(e)} />
            ))}
          </ScrollView>

          <SectionHead title="📣 Anúncios de promoções" action="Ver todos" onAction={() => setGroup('promo-anuncio')} />
          {anuncios.map((e) => (
            <EventRow key={e.id} e={e} onAct={() => act(e)} onContact={() => onContact(e)} />
          ))}

          <SectionHead title="Mais eventos" />
          {outros.map((e) => (
            <EventRow key={e.id} e={e} onAct={() => act(e)} onContact={() => onContact(e)} />
          ))}
        </>
      ) : (
        list.map((e) => <EventRow key={e.id} e={e} big onAct={() => act(e)} onContact={() => onContact(e)} />)
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
            <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>PATROCINADO</Text>
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
          <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 12 }}>{e.cta}</Text>
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
            <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>PATROCINADO</Text>
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
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{e.cta}</Text>
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
          <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 16 }}>Ofertas relâmpago</Text>
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
                <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>PATROCINADO</Text>
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
                <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Tenho interesse</Text>
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
  const [posts, setPosts] = useState(communityPosts);
  const [draft, setDraft] = useState('');
  const [liked, setLiked] = useState({});
  const [cmts, setCmts] = useState({}); // comentários feitos aqui: { postId: [texto] }
  const [openCmt, setOpenCmt] = useState(null);
  const [cmtText, setCmtText] = useState('');
  const [shared, setShared] = useState({});
  const [writing, setWriting] = useState(false);
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

  const publish = () => {
    if (!draft.trim()) return;
    setPosts([{ id: 'n' + Date.now(), author: userName, text: draft.trim(), image: null, likes: 0, comments: 0, time: 'agora' }, ...posts]);
    setDraft('');
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
                  <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>{unread}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.liveBtn} onPress={onGoLive} accessibilityLabel="Abrir live">
          <Ionicons name="radio" size={15} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 4 }}>Live</Text>
        </TouchableOpacity>
      </View>

      {seg === 'posts' ? (
        <View>
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder="Compartilhe algo com a comunidade…"
              placeholderTextColor={colors.muted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
              <TouchableOpacity style={styles.depBtn} onPress={() => setWriting(true)} accessibilityLabel="Escrever depoimento">
                <Ionicons name="chatbox-ellipses-outline" size={15} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 5, fontSize: 13 }}>Depoimento</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publish} onPress={publish}>
                <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
          {pendingMine ? (
            <View style={styles.pendingBanner}>
              <Ionicons name="mail-unread-outline" size={18} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: '700', marginLeft: 8, flex: 1, fontSize: 13 }}>
                Você tem {pendingMine} depoimento{pendingMine > 1 ? 's' : ''} esperando aprovação. Veja em Perfil › Depoimentos.
              </Text>
            </View>
          ) : null}
          <TestimonialComposer visible={writing} onClose={() => setWriting(false)} />
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
                      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{it.p.author[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {it.p.author} <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{it.p.time}</Text>
                  </View>
                </TouchableOpacity>
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
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{userName}</Text>
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
                      <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>{c.unread}</Text>
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

const LIVE_FILTERS = [
  ['todas', 'Todas', 'radio-outline'],
  ['aulas', 'Aulas e cursos', 'school-outline'],
  ['compras', 'Compras ao vivo', 'bag-handle-outline'],
  ['noite', 'Noite e eventos', 'musical-notes-outline'],
];

function LivesTab({ filter, setFilter, onWatch, onGoLive }) {
  const match = (l) =>
    filter === 'todas' ||
    (filter === 'aulas' && l.aula) ||
    (filter === 'compras' && (l.tag === 'Compras ao vivo' || l.tag === 'Gastronomia' || l.tag === 'Imóveis')) ||
    (filter === 'noite' && l.tag === 'Noite e eventos');
  const list = lives.filter(match).sort((a, b) => b.sponsored - a.sponsored || b.viewers - a.viewers);
  return (
    <Screen>
      <TouchableOpacity style={styles.goLiveCard} onPress={onGoLive} activeOpacity={0.9}>
        <View style={styles.goLiveIcon}>
          <Ionicons name="radio" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Abrir minha live</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Dê uma aula, mostre seus produtos ou converse com a comunidade</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {LIVE_FILTERS.map(([k, label, icon]) => {
          const on = k === filter;
          return (
            <TouchableOpacity key={k} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(k)}>
              <Ionicons name={icon} size={15} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SectionHead title={filter === 'aulas' ? 'Aulas ao vivo agora' : 'Ao vivo agora'} />
      {list.map((l) => (
        <TouchableOpacity key={l.id} style={styles.liveCard} onPress={() => onWatch(l)} activeOpacity={0.9}>
          <Photo uri={l.photo} style={styles.livePhoto} fallback="🎥" />
          <View style={styles.liveOverlay}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.liveTag}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>AO VIVO</Text>
              </View>
              <View style={styles.liveViewers}>
                <Ionicons name="eye" size={12} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>{l.viewers.toLocaleString('pt-BR')}</Text>
              </View>
              {l.sponsored ? (
                <View style={[styles.liveViewers, { backgroundColor: colors.sponsored }]}>
                  <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '800' }}>PATROCINADO</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ padding: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{l.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
              {l.host} · {l.tag}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
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
  circleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, marginHorizontal: -4 },
  circleItem: { width: '25%', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  circle: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  circleLabel: { color: colors.text, fontWeight: '700', fontSize: 11, marginTop: 5, textAlign: 'center' },
  topTabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    marginHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  topTabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  topTabText: { color: colors.text, fontSize: 10, fontWeight: '700', marginTop: 3 },
  hero: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226,182,73,0.55)',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  heroTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  prod: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 10,
  },
  prodName: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 8 },
  prodStore: { color: colors.muted, fontSize: 11, marginTop: 2 },
  prodPrice: { color: colors.primary, fontWeight: '800', fontSize: 15, marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  addText: { color: colors.onPrimary, fontWeight: '800', fontSize: 12, marginLeft: 2 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  storeLogo: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  storeName: { color: colors.text, fontWeight: '700' },
  storeMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  offBadge: { position: 'absolute', top: -6, left: -6, backgroundColor: '#FF3B5C', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  offText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  promoPrice: { color: colors.accent, fontWeight: '900', fontSize: 17 },
  addRound: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
  chipHot: { borderColor: '#FF3B5C', backgroundColor: '#FFF0F3' },
  evBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: colors.sponsored },
  evCard: { width: 210, marginRight: 12, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: '#FFC2CE', overflow: 'hidden' },
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
  ad: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  adPhoto: { width: '100%', height: 170 },
  adKind: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adSponsored: { position: 'absolute', right: 10, top: 10, backgroundColor: colors.sponsored, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adPrice: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  adTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 2 },
  adDetail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  adPlace: { color: colors.muted, fontSize: 12, marginTop: 4 },
  adBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#EADFC8', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
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
  composer: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  findPeople: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, height: 46, marginBottom: 6 },
  contactsTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 12, marginBottom: 8 },
  composerInput: { color: colors.text, fontSize: 15, minHeight: 44, textAlignVertical: 'top' },
  depBtn: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, marginTop: 6, marginRight: 8 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(168,121,10,0.3)' },
  cmt: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  cmtBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingLeft: 12, marginTop: 8, backgroundColor: colors.bg },
  publish: { alignSelf: 'flex-end', height: 36, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  post: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  postImg: { width: '100%', height: 200, borderRadius: 14, marginTop: 10 },
  postAct: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  postActText: { color: colors.muted, fontSize: 12, marginLeft: 5 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
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
  liveCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  livePhoto: { width: '100%', height: 180 },
  liveOverlay: { position: 'absolute', left: 10, top: 10, right: 10 },
  liveTag: { backgroundColor: '#FF3B5C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  liveViewers: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(3,5,10,0.65)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
});
