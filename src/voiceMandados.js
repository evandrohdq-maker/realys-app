// Comandos de voz dos mandados, para a Lotus:
//  - "finaliza o serviço com o código QR-XXXX" → lê o QR do cliente (dentro do prazo)
//  - "manda no chat: <mensagem>" → envia no chat do mandado ativo
// Devolve { updater, reply } para aplicar no estado, ou null se não for um comando de mandado.
import { lerQr, enviarChat, vencido, PRAZO_MS, TAXA_PCT } from './mandadosRegras';

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
    // Finalizar mexe com repasse: a Lotus só abre o cartão. Quem confirma é o toque no botão.
    if (!r.ok) return { reply: r.msg, cartao: null, updater: null };
    const recebe = (alvo.valor * (1 - TAXA_PCT / 100)).toFixed(2);
    return {
      reply: 'Abri a confirmação na tela. Toque em Confirmar, Recusar ou Depois.',
      cartao: {
        titulo: 'Finalizar serviço',
        texto: `${alvo.cliente || 'Cliente'}: ${alvo.servico}, valor R$ ${alvo.valor}. Repasse após a taxa de ${TAXA_PCT}%: R$ ${recebe}.`,
        aviso: 'Só finalize depois que o serviço estiver concluído. Depois disso, faça a biometria dentro de 24 horas para receber.',
        confirmar: null,
      },
      updater: (lista) => lista.map((m) => (m.id === alvo.id ? r.m : m)),
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
