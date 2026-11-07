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

  // Documentos aceitos: identidade (RG, CNH), versões digitais e carteiras de classe profissional.
  // Documento vencido não vale. Emitido há mais de 10 anos também não.
  const DOC_TYPES = {
    rg: 'RG', rg_digital: 'RG digital', cnh: 'CNH', cnh_digital: 'CNH digital (Carteira Digital de Trânsito)',
    conselho: 'Carteira de conselho profissional (CRM, CREA, OAB, COREN etc.)', brigada: 'Carteira de brigadista',
  };
  function checkDocument(d) {
    if (!d || !DOC_TYPES[d.tipo]) fail(400, 'Documento não aceito. Use RG, CNH, versão digital ou carteira de conselho profissional.', 'documento_invalido');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const emissao = d.emissao ? new Date(d.emissao + 'T00:00:00') : null;
    if (!emissao || isNaN(emissao)) fail(400, 'Informe a data de emissão do documento.', 'documento_invalido');
    const limite = new Date(hoje); limite.setFullYear(limite.getFullYear() - 10);
    if (emissao < limite) fail(400, 'Documento emitido há mais de 10 anos. Envie um documento mais recente.', 'documento_antigo');
    if (d.validade) {
      const validade = new Date(d.validade + 'T00:00:00');
      if (isNaN(validade)) fail(400, 'Data de validade inválida.', 'documento_invalido');
      if (validade < hoje) fail(400, 'Documento vencido. Ele não é válido para o cadastro.', 'documento_vencido');
    }
    return { tipo: d.tipo, emissao: d.emissao, validade: d.validade || null };
  }

  // Cadastro: uma foto só, com a pessoa segurando o documento (sem pedir movimento de cabeça).
  // docId é opcional: se vier, o rosto do documento também é comparado.
  async function submit(userId, selfieId, docId = null, docInfo = null) {
    const r = row(userId);
    if (!r || r.status === 'sem_consentimento' || r.status === 'revogado') fail(403, 'Aceite o termo de biometria antes de enviar as fotos.', 'sem_consentimento');
    if (r.status === 'aprovado') fail(409, 'Seu rosto já está cadastrado.');
    if (r.status === 'em_analise') fail(409, 'Seu envio já está em revisão. Aguarde.');
    checkImage(userId, selfieId, 'do rosto');
    if (docId) checkImage(userId, docId, 'do documento');
    const documento = checkDocument(docInfo);

    setStatus(r.id, 'em_analise', { selfie_media: selfieId, doc_media: docId, submitted_at: now(), reason: null });
    log(userId, 'envio');
    const checks = { documento };
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
    const doc = docId ? readMedia(docId) : null;
    if (!selfie || (docId && !doc)) return { status: 'em_analise', reason: 'Foto não encontrada no servidor. Revisão manual.' };

    const live = await matcher.liveness(selfie);
    checks.prova_de_vida = Number(live.score);
    if (!live.live) return { status: 'recusado', reason: 'Prova de vida não confirmada. Tire a selfie de novo, com boa luz e sem óculos escuros.' };

    const eSelfie = await matcher.embed(selfie);
    if (!eSelfie) return { status: 'em_analise', reason: 'Rosto não encontrado com clareza. Revisão manual.' };
    if (doc) {
      const eDoc = await matcher.embed(doc);
      if (!eDoc) return { status: 'em_analise', reason: 'Rosto não encontrado no documento. Revisão manual.' };
      checks.semelhanca = Math.round(similarity(eSelfie, eDoc) * 1000) / 1000;
      if (checks.semelhanca < cfg.biometricMatchMin) return { status: 'em_analise', reason: 'O rosto da selfie não bate com o do documento. Revisão manual.' };
    } else {
      checks.modo = 'foto_unica';
    }

    const dup = approvedTemplates(userId).find((t) => similarity(t.vec, eSelfie) >= cfg.biometricDupMin);
    if (dup) {
      checks.possivel_duplicado = true; // não guardamos quem é, só o alerta
      return { status: 'em_analise', reason: 'Possível cadastro duplicado. Revisão manual.' };
    }
    return { status: 'aprovado', template: sealVector(eSelfie) };
  }

  const openVec = (tpl) => new Float32Array(new Uint8Array(cipher.open(tpl)).buffer);
  const PURPOSES = ['aceite', 'finalizacao', 'periodica', 'venda', 'saque'];
  const NEEDS_CALL = ['aceite', 'finalizacao', 'venda'];

  // Verificação do dia a dia (aceite, finalização, a cada 2 h). A foto é comparada e apagada na hora:
  // não é guardada em lugar nenhum. Vale uma vez, por pouco tempo, e só para o chamado indicado.
  async function verify(userId, buf, purpose, callId) {
    const r = row(userId);
    if (!r || r.status !== 'aprovado' || !r.template) fail(403, 'Seu rosto ainda não está cadastrado.', 'sem_cadastro');
    if (!PURPOSES.includes(purpose)) fail(400, 'Motivo da verificação inválido.');
    if (NEEDS_CALL.includes(purpose) && !callId) fail(400, 'Informe o chamado ou o pedido da verificação.');
    if (!buf || !buf.length) fail(400, 'Envie a foto.');
    if (!matcher.ready) fail(503, 'Verificação facial indisponível agora. Tente em instantes.', 'servico_fora');
    const live = await matcher.liveness(buf);
    const e = live.live ? await matcher.embed(buf) : null;
    const sim = e ? similarity(openVec(r.template), e) : 0;
    const ok = !!e && sim >= cfg.biometricVerifyMin;
    log(userId, 'verificacao', `${purpose}${callId ? ' ' + callId : ''}: ${ok ? 'ok' : 'falhou'}`);
    if (!ok) fail(403, 'Não reconhecemos o seu rosto. Tente de novo, com boa luz e sem óculos escuros.', 'rosto_nao_confere');
    const t = now();
    db.prepare('INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?,?,?,?,?)').run(newId('ck'), userId, purpose, callId || null, t);
    db.prepare('UPDATE biometria SET last_verified_at = ?, updated_at = ? WHERE id = ?').run(t, t, r.id);
    return { ok: true, purpose, expiresInSec: cfg.biometricCheckTtlMin * 60 };
  }

  // Scan (2 a 3 s, câmera centralizada): várias fotos seguidas. Exige rosto em quase todas,
  // movimento entre elas (foto impressa fica parada) e semelhança média com o cadastro.
  async function verifyScan(userId, frames, purpose, callId) {
    const r = row(userId);
    if (!r || r.status !== 'aprovado' || !r.template) fail(403, 'Seu rosto ainda não está cadastrado.', 'sem_cadastro');
    if (!PURPOSES.includes(purpose)) fail(400, 'Motivo da verificação inválido.');
    if (NEEDS_CALL.includes(purpose) && !callId) fail(400, 'Informe o chamado ou o pedido da verificação.');
    if (!Array.isArray(frames) || frames.length < 3 || frames.length > 8) fail(400, 'O scan precisa de 3 a 8 fotos.');
    if (!matcher.ready) fail(503, 'Verificação facial indisponível agora. Tente em instantes.', 'servico_fora');
    const embs = [];
    for (const f of frames) {
      const live = await matcher.liveness(f);
      if (!live.live) continue;
      const e = await matcher.embed(f);
      if (e) embs.push(e);
    }
    if (embs.length < Math.ceil(frames.length * 0.6)) fail(403, 'Não conseguimos ver seu rosto com clareza. Centralize o rosto e tente de novo.', 'rosto_nao_confere');
    let minPar = 1;
    for (let i = 0; i < embs.length; i++) for (let j = i + 1; j < embs.length; j++) minPar = Math.min(minPar, similarity(embs[i], embs[j]));
    if (embs.length > 1 && minPar > 0.995) fail(403, 'Não detectamos movimento. Faça o scan com o rosto na câmera, sem foto parada.', 'prova_de_vida');
    const media = new Float32Array(embs[0].length);
    for (const e of embs) for (let k = 0; k < e.length; k++) media[k] += e[k] / embs.length;
    const sim = similarity(openVec(r.template), media);
    const ok = sim >= cfg.biometricVerifyMin;
    log(userId, 'verificacao_scan', `${purpose}${callId ? ' ' + callId : ''}: ${ok ? 'ok' : 'falhou'} (${Math.round(sim * 100)}%)`);
    if (!ok) fail(403, 'Não reconhecemos o seu rosto. Tente de novo, com boa luz e sem óculos escuros.', 'rosto_nao_confere');
    const t = now();
    db.prepare('INSERT INTO biometria_checks (id, user_id, purpose, call_id, created_at) VALUES (?,?,?,?,?)').run(newId('ck'), userId, purpose, callId || null, t);
    db.prepare('UPDATE biometria SET last_verified_at = ?, updated_at = ? WHERE id = ?').run(t, t, r.id);
    return { ok: true, purpose, expiresInSec: cfg.biometricCheckTtlMin * 60 };
  }

  // Cadastro por scan (primeira coleta): as fotos do scan não são guardadas. Só o código do rosto
  // (média do scan) e a foto do documento passam pela análise. Mesma regra de 80% com o documento.
  async function submitScan(userId, frames, docId, docInfo) {
    const r = row(userId);
    if (!r || r.status === 'sem_consentimento' || r.status === 'revogado') fail(403, 'Aceite o termo de biometria antes de enviar as fotos.', 'sem_consentimento');
    if (r.status === 'aprovado') fail(409, 'Seu rosto já está cadastrado.');
    if (r.status === 'em_analise') fail(409, 'Seu envio já está em revisão. Aguarde.');
    checkImage(userId, docId, 'do documento');
    const documento = checkDocument(docInfo);
    if (!Array.isArray(frames) || frames.length < 3 || frames.length > 8) fail(400, 'O scan precisa de 3 a 8 fotos.');
    setStatus(r.id, 'em_analise', { doc_media: docId, selfie_media: null, submitted_at: now(), reason: null });
    log(userId, 'envio', 'scan');
    const checks = { documento, modo: 'scan' };
    let result;
    try {
      result = await analyseScan(frames, docId, checks);
    } catch (e) {
      result = { status: 'em_analise', reason: 'Análise automática indisponível. Revisão manual.' };
      checks.erro = String(e.message || e).slice(0, 200);
    }
    if (result.status === 'aprovado' && (await dupOf(userId, result.vec))) {
      checks.possivel_duplicado = true;
      result = { status: 'em_analise', reason: 'Possível cadastro duplicado. Revisão manual.' };
    }
    const fields = { checks: JSON.stringify(checks), reason: result.reason || null };
    if (result.status === 'aprovado') {
      fields.template = sealVector(result.vec);
      fields.template_kid = cipher.currentKid;
      fields.decided_at = now();
      fields.decided_by = 'sistema';
    }
    if (result.status === 'recusado') { fields.decided_at = now(); fields.decided_by = 'sistema'; }
    setStatus(r.id, result.status, fields);
    if (result.status !== 'em_analise') purgeImages(row(userId));
    log(userId, 'decisao', `${result.status}${result.reason ? ': ' + result.reason : ''}`);
    return status(userId);
  }

  // Scan: prova de vida, movimento e média dos rostos, comparada com o documento.
  async function analyseScan(frames, docId, checks) {
    if (!matcher.ready) return { status: 'em_analise', reason: 'Verificação automática desligada. Revisão manual.' };
    if (!cipher.hasKey) return { status: 'em_analise', reason: 'Chave de criptografia não configurada. Revisão manual.' };
    const embs = [];
    let vivas = 0;
    for (const f of frames) {
      const live = await matcher.liveness(f);
      if (!live.live) continue;
      vivas++;
      const e = await matcher.embed(f);
      if (e) embs.push(e);
    }
    if (vivas === 0) return { status: 'recusado', reason: 'Prova de vida não confirmada. Faça o scan de novo, com boa luz.' };
    if (embs.length < Math.ceil(frames.length * 0.6)) return { status: 'em_analise', reason: 'Rosto não encontrado com clareza. Revisão manual.' };
    let minPar = 1;
    for (let i = 0; i < embs.length; i++) for (let j = i + 1; j < embs.length; j++) minPar = Math.min(minPar, similarity(embs[i], embs[j]));
    checks.movimento = Math.round((1 - minPar) * 1000) / 1000;
    if (embs.length > 1 && minPar > 0.995) return { status: 'recusado', reason: 'Não detectamos movimento no scan. Faça de novo, sem foto parada.' };
    const media = new Float32Array(embs[0].length);
    for (const e of embs) for (let k = 0; k < e.length; k++) media[k] += e[k] / embs.length;
    const doc = readMedia(docId);
    if (!doc) return { status: 'em_analise', reason: 'Foto do documento não encontrada. Revisão manual.' };
    const eDoc = await matcher.embed(doc);
    if (!eDoc) return { status: 'em_analise', reason: 'Rosto não encontrado no documento. Revisão manual.' };
    checks.semelhanca = Math.round(similarity(media, eDoc) * 1000) / 1000;
    if (checks.semelhanca < cfg.biometricMatchMin) return { status: 'em_analise', reason: 'O rosto do scan não bate com o do documento. Revisão manual.' };
    return { status: 'aprovado', vec: media };
  }

  async function dupOf(userId, vec) {
    return approvedTemplates(userId).some((t) => similarity(t.vec, vec) >= cfg.biometricDupMin);
  }

  // Aparelho novo: só a conferência do rosto contra o cadastro que já existe (não refaz o cadastro).
  // Recebe a foto e o login, e devolve um código curto que o login usa junto com a senha.
  async function verifyDevice(login, buf, deviceKey, identify) {
    const u = identify(login);
    const r = u ? row(u.id) : null;
    if (!u || !r || r.status !== 'aprovado' || !r.template) fail(403, 'Não encontramos biometria para este usuário neste momento.', 'sem_cadastro');
    if (!deviceKey) fail(400, 'Aparelho não identificado.');
    if (!buf || !buf.length) fail(400, 'Envie a foto.');
    if (!matcher.ready) fail(503, 'Confirmação facial indisponível agora. Tente em instantes.', 'servico_fora');
    const live = await matcher.liveness(buf);
    const e = live.live ? await matcher.embed(buf) : null;
    const sim = e ? similarity(openVec(r.template), e) : 0;
    const ok = !!e && sim >= cfg.biometricVerifyMin;
    log(u.id, 'aparelho_novo', ok ? 'confirmado' : 'falhou');
    if (!ok) fail(403, 'Não reconhecemos o seu rosto. Tente de novo, com boa luz e sem óculos escuros.', 'rosto_nao_confere');
    const token = newId('apt');
    db.prepare('INSERT INTO aparelho_checks (id, user_id, device_key, created_at) VALUES (?,?,?,?)').run(token, u.id, deviceKey, now());
    return { aparelhoToken: token, expiresInSec: cfg.biometricCheckTtlMin * 60 };
  }

  // Login em aparelho novo: o código tem de ser deste usuário, deste aparelho, recente e ainda não usado.
  function consumeDeviceToken(userId, deviceKey, token) {
    const since = now() - cfg.biometricCheckTtlMin * 60000;
    const c = db.prepare('SELECT id FROM aparelho_checks WHERE id = ? AND user_id = ? AND device_key = ? AND used_at IS NULL AND created_at > ?').get(String(token || ''), userId, String(deviceKey || ''), since);
    if (!c) return false;
    db.prepare('UPDATE aparelho_checks SET used_at = ? WHERE id = ?').run(now(), c.id);
    return true;
  }
  const hasBiometria = (userId) => {
    const r = row(userId);
    return !!(r && r.status === 'aprovado');
  };

  // Consome a verificação de uma ação (aceite ou finalização). Sem ela, a ação é recusada.
  function consume(userId, purpose, callId) {
    const since = now() - cfg.biometricCheckTtlMin * 60000;
    const c = db
      .prepare(`SELECT id FROM biometria_checks WHERE user_id = ? AND purpose = ? AND (call_id IS ? OR call_id = ?) AND used_at IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 1`)
      .get(userId, purpose, callId || null, callId || null, since);
    if (!c) {
      const msg = { aceite: 'Confirme seu rosto para aceitar o pedido.', finalizacao: 'Confirme seu rosto para finalizar o serviço.', venda: 'Confirme seu rosto para esta venda.', saque: 'Confirme seu rosto para pedir o saque.' }[purpose] || 'Confirme seu rosto.';
      fail(403, msg, 'verificacao_facial');
    }
    db.prepare('UPDATE biometria_checks SET used_at = ? WHERE id = ?').run(now(), c.id);
    return true;
  }

  // Quem roda em transporte (entregador, motorista, motoboy) precisa de verificação a cada 2 h.
  function periodicOk(userId) {
    const r = row(userId);
    return !!(r && r.last_verified_at && now() - r.last_verified_at < cfg.biometricPeriodicHours * 3600000);
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

  return { consent, submit, submitScan, status, revoke, queue, decide, purgeImages, approvedTemplates, sealVector, setStatus, log, row, readMedia, verify, verifyScan, consume, periodicOk, verifyDevice, consumeDeviceToken, hasBiometria };
}
