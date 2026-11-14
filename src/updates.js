// Atualização do APK por dentro do próprio app.
// Com o módulo nativo RealysUpdater (Android 12+), a atualização é automática: o app baixa,
// se instala por cima sozinho (sem a tela "Deseja atualizar?"), apaga o arquivo e reabre.
// O Android só exige, uma única vez, a chave "Instalar apps desconhecidos" do Re@lys ligada.
// Sem o módulo (ou Android antigo), cai no instalador normal do Android, como antes.
// Cada APK sabe o número da própria versão (src/build.json, gravado pelo GitHub na hora de gerar).
// Ao abrir, o app pergunta ao GitHub qual é a versão mais nova publicada em Releases.
// Se for maior, o próprio Re@lys baixa o APK para a pasta interna dele (não vai para Downloads),
// abre o instalador do Android por cima do app atual (mesmo pacote e mesma assinatura = atualização,
// não um app novo) e depois apaga o arquivo. Nada fica sobrando no celular.
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import BUILD from './build.json';

let Native = null;
try {
  // eslint-disable-next-line global-require
  Native = require('expo-modules-core').requireOptionalNativeModule('RealysUpdater');
} catch (e) {
  Native = null;
}

// O celular aceita atualizar o Re@lys sozinho, sem perguntar? (Android 12+ com o módulo)
export const supportsAutoUpdate = () => {
  try {
    return Platform.OS === 'android' && !!Native && Native.supportsSilentUpdate();
  } catch (e) {
    return false;
  }
};
// A chave "Instalar apps desconhecidos" do Re@lys já foi ligada?
export const hasInstallPermission = () => {
  try {
    return !Native || Native.canRequestInstalls();
  } catch (e) {
    return true;
  }
};
// Abre direto a chave nas configurações (só precisa uma vez na vida do app).
export const openInstallPermission = () => {
  try {
    Native && Native.openInstallPermission();
  } catch (e) {}
};
// Acompanha o resultado: 'success' | 'confirm' | 'cancelled' | 'failed'.
export const onInstallStatus = (fn) => {
  if (!Native || !Native.addListener) return () => {};
  const sub = Native.addListener('onInstallStatus', (e) => fn(e && e.status, e && e.message));
  return () => sub && sub.remove && sub.remove();
};

export const REPO = 'evandrohdq-maker/realys-app';
export const CURRENT_BUILD = Number(BUILD.build) || 0;
export const VERSION_LABEL = CURRENT_BUILD ? `versão ${CURRENT_BUILD}` : 'versão de desenvolvimento';

// Sempre o mesmo nome: um download novo substitui o anterior, nunca acumula.
const APK_NAME = 'realys-update.apk';
const apkFile = () => new File(Paths.cache, APK_NAME);

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
    size: apk ? apk.size : 0,
    notes: (rel.body || '').trim(),
    name: rel.name || rel.tag_name,
  };
}

// Apaga o APK que ficou da última atualização. Roda toda vez que o app abre:
// se o app abriu já atualizado, o arquivo não serve mais para nada.
export function cleanupOldUpdate() {
  try {
    const f = apkFile();
    if (f.exists) f.delete();
  } catch (e) {
    // sem problema: o Android também limpa a pasta de cache sozinho
  }
}

// Baixa o APK para dentro do app e abre a tela "Deseja atualizar este app?" do Android.
// onStage('downloading' | 'installing') avisa a tela em que passo está.
export async function installUpdate(url, onStage) {
  if (Platform.OS !== 'android') throw new Error('Atualização de APK só existe no Android');

  cleanupOldUpdate();
  onStage && onStage('downloading');
  const file = await File.downloadFileAsync(url, apkFile(), { idempotent: true });

  onStage && onStage('installing');
  if (Native) {
    try {
      // Instala por cima pelo PackageInstaller e já apaga o arquivo baixado.
      await Native.install(file.uri);
      return 'native';
    } catch (e) {
      // se o módulo falhar, segue pelo instalador normal abaixo
    }
  }
  // VIEW + tipo de pacote abre o instalador do sistema. O flag 1 (FLAG_GRANT_READ_URI_PERMISSION)
  // deixa o instalador ler o arquivo, que continua privado do Re@lys.
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1,
  });
  // Não apaga aqui: o instalador ainda pode estar lendo o arquivo.
  // Ele fica na pasta privada do Re@lys (invisível para a pessoa) e é apagado na próxima abertura.
  return 'intent';
}
