// "Esqueci a senha": pede o código por e-mail e cria uma senha nova (server/src/routes/auth.js).
// Passo 1: usuário, CPF, CNPJ ou e-mail. Passo 2: código de 6 números + senha nova (conta com biometria
// confirma o rosto também). Perdeu o e-mail? Passo 'rosto': recupera pelo rosto com e-mail e senha novos.
import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { api, serverOn, deviceKey, verificarAparelho } from '../api';
import { fotoDoRosto } from '../serverAuth';
import { colors } from '../theme';

export default function EsqueciSenha({ visible, onClose, loginInicial = '', onPronto }) {
  const [passo, setPasso] = useState(1);
  const [login, setLogin] = useState(loginInicial);
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [para, setPara] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailNovo, setEmailNovo] = useState('');

  const fechar = () => {
    setPasso(1);
    setCodigo('');
    setSenha('');
    onClose && onClose();
  };
  // Confere o rosto com o cadastro e devolve { deviceKey, aparelhoToken } (ou null se a pessoa desistiu).
  const conferirRosto = async () => {
    const buf = await fotoDoRosto();
    if (!buf) return null;
    const aparelhoToken = await verificarAparelho(login.trim(), buf);
    return { deviceKey: await deviceKey(), aparelhoToken };
  };
  const pedir = async () => {
    if (!serverOn()) return Alert.alert('Sem servidor', 'A troca de senha precisa da internet ligada.');
    if (login.trim().length < 3) return Alert.alert('Esqueci a senha', 'Digite seu usuário, CPF, CNPJ ou e-mail.');
    setBusy(true);
    try {
      const r = await api('POST', '/auth/esqueci', { login: login.trim() });
      setPara(r.para || '');
      setPasso(2);
    } catch (e) {
      Alert.alert('Esqueci a senha', e.message);
    } finally {
      setBusy(false);
    }
  };
  const recuperarRosto = async () => {
    if (login.trim().length < 3) return Alert.alert('Recuperar pelo rosto', 'Digite seu usuário, CPF ou CNPJ.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailNovo.trim())) return Alert.alert('E-mail novo', 'Digite um e-mail válido que você usa.');
    if (senha.length < 8) return Alert.alert('Senha nova', 'A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    try {
      const rosto = await conferirRosto();
      if (!rosto) return;
      const r = await api('POST', '/auth/recuperar-rosto', { login: login.trim(), email: emailNovo.trim(), senha, ...rosto });
      Alert.alert('Conta recuperada ✅', r.mensagem || 'Entre com a senha nova.');
      onPronto && onPronto(login.trim());
      fechar();
    } catch (e) {
      Alert.alert('Não deu certo', e.message);
    } finally {
      setBusy(false);
    }
  };
  const trocar = async () => {
    if (codigo.replace(/\D/g, '').length !== 6) return Alert.alert('Código', 'Digite os 6 números que chegaram no seu e-mail.');
    if (senha.length < 8) return Alert.alert('Senha nova', 'A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    try {
      let r;
      try {
        r = await api('POST', '/auth/esqueci/confirmar', { login: login.trim(), codigo, senha });
      } catch (e) {
        // Conta com biometria: o servidor pede o rosto antes de trocar a senha.
        if (e.code !== 'biometria_aparelho') throw e;
        const rosto = await conferirRosto();
        if (!rosto) return Alert.alert('Confirme seu rosto', 'Sua conta tem biometria: para trocar a senha, confirme que é você.');
        r = await api('POST', '/auth/esqueci/confirmar', { login: login.trim(), codigo, senha, ...rosto });
      }
      Alert.alert('Pronto ✅', r.mensagem || 'Senha trocada. Entre com a senha nova.');
      onPronto && onPronto(login.trim());
      fechar();
    } catch (e) {
      Alert.alert('Não deu certo', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.back}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{passo === 1 ? 'Esqueci a senha' : passo === 'rosto' ? 'Recuperar pelo rosto' : 'Criar senha nova'}</Text>
            <TouchableOpacity onPress={fechar} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {passo === 'rosto' ? (
            <>
              <Text style={styles.txt}>Perdeu o acesso ao e-mail? Se a sua conta tem biometria, confirme seu rosto e cadastre um e-mail e uma senha novos.</Text>
              <TextInput value={login} onChangeText={setLogin} autoCapitalize="none" placeholder="Usuário, CPF ou CNPJ" placeholderTextColor={colors.muted} style={styles.input} />
              <TextInput value={emailNovo} onChangeText={setEmailNovo} autoCapitalize="none" keyboardType="email-address" placeholder="E-mail novo" placeholderTextColor={colors.muted} style={styles.input} />
              <TextInput value={senha} onChangeText={setSenha} secureTextEntry placeholder="Senha nova (mínimo 8)" placeholderTextColor={colors.muted} style={styles.input} />
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={recuperarRosto} disabled={busy}>
                <Text style={styles.btnTxt}>{busy ? 'Conferindo…' : 'Confirmar meu rosto'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPasso(1)} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={styles.link}>Voltar para o código por e-mail</Text>
              </TouchableOpacity>
            </>
          ) : passo === 1 ? (
            <>
              <Text style={styles.txt}>Digite seu usuário, CPF, CNPJ ou e-mail. Mandamos um código para o e-mail da conta.</Text>
              <TextInput value={login} onChangeText={setLogin} autoCapitalize="none" placeholder="Usuário, CPF, CNPJ ou e-mail" placeholderTextColor={colors.muted} style={styles.input} />
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={pedir} disabled={busy}>
                <Text style={styles.btnTxt}>{busy ? 'Enviando…' : 'Enviar código'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPasso('rosto')} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={styles.link}>Perdi o acesso ao e-mail · Recuperar pelo rosto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.txt}>{para ? `Se a conta existir, o código foi para ${para}. Ele vale 15 minutos.` : 'Se a conta existir e tiver e-mail, o código chegou lá. Ele vale 15 minutos.'}</Text>
              <TextInput value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="Código de 6 números" placeholderTextColor={colors.muted} style={[styles.input, { letterSpacing: 4, textAlign: 'center' }]} />
              <TextInput value={senha} onChangeText={setSenha} secureTextEntry placeholder="Senha nova (mínimo 8)" placeholderTextColor={colors.muted} style={styles.input} />
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={trocar} disabled={busy}>
                <Text style={styles.btnTxt}>{busy ? 'Trocando…' : 'Trocar a senha'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPasso(1)} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={styles.link}>Não chegou? Pedir outro código</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(20,18,14,0.35)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  txt: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, marginBottom: 10, fontSize: 15 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  link: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
