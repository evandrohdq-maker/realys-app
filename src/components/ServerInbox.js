// Mensagens › conversas com contas reais (servidor): aparecem no topo da lista, com não lidas, e
// se atualizam sozinhas quando chega mensagem. Embaixo, os amigos reais com quem ainda não tem
// conversa, para começar uma com um toque.
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { api, connectEvents, API_URL } from '../api';
import { conectado } from '../serverShop';
import { useServerFriends } from '../serverFriends';
import { openServerProfile } from './ServerProfile';
import { Photo } from './ui';
import { colors } from '../theme';

const fotoDe = (p) => (p && p.startsWith('/') ? API_URL + p : p);
const quando = (at) => {
  const d = new Date(at);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString() ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : `${d.getDate()}/${d.getMonth() + 1}`;
};

function Avatar({ u, size = 46 }) {
  const first = (u.name || '?').charAt(0).toUpperCase();
  return u.photo ? (
    <Photo uri={fotoDe(u.photo)} style={{ width: size, height: size, borderRadius: size / 2 }} fallback="🙂" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: size / 2.6 }}>{first}</Text>
    </View>
  );
}

export default function ServerInbox() {
  const { state, dispatch } = useStore();
  const on = conectado(state);
  const { friends } = useServerFriends(on);
  const [convs, setConvs] = useState([]);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState(null);
  const me = state.user && state.user.serverId;
  const chatOpen = !!state.serverChat;
  useEffect(() => {
    if (!on) return undefined;
    const load = () => api('GET', '/conversations').then((l) => setConvs(l || [])).catch(() => {});
    load();
    const stop = connectEvents((e) => e.type === 'message' && load());
    const t = setInterval(load, 30000);
    return () => {
      stop();
      clearInterval(t);
    };
  }, [on, chatOpen]); // fechou a conversa: recarrega (lidas e última mensagem)
  if (!on) return null;
  const chat = (u) => dispatch({ type: 'OPEN_SERVER_CHAT', userId: u.id, name: u.name });
  const has = new Set(convs.map((c) => c.with && c.with.id));
  const match = (u) => !q.trim() || `${u.name} ${u.username || ''}`.toLowerCase().includes(q.trim().toLowerCase().replace(/^[*@]/, ''));
  // Filtro pelas listas (Família, Trabalho, Clientes...) que a pessoa marcou em cada conversa.
  const listas = state.chatLists || [{ id: 'familia', name: 'Família' }, { id: 'trabalho', name: 'Trabalho' }, { id: 'clientes', name: 'Clientes' }];
  const naLista = (id) => !filtro || (((state.chatMeta || {})[id] || {}).lists || []).includes(filtro);
  const lista = convs.filter((c) => c.with && match(c.with) && naLista(c.with.id));
  const novos = friends.filter((u) => !has.has(u.id) && match(u) && naLista(u.id));
  if (!convs.length && !friends.length) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={st.search}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar amigo ou conversa no Realyz" placeholderTextColor={colors.muted} style={st.input} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        {[{ id: null, name: 'Todas' }, ...listas].map((l) => (
          <TouchableOpacity key={l.id || 'todas'} onPress={() => setFiltro(l.id)} style={[st.filtro, filtro === l.id && st.filtroOn]} accessibilityLabel={`Mostrar ${l.name}`}>
            <Text numberOfLines={1} style={[st.filtroTxt, filtro === l.id && { color: colors.onPrimary }]}>{l.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {filtro && !lista.length && !novos.length ? <Text style={{ color: colors.muted, fontSize: 13, marginVertical: 8 }}>Ninguém nesta lista ainda. Abra uma conversa e toque na etiqueta 🏷️ para classificar.</Text> : null}
      {novos.length ? (
        <>
          <Text style={st.title}>Começar conversa</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            {novos.map((u) => (
              <TouchableOpacity key={u.id} style={st.chip} onPress={() => chat(u)} onLongPress={() => openServerProfile(u.id)} accessibilityLabel={`Conversar com ${u.name}. Segure para ver o perfil`}>
                <Avatar u={u} size={52} />
                <Text numberOfLines={1} style={st.chipName}>{(u.name || '').split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}
      {lista.length ? <Text style={st.title}>Conversas no Realyz</Text> : null}
      {lista.map((c) => (
        <TouchableOpacity key={c.with.id} style={st.row} onPress={() => chat(c.with)} activeOpacity={0.8} accessibilityLabel={`Conversa com ${c.with.name}`}>
          <TouchableOpacity onPress={() => openServerProfile(c.with.id)} accessibilityLabel={`Ver perfil de ${c.with.name}`}>
            <Avatar u={c.with} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: c.unread ? '800' : '700' }} numberOfLines={1}>{c.with.name}</Text>
              <Text style={{ color: c.unread ? colors.primary : colors.muted, fontSize: 11 }}>{quando(c.last.at)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ flex: 1, color: c.unread ? colors.text : colors.muted, fontSize: 13 }} numberOfLines={1}>
                {c.last.from === me ? 'Você: ' : ''}
                {c.last.text}
              </Text>
              {c.unread ? (
                <View style={st.badge}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{c.unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {q.trim() && !lista.length && !novos.length ? <Text style={{ color: colors.muted, marginVertical: 6 }}>Nenhum amigo com esse nome. Use a lupa lá em cima para achar e adicionar pessoas.</Text> : null}
      <Text style={[st.title, { marginTop: 12 }]}>Outras conversas</Text>
    </View>
  );
}

const st = StyleSheet.create({
  filtro: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginRight: 6, backgroundColor: colors.card },
  filtroOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroTxt: { color: colors.text, fontWeight: '700', fontSize: 13 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EFE6CC' },
  input: { flex: 1, paddingVertical: 9, marginLeft: 6, color: colors.text },
  title: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, marginBottom: 6, marginTop: 4 },
  chip: { alignItems: 'center', width: 66, marginRight: 8 },
  chipName: { color: colors.text, fontSize: 12, marginTop: 4, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 8 },
  badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
});
