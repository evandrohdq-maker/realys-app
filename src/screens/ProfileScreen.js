import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { askMicPermission, wakeWordSupported } from '../wakeWord';
import { useStore } from '../store';
import { colors, brl, ROLE_LABELS } from '../theme';
import { Screen, Title, Card, Row, Button, Badge } from '../components/ui';
import UpdateChecker from '../components/UpdateChecker';
import { VERSION_LABEL } from '../updates';

const ROLE_ICON = { cliente: '🛍️', empresa: '🏪', prestador: '🛵', fornecedor: '🚚', admin: '🛡️' };

export default function ProfileScreen() {
  const { state, dispatch } = useStore();
  const u = state.user;
  const [checking, setChecking] = useState(false);
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
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <Text style={{ color: colors.muted }}>Saldo Realys</Text>
          <Text style={{ fontWeight: '800', color: colors.primary }}>{brl(state.wallet)}</Text>
        </Row>
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
            <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>Acionar falando "Realys"</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              Com o app aberto, diga "Realys, preciso de um eletricista" e a Realys atende, sem tocar na tela e sem "Ok Google".
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

      <Button title="Sair" variant="outline" onPress={() => dispatch({ type: 'LOGOUT' })} style={{ marginTop: 10 }} />
      <Button title="Verificar atualizações" variant="light" onPress={() => setChecking(true)} style={{ marginTop: 10 }} />
      {checking ? <UpdateChecker manual onDone={() => setChecking(false)} /> : null}
      <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 14 }}>
        Realys · {VERSION_LABEL} · demonstração
      </Text>
    </Screen>
  );
}
