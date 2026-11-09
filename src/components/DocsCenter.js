// Tela de contratos e receitas (abre pelo Perfil, pelo painel do prestador ou pela Lotus:
// "Lotus, fazer um contrato de aluguel", "Lotus, receita para Maria: dipirona 500 mg...").
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore } from '../store';
import { colors } from '../theme';
import { specialists } from '../extraData';
import { CONTRACT_TYPES, contractType, contractBody, canPrescribe, parseDictation, docTitle, allSigned, contractValue } from '../documents';
import SecurityQuestion from './SecurityQuestion';
import FaceCheck, { FACE_ABOVE } from './FaceCheck';
import { securityQuestion } from '../voicePrint';
import { triggerDuress } from '../duress';
import { api, serverOn, API_URL } from '../api';
import { hashOf, signWithBiometric, sharePdf, printDoc, startGovbr, pickSignedPdf, shareFile } from '../documentsIO';

const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const myName = (state) => (state.user && state.user.name) || 'Você';
const myDoc = (state) => (state.user && (state.user.cpf || state.user.cnpj)) || '';
const CHANNELS = ['Consulta online', 'Live', 'Presencial'];

export default function DocsCenter() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const open = state.docsOpen;
  const [mode, setMode] = useState('lista');
  const [viewId, setViewId] = useState(null);
  useEffect(() => {
    if (open) {
      setMode(open.mode || 'lista');
      setViewId(null);
    }
  }, [open && open.at]);
  const close = () => dispatch({ type: 'CLOSE_DOCS' });
  const doc = (state.documents || []).find((d) => d.id === viewId);
  const show = (id) => (setViewId(id), setMode('ver'));
  const back = () => (mode === 'lista' ? close() : (setMode('lista'), setViewId(null)));

  return (
    <Modal visible={!!open} animationType="slide" onRequestClose={back} statusBarTranslucent>
      <View style={[st.wrap, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
        <View style={st.top}>
          <TouchableOpacity onPress={back} accessibilityLabel="Voltar">
            <Ionicons name={mode === 'lista' ? 'close' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={st.title}>{mode === 'contrato' ? 'Novo contrato' : mode === 'receita' ? 'Nova receita' : mode === 'ver' && doc ? docTitle(doc) : 'Contratos e receitas'}</Text>
          <View style={{ width: 24 }} />
        </View>
        {mode === 'lista' ? <DocList onNew={setMode} onOpen={show} /> : null}
        {mode === 'contrato' ? <NewContract onDone={show} /> : null}
        {mode === 'receita' ? <NewPrescription draft={open && open.draft} onDone={show} /> : null}
        {mode === 'ver' && doc ? <DocView doc={doc} /> : null}
      </View>
    </Modal>
  );
}

function DocList({ onNew, onOpen }) {
  const { state } = useStore();
  const docs = state.documents || [];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={[st.bigBtn, { marginRight: 8 }]} onPress={() => onNew('contrato')}>
          <Ionicons name="document-text-outline" size={26} color={colors.primary} />
          <Text style={st.bigBtnText}>Novo contrato</Text>
          <Text style={st.small}>Aluguel, compra e venda, serviço</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.bigBtn} onPress={() => onNew('receita')}>
          <Ionicons name="medkit-outline" size={26} color={colors.primary} />
          <Text style={st.bigBtnText}>Nova receita</Text>
          <Text style={st.small}>Para profissionais que podem receitar</Text>
        </TouchableOpacity>
      </View>
      <Text style={st.h}>Meus documentos</Text>
      {!docs.length ? <Text style={st.p}>Nenhum documento ainda. Você também pode pedir à Lotus: "Lotus, fazer um contrato de aluguel".</Text> : null}
      {docs.map((d) => {
        const done = allSigned(d);
        const waiting = d.parties.filter((p) => !p.signedAt).map((p) => p.role).join(', ');
        return (
          <TouchableOpacity key={d.id} style={st.card} onPress={() => onOpen(d.id)}>
            <Ionicons name={d.kind === 'receita' ? 'medkit-outline' : contractType(d.type).icon} size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.cardTitle}>{docTitle(d)}</Text>
              <Text style={[st.small, { color: done ? '#1E7D4F' : '#B4532A' }]}>{done ? '✔ Assinado por todos' : `Aguardando: ${waiting}`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, multiline, placeholder, keyboardType }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
        style={[st.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function NewContract({ onDone }) {
  const { state, dispatch } = useStore();
  const [type, setType] = useState(CONTRACT_TYPES[0].key);
  const [me, setMe] = useState(0); // qual papel eu sou (0 ou 1)
  const [other, setOther] = useState({ name: '', doc: '' });
  const [fields, setFields] = useState({});
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const t = contractType(type);
  const create = async () => {
    const miss = t.fields.filter(([k]) => !String(fields[k] || '').trim() && k !== 'caucao');
    if (!other.name.trim()) return Alert.alert('Falta a outra parte', `Informe o nome do(a) ${t.roles[1 - me].toLowerCase()}.`);
    if (miss.length) return Alert.alert('Faltam dados', `Preencha: ${miss.map(([, l]) => l.split(' (')[0]).join(', ')}.`);
    setBusy(true);
    const mine = { name: myName(state), doc: myDoc(state), me: true };
    const theirs = { name: other.name.trim(), doc: other.doc.trim() };
    const parties = (me === 0 ? [mine, theirs] : [theirs, mine]).map((p, i) => ({ ...p, role: t.roles[i] }));
    const doc = { id: newId('ct'), kind: 'contrato', type, fields, extra: extra.trim(), parties, createdAt: Date.now() };
    doc.hash = await hashOf(doc);
    dispatch({ type: 'DOC_SAVE', doc });
    setBusy(false);
    onDone(doc.id);
  };
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={st.label}>Tipo de contrato</Text>
      <View style={st.chips}>
        {CONTRACT_TYPES.map((x) => (
          <TouchableOpacity key={x.key} style={[st.chip, type === x.key && st.chipOn]} onPress={() => (setType(x.key), setFields({}))}>
            <Text style={[st.chipText, type === x.key && { color: '#fff' }]}>{x.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={st.label}>Eu sou</Text>
      <View style={st.chips}>
        {t.roles.map((r, i) => (
          <TouchableOpacity key={r} style={[st.chip, me === i && st.chipOn]} onPress={() => setMe(i)}>
            <Text style={[st.chipText, me === i && { color: '#fff' }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label={`Nome do(a) ${t.roles[1 - me].toLowerCase()}`} value={other.name} onChangeText={(v) => setOther((o) => ({ ...o, name: v }))} />
      <Field label="CPF ou CNPJ da outra parte" value={other.doc} onChangeText={(v) => setOther((o) => ({ ...o, doc: v }))} keyboardType="numeric" />
      {t.fields.map(([k, label]) => (
        <Field key={k} label={label} value={fields[k] || ''} onChangeText={(v) => setFields((f) => ({ ...f, [k]: v }))} />
      ))}
      <Field label="Outros combinados (opcional)" value={extra} onChangeText={setExtra} multiline placeholder="Ex.: animais permitidos; pintura na saída por conta do locatário" />
      <Text style={st.note}>O contrato usa cláusulas padrão. Para casos especiais, vale revisar com um advogado.</Text>
      <TouchableOpacity style={st.btn} onPress={create} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Criar contrato</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function NewPrescription({ draft, onDone }) {
  const { state, dispatch } = useStore();
  const [demo, setDemo] = useState(null); // profissional de demonstração
  const pro = demo || (state.myProvider ? { ...state.myProvider, name: state.myProvider.name || myName(state) } : null);
  const check = canPrescribe(pro);
  const start = useMemo(() => parseDictation(draft || ''), [draft]);
  const [patient, setPatient] = useState({ name: start.patient || '', doc: '' });
  const [items, setItems] = useState(start.items.length ? start.items : [{ med: '', dose: '' }]);
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [busy, setBusy] = useState(false);
  // Ditar pela voz: "para Maria Souza: dipirona 500 mg, 1 comprimido de 6 em 6 horas por 3 dias"
  const [rec, setRec] = useState(false);
  const heard = useRef('');
  const dictate = () => {
    if (rec) return ExpoSpeechRecognitionModule.stop();
    heard.current = '';
    setRec(true);
    try {
      ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false, contextualStrings: ['comprimido', 'cápsula', 'gotas', 'mg', 'de 8 em 8 horas'] });
    } catch (e) {
      setRec(false);
    }
  };
  useSpeechRecognitionEvent('result', (e) => {
    if (!rec) return;
    const t = e && e.results && e.results[0] ? e.results[0].transcript : '';
    if (t) heard.current = t;
  });
  useSpeechRecognitionEvent('end', () => {
    if (!rec) return;
    setRec(false);
    const r = parseDictation(heard.current);
    if (r.patient && !patient.name) setPatient((p) => ({ ...p, name: r.patient }));
    if (r.items.length) setItems((list) => [...list.filter((x) => x.med.trim()), ...r.items]);
  });

  if (!check.ok) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={st.warn}>
          <Ionicons name="lock-closed-outline" size={22} color="#B4532A" />
          <Text style={[st.p, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>{check.reason}</Text>
        </View>
        <Text style={st.p}>No Realys, só receitam profissionais verificados cuja profissão permite: médicos (CRM), dentistas (CRO) e veterinários (CRMV). Curso técnico não receita.</Text>
        <Text style={st.h}>Demonstração</Text>
        {specialists.slice(0, 3).map((s) => (
          <TouchableOpacity key={s.id} style={st.card} onPress={() => setDemo({ ...s, service: /^CRO/.test(s.reg) ? 'dentista' : 'medico' })}>
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.cardTitle}>Receitar como {s.name}</Text>
              <Text style={st.small}>{s.specialty} · {s.reg}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  const create = async () => {
    const list = items.map((x) => ({ med: x.med.trim(), dose: x.dose.trim() })).filter((x) => x.med);
    if (!patient.name.trim()) return Alert.alert('Falta o paciente', 'Informe o nome do paciente.');
    if (!list.length) return Alert.alert('Receita vazia', 'Inclua pelo menos um medicamento, ou dite pela voz.');
    setBusy(true);
    const doc = {
      id: newId('rx'),
      kind: 'receita',
      channel,
      patient: { name: patient.name.trim(), doc: patient.doc.trim() },
      items: list,
      notes: notes.trim(),
      parties: [{ name: pro.name.replace(/\s*·\s*(CRM|CRO|CRMV)\b.*$/, ''), doc: check.reg, title: check.rule.titulo, role: check.rule.titulo, me: true }],
      createdAt: Date.now(),
    };
    doc.hash = await hashOf(doc);
    dispatch({ type: 'DOC_SAVE', doc });
    setBusy(false);
    onDone(doc.id);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={[st.card, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.cardTitle}>{pro.name}</Text>
          <Text style={st.small}>{check.rule.titulo} · {check.reg} · pode receitar {check.rule.escopo}</Text>
        </View>
      </View>
      <Text style={st.label}>Atendimento</Text>
      <View style={st.chips}>
        {CHANNELS.map((c) => (
          <TouchableOpacity key={c} style={[st.chip, channel === c && st.chipOn]} onPress={() => setChannel(c)}>
            <Text style={[st.chipText, channel === c && { color: '#fff' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Paciente" value={patient.name} onChangeText={(v) => setPatient((p) => ({ ...p, name: v }))} />
      <Field label="CPF do paciente (opcional)" value={patient.doc} onChangeText={(v) => setPatient((p) => ({ ...p, doc: v }))} keyboardType="numeric" />
      <TouchableOpacity style={[st.dictate, rec && { backgroundColor: colors.primary }]} onPress={dictate}>
        <Ionicons name="mic" size={20} color={rec ? '#fff' : colors.primary} />
        <Text style={[st.dictateText, rec && { color: '#fff' }]}>{rec ? 'Ouvindo… fale o remédio e como tomar' : 'Ditar pela voz'}</Text>
      </TouchableOpacity>
      <Text style={st.small}>Ex.: "dipirona 500 mg, 1 comprimido de 6 em 6 horas por 3 dias; e omeprazol 20 mg, 1 cápsula em jejum"</Text>
      {items.map((it, i) => (
        <View key={i} style={st.item}>
          <View style={{ flex: 1 }}>
            <TextInput value={it.med} onChangeText={(v) => setItems((l) => l.map((x, j) => (j === i ? { ...x, med: v } : x)))} placeholder="Medicamento e dose (ex.: Dipirona 500 mg)" placeholderTextColor={colors.muted} style={st.input} />
            <TextInput value={it.dose} onChangeText={(v) => setItems((l) => l.map((x, j) => (j === i ? { ...x, dose: v } : x)))} placeholder="Como usar (ex.: 1 comprimido de 6/6 h por 3 dias)" placeholderTextColor={colors.muted} style={[st.input, { marginTop: 6 }]} />
          </View>
          <TouchableOpacity onPress={() => setItems((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [{ med: '', dose: '' }]))} style={{ padding: 8 }} accessibilityLabel="Tirar item">
            <Ionicons name="trash-outline" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => setItems((l) => [...l, { med: '', dose: '' }])} style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Adicionar medicamento</Text>
      </TouchableOpacity>
      <Field label="Orientações (opcional)" value={notes} onChangeText={setNotes} multiline />
      <Text style={st.note}>Receitas de controle especial (ex.: Notificação de Receita A) seguem regras próprias da Anvisa e podem não valer em formato digital.</Text>
      <TouchableOpacity style={st.btn} onPress={create} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Gerar receita</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function DocView({ doc }) {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState('');
  const done = allSigned(doc);
  const rx = doc.kind === 'receita';
  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Não deu certo', 'Tente de novo.');
    }
    setBusy('');
  };
  // Quem cadastrou a voz do dono responde a pergunta de segurança depois da biometria.
  const [ask, setAsk] = useState(null); // índice da parte assinando
  // Contrato acima de R$ 1.000: biometria facial + pergunta de segurança pela voz (as duas, sempre).
  const [face, setFace] = useState(null); // índice da parte fazendo a biometria facial
  const big = !rx && contractValue(doc) > FACE_ABOVE;
  const signHere = (i) =>
    run('sign' + i, async () => {
      if (big && !securityQuestion())
        return Alert.alert(
          'Falta cadastrar a sua voz',
          'Contratos acima de R$ 1.000 precisam da biometria facial e da sua voz (pergunta de segurança). Cadastre em Perfil › Voz do titular e volte para assinar.'
        );
      const ok = await signWithBiometric(docTitle(doc));
      if (!ok) return;
      if (big) return setFace(i);
      if (securityQuestion()) return setAsk(i);
      dispatch({ type: 'DOC_SIGN', id: doc.id, index: i, method: 'realys' });
      register(i, false);
      Alert.alert('Contrato finalizado com sucesso.', 'Sua assinatura foi registrada.');
    });
  // Com o servidor: registra o documento para a conferência pública (/v/<código>, que vai no PDF).
  const register = async (signedIndex, coacao) => {
    if (!serverOn() || rx) return;
    const partes = doc.parties.map((p, j) => ({ papel: p.role, nome: p.name, assinadoEm: j === signedIndex ? Date.now() : p.signedAt || null, metodo: j === signedIndex ? 'realys' : p.method || null }));
    try {
      if (!doc.verifyCode) {
        const r = await api('POST', '/documentos', { hash: doc.hash, titulo: docTitle(doc), tipo: 'contrato', partes, coacao: !!coacao });
        dispatch({ type: 'DOC_SAVE', doc: { ...doc, verifyCode: r.codigo, verifyUrl: API_URL + r.url, parties: doc.parties.map((p, j) => (j === signedIndex && !p.signedAt ? { ...p, signedAt: Date.now(), method: 'realys', ...(coacao ? { coacao: true } : {}) } : p)), ...(coacao ? { coacao: true } : {}) } });
      } else await api('POST', `/documentos/${doc.verifyCode}`, { partes, coacao: !!coacao });
    } catch (e) {}
  };
  const answered = (kind) => {
    const i = ask;
    setAsk(null);
    if (kind === 'libera') {
      dispatch({ type: 'DOC_SIGN', id: doc.id, index: i, method: 'realys' });
      register(i, false);
      return Alert.alert('Contrato finalizado com sucesso.', 'Sua assinatura foi registrada.');
    }
    if (kind === 'seguranca') {
      // Parece assinado, mas a assinatura não vale (fica marcada como feita sob coação) e a segurança é acionada.
      dispatch({ type: 'DOC_SIGN', id: doc.id, index: i, method: 'realys', coacao: true });
      register(i, true);
      triggerDuress(dispatch, state, { what: `Assinatura do contrato "${docTitle(doc)}" (sob coação, a assinatura não vale)` });
      return Alert.alert('Contrato confirmado com sucesso, parabéns.', 'Sua assinatura foi registrada.');
    }
    Alert.alert('Não assinado', 'A resposta não confere. Nada foi assinado.');
  };
  const govbr = (i) =>
    run('gov' + i, async () => {
      await startGovbr(doc);
      Alert.alert('Assinar pelo gov.br', 'Assine o PDF no assinador do gov.br (precisa de conta prata ou ouro). Depois volte aqui e toque em "Anexar PDF assinado".');
    });
  const attach = (i) =>
    run('att' + i, async () => {
      const f = await pickSignedPdf();
      if (f && !rx) dispatch({ type: 'DOC_SIGN', id: doc.id, index: i, method: 'govbr', file: f.uri });
      if (f && rx) dispatch({ type: 'DOC_SAVE', doc: { ...doc, icp: true, icpFile: f.uri, parties: doc.parties.map((p, j) => (j === i ? { ...p, signedAt: p.signedAt || Date.now(), method: 'icp', file: f.uri } : p)) } });
    });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {rx ? (
        <View style={st.paper}>
          <Text style={st.cardTitle}>Paciente: {doc.patient.name}</Text>
          {doc.items.map((it, i) => (
            <Text key={i} style={[st.p, { marginTop: 8, marginBottom: 0, color: colors.text }]}>
              {i + 1}. <Text style={{ fontWeight: '800' }}>{it.med}</Text>
              {it.dose ? `\n   ${it.dose}` : ''}
            </Text>
          ))}
          {doc.notes ? <Text style={[st.p, { marginTop: 8 }]}>{doc.notes}</Text> : null}
        </View>
      ) : (
        <View style={st.paper}>
          {contractBody(doc).map((c, i) => (
            <Text key={i} style={[st.p, { color: colors.text, marginBottom: 6 }]}>
              {i + 1}. {c}
            </Text>
          ))}
          {doc.extra ? <Text style={[st.p, { color: colors.text }]}>Combinado: {doc.extra}</Text> : null}
        </View>
      )}
      <Text style={st.small}>Código do documento: {String(doc.hash || '').slice(0, 16)}…</Text>

      <Text style={st.h}>Assinaturas</Text>
      {doc.parties.map((p, i) => (
        <View key={i} style={st.party}>
          <Text style={st.cardTitle}>
            {p.role}: {p.name}
            {p.me ? ' (você)' : ''}
          </Text>
          {p.signedAt ? (
            <Text style={[st.small, { color: '#1E7D4F' }]}>
              ✔ Assinado {p.method === 'govbr' ? 'pelo gov.br' : p.method === 'icp' ? 'com certificado ICP-Brasil' : 'no Realys (biometria)'} em {new Date(p.signedAt).toLocaleString('pt-BR')}
            </Text>
          ) : p.me ? (
            <View>
              {rx ? (
                <>
                  <Text style={st.small}>Receita precisa da sua assinatura digital ICP-Brasil para valer na farmácia. Assine o PDF com o seu certificado (ex.: Prescrição Eletrônica do CFM) e anexe aqui.</Text>
                  <Row2>
                    <SmallBtn label="Abrir assinador do CFM" busy={busy === 'cfm'} onPress={() => run('cfm', async () => (await sharePdf(doc, 'assinatura'), Linking.openURL('https://prescricaoeletronica.cfm.org.br').catch(() => {})))} />
                    <SmallBtn label="Anexar receita assinada" busy={busy === 'att' + i} onPress={() => attach(i)} />
                  </Row2>
                </>
              ) : (
                <>
                  <Row2>
                    <SmallBtn label="Assinar no Realys" icon="finger-print" main busy={busy === 'sign' + i} onPress={() => signHere(i)} />
                    <SmallBtn label="Assinar pelo gov.br" busy={busy === 'gov' + i} onPress={() => govbr(i)} />
                  </Row2>
                  <TouchableOpacity onPress={() => attach(i)}>
                    <Text style={[st.small, { color: colors.primary, marginTop: 6 }]}>Já assinei no gov.br: anexar PDF assinado</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View>
              <Text style={st.small}>Aguardando. Envie para {p.name.split(' ')[0]} assinar pelo Realys.</Text>
              <Row2>
                <SmallBtn label="Enviar para assinar" busy={busy === 'send' + i} onPress={() => run('send' + i, () => sharePdf(doc, p.role))} />
                <SmallBtn label="Demonstração: assinar" busy={busy === 'demo' + i} onPress={() => dispatch({ type: 'DOC_SIGN', id: doc.id, index: i, method: 'realys' })} />
              </Row2>
            </View>
          )}
        </View>
      ))}

      <Text style={st.h}>Vias e cópias</Text>
      {!done ? <Text style={st.small}>As vias saem com o status de cada assinatura. Depois que todos assinarem, baixe as vias finais.</Text> : null}
      {rx ? (
        <Row2>
          <SmallBtn label="Enviar ao paciente" icon="send-outline" main busy={busy === 'pac'} onPress={() => run('pac', () => (doc.icpFile ? shareFile(doc.icpFile) : sharePdf(doc, 'paciente')))} />
          <SmallBtn label="Imprimir" icon="print-outline" busy={busy === 'print'} onPress={() => run('print', () => printDoc(doc))} />
        </Row2>
      ) : (
        <>
          <Row2>
            {doc.parties.map((p, i) => (
              <SmallBtn key={i} label={`Via ${p.role.replace('(a)', '').toLowerCase()}`} icon="download-outline" main={done} busy={busy === 'via' + i} onPress={() => run('via' + i, () => sharePdf(doc, `${p.role} ${p.name}`))} />
            ))}
          </Row2>
          <SmallBtn label="Imprimir" icon="print-outline" busy={busy === 'print'} onPress={() => run('print', () => printDoc(doc))} />
        </>
      )}
      <SecurityQuestion secq={securityQuestion()} visible={ask !== null} onResult={answered} onCancel={() => setAsk(null)} />
      <FaceCheck
        visible={face !== null}
        purpose="contrato"
        refId={doc.id}
        title="Biometria facial: contrato acima de R$ 1.000"
        onDone={(ok) => {
          const i = face;
          setFace(null);
          if (ok) setAsk(i);
        }}
        onClose={() => setFace(null)}
      />
    </ScrollView>
  );
}

const Row2 = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{children}</View>;
function SmallBtn({ label, icon, main, busy, onPress }) {
  return (
    <TouchableOpacity style={[st.sBtn, main && st.sBtnMain]} onPress={onPress} disabled={!!busy}>
      {busy ? <ActivityIndicator size="small" color={main ? '#fff' : colors.primary} /> : icon ? <Ionicons name={icon} size={16} color={main ? '#fff' : colors.primary} style={{ marginRight: 6 }} /> : null}
      <Text style={[st.sBtnText, main && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  h: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 18, marginBottom: 8 },
  p: { fontSize: 13.5, color: colors.muted, lineHeight: 20, marginBottom: 10 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  note: { fontSize: 11.5, color: colors.muted, marginVertical: 8 },
  label: { fontSize: 12.5, color: colors.text, fontWeight: '700', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, paddingVertical: 7, marginRight: 6, marginBottom: 6, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  bigBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  bigBtnText: { color: colors.text, fontWeight: '800', marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  warn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF0E9', borderRadius: 12, padding: 12, marginBottom: 12 },
  dictate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingVertical: 11, marginBottom: 6 },
  dictateText: { color: colors.primary, fontWeight: '700', marginLeft: 8 },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  paper: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, padding: 14, marginBottom: 8 },
  party: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  sBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, marginBottom: 8 },
  sBtnMain: { backgroundColor: colors.primary },
  sBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12.5 },
});
