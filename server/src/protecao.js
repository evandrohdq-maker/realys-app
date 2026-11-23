// Proteção Realyz: o robô que procura golpe e fake news e abre denúncia na fila do administrador.
//
// Regra de ouro: a máquina APONTA, uma pessoa DECIDE. Só o golpe escancarado (vários sinais fortes
// juntos) é barrado na hora; todo o resto vai para a fila com os motivos e o parecer da IA.
//
//  Golpe (sem IA, só regras, funciona desde já):
//   - texto com cara de golpe: dinheiro fácil, prêmio que pede taxa, "confirme seus dados", código de verificação...
//   - produto com preço muito abaixo do normal da mesma categoria (menos de 30% da mediana das outras lojas);
//   - conta nova (menos de 7 dias) chamando muita gente desconhecida em 24 h.
//  Fake news:
//   - sinais clássicos ("compartilhe antes que apaguem", "a mídia não mostra", cura milagrosa...);
//   - com o modelo de IA instalado no servidor, ele dá um parecer (provável falso / sem indício);
//   - post que vira "informação falsa" (procedente) some do feed e do conhecimento da Lotus.

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9$% ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Cada sinal tem um peso. 40+ vai para a fila; 90+ é barrado na hora.
export const SINAIS_GOLPE = [
  { re: /\b(ganhe|ganhar|fature|faturar|lucre|lucrar) (dinheiro|r\$ ?\d|\d+ ?mil|\d+ ?reais)\b.*\b(facil|rapido|por dia|sem sair de casa|garantido)\b/, peso: 45, motivo: 'promessa de dinheiro fácil' },
  { re: /\b(renda extra|lucro|retorno|rendimento) (garantid[oa]|certo|de \d+ ?%)\b/, peso: 45, motivo: 'lucro garantido' },
  { re: /\b(dobr(a|ar|o) (seu|o teu|teu|o seu) dinheiro|multiplic(a|ar) (seu|o) dinheiro|invista \d+ e receba)\b/, peso: 55, motivo: 'promete multiplicar dinheiro' },
  { re: /\b(pix premiado|voce (foi sorteado|ganhou)|parabens voce ganhou|seu premio|resgatar (o|seu) premio|liberar (o|seu) premio)\b/, peso: 45, motivo: 'prêmio falso' },
  { re: /\b(taxa|valor|frete) (para|pra|de) (liberar|liberacao|resgatar|receber|desbloquear)\b|\bpague (a|uma) taxa\b/, peso: 45, motivo: 'pede taxa antes de liberar' },
  { re: /\b(emprestimo|credito) (aprovado|liberado|pre aprovado)\b/, peso: 30, motivo: 'crédito "aprovado" sem pedido' },
  { re: /\b(sua conta|seu cadastro|seu cpf) (sera |foi |esta |vai ser )?(bloquead[oa]|suspens[oa]|cancelad[oa])\b/, peso: 35, motivo: 'ameaça de bloqueio de conta' },
  { re: /\b(confirme|atualize|informe|envie|manda|me passa|passa) (seus|os seus|teus|seu|sua|o seu|a sua) (dados|senha|cartao|codigo|token|cvv)\b/, peso: 50, motivo: 'pede senha, cartão ou dados' },
  { re: /\bcodigo (de verificacao|de seguranca|que chegou|que (te )?mandaram|do sms)\b/, peso: 45, motivo: 'pede código de verificação' },
  { re: /\b(clique|clica|acesse|entre) (no|neste|nesse|aqui no) link\b/, peso: 20, motivo: 'manda clicar em link' },
  { re: /\b(urgente|ultimas? horas?|so hoje|corre|ultima chance)\b/, peso: 10, motivo: 'pressa exagerada' },
  { re: /\b(iphone|playstation|ps5|notebook|smart ?tv|celular) (de|por) r\$ ?\d{1,3}\b/, peso: 25, motivo: 'eletrônico caro por preço de banana' },
];

export const SINAIS_FAKE = [
  { re: /\b(compartilhe|compartilhem|repasse|repassem|divulgue) (antes que|ate que) (apaguem|tirem|removam|derrubem)\b/, peso: 45, motivo: '"compartilhe antes que apaguem"' },
  { re: /\b(a midia|a imprensa|a globo|a tv|ninguem) (nao (vai )?(mostra|mostrar|fala|falar|divulga|conta)|esconde)\b/, peso: 35, motivo: '"a mídia não mostra"' },
  { re: /\b(cura|curou|cura definitiva) (do|da|o|a) (cancer|diabetes|autismo|aids|hiv|covid)\b/, peso: 45, motivo: 'cura milagrosa' },
  { re: /\b(vacina|vacinas) (causa|causam|mata|matam|tem chip|altera o dna)\b/, peso: 45, motivo: 'boato sobre vacina' },
  { re: /\b(urna|urnas|eleicao) (fraudad[ao]s?|foi fraudada|roubada)\b/, peso: 35, motivo: 'acusação de fraude sem prova' },
  { re: /\b(urgente|bomba|exclusivo|acabou de sair)\b/, peso: 10, motivo: 'manchete alarmista' },
  { re: /\b(comprovado|cientistas confirmam|medicos escondem|o governo esconde)\b/, peso: 15, motivo: 'autoridade sem fonte' },
];

function pontuar(texto, sinais) {
  const t = norm(texto);
  if (!t) return { pontos: 0, motivos: [] };
  const hits = sinais.filter((s) => s.re.test(t));
  return { pontos: Math.min(100, hits.reduce((n, s) => n + s.peso, 0)), motivos: hits.map((s) => s.motivo) };
}
export const pontuarGolpe = (texto) => pontuar(texto, SINAIS_GOLPE);
export const pontuarFake = (texto) => pontuar(texto, SINAIS_FAKE);
export const FILA = 40;
export const BARRA = 90;
export const MSG_GOLPE = 'Essa mensagem tem vários sinais de golpe e não foi enviada. Se for engano, fale com o suporte do Realyz.';

const mediana = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function makeProtecao({ db, ia }) {
  const abrir = ({ kind, id, tipo, pontos, motivos, parecer = null }) => {
    // Uma denúncia aberta do robô por alvo: não enche a fila com a mesma coisa.
    if (db.prepare("SELECT 1 FROM reports WHERE target_kind = ? AND target_id = ? AND origem = 'robo' AND status = 'aberta'").get(kind, id)) return null;
    const rid = `rp_robo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    db.prepare("INSERT INTO reports (id, from_id, target_kind, target_id, reason, created_at, origem, pontos, parecer, tipo) VALUES (?, 'realys', ?, ?, ?, ?, 'robo', ?, ?, ?)").run(
      rid, kind, id, `Proteção Realyz: ${motivos.join(', ')}`.slice(0, 500), Date.now(), pontos, parecer, tipo
    );
    return rid;
  };

  // Parecer da IA sobre fake news (só com o modelo instalado). Não trava quem publicou.
  const parecerIA = (reportId, texto) => {
    if (!ia || !ia.ready || !ia.checarFato) return;
    setImmediate(async () => {
      try {
        const p = await ia.checarFato(texto);
        if (p) db.prepare('UPDATE reports SET parecer = ? WHERE id = ?').run(p, reportId);
      } catch (e) {}
    });
  };

  return {
    // Post ou story público. Devolve { barrar: motivo } quando é golpe escancarado.
    post(postId, texto) {
      const g = pontuarGolpe(texto);
      if (g.pontos >= BARRA) return { barrar: MSG_GOLPE.replace('mensagem', 'publicação').replace('enviada', 'publicada') };
      if (g.pontos >= FILA) abrir({ kind: 'post', id: postId, tipo: 'golpe', ...g });
      const f = pontuarFake(texto);
      if (f.pontos >= FILA) {
        const rid = abrir({ kind: 'post', id: postId, tipo: 'fake', ...f });
        if (rid) parecerIA(rid, texto);
      }
      return {};
    },
    // Antes de publicar: só confere se é para barrar (o id ainda não existe).
    barrarPost(texto) {
      return pontuarGolpe(texto).pontos >= BARRA ? MSG_GOLPE.replace('mensagem', 'publicação').replace('enviada', 'publicada') : null;
    },

    // Mensagem para quem ainda não é amigo (ou de conta de negócio).
    mensagem({ fromId, toId, texto, amigos }) {
      const g = pontuarGolpe(texto);
      if (!amigos && g.pontos >= BARRA) {
        abrir({ kind: 'user', id: fromId, tipo: 'golpe', ...g });
        return { barrar: MSG_GOLPE };
      }
      if (!amigos && g.pontos >= FILA) abrir({ kind: 'user', id: fromId, tipo: 'golpe', ...g });
      // Conta nova chamando muita gente desconhecida.
      const u = db.prepare('SELECT created_at FROM users WHERE id = ?').get(fromId);
      if (!amigos && u && Date.now() - u.created_at < 7 * 86400000) {
        const n = db.prepare(
          `SELECT COUNT(DISTINCT to_id) AS n FROM messages m WHERE m.from_id = ? AND m.created_at > ?
             AND NOT EXISTS (SELECT 1 FROM friends f WHERE f.status = 'amigos' AND ((f.a_id = m.from_id AND f.b_id = m.to_id) OR (f.b_id = m.from_id AND f.a_id = m.to_id)))`
        ).get(fromId, Date.now() - 86400000).n;
        if (n >= 15) abrir({ kind: 'user', id: fromId, tipo: 'golpe', pontos: 50, motivos: [`conta nova chamou ${n} desconhecidos em 24 h`] });
      }
      void toId;
      return {};
    },

    // Produto novo ou com preço alterado.
    produto(p) {
      const g = pontuarGolpe(`${p.name} ${p.description || ''}`);
      const motivos = [...g.motivos];
      let pontos = g.pontos;
      const outros = db
        .prepare('SELECT price FROM products WHERE active = 1 AND company_id != ? AND category = ? AND COALESCE(classe, \'\') = COALESCE(?, \'\') AND COALESCE(subclasse, \'\') = COALESCE(?, \'\') LIMIT 500')
        .all(p.company_id, p.category, p.classe || null, p.subclasse || null)
        .map((x) => x.price);
      if (outros.length >= 5) {
        const m = mediana(outros);
        if (p.price < m * 0.3) {
          pontos = Math.min(100, pontos + 50);
          motivos.push(`preço ${Math.round((1 - p.price / m) * 100)}% abaixo do normal da categoria`);
        }
      }
      if (pontos >= FILA) abrir({ kind: 'product', id: p.id, tipo: 'golpe', pontos, motivos });
    },

    // Denúncia feita por uma pessoa: se for de fake news num post, pede o parecer da IA.
    denuncia(reportId, kind, targetId, motivo) {
      const ehFake = /fake|falsa|falso|mentira|boato/i.test(motivo);
      const ehGolpe = /golpe|fraude|engan/i.test(motivo);
      db.prepare('UPDATE reports SET tipo = ? WHERE id = ?').run(ehFake ? 'fake' : ehGolpe ? 'golpe' : 'outro', reportId);
      if (ehFake && kind === 'post') {
        const p = db.prepare('SELECT text FROM posts WHERE id = ?').get(targetId);
        if (p && p.text) parecerIA(reportId, p.text);
      }
    },
  };
}
