// Atendente IA nas conversas: quando um cliente manda mensagem para uma empresa ou prestador com o
// atendente ligado, a IA responde em nome dele (marcada como assistente virtual), anda com o cliente
// pelas etapas do CRM e passa a conversa para uma pessoa da equipe na hora certa.
import { newId, now } from '../http.js';
import { antiDesvio } from '../moderacaoTexto.js';
import { precisaHumano, proximaEtapa, respostaLeve } from './index.js';

export function makeAtendente({ db, hub, ia, userById }) {
  const ficha = (ownerId) => {
    const f = db.prepare('SELECT * FROM ia_fichas WHERE owner_id = ?').get(ownerId);
    return f ? { ...f, faq: f.faq ? JSON.parse(f.faq) : [], ia_negocia: !!f.ia_negocia, ligado: !!f.ligado } : null;
  };
  const conversa = (ownerId, clientId) => {
    let c = db.prepare('SELECT * FROM ia_conversas WHERE owner_id = ? AND client_id = ?').get(ownerId, clientId);
    if (!c) {
      db.prepare("INSERT INTO ia_conversas (owner_id, client_id, estado, etapa, ia_msgs, updated_at) VALUES (?,?,'ia','novo',0,?)").run(ownerId, clientId, now());
      c = db.prepare('SELECT * FROM ia_conversas WHERE owner_id = ? AND client_id = ?').get(ownerId, clientId);
    }
    return c;
  };
  // O que a empresa vende: produtos do catálogo; para prestador, as funções com o preço dele.
  const catalogo = (ownerId) => {
    const c = db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(ownerId);
    if (c) return { empresa: c.name, produtos: db.prepare('SELECT name, price, stock, category, description, classe, subclasse FROM products WHERE company_id = ? AND active = 1 LIMIT 200').all(c.id) };
    const p = db.prepare('SELECT * FROM providers WHERE user_id = ?').get(ownerId);
    const u = userById(ownerId);
    if (p) return { empresa: u.name, produtos: JSON.parse(p.functions).map((f) => ({ name: `${f} (${p.service})`, price: p.price, stock: 1, category: p.service, description: `por ${p.price_unit}` })) };
    return { empresa: u ? u.name : 'a empresa', produtos: [] };
  };
  const historico = (ownerId, clientId) =>
    db
      .prepare('SELECT from_id, text FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC LIMIT 12')
      .all(ownerId, clientId, clientId, ownerId)
      .reverse()
      .map((m) => ({ role: m.from_id === clientId ? 'user' : 'assistant', content: m.text }));
  const enviar = (ownerId, clientId, text) => {
    const id = newId('m');
    const at = now();
    db.prepare('INSERT INTO messages (id, from_id, to_id, text, created_at, ia) VALUES (?,?,?,?,?,1)').run(id, ownerId, clientId, text, at);
    const owner = userById(ownerId);
    hub.send(clientId, 'message', { id, from: ownerId, to: clientId, text, at, fromName: owner ? owner.name : '', ia: true });
    return id;
  };

  return {
    ficha,
    conversa,
    catalogo,
    historico,
    // Chamado depois que a mensagem do cliente foi gravada. Não trava a resposta da mensagem.
    async aoReceber(msg) {
      const f = ficha(msg.to);
      if (!f || !f.ligado) return null;
      if (db.prepare("SELECT 1 FROM users WHERE id = ? AND kind = 'empresa'").get(msg.from)) return null; // empresa falando com empresa: com pessoas
      const c = conversa(msg.to, msg.from);
      if (c.estado === 'humano') return null;
      const motivo = precisaHumano(msg.text, f);
      if (motivo) {
        db.prepare("UPDATE ia_conversas SET estado = 'humano', motivo = ?, resumo = ?, updated_at = ? WHERE owner_id = ? AND client_id = ?").run(motivo, String(msg.text).slice(0, 200), now(), msg.to, msg.from);
        enviar(msg.to, msg.from, 'Vou chamar uma pessoa da nossa equipe para continuar com você. Já deixei tudo anotado, é só aguardar um instante.');
        hub.send(msg.to, 'ia_handoff', { clientId: msg.from, motivo });
        return { handoff: motivo };
      }
      const { empresa, produtos } = catalogo(msg.to);
      const primeira = !db.prepare('SELECT 1 FROM messages WHERE from_id = ? AND to_id = ? LIMIT 1').get(msg.to, msg.from);
      let r = await ia.responder({ texto: msg.text, ficha: f, produtos, empresa, historico: historico(msg.to, msg.from), primeira });
      // A resposta passa pelo mesmo filtro de contato por fora que as mensagens das pessoas.
      if (!antiDesvio(r.texto).ok) r = { texto: respostaLeve({ texto: msg.text, ficha: f, produtos, empresa, primeira }), fonte: 'leve' };
      const etapa = proximaEtapa(c.etapa, msg.text);
      db.prepare('UPDATE ia_conversas SET etapa = ?, ia_msgs = ia_msgs + 1, resumo = ?, updated_at = ? WHERE owner_id = ? AND client_id = ?').run(etapa, String(msg.text).slice(0, 200), now(), msg.to, msg.from);
      enviar(msg.to, msg.from, r.texto);
      return { resposta: r.texto, fonte: r.fonte, etapa };
    },
  };
}
