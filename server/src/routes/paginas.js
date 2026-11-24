// Páginas dos usuários no servidor: criar, editar (estilo blog), seguir, postar foto/vídeo com música
// e ver os depoimentos aceitos da página. Curtir, comentar e mandar depoimento "como página" ficam
// nas rotas de social.js (campo comoPagina).
import { moderateText } from '../moderacaoTexto.js';
import { fail, newId, now, str } from '../http.js';
import { makePaginas, MAX_PAGINAS } from '../paginas.js';

const CATEGORIAS = ['comunidade', 'cidade', 'receitas', 'esporte', 'fe', 'humor', 'games', 'tecnologia', 'agro', 'pets', 'viagem', 'arte', 'estudos', 'outros'];
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 30);
// Página anônima não pode se passar por órgão, empresa ou algo "oficial".
const RESERVADO = /\b(oficial|prefeitura|governo|policia|brigada|bombeiros|defesa civil|samu|realys|realyz|banco|receita federal|ministerio)\b/;
const midia = (v) => {
  const m = str(v, 'a mídia', { optional: true, max: 300 }) || null;
  if (m && !/^\/media\/[A-Za-z0-9_.-]+$/.test(m) && !/^https:\/\//.test(m)) fail(400, 'Mídia inválida.');
  return m;
};
// Música do post (da galeria do Realyz): título, artista, capa, endereço e o trecho escolhido.
const musicaDe = (m) => {
  if (!m || typeof m !== 'object') return null;
  const url = String(m.url || '');
  if (!/^(https:\/\/|\/media\/)/.test(url)) return null;
  const s = (v, n) => String(v || '').slice(0, n);
  return JSON.stringify({ id: s(m.id, 60), title: s(m.title, 120), artist: s(m.artist, 120), cover: m.cover ? s(m.cover, 300) : null, url: s(url, 300), start: Math.max(0, Number(m.start) || 0), len: Math.max(0, Math.min(90, Number(m.len) || 0)) });
};
const estiloDe = (st) => {
  if (!st || typeof st !== 'object') return '{}';
  const o = {};
  for (const k of ['accent', 'bg', 'font', 'layout']) if (typeof st[k] === 'string') o[k] = st[k].slice(0, 30);
  return JSON.stringify(o);
};

export default function paginasRoutes(r, { db, hub, protecao, paginasCobranca: C }) {
  const P = makePaginas(db);
  const dono = (user, id) => {
    const pg = P.byId(id);
    if (!pg || pg.owner_id !== user.id) fail(404, 'Página não encontrada.');
    return pg;
  };
  const conferirNome = (name, anon, ignorarId) => {
    const n = str(name, 'o nome da página', { min: 3, max: 50 });
    const t = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (anon && RESERVADO.test(t)) fail(400, 'Página anônima não pode usar nome de órgão público, empresa ou de algo "oficial".');
    const m = moderateText(n, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    return n;
  };
  const handleLivre = (base) => {
    let h = slug(base) || 'pagina';
    if (h.length < 3) h = h + 'pg';
    let tentativa = h;
    for (let i = 2; db.prepare('SELECT 1 FROM paginas WHERE handle = ?').get(tentativa) || db.prepare('SELECT 1 FROM users WHERE username = ?').get(tentativa); i++) tentativa = `${h.slice(0, 27)}${i}`;
    return tentativa;
  };

  r.post('/paginas', ({ body, user }) => {
    if (P.daPessoa(user.id).length >= MAX_PAGINAS) fail(400, `Cada conta pode ter até ${MAX_PAGINAS} páginas.`);
    const anon = !!body.anon;
    const name = conferirNome(body.name, anon);
    const about = str(body.about, 'a apresentação', { optional: true, max: 300 });
    const ma = moderateText(about, 'publico');
    if (!ma.ok) fail(422, ma.why, ma.kind);
    const category = CATEGORIAS.includes(body.category) ? body.category : 'outros';
    const cover = midia(body.cover);
    const photo = midia(body.photo);
    const handle = handleLivre(body.handle || name);
    // A primeira página é grátis; a partir da segunda, cobra o 1º mês (R$ 14,90) do saldo na hora.
    const id = C.criar(user.id, (plano) => {
      const nid = newId('pg');
      db.prepare('INSERT INTO paginas (id, owner_id, name, handle, about, category, cover, photo, style, anon, created_at, paga, pago_ate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
        nid, user.id, name, handle, about, category, cover, photo, estiloDe(body.style), anon ? 1 : 0, now(), plano.paga, plano.pago_ate
      );
      return nid;
    });
    return P.view(P.byId(id), user);
  }, { status: 201 });

  // Minhas páginas (aba Páginas e seletor "Publicar como").
  r.get('/me/paginas', ({ user }) => P.daPessoa(user.id).map((pg) => P.view(C.cobrarSeVenceu(pg), user)));
  // Quanto custa a próxima página (0 = a primeira, grátis).
  r.get('/me/paginas/preco', ({ user }) => ({ valor: P.daPessoa(user.id).length >= 1 ? 14.9 : 0, max: MAX_PAGINAS }));
  // Pagar a mensalidade atrasada (depois de pôr saldo).
  r.post('/paginas/:id/pagar', ({ params, user }) => {
    const pg = dono(user, params.id);
    const p = C.cobrarSeVenceu(pg);
    if (p.paga && p.plano_status === 'atrasado') fail(402, 'Saldo insuficiente para a mensalidade da página (R$ 14,90). Adicione saldo na carteira.', 'saldo_insuficiente');
    return P.view(p, user);
  });

  // Busca e descoberta: por nome, *handle ou assunto; as mais seguidas primeiro.
  r.get('/paginas', ({ query, user }) => {
    const q = String(query.q || '').trim().replace(/^[*@#]/, '').toLowerCase();
    const cat = CATEGORIAS.includes(query.categoria) ? query.categoria : null;
    const like = `%${q.replace(/[%_]/g, '')}%`;
    return db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pagina_seguidores s WHERE s.pagina_id = p.id) AS n FROM paginas p WHERE p.removed = 0 ${q ? 'AND (lower(p.name) LIKE ? OR p.handle LIKE ?)' : ''} ${cat ? 'AND p.category = ?' : ''} ORDER BY n DESC, p.created_at DESC LIMIT 40`)
      .all(...(q ? [like, like] : []), ...(cat ? [cat] : []))
      .map((pg) => P.view(pg, user));
  });
  // Páginas que eu sigo.
  r.get('/me/paginas-seguidas', ({ user }) =>
    db.prepare('SELECT p.* FROM pagina_seguidores s JOIN paginas p ON p.id = s.pagina_id WHERE s.user_id = ? AND p.removed = 0 ORDER BY s.created_at DESC').all(user.id).map((pg) => P.view(pg, user))
  );

  r.get('/paginas/:id', ({ params, user }) => {
    const pg = P.byId(params.id) || db.prepare('SELECT * FROM paginas WHERE handle = ? AND removed = 0').get(String(params.id).replace(/^[*@]/, '').toLowerCase());
    if (!pg) fail(404, 'Página não encontrada.');
    return P.view(pg, user);
  });

  r.patch('/paginas/:id', ({ params, body, user }) => {
    const pg = dono(user, params.id);
    const anon = body.anon === undefined ? !!pg.anon : !!body.anon;
    const f = {};
    if (body.name !== undefined || body.anon !== undefined) f.name = conferirNome(body.name === undefined ? pg.name : body.name, anon);
    if (body.about !== undefined) {
      f.about = str(body.about, 'a apresentação', { optional: true, max: 300 });
      const m = moderateText(f.about, 'publico');
      if (!m.ok) fail(422, m.why, m.kind);
    }
    if (body.category !== undefined) f.category = CATEGORIAS.includes(body.category) ? body.category : 'outros';
    if (body.cover !== undefined) f.cover = midia(body.cover);
    if (body.photo !== undefined) f.photo = midia(body.photo);
    if (body.style !== undefined) f.style = estiloDe(body.style);
    if (body.anon !== undefined) f.anon = anon ? 1 : 0;
    const keys = Object.keys(f);
    if (keys.length) db.prepare(`UPDATE paginas SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => f[k]), pg.id);
    return P.view(P.byId(pg.id), user);
  });

  r.delete('/paginas/:id', ({ params, user }) => {
    const pg = dono(user, params.id);
    db.prepare('UPDATE paginas SET removed = 1 WHERE id = ?').run(pg.id);
    db.prepare('UPDATE posts SET removed = 1 WHERE pagina_id = ?').run(pg.id);
    C.promoverGratis(user.id);
  });

  // Seguir / deixar de seguir (o botão "Seguir" do topo do post e da página).
  r.post('/paginas/:id/seguir', ({ params, user }) => {
    const pg = P.byId(params.id);
    if (!pg) fail(404, 'Página não encontrada.');
    if (pg.owner_id === user.id) fail(400, 'Essa página é sua.');
    const ja = P.segue(pg.id, user.id);
    if (ja) db.prepare('DELETE FROM pagina_seguidores WHERE pagina_id = ? AND user_id = ?').run(pg.id, user.id);
    else {
      db.prepare('INSERT INTO pagina_seguidores (pagina_id, user_id, created_at) VALUES (?,?,?)').run(pg.id, user.id, now());
      hub.send(pg.owner_id, 'pagina_seguidor', { paginaId: pg.id, paginaName: pg.name, fromName: user.name });
    }
    return { seguindo: !ja, seguidores: P.seguidores(pg.id) };
  });

  // Post da página: texto, foto ou vídeo, e música opcional (toca junto, como no story).
  r.post('/paginas/:id/posts', ({ params, body, user }) => {
    const pg = C.exigirEmDia(dono(user, params.id));
    const text = str(body.text, 'o texto', { optional: true, max: 2200 });
    const media = midia(body.media);
    const musica = musicaDe(body.musica);
    if (!text && !media) fail(400, 'Escreva algo ou escolha uma foto ou vídeo.');
    const m = moderateText(text, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const barra = protecao && text ? protecao.barrarPost(text) : null;
    if (barra) fail(422, barra, 'golpe');
    const id = newId('ps');
    db.prepare(`INSERT INTO posts (id, author_id, kind, text, media, visibility, created_at, pagina_id, musica) VALUES (?,?,'post',?,?,'todos',?,?,?)`).run(id, user.id, text, media, now(), pg.id, musica);
    if (protecao && text) protecao.post(id, text);
    return { id, paginaId: pg.id };
  }, { status: 201 });
}
