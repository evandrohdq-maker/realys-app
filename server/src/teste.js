// Contas de teste com dinheiro fictício.
// Uma conta de teste (users.teste = 1, criada pelo administrador) não passa pela trava de biometria nem
// pela trava de compras: ela compra, contrata, presenteia e deposita para testar o app inteiro.
// O dinheiro dela é de mentira, então nunca pode virar dinheiro de verdade:
//  - depósito entra na hora como "fictício" (nunca gera Pix no banco);
//  - saque não existe;
//  - dinheiro saindo de uma conta de teste só pode chegar em outra conta de teste;
//  - taxas que iriam para o caixa do Realyz e notas fiscais não acontecem.
// Cada pedido de uma conta de teste roda "marcado" (AsyncLocalStorage); a carteira e a parte fiscal
// conferem a marca, então nenhuma rota escapa da regra.
import { AsyncLocalStorage } from 'node:async_hooks';
import { HttpError } from './http.js';

const ctx = new AsyncLocalStorage();
export const ehTeste = (u) => !!(u && u.teste);
export const rodarComoTeste = (user, fn) => (ehTeste(user) ? ctx.run({ teste: true, userId: user.id }, fn) : fn());
export const emTeste = () => !!(ctx.getStore() && ctx.getStore().teste);
export const MSG_SO_TESTE = 'Conta de teste: o dinheiro é fictício e só pode ir para outras contas de teste.';

// Liga a regra na carteira e na parte fiscal (chamado uma vez, ao montar o servidor).
export function protegerDinheiroDeTeste(db, wallet, fiscal) {
  const isTesteId = (id) => !!db.prepare('SELECT 1 FROM users WHERE id = ? AND teste = 1').get(id);
  const moveOriginal = wallet.move;
  wallet.move = (userId, bucket, amount, cat, description, ref) => {
    if (emTeste() && amount && userId !== ctx.getStore().userId && !isTesteId(userId)) {
      // Taxa para o caixa do Realyz: simplesmente não acontece (seria dinheiro de mentira no caixa).
      if (userId === 'realys') return;
      // Entrando na conta de uma pessoa real: recusado.
      if (amount > 0) throw new HttpError(403, MSG_SO_TESTE, 'conta_teste');
    }
    return moveOriginal(userId, bucket, amount, cat, description, ref);
  };
  // "pay" chama o move de dentro dele mesmo: refaz por cima para usar o move protegido.
  wallet.pay = (userId, total, cat, description, ref) => {
    const w = wallet.get(userId);
    if (w.gift_credits + w.balance < total) throw new HttpError(402, 'Saldo insuficiente para esta compra.', 'saldo_insuficiente');
    const fromGift = Math.min(w.gift_credits, total);
    const fromWallet = total - fromGift;
    wallet.move(userId, 'presente', -fromGift, cat, description, ref);
    wallet.move(userId, 'saldo', -fromWallet, cat, description, ref);
    return { fromGift, fromWallet };
  };
  if (fiscal && fiscal.registrar) {
    const registrarOriginal = fiscal.registrar;
    fiscal.registrar = (...args) => (emTeste() ? null : registrarOriginal(...args));
  }
}

// Conta de teste comprando, contratando ou pedindo: a outra ponta também tem que ser de teste.
// (O dinheiro fica retido no caixa e só depois vai para a loja/prestador; por isso a regra vale na entrada.)
export function exigirParceiroDeTeste(db, outroId) {
  if (!emTeste() || !outroId) return;
  if (!db.prepare('SELECT 1 FROM users WHERE id = ? AND teste = 1').get(String(outroId))) throw new HttpError(403, MSG_SO_TESTE, 'conta_teste');
}
