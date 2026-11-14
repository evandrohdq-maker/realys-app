// Perfil › Carteira profissional: cadastrar a carteira da profissão e, depois de aprovada, escolher se
// quer receber casos da plataforma (servidor público atende de graça, sem taxa do Re@lys).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';
import { colors } from '../theme';
import { PROFESSIONS, professionOf, casesFor, roughPlace, isGovEmail, CONSELHO_TEXT } from '../credentials';
import { api, serverOn } from '../api';
import { getDevicePoint } from '../geo';

const STATUS = { em_analise: ['Em análise', '#C77D12'], aprovado: ['Aprovada', '#1E9E63'], recusado: ['Recusada', '#C0392B'] };

export default function Credentials() {
  const { state, dispatch } = useStore();
  const uid = state.user && state.user.id;
  const mine = (state.credentials || []).filter((c) => !c.userId || c.userId === uid);
  const [adding, setAdding] = useState(false);
  const [prof, setProf] = useState(null);
  const [number, setNumber] = useState('');
  const [uf, setUf] = useState('');
  const [orgao, setOrgao] = useState('');
  const [photo, setPhoto] = useState(null);
  const [gov, setGov] = useState(false);
  const [nomeCarteira, setNomeCarteira] = useState('');
  const [sigilo, setSigilo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mail, setMail] = useState({}); // { [credId]: { email, code, sent, demo } }
  const p = professionOf(prof);
  // Plantão ("estou na ativa"): servidor público ou profissional de saúde aprovado manda o GPS a cada 5 min
  // e pode ser avisado como o mais perto de uma vítima. Só com o servidor no ar.
  const [plantao, setPlantao] = useState(false);
  const [srvCases, setSrvCases] = useState([]);
  const tick = useRef(null);
  const sendPos = async () => {
    const pt = await getDevicePoint();
    if (!pt) return Alert.alert('GPS', 'Ligue a localização para ficar de plantão.');
    await api('POST', '/plantao', { on: true, lat: pt.lat, lon: pt.lon });
  };
  const togglePlantao = async (v) => {
    try {
      if (v) {
        await sendPos();
        tick.current = setInterval(() => sendPos().catch(() => {}), 5 * 60 * 1000);
      } else {
        clearInterval(tick.current);
        await api('POST', '/plantao', { on: false });
      }
      setPlantao(v);
    } catch (e) {
      Alert.alert('Plantão', (e && e.message) || 'Tente de novo.');
    }
  };
  useEffect(() => () => clearInterval(tick.current), []);
  const anyReceive = mine.some((c) => c.status === 'aprovado' && c.receiveCases);
  useEffect(() => {
    if (!serverOn() || !anyReceive) return;
    const load = () => api('GET', '/casos').then((r) => setSrvCases(r.items || [])).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [anyReceive]);
  const setM = (id, patch) => setMail((m) => ({ ...m, [id]: { ...(m[id] || {}), ...patch } }));

  // E-mail institucional: código de 6 números (com servidor, chega no e-mail; na demonstração, aparece na tela).
  const sendCode = async (c) => {
    const email = String((mail[c.id] || {}).email || '').trim().toLowerCase();
    if (!isGovEmail(email)) return Alert.alert('E-mail institucional', 'Use o e-mail do seu órgão, terminado em .gov.br, .jus.br, .mp.br, .leg.br ou .mil.br.');
    try {
      if (serverOn() && c.serverId) {
        const r = await api('POST', `/credenciais/${c.serverId}/email`, { email });
        setM(c.id, { sent: true, demo: r.codigoTeste || null });
        if (r.codigoTeste) Alert.alert('Fase de testes', `O envio de e-mail ainda não foi contratado. Código: ${r.codigoTeste}`);
      } else {
        const demo = String(Math.floor(100000 + Math.random() * 900000));
        setM(c.id, { sent: true, demo });
        Alert.alert('Demonstração', `Na versão real o código chega em ${email}. Código: ${demo}`);
      }
    } catch (e) {
      Alert.alert('Não enviado', (e && e.message) || 'Tente de novo.');
    }
  };
  const confirmCode = async (c) => {
    const m = mail[c.id] || {};
    try {
      if (serverOn() && c.serverId) await api('POST', `/credenciais/${c.serverId}/email/confirmar`, { codigo: m.code });
      else if (String(m.code || '').trim() !== m.demo) return Alert.alert('Código errado', 'Confira o código e tente de novo.');
      dispatch({ type: 'CRED_SET', id: c.id, patch: { emailInst: m.email, emailOk: true } });
      setM(c.id, { sent: false });
    } catch (e) {
      Alert.alert('Código errado', (e && e.message) || 'Confira o código e tente de novo.');
    }
  };

  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Câmera', 'Libere a câmera para fotografar a carteira.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (!r.canceled) setPhoto({ uri: r.assets[0].uri, b64: r.assets[0].base64 });
  };
  const save = async () => {
    if (!p) return Alert.alert('Profissão', 'Escolha a sua profissão.');
    if (!number.trim()) return Alert.alert('Número', `Informe o número da ${p.doc.replace('Carteira ', '').replace('funcional ', 'carteira ')}.`);
    if (!photo) return Alert.alert('Foto da carteira', `Fotografe a ${p.doc}.`);
    const base = { prof: p.key, label: p.label, doc: p.doc, number: number.trim(), uf: uf.trim().toUpperCase().slice(0, 2), orgao: orgao.trim(), gov: !!(p.gov || gov), nomeCarteira: nomeCarteira.trim(), discreto: !!(p.gov || gov || sigilo) };
    let checks = { conselho: p.gov ? 'orgao_publico' : 'manual' };
    if (serverOn()) {
      // Servidor confere: nome da carteira, rosto da carteira x rosto do cadastro e o conselho (positivo/negativo).
      setBusy(true);
      try {
        const r = await api('POST', '/credenciais', { prof: p.key, numero: base.number, uf: base.uf, orgao: base.orgao, gov: base.gov, discreto: base.discreto, nomeCarteira: base.nomeCarteira, foto: photo.b64 });
        checks = { serverId: r.id, conselho: r.conselho, nomeConfere: r.nomeConfere, rostoSemelhanca: r.rostoSemelhanca };
      } catch (e) {
        setBusy(false);
        return Alert.alert('Não enviado', (e && e.message) || 'Tente de novo.');
      }
      setBusy(false);
    }
    dispatch({ type: 'CRED_ADD', cred: { ...base, ...checks } });
    const ct = CONSELHO_TEXT[checks.conselho];
    setAdding(false);
    setProf(null);
    setNumber('');
    setUf('');
    setOrgao('');
    setPhoto(null);
    setGov(false);
    setNomeCarteira('');
    Alert.alert(
      ct ? ct[0] : 'Carteira enviada',
      `${ct ? ct[1] + '\n\n' : ''}${p.gov ? 'Confirme também o seu e-mail institucional logo abaixo. ' : ''}A equipe do Re@lys faz a conferência final e avisa você.`
    );
  };

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="id-card-outline" size={22} color={colors.primary} />
        <Text style={st.title}>Carteira profissional</Text>
      </View>
      <Text style={st.sub}>Advogado, médico, policial, bombeiro... Para se apresentar com a profissão, cadastre a carteira dela (OAB, CRM, carteira funcional). É opcional.</Text>

      {mine.map((c) => {
        const [label, color] = STATUS[c.status] || STATUS.em_analise;
        // Com servidor: os casos vêm da central; sem servidor, os pedidos deste celular (demonstração).
        const cases = serverOn()
          ? c.status === 'aprovado' && c.receiveCases
            ? srvCases.map((x) => ({ id: x.id, tipo: x.tipo || x.kind, protocol: x.protocolo, address: x.local && x.local.endereco, kind: x.kind, texto: x.texto, followers: x.acompanhando ? [state.user && state.user.name] : [], server: true }))
            : []
          : casesFor(c, state.sosRequests);
        return (
          <View key={c.id} style={st.item}>
            <Text style={st.itemTitle}>{c.label}</Text>
            <Text style={st.itemSub}>
              {c.doc} nº {c.number}
              {c.uf ? `/${c.uf}` : ''} · <Text style={{ color, fontWeight: '800' }}>{label}</Text>
            </Text>
            {CONSELHO_TEXT[c.conselho] ? (
              <Text style={[st.itemSub, { color: CONSELHO_TEXT[c.conselho][2], fontWeight: '700' }]}>{CONSELHO_TEXT[c.conselho][0]}</Text>
            ) : null}
            {c.nomeConfere === false ? <Text style={[st.itemSub, { color: colors.danger }]}>O nome da carteira não bate com o nome da conta.</Text> : null}
            {c.gov ? <Text style={st.itemSub}>Servidor público: se atender pelo Re@lys, atende de graça (sem taxa do Re@lys).</Text> : null}
            {c.gov && !c.emailOk && c.status !== 'recusado' ? (
              <View style={{ marginTop: 8 }}>
                <Text style={[st.itemSub, { color: colors.text, fontWeight: '700' }]}>Confirmar e-mail institucional</Text>
                <TextInput style={st.input} value={(mail[c.id] || {}).email || ''} onChangeText={(v) => setM(c.id, { email: v })} placeholder="seu.nome@orgao.uf.gov.br" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" />
                {(mail[c.id] || {}).sent ? (
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput style={[st.input, { flex: 1, marginRight: 8 }]} value={(mail[c.id] || {}).code || ''} onChangeText={(v) => setM(c.id, { code: v.replace(/\D/g, '').slice(0, 6) })} placeholder="Código de 6 números" placeholderTextColor={colors.muted} keyboardType="number-pad" />
                    <TouchableOpacity style={[st.btn, { marginTop: 0, paddingHorizontal: 14, justifyContent: 'center' }]} onPress={() => confirmCode(c)}>
                      <Text style={st.btnText}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => sendCode(c)}>
                    <Text style={st.link}>Enviar código para o e-mail</Text>
                  </TouchableOpacity>
                )}
                <Text style={st.itemSub}>Não tem e-mail institucional? A equipe confirma direto com o seu órgão.</Text>
              </View>
            ) : null}
            {c.gov && c.emailOk ? <Text style={[st.itemSub, { color: '#1E9E63', fontWeight: '700' }]}>✔ E-mail institucional confirmado: {c.emailInst}</Text> : null}
            <View style={st.switchRow}>
              <Text style={st.switchText}>Sigilo: não mostrar a profissão no meu perfil público (os atendimentos ficam registrados só dentro do Re@lys)</Text>
              <Switch
                value={!!c.discreto}
                onValueChange={(v) => {
                  dispatch({ type: 'CRED_SET', id: c.id, patch: { discreto: v } });
                  if (serverOn() && c.serverId) api('POST', `/credenciais/${c.serverId}/sigilo`, { on: v }).catch(() => {});
                }}
              />
            </View>
            {c.status === 'aprovado' && serverOn() && (c.gov || c.prof === 'medico' || c.prof === 'enfermeiro') ? (
              <View style={st.switchRow}>
                <Text style={st.switchText}>Estou na ativa (plantão): ser avisado quando eu for o mais perto de uma vítima</Text>
                <Switch value={plantao} onValueChange={togglePlantao} />
              </View>
            ) : null}
            {c.status === 'aprovado' ? (
              <View style={st.switchRow}>
                <Text style={st.switchText}>Receber casos da plataforma para analisar</Text>
                <Switch
                  value={!!c.receiveCases}
                  onValueChange={(v) => {
                    dispatch({ type: 'CRED_SET', id: c.id, patch: { receiveCases: v } });
                    if (serverOn() && c.serverId) api('POST', `/credenciais/${c.serverId}/casos`, { on: v }).catch(() => {});
                  }}
                />
              </View>
            ) : null}
            {cases.map((r) => (
              <View key={r.id} style={st.case}>
                <Text style={st.caseTitle}>
                  {r.tipo} · {r.protocol}
                </Text>
                <Text style={st.itemSub}>{roughPlace(r)}{r.texto ? ` · ${r.texto.slice(0, 120)}` : ''}</Text>
                {(r.followers || []).includes(state.user && state.user.name) ? (
                  <Text style={[st.itemSub, { color: '#1E9E63', fontWeight: '700' }]}>Você está acompanhando</Text>
                ) : (
                  <TouchableOpacity onPress={() => (r.server ? api('POST', `/casos/${r.id}/acompanhar`, {}).then(() => setSrvCases((l) => l.map((x) => (x.id === r.id ? { ...x, acompanhando: true } : x)))).catch((e) => Alert.alert('Não deu certo', e.message)) : null, !r.server && dispatch({ type: 'CASE_FOLLOW', id: r.id, who: state.user ? state.user.name : 'Profissional', label: c.discreto ? `${c.label} verificado (sigilo)` : `${c.label} ${state.user ? state.user.name : ''}`.trim() }))}>
                    <Text style={st.link}>Quero acompanhar este caso</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => dispatch({ type: 'CRED_REMOVE', id: c.id })}>
              <Text style={[st.link, { color: colors.muted }]}>Remover</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {!adding ? (
        <TouchableOpacity onPress={() => setAdding(true)}>
          <Text style={st.link}>+ Cadastrar carteira profissional</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 10 }}>
          <View style={st.chips}>
            {PROFESSIONS.map((x) => (
              <TouchableOpacity key={x.key} style={[st.chip, prof === x.key && st.chipOn]} onPress={() => setProf(x.key)}>
                <Text style={[st.chipText, prof === x.key && { color: '#fff' }]}>{x.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {p ? (
            <>
              <Text style={st.label}>{p.doc}</Text>
              <TextInput style={st.input} value={nomeCarteira} onChangeText={setNomeCarteira} placeholder="Nome como está na carteira" placeholderTextColor={colors.muted} />
              <TextInput style={st.input} value={number} onChangeText={setNumber} placeholder={`Número (${p.conselho})`} placeholderTextColor={colors.muted} />
              <View style={{ flexDirection: 'row' }}>
                <TextInput style={[st.input, { width: 70, marginRight: 8 }]} value={uf} onChangeText={setUf} placeholder="UF" placeholderTextColor={colors.muted} autoCapitalize="characters" maxLength={2} />
                {p.gov ? <TextInput style={[st.input, { flex: 1 }]} value={orgao} onChangeText={setOrgao} placeholder="Órgão (ex.: Brigada Militar - RS)" placeholderTextColor={colors.muted} /> : null}
              </View>
              {!p.gov ? (
                <View style={st.switchRow}>
                  <Text style={st.switchText}>Trabalho para o governo (atendo de graça pelo Re@lys)</Text>
                  <Switch value={gov} onValueChange={setGov} />
                </View>
              ) : null}
              {!p.gov && !gov ? (
                <View style={st.switchRow}>
                  <Text style={st.switchText}>Sigilo: não mostrar a profissão no meu perfil público</Text>
                  <Switch value={sigilo} onValueChange={setSigilo} />
                </View>
              ) : (
                <Text style={st.itemSub}>Servidor público: a profissão fica em sigilo (não aparece no perfil público). Dá para mudar depois.</Text>
              )}
              <TouchableOpacity style={st.photoBtn} onPress={pick}>
                <Ionicons name={photo ? 'checkmark-circle' : 'camera-outline'} size={20} color={colors.primary} />
                <Text style={[st.link, { marginTop: 0, marginLeft: 6 }]}>{photo ? 'Foto da carteira tirada' : `Fotografar a ${p.doc}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={save}>
                <Text style={st.btnText}>{busy ? 'Conferindo…' : 'Enviar e conferir'}</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity onPress={() => setAdding(false)}>
            <Text style={[st.link, { color: colors.muted }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 8 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  itemTitle: { color: colors.text, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  case: { backgroundColor: '#F6F3FA', borderRadius: 10, padding: 10, marginTop: 8 },
  caseTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  label: { color: colors.text, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: colors.text, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  switchText: { color: colors.text, flex: 1, marginRight: 8, fontSize: 13 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
});
