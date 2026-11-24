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
import ClassifyModal, { TagLine, EtiquetasModal, useListas, listasDe, buscaPorLista } from './ClassifyModal';
import { NovoGrupo, GrupoChat, ConvitesGrupos } from './Grupos';
import { aCada } from '../ritmo';

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
  const [classificar, setClassificar] = useState(null); // { id, name }
  const [etiquetas, setEtiquetas] = useState(false);
  const [filtro, setFiltro] = useState(null); // classificação escolhida no botão de etiqueta ('__grupos' = só grupos)
  const [grupos, setGrupos] = useState([]);
  const [novoGrupo, setNovoGrupo] = useState(false);
  const [grupoAberto, setGrupoAberto] = useState(null);
  const listas = useListas();
  const me = state.user && state.user.serverId;
  const chatOpen = !!state.serverChat;
  useEffect(() => {
    if (!on) return undefined;
    const load = () => {
      api('GET', '/conversations').then((l) => setConvs(l || [])).catch(() => {});
      api('GET', '/grupos').then((l) => setGrupos(l || [])).catch(() => {});
    };
    load();
    const stop = connectEvents((e) => (e.type === 'message' || /^grupo-/.test(e.type)) && load());
    const t = aCada(load, 30000);
    return () => {
      stop();
      t.parar();
    };
  }, [on, chatOpen, grupoAberto]); // fechou a conversa: recarrega (lidas e última mensagem)
  if (!on) return null;
  const chat = (u) => dispatch({ type: 'OPEN_SERVER_CHAT', userId: u.id, name: u.name });
  const has = new Set(convs.map((c) => c.with && c.with.id));
  // Busca pelo nome, pelo *usuário ou pela classificação ("família" mostra só quem está em Família).
  const match = (u) => !q.trim() || `${u.name} ${u.username || ''}`.toLowerCase().includes(q.trim().toLowerCase().replace(/^[*@]/, '')) || buscaPorLista(listas, listasDe(state, u.id), q);
  const soGrupos = filtro === '__grupos';
  const naEtiqueta = (id) => !filtro || (!soGrupos && listasDe(state, id).includes(filtro));
  const gruposVistos = grupos.filter((g) => (!filtro || soGrupos) && (!q.trim() || g.name.toLowerCase().includes(q.trim().toLowerCase())));
  const lista = convs.filter((c) => c.with && match(c.with) && naEtiqueta(c.with.id));
  const novos = friends.filter((u) => !has.has(u.id) && match(u) && naEtiqueta(u.id));
  const pessoas = [...convs.filter((c) => c.with).map((c) => c.with), ...friends.filter((u) => !has.has(u.id))];
  const vendo = soGrupos ? { id: '__grupos', name: 'Grupos', color: colors.primary } : filtro ? listas.find((l) => l.id === filtro) : null;
  if (!convs.length && !friends.length && !grupos.length) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={st.search}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar nome ou etiqueta (ex.: família)" placeholderTextColor={colors.muted} style={st.input} />
        {/* Etiquetas: escolher o que ver (Família, Trabalho, Clientes...) e etiquetar alguém pelo nome. */}
        <TouchableOpacity onPress={() => setNovoGrupo(true)} hitSlop={8} style={{ paddingHorizontal: 6 }} accessibilityLabel="Novo grupo">
          <Ionicons name="people-circle-outline" size={21} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEtiquetas(true)} hitSlop={8} style={{ paddingHorizontal: 6 }} accessibilityLabel="Etiquetas">
          <Ionicons name={filtro ? 'pricetag' : 'pricetag-outline'} size={19} color={vendo ? vendo.color : colors.primary} />
        </TouchableOpacity>
      </View>
      {vendo ? (
        <TouchableOpacity onPress={() => setFiltro(null)} style={[st.vendo, { borderColor: vendo.color }]} accessibilityLabel={`Parar de filtrar por ${vendo.name}`}>
          <Text style={{ color: vendo.color, fontWeight: '800', fontSize: 12 }}>● {vendo.name}</Text>
          <Ionicons name="close" size={14} color={vendo.color} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ) : null}
      <EtiquetasModal visible={etiquetas} onClose={() => setEtiquetas(false)} pessoas={pessoas} filtro={filtro} setFiltro={setFiltro} grupos={grupos.length} />
      <NovoGrupo visible={novoGrupo} onClose={() => setNovoGrupo(false)} onCriado={(id) => setGrupoAberto(id)} />
      {grupoAberto ? <GrupoChat id={grupoAberto} onClose={() => setGrupoAberto(null)} /> : null}
      <ConvitesGrupos onEntrou={(id) => setGrupoAberto(id)} />
      {gruposVistos.length ? <Text style={st.title}>Grupos</Text> : null}
      {gruposVistos.map((g) => (
        <TouchableOpacity key={g.id} style={st.row} onPress={() => setGrupoAberto(g.id)} activeOpacity={0.8} accessibilityLabel={`Grupo ${g.name}`}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#0B1124', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people" size={22} color="#F5C331" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: g.unread ? '800' : '700' }} numberOfLines={1}>{g.name}</Text>
              {g.last ? <Text style={{ color: g.unread ? colors.primary : colors.muted, fontSize: 11 }}>{quando(g.last.at)}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ flex: 1, color: g.unread ? colors.text : colors.muted, fontSize: 13 }} numberOfLines={1}>
                {g.last ? `${g.last.from ? (g.last.from === me ? 'Você' : (g.last.fromName || '').split(' ')[0]) + ': ' : ''}${g.last.text}` : `${g.membros} participantes`}
              </Text>
              {g.unread ? (
                <View style={st.badge}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{g.unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {filtro && !lista.length && !novos.length && !gruposVistos.length ? <Text style={{ color: colors.muted, fontSize: 13, marginVertical: 8 }}>{soGrupos ? 'Você ainda não está em nenhum grupo. Toque em 👥 ao lado da busca para criar um.' : 'Ninguém com essa etiqueta ainda. Toque na etiqueta 🏷️ e digite o nome para etiquetar.'}</Text> : null}
      {novos.length ? (
        <>
          <Text style={st.title}>Começar conversa</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            {novos.map((u) => (
              <TouchableOpacity key={u.id} style={st.chip} onPress={() => chat(u)} onLongPress={() => openServerProfile(u.id)} accessibilityLabel={`Conversar com ${u.name}. Segure para ver o perfil`}>
                <Avatar u={u} size={52} />
                <Text numberOfLines={1} style={st.chipName}>{(u.name || '').split(' ')[0]}</Text>
                <TagLine contactId={u.id} style={{ justifyContent: 'center' }} />
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
              <TouchableOpacity onPress={() => setClassificar({ id: c.with.id, name: c.with.name })} hitSlop={8} style={{ marginLeft: 8 }} accessibilityLabel={`Classificar ${c.with.name}`}>
                <Ionicons name={listasDe(state, c.with.id).length ? 'pricetag' : 'pricetag-outline'} size={15} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {/* Classificação embaixo do nome, pequenininha e na cor dela. */}
            <TagLine contactId={c.with.id} />
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
      <ClassifyModal visible={!!classificar} contactId={classificar && classificar.id} name={classificar && classificar.name} onClose={() => setClassificar(null)} />
      {q.trim() && !lista.length && !novos.length ? <Text style={{ color: colors.muted, marginVertical: 6 }}>Nenhum amigo com esse nome. Use a lupa lá em cima para achar e adicionar pessoas.</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  vendo: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
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
