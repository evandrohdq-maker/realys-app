// Empregos: currículo (com arquivo e leitura automática), vagas, indicação automática, convites e
// candidaturas. Privacidade: a empresa vê os indicados SEM nome ("Garçom experiente · 2 km");
// nome, contato e o arquivo do currículo só aparecem quando a pessoa se candidata ou aceita o convite.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import { fail, newId, now, str, money, oneOf } from '../http.js';
import { TIPOS_CURRICULO, extrairTexto, sugerirDoTexto, FUNCOES } from '../lerCurriculo.js';
import { compatibilidade, perfilCombina, TIPOS_VAGA, FUNCAO_LABEL, NIVEL_N } from '../empregos.js';

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const TURNOS = ['manha', 'tarde', 'noite', 'madrugada'];
const MAX_ARQUIVO = 8 * 1024 * 1024;
const DIA_MS = 24 * 60 * 60 * 1000;
const lista = (v, ok, max = 20) => (Array.isArray(v) ? [...new Set(v.map(String))].filter((x) => !ok || ok.includes(x)).slice(0, max) : []);
const texto = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

export default function empregosRoutes(r, { db, cfg, hub, userById, publicUser }) {
  const dir = join(cfg.dataDir, 'curriculos');
  mkdirSync(dir, { recursive: true });
  const ref = (vagaId, userId) => createHmac('sha256', String(cfg.jwtSecret)).update(`${vagaId}:${userId}`).digest('base64url').slice(0, 16);
  const ler = (s) => {
    try {
      return JSON.parse(s);
    } catch (e) {
      return {};
    }
  };
  const podeAnunciar = (u) => u.kind === 'empresa' || JSON.parse(u.roles || '[]').includes('empresa') || !!db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(u.id);

  // ---------- currículo ----------
  const cvLimpo = (b) => ({
    titulo: texto(b.titulo, 80),
    funcoes: (Array.isArray(b.funcoes) ? b.funcoes : [])
      .filter((f) => f && FUNCOES[f.funcao] && NIVEL_N[f.nivel] != null)
      .slice(0, 12)
      .map((f) => ({ funcao: f.funcao, nivel: f.nivel, anos: Number(f.anos) > 0 ? Math.min(50, Math.round(Number(f.anos))) : null })),
    dias: lista(b.dias, DIAS),
    turnos: lista(b.turnos, TURNOS),
    tipos: lista(b.tipos, TIPOS_VAGA),
    salarioMin: Number(b.salarioMin) > 0 ? Math.round(Number(b.salarioMin)) : null,
    distanciaMax: Math.max(1, Math.min(100, Number(b.distanciaMax) || 15)),
    escolaridade: texto(b.escolaridade, 60),
    experiencia: texto(b.experiencia, 1500),
    cursos: lista(b.cursos, null, 10).map((c) => c.slice(0, 120)),
    itens: lista(b.itens, null, 12).map((c) => c.slice(0, 60)),
    // Fotos da galeria do Realyz que a pessoa escolheu mostrar (trabalhos, certificados).
    fotos: lista(b.fotos, null, 8).filter((u) => /^(https?:\/\/[^\s]+)?\/media\/[A-Za-z0-9_-]+$/.test(u)).map((u) => u.replace(/^https?:\/\/[^/]+/, '')),
    cidade: texto(b.cidade, 80),
  });
  const meuCv = (id) => {
    const c = db.prepare('SELECT * FROM curriculos WHERE user_id = ?').get(id);
    return c ? { ...ler(c.dados), aberto: !!c.aberto, arquivo: c.arquivo_tipo ? { tipo: c.arquivo_tipo, nome: c.arquivo_nome } : null, lat: c.lat, lng: c.lng, updatedAt: c.updated_at } : null;
  };

  r.get('/curriculo', ({ user }) => ({ curriculo: meuCv(user.id) }));

  r.put('/curriculo', ({ body, user }) => {
    const dados = cvLimpo(body || {});
    if (!dados.funcoes.length) fail(400, 'Diga pelo menos uma função que você faz ou pode fazer.');
    const lat = Number.isFinite(Number(body.lat)) && body.lat !== null && body.lat !== '' ? Number(body.lat) : null;
    const lng = Number.isFinite(Number(body.lng)) && body.lng !== null && body.lng !== '' ? Number(body.lng) : null;
    db.prepare(
      `INSERT INTO curriculos (user_id, dados, aberto, lat, lng, updated_at) VALUES (?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET dados = excluded.dados, aberto = excluded.aberto, lat = COALESCE(excluded.lat, curriculos.lat), lng = COALESCE(excluded.lng, curriculos.lng), updated_at = excluded.updated_at`
    ).run(user.id, JSON.stringify(dados), body.aberto === false ? 0 : 1, lat, lng, now());
    return { curriculo: meuCv(user.id) };
  });

  // Anexar o currículo (PDF, Word, ODT, texto ou foto). Devolve o que a leitura achou para a pessoa conferir.
  r.put('/curriculo/arquivo', ({ req, raw, user, query }) => {
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const tipo = TIPOS_CURRICULO[mime];
    if (!tipo) fail(415, 'Envie o currículo em PDF, Word (.docx ou .doc), OpenDocument (.odt), texto ou foto (JPG, PNG).');
    if (!raw.length) fail(400, 'Arquivo vazio.');
    if (raw.length > MAX_ARQUIVO) fail(413, 'Currículo de até 8 MB.');
    writeFileSync(join(dir, user.id), raw);
    const nome = texto(query && query.nome, 120) || `curriculo.${tipo === 'foto' ? 'jpg' : tipo}`;
    const atual = db.prepare('SELECT 1 FROM curriculos WHERE user_id = ?').get(user.id);
    if (atual) db.prepare('UPDATE curriculos SET arquivo_tipo = ?, arquivo_nome = ?, updated_at = ? WHERE user_id = ?').run(mime, nome, now(), user.id);
    else db.prepare('INSERT INTO curriculos (user_id, dados, aberto, arquivo_tipo, arquivo_nome, updated_at) VALUES (?,?,?,?,?,?)').run(user.id, JSON.stringify(cvLimpo({})), 0, mime, nome, now());
    const sugestao = tipo === 'foto' ? { funcoes: [], cursos: [], temTexto: false } : sugerirDoTexto(extrairTexto(raw, tipo));
    return { arquivo: { tipo: mime, nome }, sugestao, foto: tipo === 'foto' };
  }, { raw: true });

  r.post('/curriculo/arquivo/apagar', ({ user }) => {
    rmSync(join(dir, user.id), { force: true });
    db.prepare('UPDATE curriculos SET arquivo_tipo = NULL, arquivo_nome = NULL WHERE user_id = ?').run(user.id);
    return { ok: true };
  });

  // O arquivo: a própria pessoa, ou a empresa de uma vaga em que ela se candidatou / aceitou o convite.
  r.get('/curriculo/:userId/arquivo', ({ params, user, res }) => {
    const c = db.prepare('SELECT arquivo_tipo, arquivo_nome FROM curriculos WHERE user_id = ?').get(params.userId);
    const file = join(dir, String(params.userId));
    if (!c || !c.arquivo_tipo || !existsSync(file)) fail(404, 'Sem currículo anexado.');
    const libera =
      params.userId === user.id ||
      !!db.prepare(`SELECT 1 FROM candidaturas k JOIN vagas v ON v.id = k.vaga_id WHERE k.user_id = ? AND v.empresa_id = ? AND k.status NOT IN ('convidado','recusou')`).get(params.userId, user.id);
    if (!libera) fail(403, 'O currículo aparece quando a pessoa se candidata ou aceita o seu convite.');
    res.writeHead(200, { 'Content-Type': c.arquivo_tipo, 'Content-Disposition': `inline; filename="${encodeURIComponent(c.arquivo_nome || 'curriculo')}"`, 'Cache-Control': 'private, no-store' });
    res.end(readFileSync(file));
  });

  // ---------- vagas ----------
  const vagaLimpa = (b) => {
    const funcao = oneOf(b.funcao, 'a função', Object.keys(FUNCOES));
    return {
      titulo: str(b.titulo, 'o título', { min: 3, max: 80 }),
      funcao,
      nivel: oneOf(b.nivel || 'aprendiz', 'a experiência', Object.keys(NIVEL_N)),
      tipo: oneOf(b.tipo || 'clt', 'o tipo de vaga', TIPOS_VAGA),
      salario: b.salario != null && b.salario !== '' ? money(b.salario, 'o salário') / 100 : null,
      salarioUnidade: oneOf(b.salarioUnidade || 'mes', 'a unidade do salário', ['mes', 'dia', 'hora', 'turno']),
      dias: lista(b.dias, DIAS),
      turnos: lista(b.turnos, TURNOS),
      itens: lista(b.itens, null, 10).map((c) => c.slice(0, 60)),
      descricao: texto(b.descricao, 1500),
      cidade: texto(b.cidade, 80),
      lat: Number.isFinite(Number(b.lat)) && b.lat !== null && b.lat !== '' ? Number(b.lat) : null,
      lng: Number.isFinite(Number(b.lng)) && b.lng !== null && b.lng !== '' ? Number(b.lng) : null,
    };
  };
  const vagaView = (v, extra = {}) => {
    const d = ler(v.dados);
    const e = userById(v.empresa_id);
    return { id: v.id, ...d, funcaoLabel: FUNCAO_LABEL[d.funcao] || d.funcao, empresa: e ? e.name : '', empresaId: v.empresa_id, status: v.status, createdAt: v.created_at, ...extra };
  };

  // Indicados de uma vaga: currículos abertos que fazem a função, do mais compatível para o menos.
  const indicados = (v) => {
    const d = ler(v.dados);
    return db
      .prepare('SELECT * FROM curriculos WHERE aberto = 1 AND user_id != ?')
      .all(v.empresa_id)
      .map((c) => ({ c, cv: ler(c.dados), m: compatibilidade(ler(c.dados), d, c.lat != null ? { lat: c.lat, lng: c.lng } : null) }))
      .filter((x) => x.m.pct > 0 && x.m.apto)
      .sort((a, b) => b.m.pct - a.m.pct);
  };

  // Avisa quem combina, sem virar spam: 1 aviso por dia para quem tem currículo; 1 por semana para
  // quem ainda não tem (pela profissão do perfil), com o convite para ativar o currículo.
  const avisar = (v) => {
    const d = ler(v.dados);
    const pode = (id, janela) => {
      const a = db.prepare('SELECT ultimo_at FROM avisos_vaga WHERE user_id = ?').get(id);
      if (a && now() - a.ultimo_at < janela) return false;
      db.prepare('INSERT INTO avisos_vaga (user_id, ultimo_at) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET ultimo_at = excluded.ultimo_at').run(id, now());
      return true;
    };
    const comCv = new Set();
    indicados(v)
      .slice(0, 30)
      .forEach((x) => {
        comCv.add(x.c.user_id);
        if (pode(x.c.user_id, DIA_MS)) hub.send(x.c.user_id, 'vaga_indicada', { vagaId: v.id, titulo: d.titulo, empresa: (userById(v.empresa_id) || {}).name, pct: x.m.pct });
      });
    db.prepare(`SELECT u.* FROM users u WHERE u.kind = 'pessoa' AND u.status = 'ativo' AND u.id != ? AND NOT EXISTS (SELECT 1 FROM curriculos c WHERE c.user_id = u.id)`)
      .all(v.empresa_id)
      .filter((u) => !comCv.has(u.id) && perfilCombina(u, d))
      .slice(0, 50)
      .forEach((u) => {
        if (pode(u.id, 7 * DIA_MS)) hub.send(u.id, 'vaga_sugerida', { vagaId: v.id, titulo: d.titulo, funcao: FUNCAO_LABEL[d.funcao] || d.funcao });
      });
  };

  r.post('/vagas', ({ body, user }) => {
    if (!podeAnunciar(user)) fail(403, 'Anunciar vaga é para empresas e prestadores.');
    const dados = vagaLimpa(body || {});
    const id = newId('vg');
    db.prepare('INSERT INTO vagas (id, empresa_id, dados, status, created_at) VALUES (?,?,?,?,?)').run(id, user.id, JSON.stringify(dados), 'aberta', now());
    const v = db.prepare('SELECT * FROM vagas WHERE id = ?').get(id);
    avisar(v);
    return vagaView(v, { indicados: indicados(v).length });
  }, { status: 201 });

  // Vagas abertas (para quem procura), com a compatibilidade com o meu currículo.
  r.get('/vagas', ({ user, query }) => {
    const cv = meuCv(user.id);
    const ponto = cv && cv.lat != null ? { lat: cv.lat, lng: cv.lng } : null;
    const minhas = new Map(db.prepare('SELECT vaga_id, status, origem FROM candidaturas WHERE user_id = ?').all(user.id).map((k) => [k.vaga_id, k]));
    let rows = db.prepare(`SELECT * FROM vagas WHERE status = 'aberta' AND empresa_id != ? ORDER BY created_at DESC LIMIT 200`).all(user.id);
    if (query && query.funcao) rows = rows.filter((v) => ler(v.dados).funcao === query.funcao);
    return rows
      .map((v) => {
        const m = cv ? compatibilidade(cv, ler(v.dados), ponto) : null;
        const k = minhas.get(v.id);
        return vagaView(v, { pct: m ? m.pct : null, porques: m ? m.porques : [], minha: k ? { status: k.status, origem: k.origem } : null });
      })
      .sort((a, b) => (b.pct || 0) - (a.pct || 0));
  });

  r.post('/vagas/:id/candidatar', ({ params, user }) => {
    const v = db.prepare(`SELECT * FROM vagas WHERE id = ? AND status = 'aberta'`).get(params.id);
    if (!v) fail(404, 'Vaga não encontrada ou já fechada.');
    if (v.empresa_id === user.id) fail(400, 'A vaga é sua.');
    const cv = meuCv(user.id);
    if (!cv || !(cv.funcoes || []).length) fail(400, 'Complete o seu currículo antes de se candidatar.', 'sem_curriculo');
    const k = db.prepare('SELECT * FROM candidaturas WHERE vaga_id = ? AND user_id = ?').get(v.id, user.id);
    if (k && k.status !== 'convidado') fail(409, 'Você já se candidatou.');
    if (k) db.prepare(`UPDATE candidaturas SET status = 'enviada', updated_at = ? WHERE id = ?`).run(now(), k.id);
    else db.prepare('INSERT INTO candidaturas (id, vaga_id, user_id, origem, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').run(newId('ck'), v.id, user.id, 'candidatou', 'enviada', now(), now());
    hub.send(v.empresa_id, 'candidatura', { vagaId: v.id, titulo: ler(v.dados).titulo, nome: user.name });
    return { ok: true, status: 'enviada' };
  });

  // Empresa: as minhas vagas, com os candidatos (com nome) e os indicados (sem nome).
  const candView = (k, d) => {
    const u = userById(k.user_id);
    const c = db.prepare('SELECT * FROM curriculos WHERE user_id = ?').get(k.user_id);
    const cv = c ? ler(c.dados) : {};
    const m = compatibilidade(cv, d, c && c.lat != null ? { lat: c.lat, lng: c.lng } : null);
    const visivel = !['convidado', 'recusou'].includes(k.status);
    return {
      id: k.id,
      status: k.status,
      origem: k.origem,
      pct: m.pct,
      porques: m.porques,
      ...(visivel
        ? { userId: k.user_id, nome: u.name, foto: u.photo, curriculo: cv, temArquivo: !!(c && c.arquivo_tipo) }
        : { nome: `${FUNCAO_LABEL[d.funcao] || 'Candidato'} · convite enviado` }),
    };
  };
  r.get('/vagas/minhas', ({ user }) =>
    db.prepare('SELECT * FROM vagas WHERE empresa_id = ? ORDER BY created_at DESC').all(user.id).map((v) => {
      const d = ler(v.dados);
      const ks = db.prepare('SELECT * FROM candidaturas WHERE vaga_id = ? ORDER BY updated_at DESC').all(v.id);
      const ja = new Set(ks.map((k) => k.user_id));
      return vagaView(v, {
        candidatos: ks.map((k) => candView(k, d)),
        indicados: indicados(v)
          .filter((x) => !ja.has(x.c.user_id))
          .slice(0, 20)
          .map((x) => {
            const f = (x.cv.funcoes || []).find((y) => y.funcao === d.funcao) || {};
            return {
              ref: ref(v.id, x.c.user_id),
              resumo: `${FUNCAO_LABEL[d.funcao] || d.funcao} ${f.nivel === 'experiente' ? 'experiente' : f.nivel === 'ja-fiz' ? 'com experiência' : 'iniciante'}${x.m.distKm != null ? ` · ${x.m.distKm < 1 ? 'menos de 1' : Math.round(x.m.distKm)} km` : ''}`,
              pct: x.m.pct,
              porques: x.m.porques,
              escolaridade: x.cv.escolaridade || '',
            };
          }),
      });
    })
  );

  // Empresa convida um indicado (sem saber quem é): a pessoa recebe o convite e decide.
  r.post('/vagas/:id/convidar', ({ params, body, user }) => {
    const v = db.prepare(`SELECT * FROM vagas WHERE id = ? AND empresa_id = ? AND status = 'aberta'`).get(params.id, user.id);
    if (!v) fail(404, 'Vaga não encontrada.');
    const alvo = indicados(v).find((x) => ref(v.id, x.c.user_id) === String(body && body.ref));
    if (!alvo) fail(404, 'Essa pessoa não está mais disponível.');
    const uid = alvo.c.user_id;
    if (db.prepare('SELECT 1 FROM candidaturas WHERE vaga_id = ? AND user_id = ?').get(v.id, uid)) fail(409, 'Já convidado.');
    const id = newId('ck');
    db.prepare('INSERT INTO candidaturas (id, vaga_id, user_id, origem, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').run(id, v.id, uid, 'convite', 'convidado', now(), now());
    hub.send(uid, 'vaga_convite', { vagaId: v.id, titulo: ler(v.dados).titulo, empresa: user.name });
    return { ok: true };
  }, { status: 201 });

  // Candidato: convites e candidaturas.
  r.get('/candidaturas', ({ user }) =>
    db.prepare('SELECT k.*, v.dados, v.empresa_id, v.status AS vaga_status, v.created_at AS vaga_at FROM candidaturas k JOIN vagas v ON v.id = k.vaga_id WHERE k.user_id = ? ORDER BY k.updated_at DESC').all(user.id).map((k) =>
      vagaView({ id: k.vaga_id, dados: k.dados, empresa_id: k.empresa_id, status: k.vaga_status, created_at: k.vaga_at }, { candidatura: { id: k.id, status: k.status, origem: k.origem } })
    )
  );
  r.post('/candidaturas/:id/responder', ({ params, body, user }) => {
    const k = db.prepare(`SELECT * FROM candidaturas WHERE id = ? AND user_id = ? AND status = 'convidado'`).get(params.id, user.id);
    if (!k) fail(404, 'Convite não encontrado.');
    const aceita = !!(body && body.aceitar);
    db.prepare('UPDATE candidaturas SET status = ?, updated_at = ? WHERE id = ?').run(aceita ? 'enviada' : 'recusou', now(), k.id);
    const v = db.prepare('SELECT * FROM vagas WHERE id = ?').get(k.vaga_id);
    if (aceita) hub.send(v.empresa_id, 'candidatura', { vagaId: v.id, titulo: ler(v.dados).titulo, nome: user.name, convite: true });
    return { ok: true, status: aceita ? 'enviada' : 'recusou' };
  });

  // Empresa: andamento do candidato (vista, entrevista, contratado, recusado).
  r.post('/candidaturas/:id/status', ({ params, body, user }) => {
    const k = db.prepare('SELECT k.*, v.empresa_id, v.dados FROM candidaturas k JOIN vagas v ON v.id = k.vaga_id WHERE k.id = ?').get(params.id);
    if (!k || k.empresa_id !== user.id) fail(404, 'Candidatura não encontrada.');
    if (['convidado', 'recusou'].includes(k.status)) fail(400, 'A pessoa ainda não aceitou o convite.');
    const status = oneOf(body && body.status, 'o andamento', ['vista', 'entrevista', 'contratado', 'recusado']);
    db.prepare('UPDATE candidaturas SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), k.id);
    hub.send(k.user_id, 'candidatura_status', { vagaId: k.vaga_id, titulo: ler(k.dados).titulo, status });
    return { ok: true, status };
  });

  r.post('/vagas/:id/fechar', ({ params, user }) => {
    const v = db.prepare('SELECT * FROM vagas WHERE id = ? AND empresa_id = ?').get(params.id, user.id);
    if (!v) fail(404, 'Vaga não encontrada.');
    db.prepare(`UPDATE vagas SET status = 'fechada' WHERE id = ?`).run(v.id);
    return { ok: true };
  });

  void publicUser;
}
