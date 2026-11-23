// "Esqueci a senha": pede o código por e-mail e cria uma senha nova (server/src/routes/auth.js).
// Passo 1: usuário, CPF, CNPJ ou e-mail. Passo 2: código de 6 números + senha nova.
import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { api, serverOn } from '../api';
import { colors } from '../theme';

export default function EsqueciSenha({ visible, onClose, loginInicial = '', onPronto }) {
  const [passo, setPasso] = useState(1);
  const [login, setLogin] = useState(loginInicial);
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [para, setPara] = useState('');
  const [busy, setBusy] = useState(false);

  const fechar = () => {
    setPasso(1);
    setCodigo('');
    setSenha('');
    onClose && onClose();
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
  const trocar = async () => {
    if (codigo.replace(/\D/g, '').length !== 6) return Alert.alert('Código', 'Digite os 6 números que chegaram no seu e-mail.');
    if (senha.length < 8) return Alert.alert('Senha nova', 'A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    try {
      const r = await api('POST', '/auth/esqueci/confirmar', { login: login.trim(), codigo, senha });
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
            <Text style={styles.title}>{passo === 1 ? 'Esqueci a senha' : 'Criar senha nova'}</Text>
            <TouchableOpacity onPress={fechar} hitSlop={10} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {passo === 1 ? (
            <>
              <Text style={styles.txt}>Digite seu usuário, CPF, CNPJ ou e-mail. Mandamos um código para o e-mail da conta.</Text>
              <TextInput value={login} onChangeText={setLogin} autoCapitalize="none" placeholder="Usuário, CPF, CNPJ ou e-mail" placeholderTextColor={colors.muted} style={styles.input} />
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={pedir} disabled={busy}>
                <Text style={styles.btnTxt}>{busy ? 'Enviando…' : 'Enviar código'}</Text>
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
