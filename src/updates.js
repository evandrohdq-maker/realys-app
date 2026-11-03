// Atualização automática do APK.
// Cada APK sabe o número da própria versão (src/build.json, gravado pelo GitHub na hora de gerar).
// Ao abrir, o app pergunta ao GitHub qual é a versão mais nova publicada em Releases.
// Se for maior que a instalada, mostra o aviso e baixa o APK novo.
import { Linking } from 'react-native';
import BUILD from './build.json';

export const REPO = 'evandrohdq-maker/realys-app';
export const CURRENT_BUILD = Number(BUILD.build) || 0;
export const VERSION_LABEL = CURRENT_BUILD ? `versão ${CURRENT_BUILD}` : 'versão de desenvolvimento';

// Tag publicada pelo GitHub: "demo-12" -> 12
const buildFromTag = (tag) => {
  const m = String(tag || '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
};

export async function checkForUpdate() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error('GitHub respondeu ' + res.status);
  const rel = await res.json();
  const latest = buildFromTag(rel.tag_name);
  const apk = (rel.assets || []).find((a) => String(a.name).toLowerCase().endsWith('.apk'));
  return {
    available: !!apk && latest > CURRENT_BUILD,
    latest,
    current: CURRENT_BUILD,
    url: apk ? apk.browser_download_url : null,
    notes: (rel.body || '').trim(),
    name: rel.name || rel.tag_name,
  };
}

// O Android baixa o APK e, ao tocar na notificação de download, instala por cima
// (os dados e o login continuam, porque é o mesmo app com a mesma assinatura).
export function installUpdate(url) {
  return Linking.openURL(url);
}
