// Conversa em grupo (amigos) com o servidor (server/src/routes/grupos.js).
// - NovoGrupo: nome + escolher amigos.
// - GrupoChat: as mensagens do grupo, emojis, participantes, pôr amigo, sair.
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { KeyboardLift } from '../keyboard';
import { useStore } from '../store';
import { api, connectEvents, mediaUrl } from '../api';
import { useServerFriends } from '../serverFriends';
import { colors } from '../theme';
import { Photo } from './ui';
import EmojiBar, { EmojiButton } from './EmojiBar';

const hora = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function Avatar({ u, size = 40 }) {
  return u.photo ? (
    <Photo uri={mediaUrl(u.photo)} style={{ width: size, height: size, borderRadius: size / 2 }} fallback="🙂" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{(u.name || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// Escolher amigos (para criar o grupo ou pôr mais gente).
function EscolherAmigos({ excluir = [], marcados, setMarcados }) {
  const { friends } = useServerFriends(true);
  const [q, setQ] = useState('');
  const lista = friends.filter((u) => !excluir.includes(u.id) && (!q.trim() || u.name.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <View>
      <TextInput value={q} onChangeText={setQ} placeholder="Buscar amigo" placeholderTextColor={colors.muted} style={st.busca} />
      {!friends.length ? <Text style={st.muted}>Adicione amigos para criar um grupo com eles.</Text> : null}
      {lista.map((u) => {
        const on = marcados.includes(u.id);
        return (
          <TouchableOpacity key={u.id} style={st.amigo} onPress={() => setMarcados(on ? marcados.filter((x) => x !== u.id) : [...marcados, u.id])} accessibilityLabel={`${on ? 'Tirar' : 'Pôr'} ${u.name}`}>
            <Avatar u={u} size={38} />
            <Text style={{ flex: 1, marginLeft: 10, color: colors.text, fontWeight: '700' }} numberOfLines={1}>{u.name}</Text>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.muted} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function NovoGrupo({ visible, onClose, onCriado }) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [marcados, setMarcados] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) {
      setNome('');
      setMarcados([]);
    }
  }, [visible]);
  const criar = () => {
    if (nome.trim().length < 2) return Alert.alert('Nome do grupo', 'Dê um nome para o grupo (ex.: Família).');
    if (!marcados.length) return Alert.alert('Participantes', 'Escolha pelo menos um amigo.');
    setBusy(true);
    api('POST', '/grupos', { name: nome.trim(), membros: marcados })
      .then((g) => (onClose(), onCriado && onCriado(g.id)))
      .catch((e) => Alert.alert('Não deu para criar', e.message))
      .finally(() => setBusy(false));
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityLabel="Fechar">
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[st.title, { flex: 1, marginLeft: 8 }]}>Novo grupo</Text>
          <TouchableOpacity onPress={criar} disabled={busy} style={[st.criar, busy && { opacity: 0.5 }]} accessibilityLabel="Criar grupo">
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{busy ? 'Criando…' : `Criar${marcados.length ? ` (${marcados.length + 1})` : ''}`}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <TextInput value={nome} onChangeText={setNome} placeholder="Nome do grupo (ex.: Família, Futebol de quinta)" placeholderTextColor={colors.muted} style={st.nome} maxLength={40} />
          <Text style={st.sec}>Quem participa (só amigos)</Text>
          <EscolherAmigos marcados={marcados} setMarcados={setMarcados} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export function GrupoChat({ id, onClose }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const me = state.user && state.user.serverId;
  const [g, setG] = useState(null);
  const [txt, setTxt] = useState('');
  const [emojis, setEmojis] = useState(false);
  const [info, setInfo] = useState(false);
  const [pondo, setPondo] = useState([]);
  const scroll = useRef(null);
  const load = () => api('GET', `/grupos/${id}`).then(setG).catch((e) => (Alert.alert('Grupo', e.message), onClose()));
  useEffect(() => {
    load();
    const stop = connectEvents((e) => e.type === 'grupo-msg' && e.data && e.data.id === id && load());
    return stop;
  }, [id]);
  useEffect(() => {
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: false }), 50);
  }, [g && g.msgs.length]);
  const enviar = () => {
    const t = txt.trim();
    if (!t) return;
    setTxt('');
    api('POST', `/grupos/${id}/msgs`, { text: t }).then(load).catch((e) => (setTxt(t), Alert.alert('Mensagem não enviada', e.message)));
  };
  const sair = () =>
    Alert.alert('Sair do grupo?', 'Você para de receber as mensagens deste grupo.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => api('DELETE', `/grupos/${id}/membros/${me}`).then(onClose).catch((e) => Alert.alert('Grupo', e.message)) },
    ]);
  const tirar = (u) =>
    Alert.alert(`Tirar ${u.name}?`, '', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => api('DELETE', `/grupos/${id}/membros/${u.id}`).then(load).catch((e) => Alert.alert('Grupo', e.message)) },
    ]);
  const adicionar = () =>
    Promise.all(pondo.map((uid) => api('POST', `/grupos/${id}/membros`, { userId: uid })))
      .then(() => (setPondo([]), load()))
      .catch((e) => Alert.alert('Grupo', e.message));
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardLift behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[st.head, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, marginLeft: 6 }} onPress={() => setInfo(true)} accessibilityLabel="Ver participantes">
            <Text style={st.title} numberOfLines={1}>{g ? g.name : 'Grupo'}</Text>
            <Text style={st.muted} numberOfLines={1}>{g ? g.membros.map((u) => (u.id === me ? 'Você' : u.name.split(' ')[0])).join(', ') : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setInfo(true)} style={{ padding: 6 }} accessibilityLabel="Participantes">
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {(g ? g.msgs : []).map((m) =>
            !m.from ? (
              <Text key={m.id} style={st.sistema}>{m.text}</Text>
            ) : (
              <View key={m.id} style={[st.bubble, m.from === me ? st.mine : st.theirs]}>
                {m.from !== me ? <Text style={st.quem}>{m.fromName}</Text> : null}
                <Text style={[st.text, m.from === me && { color: '#FBF8F1' }]}>{m.text}</Text>
                <Text style={[st.hora, m.from === me && { color: 'rgba(251,248,241,0.6)' }]}>{hora(m.at)}</Text>
              </View>
            )
          )}
        </ScrollView>
        {emojis ? <EmojiBar onPick={(e) => setTxt((t) => t + e)} style={{ marginHorizontal: 10, marginBottom: 4 }} /> : null}
        <View style={[st.bar, { paddingBottom: 10 + insets.bottom }]}>
          <EmojiButton open={emojis} onPress={() => setEmojis((v) => !v)} />
          <TextInput value={txt} onChangeText={setTxt} placeholder="Mensagem para o grupo" placeholderTextColor={colors.muted} style={st.input} multiline />
          <TouchableOpacity onPress={enviar} disabled={!txt.trim()} style={[st.send, !txt.trim() && { opacity: 0.5 }]} accessibilityLabel="Enviar">
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
        <Modal visible={info} animationType="slide" onRequestClose={() => setInfo(false)}>
          <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
            <View style={st.head}>
              <TouchableOpacity onPress={() => setInfo(false)} style={{ padding: 4 }} accessibilityLabel="Voltar">
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>{g ? `${g.name} · ${g.membros.length}` : ''}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
              {(g ? g.membros : []).map((u) => (
                <View key={u.id} style={st.amigo}>
                  <Avatar u={u} size={38} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{u.id === me ? 'Você' : u.name}</Text>
                    {u.admin ? <Text style={[st.muted, { color: colors.primary }]}>Administrador</Text> : null}
                  </View>
                  {g.souAdmin && u.id !== me ? (
                    <TouchableOpacity onPress={() => tirar(u)} style={{ padding: 6 }} accessibilityLabel={`Tirar ${u.name}`}>
                      <Ionicons name="remove-circle-outline" size={20} color={colors.danger || '#D64545'} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {g && g.souAdmin ? (
                <>
                  <Text style={st.sec}>Pôr mais amigos</Text>
                  <EscolherAmigos excluir={g.membros.map((u) => u.id)} marcados={pondo} setMarcados={setPondo} />
                  {pondo.length ? (
                    <TouchableOpacity onPress={adicionar} style={[st.criar, { alignSelf: 'stretch', alignItems: 'center', marginTop: 10, paddingVertical: 12 }]}>
                      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Pôr {pondo.length} no grupo</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
              <TouchableOpacity onPress={sair} style={{ marginTop: 24, alignSelf: 'center', padding: 10 }} accessibilityLabel="Sair do grupo">
                <Text style={{ color: colors.danger || '#D64545', fontWeight: '800' }}>Sair do grupo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </KeyboardLift>
    </Modal>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  title: { color: colors.text, fontWeight: '800', fontSize: 17 },
  muted: { color: colors.muted, fontSize: 12 },
  sec: { color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  busca: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, backgroundColor: '#fff', marginBottom: 6 },
  nome: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, backgroundColor: '#fff', fontSize: 16, fontWeight: '700' },
  amigo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  criar: { backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9 },
  sistema: { alignSelf: 'center', color: colors.muted, fontSize: 12, backgroundColor: colors.cardAlt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8, textAlign: 'center' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.text, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#F6EDD6', borderBottomLeftRadius: 6 },
  quem: { color: colors.primary, fontWeight: '800', fontSize: 12, marginBottom: 2 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  hora: { color: colors.muted, fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15, marginLeft: 4 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
