// Editor de vídeo do Realyz (abre por cima de qualquer tela: abrirEditor() de src/edicao.js).
// A pessoa monta o vídeo aqui, com prévia na hora; o servidor gera o MP4 final e avisa quando fica
// pronto. Depois: publicar na página, no perfil ou no story (ou baixar e guardar).
//   Clipes: escolher da galeria ou das gravações das lives, cortar começo e fim (barrinha), dividir
//           no ponto da prévia (tira um pedaço do meio), mudar a ordem, velocidade 0,5x a 2x.
//   Texto: legendas e títulos, com posição, tamanho, cor e de que segundo a que segundo.
//   Música: da galeria do Realyz (ou a do próprio artista), volume dela e do som original;
//           "Modo clipe" para artista: a música inteira, com o som do vídeo mudo.
//   Ajustes: filtro, brilho, contraste e cor. Formato: vertical, quadrado ou deitado. Capa.
// Limite: 3 minutos (artista: 6). Assinatura: 1º mês grátis, depois R$ 19,90 por mês.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert, PanResponder, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { api } from '../api';
import { Photo } from './ui';
import { MusicPicker, MusicSticker } from './StoryMusic';
import { usePublicarComo, postarNaPagina } from '../serverPaginas';
import {
  useEditorAberto, fecharEditor, planoEditor, assinarEditor, cancelarEditor, gerarVideo, videoGerado, gravacoesDasLives,
  FILTROS, FORMATOS, VELOCIDADES, mmss, full, meusVideos,
} from '../edicao';

let EV = null;
try {
  EV = require('expo-video');
} catch (e) {}

const GOLD = colors.gold;
const CORES = ['#FFFFFF', '#F5C331', '#14120E', '#E0245E', '#2F74D0', '#1E9E63'];
const durDe = (c) => (c.end - c.start) / c.speed;

// ---------- Barrinha de corte: arraste as duas pontas ----------
function TrimBar({ dur, start, end, onChange, agora }) {
  const [w, setW] = useState(1);
  const ref = useRef({ start, end, dur, w });
  ref.current = { start, end, dur, w, onChange };
  const mkPan = (lado) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (ref.current.base = lado === 'a' ? ref.current.start : ref.current.end),
      onPanResponderMove: (_, g) => {
        const { dur: d, w: ww, start: s, end: e } = ref.current;
        const v = Math.min(d, Math.max(0, ref.current.base + (g.dx / ww) * d));
        if (lado === 'a') ref.current.onChange(Math.min(v, e - 0.5), e);
        else ref.current.onChange(s, Math.max(v, s + 0.5));
      },
    });
  const panA = useMemo(() => mkPan('a'), []);
  const panB = useMemo(() => mkPan('b'), []);
  const x = (t) => (dur ? (t / dur) * w : 0);
  return (
    <View>
      <View style={st.trimTrack} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={[st.trimSel, { left: x(start), width: Math.max(4, x(end) - x(start)) }]} />
        {agora != null ? <View style={[st.trimNow, { left: x(agora) }]} /> : null}
        <View {...panA.panHandlers} style={[st.handle, { left: x(start) - 14 }]} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
          <View style={st.handleBar} />
        </View>
        <View {...panB.panHandlers} style={[st.handle, { left: x(end) - 14 }]} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
          <View style={st.handleBar} />
        </View>
      </View>
      <View style={st.rowB}>
        <Text style={st.small}>Começa em {mmss(start)}</Text>
        <Text style={st.small}>Termina em {mmss(end)}</Text>
      </View>
    </View>
  );
}

// ---------- Prévia: toca só o trecho cortado, na velocidade escolhida ----------
function Previa({ clip, aspecto, textos, inicioGlobal, onTempo }) {
  const cb = useRef({});
  cb.current = { clip, onTempo };
  const player = EV.useVideoPlayer({ uri: full(clip.uri) }, (p) => {
    p.loop = true;
    p.muted = false;
    try {
      p.timeUpdateEventInterval = 0.2;
    } catch (e) {}
    p.play();
  });
  const [t, setT] = useState(clip.start);
  useEffect(() => {
    try {
      player.playbackRate = clip.speed;
    } catch (e) {}
  }, [clip.speed]);
  useEffect(() => {
    const s1 = player.addListener('statusChange', (e) => {
      if (e && e.status === 'readyToPlay') {
        try {
          player.currentTime = cb.current.clip.start;
        } catch (er) {}
      }
    });
    const s2 = player.addListener('timeUpdate', (e) => {
      const c = cb.current.clip;
      const now = e && typeof e.currentTime === 'number' ? e.currentTime : player.currentTime;
      if (now >= c.end || now < c.start - 0.3) {
        try {
          player.currentTime = c.start;
        } catch (er) {}
      }
      setT(now);
      if (cb.current.onTempo) cb.current.onTempo(now);
    });
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [player]);
  // Tempo no vídeo final (para mostrar os textos certos na prévia).
  const g = inicioGlobal + Math.max(0, t - clip.start) / clip.speed;
  const ativos = textos.filter((x) => g >= x.start && g <= x.end);
  return (
    <View style={[st.previa, { aspectRatio: aspecto }]}>
      <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {ativos.map((x, i) => (
        <View key={i} pointerEvents="none" style={[st.txtOver, x.pos === 'topo' ? { top: '10%' } : x.pos === 'meio' ? { top: '42%' } : { bottom: '14%' }]}>
          <Text style={[st.txtOverT, { color: x.cor, fontSize: { p: 14, m: 19, g: 26 }[x.tamanho] }]}>{x.text}</Text>
        </View>
      ))}
    </View>
  );
}

const Chip = ({ on, label, onPress, icon }) => (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]} accessibilityLabel={label}>
    {icon ? <Ionicons name={icon} size={14} color={on ? '#14120E' : '#fff'} style={{ marginRight: 4 }} /> : null}
    <Text numberOfLines={1} style={[st.chipT, on && { color: '#14120E' }]}>{label}</Text>
  </TouchableOpacity>
);
const Passo = ({ label, valor, menos, mais, fmt = (v) => v }) => (
  <View style={st.passo}>
    <Text style={st.small}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <TouchableOpacity onPress={menos} style={st.passoB} accessibilityLabel={`Diminuir ${label}`}>
        <Ionicons name="remove" size={16} color="#fff" />
      </TouchableOpacity>
      <Text style={st.passoV}>{fmt(valor)}</Text>
      <TouchableOpacity onPress={mais} style={st.passoB} accessibilityLabel={`Aumentar ${label}`}>
        <Ionicons name="add" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

// ---------- Assinatura ----------
function PlanoSheet({ plano, visible, onClose, onMudou }) {
  const [env, setEnv] = useState(false);
  if (!plano) return null;
  const assinar = () => {
    setEnv(true);
    assinarEditor()
      .then((p) => {
        onMudou(p);
        Alert.alert('Editor de vídeo', 'Assinatura feita. Bons vídeos!');
        onClose();
      })
      .catch((e) => Alert.alert('Assinatura', e.message))
      .finally(() => setEnv(false));
  };
  const cancelar = () =>
    Alert.alert('Cancelar a renovação?', 'Você continua usando o editor até o fim do mês já pago.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar renovação', style: 'destructive', onPress: () => cancelarEditor().then(onMudou).catch((e) => Alert.alert('Assinatura', e.message)) },
    ]);
  const fim = plano.status === 'assinado' ? plano.pagoAte : plano.gratisAte;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={st.sheetBack} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={st.sheet}>
          <Text style={st.sheetT}>Editor de vídeo do Realyz</Text>
          <Text style={st.sheetS}>
            {plano.status === 'novo'
              ? 'O primeiro mês é grátis e começa no seu primeiro vídeo. Sem compromisso: depois dele, assina só se quiser.'
              : plano.status === 'gratis'
              ? `Mês grátis: faltam ${plano.diasRestantes} dias (até ${new Date(fim).toLocaleDateString('pt-BR')}). Depois, assina só se quiser.`
              : plano.status === 'assinado'
              ? `Assinatura ativa até ${new Date(fim).toLocaleDateString('pt-BR')}${plano.renova ? ', renova sozinha' : ', sem renovar'}.`
              : 'Seu mês grátis acabou. Assine para continuar gerando vídeos.'}
          </Text>
          <View style={st.preco}>
            <Text style={st.precoV}>R$ 19,90</Text>
            <Text style={st.sheetS}> por mês, do saldo Realyz · cancele quando quiser</Text>
          </View>
          <Text style={st.sheetS}>Cortes, junção de clipes, velocidade, textos, música, filtros, formatos, capa e cortes das suas lives. Vídeos de até 3 minutos (artistas: clipes de até 6).</Text>
          {plano.status === 'assinado' && plano.renova ? (
            <TouchableOpacity onPress={cancelar} style={[st.bigLine, { marginTop: 14 }]} accessibilityLabel="Cancelar a renovação">
              <Text style={st.bigLineT}>Cancelar a renovação</Text>
            </TouchableOpacity>
          ) : plano.status !== 'novo' ? (
            <TouchableOpacity onPress={assinar} disabled={env} style={[st.big, { marginTop: 14 }]} accessibilityLabel="Assinar o editor de vídeo">
              {env ? <ActivityIndicator color="#14120E" /> : <Text style={st.bigT}>{plano.status === 'assinado' ? 'Renovar por mais um mês' : 'Assinar por R$ 19,90/mês'}</Text>}
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------- Vídeo pronto: acompanhar e publicar ----------
function Resultado({ job, setJob, editorProps, onNovo, onTeaser }) {
  const [legenda, setLegenda] = useState(editorProps.titulo || '');
  const [env, setEnv] = useState(null);
  const { paginas } = usePublicarComo(true);
  useEffect(() => {
    if (!job || job.status === 'pronto' || job.status === 'erro') return undefined;
    const t = setInterval(() => videoGerado(job.id).then(setJob).catch(() => {}), 2500);
    return () => clearInterval(t);
  }, [job && job.id, job && job.status]);
  const publicar = async (onde, paginaId) => {
    setEnv(onde + (paginaId || ''));
    try {
      if (onde === 'pagina') await postarNaPagina(paginaId, { text: legenda, uri: job.video, video: true });
      else await api('POST', '/posts', { kind: onde === 'story' ? 'story' : 'post', text: legenda.slice(0, 2200), media: job.video });
      Alert.alert('Publicado', onde === 'story' ? 'Seu story está no ar.' : 'Seu vídeo está publicado.');
      fecharEditor();
    } catch (e) {
      Alert.alert('Não foi publicado', e.message);
    } finally {
      setEnv(null);
    }
  };
  if (job.status === 'erro') {
    return (
      <View style={st.center}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
        <Text style={st.resT}>{job.erro || 'Não deu para gerar o vídeo.'}</Text>
        <TouchableOpacity onPress={onNovo} style={[st.big, { marginTop: 18, alignSelf: 'stretch' }]} accessibilityLabel="Voltar ao editor">
          <Text style={st.bigT}>Voltar ao editor</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (job.status !== 'pronto') {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={st.resT}>{job.status === 'fila' ? `Na fila${job.naFrente ? ` · ${job.naFrente} na sua frente` : ''}…` : `Gerando o vídeo · ${job.pct || 0}%`}</Text>
        <View style={st.track}>
          <View style={[st.fill, { width: `${job.pct || 0}%` }]} />
        </View>
        <Text style={st.resS}>Pode fechar: avisamos quando ficar pronto, e o vídeo fica em "Meus vídeos" no editor.</Text>
        <TouchableOpacity onPress={fecharEditor} style={{ marginTop: 16 }} accessibilityLabel="Fechar e avisar depois">
          <Text style={{ color: GOLD, fontWeight: '800' }}>Fechar e avisar depois</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={st.resT}>Vídeo pronto · {mmss(job.duracao || 0)}</Text>
      <View style={{ height: 360, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', marginTop: 12 }}>
        <VideoPronto uri={full(job.video)} />
      </View>
      <TextInput value={legenda} onChangeText={setLegenda} placeholder="Legenda do post" placeholderTextColor="#8c8577" multiline maxLength={2200} style={[st.input, { marginTop: 12, minHeight: 60 }]} />
      <Text style={[st.small, { marginTop: 14 }]}>Publicar em</Text>
      {editorProps.paginaId || paginas.length ? (
        (editorProps.paginaId ? paginas.filter((p) => p.id === editorProps.paginaId) : paginas).map((p) => (
          <TouchableOpacity key={p.id} style={st.pubRow} onPress={() => publicar('pagina', p.id)} disabled={!!env} accessibilityLabel={`Publicar na página ${p.name}`}>
            <Photo uri={full(p.photo || p.cover)} style={{ width: 34, height: 34, borderRadius: 17 }} fallback="📄" />
            <Text style={st.pubT} numberOfLines={1}>Página {p.name}</Text>
            {env === 'pagina' + p.id ? <ActivityIndicator color={GOLD} /> : <Ionicons name="chevron-forward" size={18} color="#8c8577" />}
          </TouchableOpacity>
        ))
      ) : null}
      <TouchableOpacity style={st.pubRow} onPress={() => publicar('post')} disabled={!!env} accessibilityLabel="Publicar no meu perfil">
        <Ionicons name="person-circle-outline" size={32} color="#fff" />
        <Text style={st.pubT}>Meu perfil (Community)</Text>
        {env === 'post' ? <ActivityIndicator color={GOLD} /> : <Ionicons name="chevron-forward" size={18} color="#8c8577" />}
      </TouchableOpacity>
      <TouchableOpacity style={st.pubRow} onPress={() => publicar('story')} disabled={!!env} accessibilityLabel="Publicar no story">
        <Ionicons name="aperture-outline" size={32} color="#fff" />
        <Text style={st.pubT}>Story (24 horas)</Text>
        {env === 'story' ? <ActivityIndicator color={GOLD} /> : <Ionicons name="chevron-forward" size={18} color="#8c8577" />}
      </TouchableOpacity>
      {job.duracao > 35 ? (
        <TouchableOpacity style={[st.bigLine, { marginTop: 16 }]} onPress={onTeaser} accessibilityLabel="Fazer um teaser de 30 segundos">
          <Text style={st.bigLineT}>Fazer teaser de 30 s (story e Reels)</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={onNovo} accessibilityLabel="Voltar ao editor">
        <Text style={{ color: GOLD, fontWeight: '800' }}>Voltar ao editor</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
function VideoPronto({ uri }) {
  const player = EV.useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.play();
  });
  return <EV.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />;
}

// ---------- Editor ----------
const vazio = () => ({ clipes: [], textos: [], musica: null, volMusica: 0.8, volOriginal: 1, filtro: 'nenhum', brilho: 0, contraste: 1, saturacao: 1, formato: 'vertical', capaEm: 1, titulo: '' });

export default function VideoEditor() {
  const aberto = useEditorAberto();
  const insets = useSafeAreaInsets();
  const [r, setR] = useState(vazio);
  const [sel, setSel] = useState(0);
  const [aba, setAba] = useState('clipes');
  const [plano, setPlano] = useState(null);
  const [verPlano, setVerPlano] = useState(false);
  const [musicas, setMusicas] = useState(false);
  const [modoClipe, setModoClipe] = useState(false);
  const [lives, setLives] = useState(null);
  const [etapa, setEtapa] = useState(null);
  const [job, setJob] = useState(null);
  const [texto, setTexto] = useState(null); // texto em edição
  const [recentes, setRecentes] = useState([]); // Meus vídeos (gerados nos últimos dias)
  const tempoPrevia = useRef(0);

  useEffect(() => {
    if (!aberto) return;
    setR({ ...vazio(), titulo: aberto.titulo || '', clipes: aberto.clipes || [] });
    setSel(0);
    setAba('clipes');
    setJob(null);
    setEtapa(null);
    setModoClipe(false);
    planoEditor().then(setPlano).catch(() => setPlano(null));
    meusVideos().then(setRecentes).catch(() => setRecentes([]));
  }, [aberto && aberto.at]);
  if (!aberto) return null;
  if (!EV) {
    return (
      <Modal visible animationType="slide" onRequestClose={fecharEditor}>
        <View style={[st.wrap, st.center]}>
          <Text style={st.resT}>Atualize o Realyz para usar o editor de vídeo.</Text>
          <TouchableOpacity onPress={fecharEditor} style={{ marginTop: 16 }}><Text style={{ color: GOLD, fontWeight: '800' }}>Fechar</Text></TouchableOpacity>
        </View>
      </Modal>
    );
  }
  const limite = plano && plano.artista ? 360 : 180;
  const total = r.clipes.reduce((s, c) => s + durDe(c), 0);
  const inicioDe = (i) => r.clipes.slice(0, i).reduce((s, c) => s + durDe(c), 0);
  const clip = r.clipes[sel] || null;
  const aspecto = FORMATOS.find((f) => f[0] === r.formato)[2];
  const set = (patch) => setR((x) => ({ ...x, ...patch }));
  const setClip = (i, patch) => setR((x) => ({ ...x, clipes: x.clipes.map((c, k) => (k === i ? { ...c, ...patch } : c)) }));

  const daGaleria = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão necessária', 'Autorize o Realyz a ver seus vídeos.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: true, selectionLimit: 10, quality: 1 });
      if (res.canceled || !res.assets) return;
      const novos = res.assets.map((a) => {
        const d = a.duration ? a.duration / 1000 : 10;
        return { id: 'c' + Math.random().toString(36).slice(2), uri: a.uri, dur: d, start: 0, end: d, speed: 1 };
      });
      setR((x) => ({ ...x, clipes: [...x.clipes, ...novos].slice(0, 20) }));
      if (!r.clipes.length) setSel(0);
    } catch (e) {
      Alert.alert('Vídeos', 'Não deu para abrir a galeria.');
    }
  };
  const dasLives = () =>
    gravacoesDasLives()
      .then((l) => setLives(l.filter((g) => g.status === 'pronta')))
      .catch((e) => Alert.alert('Gravações', e.message));
  const addGravacao = (g) => {
    setR((x) => ({ ...x, clipes: [...x.clipes, { id: 'g' + g.id + Date.now(), uri: g.video, dur: g.duracao, start: 0, end: Math.min(g.duracao, 60), speed: 1, live: g.titulo }].slice(0, 20) }));
    setSel(r.clipes.length);
    setLives(null);
  };
  const mover = (d) => {
    const j = sel + d;
    if (j < 0 || j >= r.clipes.length) return;
    setR((x) => {
      const l = [...x.clipes];
      [l[sel], l[j]] = [l[j], l[sel]];
      return { ...x, clipes: l };
    });
    setSel(j);
  };
  // Dividir no ponto da prévia: vira dois clipes (para tirar um pedaço do meio, apague um lado ou corte).
  const dividir = () => {
    if (!clip) return;
    const t = tempoPrevia.current;
    if (t <= clip.start + 0.5 || t >= clip.end - 0.5) return Alert.alert('Dividir', 'Pare a prévia no ponto onde quer dividir (longe do começo e do fim do trecho).');
    setR((x) => {
      const l = [...x.clipes];
      l.splice(sel, 1, { ...clip, end: t }, { ...clip, id: clip.id + 'b', start: t });
      return { ...x, clipes: l };
    });
  };
  const apagar = () => {
    setR((x) => ({ ...x, clipes: x.clipes.filter((_, k) => k !== sel) }));
    setSel(Math.max(0, sel - 1));
  };
  const salvarTexto = () => {
    if (!texto || !texto.text.trim()) return setTexto(null);
    setR((x) => {
      const l = [...x.textos];
      if (texto.idx != null) l[texto.idx] = texto;
      else l.push(texto);
      return { ...x, textos: l.slice(0, 10).map(({ idx, ...t }) => t) };
    });
    setTexto(null);
  };
  const ligarModoClipe = (on) => {
    setModoClipe(on);
    set(on ? { volOriginal: 0, volMusica: 1 } : { volOriginal: 1, volMusica: 0.8 });
  };
  const gerar = async (receita = r) => {
    if (!receita.clipes.length) return Alert.alert('Editor de vídeo', 'Escolha pelo menos um vídeo.');
    const t = receita.clipes.reduce((s, c) => s + durDe(c), 0);
    if (t > limite + 0.5) return Alert.alert('Vídeo longo', `O vídeo pode ter até ${limite / 60} minutos${plano && plano.artista ? '' : ' (artistas: 6 minutos)'}. Corte um pouco.`);
    try {
      setEtapa('Preparando…');
      const j = await gerarVideo({ ...receita, capaEm: Math.min(receita.capaEm, t) }, setEtapa);
      setJob(j);
      if (j.plano) setPlano((p) => ({ ...(p || {}), ...j.plano }));
    } catch (e) {
      if (e.code === 'assinar_editor') {
        planoEditor().then(setPlano).catch(() => {});
        setVerPlano(true);
      } else Alert.alert('Não deu para gerar', e.message);
    } finally {
      setEtapa(null);
    }
  };
  // Teaser: os primeiros 30 s do vídeo, sempre vertical (story e Reels).
  const teaser = () => {
    let falta = 30;
    const clipes = [];
    for (const c of r.clipes) {
      if (falta <= 0) break;
      const d = durDe(c);
      clipes.push(d <= falta ? c : { ...c, end: c.start + falta * c.speed });
      falta -= Math.min(d, falta);
    }
    const tx = r.textos.filter((x) => x.start < 30).map((x) => ({ ...x, end: Math.min(x.end, 30) }));
    gerar({ ...r, clipes, textos: tx, formato: 'vertical', capaEm: 1 });
  };

  const chipPlano = plano
    ? plano.status === 'assinado' ? 'Assinado' : plano.status === 'gratis' ? `Grátis · ${plano.diasRestantes} dias` : plano.status === 'novo' ? '1º mês grátis' : 'Assinar'
    : null;

  return (
    <Modal visible animationType="slide" onRequestClose={fecharEditor} statusBarTranslucent>
      <View style={[st.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={st.head}>
          <TouchableOpacity onPress={() => (job || !r.clipes.length ? fecharEditor() : Alert.alert('Sair do editor?', 'O que você montou será perdido.', [{ text: 'Continuar editando', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: fecharEditor }]))} style={st.iconB} accessibilityLabel="Fechar o editor">
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headT}>Editor de vídeo</Text>
          {chipPlano ? (
            <TouchableOpacity onPress={() => setVerPlano(true)} style={[st.planoChip, plano && plano.status === 'vencido' && { backgroundColor: GOLD }]} accessibilityLabel={`Assinatura: ${chipPlano}`}>
              <Text style={[st.planoChipT, plano && plano.status === 'vencido' && { color: '#14120E' }]} numberOfLines={1}>{chipPlano}</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>

        {job ? (
          <Resultado job={job} setJob={setJob} editorProps={{ ...aberto, titulo: r.titulo }} onNovo={() => setJob(null)} onTeaser={teaser} />
        ) : (
          <>
            <View style={{ paddingHorizontal: 14 }}>
              {clip ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: aspecto >= 1 ? '100%' : `${Math.round(aspecto * 100 * 1.25)}%`, maxHeight: 330 }}>
                    <Previa key={clip.id + clip.uri} clip={clip} aspecto={aspecto} textos={r.textos} inicioGlobal={inicioDe(sel)} onTempo={(t) => (tempoPrevia.current = t)} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={daGaleria} style={st.vazio} accessibilityLabel="Escolher vídeos">
                  <Ionicons name="film-outline" size={42} color={GOLD} />
                  <Text style={st.resT}>Escolha seus vídeos</Text>
                  <Text style={st.resS}>Junte vários clipes, corte, ponha texto e música. O Realyz gera o vídeo final para você.</Text>
                </TouchableOpacity>
              )}
              {/* Meus vídeos: os que já foram gerados (publicar depois) e os que estão na fila. */}
              {!clip && recentes.length ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={st.boxT}>Meus vídeos</Text>
                  {recentes.slice(0, 6).map((v) => (
                    <TouchableOpacity key={v.id} style={st.pubRow} onPress={() => setJob(v)} accessibilityLabel={`Abrir o vídeo ${v.titulo || ''}`}>
                      {v.capa ? <Photo uri={full(v.capa)} style={{ width: 40, height: 40, borderRadius: 8 }} /> : <Ionicons name="film-outline" size={26} color={GOLD} />}
                      <Text style={st.pubT} numberOfLines={1}>{v.titulo || 'Vídeo'} · {v.status === 'pronto' ? mmss(v.duracao || 0) : v.status === 'erro' ? 'não gerado' : 'gerando…'}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#8c8577" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {/* Linha do tempo: os clipes em ordem */}
              {r.clipes.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ alignItems: 'center' }}>
                  {r.clipes.map((c, i) => (
                    <TouchableOpacity key={c.id} onPress={() => setSel(i)} style={[st.clipBox, { width: Math.max(54, Math.min(130, durDe(c) * 6)) }, i === sel && st.clipOn]} accessibilityLabel={`Clipe ${i + 1}, ${mmss(durDe(c))}`}>
                      <Ionicons name={c.live ? 'radio-outline' : 'videocam-outline'} size={14} color={i === sel ? '#14120E' : '#fff'} />
                      <Text style={[st.clipT, i === sel && { color: '#14120E' }]} numberOfLines={1}>{i + 1} · {mmss(durDe(c))}{c.speed !== 1 ? ` · ${String(c.speed).replace('.', ',')}x` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={daGaleria} style={st.addClip} accessibilityLabel="Adicionar vídeo">
                    <Ionicons name="add" size={22} color="#fff" />
                  </TouchableOpacity>
                </ScrollView>
              ) : null}
              <Text style={[st.small, { marginTop: 6, color: total > limite ? colors.danger : '#b5ae9f' }]}>Total {mmss(total)} de {limite / 60} min</Text>
            </View>

            <View style={st.tabs}>
              {[['clipes', 'Clipes', 'cut-outline'], ['texto', 'Texto', 'text-outline'], ['musica', 'Música', 'musical-notes-outline'], ['ajustes', 'Ajustes', 'color-filter-outline'], ['formato', 'Formato', 'crop-outline']].map(([k, l, ic]) => (
                <TouchableOpacity key={k} onPress={() => setAba(k)} style={st.tab} accessibilityLabel={l}>
                  <Ionicons name={ic} size={19} color={aba === k ? GOLD : '#b5ae9f'} />
                  <Text style={[st.tabT, aba === k && { color: GOLD }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {aba === 'clipes' ? (
                <>
                  <View style={st.wrapRow}>
                    <Chip label="Da galeria" icon="images-outline" onPress={daGaleria} />
                    <Chip label="Das minhas lives" icon="radio-outline" onPress={dasLives} />
                  </View>
                  {lives ? (
                    <View style={st.box}>
                      <Text style={st.boxT}>Gravações das suas lives (ficam 7 dias)</Text>
                      {lives.length ? lives.map((g) => (
                        <TouchableOpacity key={g.id} style={st.pubRow} onPress={() => addGravacao(g)} accessibilityLabel={`Usar a gravação ${g.titulo}`}>
                          <Ionicons name="radio-outline" size={22} color={GOLD} />
                          <Text style={st.pubT} numberOfLines={1}>{g.titulo} · {mmss(g.duracao || 0)}</Text>
                          <Ionicons name="add-circle-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                      )) : <Text style={st.small}>Nenhuma gravação. Ao iniciar uma live, deixe marcado "Gravar para fazer cortes".</Text>}
                    </View>
                  ) : null}
                  {clip ? (
                    <View style={st.box}>
                      <Text style={st.boxT}>Clipe {sel + 1}{clip.live ? ` · live ${clip.live}` : ''}</Text>
                      <TrimBar dur={clip.dur} start={clip.start} end={clip.end} onChange={(s, e) => setClip(sel, { start: Math.round(s * 10) / 10, end: Math.round(e * 10) / 10 })} />
                      <Text style={[st.small, { marginTop: 12 }]}>Velocidade</Text>
                      <View style={st.wrapRow}>
                        {VELOCIDADES.map((v) => <Chip key={v} on={clip.speed === v} label={v === 0.5 ? 'Lenta 0,5x' : v === 1 ? 'Normal' : `${String(v).replace('.', ',')}x`} onPress={() => setClip(sel, { speed: v })} />)}
                      </View>
                      <View style={[st.wrapRow, { marginTop: 8 }]}>
                        <Chip label="Dividir aqui" icon="git-branch-outline" onPress={dividir} />
                        <Chip label="Para trás" icon="arrow-back" onPress={() => mover(-1)} />
                        <Chip label="Para frente" icon="arrow-forward" onPress={() => mover(1)} />
                        <Chip label="Apagar" icon="trash-outline" onPress={apagar} />
                      </View>
                      <Text style={[st.small, { marginTop: 6 }]}>Para tirar um pedaço do meio: pare a prévia no ponto, toque em "Dividir aqui" e corte o começo do segundo pedaço.</Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              {aba === 'texto' ? (
                texto ? (
                  <View style={st.box}>
                    <TextInput value={texto.text} onChangeText={(v) => setTexto({ ...texto, text: v })} placeholder="Digite o texto" placeholderTextColor="#8c8577" maxLength={120} multiline style={st.input} autoFocus />
                    <Text style={[st.small, { marginTop: 10 }]}>Posição</Text>
                    <View style={st.wrapRow}>{[['topo', 'Em cima'], ['meio', 'No meio'], ['baixo', 'Embaixo']].map(([k, l]) => <Chip key={k} on={texto.pos === k} label={l} onPress={() => setTexto({ ...texto, pos: k })} />)}</View>
                    <Text style={st.small}>Tamanho</Text>
                    <View style={st.wrapRow}>{[['p', 'Pequeno'], ['m', 'Médio'], ['g', 'Grande']].map(([k, l]) => <Chip key={k} on={texto.tamanho === k} label={l} onPress={() => setTexto({ ...texto, tamanho: k })} />)}</View>
                    <Text style={st.small}>Cor</Text>
                    <View style={st.wrapRow}>
                      {CORES.map((c) => <TouchableOpacity key={c} onPress={() => setTexto({ ...texto, cor: c })} style={[st.cor, { backgroundColor: c, borderWidth: texto.cor === c ? 3 : 1, borderColor: texto.cor === c ? GOLD : '#555' }]} accessibilityLabel={`Cor ${c}`} />)}
                    </View>
                    <View style={st.wrapRow}>
                      <Passo label="Aparece em" valor={texto.start} fmt={mmss} menos={() => setTexto({ ...texto, start: Math.max(0, texto.start - 0.5) })} mais={() => setTexto({ ...texto, start: Math.min(texto.end - 0.5, texto.start + 0.5) })} />
                      <Passo label="Some em" valor={texto.end} fmt={mmss} menos={() => setTexto({ ...texto, end: Math.max(texto.start + 0.5, texto.end - 0.5) })} mais={() => setTexto({ ...texto, end: Math.min(Math.max(total, 1), texto.end + 0.5) })} />
                    </View>
                    <View style={[st.rowB, { marginTop: 12 }]}>
                      {texto.idx != null ? (
                        <TouchableOpacity onPress={() => { setR((x) => ({ ...x, textos: x.textos.filter((_, k) => k !== texto.idx) })); setTexto(null); }} accessibilityLabel="Apagar o texto"><Text style={{ color: colors.danger, fontWeight: '800' }}>Apagar</Text></TouchableOpacity>
                      ) : <View />}
                      <TouchableOpacity onPress={salvarTexto} style={[st.big, { paddingHorizontal: 24 }]} accessibilityLabel="Salvar o texto"><Text style={st.bigT}>Pronto</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    {r.textos.map((t, i) => (
                      <TouchableOpacity key={i} style={st.pubRow} onPress={() => setTexto({ ...t, idx: i })} accessibilityLabel={`Editar texto ${t.text}`}>
                        <Ionicons name="text" size={18} color={t.cor} />
                        <Text style={st.pubT} numberOfLines={1}>{t.text}</Text>
                        <Text style={st.small}>{mmss(t.start)}–{mmss(t.end)}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setTexto({ text: '', pos: 'baixo', tamanho: 'm', cor: '#FFFFFF', start: 0, end: Math.min(Math.max(total, 1), 4) })} style={[st.bigLine, { marginTop: 8 }]} accessibilityLabel="Adicionar texto">
                      <Text style={st.bigLineT}>+ Adicionar texto ou legenda</Text>
                    </TouchableOpacity>
                  </>
                )
              ) : null}

              {aba === 'musica' ? (
                <>
                  {r.musica ? <MusicSticker music={r.musica} onPress={() => setMusicas(true)} style={{ alignSelf: 'flex-start' }} /> : null}
                  <View style={[st.wrapRow, { marginTop: 8 }]}>
                    <Chip label={r.musica ? 'Trocar a música' : 'Escolher música'} icon="musical-notes-outline" onPress={() => setMusicas(true)} />
                    {r.musica ? <Chip label="Tirar a música" icon="close" onPress={() => set({ musica: null })} /> : null}
                  </View>
                  <Text style={[st.small, { marginTop: 10 }]}>Volume da música</Text>
                  <View style={st.wrapRow}>{[0.3, 0.6, 0.8, 1].map((v) => <Chip key={v} on={r.volMusica === v} label={`${Math.round(v * 100)}%`} onPress={() => set({ volMusica: v })} />)}</View>
                  <Text style={st.small}>Som original dos vídeos</Text>
                  <View style={st.wrapRow}>{[0, 0.3, 0.6, 1].map((v) => <Chip key={v} on={r.volOriginal === v} label={v ? `${Math.round(v * 100)}%` : 'Mudo'} onPress={() => set({ volOriginal: v })} />)}</View>
                  <TouchableOpacity onPress={() => ligarModoClipe(!modoClipe)} style={[st.box, { flexDirection: 'row', alignItems: 'center' }]} accessibilityLabel="Modo clipe de música">
                    <Ionicons name={modoClipe ? 'checkbox' : 'square-outline'} size={22} color={GOLD} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={st.boxT}>Modo clipe (artistas)</Text>
                      <Text style={st.small}>A música do começo ao fim, com o som dos vídeos mudo. Monte as cenas por cima, no ritmo.{plano && plano.artista ? ' Clipe de até 6 minutos.' : ''}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}

              {aba === 'ajustes' ? (
                <>
                  <Text style={st.small}>Filtro</Text>
                  <View style={st.wrapRow}>{FILTROS.map(([k, l]) => <Chip key={k} on={r.filtro === k} label={l} onPress={() => set({ filtro: k })} />)}</View>
                  <View style={st.wrapRow}>
                    <Passo label="Brilho" valor={r.brilho} fmt={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`} menos={() => set({ brilho: Math.max(-0.3, Math.round((r.brilho - 0.05) * 100) / 100) })} mais={() => set({ brilho: Math.min(0.3, Math.round((r.brilho + 0.05) * 100) / 100) })} />
                    <Passo label="Contraste" valor={r.contraste} fmt={(v) => `${Math.round(v * 100)}%`} menos={() => set({ contraste: Math.max(0.6, Math.round((r.contraste - 0.05) * 100) / 100) })} mais={() => set({ contraste: Math.min(1.5, Math.round((r.contraste + 0.05) * 100) / 100) })} />
                    <Passo label="Cor" valor={r.saturacao} fmt={(v) => `${Math.round(v * 100)}%`} menos={() => set({ saturacao: Math.max(0, Math.round((r.saturacao - 0.1) * 10) / 10) })} mais={() => set({ saturacao: Math.min(2, Math.round((r.saturacao + 0.1) * 10) / 10) })} />
                  </View>
                  <Text style={[st.small, { marginTop: 6 }]}>Filtro e ajustes aparecem no vídeo final gerado.</Text>
                </>
              ) : null}

              {aba === 'formato' ? (
                <>
                  <View style={st.wrapRow}>{FORMATOS.map(([k, l]) => <Chip key={k} on={r.formato === k} label={l} onPress={() => set({ formato: k })} />)}</View>
                  <Text style={st.small}>Vertical para Reels e story; deitado para clipe completo e vídeo de YouTube.</Text>
                  <View style={st.wrapRow}>
                    <Passo label="Capa do vídeo no segundo" valor={Math.min(r.capaEm, total)} fmt={mmss} menos={() => set({ capaEm: Math.max(0, r.capaEm - 0.5) })} mais={() => set({ capaEm: Math.min(total, r.capaEm + 0.5) })} />
                  </View>
                  <Text style={st.small}>Título (opcional)</Text>
                  <TextInput value={r.titulo} onChangeText={(v) => set({ titulo: v })} placeholder="Ex.: Clipe oficial de Nome da Música" placeholderTextColor="#8c8577" maxLength={80} style={st.input} />
                </>
              ) : null}
            </ScrollView>

            <View style={st.foot}>
              <TouchableOpacity onPress={() => gerar()} disabled={!!etapa || !r.clipes.length} style={[st.big, (!r.clipes.length || etapa) && { opacity: 0.5 }]} accessibilityLabel="Gerar o vídeo">
                {etapa ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#14120E" />
                    <Text style={[st.bigT, { marginLeft: 8 }]} numberOfLines={1}>{etapa}</Text>
                  </View>
                ) : (
                  <Text style={st.bigT}>Gerar vídeo</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
        <MusicPicker visible={musicas} current={r.musica} videoSecs={modoClipe ? 0 : Math.round(total)} onPick={(m) => { set({ musica: m }); setMusicas(false); }} onRemove={() => { set({ musica: null }); setMusicas(false); }} onClose={() => setMusicas(false)} />
        <PlanoSheet plano={plano} visible={verPlano} onClose={() => setVerPlano(false)} onMudou={setPlano} />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#14120E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  headT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  iconB: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planoChip: { borderWidth: 1, borderColor: GOLD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 150 },
  planoChipT: { color: GOLD, fontWeight: '800', fontSize: 12 },
  previa: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', maxHeight: 330 },
  txtOver: { position: 'absolute', left: 10, right: 10, alignItems: 'center' },
  txtOverT: { fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  vazio: { height: 220, borderRadius: 16, borderWidth: 1, borderColor: '#3a362e', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 20 },
  clipBox: { height: 44, borderRadius: 10, backgroundColor: '#2a2620', marginRight: 6, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  clipOn: { backgroundColor: GOLD },
  clipT: { color: '#fff', fontSize: 11.5, fontWeight: '700', marginLeft: 4 },
  addClip: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2a2620', marginTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabT: { color: '#b5ae9f', fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, marginBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#3a362e', paddingHorizontal: 12, paddingVertical: 7, marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: GOLD, borderColor: GOLD },
  chipT: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  box: { backgroundColor: '#1f1c17', borderRadius: 14, padding: 12, marginTop: 8 },
  boxT: { color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  small: { color: '#b5ae9f', fontSize: 12 },
  rowB: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  trimTrack: { height: 34, borderRadius: 8, backgroundColor: '#2a2620', justifyContent: 'center' },
  trimSel: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(245,195,49,0.28)', borderTopWidth: 2, borderBottomWidth: 2, borderColor: GOLD },
  trimNow: { position: 'absolute', top: -3, bottom: -3, width: 2, backgroundColor: '#fff' },
  handle: { position: 'absolute', width: 28, height: 44, top: -5, alignItems: 'center', justifyContent: 'center' },
  handleBar: { width: 12, height: 40, borderRadius: 4, backgroundColor: GOLD },
  passo: { marginRight: 14, marginTop: 8 },
  passoB: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a2620', alignItems: 'center', justifyContent: 'center' },
  passoV: { color: '#fff', fontWeight: '800', minWidth: 54, textAlign: 'center' },
  cor: { width: 30, height: 30, borderRadius: 15, marginRight: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#3a362e', borderRadius: 12, color: '#fff', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#1f1c17' },
  foot: { padding: 12, borderTopWidth: 1, borderTopColor: '#2a2620' },
  big: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  bigT: { color: '#14120E', fontWeight: '900', fontSize: 15 },
  bigLine: { borderWidth: 1, borderColor: GOLD, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  bigLineT: { color: GOLD, fontWeight: '800' },
  resT: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 12 },
  resS: { color: '#b5ae9f', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  track: { width: 240, height: 8, borderRadius: 4, backgroundColor: '#2a2620', overflow: 'hidden', marginTop: 16 },
  fill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  pubRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f1c17', borderRadius: 12, padding: 10, marginTop: 8 },
  pubT: { color: '#fff', fontWeight: '700', flex: 1, marginLeft: 10 },
  sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1f1c17', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  sheetT: { color: '#fff', fontWeight: '900', fontSize: 17 },
  sheetS: { color: '#b5ae9f', fontSize: 13, lineHeight: 19, marginTop: 6 },
  preco: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  precoV: { color: GOLD, fontWeight: '900', fontSize: 26 },
});
