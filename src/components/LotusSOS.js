// Lotus Denúncia e Lotus Emergência: abertos só pela voz ("Lotus, denúncia" / "Lotus, emergência").
// Não têm aba no app. Cada pedido fica registrado com protocolo, GPS e endereço para a central de
// segurança do Realys e, quando houver convênio, vai direto para o profissional mais perto
// (policial na ativa, socorrista, ambulância). Ver PENDENCIAS.md (Polícia Inteligente).
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, Switch, StyleSheet, Linking, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore } from '../store';
import { colors } from '../theme';
import { callNow } from '../phone';
import { getDevicePoint, addressOf } from '../geo';
import { hospitals, responders } from '../extraData';
import { syncAlert, syncAlertPlace } from '../securitySync';

const RED = '#C0392B';
const WHATS_180 = 'https://wa.me/556196100180';
export const DENUNCIA_TIPOS = ['Violência contra a mulher', 'Violência doméstica', 'Criança ou adolescente', 'Pessoa idosa', 'Outro crime'];
const protocolo = () => 'RLY-' + Date.now().toString(36).toUpperCase().slice(-6);

// Local do pedido: GPS e endereço aproximado (preenchidos depois, sem travar a tela).
function useLocate(dispatch) {
  return (id) =>
    getDevicePoint().then(async (p) => {
      if (!p) return;
      dispatch({ type: 'SOS_UPDATE', id, data: { point: p } });
      const address = await addressOf(p);
      if (address) dispatch({ type: 'SOS_UPDATE', id, data: { address } });
      syncAlertPlace(id, p, address);
    });
}

// Registra o pedido no celular e manda para a central do servidor.
function request(dispatch, req) {
  dispatch({ type: 'SOS_REQUEST', req });
  syncAlert(req.id, req.kind, { tipo: req.tipo, texto: req.texto, onde: req.onde, anon: req.anon, protocolo: req.protocol });
}

export default function LotusSOS() {
  const { state, dispatch } = useStore();
  const flow = state.sosFlow;
  const close = () => dispatch({ type: 'CLOSE_SOS_FLOW' });
  if (!flow) return null;
  return flow.kind === 'emergencia' ? <Emergencia onClose={close} /> : <Denuncia onClose={close} />;
}

function Shell({ title, onClose, children, quickExit }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[st.wrap, { paddingTop: insets.top + 8 }]}>
        <View style={st.top}>
          <Text style={st.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={st.exit} accessibilityLabel={quickExit ? 'Sair rápido' : 'Fechar'}>
            <Ionicons name="close" size={18} color="#fff" />
            {quickExit ? <Text style={st.exitText}>Sair rápido</Text> : null}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const Big = ({ icon, label, sub, color = RED, onPress }) => (
  <TouchableOpacity style={[st.big, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85} accessibilityLabel={label}>
    <Ionicons name={icon} size={24} color="#fff" />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={st.bigText}>{label}</Text>
      {sub ? <Text style={st.bigSub}>{sub}</Text> : null}
    </View>
  </TouchableOpacity>
);
const Line = ({ icon, label, onPress }) => (
  <TouchableOpacity style={st.line} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={20} color={colors.primary} />
    <Text style={st.lineText}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
  </TouchableOpacity>
);

// ---------------- Lotus Denúncia ----------------
// Pensado para quem está em situação de violência: tela neutra, botão "Sair rápido", nada aparece
// no histórico da Lotus nem nas listas do app. A denúncia pode ser anônima.
function Denuncia({ onClose }) {
  const { state, dispatch } = useStore();
  const locate = useLocate(dispatch);
  const [step, setStep] = useState('inicio'); // inicio | perigo | form | feito | orientacao
  const [tipo, setTipo] = useState(DENUNCIA_TIPOS[0]);
  const [texto, setTexto] = useState('');
  const [onde, setOnde] = useState('');
  const [gps, setGps] = useState(true);
  const [anon, setAnon] = useState(true);
  const [prot, setProt] = useState('');
  const [rec, setRec] = useState(false);
  const recRef = useRef(false);
  recRef.current = rec;

  useSpeechRecognitionEvent('result', (e) => {
    if (!recRef.current) return;
    const t = e && e.results && e.results[0] ? e.results[0].transcript : '';
    if (e.isFinal && t) {
      setTexto((v) => (v ? v + ' ' : '') + t);
      setRec(false);
    }
  });
  useSpeechRecognitionEvent('end', () => recRef.current && setRec(false));
  const dictate = () => {
    setRec(true);
    try {
      ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: false, continuous: false });
    } catch (e) {
      setRec(false);
    }
  };

  const perigo = () => {
    // Em perigo agora: alerta silencioso com GPS para a segurança do Realys, na hora.
    const id = 'sos' + Date.now();
    request(dispatch, { id, kind: 'perigo', tipo: 'Pessoa em perigo agora', who: state.user ? state.user.name : null, userId: state.user ? state.user.id : null, protocol: protocolo(), at: Date.now(), status: 'aberto' });
    locate(id);
    setStep('perigo');
  };
  const enviar = () => {
    const id = 'sos' + Date.now();
    const p = protocolo();
    request(dispatch, { id, kind: 'denuncia', tipo, texto: texto.trim(), onde: onde.trim(), anon, who: anon ? null : state.user ? state.user.name : null, userId: state.user ? state.user.id : null, protocol: p, at: Date.now(), status: 'aberto' });
    if (gps) locate(id);
    setProt(p);
    setStep('feito');
  };
  const oficial = tipo === 'Criança ou adolescente' || tipo === 'Pessoa idosa' ? { n: '100', l: 'Disque 100 (direitos humanos)' } : { n: '180', l: 'Ligue 180 (Central de Atendimento à Mulher)' };

  return (
    <Shell title="Lotus" onClose={onClose} quickExit>
      {step === 'inicio' ? (
        <>
          <Text style={st.h}>Você está em perigo agora?</Text>
          <Big icon="alert-circle" label="Estou em perigo agora" sub="Aviso a segurança com a sua localização e chamo a polícia" onPress={perigo} />
          <Big icon="document-text" color="#6B4BA1" label="Quero fazer uma denúncia" sub="Pode ser anônima" onPress={() => setStep('form')} />
          <Big icon="information-circle" color="#2E6E8E" label="Preciso de orientação" sub="Direitos, medida protetiva e onde buscar ajuda" onPress={() => setStep('orientacao')} />
          <Text style={st.note}>Esta tela não fica no histórico da Lotus. Toque em "Sair rápido" para fechar na hora.</Text>
        </>
      ) : null}

      {step === 'perigo' ? (
        <>
          <Text style={st.h}>A segurança do Realys já recebeu a sua localização.</Text>
          <Big icon="call" label="Ligar para a polícia: 190" onPress={() => callNow('190')} />
          <Big icon="call" color="#6B4BA1" label="Ligue 180" sub="Central de Atendimento à Mulher · 24 h, gratuito" onPress={() => callNow('180')} />
          <Line icon="logo-whatsapp" label="Falar com o 180 pelo WhatsApp (escrito, sem som)" onPress={() => Linking.openURL(WHATS_180).catch(() => {})} />
          <Text style={st.note}>Se não puder falar, ligue para o 190 e deixe a ligação aberta. Se puder, vá para um lugar seguro e com pessoas por perto.</Text>
        </>
      ) : null}

      {step === 'form' ? (
        <>
          <Text style={st.h}>Sobre o que é a denúncia?</Text>
          <View style={st.chips}>
            {DENUNCIA_TIPOS.map((t) => (
              <TouchableOpacity key={t} style={[st.chip, tipo === t && st.chipOn]} onPress={() => setTipo(t)}>
                <Text style={[st.chipText, tipo === t && { color: '#fff' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={st.label}>O que aconteceu</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <TextInput style={[st.input, { flex: 1, minHeight: 90, textAlignVertical: 'top' }]} value={texto} onChangeText={setTexto} multiline placeholder="Conte do seu jeito, ou toque no microfone" placeholderTextColor={colors.muted} />
            <TouchableOpacity style={[st.mic, rec && { backgroundColor: colors.primary }]} onPress={dictate} accessibilityLabel="Ditar">
              <Ionicons name="mic" size={20} color={rec ? '#fff' : colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={st.label}>Onde (opcional)</Text>
          <TextInput style={st.input} value={onde} onChangeText={setOnde} placeholder="Endereço ou ponto de referência" placeholderTextColor={colors.muted} />
          <View style={st.switchRow}>
            <Text style={st.switchText}>Enviar a minha localização agora</Text>
            <Switch value={gps} onValueChange={setGps} />
          </View>
          <View style={st.switchRow}>
            <Text style={st.switchText}>Denúncia anônima (seu nome não vai junto)</Text>
            <Switch value={anon} onValueChange={setAnon} />
          </View>
          <TouchableOpacity style={[st.send, !texto.trim() && { opacity: 0.4 }]} disabled={!texto.trim()} onPress={enviar}>
            <Text style={st.sendText}>Enviar denúncia</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {step === 'feito' ? (
        <>
          <Text style={st.h}>Denúncia registrada · protocolo {prot}</Text>
          <Text style={st.p}>A central de segurança do Realys recebeu a sua denúncia. Para que ela seja investigada pela polícia, faça também o registro no canal oficial:</Text>
          <Big icon="call" color="#6B4BA1" label={oficial.l} sub="Gratuito, 24 h, pode ser anônimo" onPress={() => callNow(oficial.n)} />
          {oficial.n === '180' ? <Line icon="logo-whatsapp" label="180 pelo WhatsApp (61) 9610-0180" onPress={() => Linking.openURL(WHATS_180).catch(() => {})} /> : null}
          <Big icon="call" label="Urgência agora: 190" onPress={() => callNow('190')} />
        </>
      ) : null}

      {step === 'orientacao' ? (
        <>
          <Text style={st.h}>Você não está só</Text>
          <Text style={st.p}>• A Lei Maria da Penha (Lei 11.340/2006) protege a mulher contra violência física, psicológica, sexual, patrimonial e moral, inclusive de marido, ex, namorado ou familiar.</Text>
          <Text style={st.p}>• A medida protetiva (por exemplo, afastar o agressor) pode ser pedida na delegacia, de preferência na Delegacia da Mulher, e a Defensoria Pública ajuda sem custo.</Text>
          <Text style={st.p}>• O Ligue 180 orienta, registra a denúncia e indica a rede de apoio mais perto de você, 24 horas, de graça.</Text>
          <Big icon="call" color="#6B4BA1" label="Ligue 180" onPress={() => callNow('180')} />
          <Line icon="logo-whatsapp" label="180 pelo WhatsApp (escrito, sem som)" onPress={() => Linking.openURL(WHATS_180).catch(() => {})} />
          <Line icon="document-text-outline" label="Fazer uma denúncia agora" onPress={() => setStep('form')} />
        </>
      ) : null}
    </Shell>
  );
}

// ---------------- Lotus Emergência (médica) ----------------
function Emergencia({ onClose }) {
  const { state, dispatch } = useStore();
  const locate = useLocate(dispatch);
  const [id] = useState('sos' + Date.now());
  const [called, setCalled] = useState(null);
  const near = [...hospitals].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
  const amb = [...responders].filter((r) => /ambul/i.test(r.kind)).sort((a, b) => a.distanceKm - b.distanceKm)[0];

  // Ao abrir: registra o pedido com GPS para a central (e para o socorrista mais perto, quando houver convênio).
  useEffect(() => {
    request(dispatch, { id, kind: 'emergencia', tipo: 'Emergência médica', who: state.user ? state.user.name : null, userId: state.user ? state.user.id : null, protocol: protocolo(), at: Date.now(), status: 'aberto' });
    locate(id);
  }, []);
  const share = async () => {
    const p = await getDevicePoint();
    const a = p ? await addressOf(p) : null;
    const where = a || (p ? `https://maps.google.com/?q=${p.lat},${p.lon}` : 'localização indisponível');
    Share.share({ message: `🚨 Emergência médica. Estou aqui: ${where}` }).catch(() => {});
  };
  const chamarAmb = () => {
    dispatch({ type: 'SOS_UPDATE', id, data: { responder: amb.name, status: 'profissional avisado' } });
    setCalled(amb);
  };

  return (
    <Shell title="Lotus Emergência" onClose={onClose}>
      <Big icon="medkit" label="Ligar para o SAMU: 192" sub="Atendimento médico de urgência, gratuito" onPress={() => callNow('192')} />
      <Big icon="flame" color="#D35400" label="Bombeiros: 193" sub="Acidente, resgate, incêndio, afogamento" onPress={() => callNow('193')} />
      <Line icon="share-social-outline" label="Mandar a minha localização para alguém" onPress={share} />
      {amb ? (
        <TouchableOpacity style={st.card} onPress={called ? undefined : chamarAmb} activeOpacity={0.85}>
          <Text style={st.cardTitle}>{called ? `✔ ${amb.name} foi avisada` : 'Ambulância particular mais perto'}</Text>
          <Text style={st.cardSub}>
            {amb.name} · {amb.distanceKm.toFixed(1).replace('.', ',')} km · chega em ~{amb.etaMin} min · {amb.price}
          </Text>
          {!called ? <Text style={[st.cardSub, { color: colors.primary, fontWeight: '700', marginTop: 4 }]}>Toque para avisar (serviço pago)</Text> : null}
        </TouchableOpacity>
      ) : null}
      <Text style={st.label}>Pronto-atendimento mais perto</Text>
      {near.map((h) => (
        <View key={h.id} style={st.card}>
          <Text style={st.cardTitle}>{h.name}</Text>
          <Text style={st.cardSub}>
            {h.type} · {h.network} · {h.distanceKm.toFixed(1).replace('.', ',')} km{h.waitMin ? ` · espera ~${h.waitMin} min` : ''}
          </Text>
        </View>
      ))}
      <Text style={st.note}>A Lotus não substitui o atendimento médico. Em caso grave, ligue 192 primeiro. Serviços públicos (SAMU, Bombeiros, SUS) não têm taxa do Realys.</Text>
    </Shell>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  exit: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#555', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  exitText: { color: '#fff', fontWeight: '800', marginLeft: 4 },
  h: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  p: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  big: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10 },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  bigSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  lineText: { flex: 1, color: colors.text, fontWeight: '700', marginLeft: 10 },
  note: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  label: { color: colors.text, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: '#fff' },
  mic: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8, backgroundColor: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  switchText: { color: colors.text, flex: 1, marginRight: 10 },
  send: { backgroundColor: '#6B4BA1', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontWeight: '800' },
  cardSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
