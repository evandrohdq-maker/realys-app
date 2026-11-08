// Vídeo do Realys: lives pelo servidor de vídeo próprio e chamadas de vídeo direto entre celulares.
//
// LIVES (muitas pessoas assistindo)
//   O streamer manda UM vídeo para o servidor de vídeo (MediaMTX, na VPS de vídeo) e o servidor
//   distribui para quem assiste. Só usuários do Realys logados assistem: cada pessoa recebe um passe
//   assinado (token) que vale só para aquela live e por pouco tempo. O MediaMTX pergunta ao Realys,
//   em POST /video/auth, se cada passe é válido antes de deixar transmitir ou assistir.
//   - POST /lives/:id/stream  → quem transmite pega o endereço de envio (WHIP) e o passe.
//   - GET  /lives/:id/watch   → quem assiste pega o endereço (WHEP, e HLS para o futuro) e o passe.
//
// CHAMADAS (1 para 1: consulta online, chamada entre amigos, atendimento de prestador)
//   O vídeo vai direto de um celular para o outro (WebRTC), sem passar pelo servidor. O Realys só
//   apresenta um celular ao outro (sinalização) e, quando a rede não deixa a ligação direta, entrega
//   um retransmissor (TURN, no mesmo servidor de vídeo) com senha que expira.
//   - GET /video-calls/ice, POST /video-calls, POST /video-calls/:id/answer, /signal, /end
//
// Sem servidor de vídeo configurado (VIDEO_URL vazio), as rotas avisam e o app segue no modo
// demonstração. Ver deploy/video/LEIA-ME.md e PENDENCIAS.md.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fail, newId, now, str } from '../http.js';

const b64u = (b) => Buffer.from(b).toString('base64url');
const sign = (secret, payload) => {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
function check(secret, token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const want = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp && p.exp > now() ? p : null;
  } catch (e) {
    return null;
  }
}

export default function videoRoutes(r, { db, cfg, hub, publicUser, userById }) {
  const on = () => !!(cfg.videoUrl && cfg.videoSecret);
  const off = () => fail(503, 'O servidor de vídeo ainda não foi contratado. As lives seguem no modo demonstração.', 'video_off');
  const base = () => cfg.videoUrl.replace(/\/$/, '');

  // Servidores para a ligação direta: STUN público e o TURN do Realys (senha temporária, padrão do coturn).
  const iceFor = (userId) => {
    const ice = [{ urls: ['stun:stun.l.google.com:19302'] }];
    if (cfg.turnUrl && cfg.turnSecret) {
      const username = `${Math.floor(now() / 1000) + 6 * 3600}:${userId}`;
      const credential = createHmac('sha1', cfg.turnSecret).update(username).digest('base64');
      ice.push({ urls: cfg.turnUrl.split(',').map((x) => x.trim()), username, credential });
    }
    return ice;
  };

  r.get('/video/status', () => ({ on: on(), calls: true, turn: !!(cfg.turnUrl && cfg.turnSecret) }), { auth: false });

  const liveOf = (id) => {
    const l = db.prepare('SELECT * FROM lives WHERE id = ?').get(id);
    if (!l) fail(404, 'Live não encontrada.');
    if (l.status !== 'ao_vivo') fail(410, 'Essa live já terminou.');
    return l;
  };
  const pathOf = (id) => `live/${id}`;

  // Quem transmite: endereço de envio + passe de 12 horas, só para a própria live.
  r.post('/lives/:id/stream', ({ params, user }) => {
    if (!on()) off();
    const l = liveOf(params.id);
    if (l.host_id !== user.id) fail(403, 'Só quem abriu a live pode transmitir nela.');
    const token = sign(cfg.videoSecret, { act: 'publish', path: pathOf(l.id), uid: user.id, exp: now() + 12 * 3600 * 1000 });
    return { whip: `${base()}/${pathOf(l.id)}/whip`, token, iceServers: iceFor(user.id), quality: cfg.videoQuality };
  });

  // Quem assiste: qualquer usuário logado; passe de 6 horas, só para essa live.
  r.get('/lives/:id/watch', ({ params, user }) => {
    if (!on()) off();
    const l = liveOf(params.id);
    const token = sign(cfg.videoSecret, { act: 'read', path: pathOf(l.id), uid: user.id, exp: now() + 6 * 3600 * 1000 });
    return { whep: `${base()}/${pathOf(l.id)}/whep`, hls: `${base()}/hls/${pathOf(l.id)}/index.m3u8?token=${encodeURIComponent(token)}`, token, iceServers: iceFor(user.id) };
  });

  // O MediaMTX pergunta aqui se pode deixar transmitir/assistir. A chave na URL prova que é ele.
  r.post(
    '/video/auth',
    ({ body, query }) => {
      if (!on() || !query || query.k !== cfg.videoSecret) fail(401, 'Não autorizado.');
      const b = body || {};
      const fromQuery = String(b.query || '').match(/(?:^|&)token=([^&]+)/);
      const token = b.token || b.password || (fromQuery ? decodeURIComponent(fromQuery[1]) : '');
      const p = check(cfg.videoSecret, token);
      const path = String(b.path || '').replace(/^\/+/, '');
      if (!p || p.path !== path) fail(401, 'Passe inválido ou vencido.');
      const action = String(b.action || '');
      if (action === 'publish') {
        if (p.act !== 'publish') fail(401, 'Esse passe é só para assistir.');
        const l = db.prepare('SELECT host_id, status FROM lives WHERE id = ?').get(path.replace(/^live\//, ''));
        if (!l || l.status !== 'ao_vivo' || l.host_id !== p.uid) fail(401, 'A live não está aberta.');
      } else if (!['read', 'playback'].includes(action) || !['read', 'publish'].includes(p.act)) fail(401, 'Ação não permitida.');
      return { ok: true };
    },
    { auth: false }
  );

  // ---------- Chamadas 1 para 1 ----------
  const calls = new Map(); // id -> { id, from, to, kind, status, at }
  const gc = () => {
    const t = now();
    for (const [id, c] of calls) if (t - c.at > 3 * 3600 * 1000 || (c.status === 'tocando' && t - c.at > 60000)) calls.delete(id);
  };
  const callOf = (id, userId) => {
    const c = calls.get(id);
    if (!c) fail(404, 'Chamada encerrada.');
    if (c.from !== userId && c.to !== userId) fail(403, 'Você não está nessa chamada.');
    return c;
  };
  const other = (c, userId) => (c.from === userId ? c.to : c.from);

  r.get('/video-calls/ice', ({ user }) => ({ iceServers: iceFor(user.id) }));

  r.post('/video-calls', ({ body, user }) => {
    gc();
    const to = str(body.to, 'para quem é a chamada', { max: 64 });
    if (!to || to === user.id) fail(400, 'Para quem é a chamada?');
    if (!userById(to)) fail(404, 'Pessoa não encontrada.');
    const c = { id: newId('call'), from: user.id, to, kind: body.kind === 'audio' ? 'audio' : 'video', status: 'tocando', at: now() };
    calls.set(c.id, c);
    hub.send(to, 'call', { id: c.id, kind: c.kind, from: publicUser(userById(user.id)) });
    return { id: c.id, iceServers: iceFor(user.id), online: hub.online(to) };
  });

  r.post('/video-calls/:id/answer', ({ params, body, user }) => {
    const c = callOf(params.id, user.id);
    if (c.to !== user.id) fail(403, 'Só quem recebeu pode atender.');
    c.status = body.accept ? 'em_andamento' : 'recusada';
    c.at = now();
    hub.send(c.from, 'call-answer', { id: c.id, accept: !!body.accept });
    if (!body.accept) calls.delete(c.id);
    return { id: c.id, status: c.status, iceServers: iceFor(user.id) };
  });

  // Sinalização: oferta, resposta e caminhos de rede (ICE) passam daqui para o outro celular.
  r.post('/video-calls/:id/signal', ({ params, body, user }) => {
    const c = callOf(params.id, user.id);
    const data = body && body.data;
    if (!data || JSON.stringify(data).length > 20000) fail(400, 'Sinal inválido.');
    hub.send(other(c, user.id), 'call-signal', { id: c.id, data });
    return { ok: true };
  });

  r.post('/video-calls/:id/end', ({ params, user }) => {
    const c = callOf(params.id, user.id);
    calls.delete(c.id);
    hub.send(other(c, user.id), 'call-end', { id: c.id });
    return { ok: true };
  });
}
