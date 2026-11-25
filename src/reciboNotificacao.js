// Recibo de entrega com o app fechado (2ª pétala, como no WhatsApp).
//
// Quando chega uma mensagem e o Realyz está fechado, o servidor manda pelo Google (Firebase) a
// notificação normal (o Android mostra sozinho) e um aviso silencioso { tipo: 'recibo', m, u, r }.
// O Android acorda o Realyz por um instante só para esta tarefa: ele responde ao servidor "chegou"
// (POST /messages/recibo, sem login: vale a assinatura r) e volta a dormir. Nada aparece na tela.
//
// Precisa ser carregado antes do app (index.js), porque com o app fechado só esta parte roda.
import { Platform } from 'react-native';

export const TAREFA_RECIBO = 'realyz-recibo-entrega';
let pronto = false;

// O formato do aviso muda conforme a versão do Android e da biblioteca: procura o recibo onde estiver.
function acharRecibo(x, fundo = 0) {
  if (!x || fundo > 5) return null;
  if (typeof x === 'string') {
    if (!x.includes('recibo')) return null;
    try {
      return acharRecibo(JSON.parse(x), fundo + 1);
    } catch (e) {
      return null;
    }
  }
  if (typeof x !== 'object') return null;
  if (x.tipo === 'recibo' && x.m && x.u && x.r) return { m: String(x.m), u: String(x.u), r: String(x.r) };
  for (const k of Object.keys(x)) {
    const achou = acharRecibo(x[k], fundo + 1);
    if (achou) return achou;
  }
  return null;
}
export const ehRecibo = (conteudo) => !!acharRecibo(conteudo);

async function responder(rec) {
  const { API_URL } = require('./api');
  if (!API_URL) return;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(API_URL + '/messages/recibo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
      if (res.ok || res.status === 403 || res.status === 404) return;
    } catch (e) {}
    await new Promise((ok) => setTimeout(ok, 1500));
  }
}

if (Platform.OS === 'android') {
  try {
    const TaskManager = require('expo-task-manager');
    TaskManager.defineTask(TAREFA_RECIBO, async ({ data, error }) => {
      if (error) return;
      const rec = acharRecibo(data);
      if (rec) await responder(rec);
    });
    pronto = true;
  } catch (e) {
    pronto = false;
  }
}

// Liga a tarefa (chamado ao registrar as notificações). true = este aparelho já sabe mandar o recibo.
export async function ligarRecibo() {
  if (!pronto || Platform.OS !== 'android') return false;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.registerTaskAsync(TAREFA_RECIBO);
    return true;
  } catch (e) {
    return false;
  }
}
