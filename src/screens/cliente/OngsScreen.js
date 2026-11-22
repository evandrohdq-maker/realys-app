// ONGs: perfis de ONGs com CNPJ conferido, doação direta pelo Realyz (sem taxa) e a campanha do
// mês de cada uma (grátis, uma por mês), com o problema, o objetivo, a meta e para onde vai cada real.
// Quem tem ONG cria o perfil aqui e publica a campanha do mês.
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../../responsive';
import { useStore } from '../../store';
import { colors, soft, brl } from '../../theme';
import { Screen, Title } from '../../components/ui';
import { CAUSAS, VALORES_DOACAO, DOACAO_TAXA_PCT, campanhaAtual, podeNovaCampanha, faltaNaCampanha, pct } from '../../ongs';

export function Barra({ a, b }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EFE6CC', overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${pct(a, b)}%`, height: '100%', backgroundColor: colors.success }} />
    </View>
  );
}

// Cartão da campanha (no feed e na lista).
export function CampanhaCard({ ong, c, onOpen, compacto }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onOpen} style={[st.card, { borderWidth: 1.5, borderColor: colors.success }]} accessibilityLabel={`Campanha de ${ong.nome}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, marginRight: 10 }}>{ong.logo}</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.muted}>Campanha do mês · ONG verificada</Text>
          <Text style={st.title} numberOfLines={1}>{ong.nome}</Text>
        </View>
        <Ionicons name="heart" size={20} color={colors.success} />
      </View>
      <Text style={[st.title, { marginTop: 10 }]}>{c.titulo}</Text>
      <Text style={{ color: colors.text, marginTop: 4 }} numberOfLines={compacto ? 2 : undefined}>
        <Text style={{ fontWeight: '800' }}>O problema: </Text>
        {c.problema}
      </Text>
      <Barra a={c.arrecadado || 0} b={c.meta} />
      <Text style={[st.muted, { marginTop: 4 }]}>{brl(c.arrecadado || 0)} de {brl(c.meta)} · {pct(c.arrecadado || 0, c.meta)}%</Text>
    </TouchableOpacity>
  );
}

export function OngPage({ ong, onClose }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [valor, setValor] = useState(20);
  const [outro, setOutro] = useState('');
  const [nova, setNova] = useState(false);
  const o = state.ongs.find((x) => x.id === ong.id) || ong;
  const c = campanhaAtual(o);
  const doar = () => {
    const v = outro ? Number(String(outro).replace(',', '.')) : valor;
    if (!(v >= 1)) return Alert.alert('Valor da doação', 'A partir de R$ 1,00.');
    Alert.alert(`Doar ${brl(v)}?`, `${brl(v)} vão direto para ${o.nome}${c ? `, na campanha "${c.titulo}"` : ''}. O Realyz não cobra taxa de doação${DOACAO_TAXA_PCT ? '' : ' (0%)'}.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Doar', onPress: () => (dispatch({ type: 'ONG_DOAR', id: o.id, valor: v, nome: o.nome }), setOutro('')) },
    ]);
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Voltar"><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[st.title, { flex: 1, marginLeft: 6 }]} numberOfLines={1}>{o.nome}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 48 }}>{o.logo}</Text>
            <Text style={[st.title, { fontSize: 19, textAlign: 'center' }]}>{o.nome}</Text>
            <Text style={st.muted}>{o.causa} · {o.cidade}</Text>
            <Text style={[st.muted, { marginTop: 2 }]}>{o.verificada ? `✅ CNPJ ${o.cnpj} conferido` : '⏳ CNPJ em conferência: as doações abrem depois da aprovação'}</Text>
          </View>
          <Text style={{ color: colors.text }}>{o.sobre}</Text>

          {c ? (
            <View style={[st.card, { marginTop: 14 }]}>
              <Text style={st.muted}>Campanha do mês</Text>
              <Text style={[st.title, { fontSize: 17 }]}>{c.titulo}</Text>
              <Text style={st.sec}>O problema</Text>
              <Text style={{ color: colors.text }}>{c.problema}</Text>
              <Text style={st.sec}>O objetivo</Text>
              <Text style={{ color: colors.text }}>{c.objetivo}</Text>
              <Text style={st.sec}>Para onde vai o dinheiro</Text>
              {(c.destino || []).map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 2 }}>
                  <Text style={{ color: colors.text, flex: 1 }}>• {d.item}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{brl(d.valor)}</Text>
                </View>
              ))}
              <Barra a={c.arrecadado || 0} b={c.meta} />
              <Text style={[st.muted, { marginTop: 4 }]}>{brl(c.arrecadado || 0)} de {brl(c.meta)} · {o.doadores} doadores</Text>
            </View>
          ) : null}

          {o.verificada && !o.mine ? (
            <View style={[st.card, { marginTop: 4 }]}>
              <Text style={st.title}>Doar agora</Text>
              <View style={st.wrap}>
                {VALORES_DOACAO.map((v) => (
                  <TouchableOpacity key={v} onPress={() => (setValor(v), setOutro(''))} style={[st.chip, !outro && valor === v && st.chipOn]}>
                    <Text style={[st.chipTxt, !outro && valor === v && { color: '#fff' }]}>{brl(v)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={outro} onChangeText={setOutro} placeholder="Outro valor" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={st.input} />
              <TouchableOpacity style={st.btn} onPress={doar}>
                <Ionicons name="heart" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6 }}>Doar {brl(outro ? Number(String(outro).replace(',', '.')) || 0 : valor)}</Text>
              </TouchableOpacity>
              <Text style={[st.muted, { marginTop: 6, textAlign: 'center' }]}>Sai do seu saldo Realyz (Pix). Sem taxa do Realyz.</Text>
            </View>
          ) : null}

          {o.mine ? (
            <View style={[st.card, { marginTop: 4 }]}>
              <Text style={st.title}>Campanha do mês</Text>
              <Text style={st.muted}>Uma campanha grátis por mês, em destaque no feed (uma ONG por vez, para não poluir).</Text>
              {podeNovaCampanha(o) ? (
                <TouchableOpacity style={st.btn} onPress={() => setNova(true)}><Text style={{ color: '#fff', fontWeight: '800' }}>Publicar a campanha deste mês</Text></TouchableOpacity>
              ) : (
                <Text style={[st.muted, { marginTop: 6 }]}>A campanha deste mês já está no ar. A próxima libera no dia 1º.</Text>
              )}
            </View>
          ) : null}

          {(o.contas || []).length ? (
            <>
              <Text style={st.sec}>Prestação de contas</Text>
              {o.contas.map((k, i) => (
                <View key={i} style={st.card}>
                  <Text style={st.title}>{k.mes}</Text>
                  <Text style={st.muted}>Entrou {brl(k.entrou)} · saiu {brl(k.saiu)}</Text>
                  <Text style={{ color: colors.text, marginTop: 4 }}>{k.onde}</Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
        {nova ? <NovaCampanha ong={o} onClose={() => setNova(false)} /> : null}
      </View>
    </Modal>
  );
}

function NovaCampanha({ ong, onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [c, setC] = useState({ titulo: '', problema: '', objetivo: '', meta: '', destino: [{ item: '', valor: '' }] });
  const campo = (k, ph, multi) => (
    <TextInput value={c[k]} onChangeText={(v) => setC((x) => ({ ...x, [k]: v }))} placeholder={ph} placeholderTextColor={colors.muted} multiline={multi} keyboardType={k === 'meta' ? 'decimal-pad' : undefined} style={[st.input, multi && { minHeight: 70, textAlignVertical: 'top' }]} />
  );
  const publicar = () => {
    const camp = { ...c, meta: Number(String(c.meta).replace(',', '.')), destino: c.destino.map((d) => ({ item: d.item.trim(), valor: Number(String(d.valor).replace(',', '.')) })).filter((d) => d.item && d.valor > 0) };
    const falta = faltaNaCampanha(camp);
    if (falta.length) return Alert.alert('Falta explicar', falta.join('\n'));
    dispatch({ type: 'ONG_CAMPANHA', id: ong.id, campanha: camp });
    onClose();
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>Campanha do mês</Text>
          <TouchableOpacity onPress={publicar} style={st.save}><Text style={{ color: '#fff', fontWeight: '800' }}>Publicar</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={st.sec}>Título</Text>
          {campo('titulo', 'Ex.: Castração de 30 cadelas resgatadas')}
          <Text style={st.sec}>Qual é o problema?</Text>
          {campo('problema', 'Explique a situação que a campanha resolve', true)}
          <Text style={st.sec}>Qual é o objetivo?</Text>
          {campo('objetivo', 'O que vocês vão fazer com o dinheiro e até quando', true)}
          <Text style={st.sec}>Meta (R$)</Text>
          {campo('meta', '3600')}
          <Text style={st.sec}>Para onde vai o dinheiro</Text>
          {c.destino.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              <TextInput value={d.item} onChangeText={(v) => setC((x) => ({ ...x, destino: x.destino.map((y, j) => (j === i ? { ...y, item: v } : y)) }))} placeholder="Ex.: cirurgias (30 × R$ 100)" placeholderTextColor={colors.muted} style={[st.input, { flex: 1, marginRight: 8 }]} />
              <TextInput value={d.valor} onChangeText={(v) => setC((x) => ({ ...x, destino: x.destino.map((y, j) => (j === i ? { ...y, valor: v } : y)) }))} placeholder="R$" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[st.input, { width: 90 }]} />
            </View>
          ))}
          <TouchableOpacity onPress={() => setC((x) => ({ ...x, destino: [...x.destino, { item: '', valor: '' }] }))}><Text style={{ color: colors.primary, fontWeight: '800', marginTop: 6 }}>+ Mais um item</Text></TouchableOpacity>
          <Text style={[st.muted, { marginTop: 14 }]}>Uma campanha grátis por mês. Depois de cada mês, a ONG mostra a prestação de contas no perfil.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function CriarOng({ onClose }) {
  const { dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState({ nome: '', cnpj: '', causa: CAUSAS[0], cidade: 'Passo Fundo - RS', sobre: '', logo: '💛' });
  const criar = () => {
    if (f.nome.trim().length < 3) return Alert.alert('Nome da ONG', 'Escreva o nome da ONG.');
    if (String(f.cnpj).replace(/\D/g, '').length !== 14) return Alert.alert('CNPJ', 'A ONG precisa de CNPJ (14 números). Ele é conferido antes de abrir as doações.');
    if (f.sobre.trim().length < 30) return Alert.alert('Sobre a ONG', 'Conte em poucas linhas o que a ONG faz e para quem.');
    dispatch({ type: 'ONG_CRIAR', ong: { ...f, nome: f.nome.trim(), sobre: f.sobre.trim() } });
    Alert.alert('Perfil criado', 'Vamos conferir o CNPJ. Depois da aprovação, as doações e a campanha do mês aparecem para todos.');
    onClose();
  };
  const campo = (k, ph, multi, kb) => (
    <TextInput value={f[k]} onChangeText={(v) => setF((x) => ({ ...x, [k]: v }))} placeholder={ph} placeholderTextColor={colors.muted} multiline={multi} keyboardType={kb} style={[st.input, multi && { minHeight: 80, textAlignVertical: 'top' }]} />
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={st.head}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>Perfil de ONG</Text>
          <TouchableOpacity onPress={criar} style={st.save}><Text style={{ color: '#fff', fontWeight: '800' }}>Criar</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={st.sec}>Nome</Text>
          {campo('nome', 'Nome da ONG')}
          <Text style={st.sec}>CNPJ</Text>
          {campo('cnpj', '00.000.000/0001-00', false, 'number-pad')}
          <Text style={st.sec}>Causa</Text>
          <View style={st.wrap}>{CAUSAS.map((k) => <TouchableOpacity key={k} onPress={() => setF((x) => ({ ...x, causa: k }))} style={[st.chip, f.causa === k && st.chipOn]}><Text style={[st.chipTxt, f.causa === k && { color: '#fff' }]}>{k}</Text></TouchableOpacity>)}</View>
          <Text style={st.sec}>Cidade</Text>
          {campo('cidade', 'Cidade - UF')}
          <Text style={st.sec}>O que a ONG faz</Text>
          {campo('sobre', 'Quem vocês ajudam, como e há quanto tempo', true)}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function OngsScreen() {
  const { state } = useStore();
  const [aberta, setAberta] = useState(null);
  const [criar, setCriar] = useState(false);
  const [causa, setCausa] = useState(null);
  const minha = state.ongs.find((o) => o.mine);
  const lista = state.ongs.filter((o) => !o.mine && (!causa || o.causa === causa));
  const campanhas = state.ongs.filter((o) => o.verificada && campanhaAtual(o));
  const doado = (state.doacoes || []).reduce((s, d) => s + d.valor, 0);
  return (
    <Screen>
      <Title sub="Doe direto para ONGs verificadas, sem taxa do Realyz">ONGs</Title>
      {doado ? <Text style={[st.muted, { marginBottom: 8 }]}>Você já doou {brl(doado)} pelo Realyz 💛</Text> : null}
      {campanhas.length ? <Text style={st.sec}>Campanhas deste mês</Text> : null}
      {campanhas.map((o) => <CampanhaCard key={o.id} ong={o} c={campanhaAtual(o)} compacto onOpen={() => setAberta(o)} />)}
      <Text style={st.sec}>Todas as ONGs</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        <TouchableOpacity onPress={() => setCausa(null)} style={[st.chip, !causa && st.chipOn]}><Text style={[st.chipTxt, !causa && { color: '#fff' }]}>Todas</Text></TouchableOpacity>
        {CAUSAS.map((k) => <TouchableOpacity key={k} onPress={() => setCausa(k)} style={[st.chip, causa === k && st.chipOn]}><Text style={[st.chipTxt, causa === k && { color: '#fff' }]}>{k}</Text></TouchableOpacity>)}
      </ScrollView>
      {lista.map((o) => (
        <TouchableOpacity key={o.id} style={[st.card, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setAberta(o)}>
          <Text style={{ fontSize: 28, marginRight: 10 }}>{o.logo}</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{o.nome} {o.verificada ? <Ionicons name="shield-checkmark" size={14} color={colors.success} /> : null}</Text>
            <Text style={st.muted}>{o.causa} · {o.doadores} doadores</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[st.card, { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary }]} onPress={() => (minha ? setAberta(minha) : setCriar(true))}>
        <Ionicons name={minha ? 'business' : 'add-circle-outline'} size={22} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.title}>{minha ? `Minha ONG: ${minha.nome}` : 'Tem uma ONG? Crie o perfil'}</Text>
          <Text style={st.muted}>{minha ? (minha.verificada ? 'Publique a campanha do mês e mostre as contas' : 'CNPJ em conferência') : 'Receba doações direto pelo Realyz e uma campanha grátis por mês'}</Text>
        </View>
      </TouchableOpacity>
      {aberta ? <OngPage ong={aberta} onClose={() => setAberta(null)} /> : null}
      {criar ? <CriarOng onClose={() => setCriar(false)} /> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...soft },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 12.5 },
  sec: { color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 12, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFE6CC' },
  save: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginTop: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipTxt: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EFE6CC', padding: 10, color: colors.text, marginTop: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, borderRadius: 12, paddingVertical: 12, marginTop: 10 },
});
