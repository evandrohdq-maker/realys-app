import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { askMicPermission, wakeWordSupported } from '../wakeWord';
import { useStore } from '../store';
import { colors, brl, ROLE_LABELS } from '../theme';
import { Screen, Title, Card, Row, Button, Badge } from '../components/ui';
import UpdateChecker from '../components/UpdateChecker';
import { VERSION_LABEL } from '../updates';
import { getSavedUsers, forgetUser } from '../accounts';
import { ProfileSocial } from '../components/SocialProfile';
import WalletScreen from './WalletScreen';

const ROLE_ICON = { cliente: '🛍️', empresa: '🏪', prestador: '🛵', fornecedor: '🚚', admin: '🛡️' };

export default function ProfileScreen({ navigate, explore }) {
  const { state, dispatch } = useStore();
  const u = state.user;
  const [checking, setChecking] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  // "Lotus, abre minha carteira": já abre a carteira.
  useEffect(() => {
    if (explore && explore.tab === 'perfil' && explore.wallet) setWalletOpen(true);
  }, [explore]);

  // Sai da conta e volta para a tela "Quem vai usar o Realys?".
  const switchUser = () =>
    Alert.alert('Trocar usuário', `Sair da conta de ${u.name} para outra pessoa entrar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Trocar', onPress: () => dispatch({ type: 'LOGOUT' }) },
    ]);

  // Ao sair, pergunta se a conta continua salva neste celular.
  const logout = async () => {
    const saved = await getSavedUsers();
    const mine = saved.find((s) => (u.id && s.user.id === u.id) || (s.user.name === u.name && s.user.cpf === u.cpf && s.user.cnpj === u.cnpj));
    if (!mine) return dispatch({ type: 'LOGOUT' });
    Alert.alert('Sair do Realys', 'Sua conta está salva neste aparelho. Quer manter para entrar só com a biometria da próxima vez?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover e sair',
        style: 'destructive',
        onPress: async () => {
          await forgetUser(mine.key).catch(() => {});
          dispatch({ type: 'LOGOUT' });
        },
      },
      { text: 'Manter e sair', onPress: () => dispatch({ type: 'LOGOUT' }) },
    ]);
  };
  return (
    <Screen>
      <Title>Meu perfil</Title>
      <Card>
        <Row>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: 24, fontWeight: '900' }}>{u.name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{u.name}</Text>
            <Badge label="✔ Identidade verificada por biometria" />
          </View>
          {/* Botão de emergência: pequeno, com brilho vermelho. As informações abrem na tela de Socorro. */}
          <TouchableOpacity
            onPress={() => navigate && navigate({ tab: 'socorro', seg: 'emergencia' })}
            accessibilityLabel="SOS, socorro e emergência"
            activeOpacity={0.8}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.danger,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: '#FFC9C7',
              shadowColor: '#FF1E1E',
              shadowOpacity: 0.9,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>SOS</Text>
          </TouchableOpacity>
        </Row>
        {/* Carteira em destaque: o saldo só aparece aqui no Perfil. */}
        <TouchableOpacity onPress={() => setWalletOpen(true)} activeOpacity={0.88} style={styles.wallet} accessibilityLabel="Abrir minha carteira">
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>Carteira Realys</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22 }}>{brl(state.wallet)}</Text>
          </View>
          <View style={styles.walletBtn}>
            <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>Gerenciar</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Depósitos, gastos, recebidos, saques e o balanço do mês.</Text>
      </Card>

      {/* Perfil social: destaques, galeria de fotos, galeria de vídeos e depoimentos aceitos. */}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Meu perfil na Comunidade</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
          É o que seus amigos veem ao abrir seu perfil. Depoimentos só aparecem depois que você aceita.
        </Text>
        <ProfileSocial ownerId="me" />
      </Card>

      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginVertical: 8 }}>Trocar de perfil</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>
        Uma conta só, com acessos diferentes. Troque para ver o app como cada tipo de usuário.
      </Text>
      {u.roles.map((r) => {
        const on = state.activeRole === r;
        return (
          <TouchableOpacity key={r} onPress={() => dispatch({ type: 'SET_ROLE', role: r })}>
            <Card style={on ? { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryLight } : null}>
              <Row>
                <Text style={{ color: colors.text, fontSize: 26, marginRight: 12 }}>{ROLE_ICON[r]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{ROLE_LABELS[r]}</Text>
                  {r === 'empresa' || r === 'fornecedor' ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>CNPJ {u.cnpj}</Text>
                  ) : null}
                </View>
                {on ? <Badge label="Ativo" /> : null}
              </Row>
            </Card>
          </TouchableOpacity>
        );
      })}

      <Card style={{ backgroundColor: colors.primaryLight, borderColor: 'rgba(168,121,10,0.35)', marginTop: 8 }}>
        <Row>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>Acionar falando "abrir Lotus"</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              Com o app aberto, diga "abrir Lotus, preciso de um eletricista" e a Lotus, assistente do Realys, atende com voz suave, sem tocar na tela e sem "Ok Google".
            </Text>
          </View>
          <Switch
            value={state.handsFree}
            onValueChange={async (on) => {
              if (!on) return dispatch({ type: 'SET_HANDSFREE', on: false });
              if (!wakeWordSupported()) {
                return Alert.alert('Não disponível', 'Este celular não tem reconhecimento de voz disponível para o Realys.');
              }
              const ok = await askMicPermission();
              if (!ok) return Alert.alert('Microfone bloqueado', 'Permita o microfone para o Realys nas configurações do celular.');
              dispatch({ type: 'SET_HANDSFREE', on: true });
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={state.handsFree ? '#FFFFFF' : colors.muted}
          />
        </Row>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
          Funciona com o Realys aberto e a tela ligada. Com o celular bloqueado será a próxima etapa.
        </Text>
      </Card>

      <Card>
        <Row>
          <Ionicons name="people-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Trocar usuário</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              Celular compartilhado (ex.: aparelho da empresa)? Saia da sua conta e outra pessoa entra com a dela. As contas salvas aparecem na entrada.
            </Text>
          </View>
        </Row>
        <Button title="Trocar usuário" onPress={switchUser} style={{ marginTop: 12 }} />
      </Card>

      <Button title="Sair" variant="outline" onPress={logout} style={{ marginTop: 10 }} />
      <Button title="Verificar atualizações" variant="light" onPress={() => setChecking(true)} style={{ marginTop: 10 }} />
      {checking ? <UpdateChecker manual onDone={() => setChecking(false)} /> : null}
      <WalletScreen visible={walletOpen} onClose={() => setWalletOpen(false)} />
      <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 14 }}>
        Realys · {VERSION_LABEL} · demonstração
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  walletIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 10, height: 30 },
});
