// Mensagens escritas sem internet (ou enquanto a internet está fraca).
// A mensagem aparece na conversa na hora, com o reloginho, fica guardada no aparelho e vai sozinha
// quando a internet voltar, na ordem em que foi escrita. Cada mensagem leva um código (clientId):
// se o celular mandar a mesma duas vezes, o servidor guarda uma só (nunca duplica).
// Erro do servidor (ex.: mensagem barrada pela proteção): sai da fila e a pessoa é avisada.
// Só texto: foto, vídeo e áudio precisam de internet para subir o arquivo.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { api, serverOn } from './api';
import { estaOnline, onConexao, testarAgora } from './conexao';

const KEY = 'realys.msgs.pendentes';
const DIAS = 3; // esperando há mais que isso: desiste (avisa como não enviada)
let lista = null; // [{ clientId, toId, text, at, conta }]
let contaAtual = '';
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((fn) => { try { fn(); } catch (e) {} });
export function onPendentes(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
// Quem está logado (id do servidor): cada conta vê só as suas.
export const usarContaPendentes = (id) => {
  contaAtual = String(id || '');
  avisar();
  enviarPendentes();
};

async function carregar() {
  if (lista) return lista;
  try {
    lista = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]') || [];
  } catch (e) {
    lista = [];
  }
  return lista;
}
const gravar = () => AsyncStorage.setItem(KEY, JSON.stringify(lista || [])).catch(() => {});

// Pendentes desta conversa (para mostrar com o reloginho).
export const pendentesCom = (toId) => (lista || []).filter((m) => m.toId === toId && m.conta === contaAtual);

const novoId = () => {
  try {
    return 'c' + Crypto.randomUUID().replace(/-/g, '');
  } catch (e) {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
};

// Manda (ou guarda para mandar). Devolve a mensagem do servidor, ou { pendente: true }.
export async function enviarMensagem(toId, text, extra = {}) {
  await carregar();
  const m = { clientId: novoId(), toId, text, at: Date.now(), conta: contaAtual, extra };
  lista.push(m);
  gravar();
  avisar();
  if (!estaOnline()) {
    testarAgora();
    return { pendente: true, clientId: m.clientId };
  }
  try {
    return await mandar(m);
  } catch (e) {
    if (e.status === 0) return { pendente: true, clientId: m.clientId };
    throw e;
  }
}

async function mandar(m) {
  try {
    const r = await api('POST', '/messages', { toId: m.toId, text: m.text, clientId: m.clientId, ...(m.extra || {}) });
    tirar(m.clientId);
    return r;
  } catch (e) {
    // Sem internet ou demorou: continua na fila (o código evita duplicar se tinha chegado).
    if (e.status !== 0) tirar(m.clientId);
    throw e;
  }
}
function tirar(clientId) {
  lista = (lista || []).filter((x) => x.clientId !== clientId);
  gravar();
  avisar();
}

// Recusadas pelo servidor ao mandar da fila: a conversa mostra o aviso para a pessoa.
let recusadas = [];
export const tirarRecusadas = (toId) => {
  const r = recusadas.filter((x) => x.toId === toId);
  recusadas = recusadas.filter((x) => x.toId !== toId);
  return r;
};

let enviando = false;
export async function enviarPendentes() {
  if (enviando || !serverOn() || !estaOnline() || !contaAtual) return;
  enviando = true;
  try {
    await carregar();
    const limite = Date.now() - DIAS * 86400000;
    for (const m of [...lista]) {
      if (m.conta !== contaAtual) continue;
      if (m.at < limite) {
        tirar(m.clientId);
        recusadas.push({ ...m, erro: 'Ficou muito tempo sem internet e não foi enviada.' });
        continue;
      }
      try {
        await mandar(m);
      } catch (e) {
        if (e.status === 0) break; // caiu de novo: tenta na próxima vez
        recusadas.push({ ...m, erro: e.message });
      }
    }
  } finally {
    enviando = false;
    avisar();
  }
}
onConexao((on) => on && enviarPendentes());
carregar().then(avisar);
