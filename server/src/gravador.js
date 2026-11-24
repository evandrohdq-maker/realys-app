// Gravação das lives para tirar cortes: quando o streamer liga "Gravar para cortes", o servidor do app
// assiste a live como um espectador (HLS do servidor de vídeo) e copia o vídeo para um arquivo, sem
// converter (quase não usa processador). Ao terminar a live, a gravação aparece no editor, em
// "Das minhas lives", por 7 dias; depois é apagada para não ocupar espaço. Máximo de 4 horas.
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { newId, now } from './http.js';
import { mediaIdOf } from './routes/media.js';

const DIA = 86400000;
export const GRAVACAO_DIAS = 7;
const MAX_SEG = 4 * 3600;

export function makeGravador({ db, cfg, hub, ff }) {
  const mediaDir = join(cfg.dataDir, 'media');
  mkdirSync(mediaDir, { recursive: true });
  const ativas = new Map(); // live_id -> { proc, gid, file }
  const spawnFn = cfg.spawnGravador || spawn;

  const finalizar = async (gid, file, userId) => {
    let duracao = 0;
    try {
      duracao = (await ff.probe(file)).duration;
    } catch (e) {}
    if (!existsSync(file) || !statSync(file).size || duracao < 1) {
      rmSync(file, { force: true });
      db.prepare(`UPDATE live_gravacoes SET status = 'erro', ended_at = ? WHERE id = ?`).run(now(), gid);
      return;
    }
    const mid = file.split('/').pop();
    db.prepare(`INSERT INTO media (id, owner_id, mime, size, created_at, uso, moderacao) VALUES (?,?,'video/mp4',?,?,'publico','liberado')`).run(mid, userId, statSync(file).size, now());
    db.prepare(`UPDATE live_gravacoes SET status = 'pronta', media_url = ?, duracao = ?, ended_at = ?, expires_at = ? WHERE id = ?`).run(`/media/${mid}.mp4`, duracao, now(), now() + GRAVACAO_DIAS * DIA, gid);
    if (hub) hub.send(userId, 'gravacao', { id: gid, status: 'pronta', aviso: 'A gravação da sua live está pronta para fazer cortes no editor de vídeo.' });
  };

  // Começa a gravar (url = endereço HLS da live com o passe de leitura).
  const iniciar = (live, url) => {
    if (ativas.has(live.id)) return db.prepare('SELECT * FROM live_gravacoes WHERE id = ?').get(ativas.get(live.id).gid);
    const gid = newId('lg');
    const mid = newId('md');
    const file = join(mediaDir, mid);
    db.prepare(`INSERT INTO live_gravacoes (id, live_id, user_id, status, titulo, started_at) VALUES (?,?,?,'gravando',?,?)`).run(gid, live.id, live.host_id, live.title || 'Live', now());
    // MP4 fragmentado: mesmo se o processo cair no meio, o que já gravou fica utilizável.
    const proc = spawnFn(ff.bin, ['-y', '-v', 'error', '-i', url, '-c', 'copy', '-t', String(MAX_SEG), '-movflags', '+frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', file], { stdio: ['pipe', 'ignore', 'ignore'] });
    const reg = { proc, gid, file };
    ativas.set(live.id, reg);
    proc.on('error', () => {});
    proc.on('close', () => {
      ativas.delete(live.id);
      finalizar(gid, file, live.host_id).catch(() => {});
    });
    return db.prepare('SELECT * FROM live_gravacoes WHERE id = ?').get(gid);
  };
  // Live terminou (ou o streamer desligou a gravação): fecha o arquivo direitinho.
  const parar = (liveId) => {
    const reg = ativas.get(liveId);
    if (!reg) return false;
    try {
      reg.proc.stdin && reg.proc.stdin.write('q');
    } catch (e) {}
    setTimeout(() => {
      try {
        reg.proc.kill('SIGINT');
      } catch (e) {}
    }, 3000).unref?.();
    return true;
  };
  const gravando = (liveId) => ativas.has(liveId);
  const view = (g) => ({ id: g.id, liveId: g.live_id, status: g.status, video: g.media_url, duracao: g.duracao, titulo: g.titulo, startedAt: g.started_at, expiresAt: g.expires_at });
  const minhas = (userId) => db.prepare(`SELECT * FROM live_gravacoes WHERE user_id = ? AND status IN ('gravando','pronta') ORDER BY started_at DESC LIMIT 20`).all(userId).map(view);
  // Passou de 7 dias: apaga o arquivo da gravação (os vídeos feitos com ela continuam).
  const limpar = () => {
    for (const g of db.prepare(`SELECT * FROM live_gravacoes WHERE status = 'pronta' AND expires_at <= ? LIMIT 50`).all(now())) {
      const mid = mediaIdOf(g.media_url);
      rmSync(join(mediaDir, mid), { force: true });
      db.prepare(`UPDATE media SET moderacao = 'removido' WHERE id = ?`).run(mid);
      db.prepare(`UPDATE live_gravacoes SET status = 'apagada' WHERE id = ?`).run(g.id);
    }
  };
  const pararTudo = () => [...ativas.keys()].forEach(parar);
  return { iniciar, parar, gravando, minhas, limpar, pararTudo, view };
}
