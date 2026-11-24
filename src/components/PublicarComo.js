// "Publicar como": escolher se curto, comento ou mando depoimento como eu ou como uma das minhas
// páginas. ComoChip = a fotinho (com o nome, opcional) que abre a lista. ComoSheet = a lista.
// Quem não tem página não vê nada disso: tudo sai como a própria pessoa.
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo } from './ui';
import { usePublicarComo, full } from '../serverPaginas';

// Foto de quem sou agora: a página escolhida ou a minha.
export function useEuAgora() {
  const { state } = useStore();
  const { paginas, como, escolher } = usePublicarComo(true);
  const me = state.myProfile || {};
  const eu = { id: null, name: (state.user && state.user.name) || me.name || 'Você', photo: me.photo || null };
  const agora = como ? { id: como.id, name: como.name, photo: full(como.photo || como.cover), pagina: true, anon: como.anon } : eu;
  return { eu, agora, paginas, escolher, temPaginas: paginas.length > 0 };
}

export function ComoSheet({ visible, onClose, onPick, titulo = 'Publicar como' }) {
  const insets = useSafeAreaInsets();
  const { eu, agora, paginas, escolher } = useEuAgora();
  const pick = (id) => {
    escolher(id);
    onClose && onClose();
    onPick && onPick(id);
  };
  const Linha = ({ id, name, photo, sub, on }) => (
    <TouchableOpacity style={st.row} onPress={() => pick(id)} accessibilityLabel={`${titulo}: ${name}`}>
      <Photo uri={photo} style={st.av} fallback={id ? '📄' : '🙂'} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={st.name} numberOfLines={1}>{name}</Text>
        <Text style={st.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.borderStrong} />
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={st.back} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={st.handle} />
          <Text style={st.title}>{titulo}</Text>
          <Text style={st.hint}>Curtidas, comentários e depoimentos saem com esse nome até você trocar.</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            <Linha id={null} name={eu.name} photo={eu.photo} sub="Seu perfil social" on={!agora.pagina} />
            {paginas.map((p) => (
              <Linha key={p.id} id={p.id} name={p.name} photo={full(p.photo || p.cover)} sub={p.anon ? 'Página anônima · seu nome não aparece' : `Página · *${p.handle}`} on={agora.pagina && agora.id === p.id} />
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Fotinho de quem sou agora (com setinha quando tenho páginas). Toque = trocar.
export function ComoChip({ size = 36, mostrarNome = false, style }) {
  const { agora, temPaginas } = useEuAgora();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <TouchableOpacity disabled={!temPaginas} onPress={() => setOpen(true)} style={[st.chip, style]} accessibilityLabel={temPaginas ? `Publicando como ${agora.name}. Toque para trocar` : agora.name}>
        <Photo uri={agora.photo} style={{ width: size, height: size, borderRadius: size / 2 }} fallback={agora.pagina ? '📄' : '🙂'} />
        {mostrarNome ? <Text style={st.chipName} numberOfLines={1}>{agora.name}</Text> : null}
        {temPaginas ? <Ionicons name="chevron-down" size={14} color={colors.muted} style={{ marginLeft: 2 }} /> : null}
      </TouchableOpacity>
      <ComoSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  av: { width: 44, height: 44, borderRadius: 22 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  chip: { flexDirection: 'row', alignItems: 'center' },
  chipName: { color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 6, maxWidth: 160 },
});
