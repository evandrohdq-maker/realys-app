// Biometria facial: o próprio usuário (consentimento, envio, revogação) e a equipe (fila de revisão).
import { fail } from '../http.js';

export default function biometriaRoutes(r, { biometria }) {
  r.get('/biometria', ({ user }) => biometria.status(user.id));
  r.post('/biometria/consentimento', ({ body, user }) => biometria.consent(user.id, body.version));
  // Cadastro: foto do rosto + foto do documento. O servidor compara os dois.
  r.post('/biometria/envio', ({ body, user }) => {
    if (!body.selfie || !body.doc) fail(400, 'Envie a foto do rosto e a foto do documento.');
    const documento = body.documento || {};
    return biometria.submit(user.id, String(body.selfie), String(body.doc), { tipo: documento.tipo, emissao: documento.emissao, validade: documento.validade });
  });
  // Cadastro por scan (primeira coleta): frames do scan + foto do documento (com os dados do documento).
  r.post('/biometria/envio-scan', ({ body, user }) => {
    if (!Array.isArray(body.frames) || !body.doc) fail(400, 'Envie o scan do rosto e a foto do documento.');
    const documento = body.documento || {};
    return biometria.submitScan(user.id, body.frames.map((f) => Buffer.from(String(f), 'base64')), String(body.doc), { tipo: documento.tipo, emissao: documento.emissao, validade: documento.validade });
  });
  // Scan: sequência de fotos (2 a 3 segundos, câmera centralizada). Confere prova de vida pelo movimento.
  r.post('/biometria/verificar-scan', ({ body, query, user }) => {
    if (!Array.isArray(body.frames)) fail(400, 'Envie as fotos do scan.');
    return biometria.verifyScan(user.id, body.frames.map((f) => Buffer.from(String(f), 'base64')), query.purpose || 'periodica', query.callId || null);
  });
  // Verificação do dia a dia: a foto vai no corpo (sem guardar). ?purpose=aceite|finalizacao|periodica&callId=
  r.post('/biometria/verificar', ({ raw, query, user }) => biometria.verify(user.id, raw, query.purpose, query.callId || null), { raw: true });
  r.delete('/biometria', ({ user }) => biometria.revoke(user.id));

  const A = { auth: 'admin' };
  r.get('/admin/biometria', ({ query }) => biometria.queue(query.status || 'em_analise'), A);
  r.post('/admin/biometria/:id/aprovar', ({ params, user, body }) => biometria.decide(params.id, 'aprovar', user.id, body.reason || ''), A);
  r.post('/admin/biometria/:id/recusar', ({ params, user, body }) => biometria.decide(params.id, 'recusar', user.id, body.reason || ''), A);
}
