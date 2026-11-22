// Empregos com contas reais (Negócios › Empregos, Perfil › Meu currículo e o RH da empresa).
// - Currículo em 3 passos: anexar o arquivo (PDF, Word, ODT, texto ou foto) que o Realyz lê e
//   preenche; responder as perguntas em botões (funções e nível, dias, turnos, tipo de vaga,
//   distância, salário); e "aberto a propostas". Dá para juntar fotos da própria galeria do Realyz.
// - Vagas para você com a % de compatibilidade e o porquê; convites e candidaturas com o andamento.
// - Empresa: anunciar vaga, ver os indicados (sem nome) e convidar; candidatos com nome e currículo.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors, soft } from '../theme';
import { api, API_URL, uploadMedia } from '../api';
import { conectado } from '../serverShop';
import { getDevicePoint } from '../geo';
import { Photo } from './ui';
import { abrirArquivoProtegido } from '../abrirArquivo';
import { FUNCOES_EMPREGO, funcaoEmprego, TIPOS, ESCOLARIDADES, DISTANCIAS, STATUS_CAND, MIMES_CURRICULO, enviarArquivo } from '../empregosApp';
import { NIVEIS, DIAS, TURNOS, ITENS } from '../extras';

const full = (u) => (u && u.startsWith('/') ? API_URL + u : u);
const brl = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const UNID = { mes: 'por mês', dia: 'por dia', hora: 'por hora', turno: 'por turno' };

const Chip = ({ on, label, onPress, icon }) => (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]} accessibilityState={{ selected: !!on }}>
    {icon ? <Ionicons name={icon} size={13} color={on ? '#fff' : colors.primary} style={{ marginRight: 4 }} /> : null}
    <Text numberOfLines={1} style={[st.chipTxt, on && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);
const Head = ({ title, onClose, action, onAction, busy }) => (
  <View style={st.head}>
    <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityLabel="Fechar"><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
    <Text style={[st.title, { flex: 1, marginLeft: 6 }]} numberOfLines={1}>{title}</Text>
    {action ? (
      <TouchableOpacity onPress={busy ? undefined : onAction} style={st.save}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>{action}</Text>}</TouchableOpacity>
    ) : null}
  </View>
);

// ---------- Galeria: escolher fotos já postadas no Realyz (com busca) ----------
function GaleriaPicker({ escolhidas, onClose, onPronto }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [fotos, setFotos] = useState(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(escolhidas || []);
  const [subindo, setSubindo] = useState(false);
  useEffect(() => {
    const id = state.user && state.user.serverId;
    api('GET', `/users/${id}`)
      .then((u) => setFotos((u.posts || []).filter((p) => p.media && !/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(p.media)).map((p) => ({ url: p.media, text: p.text || '', at: p.createdAt }))))
      .catch(() => setFotos([]));
  }, []);
  const tog = (u) => setSel((x) => (x.includes(u) ? x.filter((y) => y !== u) : x.length >= 8 ? x : [...x, u]));
  const doCelular = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled || !r.assets || !r.assets[0]) return;
    setSubindo(true);
    try {
      const url = (await uploadMedia(r.assets[0].uri, r.assets[0].mimeType || 'image/jpeg')).replace(API_URL, '');
      setFotos((f) => [{ url, text: 'Enviada agora', at: Date.now() }, ...(f || [])]);
      tog(url);
    } catch (e) {
      Alert.alert('Foto não enviada', e.message);
    } finally {
      setSubindo(false);
    }
  };
  const lista = (fotos || []).filter((f) => !q.trim() || f.text.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Head title={`Fotos para a empresa (${sel.length}/8)`} onClose={onClose} action="Pronto" onAction={() => onPronto(sel)} />
        <View style={{ padding: 12 }}>
          <View style={st.search}>
            <Ionicons name="search" size={17} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Buscar nas suas fotos (pelo texto do post)" placeholderTextColor={colors.muted} style={{ flex: 1, padding: 9, color: colors.text }} />
          </View>
          <TouchableOpacity onPress={doCelular} style={[st.chip, { alignSelf: 'flex-start' }]}>
            {subindo ? <ActivityIndicator color={colors.primary} /> : <Text style={st.chipTxt}>+ Foto do celular</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 30 + insets.bottom }}>
          {fotos == null ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null}
          {fotos && !lista.length ? <Text style={[st.muted, { margin: 12 }]}>{q ? 'Nenhuma foto com esse texto.' : 'Você ainda não postou fotos no Realyz. Mande uma do celular.'}</Text> : null}
          {lista.map((f) => {
            const on = sel.includes(f.url);
            return (
              <TouchableOpacity key={f.url} onPress={() => tog(f.url)} style={{ width: '33.33%', padding: 4 }}>
                <Photo uri={full(f.url)} style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }} />
                {on ? <View style={st.check}><Ionicons name="checkmark" size={16} color="#fff" /></View> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------- Currículo ----------
const CV_VAZIO = { titulo: '', funcoes: [], dias: ['seg', 'ter', 'qua', 'qui', 'sex'], turnos: ['manha', 'tarde'], tipos: ['clt'], salarioMin: '', distanciaMax: 10, escolaridade: '', experiencia: '', cursos: [], itens: [], fotos: [], aberto: true };

export function CurriculoEditor({ onClose, onSalvo }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const [cv, setCv] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [galeria, setGaleria] = useState(false);
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    api('GET', '/curriculo')
      .then((r) => {
        const c = r.curriculo;
        // Sem currículo ainda: começa pela profissão do perfil, se tiver.
        setCv(c ? { ...CV_VAZIO, ...c, salarioMin: c.salarioMin || '' } : { ...CV_VAZIO, titulo: (state.myProfile && state.myProfile.profession) || '' });
        setArquivo(c && c.arquivo);
      })
      .catch(() => setCv({ ...CV_VAZIO }));
  }, []);
  if (!cv) return (
    <Modal visible onRequestClose={onClose}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View></Modal>
  );
  const set = (k, v) => setCv((x) => ({ ...x, [k]: v }));
  const tog = (k, v) => setCv((x) => ({ ...x, [k]: (x[k] || []).includes(v) ? x[k].filter((y) => y !== v) : [...(x[k] || []), v] }));
  const nivelDe = (f) => ((cv.funcoes || []).find((x) => x.funcao === f) || {}).nivel;
  const setFuncao = (f, nivel) => setCv((x) => ({ ...x, funcoes: [...(x.funcoes || []).filter((y) => y.funcao !== f), ...(nivel ? [{ funcao: f, nivel }] : [])] }));
  const aplicar = (s) => {
    if (!s) return;
    setCv((x) => {
      const fs = [...(x.funcoes || [])];
      (s.funcoes || []).forEach((f) => !fs.some((y) => y.funcao === f.funcao) && fs.push(f));
      return { ...x, funcoes: fs, escolaridade: x.escolaridade || s.escolaridade || '', cursos: [...new Set([...(x.cursos || []), ...(s.cursos || [])])].slice(0, 10) };
    });
    const n = (s.funcoes || []).length;
    setAviso(s.temTexto ? (n ? `Li o seu currículo e marquei ${n} função(ões)${s.escolaridade ? ` e "${s.escolaridade}"` : ''}. Confira abaixo.` : 'Li o currículo, mas não achei as funções. Marque abaixo o que você faz.') : 'Foto do currículo guardada. Responda as perguntas abaixo para as empresas te acharem.');
  };
  const anexar = async (foto) => {
    try {
      let uri, nome, mime;
      if (foto) {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (r.canceled || !r.assets || !r.assets[0]) return;
        ({ uri } = r.assets[0]);
        mime = r.assets[0].mimeType || 'image/jpeg';
        nome = r.assets[0].fileName || 'curriculo.jpg';
      } else {
        const r = await DocumentPicker.getDocumentAsync({ type: [...MIMES_CURRICULO, 'image/*'], copyToCacheDirectory: true });
        if (r.canceled || !r.assets || !r.assets[0]) return;
        ({ uri, name: nome, mimeType: mime } = r.assets[0]);
        if (r.assets[0].size > 8 * 1024 * 1024) return Alert.alert('Arquivo grande', 'Currículo de até 8 MB.');
      }
      setLendo(true);
      const r = await enviarArquivo(uri, nome, mime);
      setArquivo(r.arquivo);
      aplicar(r.sugestao);
    } catch (e) {
      Alert.alert('Currículo não enviado', e.message);
    } finally {
      setLendo(false);
    }
  };
  const salvar = async () => {
    if (!(cv.funcoes || []).length) return Alert.alert('Falta uma coisa', 'Marque pelo menos uma função que você faz ou pode fazer.');
    setSalvando(true);
    try {
      const pt = await getDevicePoint().catch(() => null);
      const corpo = { ...cv, salarioMin: Number(String(cv.salarioMin).replace(/\D/g, '')) || null, cursos: (cv.cursos || []).filter(Boolean), ...(pt ? { lat: pt.lat, lng: pt.lon } : {}) };
      await api('PUT', '/curriculo', corpo);
      onSalvo && onSalvo();
      onClose();
    } catch (e) {
      Alert.alert('Não salvou', e.message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Head title="Meu currículo" onClose={onClose} action="Salvar" onAction={salvar} busy={salvando} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={st.passo}>1 · Seu currículo (opcional)</Text>
          <Text style={st.hint}>PDF, Word, OpenDocument, texto ou foto. O Realyz lê e já preenche para você. Só a empresa que você escolher vê o arquivo.</Text>
          <View style={st.wrap}>
            <TouchableOpacity style={[st.btn, { marginRight: 8 }]} onPress={() => anexar(false)}><Ionicons name="document-attach-outline" size={17} color="#fff" /><Text style={st.btnTxt}>Anexar arquivo</Text></TouchableOpacity>
            <TouchableOpacity style={[st.btn, st.btnLight]} onPress={() => anexar(true)}><Ionicons name="camera-outline" size={17} color={colors.primary} /><Text style={[st.btnTxt, { color: colors.primary }]}>Foto do currículo</Text></TouchableOpacity>
          </View>
          {lendo ? <Text style={[st.hint, { marginTop: 8 }]}>Lendo o currículo…</Text> : null}
          {arquivo ? <Text style={[st.hint, { marginTop: 8, color: colors.success }]}>📎 {arquivo.nome}</Text> : null}
          {aviso ? <Text style={[st.hint, { color: colors.text, fontWeight: '700' }]}>{aviso}</Text> : null}

          <Text style={st.passo}>2 · O que você faz</Text>
          <TextInput value={cv.titulo} onChangeText={(v) => set('titulo', v)} placeholder="Em uma frase: ex.: Garçom com 3 anos em churrascaria" placeholderTextColor={colors.muted} style={st.input} />
          {FUNCOES_EMPREGO.map((f) => {
            const n = nivelDe(f.key);
            return (
              <View key={f.key} style={[st.card, { paddingVertical: 10, marginTop: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={f.icon} size={18} color={n ? colors.primary : colors.muted} />
                  <Text style={{ color: colors.text, fontWeight: n ? '800' : '600', marginLeft: 8, flex: 1 }}>{f.label}</Text>
                  {n ? <TouchableOpacity onPress={() => setFuncao(f.key, null)}><Text style={{ color: colors.muted, fontSize: 12 }}>Tirar</Text></TouchableOpacity> : null}
                </View>
                <View style={st.wrap}>{NIVEIS.map((nv) => <Chip key={nv.key} on={n === nv.key} label={nv.label} onPress={() => setFuncao(f.key, nv.key)} />)}</View>
              </View>
            );
          })}
          <Text style={st.sec}>Tipo de vaga</Text>
          <View style={st.wrap}>{TIPOS.map((t) => <Chip key={t.key} on={(cv.tipos || []).includes(t.key)} label={t.label} onPress={() => tog('tipos', t.key)} />)}</View>
          <Text style={st.sec}>Dias</Text>
          <View style={st.wrap}>{DIAS.map((d) => <Chip key={d.key} on={(cv.dias || []).includes(d.key)} label={d.label} onPress={() => tog('dias', d.key)} />)}</View>
          <Text style={st.sec}>Turnos</Text>
          <View style={st.wrap}>{TURNOS.map((t) => <Chip key={t.key} on={(cv.turnos || []).includes(t.key)} label={t.label} onPress={() => tog('turnos', t.key)} />)}</View>
          <Text style={st.sec}>Até quantos km de casa</Text>
          <View style={st.wrap}>{DISTANCIAS.map((d) => <Chip key={d} on={Number(cv.distanciaMax) === d} label={`${d} km`} onPress={() => set('distanciaMax', d)} />)}</View>
          <Text style={st.sec}>Salário que você quer (opcional)</Text>
          <TextInput value={String(cv.salarioMin || '')} onChangeText={(v) => set('salarioMin', v)} placeholder="Ex.: 2000 por mês" placeholderTextColor={colors.muted} keyboardType="number-pad" style={st.input} />
          <Text style={st.sec}>Estudo</Text>
          <View style={st.wrap}>{ESCOLARIDADES.map((e) => <Chip key={e} on={cv.escolaridade === e} label={e} onPress={() => set('escolaridade', e)} />)}</View>
          <Text style={st.sec}>Experiência (do seu jeito)</Text>
          <TextInput value={cv.experiencia} onChangeText={(v) => set('experiencia', v)} placeholder="Onde trabalhou, quanto tempo e o que fazia" placeholderTextColor={colors.muted} multiline style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]} />
          <Text style={st.sec}>Cursos (separe por vírgula)</Text>
          <TextInput value={(cv.cursos || []).join(', ')} onChangeText={(v) => set('cursos', v.split(',').map((x) => x.trimStart()))} placeholder="Ex.: Manipulação de alimentos, NR-35" placeholderTextColor={colors.muted} style={st.input} />
          <Text style={st.sec}>O que você tem</Text>
          <View style={st.wrap}>{ITENS.map((it) => <Chip key={it} on={(cv.itens || []).includes(it)} label={it} onPress={() => tog('itens', it)} />)}</View>
          <Text style={st.sec}>Fotos do seu trabalho</Text>
          <Text style={st.hint}>Escolha da sua galeria do Realyz (pratos, eventos, certificados). Vão junto quando você se candidatar.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(cv.fotos || []).map((u) => <Photo key={u} uri={full(u)} style={{ width: 70, height: 70, borderRadius: 10, marginRight: 6 }} />)}
            <TouchableOpacity onPress={() => setGaleria(true)} style={[st.addFoto]}><Ionicons name="images-outline" size={22} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Galeria</Text></TouchableOpacity>
          </ScrollView>

          <Text style={st.passo}>3 · Aberto a propostas</Text>
          <View style={[st.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ flex: 1, color: colors.text }}>As empresas veem seu perfil <Text style={{ fontWeight: '800' }}>sem o nome</Text> ("Garçom experiente · 2 km") e podem te convidar. Nome e arquivo só depois que você aceitar.</Text>
            <Switch value={cv.aberto !== false} onValueChange={(v) => set('aberto', v)} />
          </View>
        </ScrollView>
        {galeria ? <GaleriaPicker escolhidas={cv.fotos} onClose={() => setGaleria(false)} onPronto={(f) => (set('fotos', f), setGaleria(false))} /> : null}
      </View>
    </Modal>
  );
}

// ---------- Vaga (empresa) ----------
function VagaForm({ onClose, onCriada }) {
  const insets = useSafeAreaInsets();
  const [f, setF] = useState({ titulo: '', funcao: 'garcom', nivel: 'ja-fiz', tipo: 'clt', salario: '', salarioUnidade: 'mes', dias: [], turnos: [], itens: [], descricao: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const tog = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const publicar = async () => {
    if (f.titulo.trim().length < 3) return Alert.alert('Título', 'Ex.: Garçom para o rodízio de sexta e sábado.');
    setBusy(true);
    try {
      const pt = await getDevicePoint().catch(() => null);
      const v = await api('POST', '/vagas', { ...f, salario: f.salario ? Number(String(f.salario).replace(',', '.')) : null, ...(pt ? { lat: pt.lat, lng: pt.lon } : {}) });
      Alert.alert('Vaga publicada', v.indicados ? `O Realyz já achou ${v.indicados} pessoa(s) que combinam. Veja em Indicados e convide.` : 'Quando aparecer alguém que combina, você vê em Indicados.');
      onCriada && onCriada();
      onClose();
    } catch (e) {
      Alert.alert('Vaga não publicada', e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Head title="Anunciar vaga" onClose={onClose} action="Publicar" onAction={publicar} busy={busy} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <Text style={st.sec}>Título</Text>
          <TextInput value={f.titulo} onChangeText={(v) => set('titulo', v)} placeholder="Ex.: Garçom para o rodízio" placeholderTextColor={colors.muted} style={st.input} />
          <Text style={st.sec}>Função</Text>
          <View style={st.wrap}>{FUNCOES_EMPREGO.map((x) => <Chip key={x.key} on={f.funcao === x.key} label={x.label} onPress={() => set('funcao', x.key)} />)}</View>
          <Text style={st.sec}>Experiência mínima</Text>
          <View style={st.wrap}>{NIVEIS.map((n) => <Chip key={n.key} on={f.nivel === n.key} label={n.label} onPress={() => set('nivel', n.key)} />)}</View>
          <Text style={st.sec}>Tipo</Text>
          <View style={st.wrap}>{TIPOS.map((t) => <Chip key={t.key} on={f.tipo === t.key} label={t.label} onPress={() => set('tipo', t.key)} />)}</View>
          <Text style={st.sec}>Salário</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput value={f.salario} onChangeText={(v) => set('salario', v)} placeholder="2200" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[st.input, { flex: 1, marginRight: 8 }]} />
            {Object.entries(UNID).map(([k, l]) => <Chip key={k} on={f.salarioUnidade === k} label={l.replace('por ', '/')} onPress={() => set('salarioUnidade', k)} />)}
          </View>
          <Text style={st.sec}>Turnos</Text>
          <View style={st.wrap}>{TURNOS.map((t) => <Chip key={t.key} on={f.turnos.includes(t.key)} label={t.label} onPress={() => tog('turnos', t.key)} />)}</View>
          <Text style={st.sec}>Dias</Text>
          <View style={st.wrap}>{DIAS.map((d) => <Chip key={d.key} on={f.dias.includes(d.key)} label={d.label} onPress={() => tog('dias', d.key)} />)}</View>
          <Text style={st.sec}>Precisa ter</Text>
          <View style={st.wrap}>{ITENS.map((it) => <Chip key={it} on={f.itens.includes(it)} label={it} onPress={() => tog('itens', it)} />)}</View>
          <Text style={st.sec}>Descrição</Text>
          <TextInput value={f.descricao} onChangeText={(v) => set('descricao', v)} placeholder="O que a pessoa vai fazer, benefícios, horário" placeholderTextColor={colors.muted} multiline style={[st.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MinhasVagas({ recarregar }) {
  const [vagas, setVagas] = useState(null);
  const [nova, setNova] = useState(false);
  const load = useCallback(() => api('GET', '/vagas/minhas').then(setVagas).catch(() => setVagas([])), []);
  useEffect(() => {
    load();
  }, [load, recarregar]);
  const convidar = (v, i) => api('POST', `/vagas/${v.id}/convidar`, { ref: i.ref }).then(() => (Alert.alert('Convite enviado', 'Quando a pessoa aceitar, você vê o nome e o currículo dela.'), load())).catch((e) => Alert.alert('Convite', e.message));
  const andamento = (k, status) => api('POST', `/candidaturas/${k.id}/status`, { status }).then(load).catch((e) => Alert.alert('Candidato', e.message));
  return (
    <View>
      <TouchableOpacity style={[st.card, { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary }]} onPress={() => setNova(true)}>
        <Ionicons name="add-circle" size={22} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.title}>Anunciar vaga</Text>
          <Text style={st.muted}>O Realyz indica na hora quem combina, e você convida.</Text>
        </View>
      </TouchableOpacity>
      {vagas == null ? <ActivityIndicator color={colors.primary} /> : null}
      {(vagas || []).map((v) => (
        <View key={v.id} style={st.card}>
          <Text style={st.title}>{v.titulo}{v.status === 'fechada' ? ' · fechada' : ''}</Text>
          <Text style={st.muted}>{funcaoEmprego(v.funcao)} · {(TIPOS.find((t) => t.key === v.tipo) || {}).label}{v.salario ? ` · ${brl(v.salario)} ${UNID[v.salarioUnidade] || ''}` : ''}</Text>
          <Text style={st.sec}>Candidatos ({v.candidatos.length})</Text>
          {v.candidatos.map((k) => (
            <View key={k.id} style={{ marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{k.nome} · {k.pct}%</Text>
                <Text style={st.muted}>{STATUS_CAND[k.status] || k.status}</Text>
              </View>
              {k.porques && k.porques.length ? <Text style={st.muted}>{k.porques.join(' · ')}</Text> : null}
              {k.userId ? (
                <View style={st.wrap}>
                  {k.temArquivo ? <Chip label="Ver currículo" icon="document-text-outline" onPress={() => abrirArquivoProtegido(`/curriculo/${k.userId}/arquivo`)} /> : null}
                  {['entrevista', 'contratado', 'recusado'].map((s) => <Chip key={s} on={k.status === s} label={{ entrevista: 'Entrevista', contratado: 'Contratar', recusado: 'Não seguir' }[s]} onPress={() => andamento(k, s)} />)}
                </View>
              ) : null}
              {k.userId && k.curriculo && (k.curriculo.fotos || []).length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {k.curriculo.fotos.map((u) => <Photo key={u} uri={full(u)} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 6 }} />)}
                </ScrollView>
              ) : null}
            </View>
          ))}
          {!v.candidatos.length ? <Text style={st.muted}>Ainda ninguém.</Text> : null}
          <Text style={st.sec}>Indicados pelo Realyz ({v.indicados.length})</Text>
          {v.indicados.map((i) => (
            <View key={i.ref} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{i.resumo} · {i.pct}%</Text>
                <Text style={st.muted}>{[...(i.porques || []), i.escolaridade].filter(Boolean).join(' · ')}</Text>
              </View>
              <Chip on label="Convidar" onPress={() => convidar(v, i)} />
            </View>
          ))}
          {!v.indicados.length ? <Text style={st.muted}>Ninguém que combine ainda. Quando alguém ativar o currículo com essa função, aparece aqui.</Text> : null}
        </View>
      ))}
      {nova ? <VagaForm onClose={() => setNova(false)} onCriada={load} /> : null}
    </View>
  );
}

export default function EmpregosReal({ inicio = 'vagas' }) {
  const { state } = useStore();
  const [aba, setAba] = useState(inicio);
  const [vagas, setVagas] = useState(null);
  const [minhas, setMinhas] = useState(null);
  const [temCv, setTemCv] = useState(null);
  const [editando, setEditando] = useState(false);
  const empresa = state.user && ((state.user.roles || []).includes('empresa') || (state.user.roles || []).includes('prestador'));
  const load = useCallback(() => {
    api('GET', '/vagas').then(setVagas).catch(() => setVagas([]));
    api('GET', '/candidaturas').then(setMinhas).catch(() => setMinhas([]));
    api('GET', '/curriculo').then((r) => setTemCv(!!(r.curriculo && (r.curriculo.funcoes || []).length))).catch(() => setTemCv(false));
  }, []);
  useEffect(() => {
    if (conectado(state)) load();
  }, [load]);
  if (!conectado(state)) return null;
  const candidatar = (v) =>
    api('POST', `/vagas/${v.id}/candidatar`)
      .then(() => (Alert.alert('Candidatura enviada', `${v.empresa} recebe seu currículo e as fotos que você escolheu.`), load()))
      .catch((e) => (e.code === 'sem_curriculo' ? setEditando(true) : Alert.alert('Candidatura', e.message)));
  const responder = (k, aceitar) => api('POST', `/candidaturas/${k.candidatura.id}/responder`, { aceitar }).then(load).catch((e) => Alert.alert('Convite', e.message));
  const convites = (minhas || []).filter((k) => k.candidatura.status === 'convidado');
  const abas = [
    { key: 'vagas', label: 'Vagas' },
    { key: 'minhas', label: `Convites e candidaturas${convites.length ? ` · ${convites.length}` : ''}` },
    ...(empresa ? [{ key: 'empresa', label: 'Minhas vagas' }] : []),
  ];
  return (
    <View>
      <TouchableOpacity style={[st.card, { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary }]} onPress={() => setEditando(true)} accessibilityLabel="Meu currículo">
        <Ionicons name="document-text" size={22} color="#fff" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{temCv ? 'Meu currículo · aberto a propostas' : 'Ativar meu currículo'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5 }}>{temCv ? 'Toque para atualizar. O Realyz te indica para as vagas que combinam.' : 'Anexe o arquivo (PDF, Word, foto…) ou responda 3 perguntas. 2 minutos.'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={[st.wrap, { marginBottom: 8 }]}>{abas.map((a) => <Chip key={a.key} on={aba === a.key} label={a.label} onPress={() => setAba(a.key)} />)}</View>

      {aba === 'vagas' ? (
        <>
          {vagas == null ? <ActivityIndicator color={colors.primary} /> : null}
          {vagas && !vagas.length ? <Text style={st.muted}>Ainda não tem vaga aberta de empresas reais perto. As de exemplo continuam abaixo.</Text> : null}
          {(vagas || []).map((v) => (
            <View key={v.id} style={st.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.title}>{v.titulo}</Text>
                  <Text style={st.muted}>{v.empresa} · {(TIPOS.find((t) => t.key === v.tipo) || {}).label}{v.salario ? ` · ${brl(v.salario)} ${UNID[v.salarioUnidade] || ''}` : ''}</Text>
                </View>
                {v.pct != null ? <View style={[st.pct, { backgroundColor: v.pct >= 75 ? colors.success : v.pct >= 50 ? colors.primary : '#9A9384' }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{v.pct}%</Text></View> : null}
              </View>
              {v.porques && v.porques.length ? <Text style={[st.muted, { marginTop: 4 }]}>Combina: {v.porques.join(' · ')}</Text> : null}
              {v.descricao ? <Text style={{ color: colors.text, marginTop: 4 }} numberOfLines={3}>{v.descricao}</Text> : null}
              {v.minha ? (
                <Text style={[st.muted, { marginTop: 8, fontWeight: '700' }]}>{STATUS_CAND[v.minha.status] || v.minha.status}</Text>
              ) : (
                <TouchableOpacity style={[st.btn, { marginTop: 8, alignSelf: 'flex-start' }]} onPress={() => candidatar(v)}><Text style={st.btnTxt}>Candidatar-me</Text></TouchableOpacity>
              )}
            </View>
          ))}
        </>
      ) : null}

      {aba === 'minhas' ? (
        <>
          {(minhas || []).map((k) => (
            <View key={k.candidatura.id} style={st.card}>
              <Text style={st.title}>{k.titulo}</Text>
              <Text style={st.muted}>{k.empresa} · {STATUS_CAND[k.candidatura.status] || k.candidatura.status}</Text>
              {k.candidatura.status === 'convidado' ? (
                <View style={st.wrap}>
                  <Chip on label="Aceitar o convite" onPress={() => responder(k, true)} />
                  <Chip label="Recusar" onPress={() => responder(k, false)} />
                </View>
              ) : null}
            </View>
          ))}
          {minhas && !minhas.length ? <Text style={st.muted}>Nenhum convite ou candidatura ainda.</Text> : null}
        </>
      ) : null}

      {aba === 'empresa' ? <MinhasVagas /> : null}
      {editando ? <CurriculoEditor onClose={() => setEditando(false)} onSalvo={load} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...soft },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 12.5 },
  sec: { color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 14, marginBottom: 4 },
  passo: { color: colors.primary, fontWeight: '900', fontSize: 15, marginTop: 18, marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 12.5, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFE6CC' },
  save: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginTop: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipTxt: { color: colors.text, fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EFE6CC', padding: 10, color: colors.text, marginTop: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  btnLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary },
  btnTxt: { color: '#fff', fontWeight: '800', marginLeft: 6 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#EFE6CC', marginBottom: 8 },
  check: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  addFoto: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pct: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
});
