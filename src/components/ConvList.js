// Conversas organizadas: listas para classificar contatos (Família, Trabalho, Clientes ou as que
// a pessoa criar), fixar no topo, não lidas e arquivar.
// Tocar abre a conversa. Segurar abre as opções: listas, fixar, arquivar.
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { Photo } from './ui';

export const DEFAULT_CHAT_LISTS = [
  { id: 'familia', name: 'Família' },
  { id: 'trabalho', name: 'Trabalho' },
  { id: 'clientes', name: 'Clientes' },
];
export const MAX_CHAT_LISTS = 12;

export default function ConvList({ convs, contactOf, onChat }) {
  const { state, dispatch } = useStore();
  const lists = state.chatLists || DEFAULT_CHAT_LISTS;
  const meta = state.chatMeta || {};
  const [filter, setFilter] = useState('todas'); // todas · naolidas · arquivadas · id da lista
  const [menu, setMenu] = useState(null); // conversa com as opções abertas
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [q, setQ] = useState('');

  const rows = useMemo(
    () =>
      convs
        .map((c) => ({ c, ct: contactOf(c.contactId), m: meta[c.contactId] || {} }))
        .filter((r) => r.ct),
    [convs, meta, contactOf]
  );
  const archivedCount = rows.filter((r) => r.m.archived).length;
  const unreadCount = rows.filter((r) => !r.m.archived && r.c.unread).length;
  const shown = rows
    .filter((r) => (filter === 'arquivadas' ? r.m.archived : !r.m.archived))
    .filter((r) => (filter === 'naolidas' ? r.c.unread : filter === 'todas' || filter === 'arquivadas' ? true : (r.m.lists || []).includes(filter)))
    .filter((r) => !q.trim() || r.ct.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.m.pinned ? 1 : 0) - (a.m.pinned ? 1 : 0));

  const chips = [
    { key: 'todas', label: 'Todas' },
    { key: 'naolidas', label: unreadCount ? `Não lidas ${unreadCount}` : 'Não lidas' },
    ...lists.map((l) => ({ key: l.id, label: l.name, list: l })),
  ];
  const set = (contactId, patch) => dispatch({ type: 'CHAT_META', contactId, patch });
  const toggleList = (contactId, listId) => {
    const cur = (meta[contactId] || {}).lists || [];
    set(contactId, { lists: cur.includes(listId) ? cur.filter((x) => x !== listId) : [...cur, listId] });
  };
  const createList = () => {
    const n = name.trim();
    if (!n) return;
    if (lists.some((l) => l.name.toLowerCase() === n.toLowerCase())) return Alert.alert('Essa lista já existe', 'Escolha outro nome.');
    if (lists.length >= MAX_CHAT_LISTS) return Alert.alert('Limite de listas', `Dá para ter até ${MAX_CHAT_LISTS} listas.`);
    const id = 'l' + Date.now();
    dispatch({ type: 'CHAT_LIST_ADD', list: { id, name: n } });
    if (menu) toggleList(menu.c.contactId, id);
    setName('');
    setCreating(false);
  };
  const removeList = (l) =>
    Alert.alert(`Apagar a lista "${l.name}"?`, 'As conversas continuam aqui, só saem dessa lista.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { dispatch({ type: 'CHAT_LIST_REMOVE', id: l.id }); if (filter === l.id) setFilter('todas'); } },
    ]);
  const menuMeta = menu ? meta[menu.c.contactId] || {} : {};

  return (
    <View>
      <View style={st.search}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar conversa" placeholderTextColor={colors.muted} style={st.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingRight: 8 }}>
        {chips.map((ch) => (
          <TouchableOpacity
            key={ch.key}
            onPress={() => setFilter(ch.key)}
            onLongPress={ch.list ? () => removeList(ch.list) : undefined}
            style={[st.chip, filter === ch.key && st.chipOn]}
            accessibilityLabel={`Filtro ${ch.label}${ch.list ? '. Segure para apagar a lista' : ''}`}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.chipText, filter === ch.key && st.chipTextOn]}>{ch.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setCreating(true)} style={[st.chip, { paddingHorizontal: 10 }]} accessibilityLabel="Criar lista">
          <Ionicons name="add" size={17} color={colors.text} />
        </TouchableOpacity>
      </ScrollView>

      {filter !== 'arquivadas' && archivedCount ? (
        <TouchableOpacity style={st.archivedRow} onPress={() => setFilter('arquivadas')} accessibilityLabel={`Arquivadas, ${archivedCount}`}>
          <Ionicons name="archive-outline" size={18} color={colors.menu} />
          <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 10, flex: 1 }}>Arquivadas</Text>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>{archivedCount}</Text>
        </TouchableOpacity>
      ) : null}
      {filter === 'arquivadas' ? (
        <TouchableOpacity style={st.archivedRow} onPress={() => setFilter('todas')} accessibilityLabel="Voltar para as conversas">
          <Ionicons name="chevron-back" size={18} color={colors.menu} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', marginLeft: 10 }}>Arquivadas · voltar</Text>
        </TouchableOpacity>
      ) : null}

      {shown.map(({ c, ct, m }) => {
        const last = c.messages[c.messages.length - 1];
        const tags = (m.lists || []).map((id) => (lists.find((l) => l.id === id) || {}).name).filter(Boolean);
        return (
          <TouchableOpacity key={c.id} style={st.row} onPress={() => onChat(ct)} onLongPress={() => setMenu({ c, ct })} delayLongPress={280} activeOpacity={0.85} accessibilityLabel={`Conversa com ${ct.name}. Segure para organizar`}>
            <Photo uri={ct.photo} style={st.avatar} fallback="🙂" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }}>{ct.name}</Text>
                {m.pinned ? <Ionicons name="pin" size={12} color={colors.muted} style={{ marginLeft: 5 }} /> : null}
              </View>
              <Text numberOfLines={1} style={{ color: c.unread ? colors.text : colors.muted, fontSize: 13, marginTop: 2 }}>
                {last ? (last.from === 'me' ? 'Você: ' : '') + last.text : 'Nova conversa'}
              </Text>
              {tags.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                  {tags.map((t) => (
                    <View key={t} style={st.tag}>
                      <Text style={st.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
              <Text style={{ color: colors.muted, fontSize: 11 }}>{last ? last.time : ''}</Text>
              {c.unread ? (
                <View style={st.unread}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{c.unread}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
      {!shown.length ? (
        <Text style={st.empty}>
          {filter === 'arquivadas' ? 'Nenhuma conversa arquivada.' : filter === 'naolidas' ? 'Tudo lido por aqui.' : filter === 'todas' ? 'Nenhuma conversa ainda.' : 'Nenhuma conversa nesta lista. Segure uma conversa para colocar aqui.'}
        </Text>
      ) : (
        <Text style={st.hint}>Segure uma conversa para classificar em listas, fixar ou arquivar.</Text>
      )}

      {/* Opções da conversa */}
      <Modal visible={!!menu} transparent animationType="slide" onRequestClose={() => setMenu(null)}>
        <Pressable style={st.scrim} onPress={() => setMenu(null)} />
        {menu ? (
          <View style={st.sheet}>
            <Text style={st.sheetTitle} numberOfLines={1}>{menu.ct.name}</Text>
            <Text style={st.sheetSub}>Listas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {lists.map((l) => {
                const on = (menuMeta.lists || []).includes(l.id);
                return (
                  <TouchableOpacity key={l.id} onPress={() => toggleList(menu.c.contactId, l.id)} style={[st.chip, { marginBottom: 8 }, on && st.chipOn]} accessibilityLabel={`${on ? 'Tirar da' : 'Colocar na'} lista ${l.name}`}>
                    {on ? <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} /> : null}
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.chipText, on && st.chipTextOn]}>{l.name}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => setCreating(true)} style={[st.chip, { marginBottom: 8 }]} accessibilityLabel="Criar lista">
                <Ionicons name="add" size={15} color={colors.text} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.chipText, { marginLeft: 3 }]}>Nova lista</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={st.action} onPress={() => { set(menu.c.contactId, { pinned: !menuMeta.pinned }); setMenu(null); }}>
              <Ionicons name={menuMeta.pinned ? 'pin-outline' : 'pin'} size={19} color={colors.text} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.actionText}>{menuMeta.pinned ? 'Desafixar' : 'Fixar no topo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.action} onPress={() => { set(menu.c.contactId, { archived: !menuMeta.archived, pinned: false }); setMenu(null); }}>
              <Ionicons name={menuMeta.archived ? 'arrow-undo-outline' : 'archive-outline'} size={19} color={colors.text} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.actionText}>{menuMeta.archived ? 'Desarquivar conversa' : 'Arquivar conversa'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.action} onPress={() => { dispatch({ type: 'CHAT_UNREAD', contactId: menu.c.contactId, unread: menu.c.unread ? 0 : 1 }); setMenu(null); }}>
              <Ionicons name={menu.c.unread ? 'mail-open-outline' : 'mail-unread-outline'} size={19} color={colors.text} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.actionText}>{menu.c.unread ? 'Marcar como lida' : 'Marcar como não lida'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Modal>

      {/* Nova lista */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={[st.scrim, { justifyContent: 'center', padding: 22 }]}>
          <View style={st.box}>
            <Text style={st.sheetTitle}>Nova lista</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Dê um nome: Amigos, Igreja, Fornecedores, Academia…</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Nome da lista" placeholderTextColor={colors.muted} maxLength={22} autoFocus style={st.input} onSubmitEditing={createList} />
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[st.btn, { backgroundColor: colors.cardAlt, marginRight: 8 }]} onPress={() => { setCreating(false); setName(''); }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700' }}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, { backgroundColor: colors.text }]} onPress={createList}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Criar lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, minHeight: 42, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 8, color: colors.text, paddingVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, marginRight: 8 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: '#fff' },
  archivedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 8, ...soft },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  unread: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4, paddingHorizontal: 4 },
  tag: { backgroundColor: colors.cardAlt, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginTop: 2 },
  tagText: { color: colors.menu, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 26, paddingHorizontal: 18 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 10 },
  scrim: { flex: 1, backgroundColor: 'rgba(20,18,14,0.45)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  sheetSub: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 12, marginBottom: 8 },
  action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border },
  actionText: { color: colors.text, fontWeight: '700', marginLeft: 12, fontSize: 15 },
  box: { backgroundColor: colors.card, borderRadius: 20, padding: 18 },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12, color: colors.text },
  btn: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
