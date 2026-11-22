// Notificações com o app fechado, pelo Firebase Cloud Messaging (API HTTP v1).
// O app manda o código do aparelho (POST /push/token). Quando um aviso sai pelo Hub (WebSocket) e a
// pessoa não está com o app aberto, ele vira notificação no celular.
//
// Configuração no servidor (.env), com a chave da conta de serviço do Firebase
// (Console › Configurações do projeto › Contas de serviço › Gerar nova chave privada):
//   FIREBASE_SERVICE_ACCOUNT=/opt/realys/firebase-conta-servico.json
// Sem a chave, as notificações ficam desligadas e o resto funciona normalmente.
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { now } from './http.js';

// Texto de cada aviso. go: tela que abre ao tocar na notificação ({ tab, seg... } ou { chat } para a conversa).
const short = (s, n = 90) => (String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || ''));
const brl = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
export const AVISOS = {
  message: (d) => ({ title: d.fromName || 'Nova mensagem', body: short(d.text), go: { chat: { userId: d.from, name: d.fromName || '' } } }),
  call: (d) => ({ title: 'Chamado de serviço', body: `${d.client || 'Cliente'} · ${d.service || ''} · ${d.status || 'novo'}`, go: { tab: 'pedidos', seg: 'servicos' } }),
  order: (d) => ({ title: 'Pedido', body: d.status ? `Seu pedido está: ${d.status}` : 'Você recebeu um pedido novo', go: { tab: 'pedidos' } }),
  payment: (d) => ({ title: 'Pagamento recebido 💰', body: `${brl(d.amount)}${d.from ? ` de ${d.from}` : ''}`, go: { tab: 'perfil' } }),
  gift: (d) => ({ title: 'Você ganhou um presente 🎁', body: d.fromName ? `De ${d.fromName}` : 'Abra a carteira para ver', go: { tab: 'perfil' } }),
  friend_request: (d) => ({ title: 'Pedido de amizade', body: `${d.fromName || d.name || 'Alguém'} quer ser seu amigo no Realyz`, go: { tab: 'stories' } }),
  friend_accepted: (d) => ({ title: 'Amizade aceita', body: `${d.name || d.fromName || 'Seu amigo'} aceitou o seu pedido`, go: { tab: 'stories' } }),
  'live-favorito': (d) => ({ title: 'Ao vivo agora 🔴', body: `${d.hostName || d.name || 'Seu favorito'} entrou ao vivo`, go: { tab: 'stories', top: 'lives' } }),
  show: (d) => ({
    title: d.lado === 'artista' ? 'Pedido de show 🎤' : `Show · ${d.artista || 'artista'}`,
    body: d.lado === 'artista' ? `${d.cliente || 'Alguém'} quer te contratar${d.data ? ` para ${d.data.split('-').reverse().join('/')}` : ''}` : `Seu pedido está: ${d.status}`,
    go: d.lado === 'artista' ? { tab: 'perfil' } : { tab: 'pedidos', seg: 'shows' },
  }),
  show_msg: (d) => ({ title: d.fromName || 'Mensagem do show', body: short(d.text), go: { tab: 'pedidos', seg: 'shows' } }),
  ticket: () => ({ title: 'Ingresso confirmado 🎟️', body: 'Seu ingresso está em Pedidos', go: { tab: 'pedidos', seg: 'ingressos' } }),
  testimonial: (d) => ({ title: 'Novo depoimento', body: `${d.fromName || 'Alguém'} deixou um depoimento para você aprovar`, go: { tab: 'perfil' } }),
  music_sale: (d) => ({ title: 'Música vendida 🎶', body: d.title ? `"${d.title}" foi comprada` : 'Alguém comprou sua música', go: { tab: 'perfil' } }),
  vaga_indicada: (d) => ({ title: 'Vaga que combina com você 💼', body: `${d.titulo}${d.empresa ? ` · ${d.empresa}` : ''}${d.pct ? ` · ${d.pct}% compatível` : ''}`, go: { tab: 'vagas', seg: 'vagas' } }),
  vaga_sugerida: (d) => ({ title: `Tem vaga de ${d.funcao || 'trabalho'} perto de você`, body: `${d.titulo}. Ative seu currículo em 1 toque e receba as indicações.`, go: { tab: 'vagas', seg: 'vagas' } }),
  vaga_convite: (d) => ({ title: 'Convite para vaga 💼', body: `${d.empresa || 'Uma empresa'} te convidou: ${d.titulo}`, go: { tab: 'vagas', seg: 'minhas' } }),
  candidatura: (d) => ({ title: d.convite ? 'Convite aceito' : 'Nova candidatura', body: `${d.nome || 'Alguém'} · ${d.titulo}`, go: { tab: 'rh' } }),
  candidatura_status: (d) => ({ title: 'Sua candidatura', body: `${d.titulo}: ${({ vista: 'vista pela empresa', entrevista: 'entrevista marcada', contratado: 'você foi contratado! 🎉', recusado: 'não seguiu desta vez' })[d.status] || d.status}`, go: { tab: 'vagas', seg: 'minhas' } }),
  deposit: (d) => ({ title: 'Depósito confirmado', body: `${brl(d.amount)} na sua carteira`, go: { tab: 'perfil' } }),
};

export function makePush({ db, cfg }) {
  let conta = cfg.firebaseServiceAccount || null;
  if (typeof conta === 'string') {
    try {
      conta = JSON.parse(conta.trim().startsWith('{') ? conta : readFileSync(conta, 'utf8'));
    } catch (e) {
      console.error('[push] chave do Firebase não carregou:', e.message);
      conta = null;
    }
  }
  const doFetch = cfg.pushFetch || globalThis.fetch;
  const ligado = !!(conta && conta.client_email && conta.private_key && conta.project_id);
  let token = null;

  // Token de acesso do Google (JWT assinado com a chave da conta de serviço, vale 1 hora).
  async function accessToken() {
    if (token && token.exp > now() + 60000) return token.value;
    const iat = Math.floor(now() / 1000);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: conta.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })}`;
    const sig = createSign('RSA-SHA256').update(unsigned).sign(conta.private_key, 'base64url');
    const res = await doFetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${unsigned}.${sig}`,
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error_description || j.error || 'token do Google recusado');
    token = { value: j.access_token, exp: now() + (j.expires_in || 3600) * 1000 };
    return token.value;
  }

  const tokensOf = (userId) => db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(userId).map((r) => r.token);

  // Manda para todos os aparelhos da pessoa. Código vencido (app desinstalado) é apagado.
  async function send(userId, { title, body, go }) {
    if (!ligado) return 0;
    const list = tokensOf(userId);
    if (!list.length) return 0;
    const at = await accessToken();
    let ok = 0;
    for (const t of list) {
      const res = await doFetch(`https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: t,
            notification: { title: short(title, 60), body: short(body, 160) },
            data: { go: JSON.stringify(go || {}) },
            android: { priority: 'high', notification: { channel_id: 'realyz', color: '#B8860B', sound: 'default' } },
          },
        }),
      }).catch(() => null);
      if (res && res.ok) ok++;
      else if (res && (res.status === 404 || res.status === 400)) {
        const j = await res.json().catch(() => ({}));
        const code = JSON.stringify(j);
        if (/UNREGISTERED|INVALID_ARGUMENT|registration-token-not-registered/.test(code)) db.prepare('DELETE FROM push_tokens WHERE token = ?').run(t);
      }
    }
    return ok;
  }

  // Chamado pelo Hub quando a pessoa não está com o app aberto.
  function aviso(userId, type, data) {
    const f = AVISOS[type];
    if (!f || !ligado) return;
    let msg;
    try {
      msg = f(data || {});
    } catch (e) {
      return;
    }
    send(userId, msg).catch((e) => console.error('[push]', e.message));
  }

  return { ligado, send, aviso, tokensOf };
}
