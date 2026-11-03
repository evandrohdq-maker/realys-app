import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore } from '../store';
import { ADMIN_LOGIN } from '../data';
import { colors } from '../theme';

const onlyDigits = (v) => v.replace(/\D/g, '');

const formatCpf = (d) =>
  d
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');

const formatCnpj = (d) =>
  d
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

// Um campo só: usuário, CPF ou CNPJ. O tipo de acesso vem da própria conta.
function detect(value) {
  const v = value.trim();
  const d = onlyDigits(v);
  const numeric = v.length > 0 && /^[\d.\-\/\s]+$/.test(v);
  if (v.toLowerCase() === ADMIN_LOGIN.user) return { kind: 'admin' };
  if (numeric && d.length === 14) return { kind: 'cnpj', doc: formatCnpj(d) };
  if (numeric && d.length === 11) return { kind: 'cpf', doc: formatCpf(d) };
  if (numeric) return { kind: 'incompleto' };
  if (v.length >= 3) return { kind: 'usuario' };
  return { kind: 'vazio' };
}

// Na demonstração, a conta define os acessos:
// CNPJ → empresa e fornecedor (e também cliente); CPF ou usuário → cliente e prestador.
function userFor(value, info) {
  if (info.kind === 'cnpj') return { name: 'Minha Empresa', roles: ['empresa', 'fornecedor', 'cliente'], cnpj: info.doc };
  if (info.kind === 'cpf') return { name: 'Cliente Realys', roles: ['cliente', 'prestador'], cpf: info.doc, cnpj: '12.345.678/0001-90' };
  const name = value.trim().replace(/^@/, '');
  return { name: name.charAt(0).toUpperCase() + name.slice(1), roles: ['cliente', 'prestador'], cnpj: '12.345.678/0001-90' };
}

export default function LoginScreen() {
  const { dispatch } = useStore();
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const info = detect(value);

  const onChange = (v) => {
    // Se a pessoa digita só números, formata como CPF ou CNPJ automaticamente.
    if (/^[\d.\-\/\s]*$/.test(v) && onlyDigits(v).length) {
      const d = onlyDigits(v);
      setValue(d.length > 11 ? formatCnpj(d) : formatCpf(d));
    } else setValue(v);
  };

  const hint = {
    vazio: '',
    incompleto: 'Continue digitando: CPF tem 11 números e CNPJ tem 14.',
    cpf: 'CPF reconhecido',
    cnpj: 'CNPJ reconhecido · acesso de empresa',
    usuario: 'Usuário',
    admin: 'Acesso do administrador',
  }[info.kind];

  const enter = async () => {
    if (info.kind === 'vazio' || info.kind === 'incompleto') {
      return Alert.alert('Confira o acesso', 'Digite seu usuário, CPF ou CNPJ.');
    }
    if (info.kind === 'admin') {
      if (password !== ADMIN_LOGIN.password) return Alert.alert('Acesso negado', 'Senha incorreta.');
      return dispatch({
        type: 'LOGIN',
        user: { name: 'Administrador', roles: ['admin', 'cliente', 'empresa', 'prestador', 'fornecedor'], cnpj: '12.345.678/0001-90' },
      });
    }
    const finish = () => dispatch({ type: 'LOGIN', user: userFor(value, info) });
    setBusy(true);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        Alert.alert('Biometria não encontrada', 'Este aparelho não tem digital ou rosto cadastrado. Entrando no modo demonstração.', [
          { text: 'OK', onPress: finish },
        ]);
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme que é você para entrar no Realys',
        cancelLabel: 'Cancelar',
      });
      if (res.success) finish();
      else Alert.alert('Não foi possível confirmar sua identidade.');
    } catch (e) {
      finish();
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <View style={styles.mark}>
            <Ionicons name="cube-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.logo}>REALYS</Text>
          <Text style={styles.headline}>Você no comando.</Text>
          <Text style={styles.tagline}>Pessoas reais. Negócios reais.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Usuário, CPF ou CNPJ</Text>
          <View style={styles.field}>
            <Ionicons name="person-outline" size={20} color={colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="Digite seu usuário, CPF ou CNPJ"
              placeholderTextColor={colors.muted}
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={enter}
            />
          </View>
          {hint ? (
            <Text style={[styles.hint, (info.kind === 'cpf' || info.kind === 'cnpj') && { color: colors.primary }]}>{hint}</Text>
          ) : null}

          {info.kind === 'admin' ? (
            <View style={[styles.field, { marginTop: 10 }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          ) : null}

          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={enter} disabled={busy} activeOpacity={0.85}>
            <Ionicons name={info.kind === 'admin' ? 'log-in-outline' : 'finger-print'} size={20} color={colors.onPrimary} />
            <Text style={styles.btnText}>{busy ? 'Verificando…' : info.kind === 'admin' ? 'Entrar' : 'Entrar com biometria'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandBlock: { alignItems: 'center', marginBottom: 36 },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(59,232,255,0.5)',
    backgroundColor: 'rgba(59,232,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  logo: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: 8 },
  headline: { fontSize: 30, color: colors.text, fontWeight: '900', marginTop: 18, letterSpacing: -0.5, textAlign: 'center' },
  tagline: { fontSize: 17, color: colors.accent, fontWeight: '700', marginTop: 6 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(59,232,255,0.25)',
    padding: 18,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, marginLeft: 10, paddingVertical: 0 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  btn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  btnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16, marginLeft: 8 },
});
