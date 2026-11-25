// Pioneiros no app e no site: o link do vendedor e o link do titular.
//
// Link do vendedor: realyz.com.br/?pioneiro=food&v=Joao  → abre o cadastro; depois de criar a conta, a
//   vaga de pioneiro daquela área é reservada para ela e o Acordo aparece para assinar.
// Link do titular: realyz.com.br/?titular=<código>  → o dono do CNPJ entra na conta da empresa (uso único,
//   24 horas), faz a biometria e assina o Acordo do próprio celular.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'realyz.pioneiro.intencao';

// Lê (uma vez) os parâmetros do endereço do site e tira eles da barra, para não repetir ao recarregar.
let lidos = null;
export function parametrosDoSite() {
  if (lidos) return lidos;
  lidos = {};
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location) return lidos;
  try {
    const q = new URLSearchParams(window.location.search);
    const area = q.get('pioneiro');
    const titular = q.get('titular');
    if (area) lidos.pioneiro = { area: area.slice(0, 30), vendedor: (q.get('v') || '').slice(0, 60), titularWhatsapp: (q.get('tw') || '').replace(/\D/g, '').slice(0, 13) };
    if (titular) lidos.titular = titular.slice(0, 120);
    if (area || titular) {
      ['pioneiro', 'v', 'tw', 'titular'].forEach((k) => q.delete(k));
      const resto = q.toString();
      window.history.replaceState(null, '', window.location.pathname + (resto ? '?' + resto : '') + window.location.hash);
    }
    if (lidos.pioneiro) guardarIntencao(lidos.pioneiro);
  } catch (e) {}
  return lidos;
}

// A vaga escolhida no link do vendedor espera o cadastro terminar.
export const guardarIntencao = (x) => AsyncStorage.setItem(KEY, JSON.stringify({ ...x, em: Date.now() })).catch(() => {});
export async function lerIntencao() {
  try {
    const x = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
    if (x && Date.now() - (x.em || 0) < 7 * 86400000) return x;
  } catch (e) {}
  return null;
}
export const limparIntencao = () => AsyncStorage.removeItem(KEY).catch(() => {});

export const fmtData = (t) => (t ? new Date(t).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '');
export const fmtReais = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
export const numPioneiro = (n) => (n ? 'nº ' + String(n).padStart(3, '0') : '');

// PDF do acordo assinado (o mesmo texto que o servidor guardou, com o código de conferência).
export function acordoHtml(s) {
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const a = s.acordo;
  const ass = s.assinado;
  const corpo = a.clausulas
    .map(([t, c]) => `<h3>${esc(t)}</h3>${Array.isArray(c) ? `<ul>${c.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(c)}</p>`}`)
    .join('');
  return `<html><head><meta charset="utf-8"/><style>
  body{font-family:Helvetica,Arial,sans-serif;color:#14120E;padding:28px;font-size:13px;line-height:1.5}
  h1{font-size:20px;margin:0}.sub{color:#5B564B;margin:4px 0 16px}h3{font-size:14px;margin:16px 0 4px}
  ul{margin:4px 0 0 18px;padding:0}.box{border:1px solid #E6DAC0;border-radius:10px;padding:12px;margin-top:20px;background:#FBF8F1}
  .ok{color:#1E9E63;font-weight:bold}.code{font-family:monospace;font-size:10px;word-break:break-all;color:#5B564B}
  </style></head><body>
  <h1>${esc(a.titulo)}${s.pioneiro.numero ? ' · Pioneiro ' + esc(numPioneiro(s.pioneiro.numero)) : ''}</h1>
  <div class="sub">${esc(s.pioneiro.nome)} · ${esc(s.pioneiro.areaNome)} · Versão ${esc(a.versao)}</div>
  ${corpo}
  <div class="box">${ass ? `<span class="ok">✔ Assinado com a confirmação do rosto no Realyz em ${esc(new Date(ass.em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</span><br/>Código de conferência: <b>${esc(ass.codigo)}</b>${ass.verificar ? ` · confira em ${esc(ass.verificar)}` : ''}<br/>` : 'Aguardando assinatura<br/>'}
  <span class="code">Impressão digital do texto (SHA-256): ${esc(ass ? ass.hash : a.hash)}</span></div>
  </body></html>`;
}
