// NFS-e de padrão nacional (Emissor Nacional da Receita Federal, LC 214/2025).
// O Re@lys monta a DPS (Declaração de Prestação de Serviço), assina com o certificado digital A1 da empresa
// e envia para a API do Sistema Nacional NFS-e com o mesmo certificado (conexão mTLS). A resposta traz a
// chave de acesso da nota. Cancelamento = evento e101101.
//
// Endereços (conferir na documentação técnica em www.gov.br/nfse antes de ligar):
//   produção restrita (testes): https://sefin.producaorestrita.nfse.gov.br/SefinNacional
//   produção:                   https://sefin.nfse.gov.br/SefinNacional
// Comece SEMPRE pela produção restrita (FISCAL_AMBIENTE=2) e só passe para produção depois que as notas
// de teste saírem certas e o contador conferir.
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { gzipSync, gunzipSync } from 'node:zlib';
import { el, txt, assinar } from './xml.js';

export const NS_NFSE = 'http://www.sped.fazenda.gov.br/nfse';
// Leiaute 1.01 (com os campos da reforma tributária): a produção restrita só aceita 1.01 desde 10/12/2025 e a
// produção aceita 1.00 e 1.01 em paralelo. O grupo IBSCBS é opcional para quem está no Simples em 2026.
export const LEIAUTE = '1.01';
export const URLS = {
  1: 'https://sefin.nfse.gov.br/SefinNacional',
  2: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
};

const so = (v) => String(v || '').replace(/\D/g, '');
const pad = (v, n) => String(v).padStart(n, '0');
const dinheiro = (cents) => (Math.round(cents) / 100).toFixed(2);

// Data e hora no fuso de Brasília (a nota usa horário local com o deslocamento, ex.: -03:00).
export function dataHoraBrasilia(ts = Date.now()) {
  const d = new Date(ts - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 19) + '-03:00';
}
const dataBrasilia = (ts) => dataHoraBrasilia(ts).slice(0, 10);

// Id da DPS: "DPS" + município (7) + tipo de inscrição (1 = CPF, 2 = CNPJ) + inscrição (14) + série (5) + número (15).
export function idDps({ municipio, cnpj, serie, numero }) {
  return `DPS${pad(municipio, 7)}2${pad(so(cnpj), 14)}${pad(serie, 5)}${pad(numero, 15)}`;
}

// Monta a DPS (sem assinatura).
//  emitente: { cnpj, im, municipio (IBGE), opSimpNac (1 não optante, 2 MEI, 3 ME/EPP), regEspTrib }
//  nota:     { serie, numero, emitidaEm, competencia, valorCents, descricao, cTribNac, cTribMun, nbs,
//              tomador: { doc, nome, email }, pTotTribSN, ibsCbs }
export function montarDps({ ambiente, emitente, nota, verAplic = 'Re@lys-1.0', leiaute = LEIAUTE }) {
  const id = idDps({ municipio: emitente.municipio, cnpj: emitente.cnpj, serie: nota.serie, numero: nota.numero });
  const docToma = so(nota.tomador?.doc);
  const toma = docToma
    ? el('toma',
        docToma.length === 14 ? txt('CNPJ', docToma) : txt('CPF', docToma),
        txt('xNome', String(nota.tomador.nome || '').slice(0, 150)),
        txt('email', nota.tomador.email ? String(nota.tomador.email).slice(0, 80) : null))
    : null; // consumidor sem documento: a nota sai sem tomador identificado
  const regTrib = el('regTrib',
    txt('opSimpNac', emitente.opSimpNac),
    emitente.opSimpNac === 3 ? txt('regApTribSN', 1) : null,
    txt('regEspTrib', emitente.regEspTrib ?? 0));
  const totTrib = nota.pTotTribSN != null
    ? el('totTrib', txt('pTotTribSN', Number(nota.pTotTribSN).toFixed(2)))
    : el('totTrib', txt('indTotTrib', 0));
  const xml = el('DPS', { xmlns: NS_NFSE, versao: leiaute },
    el('infDPS', { Id: id },
      txt('tpAmb', ambiente),
      txt('dhEmi', dataHoraBrasilia(nota.emitidaEm)),
      txt('verAplic', verAplic),
      txt('serie', nota.serie),
      txt('nDPS', nota.numero),
      txt('dCompet', nota.competencia || dataBrasilia(nota.emitidaEm)),
      txt('tpEmit', 1),
      txt('cLocEmi', emitente.municipio),
      el('prest', txt('CNPJ', so(emitente.cnpj)), txt('IM', emitente.im || null), regTrib),
      toma,
      el('serv',
        el('locPrest', txt('cLocPrestacao', emitente.municipio)),
        el('cServ',
          txt('cTribNac', nota.cTribNac),
          txt('cTribMun', nota.cTribMun || null),
          txt('xDescServ', String(nota.descricao).slice(0, 2000)),
          txt('cNBS', nota.nbs || null))),
      el('valores',
        el('vServPrest', txt('vServ', dinheiro(nota.valorCents))),
        el('trib',
          el('tribMun', txt('tribISSQN', 1), txt('tpRetISSQN', 1)),
          totTrib))));
  return { id, xml };
}

// Pedido de cancelamento (evento e101101).
export function montarCancelamento({ ambiente, cnpj, chave, motivo = 'Serviço cancelado a pedido do cliente', codMotivo = 1, emitidoEm = Date.now(), leiaute = LEIAUTE }) {
  const id = `PRE${chave}101101001`;
  const xml = el('pedRegEvento', { xmlns: NS_NFSE, versao: leiaute },
    el('infPedReg', { Id: id },
      txt('tpAmb', ambiente),
      txt('verAplic', 'Re@lys-1.0'),
      txt('dhEvento', dataHoraBrasilia(emitidoEm)),
      txt('CNPJAutor', so(cnpj)),
      txt('chNFSe', chave),
      txt('nPedRegEvento', 1),
      el('e101101', txt('xDesc', 'Cancelamento de NFS-e'), txt('cMotivo', codMotivo), txt('xMotivo', String(motivo).slice(0, 255)))));
  return { id, xml };
}

const gz64 = (xml) => gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
export const ungz64 = (b64) => gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');

// Chamada HTTP para o Sistema Nacional, com o certificado na conexão (mTLS).
function chamar({ base, path, method = 'POST', body, keyPem, certPem, timeoutMs = 30000 }) {
  const url = new URL(base + path);
  const isHttps = url.protocol === 'https:';
  const data = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = (isHttps ? httpsRequest : httpRequest)(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
      ...(isHttps ? { key: keyPem, cert: certPem } : {}),
      timeout: timeoutMs,
    }, (res) => {
      const parts = [];
      res.on('data', (c) => parts.push(c));
      res.on('end', () => {
        const text = Buffer.concat(parts).toString('utf8');
        let json = null;
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = { texto: text };
        }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('O Sistema Nacional NFS-e não respondeu a tempo.')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Lê as mensagens de erro da Receita (vêm em listas com Codigo e Descricao).
function errosDe(json) {
  const lista = json?.erros || json?.Erros || json?.erro || [];
  const arr = Array.isArray(lista) ? lista : [lista];
  const msg = arr.map((e) => [e.Codigo || e.codigo, e.Descricao || e.descricao || e.mensagem].filter(Boolean).join(' - ')).filter(Boolean).join('; ');
  return msg || json?.mensagem || json?.texto || 'Erro sem descrição do Sistema Nacional NFS-e.';
}

export function makeNfseNacional({ ambiente = 2, baseUrl, keyPem, certPem }) {
  const base = baseUrl || URLS[ambiente];

  // Emite: assina a DPS e envia. Devolve { ok, chave, xmlNfse } ou { ok:false, erro, temporario }.
  async function emitir({ emitente, nota }) {
    const { id, xml } = montarDps({ ambiente, emitente, nota });
    const assinado = assinar(xml, { tag: 'infDPS', id, nsDoElemento: NS_NFSE, keyPem, certPem });
    let r;
    try {
      r = await chamar({ base, path: '/nfse', body: { dpsXmlGZipB64: gz64(assinado) }, keyPem, certPem });
    } catch (e) {
      return { ok: false, idDps: id, erro: e.message, temporario: true };
    }
    if (r.status >= 200 && r.status < 300 && r.json?.chaveAcesso) {
      return { ok: true, idDps: id, chave: r.json.chaveAcesso, xmlNfse: r.json.nfseXmlGZipB64 ? ungz64(r.json.nfseXmlGZipB64) : null };
    }
    // 5xx e 429 = instabilidade: tenta de novo depois. 4xx = dado errado: precisa de correção.
    return { ok: false, idDps: id, erro: errosDe(r.json), status: r.status, temporario: r.status >= 500 || r.status === 429 };
  }

  async function cancelar({ cnpj, chave, motivo }) {
    const { id, xml } = montarCancelamento({ ambiente, cnpj, chave, motivo });
    const assinado = assinar(xml, { tag: 'infPedReg', id, nsDoElemento: NS_NFSE, keyPem, certPem });
    let r;
    try {
      r = await chamar({ base, path: `/nfse/${chave}/eventos`, body: { pedidoRegistroEventoXmlGZipB64: gz64(assinado) }, keyPem, certPem });
    } catch (e) {
      return { ok: false, erro: e.message, temporario: true };
    }
    if (r.status >= 200 && r.status < 300) return { ok: true };
    return { ok: false, erro: errosDe(r.json), status: r.status, temporario: r.status >= 500 || r.status === 429 };
  }

  return { emitir, cancelar, base };
}

// Link público para o cliente ver e baixar a nota (consulta pública do Portal Nacional).
export const linkConsulta = (chave) => `https://www.nfse.gov.br/consultapublica?chave=${encodeURIComponent(chave)}`;
