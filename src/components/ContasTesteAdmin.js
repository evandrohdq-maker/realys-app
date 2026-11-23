// Administrador › Visão geral › Contas de teste: cria contas de pessoa, prestador ou empresa (sem CPF/CNPJ
// de verdade, marcadas como "Teste") para ver o app como cada tipo de usuário antes do lançamento.
// Depois é só sair e entrar com o usuário e a senha da conta de teste (ou "Trocar usuário").
import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { Text } from '../responsive';
import { api, serverOn } from '../api';
import { colors } from '../theme';
import { Card, Row, Button, Badge, Chip, Input } from './ui';

const TIPOS = [
  { id: 'pessoa', nome: 'Usuário' },
  { id: 'prestador', nome: 'Prestador' },
  { id: 'empresa', nome: 'Empresa' },
];
const NOME = { pessoa: 'Usuário', prestador: 'Prestador', empresa: 'Empresa' };

export default function ContasTesteAdmin() {
  const [lista, setLista] = useState(null);
  const [tipo, setTipo] = useState('prestador');
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api('GET', '/admin/contas-teste').then(setLista).catch(() => setLista(null)), []);
  useEffect(() => {
    if (serverOn()) load();
  }, []);
  if (!serverOn() || !lista) return null;
  const criar = async () => {
    setBusy(true);
    try {
      const c = await api('POST', '/admin/contas-teste', { name: nome.trim(), username: usuario.trim(), password: senha, tipo });
      Alert.alert('Conta de teste criada ✅', `Entre com o usuário ${c.username} e a senha que você escolheu: saia da conta do administrador (ou toque em Trocar usuário) e entre com ela.`);
      setNome('');
      setUsuario('');
      setSenha('');
      load();
    } catch (e) {
      Alert.alert('Não deu certo', e.message);
    } finally {
      setBusy(false);
    }
  };
  const desativar = (c) =>
    Alert.alert('Desativar a conta de teste?', c.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desativar', style: 'destructive', onPress: () => api('DELETE', `/admin/contas-teste/${c.id}`).then(load).catch((e) => Alert.alert('Não deu certo', e.message)) },
    ]);
  return (
    <Card>
      <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>🧪 Contas de teste</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Para ver o app como prestador, empresa ou usuário. Sem CPF e sem CNPJ; ficam marcadas como "Teste" e não compram nada.</Text>
      <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
        {TIPOS.map((t) => (
          <Chip key={t.id} label={t.nome} active={tipo === t.id} onPress={() => setTipo(t.id)} />
        ))}
      </Row>
      <Input placeholder={tipo === 'empresa' ? 'Nome da empresa (ex.: Loja Teste)' : 'Nome (ex.: Prestador Teste)'} value={nome} onChangeText={setNome} style={{ marginTop: 6 }} />
      <Input placeholder="Usuário para entrar (ex.: prestateste)" value={usuario} onChangeText={setUsuario} autoCapitalize="none" style={{ marginTop: 6 }} />
      <Input placeholder="Senha (8 ou mais, com letra e número)" value={senha} onChangeText={setSenha} secureTextEntry style={{ marginTop: 6 }} />
      <Button title={busy ? 'Criando…' : `Criar conta de ${NOME[tipo].toLowerCase()}`} onPress={criar} disabled={busy || !nome.trim() || !usuario.trim() || !senha} style={{ marginTop: 8 }} />
      {lista.map((c) => (
        <Row key={c.id} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{c.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>*{c.username}</Text>
          </View>
          <Badge label={NOME[c.tipo] || 'Usuário'} color={colors.primary} />
          <Button small variant="outline" title="Desativar" onPress={() => desativar(c)} style={{ marginLeft: 6 }} />
        </Row>
      ))}
    </Card>
  );
}
