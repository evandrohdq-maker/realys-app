// Busca de profissão: a pessoa digita e aparecem só as 4 que mais combinam, cada uma com o
// segmento e um exemplo do que faz. Tocou, escolheu. Usada no cadastro (perfil) e no painel do
// prestador ("Adicionar outra profissão").
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { colors } from '../theme';
import { buscarProfissoes, profissaoPorKey } from '../providerSegments';

// value = chave da profissão escolhida (ou null). onPick(prof | null). livre: aceita o que digitou.
export default function ProfissaoBusca({ value, onPick, placeholder = 'Digite sua profissão (ex.: eletricista, cantor)', livre, autoFocus }) {
  const [q, setQ] = useState('');
  const escolhida = value ? profissaoPorKey(value) : null;
  if (escolhida) {
    return (
      <View style={st.pill}>
        <Text style={st.emoji}>{escolhida.icon || '🧰'}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.nome} numberOfLines={1}>{escolhida.label}</Text>
          <Text style={st.sub} numberOfLines={1}>{escolhida.group}</Text>
        </View>
        <TouchableOpacity onPress={() => (setQ(''), onPick(null))} style={st.trocar} accessibilityLabel="Trocar profissão">
          <Text style={st.trocarText}>Trocar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const achou = buscarProfissoes(q, 4);
  const texto = q.trim();
  return (
    <View>
      <View style={st.box}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput style={st.input} value={q} onChangeText={setQ} placeholder={placeholder} placeholderTextColor={colors.muted} autoFocus={autoFocus} autoCorrect={false} />
        {q ? (
          <TouchableOpacity onPress={() => setQ('')} accessibilityLabel="Limpar">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {achou.map((p) => (
        <TouchableOpacity key={p.key} style={st.row} onPress={() => (setQ(''), onPick(p))} activeOpacity={0.85} accessibilityLabel={`Escolher ${p.label}`}>
          <Text style={st.emoji}>{p.icon || '🧰'}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.nome} numberOfLines={1}>{p.label}</Text>
            <Text style={st.sub} numberOfLines={1}>{[p.segmento, p.exemplo].filter(Boolean).join(' · ')}</Text>
          </View>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ))}
      {texto.length >= 2 && !achou.length && !livre ? <Text style={st.vazio}>Não achei "{texto}". Tente outra palavra (ex.: pintor, motorista, DJ).</Text> : null}
      {livre && texto.length >= 2 ? (
        <TouchableOpacity style={[st.row, { borderStyle: 'dashed' }]} onPress={() => (setQ(''), onPick({ key: null, label: texto }))} accessibilityLabel={`Usar ${texto}`}>
          <Ionicons name="create-outline" size={20} color={colors.muted} />
          <Text style={[st.sub, { marginLeft: 10, flex: 1 }]} numberOfLines={1}>Usar "{texto}" como escrevi</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#fff' },
  input: { flex: 1, paddingVertical: 11, marginLeft: 8, color: colors.text, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#FFFBEF' },
  emoji: { fontSize: 24 },
  nome: { color: colors.text, fontWeight: '800', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
  trocar: { paddingHorizontal: 10, paddingVertical: 6 },
  trocarText: { color: colors.primary, fontWeight: '800' },
  vazio: { color: colors.muted, fontSize: 12.5, marginTop: 8 },
});
