// Botão "voltar" do celular.
// O app guarda o caminho que a pessoa fez (abas e sub-abas) e o voltar desfaz um passo por vez,
// em vez de fechar o aplicativo. Só sai do app tocando duas vezes seguidas na tela inicial.
//
// Telas com navegação interna (ex.: subgrupo aberto, carrinho, abas do topo) usam useBack:
//   useBack(group !== 'todos', () => setGroup('todos'));
// Enquanto a condição for verdadeira, o voltar executa a função antes de trocar de aba.
// Janelas (Modal) já fecham sozinhas com o voltar pelo onRequestClose.
import React, { createContext, useContext, useEffect, useRef } from 'react';

const BackContext = createContext(null);

export function BackProvider({ value, children }) {
  return <BackContext.Provider value={value}>{children}</BackContext.Provider>;
}

export function useBack(active, onBack) {
  const ctx = useContext(BackContext);
  const fn = useRef(onBack);
  fn.current = onBack;
  useEffect(() => {
    if (!ctx || !active) return undefined;
    const entry = { run: () => fn.current() };
    ctx.push(entry);
    return () => ctx.remove(entry);
  }, [ctx, active]);
}

// Pilha de "voltares" internos das telas: a última registrada é a primeira a responder.
export function createBackStack() {
  const stack = [];
  return {
    push: (e) => stack.push(e),
    remove: (e) => {
      const i = stack.lastIndexOf(e);
      if (i >= 0) stack.splice(i, 1);
    },
    // Executa o voltar interno mais recente. Retorna true se alguma tela tratou.
    pop: () => {
      const e = stack[stack.length - 1];
      if (!e) return false;
      e.run();
      return true;
    },
  };
}
