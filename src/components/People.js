import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo, Empty } from './ui';
import { members, memberById, postsOf, searchMembers } from '../people';
import { ChatModal } from '../screens/cliente/home/Social';
import { listenOnce, GlobalResults } from './Search';
import { ProfileSocial } from './SocialProfile';

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
      {label ? <Text style={[styles.btnText, compact && { fontSize: 12 }, { color: solid ? colors.onPrimary : colors.primary }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

// Perfil de outro membro. Abre por cima de qualquer tela (dispatch OPEN_PROFILE).
export function UserProfileModal() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [chat, setChat] = useState(null);
  useEffect(() => setChat(null), [state.viewProfile]);
  const m = state.viewProfile ? memberById(state.viewProfile) : null;
  if (!m) return null;
  const st = state.friends[m.id];
  const posts = postsOf(m);
  const close = () => dispatch({ type: 'CLOSE_PROFILE' });
  const friendsCount = m.friends + (st === 'amigo' ? 1 : 0);

  const contact = { id: m.id, name: m.name, status: st === 'amigo' ? 'amigo no Realys' : 'pessoa verificada', photo: m.photo };
  const conv = state.conversations.find((c) => c.contactId === m.id);
  const openChat = () => {
    if (!conv) dispatch({ type: 'UPDATE_CONVS', fn: (cs) => [{ id: 'm' + Date.now(), contactId: m.id, unread: 0, messages: [], extra: contact }, ...cs] });
    setChat(contact);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <Photo uri={`https://picsum.photos/seed/realys-cover-${m.id}/900/400`} style={{ width: '100%', height: 150 }} />
        <TouchableOpacity onPress={close} style={[styles.back, { top: insets.top + 10 }]} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.avatarRing}>
            <Photo uri={m.photo} style={styles.avatar} fallback="🙂" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.name}>{m.name}</Text>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.handle}>@{m.handle} · {m.city}</Text>
          <Text style={styles.bio}>{m.bio}</Text>

          <View style={styles.stats}>
            <Stat n={friendsCount} label="amigos" />
            <Stat n={m.mutual} label="em comum" />
            <Stat n={posts.length} label="posts" />
            <Stat n={state.testimonials.filter((t) => t.to === m.id && t.status === 'aprovado').length} label="depoimentos" />
          </View>

          {st === 'recebido' ? <Text style={styles.ask}>{m.name.split(' ')[0]} quer ser seu amigo no Realys.</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <FriendButton member={m} />
            </View>
            <TouchableOpacity style={styles.msgBtn} onPress={openChat} accessibilityLabel={`Mensagem para ${m.name}`}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>Mensagem</Text>
            </TouchableOpacity>
          </View>

          <ProfileSocial
            key={m.id}
            ownerId={m.id}
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
        onVideo={() => Alert.alert('Chamada de vídeo', `Ligando para ${m.name} pela Realys.`)}
      />
    </Modal>
  );
}

function Stat({ n, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{n.toLocaleString('pt-BR')}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

// Busca de pessoas na rede Realys, por nome ou @usuário.
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
  const requests = members.filter((m) => state.friends[m.id] === 'recebido');
  const suggestions = members.filter((m) => !state.friends[m.id]).sort((a, b) => b.mutual - a.mutual).slice(0, 4);
  const open = (m) => dispatch({ type: 'OPEN_PROFILE', id: m.id });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
              placeholder="Buscar pessoas por nome ou @usuário"
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
          {q.trim() ? (
            results.length ? (
              <>
                <Text style={styles.section}>{results.length} pessoa(s) encontrada(s)</Text>
                {results.map((m) => (
                  <PersonRow key={m.id} m={m} onOpen={() => open(m)} />
                ))}
              </>
            ) : (
              <>
                <Empty text={`Ninguém encontrado com "${q.trim()}". Confira o nome ou peça o @usuário da pessoa.`} />
                {searched ? <GlobalResults query={searched} navigate={navigate ? (go) => { onClose(); navigate(go); } : null} title="Achei em outras partes do Realys" hideEmpty /> : null}
              </>
            )
          ) : (
            <>
              {requests.length ? (
                <>
                  <Text style={styles.section}>Pedidos de amizade ({requests.length})</Text>
                  {requests.map((m) => (
                    <PersonRow key={m.id} m={m} onOpen={() => open(m)} />
                  ))}
                </>
              ) : null}
              <Text style={styles.section}>Pessoas que você talvez conheça</Text>
              {suggestions.map((m) => (
                <PersonRow key={m.id} m={m} onOpen={() => open(m)} />
              ))}
              <Text style={styles.tip}>Dica: peça para a pessoa te passar o nome ou o @usuário dela no Realys e digite aqui.</Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
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
          @{m.handle}
          {m.mutual ? ` · ${m.mutual} amigos em comum` : ` · ${m.city}`}
        </Text>
      </View>
      <FriendButton member={m} compact />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1.5 },
  btnSm: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  btnSolid: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnLine: { backgroundColor: colors.card, borderColor: colors.primary },
  btnText: { fontWeight: '800', marginLeft: 6, fontSize: 14 },
  back: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.gold, backgroundColor: colors.bg, marginTop: -52, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 94, height: 94, borderRadius: 47 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900' },
  handle: { color: colors.muted, marginTop: 2 },
  bio: { color: colors.text, marginTop: 8, lineHeight: 20 },
  stats: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, marginTop: 14 },
  ask: { color: colors.primaryDark, fontWeight: '700', marginTop: 12 },
  msgBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginLeft: 8 },
  section: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  post: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  postImg: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 12, marginLeft: 4 },
  searchHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, marginLeft: 10, height: 44 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 8 },
  rowAvatar: { width: 46, height: 46, borderRadius: 23 },
  tip: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 14 },
});
