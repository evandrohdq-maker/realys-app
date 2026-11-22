// Logística do Realyz:
//  1) Central de entregas: a loja chama o entregador para um pedido; o Realyz oferece aos
//     entregadores disponíveis mais perto (notificação, mesmo com o app fechado no horário de
//     trabalho). O primeiro que aceita leva. Quem já está levando uma entrega para o mesmo lado
//     recebe a oferta de "rota inteligente" (taxa de 25% em vez de 18%). O cliente recebe um código
//     de 4 números e só passa para o entregador quando recebe: aí o dinheiro é liberado.
//  2) Cargas (Shop, volumes grandes): a loja publica a carga com o valor que paga; transportadoras
//     (frete, van, caminhão) aceitam ou mandam proposta; a loja escolhe.
//  3) Ofertas de fornecedores: a empresa fornecedora publica uma oferta (produto, preço, mínimo,
//     para que tipo de negócio); restaurantes, mercados... perto recebem e fazem o pedido.
// O valor da entrega fica retido no Realyz desde o pedido e só vai para quem entregou no fim.
import { fail, newId, now, str, money, oneOf, toReais, toCents } from '../http.js';
import { tx } from '../db.js';
import { combinar, km, TAXA_ROTA_PCT } from '../rota.js';

export const VEICULOS = {
  moto: { label: 'Moto', servicos: ['motoboy', 'moto', 'entregador'], mult: 1 },
  carro: { label: 'Carro', servicos: ['motorista', 'carro', 'entregador'], mult: 1.5 },
  van: { label: 'Van / utilitário', servicos: ['van', 'frete', 'transportadora'], mult: 2.5 },
  caminhao: { label: 'Caminhão', servicos: ['frete', 'transportadora', 'caminhao'], mult: 4 },
};
// Moto: R$ 8 até 3 km + R$ 2 por km (mesma tabela do app, src/pricing.js).
export const precoEntrega = (kmTotal, veiculo = 'moto') => {
  const v = VEICULOS[veiculo] || VEICULOS.moto;
  return Math.round((8 + Math.max(0, kmTotal - 3) * 2) * v.mult * 100);
};
export const FORNECEDOR_TAXA_PCT = 5;
export const CARGA_TAXA_PCT = 10;
const SEGMENTOS = {
  alimentacao: /(restaurante|lanchonete|pizzaria|bar\b|padaria|comida|sushi|hamburg|cafe|caf[eé]|confeitaria|food|churrascaria|buffet|pastelaria|sorveteria|a[cç]a[ií])/i,
  mercado: /(mercado|mercearia|atacad|varejo|emp[oó]rio|hortifruti|a[cç]ougue)/i,
  beleza: /(sal[aã]o|barbearia|est[eé]tica|beleza|manicure)/i,
};
const DIA = 24 * 60 * 60 * 1000;
const codigo4 = () => String(Math.floor(1000 + Math.random() * 9000));
const pt = (lat, lng) => (lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null);

export default function logisticaRoutes(r, { db, cfg, hub, wallet, userById, biometria, fiscal }) {
  const TRANSPORTE = [...new Set(Object.values(VEICULOS).flatMap((v) => v.servicos))];
  const entregaView = (e, { para } = {}) => ({
    id: e.id,
    tipo: e.tipo,
    orderId: e.order_id,
    loja: (userById(e.loja_id) || {}).name || '',
    coleta: e.coleta,
    destino: e.destino,
    coletaGeo: pt(e.col_lat, e.col_lng),
    destinoGeo: pt(e.des_lat, e.des_lng),
    veiculo: e.veiculo,
    descricao: e.descricao,
    km: e.km,
    valor: toReais(e.valor),
    taxaPct: e.taxa_pct,
    entregadorRecebe: toReais(e.valor - Math.round((e.valor * e.taxa_pct) / 100)),
    status: e.status,
    entregador: e.entregador_id ? (userById(e.entregador_id) || {}).name : null,
    rotaCom: e.rota_com,
    // O código só aparece para o cliente (e para a loja, que pode passar para o cliente).
    ...(para === 'cliente' || para === 'loja' ? { codigo: e.codigo } : {}),
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  });

  // Entregadores disponíveis (ligados com GPS recente, ou no horário de trabalho) perto da coleta.
  const disponiveisPerto = (e, raioKm = 8) => {
    const servicos = (VEICULOS[e.veiculo] || VEICULOS.moto).servicos;
    const fresco = now() - 15 * 60 * 1000;
    const dia = now() - DIA;
    return db
      .prepare(`SELECT p.* FROM providers p JOIN users u ON u.id = p.user_id WHERE u.status = 'ativo' AND p.lat IS NOT NULL AND p.user_id != ? AND p.service IN (${servicos.map(() => '?').join(',')}) AND ((p.available = 1 AND p.updated_at > ?) OR (p.auto_horario = 1 AND p.updated_at > ?))`)
      .all(e.loja_id, ...servicos, fresco, dia)
      .filter((p) => {
        if (!(p.available === 1 && p.updated_at > fresco)) {
          // No horário programado (mesma regra de /providers/nearby).
          try {
            const h = JSON.parse(p.horario || 'null');
            const { emHorario } = servicosHorario;
            if (!emHorario(h)) return false;
          } catch (err) {
            return false;
          }
        }
        if (!biometria.periodicOk(p.user_id)) return false;
        return e.col_lat == null || km({ lat: p.lat, lng: p.lng }, { lat: e.col_lat, lng: e.col_lng }) <= raioKm;
      });
  };

  // Rota inteligente: entregadores que já levam algo para o mesmo lado.
  const rotaPara = (e) => {
    if (e.col_lat == null || e.des_lat == null) return [];
    return db
      .prepare(`SELECT * FROM entregas WHERE status IN ('aceita','coletada') AND entregador_id IS NOT NULL AND veiculo = ? AND id != ?`)
      .all(e.veiculo, e.id)
      .map((a) => ({ a, m: combinar(pt(a.col_lat, a.col_lng), pt(a.des_lat, a.des_lng), pt(e.col_lat, e.col_lng), pt(e.des_lat, e.des_lng)) }))
      .filter((x) => x.m);
  };

  const oferecer = (e) => {
    const rota = rotaPara(e);
    const naRota = new Set();
    rota.forEach(({ a, m }) => {
      naRota.add(a.entregador_id);
      hub.send(a.entregador_id, 'entrega_rota', { id: e.id, loja: (userById(e.loja_id) || {}).name, economiaKm: m.economiaKm, valor: toReais(e.valor), recebe: toReais(e.valor - Math.round((e.valor * TAXA_ROTA_PCT) / 100)), junto: a.id });
    });
    disponiveisPerto(e)
      .filter((p) => !naRota.has(p.user_id))
      .slice(0, 15)
      .forEach((p) => hub.send(p.user_id, 'entrega_oferta', { id: e.id, loja: (userById(e.loja_id) || {}).name, valor: toReais(e.valor), km: e.km, veiculo: e.veiculo }));
  };

  // ---------- 1) Entrega de um pedido ----------
  r.post('/entregas/pedido/:orderId', ({ params, body, user }) => {
    const o = db.prepare('SELECT o.*, c.owner_id, c.name AS loja_nome, c.address AS loja_end, c.lat AS c_lat, c.lng AS c_lng FROM orders o JOIN companies c ON c.id = o.company_id WHERE o.id = ?').get(params.orderId);
    if (!o || o.owner_id !== user.id) fail(404, 'Pedido não encontrado na sua loja.');
    if (['Cancelado', 'Entregue'].includes(o.status)) fail(409, `Este pedido já está ${o.status.toLowerCase()}.`);
    if (db.prepare(`SELECT 1 FROM entregas WHERE order_id = ? AND status != 'cancelada'`).get(o.id)) fail(409, 'Já tem entregador chamado para este pedido.');
    const veiculo = oneOf(body.veiculo || 'moto', 'o veículo', ['moto', 'carro']);
    const col = { lat: body.coletaLat != null ? Number(body.coletaLat) : o.c_lat, lng: body.coletaLng != null ? Number(body.coletaLng) : o.c_lng };
    const des = { lat: o.dest_lat, lng: o.dest_lng };
    const dist = col.lat != null && des.lat != null ? km(col, des) : 3;
    const valor = precoEntrega(dist, veiculo);
    const id = newId('en');
    const t = now();
    tx(db, () => {
      // A loja paga a entrega; o valor fica retido no Realyz até a entrega ser confirmada.
      wallet.move(user.id, 'saldo', -valor, 'Entregas', `Entrega do pedido ${o.id} (retida até entregar)`, id);
      wallet.move('realys', 'saldo', valor, 'Entregas retidas', `Entrega ${id} retida`, id);
      db.prepare(
        `INSERT INTO entregas (id, tipo, order_id, loja_id, cliente_id, coleta, destino, col_lat, col_lng, des_lat, des_lng, veiculo, km, valor, taxa_pct, codigo, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(id, 'pedido', o.id, user.id, o.buyer_id, o.loja_end || o.loja_nome, o.address || 'Endereço do cliente', col.lat, col.lng, des.lat, des.lng, veiculo, Math.round(dist * 10) / 10, valor, cfg.rideFeePct, codigo4(), 'aberta', t, t);
    });
    const e = db.prepare('SELECT * FROM entregas WHERE id = ?').get(id);
    oferecer(e);
    hub.send(o.buyer_id, 'entrega', { id, orderId: o.id, status: 'procurando', codigo: e.codigo });
    return entregaView(e, { para: 'loja' });
  }, { status: 201 });

  // Entregador: ofertas abertas perto de mim (as de rota inteligente primeiro).
  r.get('/entregas/ofertas', ({ user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
    if (!p || !TRANSPORTE.includes(p.service)) return [];
    const ativas = db.prepare(`SELECT * FROM entregas WHERE entregador_id = ? AND status IN ('aceita','coletada')`).all(user.id);
    return db
      .prepare(`SELECT * FROM entregas WHERE status = 'aberta' AND loja_id != ? ORDER BY created_at DESC LIMIT 100`)
      .all(user.id)
      .filter((e) => (VEICULOS[e.veiculo] || VEICULOS.moto).servicos.includes(p.service))
      .map((e) => {
        const rota = ativas.map((a) => ({ a, m: combinar(pt(a.col_lat, a.col_lng), pt(a.des_lat, a.des_lng), pt(e.col_lat, e.col_lng), pt(e.des_lat, e.des_lng)) })).find((x) => x.m);
        const dist = p.lat != null && e.col_lat != null ? km({ lat: p.lat, lng: p.lng }, { lat: e.col_lat, lng: e.col_lng }) : null;
        const pct = rota ? TAXA_ROTA_PCT : e.taxa_pct;
        return {
          ...entregaView(e),
          ateColetaKm: dist == null ? null : Math.round(dist * 10) / 10,
          rota: rota ? { junto: rota.a.id, economiaKm: rota.m.economiaKm, desvioKm: rota.m.desvioKm, taxaPct: TAXA_ROTA_PCT } : null,
          entregadorRecebe: toReais(e.valor - Math.round((e.valor * pct) / 100)),
        };
      })
      .filter((x) => x.rota || x.ateColetaKm == null || x.ateColetaKm <= 10)
      .sort((a, b) => (b.rota ? 1 : 0) - (a.rota ? 1 : 0) || (a.ateColetaKm || 0) - (b.ateColetaKm || 0));
  });

  r.post('/entregas/:id/aceitar', ({ params, user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
    const e = db.prepare('SELECT * FROM entregas WHERE id = ?').get(params.id);
    if (!e) fail(404, 'Entrega não encontrada.');
    if (!p || !(VEICULOS[e.veiculo] || VEICULOS.moto).servicos.includes(p.service)) fail(403, 'Essa entrega é para outro tipo de veículo.');
    if (e.tipo === 'carga') fail(400, 'Carga: mande sua proposta ou aceite pelo valor da loja.');
    if (!biometria.periodicOk(user.id)) fail(403, 'Confirme seu rosto para continuar disponível. Isso é feito a cada 6 horas.', 'verificacao_periodica');
    // Rota inteligente: já leva uma entrega para o mesmo lado → taxa de rota.
    const ativa = db.prepare(`SELECT * FROM entregas WHERE entregador_id = ? AND status IN ('aceita','coletada')`).all(user.id).find((a) => combinar(pt(a.col_lat, a.col_lng), pt(a.des_lat, a.des_lng), pt(e.col_lat, e.col_lng), pt(e.des_lat, e.des_lng)));
    const taxa = ativa ? TAXA_ROTA_PCT : e.taxa_pct;
    const ch = db.prepare(`UPDATE entregas SET status = 'aceita', entregador_id = ?, taxa_pct = ?, rota_com = ?, updated_at = ? WHERE id = ? AND status = 'aberta'`).run(user.id, taxa, ativa ? ativa.id : null, now(), e.id);
    if (!ch.changes) fail(409, 'Outro entregador já pegou essa entrega.');
    if (e.order_id) db.prepare(`UPDATE orders SET status = 'A caminho', updated_at = ? WHERE id = ? AND status IN ('Recebido','Preparando')`).run(now(), e.order_id);
    hub.send(e.loja_id, 'entrega', { id: e.id, orderId: e.order_id, status: 'aceita', entregador: user.name });
    if (e.cliente_id) hub.send(e.cliente_id, 'entrega', { id: e.id, orderId: e.order_id, status: 'aceita', entregador: user.name });
    return entregaView(db.prepare('SELECT * FROM entregas WHERE id = ?').get(e.id));
  });

  r.post('/entregas/:id/coletada', ({ params, user }) => {
    const e = db.prepare(`SELECT * FROM entregas WHERE id = ? AND entregador_id = ? AND status = 'aceita'`).get(params.id, user.id);
    if (!e) fail(404, 'Entrega não encontrada.');
    db.prepare(`UPDATE entregas SET status = 'coletada', updated_at = ? WHERE id = ?`).run(now(), e.id);
    [e.loja_id, e.cliente_id].filter(Boolean).forEach((u) => hub.send(u, 'entrega', { id: e.id, orderId: e.order_id, status: 'coletada' }));
    return { ok: true };
  });

  // Entregou: o entregador digita o código que o cliente passa. Só então o dinheiro é liberado.
  r.post('/entregas/:id/entregue', ({ params, body, user }) => {
    const e = db.prepare(`SELECT * FROM entregas WHERE id = ? AND entregador_id = ? AND status IN ('aceita','coletada')`).get(params.id, user.id);
    if (!e) fail(404, 'Entrega não encontrada.');
    if (String((body && body.codigo) || '').trim() !== e.codigo) fail(400, 'Código errado. Peça o código de 4 números para quem recebeu.', 'codigo');
    const taxa = Math.round((e.valor * e.taxa_pct) / 100);
    tx(db, () => {
      wallet.move('realys', 'saldo', -(e.valor - taxa), 'Entregas retidas', `Entrega ${e.id} paga ao entregador`, e.id);
      wallet.move(user.id, 'saldo', e.valor - taxa, 'Entregas', `${e.tipo === 'carga' ? 'Frete' : 'Entrega'} ${e.id}${e.rota_com ? ' (rota inteligente)' : ''}`, e.id);
      db.prepare(`UPDATE entregas SET status = 'entregue', updated_at = ? WHERE id = ?`).run(now(), e.id);
      if (e.order_id) db.prepare(`UPDATE orders SET status = 'Entregue', updated_at = ? WHERE id = ? AND status != 'Cancelado'`).run(now(), e.order_id);
    });
    if (taxa) fiscal.registrar({ origem: 'comissao_corrida', ref: e.id, tomadorId: user.id, valorCents: taxa, descricao: `Intermediação de entrega no Realyz (${e.id})` });
    [e.loja_id, e.cliente_id].filter(Boolean).forEach((u) => hub.send(u, 'entrega', { id: e.id, orderId: e.order_id, status: 'entregue' }));
    return { ok: true, recebeu: toReais(e.valor - taxa), taxa: toReais(taxa) };
  });

  // A loja cancela enquanto ninguém aceitou: o valor volta para ela.
  r.post('/entregas/:id/cancelar', ({ params, user }) => {
    const e = db.prepare(`SELECT * FROM entregas WHERE id = ? AND loja_id = ? AND status = 'aberta'`).get(params.id, user.id);
    if (!e) fail(409, 'Só dá para cancelar antes de alguém aceitar.');
    tx(db, () => {
      wallet.move('realys', 'saldo', -e.valor, 'Entregas retidas', `Entrega ${e.id} cancelada`, e.id);
      wallet.move(user.id, 'saldo', e.valor, 'Entregas', `Entrega ${e.id} cancelada (valor devolvido)`, e.id);
      db.prepare(`UPDATE entregas SET status = 'cancelada', updated_at = ? WHERE id = ?`).run(now(), e.id);
    });
    return { ok: true };
  });

  // Minhas entregas: como entregador, como loja e como cliente (com o código).
  r.get('/entregas/minhas', ({ user }) => ({
    levando: db.prepare(`SELECT * FROM entregas WHERE entregador_id = ? ORDER BY updated_at DESC LIMIT 50`).all(user.id).map((e) => entregaView(e)),
    loja: db.prepare(`SELECT * FROM entregas WHERE loja_id = ? ORDER BY created_at DESC LIMIT 50`).all(user.id).map((e) => ({ ...entregaView(e, { para: 'loja' }), propostas: e.tipo === 'carga' ? propostasDe(e.id) : undefined })),
    recebendo: db.prepare(`SELECT * FROM entregas WHERE cliente_id = ? AND status != 'cancelada' ORDER BY created_at DESC LIMIT 20`).all(user.id).map((e) => entregaView(e, { para: 'cliente' })),
  }));

  // ---------- 2) Cargas para transportadoras ----------
  const propostasDe = (id) =>
    db.prepare('SELECT * FROM entrega_propostas WHERE entrega_id = ? ORDER BY valor').all(id).map((p) => ({ id: p.id, transportador: (userById(p.transportador_id) || {}).name, valor: toReais(p.valor), prazo: p.prazo, status: p.status }));

  r.post('/cargas', ({ body, user }) => {
    if (!db.prepare('SELECT 1 FROM companies WHERE owner_id = ?').get(user.id)) fail(403, 'Publicar carga é para empresas.');
    const veiculo = oneOf(body.veiculo || 'van', 'o veículo', ['carro', 'van', 'caminhao']);
    const valor = money(body.valor, 'o valor do frete', { min: 20 });
    const col = pt(body.coletaLat, body.coletaLng) || {};
    const des = pt(body.destinoLat, body.destinoLng) || {};
    const id = newId('en');
    const t = now();
    tx(db, () => {
      wallet.move(user.id, 'saldo', -valor, 'Fretes', `Frete ${id} (retido até entregar)`, id);
      wallet.move('realys', 'saldo', valor, 'Entregas retidas', `Frete ${id} retido`, id);
      db.prepare(
        `INSERT INTO entregas (id, tipo, loja_id, cliente_id, coleta, destino, col_lat, col_lng, des_lat, des_lng, veiculo, descricao, km, valor, taxa_pct, codigo, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(id, 'carga', user.id, null, str(body.coleta, 'o endereço de coleta', { max: 200 }), str(body.destino, 'o destino', { max: 200 }), col.lat ?? null, col.lng ?? null, des.lat ?? null, des.lng ?? null, veiculo, str(body.descricao, 'o que vai (peso, volumes)', { max: 500 }), col.lat != null && des.lat != null ? Math.round(km(col, des) * 10) / 10 : null, valor, CARGA_TAXA_PCT, codigo4(), 'aberta', t, t);
    });
    const e = db.prepare('SELECT * FROM entregas WHERE id = ?').get(id);
    disponiveisPerto(e, 50).slice(0, 30).forEach((p) => hub.send(p.user_id, 'carga_oferta', { id, loja: user.name, valor: toReais(valor), veiculo }));
    return entregaView(e, { para: 'loja' });
  }, { status: 201 });

  // Transportadora: cargas abertas para o meu veículo.
  r.get('/cargas', ({ user }) => {
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
    if (!p) return [];
    return db
      .prepare(`SELECT * FROM entregas WHERE tipo = 'carga' AND status = 'aberta' AND loja_id != ? ORDER BY created_at DESC LIMIT 100`)
      .all(user.id)
      .filter((e) => VEICULOS[e.veiculo].servicos.includes(p.service))
      .map((e) => ({ ...entregaView(e), minhaProposta: (db.prepare('SELECT valor, status FROM entrega_propostas WHERE entrega_id = ? AND transportador_id = ?').get(e.id, user.id) || null) }));
  });

  // Aceitar pelo valor da loja ou mandar uma proposta (valor e prazo).
  r.post('/cargas/:id/proposta', ({ params, body, user }) => {
    const e = db.prepare(`SELECT * FROM entregas WHERE id = ? AND tipo = 'carga' AND status = 'aberta'`).get(params.id);
    if (!e) fail(404, 'Carga não encontrada ou já fechada.');
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
    if (!p || !VEICULOS[e.veiculo].servicos.includes(p.service)) fail(403, 'Essa carga é para outro tipo de veículo.');
    const valor = body.valor != null ? money(body.valor, 'o valor', { min: 20 }) : e.valor;
    db.prepare(`INSERT INTO entrega_propostas (id, entrega_id, transportador_id, valor, prazo, status, created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(entrega_id, transportador_id) DO UPDATE SET valor = excluded.valor, prazo = excluded.prazo, status = 'enviada'`).run(newId('pp'), e.id, user.id, valor, str(body.prazo, 'o prazo', { optional: true, max: 80 }) || '', 'enviada', now());
    hub.send(e.loja_id, 'carga_proposta', { id: e.id, transportador: user.name, valor: toReais(valor) });
    return { ok: true, propostas: propostasDe(e.id).length };
  });

  // A loja escolhe a proposta: acerta a diferença do valor retido e a carga vai para a transportadora.
  r.post('/cargas/:id/escolher', ({ params, body, user }) => {
    const e = db.prepare(`SELECT * FROM entregas WHERE id = ? AND loja_id = ? AND tipo = 'carga' AND status = 'aberta'`).get(params.id, user.id);
    if (!e) fail(404, 'Carga não encontrada.');
    const p = db.prepare(`SELECT * FROM entrega_propostas WHERE id = ? AND entrega_id = ?`).get(String(body.propostaId), e.id);
    if (!p) fail(404, 'Proposta não encontrada.');
    const dif = p.valor - e.valor;
    tx(db, () => {
      if (dif > 0) {
        wallet.move(user.id, 'saldo', -dif, 'Fretes', `Diferença da proposta do frete ${e.id}`, e.id);
        wallet.move('realys', 'saldo', dif, 'Entregas retidas', `Diferença do frete ${e.id}`, e.id);
      } else if (dif < 0) {
        wallet.move('realys', 'saldo', dif, 'Entregas retidas', `Frete ${e.id} mais barato`, e.id);
        wallet.move(user.id, 'saldo', -dif, 'Fretes', `Frete ${e.id} saiu mais barato (devolvido)`, e.id);
      }
      db.prepare(`UPDATE entregas SET status = 'aceita', entregador_id = ?, valor = ?, updated_at = ? WHERE id = ?`).run(p.transportador_id, p.valor, now(), e.id);
      db.prepare(`UPDATE entrega_propostas SET status = CASE WHEN id = ? THEN 'escolhida' ELSE 'recusada' END WHERE entrega_id = ?`).run(p.id, e.id);
    });
    hub.send(p.transportador_id, 'carga_escolhida', { id: e.id, loja: user.name, valor: toReais(p.valor) });
    return entregaView(db.prepare('SELECT * FROM entregas WHERE id = ?').get(e.id), { para: 'loja' });
  });

  // ---------- 3) Ofertas de fornecedores ----------
  const ofertaView = (o, perto) => {
    const d = JSON.parse(o.dados);
    const f = db.prepare('SELECT name, segment FROM companies WHERE owner_id = ?').get(o.fornecedor_id) || {};
    return { id: o.id, ...d, preco: d.preco, fornecedor: f.name || (userById(o.fornecedor_id) || {}).name, fornecedorId: o.fornecedor_id, status: o.status, validade: o.validade, createdAt: o.created_at, distKm: perto };
  };
  const minhaEmpresa = (u) => db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(u.id);

  r.post('/ofertas-fornecedor', ({ body, user }) => {
    const c = minhaEmpresa(user);
    if (!c) fail(403, 'Ofertas de fornecedor são para empresas com CNPJ.');
    const segmentos = (Array.isArray(body.segmentos) ? body.segmentos : ['alimentacao']).filter((s) => SEGMENTOS[s] || s === 'todos');
    if (!segmentos.length) fail(400, 'Escolha para que tipo de negócio é a oferta.');
    const dados = {
      produto: str(body.produto, 'o produto', { min: 2, max: 100 }),
      descricao: str(body.descricao, 'a descrição', { optional: true, max: 600 }) || '',
      preco: toReais(money(body.preco, 'o preço')),
      unidade: str(body.unidade || 'un', 'a unidade', { max: 20 }),
      minimo: Math.max(1, Number(body.minimo) || 1),
      segmentos,
      raioKm: Math.max(1, Math.min(300, Number(body.raioKm) || 30)),
      entrega: oneOf(body.entrega || 'fornecedor', 'a entrega', ['fornecedor', 'retirada', 'central']),
      foto: typeof body.foto === 'string' && /^(https?:\/\/[^\s]+)?\/media\/[A-Za-z0-9_-]+$/.test(body.foto) ? body.foto.replace(/^https?:\/\/[^/]+/, '') : null,
    };
    const dias = Math.max(1, Math.min(60, Number(body.validadeDias) || 7));
    const id = newId('of');
    db.prepare('INSERT INTO ofertas_fornecedor (id, fornecedor_id, dados, lat, lng, status, validade, created_at) VALUES (?,?,?,?,?,?,?,?)').run(id, user.id, JSON.stringify(dados), c.lat, c.lng, 'ativa', now() + dias * DIA, now());
    // Avisa as empresas do segmento perto (no máximo 1 aviso de oferta por dia para cada uma).
    let avisadas = 0;
    db.prepare('SELECT * FROM companies WHERE owner_id != ?').all(user.id).forEach((emp) => {
      const combina = segmentos.includes('todos') || segmentos.some((s) => SEGMENTOS[s].test(emp.segment || ''));
      const longe = c.lat != null && emp.lat != null && km({ lat: c.lat, lng: c.lng }, { lat: emp.lat, lng: emp.lng }) > dados.raioKm;
      if (!combina || longe) return;
      const a = db.prepare('SELECT ultimo_at FROM avisos_oferta WHERE user_id = ?').get(emp.owner_id);
      if (a && now() - a.ultimo_at < DIA) return;
      db.prepare('INSERT INTO avisos_oferta (user_id, ultimo_at) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET ultimo_at = excluded.ultimo_at').run(emp.owner_id, now());
      hub.send(emp.owner_id, 'oferta_fornecedor', { id, fornecedor: c.name, produto: dados.produto, preco: dados.preco, unidade: dados.unidade });
      avisadas += 1;
    });
    return { ...ofertaView(db.prepare('SELECT * FROM ofertas_fornecedor WHERE id = ?').get(id)), avisadas };
  }, { status: 201 });

  // Empresa compradora: ofertas para o meu tipo de negócio, perto.
  r.get('/ofertas-fornecedor', ({ user }) => {
    const c = minhaEmpresa(user);
    return db
      .prepare(`SELECT * FROM ofertas_fornecedor WHERE status = 'ativa' AND validade > ? AND fornecedor_id != ? ORDER BY created_at DESC LIMIT 200`)
      .all(now(), user.id)
      .map((o) => {
        const d = JSON.parse(o.dados);
        const dist = c && c.lat != null && o.lat != null ? km({ lat: c.lat, lng: c.lng }, { lat: o.lat, lng: o.lng }) : null;
        const combina = !c || d.segmentos.includes('todos') || d.segmentos.some((s) => SEGMENTOS[s] && SEGMENTOS[s].test(c.segment || ''));
        return { o, dist, combina, d };
      })
      .filter((x) => x.combina && (x.dist == null || x.dist <= x.d.raioKm))
      .map((x) => ofertaView(x.o, x.dist == null ? null : Math.round(x.dist * 10) / 10));
  });
  r.get('/ofertas-fornecedor/minhas', ({ user }) =>
    db.prepare('SELECT * FROM ofertas_fornecedor WHERE fornecedor_id = ? ORDER BY created_at DESC').all(user.id).map((o) => ({
      ...ofertaView(o),
      pedidos: db.prepare('SELECT * FROM pedidos_fornecedor WHERE oferta_id = ? ORDER BY created_at DESC').all(o.id).map((p) => ({ id: p.id, comprador: (userById(p.comprador_id) || {}).name, qtd: p.qtd, total: toReais(p.total), status: p.status })),
    }))
  );
  r.post('/ofertas-fornecedor/:id/encerrar', ({ params, user }) => {
    const ch = db.prepare(`UPDATE ofertas_fornecedor SET status = 'encerrada' WHERE id = ? AND fornecedor_id = ?`).run(params.id, user.id);
    if (!ch.changes) fail(404, 'Oferta não encontrada.');
    return { ok: true };
  });

  // Pedido para o fornecedor: o comprador paga, o valor fica retido; o fornecedor confirma e,
  // quando o comprador confirma o recebimento, o fornecedor recebe (menos 5% do Realyz).
  r.post('/ofertas-fornecedor/:id/pedir', ({ params, body, user }) => {
    const o = db.prepare(`SELECT * FROM ofertas_fornecedor WHERE id = ? AND status = 'ativa' AND validade > ?`).get(params.id, now());
    if (!o) fail(404, 'Oferta encerrada.');
    if (o.fornecedor_id === user.id) fail(400, 'A oferta é sua.');
    if (!minhaEmpresa(user)) fail(403, 'Compra de fornecedor é para empresas.');
    const d = JSON.parse(o.dados);
    const qtd = Number(body.qtd);
    if (!(qtd >= d.minimo)) fail(400, `Pedido mínimo: ${d.minimo} ${d.unidade}.`);
    const total = Math.round(toCents(d.preco) * qtd);
    const taxa = Math.round((total * FORNECEDOR_TAXA_PCT) / 100);
    const id = newId('pf');
    tx(db, () => {
      wallet.move(user.id, 'saldo', -total, 'Fornecedores', `Pedido ${id}: ${qtd} ${d.unidade} de ${d.produto} (retido até receber)`, id);
      wallet.move('realys', 'saldo', total, 'Fornecedores retidos', `Pedido de fornecedor ${id} retido`, id);
      db.prepare('INSERT INTO pedidos_fornecedor (id, oferta_id, fornecedor_id, comprador_id, qtd, total, taxa, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, o.id, o.fornecedor_id, user.id, qtd, total, taxa, 'novo', now(), now());
    });
    hub.send(o.fornecedor_id, 'pedido_fornecedor', { id, comprador: user.name, produto: d.produto, qtd, total: toReais(total) });
    return { id, total: toReais(total), status: 'novo' };
  }, { status: 201 });

  r.get('/pedidos-fornecedor', ({ user }) =>
    db.prepare('SELECT p.*, o.dados FROM pedidos_fornecedor p JOIN ofertas_fornecedor o ON o.id = p.oferta_id WHERE p.comprador_id = ? OR p.fornecedor_id = ? ORDER BY p.created_at DESC LIMIT 100').all(user.id, user.id).map((p) => {
      const d = JSON.parse(p.dados);
      return { id: p.id, produto: d.produto, unidade: d.unidade, qtd: p.qtd, total: toReais(p.total), status: p.status, lado: p.comprador_id === user.id ? 'comprei' : 'vendi', outro: (userById(p.comprador_id === user.id ? p.fornecedor_id : p.comprador_id) || {}).name };
    })
  );

  // Fornecedor: confirmar / recusar (recusar devolve). Comprador: recebi (libera o pagamento).
  r.post('/pedidos-fornecedor/:id/:acao', ({ params, user }) => {
    const p = db.prepare('SELECT * FROM pedidos_fornecedor WHERE id = ?').get(params.id);
    if (!p) fail(404, 'Pedido não encontrado.');
    const acao = oneOf(params.acao, 'a ação', ['confirmar', 'recusar', 'recebi']);
    if (acao !== 'recebi' && p.fornecedor_id !== user.id) fail(404, 'Pedido não encontrado.');
    if (acao === 'recebi' && p.comprador_id !== user.id) fail(404, 'Pedido não encontrado.');
    if (acao === 'confirmar') {
      if (p.status !== 'novo') fail(409, 'Pedido já respondido.');
      db.prepare(`UPDATE pedidos_fornecedor SET status = 'confirmado', updated_at = ? WHERE id = ?`).run(now(), p.id);
    } else if (acao === 'recusar') {
      if (p.status !== 'novo') fail(409, 'Pedido já respondido.');
      tx(db, () => {
        wallet.move('realys', 'saldo', -p.total, 'Fornecedores retidos', `Pedido ${p.id} recusado`, p.id);
        wallet.move(p.comprador_id, 'saldo', p.total, 'Fornecedores', `Pedido ${p.id} recusado pelo fornecedor (devolvido)`, p.id);
        db.prepare(`UPDATE pedidos_fornecedor SET status = 'recusado', updated_at = ? WHERE id = ?`).run(now(), p.id);
      });
    } else {
      if (p.status !== 'confirmado') fail(409, 'O fornecedor ainda não confirmou o pedido.');
      tx(db, () => {
        wallet.move('realys', 'saldo', -(p.total - p.taxa), 'Fornecedores retidos', `Pedido ${p.id} pago ao fornecedor`, p.id);
        wallet.move(p.fornecedor_id, 'saldo', p.total - p.taxa, 'Vendas', `Venda para empresa (pedido ${p.id})`, p.id);
        db.prepare(`UPDATE pedidos_fornecedor SET status = 'recebido', updated_at = ? WHERE id = ?`).run(now(), p.id);
      });
      if (p.taxa) fiscal.registrar({ origem: 'comissao_pedido', ref: p.id, tomadorId: p.fornecedor_id, valorCents: p.taxa, descricao: `Intermediação de venda entre empresas no Realyz (${p.id})` });
    }
    hub.send(acao === 'recebi' ? p.fornecedor_id : p.comprador_id, 'pedido_fornecedor', { id: p.id, status: acao === 'recebi' ? 'recebido' : acao === 'confirmar' ? 'confirmado' : 'recusado' });
    return { ok: true };
  });
}

// O horário de trabalho vem das rotas de serviços (mesma regra, horas de Brasília).
import * as servicosHorario from './services.js';
