// Trava da biometria no servidor.
// Regra do Realyz: conta sem biometria aprovada é só perfil social. Ela navega, publica e conversa,
// mas não compra, não contrata, não presta serviço e não mexe com dinheiro.
// O app já barra isso na tela; aqui é a trava de verdade (não depende do aplicativo).
// Liga com EXIGIR_BIOMETRIA=true (em produção já vem ligada). Empresas (CNPJ) e o administrador
// não passam por essa trava. Empresa passa: a biometria é a do titular do CNPJ, com o documento dele.
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

export const MSG_ROSTO_DE_NOVO = 'Você trocou a senha. Por segurança, confirme seu rosto de novo para comprar ou contratar.';
export const MSG_SEM_BIOMETRIA = 'Biometria não cadastrada. Por favor, cadastre sua biometria para comprar ou contratar pelo Realyz.';

// A conta pode comprar e contratar?
export function podeComprar(db, cfg, user, roles = []) {
  if (!cfg.exigirBiometria) return true;
  // Empresa também: a biometria é do titular do CNPJ, com o documento dele.
  if (roles.includes('admin')) return true;
  // Conta de teste (dinheiro fictício): testa compras e serviços sem biometria.
  if (user.teste) return true;
  const b = db.prepare('SELECT status FROM biometria WHERE user_id = ?').get(user.id);
  return !!b && b.status === 'aprovado';
}

// Chamado pelo servidor antes de cada rota travada.
export function exigirBiometria(db, cfg, route, method, user, roles) {
  if (!rotaExigeBiometria(method, route.path)) return;
  if (!podeComprar(db, cfg, user, roles)) throw new HttpError(403, MSG_SEM_BIOMETRIA, 'biometria');
  // Trocou a senha pelo "Esqueci a senha": confirma o rosto de novo antes de mexer com dinheiro.
  if (user.rosto_pendente && !(roles || []).includes('admin')) throw new HttpError(403, MSG_ROSTO_DE_NOVO, 'biometria_reconferir');
}

// Prazo da conta sem biometria: 7 dias para navegar; depois disso o app só abre a biometria.
// Enviou a biometria e está em análise? Já libera (a pessoa fez a parte dela).
export const PRAZO_BIO_DIAS = 7;
export const MSG_PRAZO_BIOMETRIA = 'Seus 7 dias para conhecer o Realyz terminaram. Cadastre sua biometria para continuar usando a sua conta.';
const LIVRES_NO_PRAZO = [/^\/auth\//, /^\/biometria/, /^\/me$/, /^\/me\/email\//, /^\/push/, /^\/termos/, /^\/suporte/];
export function prazoBioVencido(db, cfg, user, roles = []) {
  if (!cfg.exigirBiometria || !user) return false;
  if (roles.includes('admin') || user.kind === 'sistema' || user.teste) return false;
  if (!user.prazo_bio || user.prazo_bio > Date.now()) return false;
  const b = db.prepare('SELECT status FROM biometria WHERE user_id = ?').get(user.id);
  return !(b && (b.status === 'aprovado' || b.status === 'em_analise'));
}
export function exigirPrazoBiometria(db, cfg, route, method, user, roles) {
  if (LIVRES_NO_PRAZO.some((re) => re.test(route.path))) return;
  if (prazoBioVencido(db, cfg, user, roles)) throw new HttpError(403, MSG_PRAZO_BIOMETRIA, 'biometria_prazo');
}
