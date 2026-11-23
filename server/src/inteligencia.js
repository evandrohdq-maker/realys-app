// Painel de inteligência da empresa e do prestador: números de verdade do próprio Realyz.
// Quanto maior o plano, mais longe o painel olha e mais coisas mostra (src/planos.js).
// Nada de dado pessoal de cliente: só totais, termos de busca e preços.

const DIA = 86400000;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const reais = (c) => Math.round(c) / 100;
const mediana = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Guarda a busca (só o termo e quantos resultados vieram), para "buscas em alta" e "demanda escondida".
export function registrarBusca(db, termo, onde, resultados) {
  const t = norm(termo).slice(0, 60);
  if (t.length < 2) return;
  db.prepare('INSERT INTO buscas (termo, onde, resultados, created_at) VALUES (?,?,?,?)').run(t, onde, resultados, Date.now());
}

export function makeInteligencia({ db, planos }) {
  return {
    painel(user, diasPedidos) {
      const plano = planos.atual(user.id);
      const dias = Math.max(1, Math.min(Number(diasPedidos) || plano.painelDias, plano.painelDias));
      const desde = Date.now() - dias * DIA;
      const empresa = db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(user.id);
      const prestador = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id);
      const out = { plano: { id: plano.id, nome: plano.nome, status: plano.status, ate: plano.ate }, dias, diasMax: plano.painelDias, bloqueado: [] };

      // Vendas (loja) ou chamados (prestador).
      if (empresa) {
        const v = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total FROM orders WHERE company_id = ? AND created_at >= ? AND status NOT IN ('Cancelado','Recusado')").get(empresa.id, desde);
        out.vendas = { pedidos: v.n, faturamento: reais(v.total), ticketMedio: v.n ? reais(v.total / v.n) : 0 };
        out.maisVendidos = db
          .prepare("SELECT i.name, SUM(i.qty) AS qtd, SUM(i.qty * i.price) AS valor FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.company_id = ? AND o.created_at >= ? AND o.status NOT IN ('Cancelado','Recusado') GROUP BY i.name ORDER BY qtd DESC LIMIT 5")
          .all(empresa.id, desde)
          .map((x) => ({ nome: x.name, qtd: x.qtd, valor: reais(x.valor) }));
      }
      if (prestador) {
        const c = db.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) AS feitos FROM service_calls WHERE provider_id = ? AND created_at >= ?").get(user.id, desde);
        out.chamados = { recebidos: c.n, concluidos: c.feitos || 0, nota: prestador.rating, avaliacoes: prestador.rating_count };
      }

      // Visitas ao perfil (pessoas diferentes).
      out.visitas = db.prepare('SELECT COUNT(*) AS n FROM profile_views WHERE owner_id = ? AND ultimo_at >= ?').get(user.id, desde).n;

      // Atendente de IA.
      const conv = db.prepare('SELECT estado, etapa FROM ia_conversas WHERE owner_id = ? AND updated_at >= ?').all(user.id, desde);
      out.atendente = {
        conversas: conv.length,
        comEquipe: conv.filter((c) => c.estado === 'humano').length,
        emNegociacao: conv.filter((c) => c.etapa === 'negociacao').length,
        respostasNoMes: planos.usadas(user.id),
        limiteNoMes: plano.respostas,
      };

      // O que a cidade está buscando (Realyz e Pro).
      if (plano.buscas) {
        out.buscasEmAlta = db.prepare('SELECT termo, COUNT(*) AS vezes FROM buscas WHERE created_at >= ? GROUP BY termo ORDER BY vezes DESC LIMIT 10').all(desde);
        out.demandaEscondida = db.prepare('SELECT termo, COUNT(*) AS vezes FROM buscas WHERE created_at >= ? AND resultados = 0 GROUP BY termo HAVING vezes >= 1 ORDER BY vezes DESC LIMIT 10').all(desde);
      } else out.bloqueado.push({ parte: 'buscas', plano: 'realyz', texto: 'O que estão buscando e o que procuram e não acham' });

      // Seu preço contra o mercado (Pro).
      if (plano.mercado && empresa) {
        out.precoMercado = db
          .prepare('SELECT id, name, price, category, classe, subclasse FROM products WHERE company_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 20')
          .all(empresa.id)
          .map((p) => {
            const outros = db
              .prepare("SELECT price FROM products WHERE active = 1 AND company_id != ? AND category = ? AND COALESCE(classe,'') = COALESCE(?, '') AND COALESCE(subclasse,'') = COALESCE(?, '') LIMIT 500")
              .all(empresa.id, p.category, p.classe, p.subclasse)
              .map((x) => x.price);
            if (outros.length < 3) return { nome: p.name, seu: reais(p.price), mercado: null, diferencaPct: null, lojas: outros.length };
            const m = mediana(outros);
            return { nome: p.name, seu: reais(p.price), mercado: reais(m), diferencaPct: Math.round(((p.price - m) / m) * 100), lojas: outros.length };
          });
      } else if (!plano.mercado && empresa) out.bloqueado.push({ parte: 'mercado', plano: 'pro', texto: 'Seu preço contra o mercado' });

      // Horários de pico (Pro).
      if (plano.pico) {
        const horas = (rows) => {
          const h = Array(24).fill(0);
          for (const r of rows) h[new Date(r.created_at).getHours()]++;
          return h;
        };
        out.pico = {
          buscas: horas(db.prepare('SELECT created_at FROM buscas WHERE created_at >= ?').all(desde)),
          pedidos: empresa ? horas(db.prepare('SELECT created_at FROM orders WHERE company_id = ? AND created_at >= ?').all(empresa.id, desde)) : null,
        };
      } else out.bloqueado.push({ parte: 'pico', plano: 'pro', texto: 'Horários de pico de busca e de pedido' });

      return out;
    },
  };
}
