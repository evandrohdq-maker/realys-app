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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { estaOnline, marcarOnline, marcarOffline, testarAgora, definirTeste, onConexao } from './conexao';

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
// Quem o app chama quando o servidor responde "prazo de 7 dias sem biometria acabou" (BioGate.js).
let prazoBio = null;
export const onPrazoBio = (fn) => (prazoBio = fn);
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
    tokenExp = 0;
    // A fila de ações sem internet é de cada conta.
    prepararFila().catch(() => {});
  }
}
const saveSession = (t) => SecureStore.setItemAsync(sessionKey, t, { requireAuthentication: false });

// Acesso curto (1 h) guardado no cofre: ao abrir o app de novo dentro desse tempo, os dados já vêm
// na primeira chamada, sem a ida extra ao servidor para renovar o login.
let tokenExp = 0;
const acessoKey = () => `${sessionKey}.acesso`;
function guardarAcesso(token, segundos) {
  accessToken = token;
  tokenExp = Date.now() + (Number(segundos) || 3600) * 1000;
  if (Platform.OS !== 'web') SecureStore.setItemAsync(acessoKey(), JSON.stringify({ t: token, exp: tokenExp })).catch(() => {});
}
async function acessoGuardado() {
  if (Platform.OS === 'web') return false;
  const key = acessoKey();
  try {
    const g = JSON.parse((await SecureStore.getItemAsync(key)) || 'null');
    // Só usa se ainda vale por mais 2 min e se nada trocou a conta enquanto lia.
    if (g && g.t && g.exp - Date.now() > 120000 && key === acessoKey() && !accessToken) {
      accessToken = g.t;
      tokenExp = g.exp;
      return true;
    }
  } catch (e) {}
  return false;
}
// Garante o login antes de pedir (uma vez só, mesmo com várias telas pedindo juntas na abertura).
let garantindo = null;
async function garantirAcesso() {
  if (accessToken && (!tokenExp || tokenExp - Date.now() > 60000)) return;
  if (refreshing) return void (await refreshing.catch(() => {}));
  if (!garantindo) {
    garantindo = (async () => {
      if (!accessToken && (await acessoGuardado())) return;
      if (await hasSession()) await refresh().catch(() => {});
    })().finally(() => (garantindo = null));
  }
  await garantindo;
}
// Abriu o app com conta salva: já começa a preparar o login enquanto a tela monta.
export const aquecerConexao = () => (serverOn() ? garantirAcesso().catch(() => {}).then(() => prepararFila()).catch(() => {}) : Promise.resolve());
export const hasSession = async () => !!(await SecureStore.getItemAsync(sessionKey).catch(() => null));

// ── Respostas guardadas no aparelho (o "mini backup", como o Instagram faz) ──
// Cada leitura (GET) guarda a resposta e a "etiqueta" (ETag) que o servidor manda junto. Na próxima vez,
// o app pergunta "mudou alguma coisa desde esta etiqueta?": se não mudou, o servidor responde só
// "igual" (304, sem dados) e o app usa o que já tem.
// As respostas também ficam no disco do aparelho (uma chave por tela/lista), com estas regras:
//  - guarda o que foi visto nos últimos 7 dias; o que não é aberto há mais tempo é apagado;
//  - no máximo ~4 milhões de letras no total (alguns MB); passando disso, sai o mais antigo;
//  - cada vez que a tela abre com internet, a cópia é trocada pela mais nova;
//  - o dono dos dados continua sendo o servidor: isto é só uma cópia para abrir rápido e funcionar
//    sem internet. Sair da conta apaga a cópia daquela conta.
// Não guarda no disco: login, administração, biometria e conferências (sempre do servidor, na hora).
const memo = new Map(); // "conta caminho" → { etag, texto, em }
const MEMO_MAX = 200;
const NAO_GUARDA = /^\/(auth|admin|biometria|health|app\/versao|baixar|credenciais\/[^/]+\/sigilo)(\/|\?|$)/;
const guardavel = (path) => !NAO_GUARDA.test(path);
const DISCO_MAX = 400000; // por resposta (letras)
const DISCO_TOTAL = 4000000; // todas as respostas da conta (letras)
const DISCO_ITENS = 160;
const DISCO_DIAS = 7;
const memoKey = (path) => `${sessionKey} ${path}`;
const indiceKey = (conta) => `realys.cache.${conta}`;
const itemKey = (conta, path) => `realys.cache.${conta}|${path}`;

// Índice do que está no disco: { caminho: { em, n } } (quando foi guardado e o tamanho).
const indices = new Map(); // conta → Promise<objeto>
function indice(conta = sessionKey) {
  if (!indices.has(conta)) {
    indices.set(
      conta,
      AsyncStorage.getItem(indiceKey(conta))
        .then((t) => JSON.parse(t || '{}') || {})
        .catch(() => ({}))
    );
    // Versão antiga guardava tudo numa chave só (podia ficar grande demais para o Android): apaga.
    AsyncStorage.removeItem(`realys.respostas.${conta}`).catch(() => {});
  }
  return indices.get(conta);
}
// Traz do disco a cópia desta tela (uma vez só), se ainda não estiver na memória.
const procurados = new Set();
async function doDisco(path) {
  const k = memoKey(path);
  if (memo.has(k) || procurados.has(k) || !guardavel(path)) return;
  procurados.add(k);
  const conta = sessionKey;
  const idx = await indice(conta);
  if (!idx[path]) return;
  try {
    const g = JSON.parse((await AsyncStorage.getItem(itemKey(conta, path))) || 'null');
    if (g && g.texto && !memo.has(k)) memo.set(k, g);
  } catch (e) {}
}
// Grava no disco o que mudou (junta tudo e grava a cada 3 s, para não pesar o celular).
const paraGravar = new Map(); // "conta caminho" → { conta, path, v }
let gravarDepois = null;
function agendarGravacao(path, v) {
  if (!guardavel(path) || v.texto.length > DISCO_MAX) return;
  paraGravar.set(memoKey(path), { conta: sessionKey, path, v });
  if (gravarDepois) return;
  gravarDepois = setTimeout(gravar, 3000);
}
async function gravar() {
  gravarDepois = null;
  const lote = [...paraGravar.values()];
  paraGravar.clear();
  const contas = new Set(lote.map((x) => x.conta));
  for (const conta of contas) {
    try {
      const idx = await indice(conta);
      const pares = [];
      lote.filter((x) => x.conta === conta).forEach(({ path, v }) => {
        idx[path] = { em: v.em, n: v.texto.length };
        pares.push([itemKey(conta, path), JSON.stringify(v)]);
      });
      // Limpeza: tira o que tem mais de 7 dias e, se passar do limite, o mais antigo primeiro.
      const tirar = [];
      const velho = Date.now() - DISCO_DIAS * 86400000;
      let lista = Object.keys(idx).map((p) => ({ p, ...idx[p] }));
      lista.filter((x) => !x.em || x.em < velho).forEach((x) => tirar.push(x.p));
      lista = lista.filter((x) => x.em && x.em >= velho).sort((a, b) => b.em - a.em);
      let total = 0;
      lista.forEach((x, i) => {
        total += x.n || 0;
        if (i >= DISCO_ITENS || total > DISCO_TOTAL) tirar.push(x.p);
      });
      tirar.forEach((p) => delete idx[p]);
      const fora = new Set(tirar);
      await AsyncStorage.multiSet([...pares.filter(([k]) => !fora.has(k.slice(k.indexOf('|') + 1))), [indiceKey(conta), JSON.stringify(idx)]]);
      if (tirar.length) await AsyncStorage.multiRemove(tirar.map((p) => itemKey(conta, p)));
    } catch (e) {}
  }
}
function lembrar(path, etag, texto) {
  const k = memoKey(path);
  const v = { etag, texto, em: Date.now() };
  memo.delete(k);
  memo.set(k, v);
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value);
  agendarGravacao(path, v);
}
// Apaga do aparelho a cópia de uma conta (ao sair dela).
async function apagarCopia(conta) {
  [...memo.keys()].forEach((k) => k.startsWith(conta + ' ') && memo.delete(k));
  [...procurados].forEach((k) => k.startsWith(conta + ' ') && procurados.delete(k));
  [...paraGravar.keys()].forEach((k) => k.startsWith(conta + ' ') && paraGravar.delete(k));
  const idx = await indice(conta);
  await AsyncStorage.multiRemove([indiceKey(conta), ...Object.keys(idx).map((p) => itemKey(conta, p))]).catch(() => {});
  indices.delete(conta);
}
// Última resposta guardada (do disco ou desta vez que o app está aberto), para mostrar na hora.
export async function respostaGuardada(path) {
  await doDisco(path);
  const m = memo.get(memoKey(path));
  if (!m) return null;
  try {
    return JSON.parse(m.texto);
  } catch (e) {
    return null;
  }
}

async function raw(method, path, body, headers = {}) {
  let res;
  const leitura = method === 'GET';
  if (leitura) await doDisco(path);
  const guardada = leitura ? memo.get(memoKey(path)) : null;
  // Sem resposta em 25 s (60 s para envio de arquivo): para de esperar e avisa, em vez de ficar
  // carregando para sempre.
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  // Arquivo grande (WAV de estúdio, vídeo): 60 s + 2 s por MB, para dar tempo no 4G.
  const limite = setTimeout(() => ctl && ctl.abort(), body instanceof ArrayBuffer ? 60000 + Math.round(body.byteLength / 1048576) * 2000 : 25000);
  try {
    res = await fetch(API_URL + path, {
      signal: ctl ? ctl.signal : undefined,
      method,
      headers: { ...(body !== undefined && !(body instanceof ArrayBuffer) ? { 'Content-Type': 'application/json' } : {}), ...headers, ...(accessToken && path !== '/auth/refresh' ? { Authorization: `Bearer ${accessToken}` } : {}), ...(guardada && guardada.etag ? { 'If-None-Match': guardada.etag } : {}) },
      body: body === undefined ? undefined : body instanceof ArrayBuffer ? body : JSON.stringify(body),
    });
  } catch (e) {
    clearTimeout(limite);
    const demorou = e && e.name === 'AbortError';
    // Sem internet (ou tão fraca que nada chega): o aviso do topo aparece e as telas passam a usar a cópia.
    marcarOffline();
    throw new ApiError(0, demorou ? 'O Realyz demorou para responder. Tente de novo.' : 'Sem conexão com o Realyz. Confira sua internet.', demorou ? 'demorou' : 'sem_conexao');
  }
  marcarOnline();
  // Nada mudou desde a última vez: usa o que o aparelho já tem.
  if (res.status === 304 && guardada) {
    clearTimeout(limite);
    lembrar(path, guardada.etag, guardada.texto);
    return JSON.parse(guardada.texto);
  }
  const texto = await res.text().catch(() => '');
  clearTimeout(limite);
  let data = {};
  try {
    data = texto ? JSON.parse(texto) : {};
  } catch (e) {}
  const etag = res.ok && leitura && res.headers && res.headers.get ? res.headers.get('ETag') : null;
  if (res.ok && leitura && texto) lembrar(path, etag, texto);
  // O servidor recusou por falta de biometria: o app abre o aviso "Biometria não cadastrada".
  if (!res.ok && data.code === 'biometria' && bioBlocked) bioBlocked();
  if (!res.ok && data.code === 'biometria_prazo' && prazoBio) prazoBio();
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
    // Não apaga o acesso atual antes de ter o novo: os outros pedidos continuam com login enquanto renova.
    const d = await raw('POST', '/auth/refresh', { sessionToken });
    guardarAcesso(d.accessToken, d.expiresIn);
    return d.user;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// Chamada à API. Se o acesso expirou, renova e tenta mais uma vez.
// Várias telas pedindo a mesma leitura ao mesmo tempo (abrir o app, trocar de aba): vai um pedido só.
const emVoo = new Map();
export function api(method, path, body, headers) {
  if (method !== 'GET' || headers) return apiDireto(method, path, body, headers);
  const k = memoKey(path);
  const ja = emVoo.get(k);
  if (ja) return ja;
  const p = apiDireto(method, path).finally(() => emVoo.delete(k));
  emVoo.set(k, p);
  return p;
}
// Leitura com cópia guardada no aparelho:
//  - sem internet: devolve a cópia na hora (a tela abre e os botões funcionam, sem ficar parada);
//  - com internet, mas o servidor demorou mais de 3,5 s: mostra a cópia e deixa a busca terminar por
//    trás (a resposta nova fica guardada e aparece na próxima atualização da tela);
//  - com internet boa: a resposta nova, como sempre.
const ESPERA_COM_COPIA = 3500;
async function apiDireto(method, path, body, headers) {
  if (method === 'GET' && !headers && !path.startsWith('/auth/')) {
    await doDisco(path);
    const g = memo.get(memoKey(path));
    if (g) {
      const copia = () => JSON.parse(g.texto);
      if (!estaOnline()) {
        testarAgora();
        return copia();
      }
      const pedido = pedirServidor(method, path, body, headers);
      return new Promise((ok, falha) => {
        let feito = false;
        const t = setTimeout(() => {
          if (feito) return;
          feito = true;
          ok(copia());
        }, ESPERA_COM_COPIA);
        pedido.then(
          (d) => {
            clearTimeout(t);
            if (!feito) (feito = true), ok(d);
          },
          (e) => {
            clearTimeout(t);
            if (feito) return;
            feito = true;
            if (e.status === 0) ok(copia());
            else falha(e);
          }
        );
      });
    }
  }
  return pedirServidor(method, path, body, headers);
}
async function pedirServidor(method, path, body, headers) {
  const auth = path.startsWith('/auth/');
  // Renovação em andamento ou acesso ainda não carregado (app acabou de abrir): espera o login antes
  // de pedir, em vez de mandar o pedido sem login e levar "sessão expirada".
  // Acesso quase vencendo: renova antes, em vez de levar "sessão expirada" e pedir tudo de novo.
  if (!auth) await garantirAcesso();
  const tentar = async () => {
    try {
      return await raw(method, path, body, headers);
    } catch (e) {
      // Ligação velha com o servidor morreu (ex.: servidor reiniciou na atualização): o celular abre
      // uma nova na segunda tentativa. Só repete leitura (GET), para nunca duplicar um envio.
      // Aceitar, adicionar ou recusar amizade também repete: mandar duas vezes dá no mesmo.
      if (e.status === 0 && (method === 'GET' || /^\/friends\/[^/?]+$/.test(path))) return raw(method, path, body, headers);
      throw e;
    }
  };
  try {
    return await tentar();
  } catch (e) {
    if (e.status !== 401 || auth) throw e;
    await refresh();
    return tentar();
  }
}

// ── Ações feitas sem internet (fila) ──
// Curtir, seguir, reagir... sem internet: o app mostra a mudança na hora (como o Instagram), guarda o
// pedido no aparelho e envia sozinho quando a internet voltar, na ordem em que foram feitos.
// Só para ações simples que podem esperar. Pagamento, compra, pedido, Pix e mensagens NÃO entram aqui:
// esses continuam avisando "Sem conexão" para a pessoa saber que não foi.
// alternar: ação de liga/desliga (curtir, seguir). Fazer duas vezes sem internet = não fazer nada,
// então as duas saem da fila em vez de irem as duas para o servidor.
const filaKey = (conta = sessionKey) => `realys.fila.${conta}`;
const FILA_MAX = 100;
const FILA_DIAS = 3; // ação esperando há mais que isso é descartada (já não faz sentido)
const ouvintesFila = new Set();
let tamanhoFila = 0;
export const pendentes = () => tamanhoFila;
export function onFila(fn) {
  ouvintesFila.add(fn);
  return () => ouvintesFila.delete(fn);
}
const avisarFila = (enviou) => ouvintesFila.forEach((fn) => { try { fn(tamanhoFila, enviou); } catch (e) {} });
const lerFila = (conta) => AsyncStorage.getItem(filaKey(conta)).then((t) => JSON.parse(t || '[]') || []).catch(() => []);
const gravarFila = (conta, l) => AsyncStorage.setItem(filaKey(conta), JSON.stringify(l)).catch(() => {});
let mexendoFila = Promise.resolve();
const naFila = (fn) => (mexendoFila = mexendoFila.then(fn, fn));

function enfileirar(method, path, body, alternar) {
  const conta = sessionKey;
  return naFila(async () => {
    let l = await lerFila(conta);
    const igual = (x) => x.method === method && x.path === path && JSON.stringify(x.body || null) === JSON.stringify(body || null);
    const i = alternar ? l.findIndex(igual) : -1;
    if (i >= 0) l.splice(i, 1);
    else l.push({ method, path, body, em: Date.now() });
    l = l.slice(-FILA_MAX);
    await gravarFila(conta, l);
    if (conta === sessionKey) tamanhoFila = l.length;
    avisarFila(false);
  });
}

// Tenta mandar agora; sem internet, entra na fila e devolve { pendente: true }.
export async function apiOuFila(method, path, body, { alternar = false } = {}) {
  if (!serverOn()) return api(method, path, body);
  if (!estaOnline()) {
    testarAgora();
    await enfileirar(method, path, body, alternar);
    return { pendente: true };
  }
  try {
    return await api(method, path, body);
  } catch (e) {
    // Só quando a ligação nem chegou ao servidor. Se demorou (pode ter chegado), avisa em vez de repetir.
    if (e.code !== 'sem_conexao') throw e;
    await enfileirar(method, path, body, alternar);
    return { pendente: true };
  }
}

// Internet voltou: manda o que ficou esperando. Erro do servidor (ex.: post apagado) descarta a ação;
// caiu a internet de novo no meio: para e continua na próxima vez.
let enviandoFila = false;
export function enviarFila() {
  if (enviandoFila || !serverOn() || !estaOnline()) return Promise.resolve();
  enviandoFila = true;
  const conta = sessionKey;
  return naFila(async () => {
    let l = await lerFila(conta);
    const limite = Date.now() - FILA_DIAS * 86400000;
    l = l.filter((x) => x.em >= limite);
    let enviou = 0;
    while (l.length && conta === sessionKey) {
      const x = l[0];
      try {
        await pedirServidor(x.method, x.path, x.body);
      } catch (e) {
        if (e.status === 0) break;
      }
      l.shift();
      enviou++;
      await gravarFila(conta, l);
    }
    await gravarFila(conta, l);
    if (conta === sessionKey) tamanhoFila = l.length;
    if (enviou) avisarFila(true);
  }).finally(() => (enviandoFila = false));
}
// Ao abrir o app (ou trocar de conta): quantas ações estão esperando, e manda se der.
export function prepararFila() {
  const conta = sessionKey;
  return lerFila(conta).then((l) => {
    if (conta !== sessionKey) return;
    tamanhoFila = l.length;
    avisarFila(false);
    if (l.length) enviarFila();
  });
}
onConexao((on) => on && enviarFila());
// Sem conexão: o app pergunta ao servidor se ele já responde (sem login, resposta pequena).
definirTeste(async () => {
  if (!serverOn()) return true;
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => ctl && ctl.abort(), 6000);
  try {
    const r = await fetch(API_URL + '/health', { signal: ctl ? ctl.signal : undefined });
    return !!r && r.status < 500;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(t);
  }
});

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

// Código do Google Authenticator digitado na tela de entrada (vai junto no próximo login).
let codigo2fa = null;
export const setCodigo2fa = (c) => (codigo2fa = c ? String(c).replace(/\D/g, '') : null);
export async function login(loginText, password, device = 'Android', aparelhoToken = null) {
  accessToken = null;
  const key = await deviceKey();
  const d = await raw('POST', '/auth/login', { login: loginText, password, device, deviceKey: key, aparelhoToken, codigo2fa: codigo2fa || undefined });
  setServerAccount(d.user && d.user.id);
  guardarAcesso(d.accessToken, d.expiresIn);
  await saveSession(d.sessionToken);
  return d.user;
}

// Link do titular (Pioneiros): entra na conta da empresa pelo link de uso único que chegou no WhatsApp.
export async function loginTitular(token, device = 'Link do titular') {
  accessToken = null;
  const d = await raw('POST', '/auth/titular', { token, device });
  setServerAccount(d.user && d.user.id);
  guardarAcesso(d.accessToken, d.expiresIn);
  await saveSession(d.sessionToken);
  return d.user;
}

// kind: 'pessoa' (CPF) ou 'empresa' (CNPJ)
export async function signup(data, device = 'Android') {
  accessToken = null;
  const d = await raw('POST', '/auth/signup', { ...data, device });
  setServerAccount(d.user && d.user.id);
  guardarAcesso(d.accessToken, d.expiresIn);
  await saveSession(d.sessionToken);
  return d.user;
}

export async function logout() {
  const sessionToken = await SecureStore.getItemAsync(sessionKey).catch(() => null);
  try {
    if (sessionToken) await api('POST', '/auth/logout', { sessionToken });
  } catch (e) {}
  accessToken = null;
  tokenExp = 0;
  // Saiu da conta: apaga do aparelho as respostas guardadas dela.
  await apagarCopia(sessionKey);
  await AsyncStorage.removeItem(filaKey()).catch(() => {});
  await SecureStore.deleteItemAsync(acessoKey()).catch(() => {});
  await SecureStore.deleteItemAsync(sessionKey).catch(() => {});
}

// Acesso atual (renova se precisar): para baixar um arquivo protegido (ex.: currículo).
export async function authToken() {
  await garantirAcesso().catch(() => {});
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
  let renovarWs = false;
  const open = async () => {
    if (stopped || paused || !appAtivo) return;
    try {
      if (renovarWs) await refresh();
      else await garantirAcesso();
      if (!accessToken) throw new Error('sem acesso');
      renovarWs = false;
    } catch (e) {
      return setTimeout(open, 15000);
    }
    let abriu = false;
    ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/ws?token=${accessToken}${Platform.OS === 'web' ? '' : `&app=${Platform.OS}`}`);
    ws.onopen = () => {
      abriu = true;
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
      // Só renova o login se a ligação nem chegou a abrir (acesso recusado). Queda comum (sinal, servidor
      // reiniciando) não apaga o login: apagar fazia a busca e outras telas irem sem login e travarem.
      if (!abriu) renovarWs = true;
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
