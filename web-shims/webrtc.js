// Só no site: a mesma "cara" do react-native-webrtc, usando o WebRTC do próprio navegador.
// Assim a câmera, as lives, as chamadas e a tela compartilhada também funcionam no realyz.com.br.
const React = require('react');

const has = typeof window !== 'undefined' && !!window.RTCPeerConnection;
const streams = new Map();
let seq = 0;

// No celular, o vídeo aparece pelo "endereço" do stream (stream.toURL()). No navegador, guardamos o
// stream e o <video> busca por esse endereço.
if (has && window.MediaStream && !window.MediaStream.prototype.toURL) {
  window.MediaStream.prototype.toURL = function toURL() {
    if (!this.__rzUrl) {
      seq += 1;
      this.__rzUrl = `rzstream:${seq}`;
      streams.set(this.__rzUrl, this);
    }
    return this.__rzUrl;
  };
}

function RTCView({ streamURL, style, objectFit = 'cover', mirror = false, muted = true }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = streams.get(streamURL) || null;
    if (el.srcObject !== s) el.srcObject = s;
    if (s) el.play && el.play().catch(() => {});
  }, [streamURL]);
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {};
  return React.createElement('video', {
    ref,
    autoPlay: true,
    playsInline: true,
    muted,
    style: { ...flat, objectFit, transform: mirror ? 'scaleX(-1)' : undefined, display: 'block', backgroundColor: flat.backgroundColor || '#000' },
  });
}

module.exports = has
  ? {
      RTCPeerConnection: window.RTCPeerConnection,
      RTCSessionDescription: window.RTCSessionDescription,
      RTCIceCandidate: window.RTCIceCandidate,
      MediaStream: window.MediaStream,
      mediaDevices: navigator.mediaDevices,
      RTCView,
    }
  : {};
