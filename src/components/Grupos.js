// Conversa em grupo (amigos, e grupos de página com até 1000 pessoas e moderação) com o servidor
// (server/src/routes/grupos.js).
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

const MODOS = [
  { k: 'livre', icon: 'chatbubbles-outline', t: 'Todos falam', d: 'Qualquer participante manda mensagem.' },
  { k: 'moderado', icon: 'shield-checkmark-outline', t: 'Moderado', d: 'Mensagem de participante só aparece depois que um moderador aprova.' },
  { k: 'avisos', icon: 'megaphone-outline', t: 'Só moderadores', d: 'Só a página e os moderadores falam (aulas, avisos, propostas).' },
];
const avisoModo = (g) =>
  g.modo === 'avisos' ? 'Só a página e os moderadores mandam mensagem neste grupo.' : g.modo === 'moderado' ? 'As mensagens passam por um moderador antes de aparecer para todos.' : null;

// Escolher seguidores da página para convidar (grupo de página).
function EscolherSeguidores({ paginaId, grupoId, marcados, setMarcados }) {
  const [lista, setLista] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    api('GET', `/paginas/${paginaId}/seguidores?grupo=${grupoId}`).then(setLista).catch(() => setLista([]));
  }, [paginaId, grupoId]);
  if (!lista) return <Text style={st.muted}>Carregando seguidores…</Text>;
  const livres = lista.filter((u) => !u.noGrupo && !u.convidado);
  const vistos = livres.filter((u) => !q.trim() || u.name.toLowerCase().includes(q.trim().toLowerCase()));
  const todos = vistos.length > 0 && vistos.every((u) => marcados.includes(u.id));
  return (
    <View>
      <TextInput value={q} onChangeText={setQ} placeholder="Buscar seguidor" placeholderTextColor={colors.muted} style={st.busca} />
      {!livres.length ? <Text style={st.muted}>{lista.length ? 'Todos os seguidores já estão no grupo ou convidados.' : 'A página ainda não tem seguidores.'}</Text> : null}
      {vistos.length > 1 ? (
        <TouchableOpacity onPress={() => setMarcados(todos ? marcados.filter((id) => !vistos.some((u) => u.id === id)) : [...new Set([...marcados, ...vistos.map((u) => u.id)])])} style={{ paddingVertical: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>{todos ? 'Desmarcar todos' : `Marcar todos (${vistos.length})`}</Text>
        </TouchableOpacity>
      ) : null}
      {vistos.slice(0, 300).map((u) => {
        const on = marcados.includes(u.id);
        return (
          <TouchableOpacity key={u.id} style={st.amigo} onPress={() => setMarcados(on ? marcados.filter((x) => x !== u.id) : [...marcados, u.id])} accessibilityLabel={`${on ? 'Tirar' : 'Marcar'} ${u.name}`}>
            <Avatar u={u} size={38} />
            <Text style={{ flex: 1, marginLeft: 10, color: colors.text, fontWeight: '700' }} numberOfLines={1}>{u.name}</Text>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.muted} />
          </TouchableOpacity>
        );
      })}
    </View>
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
  const [convidando, setConvidando] = useState([]);
  const scroll = useRef(null);
  const load = () => api('GET', `/grupos/${id}`).then(setG).catch((e) => (Alert.alert('Grupo', e.message), onClose()));
  useEffect(() => {
    load();
    const stop = connectEvents((e) => /^grupo-(msg|pendente)$/.test(e.type) && e.data && e.data.id === id && load());
    return stop;
  }, [id]);
  useEffect(() => {
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: false }), 50);
  }, [g && g.msgs.length]);
  const daPagina = !!(g && g.pagina);
  const calado = g && !g.souAdmin && (g.modo === 'avisos' || g.silenciadoAte);
  const enviar = () => {
    const t = txt.trim();
    if (!t) return;
    setTxt('');
    api('POST', `/grupos/${id}/msgs`, { text: t })
      .then((m) => (m && m.status === 'pendente' ? Alert.alert('Enviada para aprovação', 'Um moderador do grupo vai ver a sua mensagem antes de ela aparecer para todos.') : null, load()))
      .catch((e) => (setTxt(t), Alert.alert('Mensagem não enviada', e.message)));
  };
  const moderar = (m, acao) => api('POST', `/grupos/${id}/msgs/${m.id}/moderar`, { acao }).then(load).catch((e) => Alert.alert('Grupo', e.message));
  const segurarMsg = (m) => {
    if (!g || !g.souAdmin || !m.from) return;
    Alert.alert('Mensagem', m.text.slice(0, 120), [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Remover do grupo', style: 'destructive', onPress: () => moderar(m, 'remover') },
    ]);
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
  const silenciar = (u, horas) => api('POST', `/grupos/${id}/silenciar`, { userId: u.id, horas }).then(load).catch((e) => Alert.alert('Grupo', e.message));
  const opcoesMembro = (u) => {
    if (!g.souAdmin || u.id === me || u.dono) return;
    const botoes = [{ text: 'Voltar', style: 'cancel' }];
    if (g.souDono) botoes.push({ text: u.admin ? 'Tirar de moderador' : 'Tornar moderador', onPress: () => api('POST', `/grupos/${id}/moderadores`, { userId: u.id, moderador: !u.admin }).then(load).catch((e) => Alert.alert('Grupo', e.message)) });
    if (!u.admin) botoes.push({ text: 'Silenciar 24 h', onPress: () => silenciar(u, 24) });
    botoes.push({ text: 'Tirar do grupo', style: 'destructive', onPress: () => tirar(u) });
    Alert.alert(u.name, u.admin ? 'Moderador' : 'Participante', botoes);
  };
  const mudarModo = (k) => api('PATCH', `/grupos/${id}`, { modo: k }).then(load).catch((e) => Alert.alert('Grupo', e.message));
  const adicionar = () =>
    Promise.all(pondo.map((uid) => (daPagina ? null : api('POST', `/grupos/${id}/membros`, { userId: uid }))))
      .then(() => (daPagina ? api('POST', `/grupos/${id}/convites`, { userIds: pondo }) : null))
      .then((r) => (setPondo([]), r && Alert.alert('Convites enviados', `${r.enviados} ${r.enviados === 1 ? 'pessoa recebeu' : 'pessoas receberam'} o convite.`), load()))
      .catch((e) => Alert.alert('Grupo', e.message));
  const convidar = () =>
    api('POST', `/grupos/${id}/convites`, { userIds: convidando })
      .then((r) => (setConvidando([]), Alert.alert('Convites enviados', `${r.enviados} ${r.enviados === 1 ? 'pessoa recebeu' : 'pessoas receberam'} o convite. Entra quem aceitar.`), load()))
      .catch((e) => Alert.alert('Grupo', e.message));
  const sub = !g
    ? ''
    : daPagina
      ? `Grupo da página ${g.pagina.name} · ${g.total}/${g.max}`
      : g.membros.map((u) => (u.id === me ? 'Você' : u.name.split(' ')[0])).join(', ');
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardLift behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[st.head, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, marginLeft: 6 }} onPress={() => setInfo(true)} accessibilityLabel="Ver participantes">
            <Text style={st.title} numberOfLines={1}>{g ? g.name : 'Grupo'}</Text>
            <Text style={st.muted} numberOfLines={1}>{sub}</Text>
          </TouchableOpacity>
          {g && g.souAdmin && g.pendentes ? (
            <View style={st.pend}><Text style={st.pendT}>{g.pendentes} p/ aprovar</Text></View>
          ) : null}
          <TouchableOpacity onPress={() => setInfo(true)} style={{ padding: 6 }} accessibilityLabel="Participantes">
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {g && avisoModo(g) ? (
          <View style={st.modo}>
            <Ionicons name={g.modo === 'avisos' ? 'megaphone-outline' : 'shield-checkmark-outline'} size={14} color={colors.primary} />
            <Text style={st.modoT}>{avisoModo(g)}</Text>
          </View>
        ) : null}
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {(g ? g.msgs : []).map((m) =>
            !m.from ? (
              <Text key={m.id} style={st.sistema}>{m.text}</Text>
            ) : (
              <TouchableOpacity key={m.id} activeOpacity={0.9} onLongPress={() => segurarMsg(m)} delayLongPress={350} style={[st.bubble, m.from === me ? st.mine : st.theirs, m.status === 'pendente' && st.pendente]}>
                {m.from !== me ? <Text style={st.quem}>{m.fromName}</Text> : null}
                <Text style={[st.text, m.from === me && m.status !== 'pendente' && { color: '#FBF8F1' }]}>{m.text}</Text>
                {m.status === 'pendente' ? (
                  <View>
                    <Text style={st.espera}>{m.from === me ? 'Esperando um moderador aprovar' : 'Esperando aprovação'}</Text>
                    {g.souAdmin && m.from !== me ? (
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
                        <TouchableOpacity onPress={() => moderar(m, 'aprovar')} style={[st.modBtn, { backgroundColor: colors.success }]} accessibilityLabel="Aprovar mensagem">
                          <Text style={st.modBtnT}>Aprovar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moderar(m, 'recusar')} style={[st.modBtn, { backgroundColor: colors.danger }]} accessibilityLabel="Recusar mensagem">
                          <Text style={st.modBtnT}>Recusar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[st.hora, m.from === me && { color: 'rgba(251,248,241,0.6)' }]}>{hora(m.at)}</Text>
                )}
              </TouchableOpacity>
            )
          )}
        </ScrollView>
        {calado ? (
          <View style={[st.bar, { paddingBottom: 14 + insets.bottom, justifyContent: 'center' }]}>
            <Text style={[st.muted, { textAlign: 'center', paddingVertical: 8 }]}>
              {g.silenciadoAte ? `Um moderador silenciou você até ${hora(g.silenciadoAte)}.` : 'Só a página e os moderadores mandam mensagem aqui.'}
            </Text>
          </View>
        ) : (
          <>
            {emojis ? <EmojiBar onPick={(e) => setTxt((t) => t + e)} style={{ marginHorizontal: 10, marginBottom: 4 }} /> : null}
            <View style={[st.bar, { paddingBottom: 10 + insets.bottom }]}>
              <EmojiButton open={emojis} onPress={() => setEmojis((v) => !v)} />
              <TextInput value={txt} onChangeText={setTxt} placeholder="Mensagem para o grupo" placeholderTextColor={colors.muted} style={st.input} multiline />
              <TouchableOpacity onPress={enviar} disabled={!txt.trim()} style={[st.send, !txt.trim() && { opacity: 0.5 }]} accessibilityLabel="Enviar">
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </>
        )}
        <Modal visible={info} animationType="slide" onRequestClose={() => setInfo(false)}>
          <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
            <View style={st.head}>
              <TouchableOpacity onPress={() => setInfo(false)} style={{ padding: 4 }} accessibilityLabel="Voltar">
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[st.title, { flex: 1, marginLeft: 6 }]} numberOfLines={1}>{g ? `${g.name} · ${g.total || g.membros.length}${daPagina ? `/${g.max}` : ''}` : ''}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
              {g && g.descricao ? <Text style={[st.text, { marginBottom: 8 }]}>{g.descricao}</Text> : null}
              {g && g.souAdmin && daPagina ? (
                <>
                  <Text style={st.sec}>Quem pode falar</Text>
                  {MODOS.map((m) => (
                    <TouchableOpacity key={m.k} onPress={() => mudarModo(m.k)} style={[st.modoOp, g.modo === m.k && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]} accessibilityLabel={m.t}>
                      <Ionicons name={m.icon} size={22} color={g.modo === m.k ? colors.primary : colors.text} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.text, fontWeight: '800' }}>{m.t}</Text>
                        <Text style={st.muted}>{m.d}</Text>
                      </View>
                      {g.modo === m.k ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  ))}
                  <Text style={st.sec}>Convidar seguidores da página</Text>
                  <EscolherSeguidores paginaId={g.pagina.id} grupoId={g.id} marcados={convidando} setMarcados={setConvidando} />
                  {convidando.length ? (
                    <TouchableOpacity onPress={convidar} style={[st.criar, { alignSelf: 'stretch', alignItems: 'center', marginTop: 10, paddingVertical: 12 }]}>
                      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Convidar {convidando.length}</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
              <Text style={st.sec}>Participantes{g && g.souAdmin ? ' · toque para moderar' : ''}</Text>
              {(g ? g.membros : []).map((u) => (
                <TouchableOpacity key={u.id} style={st.amigo} activeOpacity={g.souAdmin ? 0.7 : 1} onPress={() => (daPagina ? opcoesMembro(u) : null)}>
                  <Avatar u={u} size={38} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{u.id === me ? 'Você' : u.name}</Text>
                    {u.dono && daPagina ? <Text style={[st.muted, { color: colors.primary }]}>Dono · {g.pagina.name}</Text> : u.admin ? <Text style={[st.muted, { color: colors.primary }]}>{daPagina ? 'Moderador' : 'Administrador'}</Text> : null}
                  </View>
                  {g.souAdmin && u.id !== me && !daPagina ? (
                    <TouchableOpacity onPress={() => tirar(u)} style={{ padding: 6 }} accessibilityLabel={`Tirar ${u.name}`}>
                      <Ionicons name="remove-circle-outline" size={20} color={colors.danger || '#D64545'} />
                    </TouchableOpacity>
                  ) : null}
                  {g.souAdmin && u.id !== me && daPagina && !u.dono ? <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} /> : null}
                </TouchableOpacity>
              ))}
              {g && g.souAdmin ? (
                <>
                  <Text style={st.sec}>{daPagina ? 'Convidar amigos' : 'Pôr mais amigos'}</Text>
                  <EscolherAmigos excluir={g.membros.map((u) => u.id)} marcados={pondo} setMarcados={setPondo} />
                  {pondo.length ? (
                    <TouchableOpacity onPress={adicionar} style={[st.criar, { alignSelf: 'stretch', alignItems: 'center', marginTop: 10, paddingVertical: 12 }]}>
                      <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{daPagina ? `Convidar ${pondo.length}` : `Pôr ${pondo.length} no grupo`}</Text>
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

// Grupos de uma página (na página: o dono cria e abre; quem foi convidado aceita).
export function GruposDaPagina({ pg, dono, T }) {
  const cor = T ? T.text : colors.text;
  const fraco = T ? T.muted : colors.muted;
  const linha = T ? T.line : colors.border;
  const [lista, setLista] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [criando, setCriando] = useState(false);
  const load = () => api('GET', `/paginas/${pg.id}/grupos`).then(setLista).catch(() => {});
  useEffect(() => {
    load();
  }, [pg.id]);
  const aceitar = (g) => api('POST', `/grupos/${g.id}/entrar`).then(() => (load(), setAberto(g.id))).catch((e) => Alert.alert('Grupo', e.message));
  if (!dono && !lista.length) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[st.title, { flex: 1, fontSize: 16, color: cor }]}>Grupos</Text>
        {dono ? (
          <TouchableOpacity onPress={() => setCriando(true)} style={st.criar} accessibilityLabel="Criar grupo da página">
            <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 13 }}>+ Criar grupo</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {dono && !lista.length ? <Text style={[st.muted, { color: fraco }]}>Crie um grupo para explicar propostas, estratégias e cursos para até 1.000 pessoas, com moderação.</Text> : null}
      {lista.map((g) => {
        const m = MODOS.find((x) => x.k === g.modo) || MODOS[0];
        return (
          <TouchableOpacity key={g.id} style={[st.grupoPg, { borderBottomColor: linha }]} activeOpacity={g.souMembro || g.convidado ? 0.8 : 1} onPress={() => (g.souMembro ? setAberto(g.id) : g.convidado ? aceitar(g) : null)} accessibilityLabel={`Grupo ${g.name}`}>
            <View style={st.grupoIc}>
              <Ionicons name={m.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: cor, fontWeight: '800' }} numberOfLines={1}>{g.name}</Text>
              <Text style={[st.muted, { color: fraco }]} numberOfLines={2}>{g.descricao ? `${g.descricao} · ` : ''}{g.membros}/{g.max} · {m.t}</Text>
            </View>
            <Text style={{ color: g.souMembro || g.convidado ? colors.primary : fraco, fontWeight: '800', fontSize: 12 }}>{g.souMembro ? 'Abrir' : g.convidado ? 'Aceitar convite' : 'Só por convite'}</Text>
          </TouchableOpacity>
        );
      })}
      <NovoGrupoPagina pg={pg} visible={criando} onClose={() => setCriando(false)} onCriado={(id) => (load(), setAberto(id))} />
      {aberto ? <GrupoChat id={aberto} onClose={() => (setAberto(null), load())} /> : null}
    </View>
  );
}

function NovoGrupoPagina({ pg, visible, onClose, onCriado }) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [modo, setModo] = useState('moderado');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) (setNome(''), setDesc(''), setModo('moderado'));
  }, [visible]);
  const criar = () => {
    if (nome.trim().length < 2) return Alert.alert('Nome do grupo', 'Dê um nome (ex.: Turma de Vendas, Propostas 2027).');
    setBusy(true);
    api('POST', `/paginas/${pg.id}/grupos`, { name: nome.trim(), descricao: desc.trim(), modo })
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
          <Text style={[st.title, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>Grupo de {pg.name}</Text>
          <TouchableOpacity onPress={criar} disabled={busy} style={[st.criar, busy && { opacity: 0.5 }]} accessibilityLabel="Criar grupo">
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{busy ? 'Criando…' : 'Criar'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <TextInput value={nome} onChangeText={setNome} placeholder="Nome do grupo" placeholderTextColor={colors.muted} style={st.nome} maxLength={40} />
          <TextInput value={desc} onChangeText={setDesc} placeholder="Do que é o grupo (curso, propostas, estratégias…)" placeholderTextColor={colors.muted} style={[st.nome, { marginTop: 10, fontSize: 14, fontWeight: '500', minHeight: 70 }]} maxLength={300} multiline />
          <Text style={st.sec}>Quem pode falar</Text>
          {MODOS.map((m) => (
            <TouchableOpacity key={m.k} onPress={() => setModo(m.k)} style={[st.modoOp, modo === m.k && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]} accessibilityLabel={m.t}>
              <Ionicons name={m.icon} size={22} color={modo === m.k ? colors.primary : colors.text} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{m.t}</Text>
                <Text style={st.muted}>{m.d}</Text>
              </View>
              {modo === m.k ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </TouchableOpacity>
          ))}
          <Text style={[st.muted, { marginTop: 12 }]}>Até 1.000 participantes. Você convida os seguidores da página e seus amigos; entra quem aceitar. Você pode pôr moderadores para ajudar.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Convites para grupos (aparece nas conversas enquanto houver convite esperando).
export function ConvitesGrupos({ onEntrou }) {
  const [lista, setLista] = useState([]);
  const load = () => api('GET', '/grupos/convites').then(setLista).catch(() => {});
  useEffect(() => {
    load();
    return connectEvents((e) => e.type === 'grupo-convite' && load());
  }, []);
  if (!lista.length) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[st.sec, { marginTop: 4 }]}>Convites para grupos</Text>
      {lista.map((c) => (
        <View key={c.id} style={st.grupoPg}>
          <View style={st.grupoIc}>
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{c.name}</Text>
            <Text style={st.muted} numberOfLines={2}>{c.pagina ? `Página ${c.pagina.name}` : `Convite de ${c.by}`} · {c.membros} participantes</Text>
          </View>
          <TouchableOpacity onPress={() => api('DELETE', `/grupos/${c.id}/convite`).then(load)} style={{ padding: 6 }} accessibilityLabel="Recusar convite">
            <Ionicons name="close-circle-outline" size={24} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => api('POST', `/grupos/${c.id}/entrar`).then(() => (load(), onEntrou && onEntrou(c.id))).catch((e) => Alert.alert('Grupo', e.message))} style={[st.criar, { marginLeft: 4 }]} accessibilityLabel="Aceitar convite">
            <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 13 }}>Entrar</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
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
  pend: { backgroundColor: colors.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  pendT: { color: '#fff', fontWeight: '800', fontSize: 11 },
  modo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.primaryLight },
  modoT: { color: colors.primaryDark, fontSize: 12, marginLeft: 6, flex: 1 },
  modoOp: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginBottom: 8 },
  pendente: { opacity: 0.75, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFF8E6' },
  espera: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', marginTop: 3 },
  modBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  modBtnT: { color: '#fff', fontWeight: '800', fontSize: 12 },
  grupoPg: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  grupoIc: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
