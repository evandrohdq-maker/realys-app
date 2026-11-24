// Conversa em grupo (entre amigos), como nos apps de mensagem:
//   - POST   /grupos {name, membros:[ids]}        → criar (só com quem é seu amigo; até 256 pessoas)
//   - GET    /grupos                              → meus grupos, com a última mensagem e as não lidas
//   - GET    /grupos/:id                          → o grupo, os participantes e as mensagens
//   - POST   /grupos/:id/msgs {text}              → mandar mensagem (todos recebem na hora ou como notificação)
//   - POST   /grupos/:id/membros {userId}         → administrador põe um amigo dele
//   - DELETE /grupos/:id/membros/:userId          → administrador tira alguém, ou a pessoa sai (o próprio id)
//   - PATCH  /grupos/:id {name, modo, descricao}  → administrador muda o nome, o modo e a descrição
// Mensagens passam pela mesma moderação e proteção contra golpe das conversas.
//
// Grupos de página (para a página explicar propostas, estratégias e cursos), até 1000 pessoas:
//   - POST   /paginas/:id/grupos {name, descricao, modo}  → dono da página cria
//   - GET    /paginas/:id/grupos                          → grupos da página (quem vê a página vê a lista)
//   - POST   /grupos/:id/convites {userIds}               → convidar seguidores da página ou amigos
//   - GET    /grupos/convites                             → meus convites; POST /grupos/:id/entrar aceita,
//                                                           DELETE /grupos/:id/convite recusa
//   - modo: 'livre' (todos falam), 'moderado' (mensagem de participante espera aprovação),
//           'avisos' (só a página e os moderadores falam, ex.: aula)
//   - POST   /grupos/:id/msgs/:msgId/moderar {acao: aprovar|recusar|remover}
//   - POST   /grupos/:id/moderadores {userId, moderador}  → dono põe/tira moderador
//   - POST   /grupos/:id/silenciar {userId, horas}        → moderador silencia (0 = libera)
import { fail, newId, now, str } from '../http.js';
import { moderateText } from '../moderacaoTexto.js';
import { makePaginas } from '../paginas.js';

const MAX = 256;
export const MAX_PAGINA = 1000;
const MODOS = ['livre', 'moderado', 'avisos'];
const HORA = 3600000;

export default function gruposRoutes(r, { db, hub, publicUser, userById, protecao }) {
  const P = makePaginas(db);
  const maxDe = (g) => (g.pagina_id ? MAX_PAGINA : MAX);
  const segue = (pid, uid) => !!db.prepare('SELECT 1 FROM pagina_seguidores WHERE pagina_id = ? AND user_id = ?').get(pid, uid);
  const convidado = (gid, uid) => !!db.prepare('SELECT 1 FROM grupo_convites WHERE grupo_id = ? AND user_id = ?').get(gid, uid);
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
  const avisarAdmins = (gid, type, data, menos) => membros(gid).forEach((m) => m.admin && m.user_id !== menos && hub.send(m.user_id, type, data));
  const paginaInfo = (g) => {
    if (!g.pagina_id) return null;
    const pg = P.byId(g.pagina_id);
    return pg ? { id: pg.id, name: pg.name, photo: pg.photo || pg.cover || null } : null;
  };
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
      const last = db.prepare(`SELECT * FROM grupo_msgs WHERE grupo_id = ? AND status = 'ok' ORDER BY created_at DESC, rowid DESC LIMIT 1`).get(g.id);
      const unread = db.prepare(`SELECT COUNT(*) n FROM grupo_msgs WHERE grupo_id = ? AND status = 'ok' AND created_at > ? AND from_id IS NOT NULL AND from_id != ?`).get(g.id, g.lido_at, user.id).n;
      const n = db.prepare('SELECT COUNT(*) n FROM grupo_membros WHERE grupo_id = ?').get(g.id).n;
      return { id: g.id, name: g.name, membros: n, max: maxDe(g), modo: g.modo, pagina: paginaInfo(g), unread, last: last ? { text: last.text, from: last.from_id, fromName: last.from_id ? nome(last.from_id) : null, at: last.created_at } : null, updatedAt: g.updated_at };
    })
  );

  r.get('/grupos/convites', ({ user }) =>
    db.prepare('SELECT c.*, g.name, g.descricao, g.pagina_id, g.modo FROM grupo_convites c JOIN grupos g ON g.id = c.grupo_id WHERE c.user_id = ? ORDER BY c.created_at DESC').all(user.id).map((c) => ({
      id: c.grupo_id, name: c.name, descricao: c.descricao || '', modo: c.modo, by: nome(c.by_id), pagina: paginaInfo({ pagina_id: c.pagina_id }), at: c.created_at,
      membros: db.prepare('SELECT COUNT(*) n FROM grupo_membros WHERE grupo_id = ?').get(c.grupo_id).n,
    }))
  );

  r.get('/grupos/:id', ({ params, user }) => {
    const g = grupoDe(params.id, user);
    const eu = membro(g.id, user.id);
    db.prepare('UPDATE grupo_membros SET lido_at = ? WHERE grupo_id = ? AND user_id = ?').run(now(), g.id, user.id);
    // Moderador vê as mensagens esperando aprovação; o participante vê só as dele.
    const msgs = db
      .prepare(`SELECT * FROM grupo_msgs WHERE grupo_id = ? AND (status = 'ok' OR (status = 'pendente' AND (from_id = ? OR ? = 1))) ORDER BY created_at DESC, rowid DESC LIMIT 200`)
      .all(g.id, user.id, eu.admin ? 1 : 0)
      .reverse();
    const ms = membros(g.id);
    return {
      id: g.id, name: g.name, ownerId: g.owner_id, souAdmin: !!eu.admin, souDono: g.owner_id === user.id,
      modo: g.modo, descricao: g.descricao || '', pagina: paginaInfo(g), max: maxDe(g), total: ms.length,
      silenciadoAte: eu.silenciado_ate > now() ? eu.silenciado_ate : 0,
      pendentes: eu.admin ? db.prepare(`SELECT COUNT(*) n FROM grupo_msgs WHERE grupo_id = ? AND status = 'pendente'`).get(g.id).n : 0,
      membros: ms.map((m) => ({ ...publicUser(userById(m.user_id)), admin: !!m.admin, dono: m.user_id === g.owner_id })),
      msgs: msgs.map((m) => ({ id: m.id, from: m.from_id, fromName: m.from_id ? nome(m.from_id) : null, text: m.text, at: m.created_at, status: m.status })),
    };
  });

  r.post('/grupos/:id/msgs', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    const eu = membro(g.id, user.id);
    if (eu.silenciado_ate > now()) fail(403, 'Um moderador silenciou você neste grupo por um tempo.', 'silenciado');
    if (g.modo === 'avisos' && !eu.admin) fail(403, 'Neste grupo só a página e os moderadores mandam mensagem.', 'so_moderadores');
    const pendente = g.modo === 'moderado' && !eu.admin;
    const text = str(body.text, 'a mensagem', { max: 2000 });
    const mm = moderateText(text, g.pagina_id ? 'publico' : 'privado');
    if (!mm.ok) fail(422, mm.why, mm.kind);
    if (protecao) {
      const pr = protecao.mensagem({ fromId: user.id, toId: g.id, texto: text, amigos: true });
      if (pr && pr.barrar) fail(422, pr.barrar, 'golpe');
    }
    const id = newId('gm');
    const t = now();
    if (pendente) {
      // Grupo moderado: a mensagem do participante espera um moderador aprovar.
      db.prepare(`INSERT INTO grupo_msgs (id, grupo_id, from_id, text, created_at, status) VALUES (?,?,?,?,?,'pendente')`).run(id, g.id, user.id, text, t);
      avisarAdmins(g.id, 'grupo-pendente', { id: g.id, name: g.name, fromName: user.name, text: text.slice(0, 120) }, user.id);
      return { id, from: user.id, fromName: user.name, text, at: t, status: 'pendente' };
    }
    db.prepare('INSERT INTO grupo_msgs (id, grupo_id, from_id, text, created_at) VALUES (?,?,?,?,?)').run(id, g.id, user.id, text, t);
    db.prepare('UPDATE grupos SET updated_at = ? WHERE id = ?').run(t, g.id);
    db.prepare('UPDATE grupo_membros SET lido_at = ? WHERE grupo_id = ? AND user_id = ?').run(t, g.id, user.id);
    avisar(g.id, 'grupo-msg', { id: g.id, name: g.name, fromName: user.name, text: text.slice(0, 120) }, user.id);
    return { id, from: user.id, fromName: user.name, text, at: t, status: 'ok' };
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
    if (membros(g.id).length >= maxDe(g)) fail(400, `O grupo já tem ${maxDe(g)} pessoas.`);
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
    const out = { ok: true };
    if (body.name !== undefined) {
      const name = str(body.name, 'o nome do grupo', { min: 2, max: 40 });
      const mm = moderateText(name, 'publico');
      if (!mm.ok) fail(422, mm.why, mm.kind);
      if (name !== g.name) {
        db.prepare('UPDATE grupos SET name = ?, updated_at = ? WHERE id = ?').run(name, now(), g.id);
        sistema(g.id, `${user.name} mudou o nome do grupo para "${name}".`);
      }
      out.name = name;
    }
    if (body.descricao !== undefined) {
      const d = String(body.descricao || '').trim().slice(0, 300);
      const mm = moderateText(d, 'publico');
      if (d && !mm.ok) fail(422, mm.why, mm.kind);
      db.prepare('UPDATE grupos SET descricao = ? WHERE id = ?').run(d, g.id);
      out.descricao = d;
    }
    if (body.modo !== undefined) {
      if (!MODOS.includes(body.modo)) fail(400, 'Modo inválido.');
      if (body.modo !== g.modo) {
        db.prepare('UPDATE grupos SET modo = ? WHERE id = ?').run(body.modo, g.id);
        sistema(g.id, body.modo === 'avisos' ? 'Agora só a página e os moderadores mandam mensagem.' : body.modo === 'moderado' ? 'Agora as mensagens passam por um moderador antes de aparecer.' : 'Agora todos podem mandar mensagem.');
        // Saiu do modo moderado: o que estava esperando é aprovado.
        if (body.modo !== 'moderado') db.prepare(`UPDATE grupo_msgs SET status = 'ok' WHERE grupo_id = ? AND status = 'pendente'`).run(g.id);
      }
      out.modo = body.modo;
    }
    return out;
  });

  // ── Grupos de página ──
  r.post('/paginas/:id/grupos', ({ params, user, body }) => {
    const pg = P.byId(params.id);
    if (!pg || pg.owner_id !== user.id) fail(403, 'Só o dono da página cria grupos para ela.');
    const name = str(body.name, 'o nome do grupo', { min: 2, max: 40 });
    const descricao = String(body.descricao || '').trim().slice(0, 300);
    for (const t of [name, descricao]) {
      const mm = t ? moderateText(t, 'publico') : { ok: true };
      if (!mm.ok) fail(422, mm.why, mm.kind);
    }
    const modo = MODOS.includes(body.modo) ? body.modo : 'moderado';
    if (db.prepare('SELECT COUNT(*) n FROM grupos WHERE pagina_id = ?').get(pg.id).n >= 20) fail(400, 'Uma página pode ter até 20 grupos.');
    const id = newId('gp');
    const t = now();
    db.prepare('INSERT INTO grupos (id, name, owner_id, created_at, updated_at, pagina_id, modo, descricao) VALUES (?,?,?,?,?,?,?,?)').run(id, name, user.id, t, t, pg.id, modo, descricao);
    db.prepare('INSERT INTO grupo_membros (grupo_id, user_id, admin, lido_at, joined_at) VALUES (?,?,1,?,?)').run(id, user.id, t, t);
    sistema(id, `Grupo da página ${pg.name}. ${modo === 'avisos' ? 'Só a página e os moderadores mandam mensagem.' : modo === 'moderado' ? 'As mensagens passam por um moderador antes de aparecer.' : 'Todos podem mandar mensagem.'}`);
    return { id, name, modo, descricao };
  }, { status: 201 });

  r.get('/paginas/:id/grupos', ({ params, user }) => {
    const pg = P.byId(params.id);
    if (!pg) fail(404, 'Página não encontrada.');
    return db.prepare('SELECT * FROM grupos WHERE pagina_id = ? ORDER BY created_at').all(pg.id).map((g) => ({
      id: g.id, name: g.name, descricao: g.descricao || '', modo: g.modo, max: MAX_PAGINA,
      membros: db.prepare('SELECT COUNT(*) n FROM grupo_membros WHERE grupo_id = ?').get(g.id).n,
      souMembro: !!membro(g.id, user.id), convidado: convidado(g.id, user.id), souDono: pg.owner_id === user.id,
    }));
  });

  // Seguidores da página (só o dono vê), para escolher quem convidar. ?grupo=id marca quem já está.
  r.get('/paginas/:id/seguidores', ({ params, user, query }) => {
    const pg = P.byId(params.id);
    if (!pg || pg.owner_id !== user.id) fail(403, 'Só o dono da página vê a lista de seguidores.');
    const gid = String(query.grupo || '');
    return db
      .prepare('SELECT user_id FROM pagina_seguidores WHERE pagina_id = ? ORDER BY created_at DESC LIMIT 2000')
      .all(pg.id)
      .map((x) => userById(x.user_id))
      .filter(Boolean)
      .map((u) => ({ ...publicUser(u), noGrupo: gid ? !!membro(gid, u.id) : false, convidado: gid ? convidado(gid, u.id) : false }));
  });

  // Convidar: num grupo de página, quem segue a página ou é amigo de quem convida; num grupo de
  // amigos, só amigos. A pessoa entra quando aceita.
  r.post('/grupos/:id/convites', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    exigirAdmin(g, user);
    const ids = [...new Set((Array.isArray(body.userIds) ? body.userIds : [body.userId]).filter(Boolean).map(String))].slice(0, 200);
    if (!ids.length) fail(400, 'Escolha quem convidar.');
    const ja = db.prepare('SELECT COUNT(*) n FROM grupo_membros WHERE grupo_id = ?').get(g.id).n + db.prepare('SELECT COUNT(*) n FROM grupo_convites WHERE grupo_id = ?').get(g.id).n;
    let enviados = 0;
    let vagas = maxDe(g) - ja;
    const t = now();
    for (const uid of ids) {
      if (!userById(uid) || membro(g.id, uid) || convidado(g.id, uid)) continue;
      const pode = amigos(user.id, uid) || (g.pagina_id && segue(g.pagina_id, uid));
      if (!pode) continue;
      if (vagas <= 0) fail(400, `O grupo chegou ao limite de ${maxDe(g)} pessoas (contando os convites esperando resposta).`, 'grupo_cheio');
      db.prepare('INSERT INTO grupo_convites (grupo_id, user_id, by_id, created_at) VALUES (?,?,?,?)').run(g.id, uid, user.id, t);
      const pi = paginaInfo(g);
      hub.send(uid, 'grupo-convite', { id: g.id, name: g.name, by: pi ? pi.name : user.name });
      vagas--;
      enviados++;
    }
    return { enviados };
  });

  r.post('/grupos/:id/entrar', ({ params, user }) => {
    const g = db.prepare('SELECT * FROM grupos WHERE id = ?').get(String(params.id || ''));
    if (!g) fail(404, 'Grupo não encontrado.');
    if (membro(g.id, user.id)) return { ok: true, id: g.id };
    if (!convidado(g.id, user.id)) fail(403, 'Você precisa de um convite para entrar neste grupo.', 'sem_convite');
    if (db.prepare('SELECT COUNT(*) n FROM grupo_membros WHERE grupo_id = ?').get(g.id).n >= maxDe(g)) fail(400, `O grupo já tem ${maxDe(g)} pessoas.`, 'grupo_cheio');
    db.prepare('DELETE FROM grupo_convites WHERE grupo_id = ? AND user_id = ?').run(g.id, user.id);
    db.prepare('INSERT INTO grupo_membros (grupo_id, user_id, admin, lido_at, joined_at) VALUES (?,?,0,?,?)').run(g.id, user.id, 0, now());
    sistema(g.id, `${user.name} entrou no grupo.`);
    return { ok: true, id: g.id };
  });
  r.delete('/grupos/:id/convite', ({ params, user }) => {
    db.prepare('DELETE FROM grupo_convites WHERE grupo_id = ? AND user_id = ?').run(String(params.id || ''), user.id);
    return { ok: true };
  });

  r.post('/grupos/:id/msgs/:msgId/moderar', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    exigirAdmin(g, user);
    const m = db.prepare('SELECT * FROM grupo_msgs WHERE id = ? AND grupo_id = ?').get(String(params.msgId || ''), g.id);
    if (!m || !m.from_id) fail(404, 'Mensagem não encontrada.');
    const acao = body.acao;
    if (acao === 'aprovar') {
      if (m.status !== 'pendente') return { ok: true, status: m.status };
      const t = now();
      db.prepare(`UPDATE grupo_msgs SET status = 'ok', created_at = ? WHERE id = ?`).run(t, m.id);
      db.prepare('UPDATE grupos SET updated_at = ? WHERE id = ?').run(t, g.id);
      avisar(g.id, 'grupo-msg', { id: g.id, name: g.name, fromName: nome(m.from_id), text: m.text.slice(0, 120) }, user.id);
      return { ok: true, status: 'ok' };
    }
    if (acao === 'recusar' || acao === 'remover') {
      if (acao === 'remover' && m.from_id === g.owner_id && user.id !== g.owner_id) fail(403, 'Mensagem do dono do grupo só ele remove.');
      db.prepare(`UPDATE grupo_msgs SET status = ? WHERE id = ?`).run(acao === 'recusar' ? 'recusada' : 'removida', m.id);
      return { ok: true, status: acao === 'recusar' ? 'recusada' : 'removida' };
    }
    fail(400, 'Ação inválida.');
  });

  r.post('/grupos/:id/moderadores', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    if (g.owner_id !== user.id) fail(403, 'Só o dono do grupo escolhe os moderadores.');
    const uid = String(body.userId || '');
    if (uid === g.owner_id) fail(400, 'O dono do grupo já é moderador.');
    if (!membro(g.id, uid)) fail(404, 'Essa pessoa não está no grupo.');
    const sim = body.moderador !== false;
    db.prepare('UPDATE grupo_membros SET admin = ? WHERE grupo_id = ? AND user_id = ?').run(sim ? 1 : 0, g.id, uid);
    sistema(g.id, sim ? `${nome(uid)} agora é moderador.` : `${nome(uid)} deixou de ser moderador.`);
    return { ok: true };
  });

  r.post('/grupos/:id/silenciar', ({ params, user, body }) => {
    const g = grupoDe(params.id, user);
    exigirAdmin(g, user);
    const uid = String(body.userId || '');
    const alvo = membro(g.id, uid);
    if (!alvo) fail(404, 'Essa pessoa não está no grupo.');
    if (alvo.admin) fail(400, 'Moderador não pode ser silenciado. Tire primeiro de moderador.');
    const horas = Math.max(0, Math.min(24 * 30, Number(body.horas) || 0));
    db.prepare('UPDATE grupo_membros SET silenciado_ate = ? WHERE grupo_id = ? AND user_id = ?').run(horas ? now() + horas * HORA : 0, g.id, uid);
    return { ok: true, ate: horas ? now() + horas * HORA : 0 };
  });
}
