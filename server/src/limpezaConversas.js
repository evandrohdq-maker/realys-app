// Espaço das conversas no servidor:
//  - GRUPOS (canais da Arena Gamer, do Hub e das salas): são muitos e com muito vídeo. Cada canal
//    guarda no máximo as últimas 2.000 mensagens, e no dia 1º de cada mês (horário de Brasília) as
//    mensagens de antes do mês, com as fotos e vídeos, são apagadas. Do dia 24 em diante, quem
//    participou recebe o aviso para salvar o canal (exportar) antes.
//  - PARTICULARES (entre duas pessoas): ficam guardadas. Só quando uma conversa passa do limite de
//    espaço (fotos e vídeos), as duas pessoas são avisadas para salvar; 7 dias depois, as mídias
//    mais antigas saem até a conversa voltar a 80% do limite. O texto fica.
//  - Cada pessoa pode limpar uma conversa para ela mesma a qualquer hora.
// Conversas com pedido de preservação (ordem judicial, autoridade, denúncia) não são mexidas.
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { now } from './http.js';

const FUSO_MS = 3 * 3600 * 1000; // Brasília (UTC−3)
const DIA = 86400000;
export const DIA_AVISO = 24;
export const MAX_MSGS_GRUPO = 2000;
export const PRAZO_SALVAR_DIAS = 7;

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
const dataBR = (t) => new Date(t - FUSO_MS).toISOString().slice(0, 10).split('-').reverse().join('/');
const fmt = (t) => new Date(t - FUSO_MS).toISOString().slice(0, 16).replace('T', ' ');
export const par = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function makeLimpezaConversas({ db, hub, cfg }) {
  const mediaDir = join(cfg.dataDir, 'media');
  const limite = Math.round((cfg.conversaLimiteMb || 500) * 1024 * 1024);
  const apagarArquivo = (mediaId) => {
    if (!mediaId) return;
    rmSync(join(mediaDir, mediaId), { force: true });
    db.prepare('DELETE FROM media WHERE id = ?').run(mediaId);
  };
  const preservadoPar = (a, b) => !!db.prepare('SELECT 1 FROM preservacoes WHERE ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?) OR (user_a IN (?, ?) AND user_b IS NULL)) AND ate > ?').get(a, b, b, a, a, b, now());
  const preservadoGrupo = (grupo) => !!db.prepare("SELECT 1 FROM preservacoes WHERE grupo = ? AND ate > ?").get(grupo, now());

  // ---------- grupos ----------
  // Depois de cada mensagem nova: o canal fica com no máximo 2.000 (as mais antigas saem).
  function limitarGrupo(grupo) {
    if (preservadoGrupo(grupo)) return 0;
    const sobra = db.prepare('SELECT id, media_id FROM grupo_msgs WHERE grupo = ? ORDER BY created_at DESC LIMIT -1 OFFSET ?').all(grupo, MAX_MSGS_GRUPO);
    sobra.forEach((m) => {
      apagarArquivo(m.media_id);
      db.prepare('DELETE FROM grupo_msgs WHERE id = ?').run(m.id);
    });
    return sobra.length;
  }

  function avisarGrupos(t = now()) {
    const mes = mesDe(t);
    if (diaDoMes(t) < DIA_AVISO) return { avisados: 0, motivo: 'antes do dia 24' };
    if (db.prepare('SELECT aviso_at FROM limpezas WHERE mes = ?').get(mes)?.aviso_at) return { avisados: 0, motivo: 'já avisado neste mês' };
    const corte = proximoCorte(t);
    const gente = db.prepare('SELECT DISTINCT user_id, grupo FROM grupo_msgs WHERE created_at < ?').all(corte).filter((x) => !preservadoGrupo(x.grupo));
    const pessoas = new Set(gente.map((x) => x.user_id));
    pessoas.forEach((u) => hub.send(u, 'limpeza_grupos', { data: dataBR(corte) }));
    db.prepare('INSERT INTO limpezas (mes, aviso_at) VALUES (?,?) ON CONFLICT(mes) DO UPDATE SET aviso_at = excluded.aviso_at').run(mes, now());
    return { avisados: pessoas.size, data: dataBR(corte) };
  }

  function limparGrupos(t = now()) {
    const mes = mesDe(t);
    if (db.prepare('SELECT limpeza_at FROM limpezas WHERE mes = ?').get(mes)?.limpeza_at) return { apagadas: 0, motivo: 'já limpo neste mês' };
    const corte = inicioDoMes(t);
    let apagadas = 0;
    db.prepare('SELECT id, grupo, media_id FROM grupo_msgs WHERE created_at < ?').all(corte).forEach((m) => {
      if (preservadoGrupo(m.grupo)) return;
      apagarArquivo(m.media_id);
      db.prepare('DELETE FROM grupo_msgs WHERE id = ?').run(m.id);
      apagadas += 1;
    });
    db.prepare('INSERT INTO limpezas (mes, limpeza_at, apagadas) VALUES (?,?,?) ON CONFLICT(mes) DO UPDATE SET limpeza_at = excluded.limpeza_at, apagadas = excluded.apagadas').run(mes, now(), apagadas);
    return { apagadas, corte };
  }

  // ---------- conversas particulares: limite de espaço ----------
  const usoDoPar = (a, b) => db.prepare('SELECT COALESCE(SUM(media_size), 0) AS n FROM messages WHERE media_id IS NOT NULL AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))').get(a, b, b, a).n;
  function espacoParticulares() {
    let avisados = 0;
    let liberado = 0;
    const pares = db.prepare('SELECT MIN(from_id, to_id) AS a, MAX(from_id, to_id) AS b, SUM(media_size) AS n FROM messages WHERE media_id IS NOT NULL GROUP BY MIN(from_id, to_id), MAX(from_id, to_id)').all();
    for (const p of pares) {
      const chave = par(p.a, p.b);
      const aviso = db.prepare('SELECT * FROM avisos_espaco WHERE par = ?').get(chave);
      if (p.n <= limite) {
        if (aviso) db.prepare('DELETE FROM avisos_espaco WHERE par = ?').run(chave);
        continue;
      }
      if (preservadoPar(p.a, p.b)) continue;
      if (!aviso) {
        const apagarEm = now() + PRAZO_SALVAR_DIAS * DIA;
        db.prepare('INSERT INTO avisos_espaco (par, aviso_at, apagar_em) VALUES (?,?,?)').run(chave, now(), apagarEm);
        [p.a, p.b].forEach((u) => hub.send(u, 'limite_conversa', { com: u === p.a ? p.b : p.a, data: dataBR(apagarEm), mb: Math.round(p.n / 1048576) }));
        avisados += 2;
        continue;
      }
      if (now() < aviso.apagar_em) continue;
      // Prazo acabou: tira as mídias mais antigas até a conversa ficar em 80% do limite. O texto fica.
      let uso = p.n;
      const antigas = db.prepare('SELECT id, media_id, media_size FROM messages WHERE media_id IS NOT NULL AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) ORDER BY created_at').all(p.a, p.b, p.b, p.a);
      for (const m of antigas) {
        if (uso <= limite * 0.8) break;
        apagarArquivo(m.media_id);
        db.prepare("UPDATE messages SET media_id = NULL, media_url = NULL, media_size = NULL, text = CASE WHEN text = '' THEN '[mídia apagada: limite de espaço da conversa]' ELSE text || ' [mídia apagada: limite de espaço da conversa]' END WHERE id = ?").run(m.id);
        uso -= m.media_size || 0;
        liberado += m.media_size || 0;
      }
      db.prepare('DELETE FROM avisos_espaco WHERE par = ?').run(chave);
    }
    return { avisados, liberadoMb: Math.round(liberado / 1048576) };
  }

  // ---------- limpar para mim ----------
  function limparParaMim(userId, outroId) {
    db.prepare('UPDATE messages SET hidden_from = 1 WHERE from_id = ? AND to_id = ?').run(userId, outroId);
    db.prepare('UPDATE messages SET hidden_to = 1 WHERE from_id = ? AND to_id = ?').run(outroId, userId);
    // Se os dois limparam, a mensagem sai do servidor (com a mídia), a não ser que esteja preservada.
    if (preservadoPar(userId, outroId)) return { ok: true };
    const sumir = db.prepare('SELECT id, media_id FROM messages WHERE hidden_from = 1 AND hidden_to = 1 AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))').all(userId, outroId, outroId, userId);
    sumir.forEach((m) => {
      apagarArquivo(m.media_id);
      db.prepare('DELETE FROM messages WHERE id = ?').run(m.id);
    });
    return { ok: true, apagadasDoServidor: sumir.length };
  }

  // ---------- exportar ----------
  function exportarParticular(user, outroId, userById) {
    const o = userById(outroId) || { name: 'Conta removida' };
    const msgs = db.prepare('SELECT * FROM messages WHERE ((from_id = ? AND to_id = ? AND hidden_from = 0) OR (from_id = ? AND to_id = ? AND hidden_to = 0)) ORDER BY created_at').all(user.id, outroId, outroId, user.id);
    const linhas = [`Conversa de ${user.name} com ${o.name} no Realyz`, `Exportada em ${fmt(now())} (horário de Brasília)`, ''];
    msgs.forEach((m) => linhas.push(`[${fmt(m.created_at)}] ${m.from_id === user.id ? user.name : o.name}: ${m.text}${m.media_url ? ` (anexo: ${m.media_url})` : ''}`));
    return { texto: linhas.join('\n'), mensagens: msgs.length, midias: msgs.filter((m) => m.media_url).map((m) => m.media_url) };
  }
  function exportarGrupo(grupo, nome, userById) {
    const msgs = db.prepare('SELECT * FROM grupo_msgs WHERE grupo = ? ORDER BY created_at').all(grupo);
    const linhas = [`Canal ${nome || grupo} no Realyz`, `Exportado em ${fmt(now())} (horário de Brasília)`, ''];
    msgs.forEach((m) => linhas.push(`[${fmt(m.created_at)}] ${(userById(m.user_id) || {}).name || 'Alguém'}: ${m.text}${m.media_url ? ` (anexo: ${m.media_url})` : ''}`));
    return { texto: linhas.join('\n'), mensagens: msgs.length, midias: msgs.filter((m) => m.media_url).map((m) => m.media_url) };
  }

  function rodar(t = now()) {
    return { avisoGrupos: avisarGrupos(t), limpezaGrupos: limparGrupos(t), espaco: espacoParticulares() };
  }
  return { limitarGrupo, avisarGrupos, limparGrupos, espacoParticulares, limparParaMim, exportarParticular, exportarGrupo, rodar, usoDoPar, limite };
}
