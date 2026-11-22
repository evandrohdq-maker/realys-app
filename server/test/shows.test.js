// Contratação de artistas: vitrine só para a classe Artistas, contratar com dinheiro retido,
// recusa devolve, data ocupada, orçamento respondido e pago, anti-desvio na conversa,
// cancelamento até 7 dias antes e show realizado com 10% do Realyz.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { TERMO_ADESAO_VERSAO } from '../src/termos.js';

let app, base, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'realys-shows-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.error}`), { status: res.status, code: data.code });
  return data;
}
const signup = (name, doc, username) =>
  call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc, username, email: `${username}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
const saldo = async (t) => (await call('GET', '/wallet', t)).balance;
const dia = (n) => {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const vitrine = {
  ativo: true, nome: 'MC Vento Sul', genero: 'Rap e trap', cidade: 'Passo Fundo - RS', frase: 'Rap do interior com palco de cidade grande',
  pacotes: [{ id: 'p1', nome: 'Show de 1 hora', duracao: 60, valor: 1000, desc: 'MC e DJ' }],
  eventos: ['Formatura'], atende: { modo: 'regiao', raioKm: 30, porKm: 2 }, diasSemana: [], agendaAte: '2030-12', bloqueados: [], vitrine: [], estrutura: 'DJ próprio',
};

test('shows: vitrine, contratar, recusar, orçamento, conversa, cancelar e show realizado', async () => {
  const art = await signup('Bruno Artista', '52998224725', 'brunomc');
  const cli = await signup('Clara Cliente', '11144477735', 'clarac');

  // Só a classe Artistas monta vitrine.
  await assert.rejects(call('PUT', '/shows/me', art.accessToken, vitrine), /403/);
  await call('PATCH', '/me', art.accessToken, { socialClass: 'musico' });
  const v = await call('PUT', '/shows/me', art.accessToken, vitrine);
  assert.equal(v.pacotes[0].valor, 1000);
  const lista = await call('GET', '/shows/artistas?cidade=passo', null);
  assert.equal(lista.length, 1);

  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 5000 });
  // 1) Contratação: R$ 1.000 + 20 km × 2 × R$ 2 = R$ 1.080 retidos. O artista recusa e volta tudo.
  const c1 = await call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'contratacao', pacoteId: 'p1', data: dia(30), hora: '22:00', km: 20, cidade: 'Marau - RS' });
  assert.equal(c1.total, 1080);
  assert.equal(await saldo(cli.accessToken), 3920);
  await call('POST', `/shows/pedidos/${c1.id}/responder`, art.accessToken, { aceitar: false });
  assert.equal(await saldo(cli.accessToken), 5000);
  // Fora do raio: não dá para contratar direto.
  await assert.rejects(call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'contratacao', pacoteId: 'p1', data: dia(31), km: 300 }), /409/);

  // 2) Contratação aceita: o dia fica ocupado para outra pessoa.
  const c2 = await call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'contratacao', pacoteId: 'p1', data: dia(10) });
  await call('POST', `/shows/pedidos/${c2.id}/responder`, art.accessToken, { aceitar: true });
  await assert.rejects(call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'orcamento', data: dia(10) }), /409/);
  // Conversa: telefone/pagamento por fora não passa.
  await assert.rejects(call('POST', `/shows/pedidos/${c2.id}/mensagens`, cli.accessToken, { text: 'me chama no whats que eu te passo meu numero' }), /422/);
  await call('POST', `/shows/pedidos/${c2.id}/mensagens`, cli.accessToken, { text: 'Pode tocar Fim do filme?' });
  // Divulgação: cada lado marca o story.
  const dv = await call('POST', `/shows/pedidos/${c2.id}/divulgacao`, art.accessToken);
  assert.equal(dv.divulgacao.artista, 1);
  // Ainda não aconteceu.
  await assert.rejects(call('POST', `/shows/pedidos/${c2.id}/realizado`, cli.accessToken), /409/);
  // Cancelar com mais de 7 dias: estorno total.
  await call('POST', `/shows/pedidos/${c2.id}/cancelar`, cli.accessToken);
  assert.equal(await saldo(cli.accessToken), 5000);

  // 3) Orçamento: o artista responde, quem pediu paga e fecha.
  const o = await call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'orcamento', data: dia(3), evento: 'Formatura', publico: 200, mensagem: 'Formatura de Direito' });
  assert.equal(o.status, 'aguardando');
  await call('POST', `/shows/pedidos/${o.id}/responder`, art.accessToken, { aceitar: true, valor: 1500, desloc: 100 });
  const pago = await call('POST', `/shows/pedidos/${o.id}/pagar`, cli.accessToken);
  assert.equal(pago.status, 'confirmado');
  assert.equal(await saldo(cli.accessToken), 3400);
  // Menos de 7 dias: cancelamento só pelo suporte.
  await assert.rejects(call('POST', `/shows/pedidos/${o.id}/cancelar`, cli.accessToken), /409/);
  // O dia do show chega (simulado): quem contratou confirma e o artista recebe 90% do cachê + deslocamento.
  app.db.prepare('UPDATE show_pedidos SET data = ? WHERE id = ?').run(dia(-1), o.id);
  await call('POST', `/shows/pedidos/${o.id}/realizado`, cli.accessToken, { nota: 5 });
  assert.equal(await saldo(art.accessToken), 1450); // 1500 - 10% + 100
  const meus = await call('GET', '/shows/pedidos', art.accessToken);
  assert.equal(meus.find((x) => x.id === o.id).status, 'realizado');
});

test('shows: cobrança por show, por hora, por serviço e publicidade', async () => {
  const art = await signup('Duda Cantora', '39053344705', 'dudacanta');
  const cli = await signup('Marca Parceira', '15350946056', 'marcapar');
  await call('PATCH', '/me', art.accessToken, { socialClass: 'musico' });
  const v = await call('PUT', '/shows/me', art.accessToken, {
    ...vitrine, nome: 'Duda',
    pacotes: [
      { id: 'sh', nome: 'Show acústico', cobranca: 'show', duracao: 90, valor: 800 },
      { id: 'hr', nome: 'Voz e violão', cobranca: 'hora', valor: 300 },
      { id: 'sv', nome: 'Gravação de jingle', cobranca: 'servico', valor: 600 },
      { id: 'pb', nome: '1 reels + 3 stories', cobranca: 'publicidade', valor: 400, desc: 'Sua marca no meu perfil' },
    ],
  });
  assert.deepEqual(v.pacotes.map((p) => p.cobranca), ['show', 'hora', 'servico', 'publicidade']);
  assert.equal(v.pacotes[1].duracao, null);
  await call('POST', '/wallet/deposit', cli.accessToken, { amount: 5000 });

  // Por hora: 3 horas × R$ 300.
  const h = await call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'contratacao', pacoteId: 'hr', horas: 3, data: dia(20) });
  assert.equal(h.total, 900);
  assert.equal(h.pacote.horas, 3);
  await call('POST', `/shows/pedidos/${h.id}/responder`, art.accessToken, { aceitar: true });

  // Publicidade: não ocupa o dia do show nem cobra deslocamento.
  const pb = await call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'contratacao', pacoteId: 'pb', data: dia(20), km: 25 });
  assert.equal(pb.total, 400);
  await call('POST', `/shows/pedidos/${pb.id}/responder`, art.accessToken, { aceitar: true });
  // Show no mesmo dia continua bloqueado por causa do show por hora, não da publicidade.
  await assert.rejects(call('POST', '/shows/pedidos', cli.accessToken, { artistaId: art.user.id, tipo: 'contratacao', pacoteId: 'sh', data: dia(20) }), /409/);
  const livre = await call('GET', `/shows/artistas/${art.user.id}`, null);
  assert.deepEqual(livre.ocupados, [dia(20)]);
});
