// Conversa em grupo (entre amigos), como nos apps de mensagem:
//   - POST   /grupos {name, membros:[ids]}        → criar (só com quem é seu amigo; até 256 pessoas)
//   - GET    /grupos                              → meus grupos, com a última mensagem e as não lidas
//   - GET    /grupos/:id                          → o grupo, os participantes e as mensagens
//   - POST   /grupos/:id/msgs {text}              → mandar mensagem (todos recebem na hora ou como notificação)
//   - POST   /grupos/:id/membros {userId}         → administrador põe um amigo dele
//   - DELETE /grupos/:id/membros/:userId          → administrador tira alguém, ou a pessoa sai (o próprio id)
//   - PATCH  /grupos/:id {name}                   → administrador muda o nome
// Mensagens passam pela mesma moderação e proteção contra golpe das conversas.
import { fail, newId, now, str } from '../http.js';
import { moderateText } from '../moderacaoTexto.js';

const MAX = 256;

export default function gruposRoutes(r, { db, hub, publicUser, userById, protecao }) {
  const amigos = (a, b) => !!db.prepare(`SELECT 1 FROM friends WHERE status = 'amigos' AND ((a_id = ? AND b_id = ?) OR (a_id = ? AND b_id = ?))`).get(a, b, b, a);
  const membro = (gid, uid) => db.prepare('SELECT * FROM grupo_membros WHERE grupo_id = ? AND user_id = ?').get(gid, uid);
  const grupoDe = (id, user) => {
    const g = db.prepare('SELECT * FROM grupos WHERE id = ?').get(String(id || ''));
    if (!g || !membro(g.id, user.id)) fail(404, 'Grupo não encontrado.');
    return g;
  };
  const membros = (gid) => db.prepare('SELECT m.user_id, m.admin FROM grupo_membros m WHERE m.grupo_id = ?').all(gid);
  const sistema = (gid, text) => db.prepare('INSERT INTO grupo_msgs (id, grupo_id, from_id, text, created_at) VALUES (?,?,?,?,?)').run(newId('gm'), gid, null, text, now());
  const avisar = (gid, type, data, menos) => membros(gid).forEach((m) => m.user_id !== menos && hub.send(m.user_id, type, data));
  const nome = (id) => (userById(id) || {}).name || 'Alguém';

  r.post('/grupos', ({ user, body }) => {
    const name = str(body.name, 'o nome do grupo', { min: 2, max: 40 });
    const mm = moderateText(name, 'publico');
    if (!mm.ok) fail(422, mm.why, mm.kind);
    const ids = [...new Set((Array.isArray(body.membros) ? body.membros : []).map(String))].filter((id) => id !== user.id);
    if (!ids.length) fail(400, 'Escolha pelo menos um amigo para o grupo.');
    if (ids.length + 1 > MAX) fail(400, `Um grupo pode ter até ${MAX} pessoas.`);
    for (const id of ids) if (!userById(id) || !amigos(user.id, id)) fail(403, 'Só dá para pôr no grupo quem é seu amigo no Realyz.', 'so_amigos');
    const id = newId('gp');
    const t = now();
    db.prepare('INSERT INTO grupos (id, name, owner_id, created_at, updated_at) VALUES (?,?,?,?,?)').run(id, name, user.id, t, t);
    db.prepare('INSERT INTO grupo_membros (grupo_id, user_id, admin, lido_at, joined_at) VALUES (?,?,1,?,?)').run(id, user.id, t, t);
    for (const uid of ids) db.prepare('INSERT INTO grupo_membros (grupo_id, user_id, admin, joined_at) VALUES (?,?,0,?)').run(id, uid, t);
    sistema(id, `${user.name} criou o grupo "${name}".`);
    avisar(id, 'grupo-novo', { id, name, by: user.name }, user.id);
    return { id, name };
  });

  r.get('/grupos', ({ user }) =>
    db.prepare(`SELECT g.*, m.lido_at FROM grupos g JOIN grupo_membros m ON m.grupo_id = g.id AND m.user_id = ? ORDER BY g.updated_at DESC`).all(user.id).map((g) => {
      const last = db.prepare('SELECT * FROM grupo_msgs WHERE grupo_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(g.id);
      const unread = db.prepare('SELECT COUNT(*) n FROM grupo_msgs WHERE grupo_id = ? AND created_at > ? AND from_id IS NOT NULL AND from_id != ?').get(g.id, g.lido_at, user.id).n;
      return { id: g.id, name: g.name, membros: membros(g.id).length, unread, last: last ? { text: last.text, from: last.from_id, fromName: last.from_id ? nome(last.from_id) : null, at: last.created_at } : null, updatedAt: g.updated_at };
    })
  );

  r.get('/grupos/:id', ({ params, user }) => {
    const g = grupoDe(params.id, user);
    db.prepare('UPDATE grupo_membros SET lido_at = ? WHERE grupo_id = ? AND user_id = ?').run(now(), g.id, user.id);
    const msgs = db.prepare('SELECT * FROM grupo_msgs WHERE grupo_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200').all(g.id).reverse();
    return {
      id: g.id, name: g.name, ownerId: g.owner_id, souAdmin: !!membro(g.id, user.id).admin,
      membros: membros(g.id).map((m) => ({ ...publicUser(userById(m.user_id)), admin: !!m.admin })),
      msgs: msgs.map((m) => ({ id: m.id, from: m.from_id, fromName: m.from_id ? nome(m.from_id) : null, text: m.text, at: m.created_at })),
    };
  });

  r.post('/grupos/:id/msgs', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    const text = str(body.text, 'a mensagem', { max: 2000 });
    const mm = moderateText(text, 'privado');
    if (!mm.ok) fail(422, mm.why, mm.kind);
    if (protecao) {
      const pr = protecao.mensagem({ fromId: user.id, toId: g.id, texto: text, amigos: true });
      if (pr && pr.barrar) fail(422, pr.barrar, 'golpe');
    }
    const id = newId('gm');
    const t = now();
    db.prepare('INSERT INTO grupo_msgs (id, grupo_id, from_id, text, created_at) VALUES (?,?,?,?,?)').run(id, g.id, user.id, text, t);
    db.prepare('UPDATE grupos SET updated_at = ? WHERE id = ?').run(t, g.id);
    db.prepare('UPDATE grupo_membros SET lido_at = ? WHERE grupo_id = ? AND user_id = ?').run(t, g.id, user.id);
    avisar(g.id, 'grupo-msg', { id: g.id, name: g.name, fromName: user.name, text: text.slice(0, 120) }, user.id);
    return { id, from: user.id, fromName: user.name, text, at: t };
  }, { status: 201 });

  const exigirAdmin = (g, user) => {
    if (!membro(g.id, user.id).admin) fail(403, 'Só o administrador do grupo pode fazer isso.');
  };
  r.post('/grupos/:id/membros', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    exigirAdmin(g, user);
    const uid = String(body.userId || '');
    if (!userById(uid) || !amigos(user.id, uid)) fail(403, 'Só dá para pôr no grupo quem é seu amigo no Realyz.', 'so_amigos');
    if (membro(g.id, uid)) return { ok: true };
    if (membros(g.id).length >= MAX) fail(400, `O grupo já tem ${MAX} pessoas.`);
    db.prepare('INSERT INTO grupo_membros (grupo_id, user_id, admin, joined_at) VALUES (?,?,0,?)').run(g.id, uid, now());
    sistema(g.id, `${user.name} adicionou ${nome(uid)}.`);
    hub.send(uid, 'grupo-novo', { id: g.id, name: g.name, by: user.name });
    return { ok: true };
  });
  r.delete('/grupos/:id/membros/:userId', ({ params, user }) => {
    const g = grupoDe(params.id, user);
    const uid = String(params.userId || '');
    if (uid !== user.id) exigirAdmin(g, user);
    if (!membro(g.id, uid)) return { ok: true };
    db.prepare('DELETE FROM grupo_membros WHERE grupo_id = ? AND user_id = ?').run(g.id, uid);
    sistema(g.id, uid === user.id ? `${user.name} saiu do grupo.` : `${user.name} removeu ${nome(uid)}.`);
    // Saiu o último administrador: o participante mais antigo vira administrador.
    if (!db.prepare('SELECT 1 FROM grupo_membros WHERE grupo_id = ? AND admin = 1').get(g.id)) {
      const prox = db.prepare('SELECT user_id FROM grupo_membros WHERE grupo_id = ? ORDER BY joined_at LIMIT 1').get(g.id);
      if (prox) db.prepare('UPDATE grupo_membros SET admin = 1 WHERE grupo_id = ? AND user_id = ?').run(g.id, prox.user_id);
    }
    return { ok: true };
  });
  r.patch('/grupos/:id', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    exigirAdmin(g, user);
    const name = str(body.name, 'o nome do grupo', { min: 2, max: 40 });
    db.prepare('UPDATE grupos SET name = ?, updated_at = ? WHERE id = ?').run(name, now(), g.id);
    sistema(g.id, `${user.name} mudou o nome do grupo para "${name}".`);
    return { ok: true, name };
  });
}
