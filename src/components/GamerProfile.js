// Perfil gamer: o cartão do gamer no perfil social (classe Gamer).
// Mostra os jogos (com nick e rank), as plataformas, o estilo/função, quando costuma jogar,
// se está procurando time e se aceita ser contratado (publi na live, coaching, partida, evento).
// O gamer edita em Perfil › Perfil gamer; amigos (e quem pode ver o social) veem no perfil dele.
// Fica salvo na conta junto com o perfil (src/profileSync.js › gamer).
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { Chip } from './ui';

export const PLATAFORMAS = ['Celular', 'PC', 'PlayStation', 'Xbox', 'Nintendo Switch'];
export const JOGOS_SUGERIDOS = ['Free Fire', 'Minecraft', 'Roblox', 'Fortnite', 'Valorant', 'League of Legends', 'Counter-Strike', 'EA FC', 'Call of Duty', 'PUBG', 'Clash Royale', 'GTA'];
export const ESTILOS = ['Casual', 'Competitivo', 'Streamer', 'Coach', 'Pro player', 'Narrador'];
export const GAMER_VAZIO = { jogos: [], plataformas: [], estilo: '', horarios: '', procuraTime: false, contratavel: false };

// Limpa o que vai para a conta (e o que o servidor devolve para quem vê).
export function gamerLimpo(g) {
  if (!g) return null;
  const s = (x, n) => String(x || '').slice(0, n);
  return {
    jogos: (g.jogos || []).filter((j) => j && j.nome).slice(0, 12).map((j) => ({ nome: s(j.nome, 40), nick: s(j.nick, 30), rank: s(j.rank, 30) })),
    plataformas: (g.plataformas || []).filter((p) => PLATAFORMAS.includes(p)),
    estilo: ESTILOS.includes(g.estilo) ? g.estilo : '',
    horarios: s(g.horarios, 60),
    procuraTime: !!g.procuraTime,
    contratavel: !!g.contratavel,
  };
}

// Editor (Perfil › Perfil gamer).
export function GamerPanel({ navigate }) {
  const { state, dispatch } = useStore();
  const g = { ...GAMER_VAZIO, ...(state.gamer || {}) };
  const [novo, setNovo] = useState('');
  const set = (patch) => dispatch({ type: 'SET_GAMER', gamer: patch });
  const temJogo = (n) => g.jogos.some((j) => j.nome.toLowerCase() === n.toLowerCase());
  const addJogo = (n) => {
    const nome = String(n || '').trim();
    if (!nome) return;
    if (temJogo(nome)) return;
    if (g.jogos.length >= 12) return Alert.alert('Jogos', 'Até 12 jogos no perfil.');
    set({ jogos: [...g.jogos, { nome, nick: '', rank: '' }] });
    setNovo('');
  };
  const upJogo = (i, patch) => set({ jogos: g.jogos.map((j, k) => (k === i ? { ...j, ...patch } : j)) });
  const tirar = (i) => set({ jogos: g.jogos.filter((_, k) => k !== i) });
  const toggleP = (p) => set({ plataformas: g.plataformas.includes(p) ? g.plataformas.filter((x) => x !== p) : [...g.plataformas, p] });

  return (
    <View>
      <Text style={st.h}>Seus jogos</Text>
      {g.jogos.map((j, i) => (
        <View key={j.nome} style={st.jogo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="game-controller-outline" size={16} color={colors.primary} />
            <Text style={st.jogoNome} numberOfLines={1}>{j.nome}</Text>
            <TouchableOpacity onPress={() => tirar(i)} accessibilityLabel={`Tirar ${j.nome}`}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TextInput style={[st.input, { flex: 1, marginRight: 6 }]} value={j.nick} onChangeText={(t) => upJogo(i, { nick: t })} placeholder="Nick no jogo" placeholderTextColor={colors.muted} />
            <TextInput style={[st.input, { flex: 1 }]} value={j.rank} onChangeText={(t) => upJogo(i, { rank: t })} placeholder="Rank / elo" placeholderTextColor={colors.muted} />
          </View>
        </View>
      ))}
      <View style={st.wrap}>
        {JOGOS_SUGERIDOS.filter((n) => !temJogo(n)).slice(0, 8).map((n) => (
          <View key={n} style={st.chipBox}>
            <Chip label={`+ ${n}`} onPress={() => addJogo(n)} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput style={[st.input, { flex: 1 }]} value={novo} onChangeText={setNovo} onSubmitEditing={() => addJogo(novo)} placeholder="Outro jogo" placeholderTextColor={colors.muted} />
        <TouchableOpacity onPress={() => addJogo(novo)} style={{ padding: 8 }} accessibilityLabel="Adicionar jogo">
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={st.h}>Onde você joga</Text>
      <View style={st.wrap}>
        {PLATAFORMAS.map((p) => (
          <View key={p} style={st.chipBox}>
            <Chip label={p} active={g.plataformas.includes(p)} onPress={() => toggleP(p)} />
          </View>
        ))}
      </View>

      <Text style={st.h}>Seu estilo</Text>
      <View style={st.wrap}>
        {ESTILOS.map((e) => (
          <View key={e} style={st.chipBox}>
            <Chip label={e} active={g.estilo === e} onPress={() => set({ estilo: g.estilo === e ? '' : e })} />
          </View>
        ))}
      </View>

      <Text style={st.h}>Quando costuma jogar</Text>
      <TextInput style={st.input} value={g.horarios} onChangeText={(t) => set({ horarios: t })} placeholder="Ex.: noites e fim de semana" placeholderTextColor={colors.muted} />

      <View style={st.row}>
        <Text style={st.rowText}>Procurando time</Text>
        <Switch value={g.procuraTime} onValueChange={(v) => set({ procuraTime: v })} />
      </View>
      <View style={st.row}>
        <Text style={st.rowText}>Aceito ser contratado (publi, coaching, partida, evento)</Text>
        <Switch value={g.contratavel} onValueChange={(v) => set({ contratavel: v })} />
      </View>
      {g.contratavel ? <Text style={st.small}>Para receber pedidos pelo Realyz, faça o cadastro de prestador no segmento Gamer, com os seus preços.</Text> : null}

      <View style={[st.wrap, { marginTop: 10 }]}>
        <TouchableOpacity style={st.link} onPress={() => navigate && navigate({ tab: 'arena' })} accessibilityLabel="Abrir a Arena Gamer">
          <Ionicons name="headset-outline" size={16} color={colors.primary} />
          <Text style={st.linkText}>Arena Gamer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.link} onPress={() => navigate && navigate({ tab: 'home', top: 'lives', live: 'gamers' })} accessibilityLabel="Lives de gamers">
          <Ionicons name="videocam-outline" size={16} color={colors.primary} />
          <Text style={st.linkText}>Lives de gamers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Cartão que os outros veem no perfil.
export function GamerCard({ g }) {
  const x = gamerLimpo(g);
  if (!x || (!x.jogos.length && !x.plataformas.length && !x.estilo)) return null;
  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name="game-controller" size={18} color="#7B6CF6" />
        <Text style={[st.h, { marginTop: 0, marginLeft: 6, flex: 1 }]}>Gamer{x.estilo ? ` · ${x.estilo}` : ''}</Text>
        {x.procuraTime ? <Text style={st.tag}>Procurando time</Text> : null}
      </View>
      {x.jogos.map((j) => (
        <Text key={j.nome} style={st.linha} numberOfLines={1}>
          🎮 <Text style={{ fontWeight: '800', color: colors.text }}>{j.nome}</Text>{j.nick ? ` · ${j.nick}` : ''}{j.rank ? ` · ${j.rank}` : ''}
        </Text>
      ))}
      {x.plataformas.length ? <Text style={st.small}>Joga em: {x.plataformas.join(', ')}</Text> : null}
      {x.horarios ? <Text style={st.small}>Costuma jogar: {x.horarios}</Text> : null}
      {x.contratavel ? <Text style={[st.small, { color: '#7B6CF6', fontWeight: '700' }]}>Aceita publi, coaching e partidas pelo Realyz</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  h: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 12, marginBottom: 6 },
  jogo: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  jogoNome: { color: colors.text, fontWeight: '800', marginLeft: 6, flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, backgroundColor: '#fff' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chipBox: { marginRight: 6, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  rowText: { color: colors.text, flex: 1, marginRight: 8 },
  small: { color: colors.muted, fontSize: 12.5, marginTop: 4 },
  link: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 6, paddingVertical: 4 },
  linkText: { color: colors.primary, fontWeight: '700', marginLeft: 5 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#E4E0FF' },
  tag: { color: '#2E8B57', fontWeight: '800', fontSize: 11.5 },
  linha: { color: colors.muted, marginBottom: 3 },
});
