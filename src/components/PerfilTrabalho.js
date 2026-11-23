// Perfil de trabalho (uma conta, vários perfis). Pessoa: cria o perfil de prestador ou de artista com o
// CNPJ do próprio CPF (MEI vale); só aí aparecem as funções de trabalho. Empresa: o titular cria o
// perfil social dele, e o botão de troca passa a ir da empresa para o social.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { api, serverOn } from '../api';
import { useStore } from '../store';
import { conectado } from '../serverShop';
import { rolesDoServidor } from '../serverAuth';
import { colors } from '../theme';

const formatCnpj = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};
const TIPOS = [
  ['prestador', 'Prestador de serviço', 'construct-outline'],
  ['artista', 'Artista', 'mic-outline'],
];

export default function PerfilTrabalho() {
  const { state, dispatch } = useStore();
  const on = serverOn() && conectado(state);
  const [eu, setEu] = useState(null);
  const [perfis, setPerfis] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState('prestador');
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const carregar = () =>
    api('GET', '/me')
      .then((me) => {
        setEu(me.user);
        // Admin/analista têm os perfis próprios do painel: não mexe.
        if (!(state.user && (state.user.roles || []).includes('admin'))) dispatch({ type: 'SET_USER_ROLES', roles: rolesDoServidor(me.user) });
        return me.user.kind === 'empresa' ? [] : api('GET', '/me/trabalho');
      })
      .then((l) => setPerfis(l || []))
      .catch(() => {});
  useEffect(() => {
    if (on) carregar();
  }, [on]);
  if (!on || !eu) return null;

  // Empresa: criar o perfil social do titular.
  if (eu.kind === 'empresa') {
    if (eu.socialTitular) return null;
    const criarSocial = () =>
      api('POST', '/me/perfil-social')
        .then(() => {
          Alert.alert('Perfil social criado ✅', 'Use o botãozinho de troca no topo para ir da empresa para o seu perfil social.');
          carregar();
        })
        .catch((e) => Alert.alert('Perfil social', e.message));
    return (
      <TouchableOpacity style={st.card} onPress={criarSocial} activeOpacity={0.85} accessibilityLabel="Criar meu perfil social">
        <Ionicons name="person-add-outline" size={20} color={colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.t}>Criar meu perfil social</Text>
          <Text numberOfLines={1} style={st.s}>Para o titular navegar e comprar como pessoa</Text>
        </View>
        <Text style={st.acao}>Criar</Text>
      </TouchableOpacity>
    );
  }

  const enviar = async () => {
    if (String(cnpj).replace(/\D/g, '').length !== 14) return Alert.alert('CNPJ', 'Digite os 14 números do CNPJ.');
    if (nome.trim().length < 2) return Alert.alert('Nome', 'Digite o nome do seu perfil de trabalho (como os clientes vão ver).');
    setBusy(true);
    try {
      const l = await api('POST', '/me/trabalho', { tipo, cnpj, nome: nome.trim() });
      setPerfis(l);
      const p = l.find((x) => x.tipo === tipo);
      setAberto(false);
      if (p && p.status === 'ativo') {
        Alert.alert('Perfil de trabalho criado ✅', 'O CNPJ confere com o seu CPF. Use o botãozinho de troca no topo para ir para o seu perfil de trabalho.');
      } else {
        Alert.alert('Em análise', 'Não deu para conferir o CNPJ na Receita agora. A equipe do Realyz confere e libera o seu perfil de trabalho.');
      }
      carregar();
    } catch (e) {
      Alert.alert('Perfil de trabalho', e.message);
    } finally {
      setBusy(false);
    }
  };
  const resumo = perfis.filter((p) => p.status === 'ativo' || p.status === 'em_analise');

  return (
    <>
      <TouchableOpacity style={st.card} onPress={() => setAberto(true)} activeOpacity={0.85} accessibilityLabel="Perfil de trabalho">
        <Ionicons name="briefcase-outline" size={20} color={colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.t}>Perfil de trabalho</Text>
          <Text numberOfLines={1} style={st.s}>
            {resumo.length ? resumo.map((p) => `${p.rotulo}${p.status === 'em_analise' ? ' (em análise)' : ''}`).join(' · ') : 'Prestar serviço ou vender como artista, com o seu CNPJ'}
          </Text>
        </View>
        <Text style={st.acao}>{resumo.length ? 'Gerenciar' : 'Criar'}</Text>
      </TouchableOpacity>
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <View style={st.back}>
          <View style={st.sheet}>
            <View style={st.head}>
              <Text style={st.title}>Perfil de trabalho</Text>
              <TouchableOpacity onPress={() => setAberto(false)} hitSlop={10} accessibilityLabel="Fechar">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={st.txt}>Para trabalhar no Realyz, informe o CNPJ aberto com o seu CPF (MEI vale). O seu perfil social continua só para navegar e comprar.</Text>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {TIPOS.map(([k, l, ic]) => (
                <TouchableOpacity key={k} onPress={() => setTipo(k)} style={[st.tipo, tipo === k && st.tipoOn]} accessibilityLabel={l}>
                  <Ionicons name={ic} size={16} color={colors.text} />
                  <Text numberOfLines={1} style={st.tipoTxt}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={cnpj} onChangeText={(v) => setCnpj(formatCnpj(v))} keyboardType="number-pad" placeholder="CNPJ (00.000.000/0000-00)" placeholderTextColor={colors.muted} style={st.input} />
            <TextInput value={nome} onChangeText={setNome} placeholder={tipo === 'artista' ? 'Nome artístico' : 'Nome do seu trabalho (ex.: João Elétrica)'} placeholderTextColor={colors.muted} style={st.input} />
            <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} onPress={enviar} disabled={busy}>
              <Text style={st.btnTxt}>{busy ? 'Conferindo na Receita…' : 'Criar perfil de trabalho'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 12, marginBottom: 10 },
  t: { color: colors.text, fontWeight: '700', fontSize: 14 },
  s: { color: colors.muted, fontSize: 12, marginTop: 1 },
  acao: { color: colors.text, fontWeight: '800', fontSize: 12.5 },
  back: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  txt: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  tipo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, marginHorizontal: 3 },
  tipoOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tipoTxt: { color: colors.text, fontWeight: '700', fontSize: 12.5, marginLeft: 6 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, marginBottom: 10, fontSize: 15 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
});
