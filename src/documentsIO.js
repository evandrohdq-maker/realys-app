// Parte do celular dos contratos e receitas: código do documento, PDF, imprimir, compartilhar,
// assinar com a biometria e pelo gov.br.
import { Linking } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { confirmBiometric } from './accounts';
import { contentOf, docHtml, docTitle } from './documents';

// Código do documento: muda se qualquer letra do conteúdo mudar.
export const hashOf = (doc) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, contentOf(doc));

// Assinar no Re@lys: confirma com a digital/rosto do celular.
export async function signWithBiometric(label) {
  const r = await confirmBiometric(`Assinar: ${label}`);
  // Celular sem digital/rosto cadastrado: vale a biometria facial do cadastro do Re@lys (já verificada).
  return r === 'ok' || r === 'sem';
}

const fileName = (doc, copyFor) =>
  `${docTitle(doc)}${copyFor ? ` - via ${copyFor}` : ''}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ._-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) + '.pdf';

// Gera o PDF (uma via para cada parte, com o nome dela no rodapé).
export async function makePdf(doc, copyFor) {
  const { uri } = await Print.printToFileAsync({ html: docHtml({ ...doc, copyFor }) });
  try {
    const dest = new File(Paths.document, fileName(doc, copyFor));
    if (dest.exists) dest.delete();
    new File(uri).move(dest);
    return dest.uri;
  } catch (e) {
    return uri;
  }
}

export async function sharePdf(doc, copyFor) {
  const uri = await makePdf(doc, copyFor);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: docTitle(doc), UTI: 'com.adobe.pdf' });
  return uri;
}

export const printDoc = (doc) => Print.printAsync({ html: docHtml(doc) });

// gov.br: o app gera o PDF, a pessoa assina no assinador gratuito do gov.br e anexa o PDF assinado.
export const GOVBR_URL = 'https://assinador.iti.br';
export async function startGovbr(doc) {
  const uri = await sharePdf(doc, 'assinatura gov.br');
  Linking.openURL(GOVBR_URL).catch(() => {});
  return uri;
}
export async function pickSignedPdf() {
  const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (r.canceled || !r.assets || !r.assets[0]) return null;
  const a = r.assets[0];
  try {
    const dest = new File(Paths.document, 'govbr_' + Date.now() + '.pdf');
    new File(a.uri).copy(dest);
    return { uri: dest.uri, name: a.name };
  } catch (e) {
    return { uri: a.uri, name: a.name };
  }
}
export async function shareFile(uri) {
  if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
}
