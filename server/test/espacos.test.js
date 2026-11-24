// Hub de Negócios e Arena Gamer no servidor: cada cliente tem o seu espaço, e as salas privadas
// (atendimento, reunião, chamada particular) só aparecem para quem foi chamado ou convidado.
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
  dir = mkdtempSync(join(tmpdir(), 'realys-espacos-'));
  app = createApp(loadConfig({ dataDir: dir, jwtSecret: 'segredo-de-teste', testDeposits: true, verificacaoAcoes: false }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(method, path, token, body) {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error}`);
  return data;
}
// CPF válido gerado (dígitos verificadores certos) para cada conta de teste.
const cpf = (i) => {
  const d = String(100000000 + i * 7919).slice(0, 9).split('').map(Number);
  const dv = (len) => {
    let s = 0;
    for (let k = 0; k < len; k++) s += d[k] * (len + 1 - k);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  d.push(dv(9));
  d.push(dv(10));
  return d.join('');
};
let n = 0;
const conta = async (name) => {
  const u = `pessoa${++n}`;
  const r = await call('POST', '/auth/signup', null, { kind: 'pessoa', name, doc: cpf(n), username: u, email: `${u}@teste.com`, password: 'senha1234', nascimento: '10/05/1990', aceiteTermos: TERMO_ADESAO_VERSAO });
  return { id: r.user.id, t: r.accessToken, username: u };
};

test('Hub: público vê só a Recepção; sala de atendimento só para quem foi chamado', async () => {
  const dono = await conta('Loja do João');
  const func = await conta('Maria Atendente');
  const cliente = await conta('Ana Cliente');
  const curioso = await conta('Beto Curioso');

  const hubE = await call('POST', '/espacos', dono.t, { kind: 'hub', name: 'Ar Frio Climatização', tipo: 'suporte' });
  await call('POST', `/espacos/${hubE.id}/equipe`, dono.t, { username: func.username });

  // Público: o cartão aparece, sem salas, sem fila nominal, sem canais da equipe.
  const lista = await call('GET', '/espacos?kind=hub', curioso.t);
  const card = lista.find((x) => x.id === hubE.id);
  assert.ok(card);
  assert.equal(card.codigo, undefined, 'quem é de fora não vê o código');
  assert.equal(card.salas, undefined);

  // Cliente entra na fila; a equipe vê a fila, o curioso não.
  const naFila = await call('POST', `/espacos/${hubE.id}/fila`, cliente.t, { motivo: 'Instalar ar-condicionado' });
  assert.equal(naFila.minhaFila.posicao, 1);
  assert.equal(naFila.filaLista, undefined, 'cliente não vê a fila dos outros');
  const vistoPeloCurioso = await call('GET', `/espacos/${hubE.id}`, curioso.t);
  assert.equal(vistoPeloCurioso.filaLista, undefined);
  assert.deepEqual(vistoPeloCurioso.canais, []);
  assert.deepEqual(vistoPeloCurioso.membros, []);
  assert.equal(vistoPeloCurioso.fila, 1, 'só o tamanho da fila');
  const vistoPelaEquipe = await call('GET', `/espacos/${hubE.id}`, func.t);
  assert.equal(vistoPelaEquipe.filaLista[0].client, 'Ana Cliente');
  assert.ok(vistoPelaEquipe.canais.some((c) => c.name === 'avisos-da-equipe'));

  // Funcionária chama: a sala é só das duas.
  const sala = await call('POST', `/espacos/${hubE.id}/fila/${vistoPelaEquipe.filaLista[0].id}/chamar`, func.t);
  assert.deepEqual(sala.pessoas.map((p) => p.id).sort(), [func.id, cliente.id].sort());
  assert.equal((await call('GET', `/espacos/${hubE.id}`, cliente.t)).salas.length, 1);
  assert.equal((await call('GET', `/espacos/${hubE.id}`, curioso.t)).salas.length, 0, 'o público não vê a sala de atendimento');
  await assert.rejects(call('GET', `/salas-privadas/${sala.id}`, curioso.t), /404/);
  await assert.rejects(call('POST', `/voz/sala_${sala.id}/entrar`, curioso.t), /404/);
  // Dono supervisiona; cliente não manda proposta; aceita a da empresa.
  assert.equal((await call('GET', `/salas-privadas/${sala.id}`, dono.t)).id, sala.id);
  await assert.rejects(call('POST', `/salas-privadas/${sala.id}/chat`, cliente.t, { kind: 'proposta', text: 'eu mesmo', value: 1 }), /403/);
  const prop = await call('POST', `/salas-privadas/${sala.id}/chat`, func.t, { kind: 'proposta', text: 'Instalação 12 mil BTUs', value: 450 });
  await call('POST', `/salas-privadas/${sala.id}/chat/${prop.id}/aceitar`, cliente.t);
  assert.equal((await call('GET', `/salas-privadas/${sala.id}`, cliente.t)).chat[0].accepted, true);
  // Canal da equipe: cliente não lê.
  const canalEquipe = vistoPelaEquipe.canais.find((c) => c.kind === 'texto');
  await assert.rejects(call('GET', `/canais/${canalEquipe.id}/msgs`, cliente.t), /404/);
  // Encerrou: o acesso do cliente acaba.
  await call('POST', `/salas-privadas/${sala.id}/encerrar`, func.t);
  await assert.rejects(call('GET', `/salas-privadas/${sala.id}`, cliente.t), /404/);

  // Reunião: só quem criou; outro entra pelo convite.
  const reu = await call('POST', `/espacos/${hubE.id}/reunioes`, dono.t, { name: 'Fornecedor' });
  assert.equal((await call('GET', `/espacos/${hubE.id}`, func.t)).salas.length, 0, 'funcionária não vê reunião para a qual não foi convidada');
  const conv = await call('POST', `/salas-privadas/${reu.id}/convite`, dono.t);
  await call('POST', `/convites-sala/${conv.token}/entrar`, curioso.t);
  assert.equal((await call('GET', `/salas-privadas/${reu.id}`, curioso.t)).id, reu.id);

  // Esconder a Recepção é do plano pago.
  await assert.rejects(call('PATCH', `/espacos/${hubE.id}/config`, dono.t, { visivel: false }), /402/);
  app.wallet.move(dono.id, 'saldo', 5000, 'Depósito', 'teste');
  await call('POST', `/espacos/${hubE.id}/plano`, dono.t, { plano: 'premium' });
  assert.equal(app.wallet.get(dono.id).balance, 5000 - 1990);
  const esc = await call('PATCH', `/espacos/${hubE.id}/config`, dono.t, { visivel: false });
  assert.equal(esc.cfg.visivel, false);
  const novo = await conta('Caio Novo');
  assert.ok(!(await call('GET', '/espacos?kind=hub', novo.t)).some((x) => x.id === hubE.id), 'escondido não aparece na lista');
  await assert.rejects(call('GET', `/espacos/${hubE.id}`, novo.t), /404/);
  const porCodigo = await call('GET', `/espacos/codigo/${esc.cfg.id.replace('RZ-', 'rz')}`, novo.t);
  assert.equal(porCodigo.id, hubE.id);
  assert.equal((await call('GET', `/espacos/${hubE.id}?codigo=${esc.cfg.id}`, novo.t)).id, hubE.id);
});

test('Arena: senha, canais só para membros, chamada particular e voz até 5', async () => {
  const dono = await conta('Streamer Rafa');
  const amigo = await conta('Amigo Teo');
  const de = (x) => x;
  const sv = await call('POST', '/espacos', dono.t, { kind: 'arena', name: 'Squad do Rafa', emoji: '🎮' });
  // Grátis com senha: no máximo 5 pessoas.
  const cfg = await call('PATCH', `/espacos/${sv.id}/config`, dono.t, { senha: 'abc', max: 50 });
  assert.equal(cfg.cfg.max, 5);
  assert.equal(cfg.cfg.senha, 'abc');
  // De fora: vê o cartão, não lê os canais.
  const geral = sv.canais.find((c) => c.name === 'geral');
  await assert.rejects(call('GET', `/canais/${geral.id}/msgs`, amigo.t), /404/);
  await assert.rejects(call('POST', `/espacos/${sv.id}/entrar`, amigo.t, {}), /403/);
  const dentro = await call('POST', `/espacos/${sv.id}/entrar`, amigo.t, { senha: 'abc' });
  assert.equal(dentro.cfg.senha, '•', 'membro comum não vê a senha');
  await call('POST', `/canais/${geral.id}/msgs`, amigo.t, { text: 'Bora jogar?' });
  assert.equal((await call('GET', `/canais/${geral.id}/msgs`, dono.t))[0].who, 'Amigo Teo');
  // Chamada particular: só os dois.
  const pv = await call('POST', `/espacos/${sv.id}/chamada-particular`, dono.t, { userId: amigo.id });
  const terceiro = await conta('Terceiro');
  await call('POST', `/espacos/${sv.id}/entrar`, terceiro.t, { senha: 'abc' });
  assert.ok(!(await call('GET', `/espacos/${sv.id}`, terceiro.t)).salas.some((s) => s.id === pv.id), 'chamada particular é invisível para os outros');
  await assert.rejects(call('POST', `/voz/sala_${pv.id}/entrar`, terceiro.t), /404/);
  // Voz: entra, recebe a lista de quem já está; sinal só entre quem está na voz.
  const squad = sv.canais.find((c) => c.kind === 'voz');
  const v1 = await call('POST', `/voz/canal_${squad.id}/entrar`, dono.t);
  assert.deepEqual(v1.participantes, []);
  const v2 = await call('POST', `/voz/canal_${squad.id}/entrar`, amigo.t);
  assert.equal(v2.participantes[0].id, dono.id);
  await call('POST', `/voz/canal_${squad.id}/sinal`, amigo.t, { to: dono.id, data: { sdp: { type: 'offer', sdp: 'x' } } });
  await assert.rejects(call('POST', `/voz/canal_${squad.id}/sinal`, terceiro.t, { to: dono.id, data: { x: 1 } }), /404/);
  assert.equal((await call('GET', `/espacos/${sv.id}`, terceiro.t)).canais.find((c) => c.id === squad.id).naVoz.length, 2);
  // Removido e banido: sai de tudo e não volta.
  await call('POST', `/espacos/${sv.id}/remover`, dono.t, { userId: terceiro.id, banir: true });
  await assert.rejects(call('GET', `/espacos/${sv.id}`, terceiro.t), /403|404/);
  void de;
});
