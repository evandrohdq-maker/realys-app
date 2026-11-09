// Moderação de imagens: pergunta ao serviço local de IA (server/moderacao-ia) se a foto tem nudez.
// Nada sai do servidor. Sem MODERACAO_URL, a moderação automática fica desligada (vale a denúncia).
// Vídeos e lives: tira alguns quadros com o ffmpeg (se estiver instalado) e confere o pior deles.
import { spawn } from 'node:child_process';

export function makeImageModerator(cfg) {
  const url = (cfg.moderacaoUrl || '').replace(/\/$/, '');
  const timeoutMs = cfg.moderacaoTimeoutMs || 20000;
  const ready = !!url;

  async function call(path, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!r.ok) throw new Error('moderação respondeu ' + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  // Falha do serviço nunca libera sozinha uma imagem pública: vai para revisão humana.
  async function image(buf) {
    if (!ready) return { decisao: 'liberar', desligada: true };
    try {
      return await call('/nudez', { image: buf.toString('base64') });
    } catch (e) {
      return { decisao: 'revisar', erro: e.message };
    }
  }

  async function frames(list) {
    if (!ready) return { decisao: 'liberar', desligada: true };
    if (!list.length) return { decisao: 'revisar', erro: 'sem quadros' };
    try {
      return await call('/nudez/quadros', { frames: list.map((b) => b.toString('base64')) });
    } catch (e) {
      return { decisao: 'revisar', erro: e.message };
    }
  }

  // Quadros de um vídeo ou de uma live (arquivo local ou endereço rtsp://). Precisa do ffmpeg.
  function grab(input, { count = 4, everySec = 2 } = {}) {
    return new Promise((resolve) => {
      const args = ['-hide_banner', '-loglevel', 'error', '-i', input, '-vf', `fps=1/${everySec},scale=448:-1`, '-frames:v', String(count), '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'];
      let p;
      try {
        p = spawn(cfg.ffmpegPath || 'ffmpeg', args);
      } catch (e) {
        return resolve([]);
      }
      const chunks = [];
      p.stdout.on('data', (c) => chunks.push(c));
      p.on('error', () => resolve([]));
      const kill = setTimeout(() => p.kill('SIGKILL'), 30000);
      p.on('close', () => {
        clearTimeout(kill);
        resolve(splitJpegs(Buffer.concat(chunks)));
      });
    });
  }

  return { ready, image, frames, grab };
}

// O ffmpeg manda os JPEGs colados: separa pelos marcadores de início (FFD8) e fim (FFD9).
export function splitJpegs(buf) {
  const out = [];
  let start = -1;
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8 && start < 0) start = i;
    else if (buf[i] === 0xff && buf[i + 1] === 0xd9 && start >= 0) {
      out.push(buf.subarray(start, i + 2));
      start = -1;
      i++;
    }
  }
  return out;
}
