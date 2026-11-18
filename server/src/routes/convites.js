// Convites de chamada por link (Arena Gamer).
// Quem está no app gera um link e manda por fora (WhatsApp, SMS, e-mail). Quem recebe:
//   - abre GET /c/:codigo no navegador: página com quem chamou, botão para abrir no Re@lys e,
//     para quem ainda não tem o app, botão para baixar e os passos do cadastro (documento + biometria);
//   - já com a conta, o app chama POST /convites/:codigo/entrar e vai direto para a sala de voz.
// O convite vale 24 h e não mostra nada além do primeiro nome de quem convidou e do nome da sala.
import { randomInt } from 'node:crypto';
import { fail, now, str } from '../http.js';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, para ditar sem confusão
const VALIDADE_MS = 24 * 60 * 60 * 1000;
const MAX_POR_DIA = 50; // por pessoa, contra spam de links
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'Um amigo';
const newCode = () => Array.from({ length: 6 }, () => ABC[randomInt(ABC.length)]).join('');

export default function conviteRoutes(r, { db, cfg, hub, userById }) {
  const base = (req) => cfg.publicUrl || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  const find = (code) => db.prepare('SELECT * FROM call_invites WHERE code = ?').get(String(code || '').toUpperCase());

  r.post('/convites/chamada', ({ body, user, req }) => {
    const sid = str(body.sid, 'o servidor', { max: 80 });
    const cid = str(body.cid, 'a sala', { max: 80 });
    const server = str(body.server, 'o nome do servidor', { optional: true, max: 60 });
    const room = str(body.room, 'o nome da sala', { optional: true, max: 60 });
    const hoje = db.prepare('SELECT COUNT(*) AS n FROM call_invites WHERE host_id = ? AND created_at > ?').get(user.id, now() - 86400000).n;
    if (hoje >= MAX_POR_DIA) fail(429, 'Você já gerou muitos convites hoje. Tente amanhã.');
    let code = newCode();
    while (find(code)) code = newCode();
    const t = now();
    db.prepare('INSERT INTO call_invites (code, host_id, sid, cid, server_name, room_name, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(code, user.id, sid, cid, server, room, t, t + VALIDADE_MS);
    return { code, url: `${base(req)}/c/${code}`, expiresAt: t + VALIDADE_MS };
  }, { status: 201 });

  // Dados públicos do convite (a página e o app usam).
  r.get('/convites/:code', ({ params }) => {
    const c = find(params.code);
    if (!c) fail(404, 'Convite não encontrado.');
    const host = userById(c.host_id);
    return { code: c.code, host: firstName(host && host.name), server: c.server_name, room: c.room_name, expired: c.expires_at < now(), expiresAt: c.expires_at };
  }, { auth: false });

  // Entrar na chamada (precisa de conta: quem não tem se cadastra antes).
  r.post('/convites/:code/entrar', ({ params, user }) => {
    const c = find(params.code);
    if (!c) fail(404, 'Convite não encontrado. Peça um link novo para quem te chamou.');
    if (c.expires_at < now()) fail(410, 'Esse convite expirou. Peça um link novo para quem te chamou.');
    db.prepare('UPDATE call_invites SET uses = uses + 1 WHERE code = ?').run(c.code);
    const host = userById(c.host_id);
    if (user.id !== c.host_id) hub.send(c.host_id, 'call_invite_joined', { code: c.code, sid: c.sid, cid: c.cid, by: { id: user.id, name: user.name } });
    return { sid: c.sid, cid: c.cid, server: c.server_name, room: c.room_name, host: host ? host.name : null };
  });

  // Página do link (abre no navegador de quem recebeu).
  r.get('/c/:code', ({ params, res }) => {
    const c = find(params.code);
    const host = c ? userById(c.host_id) : null;
    const ok = c && c.expires_at >= now();
    const code = c ? c.code : '';
    const deep = `realys://chamada/${code}`;
    // Android: abre o app se estiver instalado; se não, cai na página de download.
    const intent = `intent://chamada/${code}#Intent;scheme=realys;package=com.realys.app;S.browser_fallback_url=${encodeURIComponent(cfg.apkUrl)};end`;
    const body = !c
      ? '<h2>Convite não encontrado</h2><p>Confira o link ou peça um novo para quem te chamou.</p>'
      : !ok
        ? `<h2>Esse convite expirou</h2><p>Peça para ${esc(firstName(host && host.name))} mandar um link novo.</p>`
        : `<p class="tag">CONVITE PARA CHAMADA</p>
<h2>${esc(firstName(host && host.name))} te chamou para a chamada</h2>
<p class="room">🎧 ${esc(c.room_name || 'Sala de voz')}${c.server_name ? ` · ${esc(c.server_name)}` : ''}</p>
<a class="btn" href="${esc(intent)}">Já tenho o Re@lys: entrar na chamada</a>
<a class="btn alt" href="${esc(cfg.apkUrl)}">Ainda não tenho: baixar o Re@lys</a>
<ol>
<li>Baixe e instale o Re@lys (Android).</li>
<li>Toque em <b>Cadastre-se</b>: documento e biometria do rosto. Só gente real, sem perfil fake.</li>
<li>Volte para esta página e toque em <b>entrar na chamada</b>. Ou abra o app e use o código <b class="code">${esc(code)}</b>.</li>
</ol>
<p class="small">O convite vale até ${new Date(c.expires_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Link do app: <a href="${esc(deep)}">${esc(deep)}</a></p>`;
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re@lys · convite para chamada</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:28px 18px;color:#1b1b1f;background:#fbf8f1}h1{font-size:22px;color:#b07a0c;margin:0 0 18px}h2{font-size:20px;margin:6px 0}.tag{color:#7a7468;font-size:11px;font-weight:800;letter-spacing:1px;margin:0}.room{font-size:17px;font-weight:700}.btn{display:block;text-align:center;background:#2fb463;color:#fff;font-weight:800;text-decoration:none;padding:14px;border-radius:12px;margin:12px 0}.btn.alt{background:#fff;color:#b07a0c;border:2px solid #b07a0c}ol{line-height:1.6;padding-left:20px}.code{letter-spacing:2px}.small{color:#7a7468;font-size:12px;word-break:break-all}</style>
<body><h1>Re@lys</h1>${body}<p class="small">Re@lys · Pessoas reais. Negócios reais.</p></body></html>`;
    res.writeHead(ok ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  }, { auth: false });
}
