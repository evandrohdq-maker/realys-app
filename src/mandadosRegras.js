// Regras dos mandados de serviço: prazo de 24 h, finalização com o QR do cliente, chat e repasse.
// Funções puras, usadas pela tela de prestação e pela Lotus (mesmas regras nos dois lugares).
export const PRAZO_MS = 24 * 3600 * 1000;

const ATIVOS = ['Aceito', 'Aguardando biometria'];

// Mandado vencido: passou das 24 h e ainda não foi concluído.
export function vencido(m, agora = Date.now()) {
  return ATIVOS.includes(m.status) && !!m.prazo && agora > m.prazo;
}

// Lê o código do QR do cliente. Devolve { ok, msg, m } com o mandado atualizado.
export function lerQr(m, codigo, agora = Date.now()) {
  if ((codigo || '').trim().toUpperCase() !== m.qr) {
    return { ok: false, msg: 'O código não confere com o QR do cliente.', m };
  }
  if (agora > m.prazo) {
    return {
      ok: false,
      msg: 'Prazo de 24 h vencido. O serviço não pode mais ser finalizado sem revisão.',
      m: { ...m, status: 'Vencido', registro: [...(m.registro || []), 'QR lido depois do prazo de 24 h. Vai para revisão.'] },
    };
  }
  return {
    ok: true,
    msg: `Serviço finalizado. Faça a biometria até ${new Date(m.prazo).toLocaleString('pt-BR')} para receber.`,
    m: { ...m, status: 'Aguardando biometria', registro: [...(m.registro || []), 'Serviço finalizado com o QR do cliente.'] },
  };
}

// Mensagem no chat do mandado (aberto durante o prazo).
export function enviarChat(m, texto, de = 'prestador') {
  const t = (texto || '').trim();
  if (!t) return m;
  return { ...m, chat: [...(m.chat || []), { de, texto: t }] };
}
