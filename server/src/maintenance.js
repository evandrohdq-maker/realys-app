// Manutenção do Realys: backup do banco, checagem de integridade, retenção (apagar o que venceu),
// troca de chave de criptografia, limpeza de arquivos soltos e saúde do serviço de IA.
// Roda sozinha todo dia (MAINTENANCE_HOURS) e também pode ser disparada pelo administrador.
import { mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, newId, now } from './http.js';

const DAY = 86400000;

export function makeMaintenance({ db, cfg, cipher, biometria, matcher }) {
  const mediaDir = join(cfg.dataDir, 'media');

  const jobs = {
    // Cópia do banco inteira (VACUUM INTO gera um arquivo novo e consistente, mesmo com o servidor no ar).
    // A chave de criptografia NÃO entra no backup: fica guardada à parte (BIOMETRIA_KEYS).
    backup() {
      mkdirSync(cfg.backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = join(cfg.backupDir, `realys-${stamp}.db`);
      db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
      const files = readdirSync(cfg.backupDir).filter((f) => /^realys-.*\.db$/.test(f)).sort();
      const old = files.slice(0, Math.max(0, files.length - cfg.backupKeep));
      old.forEach((f) => unlinkSync(join(cfg.backupDir, f)));
      return { arquivo: file, mantidos: files.length - old.length, apagados: old.length };
    },

    // Confere se o arquivo do banco não está corrompido e se as ligações entre tabelas estão certas.
    integridade() {
      const r = db.prepare('PRAGMA integrity_check').all().map((x) => x.integrity_check);
      const fk = db.prepare('PRAGMA foreign_key_check').all().length;
      return { ok: r.length === 1 && r[0] === 'ok' && fk === 0, resultado: r.slice(0, 5), ligacoesQuebradas: fk };
    },

    // Retenção: apaga o que o prazo venceu. Revisões paradas viram recusa e as fotos somem.
    retencao() {
      const t = now();
      const logs = db.prepare('DELETE FROM biometria_log WHERE created_at < ?').run(t - cfg.auditKeepDays * DAY).changes;
      const sessoes = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(t).changes;
      const parados = db.prepare(`SELECT * FROM biometria WHERE status = 'em_analise' AND submitted_at < ?`).all(t - cfg.reviewMaxDays * DAY);
      for (const r of parados) {
        biometria.purgeImages(r);
        biometria.setStatus(r.id, 'recusado', { reason: 'A revisão passou do prazo. Envie as fotos de novo.', decided_at: t, decided_by: 'sistema' });
        biometria.log(r.user_id, 'decisao', 'recusado: prazo de revisão expirou');
      }
      return { logsApagados: logs, sessoesApagadas: sessoes, revisoesExpiradas: parados.length };
    },

    // Troca de chave: regrava os vetores guardados com chave antiga usando a chave atual.
    'rotacao-chaves'() {
      if (!cipher.hasKey) return { ok: false, motivo: 'BIOMETRIA_KEYS não configurada' };
      const rows = db.prepare('SELECT id, template FROM biometria WHERE template IS NOT NULL').all();
      let regravados = 0;
      for (const r of rows) {
        if (!cipher.needsRewrap(r.template)) continue;
        const novo = cipher.seal(cipher.open(r.template));
        db.prepare('UPDATE biometria SET template = ?, template_kid = ? WHERE id = ?').run(novo, cipher.currentKid, r.id);
        regravados++;
      }
      return { regravados, chaveAtual: cipher.currentKid };
    },

    // Fotos soltas no disco, sem registro no banco, com mais de 1 dia: apaga.
    'arquivos-orfaos'() {
      if (!existsSync(mediaDir)) return { apagados: 0 };
      const ids = new Set(db.prepare('SELECT id FROM media').all().map((x) => x.id));
      let apagados = 0;
      const limite = now() - DAY;
      for (const f of readdirSync(mediaDir)) {
        if (ids.has(f)) continue;
        const p = join(mediaDir, f);
        if (statSync(p).mtimeMs < limite) {
          unlinkSync(p);
          apagados++;
        }
      }
      return { apagados };
    },

    // Serviço de IA (GPU): está respondendo?
    async 'servico-biometria'() {
      if (!matcher.ready) return { ok: false, motivo: 'BIOMETRIA_SERVICE_URL não configurada' };
      try {
        const h = await matcher.health();
        return { ok: !!h.ok, modelo: h.model, dispositivo: h.device };
      } catch (e) {
        return { ok: false, motivo: String(e.message || e).slice(0, 200) };
      }
    },
  };

  async function run(job) {
    const fn = jobs[job];
    if (!fn) fail(404, 'Rotina de manutenção não existe.');
    const t0 = now();
    let result;
    let ok = true;
    try {
      result = await fn();
      if (result && result.ok === false) ok = false;
    } catch (e) {
      ok = false;
      result = { erro: String(e.message || e).slice(0, 300) };
    }
    result = { ...result, ms: now() - t0 };
    db.prepare('INSERT INTO maintenance_runs (id, job, result, ok, created_at) VALUES (?,?,?,?,?)').run(newId('mr'), job, JSON.stringify(result), ok ? 1 : 0, now());
    return { job, ok, result };
  }

  async function runAll() {
    const out = {};
    for (const j of Object.keys(jobs)) out[j] = await run(j);
    return out;
  }

  function history() {
    return db
      .prepare('SELECT job, result, ok, created_at FROM maintenance_runs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((x) => ({ job: x.job, ok: !!x.ok, result: JSON.parse(x.result), at: x.created_at }));
  }

  let timer = null;
  function start() {
    if (!cfg.maintenanceEnabled || timer) return;
    timer = setInterval(() => runAll().catch(() => {}), cfg.maintenanceHours * 3600000);
    timer.unref();
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { jobs: Object.keys(jobs), run, runAll, history, start, stop };
}
