// Chave de segurança do motorista (e de qualquer prestador): com o Re@lys aberto, ele diz "Lotus" e a
// frase secreta que ele mesmo escolheu. A Lotus NÃO abre, não mostra nada na tela e responde só um
// "Certo" (para quem está no carro não perceber). Em silêncio, ela:
//   1. registra o alerta com a localização do GPS e os dados da corrida (passageiro, placa, endereço)
//      no painel de segurança do Re@lys (administrador);
//   2. liga para a Polícia Militar (190; no Rio Grande do Sul, a Brigada Militar), se ele deixou ligado.
//
// A frase deve parecer um pedido comum ("Lotus, toca a playlist da viagem"), nunca "socorro".
// Ela fica só no celular, no cofre criptografado do Android, separada por conta.
// A chave vale mesmo se a voz não for reconhecida como a do titular: em perigo, nada pode travar.
import * as SecureStore from 'expo-secure-store';
import { findCall } from './wakeMatch';

const keyOf = (userId) => 'realys_chave_' + String(userId || 'me').replace(/[^A-Za-z0-9._-]/g, '_');

export const PANIC_EXAMPLES = ['toca a playlist da viagem', 'como está o trânsito na serra', 'qual a previsão do tempo amanhã', 'lembra de comprar pão'];

let current = { userId: null, cfg: null };
const listeners = new Set();
export const onPanicChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export async function loadPanic(userId) {
  current.userId = userId;
  try {
    const raw = await SecureStore.getItemAsync(keyOf(userId));
    current.cfg = raw ? JSON.parse(raw) : null;
  } catch (e) {
    current.cfg = null;
  }
  listeners.forEach((fn) => fn(current.cfg));
  return current.cfg;
}

export const panicConfig = () => current.cfg;

export async function savePanic(cfg) {
  current.cfg = cfg;
  listeners.forEach((fn) => fn(cfg));
  try {
    if (cfg) await SecureStore.setItemAsync(keyOf(current.userId), JSON.stringify(cfg));
    else await SecureStore.deleteItemAsync(keyOf(current.userId));
  } catch (e) {}
}

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
const STOP = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'e', 'um', 'uma', 'pra', 'para', 'na', 'no']);
const sameWord = (a, b) => a === b || (a.length > 4 && b.length > 4 && (a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5))));

// A frase precisa ter pelo menos 3 palavras de verdade (para não disparar por acaso).
export function phraseOk(phrase) {
  const w = words(phrase).filter((x) => !STOP.has(x) && x !== 'lotus');
  return w.length >= 3;
}

// Falou "Lotus" + a frase secreta? As palavras principais da frase (sem "a", "de", "pra"...)
// precisam vir todas, na ordem, depois do "Lotus". Palavras pequenas que o celular erra não contam.
export function isPanic(text, cfg = current.cfg) {
  if (!cfg || !cfg.phrase || cfg.on === false) return false;
  const call = findCall(text);
  if (!call) return false;
  const got = words(call.rest);
  const want = words(cfg.phrase).filter((x) => x !== 'lotus' && !STOP.has(x));
  if (want.length < 3) return false;
  let i = 0;
  for (const w of want) {
    const k = got.findIndex((g, j) => j >= i && sameWord(g, w));
    if (k < 0) return false;
    i = k + 1;
  }
  return true;
}

export const isPanicAny = (texts) => (texts || []).some((t) => isPanic(t));
