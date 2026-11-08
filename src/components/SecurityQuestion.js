// Pergunta de segurança na assinatura de contratos (para quem cadastrou a voz do dono).
// Resposta que libera: assina de verdade ("Contrato finalizado com sucesso").
// Resposta de segurança: parece assinado ("Contrato confirmado com sucesso, parabéns"), mas a
// assinatura não vale e a segurança é acionada em silêncio.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { colors } from '../theme';
import { answerKind } from '../voicePhrases';

export default function SecurityQuestion({ secq, visible, onResult, onCancel }) {
  const [text, setText] = useState('');
  const [mic, setMic] = useState(false);
  const [miss, setMiss] = useState(0);
  const [msg, setMsg] = useState('');
  const micRef = useRef(false);
  micRef.current = mic;

  useEffect(() => {
    if (!visible) return;
    setText('');
    setMiss(0);
    setMsg('');
  }, [visible]);

  const decide = (said) => {
    const k = answerKind(said, secq);
    if (k) return onResult(k);
    const n = miss + 1;
    setMiss(n);
    setText('');
    if (n >= 2) return onResult(null);
    setMsg('Não entendi. Responda de novo.');
  };
  useSpeechRecognitionEvent('result', (e) => {
    if (!micRef.current) return;
    const t = e && e.results && e.results[0] ? e.results[0].transcript : '';
    if (t) setText(t);
    if (e.isFinal) {
      setMic(false);
      if (t) decide(t);
    }
  });
  useSpeechRecognitionEvent('end', () => micRef.current && setMic(false));
  const listen = () => {
    setMsg('');
    setMic(true);
    try {
      ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false, maxAlternatives: 1 });
    } catch (e) {
      setMic(false);
    }
  };

  if (!secq) return null;
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.back}>
        <View style={st.card}>
          <Text style={st.kicker}>Confirmação</Text>
          <Text style={st.q}>{secq.question}</Text>
          <TouchableOpacity style={[st.mic, mic && { backgroundColor: colors.primary }]} onPress={listen} accessibilityLabel="Responder falando">
            <Ionicons name="mic" size={30} color={mic ? '#fff' : colors.primary} />
          </TouchableOpacity>
          <TextInput style={st.input} value={text} onChangeText={setText} placeholder="Ou digite a resposta" placeholderTextColor={colors.muted} onSubmitEditing={() => text.trim() && decide(text)} />
          {msg ? <Text style={st.msg}>{msg}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <TouchableOpacity style={[st.btn, st.btnLight]} onPress={onCancel}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { marginLeft: 10, opacity: text.trim() ? 1 : 0.4 }]} disabled={!text.trim()} onPress={() => decide(text)}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Responder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(3,5,10,0.55)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 20, alignItems: 'stretch' },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  q: { color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  mic: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 14 },
  msg: { color: colors.danger, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnLight: { backgroundColor: '#F1F1F4' },
});
