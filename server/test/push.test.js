// Notificações push: registro do aparelho, aviso do hub virando push, e a criptografia do Web Push
// conferida decodificando como o navegador faz (RFC 8291).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createECDH, randomBytes, hkdfSync, createDecipheriv } from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { encryptWebPush, textoDoAviso } from '../src/push.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// "Navegador" de mentira: gera as chaves da assinatura e sabe abrir a mensagem.
function navegador() {
  const ecdh = createECDH('prime256v1');
  const pub = ecdh.generateKeys();
  const auth = randomBytes(16);
  const sub = { endpoint: 'https://push.exemplo.com/abc', keys: { p256dh: b64u(pub), auth: b64u(auth) } };
  const abrir = (buf) => {
    const salt = buf.subarray(0, 16);
    const idlen = buf[20];
    const asPub = buf.subarray(21, 21 + idlen);
    const enc = buf.subarray(21 + idlen);
    const shared = ecdh.computeSecret(asPub);
    const ikm = Buffer.from(hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), pub, asPub]), 32));
    const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
    const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
    const d = createDecipheriv('aes-128-gcm', cek, nonce);
    d.setAuthTag(enc.subarray(enc.length - 16));
    const out = Buffer.concat([d.update(enc.subarray(0, enc.length - 16)), d.final()]);
    assert.equal(out[out.length - 1], 2);
    return JSON.parse(out.subarray(0, out.length - 1).toString());
  };
  return { sub, abrir };
}

test('criptografia do Web Push abre do lado do navegador', () => {
  const nav = navegador();
  const msg = nav.abrir(encryptWebPush(nav.sub, JSON.stringify({ title: 'Oi', body: 'Teste ✅' })));
  assert.deepEqual(msg, { title: 'Oi', body: 'Teste ✅' });
});

test('textos dos avisos', () => {
  assert.equal(textoDoAviso('message', { fromName: 'Ana', text: 'Oi!' }).title, 'Ana');
  assert.match(textoDoAviso('order', { buyer: 'João', total: 25 }).body, /João · R\$ 25,00/);
  assert.match(textoDoAviso('friend_request', { from: { name: 'Lia' } }).body, /Lia/);
  assert.equal(textoDoAviso('tela-on', {}), null);
});

let app, base, dir, enviados;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-push-'));
  enviados = [];
  const fetchFalso = async (url, opts) => {
    enviados.push({ url, opts });
    return { status: 201, text: async () => '', json: async () => ({}) };
  };
  const cfg = loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, exigirBiometria: false });
  const { makePush } = await import('../src/push.js');
  const { openDb } = await import('../src/db.js');
  cfg.dbFile = join(dir, 'realys.db');
  cfg.push = makePush({ db: openDb(cfg.dbFile), cfg, fetchImpl: fetchFalso });
  app = createApp(cfg);
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('aparelho registrado recebe o push quando chega um aviso', async () => {
  const chave = await (await fetch(base + '/push/chave')).json();
  assert.match(chave.web, /^[A-Za-z0-9_-]{80,}$/);
  const signup = await (await fetch(base + '/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'pessoa', name: 'Bia Push', doc: '529.982.247-25', username: 'biapush', email: 'bia@realys.com', password: 'senha1234', nascimento: '1990-05-10', aceiteTermos: TERMO_ADESAO_VERSAO }),
  })).json();
  const token = signup.accessToken;
  assert.ok(token, JSON.stringify(signup));
  const nav = navegador();
  const r = await fetch(base + '/push/registrar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'web', token: nav.sub }) });
  assert.equal(r.status, 200);
  const t = await (await fetch(base + '/push/teste', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).json();
  assert.equal(t.aparelhos, 1);
  await new Promise((r) => setTimeout(r, 50));
  const e = enviados.find((x) => x.url === nav.sub.endpoint);
  assert.ok(e, 'mandou para o endpoint do navegador');
  assert.match(e.opts.headers.authorization, /^vapid t=.+, k=/);
  assert.equal(nav.abrir(e.opts.body).body, 'As notificações estão funcionando ✅');
});
