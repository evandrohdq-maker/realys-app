// Na janelinha (picture-in-picture) aparece SÓ o player, mesmo com uma página do app aberta
// por cima (ex.: o perfil da rádio, a tela de um produto). Essas páginas são "janelas" (Modal)
// do Android, que ficariam por cima do player dentro da janelinha e mostrariam o app inteiro.
// Enquanto estiver na janelinha, as janelas do app se escondem (rádio, TV e live); ao voltar
// para o app, a página que estava aberta aparece de novo. O player fica na tela principal do
// app, que é a única que o Android desenha certo dentro da janelinha (uma janela por cima fica
// do tamanho da tela inteira e a capa sai da área visível: tela preta).
// Importado primeiro no App.js, antes de qualquer tela.
import React from 'react';
import * as RN from 'react-native';
import { usePipState, playingKind } from './pip';

export const BaseModal = RN.Modal;

function PipAwareModal(props) {
  const inPip = usePipState();
  const hide = inPip && !!playingKind();
  return <BaseModal {...props} visible={!!props.visible && !hide} />;
}

try {
  const RNmod = require('react-native');
  Object.defineProperty(RNmod, 'Modal', { configurable: true, enumerable: true, get: () => PipAwareModal });
} catch (e) {
  // Sem como trocar: as páginas principais (perfil da rádio) se escondem sozinhas (usePipState).
}
