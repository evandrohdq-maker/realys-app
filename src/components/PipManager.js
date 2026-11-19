// Liga a janelinha por cima dos outros apps (src/pip.js) quando a rádio está tocando:
//  - Android 12+: sair do Re@lys (botão início) já vira janelinha com a logo da rádio.
//  - Dentro da janelinha, o app mostra só a logo, o nome e o AO VIVO (RadioPipView).
//  - Fechar a janelinha no X para a rádio (não fica som "fantasma" tocando).
// Com a TV no ar, quem cuida da janelinha é o próprio player de vídeo (FloatPlayers.js).
import React, { useEffect } from 'react';
import { usePip, setAutoPip } from '../pip';
import { useRadioNow, RadioPipView } from './RadioKit';
import { useTvNow } from './FloatPlayers';
import { stopRadio } from '../radio';
import { stopTv } from '../tv';

export default function PipManager() {
  const r = useRadioNow();
  const t = useTvNow();
  const radioOn = !!(r.radio && r.status !== 'parado');
  const inPip = usePip(() => {
    stopRadio();
    stopTv();
  });
  useEffect(() => {
    if (!t.channel) setAutoPip(radioOn);
  }, [radioOn, !!t.channel]);
  if (!inPip || t.channel || !radioOn) return null;
  return <RadioPipView />;
}
