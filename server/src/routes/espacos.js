// Hub de Negócios e Arena Gamer no servidor: cada cliente tem o seu espaço (como um servidor do Discord).
//
// Quem vê o quê:
//   - Público: só o cartão dos espaços VISÍVEIS (nome, aberto/fechado, tamanho da fila, membros).
//     Escondido (plano pago): não aparece na lista; entra só pelo código (RZ-XXXXXX) ou link.
//   - Hub: o cliente entra na FILA da Recepção. A sala de atendimento não aparece em lista nenhuma: só
//     entra quem a empresa chamou ou convidou; ao encerrar, o acesso de quem é de fora acaba.
//     Canais e reuniões da equipe: só a equipe (dono, admin, moderador e funcionários).
//   - Arena: membros veem os canais. Chamada particular e sala de voz privada: só os convidados.
// Planos: grátis (senha só até 5 pessoas, sempre visível), Premium R$ 19,90 (moderação, escondido,
// até 100) e Empresarial R$ 79,90 (painel personalizado, até 500), cobrados por mês do saldo.
import { createHmac, randomBytes } from 'node:crypto';
import { moderateText } from '../moderacaoTexto.js';
import { fail, newId, now, str } from '../http.js';
import { tx } from '../db.js';

const DIA = 86400000;
export const PLANOS_SALA = { gratis: { cents: 0, max: 5 }, premium: { cents: 1990, max: 100 }, empresarial: { cents: 7990, max: 500 } };
const TIPOS_HUB = ['imobiliaria', 'suporte', 'revenda', 'loja', 'consultoria'];
const MAX_VOZ = 5; // voz em grupo direto entre os celulares: um squad
const EQUIPE = ['dono', 'admin', 'mod', 'equipe'];
const MOD = ['dono', 'admin', 'mod'];
const ADMIN = ['dono', 'admin'];
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codigoNovo = () => 'RZ-' + Array.from(randomBytes(6), (b) => ABC[b % ABC.length]).join('');
const normCodigo = (t) => {
  const v = String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^RZ/, '');
  return v ? 'RZ-' + v : '';
};

export default function espacosRoutes(r, { db, cfg, hub, wallet, userById }) {
  const E = (id) => db.prepare('SELECT * FROM espacos WHERE id = ? AND removed = 0').get(String(id || ''));
  const cargoDe = (eid, uid) => (db.prepare('SELECT cargo FROM espaco_membros WHERE espaco_id = ? AND user_id = ?').get(eid, uid) || {}).cargo || null;
  const membro = (eid, uid) => db.prepare('SELECT * FROM espaco_membros WHERE espaco_id = ? AND user_id = ?').get(eid, uid);
  const banido = (eid, uid) => !!db.prepare('SELECT 1 FROM espaco_banidos WHERE espaco_id = ? AND user_id = ?').get(eid, uid);
  const exigeCargo = (e, uid, lista, msg) => {
    if (!lista.includes(cargoDe(e.id, uid))) fail(403, msg || 'Você não tem permissão para isso neste espaço.');
  };
  const pago = (e) => e.plano !== 'gratis';
  const contarMembros = (eid) => db.prepare('SELECT COUNT(*) n FROM espaco_membros WHERE espaco_id = ?').get(eid).n;
  const nome = (uid) => (userById(uid) || {}).name || 'Pessoa';

  // ---------- Presença na voz (memória do servidor) ----------
  const voz = new Map(); // chave -> Map(userId -> { name, at })
  const presenca = (chave) => [...(voz.get(chave) || new Map()).entries()].map(([id, v]) => ({ id, name: v.name }));
  const tirarDaVoz = (uid, exceto) => {
    for (const [chave, m] of voz) {
      if (chave === exceto || !m.has(uid)) continue;
      m.delete(uid);
      for (const outro of m.keys()) hub.send(outro, 'voz-saiu', { chave, id: uid });
    }
  };

  // ---------- Visões ----------
  const cartao = (e, uid) => {
    const fila = e.kind === 'hub' ? db.prepare(`SELECT COUNT(*) n FROM hub_fila WHERE espaco_id = ? AND status = 'espera'`).get(e.id).n : 0;
    const equipeOnline = db.prepare(`SELECT user_id FROM espaco_membros WHERE espaco_id = ? AND cargo IN ('dono','admin','mod','equipe')`).all(e.id).filter((m) => hub.online(m.user_id)).length;
    return {
      id: e.id, kind: e.kind, name: e.name, emoji: e.emoji, tint: e.tint, tipo: e.tipo, city: e.city,
      aberto: !!e.aberto, horario: e.horario, temSenha: !!e.senha, membros: contarMembros(e.id),
      fila, equipeOnline, meuCargo: cargoDe(e.id, uid), visivel: !!e.visivel,
      // Só quem já está dentro vê o código (os outros recebem por link ou do dono).
      codigo: cargoDe(e.id, uid) ? e.codigo : undefined,
    };
  };
  const cfgView = (e, uid) => {
    const c = cargoDe(e.id, uid);
    let painel = null;
    try {
      painel = e.painel ? JSON.parse(e.painel) : null;
    } catch (er) {}
    return {
      id: e.codigo, plano: e.plano, planoAte: e.plano_ate, renova: !!e.plano_renova, visivel: !!e.visivel,
      // A senha só aparece para quem administra; os outros só sabem que tem.
      senha: e.senha ? (ADMIN.includes(c) ? e.senha : '•') : '', max: e.max, moderada: !!e.moderada, painel,
    };
  };
  const membrosView = (e) =>
    db.prepare('SELECT m.user_id, m.cargo, m.silenciado, u.name, u.photo FROM espaco_membros m JOIN users u ON u.id = m.user_id WHERE m.espaco_id = ? ORDER BY m.created_at').all(e.id)
      .map((m) => ({ id: m.user_id, name: m.name, photo: m.photo, cargo: m.cargo, silenciado: !!m.silenciado, online: hub.online(m.user_id) }));
  const salaView = (s, uid) => ({
    id: s.id, kind: s.kind, name: s.name, motivo: s.motivo, clientId: s.client_id, clientName: s.client_id ? nome(s.client_id) : null,
    telaPor: s.tela_por, createdAt: s.created_at, ended: !!s.ended_at,
    pessoas: db.prepare('SELECT a.user_id AS id, u.name FROM sala_acessos a JOIN users u ON u.id = a.user_id WHERE a.sala_id = ?').all(s.id),
    naVoz: presenca('sala_' + s.id), souConvidado: !!db.prepare('SELECT 1 FROM sala_acessos WHERE sala_id = ? AND user_id = ?').get(s.id, uid),
  });
  const detalhe = (e, uid) => {
    const c = cargoDe(e.id, uid);
    const equipe = EQUIPE.includes(c);
    const out = { ...cartao(e, uid), cfg: cfgView(e, uid) };
    // Canais: Arena = membros; Hub = só a equipe.
    const veCanais = e.kind === 'arena' ? !!c : equipe;
    out.canais = veCanais
      ? db.prepare('SELECT * FROM espaco_canais WHERE espaco_id = ? ORDER BY created_at').all(e.id).filter((k) => !k.so_equipe || equipe)
          .map((k) => ({ id: k.id, kind: k.kind, name: k.name, soEquipe: !!k.so_equipe, msgs: k.kind === 'texto' ? db.prepare('SELECT COUNT(*) n FROM canal_msgs WHERE canal_id = ?').get(k.id).n : 0, naVoz: k.kind === 'voz' ? presenca('canal_' + k.id) : [] }))
      : [];
    out.membros = c || e.kind === 'arena' ? membrosView(e).map((m) => (c ? m : { id: m.id, name: m.name, cargo: m.cargo, online: m.online })) : [];
    if (e.kind === 'hub' && !equipe) out.membros = []; // cliente não vê a lista de funcionários
    // Fila: a equipe vê toda; o cliente vê só a posição dele.
    if (e.kind === 'hub') {
      const fila = db.prepare(`SELECT f.*, u.name FROM hub_fila f JOIN users u ON u.id = f.client_id WHERE f.espaco_id = ? AND f.status = 'espera' ORDER BY f.created_at`).all(e.id);
      if (equipe) out.filaLista = fila.map((f) => ({ id: f.id, clientId: f.client_id, client: f.name, motivo: f.motivo, note: f.note, at: f.created_at }));
      const i = fila.findIndex((f) => f.client_id === uid);
      out.minhaFila = i >= 0 ? { id: fila[i].id, posicao: i + 1, at: fila[i].created_at } : null;
    }
    // Salas privadas: dono/admin veem todas as ativas; os outros, só aquelas em que foram chamados/convidados.
    const ativas = db.prepare('SELECT * FROM salas_privadas WHERE espaco_id = ? AND ended_at IS NULL ORDER BY created_at').all(e.id);
    out.salas = ativas.filter((s) => (ADMIN.includes(c) && s.kind !== 'voz') || db.prepare('SELECT 1 FROM sala_acessos WHERE sala_id = ? AND user_id = ?').get(s.id, uid)).map((s) => salaView(s, uid));
    return out;
  };
  // Pode ver o espaço? Membro, visível, ou chegou pelo código/convite.
  const podeVer = (e, uid, codigo) => !!cargoDe(e.id, uid) || !!e.visivel || (codigo && normCodigo(codigo) === e.codigo) || !!db.prepare('SELECT 1 FROM sala_acessos a JOIN salas_privadas s ON s.id = a.sala_id WHERE s.espaco_id = ? AND a.user_id = ? AND s.ended_at IS NULL').get(e.id, uid);
  const ver = (id, uid, codigo) => {
    const e = E(id);
    if (!e || !podeVer(e, uid, codigo)) fail(404, 'Espaço não encontrado.');
    if (banido(e.id, uid)) fail(403, 'Você foi removido deste espaço pelos administradores.');
    return e;
  };
  // Avisa quem está dentro que algo mudou (o app recarrega o espaço).
  const avisar = (e, extra = {}) => {
    for (const m of db.prepare('SELECT user_id FROM espaco_membros WHERE espaco_id = ?').all(e.id)) hub.send(m.user_id, 'espaco', { id: e.id, ...extra });
  };

  // ---------- Plano: corrige o que o plano não permite ----------
  const ajustar = (e, patch) => {
    const p = { ...e, ...patch };
    if (!pago(p)) {
      p.visivel = 1;
      p.moderada = 0;
      p.painel = null;
      p.max = p.senha ? PLANOS_SALA.gratis.max : 0;
    } else {
      p.max = Math.min(Math.max(0, Number(p.max) || 0), PLANOS_SALA[p.plano].max);
      if (p.plano !== 'empresarial') p.painel = null;
    }
    return p;
  };
  const gravar = (p) => db.prepare('UPDATE espacos SET name = ?, emoji = ?, tint = ?, city = ?, visivel = ?, senha = ?, max = ?, moderada = ?, painel = ?, aberto = ?, horario = ?, plano = ?, plano_ate = ?, plano_renova = ? WHERE id = ?')
    .run(p.name, p.emoji, p.tint, p.city, p.visivel ? 1 : 0, p.senha || null, p.max, p.moderada ? 1 : 0, p.painel, p.aberto ? 1 : 0, p.horario, p.plano, p.plano_ate, p.plano_renova ? 1 : 0, p.id);

  // ---------- Espaços ----------
  r.post('/espacos', ({ body, user }) => {
    const kind = body.kind === 'hub' ? 'hub' : 'arena';
    if (db.prepare('SELECT COUNT(*) n FROM espacos WHERE owner_id = ? AND removed = 0').get(user.id).n >= 10) fail(400, 'Cada conta pode ter até 10 espaços.');
    const name = str(body.name, 'o nome', { min: 2, max: 50 });
    const m = moderateText(name, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const id = newId(kind === 'hub' ? 'hb' : 'sv');
    let codigo = codigoNovo();
    while (db.prepare('SELECT 1 FROM espacos WHERE codigo = ?').get(codigo)) codigo = codigoNovo();
    tx(db, () => {
      db.prepare('INSERT INTO espacos (id, kind, owner_id, name, emoji, tint, tipo, city, codigo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
        id, kind, user.id, name, String(body.emoji || (kind === 'hub' ? '💼' : '🎮')).slice(0, 8), /^#[0-9a-f]{6}$/i.test(body.tint || '') ? body.tint : '#B8860B',
        kind === 'hub' ? (TIPOS_HUB.includes(body.tipo) ? body.tipo : 'loja') : null, str(body.city, 'a cidade', { optional: true, max: 60 }) || null, codigo, now()
      );
      db.prepare(`INSERT INTO espaco_membros (espaco_id, user_id, cargo, created_at) VALUES (?,?, 'dono', ?)`).run(id, user.id, now());
      const canal = (k, n, soEquipe) => db.prepare('INSERT INTO espaco_canais (id, espaco_id, kind, name, so_equipe, created_at) VALUES (?,?,?,?,?,?)').run(newId('ch'), id, k, n, soEquipe ? 1 : 0, now());
      if (kind === 'arena') {
        canal('texto', 'geral');
        canal('texto', 'procurando-time');
        canal('voz', 'Squad');
      } else {
        canal('texto', 'avisos-da-equipe', true);
        canal('voz', 'Equipe', true);
      }
    });
    return detalhe(E(id), user.id);
  }, { status: 201 });

  // Lista: os visíveis e os meus (o público nunca vê salas privadas aqui).
  r.get('/espacos', ({ query, user }) => {
    const kind = query.kind === 'hub' ? 'hub' : 'arena';
    const q = String(query.q || '').trim().toLowerCase();
    return db.prepare(`SELECT e.* FROM espacos e WHERE e.kind = ? AND e.removed = 0 AND (e.visivel = 1 OR EXISTS (SELECT 1 FROM espaco_membros m WHERE m.espaco_id = e.id AND m.user_id = ?)) ORDER BY e.created_at DESC LIMIT 100`).all(kind, user.id)
      .filter((e) => !banido(e.id, user.id) && (!q || e.name.toLowerCase().includes(q)))
      .map((e) => cartao(e, user.id));
  });
  // Entrar com o código (acha até os escondidos).
  r.get('/espacos/codigo/:codigo', ({ params, user }) => {
    const e = db.prepare('SELECT * FROM espacos WHERE codigo = ? AND removed = 0').get(normCodigo(params.codigo));
    if (!e) fail(404, 'Nenhum espaço com esse código.');
    if (banido(e.id, user.id)) fail(403, 'Você foi removido deste espaço pelos administradores.');
    return cartao(e, user.id);
  });
  r.get('/espacos/:id', ({ params, query, user }) => detalhe(ver(params.id, user.id, query.codigo), user.id));

  // Arena: entrar no servidor (senha, limite, banido). Hub: o cliente não "entra", ele vai para a fila.
  r.post('/espacos/:id/entrar', ({ params, body, user }) => {
    const e = ver(params.id, user.id, body.codigo);
    if (cargoDe(e.id, user.id)) return detalhe(e, user.id);
    if (e.kind === 'hub') fail(400, 'Na empresa, entre na fila da Recepção para ser atendido.');
    if (e.max && contarMembros(e.id) >= e.max) fail(409, `O servidor está cheio (${e.max} pessoas).`, 'cheio');
    if (e.senha && String(body.senha || '') !== e.senha) fail(403, body.senha ? 'Senha errada.' : 'Este servidor tem senha.', 'senha');
    db.prepare(`INSERT INTO espaco_membros (espaco_id, user_id, cargo, created_at) VALUES (?,?, 'membro', ?)`).run(e.id, user.id, now());
    avisar(e);
    return detalhe(e, user.id);
  });
  r.post('/espacos/:id/sair', ({ params, user }) => {
    const e = E(params.id);
    if (!e) fail(404, 'Espaço não encontrado.');
    if (cargoDe(e.id, user.id) === 'dono') fail(400, 'O dono não sai do próprio espaço. Apague o espaço, se quiser.');
    db.prepare('DELETE FROM espaco_membros WHERE espaco_id = ? AND user_id = ?').run(e.id, user.id);
    tirarDaVoz(user.id);
    return { ok: true };
  });
  r.delete('/espacos/:id', ({ params, user }) => {
    const e = E(params.id);
    if (!e || e.owner_id !== user.id) fail(404, 'Espaço não encontrado.');
    db.prepare('UPDATE espacos SET removed = 1 WHERE id = ?').run(e.id);
    avisar(e, { removido: true });
    return { ok: true };
  });

  // Configuração (admin): nome, senha, limite, visível (pago), moderação (pago), painel (Empresarial),
  // Recepção aberta/fechada e horário (Hub).
  r.patch('/espacos/:id/config', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, ADMIN, 'Só quem administra pode mudar a configuração.');
    const patch = {};
    if (body.name !== undefined) {
      patch.name = str(body.name, 'o nome', { min: 2, max: 50 });
      const m = moderateText(patch.name, 'publico');
      if (!m.ok) fail(422, m.why, m.kind);
    }
    if (body.emoji !== undefined) patch.emoji = String(body.emoji || '💼').slice(0, 8);
    if (body.senha !== undefined) patch.senha = body.senha === '•' ? e.senha : str(body.senha, 'a senha', { optional: true, max: 30 }) || null;
    if (body.max !== undefined) patch.max = Math.max(0, Number(body.max) || 0);
    if (body.visivel !== undefined) {
      if (!body.visivel && !pago(e)) fail(402, 'Deixar escondido (entrar só pelo código ou link) é do plano Premium.', 'plano_sala');
      patch.visivel = body.visivel ? 1 : 0;
    }
    if (body.moderada !== undefined) patch.moderada = body.moderada ? 1 : 0;
    if (body.painel !== undefined) patch.painel = body.painel ? JSON.stringify(body.painel).slice(0, 4000) : null;
    if (body.aberto !== undefined) patch.aberto = body.aberto ? 1 : 0;
    if (body.horario !== undefined) patch.horario = str(body.horario, 'o horário', { optional: true, max: 60 }) || null;
    gravar(ajustar(e, patch));
    avisar(e);
    return detalhe(E(e.id), user.id);
  });

  // Plano pago do espaço (do saldo, por mês). gratis = cancela a renovação (vale até o fim do mês pago).
  const cobrarPlano = (e, plano) => {
    const ref = newId('sp');
    const p = PLANOS_SALA[plano];
    try {
      wallet.pay(e.owner_id, p.cents, 'Plano de sala', `Plano ${plano} · ${e.name}`, ref);
    } catch (er) {
      if (er.code === 'saldo_insuficiente') fail(402, `Saldo insuficiente para o plano (R$ ${(p.cents / 100).toFixed(2).replace('.', ',')}). Adicione saldo na carteira.`, 'saldo_insuficiente');
      throw er;
    }
    wallet.move('realys', 'saldo', p.cents, 'Plano de sala', `Plano ${plano} · ${e.name}`, ref);
  };
  r.post('/espacos/:id/plano', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    if (e.owner_id !== user.id) fail(403, 'Só o dono assina o plano.');
    const plano = String(body.plano || '');
    if (!PLANOS_SALA[plano]) fail(400, 'Plano inválido.');
    if (plano === 'gratis') {
      db.prepare('UPDATE espacos SET plano_renova = 0 WHERE id = ?').run(e.id);
      return detalhe(E(e.id), user.id);
    }
    tx(db, () => {
      cobrarPlano(e, plano);
      const base = e.plano === plano && (e.plano_ate || 0) > now() ? e.plano_ate : now();
      gravar(ajustar(e, { plano, plano_ate: base + 30 * DIA, plano_renova: 1 }));
    });
    return detalhe(E(e.id), user.id);
  });
  // Renovação (varredura): sem saldo, volta para o grátis (e o que o grátis não permite é desligado).
  const renovarPlanos = () => {
    for (const e of db.prepare(`SELECT * FROM espacos WHERE removed = 0 AND plano != 'gratis' AND plano_ate <= ? LIMIT 100`).all(now())) {
      try {
        if (!e.plano_renova) throw new Error('não renova');
        tx(db, () => {
          cobrarPlano(e, e.plano);
          db.prepare('UPDATE espacos SET plano_ate = plano_ate + ? WHERE id = ?').run(30 * DIA, e.id);
        });
      } catch (er) {
        gravar(ajustar(e, { plano: 'gratis', plano_ate: null, plano_renova: 0 }));
        hub.send(e.owner_id, 'espaco', { id: e.id, aviso: `O plano de ${e.name} voltou para o grátis.` });
      }
    }
  };

  // ---------- Equipe, cargos e moderação ----------
  // Hub: o dono põe funcionários pelo *usuário (cada um com a própria conta verificada).
  r.post('/espacos/:id/equipe', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, ADMIN, 'Só quem administra põe pessoas na equipe.');
    const u = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(String(body.username || '').replace(/^[*@]/, '').toLowerCase(), 'ativo');
    if (!u) fail(404, 'Não achamos esse usuário. Confira o *usuário da pessoa.');
    db.prepare(`INSERT INTO espaco_membros (espaco_id, user_id, cargo, created_at) VALUES (?,?,?,?) ON CONFLICT(espaco_id, user_id) DO UPDATE SET cargo = excluded.cargo`).run(e.id, u.id, e.kind === 'hub' ? 'equipe' : 'membro', now());
    hub.send(u.id, 'espaco', { id: e.id, aviso: `Você entrou na equipe de ${e.name}.` });
    return detalhe(E(e.id), user.id);
  });
  r.post('/espacos/:id/cargo', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, ADMIN, 'Só quem administra muda cargos.');
    const cargo = ['admin', 'mod', 'equipe', 'membro'].includes(body.cargo) ? body.cargo : null;
    if (!cargo) fail(400, 'Cargo inválido.');
    if (cargo !== 'membro' && cargo !== 'equipe' && !pago(e) && e.kind === 'arena') fail(402, 'Moderadores e admins são do plano Premium.', 'plano_sala');
    const alvo = membro(e.id, String(body.userId || ''));
    if (!alvo || alvo.cargo === 'dono') fail(404, 'Pessoa não encontrada no espaço.');
    db.prepare('UPDATE espaco_membros SET cargo = ? WHERE espaco_id = ? AND user_id = ?').run(cargo, e.id, alvo.user_id);
    avisar(e);
    return detalhe(E(e.id), user.id);
  });
  r.post('/espacos/:id/remover', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, MOD, 'Só moderadores podem remover pessoas.');
    const alvoId = String(body.userId || '');
    const alvo = cargoDe(e.id, alvoId);
    if (alvo === 'dono' || (alvo === 'admin' && cargoDe(e.id, user.id) !== 'dono')) fail(403, 'Você não pode remover essa pessoa.');
    tx(db, () => {
      db.prepare('DELETE FROM espaco_membros WHERE espaco_id = ? AND user_id = ?').run(e.id, alvoId);
      db.prepare(`UPDATE hub_fila SET status = 'saiu' WHERE espaco_id = ? AND client_id = ? AND status = 'espera'`).run(e.id, alvoId);
      db.prepare('DELETE FROM sala_acessos WHERE user_id = ? AND sala_id IN (SELECT id FROM salas_privadas WHERE espaco_id = ?)').run(alvoId, e.id);
      if (body.banir) db.prepare('INSERT OR IGNORE INTO espaco_banidos (espaco_id, user_id) VALUES (?,?)').run(e.id, alvoId);
    });
    tirarDaVoz(alvoId);
    hub.send(alvoId, 'espaco', { id: e.id, removido: true });
    avisar(e);
    return detalhe(E(e.id), user.id);
  });
  r.post('/espacos/:id/silenciar', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, MOD, 'Só moderadores podem silenciar.');
    db.prepare('UPDATE espaco_membros SET silenciado = ? WHERE espaco_id = ? AND user_id = ?').run(body.on ? 1 : 0, e.id, String(body.userId || ''));
    return detalhe(E(e.id), user.id);
  });

  // ---------- Canais de texto e voz ----------
  const canal = (id, uid) => {
    const k = db.prepare('SELECT * FROM espaco_canais WHERE id = ?').get(String(id || ''));
    const e = k && E(k.espaco_id);
    const c = e && cargoDe(e.id, uid);
    if (!k || !e || !c || (k.so_equipe && !EQUIPE.includes(c)) || (e.kind === 'hub' && !EQUIPE.includes(c))) fail(404, 'Canal não encontrado.');
    return { k, e, c };
  };
  r.post('/espacos/:id/canais', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, e.kind === 'hub' ? ADMIN : MOD, 'Só moderadores criam canais.');
    const kind = body.kind === 'voz' ? 'voz' : 'texto';
    const name = str(body.name, 'o nome do canal', { min: 1, max: 40 });
    const id = newId('ch');
    db.prepare('INSERT INTO espaco_canais (id, espaco_id, kind, name, so_equipe, created_at) VALUES (?,?,?,?,?,?)').run(id, e.id, kind, kind === 'texto' ? name.toLowerCase().replace(/\s+/g, '-') : name, e.kind === 'hub' ? 1 : 0, now());
    avisar(e);
    return detalhe(E(e.id), user.id);
  }, { status: 201 });
  r.get('/canais/:id/msgs', ({ params, user }) => {
    const { k } = canal(params.id, user.id);
    return db.prepare('SELECT m.*, u.name FROM canal_msgs m JOIN users u ON u.id = m.user_id WHERE m.canal_id = ? ORDER BY m.created_at DESC LIMIT 200').all(k.id).reverse()
      .map((m) => ({ id: m.id, userId: m.user_id, who: m.name, text: m.text, at: m.created_at, reactions: m.reacoes ? JSON.parse(m.reacoes) : null }));
  });
  r.post('/canais/:id/msgs', ({ params, body, user }) => {
    const { k, e } = canal(params.id, user.id);
    if (k.kind !== 'texto') fail(400, 'Esse canal é de voz.');
    if (membro(e.id, user.id).silenciado) fail(403, 'Um moderador silenciou você neste espaço.', 'silenciado');
    const text = str(body.text, 'a mensagem', { max: 2000 });
    const m = moderateText(text, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const id = newId('cm');
    db.prepare('INSERT INTO canal_msgs (id, canal_id, user_id, text, created_at) VALUES (?,?,?,?,?)').run(id, k.id, user.id, text, now());
    const msg = { id, userId: user.id, who: user.name, text, at: now(), reactions: null };
    for (const mb of db.prepare('SELECT user_id FROM espaco_membros WHERE espaco_id = ?').all(e.id)) {
      if (k.so_equipe && !EQUIPE.includes(cargoDe(e.id, mb.user_id))) continue;
      if (mb.user_id !== user.id) hub.send(mb.user_id, 'canal-msg', { canalId: k.id, espacoId: e.id, msg });
    }
    return msg;
  }, { status: 201 });
  r.post('/canal-msgs/:id/reagir', ({ params, body, user }) => {
    const m = db.prepare('SELECT * FROM canal_msgs WHERE id = ?').get(params.id);
    if (!m) fail(404, 'Mensagem não encontrada.');
    canal(m.canal_id, user.id);
    const emoji = String(body.emoji || '').slice(0, 8);
    if (!emoji) fail(400, 'Escolha um emoji.');
    const rc = m.reacoes ? JSON.parse(m.reacoes) : {};
    rc[emoji] = (rc[emoji] || 0) + 1;
    db.prepare('UPDATE canal_msgs SET reacoes = ? WHERE id = ?').run(JSON.stringify(rc), m.id);
    return { reactions: rc };
  });

  // ---------- Hub: fila da Recepção ----------
  r.post('/espacos/:id/fila', ({ params, body, user }) => {
    const e = ver(params.id, user.id, body.codigo);
    if (e.kind !== 'hub') fail(400, 'Fila é só no Hub de Negócios.');
    if (!e.aberto) fail(409, `${e.name} está fechada agora${e.horario ? ` (${e.horario})` : ''}.`, 'fechado');
    if (e.senha && String(body.senha || '') !== e.senha) fail(403, body.senha ? 'Senha errada.' : 'Esta recepção tem senha.', 'senha');
    if (EQUIPE.includes(cargoDe(e.id, user.id))) fail(400, 'Você é da equipe desta empresa.');
    db.prepare(`UPDATE hub_fila SET status = 'saiu' WHERE client_id = ? AND status = 'espera'`).run(user.id);
    const id = newId('fl');
    db.prepare(`INSERT INTO hub_fila (id, espaco_id, client_id, motivo, note, status, created_at) VALUES (?,?,?,?,?, 'espera', ?)`).run(id, e.id, user.id, str(body.motivo, 'o motivo', { optional: true, max: 80 }) || null, str(body.note, 'o recado', { optional: true, max: 300 }) || null, now());
    for (const m of db.prepare(`SELECT user_id FROM espaco_membros WHERE espaco_id = ? AND cargo IN ('dono','admin','mod','equipe')`).all(e.id)) hub.send(m.user_id, 'hub-fila', { espacoId: e.id, client: user.name });
    return detalhe(e, user.id);
  }, { status: 201 });
  r.delete('/espacos/:id/fila', ({ params, user }) => {
    db.prepare(`UPDATE hub_fila SET status = 'saiu' WHERE espaco_id = ? AND client_id = ? AND status = 'espera'`).run(String(params.id), user.id);
    return { ok: true };
  });
  // A equipe chama o cliente: abre a sala de atendimento só dos dois (ninguém mais vê).
  r.post('/espacos/:id/fila/:fid/chamar', ({ params, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, EQUIPE, 'Só a equipe da empresa atende.');
    const f = db.prepare(`SELECT * FROM hub_fila WHERE id = ? AND espaco_id = ? AND status = 'espera'`).get(params.fid, e.id);
    if (!f) fail(404, 'Essa pessoa já saiu da fila.');
    const sid = newId('sp');
    const n = db.prepare(`SELECT COUNT(*) n FROM salas_privadas WHERE espaco_id = ? AND kind = 'atendimento'`).get(e.id).n + 1;
    tx(db, () => {
      db.prepare(`UPDATE hub_fila SET status = 'chamado' WHERE id = ?`).run(f.id);
      db.prepare(`INSERT INTO salas_privadas (id, espaco_id, kind, name, created_by, client_id, motivo, created_at) VALUES (?,?, 'atendimento', ?,?,?,?,?)`).run(sid, e.id, `Atendimento ${n}`, user.id, f.client_id, f.motivo, now());
      db.prepare('INSERT INTO sala_acessos (sala_id, user_id) VALUES (?,?), (?,?)').run(sid, user.id, sid, f.client_id);
    });
    hub.send(f.client_id, 'hub-chamado', { espacoId: e.id, salaId: sid, empresa: e.name, atendente: user.name });
    return salaView(db.prepare('SELECT * FROM salas_privadas WHERE id = ?').get(sid), user.id);
  });

  // ---------- Salas privadas (atendimento, reunião, chamada particular) ----------
  const sala = (id, uid) => {
    const s = db.prepare('SELECT * FROM salas_privadas WHERE id = ? AND ended_at IS NULL').get(String(id || ''));
    const e = s && E(s.espaco_id);
    const convidado = s && !!db.prepare('SELECT 1 FROM sala_acessos WHERE sala_id = ? AND user_id = ?').get(s.id, uid);
    // Dono e admin da empresa podem entrar nos atendimentos e reuniões (supervisão); o resto só convidado.
    if (!s || !e || !(convidado || (s.kind !== 'voz' && ADMIN.includes(cargoDe(e.id, uid))))) fail(404, 'Sala não encontrada ou o atendimento já terminou.');
    return { s, e };
  };
  r.get('/salas-privadas/:id', ({ params, user }) => {
    const { s } = sala(params.id, user.id);
    return {
      ...salaView(s, user.id),
      chat: db.prepare('SELECT c.*, u.name FROM sala_chat c JOIN users u ON u.id = c.user_id WHERE c.sala_id = ? ORDER BY c.created_at LIMIT 300').all(s.id)
        .map((c) => ({ id: c.id, kind: c.kind, who: c.name, userId: c.user_id, text: c.text, value: c.valor != null ? c.valor / 100 : null, accepted: !!c.aceito, at: c.created_at })),
    };
  });
  const paraSala = (s, uid, type, data) => {
    for (const a of db.prepare('SELECT user_id FROM sala_acessos WHERE sala_id = ?').all(s.id)) if (a.user_id !== uid) hub.send(a.user_id, type, { salaId: s.id, ...data });
  };
  r.post('/salas-privadas/:id/chat', ({ params, body, user }) => {
    const { s, e } = sala(params.id, user.id);
    const kind = ['msg', 'info', 'catalogo', 'proposta', 'contrato'].includes(body.kind) ? body.kind : 'msg';
    if (kind !== 'msg' && !EQUIPE.includes(cargoDe(e.id, user.id))) fail(403, 'Só a empresa manda proposta, catálogo e contrato.');
    const text = str(body.text, 'a mensagem', { max: 2000 });
    const m = moderateText(text, 'privado');
    if (!m.ok) fail(422, m.why, m.kind);
    const id = newId('sc');
    const valor = kind === 'proposta' && Number(body.value) > 0 ? Math.round(Number(body.value) * 100) : null;
    db.prepare('INSERT INTO sala_chat (id, sala_id, user_id, kind, text, valor, created_at) VALUES (?,?,?,?,?,?,?)').run(id, s.id, user.id, kind, text, valor, now());
    const item = { id, kind, who: user.name, userId: user.id, text, value: valor != null ? valor / 100 : null, accepted: false, at: now() };
    paraSala(s, user.id, 'sala-chat', { item });
    return item;
  }, { status: 201 });
  // O cliente aceita a proposta (só quem foi atendido aceita).
  r.post('/salas-privadas/:id/chat/:mid/aceitar', ({ params, user }) => {
    const { s } = sala(params.id, user.id);
    if (s.client_id !== user.id) fail(403, 'Só o cliente aceita a proposta.');
    const c = db.prepare(`SELECT * FROM sala_chat WHERE id = ? AND sala_id = ? AND kind = 'proposta'`).get(params.mid, s.id);
    if (!c) fail(404, 'Proposta não encontrada.');
    db.prepare('UPDATE sala_chat SET aceito = 1 WHERE id = ?').run(c.id);
    paraSala(s, user.id, 'sala-chat', { aceito: c.id });
    return { ok: true };
  });
  r.post('/salas-privadas/:id/tela', ({ params, body, user }) => {
    const { s } = sala(params.id, user.id);
    db.prepare('UPDATE salas_privadas SET tela_por = ? WHERE id = ?').run(body.on ? user.id : null, s.id);
    paraSala(s, user.id, 'sala-tela', { por: body.on ? { id: user.id, name: user.name } : null });
    return { ok: true };
  });
  // Encerrar: o acesso de quem é de fora da equipe acaba na hora.
  r.post('/salas-privadas/:id/encerrar', ({ params, user }) => {
    const { s, e } = sala(params.id, user.id);
    if (!EQUIPE.includes(cargoDe(e.id, user.id)) && s.created_by !== user.id) fail(403, 'Só quem atende encerra a sala.');
    paraSala(s, user.id, 'sala-fim', {});
    db.prepare('UPDATE salas_privadas SET ended_at = ? WHERE id = ?').run(now(), s.id);
    db.prepare('DELETE FROM sala_acessos WHERE sala_id = ?').run(s.id);
    voz.delete('sala_' + s.id);
    return { ok: true };
  });
  // Reunião da empresa (equipe, fornecedor, parceiro): começa só com quem criou; os outros entram por convite.
  r.post('/espacos/:id/reunioes', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    exigeCargo(e, user.id, EQUIPE, 'Só a equipe cria reuniões.');
    const sid = newId('sp');
    db.prepare(`INSERT INTO salas_privadas (id, espaco_id, kind, name, created_by, created_at) VALUES (?,?, 'reuniao', ?,?,?)`).run(sid, e.id, str(body.name, 'o nome', { optional: true, max: 60 }) || 'Reunião', user.id, now());
    db.prepare('INSERT INTO sala_acessos (sala_id, user_id) VALUES (?,?)').run(sid, user.id);
    return salaView(db.prepare('SELECT * FROM salas_privadas WHERE id = ?').get(sid), user.id);
  }, { status: 201 });
  // Arena: chamada particular com uma pessoa do servidor (sala de voz só dos dois).
  r.post('/espacos/:id/chamada-particular', ({ params, body, user }) => {
    const e = ver(params.id, user.id);
    if (!cargoDe(e.id, user.id)) fail(403, 'Entre no servidor primeiro.');
    const outro = userById(String(body.userId || ''));
    if (!outro || outro.id === user.id) fail(404, 'Pessoa não encontrada.');
    const sid = newId('sp');
    db.prepare(`INSERT INTO salas_privadas (id, espaco_id, kind, name, created_by, created_at) VALUES (?,?, 'voz', ?,?,?)`).run(sid, e.id, `🔒 ${user.name.split(' ')[0]} e ${outro.name.split(' ')[0]}`, user.id, now());
    db.prepare('INSERT INTO sala_acessos (sala_id, user_id) VALUES (?,?), (?,?)').run(sid, user.id, sid, outro.id);
    hub.send(outro.id, 'arena-chamada', { espacoId: e.id, salaId: sid, de: user.name, servidor: e.name });
    return salaView(db.prepare('SELECT * FROM salas_privadas WHERE id = ?').get(sid), user.id);
  }, { status: 201 });
  // Convite por link (vale 24 h): quem abre o link (com conta no Realyz) ganha acesso à sala.
  r.post('/salas-privadas/:id/convite', ({ params, user }) => {
    const { s } = sala(params.id, user.id);
    const token = randomBytes(12).toString('base64url');
    db.prepare('INSERT INTO sala_convites (token, sala_id, created_by, expires_at) VALUES (?,?,?,?)').run(token, s.id, user.id, now() + DIA);
    return { token, link: `${cfg.publicUrl || 'https://realyz.com.br'}/sala/${token}`, expiresAt: now() + DIA };
  });
  r.post('/convites-sala/:token/entrar', ({ params, user }) => {
    const c = db.prepare('SELECT * FROM sala_convites WHERE token = ?').get(String(params.token));
    const s = c && c.expires_at > now() && db.prepare('SELECT * FROM salas_privadas WHERE id = ? AND ended_at IS NULL').get(c.sala_id);
    if (!s) fail(404, 'Esse convite venceu ou a sala já foi encerrada. Peça um link novo.');
    if (banido(s.espaco_id, user.id)) fail(403, 'Você foi removido deste espaço pelos administradores.');
    db.prepare('INSERT OR IGNORE INTO sala_acessos (sala_id, user_id) VALUES (?,?)').run(s.id, user.id);
    paraSala(s, user.id, 'sala-entrou', { name: user.name });
    return { espacoId: s.espaco_id, salaId: s.id, kind: s.kind };
  });

  // ---------- Voz em grupo direto entre os celulares (até 5) ----------
  // O servidor só diz quem está na sala e passa os sinais da conexão; a voz vai de celular para celular.
  const iceFor = (userId) => {
    const ice = [{ urls: ['stun:stun.l.google.com:19302'] }];
    if (cfg.turnUrl && cfg.turnSecret) {
      const username = `${Math.floor(now() / 1000) + 6 * 3600}:${userId}`;
      ice.push({ urls: cfg.turnUrl.split(',').map((x) => x.trim()), username, credential: createHmac('sha1', cfg.turnSecret).update(username).digest('base64') });
    }
    return ice;
  };
  const podeVoz = (chave, uid) => {
    const [tipo, id] = String(chave).split(/_(.+)/);
    if (tipo === 'canal') {
      const { k } = canal(id, uid);
      if (k.kind !== 'voz') fail(400, 'Esse canal é de texto.');
    } else if (tipo === 'sala') sala(id, uid);
    else fail(404, 'Sala de voz não encontrada.');
  };
  r.post('/voz/:chave/entrar', ({ params, user }) => {
    const chave = String(params.chave);
    podeVoz(chave, user.id);
    const m = voz.get(chave) || new Map();
    if (!m.has(user.id) && m.size >= MAX_VOZ) fail(409, `A voz desta sala está cheia (${MAX_VOZ} pessoas, direto entre os celulares).`, 'voz_cheia');
    tirarDaVoz(user.id, chave);
    const ja = presenca(chave).filter((p) => p.id !== user.id);
    m.set(user.id, { name: user.name, at: now() });
    voz.set(chave, m);
    for (const p of ja) hub.send(p.id, 'voz-entrou', { chave, id: user.id, name: user.name });
    return { participantes: ja, iceServers: iceFor(user.id), max: MAX_VOZ };
  });
  r.post('/voz/:chave/sinal', ({ params, body, user }) => {
    const m = voz.get(String(params.chave));
    const to = String(body.to || '');
    if (!m || !m.has(user.id) || !m.has(to)) fail(404, 'Essa pessoa não está mais na voz.');
    const data = body.data;
    if (!data || JSON.stringify(data).length > 20000) fail(400, 'Sinal inválido.');
    hub.send(to, 'voz-sinal', { chave: params.chave, from: user.id, data });
    return { ok: true };
  });
  r.post('/voz/:chave/sair', ({ params, user }) => {
    const chave = String(params.chave);
    const m = voz.get(chave);
    if (m && m.delete(user.id)) for (const outro of m.keys()) hub.send(outro, 'voz-saiu', { chave, id: user.id });
    return { ok: true };
  });

  // ---------- Limpeza ----------
  // Mensagens dos canais com mais de 30 dias saem (regra dos grupos da Arena e do Hub);
  // convites vencidos; voz de quem sumiu há mais de 6 h.
  const limpar = () => {
    db.prepare('DELETE FROM canal_msgs WHERE created_at < ?').run(now() - 30 * DIA);
    db.prepare('DELETE FROM sala_convites WHERE expires_at < ?').run(now());
    for (const [chave, m] of voz) {
      for (const [uid, v] of m) if (now() - v.at > 6 * 3600 * 1000 && !hub.online(uid)) m.delete(uid);
      if (!m.size) voz.delete(chave);
    }
    renovarPlanos();
  };
  return { limpar };
}
