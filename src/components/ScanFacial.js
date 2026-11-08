// Scan facial guiado e automático. Ao abrir, a câmera já começa a procurar o rosto:
//   1) a pessoa centraliza o rosto no círculo (bem perto) -> o app tira a 1ª foto sozinho
//      e grava 3 s de vídeo;
//   2) o app pede para afastar um pouco o celular -> quando o rosto fica menor e centralizado,
//      tira a 2ª foto (mais ampla) e grava mais 3 s.
// Resultado: 2 fotos e 2 vídeos (o servidor exige os dois). Quem decide é o servidor.
//
// A detecção do rosto usa o ML Kit do Google, no próprio celular (nada sai do aparelho
// nessa etapa). Se o detector não estiver disponível, cai num modo com contagem regressiva.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { colors } from '../theme';

let FaceDetection = null;
try { FaceDetection = require('@react-native-ml-kit/face-detection').default; } catch (e) { FaceDetection = null; }

const VIDEO_S = 3;
const INTERVALO_MS = 350; // entre uma checagem do rosto e outra
const ACERTOS_SEGUIDOS = 2; // quantas checagens boas seguidas antes de capturar

// Tamanho do rosto (largura do rosto / largura da imagem) esperado em cada etapa.
const ETAPAS = [
  { fase: 'perto', titulo: 'Foto 1 de 2 · de perto', pedido: 'Centralize seu rosto no círculo', min: 0.42, max: 0.72 },
  { fase: 'longe', titulo: 'Foto 2 de 2 · mais ampla', pedido: 'Agora afaste um pouco o celular do rosto', min: 0.22, max: 0.38 },
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const apagar = (uri) => { try { new File(uri).delete(); } catch (e) { /* já apagado */ } };
const falar = (t) => { try { Speech.stop(); Speech.speak(t, { language: 'pt-BR', rate: 1.0, pitch: 1.05 }); } catch (e) { /* sem voz */ } };

// Analisa um rosto e diz o que falta para ficar certo. Retorna { ok, dica }.
function avaliar(face, img, etapa) {
  let w = img.width, h = img.height;
  if (w > h) { const t = w; w = h; h = t; } // app é só retrato
  const f = face.frame;
  const cx = (f.left + f.width / 2) / w;
  const cy = (f.top + f.height / 2) / h;
  const tam = f.width / w;

  if (Math.abs(face.rotationY || 0) > 15 || Math.abs(face.rotationZ || 0) > 12) return { ok: false, dica: 'Olhe de frente para a câmera' };
  if (tam < etapa.min) return { ok: false, dica: etapa.fase === 'perto' ? 'Aproxime um pouco o rosto' : 'Aproxime só um pouquinho' };
  if (tam > etapa.max) return { ok: false, dica: etapa.fase === 'perto' ? 'Afaste só um pouquinho' : 'Afaste mais um pouco o celular' };
  if (Math.abs(cx - 0.5) > 0.12) return { ok: false, dica: 'Centralize o rosto no círculo' };
  if (cy < 0.32) return { ok: false, dica: 'Levante um pouco o celular' };
  if (cy > 0.6) return { ok: false, dica: 'Abaixe um pouco o celular' };
  return { ok: true, dica: 'Perfeito! Segure assim…' };
}

export default function ScanFacial({ visible, title = 'Scan facial', onFrames, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef(null);
  const ativo = useRef(false);
  const pronta = useRef(false); // câmera já abriu
  const [etapa, setEtapa] = useState(0);
  const [dica, setDica] = useState('Abrindo a câmera…');
  const [certo, setCerto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [feitas, setFeitas] = useState(0);
  const [erro, setErro] = useState('');
  const pulso = useRef(new Animated.Value(1)).current;

  // Pulso suave no círculo enquanto procura o rosto.
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 1.03, duration: 700, useNativeDriver: true }),
      Animated.timing(pulso, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [pulso]);

  // Abriu o modal: pede a câmera e começa sozinho. Fechou: para tudo.
  useEffect(() => {
    if (!visible) { ativo.current = false; pronta.current = false; Speech.stop(); return undefined; }
    setErro(''); setEtapa(0); setFeitas(0); setCerto(false); setGravando(false); setDica('Abrindo a câmera…');
    (async () => {
      if (!permission || !permission.granted) {
        const r = await requestPermission();
        if (!r.granted) { setErro('Libere a câmera nas configurações do celular.'); return; }
      }
    })();
    return () => { ativo.current = false; try { cam.current && cam.current.stopRecording(); } catch (e) { /* nada gravando */ } };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const fotoRapida = () => cam.current.takePictureAsync({ quality: 0.3, shutterSound: false });

  // Espera o rosto ficar na posição certa para a etapa. Retorna quando estiver certo.
  const esperarPosicao = async (e) => {
    let seguidos = 0;
    const inicio = Date.now();
    while (ativo.current) {
      if (!FaceDetection) {
        // Sem detector: contagem regressiva com as instruções.
        for (let s = 4; s > 0 && ativo.current; s--) { setDica(`${e.pedido} · ${s}`); await esperar(1000); }
        return;
      }
      let p = null;
      try {
        p = await fotoRapida();
        const faces = await FaceDetection.detect(p.uri, { performanceMode: 'fast', landmarkMode: 'none', contourMode: 'none', classificationMode: 'none', minFaceSize: 0.1 });
        if (!faces || faces.length === 0) {
          seguidos = 0; setCerto(false);
          setDica(Date.now() - inicio > 15000 ? 'Não achei seu rosto. Procure um lugar mais iluminado' : 'Posicione seu rosto no círculo');
        } else if (faces.length > 1) {
          seguidos = 0; setCerto(false); setDica('Só uma pessoa na câmera, por favor');
        } else {
          const face = faces.reduce((a, b) => (b.frame.width > a.frame.width ? b : a));
          const r = avaliar(face, p, e);
          setDica(r.dica); setCerto(r.ok);
          seguidos = r.ok ? seguidos + 1 : 0;
          if (seguidos >= ACERTOS_SEGUIDOS) return;
        }
      } catch (err) {
        seguidos = 0;
      } finally {
        if (p) apagar(p.uri);
      }
      await esperar(INTERVALO_MS);
    }
  };

  const capturarEtapa = async (i) => {
    const e = ETAPAS[i];
    setEtapa(i); setCerto(false); setDica(e.pedido); falar(e.pedido);
    await esperar(i === 0 ? 600 : 1800); // dá tempo de ouvir / afastar
    await esperarPosicao(e);
    if (!ativo.current) return null;

    setDica('Segure assim…'); setCerto(true);
    const foto = await cam.current.takePictureAsync({ base64: true, quality: 0.7, shutterSound: false });
    if (foto.uri) apagar(foto.uri);
    setFeitas(i + 1);

    setGravando(true); setDica('Segure parado… 3 segundinhos');
    const v = await cam.current.recordAsync({ maxDuration: VIDEO_S });
    setGravando(false);
    if (!ativo.current || !v || !v.uri) return null;
    const arq = new File(v.uri);
    const video = await arq.base64();
    apagar(v.uri);
    return { foto: foto.base64, video };
  };

  const rodar = async () => {
    if (ativo.current) return;
    ativo.current = true;
    try {
      const photos = [];
      const videos = [];
      for (let i = 0; i < ETAPAS.length; i++) {
        const r = await capturarEtapa(i);
        if (!r) return;
        photos.push(r.foto); videos.push(r.video);
      }
      ativo.current = false;
      setDica('Pronto! Scan concluído'); falar('Pronto!');
      onFrames({ videos, photos });
    } catch (e) {
      ativo.current = false; setGravando(false); setCerto(false);
      setErro('Não consegui capturar. Toque em "Tentar de novo".');
    }
  };

  const aoAbrirCamera = () => { pronta.current = true; if (visible) rodar(); };
  const tentarDeNovo = () => { setErro(''); setFeitas(0); setEtapa(0); if (pronta.current) rodar(); };
  const fechar = () => { ativo.current = false; Speech.stop(); onClose && onClose(); };

  const e = ETAPAS[etapa];
  const corGuia = certo ? colors.success : 'rgba(255,255,255,0.9)';
  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={fechar}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.etapa}>{e.titulo}</Text>
        <View style={styles.passos}>
          {ETAPAS.map((_, i) => <View key={i} style={[styles.passo, i < feitas && styles.passoOk, i === etapa && i >= feitas && styles.passoAtual]} />)}
        </View>

        <View style={styles.camBox}>
          {permission && permission.granted ? (
            <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" mode="video" mute onCameraReady={aoAbrirCamera} />
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[styles.guide, e.fase === 'longe' && styles.guideLonge, { borderColor: corGuia, transform: [{ scale: certo ? 1 : pulso }] }]}
          />
          {gravando ? <View style={styles.rec}><View style={styles.recDot} /><Text style={styles.recText}>gravando</Text></View> : null}
        </View>

        <Text style={[styles.dica, certo && { color: colors.success }]}>{erro ? '' : dica}</Text>
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        {erro ? (
          <TouchableOpacity style={styles.btn} onPress={tentarDeNovo} activeOpacity={0.85}>
            <Text style={styles.btnText}>Tentar de novo</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={fechar} style={{ marginTop: 14, paddingVertical: 6 }}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 44, paddingHorizontal: 18, paddingBottom: 18 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  etapa: { fontSize: 13, color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  passos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10 },
  passo: { width: 28, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  passoAtual: { backgroundColor: colors.gold },
  passoOk: { backgroundColor: colors.success },
  // flex + aspectRatio: a câmera nunca empurra as instruções para fora da tela.
  camBox: { flexShrink: 1, width: '100%', aspectRatio: 3 / 4, maxHeight: '62%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' },
  guide: { position: 'absolute', left: '16%', right: '16%', top: '12%', bottom: '18%', borderRadius: 999, borderWidth: 4 },
  guideLonge: { left: '28%', right: '28%', top: '22%', bottom: '30%' },
  rec: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5484D', marginRight: 5 },
  recText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dica: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 16, minHeight: 46 },
  erro: { color: '#B42318', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  btnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
