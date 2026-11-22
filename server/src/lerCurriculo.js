// Lê o currículo que a pessoa anexou (PDF, Word .docx, .doc, OpenDocument .odt, texto ou foto) e
// sugere o preenchimento: funções que já fez e em que nível, anos de experiência, escolaridade e
// cursos. Sem bibliotecas: PDF pelos blocos de texto (compactados ou não), DOCX/ODT abrindo o zip.
// A pessoa sempre confere antes de salvar. Foto do currículo não tem texto: ela responde as perguntas.
import { inflateSync, inflateRawSync } from 'node:zlib';

export const TIPOS_CURRICULO = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.oasis.opendocument.text': 'odt',
  'text/plain': 'txt',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'image/jpeg': 'foto',
  'image/png': 'foto',
  'image/webp': 'foto',
};

// ---------- texto de cada formato ----------
function textoPdf(buf) {
  const bin = buf.toString('latin1');
  const out = [];
  const re = /<<([\s\S]*?)>>\s*stream\r?\n/g;
  let m;
  while ((m = re.exec(bin))) {
    const ini = m.index + m[0].length;
    const fim = bin.indexOf('endstream', ini);
    if (fim < 0) break;
    let dados = buf.subarray(ini, fim);
    if (/FlateDecode/.test(m[1])) {
      try {
        dados = inflateSync(dados);
      } catch (e) {
        try {
          dados = inflateRawSync(dados.subarray(2));
        } catch (e2) {
          continue;
        }
      }
    } else if (/Filter/.test(m[1])) continue; // imagem ou outro filtro: não é texto
    const s = dados.toString('latin1');
    if (!/T[jJ]/.test(s)) continue;
    // (texto) Tj  e  [(te) -20 (xto)] TJ ; quebra de linha em Td/TD/T*/'
    const linha = [];
    const op = /\[((?:[^\]\\]|\\.)*)\]\s*TJ|\(((?:[^)\\]|\\.)*)\)\s*(?:Tj|'|")|(T\*|Td|TD|Tm)/g;
    let o;
    while ((o = op.exec(s))) {
      if (o[3]) {
        linha.push('\n');
        continue;
      }
      if (o[2] !== undefined) linha.push(desescapa(o[2]));
      else {
        const partes = o[1].match(/\(((?:[^)\\]|\\.)*)\)|-?\d+(?:\.\d+)?/g) || [];
        partes.forEach((p) => {
          if (p.startsWith('(')) linha.push(desescapa(p.slice(1, -1)));
          else if (Number(p) < -200) linha.push(' ');
        });
      }
    }
    out.push(linha.join(''));
  }
  return out.join('\n');
}
const desescapa = (s) =>
  s.replace(/\\(\d{1,3}|.)/g, (_, c) => (/^\d+$/.test(c) ? String.fromCharCode(parseInt(c, 8)) : c === 'n' ? '\n' : c === 'r' ? '' : c === 't' ? ' ' : c));

// Arquivo de dentro de um zip (DOCX, ODT).
function doZip(buf, nome) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < total && p + 46 <= buf.length; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(p + 10);
    const tam = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28);
    const el = buf.readUInt16LE(p + 30);
    const cl = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const n = buf.toString('utf8', p + 46, p + 46 + nl);
    if (n === nome) {
      const lnl = buf.readUInt16LE(local + 26);
      const lel = buf.readUInt16LE(local + 28);
      const ini = local + 30 + lnl + lel;
      const dados = buf.subarray(ini, ini + tam);
      return metodo === 8 ? inflateRawSync(dados) : dados;
    }
    p += 46 + nl + el + cl;
  }
  return null;
}
const xmlParaTexto = (xml) =>
  xml
    .replace(/<\/w:p>|<\/text:p>|<\/text:h>|<w:br\/>|<w:tab\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

export function extrairTexto(buf, tipo) {
  try {
    if (tipo === 'pdf') return textoPdf(buf);
    if (tipo === 'docx') {
      const x = doZip(buf, 'word/document.xml');
      return x ? xmlParaTexto(x.toString('utf8')) : '';
    }
    if (tipo === 'odt') {
      const x = doZip(buf, 'content.xml');
      return x ? xmlParaTexto(x.toString('utf8')) : '';
    }
    if (tipo === 'txt') return buf.toString('utf8');
    if (tipo === 'rtf') return buf.toString('latin1').replace(/\\par[d]?/g, '\n').replace(/\{\\[^}]*\}|\\[a-z]+-?\d* ?|[{}]/g, '');
    if (tipo === 'doc') {
      // Word antigo: pega os trechos de texto legível.
      return (buf.toString('latin1').match(/[A-Za-zÀ-ÿ0-9 ,.;:()\-/@]{6,}/g) || []).join('\n');
    }
  } catch (e) {
    return '';
  }
  return '';
}

// ---------- o que o texto diz ----------
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const FUNCOES = {
  garcom: ['garcom', 'garconete', 'atendente de mesa', 'cumim'],
  barman: ['barman', 'bartender', 'barista', 'drinks'],
  cozinha: ['cozinheir', 'chef', 'pizzaiolo', 'churrasqueiro', 'confeiteir', 'padeiro'],
  'aux-cozinha': ['auxiliar de cozinha', 'ajudante de cozinha', 'saladeir'],
  copa: ['copeir', 'lavador de louca', 'steward'],
  recepcao: ['recepcionista', 'recepcao', 'hostess'],
  caixa: ['operador de caixa', 'operadora de caixa', 'caixa de supermercado', 'frente de caixa'],
  seguranca: ['seguranca', 'vigilante', 'porteiro', 'portaria', 'controlador de acesso'],
  montagem: ['montador', 'montagem de evento', 'carregador', 'estrutura de evento'],
  limpeza: ['limpeza', 'faxin', 'zelador', 'servicos gerais', 'auxiliar de limpeza'],
  promotor: ['promotor', 'promotora', 'repositor', 'degustacao'],
  entregador: ['entregador', 'motoboy', 'motofretista', 'delivery'],
  vendedor: ['vendedor', 'vendedora', 'consultor de vendas', 'atendente de loja'],
  estoque: ['estoquista', 'almoxarif', 'conferente', 'auxiliar de estoque'],
  motorista: ['motorista', 'condutor'],
  administrativo: ['auxiliar administrativo', 'assistente administrativo', 'secretari', 'recepcao administrativa'],
};
const ESCOLARIDADE = [
  ['Superior completo', /(superior completo|bacharel|licenciatura|graduad|graduacao completa)/],
  ['Superior incompleto', /(superior incompleto|cursando (o )?superior|graduacao em andamento|cursando .*faculdade)/],
  ['Técnico', /(tecnico em|curso tecnico)/],
  ['Ensino médio completo', /(ensino medio completo|2o grau completo|segundo grau completo)/],
  ['Ensino médio incompleto', /(ensino medio incompleto|cursando o ensino medio)/],
  ['Ensino fundamental', /(ensino fundamental|1o grau)/],
];

export function sugerirDoTexto(textoBruto) {
  const texto = norm(textoBruto);
  const funcoes = [];
  for (const [k, palavras] of Object.entries(FUNCOES)) {
    const hit = palavras.find((p) => texto.includes(p));
    if (!hit) continue;
    // Anos perto da função: "garçom ... 3 anos" (até 120 letras de distância).
    const i = texto.indexOf(hit);
    const perto = texto.slice(Math.max(0, i - 120), i + 160);
    const anos = Math.max(0, ...[...perto.matchAll(/(\d{1,2})\s*anos?/g)].map((m) => Number(m[1])).filter((n) => n < 50));
    const periodos = [...perto.matchAll(/(19|20)\d{2}\s*(?:-|a|ate|–)\s*((?:19|20)\d{2}|atual|hoje|o momento)/g)].length;
    funcoes.push({ funcao: k, nivel: anos >= 1 || periodos ? 'experiente' : 'ja-fiz', anos: anos || null });
  }
  const anosTotal = Math.max(0, ...[...texto.matchAll(/(\d{1,2})\s*anos? de experiencia/g)].map((m) => Number(m[1])));
  const esc = ESCOLARIDADE.find(([, re]) => re.test(texto));
  const cursos = String(textoBruto || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^(curso|certifica|nr-?\d|treinamento)/i.test(norm(l)) && l.length < 120)
    .slice(0, 8);
  return { funcoes, experienciaAnos: anosTotal || null, escolaridade: esc ? esc[0] : null, cursos, temTexto: texto.trim().length > 30 };
}
