// Nota de PRODUTO (NF-e modelo 55) das lojas, por uma empresa emissora parceira.
//
// Cada loja emite a própria nota, no CNPJ dela e com o certificado dela. Em vez de o Re@lys guardar o
// certificado de cada loja, a loja se cadastra uma vez no emissor parceiro e o Re@lys só pede a emissão
// pela API, com os dados do pedido. Implementado no formato da API v2 da Focus NFe (focusnfe.com.br);
// outro parceiro com API parecida entra trocando só este arquivo.
//
//   homologação (testes): https://homologacao.focusnfe.com.br
//   produção:             https://api.focusnfe.com.br
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { dataHoraBrasilia } from './nfseNacional.js';

const so = (v) => String(v || '').replace(/\D/g, '');
const reais = (cents) => Math.round(cents) / 100;

function chamar({ base, token, method, path, body }) {
  const url = new URL(base + path);
  const data = body ? JSON.stringify(body) : null;
  const auth = 'Basic ' + Buffer.from(`${token}:`).toString('base64');
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method,
      headers: { Authorization: auth, 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
      timeout: 30000,
    }, (res) => {
      const parts = [];
      res.on('data', (c) => parts.push(c));
      res.on('end', () => {
        let json = {};
        try {
          json = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
        } catch {}
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('O emissor de notas não respondeu a tempo.')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Monta a NF-e de venda ao consumidor a partir do pedido do Re@lys.
// loja: { cnpj, uf, crt (1 Simples, 3 normal) }, pedido: { id, criadoEm, itens:[{nome, qtd, precoCents, ncm, cfop, unidade}],
//        cliente: { doc, nome, email, endereco }, freteCents }
export function montarNfe({ loja, pedido }) {
  const docCli = so(pedido.cliente?.doc);
  const simples = Number(loja.crt || 1) === 1;
  const mesmoEstado = !pedido.cliente?.uf || pedido.cliente.uf === loja.uf;
  return {
    natureza_operacao: 'Venda de mercadoria',
    data_emissao: dataHoraBrasilia(pedido.criadoEm),
    tipo_documento: 1, // saída
    finalidade_emissao: 1, // normal
    consumidor_final: 1,
    presenca_comprador: 2, // pela internet
    cnpj_emitente: so(loja.cnpj),
    nome_destinatario: pedido.cliente?.nome || 'Consumidor',
    ...(docCli.length === 14 ? { cnpj_destinatario: docCli } : docCli ? { cpf_destinatario: docCli } : {}),
    email_destinatario: pedido.cliente?.email || undefined,
    indicador_inscricao_estadual_destinatario: 9, // não contribuinte
    modalidade_frete: pedido.freteCents ? 0 : 9,
    valor_frete: pedido.freteCents ? reais(pedido.freteCents) : undefined,
    items: pedido.itens.map((it, i) => ({
      numero_item: i + 1,
      codigo_produto: it.codigo || String(i + 1),
      descricao: String(it.nome).slice(0, 120),
      codigo_ncm: so(it.ncm) || '00000000',
      cfop: it.cfop || (mesmoEstado ? '5102' : '6108'), // venda de mercadoria adquirida de terceiros
      unidade_comercial: it.unidade || 'UN',
      quantidade_comercial: it.qtd,
      valor_unitario_comercial: reais(it.precoCents),
      unidade_tributavel: it.unidade || 'UN',
      quantidade_tributavel: it.qtd,
      valor_unitario_tributavel: reais(it.precoCents),
      valor_bruto: reais(it.precoCents * it.qtd),
      icms_origem: 0,
      // Simples: CSOSN 102 (sem crédito). Regime normal: CST 00. O contador da loja ajusta no cadastro.
      icms_situacao_tributaria: it.icms || (simples ? '102' : '00'),
      pis_situacao_tributaria: it.pis || (simples ? '49' : '01'),
      cofins_situacao_tributaria: it.cofins || (simples ? '49' : '01'),
    })),
  };
}

export function makeNfeParceiro({ base, token }) {
  async function emitir({ ref, loja, pedido }) {
    const corpo = montarNfe({ loja, pedido });
    let r;
    try {
      r = await chamar({ base, token, method: 'POST', path: `/v2/nfe?ref=${encodeURIComponent(ref)}`, body: corpo });
    } catch (e) {
      return { ok: false, erro: e.message, temporario: true };
    }
    // A emissão é assíncrona: 202 = recebida, a autorização chega depois (consultar).
    if (r.status === 201 || r.status === 202) return { ok: true, pendente: true, status: r.json.status };
    return { ok: false, erro: r.json.mensagem || JSON.stringify(r.json.erros || r.json), temporario: r.status >= 500 || r.status === 429 };
  }

  async function consultar(ref) {
    let r;
    try {
      r = await chamar({ base, token, method: 'GET', path: `/v2/nfe/${encodeURIComponent(ref)}` });
    } catch (e) {
      return { ok: false, erro: e.message, temporario: true };
    }
    const s = r.json.status;
    if (s === 'autorizado') return { ok: true, chave: r.json.chave_nfe, danfe: r.json.caminho_danfe ? base + r.json.caminho_danfe : null, xml: r.json.caminho_xml_nota_fiscal ? base + r.json.caminho_xml_nota_fiscal : null };
    if (s === 'processando_autorizacao') return { ok: true, pendente: true };
    return { ok: false, erro: r.json.mensagem_sefaz || r.json.mensagem || s, temporario: false };
  }

  async function cancelar({ ref, motivo }) {
    const r = await chamar({ base, token, method: 'DELETE', path: `/v2/nfe/${encodeURIComponent(ref)}`, body: { justificativa: String(motivo).padEnd(15, '.').slice(0, 255) } });
    return r.json.status === 'cancelado' ? { ok: true } : { ok: false, erro: r.json.mensagem || r.json.mensagem_sefaz || 'Cancelamento recusado.' };
  }

  return { emitir, consultar, cancelar };
}
