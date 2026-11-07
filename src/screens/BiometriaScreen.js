// Cadastro biométrico do Realys, em tela cheia (aberta pelo Perfil).
// Fluxo: termo -> scan do rosto (câmera centralizada) -> foto do documento e seus dados -> análise no servidor.
// A decisão é sempre do servidor: o app só captura, envia e mostra o resultado.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, uploadMedia } from '../api';
import ScanFacial from '../components/ScanFacial';
import TermoAdesaoModal from '../components/TermoAdesaoModal';
import { colors, soft } from '../theme';

// Tem que ser igual a CONSENT_VERSION no servidor (server/src/biometria/service.js).
const CONSENT_VERSION = '2026-11-v1';

const DOC_TIPOS = [
  { key: 'cnh', label: 'CNH' },
  { key: 'cnh_digital', label: 'CNH digital' },
  { key: 'rg', label: 'RG' },
  { key: 'rg_digital', label: 'RG digital' },
  { key: 'conselho', label: 'Conselho profissional' },
  { key: 'brigada', label: 'Brigadista' },
];

const STATUS_TEXT = {
  sem_consentimento: 'Você ainda não cadastrou seu rosto.',
  pendente: 'Consentimento registrado. Faça o scan do rosto e envie o documento.',
  em_analise: 'Estamos conferindo seu cadastro. Isso pode levar um tempo.',
  aprovado: 'Rosto cadastrado. Você entra com usuário e senha; o rosto é pedido em serviços e vendas.',
  recusado: 'Não foi possível confirmar seu cadastro.',
  revogado: 'Cadastro biométrico apagado.',
};

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function BiometriaScreen({ visible, onClose }) {
  const [info, setInfo] = useState(null);
  const [step, setStep] = useState('inicio'); // inicio | scan | doc | enviando
  const [scan, setScan] = useState(null); // { videos, photos } em base64
  const [tipo, setTipo] = useState('cnh');
  const [emissao, setEmissao] = useState('');
  const [validade, setValidade] = useState('');
  const [termoOpen, setTermoOpen] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setInfo(await api('GET', '/biometria')); } catch (e) { setErro(e.message || 'Não consegui falar com o servidor.'); }
  };
  useEffect(() => { if (visible) { setErro(''); setStep('inicio'); load(); } }, [visible]);

  const status = info ? info.status : 'sem_consentimento';

  const aceitar = async () => {
    setBusy(true); setErro('');
    try {
      setInfo(await api('POST', '/biometria/consentimento', { version: CONSENT_VERSION }));
      setStep('scan');
    } catch (e) { setErro(e.message); }
    setBusy(false);
  };

  const scanFeito = (lista) => { setScan(lista); setStep('doc'); setErro(''); };

  const validarDoc = () => {
    if (!DOC_TIPOS.some((t) => t.key === tipo)) return 'Escolha o tipo do documento.';
    if (!DATA_RE.test(emissao)) return 'Informe a data de emissão (AAAA-MM-DD).';
    if (validade && !DATA_RE.test(validade)) return 'A validade precisa estar em AAAA-MM-DD.';
    return '';
  };

  const enviarTudo = async () => {
    const problema = validarDoc();
    if (problema) { setErro(problema); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Câmera', 'Libere a câmera nas configurações do celular.'); return; }
    const d = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false, cameraType: ImagePicker.CameraType.back });
    if (d.canceled) return;
    setStep('enviando'); setErro('');
    try {
      const doc = (await uploadMedia(d.assets[0].uri, 'image/jpeg')).split('/').pop();
      setInfo(await api('POST', '/biometria/envio-scan', {
        ...scan, doc, documento: { tipo, emissao, validade: validade || undefined },
      }));
    } catch (e) {
      setErro(e.message || 'Não deu para enviar. Tente de novo.');
    }
    setScan(null);
    setStep('inicio');
  };

  const revogar = () => {
    Alert.alert('Apagar cadastro biométrico', 'Seu rosto cadastrado será apagado agora. Você pode cadastrar de novo depois.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try { setInfo(await api('DELETE', '/biometria')); } catch (e) { setErro(e.message); }
      } },
    ]);
  };

  const podeEnviar = status === 'pendente' || status === 'recusado' || status === 'sem_consentimento' || status === 'revogado';

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

          {step === 'inicio' && podeEnviar ? (
            <View style={[styles.card, soft]}>
              <Text style={styles.termo}>• Usamos seu rosto para confirmar que é você, e só em situações que exigem segurança.</Text>
              <Text style={styles.termo}>• Guardamos um código matemático criptografado. As fotos são apagadas após a análise.</Text>
              <Text style={styles.termo}>• Você pode apagar seu cadastro a qualquer momento.</Text>
              <TouchableOpacity onPress={() => setTermoOpen(true)} hitSlop={8}><Text style={styles.link}>Ler o termo de adesão completo ›</Text></TouchableOpacity>
              {status === 'sem_consentimento' || status === 'revogado' ? (
                <TouchableOpacity style={styles.btn} onPress={aceitar} disabled={busy} activeOpacity={0.85}>
                  {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnText}>Aceito e quero cadastrar</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btn} onPress={() => setStep('scan')} activeOpacity={0.85}>
                  <Text style={styles.btnText}>Fazer o scan do rosto</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {step === 'doc' ? (
            <View style={[styles.card, soft]}>
              <Text style={styles.h}>Documento</Text>
              <Text style={styles.termo}>Aceitos: RG, CNH, versões digitais e carteiras de conselho profissional ou de brigadista. O documento precisa estar válido e ter sido emitido há no máximo 10 anos.</Text>
              <View style={styles.chips}>
                {DOC_TIPOS.map((t) => (
                  <TouchableOpacity key={t.key} onPress={() => setTipo(t.key)} style={[styles.chip, tipo === t.key && styles.chipOn]}>
                    <Text style={[styles.chipText, tipo === t.key && { color: colors.onPrimary }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Data de emissão</Text>
              <TextInput style={styles.input} value={emissao} onChangeText={setEmissao} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" />
              <Text style={styles.label}>Validade (se houver)</Text>
              <TextInput style={styles.input} value={validade} onChangeText={setValidade} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" />
              <Text style={styles.termo}>Na foto do documento: ele precisa estar inteiro, nítido e com todos os dados legíveis. Evite reflexo: nada de luz direta, flash ou superfície brilhante. Foto borrada ou com reflexo é recusada.</Text>
              <TouchableOpacity style={styles.btn} onPress={enviarTudo} activeOpacity={0.85}><Text style={styles.btnText}>Fotografar o documento e enviar</Text></TouchableOpacity>
            </View>
          ) : null}

          {step === 'enviando' ? (
            <View style={[styles.card, soft, { alignItems: 'center' }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.termo, { marginTop: 10 }]}>Enviando e conferindo…</Text>
            </View>
          ) : null}

          {status === 'aprovado' ? (
            <TouchableOpacity style={styles.btnDanger} onPress={revogar} activeOpacity={0.85}>
              <Text style={styles.btnDangerText}>Apagar meu cadastro biométrico</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
      <ScanFacial visible={step === 'scan'} title="Scan do rosto" onFrames={scanFeito} onClose={() => setStep('inicio')} />
      <TermoAdesaoModal visible={termoOpen} onClose={() => setTermoOpen(false)} />
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
  link: { color: colors.primary, fontWeight: '700', fontSize: 13, marginVertical: 6 },
  label: { color: colors.muted, fontSize: 12, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.bg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  erro: { color: '#B42318', marginBottom: 12, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
  btnDanger: { borderWidth: 1, borderColor: '#B42318', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnDangerText: { color: '#B42318', fontWeight: '700' },
});
