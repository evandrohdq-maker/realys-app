import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from '../components/ui';
import { stories, contacts } from '../homeData';
import { StoryViewer, StoryComposer } from './cliente/home/Stories';
import { CommunityHub } from './cliente/home/HomeScreen';

// Página própria dos Stories (botão "Stories" na barra de baixo).
// Em cima, a faixa de bolinhas como no Instagram; embaixo, a Comunidade: feed único de posts e
// depoimentos (curtir, comentar, compartilhar), mensagens, contatos e live.
export default function StoriesScreen({ navigate, explore }) {
  const { state, dispatch } = useStore();
  const [view, setView] = useState(null); // { groups, start, mine }
  const [composing, setComposing] = useState(false);
  const userName = state.user ? state.user.name : 'Você';
  const seen = state.storySeen;
  const mine = { id: 'mine', mine: true, name: userName, items: state.myStories };

  const fresh = stories.filter((g) => !seen[g.id]);
  const old = stories.filter((g) => seen[g.id]);
  const open = (g) => setView({ groups: stories, start: stories.indexOf(g), mine: false });
  const openMine = () => (mine.items.length ? setView({ groups: [mine], start: 0, mine: true }) : setComposing(true));

  // Resposta ao story vira mensagem em Comunidade › Mensagens.
  const reply = (g, text) => {
    const contact = contacts.find((c) => c.id === g.contactId) || {
      id: g.contactId,
      name: g.name,
      status: g.business ? 'empresa verificada' : 'pessoa verificada',
      photo: g.avatar,
    };
    const d = new Date();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const msg = { from: 'me', text: `Respondeu ao seu story: ${text}`, time };
    dispatch({
      type: 'UPDATE_CONVS',
      fn: (cs) =>
        cs.find((c) => c.contactId === contact.id)
          ? cs.map((c) => (c.contactId === contact.id ? { ...c, messages: [...c.messages, msg] } : c))
          : [{ id: 'm' + Date.now(), contactId: contact.id, unread: 0, messages: [msg], extra: contact }, ...cs],
    });
  };

  const cta = (g) => {
    setView(null);
    if (g.ctaTo && navigate) navigate({ tab: 'home', ...g.ctaTo });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CommunityHub
        explore={explore}
        top={
          <View>
        <View style={[styles.head, { paddingHorizontal: 0, paddingTop: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Stories</Text>
            <Text style={styles.sub}>Stories, posts e depoimentos de pessoas e empresas verificadas</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => setComposing(true)} accessibilityLabel="Criar story">
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: '800', marginLeft: 4 }}>Criar</Text>
          </TouchableOpacity>
        </View>

        {/* Faixa de bolinhas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={styles.strip}>
          <TouchableOpacity style={styles.item} onPress={openMine} activeOpacity={0.85} accessibilityLabel="Seu story">
            <View style={[styles.ring, { borderColor: mine.items.length ? colors.gold : colors.border }]}>
              <View style={styles.meAvatar}>
                <Text style={{ color: colors.onPrimary, fontWeight: '900', fontSize: 22 }}>{userName[0].toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.plus} onPress={() => setComposing(true)} accessibilityLabel="Criar story">
              <Ionicons name="add" size={14} color={colors.onPrimary} />
            </TouchableOpacity>
            <Text numberOfLines={1} style={styles.name}>Seu story</Text>
          </TouchableOpacity>
          {[...fresh, ...old].map((g) => {
            const isSeen = !!seen[g.id];
            return (
              <TouchableOpacity key={g.id} style={styles.item} onPress={() => open(g)} activeOpacity={0.85} accessibilityLabel={`Story de ${g.name}`}>
                <View style={[styles.ring, { borderColor: isSeen ? colors.border : g.sponsored ? colors.sponsored : colors.gold, borderWidth: isSeen ? 1.5 : 3 }]}>
                  <Photo uri={g.avatar} style={styles.avatar} fallback="🙂" />
                </View>
                <Text numberOfLines={1} style={[styles.name, isSeen && { color: colors.muted }]}>
                  {g.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

          </View>
        }
      />

      <StoryViewer
        visible={!!view}
        groups={view ? view.groups : []}
        start={view ? view.start : 0}
        isMine={!!(view && view.mine)}
        onClose={() => setView(null)}
        onSeen={(id) => id !== 'mine' && dispatch({ type: 'STORY_SEEN', id })}
        onReply={reply}
        onCta={cta}
      />
      <StoryComposer
        visible={composing}
        onClose={() => setComposing(false)}
        onPublish={(item) => {
          dispatch({ type: 'PUBLISH_STORY', item });
          setComposing(false);
        }}
      />
    </View>
  );
}

function Grid({ title, groups, onOpen, seen }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.grid}>
        {groups.map((g) => {
          const first = g.items[0];
          return (
            <TouchableOpacity key={g.id} style={[styles.card, seen && { opacity: 0.75 }]} onPress={() => onOpen(g)} activeOpacity={0.9}>
              <Photo uri={first.image} style={StyleSheet.absoluteFill} fallback="🌅" />
              <View style={styles.cardShade} />
              <View style={[styles.cardRing, { borderColor: seen ? '#fff' : g.sponsored ? colors.sponsored : colors.gold }]}>
                <Photo uri={g.avatar} style={styles.cardAvatar} fallback="🙂" />
              </View>
              {g.sponsored ? (
                <View style={styles.sponsored}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>PATROCINADO</Text>
                </View>
              ) : null}
              <View style={styles.cardFoot}>
                <Text numberOfLines={1} style={styles.cardName}>
                  {g.name}
                </Text>
                <Text numberOfLines={2} style={styles.cardCaption}>
                  {first.caption}
                </Text>
                <Text style={styles.cardMeta}>
                  {g.items.length > 1 ? `${g.items.length} stories · ` : ''}
                  {g.sponsored ? 'empresa' : first.time}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const AV = 62;
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.primary, marginLeft: 10 },
  strip: { paddingHorizontal: 12, paddingVertical: 14 },
  item: { width: 76, alignItems: 'center', marginRight: 4 },
  ring: { width: AV + 8, height: AV + 8, borderRadius: (AV + 8) / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: AV, height: AV, borderRadius: AV / 2 },
  meAvatar: { width: AV, height: AV, borderRadius: AV / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  plus: {
    position: 'absolute',
    top: AV - 10,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 5, maxWidth: 72 },
  section: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.5%', height: 250, borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: colors.cardAlt },
  cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  cardRing: { position: 'absolute', top: 10, left: 10, width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  cardAvatar: { width: 33, height: 33, borderRadius: 17 },
  sponsored: { position: 'absolute', top: 12, right: 10, backgroundColor: colors.sponsored, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.38)' },
  cardName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cardCaption: { color: '#fff', fontSize: 12, marginTop: 2 },
  cardMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 4 },
});
