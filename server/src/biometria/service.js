// Cadastro biométrico do Realys: consentimento -> envio (rosto + documento) -> análise -> decisão.
// Regras de segurança:
// - O vetor do rosto é guardado CIFRADO. As fotos são apagadas assim que a decisão é tomada.
// - Só entra como "aprovado" quando a prova de vida passa, o rosto do documento bate com o do envio
//   e não existe outro cadastro aprovado com o mesmo rosto. Qualquer dúvida vai para revisão humana.
// - Sem o serviço de IA ligado, nada é aprovado automaticamente: tudo vai para revisão humana.
// - A pessoa pode revogar a qualquer hora: o vetor e as fotos são apagados na hora.
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, newId, now } from '../http.js';
import { similarity } from './matcher.js';

export const CONSENT_VERSION = '2026-11-v1';

export function makeBiometria({ db, cfg, matcher, cipher }) {
  const mediaDir = join(cfg.dataDir, 'media');
  const row = (userId) => db.prepare('SELECT * FROM biometria WHERE user_id = ?').get(userId);
  const log = (userId, event, detail = '') =>
    db.prepare('INSERT INTO biometria_log (id, user_id, event, detail, created_at) VALUES (?,?,?,?,?)').run(newId('bl'), userId, event, detail, now());
  const readMedia = (id) => {
    const f = join(mediaDir, id);
    return existsSync(f) ? readFileSync(f) : null;
  };

  // Apaga as fotos (rosto e documento) do disco e do banco.
  function purgeImages(r) {
    for (const id of [r.selfie_media, r.doc_media]) {
      if (!id) continue;
      try { unlinkSync(join(mediaDir, id)); } catch (e) { /* já não existe */ }
      db.prepare('DELETE FROM media WHERE id = ?').run(id);
    }
    db.prepare('UPDATE biometria SET selfie_media = NULL, doc_media = NULL WHERE id = ?').run(r.id);
  }

  // Vetores de todos os cadastros aprovados (decifrados só na hora da comparação).
  function approvedTemplates(exceptUserId) {
    return db
      .prepare(`SELECT user_id, template FROM biometria WHERE status = 'aprovado' AND template IS NOT NULL AND user_id != ?`)
      .all(exceptUserId)
      .map((x) => ({ user_id: x.user_id, vec: new Float32Array(new Uint8Array(cipher.open(x.template)).buffer) }));
  }
  const sealVector = (vec) => cipher.seal(Buffer.from(new Uint8Array(vec.buffer)));

  function ensureRow(userId) {
    const r = row(userId);
    if (r) return r;
    db.prepare(`INSERT INTO biometria (id, user_id, status, updated_at) VALUES (?,?,'sem_consentimento',?)`).run(newId('bio'), userId, now());
    return row(userId);
  }

  function setStatus(id, status, fields = {}) {
    const cols = Object.keys(fields);
    const sets = ['status = ?', 'updated_at = ?', ...cols.map((c) => `${c} = ?`)].join(', ');
    db.prepare(`UPDATE biometria SET ${sets} WHERE id = ?`).run(status, now(), ...cols.map((c) => fields[c]), id);
  }

  function consent(userId, version) {
    if (version !== CONSENT_VERSION) fail(400, 'Versão do termo mudou. Leia o termo atualizado e aceite de novo.', 'termo_mudou');
    const r = ensureRow(userId);
    if (r.status === 'aprovado') fail(409, 'Seu rosto já está cadastrado.');
    setStatus(r.id, 'pendente', { consent_version: version, consent_at: now() });
    log(userId, 'consentimento', version);
    return status(userId);
  }

  // Confere se a mídia é do usuário e é uma imagem.
  function checkImage(userId, mediaId, label) {
    const m = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
    if (!m || m.owner_id !== userId) fail(400, `Foto ${label} não encontrada. Envie de novo.`);
    if (!m.mime.startsWith('image/')) fail(415, `A foto ${label} precisa ser imagem (JPG, PNG ou WEBP).`);
    return m;
  }

  async function submit(userId, selfieId, docId) {
    const r = row(userId);
    if (!r || r.status === 'sem_consentimento' || r.status === 'revogado') fail(403, 'Aceite o termo de biometria antes de enviar as fotos.', 'sem_consentimento');
    if (r.status === 'aprovado') fail(409, 'Seu rosto já está cadastrado.');
    if (r.status === 'em_analise') fail(409, 'Seu envio já está em revisão. Aguarde.');
    checkImage(userId, selfieId, 'do rosto');
    checkImage(userId, docId, 'do documento');

    setStatus(r.id, 'em_analise', { selfie_media: selfieId, doc_media: docId, submitted_at: now(), reason: null });
    log(userId, 'envio');
    const checks = {};
    let result;
    try {
      result = await analyse(userId, selfieId, docId, checks);
    } catch (e) {
      // Falha técnica (serviço fora do ar, GPU ocupada): fica para revisão humana, nunca aprova sozinho.
      result = { status: 'em_analise', reason: 'Análise automática indisponível. Revisão manual.' };
      checks.erro = String(e.message || e).slice(0, 200);
    }
    const fields = { checks: JSON.stringify(checks), reason: result.reason || null };
    if (result.status === 'aprovado') {
      fields.template = result.template;
      fields.template_kid = cipher.currentKid;
      fields.decided_at = now();
      fields.decided_by = 'sistema';
    }
    if (result.status === 'recusado') {
      fields.decided_at = now();
      fields.decided_by = 'sistema';
    }
    setStatus(r.id, result.status, fields);
    if (result.status !== 'em_analise') purgeImages(row(userId));
    log(userId, 'decisao', `${result.status}${result.reason ? ': ' + result.reason : ''}`);
    return status(userId);
  }

  async function analyse(userId, selfieId, docId, checks) {
    if (!matcher.ready) return { status: 'em_analise', reason: 'Verificação automática desligada. Revisão manual.' };
    if (!cipher.hasKey) return { status: 'em_analise', reason: 'Chave de criptografia não configurada. Revisão manual.' };

    const selfie = readMedia(selfieId);
    const doc = readMedia(docId);
    if (!selfie || !doc) return { status: 'em_analise', reason: 'Foto não encontrada no servidor. Revisão manual.' };

    const live = await matcher.liveness(selfie);
    checks.prova_de_vida = Number(live.score);
    if (!live.live) return { status: 'recusado', reason: 'Prova de vida não confirmada. Tire a selfie de novo, com boa luz e sem óculos escuros.' };

    const eSelfie = await matcher.embed(selfie);
    const eDoc = await matcher.embed(doc);
    if (!eSelfie || !eDoc) return { status: 'em_analise', reason: 'Rosto não encontrado com clareza. Revisão manual.' };

    checks.semelhanca = Math.round(similarity(eSelfie, eDoc) * 1000) / 1000;
    if (checks.semelhanca < cfg.biometricMatchMin) return { status: 'em_analise', reason: 'O rosto da selfie não bate com o do documento. Revisão manual.' };

    const dup = approvedTemplates(userId).find((t) => similarity(t.vec, eSelfie) >= cfg.biometricDupMin);
    if (dup) {
      checks.possivel_duplicado = true; // não guardamos quem é, só o alerta
      return { status: 'em_analise', reason: 'Possível cadastro duplicado. Revisão manual.' };
    }
    return { status: 'aprovado', template: sealVector(eSelfie) };
  }

  function status(userId) {
    const r = row(userId);
    if (!r) return { status: 'sem_consentimento' };
    return {
      status: r.status,
      consentVersion: r.consent_version,
      consentAt: r.consent_at,
      submittedAt: r.submitted_at,
      decidedAt: r.decided_at,
      reason: r.reason,
    };
  }

  // Revogação (direito de exclusão da LGPD): apaga o vetor e as fotos na hora.
  function revoke(userId) {
    const r = row(userId);
    if (!r) fail(404, 'Você não tem cadastro biométrico.');
    purgeImages(r);
    setStatus(r.id, 'revogado', { template: null, template_kid: null, checks: null, reason: null });
    log(userId, 'revogacao');
    return status(userId);
  }

  // Para a equipe: fila de revisão, com as fotos para conferir.
  function queue(statusFilter = 'em_analise') {
    return db
      .prepare(`SELECT b.id, b.user_id, b.status, b.checks, b.reason, b.selfie_media, b.doc_media, b.submitted_at, u.name
                FROM biometria b JOIN users u ON u.id = b.user_id WHERE b.status = ? ORDER BY b.submitted_at`)
      .all(statusFilter)
      .map((x) => ({
        id: x.id,
        userId: x.user_id,
        name: x.name,
        status: x.status,
        checks: x.checks ? JSON.parse(x.checks) : {},
        reason: x.reason,
        submittedAt: x.submitted_at,
        selfieUrl: x.selfie_media ? `/media/${x.selfie_media}` : null,
        docUrl: x.doc_media ? `/media/${x.doc_media}` : null,
      }));
  }

  // Decisão humana. Aprovar sem serviço de IA fica sem vetor (não há como checar duplicado depois).
  async function decide(bioId, action, adminId, reason = '') {
    const r = db.prepare('SELECT * FROM biometria WHERE id = ?').get(bioId);
    if (!r) fail(404, 'Cadastro não encontrado.');
    if (r.status !== 'em_analise') fail(409, 'Este cadastro já foi decidido.');
    if (action === 'aprovar') {
      let template = null;
      const buf = r.selfie_media && matcher.ready && cipher.hasKey ? readMedia(r.selfie_media) : null;
      if (buf) {
        const e = await matcher.embed(buf);
        if (e) template = sealVector(e);
      }
      setStatus(r.id, 'aprovado', { template, template_kid: template ? cipher.currentKid : null, reason: reason || null, decided_at: now(), decided_by: adminId });
    } else {
      if (!reason) fail(400, 'Diga o motivo da recusa.');
      setStatus(r.id, 'recusado', { reason, decided_at: now(), decided_by: adminId });
    }
    purgeImages(db.prepare('SELECT * FROM biometria WHERE id = ?').get(bioId));
    log(r.user_id, 'decisao', `${action === 'aprovar' ? 'aprovado' : 'recusado'} pela equipe${reason ? ': ' + reason : ''}`);
    return { ok: true };
  }

  return { consent, submit, status, revoke, queue, decide, purgeImages, approvedTemplates, sealVector, setStatus, log, row, readMedia };
}
