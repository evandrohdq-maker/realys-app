// Editor de vídeo (app): fala com o servidor (assinatura, gerar o vídeo, acompanhar, gravações das
// lives) e abre o editor por cima de qualquer tela: abrirEditor({ paginaId, titulo, clipes }).
import { useEffect, useState } from 'react';
import { api, API_URL, uploadMedia } from './api';

export const full = (u) => (u && typeof u === 'string' && u.startsWith('/') ? API_URL + u : u || null);
const isLocal = (u) => typeof u === 'string' && /^(file|content|blob|data|ph|assets-library):/i.test(u);
const caminho = (u) => (u && u.startsWith(API_URL) ? u.slice(API_URL.length) : u);

export const planoEditor = () => api('GET', '/edicao/plano');
export const assinarEditor = () => api('POST', '/edicao/assinar');
export const cancelarEditor = () => api('POST', '/edicao/cancelar');
export const meusVideos = () => api('GET', '/edicao/videos');
export const videoGerado = (id) => api('GET', `/edicao/videos/${id}`);
export const gravacoesDasLives = () => api('GET', '/edicao/gravacoes');

// Sobe os clipes que ainda estão só no celular (guarda o endereço para não subir duas vezes).
const subidos = new Map();
export async function subirClipe(uri) {
  if (!isLocal(uri)) return caminho(uri);
  if (subidos.has(uri)) return subidos.get(uri);
  const url = caminho(await uploadMedia(uri, /\.mov(\?|$)/i.test(uri) ? 'video/quicktime' : 'video/mp4'));
  subidos.set(uri, url);
  return url;
}

// Receita do app -> pedido ao servidor. onEtapa(texto) mostra "Enviando clipe 1 de 3".
export async function gerarVideo(r, onEtapa) {
  const clipes = [];
  for (let i = 0; i < r.clipes.length; i++) {
    const c = r.clipes[i];
    if (onEtapa && isLocal(c.uri)) onEtapa(`Enviando clipe ${i + 1} de ${r.clipes.length}…`);
    clipes.push({ media: await subirClipe(c.uri), start: c.start, end: c.end, speed: c.speed });
  }
  if (onEtapa) onEtapa('Na fila do servidor…');
  return api('POST', '/edicao/videos', {
    titulo: r.titulo || undefined,
    clipes,
    textos: r.textos,
    musica: r.musica ? { url: caminho(r.musica.url), start: r.musica.start || 0, volume: r.volMusica } : undefined,
    somOriginal: r.volOriginal,
    filtro: r.filtro,
    brilho: r.brilho,
    contraste: r.contraste,
    saturacao: r.saturacao,
    formato: r.formato,
    capaEm: r.capaEm,
  });
}

// ---------- Abrir o editor de qualquer tela ----------
let aberto = null;
const subs = new Set();
export function abrirEditor(opts = {}) {
  aberto = { ...opts, at: Date.now() };
  subs.forEach((fn) => fn());
}
export function fecharEditor() {
  aberto = null;
  subs.forEach((fn) => fn());
}
export function useEditorAberto() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return aberto;
}

export const FILTROS = [
  ['nenhum', 'Original'],
  ['vivo', 'Vivo'],
  ['quente', 'Quente'],
  ['frio', 'Frio'],
  ['suave', 'Suave'],
  ['pb', 'P&B'],
];
export const FORMATOS = [
  ['vertical', 'Vertical 9:16', 9 / 16],
  ['quadrado', 'Quadrado 1:1', 1],
  ['horizontal', 'Deitado 16:9', 16 / 9],
];
export const VELOCIDADES = [0.5, 1, 1.5, 2];
export const mmss = (s) => {
  const v = Math.max(0, Math.round(s * 10) / 10);
  const m = Math.floor(v / 60);
  const r = v - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1).replace('.', ',')}`;
};
