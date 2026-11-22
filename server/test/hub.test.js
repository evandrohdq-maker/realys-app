// Notificação no celular: sai quando o celular não está com o app na frente, mesmo com o site aberto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hub } from '../src/ws.js';

test('hub: avisa pelo celular quando o app não está na frente', () => {
  const hub = new Hub();
  const avisos = [];
  hub.offline = (u, type) => avisos.push([u, type]);
  const sock = (app) => ({ rzApp: app, got: [], write(f) { this.got.push(f); } });
  hub.send('ana', 'message', { text: 'oi' });
  assert.equal(avisos.length, 1, 'ninguém conectado: notificação');
  const site = sock('web');
  hub.add('ana', site);
  hub.send('ana', 'message', { text: 'oi' });
  assert.equal(avisos.length, 2, 'só o site aberto: o celular ainda recebe a notificação');
  assert.equal(site.got.length, 1, 'e o site recebe na hora');
  const cel = sock('android');
  hub.add('ana', cel);
  hub.send('ana', 'message', { text: 'oi' });
  assert.equal(avisos.length, 2, 'app aberto na frente: sem notificação');
  assert.equal(cel.got.length, 1);
  hub.remove('ana', cel); // foi para o segundo plano: desconectou
  hub.send('ana', 'message', { text: 'oi' });
  assert.equal(avisos.length, 3);
});
