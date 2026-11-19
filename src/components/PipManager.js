// Janelinha por cima dos outros apps (src/pip.js). Quem decide o que vai para a janelinha:
//  - TV no ar → o vídeo do canal (TvFloat ocupa a janelinha inteira);
//  - live aberta ou minimizada → o vídeo da live (LiveFloat ocupa a janelinha inteira);
//  - rádio tocando → a logo da rádio (RadioPipView).
// Android 12+: sair do Re@lys já abre a janelinha. Tocar nela e no botão de tela cheia volta para o app
// (a live volta em tela cheia); fechar no X para o que estava tocando.
import React, { useEffect, useRef } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import { setAutoPip, usePipState, setPipState, pipState, onNativePip, isInPipNow, liveOpenNow } from '../pip';
import { useRadioNow, RadioPipView } from './RadioKit';
import { useTvNow } from './FloatPlayers';
import { useStore } from '../store';
import { stopRadio } from '../radio';
import { stopTv } from '../tv';

export default function PipManager() {
  const { state, dispatch } = useStore();
  const r = useRadioNow();
  const t = useTvNow();
  const win = useWindowDimensions();
  const inPip = usePipState();
  const radioOn = !!(r.radio && r.status !== 'parado');
  const liveOn = !!(state.liveMini || liveOpenNow());
  const kind = t.channel ? 'tv' : liveOn ? 'live' : radioOn ? 'radio' : null;
  const reopenLive = useRef(false);
  const st = useRef({ dispatch, liveMini: state.liveMini });
  st.current = { dispatch, liveMini: state.liveMini };

  // Liga a janelinha automática só quando há algo tocando, no formato do player.
  useEffect(() => {
    setAutoPip(!!kind, kind || 'radio');
  }, [kind]);

  useEffect(() => {
    const leave = (closed) => {
      setPipState(false);
      if (closed) {
        // Fechou a janelinha no X: para tudo (nada fica tocando escondido).
        stopRadio();
        stopTv();
        st.current.dispatch({ type: 'LIVE_MINI_CLOSE' });
        reopenLive.current = false;
      } else if (reopenLive.current && st.current.liveMini) {
        // Tocou para voltar: a live que estava em tela cheia volta em tela cheia.
        st.current.dispatch({ type: 'LIVE_REOPEN' });
        reopenLive.current = false;
      }
    };
    const offNative = onNativePip((on) => {
      if (on) return setPipState(true);
      // Saiu da janelinha: voltou para o app (ativo) ou fechou no X (fica em segundo plano).
      setTimeout(() => leave(AppState.currentState !== 'active'), 700);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        // Indo para a janelinha com a live em tela cheia: a live vira o player da janelinha.
        const l = liveOpenNow();
        if (l) {
          reopenLive.current = true;
          l.minimize();
        }
      } else if (pipState()) {
        leave(false);
      }
    });
    return () => {
      offNative();
      sub.remove();
    };
  }, []);

  // Plano B (sem o aviso do Android): a janela ficou pequena e o Android diz que é a janelinha.
  useEffect(() => {
    if (win.width < 500 && win.height < 500 && isInPipNow()) setPipState(true);
  }, [win.width, win.height]);

  if (!inPip || kind !== 'radio') return null;
  return <RadioPipView />;
}
