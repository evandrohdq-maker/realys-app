// Atualização logo na abertura do app, ANTES do login (ou da conta já salva):
//   abriu o Realyz → procura versão nova → se tiver, baixa e instala na hora, com a barra de avanço
//   → o app reabre atualizado → aí sim vem a tela de senha (ou entra na conta salva).
// Não precisa estar logado. Sem versão nova (ou sem internet), segue direto, sem esperar.
// No Android 12+ a instalação é automática; se o Android pedir confirmação, aparece a tela dele.
// Se a automática falhar, abre o instalador normal do Android (um toque em "Atualizar"), para a
// atualização nunca ficar parada. Se nada der certo, segue para o app e tenta de novo na próxima vez.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Platform, AppState, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../responsive';
import { colors } from '../theme';
import { checkForUpdate, installUpdate, cleanupOldUpdate, supportsAutoUpdate, hasInstallPermission, openInstallPermission, onInstallStatus } from '../updates';

const CHECK_TIMEOUT_MS = 6000; // sem resposta do GitHub nesse tempo: segue para o app
const STUCK_MS = 4 * 60 * 1000; // baixando há mais que isso: segue para o app

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo')), ms))]);

export default function UpdateGate({ children }) {
  const android = Platform.OS === 'android';
  const [phase, setPhase] = useState(android ? 'checking' : 'ready'); // checking | downloading | installing | permission | ready
  const [pct, setPct] = useState(0);
  const info = useRef(null);
  const triedIntent = useRef(false);

  const go = () => setPhase('ready');

  // Plano B: instalador normal do Android (a pessoa toca em "Atualizar").
  const viaIntent = async () => {
    if (triedIntent.current || !info.current) return go();
    triedIntent.current = true;
    try {
      setPct(0);
      setPhase('downloading');
      await installUpdate(info.current.url, (st) => setPhase(st === 'installing' ? 'installing' : st), setPct, info.current.size, { forceIntent: true });
    } catch (e) {}
    go(); // voltou do instalador: se atualizou, o app reabre na versão nova; se cancelou, segue
  };

  const start = async () => {
    try {
      setPct(0);
      setPhase('downloading');
      const how = await installUpdate(info.current.url, (st) => setPhase(st === 'installing' ? 'installing' : st), setPct, info.current.size);
      if (how === 'intent') go();
      // 'native': o resultado chega por onInstallStatus (sucesso = o app reabre sozinho já atualizado)
    } catch (e) {
      viaIntent();
    }
  };

  useEffect(() => {
    if (!android) return undefined;
    cleanupOldUpdate();
    let alive = true;
    withTimeout(checkForUpdate(), CHECK_TIMEOUT_MS)
      .then((r) => {
        if (!alive) return;
        if (!r.available) return go();
        info.current = r;
        if (supportsAutoUpdate() && !hasInstallPermission()) return setPhase('permission');
        start();
      })
      .catch(() => alive && go());
    return () => {
      alive = false;
    };
  }, []);

  // Resultado da instalação automática: falhou → instalador normal; cancelou → segue.
  useEffect(
    () =>
      onInstallStatus((st) => {
        if (st === 'failed') viaIntent();
        else if (st === 'cancelled') go();
        else if (st === 'confirm') setPhase('installing');
      }),
    []
  );

  // Voltou das configurações com a chave ligada: começa a atualizar.
  useEffect(() => {
    if (phase !== 'permission') return undefined;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && hasInstallPermission() && info.current) start();
    });
    return () => sub.remove();
  }, [phase]);

  // Nunca prende a pessoa: se travar baixando, segue para o app.
  useEffect(() => {
    if (phase !== 'downloading' && phase !== 'installing') return undefined;
    const t = setTimeout(go, STUCK_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'ready') return children;

  const texto = {
    checking: 'Procurando atualização…',
    downloading: `Atualizando o Realyz · ${pct}%`,
    installing: 'Instalando a versão nova…',
    permission: 'Ative as atualizações automáticas',
  }[phase];

  return (
    <View style={st.wrap}>
      <Image source={require('../../assets/wordmark-escuro.png')} style={st.logo} resizeMode="contain" accessibilityLabel="Realyz" />
      <Text style={st.title}>{texto}</Text>
      {phase === 'downloading' ? (
        <View style={st.track} accessibilityLabel={`Atualizando, ${pct} por cento`}>
          <View style={[st.fill, { width: `${pct}%` }]} />
        </View>
      ) : phase !== 'permission' ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} />
      ) : null}
      {phase === 'installing' ? <Text style={st.sub}>O app fecha por um instante e abre de novo já atualizado. Se o Android pedir, toque em "Atualizar".</Text> : null}
      {phase === 'downloading' ? <Text style={st.sub}>Depois da atualização, é só entrar na sua conta.</Text> : null}
      {phase === 'permission' ? (
        <>
          <Text style={st.sub}>Só uma vez: ligue "Permitir desta fonte" para o Realyz. Depois, toda versão nova se instala sozinha quando você abrir o app.</Text>
          <TouchableOpacity style={st.btn} onPress={openInstallPermission} accessibilityLabel="Ativar atualizações automáticas">
            <Text style={st.btnText}>Ativar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={viaIntent} style={{ paddingVertical: 12 }} accessibilityLabel="Atualizar pelo instalador do Android">
            <Text style={st.link}>Atualizar pelo instalador do Android</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={go} style={{ paddingVertical: 6 }} accessibilityLabel="Agora não">
            <Text style={[st.link, { color: colors.muted }]}>Agora não</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { width: 220, height: 68, marginBottom: 24 },
  title: { color: colors.text, fontWeight: '800', fontSize: 17, textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19, maxWidth: 320 },
  track: { width: 240, height: 8, borderRadius: 4, backgroundColor: '#EDE4CF', overflow: 'hidden', marginTop: 18 },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#F5C331' },
  btn: { marginTop: 20, backgroundColor: '#F5C331', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 40 },
  btnText: { color: '#14120E', fontWeight: '900', fontSize: 15 },
  link: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});
