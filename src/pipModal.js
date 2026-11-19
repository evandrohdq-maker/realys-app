// Na janelinha (picture-in-picture) aparece SÓ o player, mesmo com uma página do app aberta
// por cima (ex.: o perfil da rádio, a tela de um produto). Essas páginas são "janelas" (Modal)
// do Android, que ficariam por cima do player dentro da janelinha e mostrariam o app inteiro.
//  - Rádio: a capa entra numa janela própria, a última aberta, então fica por cima de todas.
//  - TV e live: enquanto estiver na janelinha, as janelas do app se escondem; ao voltar
//    para o app, a página que estava aberta aparece de novo.
// Importado primeiro no App.js, antes de qualquer tela.
import React from 'react';
import * as RN from 'react-native';
import { usePipState, playingKind } from './pip';

export const BaseModal = RN.Modal;

function PipAwareModal(props) {
  const inPip = usePipState();
  const k = playingKind();
  const hide = inPip && (k === 'tv' || k === 'live') && !props.pipLayer;
  return <BaseModal {...props} visible={!!props.visible && !hide} />;
}

try {
  const RNmod = require('react-native');
  Object.defineProperty(RNmod, 'Modal', { configurable: true, enumerable: true, get: () => PipAwareModal });
} catch (e) {
  // Sem como trocar: a rádio continua com a capa na janela própria (por cima de tudo).
}

// Camada da janelinha: por cima de qualquer página aberta.
export function PipLayer({ children }) {
  return (
    <BaseModal visible transparent={false} animationType="none" statusBarTranslucent hardwareAccelerated onRequestClose={() => {}}>
      {children}
    </BaseModal>
  );
}
