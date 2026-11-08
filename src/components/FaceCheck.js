// Biometria facial para valores acima de R$ 1.000 (contratos, compras e contratações).
// Com o servidor ligado, o scan é conferido com o rosto do cadastro; na demonstração, o scan basta.
import React, { useState } from 'react';
import { Alert } from 'react-native';
import ScanFacial from './ScanFacial';
import { serverOn } from '../api';
import { enviarScanVerificacao } from '../verificacaoFacial';

export const FACE_ABOVE = 1000; // R$: acima disso, pede biometria facial além da voz

export default function FaceCheck({ visible, purpose, refId, title = 'Biometria facial', onDone, onClose }) {
  const [busy, setBusy] = useState(false);
  const frames = async (scan) => {
    if (busy) return;
    setBusy(true);
    try {
      if (serverOn()) await enviarScanVerificacao(scan, purpose, refId);
      onDone(true);
    } catch (e) {
      Alert.alert('Biometria não confirmada', (e && e.message) || 'Não reconhecemos o seu rosto. Tente de novo.');
      onDone(false);
    } finally {
      setBusy(false);
    }
  };
  return <ScanFacial visible={!!visible} title={title} onFrames={frames} onClose={onClose} />;
}
