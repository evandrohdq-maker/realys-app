// Contratos e receitas do Realys (etapa 1, sem custo).
// - Contratos: aluguel de imóvel, aluguel de bens (carro, máquina), compra e venda de bens e prestação
//   de serviço. As partes assinam dentro do app (biometria do celular + registro de data, hora e
//   código do documento) e cada uma recebe o PDF. Também dá para assinar pelo gov.br (gratuito).
// - Receitas: só para profissional verificado cuja profissão permite receitar (ver PRESCRIBERS).
//   Feita por voz (Lotus) ou digitando. A assinatura com certificado ICP-Brasil, obrigatória para
//   receita, entra na etapa 2 (PENDENCIAS.md); por enquanto o profissional assina pelo próprio
//   certificado (ex.: Prescrição Eletrônica do CFM).
// Validade: Lei 14.063/2020 e MP 2.200-2/2001, art. 10, § 2º (assinatura eletrônica aceita pelas
// partes). Contratos que vão a cartório pedem assinatura qualificada (ICP-Brasil) — etapa 2.

// ---------- Quem pode receitar ----------
// Só profissões de nível superior cujo conselho permite prescrever. Curso técnico nunca receita.
export const PRESCRIBERS = {
  medico: { conselho: 'CRM', titulo: 'Médico(a)', escopo: 'medicamentos e exames' },
  dentista: { conselho: 'CRO', titulo: 'Cirurgião(ã)-dentista', escopo: 'medicamentos de uso odontológico' },
  veterinario: { conselho: 'CRMV', titulo: 'Médico(a)-veterinário(a)', escopo: 'medicamentos para animais' },
  vetpet: { conselho: 'CRMV', titulo: 'Médico(a)-veterinário(a)', escopo: 'medicamentos para animais' },
};
// Profissões da saúde que NÃO receitam remédio no app (o conselho limita ou não permite).
export const NOT_PRESCRIBERS = {
  psicologo: 'Psicólogos não prescrevem medicamentos (CRP).',
  nutricionista: 'Nutricionistas fazem plano alimentar, não receita de medicamentos (CRN).',
  enfermeiro: 'Enfermagem só prescreve dentro de protocolos das instituições de saúde (COREN).',
  acompanhante: 'Acompanhantes não prescrevem.',
};

// Registro profissional no nome ou no campo reg ("CRM-SP 123456", "Dr. Fulano · CRMV").
const regOf = (p) => (p && (p.reg || (String(p.name || '').match(/\b(CRM|CRO|CRMV)\b[\w\s-]*/) || [])[0])) || '';

// O profissional pode receitar? { ok, rule?, reason }
export function canPrescribe(p) {
  if (!p) return { ok: false, reason: 'Só profissionais cadastrados e verificados podem receitar.' };
  const key = p.service || p.specialtyKey || (p.reg && /^CRM\b/.test(p.reg) ? 'medico' : /^CRO\b/.test(p.reg || '') ? 'dentista' : '');
  const rule = PRESCRIBERS[key];
  if (!rule) return { ok: false, reason: NOT_PRESCRIBERS[key] || 'A sua profissão não permite receitar medicamentos.' };
  const reg = regOf(p);
  if (!reg || !reg.includes(rule.conselho)) return { ok: false, reason: `Para receitar, cadastre e verifique o seu registro no ${rule.conselho}.` };
  return { ok: true, rule, reg, reason: '' };
}

// ---------- Modelos de contrato ----------
export const CONTRACT_TYPES = [
  {
    key: 'locacao_imovel',
    label: 'Aluguel de imóvel',
    icon: 'home-outline',
    roles: ['Locador(a)', 'Locatário(a)'],
    fields: [
      ['objeto', 'Imóvel (endereço completo)'],
      ['valor', 'Aluguel por mês (R$)'],
      ['prazo', 'Prazo (ex.: 30 meses)'],
      ['inicio', 'Início (ex.: 01/12/2026)'],
      ['vencimento', 'Dia do pagamento (ex.: dia 5)'],
      ['garantia', 'Garantia (caução, fiador, seguro-fiança)'],
    ],
    clauses: (f) => [
      `O LOCADOR aluga ao LOCATÁRIO o imóvel situado em ${f.objeto}, para uso residencial, no estado em que se encontra, conforme vistoria anexa.`,
      `O prazo da locação é de ${f.prazo}, com início em ${f.inicio}.`,
      `O aluguel mensal é de R$ ${f.valor}, pago até o ${f.vencimento} de cada mês pela carteira Realys (pagamento protegido) ou por Pix indicado pelo LOCADOR. O reajuste é anual, pelo IGP-M ou índice que o substituir.`,
      `Garantia da locação: ${f.garantia}.`,
      'Contas de consumo (água, luz, gás) e condomínio ordinário ficam por conta do LOCATÁRIO; IPTU e despesas extraordinárias seguem o combinado entre as partes e a Lei 8.245/1991 (Lei do Inquilinato).',
      'Em caso de devolução antes do prazo, a multa segue a proporção do tempo restante (art. 4º da Lei 8.245/1991).',
    ],
  },
  {
    key: 'locacao_bem',
    label: 'Aluguel de carro, máquina ou equipamento',
    icon: 'construct-outline',
    roles: ['Locador(a)', 'Locatário(a)'],
    fields: [
      ['objeto', 'Bem alugado (modelo, placa ou nº de série)'],
      ['valor', 'Valor total ou diária (R$)'],
      ['prazo', 'Período (ex.: 01/12 a 05/12/2026)'],
      ['caucao', 'Caução (R$, se houver)'],
    ],
    clauses: (f) => [
      `O LOCADOR aluga ao LOCATÁRIO o bem: ${f.objeto}, em perfeito estado de funcionamento, conforme fotos e vistoria registradas no Realys.`,
      `Período da locação: ${f.prazo}. Valor: R$ ${f.valor}, pago pela carteira Realys (pagamento protegido).`,
      `Caução: ${f.caucao || 'não há'}. A caução volta ao LOCATÁRIO na devolução do bem nas mesmas condições.`,
      'O LOCATÁRIO responde por danos, multas e uso indevido durante o período da locação.',
    ],
  },
  {
    key: 'compra_venda',
    label: 'Compra e venda de bem',
    icon: 'swap-horizontal-outline',
    roles: ['Vendedor(a)', 'Comprador(a)'],
    fields: [
      ['objeto', 'Bem vendido (descrição, modelo, nº de série ou placa)'],
      ['valor', 'Preço (R$)'],
      ['pagamento', 'Forma de pagamento (ex.: à vista pelo Realys)'],
      ['entrega', 'Entrega (data e local)'],
    ],
    clauses: (f) => [
      `O VENDEDOR vende ao COMPRADOR o bem: ${f.objeto}, livre de dívidas e ônus.`,
      `Preço: R$ ${f.valor}. Pagamento: ${f.pagamento}. Pelo Realys, o valor fica retido (Garantia Realys) até o COMPRADOR confirmar o recebimento pelo QR Code da entrega.`,
      `Entrega: ${f.entrega}.`,
      'Para veículos, as partes fazem a transferência no Detran no prazo legal. Imóveis não são vendidos por este contrato: exigem escritura pública no cartório.',
    ],
  },
  {
    key: 'servico',
    label: 'Prestação de serviço',
    icon: 'hammer-outline',
    roles: ['Contratante', 'Prestador(a)'],
    fields: [
      ['objeto', 'Serviço (o que será feito)'],
      ['valor', 'Valor (R$)'],
      ['prazo', 'Prazo ou data'],
      ['local', 'Local'],
    ],
    clauses: (f) => [
      `O PRESTADOR realiza para o CONTRATANTE o serviço: ${f.objeto}, em ${f.local}.`,
      `Prazo: ${f.prazo}. Valor: R$ ${f.valor}, pago pela carteira Realys; o valor fica retido até o CONTRATANTE confirmar o serviço concluído.`,
      'Materiais, garantia do serviço e eventuais ajustes seguem o combinado entre as partes no chat do Realys, que faz parte deste contrato.',
    ],
  },
];
export const contractType = (key) => CONTRACT_TYPES.find((t) => t.key === key) || CONTRACT_TYPES[0];

const COMMON_CLAUSES = [
  'As partes concordam em assinar este contrato eletronicamente pelo Realys, com identificação por biometria, nos termos do art. 10, § 2º, da MP 2.200-2/2001 e da Lei 14.063/2020, e reconhecem a validade desta forma de assinatura.',
  'Cada assinatura fica registrada com data, hora e o código deste documento. Qualquer alteração no texto muda o código e invalida as assinaturas.',
  'Fica eleito o foro da comarca do imóvel ou do local do serviço para resolver dúvidas deste contrato.',
];

// ---------- Receita: entender o que foi ditado ----------
// "receita para Maria Souza: dipirona 500 mg, 1 comprimido de 6 em 6 horas por 3 dias; e amoxicilina..."
export function parseDictation(text) {
  let t = String(text || '').trim();
  t = t.replace(/^\s*(abrir\s+)?l[oó]tus[,\s]*/i, '').replace(/^(fazer|faz|faça|cria|criar|emitir|emite|nova)?\s*(uma\s+)?(receita|prescri[cç][aã]o|receitar|prescrever)\s*/i, '');
  let patient = '';
  const m = t.match(/^(para|pra|pro|ao paciente|à paciente|a paciente|o paciente)\s+([^:,;.]+?)(?:[:,;.]|\s+(?=[a-zà-ú]+\s+\d))/i);
  if (m) {
    patient = m[2].trim();
    t = t.slice(m[0].length).trim();
  }
  const items = t
    .split(/;|\n|\s+e\s+(?=[a-zà-ú]+\s+\d)|\.\s+(?=[A-ZÀ-Ú])/)
    .map((x) => x.replace(/^[\s,:-]+|[\s,.]+$/g, ''))
    .filter((x) => x.length > 2)
    .map((x) => {
      const k = x.search(/,\s*|\s+(tomar|usar|aplicar|\d+\s*(comprimido|cápsula|capsula|gota|ml|sachê|sache|ampola))/i);
      return k > 0 ? { med: x.slice(0, k).trim(), dose: x.slice(k).replace(/^[\s,]+/, '').trim() } : { med: x, dose: '' };
    });
  return { patient, items };
}

// ---------- HTML dos documentos (vira PDF no celular) ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = (ts) => new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const STYLE = `<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#1F2A44;margin:36px;font-size:12.5px;line-height:1.55}
  h1{font-size:18px;margin:0 0 4px;color:#7A5806} .sub{color:#6E7891;font-size:11px;margin-bottom:18px}
  .box{border:1px solid #E6DAC0;border-radius:8px;padding:10px 14px;margin:10px 0}
  ol{padding-left:18px} li{margin:6px 0} .sig{border-top:1px solid #1F2A44;margin-top:28px;padding-top:6px;width:46%;display:inline-block;vertical-align:top;margin-right:6%}
  .ok{color:#1E7D4F;font-weight:bold} .wait{color:#B4532A} .code{font-family:monospace;font-size:11px;word-break:break-all}
  .foot{margin-top:24px;font-size:10px;color:#6E7891;border-top:1px solid #F0E9DA;padding-top:8px}
  .rx{font-size:14px;margin:8px 0} .rx b{display:block}
</style>`;

const signBlock = (s, role) =>
  `<div class="sig"><b>${esc(role)}</b><br/>${esc(s.name)}${s.doc ? ` · ${esc(s.doc)}` : ''}<br/>${
    s.signedAt ? `<span class="ok">✔ Assinado ${s.method === 'govbr' ? 'pelo gov.br' : 'no Realys (biometria)'} em ${when(s.signedAt)}</span>` : '<span class="wait">Aguardando assinatura</span>'
  }</div>`;

// Texto que define o conteúdo (é dele que sai o código do documento).
export function contractBody(doc) {
  const t = contractType(doc.type);
  return [...t.clauses(doc.fields), ...COMMON_CLAUSES];
}
export const contentOf = (doc) =>
  doc.kind === 'receita'
    ? JSON.stringify({ k: 'rx', p: doc.patient, i: doc.items, o: doc.notes, by: doc.parties[0], at: doc.createdAt })
    : JSON.stringify({ k: doc.type, f: doc.fields, p: doc.parties.map((x) => [x.name, x.doc]), at: doc.createdAt });

export function contractHtml(doc) {
  const t = contractType(doc.type);
  const [a, b] = doc.parties;
  return `<html><head><meta charset="utf-8"/>${STYLE}</head><body>
  <h1>Contrato de ${esc(t.label.toLowerCase())}</h1>
  <div class="sub">Realys · Pessoas reais. Negócios reais. · Criado em ${when(doc.createdAt)}</div>
  <div class="box"><b>${esc(t.roles[0])}:</b> ${esc(a.name)}${a.doc ? `, ${esc(a.doc)}` : ''}<br/><b>${esc(t.roles[1])}:</b> ${esc(b.name)}${b.doc ? `, ${esc(b.doc)}` : ''}</div>
  <ol>${contractBody(doc).map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
  ${doc.extra ? `<div class="box"><b>Combinado entre as partes:</b><br/>${esc(doc.extra)}</div>` : ''}
  <div>${signBlock(a, t.roles[0])}${signBlock(b, t.roles[1])}</div>
  <div class="foot">Código do documento (SHA-256): <span class="code">${esc(doc.hash || '')}</span><br/>Via de: ${esc(doc.copyFor || 'todas as partes')}. Assinatura eletrônica entre as partes (Lei 14.063/2020; MP 2.200-2/2001, art. 10, § 2º). Para registro em cartório, é preciso assinatura qualificada ICP-Brasil.</div>
  </body></html>`;
}

export function prescriptionHtml(doc) {
  const pro = doc.parties[0];
  return `<html><head><meta charset="utf-8"/>${STYLE}</head><body>
  <h1>Receita</h1>
  <div class="sub">${esc(pro.name)} · ${esc(pro.title || '')} · ${esc(pro.doc || '')}<br/>Atendimento pelo Realys${doc.channel ? ` (${esc(doc.channel)})` : ''} em ${when(doc.createdAt)}</div>
  <div class="box"><b>Paciente:</b> ${esc(doc.patient.name)}${doc.patient.doc ? ` · ${esc(doc.patient.doc)}` : ''}</div>
  ${doc.items.map((it, i) => `<div class="rx"><b>${i + 1}. ${esc(it.med)}</b>${esc(it.dose || '')}</div>`).join('')}
  ${doc.notes ? `<div class="box"><b>Orientações:</b><br/>${esc(doc.notes)}</div>` : ''}
  <div>${signBlock(pro, pro.title || 'Profissional')}</div>
  <div class="foot">Código do documento (SHA-256): <span class="code">${esc(doc.hash || '')}</span><br/>
  ${doc.icp ? '<span class="ok">Assinada com certificado digital ICP-Brasil.</span>' : '<span class="wait">Para valer na farmácia, a receita precisa da assinatura digital ICP-Brasil do profissional (Resolução CFM 2.299/2021). Confira em validar.iti.gov.br.</span>'}</div>
  </body></html>`;
}

export const docHtml = (doc) => (doc.kind === 'receita' ? prescriptionHtml(doc) : contractHtml(doc));
export const docTitle = (doc) => (doc.kind === 'receita' ? `Receita · ${doc.patient.name}` : `${contractType(doc.type).label} · ${doc.parties[1].name}`);
export const allSigned = (doc) => doc.parties.every((p) => p.signedAt);

// Valor do contrato em reais ("1.500,00", "R$ 2500", "1500/mês" → 1500). Sem valor, 0.
export function contractValue(doc) {
  const v = String((doc && doc.fields && doc.fields.valor) || '');
  const m = v.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  return m ? Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : '')) : 0;
}
