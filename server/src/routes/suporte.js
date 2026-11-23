// Suporte do Realyz: o usuário abre um chamado pelo app e a equipe responde pelo painel do administrador.
// Antes os chamados ficavam só no celular (usuário e equipe não se enxergavam). Agora passam pelo servidor:
//   - GET  /suporte/chamados            → meus chamados (com as mensagens)
//   - POST /suporte/chamados            → abrir chamado { topic, text, lotusTried }
//   - POST /suporte/chamados/:id/msg    → responder (reabre o chamado)
//   - POST /suporte/chamados/:id/fechar → marcar como resolvido
//   - POST /suporte/chamados/:id/nota   → avaliar o atendimento (1 a 5)
//   - POST /suporte/chamados/:id/lido   → li as respostas da equipe
//   - GET  /admin/suporte               → fila da equipe
//   - POST /admin/suporte/:id/msg       → equipe responde; POST /admin/suporte/:id/fechar → equipe encerra
// Assuntos de dinheiro, conta e biometria entram na frente da fila. Quem abre é avisado na hora quando a
// equipe responde (WebSocket e notificação).
import { fail, newId, now, str, int } from '../http.js';

const TOPICOS = ['pagamento', 'conta', 'biometria', 'pedido', 'servico', 'loja', 'app', 'outro'];
const URGENTES = ['pagamento', 'conta', 'biometria'];

export default function suporteRoutes(r, { db, hub }) {
  const admins = () => db.prepare(`SELECT id FROM users WHERE (roles LIKE '%"admin"%' OR roles LIKE '%"suporte"%') AND status = 'ativo'`).all().map((u) => u.id);
  const msgs = (id) =>
    db.prepare('SELECT autor, by_name, text, created_at FROM suporte_msgs WHERE chamado_id = ? ORDER BY created_at, rowid').all(id)
      .map((m) => ({ from: m.autor, by: m.by_name || undefined, text: m.text, at: m.created_at }));
  const view = (c) => ({
    id: c.id, n: c.n, userId: c.user_id, userName: c.user_name, topic: c.topic, urgent: !!c.urgent, status: c.status,
    at: c.created_at, updatedAt: c.updated_at, unreadUser: c.unread_user, rating: c.rating || undefined, lotusTried: !!c.lotus_tried,
    messages: msgs(c.id),
  });
  const SQL = 'SELECT c.*, u.name AS user_name FROM suporte_chamados c JOIN users u ON u.id = c.user_id';
  const get = (id) => db.prepare(`${SQL} WHERE c.id = ?`).get(String(id || ''));
  const meu = (id, user) => {
    const c = get(id);
    if (!c || c.user_id !== user.id) fail(404, 'Chamado não encontrado.');
    return c;
  };
  const addMsg = (id, autor, text, byName = null, at = now()) =>
    db.prepare('INSERT INTO suporte_msgs (id, chamado_id, autor, by_name, text, created_at) VALUES (?,?,?,?,?,?)').run(newId('sm'), id, autor, byName, text, at);
  const toTeam = (type, data) => admins().forEach((a) => hub.send(a, type, data));
  // Com o app aberto chega pelo WebSocket; fechado, vira notificação (AVISOS.suporte em push.js).
  const avisarUsuario = (c, texto) => hub.send(c.user_id, 'suporte', { id: c.id, n: c.n, texto: String(texto).slice(0, 120) });

  r.get('/suporte/chamados', ({ user }) => db.prepare(`${SQL} WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 50`).all(user.id).map(view));

  r.post('/suporte/chamados', ({ user, body }) => {
    const topic = TOPICOS.includes(body.topic) ? body.topic : 'outro';
    const text = str(body.text, 'a sua mensagem', { min: 3, max: 2000 });
    const abertos = db.prepare(`SELECT COUNT(*) n FROM suporte_chamados WHERE user_id = ? AND status != 'resolvido'`).get(user.id).n;
    if (abertos >= 10) fail(429, 'Você já tem 10 chamados abertos. Responda ou feche um deles antes de abrir outro.');
    const id = newId('su');
    const at = now();
    const n = 1000 + db.prepare('SELECT COUNT(*) n FROM suporte_chamados').get().n + 1;
    const urgent = URGENTES.includes(topic) ? 1 : 0;
    db.prepare('INSERT INTO suporte_chamados (id, n, user_id, topic, urgent, status, lotus_tried, unread_user, created_at, updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)')
      .run(id, n, user.id, topic, urgent, 'aberto', body.lotusTried ? 1 : 0, at, at);
    addMsg(id, 'user', text, null, at);
    addMsg(id, 'system', `Chamado nº ${n} aberto${urgent ? ' com prioridade' : ''}. A equipe do Realyz responde por aqui.`, null, at + 1);
    toTeam('suporte-novo', { id, n, urgent: !!urgent });
    return view(get(id));
  });

  r.post('/suporte/chamados/:id/msg', ({ params, user, body }) => {
    const c = meu(params.id, user);
    addMsg(c.id, 'user', str(body.text, 'a sua mensagem', { min: 1, max: 2000 }));
    db.prepare(`UPDATE suporte_chamados SET status = 'aberto', updated_at = ? WHERE id = ?`).run(now(), c.id);
    toTeam('suporte-novo', { id: c.id, n: c.n, urgent: !!c.urgent });
    return view(get(c.id));
  });
  r.post('/suporte/chamados/:id/fechar', ({ params, user }) => {
    const c = meu(params.id, user);
    addMsg(c.id, 'system', 'Você marcou o chamado como resolvido.');
    db.prepare(`UPDATE suporte_chamados SET status = 'resolvido', updated_at = ? WHERE id = ?`).run(now(), c.id);
    return view(get(c.id));
  });
  r.post('/suporte/chamados/:id/nota', ({ params, user, body }) => {
    const c = meu(params.id, user);
    db.prepare('UPDATE suporte_chamados SET rating = ? WHERE id = ?').run(int(body.stars, 'a nota', { min: 1, max: 5 }), c.id);
    return view(get(c.id));
  });
  r.post('/suporte/chamados/:id/lido', ({ params, user }) => {
    const c = meu(params.id, user);
    db.prepare('UPDATE suporte_chamados SET unread_user = 0 WHERE id = ?').run(c.id);
    return { ok: true };
  });

  // ── Equipe (painel do administrador) ──
  const A = { auth: 'admin' };
  r.get('/admin/suporte', () => {
    const rank = `CASE c.status WHEN 'aberto' THEN 0 WHEN 'respondido' THEN 1 ELSE 2 END`;
    return db.prepare(`${SQL} ORDER BY ${rank}, c.urgent DESC, c.updated_at ASC LIMIT 300`).all().map(view);
  }, A);
  r.post('/admin/suporte/:id/msg', ({ params, user, body }) => {
    const c = get(params.id);
    if (!c) fail(404, 'Chamado não encontrado.');
    const text = str(body.text, 'a resposta', { min: 1, max: 2000 });
    addMsg(c.id, 'team', text, String(body.by || 'Equipe Realyz').slice(0, 60));
    db.prepare(`UPDATE suporte_chamados SET status = 'respondido', unread_user = unread_user + 1, updated_at = ? WHERE id = ?`).run(now(), c.id);
    avisarUsuario(c, text);
    return view(get(c.id));
  }, A);
  r.post('/admin/suporte/:id/fechar', ({ params }) => {
    const c = get(params.id);
    if (!c) fail(404, 'Chamado não encontrado.');
    addMsg(c.id, 'system', 'A equipe encerrou o chamado. Se precisar, é só responder para reabrir.');
    db.prepare(`UPDATE suporte_chamados SET status = 'resolvido', updated_at = ? WHERE id = ?`).run(now(), c.id);
    avisarUsuario(c, 'A equipe encerrou o seu chamado.');
    return view(get(c.id));
  }, A);
}
