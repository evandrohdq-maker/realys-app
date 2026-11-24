// Editor de vídeo: assinatura (1º mês grátis), gerar vídeo (fila), acompanhar e as gravações das lives.
import { temTrabalho } from '../trabalho.js';

export default function edicaoRoutes(r, { db, cfg, edicao, gravador }) {
  r.get('/edicao/plano', ({ user, roles }) => ({ ...edicao.view(user.id), artista: temTrabalho(db, user, 'artista', roles, cfg) }));
  r.post('/edicao/assinar', ({ user }) => edicao.assinar(user.id));
  r.post('/edicao/cancelar', ({ user }) => edicao.cancelar(user.id));
  // Gera o vídeo. Artista pode fazer clipe de até 6 minutos; os outros, até 3.
  r.post('/edicao/videos', ({ user, roles, body }) => edicao.criar(user, body, { artista: temTrabalho(db, user, 'artista', roles, cfg) }), { status: 201 });
  r.get('/edicao/videos', ({ user }) => edicao.listar(user.id));
  r.get('/edicao/videos/:id', ({ user, params }) => edicao.um(user.id, params.id));
  // Gravações das minhas lives (7 dias), para tirar cortes.
  r.get('/edicao/gravacoes', ({ user }) => gravador.minhas(user.id));
}
