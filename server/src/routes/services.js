// Prestadores de serviço (eletricista, motorista, motoboy, hotelaria...), chamados e avaliações.
// O prestador liga o GPS e fica disponível; o cliente vê os mais próximos com nota, o que faz e
// quanto cobra, escolhe, chama ou agenda e acompanha o prestador chegando.
import { exigirParceiroDeTeste } from '../teste.js';
import { exigirTrabalho } from '../trabalho.js';
import { fail, newId, now, str, money, int, coord, toReais } from '../http.js';
import { tx } from '../db.js';
import { publicName } from '../providerName.js';

const CALL_STATUS = ['Solicitado', 'Aceito', 'A caminho', 'Chegou', 'Concluído', 'Recusado', 'Cancelado'];
const TRANSPORT = ['motorista', 'motoboy', 'frete', 'carro', 'moto', 'van'];

// Horário de trabalho: 7 dias (domingo = 0), cada um { on, from, to } em horas. "to" pode passar da
// meia-noite (ex.: 18 às 2). As horas são de Brasília, não do servidor.
const FUSO = 'America/Sao_Paulo';
const DIAS_SEMANA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function agoraLocal(at) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: FUSO, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return { dia: DIAS_SEMANA[parts.weekday], hora: Number(parts.hour) + Number(parts.minute) / 60 };
}
export function emHorario(horario, at = Date.now()) {
  if (!Array.isArray(horario) || horario.length !== 7) return false;
  const { dia, hora } = agoraLocal(at);
  const hoje = horario[dia];
  if (hoje && hoje.on && (hoje.to > hoje.from ? hora >= hoje.from && hora < hoje.to : hora >= hoje.from)) return true;
  // Turno de ontem que passa da meia-noite (ex.: sexta 18 às 2 vale até sábado 2h).
  const ontem = horario[(dia + 6) % 7];
  return !!(ontem && ontem.on && ontem.to <= ontem.from && hora < ontem.to);
}
const lerHorario = (p) => {
  try {
    return p && p.horario ? JSON.parse(p.horario) : null;
  } catch (e) {
    return null;
  }
};

// Distância em km entre dois pontos (fórmula de haversine).
export function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export default function servicesRoutes(r, { db, cfg, wallet, hub, userById, biometria, fiscal }) {
  // Para o cliente, o prestador aparece só com o primeiro nome e a inicial do sobrenome
  // ("Carlos L."): ele não acha o prestador pelo nome completo para contratar por fora.
  const providerView = (p, from, { own = false } = {}) => {
    const u = userById(p.user_id);
    const km = from && p.lat != null ? distanceKm(from.lat, from.lng, p.lat, p.lng) : null;
    return {
      id: p.user_id, name: own ? u.name : publicName(u.name), fullName: own ? u.name : undefined, photo: u.photo, service: p.service, outros: JSON.parse(p.outros || '[]'), functions: JSON.parse(p.functions), price: toReais(p.price), priceUnit: p.price_unit,
      available: !!p.available, vehicle: p.vehicle, visitFee: toReais(p.visit_fee || 0), rating: +p.rating.toFixed(1), ratingCount: p.rating_count,
      distanceKm: km == null ? null : +km.toFixed(1), etaMin: km == null ? null : Math.max(3, Math.round(km * (TRANSPORT.includes(p.service) ? 4 : 6))),
    };
  };

  // Cadastro do prestador: funções e valores, que a Lotus repassa ao cliente.
  r.put('/providers/me', ({ body, user, roles }) => {
    exigirTrabalho(db, user, 'prestador', roles, cfg);
    const functions = Array.isArray(body.functions) ? body.functions.map((f) => String(f).trim().slice(0, 60)).filter(Boolean).slice(0, 15) : [];
    if (!functions.length) fail(400, 'Informe pelo menos uma função (o que você faz).');
    const row = {
      service: str(body.service, 'o tipo de serviço', { max: 40 }).toLowerCase(), functions: JSON.stringify(functions),
      // Preço que só sai depois de ver o serviço: 0 = "a combinar" (na visita ou no orçamento).
      price: body.price === undefined || body.price === null || body.price === '' || Number(body.price) === 0 ? 0 : money(body.price, 'preço'),
      price_unit: str(body.priceUnit, 'a unidade do preço (hora, visita, corrida...)', { max: 30 }), vehicle: str(body.vehicle, 'o veículo', { optional: true, max: 80 }) || null,
    };
    // Outras profissões (botão "Adicionar outra profissão"): até 4, sem repetir a principal.
    row.outros = JSON.stringify([...new Set((Array.isArray(body.outros) ? body.outros : []).map((x) => String(x).trim().toLowerCase().slice(0, 40)).filter((x) => x && x !== row.service))].slice(0, 4));
    // Taxa de visita: quem define é o prestador. Sem informar, quem cobra "por visita" usa o próprio preço.
    row.visit_fee = body.visitFee !== undefined && body.visitFee !== null && body.visitFee !== '' ? money(body.visitFee, 'taxa de visita', { min: 0 }) : /visita/i.test(row.price_unit) ? row.price : 0;
    tx(db, () => {
      if (db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(user.id)) {
        db.prepare('UPDATE providers SET visit_fee = ?, outros = ? WHERE user_id = ?').run(row.visit_fee, row.outros, user.id);
        db.prepare('UPDATE providers SET service = ?, functions = ?, price = ?, price_unit = ?, vehicle = ?, updated_at = ? WHERE user_id = ?').run(row.service, row.functions, row.price, row.price_unit, row.vehicle, now(), user.id);
      } else {
        db.prepare('INSERT INTO providers (user_id, service, functions, price, price_unit, vehicle, updated_at) VALUES (?,?,?,?,?,?,?)').run(user.id, row.service, row.functions, row.price, row.price_unit, row.vehicle, now());
        db.prepare('UPDATE providers SET visit_fee = ?, outros = ? WHERE user_id = ?').run(row.visit_fee, row.outros, user.id);
        const roles = JSON.parse(user.roles);
        if (!roles.includes('prestador')) db.prepare('UPDATE users SET roles = ? WHERE id = ?').run(JSON.stringify([...roles, 'prestador']), user.id);
      }
    });
    return providerView(db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id), null, { own: true });
  });

  // Liga/desliga o GPS e a disponibilidade. Chamado de tempos em tempos pelo app com a posição.
  // Se o prestador estiver a caminho de um cliente, o cliente recebe a posição na hora.
  r.post('/providers/me/location', ({ body, user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
    if (!p) fail(404, 'Cadastre-se como prestador primeiro.');
    const lat = coord(body.lat, 'latitude');
    const lng = coord(body.lng, 'longitude');
    const going = body.available !== false;
    // Entregador e motorista: sem verificação facial nas últimas 6 h, não ficam disponíveis.
    if (going && TRANSPORT.includes(p.service) && !biometria.periodicOk(user.id)) {
      db.prepare('UPDATE providers SET available = 0, updated_at = ? WHERE user_id = ?').run(now(), user.id);
      fail(403, 'Confirme seu rosto para continuar disponível. Isso é feito a cada 6 horas.', 'verificacao_periodica');
    }
    db.prepare('UPDATE providers SET lat = ?, lng = ?, available = ?, updated_at = ? WHERE user_id = ?').run(lat, lng, going ? 1 : 0, now(), user.id);
    for (const c of db.prepare(`SELECT id, client_id FROM service_calls WHERE provider_id = ? AND status IN ('Aceito','A caminho')`).all(user.id)) {
      hub.send(c.client_id, 'tracking', { callId: c.id, lat, lng });
    }
    // Entregas em andamento: o cliente e a loja veem o entregador no mapa.
    for (const e of db.prepare(`SELECT id, order_id, loja_id, cliente_id FROM entregas WHERE entregador_id = ? AND status IN ('aceita','coletada')`).all(user.id)) {
      [e.loja_id, e.cliente_id].filter(Boolean).forEach((u) => hub.send(u, 'tracking', { entregaId: e.id, orderId: e.order_id, lat, lng }));
    }
    return { ok: true };
  });

  // Horário de trabalho: o prestador programa os dias e as horas e liga "ficar disponível sozinho".
  // No horário, ele aparece para os clientes e recebe os chamados (notificação mesmo com o app fechado).
  r.get('/providers/me/horario', ({ user }) => {
    const p = db.prepare('SELECT horario, auto_horario FROM providers WHERE user_id = ?').get(user.id);
    if (!p) fail(404, 'Cadastre-se como prestador primeiro.');
    const horario = lerHorario(p);
    return { auto: !!p.auto_horario, horario, agora: emHorario(horario) };
  });
  r.put('/providers/me/horario', ({ body, user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
    if (!p) fail(404, 'Cadastre-se como prestador primeiro.');
    const h = body.horario;
    if (!Array.isArray(h) || h.length !== 7) fail(400, 'Mande os 7 dias da semana.');
    const horario = h.map((d, i) => {
      const from = Number(d && d.from);
      const to = Number(d && d.to);
      if (!(from >= 0 && from < 24 && to >= 0 && to <= 24) || from === to) fail(400, `Horário inválido no dia ${i}.`);
      return { on: !!(d && d.on), from, to };
    });
    const auto = !!body.auto;
    db.prepare('UPDATE providers SET horario = ?, auto_horario = ?, updated_at = updated_at WHERE user_id = ?').run(JSON.stringify(horario), auto ? 1 : 0, user.id);
    return { auto, horario, agora: emHorario(horario) };
  });

  // Os mais próximos de um tipo de serviço, com nota, funções, preço e tempo para chegar.
  // Entram: quem ligou o "disponível" com o GPS atualizado nos últimos 15 minutos, e quem está no
  // horário de trabalho programado (última posição das últimas 24 h; transporte com o rosto em dia).
  r.get('/providers/nearby', ({ query }) => {
    const from = { lat: coord(query.lat, 'latitude'), lng: coord(query.lng, 'longitude') };
    const max = Math.min(20, Number(query.max || 5));
    const fresh = now() - 15 * 60 * 1000;
    const dia = now() - 24 * 60 * 60 * 1000;
    const rows = db.prepare(`SELECT p.* FROM providers p JOIN users u ON u.id = p.user_id WHERE p.lat IS NOT NULL AND u.status = 'ativo' AND ((p.available = 1 AND p.updated_at > ?) OR (p.auto_horario = 1 AND p.updated_at > ?)) ${query.service ? 'AND (p.service = ? OR EXISTS (SELECT 1 FROM json_each(p.outros) WHERE value = ?))' : ''}`)
      .all(...(query.service ? [fresh, dia, String(query.service).toLowerCase(), String(query.service).toLowerCase()] : [fresh, dia]))
      .filter((p) => (p.available === 1 && p.updated_at > fresh) || (emHorario(lerHorario(p)) && (!TRANSPORT.includes(p.service) || biometria.periodicOk(p.user_id))));
    return rows.map((p) => providerView(p, from)).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, max);
  });

  r.get('/providers/:id', ({ params }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(params.id);
    if (!p) fail(404, 'Prestador não encontrado.');
    return providerView(p);
  }, { auth: false });

  // ── Chamados ──
  const callView = (c) => ({ visitFee: toReais(c.visit_fee || 0), visitState: c.visit_state || null, problem: c.problem || '', rideFee: toReais(c.ride_fee || 0), id: c.id, clientId: c.client_id, client: userById(c.client_id).name, providerId: c.provider_id, provider: publicName(userById(c.provider_id).name), service: c.service, address: c.address, when: c.when_text, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at });

  // O cliente chama agora ou agenda ("amanhã às 9h"). Só depois que confirmou no app.
  r.post('/calls', ({ body, user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(String(body.providerId || ''));
    if (!p) fail(404, 'Prestador não encontrado.');
    if (p.user_id === user.id) fail(400, 'Você não pode chamar a si mesmo.');
    exigirParceiroDeTeste(db, p.user_id);
    const when = str(body.when, 'o horário', { optional: true, max: 60 }) || null;
    if (!when && !p.available) fail(409, 'Esse prestador não está disponível agora. Você pode agendar.');
    const id = newId('ch');
    const t = now();
    const problem = str(body.problem, 'o que você precisa', { optional: true, max: 500 }) || '';
    // Serviço com visita (não é transporte): o cliente paga a taxa de visita agora e ela fica retida.
    const fee = !TRANSPORT.includes(p.service) ? p.visit_fee || 0 : 0;
    tx(db, () => {
      let fromGift = 0;
      if (fee) {
        fromGift = wallet.pay(user.id, fee, 'Serviços', `Taxa de visita retida (${p.service})`, id).fromGift;
        wallet.move('realys', 'saldo', fee, 'Visitas retidas', `Taxa de visita retida do chamado ${id}`, id);
      }
      db.prepare('INSERT INTO service_calls (id, client_id, provider_id, service, address, when_text, status, created_at, updated_at, visit_fee, visit_from_gift, visit_state, problem) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
        id, user.id, p.user_id, p.service, str(body.address, 'o endereço', { optional: true, max: 200 }), when, 'Solicitado', t, t, fee, fromGift, fee ? 'retida' : null, problem
      );
    });
    const call = callView(db.prepare('SELECT * FROM service_calls WHERE id = ?').get(id));
    hub.send(p.user_id, 'call', call);
    return call;
  }, { status: 201 });

  // Taxa de visita retida volta para o cliente, no mesmo bolso de onde saiu (recusou, cancelou ou não apareceu).
  const devolverVisita = (c, motivo) => {
    if (c.visit_state !== 'retida' || !c.visit_fee) return;
    wallet.move('realys', 'saldo', -c.visit_fee, 'Visitas retidas', `${motivo} (chamado ${c.id})`, c.id);
    wallet.move(c.client_id, 'presente', c.visit_from_gift || 0, 'Estorno', `Taxa de visita devolvida: ${motivo}`, c.id);
    wallet.move(c.client_id, 'saldo', c.visit_fee - (c.visit_from_gift || 0), 'Estorno', `Taxa de visita devolvida: ${motivo}`, c.id);
    db.prepare("UPDATE service_calls SET visit_state = 'devolvida' WHERE id = ?").run(c.id);
  };

  // O cliente confirma que a visita aconteceu: o Realyz fica com a parte dele e o resto vai para o prestador.
  r.post('/calls/:id/confirmar-visita', ({ params, user }) => {
    const c = db.prepare('SELECT * FROM service_calls WHERE id = ? AND client_id = ?').get(params.id, user.id);
    if (!c) fail(404, 'Chamado não encontrado.');
    if (c.visit_state !== 'retida') fail(409, 'Essa visita não tem taxa retida para liberar.');
    if (!['Aceito', 'A caminho', 'Chegou', 'Concluído'].includes(c.status)) fail(409, 'O prestador ainda não aceitou essa visita.');
    const cut = Math.round((c.visit_fee * cfg.visitFeePct) / 100);
    tx(db, () => {
      wallet.move('realys', 'saldo', -(c.visit_fee - cut), 'Visitas retidas', `Visita confirmada (chamado ${c.id})`, c.id);
      wallet.move(c.provider_id, 'saldo', c.visit_fee - cut, 'Serviços', `Taxa de visita de ${user.name}`, c.id);
      if (cut) fiscal.registrar({ origem: 'taxa_visita', ref: c.id, tomadorId: c.provider_id, valorCents: cut });
      db.prepare("UPDATE service_calls SET visit_state = 'liberada', updated_at = ? WHERE id = ?").run(now(), c.id);
    });
    hub.send(c.provider_id, 'payment', { callId: c.id, amount: toReais(c.visit_fee - cut), from: user.name });
    return callView(db.prepare('SELECT * FROM service_calls WHERE id = ?').get(c.id));
  });

  // O prestador aceitou e não foi: a taxa volta e o chamado é cancelado.
  r.post('/calls/:id/nao-compareceu', ({ params, user }) => {
    const c = db.prepare('SELECT * FROM service_calls WHERE id = ? AND client_id = ?').get(params.id, user.id);
    if (!c) fail(404, 'Chamado não encontrado.');
    if (!['Aceito', 'A caminho'].includes(c.status)) fail(409, 'Só dá para avisar que o prestador não veio depois que ele aceitou.');
    tx(db, () => {
      devolverVisita(c, 'o prestador não compareceu');
      db.prepare("UPDATE service_calls SET status = 'Cancelado', updated_at = ? WHERE id = ?").run(now(), c.id);
    });
    const call = callView(db.prepare('SELECT * FROM service_calls WHERE id = ?').get(c.id));
    hub.send(c.provider_id, 'call', call);
    return call;
  });

  r.get('/calls', ({ user }) => db.prepare('SELECT * FROM service_calls WHERE client_id = ? OR provider_id = ? ORDER BY created_at DESC LIMIT 50').all(user.id, user.id).map(callView));

  // Prestador aceita, sai, chega, conclui ou recusa. Cliente pode cancelar antes de concluir.
  r.patch('/calls/:id', ({ params, body, user }) => {
    const c = db.prepare('SELECT * FROM service_calls WHERE id = ?').get(params.id);
    if (!c || (c.client_id !== user.id && c.provider_id !== user.id)) fail(404, 'Chamado não encontrado.');
    if (!CALL_STATUS.includes(body.status)) fail(400, 'Status inválido.');
    if (['Concluído', 'Recusado', 'Cancelado'].includes(c.status)) fail(409, `Este chamado já está ${c.status.toLowerCase()}.`);
    if (c.client_id === user.id && body.status !== 'Cancelado') fail(403, 'Só o prestador muda esse status.');
    // Verificação facial: o prestador confirma o rosto para aceitar e para finalizar cada serviço.
    if (c.provider_id === user.id && c.status === 'Solicitado' && body.status === 'Aceito') biometria.consume(user.id, 'aceite', c.id);
    if (c.provider_id === user.id && body.status === 'Concluído') biometria.consume(user.id, 'finalizacao', c.id);
    tx(db, () => {
      if (['Recusado', 'Cancelado'].includes(body.status)) devolverVisita(c, body.status === 'Recusado' ? 'o prestador recusou' : 'chamado cancelado');
      db.prepare('UPDATE service_calls SET status = ?, updated_at = ? WHERE id = ?').run(body.status, now(), c.id);
    });
    const call = callView(db.prepare('SELECT * FROM service_calls WHERE id = ?').get(c.id));
    hub.send(user.id === c.client_id ? c.provider_id : c.client_id, 'call', call);
    return call;
  });

  // Pagar o serviço pelo Realyz: sai do cliente (presentes primeiro) e entra no saldo do prestador.
  r.post('/calls/:id/pay', ({ params, body, user }) => {
    const c = db.prepare('SELECT * FROM service_calls WHERE id = ? AND client_id = ?').get(params.id, user.id);
    if (!c) fail(404, 'Chamado não encontrado.');
    if (['Recusado', 'Cancelado'].includes(c.status)) fail(409, 'Esse chamado foi cancelado.');
    const amount = money(body.amount, 'pagamento', { min: 1, max: 50000 });
    const provider = userById(c.provider_id);
    // Corrida e entrega: o Realyz fica com a parte dele (18%). Nos outros serviços o valor combinado vai inteiro ao prestador
    // (o Realyz já recebeu pela taxa de visita).
    const fee = TRANSPORT.includes(c.service) ? Math.round((amount * cfg.rideFeePct) / 100) : 0;
    const paid = tx(db, () => {
      const r2 = wallet.pay(user.id, amount, 'Serviços', `${c.service} com ${publicName(provider.name)}`, c.id);
      wallet.move(provider.id, 'saldo', amount - fee, 'Serviços', `Serviço para ${user.name}`, c.id);
      if (fee) {
        wallet.move('realys', 'saldo', fee, 'Comissão', `Comissão da corrida ${c.id}`, c.id);
        fiscal.registrar({ origem: 'comissao_corrida', ref: c.id, tomadorId: provider.id, valorCents: fee });
        db.prepare('UPDATE service_calls SET ride_fee = ride_fee + ? WHERE id = ?').run(fee, c.id);
      }
      return r2;
    });
    hub.send(provider.id, 'payment', { callId: c.id, amount: toReais(amount - fee), from: user.name });
    return { amount: toReais(amount), fee: toReais(fee), fromGift: toReais(paid.fromGift), fromWallet: toReais(paid.fromWallet) };
  });

  // ── Avaliações: depois de pedido entregue ou serviço concluído ──
  r.post('/ratings', ({ body, user }) => {
    const kind = body.targetKind === 'call' ? 'call' : 'order';
    const id = String(body.targetId || '');
    const stars = int(body.stars, 'nota', { min: 1, max: 5 });
    if (kind === 'order') {
      const o = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(id, user.id);
      if (!o) fail(404, 'Pedido não encontrado.');
      if (o.status !== 'Entregue') fail(409, 'Você poderá avaliar quando o pedido for entregue.');
    } else {
      const c = db.prepare('SELECT * FROM service_calls WHERE id = ? AND client_id = ?').get(id, user.id);
      if (!c) fail(404, 'Chamado não encontrado.');
      if (c.status !== 'Concluído') fail(409, 'Você poderá avaliar quando o serviço for concluído.');
    }
    tx(db, () => {
      db.prepare('INSERT INTO ratings (id, from_id, target_kind, target_id, stars, comment, created_at) VALUES (?,?,?,?,?,?,?)').run(newId('av'), user.id, kind, id, stars, str(body.comment, 'o comentário', { optional: true, max: 500 }), now());
      if (kind === 'call') {
        const c = db.prepare('SELECT provider_id FROM service_calls WHERE id = ?').get(id);
        const p = db.prepare('SELECT rating, rating_count FROM providers WHERE user_id = ?').get(c.provider_id);
        const n = p.rating_count + 1;
        db.prepare('UPDATE providers SET rating = ?, rating_count = ? WHERE user_id = ?').run((p.rating * p.rating_count + stars) / n, n, c.provider_id);
      }
    });
    return { ok: true };
  }, { status: 201 });
}
