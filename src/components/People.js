import { privacyOf } from '../studioData';
import { KeyboardLift } from '../keyboard';
import { LiveNowBadge } from './LiveBits';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { CONTENT_MAX } from '../webFrame';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { pagesOfOwner } from '../userPages';
import { colors, soft } from '../theme';
import { Photo, Empty } from './ui';
import { members, memberById, postsOf, searchMembers } from '../people';
import { ChatModal } from '../screens/cliente/home/Social';
import { listenOnce, GlobalResults } from './Search';
import { ProfileSocial, TestimonialComposer, TestimonialCard } from './SocialProfile';
import { memberTarget } from './GiftSheet';
import { SocialBadge } from './SocialClass';
import { CLASSES } from '../socialClasses';
import { MuralTab, MuralPeek, useMuralItems } from './Mural';
import { stories as STORY_GROUPS } from '../homeData';
import { galleryOf } from '../testimonialsData';
import { StoryViewer } from '../screens/cliente/home/Stories';
import { HireButton } from './ArtistBooking';
import { api, serverOn, API_URL, mediaUrl } from '../api';
import { conectado } from '../serverShop';
import { openServerProfile } from './ServerProfile';
import { refreshFriends, useServerFriends } from '../serverFriends';
import { artistByRef } from '../artistShows';

// Foto do perfil: tocar abre os stories da pessoa (anel dourado = tem story novo);
// segurar mostra a foto de perfil grande. Sem story, tocar também mostra a foto.
const HOLD_MS = 1000;
function StoryAvatar({ m, ringStyle, imgStyle }) {
  const { state, dispatch } = useStore();
  const group = STORY_GROUPS.find((g) => g.contactId === m.id || g.name === m.name) || null;
  const [view, setView] = useState(false);
  const [zoom, setZoom] = useState(false);
  const fresh = !!(group && !(state.storySeen || {})[group.id]);
  const big = m.photo ? String(m.photo).replace(/\/200\/200$/, '/700/700') : null;
  // Fotos de perfil: a atual primeiro e as anteriores (na demonstração, vêm da galeria da pessoa).
  // Arrastar para o lado (ou as setas no computador) passa para a próxima.
  const fotos = [big, ...galleryOf(m.id).photos.slice(0, 3).map((f) => f.uri)].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const pager = React.useRef(null);
  const W = 290;
  const goTo = (i) => {
    const n = Math.max(0, Math.min(fotos.length - 1, i));
    setIdx(n);
    pager.current && pager.current.scrollTo({ x: n * W, animated: true });
  };
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => (group ? setView(true) : (setIdx(0), setZoom(true)))}
        onLongPress={() => (setIdx(0), setZoom(true))}
        delayLongPress={HOLD_MS}
        accessibilityLabel={group ? `Ver os stories de ${m.name}. Segure para ver a foto de perfil` : `Ver a foto de perfil de ${m.name}`}
      >
        <View style={[ringStyle, group && { borderColor: fresh ? colors.gold : colors.border, borderWidth: fresh ? 3 : 2 }]}>
          <Photo uri={m.photo} style={imgStyle} fallback="🙂" />
        </View>
      </TouchableOpacity>
      {group && view ? (
        <StoryViewer
          visible
          groups={[group]}
          start={0}
          onClose={() => setView(false)}
          onSeen={(id) => dispatch({ type: 'STORY_SEEN', id })}
          onReply={() => {}}
          onCta={() => setView(false)}
        />
      ) : null}
      {zoom ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setZoom(false)}>
          {/* Foto numa moldura no meio da tela (não em tela cheia), no app e no site. */}
          <TouchableOpacity style={styles.zoomBack} activeOpacity={1} onPress={() => setZoom(false)} accessibilityLabel="Fechar a foto">
            <TouchableOpacity activeOpacity={1} style={styles.zoomCard} onPress={() => {}}>
              <View style={{ width: W, maxWidth: '100%' }}>
                <ScrollView
                  ref={pager}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
                  onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
                  scrollEventThrottle={64}
                >
                  {fotos.map((u, i) => (
                    <Photo key={i} uri={u} style={[styles.zoomImg, { width: W }]} fallback="🙂" />
                  ))}
                </ScrollView>
                {fotos.length > 1 ? (
                  <>
                    {idx > 0 ? (
                      <TouchableOpacity onPress={() => goTo(idx - 1)} style={[styles.zoomArrow, { left: 6 }]} accessibilityLabel="Foto anterior">
                        <Ionicons name="chevron-back" size={18} color={colors.text} />
                      </TouchableOpacity>
                    ) : null}
                    {idx < fotos.length - 1 ? (
                      <TouchableOpacity onPress={() => goTo(idx + 1)} style={[styles.zoomArrow, { right: 6 }]} accessibilityLabel="Próxima foto">
                        <Ionicons name="chevron-forward" size={18} color={colors.text} />
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : null}
              </View>
              {fotos.length > 1 ? (
                <View style={styles.zoomDots}>
                  {fotos.map((_, i) => <View key={i} style={[styles.zoomDot, i === idx && styles.zoomDotOn]} />)}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Text style={styles.zoomName} numberOfLines={1}>{m.name}</Text>
                <Ionicons name="shield-checkmark" size={15} color={colors.primary} style={{ marginLeft: 6 }} />
              </View>
              <TouchableOpacity onPress={() => setZoom(false)} style={styles.zoomClose} accessibilityLabel="Fechar">
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </>
  );
}

// Botão de amizade: Adicionar → Solicitação enviada → Amigos (ou Aceitar / Recusar quando pediram para você).
export function FriendButton({ member, compact }) {
  const { state, dispatch } = useStore();
  const st = state.friends[member.id];
  const set = (status) => dispatch({ type: 'FRIEND', id: member.id, status });
  const first = member.name.split(' ')[0];

  if (st === 'recebido') {
    return (
      <View style={{ flexDirection: 'row' }}>
        <Btn compact={compact} icon="checkmark" label="Aceitar" solid onPress={() => set('amigo')} />
        <Btn compact={compact} icon="close" label={compact ? '' : 'Recusar'} onPress={() => set(null)} style={{ marginLeft: 6 }} a11y={`Recusar pedido de ${first}`} />
      </View>
    );
  }
  if (st === 'enviado') {
    return (
      <Btn
        compact={compact}
        icon="time-outline"
        label={compact ? 'Enviada' : 'Solicitação enviada'}
        onPress={() =>
          Alert.alert('Cancelar solicitação?', `Seu pedido de amizade para ${first} será retirado.`, [
            { text: 'Manter', style: 'cancel' },
            { text: 'Cancelar pedido', style: 'destructive', onPress: () => set(null) },
          ])
        }
      />
    );
  }
  if (st === 'amigo') {
    return (
      <Btn
        compact={compact}
        icon="people"
        label="Amigos"
        onPress={() =>
          Alert.alert(`Você e ${first} são amigos`, 'Quer desfazer a amizade?', [
            { text: 'Voltar', style: 'cancel' },
            { text: 'Desfazer amizade', style: 'destructive', onPress: () => set(null) },
          ])
        }
      />
    );
  }
  return <Btn compact={compact} icon="person-add" label={compact ? 'Adicionar' : 'Adicionar amigo'} solid onPress={() => set('enviado')} />;
}

function Btn({ icon, label, onPress, solid, compact, style, a11y }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={a11y || label}
      style={[styles.btn, compact && styles.btnSm, solid ? styles.btnSolid : styles.btnLine, style]}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={compact ? 14 : 16} color={solid ? colors.onPrimary : colors.primary} />
      {label ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.btnText, compact && { fontSize: 12 }, { color: solid ? colors.onPrimary : colors.primary }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

// Perfil de outro membro. Abre por cima de qualquer tela (dispatch OPEN_PROFILE).
export function UserProfileModal() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [chat, setChat] = useState(null);
  const [full, setFull] = useState(false); // quem não é amigo vê a prévia; "Ver perfil completo" abre o resto (se for público)
  const [writing, setWriting] = useState(false); // deixar depoimento
  const [list, setList] = useState(null); // número tocado: amigos | comum | posts | depoimentos
  useEffect(() => {
    setChat(null);
    setFull(false);
    setWriting(false);
    setList(null);
  }, [state.viewProfile]);
  const m = state.viewProfile ? memberById(state.viewProfile) : null;
  if (!m) return null;
  const st = state.friends[m.id];
  const posts = postsOf(m);
  const close = () => dispatch({ type: 'CLOSE_PROFILE' });
  const friendsCount = m.friends + (st === 'amigo' ? 1 : 0);

  const contact = { id: m.id, name: m.name, status: st === 'amigo' ? 'amigo no Realyz' : 'pessoa verificada', photo: m.photo };
  const conv = state.conversations.find((c) => c.contactId === m.id);
  const openChat = () => {
    if (!conv) dispatch({ type: 'UPDATE_CONVS', fn: (cs) => [{ id: 'm' + Date.now(), contactId: m.id, unread: 0, messages: [], extra: contact }, ...cs] });
    setChat(contact);
  };

  // Não é amigo: abre a prévia por cima da tela (foto, quem é, posts e depoimentos), com o botão de adicionar.
  if (st !== 'amigo' && !full) {
    return (
      <>
        <ProfilePeek m={m} onClose={close} onMessage={openChat} onFull={privacyOf(m.id).exposed && privacyOf(m.id).social === 'todos' ? () => setFull(true) : null} />
        <ChatModal
          contact={chat}
          visible={!!chat}
          messages={(state.conversations.find((c) => c.contactId === m.id) || {}).messages || []}
          onClose={() => setChat(null)}
          onSend={(msg) => dispatch({ type: 'UPDATE_CONVS', fn: (cs) => cs.map((c) => (c.contactId === m.id ? { ...c, messages: [...c.messages, msg] } : c)) })}
          onVideo={() => Alert.alert('Chamada de vídeo', `Ligando para ${m.name} pela Realyz.`)}
        />
      </>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={close}><KeyboardLift style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        {/* Capa no formato 3:1 (acompanha a largura sem esticar nem distorcer) e em resolução maior. */}
        <Photo uri={`https://picsum.photos/seed/realys-cover-${m.id}/1500/500`} style={{ width: '100%', aspectRatio: 3, maxHeight: 260 }} />
        <TouchableOpacity onPress={close} style={[styles.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16 }}>
          <StoryAvatar m={m} ringStyle={styles.avatarRing} imgStyle={styles.avatar} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.name}>{m.name}</Text>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.handle}>*{m.handle} · {m.city}</Text>
          <SocialBadge social={m.social} style={{ marginTop: 6 }} />
          {privacyOf(m.id).exposed ? <Text style={styles.bio}>{m.bio}</Text> : null}

          <View style={styles.stats}>
            <Stat n={friendsCount} label="amigos" onPress={() => setList('amigos')} />
            <Stat n={m.mutual} label="em comum" onPress={() => setList('comum')} />
            <Stat n={posts.length} label="posts" onPress={() => setList('posts')} />
            <Stat n={state.testimonials.filter((t) => t.to === m.id && t.status === 'aprovado').length} label="depoimentos" onPress={() => setList('depoimentos')} />
          </View>
          <StatListModal m={list ? m : null} kind={list} onClose={() => setList(null)} />

          <LiveNowBadge hostType="usuario" hostId={m.id} />
          {st === 'recebido' ? <Text style={styles.ask}>{m.name.split(' ')[0]} quer ser seu amigo no Realyz.</Text> : null}
          {/* Pedido recebido: Aceitar/Recusar numa linha só deles, para não ficar por cima da Mensagem. */}
          {st === 'recebido' ? (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <FriendButton member={m} />
            </View>
          ) : null}
          {/* Botões pequenos, lado a lado (não esticam na largura da tela). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: st === 'recebido' ? 8 : 12 }}>
            {st === 'recebido' ? null : <FriendButton member={m} />}
            <TouchableOpacity style={[styles.msgBtn, st === 'recebido' && { marginLeft: 0 }]} onPress={openChat} accessibilityLabel={`Mensagem para ${m.name}`}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>Mensagem</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.msgBtn, { paddingHorizontal: 12 }]} onPress={() => dispatch({ type: 'OPEN_GIFT', to: memberTarget(m) })} accessibilityLabel={`Presentear ${m.name}`}>
              <Ionicons name="gift-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <HireButton artist={artistByRef('member', m.id)} before={close} />
          {/* Deixar depoimento: só entre amigos (o dono do perfil aprova antes de aparecer). */}
          {st === 'amigo' ? (
            <TouchableOpacity style={styles.depBtn} onPress={() => setWriting(true)} activeOpacity={0.85} accessibilityLabel={`Deixar depoimento para ${m.name}`}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>Deixar depoimento para {m.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Páginas assinadas por esta pessoa (as anônimas não aparecem aqui: o dono fica em sigilo). */}
          {pagesOfOwner(state, m.id).length ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 6 }}>Páginas de {m.name.split(' ')[0]}</Text>
              {pagesOfOwner(state, m.id).map((pg) => (
                <TouchableOpacity key={pg.id} style={styles.pageRow} activeOpacity={0.85} onPress={() => dispatch({ type: 'OPEN_USER_PAGE', id: pg.id })} accessibilityLabel={`Abrir a página ${pg.name}`}>
                  <Photo uri={pg.cover} style={styles.pageThumb} fallback="📄" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{pg.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>{pg.followers.toLocaleString('pt-BR')} seguidores · {pg.posts.length} posts</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <ProfileSocial
            key={m.id}
            ownerId={m.id}
            ownerName={m.name}
            postsCount={posts.length}
            postsSlot={
              posts.length ? (
                posts.map((p) => (
                  <View key={p.id} style={styles.post}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{p.time}</Text>
                    <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{p.text}</Text>
                    {p.image ? <Photo uri={p.image} style={styles.postImg} /> : null}
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <Ionicons name="heart-outline" size={15} color={colors.muted} />
                      <Text style={styles.meta}>{p.likes}</Text>
                      <Ionicons name="chatbubble-outline" size={14} color={colors.muted} style={{ marginLeft: 14 }} />
                      <Text style={styles.meta}>{p.comments}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Empty text={`${m.name.split(' ')[0]} ainda não publicou nada.`} />
              )
            }
          />
        </View>
      </ScrollView>

      <ChatModal
        contact={chat}
        visible={!!chat}
        messages={(state.conversations.find((c) => c.contactId === m.id) || {}).messages || []}
        onClose={() => setChat(null)}
        onSend={(msg) => dispatch({ type: 'UPDATE_CONVS', fn: (cs) => cs.map((c) => (c.contactId === m.id ? { ...c, messages: [...c.messages, msg] } : c)) })}
        onVideo={() => Alert.alert('Chamada de vídeo', `Ligando para ${m.name} pela Realyz.`)}
      />
      <TestimonialComposer visible={writing} onClose={() => setWriting(false)} toId={m.id} />
    </KeyboardLift></Modal>
  );
}

// Prévia do perfil de quem ainda não é amigo: abre de baixo para cima, por cima de qualquer tela
// (story, Reel, feed, Arena). Mostra quem é, amigos em comum, alguns posts, o mural e o botão de adicionar.
// O perfil completo fica para os amigos (ou para quem deixou o perfil aberto para todos).
export function ProfilePeek({ m, onClose, onMessage, onFull }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const st = state.friends[m.id];
  const pv = privacyOf(m.id);
  const showSocial = pv.exposed && pv.social === 'todos';
  const posts = showSocial ? postsOf(m).slice(0, 3) : [];
  const mural = useMuralItems(m.id).items;
  const firstName = m.name.split(' ')[0];
  const [list, setList] = useState(null); // número tocado: amigos | comum | mural
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <TouchableOpacity style={styles.peekDim} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar prévia" />
      <View style={[styles.peekSheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.peekGrab} />
        <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <StoryAvatar m={m} ringStyle={styles.peekRing} imgStyle={styles.peekAvatar} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.peekName} numberOfLines={1}>
                {m.name} <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
              </Text>
              <Text style={styles.handle} numberOfLines={1}>*{m.handle} · {m.city}</Text>
              <SocialBadge social={m.social} size="sm" style={{ marginTop: 4 }} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.peekClose} accessibilityLabel="Fechar prévia">
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.peekTag}>PRÉVIA DO PERFIL</Text>
          {showSocial ? <Text style={styles.bio}>{m.bio}</Text> : null}

          <View style={[styles.stats, { marginTop: 10 }]}>
            <Stat n={m.friends} label="amigos" onPress={() => setList('amigos')} />
            <Stat n={m.mutual} label="em comum" onPress={() => setList('comum')} />
            <Stat n={showSocial ? mural.length : 0} label="mural" onPress={() => setList('mural')} />
          </View>
          <StatListModal m={list ? m : null} kind={list} onClose={() => setList(null)} />

          <LiveNowBadge hostType="usuario" hostId={m.id} />
          {st === 'recebido' ? <Text style={styles.ask}>{firstName} quer ser seu amigo no Realyz.</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <FriendButton member={m} />
            {onMessage ? (
              <TouchableOpacity style={[styles.msgBtn, { paddingHorizontal: 12 }]} onPress={onMessage} accessibilityLabel={`Mensagem para ${m.name}`}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Artista com vitrine de shows: contratar, orçamento e contato pelo Realyz. */}
          <HireButton artist={artistByRef('member', m.id)} before={onClose} />

          {posts.length ? (
            <>
              <Text style={styles.section}>Publicações</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {posts.map((p) => (
                  <View key={p.id} style={styles.peekPost}>
                    {p.image ? <Photo uri={p.image} style={styles.peekPostImg} /> : null}
                    <Text numberOfLines={p.image ? 2 : 5} style={{ color: colors.text, fontSize: 12.5, lineHeight: 17, marginTop: p.image ? 6 : 0 }}>{p.text}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{p.time}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Mural da pessoa (no lugar dos depoimentos): só se ela deixou a vida social aberta para todos. */}
          {showSocial ? (
            <>
              <Text style={styles.section}>Mural</Text>
              <MuralPeek ownerId={m.id} ownerName={m.name} onMore={() => setList('mural')} />
            </>
          ) : null}

          {onFull ? (
            <TouchableOpacity style={styles.peekFull} onPress={onFull} activeOpacity={0.85} accessibilityLabel={`Ver o perfil completo de ${m.name}`}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '800' }}>Ver perfil completo</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.tip}>
              <Ionicons name="lock-closed-outline" size={12} color={colors.muted} /> O perfil completo de {firstName} fica aberto para os amigos. Adicione e espere {firstName} aceitar.
            </Text>
          )}
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

// Número do perfil (amigos, em comum, posts, depoimentos): tocar abre a lista do que tem dentro.
function Stat({ n, label, onPress }) {
  return (
    <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={onPress} disabled={!onPress} activeOpacity={0.7} accessibilityLabel={`Ver ${label}: ${n}`}>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{n.toLocaleString('pt-BR')}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------- O que tem dentro de cada número do perfil ----------
// Amigos e em comum: na demonstração, saem dos membros do Realyz (o servidor traz a lista real).
const hashOf = (t) => [...String(t)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function friendsOfMember(m, myFriends) {
  const others = members.filter((x) => x.id !== m.id);
  // Em comum: meus amigos primeiro, depois os outros, na mesma ordem sempre (sem "piscar").
  const sorted = [...others].sort((a, b) => (myFriends[b.id] === 'amigo' ? 1 : 0) - (myFriends[a.id] === 'amigo' ? 1 : 0) || hashOf(m.id + a.id) - hashOf(m.id + b.id));
  const mutual = sorted.slice(0, Math.min(m.mutual || 0, sorted.length));
  return { all: sorted, mutual };
}

// Lista simples de pessoas (ex.: seguidores de uma empresa): tocar abre o perfil.
export function PeopleListModal({ visible, title, people = [], total, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const n = total != null ? total : people.length;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <TouchableOpacity style={styles.peekDim} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[styles.peekSheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.peekGrab} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{n.toLocaleString('pt-BR')} no total</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.peekClose} accessibilityLabel="Fechar">
            <Ionicons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          {people.map((x) => (
            <TouchableOpacity key={x.id} style={styles.listRow} onPress={() => (onClose(), dispatch({ type: 'OPEN_PROFILE', id: x.id }))} activeOpacity={0.85} accessibilityLabel={`Abrir o perfil de ${x.name}`}>
              <Photo uri={x.photo} style={{ width: 44, height: 44, borderRadius: 22 }} fallback="🙂" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{x.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{state.friends[x.id] === 'amigo' ? 'Seu amigo' : `*${x.handle} · ${x.city}`}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          ))}
          {n > people.length ? <Text style={styles.tip}>e mais {(n - people.length).toLocaleString('pt-BR')} pessoa(s) · a lista completa vem com o servidor</Text> : null}
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

export function StatListModal({ m, kind, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const muralCount = useMuralItems(m ? m.id : 'none').items.length;
  if (!m || !kind) return null;
  const first = m.name.split(' ')[0];
  const { all, mutual } = friendsOfMember(m, state.friends);
  const pv = privacyOf(m.id);
  const isFriend = state.friends[m.id] === 'amigo';
  const canSeeFriends = isFriend || (pv.exposed && pv.social === 'todos');
  const deps = state.testimonials.filter((t) => t.to === m.id && t.status === 'aprovado');
  const posts = postsOf(m);
  const total = kind === 'amigos' ? m.friends + (isFriend ? 1 : 0) : kind === 'comum' ? mutual.length : kind === 'posts' ? posts.length : kind === 'mural' ? (canSeeFriends ? muralCount : 0) : deps.length;
  const title = kind === 'amigos' ? `Amigos de ${first}` : kind === 'comum' ? `Amigos em comum com ${first}` : kind === 'posts' ? `Posts de ${first}` : kind === 'mural' ? `Mural de ${first}` : `Depoimentos de ${first}`;
  const openPerson = (id) => {
    onClose();
    dispatch({ type: 'OPEN_PROFILE', id });
  };
  const people = kind === 'amigos' ? all : mutual;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <TouchableOpacity style={styles.peekDim} activeOpacity={1} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[styles.peekSheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.peekGrab} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{total.toLocaleString('pt-BR')} no total</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.peekClose} accessibilityLabel="Fechar">
            <Ionicons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
        {kind === 'mural' ? (
          canSeeFriends ? (
            <MuralTab ownerId={m.id} ownerName={m.name} mine={false} />
          ) : (
            <Empty text={`O mural de ${first} fica aberto só para os amigos. Adicione e espere ${first} aceitar.`} />
          )
        ) : (
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          {kind === 'amigos' || kind === 'comum' ? (
            kind === 'amigos' && !canSeeFriends ? (
              <Empty text={`A lista de amigos de ${first} fica aberta só para os amigos. Você ainda pode ver os amigos em comum.`} />
            ) : people.length ? (
              <>
                {people.map((x) => {
                  const mine = state.friends[x.id] === 'amigo';
                  return (
                    <TouchableOpacity key={x.id} style={styles.listRow} onPress={() => openPerson(x.id)} activeOpacity={0.85} accessibilityLabel={`Abrir o perfil de ${x.name}`}>
                      <Photo uri={x.photo} style={{ width: 44, height: 44, borderRadius: 22 }} fallback="🙂" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{x.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{mine ? 'Seu amigo' : `*${x.handle} · ${x.city}`}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  );
                })}
                {total > people.length ? <Text style={styles.tip}>e mais {(total - people.length).toLocaleString('pt-BR')} pessoa(s) · a lista completa vem com o servidor</Text> : null}
              </>
            ) : (
              <Empty text={kind === 'comum' ? `Vocês ainda não têm amigos em comum.` : `${first} ainda não tem amigos no Realyz.`} />
            )
          ) : null}
          {kind === 'depoimentos' ? (deps.length ? deps.map((t) => <TestimonialCard key={t.id} t={t} hideTarget />) : <Empty text={`${first} ainda não tem depoimentos expostos.`} />) : null}
          {kind === 'posts'
            ? posts.length
              ? posts.map((p) => (
                  <View key={p.id} style={styles.post}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{p.time}</Text>
                    <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{p.text}</Text>
                    {p.image ? <Photo uri={p.image} style={styles.postImg} /> : null}
                  </View>
                ))
              : <Empty text={`${first} ainda não publicou nada.`} />
            : null}
        </ScrollView>
        )}
      </View>
    </KeyboardLift></Modal>
  );
}

// Busca de pessoas na rede Realyz, por nome ou *usuário.
export function PeopleSearchModal({ visible, onClose, navigate }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');
  useEffect(() => {
    if (!visible) {
      setQ('');
      setSearched('');
    }
  }, [visible]);
  const results = searchMembers(q);
  const srv = useServerPeople(q);
  const requests = members.filter((m) => state.friends[m.id] === 'recebido');
  const suggestions = members.filter((m) => !state.friends[m.id]).sort((a, b) => b.mutual - a.mutual).slice(0, 4);
  const open = (m) => dispatch({ type: 'OPEN_PROFILE', id: m.id });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* No computador a busca fica numa coluna no meio (a pessoa e o botão Aceitar/Adicionar perto um do outro). */}
      <View style={[{ flex: 1, backgroundColor: colors.bg }, Platform.OS === 'web' && { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }]}>
        <View style={[styles.searchHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar busca">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={(t) => {
                setQ(t);
                if (!t) setSearched('');
              }}
              onSubmitEditing={() => setSearched(q.trim())}
              autoFocus
              placeholder="Buscar por nome, *usuário ou perfil (ex.: gamer)"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {q ? (
              <TouchableOpacity onPress={() => { setQ(''); setSearched(''); }} accessibilityLabel="Limpar busca">
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => setSearched(q.trim())} accessibilityLabel="Pesquisar" style={{ marginLeft: 8 }}>
              <Ionicons name="search-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                const said = await listenOnce('Quem você procura?');
                if (said) {
                  setQ(said);
                  setSearched(said);
                }
              }}
              accessibilityLabel="Pesquisar por voz"
              style={{ marginLeft: 6 }}
            >
              <Ionicons name="mic-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          {q.trim() && srv.found.length ? (
            <>
              <Text style={styles.section}>Contas no Realyz ({srv.found.length})</Text>
              {srv.found.map((u) => (
                <ServerPersonRow key={u.id} u={u} onFriend={srv.setFriend} />
              ))}
            </>
          ) : null}
          {q.trim() && srv.loading && !srv.found.length ? <Text style={styles.tip}>Procurando nas contas do Realyz…</Text> : null}
          {q.trim() && srv.err ? <Text style={styles.tip}>Não consegui buscar nas contas do Realyz ({srv.err}). Puxe para atualizar ou tente de novo.</Text> : null}
          {/* Seus amigos de verdade primeiro (tocar em "Amigos" no perfil abre aqui). */}
          {!q.trim() && srv.on && srv.friends.length ? (
            <>
              <Text style={styles.section}>Seus amigos ({srv.friends.length})</Text>
              {srv.friends.map((u) => (
                <ServerPersonRow key={u.id} u={{ ...u, friend: 'amigos' }} onFriend={srv.setFriend} />
              ))}
            </>
          ) : null}
          {!q.trim() && srv.sugestoes.length ? (
            <>
              <Text style={styles.section}>Pessoas que talvez você conheça</Text>
              {srv.sugestoes.map((u) => (
                <ServerPersonRow key={u.id} u={u} onFriend={srv.setFriend} />
              ))}
            </>
          ) : null}
          {!q.trim() && srv.requests.length ? (
            <>
              <Text style={styles.section}>Pedidos de amizade de contas reais ({srv.requests.length})</Text>
              {srv.requests.map((u) => (
                <ServerPersonRow key={u.id} u={{ ...u, friend: 'recebido' }} onFriend={srv.setFriend} />
              ))}
            </>
          ) : null}
          {q.trim() ? (
            results.length ? (
              <>
                <Text style={styles.section}>{srv.on ? `Perfis de exemplo (${results.length})` : `${results.length} pessoa(s) encontrada(s)`}</Text>
                {results.map((m) => (
                  <PersonRow key={m.id} m={m} onOpen={() => open(m)} />
                ))}
              </>
            ) : (
              <>
                {srv.found.length || srv.loading ? null : <Empty text={`Ninguém encontrado com "${q.trim()}". Confira o nome ou peça o *usuário da pessoa.`} />}
                {searched ? <GlobalResults query={searched} navigate={navigate ? (go) => { onClose(); navigate(go); } : null} title="Achei em outras partes do Realyz" hideEmpty /> : null}
              </>
            )
          ) : (
            <>
              {requests.length && !srv.on ? (
                <>
                  <Text style={styles.section}>Pedidos de amizade ({requests.length})</Text>
                  {requests.map((m) => (
                    <PersonRow key={m.id} m={m} onOpen={() => open(m)} />
                  ))}
                </>
              ) : null}
              {/* Explorar por perfil social: toca e vê quem é Gamer, Influenciador, Artista... */}
              <Text style={styles.section}>Explorar por perfil</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {CLASSES.filter((c) => members.some((m) => m.social && (m.social.cls === c.id || (m.social.extra || []).includes(c.id)))).map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setQ(c.label)} style={[styles.classChip, { borderColor: c.color + '66' }]} activeOpacity={0.85}>
                    <Ionicons name={c.icon} size={15} color={c.color} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: c.color, fontWeight: '700', fontSize: 13, marginLeft: 5 }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Conta real: só sugestões de gente de verdade (as do servidor, lá em cima). */}
              {srv.on ? null : (
                <>
                  <Text style={styles.section}>Pessoas que você talvez conheça</Text>
                  {suggestions.map((m) => (
                    <PersonRow key={m.id} m={m} onOpen={() => open(m)} />
                  ))}
                </>
              )}
              <Text style={styles.tip}>Dica: peça para a pessoa te passar o nome ou o *usuário dela no Realyz e digite aqui.</Text>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

// Contas de verdade (servidor): busca por nome ou *usuário e os pedidos de amizade recebidos.
// Os perfis de exemplo do app continuam aparecendo junto, logo abaixo.
function useServerPeople(q) {
  const { state } = useStore();
  const on = serverOn() && conectado(state);
  const me = state.user && state.user.serverId;
  const [found, setFound] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null); // a busca no servidor falhou: mostra o motivo
  const term = q.trim().replace(/^[@*#]/, '');
  useEffect(() => {
    if (!on || term.length < 2) {
      setLoading(false);
      return setFound([]);
    }
    let alive = true;
    setLoading(true);
    setErr(null);
    const t = setTimeout(() => {
      api('GET', `/users?q=${encodeURIComponent(term)}`)
        .then((l) => alive && setFound((l || []).filter((u) => u.id !== me).map((u) => ({ ...u, photo: u.photo && u.photo.startsWith('/') ? API_URL + u.photo : u.photo }))))
        .catch((e) => {
          if (!alive) return;
          setFound([]);
          setErr(e && e.message ? e.message : 'sem conexão');
        })
        .finally(() => alive && setLoading(false));
    }, 350);
    return () => ((alive = false), clearTimeout(t));
  }, [on, term]);
  const loadRequests = () => (on ? api('GET', '/friends').then((l) => setRequests((l || []).filter((u) => u.friend === 'recebido'))).catch(() => {}) : null);
  // Sugestões de amizade: quem abre o seu perfil e ainda não é seu amigo (sem dizer quem viu).
  const [sugestoes, setSugestoes] = useState([]);
  useEffect(() => {
    if (on) api('GET', '/me/sugestoes').then((l) => setSugestoes((l || []).map((u) => ({ ...u, photo: u.photo && u.photo.startsWith('/') ? API_URL + u.photo : u.photo })))).catch(() => {});
  }, [on]);
  useEffect(() => {
    loadRequests();
  }, [on]);
  // Atualiza a situação da amizade na lista depois de adicionar, aceitar ou recusar.
  const setFriend = (id, friend) => {
    setFound((l) => l.map((u) => (u.id === id ? { ...u, friend } : u)));
    if (friend !== 'recebido') setRequests((l) => l.filter((u) => u.id !== id));
  };
  // Amigos e pedidos já conhecidos aparecem na hora, sem esperar o servidor responder.
  const { friends: myFriends, sent, received } = useServerFriends(on);
  const low = term.toLowerCase();
  const known = term.length >= 2 ? [...myFriends, ...received, ...sent].filter((u) => `${u.name} ${u.username || ''}`.toLowerCase().includes(low)) : [];
  const ids = new Set(found.map((u) => u.id));
  const all = [...found, ...known.filter((u) => !ids.has(u.id))];
  return { on, found: all, friends: myFriends, requests, sugestoes: sugestoes.filter((u) => !requests.some((r) => r.id === u.id)), loading, err, setFriend: (id, friend) => (setFriend(id, friend), friend && setSugestoes((l) => l.filter((u) => u.id !== id))) };
}

function ServerPersonRow({ u, onFriend }) {
  const { dispatch } = useStore();
  const first = (u.name || '').split(' ')[0];
  const [busy, setBusy] = useState(false);
  const act = (fn, next) => {
    setBusy(true);
    fn()
      .then(() => (onFriend(u.id, next), refreshFriends()))
      .catch((e) => Alert.alert('Não deu certo', e.message))
      .finally(() => setBusy(false));
  };
  const add = () => act(() => api('POST', `/friends/${u.id}`), u.friend === 'recebido' ? 'amigos' : 'enviado');
  const refuse = () => act(() => api('DELETE', `/friends/${u.id}`), null);
  return (
    <View style={styles.row}>
      {/* Tocar na foto ou no nome abre o perfil da conta real. */}
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => openServerProfile(u.id, { name: u.name, photo: u.photo || null, username: u.username || null, friend: u.friend || null })} activeOpacity={0.8} accessibilityLabel={`Ver perfil de ${u.name}`}>
      {u.photo ? (
        <Photo uri={mediaUrl(u.photo)} style={styles.rowAvatar} fallback="🙂" />
      ) : (
        <View style={[styles.rowAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 18 }}>{first.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
          {u.name}{u.verified ? <> <Ionicons name="shield-checkmark" size={12} color={colors.primary} /></> : null}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
          {u.username ? `*${u.username}` : 'Conta Realyz'}
          {u.friend === 'amigos' ? ' · amigos' : u.friend === 'enviado' ? ' · pedido enviado' : u.friend === 'recebido' ? ' · quer ser seu amigo' : ''}
        </Text>
      </View>
      </TouchableOpacity>
      {u.friend === 'amigos' ? (
        <Btn compact icon="chatbubble-ellipses-outline" label="Mensagem" onPress={() => dispatch({ type: 'OPEN_SERVER_CHAT', userId: u.id, name: u.name })} />
      ) : u.friend === 'enviado' ? (
        <Btn compact icon="time-outline" label="Enviado" onPress={() => Alert.alert('Pedido enviado', `Quando ${first} aceitar, vocês viram amigos no Realyz.`)} />
      ) : u.friend === 'recebido' ? (
        <View style={{ flexDirection: 'row' }}>
          <Btn compact icon="checkmark" label="Aceitar" solid onPress={busy ? undefined : add} />
          <Btn compact icon="close" label="" onPress={busy ? undefined : refuse} style={{ marginLeft: 6 }} a11y={`Recusar pedido de ${first}`} />
        </View>
      ) : (
        <Btn compact icon="person-add" label={busy ? '…' : 'Adicionar'} solid onPress={busy ? undefined : add} a11y={`Adicionar ${u.name}`} />
      )}
    </View>
  );
}

export function PersonRow({ m, onOpen }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onOpen} activeOpacity={0.85}>
      <Photo uri={m.photo} style={styles.rowAvatar} fallback="🙂" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>
          {m.name} <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
        </Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
          *{m.handle}
          {m.mutual ? ` · ${m.mutual} amigos em comum` : ` · ${m.city}`}
        </Text>
        <SocialBadge social={m.social} size="sm" showExtra={false} />
      </View>
      <FriendButton member={m} compact />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  depBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginTop: 8 },
  zoomBack: { flex: 1, backgroundColor: 'rgba(241,235,221,0.94)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  zoomCard: { width: 320, maxWidth: '100%', alignItems: 'center', backgroundColor: colors.card, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: '#EAD7A4', shadowColor: '#8A6208', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  zoomImg: { width: 290, maxWidth: '100%', aspectRatio: 1, borderRadius: 18 },
  zoomArrow: { position: 'absolute', top: '45%', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  zoomDots: { flexDirection: 'row', marginTop: 10 },
  zoomDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  zoomDotOn: { backgroundColor: colors.gold, width: 16 },
  zoomName: { color: colors.text, fontWeight: '800', fontSize: 16, flexShrink: 1 },
  zoomClose: { position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  peekDim: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)' },
  peekSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 8 },
  peekGrab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  peekRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  peekAvatar: { width: 53, height: 53, borderRadius: 27 },
  peekName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  peekClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  peekTag: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 12 },
  peekPost: { width: 150, backgroundColor: colors.card, borderRadius: 14, padding: 8, marginRight: 8, ...soft },
  peekPostImg: { width: '100%', height: 90, borderRadius: 10 },
  peekFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16, marginTop: 14 },
  pageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  pageThumb: { width: 54, height: 40, borderRadius: 8 },
  classChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, marginRight: 8, backgroundColor: colors.card },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1.5 },
  btnSm: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  btnSolid: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnLine: { backgroundColor: colors.card, borderColor: colors.primary },
  btnText: { fontWeight: '700', marginLeft: 6, fontSize: 13 },
  back: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.gold, backgroundColor: colors.bg, marginTop: -52, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 94, height: 94, borderRadius: 47 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  handle: { color: colors.muted, marginTop: 2 },
  bio: { color: colors.text, marginTop: 8, lineHeight: 20 },
  stats: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, paddingVertical: 9, marginTop: 14, ...soft },
  ask: { color: colors.primaryDark, fontWeight: '700', marginTop: 12 },
  msgBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, marginLeft: 8 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 18, marginBottom: 8 },
  post: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10, ...soft },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  postImg: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 12, marginLeft: 4 },
  searchHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, marginLeft: 10, minHeight: 44 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 10, marginBottom: 8, ...soft },
  rowAvatar: { width: 46, height: 46, borderRadius: 23 },
  tip: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 14 },
});
