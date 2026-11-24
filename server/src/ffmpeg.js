// Ferramentas de áudio e vídeo do servidor (ffmpeg e ffprobe).
// - Música de estúdio (WAV, FLAC, AIFF): vira AAC 256 kbps (.m4a), ~1/6 do tamanho, e o original é apagado.
// - Vídeo de qualquer celular (MOV, HEVC do iPhone, 4K): vira MP4 H.264 até 1080p, que toca em todo Android.
//   O vídeo é convertido depois do envio (em fila), para o envio não ficar esperando.
import { spawn } from 'node:child_process';
import { existsSync, renameSync, rmSync, statSync } from 'node:fs';

export function makeFfmpeg(cfg = {}) {
  const ffmpeg = cfg.ffmpegPath || 'ffmpeg';
  const ffprobe = cfg.ffprobePath || 'ffprobe';
  const run = (bin, args, { timeoutMs = 15 * 60 * 1000, onData } = {}) =>
    new Promise((resolve, reject) => {
      let out = '';
      let err = '';
      let p;
      try {
        p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        return reject(e);
      }
      const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
      p.stdout.on('data', (d) => {
        if (onData) onData(String(d));
        else out += d;
      });
      p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
      p.on('error', (e) => {
        clearTimeout(t);
        reject(e);
      });
      p.on('close', (code) => {
        clearTimeout(t);
        if (code === 0) resolve(out);
        else reject(new Error(`${bin} saiu com ${code}: ${err.split('\n').slice(-4).join(' ')}`));
      });
    });
  // Informações do arquivo: duração, se tem som, codec e tamanho do vídeo.
  const probe = async (file) => {
    const j = JSON.parse(await run(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { timeoutMs: 60000 }));
    const v = (j.streams || []).find((s) => s.codec_type === 'video');
    const a = (j.streams || []).find((s) => s.codec_type === 'audio');
    return {
      duration: Number((j.format && j.format.duration) || (v && v.duration) || (a && a.duration) || 0),
      hasVideo: !!v,
      hasAudio: !!a,
      vcodec: v ? v.codec_name : null,
      acodec: a ? a.codec_name : null,
      width: v ? Number(v.width) : 0,
      height: v ? Number(v.height) : 0,
      format: (j.format && j.format.format_name) || '',
    };
  };
  let disponivel = null;
  const ok = async () => {
    if (disponivel !== null) return disponivel;
    try {
      await run(ffmpeg, ['-version'], { timeoutMs: 10000 });
      disponivel = true;
    } catch (e) {
      disponivel = false;
    }
    return disponivel;
  };
  // Música de estúdio -> AAC 256 kbps (m4a). Troca o arquivo no lugar. Devolve o tamanho novo.
  const audioLeve = async (file) => {
    const tmp = `${file}.conv.m4a`;
    await run(ffmpeg, ['-y', '-v', 'error', '-i', file, '-vn', '-c:a', 'aac', '-b:a', '256k', '-ar', '44100', '-movflags', '+faststart', tmp], { timeoutMs: 5 * 60 * 1000 });
    rmSync(file, { force: true });
    renameSync(tmp, file);
    return statSync(file).size;
  };
  // Vídeo precisa converter? (fora do MP4/H.264, acima de 1080p ou com som que o Android não toca)
  const precisaConverter = (info) =>
    !!info.hasVideo && (info.vcodec !== 'h264' || Math.min(info.width, info.height) > 1080 || !/mp4|mov/.test(info.format) || (info.hasAudio && !['aac', 'mp3'].includes(info.acodec)));
  // Vídeo -> MP4 H.264 até 1080p (no lado menor), som AAC. Troca o arquivo no lugar.
  const videoUniversal = async (file) => {
    const tmp = `${file}.conv.mp4`;
    await run(ffmpeg, [
      '-y', '-v', 'error', '-i', file,
      '-vf', "scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)',format=yuv420p",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', tmp,
    ]);
    if (!existsSync(tmp)) throw new Error('conversão sem arquivo');
    rmSync(file, { force: true });
    renameSync(tmp, file);
    return statSync(file).size;
  };
  return { run, probe, ok, audioLeve, precisaConverter, videoUniversal, bin: ffmpeg };
}
