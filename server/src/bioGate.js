// Trava da biometria no servidor.
// Regra do Realyz: conta sem biometria aprovada é só perfil social. Ela navega, publica e conversa,
// mas não compra, não contrata, não presta serviço e não mexe com dinheiro.
// O app já barra isso na tela; aqui é a trava de verdade (não depende do aplicativo).
// Liga com EXIGIR_BIOMETRIA=true (em produção já vem ligada). Empresas (CNPJ) e o administrador
// não passam por essa trava: a empresa é validada pelo CNPJ e pelo termo de empresa.
import { HttpError } from './http.js';

// Rotas que só funcionam com a biometria aprovada: [método, caminho como foi registrado].
export const ROTAS_COM_BIOMETRIA = [
  ['POST', '/orders'], // comprar (Shop e Food)
  ['POST', '/calls'], // chamar prestador
  ['POST', '/calls/:id/pay'], // pagar o serviço
  ['PATCH', '/calls/:id'], // prestador aceitar ou concluir chamado
  ['PUT', '/providers/me'], // oferecer serviço
  ['POST', '/providers/me/location'],
  ['POST', '/wallet/deposit'],
  ['POST', '/wallet/withdraw'],
  ['POST', '/wallet/convert-live'],
  ['POST', '/gifts'], // presentes
  ['POST', '/lives/:id/gifts'], // presentes em live
  ['POST', '/turbinar'], // turbinar (impulsionar) é pagamento
  ['POST', '/shows/pedidos/:id/pagar'], // fechar show de artista (a contratação direta é travada dentro da rota)
];
const chave = (method, path) => `${method} ${path}`;
const TRAVADAS = new Set(ROTAS_COM_BIOMETRIA.map(([m, p]) => chave(m, p)));
export const rotaExigeBiometria = (method, path) => TRAVADAS.has(chave(method, path));

export const MSG_SEM_BIOMETRIA = 'Biometria não cadastrada. Por favor, cadastre sua biometria para comprar ou contratar pelo Realyz.';

// A conta pode comprar e contratar?
export function podeComprar(db, cfg, user, roles = []) {
  if (!cfg.exigirBiometria) return true;
  if (roles.includes('admin') || user.kind === 'empresa') return true;
  // Conta de teste (dinheiro fictício): testa compras e serviços sem biometria.
  if (user.teste) return true;
  const b = db.prepare('SELECT status FROM biometria WHERE user_id = ?').get(user.id);
  return !!b && b.status === 'aprovado';
}

// Chamado pelo servidor antes de cada rota travada.
export function exigirBiometria(db, cfg, route, method, user, roles) {
  if (!rotaExigeBiometria(method, route.path)) return;
  if (!podeComprar(db, cfg, user, roles)) throw new HttpError(403, MSG_SEM_BIOMETRIA, 'biometria');
}
