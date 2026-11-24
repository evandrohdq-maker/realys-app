// Ritmo das consultas ao servidor: o app só pergunta "tem novidade?" quando alguém está olhando.
//
// - App em segundo plano (celular) ou aba escondida/minimizada (site no computador): para de perguntar.
//   O que chega com o app fechado vem pela notificação; ao voltar, atualiza na hora se já deu o tempo.
// - Tela guardada aberta atrás de outra (abas mantidas em memória, ver App.js): também para, e
//   atualiza assim que volta a aparecer.
// Assim o celular e o computador gastam menos internet e bateria, e o servidor recebe bem menos pedidos.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

// ── App visível? ──
const web = Platform.OS === 'web' && typeof document !== 'undefined';
const lerVisivel = () => (web ? document.visibilityState !== 'hidden' : AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
let visivel = lerVisivel();
const ouvintes = new Set();
const mudou = () => {
  const v = lerVisivel();
  if (v === visivel) return;
  visivel = v;
  ouvintes.forEach((fn) => fn(v));
};
if (web) document.addEventListener('visibilitychange', mudou);
else AppState.addEventListener('change', mudou);
export const appVisivel = () => visivel;
export const aoMudarVisivel = (fn) => (ouvintes.add(fn), () => ouvintes.delete(fn));

// ── Tela ativa (aba que está na frente) ──
const TelaAtiva = createContext(true);
export const TelaAtivaProvider = ({ ativa, children }) => React.createElement(TelaAtiva.Provider, { value: ativa }, children);
export const useTelaAtiva = () => useContext(TelaAtiva);

// Tela na frente E app visível (para pausar vídeo, animação pesada, etc.).
export function useAtivo() {
  const tela = useTelaAtiva();
  const [app, setApp] = useState(visivel);
  useEffect(() => aoMudarVisivel(setApp), []);
  return tela && app;
}

// Repete fn a cada ms, só enquanto o app está visível (e, com a tela passada, enquanto ela está na
// frente). Voltou a aparecer e já passou o tempo: roda na hora. Devolve uma função para desligar.
// ativa(): opcional, diz se a tela está na frente.
export function aCada(fn, ms, ativa) {
  let ultima = Date.now();
  let parado = false;
  const pode = () => visivel && (!ativa || ativa());
  const rodar = () => {
    if (parado || !pode()) return;
    ultima = Date.now();
    try {
      const p = fn();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  };
  const t = setInterval(rodar, ms);
  const voltou = () => Date.now() - ultima >= ms && rodar();
  const sair = aoMudarVisivel((v) => v && voltou());
  return {
    parar: () => {
      parado = true;
      clearInterval(t);
      sair();
    },
    voltou,
  };
}

// Versão para componente: useACada(() => carregar(), 30000, [deps]). Respeita a tela ativa.
export function useACada(fn, ms, deps = [], ligado = true) {
  const tela = useTelaAtiva();
  const telaRef = useRef(tela);
  telaRef.current = tela;
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const ctl = useRef(null);
  useEffect(() => {
    if (!ligado || !ms) return undefined;
    const c = aCada(() => fnRef.current(), ms, () => telaRef.current);
    ctl.current = c;
    return () => {
      c.parar();
      ctl.current = null;
    };
  }, [ms, ligado, ...deps]);
  // Tela voltou para a frente: atualiza se já passou o tempo.
  useEffect(() => {
    if (tela && ctl.current) ctl.current.voltou();
  }, [tela]);
}

// Para usar com aCada dentro de componente: aCada(load, 30000, telaNaFrente) — pula enquanto a
// tela está guardada atrás de outra.
export function useTelaNaFrente() {
  const tela = useTelaAtiva();
  const r = useRef(tela);
  r.current = tela;
  return useRef(() => r.current).current;
}
