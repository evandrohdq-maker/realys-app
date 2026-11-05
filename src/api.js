// Ligação do app com o servidor do Realys (pasta server/ do repositório).
//
// Enquanto o endereço do servidor não estiver configurado, o app continua no modo demonstração
// (tudo no celular). Para ligar: em app.json › expo › extra › apiUrl, coloque o endereço da VPS,
// por exemplo "https://api.realys.com.br", e gere o APK de novo.
//
// Sessão: na primeira entrada (usuário/CPF/CNPJ + senha) o servidor devolve uma "sessão do aparelho",
// guardada no cofre do Android (SecureStore). Depois, a biometria libera essa sessão e o app pega um
// acesso novo sem pedir senha. O acesso curto (1 h) é renovado sozinho quando expira.
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const SESSION_KEY = 'realys.session';
export const API_URL = String((Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl) || '').replace(/\/$/, '');
export const serverOn = () => !!API_URL;

let accessToken = null;
let refreshing = null;

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const saveSession = (t) => SecureStore.setItemAsync(SESSION_KEY, t, { requireAuthentication: false });
export const hasSession = async () => !!(await SecureStore.getItemAsync(SESSION_KEY).catch(() => null));

async function raw(method, path, body, headers = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { ...(body !== undefined && !(body instanceof ArrayBuffer) ? { 'Content-Type': 'application/json' } : {}), ...headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: body === undefined ? undefined : body instanceof ArrayBuffer ? body : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, 'Sem conexão com o Realys. Confira sua internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Algo deu errado. Tente de novo.', data.code);
  return data;
}

// Troca a sessão do aparelho por um acesso novo (só um pedido por vez).
export async function refresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const sessionToken = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
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

export async function login(loginText, password, device = 'Android') {
  accessToken = null;
  const d = await raw('POST', '/auth/login', { login: loginText, password, device });
  accessToken = d.accessToken;
  await saveSession(d.sessionToken);
  return d.user;
}

// kind: 'pessoa' (CPF) ou 'empresa' (CNPJ)
export async function signup(data, device = 'Android') {
  accessToken = null;
  const d = await raw('POST', '/auth/signup', { ...data, device });
  accessToken = d.accessToken;
  await saveSession(d.sessionToken);
  return d.user;
}

export async function logout() {
  const sessionToken = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
  try {
    if (sessionToken) await api('POST', '/auth/logout', { sessionToken });
  } catch (e) {}
  accessToken = null;
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
}

// Envia uma foto, vídeo ou música e devolve o endereço completo.
export async function uploadMedia(uri, mime) {
  const file = await fetch(uri);
  const buf = await file.arrayBuffer();
  const d = await api('PUT', '/media', buf, { 'Content-Type': mime });
  return API_URL + d.url;
}

// Avisos em tempo real: mensagens, presentes, pedidos, chamados, presentes de live...
// onEvent({ type, data }). Reconecta sozinho se a internet cair. Devolve uma função para desligar.
export function connectEvents(onEvent) {
  let ws = null;
  let stopped = false;
  let wait = 1000;
  let ping = null;
  const open = async () => {
    if (stopped) return;
    try {
      if (!accessToken) await refresh();
    } catch (e) {
      return setTimeout(open, 15000);
    }
    ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/ws?token=${accessToken}`);
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
      if (stopped) return;
      accessToken = null; // o acesso pode ter expirado: renova antes de reconectar
      setTimeout(open, (wait = Math.min(wait * 2, 30000)));
    };
  };
  open();
  return () => {
    stopped = true;
    clearInterval(ping);
    if (ws) ws.close();
  };
}
