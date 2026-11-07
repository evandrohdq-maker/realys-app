// Comandos de voz dos mandados, para a Lotus:
//  - "finaliza o serviço com o código QR-XXXX" → lê o QR do cliente (dentro do prazo)
//  - "manda no chat: <mensagem>" → envia no chat do mandado ativo
// Devolve { updater, reply } para aplicar no estado, ou null se não for um comando de mandado.
import { lerQr, enviarChat, vencido, PRAZO_MS } from './mandadosRegras';

export function findMandadoAction(text, mandados = [], agora = Date.now()) {
  const t = (text || '').trim();
  const low = t.toLowerCase();
  const ativos = mandados.filter((m) => ['Aceito', 'Aguardando biometria'].includes(m.status));
  if (!ativos.length) return null;

  const cod = t.match(/QR-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?/);
  if (cod && /finaliz|concl|le |leia|lê|codigo|código|qr/.test(low)) {
    const codigo = cod[0].toUpperCase();
    const alvo = ativos.find((m) => m.qr === codigo);
    if (!alvo) return { reply: 'Não encontrei um serviço ativo com esse código.', updater: null };
    const r = lerQr(alvo, codigo, agora);
    const ok = r.ok;
    return {
      reply: r.msg,
      pergunta: ok ? `Vou finalizar o serviço de ${alvo.cliente || 'este cliente'} com este código. Confirma? Diga sim ou não.` : null,
      updater: ok ? (lista) => lista.map((m) => (m.id === alvo.id ? r.m : m)) : null,
    };
  }

  const msg = low.match(/(?:manda|envia|enviar|mandar|escreve|escrever)\s.*?(?:chat|prestador|cliente|mensagem)\s*(?::|dizendo|que)\s*(.+)$/);
  if (msg) {
    const texto = t.slice(t.length - msg[1].length);
    const alvo = ativos[0];
    return {
      reply: 'Mensagem enviada no chat do serviço.',
      pergunta: `Vou enviar no chat: "${texto}". Confirma? Diga sim ou não.`,
      updater: (lista) => lista.map((m) => (m.id === alvo.id ? enviarChat(m, texto) : m)),
    };
  }
  return null;
}

export { PRAZO_MS, vencido };
