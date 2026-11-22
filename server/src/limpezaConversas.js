// Limpeza mensal das conversas: no dia 1º de cada mês (horário de Brasília), as mensagens de antes
// desse dia são apagadas do servidor, sem cópia guardada pelo Realyz. A partir do dia 24 do mês
// anterior, cada pessoa com mensagens que vão ser apagadas recebe um aviso para salvar as conversas
// no celular ou mandar por e-mail (GET /conversas/exportar).
// Ficam fora da limpeza, até acabar o motivo:
//   - conversas entre quem tem pedido, entrega, serviço ou show em andamento ou concluído há menos
//     de 30 dias (prova para a Garantia Realyz);
//   - conversas com pedido de preservação (ordem judicial, autoridade ou denúncia em apuração).
// Os registros de acesso (Marco Civil, art. 15) não são conversas e continuam guardados à parte.
import { now } from './http.js';

const FUSO_MS = 3 * 3600 * 1000; // Brasília (UTC−3)
const GARANTIA_MS = 30 * 86400000;
export const DIA_AVISO = 24;

// Início do mês (00:00 de Brasília) do instante t, em ms UTC.
export function inicioDoMes(t = now()) {
  const d = new Date(t - FUSO_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) + FUSO_MS;
}
export const mesDe = (t = now()) => new Date(t - FUSO_MS).toISOString().slice(0, 7);
export const diaDoMes = (t = now()) => new Date(t - FUSO_MS).getUTCDate();
export const proximoCorte = (t = now()) => {
  const d = new Date(t - FUSO_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) + FUSO_MS;
};

export function makeLimpezaConversas({ db, hub }) {
  // Duas pessoas com negócio recente entre elas (a conversa vira prova).
  const negocioRecente = (a, b, desde) =>
    !!db.prepare(`SELECT 1 FROM orders o JOIN companies c ON c.id = o.company_id WHERE ((o.buyer_id = ? AND c.owner_id = ?) OR (o.buyer_id = ? AND c.owner_id = ?)) AND (o.status NOT IN ('Entregue','Cancelado') OR o.updated_at > ?) LIMIT 1`).get(a, b, b, a, desde) ||
    !!db.prepare(`SELECT 1 FROM service_calls WHERE ((client_id = ? AND provider_id = ?) OR (client_id = ? AND provider_id = ?)) AND updated_at > ? LIMIT 1`).get(a, b, b, a, desde) ||
    !!db.prepare(`SELECT 1 FROM show_pedidos WHERE ((client_id = ? AND artist_id = ?) OR (client_id = ? AND artist_id = ?)) AND updated_at > ? LIMIT 1`).get(a, b, b, a, desde) ||
    !!db.prepare(`SELECT 1 FROM entregas WHERE ((loja_id = ? AND (cliente_id = ? OR entregador_id = ?)) OR (loja_id = ? AND (cliente_id = ? OR entregador_id = ?)) OR (cliente_id = ? AND entregador_id = ?) OR (cliente_id = ? AND entregador_id = ?)) AND (status NOT IN ('entregue','cancelada') OR updated_at > ?) LIMIT 1`).get(a, b, b, b, a, a, a, b, b, a, desde);
  const preservada = (a, b) => !!db.prepare('SELECT 1 FROM preservacoes WHERE ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b IS NULL) OR (user_a = ? AND user_b IS NULL)) AND ate > ?').get(a, b, b, a, a, b, now());

  // Pares (a, b) com mensagens antes do corte que podem ser apagadas.
  function paresParaApagar(corte) {
    const desde = now() - GARANTIA_MS;
    return db
      .prepare('SELECT DISTINCT MIN(from_id, to_id) AS a, MAX(from_id, to_id) AS b FROM messages WHERE created_at < ?')
      .all(corte)
      .filter((p) => !negocioRecente(p.a, p.b, desde) && !preservada(p.a, p.b));
  }

  // Aviso (a partir do dia 24): uma vez por mês, para quem tem mensagem que vai sair.
  function avisar(t = now()) {
    const mes = mesDe(t);
    if (diaDoMes(t) < DIA_AVISO) return { avisados: 0, motivo: 'antes do dia 24' };
    if (db.prepare('SELECT aviso_at FROM limpezas WHERE mes = ?').get(mes)?.aviso_at) return { avisados: 0, motivo: 'já avisado neste mês' };
    const corte = proximoCorte(t);
    const pessoas = new Set();
    paresParaApagar(corte).forEach((p) => (pessoas.add(p.a), pessoas.add(p.b)));
    const data = new Date(corte - FUSO_MS).toISOString().slice(0, 10).split('-').reverse().join('/');
    pessoas.forEach((u) => hub.send(u, 'limpeza_conversas', { data }));
    db.prepare('INSERT INTO limpezas (mes, aviso_at) VALUES (?,?) ON CONFLICT(mes) DO UPDATE SET aviso_at = excluded.aviso_at').run(mes, now());
    return { avisados: pessoas.size, data };
  }

  // Limpeza: uma vez por mês, apaga as mensagens de antes do início do mês atual.
  function limpar(t = now()) {
    const mes = mesDe(t);
    if (db.prepare('SELECT limpeza_at FROM limpezas WHERE mes = ?').get(mes)?.limpeza_at) return { apagadas: 0, motivo: 'já limpo neste mês' };
    const corte = inicioDoMes(t);
    let apagadas = 0;
    const del = db.prepare('DELETE FROM messages WHERE created_at < ? AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))');
    for (const p of paresParaApagar(corte)) apagadas += del.run(corte, p.a, p.b, p.b, p.a).changes;
    db.prepare('INSERT INTO limpezas (mes, limpeza_at, apagadas) VALUES (?,?,?) ON CONFLICT(mes) DO UPDATE SET limpeza_at = excluded.limpeza_at, apagadas = excluded.apagadas').run(mes, now(), apagadas);
    return { apagadas, corte };
  }

  // Exportar: todas as minhas conversas em texto (para salvar no celular ou mandar por e-mail).
  function exportar(user, userById) {
    const msgs = db.prepare('SELECT * FROM messages WHERE from_id = ? OR to_id = ? ORDER BY created_at').all(user.id, user.id);
    const porPessoa = new Map();
    for (const m of msgs) {
      const outro = m.from_id === user.id ? m.to_id : m.from_id;
      if (!porPessoa.has(outro)) porPessoa.set(outro, []);
      porPessoa.get(outro).push(m);
    }
    const fmt = (t) => new Date(t - FUSO_MS).toISOString().slice(0, 16).replace('T', ' ');
    const partes = [`Conversas de ${user.name} no Realyz`, `Exportado em ${fmt(now())} (horário de Brasília)`, ''];
    for (const [outro, lista] of porPessoa) {
      const o = userById(outro) || { name: 'Conta removida' };
      partes.push(`===== Conversa com ${o.name} =====`);
      lista.forEach((m) => partes.push(`[${fmt(m.created_at)}] ${m.from_id === user.id ? user.name : o.name}: ${m.text}`));
      partes.push('');
    }
    return { texto: partes.join('\n'), conversas: porPessoa.size, mensagens: msgs.length, proximaLimpeza: proximoCorte() };
  }

  return { avisar, limpar, exportar, paresParaApagar };
}
