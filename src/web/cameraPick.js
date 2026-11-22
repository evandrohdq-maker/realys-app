// Só no site: escolhe a câmera certa sozinho, sem a pessoa mexer nas configurações do navegador.
// Computadores com mais de uma câmera (ex.: DroidCam, OBS, ManyCam instalados) às vezes abrem a
// câmera virtual, que mostra só "Start DroidCam" ou fica preta. Aqui, sempre que o site pede a câmera
// (Now, chamadas, lives), o pedido passa por este filtro:
//   1) se a pessoa já usou uma câmera que funcionou, usa ela de novo;
//   2) se o navegador abriu uma câmera virtual e existe uma webcam de verdade, troca para a webcam;
//   3) se a única câmera for a virtual (ex.: celular como webcam pelo DroidCam), usa ela mesmo.
// Não muda nada no APK: no celular a câmera é a do próprio aparelho.
const KEY = 'realyz.camera';
const VIRTUAL = /droidcam|obs|virtual|manycam|snap camera|xsplit|splitcam|iriun|epoccam|ndi|camo|e2esoft|youcam/i;

let installed = false;
export function installCameraPick() {
  if (installed || typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  installed = true;
  const md = navigator.mediaDevices;
  const original = md.getUserMedia.bind(md);
  const read = () => {
    try {
      return window.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  };
  const save = (id) => {
    try {
      window.localStorage.setItem(KEY, id);
    } catch (e) {}
  };
  const withDevice = (c, id) => ({ ...c, video: { ...(typeof c.video === 'object' ? c.video : {}), deviceId: { exact: id }, facingMode: undefined } });
  const pickedByCaller = (c) => c && typeof c.video === 'object' && c.video.deviceId;
  const isVirtual = (label) => VIRTUAL.test(label || '');

  md.getUserMedia = async (constraints) => {
    // Só mexe em pedidos de câmera sem câmera escolhida por quem chamou (ex.: compartilhar tela fica igual).
    if (!constraints || !constraints.video || pickedByCaller(constraints)) return original(constraints);
    // 1) A câmera que já deu certo antes.
    const saved = read();
    if (saved) {
      try {
        return await original(withDevice(constraints, saved));
      } catch (e) {
        // ela sumiu (desconectou): segue escolhendo de novo
      }
    }
    const stream = await original(constraints);
    try {
      const track = stream.getVideoTracks()[0];
      const label = track ? track.label : '';
      if (!isVirtual(label)) {
        const id = track && track.getSettings && track.getSettings().deviceId;
        if (id) save(id);
        return stream;
      }
      // 2) Abriu uma câmera virtual: procura uma webcam de verdade (os nomes só aparecem depois da permissão).
      const cams = (await md.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const real = cams.find((d) => d.label && !isVirtual(d.label));
      if (!real) return stream; // 3) só tem a virtual: usa ela mesmo
      stream.getTracks().forEach((t) => t.stop());
      try {
        const better = await original(withDevice(constraints, real.deviceId));
        save(real.deviceId);
        return better;
      } catch (e) {
        return original(constraints); // a webcam não abriu: volta para a que o navegador escolheu
      }
    } catch (e) {
      return stream;
    }
  };
}

// Para um botão "trocar câmera" no futuro: esquece a escolha e deixa o filtro escolher de novo.
export const resetCameraPick = () => {
  try {
    window.localStorage.removeItem(KEY);
  } catch (e) {}
};
