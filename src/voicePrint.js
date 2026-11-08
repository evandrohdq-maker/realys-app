// Voz do titular: a Lotus só atende o dono da conta.
// - Cadastro: ao ligar o "abrir Lotus", o titular grava frases curtas (src/components/VoiceEnroll.js).
// - Uso: quando a Lotus é chamada FALANDO ("abrir Lotus"), a voz é comparada com a do titular antes de
//   ela fazer qualquer coisa, e os pedidos falados dessa conversa também. Voz de outra pessoa (ou da
//   própria Lotus, captada pelo microfone) é ignorada.
//   Quem TOCA no botão da Lotus está com o celular na mão: aí ela atende qualquer voz.
// - Aprende com o uso: pedidos aceitos com folga ensinam mais um pouco da voz do titular.
//
// Privacidade (LGPD, dado biométrico): fica SÓ neste celular, no cofre criptografado do Android
// (SecureStore), separado por conta. Não guarda gravação, só a assinatura (números). Nunca vai para
// o servidor. O titular apaga quando quiser (Perfil > Voz do titular).
//
// Precisa de Android 13 ou mais novo (é a partir dele que o reconhecimento de voz entrega o áudio).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { wavInfo, wavSamples, voiceVector, buildModel, compare, phraseSeq, allSeq, buildWake, compareWake, learnFrom } from './voicePrintCore';

export const voicePrintSupported = () => Platform.OS === 'android' && Number(Platform.Version) >= 33;

const keyOf = (userId) => 'realys_voz_' + String(userId || 'me').replace(/[^A-Za-z0-9._-]/g, '_');

let current = { userId: null, store: null, model: null, wake: null };
const listeners = new Set();
export const onVoicePrintChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const notify = () => listeners.forEach((fn) => fn(current.store));

function rebuild(store) {
  current.store = store;
  current.model = store ? buildModel([...(store.vecs || []), ...(store.learned || [])]) : null;
  current.wake = store ? buildWake(store.wake) : null;
  notify();
}

// Carrega a voz do titular desta conta (chamado ao entrar na conta).
export async function loadVoicePrint(userId) {
  current.userId = userId;
  try {
    const raw = await SecureStore.getItemAsync(keyOf(userId));
    rebuild(raw ? JSON.parse(raw) : null);
  } catch (e) {
    rebuild(null);
  }
  return current.store;
}

async function save(store) {
  rebuild(store);
  try {
    await SecureStore.setItemAsync(keyOf(current.userId), JSON.stringify(store));
  } catch (e) {}
}

export const voicePrintOf = () => current.store;
// A verificação está valendo? (tem cadastro, o titular deixou ligada e o celular entrega o áudio)
export const voiceGateOn = () => !!(current.store && current.store.on !== false && current.model && voicePrintSupported());

export async function saveEnrollment({ wake, vecs, trato, phrases }) {
  await save({ version: 1, on: true, wake, vecs, trato: trato || null, phrases: phrases || null, learned: [], createdAt: Date.now(), checks: [] });
}
// Frase de confirmação e frase de segurança (coação): só existem com a voz do dono cadastrada.
export const phrasesOf = () => (current.store && current.store.phrases) || null;
// Pergunta de segurança completa (pergunta + resposta que libera + resposta de segurança), ou null.
export const securityQuestion = () => {
  const q = current.store && current.store.phrases;
  return q && q.question && q.allow && q.duress ? q : null;
};
export async function setPhrases(phrases) {
  if (current.store) await save({ ...current.store, phrases });
}
// Como a Lotus chama o titular: só existe com a voz do dono cadastrada.
export const tratoOf = () => (current.store && current.store.trato) || null;
export async function setTrato(trato) {
  if (current.store) await save({ ...current.store, trato });
}
export async function setVoiceGate(on) {
  if (current.store) await save({ ...current.store, on });
}
export async function deleteVoicePrint() {
  current.store = null;
  rebuild(null);
  try {
    await SecureStore.deleteItemAsync(keyOf(current.userId));
  } catch (e) {}
}

// Opções do reconhecimento de voz para o celular entregar o áudio (um arquivo por uso, sobrescrito).
export const recordingFor = (name) => (voicePrintSupported() ? { recordingOptions: { persist: true, outputFileName: `lotus-${name}.wav` } } : {});

export function deleteAudio(uri) {
  try {
    if (uri) new File(uri).delete();
  } catch (e) {}
}

// Lê o áudio: só o trecho que interessa (lastSec = últimos segundos; fromSec = a partir de).
export async function readAudio(uri, { fromSec = 0, lastSec = 0 } = {}) {
  if (!uri) return null;
  try {
    const bytes = await new File(uri).bytes();
    const info = wavInfo(bytes);
    if (!info) return null;
    const dur = (bytes.length - info.dataStart) / (info.rate * 2 * Math.max(1, info.channels));
    const from = lastSec ? Math.max(fromSec, dur - lastSec) : fromSec;
    return wavSamples(bytes, info, from);
  } catch (e) {
    return null;
  }
}

// Análise de uma gravação do cadastro.
export async function enrollSample(uri, isWake) {
  const audio = await readAudio(uri, { lastSec: 8 });
  deleteAudio(uri);
  if (!audio) return null;
  const vec = voiceVector(audio);
  const seq = isWake ? phraseSeq(audio) : null;
  if (!vec || (isWake && !seq)) return null;
  return { vec, seq };
}

// Guarda as últimas verificações (só o resultado, para calibrar e mostrar no Perfil).
let lastCheck = null;
export const lastVoiceCheck = () => lastCheck;
function remember(kind, r) {
  lastCheck = { kind, ok: r.ok, d: r.d, limit: r.limit, reason: r.reason, at: Date.now() };
  notify();
}

async function learn(vec, r) {
  const next = learnFrom(current.store, vec, r);
  if (next) await save(next);
}

// "abrir Lotus": confere a frase exata (jeito de falar) + o timbre + o tom.
// { ok: true | false, skipped? }. Sem áudio (celular não entregou) não bloqueia o titular.
export async function verifyWake(uri) {
  if (!voiceGateOn()) return { ok: true, skipped: 'desligada' };
  const audio = await readAudio(uri, { lastSec: 7 });
  deleteAudio(uri);
  if (!audio) return { ok: true, skipped: 'sem áudio' };
  const vec = voiceVector(audio);
  if (!vec) return { ok: true, skipped: 'sem voz' };
  const timbre = compare(current.model, vec);
  const frase = current.wake ? compareWake(current.wake, allSeq(audio)) : { ok: null };
  // Tom muito diferente recusa na hora. Com a frase cadastrada, ela decide (com o timbre de apoio);
  // sem ela, vale o timbre.
  let ok;
  if (timbre.reason === 'tom de voz diferente') ok = false;
  else if (frase.ok != null) ok = frase.ok && timbre.d <= timbre.limit * 1.4;
  else ok = timbre.ok;
  const r = { ok, d: frase.d != null ? frase.d : timbre.d, limit: frase.limit != null ? frase.limit : timbre.limit, reason: ok ? 'voz do titular' : frase.ok === false ? frase.reason : timbre.reason };
  remember('abrir Lotus', r);
  if (ok) learn(vec, timbre);
  return r;
}

// Pedido falado com a caixa aberta (ou interrompendo a Lotus): confere timbre e tom.
// fromSec: só a parte depois que a pessoa começou a falar (sem a voz da Lotus).
export async function verifySpeech(uri, fromSec = 0) {
  if (!voiceGateOn()) return { ok: true, skipped: 'desligada' };
  const audio = await readAudio(uri, { fromSec, lastSec: 7 });
  deleteAudio(uri);
  if (!audio) return { ok: true, skipped: 'sem áudio' };
  const vec = voiceVector(audio);
  // Pedido curtinho ("sim", "não") quase não tem voz para medir: aí só o tom decide.
  if (!vec) return { ok: true, skipped: 'curto demais' };
  // Frase de pedido é mais curta e variada que as do cadastro: um pouco mais de folga no timbre.
  const c = compare(current.model, vec);
  const r = c.reason === 'tom de voz diferente' ? c : { ...c, limit: Math.round(c.limit * 125) / 100, ok: c.d <= c.limit * 1.25 };
  if (r.ok !== c.ok) r.reason = r.ok ? 'voz do titular' : 'timbre diferente';
  remember('pedido', r);
  if (r.ok) learn(vec, r);
  return r;
}

export const REJECT_TEXT = 'Não reconheci a voz do titular desta conta. Se for você, toque na flor e fale de novo.';
