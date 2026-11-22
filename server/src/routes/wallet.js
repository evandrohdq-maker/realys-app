// Carteira, depósitos, saques, presentes e créditos de live.
import { fail, newId, now, money, str, toReais } from '../http.js';
import { tx } from '../db.js';

const brl = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

export default function walletRoutes(r, { db, cfg, wallet, hub, userById, biometria, fiscal, pix }) {
  const view = (userId) => {
    const w = wallet.get(userId);
    return { balance: toReais(w.balance), giftCredits: toReais(w.gift_credits), liveCredits: toReais(w.live_credits), currency: 'RLS' };
  };

  r.get('/wallet', ({ user }) => view(user.id));

  // Extrato. ?bucket=saldo|presente|live
  r.get('/wallet/statement', ({ user, query }) => {
    const rows = query.bucket
      ? db.prepare('SELECT * FROM ledger WHERE user_id = ? AND bucket = ? ORDER BY created_at DESC LIMIT 100').all(user.id, query.bucket)
      : db.prepare('SELECT * FROM ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(user.id);
    return rows.map((x) => ({ id: x.id, bucket: x.bucket, amount: toReais(x.amount), cat: x.cat, description: x.description, ref: x.ref, at: x.created_at }));
  });

  // Depósito confirmado pelo banco: o saldo entra (uma vez só, mesmo se o aviso chegar duas vezes).
  const confirmarDeposito = (d) =>
    tx(db, () => {
      const r2 = db.prepare("UPDATE deposits SET status = 'confirmado', decided_at = ? WHERE id = ? AND status = 'pendente'").run(now(), d.id);
      if (!r2.changes) return false;
      wallet.move(d.user_id, 'saldo', d.amount, 'Depósito', 'Depósito por Pix', d.id);
      return true;
    });
  const conferirDeposito = async (d) => {
    if (!d || d.status !== 'pendente' || !d.txid || !pix || !pix.ready) return d;
    const r2 = await pix.consultar(d.txid);
    if (r2.status === 'pago' && confirmarDeposito(d)) hub.send(d.user_id, 'deposit', { id: d.id, amount: toReais(d.amount), status: 'confirmado' });
    else if (r2.status === 'expirado' || (d.expira_em && Date.now() > d.expira_em + 10 * 60000)) {
      db.prepare("UPDATE deposits SET status = 'recusado', decided_at = ? WHERE id = ? AND status = 'pendente'").run(now(), d.id);
    }
    return db.prepare('SELECT * FROM deposits WHERE id = ?').get(d.id);
  };
  // Para o servidor conferir de tempos em tempos os depósitos Pix ainda abertos.
  if (pix) pix.conferirDepositos = async () => {
    for (const d of db.prepare("SELECT * FROM deposits WHERE status = 'pendente' AND txid IS NOT NULL AND created_at > ?").all(Date.now() - 48 * 3600000)) {
      await conferirDeposito(d).catch(() => {});
    }
  };

  // Andamento de um depósito (o app pergunta enquanto o cliente paga o Pix).
  r.get('/wallet/deposits/:id', async ({ user, params }) => {
    const d = db.prepare('SELECT * FROM deposits WHERE id = ? AND user_id = ?').get(params.id, user.id);
    if (!d) fail(404, 'Depósito não encontrado.');
    const n = await conferirDeposito(d).catch(() => d);
    return { id: n.id, amount: toReais(n.amount), status: n.status, pix: n.pix_copia ? { copiaECola: n.pix_copia, expiraEm: n.expira_em } : null, wallet: view(user.id) };
  });

  // Depósito. Com o Pix do banco ligado: gera a cobrança e o saldo entra quando o cliente paga.
  // Sem o banco: na fase de testes entra na hora (sem Pix real); fora dela, fica pendente para o administrador.
  r.post('/wallet/deposit', async ({ user, body }) => {
    const amount = money(body.amount, 'depósito', { min: 1, max: 10000 });
    const method = ['pix', 'cartao', 'boleto'].includes(body.method) ? body.method : 'pix';
    const id = newId('dp');
    // Conta de teste: depósito fictício na hora, nunca gera cobrança no banco.
    if (user.teste) {
      tx(db, () => {
        db.prepare('INSERT INTO deposits (id, user_id, amount, method, status, created_at, decided_at) VALUES (?,?,?,?,?,?,?)').run(id, user.id, amount, method, 'confirmado', now(), now());
        wallet.move(user.id, 'saldo', amount, 'Depósito', 'Depósito fictício (conta de teste)', id);
      });
      return { id, status: 'confirmado', teste: true, wallet: view(user.id) };
    }
    if (pix && pix.ready && method === 'pix') {
      const c = await pix.cobrar(amount, `Depósito na carteira Realyz (${user.name})`);
      db.prepare('INSERT INTO deposits (id, user_id, amount, method, status, created_at, txid, pix_copia, expira_em) VALUES (?,?,?,?,?,?,?,?,?)').run(id, user.id, amount, 'pix', 'pendente', now(), c.txid, c.copiaECola, c.expiraEm);
      return { id, status: 'pendente', pix: { copiaECola: c.copiaECola, imagem: c.imagem, expiraEm: c.expiraEm }, wallet: view(user.id) };
    }
    tx(db, () => {
      db.prepare('INSERT INTO deposits (id, user_id, amount, method, status, created_at, decided_at) VALUES (?,?,?,?,?,?,?)').run(
        id, user.id, amount, method, cfg.testDeposits ? 'confirmado' : 'pendente', now(), cfg.testDeposits ? now() : null
      );
      if (cfg.testDeposits) wallet.move(user.id, 'saldo', amount, 'Depósito', `Depósito de teste por ${method}`, id);
    });
    return { id, status: cfg.testDeposits ? 'confirmado' : 'pendente', wallet: view(user.id) };
  }, { status: 201 });

  // Saque: só do saldo (créditos de presente não sacam). O dinheiro sai na hora da carteira
  // e o pagamento por Pix é feito pelo administrador (até haver integração com o banco).
  r.post('/wallet/withdraw', ({ user, body }) => {
    if (user.teste) fail(403, 'Conta de teste não saca: o dinheiro dela é fictício.', 'conta_teste');
    // Saque: confirma o rosto antes de sair dinheiro da carteira.
    biometria.consume(user.id, 'saque', null);
    const amount = money(body.amount, 'saque', { min: cfg.withdrawMin, max: 50000 });
    const pix = str(body.pixKey, 'a chave Pix', { min: 5, max: 80 });
    const id = newId('wd');
    tx(db, () => {
      wallet.move(user.id, 'saldo', -amount, 'Saque', `Saque por Pix (${pix})`, id);
      db.prepare('INSERT INTO withdrawals (id, user_id, amount, pix_key, status, created_at) VALUES (?,?,?,?,?,?)').run(id, user.id, amount, pix, 'pendente', now());
    });
    return { id, status: 'pendente', wallet: view(user.id) };
  }, { status: 201 });

  // Presentear: cliente → cliente, cliente → prestador, empresa → cliente, gorjeta ao motoboy.
  // Sai do saldo de quem dá (valor + taxa) e entra na hora para quem recebe, como crédito de presente.
  r.post('/gifts', ({ user, body }) => {
    const amount = money(body.amount, 'presente', { min: cfg.giftMin, max: cfg.giftMax });
    const to = userById(String(body.toId || ''));
    if (!to || to.kind === 'sistema' || to.status !== 'ativo') fail(404, 'Não encontrei quem vai receber o presente.');
    if (to.id === user.id) fail(400, 'Não dá para presentear a si mesmo.');
    const asCompany = !!body.asCompany;
    if (asCompany && !JSON.parse(user.roles).includes('empresa')) fail(403, 'Só contas de empresa presenteiam como empresa.');
    const company = asCompany ? db.prepare('SELECT name FROM companies WHERE owner_id = ?').get(user.id) : null;
    // Igual ao app: quem envia paga só o valor do presente; a taxa do Realyz (10%) sai do presente.
    // Gorjeta vai inteira para quem atendeu (sem taxa).
    const fee = body.tip ? 0 : wallet.giftFee(amount);
    const id = newId('gf');
    const fromName = company ? company.name : user.name;
    tx(db, () => {
      wallet.move(user.id, 'saldo', -amount, 'Presentes', `${body.tip ? 'Gorjeta' : 'Presente'} para ${to.name} (${brl(amount)})`, id);
      wallet.move(to.id, 'presente', amount - fee, 'Presentes', `${body.tip ? 'Gorjeta' : 'Presente'} de ${fromName}${fee ? ` (taxa do Realyz ${brl(fee)})` : ''}`, id);
      if (fee) wallet.move('realys', 'saldo', fee, 'Taxa de presente', `Taxa do presente ${id}`, id);
      if (fee) fiscal.registrar({ origem: 'taxa_presente', ref: id, tomadorId: user.id, valorCents: fee });
      db.prepare('INSERT INTO gifts (id, from_id, to_id, amount, fee, occasion, message, as_company, tip, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
        id, user.id, to.id, amount, fee, String(body.occasion || '').slice(0, 40), String(body.message || '').slice(0, 140), asCompany ? 1 : 0, body.tip ? 1 : 0, now()
      );
    });
    hub.send(to.id, 'gift', { id, from: fromName, amount: toReais(amount), occasion: body.occasion || '', message: body.message || '', tip: !!body.tip });
    return { id, amount: toReais(amount), fee: toReais(fee), wallet: view(user.id) };
  }, { status: 201 });

  r.get('/gifts', ({ user }) =>
    db.prepare(
      `SELECT g.*, f.name AS from_name, t.name AS to_name FROM gifts g JOIN users f ON f.id = g.from_id JOIN users t ON t.id = g.to_id
       WHERE g.from_id = ? OR g.to_id = ? ORDER BY g.created_at DESC LIMIT 60`
    ).all(user.id, user.id).map((g) => ({
      id: g.id, dir: g.to_id === user.id ? 'recebido' : 'enviado', from: g.from_name, to: g.to_name, amount: toReais(g.amount),
      fee: g.from_id === user.id ? toReais(g.fee) : undefined, occasion: g.occasion, message: g.message, tip: !!g.tip, at: g.created_at,
    }))
  );

  // Créditos de live → moeda Realyz (1 crédito = 1 RLS).
  r.post('/wallet/convert-live', ({ user, body }) => {
    const w = wallet.get(user.id);
    const amount = body.amount ? money(body.amount, 'conversão', { min: cfg.liveConvertMin }) : w.live_credits;
    if (amount < cfg.liveConvertMin * 100) fail(400, `Junte pelo menos ${cfg.liveConvertMin} créditos de live para converter.`);
    const id = newId('cv');
    tx(db, () => {
      wallet.move(user.id, 'live', -amount, 'Lives', 'Convertido em moeda Realyz', id);
      wallet.move(user.id, 'saldo', amount, 'Lives', `Créditos de live convertidos (${(amount / 100).toFixed(2).replace('.', ',')} RLS)`, id);
    });
    return { converted: toReais(amount), wallet: view(user.id) };
  });
}
