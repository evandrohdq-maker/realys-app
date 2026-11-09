// Fotos, vídeos e músicas. O app envia o arquivo direto no corpo (PUT /media, com Content-Type)
// e recebe o endereço para usar em posts, produtos, perfil, artistas etc.
import { mkdirSync, writeFileSync, createReadStream, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fail, newId, now } from '../http.js';
import { makeImageModerator } from '../moderacaoImagem.js';

const TYPES = {
  'image/jpeg': 'imagem', 'image/png': 'imagem', 'image/webp': 'imagem', 'image/heic': 'imagem',
  'video/mp4': 'video', 'video/quicktime': 'video', 'audio/mpeg': 'audio', 'audio/mp4': 'audio', 'audio/aac': 'audio',
};

export default function mediaRoutes(r, { db, cfg, hub }) {
  const mod = cfg.imageModerator || makeImageModerator(cfg);
  const dir = join(cfg.dataDir, 'media');
  mkdirSync(dir, { recursive: true });

  // uso=privado: foto ou vídeo de conversa entre duas pessoas (fica só entre elas e não passa pela
  // regra de nudez). Qualquer outro uso é público (post, story, perfil, Date, loja, anúncio) e passa pela IA:
  //   bloquear -> o arquivo é apagado na hora e o envio é recusado (código "nudez");
  //   revisar  -> fica escondido até a equipe liberar;
  //   liberar  -> aparece normalmente. Biquíni, maiô e sunga podem.
  r.put('/media', async ({ req, raw, user, query }) => {
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!TYPES[mime]) fail(415, 'Tipo de arquivo não aceito. Envie foto (JPG, PNG, WEBP), vídeo (MP4) ou música (MP3).');
    if (!raw.length) fail(400, 'Arquivo vazio.');
    const uso = query && query.uso === 'privado' ? 'privado' : 'publico';
    const id = newId('md');
    const file = join(dir, id);
    writeFileSync(file, raw);
    let res = { decisao: 'liberar' };
    if (uso === 'publico' && TYPES[mime] === 'imagem') res = await mod.image(raw);
    else if (uso === 'publico' && TYPES[mime] === 'video' && mod.ready) res = await mod.frames(await mod.grab(file, { count: 6, everySec: 2 }));
    if (res.decisao === 'bloquear') {
      rmSync(file, { force: true });
      db.prepare('INSERT INTO moderacao_log (id, user_id, kind, ref, nudez, decisao, created_at) VALUES (?,?,?,?,?,?,?)').run(newId('ml'), user.id, TYPES[mime] === 'video' ? 'video' : 'foto', null, res.nudez == null ? null : res.nudez, 'bloquear', now());
      fail(422, 'Essa imagem não pode ser publicada: nudez e partes íntimas à mostra não são permitidas no Realys. Biquíni, maiô e sunga podem.', 'nudez');
    }
    const moderacao = res.decisao === 'revisar' ? 'revisao' : 'liberado';
    if (res.decisao !== 'liberar' || res.nudez != null) {
      // Registro da decisão (sem guardar a imagem bloqueada): a equipe vê quem tenta publicar nudez repetidas vezes.
      db.prepare('INSERT INTO moderacao_log (id, user_id, kind, ref, nudez, decisao, created_at) VALUES (?,?,?,?,?,?,?)').run(newId('ml'), user.id, TYPES[mime] === 'video' ? 'video' : 'foto', id, res.nudez == null ? null : res.nudez, res.decisao, now());
    }
    db.prepare('INSERT INTO media (id, owner_id, mime, size, created_at, uso, moderacao, nudez) VALUES (?,?,?,?,?,?,?,?)').run(id, user.id, mime, raw.length, now(), uso, moderacao, res.nudez == null ? null : res.nudez);
    return { id, url: `/media/${id}`, type: TYPES[mime], size: raw.length, moderacao };
  }, { raw: true, status: 201 });

  // Fila de revisão humana (só o administrador): liberar ou remover.
  r.get('/admin/moderacao', () => ({
    items: db.prepare(`SELECT id, owner_id AS ownerId, mime, nudez, created_at AS createdAt FROM media WHERE moderacao = 'revisao' ORDER BY created_at LIMIT 100`).all().map((m) => ({ ...m, url: `/admin/moderacao/${m.id}/arquivo` })),
  }), { auth: 'admin' });
  r.get('/admin/moderacao/:id/arquivo', ({ params, res }) => {
    const m = db.prepare('SELECT * FROM media WHERE id = ?').get(params.id);
    const file = m && join(dir, m.id);
    if (!m || !existsSync(file)) fail(404, 'Arquivo não encontrado.');
    res.writeHead(200, { 'Content-Type': m.mime, 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  }, { auth: 'admin' });
  r.post('/admin/moderacao/:id/:acao', ({ params }) => {
    const m = db.prepare('SELECT * FROM media WHERE id = ?').get(params.id);
    if (!m) fail(404, 'Arquivo não encontrado.');
    if (params.acao === 'liberar') db.prepare(`UPDATE media SET moderacao = 'liberado' WHERE id = ?`).run(m.id);
    else if (params.acao === 'remover') {
      rmSync(join(dir, m.id), { force: true });
      db.prepare(`UPDATE media SET moderacao = 'removido' WHERE id = ?`).run(m.id);
      if (hub) hub.send(m.owner_id, 'moderacao', { id: m.id, removido: true });
    } else fail(404, 'Ação inválida.');
    return { id: m.id, moderacao: params.acao === 'liberar' ? 'liberado' : 'removido' };
  }, { auth: 'admin' });

  // Público: as fotos e vídeos aparecem no app sem precisar de token. Vídeo e música aceitam "Range"
  // (o player do celular pede pedaços do arquivo para começar a tocar rápido).
  r.get('/media/:id', ({ params, req, res }) => {
    const m = db.prepare('SELECT * FROM media WHERE id = ?').get(params.id);
    const file = m && join(dir, m.id);
    if (!m || !existsSync(file)) fail(404, 'Arquivo não encontrado.');
    // Em revisão ou removido: não aparece para ninguém até a equipe liberar.
    if (m.moderacao && m.moderacao !== 'liberado') fail(404, 'Arquivo em análise.');
    const headers = { 'Content-Type': m.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': cfg.corsOrigin };
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), m.size - 1) : m.size - 1;
      if (start > end || start >= m.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${m.size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${m.size}`, 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': m.size });
      createReadStream(file).pipe(res);
    }
  }, { auth: false });
}
