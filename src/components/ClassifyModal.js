// Classificação das conversas (Família, Trabalho, Clientes... e as que a pessoa criar).
// - ClassifyModal: marcar uma ou mais classificações para um contato e criar classificação nova, com cor.
// - TagLine: as classificações do contato, pequenininhas e coloridas, embaixo do nome.
// - listasDe / buscaPorLista: para a busca achar os contatos pela classificação ("família").
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors } from '../theme';
import { moderateText } from '../moderation';

export const LISTAS_PADRAO = [
  { id: 'familia', name: 'Família', color: '#E5484D' },
  { id: 'trabalho', name: 'Trabalho', color: '#2F6FED' },
  { id: 'clientes', name: 'Clientes', color: '#1E9E63' },
];
export const CORES = ['#E5484D', '#2F6FED', '#1E9E63', '#B8860B', '#8E44AD', '#E67E22', '#0E9AA7', '#D6336C'];
const MAX = 12;
// Cor de cada classificação (as antigas, sem cor, ganham uma pela posição).
export const corDe = (l, i) => l.color || (LISTAS_PADRAO.find((p) => p.id === l.id) || {}).color || CORES[i % CORES.length];
export const useListas = () => {
  const { state } = useStore();
  return (state.chatLists || LISTAS_PADRAO).map((l, i) => ({ ...l, color: corDe(l, i) }));
};
export const listasDe = (state, contactId) => ((state.chatMeta || {})[contactId] || {}).lists || [];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// A busca bate com o nome de alguma classificação do contato? ("familia" acha quem está em Família)
export const buscaPorLista = (listas, ids, q) => {
  const t = norm(q);
  return !!t && listas.some((l) => ids.includes(l.id) && norm(l.name).startsWith(t));
};

export function TagLine({ contactId, style }) {
  const { state } = useStore();
  const listas = useListas();
  const ids = listasDe(state, contactId);
  const minhas = listas.filter((l) => ids.includes(l.id));
  if (!minhas.length) return null;
  return (
    <View style={[st.tags, style]}>
      {minhas.map((l) => (
        <Text key={l.id} numberOfLines={1} style={[st.tag, { color: l.color }]}>
          ● {l.name}
        </Text>
      ))}
    </View>
  );
}

export default function ClassifyModal({ visible, contactId, name, onClose }) {
  const { state, dispatch } = useStore();
  const listas = useListas();
  const ids = listasDe(state, contactId);
  const [nova, setNova] = useState(null); // texto da classificação nova (null = fechado)
  const [cor, setCor] = useState(CORES[(listas.length) % CORES.length]);
  const alternar = (id) => dispatch({ type: 'CHAT_META', contactId, patch: { lists: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] } });
  const criar = () => {
    const n = (nova || '').trim();
    if (n.length < 2) return Alert.alert('Nova classificação', 'Escreva o nome (ex.: Amigos da escola, Fornecedores).');
    if (listas.length >= MAX) return Alert.alert('Limite', `Dá para ter até ${MAX} classificações.`);
    if (listas.some((l) => norm(l.name) === norm(n))) return Alert.alert('Nova classificação', 'Já existe uma com esse nome.');
    const m = moderateText(n);
    if (!m.ok) return Alert.alert('Nova classificação', m.why);
    const id = 'l' + Date.now();
    dispatch({ type: 'CHAT_LIST_ADD', list: { id, name: n, color: cor } });
    if (contactId) dispatch({ type: 'CHAT_META', contactId, patch: { lists: [...ids, id] } });
    setNova(null);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={st.fundo}>
        <TouchableOpacity activeOpacity={1} style={st.caixa}>
          <Text style={st.title}>Classificar {String(name || '').split(' ')[0]}</Text>
          <Text style={st.sub}>Aparece embaixo do nome, na cor da classificação. Na busca, escreva o nome dela (ex.: família) para ver só esses contatos.</Text>
          {listas.map((l) => {
            const on = ids.includes(l.id);
            return (
              <TouchableOpacity key={l.id} onPress={() => alternar(l.id)} style={st.linha} accessibilityLabel={`${on ? 'Tirar de' : 'Pôr em'} ${l.name}`}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={l.color} />
                <View style={[st.bolinha, { backgroundColor: l.color }]} />
                <Text style={st.nome}>{l.name}</Text>
              </TouchableOpacity>
            );
          })}
          {nova === null ? (
            <TouchableOpacity onPress={() => setNova('')} style={st.linha} accessibilityLabel="Criar classificação">
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={[st.nome, { color: colors.primary }]}>Criar classificação</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 10 }}>
              <TextInput value={nova} onChangeText={setNova} autoFocus placeholder="Nome (ex.: Fornecedores)" placeholderTextColor={colors.muted} style={st.input} maxLength={24} onSubmitEditing={criar} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {CORES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCor(c)} style={[st.cor, { backgroundColor: c }, cor === c && st.corOn]} accessibilityLabel="Escolher cor" />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setNova(null)} style={{ padding: 10 }}>
                  <Text style={{ color: colors.muted, fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={criar} style={[st.criar, { backgroundColor: cor }]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={onClose} style={st.pronto} accessibilityLabel="Pronto">
            <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Pronto</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Etiquetas (botão 🏷️ ao lado da busca): escolher qual classificação ver (ou todas) e etiquetar um
// contato ou cliente digitando o nome dele.
// pessoas = [{ id, name }] (amigos e conversas); filtro = id da classificação vista (null = todas).
export function EtiquetasModal({ visible, onClose, pessoas = [], filtro, setFiltro }) {
  const { state } = useStore();
  const listas = useListas();
  const [nome, setNome] = useState('');
  const [quem, setQuem] = useState(null);
  const t = norm(nome);
  const achados = t ? pessoas.filter((p) => norm(p.name).includes(t)).slice(0, 6) : [];
  const conta = (id) => pessoas.filter((p) => listasDe(state, p.id).includes(id)).length;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={st.fundo}>
        <TouchableOpacity activeOpacity={1} style={[st.caixa, { maxHeight: '85%' }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={st.title}>Etiquetas</Text>
            <Text style={st.sub}>Escolha o que ver na lista de conversas.</Text>
            {[{ id: null, name: 'Todas as conversas', color: colors.text }, ...listas].map((l) => {
              const on = filtro === l.id;
              return (
                <TouchableOpacity key={l.id || 'todas'} onPress={() => (setFiltro(l.id), onClose())} style={st.linha} accessibilityLabel={`Ver ${l.name}`}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={l.color} />
                  {l.id ? <View style={[st.bolinha, { backgroundColor: l.color }]} /> : null}
                  <Text style={[st.nome, { flex: 1 }]}>{l.name}</Text>
                  {l.id ? <Text style={{ color: colors.muted, fontSize: 12 }}>{conta(l.id)}</Text> : null}
                </TouchableOpacity>
              );
            })}
            <Text style={[st.title, { fontSize: 15, marginTop: 16 }]}>Etiquetar contato ou cliente</Text>
            <Text style={st.sub}>Digite o nome e toque na pessoa para escolher a etiqueta.</Text>
            <TextInput value={nome} onChangeText={setNome} placeholder="Nome do contato ou cliente" placeholderTextColor={colors.muted} style={st.input} />
            {achados.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => setQuem(p)} style={st.linha} accessibilityLabel={`Etiquetar ${p.name}`}>
                <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text>
                  <TagLine contactId={p.id} />
                </View>
              </TouchableOpacity>
            ))}
            {t && !achados.length ? <Text style={[st.sub, { marginTop: 8 }]}>Ninguém com esse nome nas suas conversas e amigos.</Text> : null}
            <TouchableOpacity onPress={onClose} style={st.pronto} accessibilityLabel="Fechar">
              <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Pronto</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
      <ClassifyModal visible={!!quem} contactId={quem && quem.id} name={quem && quem.name} onClose={() => setQuem(null)} />
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: { backgroundColor: colors.card, borderRadius: 18, padding: 18, width: '100%', maxWidth: 380 },
  title: { color: colors.text, fontWeight: '800', fontSize: 17 },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 3, marginBottom: 8, lineHeight: 17 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  bolinha: { width: 8, height: 8, borderRadius: 4, marginLeft: 10 },
  nome: { color: colors.text, fontWeight: '700', marginLeft: 8, fontSize: 15 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, backgroundColor: '#fff' },
  cor: { width: 26, height: 26, borderRadius: 13, marginRight: 8, marginBottom: 6 },
  corOn: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  criar: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  pronto: { backgroundColor: colors.primary, borderRadius: 14, alignItems: 'center', paddingVertical: 12, marginTop: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 1 },
  tag: { fontSize: 11, fontWeight: '800', marginRight: 8 },
});
