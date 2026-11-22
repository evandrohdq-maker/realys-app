// Compras temporariamente bloqueadas: o servidor recusa tudo que mexe com dinheiro e o resto funciona.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-compras-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', adminUsername: 'chefe', adminPassword: 'Admin12345', testDeposits: true, comprasLiberadas: false }));
  await new Promise((r) => app.server.listen(0, r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
const call = async (method, path, body, token) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
};

test('status avisa que as compras estão bloqueadas e o Pix aguarda a conta', async () => {
  const r = await call('GET', '/status');
  assert.equal(r.status, 200);
  assert.equal(r.data.compras, 'bloqueadas');
  assert.match(r.data.comprasAviso, /temporariamente bloqueados/);
  assert.equal(r.data.pix, 'aguardando_conta');
});

test('com compras bloqueadas: depósito, presente e pedido são recusados; post e story funcionam', async () => {
  const reg = await call('POST', '/auth/signup', { kind: 'pessoa', name: 'Teste Compras', username: 'testecompras', doc: '52998224725', email: 'tc@t.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  assert.ok([200, 201].includes(reg.status), JSON.stringify(reg.data));
  const token = reg.data.accessToken;
  assert.ok(token, 'login devolve token');
  for (const [m, p, b] of [['POST', '/wallet/deposit', { amount: 10 }], ['POST', '/gifts', { toId: 'x', amount: 5 }], ['POST', '/orders', { items: [] }]]) {
    const r = await call(m, p, b, token);
    assert.equal(r.status, 403, `${p} deveria ser bloqueado`);
    assert.equal(r.data.code, 'compras_bloqueadas');
  }
  const post = await call('POST', '/posts', { kind: 'story', text: 'Meu primeiro story' }, token);
  assert.equal(post.status, 201);
  const st = await call('GET', '/stories', null, token);
  assert.equal(st.data.length, 1);
});

test('vídeo do story: endereço com .mp4, abre pelo endereço e o story diz que é vídeo', async () => {
  const reg = await call('POST', '/auth/signup', { kind: 'pessoa', name: 'Vida Video', username: 'vidavideo', doc: '11144477735', email: 'vv@t.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  const token = reg.data.accessToken;
  const up = await fetch(base + '/media', { method: 'PUT', headers: { 'Content-Type': 'video/mp4', Authorization: `Bearer ${token}` }, body: Buffer.from('00000020667479706d703432', 'hex') });
  const m = await up.json();
  assert.equal(up.status, 201, JSON.stringify(m));
  assert.match(m.url, /^\/media\/md_[\w-]+\.mp4$/);
  const got = await fetch(base + m.url);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('content-type'), 'video/mp4');
  const semExt = await fetch(base + m.url.replace(/\.mp4$/, ''));
  assert.equal(semExt.status, 200);
  await call('POST', '/posts', { kind: 'story', media: m.url.replace(/\.mp4$/, '') }, token); // story antigo, sem extensão
  const st = await call('GET', '/stories', null, token);
  const meu = st.data.find((g) => g.author.id === reg.data.user.id);
  assert.equal(meu.items[0].mediaType, 'video');
});

test('conta de teste: admin cria sem CPF, ela entra, aparece com selo e pode ser desativada', async () => {
  const adm = await call('POST', '/auth/login', { login: 'chefe', password: 'Admin12345' });
  const at = adm.data.accessToken;
  const sem = await call('POST', '/admin/contas-teste', { name: 'Teste Um', username: 'teste1', password: 'senha1234' });
  assert.equal(sem.status, 401, 'sem login não cria');
  const c = await call('POST', '/admin/contas-teste', { name: 'Teste Um', username: 'teste1', password: 'senha1234' }, at);
  assert.equal(c.status, 201, JSON.stringify(c.data));
  const login = await call('POST', '/auth/login', { login: 'teste1', password: 'senha1234' });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  const perfil = await call('GET', `/users/${c.data.id}`, null, login.data.accessToken);
  assert.equal(perfil.data.teste, true);
  const story = await call('POST', '/posts', { kind: 'story', text: 'oi' }, login.data.accessToken);
  assert.equal(story.status, 201);
  const off = await call('DELETE', `/admin/contas-teste/${c.data.id}`, null, at);
  assert.equal(off.status, 200);
  const depois = await call('POST', '/auth/login', { login: 'teste1', password: 'senha1234' });
  assert.notEqual(depois.status, 200);
});

test('story só de texto guarda a cor de fundo', async () => {
  const reg = await call('POST', '/auth/signup', { kind: 'pessoa', name: 'Cor Fundo', username: 'corfundo', doc: '39053344705', email: 'cf@t.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  const token = reg.data.accessToken;
  const p = await call('POST', '/posts', { kind: 'story', text: 'verde', bg: '#1E9E63' }, token);
  assert.equal(p.status, 201);
  assert.equal(p.data.bg, '#1E9E63');
  const ruim = await call('POST', '/posts', { kind: 'story', text: 'x', bg: 'javascript:alert(1)' }, token);
  assert.equal(ruim.data.bg, null);
  const st = await call('GET', '/stories', null, token);
  assert.equal(st.data.find((g) => g.author.id === reg.data.user.id).items[0].bg, '#1E9E63');
});

test('conta de teste: sem trava, dinheiro fictício só entre contas de teste, sem saque', async () => {
  const adm = (await call('POST', '/auth/login', { login: 'chefe', password: 'Admin12345' })).data.accessToken;
  await call('POST', '/admin/contas-teste', { name: 'Fic Um', username: 'fic1', password: 'senha1234' }, adm);
  await call('POST', '/admin/contas-teste', { name: 'Fic Dois', username: 'fic2', password: 'senha1234' }, adm);
  const a = (await call('POST', '/auth/login', { login: 'fic1', password: 'senha1234' })).data;
  const b = (await call('POST', '/auth/login', { login: 'fic2', password: 'senha1234' })).data;
  const real = await call('POST', '/auth/signup', { kind: 'pessoa', name: 'Pessoa Real', username: 'pessoareal', doc: '86288366757', email: 'pr@t.com', password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  const me = await call('GET', '/me', null, a.accessToken);
  assert.equal(me.data.teste, true);
  assert.equal(me.data.comprasLiberadas, true);
  assert.equal(me.data.podeComprar, true);
  // Depósito fictício entra na hora, mesmo com compras bloqueadas para o resto.
  const dep = await call('POST', '/wallet/deposit', { amount: 100 }, a.accessToken);
  assert.equal(dep.status, 201, JSON.stringify(dep.data));
  assert.equal(dep.data.wallet.balance, 100);
  // Presente para outra conta de teste: passa.
  const g = await call('POST', '/gifts', { toId: b.user.id, amount: 10 }, a.accessToken);
  assert.equal(g.status, 201, JSON.stringify(g.data));
  // Presente para conta real: recusado e o saldo não muda.
  const g2 = await call('POST', '/gifts', { toId: real.data.user.id, amount: 10 }, a.accessToken);
  assert.equal(g2.status, 403);
  assert.equal(g2.data.code, 'conta_teste');
  const w = await call('GET', '/wallet', null, a.accessToken);
  assert.equal(w.data.balance, 90);
  // Saque: não existe em conta de teste.
  const s = await call('POST', '/wallet/withdraw', { amount: 50, pixKey: 'chave@teste.com' }, a.accessToken);
  assert.equal(s.status, 403);
  // Caixa do Realyz não recebeu taxa fictícia.
  const caixa = app.db.prepare("SELECT balance FROM wallets WHERE user_id = 'realys'").get();
  assert.equal(caixa ? caixa.balance : 0, 0);
  // Conta real continua bloqueada.
  const r2 = await call('POST', '/wallet/deposit', { amount: 10 }, real.data.accessToken);
  assert.equal(r2.status, 403);
});
