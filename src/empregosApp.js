// Empregos (contas reais): as listas das telas e as chamadas ao servidor.
import { api } from './api';

export const FUNCOES_EMPREGO = [
  { key: 'garcom', label: 'Garçom / garçonete', icon: 'wine-outline' },
  { key: 'barman', label: 'Barman / barista', icon: 'beer-outline' },
  { key: 'cozinha', label: 'Cozinheiro(a), pizzaiolo, confeiteiro(a)', icon: 'restaurant-outline' },
  { key: 'aux-cozinha', label: 'Auxiliar de cozinha', icon: 'flame-outline' },
  { key: 'copa', label: 'Copeiro(a) / lavagem', icon: 'water-outline' },
  { key: 'recepcao', label: 'Recepcionista', icon: 'people-outline' },
  { key: 'caixa', label: 'Caixa', icon: 'cash-outline' },
  { key: 'vendedor', label: 'Vendedor(a)', icon: 'storefront-outline' },
  { key: 'estoque', label: 'Estoque / conferente', icon: 'cube-outline' },
  { key: 'administrativo', label: 'Administrativo', icon: 'document-text-outline' },
  { key: 'seguranca', label: 'Segurança / portaria', icon: 'shield-outline' },
  { key: 'limpeza', label: 'Limpeza / serviços gerais', icon: 'sparkles-outline' },
  { key: 'montagem', label: 'Montagem de evento', icon: 'construct-outline' },
  { key: 'promotor', label: 'Promotor(a) / repositor(a)', icon: 'megaphone-outline' },
  { key: 'entregador', label: 'Entregador(a)', icon: 'bicycle-outline' },
  { key: 'motorista', label: 'Motorista', icon: 'car-outline' },
];
export const funcaoEmprego = (k) => (FUNCOES_EMPREGO.find((f) => f.key === k) || {}).label || k;
export const TIPOS = [
  { key: 'clt', label: 'CLT' },
  { key: 'temporario', label: 'Temporário' },
  { key: 'extra', label: 'Extra (dia/turno)' },
  { key: 'freela', label: 'Freela' },
  { key: 'estagio', label: 'Estágio' },
];
export const ESCOLARIDADES = ['Ensino fundamental', 'Ensino médio incompleto', 'Ensino médio completo', 'Técnico', 'Superior incompleto', 'Superior completo'];
export const DISTANCIAS = [3, 5, 10, 20, 50];
export const STATUS_CAND = {
  convidado: 'Convite recebido',
  enviada: 'Enviada',
  vista: 'Vista pela empresa',
  entrevista: 'Entrevista marcada',
  contratado: 'Contratado(a) 🎉',
  recusado: 'Não seguiu desta vez',
  recusou: 'Você recusou',
};

// Arquivos aceitos no currículo (o servidor confere de novo).
export const MIMES_CURRICULO = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'application/rtf',
  'text/rtf',
];
const MIME_POR_EXT = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', odt: 'application/vnd.oasis.opendocument.text', txt: 'text/plain', rtf: 'application/rtf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const mimeDoArquivo = (nome, mime) => (mime && mime !== 'application/octet-stream' ? mime : MIME_POR_EXT[String(nome || '').split('.').pop().toLowerCase()] || 'application/pdf');

export async function enviarArquivo(uri, nome, mime) {
  const buf = await (await fetch(uri)).arrayBuffer();
  return api('PUT', `/curriculo/arquivo?nome=${encodeURIComponent(nome || 'curriculo')}`, buf, { 'Content-Type': mimeDoArquivo(nome, mime) });
}
