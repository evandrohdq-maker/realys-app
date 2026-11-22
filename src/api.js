// Ligação do app com o servidor do Realyz (pasta server/ do repositório).
//
// Enquanto o endereço do servidor não estiver configurado, o app continua no modo demonstração
// (tudo no celular). Para ligar: em app.json › expo › extra › apiUrl, coloque o endereço da VPS,
// por exemplo "https://api.realyz.com.br", e gere o APK de novo.
//
// Sessão: na primeira entrada (usuário/CPF/CNPJ + senha) o servidor devolve uma "sessão do aparelho",
// guardada no cofre do Android (SecureStore). Depois, a biometria libera essa sessão e o app pega um
// acesso novo sem pedir senha. O acesso curto (1 h) é renovado sozinho quando expira.
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { AppState, Platform } from 'react-native';

const SESSION_KEY = 'realys.session';
export const API_URL = String((Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl) || '').replace(/\/$/, '');
export const serverOn = () => !!API_URL;
// Foto/arquivo do servidor ("/media/...") com o endereço completo, para aparecer em qualquer tela.
export const mediaUrl = (u) => (typeof u === 'string' && u.startsWith('/') ? API_URL + u : u || null);

let accessToken = null;
// Quem o app chama quando o servidor responde "biometria não cadastrada" (definido em BioGate.js).
let bioBlocked = null;
export const onBioBlocked = (fn) => (bioBlocked = fn);
// Quem o app chama quando o servidor responde "compras temporariamente bloqueadas" (ComprasGate.js).
let comprasBlocked = null;
export const onComprasBlocked = (fn) => (comprasBlocked = fn);
let refreshing = null;

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Cada conta tem a sua sessão guardada (celular da empresa usado por mais de uma pessoa):
// "realys.session.<id da conta no servidor>". Trocar de conta troca a sessão usada nas chamadas.
let sessionKey = SESSION_KEY;
const keyFor = (serverId) => (serverId ? `${SESSION_KEY}.${String(serverId).replace(/[^A-Za-z0-9._-]/g, '')}` : SESSION_KEY);
export function setServerAccount(serverId) {
  const k = keyFor(serverId);
  if (k !== sessionKey) {
    sessionKey = k;
    accessToken = null;
  }
}
const saveSession = (t) => SecureStore.setItemAsync(sessionKey, t, { requireAuthentication: false });
export const hasSession = async () => !!(await SecureStore.getItemAsync(sessionKey).catch(() => null));

async function raw(method, path, body, headers = {}) {
  let res;
  // Sem resposta em 25 s (60 s para envio de arquivo): para de esperar e avisa, em vez de ficar
  // carregando para sempre.
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const limite = setTimeout(() => ctl && ctl.abort(), body instanceof ArrayBuffer ? 60000 : 25000);
  try {
    res = await fetch(API_URL + path, {
      signal: ctl ? ctl.signal : undefined,
      method,
      headers: { ...(body !== undefined && !(body instanceof ArrayBuffer) ? { 'Content-Type': 'application/json' } : {}), ...headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: body === undefined ? undefined : body instanceof ArrayBuffer ? body : JSON.stringify(body),
    });
  } catch (e) {
    clearTimeout(limite);
    throw new ApiError(0, e && e.name === 'AbortError' ? 'O Realyz demorou para responder. Tente de novo.' : 'Sem conexão com o Realyz. Confira sua internet.');
  }
  const data = await res.json().catch(() => ({}));
  clearTimeout(limite);
  // O servidor recusou por falta de biometria: o app abre o aviso "Biometria não cadastrada".
  if (!res.ok && data.code === 'biometria' && bioBlocked) bioBlocked();
  if (!res.ok && data.code === 'compras_bloqueadas' && comprasBlocked) comprasBlocked(data.error);
  if (!res.ok) throw new ApiError(res.status, data.error || 'Algo deu errado. Tente de novo.', data.code);
  return data;
}

// Troca a sessão do aparelho por um acesso novo (só um pedido por vez).
export async function refresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const sessionToken = await SecureStore.getItemAsync(sessionKey).catch(() => null);
    if (!sessionToken) throw new ApiError(401, 'Entre com usuário e senha.', 'sem_sessao');
    accessToken = null;
    const d = await raw('POST', '/auth/refresh', { sessionToken });
    accessToken = d.accessToken;
    return d.user;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// Chamada à API. Se o acesso expirou, renova e tenta mais uma vez.
export async function api(method, path, body, headers) {
  try {
    return await raw(method, path, body, headers);
  } catch (e) {
    if (e.status !== 401 || path.startsWith('/auth/')) throw e;
    await refresh();
    return raw(method, path, body, headers);
  }
}

// Identificador deste aparelho (guardado no cofre). Aparelho novo pede a conferência do rosto antes da senha.
const DEVICE_KEY = 'realys.deviceKey';
export async function deviceKey() {
  let k = await SecureStore.getItemAsync(DEVICE_KEY).catch(() => null);
  if (!k) {
    k = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, k).catch(() => {});
  }
  return k;
}

// Aparelho novo: confere o rosto contra o cadastro (não refaz o cadastro) e devolve o código para o login.
export async function verificarAparelho(loginText, imageBuf) {
  const key = await deviceKey();
  const d = await raw('POST', `/auth/aparelho/verificar?login=${encodeURIComponent(loginText)}&deviceKey=${encodeURIComponent(key)}`, imageBuf, { 'Content-Type': 'image/jpeg' });
  return d.aparelhoToken;
}

export async function login(loginText, password, device = 'Android', aparelhoToken = null) {
  accessToken = null;
  const key = await deviceKey();
  const d = await raw('POST', '/auth/login', { login: loginText, password, device, deviceKey: key, aparelhoToken });
  setServerAccount(d.user && d.user.id);
  accessToken = d.accessToken;
  await saveSession(d.sessionToken);
  return d.user;
}

// kind: 'pessoa' (CPF) ou 'empresa' (CNPJ)
export async function signup(data, device = 'Android') {
  accessToken = null;
  const d = await raw('POST', '/auth/signup', { ...data, device });
  setServerAccount(d.user && d.user.id);
  accessToken = d.accessToken;
  await saveSession(d.sessionToken);
  return d.user;
}

export async function logout() {
  const sessionToken = await SecureStore.getItemAsync(sessionKey).catch(() => null);
  try {
    if (sessionToken) await api('POST', '/auth/logout', { sessionToken });
  } catch (e) {}
  accessToken = null;
  await SecureStore.deleteItemAsync(sessionKey).catch(() => {});
}

// Acesso atual (renova se precisar): para baixar um arquivo protegido (ex.: currículo).
export async function authToken() {
  if (!accessToken) await refresh().catch(() => {});
  return accessToken;
}

// Envia uma foto, vídeo ou música e devolve o endereço completo.
// uso 'privado': foto/vídeo/áudio de conversa (fica só entre as duas pessoas).
export async function uploadMedia(uri, mime, uso) {
  const file = await fetch(uri);
  const buf = await file.arrayBuffer();
  const d = await api('PUT', uso === 'privado' ? '/media?uso=privado' : '/media', buf, { 'Content-Type': mime });
  return API_URL + d.url;
}

// Avisos em tempo real: mensagens, presentes, pedidos, chamados, presentes de live...
// onEvent({ type, data }). Reconecta sozinho se a internet cair. Devolve uma função para desligar.
// No celular, app fechado ou em segundo plano = desconectado do servidor. Assim o servidor sabe que
// a pessoa não está vendo o app e manda a notificação pelo Firebase (chega mesmo com o app fechado).
// Voltou para o app: reconecta na hora.
const liveSockets = new Set();
let appAtivo = true;
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (st) => {
    const ativo = st === 'active';
    if (ativo === appAtivo) return;
    appAtivo = ativo;
    liveSockets.forEach((c) => (ativo ? c.resume() : c.pause()));
  });
}

export function connectEvents(onEvent) {
  let ws = null;
  let stopped = false;
  let paused = false;
  let wait = 1000;
  let ping = null;
  const open = async () => {
    if (stopped || paused || !appAtivo) return;
    try {
      if (!accessToken) await refresh();
    } catch (e) {
      return setTimeout(open, 15000);
    }
    ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/ws?token=${accessToken}${Platform.OS === 'web' ? '' : `&app=${Platform.OS}`}`);
    ws.onopen = () => {
      wait = 1000;
      ping = setInterval(() => ws && ws.readyState === 1 && ws.send('ping'), 25000);
    };
    ws.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data);
        if (e.type !== 'ready' && e.type !== 'pong') onEvent(e);
      } catch (err) {}
    };
    ws.onclose = () => {
      clearInterval(ping);
      if (stopped || paused) return;
      accessToken = null; // o acesso pode ter expirado: renova antes de reconectar
      setTimeout(open, (wait = Math.min(wait * 2, 30000)));
    };
  };
  const ctl = {
    pause: () => {
      paused = true;
      clearInterval(ping);
      if (ws) ws.close();
      ws = null;
    },
    resume: () => {
      if (!paused) return;
      paused = false;
      wait = 1000;
      open();
    },
  };
  liveSockets.add(ctl);
  open();
  return () => {
    stopped = true;
    liveSockets.delete(ctl);
    clearInterval(ping);
    if (ws) ws.close();
  };
}
