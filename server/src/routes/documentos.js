// Conferência de documentos: cada contrato ou receita assinado pelo Re@lys ganha um código curto e um
// QR Code no PDF. Quem recebe o papel abre /v/<código> e vê se o documento confere com o registrado
// (pela impressão digital do conteúdo, o hash), quem são as partes e quando cada uma assinou.
// Assinatura sob coação: a página mostra "em análise" (nunca "coação", para não pôr ninguém em risco)
// e o documento não vale até a apuração.
import { createHash, randomBytes } from 'node:crypto';
import { fail, now } from '../http.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const code = () => randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toUpperCase();
const dt = (t) => (t ? new Date(t).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

export default function documentosRoutes(r, { db }) {
  r.post('/documentos', ({ body, user }) => {
    const hash = String(body.hash || '').trim();
    if (!/^[a-f0-9]{16,128}$/i.test(hash)) fail(400, 'Impressão digital do documento inválida.');
    const tipo = body.tipo === 'receita' ? 'receita' : 'contrato';
    const partes = (Array.isArray(body.partes) ? body.partes : []).slice(0, 6).map((p) => ({ papel: String(p.papel || '').slice(0, 40), nome: String(p.nome || '').slice(0, 80), assinadoEm: Number(p.assinadoEm) || null, metodo: String(p.metodo || '').slice(0, 20) || null }));
    const c = code();
    db.prepare('INSERT INTO documentos (codigo, owner_id, hash, tipo, titulo, partes, coacao, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(c, user.id, hash, tipo, String(body.titulo || '').slice(0, 120) || 'Documento', JSON.stringify(partes), body.coacao ? 1 : 0, now(), now());
    return { codigo: c, url: `/v/${c}` };
  }, { status: 201 });

  // Atualiza assinaturas (ou marca coação) do documento que a pessoa registrou.
  r.post('/documentos/:codigo', ({ params, body, user }) => {
    const d = db.prepare('SELECT * FROM documentos WHERE codigo = ?').get(params.codigo);
    if (!d || d.owner_id !== user.id) fail(404, 'Documento não encontrado.');
    const partes = Array.isArray(body.partes) ? body.partes.slice(0, 6).map((p) => ({ papel: String(p.papel || '').slice(0, 40), nome: String(p.nome || '').slice(0, 80), assinadoEm: Number(p.assinadoEm) || null, metodo: String(p.metodo || '').slice(0, 20) || null })) : JSON.parse(d.partes);
    db.prepare('UPDATE documentos SET partes = ?, coacao = MAX(coacao, ?), hash = COALESCE(?, hash), updated_at = ? WHERE codigo = ?').run(JSON.stringify(partes), body.coacao ? 1 : 0, body.hash && /^[a-f0-9]{16,128}$/i.test(body.hash) ? body.hash : null, now(), d.codigo);
    return { ok: true };
  });

  // Conferir pelo conteúdo: quem tem o PDF manda o hash e vê se bate.
  r.get('/documentos/:codigo/confere', ({ params, query }) => {
    const d = db.prepare('SELECT * FROM documentos WHERE codigo = ?').get(params.codigo);
    if (!d) fail(404, 'Código não encontrado.');
    return { confere: !!query && String(query.hash || '').toLowerCase() === d.hash.toLowerCase() };
  }, { auth: false });

  // Página pública do QR Code.
  r.get('/v/:codigo', ({ params, res }) => {
    const d = db.prepare('SELECT * FROM documentos WHERE codigo = ?').get(String(params.codigo).toUpperCase());
    const page = (title, color, inner) => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re@lys · conferência</title><body style="font-family:system-ui,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;color:#1b1b1f"><h1 style="font-size:20px">Re@lys · conferência de documento</h1><p style="font-size:18px;font-weight:700;color:${color}">${title}</p>${inner}<p style="color:#777;font-size:12px;margin-top:28px">A conferência mostra o que foi registrado no Re@lys. Receitas de medicamentos controlados e contratos que exigem cartório também precisam de assinatura ICP-Brasil.</p></body></html>`;
    let html;
    if (!d) html = page('Código não encontrado', '#C0392B', '<p>Confira o código impresso no documento.</p>');
    else if (d.coacao) html = page('Documento em análise', '#C77D12', `<p>${esc(d.titulo)}</p><p>Este documento está em análise e ainda não tem validade. Procure o suporte do Re@lys.</p>`);
    else {
      const partes = JSON.parse(d.partes);
      const todas = partes.length && partes.every((p) => p.assinadoEm);
      const lis = partes.map((p) => `<li><b>${esc(p.papel)}</b>: ${esc(p.nome)} — ${p.assinadoEm ? `assinou em ${esc(dt(p.assinadoEm))}${p.metodo ? ` (${esc(p.metodo)})` : ''}` : 'ainda não assinou'}</li>`).join('');
      html = page(todas ? 'Documento registrado e assinado por todas as partes' : 'Documento registrado, aguardando assinaturas', todas ? '#1E9E63' : '#C77D12', `<p>${esc(d.titulo)}</p><ul>${lis}</ul><p style="font-size:12px;color:#555">Impressão digital: <code>${esc(d.hash.slice(0, 16))}…</code> · registrado em ${esc(dt(d.created_at))}</p>`);
    }
    res.writeHead(d ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  }, { auth: false });
}

export const hashOfText = (s) => createHash('sha256').update(String(s)).digest('hex');
