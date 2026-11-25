// Parte social: perfis, amizades, posts, stories, depoimentos (como no Orkut), mensagens e denúncias.
import { moderateText, antiDesvio } from '../moderacaoTexto.js';
import { fail, newId, now, str, oneOf } from '../http.js';
import { makePaginas } from '../paginas.js';

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export default function socialRoutes(r, { db, hub, userById, publicUser, atendente, protecao, crm }) {
  const PG = makePaginas(db);
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
  const musicaDe = (m) => {
    try {
      return m ? JSON.parse(m) : null;
    } catch (e) {
      return null;
    }
  };
  // Post de página: a autora é a página (página anônima nunca mostra o dono).
  const postView = (p) => ({
    id: p.id, kind: p.kind, text: p.text, media: p.media, mediaType: tipoMidia(p.media), bg: p.bg || null, visibility: p.visibility, flagged: !!p.flagged, createdAt: p.created_at, expiresAt: p.expires_at,
    musica: musicaDe(p.musica),
    author: p.pagina_id ? { id: p.pagina_id, name: p.pg_name, username: p.pg_handle, photo: p.pg_photo || p.pg_cover || null, pagina: true } : { id: p.author_id, name: p.author_name, username: p.author_username, photo: p.author_photo },
    pagina: p.pagina_id ? { id: p.pagina_id, name: p.pg_name, handle: p.pg_handle, anon: !!p.pg_anon } : null,
  });
  const POST_SQL = 'SELECT p.*, u.name AS author_name, u.username AS author_username, u.photo AS author_photo, pg.name AS pg_name, pg.handle AS pg_handle, pg.photo AS pg_photo, pg.cover AS pg_cover, pg.anon AS pg_anon, pg.removed AS pg_removed FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN paginas pg ON pg.id = p.pagina_id';

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
      posts: visible ? db.prepare(`${POST_SQL} WHERE p.author_id = ? AND p.kind = 'post' AND p.removed = 0 AND p.pagina_id IS NULL ORDER BY p.created_at DESC LIMIT 30`).all(u.id).filter((p) => p.visibility === 'todos' || areFriends(user.id, u.id)).map((p) => contagens(postView(p), user)) : [],
      testimonials: db.prepare(`${DEP_SQL} WHERE t.to_id = ? AND t.to_pagina_id IS NULL AND t.status = 'aceito' ORDER BY t.created_at DESC LIMIT 30`).all(u.id).map(depView),
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
    // Proteção Realyz: golpe escancarado não é publicado; suspeita de golpe ou fake news vai para a fila.
    const barra = protecao && text ? protecao.barrarPost(text) : null;
    if (barra) fail(422, barra, 'golpe');
    const id = newId('ps');
    const t = now();
    const bg = typeof body.bg === 'string' && /^#[0-9a-f]{6}$/i.test(body.bg) ? body.bg : null;
    db.prepare('INSERT INTO posts (id, author_id, kind, text, media, visibility, created_at, expires_at, bg) VALUES (?,?,?,?,?,?,?,?,?)').run(
      id, user.id, kind, text, media, body.visibility === 'amigos' ? 'amigos' : 'todos', t, kind === 'story' ? t + 86400000 : null, bg
    );
    if (protecao && text) protecao.post(id, text);
    return postView(db.prepare(`${POST_SQL} WHERE p.id = ?`).get(id));
  }, { status: 201 });

  // Curtidas somam as da pessoa e as das páginas ("curtiu como página").
  const totalCurtidas = (id) => db.prepare('SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?').get(id).n + db.prepare('SELECT COUNT(*) AS n FROM post_likes_pagina WHERE post_id = ?').get(id).n;
  const contagens = (v, user) => ({
    ...v,
    likes: totalCurtidas(v.id),
    liked: !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(v.id, user.id),
    // Quais páginas minhas já curtiram (o coração fica cheio quando eu estou "como" essa página).
    likedPaginas: db.prepare('SELECT l.pagina_id AS id FROM post_likes_pagina l JOIN paginas g ON g.id = l.pagina_id WHERE l.post_id = ? AND g.owner_id = ?').all(v.id, user.id).map((x) => x.id),
    comments: db.prepare('SELECT COUNT(*) AS n FROM post_comments WHERE post_id = ? AND removed = 0').get(v.id).n,
    // Post de página: se eu sigo (o botão "Seguir" no topo do post) e se a página é minha.
    ...(v.pagina ? { seguindo: PG.segue(v.pagina.id, user.id), minhaPagina: v.pagina && !!db.prepare('SELECT 1 FROM paginas WHERE id = ? AND owner_id = ?').get(v.pagina.id, user.id) } : {}),
  });
  // Post de página: aparece para quem segue a página (e para o dono). Post de pessoa: regra de sempre.
  const veNoFeed = (p, user) => (p.pagina_id ? !p.pg_removed && (p.author_id === user.id || PG.segue(p.pagina_id, user.id)) : p.author_id === user.id || (p.visibility === 'todos' ? canSeeSocial(user, userById(p.author_id)) : areFriends(user.id, p.author_id)));
  // Feed: posts de quem é público e dos amigos. Os marcados como informação falsa não aparecem.
  r.get('/feed', ({ user, query }) => {
    const before = Number(query.before || now() + 1);
    return db.prepare(`${POST_SQL} WHERE p.kind = 'post' AND p.removed = 0 AND p.flagged = 0 AND p.created_at < ? ORDER BY p.created_at DESC LIMIT 80`).all(before)
      .filter((p) => veNoFeed(p, user))
      .slice(0, 30).map((p) => contagens(postView(p), user));
  });
  // Posts de uma página (página aberta). Página é pública: qualquer conta vê.
  r.get('/paginas/:id/posts', ({ params, query, user }) => {
    const pg = PG.byId(params.id);
    if (!pg) fail(404, 'Página não encontrada.');
    const before = Number(query.before || now() + 1);
    const mine = pg.owner_id === user.id;
    return db.prepare(`${POST_SQL} WHERE p.pagina_id = ? AND p.removed = 0 ${mine ? '' : 'AND p.flagged = 0'} AND p.created_at < ? ORDER BY p.created_at DESC LIMIT 30`).all(pg.id, before).map((p) => contagens(postView(p), user));
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
  const podeVerPost = (p, user) => p && !p.removed && (p.pagina_id ? !!PG.byId(p.pagina_id) : p.author_id === user.id || (p.visibility === 'todos' ? canSeeSocial(user, userById(p.author_id)) : areFriends(user.id, p.author_id)));
  // Quem recebe o aviso de curtida/comentário: o dono do post (no post de página, o dono da página).
  const quemAgiu = (user, pg) => (pg ? pg.name : user.name);
  // Curtir como eu ou como uma página minha (body.comoPagina). Cada um conta uma curtida.
  r.post('/posts/:id/curtir', ({ params, body, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!podeVerPost(p, user)) fail(404, 'Publicação não encontrada.');
    const pg = PG.como(user, body);
    let ja;
    if (pg) {
      ja = db.prepare('SELECT 1 FROM post_likes_pagina WHERE post_id = ? AND pagina_id = ?').get(p.id, pg.id);
      if (ja) db.prepare('DELETE FROM post_likes_pagina WHERE post_id = ? AND pagina_id = ?').run(p.id, pg.id);
      else db.prepare('INSERT INTO post_likes_pagina (post_id, pagina_id, created_at) VALUES (?,?,?)').run(p.id, pg.id, now());
    } else {
      ja = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(p.id, user.id);
      if (ja) db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(p.id, user.id);
      else db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?,?,?)').run(p.id, user.id, now());
    }
    if (!ja && p.author_id !== user.id) hub.send(p.author_id, 'curtida', { postId: p.id, fromName: quemAgiu(user, pg) });
    const v = contagens({ id: p.id }, user);
    return { liked: v.liked, likedPaginas: v.likedPaginas, likes: v.likes, comoPagina: pg ? pg.id : null };
  });
  // Comentário como no modelo do Instagram: autor (pessoa ou página), curtidas no comentário,
  // "Responder" e as respostas agrupadas embaixo ("Ver mais N respostas").
  const CMT_SQL = 'SELECT c.*, u.name, u.username, u.photo, g.name AS pg_name, g.handle AS pg_handle, g.photo AS pg_photo, g.cover AS pg_cover FROM post_comments c JOIN users u ON u.id = c.user_id LEFT JOIN paginas g ON g.id = c.pagina_id';
  const comentarioView = (c, user) => ({
    id: c.id, text: c.text, createdAt: c.created_at, parentId: c.parent_id || null,
    author: c.pagina_id ? { id: c.pagina_id, name: c.pg_name, username: c.pg_handle, photo: c.pg_photo || c.pg_cover || null, pagina: true } : { id: c.user_id, name: c.name, username: c.username, photo: c.photo },
    // Meu (escrevi como eu ou como página minha): pode apagar.
    mine: !!user && c.user_id === user.id,
    likes: db.prepare('SELECT COUNT(*) n FROM comment_likes WHERE comment_id = ?').get(c.id).n,
    likedBy: user ? db.prepare("SELECT actor FROM comment_likes WHERE comment_id = ? AND (actor = ? OR actor IN (SELECT 'pg:' || id FROM paginas WHERE owner_id = ?))").all(c.id, user.id, user.id).map((x) => x.actor) : [],
  });
  r.get('/posts/:id/comentarios', ({ params, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!podeVerPost(p, user)) fail(404, 'Publicação não encontrada.');
    return db.prepare(`${CMT_SQL} WHERE c.post_id = ? AND c.removed = 0 ORDER BY c.created_at LIMIT 300`).all(p.id).map((c) => comentarioView(c, user));
  });
  r.post('/posts/:id/comentarios', ({ params, body, user }) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.id);
    if (!podeVerPost(p, user)) fail(404, 'Publicação não encontrada.');
    const text = str(body.text, 'o comentário', { max: 600 });
    const m = moderateText(text, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const pg = PG.como(user, body);
    // Resposta: sempre fica embaixo do comentário principal (resposta de resposta sobe para ele).
    let parent = null;
    if (body.parentId) {
      const pc = db.prepare('SELECT * FROM post_comments WHERE id = ? AND post_id = ? AND removed = 0').get(String(body.parentId), p.id);
      if (!pc) fail(404, 'Comentário não encontrado.');
      parent = pc.parent_id || pc.id;
      const alvo = db.prepare('SELECT user_id FROM post_comments WHERE id = ?').get(pc.id);
      if (alvo && alvo.user_id !== user.id) hub.send(alvo.user_id, 'resposta', { postId: p.id, fromName: quemAgiu(user, pg), text });
    }
    const id = newId('pc');
    db.prepare('INSERT INTO post_comments (id, post_id, user_id, text, created_at, pagina_id, parent_id) VALUES (?,?,?,?,?,?,?)').run(id, p.id, user.id, text, now(), pg ? pg.id : null, parent);
    if (p.author_id !== user.id) hub.send(p.author_id, 'comentario', { postId: p.id, fromName: quemAgiu(user, pg), text });
    return comentarioView(db.prepare(`${CMT_SQL} WHERE c.id = ?`).get(id), user);
  }, { status: 201 });
  // Curtir um comentário (coração da direita), como eu ou como página minha.
  r.post('/comentarios/:id/curtir', ({ params, body, user }) => {
    const c = db.prepare('SELECT * FROM post_comments WHERE id = ? AND removed = 0').get(params.id);
    const p = c && db.prepare('SELECT * FROM posts WHERE id = ?').get(c.post_id);
    if (!c || !podeVerPost(p, user)) fail(404, 'Comentário não encontrado.');
    const pg = PG.como(user, body);
    const actor = pg ? 'pg:' + pg.id : user.id;
    const ja = db.prepare('SELECT 1 FROM comment_likes WHERE comment_id = ? AND actor = ?').get(c.id, actor);
    if (ja) db.prepare('DELETE FROM comment_likes WHERE comment_id = ? AND actor = ?').run(c.id, actor);
    else db.prepare('INSERT INTO comment_likes (comment_id, actor, created_at) VALUES (?,?,?)').run(c.id, actor, now());
    return { liked: !ja, likes: db.prepare('SELECT COUNT(*) n FROM comment_likes WHERE comment_id = ?').get(c.id).n, actor };
  });
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
  // Depoimento de pessoa ou de página (comoPagina), para pessoa (toId) ou para página (toPaginaId).
  // O dono de quem recebe aceita ou recusa. Página anônima manda e recebe sem revelar o dono.
  r.post('/testimonials', ({ body, user }) => {
    const de = PG.como(user, body);
    let toId;
    let paraPg = null;
    if (body.toPaginaId) {
      paraPg = PG.byId(body.toPaginaId);
      if (!paraPg) fail(404, 'Página não encontrada.');
      toId = paraPg.owner_id;
      if (de && de.id === paraPg.id) fail(400, 'A página não pode deixar depoimento para ela mesma.');
      if (!de && toId === user.id) fail(400, 'Você não pode deixar depoimento para a sua própria página.');
    } else {
      toId = target(body.toId).id;
      if (!de && toId === user.id) fail(400, 'Você não pode deixar depoimento para si mesmo.');
      if (de && toId === user.id) fail(400, 'Sua página não pode deixar depoimento para você mesmo.');
    }
    const mt = moderateText(body.text, 'publico');
    if (!mt.ok) fail(422, mt.why, mt.kind);
    const id = newId('dp');
    db.prepare('INSERT INTO testimonials (id, from_id, to_id, text, status, created_at, from_pagina_id, to_pagina_id) VALUES (?,?,?,?,?,?,?,?)').run(id, user.id, toId, str(body.text, 'o depoimento', { min: 5, max: 600 }), 'pendente', now(), de ? de.id : null, paraPg ? paraPg.id : null);
    hub.send(toId, 'testimonial', { id, from: de ? PG.autor(de) : pub(user), toPagina: paraPg ? { id: paraPg.id, name: paraPg.name } : null });
    return { id, status: 'pendente' };
  }, { status: 201 });
  // Depoimento no formato do app: quem mandou é a página quando foi "como página".
  const DEP_SQL = 'SELECT t.id, t.text, t.created_at AS createdAt, t.from_pagina_id, t.to_pagina_id, f.id AS f_id, f.name AS f_name, f.photo AS f_photo, fp.name AS fp_name, fp.photo AS fp_photo, fp.cover AS fp_cover, tp.name AS tp_name, d.id AS d_id, d.name AS d_name FROM testimonials t JOIN users f ON f.id = t.from_id JOIN users d ON d.id = t.to_id LEFT JOIN paginas fp ON fp.id = t.from_pagina_id LEFT JOIN paginas tp ON tp.id = t.to_pagina_id';
  const depView = (t) => ({
    id: t.id, text: t.text, createdAt: t.createdAt,
    fromId: t.from_pagina_id || t.f_id, fromName: t.from_pagina_id ? t.fp_name : t.f_name, fromPhoto: t.from_pagina_id ? t.fp_photo || t.fp_cover || null : t.f_photo, fromPagina: !!t.from_pagina_id,
    toId: t.to_pagina_id || t.d_id, toName: t.to_pagina_id ? t.tp_name : t.d_name, toPagina: !!t.to_pagina_id,
  });
  r.get('/testimonials/pending', ({ user }) =>
    db.prepare(`${DEP_SQL} WHERE t.to_id = ? AND t.status = 'pendente' ORDER BY t.created_at DESC`).all(user.id).map(depView)
  );
  // Depoimentos aceitos de uma página (aparecem na página aberta).
  r.get('/paginas/:id/depoimentos', ({ params }) => {
    const pg = PG.byId(params.id);
    if (!pg) fail(404, 'Página não encontrada.');
    return db.prepare(`${DEP_SQL} WHERE t.to_pagina_id = ? AND t.status = 'aceito' ORDER BY t.created_at DESC LIMIT 30`).all(pg.id).map(depView);
  });
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
    db.prepare(`${DEP_SQL} WHERE t.status = 'aceito' AND (t.to_pagina_id IS NOT NULL OR d.privacy = 'todos') ORDER BY t.created_at DESC LIMIT 40`).all().map(depView)
  );

  // ── Mensagens (com histórico) ──
  // Sinais da mensagem (pétalas da Lotus no app): enviada (chegou no servidor) → entregue (chegou no
  // aparelho de quem recebe: app aberto, ou abriu a lista de conversas) → lida (abriu a conversa).
  // Quem mandou fica sabendo na hora pelo aviso 'message_status' (não vira notificação no celular).
  const avisarSinal = (lista, status, at) => {
    const porQuem = new Map();
    lista.forEach((m) => {
      if (!porQuem.has(m.from_id)) porQuem.set(m.from_id, { with: m.to_id, ids: [] });
      porQuem.get(m.from_id).ids.push(m.id);
    });
    porQuem.forEach((d, from) => hub.send(from, 'message_status', { ...d, status, at }));
  };
  const marcarEntregues = (toId) => {
    const l = db.prepare('SELECT id, from_id, to_id FROM messages WHERE to_id = ? AND delivered_at IS NULL LIMIT 500').all(toId);
    if (!l.length) return;
    const at = now();
    db.prepare('UPDATE messages SET delivered_at = ? WHERE to_id = ? AND delivered_at IS NULL').run(at, toId);
    avisarSinal(l, 'entregue', at);
  };
  if (hub.onConnect) hub.onConnect(marcarEntregues);
  const msgView = (m) => ({ id: m.id, clientId: m.client_id || undefined, from: m.from_id, to: m.to_id, text: m.text, media: m.media, mediaType: m.media_type, at: m.created_at, deliveredAt: m.delivered_at || null, readAt: m.read_at || null });
  r.post('/messages', ({ body, user }) => {
    const to = target(body.toId);
    if (to.id === user.id) fail(400, 'Escolha outra pessoa.');
    // A mesma mensagem chegando de novo (o celular mandou da fila sem internet e repetiu): devolve a que já existe.
    const clientId = typeof body.clientId === 'string' && /^[\w-]{6,64}$/.test(body.clientId) ? body.clientId : null;
    if (clientId) {
      const ja = db.prepare('SELECT * FROM messages WHERE from_id = ? AND client_id = ?').get(user.id, clientId);
      if (ja) return { ...msgView(ja), fromName: user.name };
    }
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
    // Proteção Realyz: mensagem com vários sinais de golpe para desconhecido não é enviada.
    if (protecao && msg.text) {
      const pr = protecao.mensagem({ fromId: user.id, toId: to.id, texto: msg.text, amigos });
      if (pr.barrar) fail(422, pr.barrar, 'golpe');
    }
    // Mídia só entre amigos (em conversa de negócio, catálogo e fotos vão pelos caminhos da loja).
    if (media && (!amigos || vende || negocio(to))) fail(403, 'Foto, vídeo e áudio são liberados na conversa entre amigos.', 'midia_amigos');
    // App de quem recebe aberto agora: já chega no aparelho dele (entregue).
    msg.clientId = clientId || undefined;
    msg.deliveredAt = hub.online(to.id) ? msg.at : null;
    msg.readAt = null;
    db.prepare('INSERT INTO messages (id, from_id, to_id, text, created_at, media, media_type, client_id, delivered_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id, user.id, to.id, msg.text, msg.at, media, mediaType, clientId, msg.deliveredAt);
    hub.send(to.id, 'message', { ...msg, fromName: user.name });
    // CRM: conversa de cliente com empresa/prestador abre (ou atualiza) o atendimento sozinha.
    if (crm && msg.text) {
      try {
        crm.aoMensagem(user, to, msg.text, ['Shop', 'Food', 'Reels', 'Anúncio', 'Página', 'Campanha', 'Chamado'].includes(body.origem) ? body.origem : 'Página');
      } catch (e) {}
    }
    // Atendente IA da empresa/prestador (se estiver ligado): responde em seguida, sem travar esta mensagem.
    if (atendente) setImmediate(() => atendente.aoReceber(msg).catch(() => {}));
    return msg;
  }, { status: 201 });

  // CRM (empresa e prestador): meus atendimentos e mudanças feitas pelo app.
  r.get('/crm/leads', ({ user }) => (crm ? crm.listar(user.id) : []));
  r.patch('/crm/leads/:id', ({ params, user, body }) => {
    const l = crm && crm.atualizar(user.id, params.id, body || {});
    if (!l) fail(404, 'Atendimento não encontrado.');
    return l;
  });

  // Conversas: a última mensagem de cada pessoa e quantas não lidas.
  r.get('/conversations', ({ user }) => {
    marcarEntregues(user.id);
    return db.prepare(
      `SELECT other, MAX(created_at) AS at FROM (SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END AS other, created_at FROM messages WHERE from_id = ? OR to_id = ?) GROUP BY other ORDER BY at DESC LIMIT 50`
    ).all(user.id, user.id, user.id).map((c) => {
      const last = db.prepare('SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC LIMIT 1').get(user.id, c.other, c.other, user.id);
      const unread = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE from_id = ? AND to_id = ? AND read_at IS NULL').get(c.other, user.id).n;
      const rotulo = { foto: '📷 Foto', video: '🎬 Vídeo', audio: '🎤 Áudio' }[last.media_type];
      return { with: pub(userById(c.other)), last: { text: last.text || rotulo || '', from: last.from_id, at: last.created_at, deliveredAt: last.delivered_at || null, readAt: last.read_at || null }, unread };
    });
  });

  // Histórico com uma pessoa (e marca como lidas).
  r.get('/messages/:userId', ({ params, user, query }) => {
    const other = String(params.userId);
    const before = Number(query.before || now() + 1);
    // Abriu a conversa: o que a outra pessoa mandou fica lido (e entregue), e ela fica sabendo na hora.
    const novas = db.prepare('SELECT id, from_id, to_id FROM messages WHERE from_id = ? AND to_id = ? AND read_at IS NULL LIMIT 500').all(other, user.id);
    if (novas.length) {
      const at = now();
      db.prepare('UPDATE messages SET read_at = ?, delivered_at = COALESCE(delivered_at, ?) WHERE from_id = ? AND to_id = ? AND read_at IS NULL').run(at, at, other, user.id);
      avisarSinal(novas, 'lida', at);
    }
    return db.prepare('SELECT id, client_id AS clientId, from_id AS "from", to_id AS "to", text, media, media_type AS mediaType, created_at AS at, delivered_at AS deliveredAt, read_at AS readAt, ia FROM messages WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND created_at < ? ORDER BY created_at DESC LIMIT 100')
      .all(user.id, other, other, user.id, before).reverse();
  });

  // ── Denúncias (fake news, golpe, perfil falso) ──
  r.post('/reports', ({ body, user }) => {
    const kind = oneOf(body.targetKind, 'o tipo', ['post', 'user', 'product', 'live']);
    const id = newId('rp');
    const alvoId = str(body.targetId, 'o alvo', { max: 60 });
    const motivo = str(body.reason, 'o motivo', { min: 3, max: 500 });
    db.prepare('INSERT INTO reports (id, from_id, target_kind, target_id, reason, created_at) VALUES (?,?,?,?,?,?)').run(id, user.id, kind, alvoId, motivo, now());
    if (protecao) protecao.denuncia(id, kind, alvoId, motivo);
    return { id, status: 'aberta' };
  }, { status: 201 });
}
