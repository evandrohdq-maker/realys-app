// Internet do aparelho com o servidor do Realyz: "com conexão" ou "sem conexão".
//
// Quem descobre é o próprio app: um pedido ao servidor que falhou por falta de internet marca
// "sem conexão"; qualquer resposta do servidor marca "com conexão". Sem conexão, o app pergunta
// ao servidor de tempos em tempos (2 s, 4 s, 8 s... até 30 s) se ele já responde, e também na hora
// em que a pessoa volta para o app. Voltou a internet: avisa quem estiver ouvindo (o aviso do topo
// some e as ações que ficaram esperando são enviadas).
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

let online = true;
const ouvintes = new Set();
let testar = null; // pergunta ao servidor se ele responde (definida em api.js)
let timer = null;

export const estaOnline = () => online;
export function onConexao(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
const avisar = () =>
  ouvintes.forEach((fn) => {
    try {
      fn(online);
    } catch (e) {}
  });

export function marcarOnline() {
  if (online) return;
  online = true;
  clearTimeout(timer);
  timer = null;
  avisar();
}
export function marcarOffline() {
  if (!online) return;
  online = false;
  avisar();
  agendar(2000);
}

function agendar(ms) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    if (online || !testar) return;
    const ok = await testar().catch(() => false);
    if (ok) marcarOnline();
    else if (!online) agendar(Math.min(ms * 2, 30000));
  }, ms);
}
export const definirTeste = (fn) => (testar = fn);
// Sem conexão: pergunta de novo agora (ex.: a pessoa voltou para o app ou tocou em algo).
export function testarAgora() {
  if (!online && !timer) agendar(0);
  else if (!online) agendar(300);
}

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (st) => st === 'active' && testarAgora());
} else if (typeof window !== 'undefined' && window.addEventListener) {
  // Navegador: ele mesmo avisa quando a internet cai ou volta.
  window.addEventListener('offline', marcarOffline);
  window.addEventListener('online', testarAgora);
}

// Para as telas: true = com conexão.
export function useConexao() {
  const [on, setOn] = useState(online);
  useEffect(() => {
    setOn(online);
    return onConexao(setOn);
  }, []);
  return on;
}
