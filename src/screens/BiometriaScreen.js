// Cadastro biométrico do Realys, em tela cheia (aberta pelo Perfil).
// Fluxo: termo de consentimento -> selfie -> foto do documento -> análise no servidor -> resultado.
// A decisão é sempre do servidor: o app só captura, envia e mostra o resultado.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, uploadMedia } from '../api';
import { colors, soft } from '../theme';

// Tem que ser igual a CONSENT_VERSION no servidor (server/src/biometria/service.js).
const CONSENT_VERSION = '2026-11-v1';

const STATUS_TEXT = {
  sem_consentimento: 'Você ainda não cadastrou seu rosto.',
  pendente: 'Consentimento registrado. Envie a selfie e o documento.',
  em_analise: 'Estamos conferindo seu cadastro. Isso pode levar um tempo.',
  aprovado: 'Rosto cadastrado. Você pode entrar com biometria.',
  recusado: 'Não foi possível confirmar seu cadastro.',
  revogado: 'Cadastro biométrico apagado.',
};

const TERMO = [
  'Vamos usar seu rosto para confirmar que é você e proteger sua conta.',
  'Guardamos só um código matemático do seu rosto, criptografado. As fotos são apagadas assim que a análise termina.',
  'Você pode apagar seu cadastro biométrico a qualquer momento, aqui no Perfil.',
  'Seus dados são usados só para isso, conforme a LGPD.',
];

export default function BiometriaScreen({ visible, onClose }) {
  const [info, setInfo] = useState(null);
  const [step, setStep] = useState('termo'); // termo | selfie | doc | enviando
  const [selfie, setSelfie] = useState(null);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setInfo(await api('GET', '/biometria'));
    } catch (e) {
      setErro(e.message || 'Não consegui falar com o servidor.');
    }
  };
  useEffect(() => { if (visible) { setErro(''); load(); } }, [visible]);

  const status = info ? info.status : 'sem_consentimento';

  const aceitar = async () => {
    setBusy(true); setErro('');
    try {
      setInfo(await api('POST', '/biometria/consentimento', { version: CONSENT_VERSION }));
      setStep('selfie');
    } catch (e) { setErro(e.message); }
    setBusy(false);
  };

  // Tira a foto com a câmera (frontal para a selfie, traseira para o documento).
  const tirarFoto = async (frontal) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Câmera', 'Libere a câmera nas configurações do celular para continuar.');
      return null;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.8, allowsEditing: false,
      cameraType: frontal ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });
    return r.canceled ? null : r.assets[0];
  };

  const enviarSelfie = async () => {
    const f = await tirarFoto(true);
    if (f) { setSelfie(f); setStep('doc'); }
  };

  const enviarTudo = async () => {
    const d = await tirarFoto(false);
    if (!d) return;
    setStep('enviando'); setErro('');
    try {
      const idOf = (url) => url.split('/').pop();
      const s = await uploadMedia(selfie.uri, 'image/jpeg');
      const doc = await uploadMedia(d.uri, 'image/jpeg');
      setInfo(await api('POST', '/biometria/envio', { selfie: idOf(s), doc: idOf(doc) }));
    } catch (e) {
      setErro(e.message || 'Não deu para enviar. Tente de novo.');
    }
    setSelfie(null);
    setStep('termo');
  };

  const revogar = () => {
    Alert.alert('Apagar cadastro biométrico', 'Seu rosto cadastrado será apagado agora. Você pode cadastrar de novo depois.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try { setInfo(await api('DELETE', '/biometria')); } catch (e) { setErro(e.message); }
      } },
    ]);
  };

  const showEnvio = status === 'pendente' || status === 'recusado' || status === 'sem_consentimento' || status === 'revogado';

  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Text style={styles.title}>Biometria facial</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Fechar"><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <View style={[styles.card, soft]}>
            <Text style={styles.status}>{STATUS_TEXT[status] || ''}</Text>
            {info && info.reason ? <Text style={styles.reason}>{info.reason}</Text> : null}
          </View>

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          {step === 'termo' && showEnvio ? (
            <View style={[styles.card, soft]}>
              {TERMO.map((t) => <Text key={t} style={styles.termo}>• {t}</Text>)}
              {status === 'sem_consentimento' || status === 'revogado' ? (
                <TouchableOpacity style={styles.btn} onPress={aceitar} disabled={busy} activeOpacity={0.85}>
                  {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnText}>Aceito e quero cadastrar</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btn} onPress={() => setStep('selfie')} activeOpacity={0.85}>
                  <Text style={styles.btnText}>Enviar selfie e documento</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {step === 'selfie' ? (
            <View style={[styles.card, soft]}>
              <Text style={styles.h}>1 de 2: selfie</Text>
              <Text style={styles.termo}>Olhe para a câmera, com boa luz, sem óculos escuros e sem boné. Pode piscar e mexer a cabeça devagar.</Text>
              <TouchableOpacity style={styles.btn} onPress={enviarSelfie} activeOpacity={0.85}><Text style={styles.btnText}>Tirar selfie</Text></TouchableOpacity>
            </View>
          ) : null}

          {step === 'doc' ? (
            <View style={[styles.card, soft]}>
              <Text style={styles.h}>2 de 2: documento</Text>
              <Text style={styles.termo}>Fotografe seu documento (RG ou CNH) inteiro, com a foto visível, sem reflexo e em lugar bem iluminado.</Text>
              <TouchableOpacity style={styles.btn} onPress={enviarTudo} activeOpacity={0.85}><Text style={styles.btnText}>Fotografar documento</Text></TouchableOpacity>
            </View>
          ) : null}

          {step === 'enviando' ? (
            <View style={[styles.card, soft, { alignItems: 'center' }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.termo, { marginTop: 10 }]}>Enviando e conferindo suas fotos…</Text>
            </View>
          ) : null}

          {status === 'aprovado' ? (
            <TouchableOpacity style={styles.btnDanger} onPress={revogar} activeOpacity={0.85}>
              <Text style={styles.btnDangerText}>Apagar meu cadastro biométrico</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14 },
  status: { color: colors.text, fontSize: 15, fontWeight: '700' },
  reason: { color: colors.muted, fontSize: 13, marginTop: 6 },
  h: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  termo: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  erro: { color: '#B42318', marginBottom: 12, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
  btnDanger: { borderWidth: 1, borderColor: '#B42318', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnDangerText: { color: '#B42318', fontWeight: '700' },
});
