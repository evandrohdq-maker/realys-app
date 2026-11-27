// Reels no servidor: vídeos curtos (em pé) de empresas e pessoas. A empresa publica na área dela
// (Shop, Food, Mercado, Serviços, Negócios) e todo mundo vê; pessoas publicam na Comunidade.
// O vídeo sobe antes por PUT /media (como nos posts). Reels turbinados aparecem primeiro.
import { fail, newId, now, str, oneOf } from '../http.js';
import { moderateText } from '../moderacaoTexto.js';

const AREAS = ['comunidade', 'shop', 'food', 'mercado', 'servicos', 'negocios'];
const MIDIA = /^\/media\/[\w.-]+$/;

export default function reelsRoutes(r, { db, userById, protecao }) {
  const view = (x) => {
    const a = userById(x.author_id) || {};
    return { id: x.id, area: x.area, titulo: x.titulo, video: x.video, poster: x.poster, anuncio: !!x.anuncio, views: x.views, criadoEm: x.created_at, autor: { id: a.id, nome: a.name, foto: a.photo || null, empresa: a.kind === 'empresa' } };
  };

  r.post('/reels', ({ body, user }) => {
    const b = body || {};
    const video = str(b.video, 'o vídeo', { max: 300 });
    if (!MIDIA.test(video)) fail(400, 'Envie o vídeo antes de publicar.');
    const poster = typeof b.poster === 'string' && MIDIA.test(b.poster) ? b.poster : null;
    const titulo = str(b.titulo, 'a legenda', { optional: true, max: 300 });
    const m = moderateText(titulo, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const barra = protecao && titulo && protecao.barrarPost ? protecao.barrarPost(titulo) : null;
    if (barra) fail(422, barra, 'golpe');
    const u = userById(user.id);
    // Empresa escolhe a área dela; pessoa publica na Comunidade.
    const area = u && u.kind === 'empresa' ? oneOf(b.area || 'shop', 'a área', AREAS) : 'comunidade';
    const id = newId('rl');
    db.prepare('INSERT INTO reels (id, author_id, area, titulo, video, poster, anuncio, created_at) VALUES (?,?,?,?,?,?,?,?)').run(id, user.id, area, titulo, video, poster, u && u.kind === 'empresa' ? 1 : 0, now());
    return view(db.prepare('SELECT * FROM reels WHERE id = ?').get(id));
  }, { status: 201 });

  // Lista de uma área (ou de todas). Turbinados ativos primeiro, depois os mais novos.
  r.get('/reels', ({ query }) => {
    const area = AREAS.includes(query.area) ? query.area : null;
    const autor = query.autor ? String(query.autor) : null;
    const lim = Math.min(60, Math.max(1, Number(query.limite) || 30));
    const where = ['removed = 0'];
    const args = [];
    if (area) where.push('area = ?'), args.push(area);
    if (autor) where.push('author_id = ?'), args.push(autor);
    const lista = db.prepare(`SELECT * FROM reels WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`).all(...args, lim);
    let turbo = new Set();
    try {
      turbo = new Set(db.prepare("SELECT alvo FROM turbinar WHERE alvo_tipo = 'reel' AND status = 'ativo' AND ends_at > ?").all(now()).map((x) => x.alvo));
    } catch (e) {}
    return lista.sort((a, b) => (turbo.has(b.id) ? 1 : 0) - (turbo.has(a.id) ? 1 : 0)).map((x) => ({ ...view(x), turbinado: turbo.has(x.id) }));
  });

  // Alguém assistiu (conta uma visualização).
  r.post('/reels/:id/visto', ({ params }) => {
    db.prepare('UPDATE reels SET views = views + 1 WHERE id = ? AND removed = 0').run(params.id);
    return { ok: true };
  });

  // Apagar o próprio Reel.
  r.delete('/reels/:id', ({ params, user }) => {
    const x = db.prepare('SELECT * FROM reels WHERE id = ?').get(params.id);
    if (!x || x.author_id !== user.id) fail(404, 'Reel não encontrado.');
    db.prepare('UPDATE reels SET removed = 1 WHERE id = ?').run(x.id);
    return { ok: true };
  });
}
