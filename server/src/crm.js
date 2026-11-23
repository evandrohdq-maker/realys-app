// CRM no servidor (empresa e prestador). Antes os atendimentos eram de exemplo e ficavam no celular.
// Agora:
//  - mensagem de um cliente para a empresa/prestador abre (ou atualiza) o atendimento sozinha;
//  - a resposta da loja passa o atendimento de "Novo contato" para "Em conversa";
//  - compra pelo app fecha a etapa ("Venda fechada") com o valor do pedido;
//  - o lembrete de retorno vira aviso no celular na hora marcada.
import { newId, now } from './http.js';

const ETAPAS = ['novo', 'conversa', 'proposta', 'negociacao', 'fechado', 'perdido'];
const hhmm = (t) => new Date(t - 3 * 3600 * 1000).toISOString().slice(11, 16);
const msg = (from, text, at) => ({ from, text, at, time: hhmm(at) });

export function makeCrm({ db, hub }) {
  const negocio = (u) => !!u && (u.kind === 'empresa' || !!db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(u.id));
  const boardOf = (u) => (u.kind === 'empresa' ? 'empresa' : 'prestador');
  const get = (ownerId, clientId) => db.prepare('SELECT * FROM crm_leads WHERE owner_id = ? AND client_id = ?').get(ownerId, clientId);
  const salvar = (row, data) => {
    const t = now();
    const fu = data.followUp && Number(data.followUp) > 0 ? Number(data.followUp) : null;
    db.prepare('UPDATE crm_leads SET data = ?, follow_up = ?, follow_up_avisado = CASE WHEN ? IS NULL OR ? != COALESCE(follow_up, 0) THEN NULL ELSE follow_up_avisado END, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(data), fu, fu, fu, t, row.id);
  };
  const criar = (owner, client, origin) => {
    const t = now();
    const id = newId('crm');
    const data = { board: boardOf(owner), client: client.name, origin, interest: '', value: 0, stage: 'novo', unread: 0, note: '', followUp: null, cycle: 1, qual: {}, tasks: [], owner: null, history: [{ stage: 'novo', at: t, cycle: 1 }], messages: [] };
    db.prepare('INSERT INTO crm_leads (id, owner_id, client_id, board, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').run(id, owner.id, client.id, data.board, JSON.stringify(data), t, t);
    return get(owner.id, client.id);
  };
  const avisar = (ownerId, row) => hub.send(ownerId, 'crm-lead', { id: row.id });

  // Mensagem real trocada no Realyz (chamado depois de gravar em messages).
  function aoMensagem(from, to, text, origin = 'Página') {
    if (negocio(to) && from.id !== to.id && !negocio(from)) {
      // Cliente escreveu para a empresa/prestador.
      const row = get(to.id, from.id) || criar(to, from, origin);
      const d = JSON.parse(row.data);
      d.messages = [...(d.messages || []), msg('them', text, now())].slice(-200);
      d.unread = (d.unread || 0) + 1;
      d.client = from.name;
      // Cliente que "não fechou" voltou a falar: o atendimento reabre.
      if (d.stage === 'perdido') {
        d.stage = 'conversa';
        d.cycle = (d.cycle || 1) + 1;
        d.history = [...(d.history || []), { stage: 'conversa', at: now(), restart: true }];
      }
      salvar(row, d);
      avisar(to.id, row);
    } else if (negocio(from) && !negocio(to)) {
      // A empresa/prestador respondeu o cliente: entra na conversa do atendimento.
      const row = get(from.id, to.id);
      if (!row) return;
      const d = JSON.parse(row.data);
      d.messages = [...(d.messages || []), msg('me', text, now())].slice(-200);
      d.unread = 0;
      if (d.stage === 'novo') {
        d.stage = 'conversa';
        d.history = [...(d.history || []), { stage: 'conversa', at: now() }];
      }
      salvar(row, d);
    }
  }

  // Venda feita pelo app: fecha a etapa com o valor (soma se o cliente já tinha comprado antes).
  function aoVender(ownerId, buyer, totalCents, origin) {
    const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(ownerId);
    if (!owner || !buyer || owner.id === buyer.id) return;
    const row = get(owner.id, buyer.id) || criar(owner, buyer, origin);
    const d = JSON.parse(row.data);
    const t = now();
    const valor = Math.round(totalCents) / 100;
    d.value = Math.round(((d.stage === 'fechado' ? d.value || 0 : 0) + valor) * 100) / 100;
    if (d.stage !== 'fechado') d.history = [...(d.history || []), { stage: 'fechado', at: t, cycle: d.cycle || 1, auto: true }];
    d.stage = 'fechado';
    d.closing = { at: t, value: d.value, viaApp: true, paid: true };
    d.messages = [...(d.messages || []), { from: 'system', text: `Compra feita pelo Realyz: R$ ${valor.toFixed(2).replace('.', ',')}.`, at: t, time: hhmm(t) }].slice(-200);
    salvar(row, d);
    avisar(owner.id, row);
  }

  const view = (row) => ({ ...JSON.parse(row.data), id: row.id, clientId: row.client_id, server: true, updatedAt: row.updated_at });
  const listar = (ownerId) => db.prepare('SELECT * FROM crm_leads WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 500').all(ownerId).map(view);
  // A loja muda o atendimento pelo app (etapa, notas, lembrete...). A conversa é só do servidor.
  const CAMPOS = ['stage', 'note', 'followUp', 'value', 'interest', 'qual', 'tasks', 'owner', 'lostReason', 'history', 'closing', 'cycle', 'unread', 'reactivated', 'lastLost', 'origin'];
  function atualizar(ownerId, id, patch) {
    const row = db.prepare('SELECT * FROM crm_leads WHERE id = ? AND owner_id = ?').get(String(id || ''), ownerId);
    if (!row) return null;
    const d = JSON.parse(row.data);
    for (const k of CAMPOS) if (k in (patch || {})) d[k] = patch[k];
    if (!ETAPAS.includes(d.stage)) d.stage = 'novo';
    if (d.history && d.history.length > 300) d.history = d.history.slice(-300);
    salvar(row, d);
    return view(db.prepare('SELECT * FROM crm_leads WHERE id = ?').get(row.id));
  }

  // Lembretes de retorno vencidos: aviso no celular (uma vez por lembrete).
  function lembretes() {
    const t = now();
    const rows = db.prepare('SELECT * FROM crm_leads WHERE follow_up IS NOT NULL AND follow_up <= ? AND (follow_up_avisado IS NULL OR follow_up_avisado != follow_up) LIMIT 100').all(t);
    for (const row of rows) {
      const d = JSON.parse(row.data);
      hub.send(row.owner_id, 'crm-lembrete', { id: row.id, client: d.client, texto: d.note ? String(d.note).slice(0, 100) : 'Hora de dar retorno para este cliente.' });
      db.prepare('UPDATE crm_leads SET follow_up_avisado = follow_up WHERE id = ?').run(row.id);
    }
    return rows.length;
  }

  return { aoMensagem, aoVender, listar, atualizar, lembretes };
}
