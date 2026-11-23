// Rádios e TVs (Stream) no servidor. Antes a estação, a logo e a capa ficavam só no celular de quem
// cadastrou. Agora:
//   - GET    /estacoes?kind=radio|tv        → estações de todos (com seguidores e se eu sigo)
//   - POST   /estacoes                      → cadastrar ou editar a minha { id?, kind, name, url, genre, city, cat, emoji, logo, cover }
//   - DELETE /estacoes/:id                  → tirar a minha
//   - POST   /estacoes/:id/seguir           → seguir / deixar de seguir
//   - POST   /estacoes/:id/aovivo           → avisar os seguidores: "entrou ao vivo" (no máximo 1 aviso a cada 30 min)
// Logo e capa: o app sobe a imagem em PUT /media e manda aqui o endereço (/media/...).
import { fail, newId, now, str } from '../http.js';
import { moderateText } from '../moderacaoTexto.js';

const AVISO_MIN = 30 * 60000;
const urlOk = (u) => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(u) && !/\.(html?|php|aspx?)(\?|$)/i.test(u);
const midia = (v) => {
  const u = String(v || '').trim();
  if (!u) return null;
  // Só imagens do próprio servidor do Realyz (/media/...) ou https.
  const m = u.match(/\/media\/[A-Za-z0-9._-]+$/);
  if (m) return m[0];
  return /^https:\/\//.test(u) ? u.slice(0, 300) : null;
};

export default function estacoesRoutes(r, { db, hub }) {
  const seguidores = (id) => db.prepare('SELECT COUNT(*) n FROM estacao_follows WHERE estacao_id = ?').get(id).n;
  const view = (e, user) => ({
    id: e.id, kind: e.kind, name: e.name, url: e.url, genre: e.genre || '', city: e.city || '', cat: e.cat || null, emoji: e.emoji || null,
    logo: e.logo, cover: e.cover, ownerId: e.owner_id, owner: e.owner_name, mine: !!user && e.owner_id === user.id,
    seguidores: seguidores(e.id), seguindo: !!user && !!db.prepare('SELECT 1 FROM estacao_follows WHERE estacao_id = ? AND user_id = ?').get(e.id, user.id),
    aoVivoAt: e.aovivo_at || null, updatedAt: e.updated_at, server: true,
  });
  const SQL = 'SELECT e.*, u.name AS owner_name FROM estacoes e JOIN users u ON u.id = e.owner_id';
  const minha = (id, user) => {
    const e = db.prepare(`${SQL} WHERE e.id = ?`).get(String(id || ''));
    if (!e || e.status !== 'ativa') fail(404, 'Estação não encontrada.');
    if (e.owner_id !== user.id) fail(403, 'Só quem cadastrou pode mudar esta estação.');
    return e;
  };

  r.get('/estacoes', ({ query, user }) => {
    const kind = query.kind === 'tv' ? 'tv' : query.kind === 'radio' ? 'radio' : null;
    return db.prepare(`${SQL} WHERE e.status = 'ativa' AND u.status = 'ativo' ${kind ? 'AND e.kind = ?' : ''} ORDER BY e.updated_at DESC LIMIT 300`).all(...(kind ? [kind] : [])).map((e) => view(e, user));
  });

  r.post('/estacoes', ({ body, user }) => {
    const kind = body.kind === 'tv' ? 'tv' : 'radio';
    const name = str(body.name, 'o nome', { min: 2, max: 50 });
    const url = str(body.url, 'o endereço do sinal', { max: 400 });
    if (!urlOk(url)) fail(400, kind === 'tv' ? 'Use o link do sinal (.m3u8 ou .mp4), começando com http:// ou https://.' : 'Use o link do streaming (MP3, AAC, .m3u8, .pls ou .m3u), começando com http:// ou https://.');
    const genre = str(body.genre, 'o estilo', { optional: true, max: 40 }) || '';
    const m = moderateText(`${name} ${genre}`, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const dados = [name, url, genre, str(body.city, 'a cidade', { optional: true, max: 40 }) || '', String(body.cat || '').slice(0, 30) || null, String(body.emoji || '').slice(0, 8) || null, midia(body.logo), midia(body.cover)];
    const t = now();
    if (body.id && String(body.id).startsWith('es_')) {
      const e = minha(body.id, user);
      db.prepare('UPDATE estacoes SET name = ?, url = ?, genre = ?, city = ?, cat = ?, emoji = ?, logo = COALESCE(?, logo), cover = COALESCE(?, cover), updated_at = ? WHERE id = ?').run(...dados, t, e.id);
      return view(db.prepare(`${SQL} WHERE e.id = ?`).get(e.id), user);
    }
    if (db.prepare(`SELECT COUNT(*) n FROM estacoes WHERE owner_id = ? AND status = 'ativa'`).get(user.id).n >= 5) fail(429, 'Cada conta pode ter até 5 rádios ou TVs.');
    const id = newId('es');
    db.prepare('INSERT INTO estacoes (id, owner_id, kind, name, url, genre, city, cat, emoji, logo, cover, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, user.id, kind, ...dados, 'ativa', t, t);
    return view(db.prepare(`${SQL} WHERE e.id = ?`).get(id), user);
  });

  r.delete('/estacoes/:id', ({ params, user }) => {
    const e = minha(params.id, user);
    db.prepare(`UPDATE estacoes SET status = 'removida', updated_at = ? WHERE id = ?`).run(now(), e.id);
  });

  r.post('/estacoes/:id/seguir', ({ params, user }) => {
    const e = db.prepare(`SELECT * FROM estacoes WHERE id = ? AND status = 'ativa'`).get(String(params.id || ''));
    if (!e) fail(404, 'Estação não encontrada.');
    const ja = db.prepare('SELECT 1 FROM estacao_follows WHERE estacao_id = ? AND user_id = ?').get(e.id, user.id);
    if (ja) db.prepare('DELETE FROM estacao_follows WHERE estacao_id = ? AND user_id = ?').run(e.id, user.id);
    else db.prepare('INSERT INTO estacao_follows (estacao_id, user_id, created_at) VALUES (?,?,?)').run(e.id, user.id, now());
    return { seguindo: !ja, seguidores: seguidores(e.id) };
  });

  r.post('/estacoes/:id/aovivo', ({ params, user, body }) => {
    const e = minha(params.id, user);
    if (e.aovivo_at && now() - e.aovivo_at < AVISO_MIN) fail(429, 'Você já avisou os seguidores há pouco. Dá para avisar de novo daqui a 30 minutos.');
    const texto = str(body.texto, 'o recado', { optional: true, max: 120 }) || (e.kind === 'tv' ? 'Estamos ao vivo agora!' : 'No ar agora!');
    db.prepare('UPDATE estacoes SET aovivo_at = ? WHERE id = ?').run(now(), e.id);
    const quem = db.prepare('SELECT user_id FROM estacao_follows WHERE estacao_id = ?').all(e.id).map((x) => x.user_id);
    quem.forEach((u) => hub.send(u, 'estacao-aovivo', { id: e.id, kind: e.kind, name: e.name, texto }));
    return { avisados: quem.length };
  });
}
