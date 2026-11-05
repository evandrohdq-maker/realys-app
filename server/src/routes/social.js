// Parte social: perfis, amizades, posts, stories, depoimentos (como no Orkut), mensagens e denúncias.
import { fail, newId, now, str, oneOf } from '../http.js';

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export default function socialRoutes(r, { db, hub, userById, publicUser }) {
  const friendship = (a, b) => {
    const [x, y] = pair(a, b);
    return db.prepare('SELECT * FROM friends WHERE a_id = ? AND b_id = ?').get(x, y);
  };
  const areFriends = (a, b) => a === b || friendship(a, b)?.status === 'amigos';
  const canSeeSocial = (viewer, owner) => owner.id === viewer.id || owner.privacy === 'todos' || (owner.privacy === 'amigos' && areFriends(viewer.id, owner.id));
  const target = (id) => {
    const u = userById(String(id || ''));
    if (!u || u.kind === 'sistema' || u.status !== 'ativo') fail(404, 'Pessoa não encontrada.');
    return u;
  };
  const postView = (p) => ({ id: p.id, kind: p.kind, text: p.text, media: p.media, visibility: p.visibility, flagged: !!p.flagged, createdAt: p.created_at, expiresAt: p.expires_at, author: { id: p.author_id, name: p.author_name, username: p.author_username, photo: p.author_photo } });
  const POST_SQL = 'SELECT p.*, u.name AS author_name, u.username AS author_username, u.photo AS author_photo FROM posts p JOIN users u ON u.id = p.author_id';

  // ── Pessoas ──
  r.get('/users', ({ query, user }) => {
    const q = String(query.q || '').trim();
    if (q.length < 2) return [];
    return db.prepare(`SELECT * FROM users WHERE kind != 'sistema' AND status = 'ativo' AND (name LIKE ? OR username LIKE ?) ORDER BY name LIMIT 30`).all(`%${q}%`, `%${q.replace(/^@/, '')}%`)
      .map((u) => ({ ...publicUser(u), friend: friendship(user.id, u.id)?.status || null }));
  });

  r.get('/users/:id', ({ params, user }) => {
    const u = target(params.id);
    const f = friendship(user.id, u.id);
    const visible = canSeeSocial(user, u);
    return {
      ...publicUser(u),
      friend: f ? (f.status === 'amigos' ? 'amigos' : f.requested_by === user.id ? 'enviado' : 'recebido') : null,
      visible,
      posts: visible ? db.prepare(`${POST_SQL} WHERE p.author_id = ? AND p.kind = 'post' AND p.removed = 0 ORDER BY p.created_at DESC LIMIT 30`).all(u.id).filter((p) => p.visibility === 'todos' || areFriends(user.id, u.id)).map(postView) : [],
      testimonials: db.prepare(`SELECT t.id, t.text, t.created_at AS createdAt, f.id AS fromId, f.name AS fromName, f.photo AS fromPhoto FROM testimonials t JOIN users f ON f.id = t.from_id WHERE t.to_id = ? AND t.status = 'aceito' ORDER BY t.created_at DESC LIMIT 30`).all(u.id),
      company: db.prepare('SELECT id, name FROM companies WHERE owner_id = ?').get(u.id) || null,
    };
  });

  // ── Amizades ──
  r.post('/friends/:id', ({ params, user }) => {
    const u = target(params.id);
    if (u.id === user.id) fail(400, 'Você não pode adicionar a si mesmo.');
    const f = friendship(user.id, u.id);
    const [a, b] = pair(user.id, u.id);
    if (!f) {
      db.prepare('INSERT INTO friends (a_id, b_id, status, requested_by, created_at) VALUES (?,?,?,?,?)').run(a, b, 'pendente', user.id, now());
      hub.send(u.id, 'friend_request', { from: publicUser(user) });
      return { status: 'enviado' };
    }
    if (f.status === 'pendente' && f.requested_by !== user.id) {
      db.prepare(`UPDATE friends SET status = 'amigos' WHERE a_id = ? AND b_id = ?`).run(a, b);
      hub.send(u.id, 'friend_accepted', { by: publicUser(user) });
      return { status: 'amigos' };
    }
    return { status: f.status === 'amigos' ? 'amigos' : 'enviado' };
  });
  r.delete('/friends/:id', ({ params, user }) => {
    const [a, b] = pair(user.id, String(params.id));
    db.prepare('DELETE FROM friends WHERE a_id = ? AND b_id = ?').run(a, b);
  });
  r.get('/friends', ({ user }) =>
    db.prepare(`SELECT u.*, f.status AS f_status, f.requested_by AS f_by FROM friends f JOIN users u ON u.id = CASE WHEN f.a_id = ? THEN f.b_id ELSE f.a_id END WHERE (f.a_id = ? OR f.b_id = ?)`).all(user.id, user.id, user.id)
      .map((x) => ({ ...publicUser(x), friend: x.f_status === 'amigos' ? 'amigos' : x.f_by === user.id ? 'enviado' : 'recebido' }))
  );

  // ── Posts e stories ──
  r.post('/posts', ({ body, user }) => {
    const kind = body.kind === 'story' ? 'story' : 'post';
    const text = str(body.text, 'o texto', { optional: true, max: 2200 });
    const media = str(body.media, 'a mídia', { optional: true, max: 300 }) || null;
    if (!text && !media) fail(400, 'Escreva algo ou escolha uma foto ou vídeo.');
    const id = newId('ps');
    const t = now();
    db.prepare('INSERT INTO posts (id, author_id, kind, text, media, visibility, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)').run(
      id, user.id, kind, text, media, body.visibility === 'amigos' ? 'amigos' : 'todos', t, kind === 'story' ? t + 86400000 : null
    );
    return postView(db.prepare(`${POST_SQL} WHERE p.id = ?`).get(id));
  }, { status: 201 });

  // Feed: posts de quem é público e dos amigos. Os marcados como informação falsa não aparecem.
  r.get('/feed', ({ user, query }) => {
    const before = Number(query.before || now() + 1);
    return db.prepare(`${POST_SQL} WHERE p.kind = 'post' AND p.removed = 0 AND p.flagged = 0 AND p.created_at < ? ORDER BY p.created_at DESC LIMIT 60`).all(before)
      .filter((p) => p.author_id === user.id || (p.visibility === 'todos' ? canSeeSocial(user, userById(p.author_id)) : areFriends(user.id, p.author_id)))
      .slice(0, 30).map(postView);
  });

  // Stories das últimas 24 h, agrupados por pessoa (as bolinhas da página de Stories).
  r.get('/stories', ({ user }) => {
    const rows = db.prepare(`${POST_SQL} WHERE p.kind = 'story' AND p.removed = 0 AND p.expires_at > ? ORDER BY p.created_at`).all(now())
      .filter((p) => p.author_id === user.id || (p.visibility === 'todos' ? canSeeSocial(user, userById(p.author_id)) : areFriends(user.id, p.author_id)));
    const groups = new Map();
    for (const p of rows) {
      if (!groups.has(p.author_id)) groups.set(p.author_id, { author: postView(p).author, items: [] });
      groups.get(p.author_id).items.push(postView(p));
    }
    return [...groups.values()];
  });

  r.delete('/posts/:id', ({ params, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!p || (p.author_id !== user.id && !JSON.parse(user.roles).includes('admin'))) fail(404, 'Publicação não encontrada.');
    db.prepare('UPDATE posts SET removed = 1 WHERE id = ?').run(p.id);
  });

  // ── Depoimentos: ficam pendentes até a pessoa aceitar ──
  r.post('/testimonials', ({ body, user }) => {
    const to = target(body.toId);
    if (to.id === user.id) fail(400, 'Você não pode deixar depoimento para si mesmo.');
    const id = newId('dp');
    db.prepare('INSERT INTO testimonials (id, from_id, to_id, text, status, created_at) VALUES (?,?,?,?,?,?)').run(id, user.id, to.id, str(body.text, 'o depoimento', { min: 5, max: 600 }), 'pendente', now());
    hub.send(to.id, 'testimonial', { id, from: publicUser(user) });
    return { id, status: 'pendente' };
  }, { status: 201 });
  r.get('/testimonials/pending', ({ user }) =>
    db.prepare(`SELECT t.id, t.text, t.created_at AS createdAt, f.id AS fromId, f.name AS fromName, f.photo AS fromPhoto FROM testimonials t JOIN users f ON f.id = t.from_id WHERE t.to_id = ? AND t.status = 'pendente' ORDER BY t.created_at DESC`).all(user.id)
  );
  r.post('/testimonials/:id/:decision', ({ params, user }) => {
    const status = { aceitar: 'aceito', recusar: 'recusado' }[params.decision];
    if (!status) fail(404, 'Endereço não encontrado.');
    const t = db.prepare(`SELECT * FROM testimonials WHERE id = ? AND to_id = ? AND status = 'pendente'`).get(params.id, user.id);
    if (!t) fail(404, 'Depoimento não encontrado.');
    db.prepare('UPDATE testimonials SET status = ? WHERE id = ?').run(status, t.id);
    return { status };
  });
  // Feed de depoimentos aceitos (embaixo das bolinhas de Stories).
  r.get('/testimonials/feed', () =>
    db.prepare(`SELECT t.id, t.text, t.created_at AS createdAt, f.id AS fromId, f.name AS fromName, f.photo AS fromPhoto, d.id AS toId, d.name AS toName FROM testimonials t JOIN users f ON f.id = t.from_id JOIN users d ON d.id = t.to_id WHERE t.status = 'aceito' AND d.privacy = 'todos' ORDER BY t.created_at DESC LIMIT 40`).all()
  );

  // ── Mensagens (com histórico) ──
  r.post('/messages', ({ body, user }) => {
    const to = target(body.toId);
    if (to.id === user.id) fail(400, 'Escolha outra pessoa.');
    const id = newId('m');
    const msg = { id, from: user.id, to: to.id, text: str(body.text, 'a mensagem', { max: 2000 }), at: now() };
    db.prepare('INSERT INTO messages (id, from_id, to_id, text, created_at) VALUES (?,?,?,?,?)').run(id, user.id, to.id, msg.text, msg.at);
    hub.send(to.id, 'message', { ...msg, fromName: user.name });
    return msg;
  }, { status: 201 });

  // Conversas: a última mensagem de cada pessoa e quantas não lidas.
  r.get('/conversations', ({ user }) =>
    db.prepare(
      `SELECT other, MAX(created_at) AS at FROM (SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END AS other, created_at FROM messages WHERE from_id = ? OR to_id = ?) GROUP BY other ORDER BY at DESC LIMIT 50`
    ).all(user.id, user.id, user.id).map((c) => {
      const last = db.prepare('SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC LIMIT 1').get(user.id, c.other, c.other, user.id);
      const unread = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE from_id = ? AND to_id = ? AND read_at IS NULL').get(c.other, user.id).n;
      return { with: publicUser(userById(c.other)), last: { text: last.text, from: last.from_id, at: last.created_at }, unread };
    })
  );

  // Histórico com uma pessoa (e marca como lidas).
  r.get('/messages/:userId', ({ params, user, query }) => {
    const other = String(params.userId);
    const before = Number(query.before || now() + 1);
    db.prepare('UPDATE messages SET read_at = ? WHERE from_id = ? AND to_id = ? AND read_at IS NULL').run(now(), other, user.id);
    return db.prepare('SELECT id, from_id AS "from", to_id AS "to", text, created_at AS at, read_at AS readAt FROM messages WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND created_at < ? ORDER BY created_at DESC LIMIT 100')
      .all(user.id, other, other, user.id, before).reverse();
  });

  // ── Denúncias (fake news, golpe, perfil falso) ──
  r.post('/reports', ({ body, user }) => {
    const kind = oneOf(body.targetKind, 'o tipo', ['post', 'user', 'product', 'live']);
    const id = newId('rp');
    db.prepare('INSERT INTO reports (id, from_id, target_kind, target_id, reason, created_at) VALUES (?,?,?,?,?,?)').run(id, user.id, kind, str(body.targetId, 'o alvo', { max: 60 }), str(body.reason, 'o motivo', { min: 3, max: 500 }), now());
    return { id, status: 'aberta' };
  }, { status: 201 });
}
