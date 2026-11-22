// Enviar (Reels, Trends, posts): a nossa central de amigos e conversas.
//  - No topo: com quem você mais conversa (as conversas mais recentes).
//  - Depois: os outros amigos.
//  - Pesquisar: entre os seus amigos, pelo nome ou *usuário.
// Só vai para quem já tem amizade vinculada (sugestões de amizade ficam na busca de pessoas).
// Marca uma ou mais pessoas e envia direto na conversa delas. Também dá para compartilhar fora do app.
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Share, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';
import { api, mediaUrl } from '../api';
import { conectado } from '../serverShop';
import { useServerFriends } from '../serverFriends';

export default function EnviarSheet({ visible, onClose, titulo, texto }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const on = conectado(state);
  const me = state.user && state.user.serverId;
  const { friends } = useServerFriends(on && visible);
  const [conversas, setConversas] = useState([]);
  const [q, setQ] = useState('');
  const [marcados, setMarcados] = useState({});
  const [sorteio, setSorteio] = useState(0); // muda a cada abertura: os outros amigos vêm em ordem aleatória
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMarcados({});
    setQ('');
    setSorteio(Math.random());
    if (!on) return;
    api('GET', '/conversations').then((l) => setConversas((l || []).map((c) => c.with).filter(Boolean))).catch(() => {});
  }, [visible, on]);

  // Quem aparece: só amigos. Primeiro os com quem você mais conversa, depois os outros amigos.
  const pessoas = useMemo(() => {
    const amigos = new Set(friends.map((u) => u.id));
    const termo = q.trim().replace(/^[@*#]/, '').toLowerCase();
    const bate = (u) => !termo || `${u.name || ''} ${u.username || ''}`.toLowerCase().includes(termo);
    const vistos = new Set();
    const out = [];
    const add = (u, tag) => {
      if (!u || !u.id || u.id === me || vistos.has(u.id) || !amigos.has(u.id) || !bate(u)) return;
      vistos.add(u.id);
      out.push({ ...u, tag });
    };
    conversas.forEach((u) => add(u, 'conversa'));
    // Os outros amigos em ordem aleatória (troca a cada vez que abre), para lembrar de quem não fala há tempo.
    const resto = friends.map((u, i) => [Math.sin((i + 1) * 9301 + sorteio * 49297) % 1, u]).sort((a, b) => a[0] - b[0]).map(([, u]) => u);
    resto.forEach((u) => add(u, 'amigo'));
    return out;
  }, [conversas, friends, q, sorteio]);

  const escolhidos = Object.keys(marcados).filter((k) => marcados[k]);
  const msg = texto || `Olha isso no Realyz: ${titulo || ''}`.trim();
  const enviar = async () => {
    if (!escolhidos.length) return;
    setEnviando(true);
    let ok = 0;
    for (const id of escolhidos) {
      try {
        await api('POST', '/messages', { toId: id, text: msg });
        ok += 1;
      } catch (e) {}
    }
    setEnviando(false);
    onClose();
    Alert.alert(ok ? 'Enviado ✅' : 'Não deu para enviar', ok ? `Foi para ${ok} ${ok === 1 ? 'pessoa' : 'pessoas'}, direto na conversa.` : 'Confira a internet e tente de novo.');
  };
  const fora = () => Share.share({ message: `${msg}\nRealyz · Pessoas reais. Negócios reais.` }).catch(() => {});

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} />
      <View style={[st.sheet, { paddingBottom: 12 + insets.bottom }]}>
        <View style={st.grab} />
        <View style={st.busca}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput style={st.buscaInput} value={q} onChangeText={setQ} placeholder="Pesquisar entre seus amigos" placeholderTextColor={colors.muted} autoCapitalize="none" />
        </View>
        {!on ? <Text style={st.meta}>Entre com a sua conta para enviar para os seus amigos. Você ainda pode compartilhar fora do app.</Text> : null}
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={st.grade} keyboardShouldPersistTaps="handled">
          {pessoas.map((u) => {
            const sel = !!marcados[u.id];
            const first = String(u.name || '').split(' ')[0];
            return (
              <TouchableOpacity key={u.id} style={st.pessoa} onPress={() => setMarcados((m) => ({ ...m, [u.id]: !m[u.id] }))} accessibilityLabel={`${sel ? 'Desmarcar' : 'Enviar para'} ${u.name}`}>
                <View>
                  {u.photo ? <Photo uri={mediaUrl(u.photo)} style={[st.foto, sel && st.fotoSel]} fallback="🙂" /> : <View style={[st.foto, st.letra, sel && st.fotoSel]}><Text style={{ color: colors.onPrimary, fontWeight: '900', fontSize: 20 }}>{first.charAt(0).toUpperCase()}</Text></View>}
                  {sel ? <View style={st.check}><Ionicons name="checkmark" size={13} color={colors.onPrimary} /></View> : null}
                </View>
                <Text style={st.nome} numberOfLines={1}>{first}</Text>
              </TouchableOpacity>
            );
          })}
          {on && !pessoas.length ? <Text style={[st.meta, { padding: 10 }]}>{q.trim() ? 'Nenhum amigo com esse nome.' : 'Seus amigos aparecem aqui. Adicione amigos pela busca de pessoas.'}</Text> : null}
        </ScrollView>
        {escolhidos.length ? (
          <TouchableOpacity style={st.btn} onPress={enviar} disabled={enviando} accessibilityLabel="Enviar">
            <Text style={st.btnText}>{enviando ? 'Enviando…' : escolhidos.length === 1 ? 'Enviar' : `Enviar para ${escolhidos.length}`}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={st.fora} onPress={fora} accessibilityLabel="Compartilhar fora do Realyz">
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>Compartilhar fora do Realyz</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 14, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 10 },
  busca: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F6', borderRadius: 14, paddingHorizontal: 12, marginBottom: 10 },
  buscaInput: { flex: 1, paddingVertical: 9, marginLeft: 6, color: colors.text },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  pessoa: { width: '25%', alignItems: 'center', marginBottom: 14 },
  foto: { width: 58, height: 58, borderRadius: 29 },
  fotoSel: { borderWidth: 3, borderColor: '#F5C331' },
  letra: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nome: { color: colors.text, fontSize: 12, marginTop: 4, maxWidth: 76 },
  tag: { color: colors.muted, fontSize: 10 },
  meta: { color: colors.muted, fontSize: 12.5, marginBottom: 8 },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  btnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  fora: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e5e5', marginTop: 4 },
});
