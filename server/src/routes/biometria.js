// Biometria facial: o próprio usuário (consentimento, envio, revogação) e a equipe (fila de revisão).
import { fail } from '../http.js';

// Vídeos e fotos do scan chegam em base64. Precisam de 2 vídeos e 2 fotos.
const scanOf = (body) => {
  const videos = Array.isArray(body.videos) ? body.videos : [];
  const photos = Array.isArray(body.photos) ? body.photos : [];
  if (videos.length !== 2 || photos.length !== 2) fail(400, 'O scan precisa de 2 vídeos e 2 fotos.');
  return { videos: videos.map((v) => Buffer.from(String(v), 'base64')), photos: photos.map((p) => Buffer.from(String(p), 'base64')) };
};

export default function biometriaRoutes(r, { biometria }) {
  r.get('/biometria', ({ user }) => biometria.status(user.id));
  r.post('/biometria/consentimento', ({ body, user }) => biometria.consent(user.id, body.version));
  // Cadastro: foto do rosto + foto do documento. O servidor compara os dois.
  r.post('/biometria/envio', ({ body, user }) => {
    if (!body.selfie || !body.doc) fail(400, 'Envie a foto do rosto e a foto do documento.');
    const documento = body.documento || {};
    return biometria.submit(user.id, String(body.selfie), String(body.doc), { tipo: documento.tipo, emissao: documento.emissao, validade: documento.validade });
  });
  // Scan (cadastro): 2 vídeos de 3 s + 2 fotos (aproximado e afastado), e a foto do documento com os dados.
  r.post('/biometria/envio-scan', ({ body, user }) => {
    const sc = scanOf(body);
    if (!body.doc) fail(400, 'Envie a foto do documento.');
    const documento = body.documento || {};
    return biometria.submitScan(user.id, sc, String(body.doc), { tipo: documento.tipo, emissao: documento.emissao, validade: documento.validade });
  });
  // Verificação com uma foto só (aparelhos e casos de contingência). A foto vai no corpo e não é guardada.
  r.post('/biometria/verificar', ({ raw, query, user }) => biometria.verify(user.id, raw, query.purpose, query.callId || null), { raw: true });
  // Scan do dia a dia (aceite, finalização, venda, saque, a cada 2 h).
  r.post('/biometria/verificar-scan', ({ body, query, user }) => biometria.verifyScan(user.id, scanOf(body), query.purpose || 'periodica', query.callId || null));
  r.delete('/biometria', ({ user }) => biometria.revoke(user.id));

  const A = { auth: 'admin' };
  r.get('/admin/biometria', ({ query }) => biometria.queue(query.status || 'em_analise'), A);
  r.post('/admin/biometria/:id/aprovar', ({ params, user, body }) => biometria.decide(params.id, 'aprovar', user.id, body.reason || ''), A);
  r.post('/admin/biometria/:id/recusar', ({ params, user, body }) => biometria.decide(params.id, 'recusar', user.id, body.reason || ''), A);
}
