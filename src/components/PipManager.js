// Janelinha por cima dos outros apps (src/pip.js). Quem decide o que vai para a janelinha:
//  - TV no ar → o vídeo do canal (TvFloat ocupa a janelinha inteira);
//  - live aberta ou minimizada → o vídeo da live (LiveFloat ocupa a janelinha inteira);
//  - rádio tocando → a logo da rádio (RadioPipView).
// Android 12+: sair do Realyz já abre a janelinha. Tocar nela e no botão de tela cheia volta para o app
// (a live volta em tela cheia); fechar no X para o que estava tocando.
import React, { useEffect, useRef } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import { setAutoPip, usePipState, setPipState, pipState, onNativePip, isInPipNow, liveOpenNow, setPlayingKind, watchTask, smallWindow } from '../pip';
import { useRadioNow, RadioPipView } from './RadioKit';
import { useTvNow } from './FloatPlayers';
import { useStore } from '../store';
import { stopRadio } from '../radio';
import { stopTv } from '../tv';
import { hardStopRadio } from './RadioKit';
import { hardStopTv } from './FloatPlayers';

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
  // Também avisa o "minimizar" do que está tocando e liga o vigia que encerra o som ao fechar o app.
  useEffect(() => {
    setAutoPip(!!kind, kind || 'radio');
    setPlayingKind(kind);
    if (kind) watchTask(true);
  }, [kind]);

  useEffect(() => {
    const leave = (closed) => {
      setPipState(false);
      if (closed) {
        // Fechou a janelinha no X: para tudo (nada fica tocando escondido). Primeiro direto no
        // player (não espera a tela redesenhar, que fica parada com o app em segundo plano).
        hardStopRadio();
        hardStopTv();
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
    const offNative = onNativePip((on, closed) => {
      if (on) return setPipState(true);
      // Fechou no X: o Android avisa (closed) e o som para na hora, mesmo com o app em segundo plano.
      if (closed) return leave(true);
      setPipState(false);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        // Indo para a janelinha com a live em tela cheia: a live vira o player da janelinha.
        const l = liveOpenNow();
        if (l) {
          reopenLive.current = true;
          l.minimize();
        }
      } else if (pipState() && !isInPipNow()) {
        // Só sai do modo janelinha quando o app voltou de verdade (alguns Android "acordam" o app
        // dentro da janelinha; aí ele continua mostrando só o player).
        leave(false);
      }
    });
    return () => {
      offNative();
      sub.remove();
    };
  }, []);

  // Plano B (sem o aviso do Android): a janela ficou pequena e o Android diz que é a janelinha.
  // Janela pequena = janelinha (também quando o aviso não chega, ex.: 2ª vez pelo botão do meio).
  // Janela grande de novo e o Android diz que saiu: volta ao app normal.
  useEffect(() => {
    if (smallWindow(win)) setPipState(true);
    else if (pipState() && !isInPipNow()) setPipState(false);
  }, [win.width, win.height]);

  if (!inPip || kind !== 'radio') return null;
  // A capa da rádio na tela principal (as páginas abertas por cima se escondem na janelinha).
  return <RadioPipView />;
}
