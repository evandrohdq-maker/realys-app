// Trava das compras (temporária). Enquanto o Realyz está em teste com usuários reais, tudo que mexe
// com dinheiro fica bloqueado no servidor: comprar, pagar, contratar com pagamento, presentear,
// turbinar, depositar e sacar. O resto do app (perfis, stories, posts, conversas, chamadas, lives,
// cadastro de produtos e serviços) funciona normalmente.
//
// Ligar as compras: COMPRAS_LIBERADAS=true no .env do servidor e reiniciar. Não precisa de APK novo:
// o app pergunta ao servidor (GET /status) e tira o aviso sozinho.
// Em produção vem bloqueado por padrão; nos testes locais vem liberado.
import { HttpError } from './http.js';

export const ROTAS_DE_COMPRA = [
  ['POST', '/orders'], // Shop e Food
  ['POST', '/events/:id/tickets'], // ingressos
  ['POST', '/tracks/comprar'], // músicas
  ['POST', '/calls'], // chamar prestador (retém a taxa de visita)
  ['POST', '/calls/:id/pay'], // pagar o serviço
  ['POST', '/calls/:id/confirmar-visita'],
  ['POST', '/shows/pedidos'], // contratar show (pode reter o valor)
  ['POST', '/shows/pedidos/:id/pagar'],
  ['POST', '/gifts'], // presentes
  ['POST', '/lives/:id/gifts'], // presentes em live
  ['POST', '/wallet/convert-live'],
  ['POST', '/wallet/deposit'], // Pix
  ['POST', '/wallet/withdraw'], // saque
  ['POST', '/turbinar'], // impulsionar é pagamento
  ['POST', '/cargas'], // frete de fornecedor
  ['POST', '/cargas/:id/escolher'],
  ['POST', '/entregas/pedido/:orderId'],
  ['POST', '/ofertas-fornecedor/:id/pedir'],
];
const chave = (method, path) => `${method} ${path}`;
const TRAVADAS = new Set(ROTAS_DE_COMPRA.map(([m, p]) => chave(m, p)));
export const rotaDeCompra = (method, path) => TRAVADAS.has(chave(method, path));

export const MSG_COMPRAS_BLOQUEADAS = 'Compras e pagamentos estão temporariamente bloqueados no Realyz. Em breve liberamos. Todo o resto do app já funciona.';

// O administrador continua podendo testar (ele vê tudo e pode conferir o fluxo).
export function exigirComprasLiberadas(cfg, route, method, roles = [], user = null) {
  if (cfg.comprasLiberadas) return;
  if (!rotaDeCompra(method, route.path)) return;
  if (roles.includes('admin')) return;
  // Conta de teste compra com dinheiro fictício (src/teste.js).
  if (user && user.teste) return;
  throw new HttpError(403, MSG_COMPRAS_BLOQUEADAS, 'compras_bloqueadas');
}
