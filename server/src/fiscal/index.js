// Módulo fiscal do Realys.
//
// 1. Toda taxa que o Realys cobra (comissão, taxa de presente, proteção, visita, planos) vira uma RECEITA
//    (fiscal_receitas), gravada junto com o movimento do dinheiro, na mesma transação.
// 2. A cada FISCAL_INTERVALO_MIN minutos, as receitas viram NOTAS (fiscal_notas): uma por receita, por dia
//    ou por mês por cliente (FISCAL_AGRUPAR), com o imposto estimado.
// 3. As notas são assinadas e enviadas ao Sistema Nacional NFS-e. Erro de instabilidade tenta de novo
//    sozinho (até 5 vezes); erro de dado fica para o administrador corrigir e reenviar.
// 4. Pedido cancelado: a receita some se a nota ainda não saiu; se já saiu, a nota é cancelada.
// 5. Lojas que ligarem "emitir pelo Realys" têm a NF-e de produto emitida pelo emissor parceiro.
//
// Com FISCAL_ATIVO=false (padrão) as receitas são registradas e o resumo funciona, mas nenhuma nota é
// enviada. Assim o histórico já fica pronto para quando o CNPJ e o certificado estiverem em mãos.
import { readFileSync, existsSync } from 'node:fs';
import { newId, now, fail } from '../http.js';
import { tx } from '../db.js';
import { impostoDaNota, resumoMensal, situacaoMei, aliquotaSimples, anexoEfetivo, fatorR } from './impostos.js';
import { makeNfseNacional, linkConsulta } from './nfseNacional.js';
import { makeNfeParceiro } from './nfeParceiro.js';
import { infoCertificado } from './xml.js';

const MAX_TENTATIVAS = 5;
const ORIGENS = {
  comissao_pedido: 'Intermediação de venda no Realys',
  taxa_presente: 'Serviço de envio de presente digital',
  taxa_live: 'Serviço de presente em transmissão ao vivo',
  taxa_protecao: 'Taxa de proteção Realys (garantia do pedido)',
  taxa_visita: 'Intermediação de serviço (taxa de visita)',
  plano: 'Plano de divulgação para empresas',
  anuncio: 'Anúncio e destaque na plataforma',
  outro: 'Serviço de intermediação digital',
};
const OP_SIMP_NAC = { presumido: 1, mei: 2, simples: 3 };

// Competência no fuso de Brasília (AAAA-MM).
export const competenciaDe = (ts = Date.now()) => new Date(ts - 3 * 3600 * 1000).toISOString().slice(0, 7);
const diaDe = (ts) => new Date(ts - 3 * 3600 * 1000).toISOString().slice(0, 10);
// Data de competência da nota: hoje, se for o mês atual; senão o último dia do mês da receita.
const dataCompetencia = (comp) => {
  if (comp === competenciaDe()) return diaDe(Date.now());
  const [y, m] = comp.split('-').map(Number);
  return `${comp}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};
const mesesAntes = (comp, n) => {
  const [y, m] = comp.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
};

export function makeFiscal({ db, cfg, hub, clients = {} }) {
  const lerArquivo = (p) => (p && existsSync(p) ? readFileSync(p, 'utf8') : '');
  const certPem = () => lerArquivo(cfg.fiscalCertPem);
  const keyPem = () => lerArquivo(cfg.fiscalKeyPem);

  // O que falta para ligar a emissão (mostrado no painel do administrador).
  function pendenciasConfig() {
    const falta = [];
    if (!cfg.fiscalAtivo) falta.push('FISCAL_ATIVO=true (ligar só depois do contador conferir)');
    if (!/^\d{14}$/.test(String(cfg.fiscalCnpj).replace(/\D/g, ''))) falta.push('FISCAL_CNPJ (CNPJ do Realys)');
    if (!/^\d{7}$/.test(String(cfg.fiscalMunicipio))) falta.push('FISCAL_MUNICIPIO (código IBGE da cidade da empresa)');
    if (!OP_SIMP_NAC[cfg.fiscalRegime]) falta.push('FISCAL_REGIME (simples, presumido ou mei)');
    // Regime regular é obrigado a destacar CBS e IBS na nota desde 2026 (grupo IBSCBS do leiaute 1.01).
    if (cfg.fiscalRegime === 'presumido') falta.push('Lucro Presumido exige o grupo IBS/CBS na NFS-e: falta montar esse grupo com o contador (cClassTrib e alíquotas)');
    if (!clients.nfse && (!certPem() || !keyPem())) falta.push('FISCAL_CERT_PEM e FISCAL_KEY_PEM (certificado digital A1, ver deploy/certificado-fiscal.sh)');
    return falta;
  }
  const podeEmitir = () => pendenciasConfig().length === 0;

  let nfse = clients.nfse || null;
  const nfseClient = () => {
    if (!nfse) nfse = makeNfseNacional({ ambiente: cfg.fiscalAmbiente, baseUrl: cfg.fiscalNfseUrl || undefined, keyPem: keyPem(), certPem: certPem() });
    return nfse;
  };
  const nfe = clients.nfe || (cfg.nfeParceiroUrl && cfg.nfeParceiroToken ? makeNfeParceiro({ base: cfg.nfeParceiroUrl, token: cfg.nfeParceiroToken }) : null);

  // ---------- Registro de receitas (chamar DENTRO da transação que move o dinheiro) ----------
  function registrar({ origem, ref = null, tomadorId = null, valorCents, descricao }) {
    if (!valorCents || valorCents <= 0) return null;
    if (!ORIGENS[origem]) throw new Error(`Origem fiscal desconhecida: ${origem}`);
    const id = newId('fr');
    const t = now();
    db.prepare('INSERT INTO fiscal_receitas (id, origem, ref, tomador_id, valor, descricao, competencia, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
      id, origem, ref, tomadorId, Math.round(valorCents), descricao || ORIGENS[origem], competenciaDe(t), 'pendente', t, t
    );
    return id;
  }

  // Estorno (pedido cancelado): tira a receita da fila ou pede o cancelamento da nota já emitida.
  function estornar(ref, motivo = 'Pedido cancelado') {
    for (const r of db.prepare("SELECT * FROM fiscal_receitas WHERE ref = ? AND status != 'cancelada'").all(ref)) {
      db.prepare("UPDATE fiscal_receitas SET status = 'cancelada', updated_at = ? WHERE id = ?").run(now(), r.id);
      if (!r.nota_id) continue;
      const n = db.prepare('SELECT * FROM fiscal_notas WHERE id = ?').get(r.nota_id);
      if (!n) continue;
      const restantes = db.prepare("SELECT COUNT(*) AS c FROM fiscal_receitas WHERE nota_id = ? AND status != 'cancelada'").get(n.id).c;
      if (n.status === 'emitida' && restantes === 0) db.prepare("UPDATE fiscal_notas SET status = 'cancelamento', erro = ?, updated_at = ? WHERE id = ?").run(motivo, now(), n.id);
      else if (['fila', 'erro'].includes(n.status)) {
        // Ainda não saiu: refaz o valor sem a receita estornada (ou cancela a nota inteira).
        const soma = db.prepare("SELECT COALESCE(SUM(valor),0) AS v FROM fiscal_receitas WHERE nota_id = ? AND status != 'cancelada'").get(n.id).v;
        db.prepare('UPDATE fiscal_notas SET valor = ?, status = ?, updated_at = ? WHERE id = ?').run(soma, soma ? n.status : 'cancelada', now(), n.id);
      }
      // Nota emitida com outras receitas junto (agrupamento mensal): o contador faz o ajuste na nota seguinte.
    }
  }

  // ---------- Receita dos últimos 12 meses (base do Simples) ----------
  function rbt12(competencia) {
    const ini = mesesAntes(competencia, 12);
    const v = db.prepare("SELECT COALESCE(SUM(valor),0) AS v FROM fiscal_receitas WHERE status != 'cancelada' AND competencia >= ? AND competencia < ?").get(ini, competencia).v;
    return v + Math.round(cfg.fiscalRbt12Inicial * 100);
  }

  const folha = () => Math.round(cfg.fiscalFolha12m * 100);
  const anexoDe = (comp) => anexoEfetivo(cfg.fiscalAnexo, { folha12Cents: folha(), rbt12Cents: rbt12(comp) });
  const receitaAnoAntes = (comp) => db.prepare("SELECT COALESCE(SUM(valor),0) AS v FROM fiscal_receitas WHERE status != 'cancelada' AND competencia >= ? AND competencia < ?").get(comp.slice(0, 4) + '-01', comp).v;

  const proximoNumero = (serie) => {
    db.prepare('INSERT OR IGNORE INTO fiscal_numeracao (serie, ultimo) VALUES (?, 0)').run(serie);
    db.prepare('UPDATE fiscal_numeracao SET ultimo = ultimo + 1 WHERE serie = ?').run(serie);
    return db.prepare('SELECT ultimo FROM fiscal_numeracao WHERE serie = ?').get(serie).ultimo;
  };

  // ---------- Receitas → notas ----------
  function agrupar(agora = now()) {
    const hoje = diaDe(agora);
    const mes = competenciaDe(agora);
    const pend = db.prepare("SELECT * FROM fiscal_receitas WHERE status = 'pendente' ORDER BY created_at").all();
    const grupos = new Map();
    for (const r of pend) {
      let chave;
      if (cfg.fiscalAgrupar === 'mensal') {
        if (r.competencia >= mes) continue; // fecha o mês só depois que ele acaba
        chave = `${r.tomador_id || '-'}|${r.competencia}`;
      } else if (cfg.fiscalAgrupar === 'diario') {
        if (diaDe(r.created_at) >= hoje) continue;
        chave = `${r.tomador_id || '-'}|${diaDe(r.created_at)}`;
      } else chave = r.id;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(r);
    }
    let criadas = 0;
    for (const lista of grupos.values()) {
      tx(db, () => {
        const valor = lista.reduce((s, r) => s + r.valor, 0);
        const comp = lista[0].competencia;
        const imp = impostoDaNota(valor, { regime: cfg.fiscalRegime === 'mei' ? 'simples' : cfg.fiscalRegime, anexo: anexoDe(comp), rbt12Cents: rbt12(comp), issPct: cfg.fiscalIssPct, destacarIbsCbs: cfg.fiscalDestacarIbsCbs });
        const descricoes = [...new Set(lista.map((r) => r.descricao))];
        const descricao = lista.length === 1 ? descricoes[0] : `${descricoes.join('; ')} (${lista.length} operações em ${comp})`;
        const id = newId('nf');
        const t = now();
        db.prepare('INSERT INTO fiscal_notas (id, tipo, emitente, tomador_id, serie, numero, competencia, valor, imposto_estimado, aliquota, descricao, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          id, 'nfse', 'realys', lista[0].tomador_id, cfg.fiscalSerie, proximoNumero(cfg.fiscalSerie), comp, valor, imp.total, imp.aliquota, descricao.slice(0, 2000), 'fila', t, t
        );
        for (const r of lista) db.prepare("UPDATE fiscal_receitas SET status = 'agrupada', nota_id = ?, updated_at = ? WHERE id = ?").run(id, t, r.id);
        criadas++;
      });
    }
    return criadas;
  }

  const emitenteRealys = () => ({ cnpj: cfg.fiscalCnpj, im: cfg.fiscalIm, municipio: cfg.fiscalMunicipio, opSimpNac: OP_SIMP_NAC[cfg.fiscalRegime], regEspTrib: 0 });

  async function emitirNfse(n) {
    const u = n.tomador_id ? db.prepare('SELECT name, doc, email FROM users WHERE id = ?').get(n.tomador_id) : null;
    const r = await nfseClient().emitir({
      emitente: emitenteRealys(),
      nota: {
        serie: n.serie, numero: n.numero, emitidaEm: now(), competencia: dataCompetencia(n.competencia),
        valorCents: n.valor, descricao: n.descricao, cTribNac: cfg.fiscalCTribNac, cTribMun: cfg.fiscalCTribMun, nbs: cfg.fiscalNbs,
        tomador: u ? { doc: u.doc, nome: u.name, email: u.email } : null,
        pTotTribSN: cfg.fiscalRegime === 'simples' ? n.aliquota : null,
      },
    });
    const t = now();
    if (r.ok) {
      db.prepare("UPDATE fiscal_notas SET status = 'emitida', chave = ?, id_dps = ?, xml = ?, link = ?, erro = NULL, emitida_em = ?, updated_at = ? WHERE id = ?").run(r.chave, r.idDps, r.xmlNfse, linkConsulta(r.chave), t, t, n.id);
      if (n.tomador_id && hub) hub.send(n.tomador_id, 'nota_fiscal', { id: n.id, valor: n.valor / 100, link: linkConsulta(r.chave) });
    } else {
      db.prepare("UPDATE fiscal_notas SET status = 'erro', tentativas = tentativas + 1, erro = ?, id_dps = ?, updated_at = ? WHERE id = ?").run(
        (r.temporario ? '[temporário] ' : '[corrigir] ') + r.erro, r.idDps || null, t, n.id
      );
    }
    return r.ok;
  }

  async function cancelarNfse(n) {
    const r = await nfseClient().cancelar({ cnpj: cfg.fiscalCnpj, chave: n.chave, motivo: n.erro || 'Serviço cancelado' });
    if (r.ok) db.prepare("UPDATE fiscal_notas SET status = 'cancelada', updated_at = ? WHERE id = ?").run(now(), n.id);
    else db.prepare('UPDATE fiscal_notas SET tentativas = tentativas + 1, erro = ?, updated_at = ? WHERE id = ?').run('[cancelamento] ' + r.erro, now(), n.id);
    return r.ok;
  }

  // ---------- NF-e de produto das lojas (emissor parceiro) ----------
  function filaNfeDoPedido(orderId) {
    const o = db.prepare('SELECT o.*, f.emite_pelo_realys FROM orders o LEFT JOIN fiscal_lojas f ON f.company_id = o.company_id WHERE o.id = ?').get(orderId);
    if (!o || !o.emite_pelo_realys) return null;
    const id = newId('nf');
    const t = now();
    db.prepare('INSERT INTO fiscal_notas (id, tipo, emitente, tomador_id, ref, competencia, valor, descricao, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
      id, 'nfe', o.company_id, o.buyer_id, o.id, competenciaDe(t), o.total, `Venda do pedido ${o.id}`, 'fila', t, t
    );
    return id;
  }

  async function emitirNfe(n) {
    const o = db.prepare('SELECT o.*, c.cnpj, c.name AS loja FROM orders o JOIN companies c ON c.id = o.company_id WHERE o.id = ?').get(n.ref);
    const f = db.prepare('SELECT * FROM fiscal_lojas WHERE company_id = ?').get(n.emitente);
    const u = db.prepare('SELECT name, doc, email FROM users WHERE id = ?').get(o.buyer_id);
    const itens = db.prepare('SELECT i.*, p.ncm FROM order_items i LEFT JOIN products p ON p.id = i.product_id WHERE i.order_id = ?').all(o.id)
      .map((i) => ({ codigo: i.product_id, nome: i.name, qtd: i.qty, precoCents: i.price, ncm: i.ncm }));
    // Primeiro envia; nas rodadas seguintes só consulta até autorizar.
    const r = n.chave === 'enviada' ? await nfe.consultar(n.id) : await nfe.emitir({ ref: n.id, loja: { cnpj: o.cnpj, uf: f.uf, crt: f.crt }, pedido: { id: o.id, criadoEm: o.created_at, itens, cliente: { doc: u.doc, nome: u.name, email: u.email } } });
    const t = now();
    if (r.ok && r.pendente) db.prepare("UPDATE fiscal_notas SET chave = 'enviada', updated_at = ? WHERE id = ?").run(t, n.id);
    else if (r.ok) {
      db.prepare("UPDATE fiscal_notas SET status = 'emitida', chave = ?, link = ?, erro = NULL, emitida_em = ?, updated_at = ? WHERE id = ?").run(r.chave, r.danfe, t, t, n.id);
      if (hub) hub.send(o.buyer_id, 'nota_fiscal', { id: n.id, pedido: o.id, loja: o.loja, link: r.danfe });
    } else db.prepare("UPDATE fiscal_notas SET status = 'erro', tentativas = tentativas + 1, erro = ?, updated_at = ? WHERE id = ?").run((r.temporario ? '[temporário] ' : '[corrigir] ') + r.erro, t, n.id);
  }

  // ---------- Rodada de processamento ----------
  let rodando = false;
  async function processar() {
    if (rodando) return { ok: false, motivo: 'Já existe uma rodada em andamento.' };
    rodando = true;
    const out = { notasCriadas: 0, emitidas: 0, erros: 0, canceladas: 0, nfe: 0 };
    try {
      if (!podeEmitir()) return { ...out, ok: false, faltaConfigurar: pendenciasConfig() };
      out.notasCriadas = agrupar();
      const fila = db.prepare("SELECT * FROM fiscal_notas WHERE tipo = 'nfse' AND (status = 'fila' OR (status = 'erro' AND erro LIKE '[temporário]%' AND tentativas < ?)) ORDER BY created_at LIMIT 200").all(MAX_TENTATIVAS);
      for (const n of fila) (await emitirNfse(n)) ? out.emitidas++ : out.erros++;
      for (const n of db.prepare("SELECT * FROM fiscal_notas WHERE tipo = 'nfse' AND status = 'cancelamento' AND tentativas < ?").all(MAX_TENTATIVAS)) if (await cancelarNfse(n)) out.canceladas++;
      if (nfe) {
        for (const n of db.prepare("SELECT * FROM fiscal_notas WHERE tipo = 'nfe' AND (status = 'fila' OR (status = 'erro' AND erro LIKE '[temporário]%' AND tentativas < ?)) LIMIT 100").all(MAX_TENTATIVAS)) {
          await emitirNfe(n);
          out.nfe++;
        }
      }
      return { ...out, ok: true };
    } finally {
      rodando = false;
    }
  }

  // ---------- Resumo para o administrador: receita, impostos, custos e lucro ----------
  function resumo(competencia = competenciaDe()) {
    const porOrigem = db.prepare("SELECT origem, COUNT(*) AS qtd, SUM(valor) AS valor FROM fiscal_receitas WHERE competencia = ? AND status != 'cancelada' GROUP BY origem").all(competencia);
    const receita = porOrigem.reduce((s, r) => s + r.valor, 0);
    const base = rbt12(competencia);
    const regime = cfg.fiscalRegime === 'mei' ? 'simples' : cfg.fiscalRegime;
    const anexo = anexoDe(competencia);
    const calc = resumoMensal({ receitaCents: receita, rbt12Cents: base, custosCents: Math.round(cfg.fiscalCustosMensais * 100), regime, anexo, issPct: cfg.fiscalIssPct, receitaAnoAntesCents: receitaAnoAntes(competencia) });
    const fr = fatorR({ folha12Cents: folha(), rbt12Cents: base });
    const notas = db.prepare('SELECT status, COUNT(*) AS qtd FROM fiscal_notas WHERE competencia = ? GROUP BY status').all(competencia);
    let certificado = null;
    try {
      const pem = certPem();
      if (pem) {
        const c = infoCertificado(pem);
        certificado = { ...c, diasParaVencer: Math.floor((c.validoAte - now()) / 86400000) };
      }
    } catch (e) {
      certificado = { erro: 'Não consegui ler o certificado: ' + e.message };
    }
    const avisos = [];
    if (calc.prejuizo) avisos.push('A receita do mês não cobre os custos e impostos: o mês fecha no prejuízo.');
    if (cfg.fiscalRegime === 'mei') {
      const s = situacaoMei(base);
      if (s.aviso) avisos.push(s.aviso);
    }
    if (regime === 'simples' && cfg.fiscalAnexo === 'fatorR' && anexo === 'V') {
      const falta = Math.max(0, Math.ceil(base * 0.28) - folha());
      avisos.push(`Fator R de ${Math.round(fr.fatorR * 100)}%: o Realys está no Anexo V (a partir de 15,5%). Com mais R$ ${(falta / 100).toFixed(2)} de folha ou pró-labore nos 12 meses, passa para o Anexo III (a partir de 6%). Veja com o contador.`);
    }
    if (regime === 'simples' && aliquotaSimples(base, anexo).faixa >= 5) avisos.push('Faturamento perto do teto do Simples: hora de o contador avaliar o Lucro Presumido.');
    if (certificado?.diasParaVencer != null && certificado.diasParaVencer < 30) avisos.push(`O certificado digital vence em ${certificado.diasParaVencer} dias: renove para as notas não pararem.`);
    return {
      competencia, regime: cfg.fiscalRegime, anexo, fatorR: cfg.fiscalAnexo === 'fatorR' ? fr.fatorR : null, emissaoLigada: podeEmitir(), faltaConfigurar: pendenciasConfig(),
      receitaPorOrigem: porOrigem.map((r) => ({ origem: r.origem, qtd: r.qtd, valor: r.valor / 100 })),
      receita: receita / 100, rbt12: base / 100, aliquota: calc.aliquota,
      impostos: calc.impostos == null ? null : calc.impostos / 100, custos: calc.custos / 100,
      lucro: calc.lucro == null ? null : calc.lucro / 100, margem: calc.margem,
      receitaParaEmpatar: calc.receitaParaEmpatar == null ? null : calc.receitaParaEmpatar / 100,
      notas, certificado, avisos,
    };
  }

  // Situação de MEI de uma pessoa (prestador ou loja MEI): quanto recebeu no ano pelo Realys.
  function meiDe(userId, ano = new Date().getFullYear()) {
    const ini = new Date(`${ano}-01-01T03:00:00Z`).getTime();
    const v = db.prepare("SELECT COALESCE(SUM(amount),0) AS v FROM ledger WHERE user_id = ? AND bucket = 'saldo' AND amount > 0 AND cat IN ('Vendas','Serviços') AND created_at >= ?").get(userId, ini).v;
    const u = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);
    const desde = u && u.created_at > ini ? new Date(u.created_at) : new Date(ini);
    const meses = 12 - desde.getUTCMonth();
    const s = situacaoMei(v, { mesesAtivos: meses });
    return { ...s, teto: s.teto / 100, recebido: s.recebido / 100 };
  }

  const notaView = (n) => ({ id: n.id, tipo: n.tipo, valor: n.valor / 100, descricao: n.descricao, status: n.status, link: n.link, chave: n.chave === 'enviada' ? null : n.chave, competencia: n.competencia, criadaEm: n.created_at, emitidaEm: n.emitida_em });

  let timer = null;
  const start = () => {
    if (timer || !cfg.fiscalAtivo) return;
    timer = setInterval(() => processar().catch((e) => console.error('fiscal:', e)), Math.max(1, cfg.fiscalIntervaloMin) * 60000);
    timer.unref?.();
  };
  const stop = () => timer && (clearInterval(timer), (timer = null));

  return { registrar, estornar, agrupar, processar, resumo, meiDe, filaNfeDoPedido, notaView, pendenciasConfig, podeEmitir, rbt12, start, stop, ORIGENS };
}

export const validarOrigem = (o) => {
  if (!ORIGENS[o]) fail(400, 'Origem inválida. Use: ' + Object.keys(ORIGENS).join(', ') + '.');
  return o;
};
