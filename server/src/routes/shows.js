// Contratação de artistas (classe Artistas: música, artes cênicas e artes visuais).
// O artista monta a vitrine (cachês, onde atende, agenda, vídeos). Quem quer contratar:
//  - Contratar: escolhe o show e um dia livre e paga; o valor fica retido até o show acontecer.
//    O artista aceita (o dia sai da agenda) ou recusa (o dinheiro volta na hora).
//  - Orçamento: o artista responde com cachê + deslocamento; quem pediu paga para fechar.
//  - Contato: conversa dentro do pedido. Telefone, rede social e pagamento por fora são bloqueados.
// Show realizado (quem contratou confirma): o Realyz fica com SHOW_FEE_PCT% do cachê (padrão 10%)
// e o artista recebe o resto mais o deslocamento inteiro. Quem contratou cancela com estorno total
// até 7 dias antes do show; depois, só pelo suporte (Garantia Realyz).
// Divulgação: cada lado marca os stories postados (artista: 2; quem contratou: 1).
import { exigirParceiroDeTeste } from '../teste.js';
import { exigirTrabalho } from '../trabalho.js';
import { fail, newId, now, str, money, int, oneOf, toReais } from '../http.js';
import { tx } from '../db.js';
import { antiDesvio, moderateText } from '../moderacaoTexto.js';
import { podeComprar, MSG_SEM_BIOMETRIA } from '../bioGate.js';

export const ARTIST_CLASSES = ['musico', 'cenicas', 'artista'];
export const CANCEL_DAYS = 7;
export const DIVULGA = { artista: 2, contratante: 1 };
const MODOS = ['cidade', 'regiao', 'viaja'];
// Como o artista cobra cada opção: por show (fechado), por hora, por serviço (ex.: arte, gravação)
// ou publicidade (divulga a marca de quem contrata: reels, stories, presença). Publicidade não ocupa
// o dia na agenda de shows e não tem deslocamento.
export const COBRANCAS = ['show', 'hora', 'servico', 'publicidade'];
const NAO_PUBLI = "(pacote IS NULL OR json_extract(pacote, '$.cobranca') IS NULL OR json_extract(pacote, '$.cobranca') != 'publicidade')";
const DAY = 86400000;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const dayTs = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return Date.UTC(y, m - 1, d) + 3 * 3600000; // meia-noite de Brasília
};
const isArtist = (u) => ARTIST_CLASSES.includes(String(u.social_class || '').split(/[:/]/)[0]);

export default function showsRoutes(r, { db, cfg, wallet, hub, userById, fiscal }) {
  const parse = (s, def) => {
    try {
      return s ? JSON.parse(s) : def;
    } catch {
      return def;
    }
  };
  const vitrineView = (row) => {
    const u = userById(row.user_id);
    const at = parse(row.atende, { modo: 'cidade' });
    return {
      id: row.user_id, nome: row.nome, genero: row.genero, cidade: row.cidade, frase: row.frase, foto: u && u.photo, ativo: !!row.ativo,
      pacotes: parse(row.pacotes, []).map((p) => ({ ...p, valor: toReais(p.valor) })),
      eventos: parse(row.eventos, []), atende: { ...at, porKm: toReais(at.porKm || 0) }, diasSemana: parse(row.dias_semana, []), agendaAte: row.agenda_ate,
      bloqueados: parse(row.bloqueados, []), vitrine: parse(row.vitrine, []), estrutura: row.estrutura,
      ocupados: db.prepare(`SELECT data FROM show_pedidos WHERE artist_id = ? AND status IN ('confirmado','realizado') AND data IS NOT NULL AND ${NAO_PUBLI}`).all(row.user_id).map((x) => x.data),
    };
  };
  const pedidoView = (p, me) => {
    const art = db.prepare('SELECT nome FROM artist_shows WHERE user_id = ?').get(p.artist_id);
    return {
      id: p.id, artistaId: p.artist_id, artista: art ? art.nome : userById(p.artist_id).name, clienteId: p.client_id, cliente: userById(p.client_id).name,
      lado: me === p.artist_id ? 'artista' : 'cliente', tipo: p.tipo, status: p.status, pacote: parse(p.pacote, null), data: p.data, hora: p.hora, evento: p.evento, local: p.local,
      cidade: p.cidade, publico: p.publico, valor: p.valor == null ? null : toReais(p.valor), desloc: toReais(p.desloc), total: p.valor == null ? null : toReais(p.valor + p.desloc),
      pago: p.pay_state === 'retida' || p.pay_state === 'liberada', payState: p.pay_state, divulgacao: { artista: p.divulga_artista, contratante: p.divulga_cliente }, nota: p.nota,
      msgs: db.prepare('SELECT from_id, text, created_at FROM show_msgs WHERE pedido_id = ? ORDER BY created_at').all(p.id).map((m) => ({ de: m.from_id === p.artist_id ? 'artista' : 'cliente', text: m.text, at: m.created_at })),
      createdAt: p.created_at,
    };
  };
  const getPedido = (id, user) => {
    const p = db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(String(id));
    if (!p || (p.client_id !== user.id && p.artist_id !== user.id)) fail(404, 'Pedido não encontrado.');
    return p;
  };
  const ocupado = (artistId, data, exceptId = '') =>
    !!db.prepare(`SELECT 1 FROM show_pedidos WHERE artist_id = ? AND data = ? AND status = 'confirmado' AND id != ? AND ${NAO_PUBLI}`).get(artistId, data, exceptId);
  const precisaBio = (user) => {
    if (!podeComprar(db, cfg, user, JSON.parse(user.roles || '[]'))) fail(403, MSG_SEM_BIOMETRIA, 'biometria');
  };
  // Dinheiro retido volta para quem pagou (mesmos bolsos).
  const estornar = (p, motivo) => {
    if (p.pay_state !== 'retida') return;
    const total = p.valor + p.desloc;
    wallet.move('realys', 'saldo', -total, 'Shows retidos', `${motivo} (show ${p.id})`, p.id);
    wallet.move(p.client_id, 'presente', p.from_gift || 0, 'Estorno', `Show: ${motivo}`, p.id);
    wallet.move(p.client_id, 'saldo', total - (p.from_gift || 0), 'Estorno', `Show: ${motivo}`, p.id);
    db.prepare("UPDATE show_pedidos SET pay_state = 'devolvida' WHERE id = ?").run(p.id);
  };
  const reter = (p, user, total) => {
    const { fromGift } = wallet.pay(user.id, total, 'Shows', 'Show retido pela Garantia Realyz', p.id);
    wallet.move('realys', 'saldo', total, 'Shows retidos', `Show retido ${p.id}`, p.id);
    return fromGift;
  };
  const texto = (t) => {
    const s = str(t, 'a mensagem', { max: 1000 });
    const mm = moderateText(s, 'privado');
    if (!mm.ok) fail(422, mm.why, mm.kind);
    const ad = antiDesvio(s);
    if (!ad.ok) fail(422, ad.why, 'desvio');
    return s;
  };

  // ── Vitrine do artista ──
  r.get('/shows/me', ({ user }) => {
    const row = db.prepare('SELECT * FROM artist_shows WHERE user_id = ?').get(user.id);
    return row ? vitrineView(row) : null;
  });
  r.put('/shows/me', ({ body, user, roles }) => {
    exigirTrabalho(db, user, 'artista', roles, cfg);
    if (!isArtist(user)) fail(403, 'A vitrine de shows é da classe Artistas (música, artes cênicas e artes visuais). Troque a sua classe no perfil.', 'classe');
    const pacotes = (Array.isArray(body.pacotes) ? body.pacotes : []).slice(0, 10).map((p, i) => ({
      id: String(p.id || 'p' + i).slice(0, 20), nome: str(p.nome, 'o nome da opção', { max: 60 }),
      cobranca: COBRANCAS.includes(p.cobranca) ? p.cobranca : 'show',
      // Duração só conta no show fechado; nas outras é opcional (por hora o cliente escolhe as horas).
      duracao: (p.cobranca || 'show') === 'show' || !COBRANCAS.includes(p.cobranca) ? int(p.duracao, 'a duração', { min: 10, max: 720 }) : p.duracao ? int(p.duracao, 'a duração', { min: 0, max: 720 }) : null,
      valor: money(p.valor, 'o valor', { min: p.cobranca === 'hora' ? 20 : 50, max: 1e6 }), desc: str(p.desc, 'a descrição', { optional: true, max: 160 }),
    }));
    if (!pacotes.length) fail(400, 'Cadastre pelo menos uma opção com valor (por show, por hora, por serviço ou publicidade).');
    const at = body.atende || {};
    const atende = {
      modo: oneOf(at.modo, 'onde atende', MODOS), raioKm: at.modo === 'regiao' ? int(at.raioKm, 'o raio', { min: 1, max: 2000 }) : null,
      porKm: at.modo === 'cidade' ? 0 : money(at.porKm || 0, 'o valor por km', { min: 0, max: 100 }), hospedagem: !!at.hospedagem,
    };
    const dias = (Array.isArray(body.diasSemana) ? body.diasSemana : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    const bloqueados = (Array.isArray(body.bloqueados) ? body.bloqueados : []).filter(isDate).slice(0, 400);
    const vitrine = (Array.isArray(body.vitrine) ? body.vitrine : []).slice(0, 8).map((v) => ({ kind: v.kind === 'foto' ? 'foto' : 'video', titulo: String(v.titulo || '').slice(0, 60), capa: typeof v.capa === 'string' && /^https?:\/\//.test(v.capa) ? v.capa : null }));
    const eventos = (Array.isArray(body.eventos) ? body.eventos : []).map((e) => String(e).slice(0, 30)).slice(0, 12);
    const agendaAte = body.agendaAte && /^\d{4}-\d{2}(-\d{2})?$/.test(body.agendaAte) ? body.agendaAte : null;
    const row = {
      ativo: body.ativo ? 1 : 0, nome: str(body.nome, 'o nome artístico', { max: 60 }), genero: str(body.genero, 'o estilo', { optional: true, max: 40 }),
      cidade: str(body.cidade, 'a cidade', { max: 60 }), frase: str(body.frase, 'a frase', { optional: true, max: 90 }), estrutura: str(body.estrutura, 'a estrutura', { optional: true, max: 200 }),
    };
    const mm = moderateText(`${row.nome} ${row.frase} ${row.estrutura}`, 'publico');
    if (!mm.ok) fail(422, mm.why, mm.kind);
    const ad = antiDesvio(`${row.frase} ${row.estrutura}`);
    if (!ad.ok) fail(422, ad.why, 'desvio');
    db.prepare(
      `INSERT INTO artist_shows (user_id, ativo, nome, genero, cidade, frase, pacotes, eventos, atende, dias_semana, agenda_ate, bloqueados, vitrine, estrutura, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET ativo=excluded.ativo, nome=excluded.nome, genero=excluded.genero, cidade=excluded.cidade, frase=excluded.frase, pacotes=excluded.pacotes,
       eventos=excluded.eventos, atende=excluded.atende, dias_semana=excluded.dias_semana, agenda_ate=excluded.agenda_ate, bloqueados=excluded.bloqueados, vitrine=excluded.vitrine,
       estrutura=excluded.estrutura, updated_at=excluded.updated_at`
    ).run(user.id, row.ativo, row.nome, row.genero, row.cidade, row.frase, JSON.stringify(pacotes), JSON.stringify(eventos), JSON.stringify(atende), JSON.stringify(dias), agendaAte, JSON.stringify(bloqueados), JSON.stringify(vitrine), row.estrutura, now());
    return vitrineView(db.prepare('SELECT * FROM artist_shows WHERE user_id = ?').get(user.id));
  });
  // Lista para quem quer contratar (só vitrines ligadas). Filtros: cidade e texto.
  r.get('/shows/artistas', ({ query }) => {
    const q = String(query.q || '').toLowerCase();
    const cidade = String(query.cidade || '').toLowerCase();
    return db.prepare('SELECT * FROM artist_shows WHERE ativo = 1 ORDER BY updated_at DESC LIMIT 200').all()
      .filter((a) => (!q || `${a.nome} ${a.genero} ${a.cidade}`.toLowerCase().includes(q)) && (!cidade || a.cidade.toLowerCase().startsWith(cidade)))
      .map(vitrineView);
  }, { auth: false });
  r.get('/shows/artistas/:id', ({ params }) => {
    const row = db.prepare('SELECT * FROM artist_shows WHERE user_id = ? AND ativo = 1').get(params.id);
    if (!row) fail(404, 'Artista não encontrado.');
    return vitrineView(row);
  }, { auth: false });

  // ── Pedidos ──
  r.get('/shows/pedidos', ({ user }) =>
    db.prepare('SELECT * FROM show_pedidos WHERE client_id = ? OR artist_id = ? ORDER BY created_at DESC LIMIT 200').all(user.id, user.id).map((p) => pedidoView(p, user.id))
  );
  r.post('/shows/pedidos', ({ body, user }) => {
    const row = db.prepare('SELECT * FROM artist_shows WHERE user_id = ? AND ativo = 1').get(String(body.artistaId || ''));
    if (!row) fail(404, 'Esse artista não está aceitando contratação agora.');
    if (row.user_id === user.id) fail(400, 'Você não pode contratar a si mesmo.');
    exigirParceiroDeTeste(db, row.user_id);
    const tipo = oneOf(body.tipo, 'o tipo de pedido', ['contratacao', 'orcamento', 'contato']);
    const id = newId('sh');
    const t = now();
    const msg = body.mensagem ? texto(body.mensagem) : '';
    if (tipo === 'contato' && !msg) fail(400, 'Escreva a sua mensagem.');
    let data = null;
    let pacote = null;
    let valor = null;
    let desloc = 0;
    const escolhido = tipo === 'contratacao' ? parse(row.pacotes, []).find((x) => x.id === String(body.pacoteId || '')) : null;
    const publi = !!escolhido && escolhido.cobranca === 'publicidade';
    if (tipo !== 'contato') {
      data = String(body.data || '');
      if (!isDate(data)) fail(400, publi ? 'Escolha o dia da publicação.' : 'Escolha o dia do show.');
      if (dayTs(data) < t - DAY) fail(400, 'Esse dia já passou.');
      if (!publi && (ocupado(row.user_id, data) || parse(row.bloqueados, []).includes(data))) fail(409, 'Esse dia não está livre na agenda do artista.', 'data_ocupada');
    }
    if (tipo === 'contratacao') {
      precisaBio(user);
      const pk = escolhido;
      if (!pk) fail(400, 'Escolha uma das opções do artista.');
      // Por hora: quem contrata escolhe quantas horas (o valor é por hora).
      const horas = pk.cobranca === 'hora' ? int(body.horas || 1, 'as horas', { min: 1, max: 24 }) : null;
      pacote = horas ? { ...pk, horas } : pk;
      valor = pk.valor * (horas || 1);
      // Deslocamento: o app calcula pela distância e o servidor limita ao que o artista cobra.
      const at = parse(row.atende, { modo: 'cidade' });
      const km = publi || body.km == null ? 0 : int(body.km, 'a distância', { min: 0, max: 6000 });
      if (km > 0 && at.modo === 'cidade') fail(409, 'Esse artista só atende na cidade dele. Peça um orçamento.', 'fora_da_area');
      if (at.modo === 'regiao' && km > (at.raioKm || 0)) fail(409, `Esse artista atende até ${at.raioKm} km. Peça um orçamento.`, 'fora_da_area');
      desloc = Math.round(km * 2 * (at.porKm || 0));
    }
    tx(db, () => {
      db.prepare(
        'INSERT INTO show_pedidos (id, artist_id, client_id, tipo, status, pacote, data, hora, evento, local, cidade, publico, valor, desloc, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).run(id, row.user_id, user.id, tipo, tipo === 'contato' ? 'conversa' : 'aguardando', pacote ? JSON.stringify(pacote) : null, data, str(body.hora, 'o horário', { optional: true, max: 10 }),
        str(body.evento, 'o evento', { optional: true, max: 40 }), str(body.local, 'o local', { optional: true, max: 120 }), str(body.cidade, 'a cidade', { optional: true, max: 60 }),
        body.publico ? int(body.publico, 'o público', { min: 1, max: 200000 }) : null, valor, desloc, t, t);
      if (msg) db.prepare('INSERT INTO show_msgs (id, pedido_id, from_id, text, created_at) VALUES (?,?,?,?,?)').run(newId('sm'), id, user.id, msg, t);
      if (tipo === 'contratacao') {
        const fromGift = reter({ id }, user, valor + desloc);
        db.prepare("UPDATE show_pedidos SET pay_state = 'retida', from_gift = ? WHERE id = ?").run(fromGift, id);
      }
    });
    const out = pedidoView(db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(id), user.id);
    hub.send(row.user_id, 'show', pedidoView(db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(id), row.user_id));
    return out;
  }, { status: 201 });

  // Artista responde: contratação (aceitar/recusar) ou orçamento (valor + deslocamento, ou recusar).
  r.post('/shows/pedidos/:id/responder', ({ params, body, user }) => {
    const p = getPedido(params.id, user);
    if (p.artist_id !== user.id) fail(403, 'Só o artista responde o pedido.');
    if (p.status !== 'aguardando') fail(409, 'Esse pedido já foi respondido.');
    const nota = body.nota ? texto(body.nota) : '';
    tx(db, () => {
      if (!body.aceitar) {
        estornar(p, 'o artista recusou');
        db.prepare("UPDATE show_pedidos SET status = 'recusado', updated_at = ? WHERE id = ?").run(now(), p.id);
      } else if (p.tipo === 'contratacao') {
        const ehPubli = (parse(p.pacote, {}) || {}).cobranca === 'publicidade';
        if (!ehPubli && ocupado(p.artist_id, p.data, p.id)) fail(409, 'Você já tem show fechado nesse dia.', 'data_ocupada');
        db.prepare("UPDATE show_pedidos SET status = 'confirmado', updated_at = ? WHERE id = ?").run(now(), p.id);
      } else {
        const valor = money(body.valor, 'o cachê', { min: 50, max: 1e6 });
        const desloc = body.desloc ? money(body.desloc, 'o deslocamento', { min: 0, max: 1e5 }) : 0;
        db.prepare("UPDATE show_pedidos SET status = 'proposta', valor = ?, desloc = ?, updated_at = ? WHERE id = ?").run(valor, desloc, now(), p.id);
      }
      if (nota) db.prepare('INSERT INTO show_msgs (id, pedido_id, from_id, text, created_at) VALUES (?,?,?,?,?)').run(newId('sm'), p.id, user.id, nota, now());
    });
    const fresh = db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(p.id);
    hub.send(p.client_id, 'show', pedidoView(fresh, p.client_id));
    return pedidoView(fresh, user.id);
  });
  // Quem pediu o orçamento paga para fechar o show.
  r.post('/shows/pedidos/:id/pagar', ({ params, user }) => {
    precisaBio(user);
    const p = getPedido(params.id, user);
    if (p.client_id !== user.id) fail(403, 'Só quem pediu paga o show.');
    if (p.status !== 'proposta') fail(409, 'Esse orçamento não está esperando pagamento.');
    if (ocupado(p.artist_id, p.data, p.id)) fail(409, 'Esse dia acabou de ser fechado com outra pessoa.', 'data_ocupada');
    tx(db, () => {
      const fromGift = reter(p, user, p.valor + p.desloc);
      db.prepare("UPDATE show_pedidos SET status = 'confirmado', pay_state = 'retida', from_gift = ?, updated_at = ? WHERE id = ?").run(fromGift, now(), p.id);
    });
    const fresh = db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(p.id);
    hub.send(p.artist_id, 'show', pedidoView(fresh, p.artist_id));
    return pedidoView(fresh, user.id);
  });
  // Cancelar: quem contratou, até 7 dias antes (estorno total). O artista pode cancelar sempre
  // (o dinheiro volta inteiro para quem contratou).
  r.post('/shows/pedidos/:id/cancelar', ({ params, user }) => {
    const p = getPedido(params.id, user);
    if (!['aguardando', 'proposta', 'confirmado', 'conversa'].includes(p.status)) fail(409, 'Esse pedido já foi encerrado.');
    const artista = p.artist_id === user.id;
    if (!artista && p.status === 'confirmado' && dayTs(p.data) - now() < CANCEL_DAYS * DAY) fail(409, `Faltam menos de ${CANCEL_DAYS} dias para o show. Fale com o suporte do Realyz.`, 'prazo');
    tx(db, () => {
      estornar(p, artista ? 'o artista cancelou' : 'cancelado por quem contratou');
      db.prepare("UPDATE show_pedidos SET status = 'cancelado', updated_at = ? WHERE id = ?").run(now(), p.id);
    });
    const fresh = db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(p.id);
    hub.send(artista ? p.client_id : p.artist_id, 'show', pedidoView(fresh, artista ? p.client_id : p.artist_id));
    return pedidoView(fresh, user.id);
  });
  // Quem contratou confirma que o show aconteceu: o dinheiro é liberado para o artista.
  r.post('/shows/pedidos/:id/realizado', ({ params, body, user }) => {
    const p = getPedido(params.id, user);
    if (p.client_id !== user.id) fail(403, 'Quem confirma o show é quem contratou.');
    if (p.status !== 'confirmado' || p.pay_state !== 'retida') fail(409, 'Esse show não está fechado.');
    if (dayTs(p.data) > now()) fail(409, 'O show ainda não aconteceu.');
    const cut = Math.round((p.valor * cfg.showFeePct) / 100);
    const paraArtista = p.valor - cut + p.desloc;
    tx(db, () => {
      wallet.move('realys', 'saldo', -paraArtista, 'Shows retidos', `Show realizado ${p.id}`, p.id);
      wallet.move(p.artist_id, 'saldo', paraArtista, 'Shows', `Show para ${user.name}`, p.id);
      if (cut) fiscal.registrar({ origem: 'comissao_show', ref: p.id, tomadorId: p.artist_id, valorCents: cut });
      const nota = body && body.nota != null ? int(body.nota, 'a nota', { min: 1, max: 5 }) : null;
      db.prepare("UPDATE show_pedidos SET status = 'realizado', pay_state = 'liberada', nota = ?, updated_at = ? WHERE id = ?").run(nota, now(), p.id);
    });
    hub.send(p.artist_id, 'payment', { showId: p.id, amount: toReais(paraArtista), from: user.name });
    return pedidoView(db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(p.id), user.id);
  });
  // Conversa do pedido (anti-desvio).
  r.post('/shows/pedidos/:id/mensagens', ({ params, body, user }) => {
    const p = getPedido(params.id, user);
    if (['cancelado', 'recusado'].includes(p.status)) fail(409, 'Esse pedido foi encerrado.');
    const text = texto(body.text);
    const m = { id: newId('sm'), at: now() };
    db.prepare('INSERT INTO show_msgs (id, pedido_id, from_id, text, created_at) VALUES (?,?,?,?,?)').run(m.id, p.id, user.id, text, m.at);
    const other = user.id === p.artist_id ? p.client_id : p.artist_id;
    hub.send(other, 'show_msg', { pedidoId: p.id, text, fromName: user.name, at: m.at });
    return { ok: true, at: m.at };
  }, { status: 201 });
  // Compromisso de divulgação: cada lado marca um story postado.
  r.post('/shows/pedidos/:id/divulgacao', ({ params, user }) => {
    const p = getPedido(params.id, user);
    if (!['confirmado', 'realizado'].includes(p.status)) fail(409, 'A divulgação começa quando o show está fechado.');
    const col = user.id === p.artist_id ? 'divulga_artista' : 'divulga_cliente';
    db.prepare(`UPDATE show_pedidos SET ${col} = ${col} + 1, updated_at = ? WHERE id = ?`).run(now(), p.id);
    return pedidoView(db.prepare('SELECT * FROM show_pedidos WHERE id = ?').get(p.id), user.id);
  });
}
