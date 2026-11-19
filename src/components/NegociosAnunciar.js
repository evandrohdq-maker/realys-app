// Anunciar na aba Negócios: como funciona a cobrança, os planos e o formulário do anúncio.
// Também o painel "Meus anúncios", com os interessados e o botão de liberar a conversa.
// Regras e valores em src/negocios.js e src/taxas.js.
import CrmScreen from '../screens/empresa/CrmScreen';
import { KeyboardLift } from '../keyboard';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, soft, brl } from '../theme';
import { TAXAS } from '../taxas';
import { NEG_PLANOS, negPlano, precoContato, custoLiberar, planoCobre, setorDoTipo, NEG_REEMBOLSO_HORAS } from '../negocios';
import { moderateText } from '../moderation';

// Interessados de exemplo que chegam quando o anúncio é publicado (na demonstração).
const DEMO_LEADS = ['Camila R.', 'João Pedro S.'];

export function AnunciarSheet({ visible, onClose, kinds, kindLabel }) {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const [kind, setKind] = useState(kinds[0]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [place, setPlace] = useState('Passo Fundo - RS');
  useEffect(() => {
    if (!visible) return;
    setKind(kinds[0]);
    setTitle('');
    setPrice('');
  }, [visible]);
  const setor = setorDoTipo(kind);
  const plan = state.negPlan ? negPlano(state.negPlan.id) : null;
  const covered = planoCobre(plan && plan.id, kind);
  const planos = NEG_PLANOS.filter((p) => p.setores.includes(setor));

  const assinar = (p) => {
    if (state.wallet < p.valor) return Alert.alert('Saldo insuficiente', `O plano ${p.nome} custa ${brl(p.valor)} por mês. Coloque saldo na carteira e tente de novo.`);
    Alert.alert(`Plano ${p.nome}`, `${brl(p.valor)} por mês, do seu saldo Re@lys. ${p.detalhe}, com as conversas liberadas.`, [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Assinar', onPress: () => dispatch({ type: 'NEG_PLAN', id: p.id }) },
    ]);
  };
  const publicar = () => {
    const t = title.trim();
    if (t.length < 5) return Alert.alert('Título do anúncio', 'Escreve um título que diga o que você está anunciando.');
    if (!price.trim()) return Alert.alert('Preço', 'Coloca o preço (ex.: R$ 420.000 ou R$ 1.650/mês).');
    const mod = moderateText(`${t} ${place}`);
    if (!mod.ok) return Alert.alert('Não foi possível publicar', mod.why);
    const mine = (state.negAds || []).filter((x) => setorDoTipo(x.kind) === setor).length;
    if (plan && covered && mine >= plan.limite) return Alert.alert('Limite do plano', `O plano ${plan.nome} vai até ${plan.limite} anúncios.`);
    const id = 'my-' + Date.now();
    const who = (state.user && state.user.name) || 'Você';
    dispatch({
      type: 'NEG_AD_CREATE',
      ad: { id, kind, title: t, price: price.trim(), place: place.trim(), who, detail: 'Anúncio seu', sponsored: false, mine: true },
      leads: DEMO_LEADS.map((name, i) => ({ id: `${id}-l${i}`, adId: id, name, at: Date.now() - i * 3600000, unlocked: false })),
    });
    onClose();
    Alert.alert('Anúncio no ar ✅', covered ? 'As conversas com os interessados já estão liberadas pelo seu plano.' : `Anunciar é grátis. Quando aparecer um interessado verificado, você libera a conversa por ${brl(precoContato(kind))}.`);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardLift style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.head, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={st.close} accessibilityLabel="Fechar">
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.headTitle}>Anunciar</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={st.h}>O que você vai anunciar?</Text>
          <View style={st.pills}>
            {kinds.map((k) => {
              const on = k === kind;
              return (
                <TouchableOpacity key={k} style={[st.pill, on && st.pillOn]} onPress={() => setKind(k)}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.pillText, on && { color: '#fff' }]}>{kindLabel(k)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Como o anunciante paga */}
          <View style={st.box}>
            <Text style={st.boxTitle}>Você só paga por cliente de verdade</Text>
            <Text style={st.boxText}>Quem procura não paga nada. Cada interessado é uma pessoa verificada por biometria.</Text>
            <View style={st.line}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.lineTitle}>Poucos anúncios: {brl(precoContato(kind))} por conversa</Text>
                <Text style={st.lineSub}>Anunciar é grátis. Você só paga quando libera a conversa com um interessado. Se ele não responder em {NEG_REEMBOLSO_HORAS} horas, o valor volta como crédito.</Text>
              </View>
            </View>
            {planos.map((p) => {
              const mineP = plan && plan.id === p.id;
              return (
                <View key={p.id} style={st.line}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={st.lineTitle}>Plano {p.nome}: {brl(p.valor)} por mês</Text>
                    <Text style={st.lineSub}>{p.detalhe}, com todas as conversas liberadas.</Text>
                  </View>
                  <TouchableOpacity style={[st.planBtn, mineP && st.planBtnOn]} onPress={() => (mineP ? null : assinar(p))} disabled={mineP} accessibilityLabel={mineP ? `Plano ${p.nome} ativo` : `Assinar o plano ${p.nome}`}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.planBtnText, mineP && { color: colors.text }]}>{mineP ? 'Ativo' : 'Assinar'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <Text style={st.compare}>No mercado: {setor === 'imoveis' ? TAXAS.anuncioImobiliaria.mercado : TAXAS.contatoVeiculo.mercado}.</Text>
          </View>

          <Text style={st.h}>Seu anúncio</Text>
          <Text style={st.label}>Título</Text>
          <TextInput value={title} onChangeText={setTitle} style={st.field} placeholder={setor === 'imoveis' ? 'Ex.: Apartamento 2 quartos no Centro' : setor === 'veiculos' ? 'Ex.: Hatch 1.0 2021, único dono' : 'Ex.: Trator 75 cv 2020'} placeholderTextColor={colors.muted} maxLength={70} />
          <Text style={st.label}>Preço</Text>
          <TextInput value={price} onChangeText={setPrice} style={st.field} placeholder="Ex.: R$ 420.000 ou R$ 1.650/mês" placeholderTextColor={colors.muted} maxLength={30} />
          <Text style={st.label}>Cidade</Text>
          <TextInput value={place} onChangeText={setPlace} style={st.field} placeholderTextColor={colors.muted} maxLength={40} />
          <TouchableOpacity style={st.publish} onPress={publicar} activeOpacity={0.85}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.publishText}>Publicar anúncio</Text>
          </TouchableOpacity>
          <Text style={st.note}>{covered ? `Coberto pelo seu plano ${plan.nome}.` : 'Publicar é grátis.'} Na demonstração, as fotos e a análise do anúncio ficam para quando o servidor estiver no ar.</Text>
        </ScrollView>
      </KeyboardLift>
    </Modal>
  );
}

// Meus anúncios (do setor aberto) com os interessados. onChat abre a conversa já liberada.
export function MyAds({ kinds, kindLabel, onChat }) {
  const { state, dispatch } = useStore();
  const [crm, setCrm] = useState(false);
  const ads = (state.negAds || []).filter((a) => kinds.includes(a.kind));
  if (!ads.length) return null;
  const planId = state.negPlan && state.negPlan.id;
  const unlock = (lead, ad) => {
    const cost = custoLiberar(planId, ad.kind);
    if (state.wallet < cost) return Alert.alert('Saldo insuficiente', `Liberar esta conversa custa ${brl(cost)}. Coloque saldo na carteira e tente de novo.`);
    const go = () => {
      dispatch({ type: 'NEG_LEAD_UNLOCK', id: lead.id });
      onChat(lead);
    };
    if (!cost) return go();
    Alert.alert('Liberar conversa', `${brl(cost)} do seu saldo para falar com este interessado verificado. Se ele não responder em ${NEG_REEMBOLSO_HORAS} horas, o valor volta como crédito.`, [
      { text: 'Agora não', style: 'cancel' },
      { text: `Liberar por ${brl(cost)}`, onPress: go },
    ]);
  };
  const board = kinds.some((k) => String(k).startsWith('imovel')) ? 'imoveis' : 'veiculos';
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[st.h, { flex: 1 }]}>Meus anúncios</Text>
        {/* CRM do anunciante: acompanha cada interessado por etapas, até fechar negócio */}
        <TouchableOpacity onPress={() => setCrm(true)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card }} accessibilityLabel="Acompanhar meus clientes por etapas">
          <Ionicons name="chatbubbles-outline" size={15} color={colors.text} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 5 }}>Clientes</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={crm} animationType="slide" onRequestClose={() => setCrm(false)}><KeyboardLift style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 36 }}>
          <TouchableOpacity onPress={() => setCrm(false)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', marginLeft: 4 }}>Voltar</Text>
          </TouchableOpacity>
          <CrmScreen board={board} />
        </View>
      </KeyboardLift></Modal>
      {ads.map((ad) => {
        const leads = (state.negLeads || []).filter((l) => l.adId === ad.id);
        const cost = custoLiberar(planId, ad.kind);
        return (
          <View key={ad.id} style={st.myAd}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={st.myKind}>{kindLabel(ad.kind)}</Text>
                <Text style={st.myTitle}>{ad.title}</Text>
                <Text style={st.myPrice}>{ad.price} · {ad.place}</Text>
              </View>
              <TouchableOpacity
                onPress={() => Alert.alert('Tirar o anúncio do ar?', ad.title, [{ text: 'Manter', style: 'cancel' }, { text: 'Tirar do ar', style: 'destructive', onPress: () => dispatch({ type: 'NEG_AD_REMOVE', id: ad.id }) }])}
                style={st.close}
                accessibilityLabel="Tirar o anúncio do ar"
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </TouchableOpacity>
            </View>
            <Text style={st.leadsTitle}>{leads.length ? `${leads.length} interessado${leads.length > 1 ? 's' : ''}` : 'Ainda sem interessados'}</Text>
            {leads.map((l) => (
              <View key={l.id} style={st.lead}>
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={st.leadName}>{l.unlocked ? l.name : 'Interessado verificado'}</Text>
                  <Text style={st.leadSub}>{l.unlocked ? (l.paid ? `Conversa liberada por ${brl(l.paid)}` : 'Conversa liberada pelo plano') : 'Pessoa real, conferida por biometria'}</Text>
                </View>
                <TouchableOpacity style={[st.leadBtn, l.unlocked && st.leadBtnOpen]} onPress={() => (l.unlocked ? onChat(l) : unlock(l, ad))} accessibilityLabel={l.unlocked ? `Abrir conversa com ${l.name}` : 'Liberar conversa'}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.leadBtnText, l.unlocked && { color: colors.text }]}>{l.unlocked ? 'Conversar' : cost ? `Liberar · ${brl(cost)}` : 'Liberar'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  h: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8, marginTop: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  pill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.cardAlt, marginRight: 6, marginBottom: 6 },
  pillOn: { backgroundColor: colors.text },
  pillText: { color: colors.menu, fontWeight: '700', fontSize: 12.5 },
  box: { backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 16, ...soft },
  boxTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  boxText: { color: colors.muted, fontSize: 12.5, marginTop: 3, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  lineTitle: { color: colors.text, fontWeight: '700', fontSize: 13.5 },
  lineSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  planBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
  planBtnOn: { backgroundColor: colors.gold },
  planBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  compare: { color: colors.muted, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  field: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, backgroundColor: colors.card },
  publish: { backgroundColor: colors.gold, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, marginTop: 16 },
  publishText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  note: { color: colors.muted, fontSize: 11, marginTop: 8 },
  myAd: { backgroundColor: colors.card, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.gold },
  myKind: { color: colors.primary, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  myTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 1 },
  myPrice: { color: colors.muted, fontSize: 12, marginTop: 1 },
  leadsTitle: { color: colors.text, fontWeight: '700', fontSize: 12.5, marginTop: 10, marginBottom: 2 },
  lead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  leadName: { color: colors.text, fontWeight: '700', fontSize: 13 },
  leadSub: { color: colors.muted, fontSize: 11.5, marginTop: 1 },
  leadBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
  leadBtnOpen: { backgroundColor: colors.gold },
  leadBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
