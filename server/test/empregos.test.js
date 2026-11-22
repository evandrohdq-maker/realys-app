// Empregos: currículo com arquivo lido automaticamente, vaga com indicação sem nome, convite,
// candidatura, arquivo liberado só para a empresa certa e avisos sem spam.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
const avisos = [];
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-emp-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  const send = app.hub.send.bind(app.hub);
  app.hub.send = (u, type, data) => (avisos.push({ u, type, data }), send(u, type, data));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body, headers) {
  const raw = Buffer.isBuffer(body);
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) }, body: raw ? body : body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.arrayBuffer();
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status });
  return data;
}
const pessoa = (name, doc, username, extra = {}) => call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO, ...extra });

test('empregos: currículo lido do PDF, indicação sem nome, convite e candidatura', async () => {
  const emp = await call('POST', '/auth/signup', null, { kind: 'empresa', name: 'Churrascaria Gaúcha', doc: '11.222.333/0001-81', username: 'churrasgaucha', email: 'rh@churras.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO, segment: 'Restaurante' });
  const rafa = await pessoa('Rafael Lima', '52998224725', 'rafalima');
  const bia = await pessoa('Bia Souza', '11144477735', 'biasouza', { socialClass: 'Gastronomia · Garçonete' });
  const outro = await pessoa('Caio Reis', '39053344705', 'caioreis');

  // PDF com texto compactado: a leitura sugere garçom experiente e escolaridade.
  const conteudo = 'BT (Gar\\347om na Churrascaria do Centro - 3 anos) Tj T* (Ensino m\\351dio completo) Tj ET';
  const z = deflateSync(Buffer.from(conteudo, 'latin1'));
  const pdf = Buffer.concat([Buffer.from(`%PDF-1.4\n<< /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), z, Buffer.from('\nendstream\n%%EOF', 'latin1')]);
  const up = await call('PUT', '/curriculo/arquivo?nome=Rafael.pdf', rafa.accessToken, pdf, { 'Content-Type': 'application/pdf' });
  assert.equal(up.sugestao.funcoes[0].funcao, 'garcom');
  assert.equal(up.sugestao.funcoes[0].nivel, 'experiente');
  assert.equal(up.sugestao.escolaridade, 'Ensino médio completo');
  await assert.rejects(call('PUT', '/curriculo/arquivo', rafa.accessToken, Buffer.from('x'), { 'Content-Type': 'application/zip' }), /415/);
  await call('PUT', '/curriculo', rafa.accessToken, { funcoes: up.sugestao.funcoes, turnos: ['noite'], dias: ['sex', 'sab'], tipos: ['clt', 'extra'], lat: -28.262, lng: -52.407, fotos: ['https://api.realyz.com.br/media/md_abc', 'http://mal.com/x.jpg'] });
  const cv = (await call('GET', '/curriculo', rafa.accessToken)).curriculo;
  assert.deepEqual(cv.fotos, ['/media/md_abc'], 'só fotos da galeria do Realyz');
  // Caio só faz limpeza: não é indicado para garçom.
  await call('PUT', '/curriculo', outro.accessToken, { funcoes: [{ funcao: 'limpeza', nivel: 'experiente' }] });

  await assert.rejects(call('POST', '/vagas', rafa.accessToken, { titulo: 'Garçom', funcao: 'garcom' }), /403/);
  const vaga = await call('POST', '/vagas', emp.accessToken, { titulo: 'Garçom para o rodízio', funcao: 'garcom', nivel: 'ja-fiz', tipo: 'clt', salario: 2200, turnos: ['noite'], lat: -28.263, lng: -52.406 });
  assert.equal(vaga.indicados, 1);
  assert.ok(avisos.some((a) => a.u === rafa.user.id && a.type === 'vaga_indicada'), 'quem tem currículo é avisado');
  assert.ok(avisos.some((a) => a.u === bia.user.id && a.type === 'vaga_sugerida'), 'quem não tem currículo, mas é garçonete no perfil, recebe a sugestão');
  assert.ok(!avisos.some((a) => a.u === outro.user.id), 'quem não faz a função não é avisado');
  // Segunda vaga no mesmo dia: sem segundo aviso (anti-spam).
  await call('POST', '/vagas', emp.accessToken, { titulo: 'Garçom fim de semana', funcao: 'garcom', tipo: 'extra' });
  assert.equal(avisos.filter((a) => a.u === rafa.user.id && a.type === 'vaga_indicada').length, 1);

  // A empresa vê o indicado sem nome e convida.
  const [minha] = (await call('GET', '/vagas/minhas', emp.accessToken)).filter((v) => v.id === vaga.id);
  assert.equal(minha.indicados.length, 1);
  assert.ok(!JSON.stringify(minha.indicados).includes('Rafael'), 'sem nome');
  assert.match(minha.indicados[0].resumo, /Garçom experiente/);
  await assert.rejects(call('GET', `/curriculo/${rafa.user.id}/arquivo`, emp.accessToken), /403/);
  await call('POST', `/vagas/${vaga.id}/convidar`, emp.accessToken, { ref: minha.indicados[0].ref });
  assert.ok(avisos.some((a) => a.u === rafa.user.id && a.type === 'vaga_convite'));
  await assert.rejects(call('GET', `/curriculo/${rafa.user.id}/arquivo`, emp.accessToken), /403/, 'convite ainda não aceito');

  // Rafael aceita: a empresa passa a ver nome e o PDF.
  const [conv] = (await call('GET', '/candidaturas', rafa.accessToken)).filter((k) => k.id === vaga.id);
  assert.equal(conv.candidatura.status, 'convidado');
  await call('POST', `/candidaturas/${conv.candidatura.id}/responder`, rafa.accessToken, { aceitar: true });
  const [depois] = (await call('GET', '/vagas/minhas', emp.accessToken)).filter((v) => v.id === vaga.id);
  assert.equal(depois.candidatos[0].nome, 'Rafael Lima');
  assert.equal(depois.candidatos[0].temArquivo, true);
  const arq = await call('GET', `/curriculo/${rafa.user.id}/arquivo`, emp.accessToken);
  assert.ok(Buffer.from(arq).toString('latin1').startsWith('%PDF'));
  await assert.rejects(call('GET', `/curriculo/${rafa.user.id}/arquivo`, outro.accessToken), /403/, 'outra pessoa não vê');

  // Andamento chega para o candidato.
  await call('POST', `/candidaturas/${depois.candidatos[0].id}/status`, emp.accessToken, { status: 'entrevista' });
  assert.ok(avisos.some((a) => a.u === rafa.user.id && a.type === 'candidatura_status' && a.data.status === 'entrevista'));

  // Lista de vagas para quem procura, com a compatibilidade.
  const vagas = await call('GET', '/vagas', rafa.accessToken);
  assert.ok(vagas[0].pct >= 70, `compatível: ${vagas[0].pct}`);
  // Bia se candidata sem currículo: pede para completar.
  await assert.rejects(call('POST', `/vagas/${vaga.id}/candidatar`, bia.accessToken), /400/);
});
