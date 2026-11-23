// APK do Realyz servido pelo próprio servidor (sem depender das Releases do GitHub, que ficam fechadas
// quando o repositório é privado). O deploy/publicar-site.sh baixa o APK novo para data/baixar/.
//   GET /baixar/realyz.apk   → o arquivo (aceita "Range", para continuar download que caiu)
//   GET /app/versao          → { build, url, size } para o app saber se tem atualização
import { existsSync, statSync, readFileSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { fail } from '../http.js';

export default function baixarRoutes(r, { cfg }) {
  const dir = join(cfg.dataDir, 'baixar');
  const apk = join(dir, 'realyz.apk');
  const info = () => {
    try {
      return JSON.parse(readFileSync(join(dir, 'versao.json'), 'utf8'));
    } catch (e) {
      return null;
    }
  };
  r.get('/app/versao', () => {
    const v = info();
    if (!v || !existsSync(apk)) fail(404, 'APK ainda não publicado no servidor.');
    const base = cfg.publicUrl || 'https://api.realyz.com.br';
    return { build: Number(v.build) || 0, name: v.name || `Realyz ${v.build}`, notes: v.notes || '', url: `${base}/baixar/realyz.apk`, size: statSync(apk).size };
  }, { auth: false });

  r.get('/baixar/realyz.apk', ({ req, res }) => {
    if (!existsSync(apk)) fail(404, 'APK ainda não publicado no servidor.');
    const size = statSync(apk).size;
    const headers = { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': 'attachment; filename="realyz.apk"', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      return createReadStream(apk, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    createReadStream(apk).pipe(res);
  }, { auth: false });
}
