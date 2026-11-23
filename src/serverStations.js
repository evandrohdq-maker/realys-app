// Rádios e TVs de verdade (servidor, server/src/routes/estacoes.js). Na demonstração tudo continua no
// celular (src/radio.js e src/tv.js). Com o servidor:
//  - as estações de todos aparecem no Stream (com logo e capa, que sobem junto ao salvar);
//  - seguir fica guardado no servidor;
//  - o dono avisa os seguidores quando entra ao vivo (chega na hora ou como notificação).
import { Alert } from 'react-native';
import { api, serverOn, uploadMedia, mediaUrl, connectEvents } from './api';
import { mergeServerRadios } from './radio';
import { mergeServerTvs } from './tv';

const local = (u) => !!u && typeof u === 'string' && !/^https?:\/\//.test(u) && !u.startsWith('/media/');
const fromServer = (e) => ({ ...e, logo: mediaUrl(e.logo), cover: mediaUrl(e.cover), example: false });
let ouvindo = null;

export async function syncStations(kind) {
  if (!serverOn()) return;
  if (!ouvindo)
    ouvindo = connectEvents((ev) => {
      if (ev.type !== 'estacao-aovivo' || !ev.data) return;
      const d = ev.data;
      Alert.alert(`${d.kind === 'tv' ? '📺' : '📻'} ${d.name} ao vivo`, d.texto || 'No ar agora!');
    });
  const list = await api('GET', `/estacoes?kind=${kind}`).catch(() => null);
  if (!list) return;
  (kind === 'tv' ? mergeServerTvs : mergeServerRadios)(list.map(fromServer));
}

// Salvar a minha estação: sobe a logo e a capa (se forem do celular) e grava no servidor.
export async function publishStation(kind, item) {
  const up = async (uri) => (local(uri) ? uploadMedia(uri, /\.png(\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg') : uri || null);
  const [logo, cover] = await Promise.all([up(item.logo), up(item.cover)]);
  const e = await api('POST', '/estacoes', {
    id: item.id && String(item.id).startsWith('es_') ? item.id : undefined,
    kind, name: item.name, url: item.url, genre: item.genre, city: item.city, cat: item.cat, emoji: item.emoji, logo, cover,
  });
  await syncStations(kind);
  return fromServer(e);
}

export const isServerStation = (id) => String(id || '').startsWith('es_');
export async function unpublishStation(kind, id) {
  await api('DELETE', `/estacoes/${id}`);
  await syncStations(kind);
}
export const followStation = (id) => api('POST', `/estacoes/${id}/seguir`);
export const announceLive = (id, texto) => api('POST', `/estacoes/${id}/aovivo`, texto ? { texto } : {});
