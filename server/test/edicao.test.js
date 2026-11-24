// Editor de vídeo de verdade (com o ffmpeg): WAV vira AAC leve, o vídeo é gerado com cortes,
// velocidade, texto e música, e a assinatura segue a regra do 1º mês grátis. Sem ffmpeg na máquina,
// os testes que precisam dele são pulados.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';
import { makeFfmpeg } from '../src/ffmpeg.js';

let temFfmpeg = true;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch (e) {
  temFfmpeg = false;
}
let app, base, dir, A, ana;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-edicao-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false, edicaoAltura: 360 }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const r = await fetch(base + '/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'pessoa', name: 'Ana Souza', doc: '52998224725', username: 'anasouza', email: 'ana@teste.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO }) });
  ana = await r.json();
  A = ana.accessToken;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, body, headers = {}) {
  const raw = body instanceof Buffer;
  const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${A}`, ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: raw ? body : body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error}`);
  return data;
}
const gerar = (args, out) => {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args, out]);
  return readFileSync(out);
};

test('WAV de estúdio vira AAC leve e o original some', { skip: !temFfmpeg }, async () => {
  const wav = gerar(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=8', '-ac', '2', '-ar', '44100'], join(dir, 'musica.wav'));
  const up = await call('PUT', '/media', wav, { 'Content-Type': 'audio/wav' });
  assert.equal(up.convertido, 'audio/mp4');
  assert.match(up.url, /\.m4a$/);
  assert.ok(up.size < wav.length / 3, `ficou leve: ${up.size} de ${wav.length}`);
  const info = await makeFfmpeg({}).probe(join(dir, 'media', up.id));
  assert.equal(info.acodec, 'aac');
});

test('editor: 1º mês grátis, vídeo gerado com cortes, velocidade, texto e música; depois assinatura', { skip: !temFfmpeg }, async () => {
  // Dois clipes: um com som, outro sem som (o editor completa com silêncio).
  const c1 = gerar(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30:duration=6', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest'], join(dir, 'c1.mp4'));
  const c2 = gerar(['-f', 'lavfi', '-i', 'testsrc2=size=360x640:rate=30:duration=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p'], join(dir, 'c2.mp4'));
  const m1 = await call('PUT', '/media', c1, { 'Content-Type': 'video/mp4' });
  const m2 = await call('PUT', '/media', c2, { 'Content-Type': 'video/mp4' });
  const mus = await call('PUT', '/media', gerar(['-f', 'lavfi', '-i', 'sine=frequency=660:duration=20'], join(dir, 'm.mp3')), { 'Content-Type': 'audio/mpeg' });

  assert.equal((await call('GET', '/edicao/plano')).status, 'novo');
  const receita = {
    titulo: 'Meu vídeo',
    clipes: [{ media: m1.url, start: 1, end: 5, speed: 2 }, { media: m2.url, start: 0, end: 3, speed: 1 }],
    textos: [{ text: "Olá Passo Fundo! 'aspas' : e \\ barra", start: 0, end: 3, pos: 'baixo', tamanho: 'g' }],
    musica: { url: mus.url, start: 2, volume: 0.6 },
    somOriginal: 0.8,
    filtro: 'vivo',
    formato: 'vertical',
    capaEm: 1,
  };
  // Vídeo de outra pessoa não entra.
  await assert.rejects(call('POST', '/edicao/videos', { ...receita, clipes: [{ media: '/media/md_naoexiste', start: 0, end: 1 }] }), /400/);
  const job = await call('POST', '/edicao/videos', receita);
  assert.equal(job.status, 'fila');
  assert.equal(job.plano.status, 'gratis', 'o primeiro vídeo começa o mês grátis');
  assert.equal(job.duracao, 5); // (5-1)/2 + 3
  await assert.rejects(call('POST', '/edicao/videos', receita), /429/, 'um vídeo por vez na fila');
  await app.edicao.esperarFila();
  const pronto = await call('GET', `/edicao/videos/${job.id}`);
  assert.equal(pronto.status, 'pronto', pronto.erro || '');
  assert.match(pronto.video, /^\/media\/md_.*\.mp4$/);
  assert.ok(pronto.capa);
  const info = await makeFfmpeg({}).probe(join(dir, 'media', pronto.video.replace(/^\/media\//, '').replace(/\.mp4$/, '')));
  assert.ok(Math.abs(info.duration - 5) < 0.4, `duração ${info.duration}`);
  assert.equal(info.width, 360);
  assert.equal(info.height, 640);
  assert.ok(info.hasAudio);

  // Longo demais (passa do limite: 3 min, ou 6 min para artista).
  await assert.rejects(call('POST', '/edicao/videos', { clipes: Array.from({ length: 20 }, () => ({ media: m1.url, start: 0, end: 20, speed: 0.5 })) }), /400/);

  // Acabou o mês grátis: pede para assinar. Sem saldo não assina; com saldo, R$ 19,90 e volta a gerar.
  app.db.prepare('UPDATE edicao_planos SET gratis_ate = ? WHERE user_id = ?').run(Date.now() - 1000, ana.user.id);
  await assert.rejects(call('POST', '/edicao/videos', receita), /402/);
  await assert.rejects(call('POST', '/edicao/assinar'), /402/);
  app.wallet.move(ana.user.id, 'saldo', 3000, 'Depósito', 'teste');
  const ass = await call('POST', '/edicao/assinar');
  assert.equal(ass.status, 'assinado');
  assert.equal(ass.renova, true);
  assert.equal(app.wallet.get(ana.user.id).balance, 3000 - 1990);
  const cancel = await call('POST', '/edicao/cancelar');
  assert.equal(cancel.renova, false);
  assert.equal(cancel.status, 'assinado', 'cancelar não tira o mês já pago');
});

test('gravação da live vira vídeo para cortes (7 dias) e some depois', { skip: !temFfmpeg }, async () => {
  const fonte = join(dir, 'live.mp4');
  gerar(['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=30:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p'], fonte);
  app.db.prepare(`INSERT INTO lives (id, host_id, host_type, host_name, cat, title, status, started_at) VALUES ('lv_1', ?, 'usuario', 'Ana', 'games', 'Minha live', 'ao_vivo', ?)`).run(ana.user.id, Date.now());
  const live = app.db.prepare('SELECT * FROM lives WHERE id = ?').get('lv_1');
  app.gravador.iniciar(live, fonte);
  for (let i = 0; i < 100 && app.gravador.gravando('lv_1'); i++) await new Promise((r) => setTimeout(r, 100));
  let lista = [];
  for (let i = 0; i < 50; i++) {
    lista = await call('GET', '/edicao/gravacoes');
    if (lista[0] && lista[0].status === 'pronta') break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(lista[0].status, 'pronta');
  assert.ok(lista[0].duracao > 2);
  // A gravação pode virar clipe no editor (é vídeo da própria pessoa).
  const job = await call('POST', '/edicao/videos', { clipes: [{ media: lista[0].video, start: 0.5, end: 2.5 }], formato: 'quadrado' });
  await app.edicao.esperarFila();
  assert.equal((await call('GET', `/edicao/videos/${job.id}`)).status, 'pronto');
  // Passados 7 dias, a gravação é apagada.
  app.db.prepare('UPDATE live_gravacoes SET expires_at = ? WHERE id = ?').run(Date.now() - 1, lista[0].id);
  app.gravador.limpar();
  assert.equal((await call('GET', '/edicao/gravacoes')).length, 0);
});
