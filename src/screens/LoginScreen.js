import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore } from '../store';
import { ADMIN_LOGIN } from '../data';
import { colors, ROLE_LABELS } from '../theme';
import { Button, Input } from '../components/ui';

const ROLE_INFO = {
  cliente: 'Compro, peço comida e chamo serviços',
  empresa: 'Tenho uma empresa (CNPJ) e quero vender e gerenciar',
  prestador: 'Sou motorista, motoboy ou MEI prestador de serviço',
  fornecedor: 'Vendo no atacado para outras empresas',
};

const formatCnpj = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export default function LoginScreen() {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [roles, setRoles] = useState(['cliente', 'empresa', 'prestador', 'fornecedor']);
  const [busy, setBusy] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const adminLogin = () => {
    if (adminUser.trim().toLowerCase() === ADMIN_LOGIN.user && adminPass === ADMIN_LOGIN.password) {
      dispatch({
        type: 'LOGIN',
        user: { name: 'Administrador', roles: ['admin', 'cliente', 'empresa', 'prestador', 'fornecedor'], cnpj: '12.345.678/0001-90' },
      });
    } else {
      Alert.alert('Acesso negado', 'Usuário ou senha incorretos.');
    }
  };

  const needsCnpj = roles.includes('empresa') || roles.includes('fornecedor');

  const toggle = (r) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const finish = () =>
    dispatch({
      type: 'LOGIN',
      user: { name: name.trim() || 'Visitante', roles, cnpj: cnpj || '12.345.678/0001-90' },
    });

  const enterWithBiometrics = async () => {
    if (!roles.length) return Alert.alert('Escolha pelo menos um perfil.');
    setBusy(true);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        Alert.alert(
          'Biometria não encontrada',
          'Este aparelho não tem digital ou rosto cadastrado. Entrando no modo demonstração.',
          [{ text: 'OK', onPress: finish }]
        );
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.dark }} contentContainerStyle={styles.wrap}>
      <Text style={styles.logo}>Realys</Text>
      <Text style={styles.tagline}>Pessoas reais. Negócios reais.</Text>
      <Text style={styles.desc}>
        Rede social, loja, comida, serviços e gestão da sua empresa num só app. Todo mundo aqui é verificado por
        biometria.
      </Text>

      <View style={styles.panel}>
        <Text style={styles.label}>Seu nome</Text>
        <Input placeholder="Ex.: Maria Oliveira" value={name} onChangeText={setName} />

        <Text style={styles.label}>Como você vai usar o Realys? (pode escolher vários)</Text>
        {Object.keys(ROLE_LABELS).filter((r) => r !== 'admin').map((r) => {
          const on = roles.includes(r);
          return (
            <TouchableOpacity key={r} onPress={() => toggle(r)} style={[styles.role, on && styles.roleOn]}>
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Text style={styles.checkMark}>✓</Text> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{ROLE_LABELS[r]}</Text>
                <Text style={styles.roleDesc}>{ROLE_INFO[r]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {needsCnpj ? (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>CNPJ da empresa</Text>
            <Input
              placeholder="00.000.000/0000-00 (opcional na demonstração)"
              keyboardType="number-pad"
              value={cnpj}
              onChangeText={(v) => setCnpj(formatCnpj(v))}
            />
          </>
        ) : null}

        <Button title={busy ? 'Verificando…' : '🔒  Entrar com biometria'} onPress={enterWithBiometrics} disabled={busy} />
        <Text style={styles.note}>Versão de demonstração: os dados, empresas e produtos são exemplos.</Text>
      </View>

      <TouchableOpacity onPress={() => setAdminMode(!adminMode)} style={{ marginTop: 18, alignSelf: 'center' }}>
        <Text style={{ color: '#B8C6CF', fontWeight: '700' }}>🛡️ Acesso do administrador</Text>
      </TouchableOpacity>
      {adminMode ? (
        <View style={[styles.panel, { marginTop: 12 }]}>
          <Text style={styles.label}>Usuário</Text>
          <Input placeholder="Usuário" autoCapitalize="none" value={adminUser} onChangeText={setAdminUser} />
          <Text style={styles.label}>Senha</Text>
          <Input placeholder="Senha" secureTextEntry value={adminPass} onChangeText={setAdminPass} />
          <Button title="Entrar como administrador" variant="dark" onPress={adminLogin} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 22, paddingTop: 70, paddingBottom: 40 },
  logo: { fontSize: 46, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 18, color: colors.accent, fontWeight: '700', marginTop: 2 },
  desc: { color: '#B8C6CF', fontSize: 14, marginTop: 10, lineHeight: 20 },
  panel: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 24 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },
  roleOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 13 },
  roleTitle: { fontWeight: '700', color: colors.text },
  roleDesc: { fontSize: 12, color: colors.muted, marginTop: 1 },
  note: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 10 },
});
