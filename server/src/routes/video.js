// Vídeo do Realyz: lives pelo servidor de vídeo próprio e chamadas de vídeo direto entre celulares.
//
// LIVES (muitas pessoas assistindo)
//   O streamer manda UM vídeo para o servidor de vídeo (MediaMTX, na VPS de vídeo) e o servidor
//   distribui para quem assiste. Só usuários do Realyz logados assistem: cada pessoa recebe um passe
//   assinado (token) que vale só para aquela live e por pouco tempo. O MediaMTX pergunta ao Realyz,
//   em POST /video/auth, se cada passe é válido antes de deixar transmitir ou assistir.
//   - POST /lives/:id/stream  → quem transmite pega o endereço de envio (WHIP) e o passe.
//   - GET  /lives/:id/watch   → quem assiste pega o endereço (WHEP, e HLS para o futuro) e o passe.
//
// CHAMADAS (1 para 1: consulta online, chamada entre amigos, atendimento de prestador)
//   O vídeo vai direto de um celular para o outro (WebRTC), sem passar pelo servidor. O Realyz só
//   apresenta um celular ao outro (sinalização) e, quando a rede não deixa a ligação direta, entrega
//   um retransmissor (TURN, no mesmo servidor de vídeo) com senha que expira.
//   - GET /video-calls/ice, POST /video-calls, POST /video-calls/:id/answer, /signal, /end
//
// Sem servidor de vídeo configurado (VIDEO_URL vazio), as rotas avisam e o app segue no modo
// demonstração. Ver deploy/video/LEIA-ME.md e PENDENCIAS.md.
import { makeImageModerator } from '../moderacaoImagem.js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fail, newId, now, str } from '../http.js';
import { dateSubOf } from './date.js';

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

// Lives: a cada LIVE_CHECK_SEC segundos, o servidor tira 2 quadros de cada live no ar (pelo RTSP local do
// MediaMTX) e pergunta à IA de moderação. Nudez com certeza = a live é encerrada na hora e o criador avisado;
// dúvida = fica registrada para a equipe olhar. Precisa do serviço de moderação e do ffmpeg no servidor.
export function makeLiveMonitor({ db, cfg, hub, mod }) {
  const check = async (l) => {
    const path = `live/${l.id}`;
    const token = sign(cfg.videoSecret, { act: 'read', path, uid: 'moderacao', exp: now() + 120000 });
    const base = cfg.liveRtspBase.replace(/\/?$/, '/').replace('rtsp://', `rtsp://moderacao:${encodeURIComponent(token)}@`);
    const frames = await mod.grab(base + path, { count: 2, everySec: 1 });
    if (!frames.length) return null;
    const res = await mod.frames(frames);
    db.prepare('INSERT INTO moderacao_log (id, user_id, kind, ref, nudez, decisao, created_at) VALUES (?,?,?,?,?,?,?)').run(newId('ml'), l.host_id, 'live', l.id, res.nudez == null ? null : res.nudez, res.decisao, now());
    if (res.decisao === 'bloquear') {
      db.prepare(`UPDATE lives SET status = 'encerrada', ended_at = ? WHERE id = ? AND status = 'ao_vivo'`).run(now(), l.id);
      hub.send(l.host_id, 'live-encerrada', { id: l.id, motivo: 'Nudez não é permitida nas lives. A live foi encerrada pela moderação.' });
    }
    return res;
  };
  let timer = null;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for (const l of db.prepare(`SELECT id, host_id FROM lives WHERE status = 'ao_vivo'`).all()) await check(l).catch(() => null);
    } finally {
      busy = false;
    }
  };
  return {
    check,
    start() {
      if (timer || !mod.ready || !cfg.videoUrl || !cfg.videoSecret) return false;
      timer = setInterval(tick, Math.max(10, cfg.liveCheckSec || 20) * 1000);
      timer.unref();
      return true;
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}

export default function videoRoutes(r, { db, cfg, hub, publicUser, userById }) {
  const on = () => !!(cfg.videoUrl && cfg.videoSecret);
  const mod = cfg.imageModerator || makeImageModerator(cfg);
  const off = () => fail(503, 'O servidor de vídeo ainda não foi contratado. As lives seguem no modo demonstração.', 'video_off');
  const base = () => cfg.videoUrl.replace(/\/$/, '');

  // Servidores para a ligação direta: STUN público e o TURN do Realyz (senha temporária, padrão do coturn).
  const iceFor = (userId) => {
    const ice = [{ urls: ['stun:stun.l.google.com:19302'] }];
    if (cfg.turnUrl && cfg.turnSecret) {
      const username = `${Math.floor(now() / 1000) + 6 * 3600}:${userId}`;
      const credential = createHmac('sha1', cfg.turnSecret).update(username).digest('base64');
      ice.push({ urls: cfg.turnUrl.split(',').map((x) => x.trim()), username, credential });
    }
    return ice;
  };

  r.get('/video/status', () => ({ on: on(), calls: true, screens: on(), turn: !!(cfg.turnUrl && cfg.turnSecret) }), { auth: false });

  // ---------- Compartilhar a tela numa sala (Arena Gamer e Salas de Negócios) ----------
  // Quem compartilha manda UMA imagem da tela para o servidor de vídeo (WHIP, caminho tela/<id>) e só
  // as pessoas da sala recebem (WHEP). Diferente da live: não é público. Cada pessoa que assiste tem que
  // estar na lista que o dono mandou; o passe é conferido pelo MediaMTX e o dono pode tirar alguém na hora.
  // Fica na memória do servidor: se o servidor reiniciar, o compartilhamento cai e a pessoa liga de novo.
  const telas = new Map(); // id -> { id, host, sala, viewers:Set, at }
  const MAX_VER = 25;
  const telaOf = (id) => {
    const t = telas.get(id);
    if (!t) fail(404, 'O compartilhamento de tela foi encerrado.');
    return t;
  };
  const telaEnd = (t) => {
    telas.delete(t.id);
    for (const v of t.viewers) hub.send(v, 'tela-off', { id: t.id, sala: t.sala, kind: t.kind || 'tela' });
  };
  const viewerIds = (list, me) => {
    const ids = Array.isArray(list) ? [...new Set(list.map((x) => String(x || '').slice(0, 64)).filter((x) => x && x !== me))] : [];
    if (ids.length > MAX_VER) fail(400, `A tela pode ser mostrada para até ${MAX_VER} pessoas. Para mais gente, abra uma live.`);
    return ids.filter((id) => userById(id));
  };

  r.post('/salas/tela', ({ body, user }) => {
    if (!on()) off();
    const sala = str(body.sala, 'a sala', { max: 120 });
    if (!sala) fail(400, 'Em qual sala você vai mostrar a tela?');
    // kind: 'tela' (a tela do celular/computador) ou 'cam' (a câmera da pessoa, que aparece pequena
    // no canto da tela). Uma de cada por pessoa: abrir outra do mesmo tipo encerra a anterior.
    const kind = body.kind === 'cam' ? 'cam' : 'tela';
    for (const t of telas.values()) if (t.host === user.id && (t.kind || 'tela') === kind) telaEnd(t);
    const t = { id: newId(kind), kind, host: user.id, sala, viewers: new Set(viewerIds(body.para, user.id)), at: now() };
    telas.set(t.id, t);
    const from = publicUser(userById(user.id));
    for (const v of t.viewers) hub.send(v, 'tela-on', { id: t.id, sala, from, kind });
    const token = sign(cfg.videoSecret, { act: 'publish', path: `tela/${t.id}`, uid: user.id, exp: now() + 6 * 3600 * 1000 });
    return { id: t.id, whip: `${base()}/tela/${t.id}/whip`, token, iceServers: iceFor(user.id), quality: '720p' };
  });

  // O dono atualiza quem está na sala (alguém entrou ou saiu da voz).
  r.post('/salas/tela/:id/para', ({ params, body, user }) => {
    const t = telaOf(params.id);
    if (t.host !== user.id) fail(403, 'Só quem está mostrando a tela muda quem assiste.');
    const next = new Set(viewerIds(body.para, user.id));
    const from = publicUser(userById(user.id));
    for (const v of t.viewers) if (!next.has(v)) hub.send(v, 'tela-off', { id: t.id, sala: t.sala, kind: t.kind || 'tela' });
    for (const v of next) if (!t.viewers.has(v)) hub.send(v, 'tela-on', { id: t.id, sala: t.sala, from, kind: t.kind || 'tela' });
    t.viewers = next;
    return { ok: true, viewers: next.size };
  });

  r.get('/salas/tela/:id/watch', ({ params, user }) => {
    if (!on()) off();
    const t = telaOf(params.id);
    if (t.host !== user.id && !t.viewers.has(user.id)) fail(403, 'Só quem está na sala vê essa tela.');
    const token = sign(cfg.videoSecret, { act: 'read', path: `tela/${t.id}`, uid: user.id, exp: now() + 3 * 3600 * 1000 });
    return { whep: `${base()}/tela/${t.id}/whep`, token, iceServers: iceFor(user.id) };
  });

  r.post('/salas/tela/:id/end', ({ params, user }) => {
    const t = telaOf(params.id);
    if (t.host !== user.id) fail(403, 'Só quem está mostrando a tela pode parar.');
    telaEnd(t);
    return { ok: true };
  });

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
        if (path.startsWith('tela/')) {
          const t = telas.get(path.slice(5));
          if (!t || t.host !== p.uid) fail(401, 'O compartilhamento de tela já foi encerrado.');
        } else {
          const l = db.prepare('SELECT host_id, status FROM lives WHERE id = ?').get(path.replace(/^live\//, ''));
          if (!l || l.status !== 'ao_vivo' || l.host_id !== p.uid) fail(401, 'A live não está aberta.');
        }
      } else if (!['read', 'playback'].includes(action) || !['read', 'publish'].includes(p.act)) fail(401, 'Ação não permitida.');
      // Tela de sala: quem assiste precisa continuar convidado (o dono pode tirar a pessoa a qualquer hora).
      if (action !== 'publish' && path.startsWith('tela/')) {
        const t = telas.get(path.slice(5));
        if (!t || (t.host !== p.uid && !t.viewers.has(p.uid))) fail(401, 'Você não está mais nessa sala.');
      }
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
    // Date: só chama quem está online agora. Se não estiver, nada chega no celular da pessoa.
    const ctx = body.ctx === 'date' ? 'date' : null;
    // Chamada do Date é só para assinantes do Date+ (conferido aqui, não só no app).
    if (ctx === 'date' && !dateSubOf(db, user.id)) fail(402, 'Chamar por vídeo no Date é para assinantes do Date+.', 'date_plus');
    if (ctx === 'date' && !hub.online(to)) fail(409, 'A pessoa está offline no Date. A chamada só pode ser feita com ela online.', 'offline');
    const c = { id: newId('call'), from: user.id, to, kind: body.kind === 'audio' ? 'audio' : 'video', ctx, status: 'tocando', at: now() };
    calls.set(c.id, c);
    // silent: o celular mostra um convite na tela, sem toque, bip ou vibração.
    hub.send(to, 'call', { id: c.id, kind: c.kind, ctx, silent: ctx === 'date', from: publicUser(userById(user.id)) });
    return { id: c.id, iceServers: iceFor(user.id), online: hub.online(to) };
  });

  r.post('/video-calls/:id/answer', ({ params, body, user }) => {
    const c = callOf(params.id, user.id);
    if (c.to !== user.id) fail(403, 'Só quem recebeu pode atender.');
    if (c.ctx === 'date' && body.accept && !dateSubOf(db, user.id)) fail(402, 'Para entrar na chamada do Date é preciso ser assinante do Date+.', 'date_plus');
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
  // Vigia das lives (só liga com a moderação e o servidor de vídeo configurados).
  makeLiveMonitor({ db, cfg, hub, mod }).start();
}
