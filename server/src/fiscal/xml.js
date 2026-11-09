// XML das notas fiscais e assinatura digital (XMLDSig), sem depender de nenhum pacote.
//
// O XML é montado já na forma canônica (C14N 1.0): sem declaração <?xml?>, sem espaços entre as tags,
// sem tags que se fecham sozinhas e com os caracteres especiais escapados. Assim o texto que assinamos é
// exatamente o que a Receita vai canonizar do lado dela, e a assinatura confere.
import { createHash, createSign, createVerify, X509Certificate } from 'node:crypto';

const DSIG = 'http://www.w3.org/2000/09/xmldsig#';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

export const esc = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#xD;');
const escAttr = (v) => esc(v).replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;');

// el('tag', { atributo }, filhos...) devolve o texto canônico do elemento.
// Filhos null/undefined/false são ignorados (campos opcionais); arrays são achatados.
export function el(name, attrs, ...children) {
  if (attrs == null || typeof attrs !== 'object' || Array.isArray(attrs)) {
    children.unshift(attrs);
    attrs = {};
  }
  // C14N: declarações de namespace primeiro, depois os atributos em ordem alfabética.
  const keys = Object.keys(attrs).filter((k) => attrs[k] != null);
  const ns = keys.filter((k) => k === 'xmlns' || k.startsWith('xmlns:')).sort();
  const other = keys.filter((k) => !ns.includes(k)).sort();
  const a = [...ns, ...other].map((k) => ` ${k}="${escAttr(attrs[k])}"`).join('');
  const body = children
    .flat(Infinity)
    .filter((c) => c != null && c !== false && c !== '')
    .map((c) => (typeof c === 'object' && c.xml ? c.xml : typeof c === 'string' && c.startsWith('<') ? c : esc(c)))
    .join('');
  return `<${name}${a}>${body}</${name}>`;
}
// Texto puro dentro de um elemento (para não confundir um valor que começa com "<" com uma tag).
export const txt = (name, value) => (value == null || value === '' ? null : `<${name}>${esc(value)}</${name}>`);

const sha256b64 = (s) => createHash('sha256').update(s, 'utf8').digest('base64');

// Tira o cabeçalho do PEM do certificado (vai dentro da assinatura, em <X509Certificate>).
export const certBase64 = (certPem) => String(certPem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');

// Assina o elemento <tag Id="..."> que está dentro de `xml` (assinatura "enveloped", RSA-SHA256).
// nsDoElemento = namespace que o elemento herda do pai (entra na forma canônica dele, como manda o C14N).
// A <Signature> é colocada logo depois do elemento assinado, dentro do elemento raiz.
export function assinar(xml, { tag, id, nsDoElemento, keyPem, certPem }) {
  const abre = xml.indexOf(`<${tag} `);
  const fecha = xml.indexOf(`</${tag}>`, abre);
  if (abre < 0 || fecha < 0) throw new Error(`Elemento <${tag}> não encontrado para assinar.`);
  const fim = fecha + tag.length + 3;
  let alvo = xml.slice(abre, fim);
  // Forma canônica do elemento sozinho: herda a declaração de namespace do pai.
  if (nsDoElemento && !/^<[^>]*\sxmlns=/.test(alvo)) alvo = alvo.replace(`<${tag} `, `<${tag} xmlns="${nsDoElemento}" `);
  const digest = sha256b64(alvo);
  const signedInfo = el('SignedInfo', { xmlns: DSIG },
    el('CanonicalizationMethod', { Algorithm: C14N }),
    el('SignatureMethod', { Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256' }),
    el('Reference', { URI: `#${id}` },
      el('Transforms',
        el('Transform', { Algorithm: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature' }),
        el('Transform', { Algorithm: C14N })),
      el('DigestMethod', { Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256' }),
      txt('DigestValue', digest)));
  const valor = createSign('RSA-SHA256').update(signedInfo, 'utf8').sign(keyPem, 'base64');
  const signature = el('Signature', { xmlns: DSIG },
    signedInfo,
    txt('SignatureValue', valor),
    el('KeyInfo', el('X509Data', txt('X509Certificate', certBase64(certPem)))));
  return xml.slice(0, fim) + signature + xml.slice(fim);
}

// Confere uma assinatura feita por assinar() (usado nos testes e para conferir antes de enviar).
export function conferirAssinatura(xmlAssinado, { tag, nsDoElemento, publicKeyPem }) {
  const s = xmlAssinado.indexOf(`<Signature xmlns="${DSIG}">`);
  const e = xmlAssinado.indexOf('</Signature>', s) + '</Signature>'.length;
  const signature = xmlAssinado.slice(s, e);
  const semAssinatura = xmlAssinado.slice(0, s) + xmlAssinado.slice(e);
  const abre = semAssinatura.indexOf(`<${tag} `);
  const fim = semAssinatura.indexOf(`</${tag}>`, abre) + tag.length + 3;
  let alvo = semAssinatura.slice(abre, fim);
  if (nsDoElemento && !/^<[^>]*\sxmlns=/.test(alvo)) alvo = alvo.replace(`<${tag} `, `<${tag} xmlns="${nsDoElemento}" `);
  const digest = signature.match(/<DigestValue>([^<]+)<\/DigestValue>/)[1];
  if (digest !== sha256b64(alvo)) return false;
  const signedInfo = signature.match(/<SignedInfo[\s\S]*<\/SignedInfo>/)[0];
  const valor = signature.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)[1];
  return createVerify('RSA-SHA256').update(signedInfo, 'utf8').verify(publicKeyPem, valor, 'base64');
}

// Dados do certificado digital (A1): validade e CNPJ do titular, para avisar antes de vencer.
export function infoCertificado(certPem) {
  const c = new X509Certificate(certPem);
  const cnpj = (c.subject.match(/(\d{14})/) || [])[1] || null;
  return { titular: c.subject, validoAte: new Date(c.validTo).getTime(), cnpj };
}
