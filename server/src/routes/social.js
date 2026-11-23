// Parte social: perfis, amizades, posts, stories, depoimentos (como no Orkut), mensagens e denúncias.
import { moderateText, antiDesvio } from '../moderacaoTexto.js';
import { fail, newId, now, str, oneOf } from '../http.js';

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export default function socialRoutes(r, { db, hub, userById, publicUser, atendente }) {
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
  // Tipo da mídia (foto ou vídeo) pelo arquivo guardado: posts antigos têm o endereço sem extensão.
  const tipoMidia = (media) => {
    if (!media) return null;
    if (/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(media)) return 'video';
    const id = String(media).replace(/^.*\/media\//, '').replace(/\.[A-Za-z0-9]{2,4}$/, '');
    const m = /^\/media\//.test(media) ? db.prepare('SELECT mime FROM media WHERE id = ?').get(id) : null;
    return m && /^video\//.test(m.mime) ? 'video' : 'imagem';
  };
  const postView = (p) => ({ id: p.id, kind: p.kind, text: p.text, media: p.media, mediaType: tipoMidia(p.media), bg: p.bg || null, visibility: p.visibility, flagged: !!p.flagged, createdAt: p.created_at, expiresAt: p.expires_at, author: { id: p.author_id, name: p.author_name, username: p.author_username, photo: p.author_photo } });
  const POST_SQL = 'SELECT p.*, u.name AS author_name, u.username AS author_username, u.photo AS author_photo FROM posts p JOIN users u ON u.id = p.author_id';

  // ── Pessoas ──
  // Selo de identidade verificada: só quem teve a biometria aprovada (não vale para conta sem biometria).
  const verificado = (id) => !!db.prepare(`SELECT 1 FROM biometria WHERE user_id = ? AND status = 'aprovado'`).get(id);
  const pub = (u, o) => (u ? { ...publicUser(u, o), verified: verificado(u.id) } : u);
  // Perfil profissional: empresa ou prestador. É página para seguir, não contato para adicionar.
  const ehNegocio = (u) => !!u && (u.kind === 'empresa' || !!db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(u.id));
  const contarSeguidores = (id) => db.prepare('SELECT COUNT(*) n FROM follows WHERE target_id = ?').get(id).n;
  const contarCurtidas = (id) => db.prepare('SELECT COUNT(*) n FROM profile_likes WHERE target_id = ?').get(id).n;

  r.get('/users', ({ query, user }) => {
    // Acha por nome, por *usuário (com ou sem *, @ ou #) ou pelo ID da conta. Quem bate exato vem primeiro.
    const q = String(query.q || '').trim().replace(/^[@*#]+/, '');
    if (q.length < 2) return [];
    const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
    return db.prepare(
      `SELECT * FROM users WHERE kind != 'sistema' AND status = 'ativo' AND (id = ? OR lower(username) = lower(?) OR name LIKE ? ESCAPE '\\' OR username LIKE ? ESCAPE '\\')
       ORDER BY (id = ? OR lower(username) = lower(?)) DESC, name LIMIT 30`
    ).all(q, q, like, like, q, q)
      .map((u) => ({ ...pub(u), friend: friendship(user.id, u.id)?.status || null, negocio: ehNegocio(u) }));
  });

  // O que a pessoa montou no próprio perfil (salvo pelo app em /me/dados): só o que é social.
  const midia = (x) => typeof x === 'string' && /^(https?:\/\/|\/media\/)/.test(x);
  const perfilSocial = (id) => {
    const row = db.prepare('SELECT data FROM user_dados WHERE user_id = ?').get(id);
    let d = {};
    try {
      d = row ? JSON.parse(row.data) || {} : {};
    } catch (e) {}
    const g = d.myGallery || {};
    const arr = (a) => (Array.isArray(a) ? a : []);
    const mp = d.myProfile || {};
    return {
      cover: midia(mp.cover) ? mp.cover : null,
      gallery: {
        photos: arr(g.photos).filter((x) => x && midia(x.uri)).slice(0, 120),
        videos: arr(g.videos).filter((x) => x && midia(x.uri || x.video)).slice(0, 60),
        highlights: arr(g.highlights).filter((h) => h && h.title).slice(0, 30).map((h) => ({ ...h, items: arr(h.items).filter((i) => i && (midia(i.image) || midia(i.video))) })).filter((h) => h.items.length),
      },
      gamer: d.gamer && typeof d.gamer === 'object'
        ? {
            jogos: arr(d.gamer.jogos).filter((j) => j && j.nome).slice(0, 12).map((j) => ({ nome: String(j.nome).slice(0, 40), nick: String(j.nick || '').slice(0, 30), rank: String(j.rank || '').slice(0, 30) })),
            plataformas: arr(d.gamer.plataformas).map((x) => String(x).slice(0, 20)).slice(0, 6),
            estilo: String(d.gamer.estilo || '').slice(0, 20), horarios: String(d.gamer.horarios || '').slice(0, 60),
            procuraTime: !!d.gamer.procuraTime, contratavel: !!d.gamer.contratavel,
          }
        : null,
      mural: d.mural && Array.isArray(d.mural.items)
        ? { theme: d.mural.theme || 'aurora', items: d.mural.items.filter((x) => x && (x.type === 'recado' || (x.type === 'foto' && midia(x.uri)) || (x.type === 'post' && (x.text || midia(x.image) || midia(x.video))))).slice(0, 80) }
        : null,
    };
  };

  r.get('/users/:id', ({ params, user }) => {
    const u = target(params.id);
    // Conta a visita ao perfil (para sugestões de amizade). Nunca conta a própria.
    if (u.id !== user.id) {
      db.prepare('INSERT INTO profile_views (viewer_id, owner_id, vezes, ultimo_at) VALUES (?,?,1,?) ON CONFLICT(viewer_id, owner_id) DO UPDATE SET vezes = vezes + 1, ultimo_at = excluded.ultimo_at').run(user.id, u.id, now());
    }
    const f = friendship(user.id, u.id);
    const visible = canSeeSocial(user, u);
    return {
      ...pub(u),
      friend: f ? (f.status === 'amigos' ? 'amigos' : f.requested_by === user.id ? 'enviado' : 'recebido') : null,
      visible,
      posts: visible ? db.prepare(`${POST_SQL} WHERE p.author_id = ? AND p.kind = 'post' AND p.removed = 0 ORDER BY p.created_at DESC LIMIT 30`).all(u.id).filter((p) => p.visibility === 'todos' || areFriends(user.id, u.id)).map((p) => contagens(postView(p), user)) : [],
      testimonials: db.prepare(`SELECT t.id, t.text, t.created_at AS createdAt, f.id AS fromId, f.name AS fromName, f.photo AS fromPhoto FROM testimonials t JOIN users f ON f.id = t.from_id WHERE t.to_id = ? AND t.status = 'aceito' ORDER BY t.created_at DESC LIMIT 30`).all(u.id),
      company: db.prepare('SELECT id, name FROM companies WHERE owner_id = ?').get(u.id) || null,
      // Empresa ou prestador: a conversa segue as regras de negócio (anti-desvio). Perfil social não.
      negocio: ehNegocio(u),
      // Página profissional: seguidores e curtidas (e se quem está vendo segue/curtiu).
      seguidores: contarSeguidores(u.id),
      seguindo: !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND target_id = ?').get(user.id, u.id),
      curtidas: contarCurtidas(u.id),
      curtiu: !!db.prepare('SELECT 1 FROM profile_likes WHERE user_id = ? AND target_id = ?').get(user.id, u.id),
      // Perfil social é atividade entre amigos: quem pode ver o social da pessoa vê também
      // capa, galeria (fotos, vídeos, destaques) e mural, do jeito que ela montou.
      ...(visible ? perfilSocial(u.id) : {}),
    };
  });

  // Sugestões de amizade: quem abre o seu perfil (mais vezes e mais recente primeiro) e ainda não é
  // seu amigo nem tem pedido pendente. Aparece como "Pessoas que talvez você conheça", sem dizer quem
  // viu o perfil de quem.
  r.get('/me/sugestoes', ({ user }) => {
    // Ordem: amigos de amigos (com quantos em comum), depois quem abriu o seu perfil, depois gente nova
    // na rede. Nunca quem já é amigo ou tem pedido pendente, nem você mesmo.
    const livre = `u.id != @me AND u.status = 'ativo' AND u.kind NOT IN ('sistema', 'empresa')
      AND NOT EXISTS (SELECT 1 FROM friends f WHERE (f.a_id = u.id AND f.b_id = @me) OR (f.a_id = @me AND f.b_id = u.id))`;
    const vistos = new Set();
    const lista = [];
    const juntar = (rows) => rows.forEach((u) => {
      if (vistos.has(u.id) || lista.length >= 15) return;
      vistos.add(u.id);
      lista.push({ ...pub(u), friend: null, emComum: u.em_comum || 0 });
    });
    juntar(db.prepare(
      `SELECT u.*, COUNT(*) AS em_comum FROM friends f1
         JOIN friends f2 ON f2.status = 'amigos' AND (CASE WHEN f1.a_id = @me THEN f1.b_id ELSE f1.a_id END) IN (f2.a_id, f2.b_id)
         JOIN users u ON u.id = CASE WHEN f2.a_id = (CASE WHEN f1.a_id = @me THEN f1.b_id ELSE f1.a_id END) THEN f2.b_id ELSE f2.a_id END
       WHERE f1.status = 'amigos' AND @me IN (f1.a_id, f1.b_id) AND ${livre}
       GROUP BY u.id ORDER BY em_comum DESC LIMIT 15`
    ).all({ me: user.id }));
    juntar(db.prepare(
      `SELECT u.* FROM profile_views v JOIN users u ON u.id = v.viewer_id WHERE v.owner_id = @me AND ${livre} ORDER BY v.vezes DESC, v.ultimo_at DESC LIMIT 12`
    ).all({ me: user.id }));
    juntar(db.prepare(`SELECT u.* FROM users u WHERE ${livre} ORDER BY u.created_at DESC LIMIT 15`).all({ me: user.id }));
    return lista;
  });

  // ── Amizades ──
  // Seguir (e deixar de seguir) um perfil profissional. Seguir não vira contato nem libera conversa.
  r.post('/seguir/:id', ({ params, user }) => {
    const u = target(params.id);
    if (u.id === user.id) fail(400, 'Você não pode seguir a si mesmo.');
    if (!ehNegocio(u)) fail(400, 'Só perfis profissionais (empresas e prestadores) têm seguidores. Pessoas você adiciona como amigo.', 'nao_profissional');
    const ja = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND target_id = ?').get(user.id, u.id);
    if (ja) db.prepare('DELETE FROM follows WHERE follower_id = ? AND target_id = ?').run(user.id, u.id);
    else db.prepare('INSERT INTO follows (follower_id, target_id, created_at) VALUES (?,?,?)').run(user.id, u.id, now());
    return { seguindo: !ja, seguidores: contarSeguidores(u.id) };
  });
  r.post('/curtir-perfil/:id', ({ params, user }) => {
    const u = target(params.id);
    if (u.id === user.id) fail(400, 'Você não pode curtir o próprio perfil.');
    if (!ehNegocio(u)) fail(400, 'Curtir o perfil é para perfis profissionais.', 'nao_profissional');
    const ja = db.prepare('SELECT 1 FROM profile_likes WHERE user_id = ? AND target_id = ?').get(user.id, u.id);
    if (ja) db.prepare('DELETE FROM profile_likes WHERE user_id = ? AND target_id = ?').run(user.id, u.id);
    else db.prepare('INSERT INTO profile_likes (user_id, target_id, created_at) VALUES (?,?,?)').run(user.id, u.id, now());
    return { curtiu: !ja, curtidas: contarCurtidas(u.id) };
  });

  r.post('/friends/:id', ({ params, user }) => {
    const u = target(params.id);
    if (u.id === user.id) fail(400, 'Você não pode adicionar a si mesmo.');
    // Empresa não é contato: as pessoas seguem a página dela (e compram pela vitrine).
    if (u.kind === 'empresa' || user.kind === 'empresa') fail(400, 'Perfil de empresa não é contato. Toque em Seguir para acompanhar a página.', 'perfil_empresa');
    const f = friendship(user.id, u.id);
    const [a, b] = pair(user.id, u.id);
    if (!f) {
      db.prepare('INSERT INTO friends (a_id, b_id, status, requested_by, created_at) VALUES (?,?,?,?,?)').run(a, b, 'pendente', user.id, now());
      hub.send(u.id, 'friend_request', { from: pub(user) });
      return { status: 'enviado' };
    }
    if (f.status === 'pendente' && f.requested_by !== user.id) {
      db.prepare(`UPDATE friends SET status = 'amigos' WHERE a_id = ? AND b_id = ?`).run(a, b);
      hub.send(u.id, 'friend_accepted', { by: pub(user) });
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
      .map((x) => ({ ...pub(x), friend: x.f_status === 'amigos' ? 'amigos' : x.f_by === user.id ? 'enviado' : 'recebido' }))
  );

  // ── Posts e stories ──
  r.post('/posts', ({ body, user }) => {
    const kind = body.kind === 'story' ? 'story' : 'post';
    const text = str(body.text, 'o texto', { optional: true, max: 2200 });
    const media = str(body.media, 'a mídia', { optional: true, max: 300 }) || null;
    if (!text && !media) fail(400, 'Escreva algo ou escolha uma foto ou vídeo.');
    const m = moderateText(text, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const id = newId('ps');
    const t = now();
    const bg = typeof body.bg === 'string' && /^#[0-9a-f]{6}$/i.test(body.bg) ? body.bg : null;
    db.prepare('INSERT INTO posts (id, author_id, kind, text, media, visibility, created_at, expires_at, bg) VALUES (?,?,?,?,?,?,?,?,?)').run(
      id, user.id, kind, text, media, body.visibility === 'amigos' ? 'amigos' : 'todos', t, kind === 'story' ? t + 86400000 : null, bg
    );
    return postView(db.prepare(`${POST_SQL} WHERE p.id = ?`).get(id));
  }, { status: 201 });

  const contagens = (v, user) => ({
    ...v,
    likes: db.prepare('SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?').get(v.id).n,
    liked: !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(v.id, user.id),
    comments: db.prepare('SELECT COUNT(*) AS n FROM post_comments WHERE post_id = ? AND removed = 0').get(v.id).n,
  });
  // Feed: posts de quem é público e dos amigos. Os marcados como informação falsa não aparecem.
  r.get('/feed', ({ user, query }) => {
    const before = Number(query.before || now() + 1);
    return db.prepare(`${POST_SQL} WHERE p.kind = 'post' AND p.removed = 0 AND p.flagged = 0 AND p.created_at < ? ORDER BY p.created_at DESC LIMIT 60`).all(before)
      .filter((p) => p.author_id === user.id || (p.visibility === 'todos' ? canSeeSocial(user, userById(p.author_id)) : areFriends(user.id, p.author_id)))
      .slice(0, 30).map((p) => contagens(postView(p), user));
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

  // ── Curtidas e comentários ──
  const podeVerPost = (p, user) => p && !p.removed && (p.author_id === user.id || (p.visibility === 'todos' ? canSeeSocial(user, userById(p.author_id)) : areFriends(user.id, p.author_id)));
  r.post('/posts/:id/curtir', ({ params, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!podeVerPost(p, user)) fail(404, 'Publicação não encontrada.');
    const ja = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(p.id, user.id);
    if (ja) db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(p.id, user.id);
    else db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?,?,?)').run(p.id, user.id, now());
    return { liked: !ja, likes: db.prepare('SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?').get(p.id).n };
  });
  const comentarioView = (c) => ({ id: c.id, text: c.text, createdAt: c.created_at, author: { id: c.user_id, name: c.name, username: c.username, photo: c.photo } });
  r.get('/posts/:id/comentarios', ({ params, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!podeVerPost(p, user)) fail(404, 'Publicação não encontrada.');
    return db.prepare('SELECT c.*, u.name, u.username, u.photo FROM post_comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? AND c.removed = 0 ORDER BY c.created_at LIMIT 200').all(p.id).map(comentarioView);
  });
  r.post('/posts/:id/comentarios', ({ params, body, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!podeVerPost(p, user)) fail(404, 'Publicação não encontrada.');
    const text = str(body.text, 'o comentário', { max: 600 });
    const m = moderateText(text, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const id = newId('pc');
    db.prepare('INSERT INTO post_comments (id, post_id, user_id, text, created_at) VALUES (?,?,?,?,?)').run(id, p.id, user.id, text, now());
    if (p.author_id !== user.id) hub.send(p.author_id, 'comentario', { postId: p.id, fromName: user.name, text });
    return comentarioView(db.prepare('SELECT c.*, u.name, u.username, u.photo FROM post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(id));
  }, { status: 201 });
  r.delete('/comentarios/:id', ({ params, user }) => {
    const c = db.prepare('SELECT c.*, p.author_id FROM post_comments c JOIN posts p ON p.id = c.post_id WHERE c.id = ?').get(params.id);
    // Apaga quem escreveu ou o dono do post.
    if (!c || (c.user_id !== user.id && c.author_id !== user.id)) fail(404, 'Comentário não encontrado.');
    db.prepare('UPDATE post_comments SET removed = 1 WHERE id = ?').run(c.id);
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
    const mt = moderateText(body.text, 'publico');
    if (!mt.ok) fail(422, mt.why, mt.kind);
    const id = newId('dp');
    db.prepare('INSERT INTO testimonials (id, from_id, to_id, text, status, created_at) VALUES (?,?,?,?,?,?)').run(id, user.id, to.id, str(body.text, 'o depoimento', { min: 5, max: 600 }), 'pendente', now());
    hub.send(to.id, 'testimonial', { id, from: pub(user) });
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
    // Foto, vídeo ou áudio (enviado antes em PUT /media?uso=privado): a mensagem pode ser só a mídia.
    const media = typeof body.media === 'string' && /^\/media\/md_[\w-]+(\.[a-z0-9]{2,4})?$/i.test(body.media) ? body.media : null;
    const mediaType = media ? (['foto', 'video', 'audio'].includes(body.mediaType) ? body.mediaType : 'foto') : null;
    const text = media ? String(body.text || '').trim().slice(0, 2000) : str(body.text, 'a mensagem', { max: 2000 });
    const msg = { id, from: user.id, to: to.id, text, media, mediaType, at: now() };
    // Conversa privada: o conteúdo é das duas pessoas, mas racismo, ódio e sexual com menores nunca passam.
    const mm = moderateText(msg.text, 'privado');
    if (!mm.ok) fail(422, mm.why, mm.kind);
    // Anti-desvio: negócio (empresa ou prestador de um dos lados) ou contato ainda não aceito.
    const amigos = !!db.prepare(`SELECT 1 FROM friends WHERE status = 'amigos' AND ((a_id = ? AND b_id = ?) OR (a_id = ? AND b_id = ?))`).get(user.id, to.id, to.id, user.id);
    const negocio = (u) => u.kind === 'empresa' || !!db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(u.id);
    const vende = negocio(user);
    // Vale até entre amigos quando um dos dois é empresa ou prestador (virar amigo não libera o número).
    if (!amigos || vende || negocio(to)) {
      const ad = antiDesvio(msg.text);
      if (!ad.ok) fail(422, ad.why, 'desvio');
    }
    // Quem vende (empresa ou prestador) só manda UMA mensagem para quem ainda não aceitou o contato:
    // é o pedido de contato. A conversa abre quando a pessoa responde ou aceita a amizade.
    if (vende && !amigos) {
      const respondeu = db.prepare('SELECT 1 FROM messages WHERE from_id = ? AND to_id = ? LIMIT 1').get(to.id, user.id);
      const jaPediu = db.prepare('SELECT 1 FROM messages WHERE from_id = ? AND to_id = ? LIMIT 1').get(user.id, to.id);
      if (!respondeu && jaPediu) fail(403, 'Aguarde a pessoa aceitar o contato. Até lá, só vai o primeiro pedido de contato.', 'contato_pendente');
    }
    // Mídia só entre amigos (em conversa de negócio, catálogo e fotos vão pelos caminhos da loja).
    if (media && (!amigos || vende || negocio(to))) fail(403, 'Foto, vídeo e áudio são liberados na conversa entre amigos.', 'midia_amigos');
    db.prepare('INSERT INTO messages (id, from_id, to_id, text, created_at, media, media_type) VALUES (?,?,?,?,?,?,?)').run(id, user.id, to.id, msg.text, msg.at, media, mediaType);
    hub.send(to.id, 'message', { ...msg, fromName: user.name });
    // Atendente IA da empresa/prestador (se estiver ligado): responde em seguida, sem travar esta mensagem.
    if (atendente) setImmediate(() => atendente.aoReceber(msg).catch(() => {}));
    return msg;
  }, { status: 201 });

  // Conversas: a última mensagem de cada pessoa e quantas não lidas.
  r.get('/conversations', ({ user }) =>
    db.prepare(
      `SELECT other, MAX(created_at) AS at FROM (SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END AS other, created_at FROM messages WHERE from_id = ? OR to_id = ?) GROUP BY other ORDER BY at DESC LIMIT 50`
    ).all(user.id, user.id, user.id).map((c) => {
      const last = db.prepare('SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC LIMIT 1').get(user.id, c.other, c.other, user.id);
      const unread = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE from_id = ? AND to_id = ? AND read_at IS NULL').get(c.other, user.id).n;
      const rotulo = { foto: '📷 Foto', video: '🎬 Vídeo', audio: '🎤 Áudio' }[last.media_type];
      return { with: pub(userById(c.other)), last: { text: last.text || rotulo || '', from: last.from_id, at: last.created_at }, unread };
    })
  );

  // Histórico com uma pessoa (e marca como lidas).
  r.get('/messages/:userId', ({ params, user, query }) => {
    const other = String(params.userId);
    const before = Number(query.before || now() + 1);
    db.prepare('UPDATE messages SET read_at = ? WHERE from_id = ? AND to_id = ? AND read_at IS NULL').run(now(), other, user.id);
    return db.prepare('SELECT id, from_id AS "from", to_id AS "to", text, media, media_type AS mediaType, created_at AS at, read_at AS readAt, ia FROM messages WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND created_at < ? ORDER BY created_at DESC LIMIT 100')
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
