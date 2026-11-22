// Busca de profissão: a pessoa digita e aparecem só as 4 que mais combinam, cada uma com o
// segmento e um exemplo do que faz. Tocou, escolheu. Usada no cadastro (perfil) e no painel do
// prestador ("Adicionar outra profissão").
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../responsive';
import { colors } from '../theme';
import { buscarProfissoes, profissaoPorKey, funcoesSugeridas } from '../providerSegments';
import { profInfo, MEI_PASSOS, MEI_VALORES, dasDaProfissao, calcFaturamento, formatReais } from '../professionsKnowledge';

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

// "O que você faz": a pessoa DIGITA; enquanto digita aparecem até 4 exemplos da profissão dela para
// marcar (nada de lista enorme). O que marcou fica em cima, com X para tirar.
// value = lista de textos; onChange(novaLista); keys = profissões (principal e outras).
const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function FuncoesTags({ keys, value, onChange }) {
  const [novo, setNovo] = useState('');
  const lista = value || [];
  const base = [...new Set((keys || []).filter(Boolean).flatMap((k) => funcoesSugeridas(k)))];
  const t = semAcento(novo.trim());
  const sugestoes = t.length >= 2 ? base.filter((f) => !lista.includes(f) && semAcento(f).split(/\s+/).some((w) => w.startsWith(t) || semAcento(f).includes(t))).slice(0, 4) : [];
  const exemplo = base.slice(0, 2).join(', ');
  const marcar = (f) => {
    if (f && !lista.includes(f)) onChange([...lista, f].slice(0, 15));
    setNovo('');
  };
  return (
    <View>
      {lista.length ? (
        <View style={st.wrap}>
          {lista.map((f) => (
            <TouchableOpacity key={f} onPress={() => onChange(lista.filter((x) => x !== f))} style={[st.tag, st.tagOn]} accessibilityLabel={`Tirar ${f}`}>
              <Text numberOfLines={1} style={[st.tagText, { color: colors.primaryDark, fontWeight: '800' }]}>{f}</Text>
              <Ionicons name="close" size={14} color={colors.primaryDark} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <View style={st.novo}>
        <TextInput style={st.novoInput} value={novo} onChangeText={setNovo} onSubmitEditing={() => marcar(novo.trim())} placeholder={exemplo ? `Digite o que você faz (ex.: ${exemplo})` : 'Digite o que você faz'} placeholderTextColor={colors.muted} returnKeyType="done" />
        {novo.trim() ? (
          <TouchableOpacity onPress={() => marcar(novo.trim())} accessibilityLabel="Adicionar" style={{ padding: 6 }}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {sugestoes.map((f) => (
        <TouchableOpacity key={f} style={st.sug} onPress={() => marcar(f)} accessibilityLabel={`Marcar ${f}`}>
          <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
          <Text style={[st.tagText, { marginLeft: 8 }]} numberOfLines={1}>{f}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Como a profissão funciona no Realyz (curto): onde atende, o que a lei exige e se pode ser MEI.
export function ProfissaoInfo({ profKey, onMei }) {
  const i = profInfo(profKey);
  if (!i) return null;
  return (
    <View style={st.info}>
      <Text style={st.infoText}>{i.como}</Text>
      {i.exige ? <Text style={[st.infoText, { marginTop: 4 }]}>📋 Exige: {i.exige}.</Text> : null}
      {i.mei === false ? (
        <Text style={[st.infoText, { marginTop: 4 }]}>Profissão regulamentada: não pode ser MEI. Você trabalha com o seu registro profissional.</Text>
      ) : i.mei ? (
        <TouchableOpacity onPress={onMei} disabled={!onMei} accessibilityLabel="Como abrir o MEI">
          <Text style={[st.infoText, { marginTop: 4 }]}>MEI: {i.mei.ocupacao} · CNAE {i.mei.cnae}{onMei ? <Text style={{ color: colors.primary, fontWeight: '800' }}>  Como abrir meu MEI ›</Text> : null}</Text>
        </TouchableOpacity>
      ) : onMei ? (
        <TouchableOpacity onPress={onMei} accessibilityLabel="Como abrir o MEI">
          <Text style={[st.infoText, { marginTop: 4, color: colors.primary, fontWeight: '800' }]}>Como abrir meu MEI ›</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Conta aproximada: quanto fica o DAS da profissão e se o faturamento cabe no MEI.
function MeiConta({ profKey }) {
  const [mes, setMes] = useState('');
  const [meses, setMeses] = useState(12);
  const das = dasDaProfissao(profKey);
  const v = Number(String(mes).replace(/\./g, '').replace(',', '.')) || 0;
  const r = v ? calcFaturamento(v, meses) : null;
  const cor = r ? (r.situacao === 'cabe' ? colors.success : r.situacao === 'passou_pouco' ? '#B7791F' : colors.danger) : colors.text;
  return (
    <View style={st.conta}>
      <Text style={st.passoT}>Quanto custa por mês (aproximado)</Text>
      <Text style={st.infoText}>DAS {MEI_VALORES.ano}: {das.texto}. É 5% do salário mínimo (R$ {MEI_VALORES.salarioMinimo.toLocaleString('pt-BR')}) para o INSS, mais o imposto fixo da atividade.</Text>
      <Text style={[st.passoT, { marginTop: 10 }]}>Quanto você pode faturar</Text>
      <Text style={st.infoText}>Até {formatReais(MEI_VALORES.limiteAno)} por ano em {MEI_VALORES.ano} (média de {formatReais(MEI_VALORES.limiteAno / 12)} por mês). Sobe para {MEI_VALORES.proximos.map((p) => `${formatReais(p.limite)} em ${p.ano}`).join(' e ')}.</Text>
      <View style={[st.novo, { marginTop: 8, marginBottom: 6 }]}>
        <Text style={{ color: colors.muted }}>R$</Text>
        <TextInput style={[st.novoInput, { marginLeft: 6 }]} value={mes} onChangeText={setMes} keyboardType="decimal-pad" placeholder="Quanto você fatura por mês (mais ou menos)" placeholderTextColor={colors.muted} />
      </View>
      <View style={st.wrap}>
        {[12, 6, 3].map((n) => (
          <TouchableOpacity key={n} onPress={() => setMeses(n)} style={[st.tag, meses === n && st.tagOn]} accessibilityLabel={`${n} meses`}>
            <Text style={[st.tagText, meses === n && { color: colors.primaryDark, fontWeight: '800' }]}>{n === 12 ? 'Ano inteiro' : `Abro e trabalho ${n} meses`}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {r ? (
        <Text style={{ color: cor, fontWeight: '700', marginTop: 4 }}>
          {r.situacao === 'cabe'
            ? `Cabe no MEI: ${formatReais(r.ano)} no período, limite de ${formatReais(r.limite)}.`
            : r.situacao === 'passou_pouco'
            ? `Passa do limite (${formatReais(r.ano)} de ${formatReais(r.limite)}), mas até 20%: paga a diferença do imposto e sai do MEI no ano seguinte.`
            : `Passa muito do limite (${formatReais(r.ano)} de ${formatReais(r.limite)}): o melhor é abrir uma microempresa (ME) com um contador.`}
        </Text>
      ) : null}
      <Text style={[st.infoText, { marginTop: 6, fontSize: 11.5 }]}>Valores aproximados de {MEI_VALORES.ano}. O valor exato da sua guia aparece no Portal do Empreendedor.</Text>
    </View>
  );
}

// Passo a passo para abrir o MEI (gratuito, no gov.br), com a ocupação certa da profissão.
export function MeiGuia({ visible, onClose, profKey }) {
  const i = profKey ? profInfo(profKey) : null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 18, paddingTop: 44, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Voltar" style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, flex: 1 }}>Como abrir seu MEI</Text>
        </View>
        <Text style={st.infoText}>É grátis, pelo celular, e o CNPJ sai na hora. Com o CNPJ você vende e presta serviço no Realyz com nota e mais confiança.</Text>
        {i && i.mei === false ? <Text style={[st.aviso]}>Sua profissão é regulamentada e não pode ser MEI. Você pode trabalhar no Realyz com o seu registro profissional.</Text> : null}
        {i && i.mei ? <Text style={st.aviso}>Sua ocupação no MEI: {i.mei.ocupacao} (CNAE {i.mei.cnae}).</Text> : null}
        <MeiConta profKey={profKey} />
        {MEI_PASSOS.map((p, n) => (
          <View key={p.t} style={st.passo}>
            <View style={st.num}><Text style={{ color: colors.onPrimary, fontWeight: '900' }}>{n + 1}</Text></View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.passoT}>{p.t}</Text>
              <Text style={st.infoText}>{p.d}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={st.cta} onPress={() => Linking.openURL('https://www.gov.br/mei')} accessibilityLabel="Abrir o Portal do Empreendedor">
          <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 15 }}>Abrir o Portal do Empreendedor (gov.br)</Text>
        </TouchableOpacity>
        <Text style={[st.infoText, { marginTop: 10, textAlign: 'center' }]}>Depois de abrir, volte e coloque o seu CNPJ no Realyz.</Text>
      </ScrollView>
    </Modal>
  );
}
Object.assign(st, StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 6, marginBottom: 6, maxWidth: '100%' },
  tagOn: { borderColor: colors.primary, backgroundColor: '#FFFBEF' },
  tagText: { color: colors.text, fontSize: 13, marginLeft: 3 },
  novo: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingLeft: 12, backgroundColor: '#fff', marginTop: 2, marginBottom: 12 },
  novoInput: { flex: 1, paddingVertical: 9, color: colors.text, fontSize: 14 },
  sug: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginTop: -6, marginBottom: 10 },
  info: { marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: colors.cardAlt },
  infoText: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  aviso: { color: colors.text, fontWeight: '700', marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: '#FFFBEF' },
  passo: { flexDirection: 'row', marginTop: 14 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  passoT: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 2 },
  conta: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  cta: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
}));
