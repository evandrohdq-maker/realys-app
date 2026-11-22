import React, { useEffect, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { PHOTO_RULE } from '../moderation';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, Image, Alert, Platform, useWindowDimensions, Switch } from 'react-native';
import { Text, TextInput } from '../responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Photo, PostPhoto } from '../components/ui';
import { checkText } from '../lm/factCheck';
import { stories, contacts } from '../homeData';
import { useServerFeed, storyGroups } from '../serverSocial';
import { openServerProfile } from '../components/ServerProfile';
import { api } from '../api';
import { conectado } from '../serverShop';
import { StoryViewer, StoryComposer } from './cliente/home/Stories';
import { CommunityHub, CommunityExtras, TopTabs, COMMUNITY_TOP, COMMUNITY_TOP_KEYS } from './cliente/home/HomeScreen';
import { useBack } from '../back';
import { TestimonialComposer } from '../components/SocialProfile';
import { useOpenPerson, resolvePerson } from '../openPerson';
import { realWidth, DESK_MIN, RAIL_MIN } from '../webFrame';
import { DestaqueOpcoes, DESTAQUE_VAZIO, aplicarDestaque } from '../components/Destacar';

// Página Community (botão "Community" na barra de baixo): stories e comunidade.
// Em cima, a faixa de bolinhas como no Instagram; embaixo, a Comunidade: feed único de posts e
// depoimentos (curtir, comentar, compartilhar), mensagens, contatos e live.
export default function StoriesScreen({ navigate, explore, onTop }) {
  const { state, dispatch } = useStore();
  const openPerson = useOpenPerson();
  const [view, setView] = useState(null); // { groups, start, mine }
  const [composing, setComposing] = useState(false);
  const [adding, setAdding] = useState(false); // menu do +
  const [posting, setPosting] = useState(false);
  const [writingDep, setWritingDep] = useState(false);
  const [reeling, setReeling] = useState(false); // publicar um Reel (vídeo curto)
  // Barra do topo: Notícias, Eventos, Stream (rádios e TV online) e Lives.
  const [top, setTop] = useState('comunidade');
  const [kick, setKick] = useState(0);
  useBack(top !== 'comunidade', () => setTop('comunidade'));
  useEffect(() => {
    if (!explore || explore.tab !== 'stories') return;
    setTop(explore.top && COMMUNITY_TOP_KEYS.includes(explore.top) ? explore.top : 'comunidade');
  }, [explore]);
  // Veio do "Seu story" do menu lateral (computador): ver/criar o story ou abrir o "+".
  useEffect(() => {
    if (!explore || explore.tab !== 'stories' || !explore.story) return;
    if (explore.story === 'add') setAdding(true);
    if (explore.story === 'mine') openMine();
  }, [explore]);
  // Avisa o app qual sub-aba está aberta (para o arrastar para os lados saber onde está).
  useEffect(() => {
    if (onTop) onTop(top);
  }, [top]);
  useEffect(() => () => onTop && onTop('comunidade'), []);
  const userName = state.user ? state.user.name : 'Você';
  const seen = state.storySeen;
  const mine = { id: 'mine', mine: true, name: userName, items: state.myStories };
  // Foto do botão de postagem: a do perfil; sem ela, a imagem do último story publicado.
  const lastStory = state.myStories.length ? state.myStories[state.myStories.length - 1] : null;
  const myPhoto = (state.myProfile && state.myProfile.photo) || (lastStory && lastStory.image) || null;

  // Amigo com post novo na Community (que ainda não passou na sua tela): borda roxa por fora da dourada.
  const postSeen = state.postSeen || {};
  const newPostBy = {};
  (state.communityPosts || []).forEach((p) => {
    if (!p || p.mine || p.author === userName || postSeen[p.id]) return;
    newPostBy[p.author] = true;
  });
  // Faixa de stories: cabem 3 por vez na tela (o seu primeiro, em destaque); arrastando para o lado aparecem os outros.
  const { width: telaW } = useWindowDimensions();
  // No computador cabem 5 por vez, e os atalhos (News, Eventos, Stream, Lives) vão para a coluna da direita.
  const wideWeb = Platform.OS === 'web' && realWidth() >= DESK_MIN;
  const railWeb = Platform.OS === 'web' && realWidth() >= RAIL_MIN;
  const railFree = wideWeb; // computador: o seu story está no menu lateral
  const itemW = Math.floor((telaW - 24) / (wideWeb ? 5 : 3));
  const av = Math.min(Math.round(itemW * 0.66), 96);
  const avMeu = Math.min(Math.round(itemW * 0.74), 106);
  // Conta real: stories dos amigos (servidor) antes dos de exemplo.
  const srv = useServerFeed(conectado(state));
  const todos = [...storyGroups(srv.stories, state.user && state.user.serverId), ...stories];
  const fresh = todos.filter((g) => !seen[g.id]);
  const old = todos.filter((g) => seen[g.id]);
  const open = (g) => setView({ groups: todos, start: todos.indexOf(g), mine: false });
  const openMine = () => (mine.items.length ? setView({ groups: [mine], start: 0, mine: true }) : setComposing(true));

  // Resposta ao story vira mensagem em Comunidade › Mensagens.
  const reply = (g, text) => {
    // Story de conta real: a resposta vai como mensagem de verdade para a pessoa.
    if (g.server) {
      api('POST', '/messages', { toId: g.authorId, text: `Respondeu ao seu story: ${text}` }).catch((e) => Alert.alert('Resposta não enviada', e.message));
      return;
    }
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

  const menuBar = railWeb ? null : <TopTabs items={COMMUNITY_TOP.filter((t) => t.key !== 'comunidade' && !t.hidden)} value={top} onChange={(k) => (k === top ? setKick((n) => n + 1) : setTop(k))} />;

  const cta = (g) => {
    setView(null);
    if (g.ctaTo && navigate) navigate({ tab: 'home', ...g.ctaTo });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* No feed, as bolinhas dos stories vêm primeiro e o menu (News, Eventos, Stream, Lives) logo abaixo.
          Nas outras sub-abas, o menu fica no topo. */}
      {top === 'comunidade' ? null : menuBar}
      {/* Tocar de novo no mesmo botão volta ao topo da página (a tela é remontada no início). */}
      <CommunityExtras key={kick} top={top} explore={explore} navigate={navigate} />
      {top === 'comunidade' ? (
      <CommunityHub
        explore={explore}
        top={
          <View>
        {/* Faixa de bolinhas (no alto da Community) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={styles.strip}
          snapToInterval={itemW}
          decelerationRate="fast"
        >
          {/* Primeiro da faixa, em destaque: o seu story (anel dourado mais grosso e um pouco maior).
              Tocar na foto vê o seu story (ou cria, se ainda não tem); o "+" abre publicação, Reel, story ou depoimento. */}
          {/* No computador o "Seu story" fica só no topo do menu lateral. */}
          {railFree ? null : (
          <View style={[styles.item, { width: itemW }]}>
            <TouchableOpacity onPress={openMine} activeOpacity={0.85} accessibilityLabel={mine.items.length ? 'Ver o seu story' : 'Criar o seu story'}>
              <View style={[styles.outer, { width: avMeu + 18, height: avMeu + 18, borderRadius: (avMeu + 18) / 2, borderColor: colors.gold, borderWidth: 2 }]}>
                <View style={[styles.ring, { width: avMeu + 8, height: avMeu + 8, borderRadius: (avMeu + 8) / 2, borderColor: colors.gold, borderWidth: 3 }]}>
                  {myPhoto ? (
                    <Photo uri={myPhoto} style={{ width: avMeu, height: avMeu, borderRadius: avMeu / 2 }} fallback="🙂" />
                  ) : (
                    <View style={{ width: avMeu, height: avMeu, borderRadius: avMeu / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 22 }}>{userName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAdding(true)} style={[styles.mePlus, { width: 28, height: 28, borderRadius: 14, right: Math.max(4, (itemW - avMeu - 18) / 2 - 2), bottom: 22 }]} accessibilityLabel="Adicionar conteúdo">
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
            <Text numberOfLines={1} style={[styles.name, { color: colors.primary, fontWeight: '800', maxWidth: itemW - 8 }]}>Stories</Text>
          </View>
          )}
          {[...fresh, ...old].map((g) => {
            const isSeen = !!seen[g.id];
            return (
              <TouchableOpacity key={g.id} style={[styles.item, { width: itemW }]} onPress={() => open(g)} activeOpacity={0.85} accessibilityLabel={`Story de ${g.name}`}>
                <View style={[styles.outer, { width: av + 16, height: av + 16, borderRadius: (av + 16) / 2 }, !g.sponsored && newPostBy[g.name] && styles.outerNew]}>
                  <View style={[styles.ring, { width: av + 8, height: av + 8, borderRadius: (av + 8) / 2, borderColor: isSeen ? colors.border : g.sponsored ? colors.sponsored : colors.gold, borderWidth: isSeen ? 1.5 : 2.5 }]}>
                    <Photo uri={g.avatar} style={{ width: av, height: av, borderRadius: av / 2 }} fallback="🙂" />
                  </View>
                </View>
                <Text numberOfLines={1} style={[styles.name, { maxWidth: itemW - 8 }, isSeen && { color: colors.muted }]}>
                  {g.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {menuBar ? <View style={{ marginHorizontal: -16 }}>{menuBar}</View> : null}
          </View>
        }
      />
      ) : null}

      <StoryViewer
        visible={!!view}
        groups={view ? view.groups : []}
        start={view ? view.start : 0}
        isMine={!!(view && view.mine)}
        onClose={() => setView(null)}
        onSeen={(id) => id !== 'mine' && dispatch({ type: 'STORY_SEEN', id })}
        onReply={reply}
        onCta={cta}
        // Tocar no nome de quem postou: pessoa abre por cima do story (prévia ou perfil, se for amigo);
        // empresa fecha o story e abre a página dela.
        onProfile={(g) => {
          if (g.server) return openServerProfile(g.authorId);
          const who = { id: g.contactId, name: g.name };
          // Empresa sem página própria no app (ex.: evento): leva para a oferta do story.
          if (g.business && g.ctaTo && !resolvePerson(state, who).kind) return cta(g);
          openPerson(who, { onLeave: () => setView(null) });
        }}
      />
      <AddSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onPick={(k) => {
          setAdding(false);
          if (k === 'post') setPosting(true);
          if (k === 'reel') setReeling(true);
          if (k === 'story') setComposing(true);
          if (k === 'dep') setWritingDep(true);
        }}
      />
      <PostComposer
        visible={posting}
        onClose={() => setPosting(false)}
        onPublish={(post, destaque) => {
          dispatch({ type: 'POST_PUBLISH', post: { ...post, author: userName } });
          setPosting(false);
          // A IA verificadora confere antes de publicar (ver src/lm/factCheck.js).
          const check = checkText(post.text);
          // Destaque escolhido na hora: atalho para este post no mural, na vitrine e nas pastas.
          if (check.verdict !== 'falso') aplicarDestaque(dispatch, { kind: 'post', id: post.id, image: post.image, text: post.text }, destaque);
          if (check.verdict === 'falso')
            Alert.alert('Publicação não feita', `A IA do Realyz verificou este conteúdo como informação falsa (${check.reasons.join(', ')}). Ele não foi publicado.`);
          else if (check.verdict === 'suspeito')
            Alert.alert('Publicado em verificação', 'A IA achou alguns sinais de informação falsa. O post aparece com o aviso "em verificação" até a moderação conferir.');
        }}
      />
      <TestimonialComposer visible={writingDep} onClose={() => setWritingDep(false)} />
      <ReelComposer
        visible={reeling}
        onClose={() => setReeling(false)}
        onPublish={(reel, destaque) => {
          setReeling(false);
          // A IA verificadora confere a legenda antes de publicar, como nas publicações.
          const check = checkText(reel.title);
          if (check.verdict === 'falso')
            return Alert.alert('Reel não publicado', `A IA do Realyz verificou a legenda como informação falsa (${check.reasons.join(', ')}). O Reel não foi publicado.`);
          dispatch({ type: 'PUBLISH_REEL', reel: { ...reel, user: userName } });
          aplicarDestaque(dispatch, { kind: 'reel', id: reel.id, video: reel.video, text: reel.title }, destaque);
          Alert.alert('Reel publicado ✅', 'Ele já aparece nos Reels. Para ver, puxe a página inicial para a direita.', [
            { text: 'Ok' },
            { text: 'Ver Reels', onPress: () => navigate && navigate({ tab: 'reels' }) },
          ]);
        }}
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

// Menu do +: o que você quer publicar?
function AddSheet({ visible, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  const opts = [
    ['post', 'Publicação', 'Conta pra galera o que tá rolando', 'create-outline'],
    ['reel', 'Reel', 'Vídeo curto em tela cheia: até 60 segundos pra brilhar', 'play-circle-outline'],
    ['story', 'Story', 'Some em 24 h, ou fica nos seus destaques', 'aperture-outline'],
    ['dep', 'Depoimento', 'Fala bem de um amigo: vai pro perfil dele', 'chatbox-ellipses-outline'],
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Criar</Text>
          {opts.map(([k, title, hint, icon]) => (
            <TouchableOpacity key={k} style={styles.opt} onPress={() => onPick(k)} activeOpacity={0.85}>
              <View style={styles.optIcon}>
                <Ionicons name={icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </KeyboardLift></Modal>
  );
}

// Nova publicação no feed: texto e, se quiser, uma foto do celular.
function PostComposer({ visible, onClose, onPublish }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [destaque, setDestaque] = useState(DESTAQUE_VAZIO);
  const [ia, setIa] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setIa(false);
    setText('');
    setImage(null);
    setDestaque(DESTAQUE_VAZIO);
  }, [visible]);
  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão necessária', 'Autorize o Realyz a ver suas fotos para anexar na publicação.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) setImage(res.assets[0].uri);
    } catch (e) {
      Alert.alert('Não deu para abrir a galeria', 'Tente de novo em instantes.');
    }
  };
  const ok = text.trim() || image;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.postHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Nova publicação</Text>
          <TouchableOpacity
            disabled={!ok}
            onPress={() => onPublish({ id: 'n' + Date.now(), text: text.trim(), image, likes: 0, comments: 0, time: 'agora', ...(ia ? { ia: true } : {}) }, destaque)}
            style={[styles.publishBtn, !ok && { opacity: 0.4 }]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '800' }}>Publicar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Compartilhe algo com a comunidade…"
            placeholderTextColor={colors.muted}
            multiline
            autoFocus
            style={styles.postInput}
          />
          {image ? (
            <View style={{ marginTop: 12 }}>
              <PostPhoto uri={image} style={{ borderRadius: 14 }} />
              <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImg} accessibilityLabel="Tirar foto">
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={styles.photoBtn} onPress={pick}>
            <Ionicons name="image-outline" size={18} color={colors.primary} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>{image ? 'Trocar foto' : 'Adicionar foto'}</Text>
          </TouchableOpacity>
          {/* Feito com IA: vídeos, animes e artes de inteligência artificial (aparece na aba IA do Trends). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <Ionicons name="sparkles" size={18} color="#7B6CF6" />
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1, marginLeft: 8 }}>Feito com IA (vídeo, anime ou arte)</Text>
            <Switch value={ia} onValueChange={setIa} />
          </View>
          <DestaqueOpcoes value={destaque} onChange={setDestaque} />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10 }}>Só pessoas verificadas por biometria veem e comentam.</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>{PHOTO_RULE}</Text>
        </ScrollView>
      </KeyboardLift>
    </Modal>
  );
}

// Novo Reel: um vídeo curto da galeria (até 60 s) e uma legenda.
export function ReelComposer({ visible, onClose, onPublish }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [video, setVideo] = useState(null); // { uri, secs }
  const [destaque, setDestaque] = useState(DESTAQUE_VAZIO);
  const [ia, setIa] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setIa(false);
    setTitle('');
    setVideo(null);
    setDestaque(DESTAQUE_VAZIO);
  }, [visible]);
  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão necessária', 'Autorize o Realyz a ver seus vídeos para publicar um Reel.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 60, quality: 0.8 });
      const a = !res.canceled && res.assets && res.assets[0];
      if (!a) return;
      const secs = a.duration ? Math.round(a.duration / 1000) : 0;
      if (secs > 61) return Alert.alert('Vídeo longo demais', 'O Reel tem até 60 segundos. Escolha um vídeo mais curto.');
      setVideo({ uri: a.uri, secs });
    } catch (e) {
      Alert.alert('Não deu para abrir a galeria', 'Tente de novo em instantes.');
    }
  };
  const ok = !!video;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.postHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cancelar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Novo Reel</Text>
          <TouchableOpacity
            disabled={!ok}
            onPress={() => onPublish({ id: 'r' + Date.now(), title: title.trim() || 'Meu Reel', video: video.uri, likes: 0, views: 0, kind: 'user', ...(ia ? { ia: true } : {}) }, destaque)}
            style={[styles.publishBtn, !ok && { opacity: 0.4 }]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '800' }}>Publicar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.reelPick} onPress={pick} activeOpacity={0.85} accessibilityLabel={video ? 'Trocar o vídeo' : 'Escolher o vídeo'}>
            <Ionicons name={video ? 'checkmark-circle' : 'videocam-outline'} size={34} color={video ? colors.success : colors.primary} />
            <Text style={styles.reelPickTitle}>{video ? 'Vídeo escolhido' : 'Escolher vídeo da galeria'}</Text>
            <Text style={styles.reelPickSub}>{video ? `${video.secs ? video.secs + ' s · ' : ''}toque para trocar` : 'Vídeo em pé, de até 60 segundos'}</Text>
          </TouchableOpacity>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Escreva uma legenda…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={120}
            style={[styles.postInput, { marginTop: 14, minHeight: 70 }]}
          />
          {/* Feito com IA: vídeos, animes e artes de inteligência artificial (aparece na aba IA do Trends). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <Ionicons name="sparkles" size={18} color="#7B6CF6" />
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1, marginLeft: 8 }}>Feito com IA (vídeo, anime ou arte)</Text>
            <Switch value={ia} onValueChange={setIa} />
          </View>
          <DestaqueOpcoes value={destaque} onChange={setDestaque} />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10 }}>Só pessoas verificadas por biometria veem e comentam.</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>{PHOTO_RULE}</Text>
        </ScrollView>
      </KeyboardLift>
    </Modal>
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
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>PATROCINADO</Text>
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
  reelPick: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1.5, borderColor: colors.borderStrong, borderStyle: 'dashed', paddingVertical: 28, paddingHorizontal: 16 },
  reelPickTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 8, textAlign: 'center' },
  reelPickSub: { color: colors.muted, fontSize: 12, marginTop: 3, textAlign: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
  plusBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 10, elevation: 3, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 18, marginBottom: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginTop: 8, ...soft },
  optIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  postHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  publishBtn: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  postInput: { minHeight: 140, textAlignVertical: 'top', color: colors.text, fontSize: 17, lineHeight: 24 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 14, backgroundColor: colors.primaryLight, marginTop: 14 },
  removeImg: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  postBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 28, paddingVertical: 6, paddingLeft: 6, paddingRight: 16, ...soft },
  meRing: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  meImg: { width: 42, height: 42, borderRadius: 21 },
  mePlus: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text, borderWidth: 2, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  postBarText: { flex: 1, color: colors.muted, fontSize: 14, marginLeft: 10 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.primary, marginLeft: 10 },
  strip: { paddingHorizontal: 12, paddingVertical: 14 },
  item: { width: 82, alignItems: 'center' },
  ring: { width: AV + 8, height: AV + 8, borderRadius: (AV + 8) / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  // Borda de fora: transparente; fica roxa quando o amigo tem post novo (por fora da dourada do story).
  outer: { width: AV + 16, height: AV + 16, borderRadius: (AV + 16) / 2, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  outerNew: { borderColor: colors.violet },
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
  section: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.5%', height: 250, borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: colors.cardAlt },
  cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  cardRing: { position: 'absolute', top: 10, left: 10, width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  cardAvatar: { width: 33, height: 33, borderRadius: 17 },
  sponsored: { position: 'absolute', top: 12, right: 10, backgroundColor: colors.sponsored, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.38)' },
  cardName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardCaption: { color: '#fff', fontSize: 12, marginTop: 2 },
  cardMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 4 },
});
