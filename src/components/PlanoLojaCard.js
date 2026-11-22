// Cartão "Plano da loja" no Painel da empresa: mostra a situação do plano e, quando chega o
// primeiro pedido, pede a escolha entre mensal e anual para a loja poder aceitar.
import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { LOJA_PLANOS, LOJA_MENSAL, LOJA_ANUAL, LOJA_GRATIS_DIAS, LOJA_COMISSAO_PCT, lojaStatus, lojaPlano, lojaPrimeiraCobranca } from '../planoLoja';

const dia = (ts) => new Date(ts).toLocaleDateString('pt-BR');

export default function PlanoLojaCard() {
  const { state, dispatch } = useStore();
  const sp = state.storePlan || {};
  const status = lojaStatus(sp);
  const plan = lojaPlano(sp.plan);

  const escolher = (p) =>
    Alert.alert(
      `Plano ${p.nome}`,
      `${brl(p.valor)} ${p.periodo}. O primeiro mês é gratuito: a primeira cobrança é só daqui a ${LOJA_GRATIS_DIAS} dias. Além do plano, o Realyz fica com ${LOJA_COMISSAO_PCT}% de cada venda.`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Contratar e aceitar o pedido', onPress: () => dispatch({ type: 'STORE_PLAN', plan: p.id }) },
      ]
    );

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: status === 'escolher' ? colors.primary : colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="storefront-outline" size={20} color={colors.text} />
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 8, flex: 1 }}>Plano da loja</Text>
        <Text style={{ color: status === 'escolher' ? colors.primary : colors.muted, fontWeight: '800', fontSize: 12 }}>
          {status === 'livre' ? 'Sem cobrança' : status === 'escolher' ? 'Escolha o plano' : status === 'gratis' ? 'Mês grátis' : 'Ativo'}
        </Text>
      </View>

      {status === 'livre' ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 8 }}>
            Sua loja está no ar sem pagar nada. O plano só começa quando você aceitar o primeiro pedido pelo Realyz, e o primeiro mês é gratuito. Depois: {brl(LOJA_MENSAL)} por mês ou {brl(LOJA_ANUAL)} no anual, mais {LOJA_COMISSAO_PCT}% de cada venda.
          </Text>
          <TouchableOpacity onPress={() => dispatch({ type: 'STORE_FIRST_ORDER' })} style={{ marginTop: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.cardAlt, alignItems: 'center' }} accessibilityLabel="Simular a chegada do primeiro pedido">
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Simular: chegou o primeiro pedido</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {status === 'escolher' ? (
        <>
          <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 8 }}>
            Chegou seu primeiro pedido 🎉 Para aceitar, escolha o plano da loja. O primeiro mês é gratuito nos dois.
          </Text>
          {LOJA_PLANOS.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => escolher(p)} activeOpacity={0.85} style={{ marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, padding: 12 }} accessibilityLabel={`Plano ${p.nome}, ${brl(p.valor)} ${p.periodo}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{p.nome}</Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{brl(p.valor)}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 4 }}>{p.periodo}</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{p.nota}</Text>
            </TouchableOpacity>
          ))}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Sem escolher um plano, o pedido não pode ser aceito.</Text>
        </>
      ) : null}

      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8 }}>
        Quer aparecer mais? Publicidade avulsa, preço fechado: Now R$ 9,90 · primeiro nas buscas R$ 14,90 por dia (R$ 79,90 a semana) · banner da vitrine R$ 39,90 por dia (R$ 199,90 a semana).
      </Text>

      {plan ? (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 8 }}>
          Plano {plan.nome}: {brl(plan.valor)} {plan.periodo}. {status === 'gratis' ? `Mês grátis até ${dia(lojaPrimeiraCobranca(sp))}; a primeira cobrança vem nesse dia.` : `Em dia desde ${dia(lojaPrimeiraCobranca(sp))}.`} O Realyz fica com {LOJA_COMISSAO_PCT}% de cada venda.
        </Text>
      ) : null}
    </View>
  );
}
