// "Ofertas especiais só para você": janela de boas-vindas com os cupons de quem acabou de chegar
// (ideia da Temu). Aparece UMA vez por conta, neste celular, no perfil de usuário.
//  - Cupom de produto: % de desconto com limite em reais, sem gasto mínimo (vale no Shop e no Food).
//  - Primeira tele grátis no Food: é a regra que já existe (src/teleGratis.js), só mostrada aqui.
// "Salvar cupons" guarda o cupom na carteira de créditos (desconta sozinho no carrinho).
// Só na demonstração: o checkout das contas reais é feito no servidor, que ainda não conhece esse cupom.
import React, { useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { useStore } from '../store';
import { colors, brl } from '../theme';
import { conectado } from '../serverShop';
import { PRIMEIRA_TELE } from '../teleGratis';

// Valores do cupom de boas-vindas (fácil de trocar).
export const BOAS_VINDAS = { pct: 50, cap: 14, minOrder: 0 };
const chave = (dono) => 'rz:cupons-boas-vindas:' + dono;

export default function CuponsBoasVindas() {
  const { state, dispatch } = useStore();
  const [aberta, setAberta] = useState(false);
  const u = state.user;
  const dono = u ? u.id || u.login || u.name : null;
  const pode = !!dono && state.activeRole === 'cliente' && !conectado(state) && !(state.promoCredits || []).some((pc) => pc.source === 'boas-vindas');

  useEffect(() => {
    if (!pode) return undefined;
    let vivo = true;
    const t = setTimeout(async () => {
      let visto = null;
      try {
        visto = await AsyncStorage.getItem(chave(dono));
      } catch (e) {}
      if (vivo && !visto) setAberta(true);
    }, 1500);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [pode, dono]);

  const fechar = () => {
    setAberta(false);
    AsyncStorage.setItem(chave(dono), '1').catch(() => {});
  };
  const salvar = () => {
    dispatch({
      type: 'WELCOME_COUPONS',
      coupon: { kind: 'cupom', ...BOAS_VINDAS, value: BOAS_VINDAS.cap, partner: 'Qualquer parceiro', icon: '🎁', title: `${BOAS_VINDAS.pct}% de boas-vindas (até ${brl(BOAS_VINDAS.cap)})` },
    });
    fechar();
  };

  if (!aberta) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar} statusBarTranslucent>
      <View style={st.fundo}>
        <View style={st.caixa}>
          <TouchableOpacity onPress={fechar} style={st.x} accessibilityLabel="Fechar as ofertas de boas-vindas">
            <Ionicons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>
          <Text style={st.titulo}>Ofertas especiais só para você</Text>

          <View style={[st.cupom, { backgroundColor: '#FFF3EE', borderColor: '#F7D2C4' }]}>
            <View style={st.esq}>
              <Text style={[st.grande, { color: '#E2470F' }]}>
                {BOAS_VINDAS.pct}
                <Text style={{ fontSize: 15 }}>%OFF</Text>
              </Text>
              <Text style={st.peq}>Sem gasto mínimo!</Text>
            </View>
            <View style={st.corte} />
            <View style={st.dir}>
              <Text style={[st.nome, { color: '#E2470F' }]}>Cupom de produto</Text>
              <Text style={st.peq}>Limite de {brl(BOAS_VINDAS.cap)}</Text>
              <Text style={st.peq}>Shop e Food, no 1º pedido</Text>
            </View>
          </View>

          <View style={[st.cupom, { backgroundColor: '#EEF8F0', borderColor: '#CBE9D3' }]}>
            <View style={st.esq}>
              <Text style={[st.grande, { color: '#1E9E3E', fontSize: 26 }]}>🛵 Grátis</Text>
              <Text style={st.peq}>Pedidos {brl(PRIMEIRA_TELE.minimoPedido)}+</Text>
            </View>
            <View style={st.corte} />
            <View style={st.dir}>
              <Text style={[st.nome, { color: '#1E9E3E' }]}>Primeira tele grátis!</Text>
              <Text style={st.peq}>No seu 1º pedido do Food</Text>
              <Text style={st.peq}>Presente do Realyz</Text>
            </View>
          </View>

          <TouchableOpacity onPress={salvar} style={st.botao} accessibilityLabel="Salvar cupons">
            <Text style={st.botaoTxt}>Salvar cupons</Text>
          </TouchableOpacity>
          <Text style={st.nota}>O cupom desconta sozinho no carrinho.</Text>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  caixa: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 18, padding: 16, paddingTop: 20 },
  x: { position: 'absolute', top: 8, right: 8, padding: 6, zIndex: 2 },
  titulo: { color: '#A50E0E', fontWeight: '800', fontSize: 19, textAlign: 'center', marginBottom: 14, paddingHorizontal: 20 },
  cupom: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, marginBottom: 10, minHeight: 92 },
  esq: { width: '42%', alignItems: 'center', justifyContent: 'center', padding: 8 },
  corte: { width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#D9CFC4', marginVertical: 8 },
  dir: { flex: 1, justifyContent: 'center', padding: 10 },
  grande: { fontWeight: '900', fontSize: 34 },
  nome: { fontWeight: '800', fontSize: 15, marginBottom: 3 },
  peq: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
  botao: { backgroundColor: '#A50E0E', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  botaoTxt: { color: '#fff', fontWeight: '800', fontSize: 17 },
  nota: { color: colors.muted, fontSize: 11.5, textAlign: 'center', marginTop: 8 },
});
