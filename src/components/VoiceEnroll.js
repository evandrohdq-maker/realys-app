// Cadastro da voz do titular: aparece quando a pessoa liga o "abrir Lotus" no Perfil.
// Ela fala frases curtas e a Lotus aprende a voz dela, para depois só atender o dono da conta.
//   - 3x "Abrir Lotus": o jeito exato como o titular chama a Lotus (o mais importante).
//   - 2 frases de pedido: o timbre falando normal (confirmar, navegar).
//   - 3 extras opcionais: mais variedade de sons (números, perguntas, saudação), para ela
//     conhecer melhor a voz do titular desde o começo.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { colors } from '../theme';
import { voicePrintSupported, recordingFor, enrollSample, saveEnrollment } from '../voicePrint';
import { buildWake, compareWake } from '../voicePrintCore';
import { findCall } from '../wakeMatch';

const PHRASES = [
  { text: 'Abrir Lotus', wake: true, hint: 'Fale do seu jeito normal, como se fosse chamar a Lotus.' },
  { text: 'Abrir Lotus', wake: true, hint: 'Mais uma vez, no mesmo tom.' },
  { text: 'Abrir Lotus', wake: true, hint: 'Agora um pouquinho mais baixo, como no dia a dia.' },
  { text: 'Lotus, sim, confirma pra mim', hint: 'É assim que você confirma pedidos por voz.' },
  { text: 'Lotus, me leva pro Food', hint: 'Fale normal, sem pressa.' },
  // extras (opcionais): sons diferentes para ela conhecer melhor a sua voz
  { text: 'Abrir Lotus, preciso de um motorista agora', extra: true, hint: 'Chamando e pedindo na mesma frase.' },
  { text: 'Lotus, quanto custa um eletricista perto de mim?', extra: true, hint: 'Uma pergunta, com a entonação de pergunta.' },
  { text: 'Bom dia, Lotus! O que vamos fazer hoje?', extra: true, hint: 'Do jeito que você cumprimenta alguém.' },
];
const REQUIRED = PHRASES.filter((p) => !p.extra).length;

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
// A pessoa falou a frase pedida? (metade das palavras, e o "Lotus" quando a frase tem)
function saidRight(heard, phrase) {
  const want = norm(phrase).filter((w) => w !== 'lotus');
  const got = new Set(norm(heard));
  const hit = want.filter((w) => got.has(w) || [...got].some((g) => g.length > 3 && (g.startsWith(w.slice(0, 4)) || w.startsWith(g.slice(0, 4))))).length;
  const lotusOk = !/lotus/i.test(phrase) || !!findCall(heard) || /lot|lót/i.test(heard);
  return lotusOk && (want.length === 0 || hit / want.length >= 0.5);
}

export default function VoiceEnroll({ visible, onClose, onDone }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('termo'); // termo | gravar | extras | salvando | pronto | sem_suporte
  const [i, setI] = useState(0);
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState('');
  const [msg, setMsg] = useState('');
  const [agree, setAgree] = useState(false);
  const samples = useRef([]); // [{ vec, seq, wake }]
  const session = useRef({ on: false, text: '', uri: null, done: false });

  useEffect(() => {
    if (!visible) return;
    samples.current = [];
    setI(0);
    setMsg('');
    setHeard('');
    setAgree(false);
    setStep(voicePrintSupported() ? 'termo' : 'sem_suporte');
  }, [visible]);

  const phrase = PHRASES[i];

  const record = () => {
    if (rec || busy) return;
    setMsg('');
    setHeard('');
    session.current = { on: true, text: '', uri: null, done: false };
    setRec(true);
    try {
      ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false, maxAlternatives: 3, contextualStrings: ['Lotus', 'abrir Lotus'], ...recordingFor('cadastro') });
    } catch (e) {
      session.current.on = false;
      setRec(false);
      setMsg('Não consegui abrir o microfone. Tente de novo.');
    }
  };

  // Terminou de gravar: confere se falou a frase e tira a assinatura da voz.
  const finish = async () => {
    const s = session.current;
    if (s.done) return;
    s.done = true;
    s.on = false;
    setRec(false);
    if (!s.text) return setMsg('Não ouvi nada. Toque no microfone e fale a frase.');
    if (!saidRight(s.text, phrase.text)) return setMsg(`Entendi "${s.text}". Toque e fale exatamente: ${phrase.text}`);
    if (!s.uri) return setMsg('O celular não entregou o áudio. Tente de novo.');
    setBusy(true);
    const r = await enrollSample(s.uri, phrase.wake);
    setBusy(false);
    if (!r) return setMsg('Ficou baixo ou curto demais. Fale um pouco mais perto do celular.');
    // As 3 "Abrir Lotus" precisam ser parecidas entre si (senão alguma gravação pegou barulho).
    if (phrase.wake && samples.current.filter((x) => x.wake).length >= 2) {
      const prev = samples.current.filter((x) => x.wake).map((x) => x.seq);
      const w = buildWake(prev);
      const c = w && compareWake({ ...w, limit: w.limit * 1.8 }, r.seq);
      if (c && c.ok === false) return setMsg('Essa ficou diferente das outras (barulho?). Fale de novo, no mesmo tom.');
    }
    samples.current.push({ ...r, wake: !!phrase.wake });
    next();
  };

  const next = () => {
    const n = i + 1;
    if (n === REQUIRED) return setStep('extras');
    if (n >= PHRASES.length) return save();
    setI(n);
  };

  const save = async () => {
    setStep('salvando');
    const list = samples.current;
    await saveEnrollment({ wake: list.filter((x) => x.wake).map((x) => x.seq), vecs: list.map((x) => x.vec) });
    setStep('pronto');
  };

  useSpeechRecognitionEvent('result', (e) => {
    if (!session.current.on) return;
    const t = e && e.results && e.results[0] ? e.results[0].transcript : '';
    if (t) {
      session.current.text = t;
      setHeard(t);
    }
  });
  useSpeechRecognitionEvent('audiostart', (e) => {
    if (session.current.on && e && e.uri) session.current.uri = e.uri;
  });
  useSpeechRecognitionEvent('audioend', (e) => {
    if (session.current.on && e && e.uri) session.current.uri = e.uri;
  });
  useSpeechRecognitionEvent('end', () => {
    // Fim da escuta: o texto final e o arquivo de áudio já chegaram (dá um respiro para o arquivo fechar).
    if (session.current.on) setTimeout(() => session.current.on && finish(), 250);
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (!session.current.on) return;
    session.current.on = false;
    session.current.done = true;
    setRec(false);
    setMsg(e && (e.error === 'no-speech' || e.error === 'speech-timeout') ? 'Não ouvi nada. Toque no microfone e fale a frase.' : 'O microfone falhou. Tente de novo.');
  });

  const cancel = () => {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
    session.current.on = false;
    onClose && onClose();
  };

  const total = step === 'gravar' && i >= REQUIRED ? PHRASES.length : REQUIRED;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancel} statusBarTranslucent>
      <View style={[st.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={st.top}>
          <Text style={st.title}>Voz do titular</Text>
          <TouchableOpacity onPress={cancel} accessibilityLabel="Fechar">
            <Ionicons name="close" size={26} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {step === 'sem_suporte' ? (
          <View style={st.body}>
            <Text style={st.p}>Este celular usa uma versão do Android anterior à 13, que não entrega o áudio para o Realys. A Lotus funciona normalmente, mas sem reconhecer só a sua voz.</Text>
            <TouchableOpacity style={st.btn} onPress={() => onDone && onDone(false)}>
              <Text style={st.btnText}>Ativar o "abrir Lotus" assim mesmo</Text>
            </TouchableOpacity>
          </View>
        ) : step === 'termo' ? (
          <ScrollView style={st.body} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={st.h}>A Lotus vai aprender a sua voz</Text>
            <Text style={st.p}>Você vai falar algumas frases curtas. Com elas, a Lotus passa a atender só você nesta conta: a voz de outra pessoa (ou de uma TV, ou dela mesma) não abre a Lotus nem confirma pedidos.</Text>
            <Text style={st.p}>• Leva menos de um minuto.{'\n'}• Fica só neste celular, criptografado. Não vai para o servidor.{'\n'}• Não guardamos a gravação: só uma assinatura em números, que não vira voz de novo.{'\n'}• Com o uso, ela aprende mais um pouco a sua voz.{'\n'}• Você apaga quando quiser, no Perfil.</Text>
            <TouchableOpacity style={st.check} onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
              <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
              <Text style={[st.p, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>Autorizo o Realys a criar e guardar neste celular a assinatura da minha voz (dado biométrico, LGPD), só para a Lotus me reconhecer.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, !agree && { opacity: 0.4 }]} disabled={!agree} onPress={() => setStep('gravar')}>
              <Text style={st.btnText}>Começar</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : step === 'gravar' ? (
          <View style={st.body}>
            <Text style={st.count}>Frase {i + 1} de {total}</Text>
            <View style={st.dots}>
              {Array.from({ length: total }).map((_, k) => (
                <View key={k} style={[st.dot, k < i && { backgroundColor: colors.primary }, k === i && { borderColor: colors.primary }]} />
              ))}
            </View>
            <Text style={st.say}>Fale:</Text>
            <Text style={st.phrase}>“{phrase.text}”</Text>
            <Text style={[st.p, { textAlign: 'center' }]}>{phrase.hint}</Text>
            <TouchableOpacity style={[st.mic, rec && { backgroundColor: colors.primary }]} onPress={record} disabled={busy} accessibilityLabel="Gravar a frase">
              {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="mic" size={40} color={rec ? '#fff' : colors.primary} />}
            </TouchableOpacity>
            <Text style={st.status}>{rec ? 'Ouvindo… fale agora' : busy ? 'Aprendendo a sua voz…' : 'Toque no microfone e fale'}</Text>
            {heard ? <Text style={st.heard}>{heard}</Text> : null}
            {msg ? <Text style={st.msg}>{msg}</Text> : null}
          </View>
        ) : step === 'extras' ? (
          <View style={st.body}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[st.h, { textAlign: 'center' }]}>Sua voz já está cadastrada</Text>
            <Text style={[st.p, { textAlign: 'center' }]}>Quer gravar mais 3 frases? Com elas, a Lotus conhece melhor a sua voz desde o começo e erra menos.</Text>
            <TouchableOpacity style={st.btn} onPress={() => (setI(REQUIRED), setStep('gravar'))}>
              <Text style={st.btnText}>Gravar mais 3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.btnLight} onPress={save}>
              <Text style={st.btnLightText}>Concluir agora</Text>
            </TouchableOpacity>
          </View>
        ) : step === 'salvando' ? (
          <View style={[st.body, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <View style={st.body}>
            <Ionicons name="shield-checkmark" size={56} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[st.h, { textAlign: 'center' }]}>Pronto! A Lotus agora atende só você</Text>
            <Text style={[st.p, { textAlign: 'center' }]}>Diga “abrir Lotus” quando quiser. Se ela não te reconhecer (gripe, muito barulho), toque na flor e fale normalmente. Você pode refazer o cadastro no Perfil.</Text>
            <TouchableOpacity style={st.btn} onPress={() => onDone && onDone(true)}>
              <Text style={st.btnText}>Ativar o “abrir Lotus”</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: { flex: 1 },
  h: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  p: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 12 },
  check: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12, marginVertical: 8 },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnLight: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnLightText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  count: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 4, borderWidth: 1.5, borderColor: colors.borderStrong },
  say: { textAlign: 'center', color: colors.muted, marginTop: 24, fontSize: 14 },
  phrase: { textAlign: 'center', color: colors.text, fontSize: 24, fontWeight: '800', marginVertical: 10, lineHeight: 32 },
  mic: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 28, backgroundColor: '#fff' },
  status: { textAlign: 'center', color: colors.text, fontWeight: '700', marginTop: 14 },
  heard: { textAlign: 'center', color: colors.muted, fontStyle: 'italic', marginTop: 8 },
  msg: { textAlign: 'center', color: '#B4532A', marginTop: 12, lineHeight: 20 },
});
