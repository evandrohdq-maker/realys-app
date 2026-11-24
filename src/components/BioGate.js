// Conta sem biometria: perfil só social.
// O cadastro pede documento e biometria. Quem prefere deixar a biometria para depois entra e usa
// a parte social e navega normalmente pelo Shop, Food e Serviços, mas não compra nem contrata
// nada até fazer a biometria.
// Aqui ficam: a regra das telas liberadas, a tela de "falta a biometria", o aviso do Perfil e a
// janela que aparece quando a pessoa tenta comprar ou contratar.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { confirmBiometric, markVerified } from '../accounts';
import { api, serverOn, onBioBlocked, onPrazoBio } from '../api';
import BiometriaScreen from '../screens/BiometriaScreen';

// A conta sem biometria navega por tudo (Shop, Food, Serviços, Negócios…) e vê preços e vitrines
// normalmente. O que não passa é a compra ou a contratação: essas ações param no store (NEEDS_BIO)
// e abrem a janela "falta só a biometria".
// Administrador e analista contam como liberados: precisam ver e testar todos os perfis (social, empresa, prestador).
export const isVerified = (state) => !state.user || state.user.verified !== false || (state.user.roles || []).some((r) => r === 'admin' || r === 'analista');
// Selo de identidade verificada: conta do servidor vale o que o servidor diz (biometria aprovada).
export const hasIdBadge = (state) => !!state.user && (state.user.idVerified != null ? state.user.idVerified : state.user.verified !== false && !state.user.serverId);
export const canOpenTab = () => true;

// Prazo de 7 dias sem biometria (servidor): quando acaba, o app só abre a biometria.
let prazoVencidoAgora = false;
let prazoFim = null;
const prazoSubs = new Set();
function setPrazoVencido(v) {
  prazoVencidoAgora = v;
  prazoSubs.forEach((fn) => fn(v));
}
export const diasRestantesBio = () => (prazoFim ? Math.max(0, Math.ceil((prazoFim - Date.now()) / 86400000)) : null);

// Tela que cobre o app quando o prazo acabou: só sai fazendo a biometria (sem "agora não").
export function PrazoBioLock() {
  const [vencido, setVencido] = useState(prazoVencidoAgora);
  const [bio, setBio] = useState(false);
  useEffect(() => {
    prazoSubs.add(setVencido);
    return () => prazoSubs.delete(setVencido);
  }, []);
  const conferir = () =>
    api('GET', '/me')
      .then((me) => setPrazoVencido(!!(me && me.prazoVencido)))
      .catch(() => {});
  return (
    <Modal visible={vencido} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={st.scrim}>
        <View style={st.card}>
          <View style={st.icon}>
            <Ionicons name="finger-print" size={30} color={colors.text} />
          </View>
          <Text style={st.title}>Seus 7 dias de teste acabaram</Text>
          <Text style={st.text}>Para continuar usando o Realyz, cadastre sua biometria. É ela que garante que aqui só tem gente de verdade e que ninguém usa a sua conta no seu lugar.</Text>
          <TouchableOpacity style={st.btn} onPress={() => setBio(true)} activeOpacity={0.85} accessibilityLabel="Cadastrar biometria">
            <Ionicons name="scan-outline" size={18} color="#fff" />
            <Text numberOfLines={1} style={st.btnText}>Cadastrar biometria</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={conferir} style={{ paddingVertical: 12 }} accessibilityLabel="Já fiz, conferir">
            <Text numberOfLines={1} style={{ color: colors.muted, fontWeight: '700', textAlign: 'center' }}>Já enviei, conferir de novo</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BiometriaScreen
        visible={bio}
        onClose={() => {
          setBio(false);
          conferir();
        }}
      />
    </Modal>
  );
}

// Com o servidor ligado, quem manda é ele: ao entrar, o app pergunta se a conta pode comprar
// (biometria aprovada) e acerta o modo da conta. Se o servidor recusar uma compra por falta de
// biometria, o mesmo aviso aparece. Sem servidor (demonstração), vale só a regra do app.
export function useServerBio() {
  const { state, dispatch } = useStore();
  const uid = state.user ? state.user.id || state.user.cpf || state.user.name : null;
  useEffect(() => {
    onBioBlocked(() => dispatch({ type: 'BIO_GATE' }));
    return () => onBioBlocked(null);
  }, [dispatch]);
  useEffect(() => {
    onPrazoBio(() => setPrazoVencido(true));
    return () => onPrazoBio(null);
  }, []);
  useEffect(() => {
    if (!uid || !serverOn()) return;
    let alive = true;
    api('GET', '/me')
      .then((me) => {
        if (!alive || !me) return;
        if (me.verificado != null) dispatch({ type: 'SET_ID_VERIFIED', on: me.verificado });
        setPrazoVencido(!!me.prazoVencido);
        prazoFim = me.prazoBiometria || null;
        // Conta de teste: compra com dinheiro fictício (sem o aviso de compras bloqueadas).
        dispatch({ type: 'SET_CONTA_TESTE', on: !!me.teste });
        if (!me.exigeBiometria) return;
        dispatch({ type: me.podeComprar ? 'SET_VERIFIED' : 'SET_UNVERIFIED' });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, dispatch]);
}

// Faz a biometria agora e libera a conta. Devolve true se liberou.
export function useVerify() {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await confirmBiometric('Confirme sua biometria para liberar compras e serviços no Realyz');
      if (res === 'ok') {
        await markVerified(state.user).catch(() => {});
        dispatch({ type: 'SET_VERIFIED' });
        Alert.alert('Biometria registrada ✅', 'Sua conta está completa: compras, serviços e a carteira já estão liberados.');
        return true;
      }
      if (res === 'sem') Alert.alert('Celular sem biometria', 'Este celular não tem digital nem rosto cadastrados. Cadastre nas configurações do aparelho e volte aqui para liberar a conta.');
      else Alert.alert('Biometria não confirmada', 'Não deu para confirmar que é você. Tente de novo.');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { verify, busy };
}

const POINTS = [
  ['chatbubbles-outline', 'Liberado agora', 'Navegar no Shop, Food e Serviços, ver preços, e usar a Community, News, Stream, Lives, Reels, páginas e o seu perfil.'],
  ['lock-closed-outline', 'Liberado com a biometria', 'Comprar, pedir comida, contratar serviços, anunciar, carteira e presentes.'],
];

function Body({ onLater }) {
  const { verify, busy } = useVerify();
  return (
    <View style={st.card}>
      <View style={st.icon}>
        <Ionicons name="finger-print" size={30} color={colors.text} />
      </View>
      <Text style={st.title}>Biometria não cadastrada</Text>
      <Text style={st.text}>Por favor, cadastre sua biometria para continuar. Você pode olhar tudo à vontade, mas para comprar ou contratar pelo Realyz a gente precisa confirmar que é você: é isso que mantém a plataforma só com gente de verdade.</Text>
      {POINTS.map(([icon, t, d]) => (
        <View key={t} style={st.row}>
          <Ionicons name={icon} size={17} color={colors.menu} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.rowTitle}>{t}</Text>
            <Text style={st.rowText}>{d}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={async () => (await verify()) && onLater && onLater()} activeOpacity={0.85} accessibilityLabel="Fazer a biometria agora">
        <Ionicons name="finger-print" size={18} color="#fff" />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.btnText}>{busy ? 'Confirmando…' : 'Cadastrar biometria agora'}</Text>
      </TouchableOpacity>
      {onLater ? (
        <TouchableOpacity onPress={onLater} style={{ paddingVertical: 12 }} accessibilityLabel="Agora não">
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.muted, fontWeight: '700', textAlign: 'center' }}>Agora não</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Tela no lugar de uma aba bloqueada (Shop, Food, Serviços, Negócios…).
export function LockedScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 18 }}>
      <Body />
    </View>
  );
}

// Janela que aparece quando a conta sem biometria tenta comprar ou contratar.
export function BioGateModal() {
  const { state, dispatch } = useStore();
  const open = !!state.bioGate && !isVerified(state);
  const close = () => dispatch({ type: 'BIO_GATE_CLOSE' });
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={st.scrim}>
        <Body onLater={close} />
      </View>
    </Modal>
  );
}

// Aviso discreto no topo do Perfil enquanto a conta está no modo social.
export function UnverifiedBanner() {
  const { state } = useStore();
  const { verify, busy } = useVerify();
  if (isVerified(state)) return null;
  return (
    <TouchableOpacity style={st.banner} onPress={verify} disabled={busy} activeOpacity={0.85} accessibilityLabel="Conta no modo social. Fazer a biometria para liberar compras e serviços">
      <Ionicons name="finger-print" size={20} color={colors.text} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>Conta no modo social</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{diasRestantesBio() != null ? `Faltam ${diasRestantesBio()} dia(s) para fazer a biometria. Sem ela, a conta trava.` : 'Faça a biometria para liberar compras, serviços e a carteira.'}</Text>
      </View>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12.5 }}>{busy ? '…' : 'Fazer'}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(20,18,14,0.55)', justifyContent: 'center', padding: 18 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, ...soft },
  icon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 19, textAlign: 'center', marginTop: 10 },
  text: { color: colors.muted, fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginTop: 6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 13.5 },
  rowText: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 14, paddingVertical: 13, marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '800', marginLeft: 8, fontSize: 15 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, padding: 12, marginBottom: 10 },
});
