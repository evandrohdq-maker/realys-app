// IA do Realyz: atendente automático das empresas e prestadores (SDR) e copiloto de quem fecha a venda (closer).
//
// Tudo com conhecimento gratuito:
//   - Modelo de linguagem ABERTO rodando no próprio servidor (Ollama, ex.: qwen2.5:3b, licença livre),
//     sem pagar por mensagem. Ver server/ia/LEIA-ME.md para instalar.
//   - A "ficha da empresa" (horário, entrega, pagamento, políticas, perguntas frequentes) e o catálogo
//     de produtos e preços do próprio Realyz. A IA só usa isso: não inventa preço nem promessa.
//   - Sem o modelo instalado, funciona a "IA leve": respostas pela ficha e pelo catálogo, com regras.
//
// Regras (as mesmas da Lotus): a IA se apresenta como assistente da empresa, nunca fecha venda nem cobra
// (a compra é sempre confirmada pelo cliente no botão do app), não passa contato nem pagamento por fora
// e passa a conversa para uma pessoa quando o cliente pede, quando é hora de negociar ou quando não sabe.

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2);
const brl = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

// Quando a conversa vai para uma pessoa (o closer).
const HUMANO = /\b(falar|conversar|chamar)\b.*\b(pessoa|humano|atendente|dono|gerente|vendedor|alguem)\b|\b(atendente|humano)\b/;
const NEGOCIA = /\b(desconto|negociar|negocia|abaixa|baixar|mais barato|menor preco|faz por|consegue por|parcel|atacado|orcamento|proposta)\b/;
const FECHAR = /\b(quero comprar|vou levar|fechado|fecha|pode mandar|quero contratar|como pago|como pagar|pode agendar)\b/;
const RECLAMA = /\b(problema|reclama|errado|veio errado|nao chegou|atrasou|estragado|quebrado|devolver|reembolso|golpe)\b/;

// Etapas do CRM (as mesmas do app): novo → conversa → proposta → negociacao → fechado.
export function proximaEtapa(atual, texto) {
  const t = norm(texto);
  if (FECHAR.test(t) || NEGOCIA.test(t)) return 'negociacao';
  if (atual === 'novo') return 'conversa';
  return atual || 'conversa';
}

export function precisaHumano(texto, ficha) {
  const t = norm(texto);
  if (HUMANO.test(t)) return 'O cliente pediu para falar com uma pessoa.';
  if (RECLAMA.test(t)) return 'Reclamação ou problema com pedido: precisa de uma pessoa.';
  if (NEGOCIA.test(t) && !(ficha && ficha.ia_negocia)) return 'Hora de negociar: proposta, desconto ou orçamento.';
  return null;
}

// Produtos do catálogo que combinam com a mensagem.
export function acharProdutos(texto, produtos, max = 4) {
  const ws = words(texto);
  if (!ws.length) return [];
  return produtos
    .map((p) => {
      const alvo = norm(`${p.name} ${p.category || ''} ${p.description || ''} ${p.classe || ''} ${p.subclasse || ''}`);
      const score = ws.reduce((n, w) => n + (alvo.includes(w) ? (norm(p.name).includes(w) ? 3 : 1) : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.p);
}

// Pergunta frequente mais parecida (pela ficha da empresa).
export function acharFaq(texto, faq) {
  const ws = words(texto);
  let best = null;
  for (const f of faq || []) {
    const q = words(f.q);
    const hits = q.filter((w) => ws.includes(w)).length;
    const score = q.length ? hits / q.length : 0;
    if (hits >= 1 && score >= 0.4 && (!best || score > best.score)) best = { f, score };
  }
  return best ? best.f : null;
}

const TOPICOS = [
  { re: /\b(horario|abre|abert|fecha|funciona|atende)\b/, campo: 'horario', diga: (v) => `Nosso horário: ${v}.` },
  { re: /\b(entrega|entregam|frete|tele|delivery|retirar|retirada|endereco|onde fica|regiao|bairro)\b/, campo: 'entrega', diga: (v) => v },
  { re: /\b(pagamento|pagar|pix|cartao|dinheiro|boleto|parcela)\b/, campo: 'pagamento', diga: (v) => `${v} O pagamento é sempre pelo app do Realyz, com o dinheiro protegido até você receber.` },
  { re: /\b(troca|garantia|devolu|politica)\b/, campo: 'politicas', diga: (v) => v },
];

// IA leve: responde sem modelo de linguagem, só com a ficha e o catálogo.
export function respostaLeve({ texto, ficha, produtos, empresa, primeira }) {
  const t = norm(texto);
  const nome = empresa || 'a empresa';
  const partes = [];
  if (primeira) partes.push(`Olá! Sou o assistente virtual da ${nome} no Realyz.`);
  const faq = acharFaq(texto, ficha && ficha.faq);
  if (faq) partes.push(faq.a);
  for (const tp of TOPICOS) if (!faq && tp.re.test(t) && ficha && ficha[tp.campo]) partes.push(tp.diga(ficha[tp.campo]));
  const achados = acharProdutos(texto, produtos);
  if (achados.length) {
    partes.push(
      'Encontrei no nosso catálogo: ' +
        achados.map((p) => `${p.name} por ${brl(p.price)}${p.stock === 0 ? ' (sem estoque no momento)' : ''}`).join('; ') +
        '. Para comprar, é só adicionar ao carrinho pelo app.'
    );
  }
  if (partes.length <= (primeira ? 1 : 0)) {
    partes.push(
      produtos.length
        ? 'Me conta o que você procura (produto, quantidade e quando precisa) que eu te ajudo a encontrar.'
        : 'Me conta o que você precisa e quando, que eu já deixo tudo anotado para a equipe.'
    );
  }
  return partes.join(' ');
}

// Instruções para o modelo de linguagem (quando instalado).
export function promptSistema({ ficha, produtos, empresa }) {
  const cat = produtos.slice(0, 40).map((p) => `- ${p.name}: ${brl(p.price)}${p.stock === 0 ? ' (sem estoque)' : ''}`).join('\n') || '(sem produtos cadastrados)';
  const faq = (ficha.faq || []).map((f) => `P: ${f.q}\nR: ${f.a}`).join('\n') || '(nenhuma)';
  return [
    `Você é o assistente virtual da empresa "${empresa}" dentro do app Realyz. Responda em português do Brasil, curto (até 3 frases), educado${ficha.tom ? ` e com este jeito: ${ficha.tom}` : ''}.`,
    'Regras obrigatórias:',
    '1. Use SOMENTE as informações abaixo. Se não souber, diga que vai chamar alguém da equipe. Nunca invente preço, prazo, estoque ou promoção.',
    '2. Você não fecha vendas nem cobra: para comprar, o cliente adiciona ao carrinho e confirma no app do Realyz.',
    '3. Nunca passe telefone, WhatsApp, Pix ou contato por fora do Realyz.',
    '4. Faça perguntas para entender o que o cliente precisa (o quê, quantidade, quando, onde).',
    '5. Diga que é um assistente virtual se perguntarem.',
    '',
    `Horário: ${ficha.horario || 'não informado'}`,
    `Entrega/região: ${ficha.entrega || 'não informado'}`,
    `Pagamento: ${ficha.pagamento || 'pelo app do Realyz'}`,
    `Trocas e garantia: ${ficha.politicas || 'não informado'}`,
    `Sobre a empresa: ${ficha.sobre || ''}`,
    'Perguntas frequentes:',
    faq,
    'Catálogo (preços oficiais):',
    cat,
  ].join('\n');
}

// Cliente do modelo de linguagem aberto (API do Ollama). "send" é trocado nos testes.
export function makeIA(cfg, { send } = {}) {
  const url = (cfg.iaUrl || '').replace(/\/$/, '');
  const ready = !!url;
  const post =
    send ||
    (async (path, body) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), cfg.iaTimeoutMs || 45000);
      try {
        const r = await fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
        if (!r.ok) throw new Error(`IA respondeu ${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(t);
      }
    });

  async function conversar(sistema, historico) {
    const r = await post('/api/chat', {
      model: cfg.iaModel || 'qwen2.5:3b',
      stream: false,
      options: { temperature: 0.3, num_predict: 220 },
      messages: [{ role: 'system', content: sistema }, ...historico],
    });
    const txt = r && r.message && r.message.content ? String(r.message.content).trim() : '';
    return txt.slice(0, 900);
  }

  return {
    ready,
    // Resposta do atendente. Usa o modelo se estiver instalado; senão (ou se falhar), a IA leve.
    async responder({ texto, ficha, produtos, empresa, historico, primeira }) {
      if (ready) {
        try {
          const r = await conversar(promptSistema({ ficha, produtos, empresa }), historico);
          if (r) return { texto: r, fonte: 'modelo' };
        } catch (e) {}
      }
      return { texto: respostaLeve({ texto, ficha, produtos, empresa, primeira }), fonte: 'leve' };
    },
    // Copiloto do closer: sugestão de resposta para a pessoa da equipe aprovar.
    async sugerir({ ficha, produtos, empresa, historico, resumo }) {
      if (ready) {
        try {
          const sis = promptSistema({ ficha, produtos, empresa }) + '\n\nVocê está ajudando um VENDEDOR humano: escreva a próxima mensagem dele para o cliente, pronta para enviar, buscando fechar a venda pelo app com uma proposta clara.';
          const r = await conversar(sis, historico);
          if (r) return r;
        } catch (e) {}
      }
      const ultimo = [...historico].reverse().find((m) => m.role === 'user');
      const achados = acharProdutos(ultimo ? ultimo.content : '', produtos, 2);
      if (achados.length) return `Consigo separar ${achados.map((p) => `${p.name} por ${brl(p.price)}`).join(' e ')} para você agora. Posso mandar no carrinho para você confirmar no app?`;
      return `Entendi${resumo ? ` (${resumo})` : ''}. Posso te mandar uma proposta pelo app agora? Assim você confere tudo e confirma com o dinheiro protegido.`;
    },
  };
}
