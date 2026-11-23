// Plano da loja no servidor (Shop e Food). Mesmas regras do app (src/planoLoja.js):
// - Montar a loja e a vitrine é grátis. O plano só é pedido quando a loja vai aceitar o 1º pedido.
// - Mensal R$ 49,90 ou anual por 75% de 12 meses (R$ 449,10). O 1º mês é grátis nos dois.
// - Vencido, o servidor cobra da carteira da loja na hora em que ela vai aceitar um pedido (ou quando
//   abre o plano). Sem saldo, o plano fica "atrasado" e a loja não aceita pedido novo até pagar.
//   Cancelar pedido continua liberado sempre (o cliente nunca fica preso).
import { HttpError, newId, now } from './http.js';
import { tx } from './db.js';

const DIA = 86400000;
export const LOJA_GRATIS_DIAS = 30;
export const LOJA_PRECOS = { mensal: { cents: 4990, dias: 30, nome: 'Mensal' }, anual: { cents: 44910, dias: 365, nome: 'Anual' } };

export function makeLojaPlano(db, wallet) {
  const get = (companyId) => db.prepare('SELECT * FROM loja_planos WHERE company_id = ?').get(companyId);
  const view = (p) =>
    p
      ? { plan: p.plan, nome: LOJA_PRECOS[p.plan].nome, valor: LOJA_PRECOS[p.plan].cents / 100, since: p.since, gratisAte: p.since + LOJA_GRATIS_DIAS * DIA, pagoAte: p.paid_until, status: p.status }
      : null;
  // Vencido: tenta cobrar (quantos períodos estiverem atrasados, um de cada vez). Devolve o plano atualizado.
  const cobrarSeVenceu = (company) => {
    let p = get(company.id);
    if (!p) return null;
    const preco = LOJA_PRECOS[p.plan];
    let guarda = 0;
    while (p.paid_until <= now() && guarda++ < 24) {
      try {
        tx(db, () => {
          const ref = newId('lp');
          wallet.pay(company.owner_id, preco.cents, 'Plano da loja', `Plano ${preco.nome} da loja ${company.name}`, ref);
          wallet.move('realys', 'saldo', preco.cents, 'Plano da loja', `Plano ${preco.nome} · ${company.name}`, ref);
          db.prepare(`UPDATE loja_planos SET paid_until = paid_until + ?, status = 'ok', updated_at = ? WHERE company_id = ?`).run(preco.dias * DIA, now(), company.id);
        });
      } catch (e) {
        db.prepare(`UPDATE loja_planos SET status = 'atrasado', updated_at = ? WHERE company_id = ?`).run(now(), company.id);
        break;
      }
      p = get(company.id);
    }
    return get(company.id);
  };
  // A loja vai aceitar/andar com um pedido: precisa de plano escolhido e em dia.
  const exigir = (company) => {
    const p = cobrarSeVenceu(company);
    if (!p) throw new HttpError(402, 'Para aceitar o primeiro pedido, escolha o plano da loja: mensal (R$ 49,90) ou anual (R$ 449,10). O primeiro mês é grátis.', 'escolher_plano');
    if (p.status === 'atrasado') throw new HttpError(402, `O plano da loja venceu e não havia saldo na carteira para pagar (${(LOJA_PRECOS[p.plan].cents / 100).toFixed(2).replace('.', ',')}). Adicione saldo e toque em pagar o plano.`, 'plano_atrasado');
    return p;
  };
  const escolher = (company, plan) => {
    if (!LOJA_PRECOS[plan]) throw new HttpError(400, 'Plano inválido. Use mensal ou anual.');
    const p = get(company.id);
    const t = now();
    if (!p) {
      db.prepare(`INSERT INTO loja_planos (company_id, plan, since, paid_until, status, updated_at) VALUES (?,?,?,?, 'ok', ?)`).run(company.id, plan, t, t + LOJA_GRATIS_DIAS * DIA, t);
    } else {
      // Troca de plano vale a partir do próximo vencimento.
      db.prepare('UPDATE loja_planos SET plan = ?, updated_at = ? WHERE company_id = ?').run(plan, t, company.id);
    }
    return view(get(company.id));
  };
  return { get: (c) => view(cobrarSeVenceu(c)), exigir, escolher, pagar: (c) => view(cobrarSeVenceu(c)) };
}
