# Serviço de moderação de imagens do Realys: detecta nudez em fotos, vídeos e quadros das lives.
# Roda no próprio servidor (CPU basta; GPU se houver). Nenhuma foto sai do servidor.
# Fala com o servidor Node (src/moderacaoImagem.js) por HTTP local. Contrato:
#   GET  /health             -> { ok, model, device }
#   POST /nudez              { image: base64 }          -> { nudez: 0..1, decisao, rotulo }
#   POST /nudez/quadros      { frames: [base64, ...] }  -> { nudez: 0..1 (o pior quadro), decisao, quadro }
#
# decisao: "liberar" (abaixo de REVISAR), "revisar" (entre REVISAR e BLOQUEAR: vai para a equipe),
#          "bloquear" (a partir de BLOQUEAR). Biquíni, maiô e sunga ficam abaixo do limite de bloqueio:
#          na dúvida o modelo manda para revisão humana, nunca bloqueia sozinho por pouca certeza.
#
# Modelo: classificador de imagem em ONNX já treinado (código aberto). Padrão: um ViT de
# "normal" x "nsfw" (veja exportar_modelo.py, que baixa e converte na instalação do servidor).
# Variáveis:
#   MODERACAO_PORT       porta (padrão 8092; escute só em 127.0.0.1)
#   MODERACAO_MODEL      caminho do .onnx
#   MODERACAO_SIZE       lado da imagem de entrada (padrão 224)
#   MODERACAO_MEAN/STD   normalização por canal, ex.: "0.5,0.5,0.5"
#   MODERACAO_LABELS     rótulos na ordem da saída do modelo, ex.: "normal,nsfw"
#   MODERACAO_NSFW       quais rótulos contam como nudez, ex.: "nsfw" (vários: "porn,hentai,sexy")
#   MODERACAO_REVISAR    limite para revisão humana (padrão 0.5)
#   MODERACAO_BLOQUEAR   limite para bloquear na hora (padrão 0.85)
#   MODERACAO_STUB=1     modo de teste: sem modelo; imagem com o texto "NUDEZ" dá 0.99, "PRAIA" dá 0.6
import base64
import io
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STUB = os.environ.get('MODERACAO_STUB') == '1'
PORT = int(os.environ.get('MODERACAO_PORT', '8092'))
MODEL = os.environ.get('MODERACAO_MODEL', '')
SIZE = int(os.environ.get('MODERACAO_SIZE', '224'))
MEAN = [float(x) for x in os.environ.get('MODERACAO_MEAN', '0.5,0.5,0.5').split(',')]
STD = [float(x) for x in os.environ.get('MODERACAO_STD', '0.5,0.5,0.5').split(',')]
LABELS = [x.strip() for x in os.environ.get('MODERACAO_LABELS', 'normal,nsfw').split(',')]
NSFW = set(x.strip() for x in os.environ.get('MODERACAO_NSFW', 'nsfw').split(','))
REVISAR = float(os.environ.get('MODERACAO_REVISAR', '0.5'))
BLOQUEAR = float(os.environ.get('MODERACAO_BLOQUEAR', '0.85'))
MAX_BYTES = 15 * 1024 * 1024

_sess = None
_input = None
DEVICE = 'cpu'


def load_model():
    global _sess, _input, DEVICE
    if STUB:
        DEVICE = 'stub'
        return
    import onnxruntime as ort
    if not MODEL or not os.path.exists(MODEL):
        raise SystemExit('MODERACAO_MODEL aponta para um arquivo que não existe. Rode exportar_modelo.py.')
    providers = [p for p in ort.get_available_providers() if p in ('CUDAExecutionProvider', 'CPUExecutionProvider')]
    DEVICE = 'cuda' if 'CUDAExecutionProvider' in providers else 'cpu'
    _sess = ort.InferenceSession(MODEL, providers=providers)
    _input = _sess.get_inputs()[0].name


def decisao(score):
    if score >= BLOQUEAR:
        return 'bloquear'
    if score >= REVISAR:
        return 'revisar'
    return 'liberar'


def preprocess(raw):
    """Bytes da imagem -> tensor 1x3xSIZExSIZE normalizado (RGB)."""
    import numpy as np
    from PIL import Image, ImageOps
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img).convert('RGB')
    # Corta o centro quadrado e redimensiona (o que o classificador espera).
    w, h = img.size
    s = min(w, h)
    img = img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((SIZE, SIZE), Image.BILINEAR)
    x = np.asarray(img, dtype=np.float32) / 255.0
    x = (x - np.array(MEAN, dtype=np.float32)) / np.array(STD, dtype=np.float32)
    return x.transpose(2, 0, 1)[None, ...]


def score_of(raw):
    """Probabilidade de nudez (0 a 1) e o rótulo mais provável."""
    if STUB:
        if b'NUDEZ' in raw:
            return 0.99, 'nsfw'
        if b'PRAIA' in raw:
            return 0.6, 'nsfw'
        return 0.02, 'normal'
    import numpy as np
    out = _sess.run(None, {_input: preprocess(raw)})[0][0].astype(np.float64)
    # Logits ou probabilidades: softmax só quando a saída não soma 1.
    if out.min() < 0 or abs(out.sum() - 1) > 1e-3:
        e = np.exp(out - out.max())
        out = e / e.sum()
    labels = LABELS if len(LABELS) == len(out) else ['c%d' % i for i in range(len(out))]
    nsfw = float(sum(p for l, p in zip(labels, out) if l in NSFW))
    return nsfw, labels[int(out.argmax())]


class Handler(BaseHTTPRequestHandler):
    server_version = 'realys-moderacao/0.1'

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.command, self.path))

    def send_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get('Content-Length', '0'))
        if n > MAX_BYTES * 4:
            raise ValueError('arquivo grande demais')
        return json.loads(self.rfile.read(n) or b'{}')

    def do_GET(self):
        if self.path.rstrip('/') == '/health':
            return self.send_json(200, {'ok': True, 'model': 'stub' if STUB else os.path.basename(MODEL), 'device': DEVICE, 'revisar': REVISAR, 'bloquear': BLOQUEAR})
        self.send_json(404, {'error': 'não encontrado'})

    def do_POST(self):
        try:
            body = self.read_json()
            path = self.path.rstrip('/')
            if path == '/nudez':
                s, rot = score_of(base64.b64decode(body['image']))
                return self.send_json(200, {'nudez': round(s, 4), 'decisao': decisao(s), 'rotulo': rot})
            if path == '/nudez/quadros':
                frames = body.get('frames') or []
                if not frames:
                    return self.send_json(400, {'error': 'envie pelo menos um quadro'})
                worst, idx = 0.0, 0
                for i, f in enumerate(frames[:30]):
                    s, _ = score_of(base64.b64decode(f))
                    if s > worst:
                        worst, idx = s, i
                return self.send_json(200, {'nudez': round(worst, 4), 'decisao': decisao(worst), 'quadro': idx})
            self.send_json(404, {'error': 'não encontrado'})
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            self.send_json(400, {'error': str(e)})
        except Exception as e:  # falha do modelo: o servidor Node manda para revisão humana
            self.send_json(500, {'error': 'falha no modelo: ' + type(e).__name__})


if __name__ == '__main__':
    load_model()
    print('moderação de imagens no ar: 127.0.0.1:%d (%s)' % (PORT, DEVICE), flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
