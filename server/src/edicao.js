// Editor de vídeo do Realyz (para criadores, streamers, artistas e todo mundo da rede).
// O app monta a "receita" do vídeo (clipes com corte e velocidade, textos, música, filtro, formato e
// capa) e mostra a prévia; o servidor gera o MP4 final com o ffmpeg, numa fila (um vídeo por vez),
// e avisa quando fica pronto. Aí a pessoa publica na página, no perfil, nos Reels ou no story.
//
// Assinatura: o primeiro mês é grátis (começa no primeiro vídeo gerado) e não obriga a assinar.
// Depois, R$ 19,90 por mês do saldo Realyz, renovando sozinho até a pessoa cancelar.
// Limite: 3 minutos por vídeo; artista (clipe de música) até 6 minutos.
import { mkdirSync, rmSync, writeFileSync, existsSync, statSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { HttpError, newId, now } from './http.js';
import { tx } from './db.js';
import { mediaIdOf } from './routes/media.js';

const DIA = 86400000;
export const EDICAO_CENTS = 1990;
export const EDICAO_GRATIS_DIAS = 30;
export const EDICAO_DIAS = 30;
export const LIMITE_SEG = { normal: 180, artista: 360 };
const MAX_CLIPES = 20;
const MAX_TEXTOS = 10;
const VELOCIDADES = [0.5, 1, 1.5, 2];
const FORMATOS = { vertical: [1080, 1920], quadrado: [1080, 1080], horizontal: [1920, 1080] };
const FILTROS = {
  nenhum: '',
  vivo: 'eq=contrast=1.08:saturation=1.35',
  pb: 'hue=s=0,eq=contrast=1.1',
  quente: 'colorbalance=rs=0.08:gs=0.02:bs=-0.08',
  frio: 'colorbalance=rs=-0.06:bs=0.1',
  suave: 'eq=contrast=0.92:brightness=0.03:saturation=0.9',
};
const num = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const r3 = (n) => Math.round(n * 1000) / 1000;

export function makeEdicao({ db, cfg, wallet, hub, ff }) {
  const mediaDir = join(cfg.dataDir, 'media');
  const tmpDir = join(cfg.dataDir, 'edicao-tmp');
  mkdirSync(tmpDir, { recursive: true });

  // ---------- Assinatura ----------
  const linha = (userId) => db.prepare('SELECT * FROM edicao_planos WHERE user_id = ?').get(userId);
  const view = (userId) => {
    const p = linha(userId);
    const t = now();
    if (!p) return { status: 'novo', ativo: true, gratisDias: EDICAO_GRATIS_DIAS, valor: EDICAO_CENTS / 100 };
    const gratis = p.gratis_ate > t;
    const pago = (p.pago_ate || 0) > t;
    return {
      status: pago ? 'assinado' : gratis ? 'gratis' : 'vencido',
      ativo: gratis || pago,
      gratisAte: p.gratis_ate,
      pagoAte: p.pago_ate || null,
      renova: !!p.renova,
      valor: EDICAO_CENTS / 100,
      diasRestantes: Math.max(0, Math.ceil(((pago ? p.pago_ate : p.gratis_ate) - t) / DIA)),
    };
  };
  // Primeiro vídeo: começa o mês grátis (sem cartão, sem obrigação).
  const exigir = (userId) => {
    if (!linha(userId)) db.prepare('INSERT INTO edicao_planos (user_id, gratis_ate, pago_ate, renova, created_at) VALUES (?,?,NULL,0,?)').run(userId, now() + EDICAO_GRATIS_DIAS * DIA, now());
    const v = view(userId);
    if (!v.ativo) throw new HttpError(402, `Seu mês grátis do editor de vídeo acabou. Assine por R$ 19,90 por mês (do saldo Realyz) para continuar gerando vídeos.`, 'assinar_editor');
    return v;
  };
  const cobrar = (userId) => {
    const ref = newId('ed');
    wallet.pay(userId, EDICAO_CENTS, 'Editor de vídeo', 'Assinatura mensal do editor de vídeo', ref);
    wallet.move('realys', 'saldo', EDICAO_CENTS, 'Editor de vídeo', 'Assinatura do editor de vídeo', ref);
  };
  // Assinar: cobra o mês agora; se ainda tem dias grátis ou pagos, o mês novo começa depois deles.
  const assinar = (userId) =>
    tx(db, () => {
      if (!linha(userId)) db.prepare('INSERT INTO edicao_planos (user_id, gratis_ate, pago_ate, renova, created_at) VALUES (?,?,NULL,0,?)').run(userId, now(), now());
      const p = linha(userId);
      try {
        cobrar(userId);
      } catch (e) {
        if (e.code === 'saldo_insuficiente') throw new HttpError(402, 'Saldo insuficiente para assinar o editor de vídeo (R$ 19,90). Adicione saldo na carteira.', 'saldo_insuficiente');
        throw e;
      }
      const base = Math.max(now(), p.gratis_ate || 0, p.pago_ate || 0);
      db.prepare('UPDATE edicao_planos SET pago_ate = ?, renova = 1 WHERE user_id = ?').run(base + EDICAO_DIAS * DIA, userId);
      return view(userId);
    });
  // Cancelar: para de renovar; continua usando até o fim do mês já pago.
  const cancelar = (userId) => {
    db.prepare('UPDATE edicao_planos SET renova = 0 WHERE user_id = ?').run(userId);
    return view(userId);
  };
  // Renovação de quem assinou (varredura a cada minuto). Sem saldo: para de renovar e avisa.
  const renovar = () => {
    for (const p of db.prepare('SELECT * FROM edicao_planos WHERE renova = 1 AND pago_ate <= ? LIMIT 100').all(now())) {
      try {
        tx(db, () => {
          cobrar(p.user_id);
          db.prepare('UPDATE edicao_planos SET pago_ate = pago_ate + ? WHERE user_id = ?').run(EDICAO_DIAS * DIA, p.user_id);
        });
      } catch (e) {
        db.prepare('UPDATE edicao_planos SET renova = 0 WHERE user_id = ?').run(p.user_id);
        if (hub) hub.send(p.user_id, 'edicao_plano', { status: 'vencido', aviso: 'A assinatura do editor de vídeo não renovou por falta de saldo.' });
      }
    }
  };

  // ---------- Receita do vídeo ----------
  const arquivoDe = (url, user, tipo) => {
    const id = mediaIdOf(url);
    const m = /^\/media\//.test(String(url || '').replace(/^https?:\/\/[^/]+/, '')) ? db.prepare('SELECT * FROM media WHERE id = ?').get(id) : null;
    if (!m || (m.moderacao && m.moderacao !== 'liberado') || !existsSync(join(mediaDir, m.id))) throw new HttpError(400, tipo === 'musica' ? 'Música não encontrada no Realyz.' : 'Um dos vídeos não foi encontrado. Envie de novo.');
    if (tipo === 'clipe' && m.owner_id !== user.id) throw new HttpError(403, 'Use só vídeos seus no editor.');
    if (tipo === 'clipe' && !/^video\//.test(m.mime)) throw new HttpError(400, 'Todos os clipes precisam ser vídeo.');
    if (tipo === 'musica' && !/^audio\//.test(m.mime)) throw new HttpError(400, 'A trilha precisa ser uma música.');
    return join(mediaDir, m.id);
  };
  const hostsMusica = cfg.musicaHosts || ['incompetech.com'];
  const fonteMusica = (url, user) => {
    const u = String(url || '');
    if (/^https:\/\//.test(u) && !/\/media\//.test(u)) {
      const host = new URL(u).hostname;
      if (!hostsMusica.some((h) => host === h || host.endsWith('.' + h))) throw new HttpError(400, 'Use uma música da galeria do Realyz.');
      return u;
    }
    return arquivoDe(u, user, 'musica');
  };
  const validar = (user, b, limite) => {
    const clipes = (Array.isArray(b.clipes) ? b.clipes : []).slice(0, MAX_CLIPES + 1);
    if (!clipes.length) throw new HttpError(400, 'Escolha pelo menos um vídeo.');
    if (clipes.length > MAX_CLIPES) throw new HttpError(400, `Até ${MAX_CLIPES} clipes por vídeo.`);
    const cl = clipes.map((c) => {
      const start = num(c.start, 0, 36000, 0);
      const end = num(c.end, start + 0.2, 36000, start + 0.2);
      const speed = VELOCIDADES.includes(Number(c.speed)) ? Number(c.speed) : 1;
      return { url: String(c.media || ''), file: arquivoDe(c.media, user, 'clipe'), start: r3(start), end: r3(end), speed };
    });
    const total = cl.reduce((s, c) => s + (c.end - c.start) / c.speed, 0);
    if (total > limite + 0.5) throw new HttpError(400, `O vídeo pode ter no máximo ${Math.round(limite / 60)} minutos. Corte um pouco e tente de novo.`, 'longo_demais');
    const textos = (Array.isArray(b.textos) ? b.textos : []).slice(0, MAX_TEXTOS).map((t) => ({
      text: String(t.text || '').replace(/\r/g, '').slice(0, 120),
      start: num(t.start, 0, total, 0),
      end: num(t.end, 0, total, total),
      pos: ['topo', 'meio', 'baixo'].includes(t.pos) ? t.pos : 'baixo',
      tamanho: ['p', 'm', 'g'].includes(t.tamanho) ? t.tamanho : 'm',
      cor: /^#[0-9a-f]{6}$/i.test(t.cor || '') ? t.cor : '#FFFFFF',
    })).filter((t) => t.text.trim() && t.end > t.start);
    const musica = b.musica && b.musica.url ? { src: fonteMusica(b.musica.url, user), url: String(b.musica.url), start: num(b.musica.start, 0, 3600, 0), volume: num(b.musica.volume, 0, 1.5, 1) } : null;
    return {
      clipes: cl,
      textos,
      musica,
      somOriginal: num(b.somOriginal, 0, 1.5, 1),
      filtro: FILTROS[b.filtro] !== undefined ? b.filtro : 'nenhum',
      ajuste: { brilho: num(b.brilho, -0.3, 0.3, 0), contraste: num(b.contraste, 0.6, 1.5, 1), saturacao: num(b.saturacao, 0, 2, 1) },
      formato: FORMATOS[b.formato] ? b.formato : 'vertical',
      capaEm: num(b.capaEm, 0, total, Math.min(1, total / 2)),
      total: r3(total),
    };
  };

  // ---------- Montagem do comando do ffmpeg ----------
  const montar = async (rc, pasta, saida) => {
    const altura = Number(cfg.edicaoAltura) || 1080;
    const [W0, H0] = FORMATOS[rc.formato];
    const k = altura / Math.min(W0, H0);
    const W = Math.round((W0 * k) / 2) * 2;
    const H = Math.round((H0 * k) / 2) * 2;
    const args = ['-y', '-v', 'error', '-progress', 'pipe:1', '-nostats'];
    const partes = [];
    const pares = [];
    for (let i = 0; i < rc.clipes.length; i++) {
      const c = rc.clipes[i];
      args.push('-i', c.file);
      let temSom = true;
      try {
        temSom = (await ff.probe(c.file)).hasAudio;
      } catch (e) {}
      const dur = r3((c.end - c.start) / c.speed);
      partes.push(`[${i}:v]trim=start=${c.start}:end=${c.end},setpts=(PTS-STARTPTS)/${c.speed},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,setsar=1,format=yuv420p[v${i}]`);
      if (temSom) partes.push(`[${i}:a]atrim=start=${c.start}:end=${c.end},asetpts=PTS-STARTPTS${c.speed !== 1 ? `,atempo=${c.speed}` : ''},aresample=44100,aformat=channel_layouts=stereo,volume=${rc.somOriginal}[a${i}]`);
      else partes.push(`anullsrc=r=44100:cl=stereo,atrim=duration=${dur}[a${i}]`);
      pares.push(`[v${i}][a${i}]`);
    }
    partes.push(`${pares.join('')}concat=n=${rc.clipes.length}:v=1:a=1[vc][ac]`);
    // Filtro, ajuste fino e textos por cima.
    const vf = [];
    if (FILTROS[rc.filtro]) vf.push(FILTROS[rc.filtro]);
    const a = rc.ajuste;
    if (a.brilho || a.contraste !== 1 || a.saturacao !== 1) vf.push(`eq=brightness=${a.brilho}:contrast=${a.contraste}:saturation=${a.saturacao}`);
    const fonte = cfg.fonteVideo && existsSync(cfg.fonteVideo) ? cfg.fonteVideo : null;
    if (fonte) {
      rc.textos.forEach((t, i) => {
        // O texto vai num arquivo (textfile): nenhum caractere digitado vira comando do ffmpeg.
        const tf = join(pasta, `texto${i}.txt`);
        writeFileSync(tf, t.text);
        const size = Math.round(W * { p: 0.045, m: 0.065, g: 0.09 }[t.tamanho]);
        const y = { topo: 'h*0.12', meio: '(h-text_h)/2', baixo: 'h*0.80-text_h' }[t.pos];
        vf.push(`drawtext=fontfile=${fonte}:textfile=${tf}:fontsize=${size}:fontcolor=${t.cor}:borderw=${Math.max(2, Math.round(size / 14))}:bordercolor=black@0.55:x=(w-text_w)/2:y=${y}:line_spacing=8:enable='between(t,${r3(t.start)},${r3(t.end)})'`);
      });
    }
    partes.push(`[vc]${vf.length ? vf.join(',') : 'null'}[vout]`);
    if (rc.musica) {
      args.push('-ss', String(rc.musica.start), '-i', rc.musica.src);
      partes.push(`[${rc.clipes.length}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${rc.musica.volume},atrim=duration=${rc.total}[am]`);
      partes.push(`[ac][am]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`);
    } else partes.push('[ac]anull[aout]');
    args.push('-filter_complex', partes.join(';'), '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', String(rc.total), saida);
    return args;
  };

  // ---------- Fila ----------
  const jobView = (j) => ({ id: j.id, status: j.status, pct: j.pct || 0, duracao: j.duracao, video: j.media_url, capa: j.capa_url, erro: j.erro, titulo: j.titulo, createdAt: j.created_at, doneAt: j.done_at });
  let rodando = false;
  const salvarMidia = (userId, file, mime) => {
    const id = newId('md');
    renameSync(file, join(mediaDir, id));
    db.prepare(`INSERT INTO media (id, owner_id, mime, size, created_at, uso, moderacao) VALUES (?,?,?,?,?,'publico','liberado')`).run(id, userId, mime, statSync(join(mediaDir, id)).size, now());
    return `/media/${id}${mime === 'video/mp4' ? '.mp4' : ''}`;
  };
  const processar = async (j) => {
    const pasta = join(tmpDir, j.id);
    mkdirSync(pasta, { recursive: true });
    const saida = join(pasta, 'final.mp4');
    const capa = join(pasta, 'capa.jpg');
    try {
      const rc = JSON.parse(j.receita);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(j.user_id);
      // Confere de novo os arquivos (podem ter sido removidos pela moderação enquanto esperava).
      const fresca = validar(user, rc.original, rc.limite);
      const args = await montar(fresca, pasta, saida);
      let ultimo = 0;
      await ff.run(ff.bin, args, {
        timeoutMs: 30 * 60 * 1000,
        onData: (txt) => {
          const m = /out_time_ms=(\d+)/g.exec(txt);
          if (!m) return;
          const pct = Math.min(99, Math.round((Number(m[1]) / 1e6 / fresca.total) * 100));
          if (pct - ultimo >= 5) {
            ultimo = pct;
            db.prepare('UPDATE edicao_jobs SET pct = ? WHERE id = ?').run(pct, j.id);
            if (hub) hub.send(j.user_id, 'edicao', { id: j.id, status: 'processando', pct });
          }
        },
      });
      await ff.run(ff.bin, ['-y', '-v', 'error', '-ss', String(fresca.capaEm), '-i', saida, '-frames:v', '1', '-q:v', '3', capa], { timeoutMs: 60000 }).catch(() => {});
      const video = salvarMidia(j.user_id, saida, 'video/mp4');
      const capaUrl = existsSync(capa) ? salvarMidia(j.user_id, capa, 'image/jpeg') : null;
      db.prepare(`UPDATE edicao_jobs SET status = 'pronto', pct = 100, media_url = ?, capa_url = ?, duracao = ?, done_at = ? WHERE id = ?`).run(video, capaUrl, fresca.total, now(), j.id);
    } catch (e) {
      const msg = e instanceof HttpError ? e.message : 'Não deu para gerar o vídeo. Confira os clipes e tente de novo.';
      db.prepare(`UPDATE edicao_jobs SET status = 'erro', erro = ?, done_at = ? WHERE id = ?`).run(msg, now(), j.id);
      if (!(e instanceof HttpError)) console.error(new Date().toISOString(), 'edicao', j.id, e.message);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
      const fim = db.prepare('SELECT * FROM edicao_jobs WHERE id = ?').get(j.id);
      if (hub) hub.send(j.user_id, 'edicao', jobView(fim));
    }
  };
  let parado = false;
  const proximo = async () => {
    if (rodando || parado) return;
    const j = db.prepare(`SELECT * FROM edicao_jobs WHERE status = 'fila' ORDER BY created_at LIMIT 1`).get();
    if (!j) return;
    rodando = true;
    db.prepare(`UPDATE edicao_jobs SET status = 'processando', started_at = ? WHERE id = ?`).run(now(), j.id);
    try {
      await processar(j);
    } finally {
      rodando = false;
      setImmediate(proximo);
    }
  };
  // Servidor reiniciou no meio: volta para a fila.
  db.prepare(`UPDATE edicao_jobs SET status = 'fila', pct = 0 WHERE status = 'processando'`).run();
  setTimeout(proximo, 1000).unref?.();

  const criar = async (user, body, { artista }) => {
    if (!(await ff.ok())) throw new HttpError(503, 'O editor de vídeo está sendo instalado no servidor. Tente de novo em alguns minutos.', 'editor_off');
    const limite = artista ? LIMITE_SEG.artista : LIMITE_SEG.normal;
    const rc = validar(user, body || {}, limite);
    const plano = exigir(user.id);
    // Um vídeo por vez na fila para cada pessoa (o servidor é dividido entre todos).
    if (db.prepare(`SELECT 1 FROM edicao_jobs WHERE user_id = ? AND status IN ('fila','processando')`).get(user.id)) throw new HttpError(429, 'Você já tem um vídeo sendo gerado. Espere ficar pronto para mandar outro.', 'na_fila');
    const id = newId('ej');
    const titulo = String((body && body.titulo) || '').slice(0, 80) || null;
    db.prepare(`INSERT INTO edicao_jobs (id, user_id, status, receita, duracao, titulo, created_at) VALUES (?,?,'fila',?,?,?,?)`).run(id, user.id, JSON.stringify({ original: body, limite }), rc.total, titulo, now());
    setImmediate(proximo);
    const naFrente = db.prepare(`SELECT COUNT(*) n FROM edicao_jobs WHERE status IN ('fila','processando') AND created_at < ?`).get(now()).n;
    return { ...jobView(db.prepare('SELECT * FROM edicao_jobs WHERE id = ?').get(id)), naFrente, plano };
  };
  const listar = (userId) => db.prepare('SELECT * FROM edicao_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(userId).map(jobView);
  const um = (userId, id) => {
    const j = db.prepare('SELECT * FROM edicao_jobs WHERE id = ? AND user_id = ?').get(id, userId);
    if (!j) throw new HttpError(404, 'Vídeo não encontrado.');
    return jobView(j);
  };
  const esperarFila = async () => {
    while (rodando || db.prepare(`SELECT 1 FROM edicao_jobs WHERE status IN ('fila','processando')`).get()) await new Promise((r) => setTimeout(r, 100));
  };
  return { view, exigir, assinar, cancelar, renovar, criar, listar, um, esperarFila, parar: () => (parado = true), validar };
}
