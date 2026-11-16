import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform, AppState } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkForUpdate,
  installUpdate,
  cleanupOldUpdate,
  supportsAutoUpdate,
  hasInstallPermission,
  openInstallPermission,
  onInstallStatus,
} from '../updates';

// Atualização ao abrir o app. No Android 12+ é automática: achou versão nova, baixa,
// instala por cima sozinha, apaga o arquivo e o Re@lys reabre atualizado.
// Só na primeira vez pede para ligar a chave "Instalar apps desconhecidos" do Re@lys.
// Também pode ser aberto à mão (Perfil → Verificar atualizações) com `manual`.
export default function UpdateChecker({ manual = false, onDone }) {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState(manual ? 'checking' : 'idle');
  const [pct, setPct] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'android' && !manual) return;
    if (!manual) cleanupOldUpdate(); // apaga o APK da atualização anterior, se sobrou
    let alive = true;
    checkForUpdate()
      .then((r) => {
        if (!alive) return;
        setInfo(r);
        if (!r.available) return setStatus(manual ? 'uptodate' : 'idle');
        // Ao abrir o app não há aviso: a atualização começa sozinha, só com a barra de avanço.
        if (!supportsAutoUpdate()) return manual ? setStatus('available') : start(r);
        // Automático: sem botão "Atualizar agora". Falta a chave? pede uma vez só.
        if (hasInstallPermission()) start(r);
        else setStatus('permission');
      })
      .catch(() => alive && setStatus(manual ? 'error' : 'idle'));
    return () => {
      alive = false;
    };
  }, [manual]);

  // Resultado da instalação automática.
  useEffect(
    () =>
      onInstallStatus((st) => {
        if (st === 'failed') setStatus(manual ? 'failed' : 'idle');
        else if (st === 'cancelled') setStatus('idle');
        else if (st === 'confirm') setStatus('installing');
      }),
    []
  );

  // Voltou das configurações depois de ligar a chave: segue com a atualização.
  useEffect(() => {
    if (status !== 'permission') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && hasInstallPermission() && info) start(info);
    });
    return () => sub.remove();
  }, [status, info]);

  async function start(r) {
    try {
      setPct(0);
      const how = await installUpdate(r.url, (st) => setStatus(st === 'installing' ? 'auto' : st), setPct, r.size);
      // Instalador normal (Android antigo): voltou dele = cancelou ou terminou. Fecha o aviso.
      if (how === 'intent') {
        setStatus('idle');
        onDone && onDone();
      }
    } catch (e) {
      setStatus(manual ? 'failed' : 'idle'); // automática: se falhar, tenta de novo na próxima abertura, sem aviso
    }
  }

  const close = () => {
    setStatus('idle');
    onDone && onDone();
  };

  if (status === 'idle') return null;

  // Atualização automática (ao abrir o app): sem aviso, só uma barra fina com a porcentagem no alto
  // da tela. A pessoa continua usando o app enquanto baixa.
  if (!manual && (status === 'downloading' || status === 'auto' || status === 'installing')) {
    const shown = status === 'downloading' ? pct : 100;
    return (
      <View pointerEvents="none" style={[styles.bar, { top: insets.top + 4 }]} accessibilityLabel={`Atualizando o Re@lys, ${shown} por cento`}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${shown}%` }]} />
        </View>
        <Text style={styles.barText}>{status === 'downloading' ? `Atualizando ${shown}%` : 'Instalando…'}</Text>
      </View>
    );
  }
  // Fora a chave do Android (pedida uma única vez), a atualização automática não mostra avisos.
  if (!manual && status !== 'permission') return null;

  const update = async () => {
    try {
      setPct(0);
      await installUpdate(info.url, setStatus, setPct, info.size);
      setStatus('idle'); // voltou do instalador (cancelou): fecha o aviso
      onDone && onDone();
    } catch (e) {
      setStatus('failed');
    }
  };

  const mb = info && info.size ? ` (${(info.size / 1048576).toFixed(0)} MB)` : '';

  const content = {
    checking: { icon: 'sync-outline', title: 'Procurando atualização…', text: 'Conferindo se existe uma versão nova do Re@lys.' },
    available: {
      icon: 'rocket-outline',
      title: 'Nova versão disponível',
      text: `Você tem a versão ${info && info.current}. A versão ${info && info.latest} já está pronta para instalar.`,
    },
    downloading: {
      icon: 'cloud-download-outline',
      title: 'Baixando a atualização…',
      text: `${pct}%${mb}. O Re@lys baixa a versão nova por dentro do app, sem encher o celular de arquivos.`,
    },
    permission: {
      icon: 'shield-checkmark-outline',
      title: 'Ative as atualizações automáticas',
      text: 'Só uma vez: ligue "Permitir desta fonte" para o Re@lys. Depois disso, toda versão nova se instala sozinha quando você abrir o app, sem perguntar nada.',
    },
    auto: {
      icon: 'sparkles-outline',
      title: 'Atualizando o Re@lys…',
      text: 'O app vai fechar por um instante e abrir de novo já na versão nova. Seus dados continuam aqui.',
    },
    installing: {
      icon: 'construct-outline',
      title: 'Instalando',
      text: 'Toque em "Atualizar" na tela do Android. O Re@lys é substituído pela versão nova e seus dados continuam no app.',
    },
    failed: {
      icon: 'alert-circle-outline',
      title: 'Não deu para atualizar',
      text: 'Confira a internet e tente de novo. Se o Android pedir, permita que o Re@lys instale atualizações.',
    },
    uptodate: { icon: 'checkmark-circle-outline', title: 'Você está na versão mais nova', text: `Versão ${info && info.current} instalada.` },
    error: { icon: 'cloud-offline-outline', title: 'Não deu para verificar agora', text: 'Confira a internet e tente de novo pelo Perfil.' },
  }[status];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={content.icon} size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.text}>{content.text}</Text>
          {status === 'available' && info.notes ? <Text style={styles.notes}>{info.notes}</Text> : null}

          {status === 'permission' ? (
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={close}>
                <Text style={styles.btnGhostText}>Depois</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnMain, { flex: 1 }]} onPress={openInstallPermission}>
                <Text style={styles.btnMainText}>Ativar</Text>
              </TouchableOpacity>
            </View>
          ) : status === 'available' ? (
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={close}>
                <Text style={styles.btnGhostText}>Depois</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnMain, { flex: 1 }]} onPress={update}>
                <Text style={styles.btnMainText}>Atualizar agora</Text>
              </TouchableOpacity>
            </View>
          ) : !['checking', 'downloading', 'auto'].includes(status) ? (
            <TouchableOpacity style={[styles.btn, styles.btnMain, { marginTop: 16 }]} onPress={close}>
              <Text style={styles.btnMainText}>Ok</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,18,14,0.88)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, zIndex: 50, elevation: 8 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: '#F5C331' },
  barText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(168,121,10,0.35)',
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(168,121,10,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  text: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  notes: {
    color: colors.text,
    fontSize: 13,
    marginTop: 12,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 10,
    alignSelf: 'stretch',
  },
  row: { flexDirection: 'row', marginTop: 18, alignSelf: 'stretch' },
  btn: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  btnGhostText: { color: colors.text, fontWeight: '600' },
  btnMain: { backgroundColor: colors.primary, alignSelf: 'stretch' },
  btnMainText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
