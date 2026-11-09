// Empresas, produtos e pedidos (Shop, Food, lojas, fornecedores).
import { fail, newId, now, money, str, int, toReais, coord } from '../http.js';
import { tx } from '../db.js';

const ORDER_STATUS = ['Recebido', 'Preparando', 'A caminho', 'Entregue', 'Cancelado'];

export default function commerceRoutes(r, { db, cfg, wallet, hub, biometria, fiscal }) {
  const companyOf = (userId) => db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(userId);
  const myCompany = (user) => {
    const c = companyOf(user.id);
    if (!c) fail(403, 'Só contas de empresa (CNPJ) podem fazer isso.');
    return c;
  };
  const companyView = (c) => c && { id: c.id, name: c.name, segment: c.segment, about: c.about, logo: c.logo, address: c.address, lat: c.lat, lng: c.lng, ownerId: c.owner_id };
  const SECOES = ['mercearia', 'hortifruti', 'acougue', 'frios', 'padaria', 'congelados', 'limpeza', 'bebidas', 'outros'];
  const secaoOf = (v) => {
    if (v === undefined || v === null || v === '') return null;
    if (!SECOES.includes(v)) fail(400, 'Seção inválida. Use: ' + SECOES.join(', ') + '.');
    return v;
  };
  // Cardápio de comida: classes e subclasses (foodClasses no app), modos de atendimento e maioridade.
  const CLASSES = ['pizzaria', 'lanches', 'japonesa', 'pratos', 'padaria', 'doces', 'bar', 'bebidas', 'mercado'];
  const MODOS = ['entrega', 'retirada'];
  const classeOf = (v) => {
    if (v === undefined || v === null || v === '') return null;
    if (!CLASSES.includes(v)) fail(400, 'Classe inválida. Use: ' + CLASSES.join(', ') + '.');
    return v;
  };
  const subclasseOf = (v) => (v === undefined || v === null || v === '' ? null : str(v, 'a subclasse', { max: 40 }));
  const modosOf = (v) => {
    if (v === undefined || v === null) return null;
    if (!Array.isArray(v) || !v.length || v.some((x) => !MODOS.includes(x))) fail(400, 'Modo de atendimento inválido. Use entrega, retirada ou os dois.');
    return JSON.stringify(MODOS.filter((m) => v.includes(m)));
  };
  // Bebida alcoólica: o servidor define sozinho (o cliente não consegue tirar a marca).
  const ALCOOL = { bar: ['chope', 'drinks', 'vinhos'] };
  const maioridadeDe = (classe, subclasse) => (ALCOOL[classe] && ALCOOL[classe].includes(subclasse) ? 1 : 0);
  const adultoConfirmado = (userId) => db.prepare('SELECT maior_idade FROM users WHERE id = ?').get(userId)?.maior_idade === 1;
  const productView = (p) => ({ id: p.id, companyId: p.company_id, company: p.company_name, name: p.name, description: p.description, category: p.category, secao: p.secao || null, classe: p.classe || null, subclasse: p.subclasse || null, modos: p.modos ? JSON.parse(p.modos) : null, maioridade: !!p.maioridade, price: toReais(p.price), stock: p.stock, photo: p.photo, sponsored: !!p.sponsored, active: !!p.active });

  // ── Empresas ──
  r.get('/companies', ({ query }) => {
    const q = `%${String(query.q || '').trim()}%`;
    return db.prepare('SELECT * FROM companies WHERE name LIKE ? OR segment LIKE ? ORDER BY name LIMIT 50').all(q, q).map(companyView);
  }, { auth: false });
  r.get('/companies/:id', ({ params }) => {
    const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(params.id);
    if (!c) fail(404, 'Empresa não encontrada.');
    const products = db.prepare('SELECT p.*, ? AS company_name FROM products p WHERE company_id = ? AND active = 1 ORDER BY sponsored DESC, created_at DESC').all(c.name, c.id).map(productView);
    const rating = db.prepare(`SELECT AVG(stars) AS avg, COUNT(*) AS n FROM ratings rt JOIN orders o ON rt.target_kind = 'order' AND o.id = rt.target_id WHERE o.company_id = ?`).get(c.id);
    return { ...companyView(c), products, rating: rating.n ? +rating.avg.toFixed(1) : null, ratings: rating.n };
  }, { auth: false });
  r.patch('/companies/me', ({ user, body }) => {
    const c = myCompany(user);
    const f = {};
    if (body.name !== undefined) f.name = str(body.name, 'o nome', { min: 2, max: 80 });
    if (body.segment !== undefined) f.segment = str(body.segment, 'o segmento', { optional: true, max: 60 });
    if (body.about !== undefined) f.about = str(body.about, 'a apresentação', { optional: true, max: 1000 });
    if (body.logo !== undefined) f.logo = str(body.logo, 'o logo', { optional: true, max: 300 }) || null;
    if (body.address !== undefined) f.address = str(body.address, 'o endereço', { optional: true, max: 200 });
    if (body.lat !== undefined) f.lat = coord(body.lat, 'latitude');
    if (body.lng !== undefined) f.lng = coord(body.lng, 'longitude');
    const k = Object.keys(f);
    if (k.length) db.prepare(`UPDATE companies SET ${k.map((x) => `${x} = ?`).join(', ')} WHERE id = ?`).run(...k.map((x) => f[x]), c.id);
    return companyView(db.prepare('SELECT * FROM companies WHERE id = ?').get(c.id));
  });

  // ── Produtos ──
  // Busca: patrocinados primeiro, depois os mais novos. ?q= &category= &companyId=
  r.get('/products', ({ query }) => {
    const where = ['p.active = 1'];
    const args = [];
    if (query.q) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      args.push(`%${query.q}%`, `%${query.q}%`);
    }
    if (query.category) {
      where.push('p.category = ?');
      args.push(query.category);
    }
    if (query.companyId) {
      where.push('p.company_id = ?');
      args.push(query.companyId);
    }
    if (query.secao) {
      where.push('p.secao = ?');
      args.push(secaoOf(query.secao));
    }
    if (query.classe) {
      where.push('p.classe = ?');
      args.push(classeOf(query.classe));
    }
    if (query.subclasse) {
      where.push('p.subclasse = ?');
      args.push(subclasseOf(query.subclasse));
    }
    if (query.modo) {
      if (!MODOS.includes(query.modo)) fail(400, 'Modo inválido. Use entrega ou retirada.');
      where.push('p.modos LIKE ?');
      args.push(`%"${query.modo}"%`);
    }
    return db.prepare(`SELECT p.*, c.name AS company_name FROM products p JOIN companies c ON c.id = p.company_id WHERE ${where.join(' AND ')} ORDER BY p.sponsored DESC, p.created_at DESC LIMIT 100`).all(...args).map(productView);
  }, { auth: false });

  r.post('/products', ({ user, body }) => {
    const c = myCompany(user);
    const id = newId('p');
    db.prepare('INSERT INTO products (id, company_id, name, description, category, price, stock, photo, secao, classe, subclasse, modos, maioridade, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id, c.id, str(body.name, 'o nome do produto', { max: 120 }), str(body.description, 'a descrição', { optional: true, max: 2000 }),
      str(body.category, 'a categoria', { optional: true, max: 40 }) || 'Vários', money(body.price, 'preço'), int(body.stock ?? 0, 'estoque'),
      str(body.photo, 'a foto', { optional: true, max: 300 }) || null, secaoOf(body.secao),
      classeOf(body.classe), subclasseOf(body.subclasse), modosOf(body.modos) ?? JSON.stringify(MODOS), maioridadeDe(classeOf(body.classe), subclasseOf(body.subclasse)), now()
    );
    return productView({ ...db.prepare('SELECT * FROM products WHERE id = ?').get(id), company_name: c.name });
  }, { status: 201 });

  r.patch('/products/:id', ({ user, params, body }) => {
    const c = myCompany(user);
    const p = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ?').get(params.id, c.id);
    if (!p) fail(404, 'Produto não encontrado na sua loja.');
    const f = {};
    if (body.name !== undefined) f.name = str(body.name, 'o nome do produto', { max: 120 });
    if (body.description !== undefined) f.description = str(body.description, 'a descrição', { optional: true, max: 2000 });
    if (body.category !== undefined) f.category = str(body.category, 'a categoria', { max: 40 });
    if (body.price !== undefined) f.price = money(body.price, 'preço');
    if (body.stock !== undefined) f.stock = int(body.stock, 'estoque');
    if (body.photo !== undefined) f.photo = str(body.photo, 'a foto', { optional: true, max: 300 }) || null;
    if (body.active !== undefined) f.active = body.active ? 1 : 0;
    if (body.secao !== undefined) f.secao = secaoOf(body.secao);
    if (body.classe !== undefined) f.classe = classeOf(body.classe);
    if (body.subclasse !== undefined) f.subclasse = subclasseOf(body.subclasse);
    if (body.modos !== undefined) f.modos = modosOf(body.modos);
    if (body.classe !== undefined || body.subclasse !== undefined) {
      f.maioridade = maioridadeDe(f.classe !== undefined ? f.classe : p.classe, f.subclasse !== undefined ? f.subclasse : p.subclasse);
    }
    const k = Object.keys(f);
    if (k.length) db.prepare(`UPDATE products SET ${k.map((x) => `${x} = ?`).join(', ')} WHERE id = ?`).run(...k.map((x) => f[x]), p.id);
    return productView({ ...db.prepare('SELECT * FROM products WHERE id = ?').get(p.id), company_name: c.name });
  });

  // Estoque baixo (painel da empresa).
  r.get('/companies/me/stock', ({ user, query }) => {
    const c = myCompany(user);
    const max = Number(query.max || 5);
    return db.prepare('SELECT p.*, ? AS company_name FROM products p WHERE company_id = ? AND stock <= ? ORDER BY stock').all(c.name, c.id, max).map(productView);
  });

  // ── Pedidos ──
  // O carrinho pode ter várias lojas: vira um pedido por loja. O preço vem do servidor (não do celular).
  // Pagamento: créditos de presente primeiro, depois o saldo. A loja recebe na carteira dela.
  r.post('/orders', ({ user, body }) => {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.length > 50) fail(400, 'O carrinho está vazio.');
    const address = str(body.address, 'o endereço', { optional: true, max: 200 });
    const created = tx(db, () => {
      const byCompany = new Map();
      for (const it of items) {
        const p = db.prepare('SELECT p.*, c.owner_id, c.name AS company_name FROM products p JOIN companies c ON c.id = p.company_id WHERE p.id = ? AND p.active = 1').get(String(it.productId));
        if (!p) fail(404, 'Um dos produtos não está mais disponível.');
        if (p.maioridade && !adultoConfirmado(user.id)) fail(403, `${p.name} é bebida alcoólica: só para maiores de 18 anos. Sua maioridade não está confirmada na conta.`, 'maioridade');
        const qty = int(it.qty, 'quantidade', { min: 1, max: 99 });
        if (p.owner_id === user.id) fail(400, 'Você não pode comprar da sua própria loja.');
        const r2 = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(qty, p.id, qty);
        if (!r2.changes) fail(409, `Sem estoque suficiente de ${p.name}.`);
        if (!byCompany.has(p.company_id)) byCompany.set(p.company_id, { owner: p.owner_id, name: p.company_name, lines: [] });
        byCompany.get(p.company_id).lines.push({ p, qty });
      }
      const out = [];
      for (const [companyId, g] of byCompany) {
        const id = newId('o');
        const total = g.lines.reduce((s, l) => s + l.p.price * l.qty, 0);
        const fee = Math.round((total * cfg.orderFeePct) / 100);
        const { fromGift, fromWallet } = wallet.pay(user.id, total, 'Compras', `Pedido em ${g.name}`, id);
        wallet.move(g.owner, 'saldo', total - fee, 'Vendas', `Venda para ${user.name} (pedido ${id})`, id);
        if (fee) wallet.move('realys', 'saldo', fee, 'Comissão', `Comissão do pedido ${id}`, id);
        const t = now();
        db.prepare('INSERT INTO orders (id, buyer_id, company_id, total, from_gift, from_wallet, fee, address, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, user.id, companyId, total, fromGift, fromWallet, fee, address, 'Recebido', t, t);
        for (const l of g.lines) db.prepare('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?,?,?,?,?)').run(id, l.p.id, l.p.name, l.p.price, l.qty);
        // Fiscal: a comissão é serviço do Realys para a loja (tomador = dono da loja); a NF-e do produto é da loja.
        if (fee) fiscal.registrar({ origem: 'comissao_pedido', ref: id, tomadorId: g.owner, valorCents: fee, descricao: `Intermediação de venda no Realys (pedido ${id})` });
        fiscal.filaNfeDoPedido(id);
        out.push({ id, owner: g.owner, company: g.name, total, fromGift, fromWallet });
      }
      return out;
    });
    for (const o of created) hub.send(o.owner, 'order', { id: o.id, buyer: user.name, total: toReais(o.total), status: 'Recebido' });
    return { orders: created.map((o) => ({ id: o.id, company: o.company, total: toReais(o.total), fromGift: toReais(o.fromGift), fromWallet: toReais(o.fromWallet), status: 'Recebido' })) };
  }, { status: 201 });

  const orderView = (o) => ({
    id: o.id, company: o.company_name, companyId: o.company_id, buyer: o.buyer_name, total: toReais(o.total), fromGift: toReais(o.from_gift),
    fromWallet: toReais(o.from_wallet), status: o.status, address: o.address, createdAt: o.created_at, updatedAt: o.updated_at,
    items: db.prepare('SELECT product_id AS productId, name, price, qty FROM order_items WHERE order_id = ?').all(o.id).map((i) => ({ ...i, price: toReais(i.price) })),
  });
  const ORDER_SQL = 'SELECT o.*, c.name AS company_name, b.name AS buyer_name FROM orders o JOIN companies c ON c.id = o.company_id JOIN users b ON b.id = o.buyer_id';

  // Meus pedidos (compras) e pedidos da minha loja (vendas).
  r.get('/orders', ({ user }) => db.prepare(`${ORDER_SQL} WHERE o.buyer_id = ? ORDER BY o.created_at DESC LIMIT 50`).all(user.id).map(orderView));
  r.get('/companies/me/orders', ({ user }) => db.prepare(`${ORDER_SQL} WHERE o.company_id = ? ORDER BY o.created_at DESC LIMIT 100`).all(myCompany(user).id).map(orderView));

  // A loja muda o status. Cancelar devolve o dinheiro ao cliente (no mesmo bolso de onde saiu) e o estoque.
  r.patch('/orders/:id', ({ user, params, body }) => {
    const c = myCompany(user);
    const o = db.prepare('SELECT * FROM orders WHERE id = ? AND company_id = ?').get(params.id, c.id);
    if (!o) fail(404, 'Pedido não encontrado na sua loja.');
    if (!ORDER_STATUS.includes(body.status)) fail(400, 'Status inválido.');
    if (o.status === 'Cancelado' || o.status === 'Entregue') fail(409, `Este pedido já está ${o.status.toLowerCase()}.`);
    // Venda: o lojista confirma o rosto para mexer no pedido.
    biometria.consume(user.id, 'venda', o.id);
    tx(db, () => {
      if (body.status === 'Cancelado') {
        wallet.move(c.owner_id, 'saldo', -(o.total - o.fee), 'Vendas', `Pedido ${o.id} cancelado`, o.id);
        if (o.fee) wallet.move('realys', 'saldo', -o.fee, 'Comissão', `Pedido ${o.id} cancelado`, o.id);
        wallet.move(o.buyer_id, 'presente', o.from_gift, 'Estorno', `Pedido ${o.id} cancelado por ${c.name}`, o.id);
        wallet.move(o.buyer_id, 'saldo', o.from_wallet, 'Estorno', `Pedido ${o.id} cancelado por ${c.name}`, o.id);
        for (const i of db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(o.id)) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(i.qty, i.product_id);
        fiscal.estornar(o.id, `Pedido ${o.id} cancelado por ${c.name}`);
        // NF-e do produto ainda na fila: não sai mais. Já emitida: pede o cancelamento ao emissor.
        db.prepare("UPDATE fiscal_notas SET status = CASE WHEN status = 'emitida' THEN 'cancelamento' ELSE 'cancelada' END, updated_at = ? WHERE tipo = 'nfe' AND ref = ? AND status IN ('fila','erro','emitida')").run(now(), o.id);
      }
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(body.status, now(), o.id);
    });
    hub.send(o.buyer_id, 'order', { id: o.id, company: c.name, status: body.status });
    return orderView(db.prepare(`${ORDER_SQL} WHERE o.id = ?`).get(o.id));
  });

  // Painel da empresa: vendas por dia (últimos 7 dias).
  r.get('/companies/me/sales', ({ user }) => {
    const c = myCompany(user);
    const since = now() - 7 * 86400000;
    const rows = db.prepare(`SELECT created_at, total FROM orders WHERE company_id = ? AND status != 'Cancelado' AND created_at >= ?`).all(c.id, since);
    const days = {};
    for (let i = 6; i >= 0; i--) days[new Date(now() - i * 86400000).toISOString().slice(0, 10)] = 0;
    for (const o of rows) {
      const d = new Date(o.created_at).toISOString().slice(0, 10);
      if (d in days) days[d] += o.total;
    }
    return Object.entries(days).map(([day, total]) => ({ day, total: toReais(total) }));
  });
}
