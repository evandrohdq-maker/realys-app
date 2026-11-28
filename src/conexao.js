// Internet do aparelho com o servidor do Realyz: "com conexão" ou "sem conexão".
//
// Quem descobre é o próprio app: um pedido ao servidor que falhou levanta a SUSPEITA; o app confirma
// perguntando ao servidor (/health) e só marca "sem conexão" se ele também não responder duas vezes
// seguidas. Assim uma falha solta (troca de Wi-Fi para 4G, um pedido lento, o celular acordando)
// não acende o aviso. Qualquer resposta do servidor marca "com conexão". Sem conexão, o app pergunta
// ao servidor de tempos em tempos (2 s, 4 s, 8 s... até 30 s) se ele já responde, e também na hora
// em que a pessoa volta para o app. Voltou a internet: avisa quem estiver ouvindo (o aviso do topo
// some e as ações que ficaram esperando são enviadas).
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

let online = true;
const ouvintes = new Set();
let testar = null; // pergunta ao servidor se ele responde (definida em api.js)
let timer = null;
let conferindo = false; // confirmando a suspeita de queda (não repete a conferência ao mesmo tempo)
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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
// Um pedido falhou: confere antes de dizer que caiu.
export function marcarOffline() {
  if (!online || conferindo) return;
  if (!testar) return ficouOffline();
  conferindo = true;
  (async () => {
    let ok = false;
    for (let i = 0; i < 2 && !ok; i++) {
      if (i) await esperar(1500);
      ok = await testar().catch(() => false);
    }
    conferindo = false;
    if (!ok) ficouOffline();
  })();
}
// Caiu de verdade (o servidor não respondeu na conferência, ou o navegador avisou que está sem internet).
export function ficouOffline() {
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
  window.addEventListener('offline', ficouOffline);
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
