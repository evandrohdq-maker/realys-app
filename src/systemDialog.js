// Janelas do próprio Android por cima do Realys (pedido de permissão do microfone ou do GPS,
// janela de voz do Google). Enquanto uma delas está aberta, o Android avisa que o app "saiu da tela",
// mas a pessoa NÃO minimizou o app. Sem esta conferência a caixa da Lotus fechava sozinha
// na primeira vez que era aberta (era quando o celular pedia a permissão do microfone e do GPS).
let open = 0;
let lastClosed = 0;

// Folga depois que a janela fecha: o aviso do Android pode chegar um pouquinho atrasado.
const GRACE_MS = 1000;

export async function withSystemDialog(task) {
  open += 1;
  try {
    return await task();
  } finally {
    open -= 1;
    lastClosed = Date.now();
  }
}

export const systemDialogOpen = () => open > 0 || Date.now() - lastClosed < GRACE_MS;
