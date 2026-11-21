// Parte social do perfil: depoimentos (estilo Orkut), galeria de fotos, galeria de vídeos e destaques de stories.
// Usado no perfil dos outros membros, no "Meu perfil" e no feed abaixo dos stories.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { KeyboardLift } from '../keyboard';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Share, Image, Platform, useWindowDimensions } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Photo, Empty } from './ui';
import { members, memberById, searchMembers } from '../people';
import { listenOnce } from './Search';
import { analyzeTestimonial, galleryOf } from '../testimonialsData';
import { storyDesk } from './StoryFrame';
import { STORY_SAMPLE_PHOTOS } from '../homeData';
import { StoryViewer } from '../screens/cliente/home/Stories';
import { privacyOf, creationsOf } from '../studioData';
import { canSee, LockedPanel, CreationsGrid, coverTone } from './ProfileStudio';
import ThemeArt from './ThemeArt';
import { MuralTab } from './Mural';

const first = (name) => String(name || '').split(' ')[0];
const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// Amigos que batem com a pesquisa (nome, primeiro nome ou *usuário).
const friendsMatching = (list, q) => {
  const k = norm(q).replace(/^[@*]/, '');
  return list.filter((m) => norm(m.name).includes(k) || norm(m.handle).includes(k));
};

// "Ver como os outros veem": dentro da prévia, o meu perfil aparece como aparece para um visitante
// ('todos' = qualquer pessoa; 'amigos' = um amigo). Fora da prévia o valor é null.
const ViewAs = React.createContext(null);

// Quem é a pessoa do id ('me' = o próprio usuário).
export function usePerson() {
  const { state } = useStore();
  return (id) => {
    if (id === 'me') return { id: 'me', name: state.user ? state.user.name : 'Você', photo: (state.myProfile && state.myProfile.photo) || null, me: true };
    const m = memberById(id);
    return m ? { ...m } : { id, name: 'Membro Realyz', photo: null };
  };
}

function Avatar({ person, size = 40, onPress }) {
  const body = person.photo ? (
    <Photo uri={person.photo} style={{ width: size, height: size, borderRadius: size / 2 }} fallback="🙂" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: size * 0.42 }}>{person.name[0].toUpperCase()}</Text>
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} accessibilityLabel={`Perfil de ${person.name}`}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

// ───────────────────────── Depoimentos ─────────────────────────

// Cartão do depoimento no feed e no perfil: curtir, comentar e compartilhar.
export function TestimonialCard({ t, hideTarget, ownerTools }) {
  const { state, dispatch } = useStore();
  const person = usePerson();
  const from = person(t.from);
  const to = person(t.to);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const liked = !!state.tLiked[t.id];
  const openProfile = (p) => !p.me && dispatch({ type: 'OPEN_PROFILE', id: p.id });

  const comment = () => {
    const v = text.trim();
    if (!v) return;
    dispatch({ type: 'T_COMMENT', id: t.id, text: v, who: person('me').name });
    setText('');
  };
  const share = async () => {
    try {
      const r = await Share.share({ message: `Depoimento de ${from.name} para ${to.name} no Realyz:\n\n“${t.text}”\n\nRealyz · Pessoas reais. Negócios reais.` });
      if (!r || r.action !== Share.dismissedAction) dispatch({ type: 'T_SHARE', id: t.id });
    } catch (e) {}
  };
  const removeFromProfile = () =>
    Alert.alert('Tirar do perfil?', `O depoimento de ${first(from.name)} deixa de aparecer no seu perfil e no feed.`, [
      { text: 'Manter', style: 'cancel' },
      { text: 'Tirar do perfil', style: 'destructive', onPress: () => dispatch({ type: 'T_RESPOND', id: t.id, status: 'oculto' }) },
    ]);

  return (
    <View style={styles.tCard}>
      <View style={styles.tHead}>
        <Avatar person={from} size={42} onPress={from.me ? null : () => openProfile(from)} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.tWho} numberOfLines={2}>
            <Text onPress={() => openProfile(from)}>{from.name}</Text>
            <Text style={styles.tVerb}>{hideTarget ? ' deixou um depoimento' : ' escreveu para '}</Text>
            {hideTarget ? null : <Text onPress={() => openProfile(to)}>{to.name}</Text>}
          </Text>
          <Text style={styles.tTime}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} /> Aprovado por {to.me ? 'você' : first(to.name)} · {t.time}
          </Text>
        </View>
        {hideTarget ? null : <Avatar person={to} size={30} onPress={to.me ? null : () => openProfile(to)} />}
        {ownerTools ? (
          <TouchableOpacity onPress={removeFromProfile} style={{ marginLeft: 6, padding: 4 }} accessibilityLabel="Tirar depoimento do perfil">
            <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.quote}>
        <Ionicons name="chatbox-ellipses" size={18} color={colors.gold} style={{ marginBottom: 4 }} />
        <Text style={styles.quoteText}>{t.text}</Text>
      </View>

      <View style={styles.counts}>
        <Text style={styles.countTxt}>{t.likes ? `❤️ ${t.likes}` : ''}</Text>
        <Text style={styles.countTxt}>
          {t.comments.length ? `${t.comments.length} comentário${t.comments.length > 1 ? 's' : ''}` : ''}
          {t.comments.length && t.shares ? ' · ' : ''}
          {t.shares ? `${t.shares} compartilhamento${t.shares > 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        <Action icon={liked ? 'heart' : 'heart-outline'} color={liked ? colors.danger : colors.muted} label="Curtir" onPress={() => dispatch({ type: 'T_LIKE', id: t.id })} />
        <Action icon="chatbubble-outline" label="Comentar" onPress={() => setOpen((o) => !o)} />
        <Action icon="arrow-redo-outline" label="Compartilhar" onPress={share} />
      </View>

      {open || t.comments.length ? (
        <View style={{ marginTop: 6 }}>
          {(open ? t.comments : t.comments.slice(-1)).map((c) => (
            <View key={c.id} style={styles.comment}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{c.mine ? person('me').name : c.who}</Text>
              <Text style={{ color: colors.text, fontSize: 13, marginTop: 1 }}>{c.text}</Text>
            </View>
          ))}
          {!open && t.comments.length > 1 ? (
            <Text onPress={() => setOpen(true)} style={styles.more}>
              Ver os {t.comments.length} comentários
            </Text>
          ) : null}
          {open ? (
            <View style={styles.commentBox}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escreva um comentário…"
                placeholderTextColor={colors.muted}
                style={styles.commentInput}
                onSubmitEditing={comment}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={comment} accessibilityLabel="Enviar comentário" style={{ padding: 6 }}>
                <Ionicons name="send" size={18} color={text.trim() ? colors.primary : colors.muted} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Action({ icon, label, onPress, color = colors.muted }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} accessibilityLabel={label} activeOpacity={0.7}>
      <Ionicons name={icon} size={19} color={color} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.actionTxt, color !== colors.muted && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Escrever um depoimento. Se não vier o destinatário, escolhe entre os amigos.
export function TestimonialComposer({ visible, onClose, toId }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [to, setTo] = useState(toId || null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [find, setFind] = useState(''); // pesquisar o contato para quem escrever
  const timer = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setTo(toId || null);
    setText('');
    setError('');
    setSent(null);
    setFind('');
  }, [visible, toId]);

  const friends = members.filter((m) => state.friends[m.id] === 'amigo');
  const found = find.trim() ? friendsMatching(friends, find) : friends;
  // Quem bate com a busca mas ainda não é amigo: aparece para adicionar (depoimento é só entre amigos).
  const notFriends = find.trim().length >= 2 ? searchMembers(find).filter((m) => state.friends[m.id] !== 'amigo').slice(0, 4) : [];
  const target = to ? memberById(to) : null;

  const send = () => {
    const r = analyzeTestimonial(text);
    if (!r.ok) return setError(r.reason);
    setError('');
    dispatch({ type: 'T_SEND', to, text: text.trim() });
    setSent(target);
    // Demonstração: o amigo analisa e aprova alguns segundos depois.
    timer.current = setTimeout(() => {
      dispatch({ type: 'T_APPROVE_LAST_FROM_ME', to });
    }, 8000);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Escrever depoimento</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          {sent ? (
            <View style={{ alignItems: 'center', paddingTop: 30 }}>
              <View style={styles.okCircle}>
                <Ionicons name="paper-plane" size={34} color={colors.onPrimary} />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 16, textAlign: 'center' }]}>Depoimento enviado para {first(sent.name)}!</Text>
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                A Realyz já analisou o texto. Agora {first(sent.name)} decide se aceita. Só depois de aprovado ele aparece no perfil e no feed de depoimentos.
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 22, alignSelf: 'stretch' }]} onPress={onClose}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.primaryTxt}>Concluir</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Para quem?</Text>
              {target ? (
                <View style={styles.toRow}>
                  <Photo uri={target.photo} style={{ width: 44, height: 44, borderRadius: 22 }} fallback="🙂" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{target.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>*{target.handle}</Text>
                  </View>
                  {toId ? null : (
                    <TouchableOpacity onPress={() => setTo(null)}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700' }}>Trocar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* Pesquisar contato: por nome ou *usuário, digitando ou falando */}
                  <View style={styles.findBox}>
                    <Ionicons name="search" size={17} color={colors.muted} />
                    <TextInput
                      value={find}
                      onChangeText={setFind}
                      placeholder="Pesquisar contato por nome ou *usuário"
                      placeholderTextColor={colors.muted}
                      style={styles.findInput}
                      autoCapitalize="none"
                      returnKeyType="search"
                    />
                    {find ? (
                      <TouchableOpacity onPress={() => setFind('')} accessibilityLabel="Limpar pesquisa" style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={17} color={colors.muted} />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      onPress={async () => {
                        const said = await listenOnce('Para quem é o depoimento?');
                        if (said) setFind(said);
                      }}
                      accessibilityLabel="Pesquisar contato por voz"
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="mic-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {!friends.length ? (
                    <Empty text="Adicione amigos para escrever depoimentos para eles." />
                  ) : found.length ? (
                    find.trim() ? (
                      found.map((m) => (
                        <TouchableOpacity key={m.id} style={styles.findRow} onPress={() => setTo(m.id)} activeOpacity={0.85} accessibilityLabel={`Escrever para ${m.name}`}>
                          <Photo uri={m.photo} style={{ width: 40, height: 40, borderRadius: 20 }} fallback="🙂" />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{m.name}</Text>
                            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>*{m.handle}</Text>
                          </View>
                          <Ionicons name="create-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      ))
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                        {friends.map((m) => (
                          <TouchableOpacity key={m.id} style={styles.pick} onPress={() => setTo(m.id)} accessibilityLabel={`Escrever para ${m.name}`}>
                            <Photo uri={m.photo} style={{ width: 58, height: 58, borderRadius: 29 }} fallback="🙂" />
                            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                              {first(m.name)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )
                  ) : (
                    <Text style={styles.hint}>Nenhum amigo com "{find.trim()}".</Text>
                  )}
                  {notFriends.length ? (
                    <>
                      <Text style={[styles.hint, { marginTop: 6 }]}>Ainda não são amigos (depoimento é só entre amigos):</Text>
                      {notFriends.map((m) => (
                        <TouchableOpacity key={m.id} style={[styles.findRow, { opacity: 0.85 }]} onPress={() => dispatch({ type: 'OPEN_PROFILE', id: m.id })} activeOpacity={0.85} accessibilityLabel={`Ver prévia de ${m.name}`}>
                          <Photo uri={m.photo} style={{ width: 40, height: 40, borderRadius: 20 }} fallback="🙂" />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{m.name}</Text>
                            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                              {state.friends[m.id] === 'enviado' ? 'Pedido de amizade enviado' : 'Toque para ver e adicionar'}
                            </Text>
                          </View>
                          <Ionicons name="person-add-outline" size={18} color={colors.muted} />
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : null}
                </>
              )}

              <Text style={[styles.label, { marginTop: 14 }]}>O que você quer dizer {target ? `sobre ${first(target.name)}` : ''}?</Text>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  if (error) setError('');
                }}
                multiline
                maxLength={600}
                placeholder="Conte o que essa pessoa tem de especial, uma história de vocês, por que você recomenda…"
                placeholderTextColor={colors.muted}
                style={styles.area}
              />
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>{text.length}/600</Text>
              {error ? (
                <View style={styles.err}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={{ color: colors.danger, marginLeft: 6, flex: 1, fontSize: 13 }}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.info}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 }}>
                  Antes de entregar, a Realyz analisa o depoimento (ofensas, golpes, links e dados pessoais). Depois, o dono do perfil escolhe se aceita ou recusa. Só os aceitos ficam expostos.
                </Text>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, !(to && text.trim()) && { opacity: 0.5 }]} disabled={!(to && text.trim())} onPress={send}>
                <Ionicons name="send" size={16} color={colors.onPrimary} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.primaryTxt, { marginLeft: 8 }]}>Enviar para análise</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardLift>
    </Modal>
  );
}

// Feed de depoimentos (vai abaixo dos stories).
export function TestimonialFeed() {
  const { state } = useStore();
  const [writing, setWriting] = useState(false);
  const hideMine = (state.privacy || {}).testimonials === false; // escondi os meus depoimentos do perfil
  const list = state.testimonials.filter((t) => t.status === 'aprovado' && !(hideMine && t.to === 'me'));
  const pendingMine = state.testimonials.filter((t) => t.to === 'me' && t.status === 'pendente').length;
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={styles.feedHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.section}>Depoimentos</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>O que as pessoas verificadas dizem umas das outras</Text>
        </View>
        <TouchableOpacity style={styles.writeBtn} onPress={() => setWriting(true)} accessibilityLabel="Escrever depoimento">
          <Ionicons name="create-outline" size={16} color={colors.onPrimary} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.onPrimary, fontWeight: '700', marginLeft: 4, fontSize: 13 }}>Escrever</Text>
        </TouchableOpacity>
      </View>
      {pendingMine ? (
        <View style={styles.pendingBanner}>
          <Ionicons name="mail-unread-outline" size={18} color={colors.primaryDark} />
          <Text style={{ color: colors.primaryDark, fontWeight: '700', marginLeft: 8, flex: 1, fontSize: 13 }}>
            Você tem {pendingMine} depoimento{pendingMine > 1 ? 's' : ''} esperando aprovação. Veja em Perfil › Depoimentos.
          </Text>
        </View>
      ) : null}
      {list.map((t) => (
        <TestimonialCard key={t.id} t={t} />
      ))}
      <TestimonialComposer visible={writing} onClose={() => setWriting(false)} />
    </View>
  );
}

// Ferramentas de depoimento no feed da Community: deixar um depoimento e pesquisar contatos nos
// depoimentos (quem escreveu ou quem recebeu). Enquanto pesquisa, o feed dá lugar aos resultados.
export function TestimonialTools({ onSearching }) {
  const { state, dispatch } = useStore();
  const person = usePerson();
  const [writing, setWriting] = useState(false);
  const [writeTo, setWriteTo] = useState(null);
  const [open, setOpen] = useState(false); // caixa de pesquisa aberta
  const [q, setQ] = useState('');
  useEffect(() => {
    onSearching && onSearching(open);
  }, [open]);
  const k = norm(q).replace(/^[@*]/, '');
  const hideMine = (state.privacy || {}).testimonials === false;
  const all = state.testimonials.filter((t) => t.status === 'aprovado' && !(hideMine && t.to === 'me'));
  const hit = (id) => {
    const p = person(id);
    return norm(p.name).includes(k) || norm(p.handle).includes(k);
  };
  const list = k ? all.filter((t) => hit(t.from) || hit(t.to)) : [];
  // Pessoas encontradas: amigos (para escrever) e quem aparece nos depoimentos.
  const ids = new Set();
  list.forEach((t) => [t.from, t.to].forEach((id) => id !== 'me' && hit(id) && ids.add(id)));
  members.filter((m) => state.friends[m.id] === 'amigo').forEach((m) => k && hit(m.id) && ids.add(m.id));
  const people = [...ids].map((id) => memberById(id)).filter(Boolean).slice(0, 8);
  const write = (id) => {
    setWriteTo(id || null);
    setWriting(true);
  };
  const close = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <View>
      {open ? (
        <View style={styles.findBox}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder="Pesquisar contato nos depoimentos"
            placeholderTextColor={colors.muted}
            style={styles.findInput}
            autoCapitalize="none"
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={async () => {
              const said = await listenOnce('Quem você procura nos depoimentos?');
              if (said) setQ(said);
            }}
            accessibilityLabel="Pesquisar por voz"
            style={{ padding: 4 }}
          >
            <Ionicons name="mic-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={close} accessibilityLabel="Fechar pesquisa" style={{ padding: 4 }}>
            <Ionicons name="close" size={19} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.toolsRow}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => write(null)} activeOpacity={0.85} accessibilityLabel="Deixar depoimento">
            <Ionicons name="chatbox-ellipses-outline" size={17} color={colors.primary} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.toolTxt}>Deixar depoimento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { marginLeft: 8 }]} onPress={() => setOpen(true)} activeOpacity={0.85} accessibilityLabel="Pesquisar contatos nos depoimentos">
            <Ionicons name="search-outline" size={17} color={colors.primary} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.toolTxt}>Pesquisar depoimentos</Text>
          </TouchableOpacity>
        </View>
      )}

      {open && k ? (
        <View>
          {people.map((m) => {
            const friend = state.friends[m.id] === 'amigo';
            return (
              <View key={m.id} style={styles.findRow}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => dispatch({ type: 'OPEN_PROFILE', id: m.id })} activeOpacity={0.85} accessibilityLabel={`Perfil de ${m.name}`}>
                  <Photo uri={m.photo} style={{ width: 40, height: 40, borderRadius: 20 }} fallback="🙂" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{m.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                      {all.filter((t) => t.to === m.id).length} depoimento(s) · {friend ? 'amigo' : `*${m.handle}`}
                    </Text>
                  </View>
                </TouchableOpacity>
                {friend ? (
                  <TouchableOpacity onPress={() => write(m.id)} style={{ padding: 6 }} accessibilityLabel={`Deixar depoimento para ${m.name}`}>
                    <Ionicons name="create-outline" size={19} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
          {list.length ? list.map((t) => <TestimonialCard key={t.id} t={t} />) : <Empty text={`Nenhum depoimento com "${q.trim()}".`} />}
        </View>
      ) : null}
      <TestimonialComposer visible={writing} onClose={() => setWriting(false)} toId={writeTo} />
    </View>
  );
}

// ───────────────────────── DEP: central de depoimentos ─────────────────────────
// Um botão só ("Dep", no Perfil) reúne tudo de depoimentos:
// relatório (recebidos e enviados), deixar depoimento, pesquisar, aprovar os que chegaram e
// acompanhar os que a pessoa mandou. Quem tem o depoimento recusado não é avisado: para quem
// enviou, ele continua como "aguardando".
export function DepCenter({ visible, onClose }) {
  const { state } = useStore();
  const person = usePerson();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('recebidos');
  const [searching, setSearching] = useState(false);
  const all = state.testimonials;
  const rec = all.filter((t) => t.to === 'me');
  const env = all.filter((t) => t.from === 'me');
  const count = (list, st) => list.filter((t) => (Array.isArray(st) ? st.includes(t.status) : t.status === st)).length;
  const report = [
    { k: 'recebidos', label: 'Recebidos', total: rec.length, lines: [['Expostos', count(rec, 'aprovado')], ['Para aprovar', count(rec, 'pendente')], ['Recusados / tirados', count(rec, ['recusado', 'oculto'])]] },
    { k: 'enviados', label: 'Enviados', total: env.length, lines: [['Aceitos', count(env, ['aprovado', 'oculto'])], ['Aguardando', count(env, ['pendente', 'recusado'])]] },
  ];
  const sentLabel = (t) => (t.status === 'aprovado' || t.status === 'oculto' ? ['Aceito', colors.success] : ['Aguardando aprovação', colors.primaryDark]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={styles.depHead}>
          <Text style={styles.depTitle}>Dep</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} hitSlop={8} accessibilityLabel="Fechar depoimentos">
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          {/* Relatório: tocar num lado abre a lista dele */}
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {report.map((r, i) => {
              const on = tab === r.k;
              return (
                <TouchableOpacity key={r.k} style={[styles.depBox, i ? { marginLeft: 10 } : null, on && styles.depBoxOn]} onPress={() => setTab(r.k)} activeOpacity={0.85} accessibilityLabel={`${r.label}: ${r.total}`}>
                  <Text style={styles.depNum}>{r.total}</Text>
                  <Text numberOfLines={1} style={[styles.depLabel, on && { color: colors.primaryDark }]}>{r.label}</Text>
                  {r.lines.map(([l, v]) => (
                    <View key={l} style={styles.depLine}>
                      <Text numberOfLines={1} style={styles.depLineTxt}>{l}</Text>
                      <Text style={[styles.depLineTxt, { fontWeight: '800', color: colors.text }]}>{v}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Deixar depoimento e pesquisar */}
          <TestimonialTools onSearching={setSearching} />

          {searching ? null : tab === 'recebidos' ? (
            <TestimonialsTab ownerId="me" />
          ) : env.length ? (
            env.map((t) => {
              const to = person(t.to);
              const [lab, tone] = sentLabel(t);
              return (
                <View key={t.id} style={styles.tCard}>
                  <View style={styles.tHead}>
                    <Avatar person={to} size={40} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.tWho} numberOfLines={1}>Para {to.name}</Text>
                      <Text style={styles.tTime}>{t.time}</Text>
                    </View>
                    <Text style={{ color: tone, fontSize: 11, fontWeight: '800' }}>{lab}</Text>
                  </View>
                  <View style={styles.quote}>
                    <Text style={styles.quoteText}>{t.text}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Empty text="Você ainda não enviou depoimentos. Toque em Deixar depoimento para escrever para um amigo." />
          )}
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

// Aba de depoimentos dentro de um perfil.
export function TestimonialsTab({ ownerId }) {
  const { state, dispatch } = useStore();
  const person = usePerson();
  const owner = person(ownerId);
  const [writing, setWriting] = useState(false);
  const viewAs = useContext(ViewAs);
  const own = ownerId === 'me';
  const mine = own && !viewAs; // dono mexendo no próprio perfil (na prévia, vê como visitante)
  const shown = (state.privacy || {}).testimonials !== false; // depoimentos aparecem para os outros?
  const approved = state.testimonials.filter((t) => t.to === ownerId && t.status === 'aprovado');
  const pending = mine ? state.testimonials.filter((t) => t.to === 'me' && t.status === 'pendente') : [];
  const sentWaiting = !own ? state.testimonials.filter((t) => t.from === 'me' && t.to === ownerId && t.status === 'pendente') : [];
  const isFriend = state.friends[ownerId] === 'amigo';

  return (
    <View>
      {mine ? (
        <>
          {/* Mostrar ou esconder os depoimentos no perfil */}
          <TouchableOpacity
            style={styles.showRow}
            activeOpacity={0.85}
            onPress={() => dispatch({ type: 'SET_PRIVACY', privacy: { testimonials: !shown } })}
            accessibilityRole="switch"
            accessibilityState={{ checked: shown }}
            accessibilityLabel="Mostrar depoimentos no meu perfil"
          >
            <Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={18} color={shown ? colors.primary : colors.muted} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{shown ? 'Depoimentos aparecendo no perfil' : 'Depoimentos escondidos'}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{shown ? 'Quem visita o seu perfil vê os que você aceitou.' : 'Só você vê. Os amigos ainda podem escrever e você aprova quando quiser.'}</Text>
            </View>
            <View style={[styles.switch, shown && styles.switchOn]}>
              <View style={[styles.knob, shown && styles.knobOn]} />
            </View>
          </TouchableOpacity>
          <Text style={styles.sub}>Para aprovar {pending.length ? `(${pending.length})` : ''}</Text>
          {pending.length ? (
            pending.map((t) => {
              const from = person(t.from);
              return (
                <View key={t.id} style={[styles.tCard, { borderColor: colors.gold, borderWidth: 1.5 }]}>
                  <View style={styles.tHead}>
                    <Avatar person={from} size={40} onPress={() => dispatch({ type: 'OPEN_PROFILE', id: from.id })} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.tWho}>{from.name}</Text>
                      <Text style={styles.tTime}>escreveu um depoimento para você · {t.time}</Text>
                    </View>
                  </View>
                  <View style={styles.quote}>
                    <Text style={styles.quoteText}>{t.text}</Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
                    <Ionicons name="shield-checkmark" size={11} color={colors.success} /> Analisado pela Realyz: sem ofensas, links ou golpes.
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={() => dispatch({ type: 'T_RESPOND', id: t.id, status: 'aprovado' })}>
                      <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.primaryTxt, { marginLeft: 6 }]}>Aceitar e expor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.lineBtn, { marginLeft: 8 }]}
                      onPress={() =>
                        Alert.alert('Recusar depoimento?', `${first(from.name)} não será avisado, e o depoimento não aparece no seu perfil.`, [
                          { text: 'Voltar', style: 'cancel' },
                          { text: 'Recusar', style: 'destructive', onPress: () => dispatch({ type: 'T_RESPOND', id: t.id, status: 'recusado' }) },
                        ])
                      }
                    >
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.danger, fontWeight: '700' }}>Recusar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.hint}>Nenhum depoimento esperando. Quando alguém escrever para você, ele chega aqui para você analisar.</Text>
          )}
          <Text style={[styles.sub, { marginTop: 14 }]}>{shown ? 'Expostos no seu perfil' : 'Aceitos (escondidos do perfil)'} ({approved.length})</Text>
        </>
      ) : own ? null : (
        <>
          {isFriend ? (
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 0, marginBottom: 12 }]} onPress={() => setWriting(true)}>
              <Ionicons name="create-outline" size={16} color={colors.onPrimary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.primaryTxt, { marginLeft: 8 }]}>Escrever depoimento para {first(owner.name)}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>Só amigos podem escrever depoimentos para {first(owner.name)}. Adicione como amigo primeiro.</Text>
          )}
          {sentWaiting.map((t) => (
            <View key={t.id} style={styles.waiting}>
              <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, marginLeft: 8, flex: 1, fontSize: 12 }}>Seu depoimento está esperando a aprovação de {first(owner.name)}.</Text>
            </View>
          ))}
        </>
      )}
      {approved.length ? (
        approved.map((t) => <TestimonialCard key={t.id} t={t} hideTarget ownerTools={mine} />)
      ) : (
        <Empty text={mine ? 'Os depoimentos que você aceitar aparecem aqui, para todos verem.' : `${first(owner.name)} ainda não tem depoimentos expostos.`} />
      )}
      {!own ? <TestimonialComposer visible={writing} onClose={() => setWriting(false)} toId={ownerId} /> : null}
    </View>
  );
}

// ───────────────────────── Destaques ─────────────────────────

export function HighlightsRow({ ownerId }) {
  const { state, dispatch } = useStore();
  const person = usePerson();
  const viewAs = useContext(ViewAs);
  const own = ownerId === 'me';
  const mine = own && !viewAs;
  const highlights = own ? state.myGallery.highlights : galleryOf(ownerId).highlights;
  const [view, setView] = useState(null);
  const [creating, setCreating] = useState(false);
  const owner = person(ownerId);
  if (!mine && !highlights.length) return null;

  const groups = highlights.map((h) => ({ id: h.id, name: h.title, avatar: h.cover, items: h.items, mine }));
  const longPress = (h) =>
    mine &&
    Alert.alert(`Destaque "${h.title}"`, 'Quer tirar este destaque do seu perfil?', [
      { text: 'Manter', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => dispatch({ type: 'GALLERY_REMOVE', kind: 'highlights', id: h.id }) },
    ]);

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.sub}>Destaques</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
        {mine ? (
          <TouchableOpacity style={styles.hl} onPress={() => setCreating(true)} accessibilityLabel="Novo destaque">
            <View style={[styles.hlRing, { borderStyle: 'dashed', borderColor: colors.primary }]}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.hlName}>Novo</Text>
          </TouchableOpacity>
        ) : null}
        {highlights.map((h, i) => (
          <TouchableOpacity key={h.id} style={styles.hl} onPress={() => setView(i)} onLongPress={() => longPress(h)} accessibilityLabel={`Destaque ${h.title}`}>
            <View style={styles.hlRing}>
              <Photo uri={h.cover} style={styles.hlImg} fallback="⭐" />
            </View>
            <Text numberOfLines={1} style={styles.hlName}>
              {h.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {mine ? <Text style={styles.hint}>Segure um destaque para remover.</Text> : null}

      <StoryViewer
        visible={view !== null}
        groups={groups}
        start={view || 0}
        isMine={false}
        onClose={() => setView(null)}
        onSeen={() => {}}
        onReply={(g, text) => {
          const d = new Date();
          const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          const msg = { from: 'me', text: `Respondeu ao destaque "${g.name}": ${text}`, time };
          const extra = { id: owner.id, name: owner.name, status: 'pessoa verificada', photo: owner.photo };
          dispatch({
            type: 'UPDATE_CONVS',
            fn: (cs) =>
              cs.find((c) => c.contactId === owner.id)
                ? cs.map((c) => (c.contactId === owner.id ? { ...c, messages: [...c.messages, msg] } : c))
                : [{ id: 'm' + Date.now(), contactId: owner.id, unread: 0, messages: [msg], extra }, ...cs],
          });
        }}
        onCta={() => {}}
      />
      {mine ? <HighlightComposer visible={creating} onClose={() => setCreating(false)} /> : null}
    </View>
  );
}

// Novo destaque: escolhe stories que já publicou e/ou fotos da galeria, e dá um nome.
function HighlightComposer({ visible, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState({});
  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setPicked({});
  }, [visible]);

  const options = [
    ...state.myStories.map((s) => ({ key: 'st-' + s.id, story: s, preview: s.image || (s.showCard && s.showCard.foto), label: 'Seu story' })),
    ...state.myGallery.photos.map((p) => ({ key: 'ph-' + p.id, preview: p.uri, label: 'Galeria' })),
    ...STORY_SAMPLE_PHOTOS.map((u, i) => ({ key: 'sm-' + i, preview: u, label: 'Exemplo' })),
  ];
  const chosen = options.filter((o) => picked[o.key]);
  const save = () => {
    if (!title.trim() || !chosen.length) return;
    const id = 'hl' + Date.now();
    const items = chosen.map((o, k) =>
      o.story ? { ...o.story, id: `${id}-${k}`, time: 'destaque' } : { id: `${id}-${k}`, image: o.preview, caption: '', time: 'destaque' }
    );
    const cover = (chosen.find((o) => o.preview) || {}).preview || null;
    dispatch({ type: 'GALLERY_ADD', kind: 'highlights', items: [{ id, title: title.trim(), cover, items }] });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.modalHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Novo destaque</Text>
          <TouchableOpacity onPress={save} disabled={!title.trim() || !chosen.length}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '800', opacity: title.trim() && chosen.length ? 1 : 0.4 }}>Salvar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nome do destaque</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={18} placeholder="Ex.: Viagens, Família, Fé" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={[styles.label, { marginTop: 12 }]}>Escolha o que vai ficar no destaque ({chosen.length})</Text>
          <Text style={styles.hint}>Os stories somem em 24 h, mas o que estiver em destaque fica no seu perfil.</Text>
          <View style={styles.grid3}>
            {options.map((o) => {
              const on = !!picked[o.key];
              return (
                <TouchableOpacity key={o.key} style={styles.pickTile} onPress={() => setPicked((p) => ({ ...p, [o.key]: !p[o.key] }))} activeOpacity={0.85}>
                  {o.preview ? (
                    <Photo uri={o.preview} style={StyleSheet.absoluteFill} />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: o.story.bg || colors.primary, alignItems: 'center', justifyContent: 'center', padding: 6 }]}>
                      <Text numberOfLines={4} style={{ color: '#fff', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>
                        {o.story.text}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.check, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={styles.tileTag}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

// ───────────────────────── Fotos e vídeos ─────────────────────────

async function pickFromPhone(kind) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Autorize o Realyz a ver suas fotos e vídeos para escolher o que vai para o perfil.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'videos' ? ['videos'] : ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.8,
  });
  if (res.canceled) return [];
  return res.assets || [];
}

const fmtDuration = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function MediaGallery({ ownerId, kind }) {
  const { state, dispatch } = useStore();
  const { width } = useWindowDimensions();
  const [boxW, setBoxW] = useState(0);
  const viewAs = useContext(ViewAs);
  const own = ownerId === 'me';
  const mine = own && !viewAs;
  const items = own ? state.myGallery[kind] : galleryOf(ownerId)[kind];
  const [viewing, setViewing] = useState(null);
  const tile = Math.floor(((boxW || width - 32) - 8) / 3);

  const add = async () => {
    try {
      const assets = await pickFromPhone(kind);
      if (!assets.length) return;
      const now = Date.now();
      const news =
        kind === 'videos'
          ? assets.map((a, i) => ({ id: `mv${now}${i}`, uri: a.uri, thumb: null, title: a.fileName || 'Vídeo novo', duration: fmtDuration(a.duration), views: 0, local: true }))
          : assets.map((a, i) => ({ id: `mf${now}${i}`, uri: a.uri }));
      dispatch({ type: 'GALLERY_ADD', kind, items: news });
    } catch (e) {
      Alert.alert('Não deu para abrir a galeria', 'Tente de novo em instantes.');
    }
  };
  const remove = (it) =>
    mine &&
    Alert.alert(kind === 'videos' ? 'Remover vídeo?' : 'Remover foto?', 'Sai da sua galeria no Realyz (continua no seu celular).', [
      { text: 'Manter', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => dispatch({ type: 'GALLERY_REMOVE', kind, id: it.id }) },
    ]);

  return (
    <View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
      {mine ? (
        <TouchableOpacity style={[styles.lineBtn, { alignSelf: 'stretch', marginBottom: 10, flexDirection: 'row', justifyContent: 'center' }]} onPress={add}>
          <Ionicons name={kind === 'videos' ? 'videocam-outline' : 'images-outline'} size={18} color={colors.primary} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>{kind === 'videos' ? 'Adicionar vídeos do celular' : 'Adicionar fotos do celular'}</Text>
        </TouchableOpacity>
      ) : null}
      {!items.length ? <Empty text={kind === 'videos' ? 'Nenhum vídeo na galeria ainda.' : 'Nenhuma foto na galeria ainda.'} /> : null}
      {kind === 'photos' ? (
        <View style={styles.grid3}>
          {items.map((p, i) => (
            <TouchableOpacity key={p.id} onPress={() => setViewing(i)} onLongPress={() => remove(p)} activeOpacity={0.9}>
              <Photo uri={p.uri} style={{ width: tile, height: tile, borderRadius: 8, marginBottom: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.grid2}>
          {items.map((v, i) => (
            <TouchableOpacity key={v.id} style={styles.videoTile} onPress={() => setViewing(i)} onLongPress={() => remove(v)} activeOpacity={0.9}>
              {v.thumb ? (
                <Photo uri={v.thumb} style={StyleSheet.absoluteFill} fallback="🎬" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="film-outline" size={30} color="rgba(255,255,255,0.6)" />
                </View>
              )}
              <View style={styles.play}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
              <Text style={styles.dur}>{v.duration}</Text>
              <View style={styles.videoFoot}>
                <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  {v.title}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{v.views} visualizações</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {mine && items.length ? <Text style={styles.hint}>Segure uma {kind === 'videos' ? 'miniatura' : 'foto'} para remover.</Text> : null}
      <MediaViewer items={items} index={viewing} kind={kind} onClose={() => setViewing(null)} />
    </View>
  );
}

// Visualizador em tela cheia: toque nos lados para passar.
function MediaViewer({ items, index, kind, onClose }) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (index !== null) setI(index);
  }, [index]);
  const it = index !== null ? items[Math.min(i, items.length - 1)] : null;
  if (!it) return null;
  const go = (d) => setI((x) => Math.max(0, Math.min(items.length - 1, x + d)));
  const src = kind === 'videos' ? it.thumb : it.uri;
  return (
    // No computador: a foto numa moldura no meio da tela (não em tela cheia preta).
    <Modal visible animationType="fade" transparent={storyDesk()} onRequestClose={onClose} statusBarTranslucent><KeyboardLift style={[{ flex: 1 }, storyDesk() && { backgroundColor: 'rgba(241,235,221,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
      <View style={storyDesk() ? { width: '100%', maxWidth: 560, height: 560, maxHeight: '90%', backgroundColor: '#14120E', borderRadius: 22, overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderColor: '#EAD7A4' } : { flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        {src ? (
          <Image source={{ uri: src }} style={{ width: '100%', height: kind === 'videos' ? 260 : '75%' }} resizeMode="contain" />
        ) : (
          <View style={{ height: 260, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="film-outline" size={60} color="rgba(255,255,255,0.5)" />
          </View>
        )}
        {kind === 'videos' ? (
          <View style={{ alignItems: 'center', marginTop: 16, paddingHorizontal: 24 }}>
            <View style={[styles.play, { position: 'relative', width: 64, height: 64, borderRadius: 32, top: 0, left: 0 }]}>
              <Ionicons name="play" size={30} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 12 }}>{it.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              {it.duration} · {it.views} visualizações · o player de vídeo entra na próxima versão da demonstração
            </Text>
          </View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => go(-1)} activeOpacity={1} />
          <TouchableOpacity style={{ flex: 1 }} onPress={() => go(1)} activeOpacity={1} />
        </View>
        <View style={[styles.viewerTop, { top: insets.top + 10 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {i + 1} de {items.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.viewerClose} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardLift></Modal>
  );
}

// ───────────────────────── Abas do perfil ─────────────────────────

// Destaques + abas: (Posts) · Fotos · Vídeos · Depoimentos.
// Prévia: como o meu perfil aparece para os outros. O botão de cima troca entre "qualquer pessoa"
// e "um amigo", porque a privacidade pode mostrar coisas diferentes para cada um.
export function ProfilePreviewModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const [as, setAs] = useState('todos');
  useEffect(() => {
    if (visible) setAs('todos');
  }, [visible]);
  const u = state.user || { name: 'Você' };
  const prof = state.myProfile || {};
  const priv = state.privacy || {};
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}><KeyboardLift style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.pvHead, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.pvClose} accessibilityLabel="Fechar a prévia">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Seu perfil visto por</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {[['todos', 'Qualquer pessoa'], ['amigos', 'Um amigo']].map(([k, label]) => (
                <TouchableOpacity key={k} onPress={() => setAs(k)} style={[styles.pvPill, as === k && styles.pvPillOn]} accessibilityLabel={`Ver como ${label}`}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: as === k ? '#fff' : colors.text, fontWeight: '700', fontSize: 12.5 }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
          <View style={{ height: 96, borderRadius: 18, overflow: 'hidden', backgroundColor: coverTone(prof.coverTone).color, marginBottom: -40 }}>
            {!prof.cover && coverTone(prof.coverTone).art ? <ThemeArt theme={coverTone(prof.coverTone).art} /> : null}
            {prof.cover ? <Photo uri={prof.cover} style={{ width: '100%', height: '100%' }} /> : null}
          </View>
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            {prof.photo ? (
              <Photo uri={prof.photo} style={styles.pvAvatar} fallback="🙂" />
            ) : (
              <View style={[styles.pvAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.onPrimary, fontSize: 30, fontWeight: '800' }}>{String(u.name || 'V').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 19 }}>{u.name}</Text>
              <Ionicons name="checkmark-circle" size={17} color={colors.primary} style={{ marginLeft: 5 }} />
            </View>
            {prof.handle || prof.profession ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{[prof.handle ? '*' + prof.handle : '', prof.profession].filter(Boolean).join(' · ')}</Text> : null}
            {prof.bio && priv.exposed !== false ? <Text style={{ color: colors.text, textAlign: 'center', marginTop: 8 }}>{prof.bio}</Text> : null}
          </View>
          <ViewAs.Provider value={as}>
            <ProfileSocial ownerId="me" ownerName={u.name} />
          </ViewAs.Provider>
          <Text style={{ color: colors.muted, fontSize: 11.5, textAlign: 'center', marginTop: 16 }}>Isto é só uma prévia. Para mudar o que aparece, use "Quem vê o meu perfil" e o botão de mostrar depoimentos.</Text>
        </ScrollView>
      </View>
    </KeyboardLift></Modal>
  );
}

export function ProfileSocial({ ownerId, postsSlot, postsCount, ownerName, focus }) {
  const { state } = useStore();
  const viewAs = useContext(ViewAs);
  const own = ownerId === 'me';
  const mine = own && !viewAs;
  const g = own ? state.myGallery : galleryOf(ownerId);
  const nTest = state.testimonials.filter((t) => t.to === ownerId && t.status === 'aprovado').length;
  const nPending = mine ? state.testimonials.filter((t) => t.to === 'me' && t.status === 'pendente').length : 0;
  // Privacidade: o dono escolhe quem vê a vida social e o portfólio (todos, só amigos, só ele).
  // Na prévia ("ver como os outros veem") vale a privacidade que eu mesmo configurei.
  const priv = mine ? { exposed: true, social: 'todos', portfolio: 'todos' } : own ? { exposed: true, social: 'todos', portfolio: 'todos', ...(state.privacy || {}) } : privacyOf(ownerId);
  const isFriend = own ? viewAs === 'amigos' : state.friends[ownerId] === 'amigo';
  // Depoimentos: o dono pode esconder do perfil (ele mesmo continua vendo e aprovando).
  const showDep = mine || priv.testimonials !== false;
  const showSocial = canSee(priv.social, isFriend, priv.exposed);
  const showPortfolio = canSee(priv.portfolio, isFriend, priv.exposed);
  const created = own ? state.creations : creationsOf(ownerId);
  const socialCreations = created.filter((c) => c.dest && c.dest.social);
  const portfolio = created.filter((c) => c.dest && c.dest.portfolio);
  const tabs = [
    ...(showSocial && postsSlot ? [{ key: 'posts', label: 'Posts', icon: 'grid-outline', n: postsCount }] : []),
    ...(showSocial
      ? [
          // Mural: a linha do tempo que a pessoa monta (recados, posts curtidos, fotos e depoimentos).
          { key: 'mural', label: 'Mural', icon: 'albums-outline' },
          { key: 'photos', label: 'Fotos', icon: 'images-outline', n: g.photos.length },
          { key: 'videos', label: 'Vídeos', icon: 'videocam-outline', n: g.videos.length },
          ...(socialCreations.length || mine ? [{ key: 'criacoes', label: 'Criações', icon: 'sparkles-outline', n: socialCreations.length }] : []),
          ...(showDep ? [{ key: 'dep', label: 'Dep', icon: 'chatbox-ellipses-outline', n: nTest, alert: nPending }] : []),
        ]
      : []),
    ...(showPortfolio && (portfolio.length || mine) ? [{ key: 'portfolio', label: 'Portfólio', icon: 'briefcase-outline', n: portfolio.length }] : []),
  ];
  const [tab, setTab] = useState(tabs.length ? tabs[0].key : 'photos');
  // focus = { tab, n }: os números do topo do perfil (Fotos, Depoimentos) abrem a aba certa.
  useEffect(() => {
    if (focus && focus.tab) setTab(focus.tab);
  }, [focus && focus.n]);
  if (!tabs.length) return <LockedPanel name={ownerName} audience={priv.social} exposed={priv.exposed} />;
  const current = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <View>
      {showSocial ? <HighlightsRow ownerId={ownerId} /> : <LockedPanel name={ownerName} audience={priv.social} exposed={priv.exposed} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginBottom: 12 }}>
        {tabs.map((t) => {
          const on = current === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, on && styles.tabOn]} accessibilityLabel={t.label}>
              <Ionicons name={t.icon} size={15} color={on ? colors.onPrimary : colors.text} />
              <Text style={[styles.tabTxt, on && { color: colors.onPrimary }]}>
                {t.label}
                {t.n ? ` ${t.n}` : ''}
              </Text>
              {t.alert ? (
                <View style={styles.dot}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t.alert}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {current === 'posts' ? postsSlot : null}
      {current === 'photos' ? <MediaGallery ownerId={ownerId} kind="photos" /> : null}
      {current === 'videos' ? <MediaGallery ownerId={ownerId} kind="videos" /> : null}
      {current === 'criacoes' ? <CreationsGrid items={socialCreations} emptyText="Crie no Estúdio (aqui no Perfil) e marque Social para aparecer aqui." /> : null}
      {current === 'portfolio' ? <CreationsGrid items={portfolio} emptyText="Crie no Estúdio e marque Portfólio para montar sua vitrine de trabalhos." /> : null}
      {current === 'dep' ? <TestimonialsTab ownerId={ownerId} /> : null}
      {current === 'mural' ? <MuralTab ownerId={ownerId} ownerName={ownerName} mine={mine} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  depHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  depTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  depBox: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: 'transparent', ...soft },
  depBoxOn: { borderColor: colors.gold },
  depNum: { color: colors.text, fontSize: 24, fontWeight: '900' },
  depLabel: { color: colors.muted, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  depLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  depLineTxt: { color: colors.muted, fontSize: 11.5, flexShrink: 1 },
  showRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  switch: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderStrong, padding: 2, marginLeft: 8 },
  switchOn: { backgroundColor: colors.primary },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { marginLeft: 18 },
  pvHead: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  pvClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  pvPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.cardAlt, marginRight: 6 },
  pvPillOn: { backgroundColor: colors.text },
  pvAvatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#FFFFFF' },
  section: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  feedHead: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  writeBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.primary, marginLeft: 10 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(168,121,10,0.3)' },

  tCard: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 12, ...soft },
  tHead: { flexDirection: 'row', alignItems: 'center' },
  tWho: { color: colors.text, fontWeight: '700', fontSize: 14 },
  tVerb: { color: colors.muted, fontWeight: '500' },
  tTime: { color: colors.muted, fontSize: 11, marginTop: 2 },
  quote: { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, marginTop: 10, borderLeftWidth: 4, borderLeftColor: colors.gold },
  quoteText: { color: colors.text, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  counts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, minHeight: 4 },
  countTxt: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 6 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  actionTxt: { color: colors.muted, fontWeight: '700', fontSize: 13, marginLeft: 5 },
  comment: { backgroundColor: colors.cardAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 6 },
  more: { color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 6 },
  commentBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingLeft: 12, marginTop: 8, backgroundColor: colors.bg },
  commentInput: { flex: 1, color: colors.text, height: 40, fontSize: 14 },

  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  findBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 10, minHeight: 44, marginBottom: 8 },
  findInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 6, paddingVertical: 8 },
  findRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 9, marginBottom: 6, ...soft },
  toolsRow: { flexDirection: 'row', marginBottom: 10 },
  toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 10 },
  toolTxt: { color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 6 },
  toRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 10, ...soft },
  pick: { width: 72, alignItems: 'center', marginRight: 6 },
  area: { minHeight: 150, textAlignVertical: 'top', backgroundColor: colors.card, borderRadius: 14, padding: 12, color: colors.text, fontSize: 15, lineHeight: 21, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, height: 46, color: colors.text, fontSize: 15 },
  err: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDECEC', borderRadius: 10, padding: 10, marginTop: 8 },
  info: { flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginTop: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, marginTop: 14, paddingHorizontal: 14 },
  primaryTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  lineBtn: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  okCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  waiting: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, marginBottom: 10 },

  hl: { width: 76, alignItems: 'center', marginRight: 6 },
  hlRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  hlImg: { width: 60, height: 60, borderRadius: 30 },
  hlName: { color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 5, maxWidth: 72 },

  grid3: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pickTile: { width: '32%', aspectRatio: 0.6, borderRadius: 10, overflow: 'hidden', marginBottom: 8, backgroundColor: colors.cardAlt },
  check: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  tileTag: { position: 'absolute', left: 6, bottom: 6, color: '#fff', fontSize: 10, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
  videoTile: { width: '48.5%', aspectRatio: 16 / 11, borderRadius: 12, overflow: 'hidden', marginBottom: 10, backgroundColor: colors.dark },
  play: { position: 'absolute', top: '32%', left: '42%', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dur: { position: 'absolute', top: 6, right: 6, color: '#fff', fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  videoFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 7, backgroundColor: 'rgba(0,0,0,0.45)' },
  viewerTop: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  tab: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8 },
  tabOn: { backgroundColor: colors.text, borderColor: colors.text },
  tabTxt: { color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 5 },
  dot: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginLeft: 6, paddingHorizontal: 4 },
});
