// Fotos, vídeos e músicas. O app envia o arquivo direto no corpo (PUT /media, com Content-Type)
// e recebe o endereço para usar em posts, produtos, perfil, artistas etc.
import { mkdirSync, writeFileSync, createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, newId, now } from '../http.js';

const TYPES = {
  'image/jpeg': 'imagem', 'image/png': 'imagem', 'image/webp': 'imagem', 'image/heic': 'imagem',
  'video/mp4': 'video', 'video/quicktime': 'video', 'audio/mpeg': 'audio', 'audio/mp4': 'audio', 'audio/aac': 'audio',
};

export default function mediaRoutes(r, { db, cfg }) {
  const dir = join(cfg.dataDir, 'media');
  mkdirSync(dir, { recursive: true });

  r.put('/media', ({ req, raw, user }) => {
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!TYPES[mime]) fail(415, 'Tipo de arquivo não aceito. Envie foto (JPG, PNG, WEBP), vídeo (MP4) ou música (MP3).');
    if (!raw.length) fail(400, 'Arquivo vazio.');
    const id = newId('md');
    writeFileSync(join(dir, id), raw);
    db.prepare('INSERT INTO media (id, owner_id, mime, size, created_at) VALUES (?,?,?,?,?)').run(id, user.id, mime, raw.length, now());
    return { id, url: `/media/${id}`, type: TYPES[mime], size: raw.length };
  }, { raw: true, status: 201 });

  // Público: as fotos e vídeos aparecem no app sem precisar de token. Vídeo e música aceitam "Range"
  // (o player do celular pede pedaços do arquivo para começar a tocar rápido).
  r.get('/media/:id', ({ params, req, res }) => {
    const m = db.prepare('SELECT * FROM media WHERE id = ?').get(params.id);
    const file = m && join(dir, m.id);
    if (!m || !existsSync(file)) fail(404, 'Arquivo não encontrado.');
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
