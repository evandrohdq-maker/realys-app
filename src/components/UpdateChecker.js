import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { checkForUpdate, installUpdate } from '../updates';

// Aviso de "nova versão disponível". Roda sozinho toda vez que o app abre.
// Também pode ser aberto à mão (Perfil → Verificar atualizações) com `manual`.
export default function UpdateChecker({ manual = false, onDone }) {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState(manual ? 'checking' : 'idle');

  useEffect(() => {
    if (Platform.OS !== 'android' && !manual) return;
    let alive = true;
    checkForUpdate()
      .then((r) => {
        if (!alive) return;
        setInfo(r);
        setStatus(r.available ? 'available' : manual ? 'uptodate' : 'idle');
      })
      .catch(() => alive && setStatus(manual ? 'error' : 'idle'));
    return () => {
      alive = false;
    };
  }, [manual]);

  const close = () => {
    setStatus('idle');
    onDone && onDone();
  };

  if (status === 'idle') return null;

  const update = async () => {
    try {
      await installUpdate(info.url);
      setStatus('downloading');
    } catch (e) {
      setStatus('error');
    }
  };

  const content = {
    checking: { icon: 'sync-outline', title: 'Procurando atualização…', text: 'Conferindo se existe uma versão nova do Realys.' },
    available: {
      icon: 'rocket-outline',
      title: 'Nova versão disponível',
      text: `Você tem a versão ${info && info.current}. A versão ${info && info.latest} já está pronta para instalar.`,
    },
    downloading: {
      icon: 'cloud-download-outline',
      title: 'Baixando a atualização',
      text: 'Quando o download terminar, toque na notificação "realys-demo.apk" e depois em "Atualizar". Seus dados continuam no app.',
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

          {status === 'available' ? (
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={close}>
                <Text style={styles.btnGhostText}>Depois</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnMain, { flex: 1 }]} onPress={update}>
                <Text style={styles.btnMainText}>Atualizar agora</Text>
              </TouchableOpacity>
            </View>
          ) : status !== 'checking' ? (
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
  title: { color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
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
  btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  btnGhostText: { color: colors.text, fontWeight: '600' },
  btnMain: { backgroundColor: colors.primary, alignSelf: 'stretch' },
  btnMainText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
});
