// Envio de e-mail (sem dependências): usa a API do Resend quando RESEND_API_KEY está configurada.
// Sem chave (fase de testes), não envia: o código aparece só no log do servidor.
export function makeMail(cfg, log = console) {
  const ready = !!cfg.resendKey;
  async function send({ to, subject, text }) {
    if (!ready) {
      log.info && log.info(`[e-mail não configurado] para ${to}: ${subject}`);
      return { sent: false };
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.emailFrom, to: [to], subject, text }),
    });
    if (!r.ok) throw new Error('Falha ao enviar o e-mail (' + r.status + ').');
    return { sent: true };
  }
  return { ready, send };
}
