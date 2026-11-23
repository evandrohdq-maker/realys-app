// Planos do Realyz (empresas e prestadores): o que cada um libera de IA.
//
// A proteção contra golpe e fake news vale para TODO MUNDO, sempre, de graça (é o coração do Realyz).
// O que muda de um plano para o outro é o atendente de IA e o painel de inteligência:
//
//   Grátis  · R$ 0       · atendente com 150 respostas por mês · painel dos últimos 7 dias
//   Realyz  · R$ 49,90   · 3.000 respostas por mês, copiloto de vendas · painel de 30 dias com as
//                          buscas em alta e o que procuram e não acham (demanda escondida)
//   Pro     · R$ 89,90   · respostas sem limite (uso justo de 15.000), a IA pode negociar · painel de
//                          90 dias com preço contra o mercado e horários de pico
//
// Anual: 75% do valor de 12 mensalidades. Os primeiros 30 dias da conta têm tudo do Pro liberado (teste).
// Enquanto as compras do app estão bloqueadas, o pedido de plano fica "aguardando pagamento" e o
// administrador ativa (POST /admin/planos/:userId). Quando o Pix entrar, a ativação passa a ser sozinha.

const DIA = 86400000;
export const TESTE_DIAS = 30;
export const ANUAL_PCT = 75;

export const PLANOS = {
  gratis: { id: 'gratis', nome: 'Grátis', mensal: 0, respostas: 150, copiloto: false, iaNegocia: false, painelDias: 7, buscas: false, mercado: false, pico: false },
  realyz: { id: 'realyz', nome: 'Realyz', mensal: 49.9, respostas: 3000, copiloto: true, iaNegocia: false, painelDias: 30, buscas: true, mercado: false, pico: false },
  pro: { id: 'pro', nome: 'Pro', mensal: 89.9, respostas: 15000, copiloto: true, iaNegocia: true, painelDias: 90, buscas: true, mercado: true, pico: true },
};
const r2 = (n) => Math.round(n * 100) / 100;
export const valorAnual = (p) => r2(p.mensal * 12 * (ANUAL_PCT / 100));

export const BENEFICIOS = {
  gratis: ['Proteção contra golpe e fake news', 'Atendente de IA: 150 respostas por mês', 'Painel dos últimos 7 dias'],
  realyz: ['Tudo do Grátis', 'Atendente de IA: 3.000 respostas por mês', 'Copiloto que sugere a resposta para fechar a venda', 'Painel de 30 dias', 'O que estão buscando e o que procuram e não acham'],
  pro: ['Tudo do Realyz', 'Atendente de IA sem limite (uso justo)', 'A IA pode negociar desconto e orçamento', 'Painel de 90 dias', 'Seu preço contra o mercado', 'Horários de pico de busca e de pedido'],
};

export function inicioDoMes(t = Date.now()) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function makePlanos(db) {
  const linha = (id) => db.prepare('SELECT * FROM planos_conta WHERE owner_id = ?').get(id);

  // Plano que vale agora para a conta: ativo pago > teste dos 30 dias > grátis.
  function atual(userId, t = Date.now()) {
    const u = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);
    const l = linha(userId);
    const testeAte = u ? u.created_at + TESTE_DIAS * DIA : 0;
    if (l && l.status === 'ativo' && (!l.ate || l.ate > t)) return { ...PLANOS[l.plano], status: 'ativo', ciclo: l.ciclo, ate: l.ate, teste: false, pedido: null };
    const pedido = l && l.status === 'aguardando_pagamento' ? { plano: l.plano, ciclo: l.ciclo, em: l.pedido_em } : null;
    if (t < testeAte) return { ...PLANOS.pro, status: 'teste', ate: testeAte, teste: true, pedido };
    return { ...PLANOS.gratis, status: 'gratis', ate: null, teste: false, pedido };
  }

  // Respostas que o atendente de IA já mandou neste mês.
  const usadas = (userId, t = Date.now()) => db.prepare('SELECT COUNT(*) AS n FROM messages WHERE from_id = ? AND ia = 1 AND created_at >= ?').get(userId, inicioDoMes(t)).n;

  return {
    atual,
    usadas,
    podeResponder(userId) {
      const p = atual(userId);
      return usadas(userId) < p.respostas;
    },
    pedir(userId, plano, ciclo) {
      const t = Date.now();
      db.prepare(
        `INSERT INTO planos_conta (owner_id, plano, ciclo, status, pedido_em, updated_at) VALUES (?,?,?,'aguardando_pagamento',?,?)
         ON CONFLICT(owner_id) DO UPDATE SET plano = excluded.plano, ciclo = excluded.ciclo,
           status = CASE WHEN planos_conta.status = 'ativo' AND planos_conta.plano = excluded.plano THEN 'ativo' ELSE 'aguardando_pagamento' END,
           pedido_em = excluded.pedido_em, updated_at = excluded.updated_at`
      ).run(userId, plano, ciclo, t, t);
      return atual(userId);
    },
    ativar(userId, plano, ciclo) {
      const t = Date.now();
      const ate = t + (ciclo === 'anual' ? 365 : 30) * DIA;
      db.prepare(
        `INSERT INTO planos_conta (owner_id, plano, ciclo, status, desde, ate, pedido_em, updated_at) VALUES (?,?,?,'ativo',?,?,?,?)
         ON CONFLICT(owner_id) DO UPDATE SET plano = excluded.plano, ciclo = excluded.ciclo, status = 'ativo', desde = excluded.desde, ate = excluded.ate, updated_at = excluded.updated_at`
      ).run(userId, plano, ciclo, t, ate, t, t);
      return atual(userId);
    },
    cancelar(userId) {
      db.prepare("UPDATE planos_conta SET status = 'cancelado', updated_at = ? WHERE owner_id = ?").run(Date.now(), userId);
      return atual(userId);
    },
    pedidos: () => db.prepare("SELECT p.*, u.name FROM planos_conta p JOIN users u ON u.id = p.owner_id WHERE p.status = 'aguardando_pagamento' ORDER BY p.pedido_em").all(),
  };
}

// Lista para mostrar no app e no site.
export const tabelaPlanos = () =>
  Object.values(PLANOS).map((p) => ({ id: p.id, nome: p.nome, mensal: p.mensal, anual: valorAnual(p), respostas: p.respostas, painelDias: p.painelDias, beneficios: BENEFICIOS[p.id] }));
