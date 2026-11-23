// Aviso no Perfil enquanto o e-mail da conta não foi confirmado. Toca, digita o código de 6 números que
// chegou no e-mail (ou pede outro, ou corrige o e-mail). Com o e-mail confirmado, o "Esqueci a senha" funciona.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { api, serverOn, deviceKey, verificarAparelho } from '../api';
import { fotoDoRosto } from '../serverAuth';
import { useStore } from '../store';
import { conectado } from '../serverShop';
import { colors } from '../theme';

export default function ConfirmarEmail() {
  const { state } = useStore();
  const on = serverOn() && conectado(state);
  const [conta, setConta] = useState(null); // { email, emailOk }
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [login, setLogin] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!on) return;
    let vivo = true;
    api('GET', '/me')
      .then((me) => {
        if (!vivo || !me || !me.user) return;
        setConta({ email: me.user.email, emailOk: !!me.user.emailOk });
        setLogin(me.user.username || '');
      })
      .catch(() => {});
    return () => (vivo = false);
  }, [on]);
  if (!on || !conta || conta.emailOk) return null;

  // Cadastrar ou trocar o e-mail pede a senha (e o rosto, se a conta tem biometria e já tinha e-mail).
  const enviar = async (novo) => {
    if (novo && !senha) return Alert.alert('Senha', 'Digite sua senha para cadastrar ou trocar o e-mail.');
    setBusy(true);
    try {
      const corpo = novo ? { email: novo, senha } : {};
      let r;
      try {
        r = await api('POST', '/me/email/enviar', corpo);
      } catch (e) {
        if (e.code !== 'biometria_aparelho') throw e;
        const buf = await fotoDoRosto();
        if (!buf) return;
        const aparelhoToken = await verificarAparelho(login, buf);
        r = await api('POST', '/me/email/enviar', { ...corpo, deviceKey: await deviceKey(), aparelhoToken });
      }
      setSenha('');
      setEmail('');
      setConta({ email: r.email, emailOk: !!r.emailOk });
      Alert.alert('Código enviado', `Mandamos um código de 6 números para ${r.email}. Olhe também o spam.`);
    } catch (e) {
      Alert.alert('E-mail', e.message);
    } finally {
      setBusy(false);
    }
  };
  const confirmar = async () => {
    if (codigo.length !== 6) return Alert.alert('Código', 'Digite os 6 números que chegaram no seu e-mail.');
    setBusy(true);
    try {
      await api('POST', '/me/email/confirmar', { codigo });
      setConta((c) => ({ ...c, emailOk: true }));
      setAberto(false);
      Alert.alert('E-mail confirmado ✅', 'Agora você consegue recuperar a conta se esquecer a senha.');
    } catch (e) {
      Alert.alert('Código', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.banner} onPress={() => setAberto(true)} activeOpacity={0.85} accessibilityLabel="Confirmar e-mail">
        <Ionicons name="mail-unread-outline" size={20} color={colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{conta.email ? 'Confirme seu e-mail' : 'Cadastre seu e-mail'}</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>Para recuperar a conta se esquecer a senha</Text>
        </View>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12.5 }}>{conta.email ? 'Confirmar' : 'Cadastrar'}</Text>
      </TouchableOpacity>
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <View style={styles.back}>
          <View style={styles.sheet}>
            <View style={styles.head}>
              <Text style={styles.title}>{conta.email ? 'Confirmar e-mail' : 'Cadastrar e-mail'}</Text>
              <TouchableOpacity onPress={() => setAberto(false)} hitSlop={10} accessibilityLabel="Fechar">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
{conta.email ? (
              <>
            <Text style={styles.txt}>Digite o código que chegou em {conta.email}.</Text>
            <TextInput value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="Código de 6 números" placeholderTextColor={colors.muted} style={[styles.input, { letterSpacing: 4, textAlign: 'center' }]} />
            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={confirmar} disabled={busy}>
              <Text style={styles.btnTxt}>{busy ? 'Conferindo…' : 'Confirmar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => enviar()} disabled={busy} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={styles.link}>Não chegou? Enviar outro código</Text>
            </TouchableOpacity>
              </>
            ) : null}
            <Text style={[styles.txt, { marginTop: conta.email ? 14 : 0, marginBottom: 6 }]}>{conta.email ? 'E-mail errado? Troque aqui (pede sua senha):' : 'Sua conta ainda não tem e-mail. Cadastre um para poder recuperar a conta:'}</Text>
            <TextInput value={senha} onChangeText={setSenha} secureTextEntry placeholder="Sua senha" placeholderTextColor={colors.muted} style={styles.input} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="E-mail certo" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, marginBottom: 0 }]} />
              <TouchableOpacity onPress={() => email.trim() && enviar(email.trim())} disabled={busy} style={styles.small}>
                <Text style={styles.link}>{conta.email ? 'Trocar' : 'Cadastrar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 12, marginBottom: 10 },
  back: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  txt: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, marginBottom: 10, fontSize: 15 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  link: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  small: { paddingHorizontal: 12, paddingVertical: 10 },
});
