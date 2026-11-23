// Verificação em duas etapas (Google Authenticator) no Perfil. Obrigatória para administrador,
// recomendada para empresas (a conta de empresa não passa pela biometria) e opcional para usuários.
// Ativar: abre o Authenticator pelo link (ou digita a chave à mão) e confirma com o primeiro código.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { api, serverOn } from '../api';
import { useStore } from '../store';
import { conectado } from '../serverShop';
import { colors } from '../theme';

export default function DuasEtapas() {
  const { state } = useStore();
  const on = serverOn() && conectado(state);
  const [ligado, setLigado] = useState(null);
  const [empresa, setEmpresa] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [ini, setIni] = useState(null); // { segredo, link }
  const [codigo, setCodigo] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!on) return;
    let vivo = true;
    api('GET', '/me')
      .then((me) => {
        if (!vivo || !me || !me.user) return;
        setLigado(!!me.user.duasEtapas);
        setEmpresa(me.user.kind === 'empresa' || (me.user.roles || []).includes('admin'));
      })
      .catch(() => {});
    return () => (vivo = false);
  }, [on]);
  if (!on || ligado == null) return null;

  const comecar = async () => {
    setBusy(true);
    try {
      setIni(await api('POST', '/me/2fa/iniciar'));
      setCodigo('');
      setAberto(true);
    } catch (e) {
      Alert.alert('Duas etapas', e.message);
    } finally {
      setBusy(false);
    }
  };
  const confirmar = async () => {
    if (codigo.length !== 6) return Alert.alert('Código', 'Digite os 6 números que aparecem no Authenticator.');
    setBusy(true);
    try {
      if (ligado) {
        await api('POST', '/me/2fa/desativar', { codigo });
        setLigado(false);
        Alert.alert('Desligada', 'A verificação em duas etapas foi desligada.');
      } else {
        await api('POST', '/me/2fa/ativar', { codigo });
        setLigado(true);
        Alert.alert('Ligada ✅', 'Daqui para frente, ao entrar com a senha, o Realyz também pede o código do Authenticator.');
      }
      setAberto(false);
    } catch (e) {
      Alert.alert('Código', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => (ligado ? (setIni(null), setCodigo(''), setAberto(true)) : comecar())} disabled={busy} activeOpacity={0.85} accessibilityLabel="Verificação em duas etapas">
        <Ionicons name={ligado ? 'shield-checkmark' : 'shield-outline'} size={20} color={ligado ? colors.success : colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Verificação em duas etapas</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
            {ligado ? 'Ligada · Google Authenticator' : empresa ? 'Recomendada para a sua conta' : 'Mais segurança com o Google Authenticator'}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12.5 }}>{ligado ? 'Desligar' : 'Ativar'}</Text>
      </TouchableOpacity>
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <View style={styles.back}>
          <View style={styles.sheet}>
            <View style={styles.head}>
              <Text style={styles.title}>{ligado ? 'Desligar duas etapas' : 'Ativar duas etapas'}</Text>
              <TouchableOpacity onPress={() => setAberto(false)} hitSlop={10} accessibilityLabel="Fechar">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {!ligado && ini ? (
              <>
                <Text style={styles.txt}>1. Instale o Google Authenticator na loja do celular.{'\n'}2. Toque no botão abaixo para adicionar o Realyz nele (ou digite a chave à mão).{'\n'}3. Digite aqui o código de 6 números que aparecer.</Text>
                <TouchableOpacity style={styles.btnLine} onPress={() => Linking.openURL(ini.link).catch(() => Alert.alert('Authenticator', 'Não abriu sozinho. Digite a chave à mão no Authenticator.'))}>
                  <Text style={styles.link}>Abrir no Google Authenticator</Text>
                </TouchableOpacity>
                <Text style={[styles.txt, { marginTop: 10, marginBottom: 4 }]}>Chave para digitar à mão:</Text>
                <Text selectable style={styles.chave}>{ini.segredo.replace(/(.{4})/g, '$1 ').trim()}</Text>
              </>
            ) : (
              <Text style={styles.txt}>Digite o código que aparece agora no Google Authenticator para desligar.</Text>
            )}
            <TextInput value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="Código de 6 números" placeholderTextColor={colors.muted} style={[styles.input, { letterSpacing: 4, textAlign: 'center' }]} />
            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={confirmar} disabled={busy}>
              <Text style={styles.btnTxt}>{busy ? 'Conferindo…' : ligado ? 'Desligar' : 'Ativar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 12, marginBottom: 10 },
  back: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  txt: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  chave: { color: colors.text, fontWeight: '700', fontSize: 15, letterSpacing: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10, textAlign: 'center', marginBottom: 12 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, marginBottom: 10, fontSize: 15 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnLine: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  btnTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  link: { color: colors.accent, fontWeight: '700', fontSize: 14 },
});
