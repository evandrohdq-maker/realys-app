// Prestadores de serviço (eletricista, motorista, motoboy, hotelaria...), chamados e avaliações.
// O prestador liga o GPS e fica disponível; o cliente vê os mais próximos com nota, o que faz e
// quanto cobra, escolhe, chama ou agenda e acompanha o prestador chegando.
import { fail, newId, now, str, money, int, coord, toReais } from '../http.js';
import { tx } from '../db.js';

const CALL_STATUS = ['Solicitado', 'Aceito', 'A caminho', 'Chegou', 'Concluído', 'Recusado', 'Cancelado'];
const TRANSPORT = ['motorista', 'motoboy', 'frete', 'carro', 'moto', 'van'];

// Distância em km entre dois pontos (fórmula de haversine).
export function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export default function servicesRoutes(r, { db, wallet, hub, userById, biometria }) {
  const providerView = (p, from) => {
    const u = userById(p.user_id);
    const km = from && p.lat != null ? distanceKm(from.lat, from.lng, p.lat, p.lng) : null;
    return {
      id: p.user_id, name: u.name, photo: u.photo, service: p.service, functions: JSON.parse(p.functions), price: toReais(p.price), priceUnit: p.price_unit,
      available: !!p.available, vehicle: p.vehicle, rating: +p.rating.toFixed(1), ratingCount: p.rating_count,
      distanceKm: km == null ? null : +km.toFixed(1), etaMin: km == null ? null : Math.max(3, Math.round(km * (TRANSPORT.includes(p.service) ? 4 : 6))),
    };
  };

  // Cadastro do prestador: funções e valores, que a Lotus repassa ao cliente.
  r.put('/providers/me', ({ body, user }) => {
    const functions = Array.isArray(body.functions) ? body.functions.map((f) => String(f).trim().slice(0, 60)).filter(Boolean).slice(0, 15) : [];
    if (!functions.length) fail(400, 'Informe pelo menos uma função (o que você faz).');
    const row = {
      service: str(body.service, 'o tipo de serviço', { max: 40 }).toLowerCase(), functions: JSON.stringify(functions), price: money(body.price, 'preço'),
      price_unit: str(body.priceUnit, 'a unidade do preço (hora, visita, corrida...)', { max: 30 }), vehicle: str(body.vehicle, 'o veículo', { optional: true, max: 80 }) || null,
    };
    tx(db, () => {
      if (db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(user.id)) {
        db.prepare('UPDATE providers SET service = ?, functions = ?, price = ?, price_unit = ?, vehicle = ?, updated_at = ? WHERE user_id = ?').run(row.service, row.functions, row.price, row.price_unit, row.vehicle, now(), user.id);
      } else {
        db.prepare('INSERT INTO providers (user_id, service, functions, price, price_unit, vehicle, updated_at) VALUES (?,?,?,?,?,?,?)').run(user.id, row.service, row.functions, row.price, row.price_unit, row.vehicle, now());
        const roles = JSON.parse(user.roles);
        if (!roles.includes('prestador')) db.prepare('UPDATE users SET roles = ? WHERE id = ?').run(JSON.stringify([...roles, 'prestador']), user.id);
      }
    });
    return providerView(db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id));
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
    return { ok: true };
  });

  // Os mais próximos de um tipo de serviço, com nota, funções, preço e tempo para chegar.
  r.get('/providers/nearby', ({ query }) => {
    const from = { lat: coord(query.lat, 'latitude'), lng: coord(query.lng, 'longitude') };
    const max = Math.min(20, Number(query.max || 5));
    const fresh = now() - 15 * 60 * 1000; // posição atualizada nos últimos 15 minutos
    const rows = db.prepare(`SELECT p.* FROM providers p JOIN users u ON u.id = p.user_id WHERE p.available = 1 AND p.lat IS NOT NULL AND p.updated_at > ? AND u.status = 'ativo' ${query.service ? 'AND p.service = ?' : ''}`)
      .all(...(query.service ? [fresh, String(query.service).toLowerCase()] : [fresh]));
    return rows.map((p) => providerView(p, from)).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, max);
  });

  r.get('/providers/:id', ({ params }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(params.id);
    if (!p) fail(404, 'Prestador não encontrado.');
    return providerView(p);
  }, { auth: false });

  // ── Chamados ──
  const callView = (c) => ({ id: c.id, clientId: c.client_id, client: userById(c.client_id).name, providerId: c.provider_id, provider: userById(c.provider_id).name, service: c.service, address: c.address, when: c.when_text, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at });

  // O cliente chama agora ou agenda ("amanhã às 9h"). Só depois que confirmou no app.
  r.post('/calls', ({ body, user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(String(body.providerId || ''));
    if (!p) fail(404, 'Prestador não encontrado.');
    if (p.user_id === user.id) fail(400, 'Você não pode chamar a si mesmo.');
    const when = str(body.when, 'o horário', { optional: true, max: 60 }) || null;
    if (!when && !p.available) fail(409, 'Esse prestador não está disponível agora. Você pode agendar.');
    const id = newId('ch');
    const t = now();
    db.prepare('INSERT INTO service_calls (id, client_id, provider_id, service, address, when_text, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      id, user.id, p.user_id, p.service, str(body.address, 'o endereço', { optional: true, max: 200 }), when, 'Solicitado', t, t
    );
    const call = callView(db.prepare('SELECT * FROM service_calls WHERE id = ?').get(id));
    hub.send(p.user_id, 'call', call);
    return call;
  }, { status: 201 });

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
    db.prepare('UPDATE service_calls SET status = ?, updated_at = ? WHERE id = ?').run(body.status, now(), c.id);
    const call = callView(db.prepare('SELECT * FROM service_calls WHERE id = ?').get(c.id));
    hub.send(user.id === c.client_id ? c.provider_id : c.client_id, 'call', call);
    return call;
  });

  // Pagar o serviço pelo Re@lys: sai do cliente (presentes primeiro) e entra no saldo do prestador.
  r.post('/calls/:id/pay', ({ params, body, user }) => {
    const c = db.prepare('SELECT * FROM service_calls WHERE id = ? AND client_id = ?').get(params.id, user.id);
    if (!c) fail(404, 'Chamado não encontrado.');
    if (['Recusado', 'Cancelado'].includes(c.status)) fail(409, 'Esse chamado foi cancelado.');
    const amount = money(body.amount, 'pagamento', { min: 1, max: 50000 });
    const provider = userById(c.provider_id);
    const paid = tx(db, () => {
      const r2 = wallet.pay(user.id, amount, 'Serviços', `${c.service} com ${provider.name}`, c.id);
      wallet.move(provider.id, 'saldo', amount, 'Serviços', `Serviço para ${user.name}`, c.id);
      return r2;
    });
    hub.send(provider.id, 'payment', { callId: c.id, amount: toReais(amount), from: user.name });
    return { amount: toReais(amount), fromGift: toReais(paid.fromGift), fromWallet: toReais(paid.fromWallet) };
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
