# Serviço de reconhecimento facial do Realys (roda na GPU, ou na CPU se não houver GPU).
# Fala com o servidor Node (src/biometria/matcher.js) por HTTP local. Contrato:
#   GET  /health    -> { ok, model, device }
#   POST /embed     { image: base64 }  -> { embedding: [512 floats] | null, faces: n }
#   POST /liveness  { image: base64 }  -> { live: bool, score: float }
#   POST /scan      { videos: [b64, b64], photos: [b64, b64] }
#                   -> { live, movement, embedding: [512] | null, faces }
#                   Scan completo: 2 vídeos de 3 s (movimento e prova de vida) + 2 fotos (aproximado e afastado).
#
# Variáveis:
#   BIOMETRIA_PORT          porta (padrão 8091; escute só em 127.0.0.1)
#   BIOMETRIA_MODEL_EMBED   caminho do modelo ONNX de rosto (ex.: um modelo ArcFace de licença comercial)
#   BIOMETRIA_MODEL_LIVE    caminho do modelo ONNX de prova de vida (opcional: sem ele, liveness = recusa)
#   BIOMETRIA_STUB=1        modo de teste: não usa modelo, devolve vetores determinísticos (só para testar a ligação)
#
# O detector de rosto usa o classificador Haar do OpenCV (cv2). Sem cv2 e sem modo stub, o serviço não sobe.
import base64
import hashlib
import io
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STUB = os.environ.get('BIOMETRIA_STUB') == '1'
PORT = int(os.environ.get('BIOMETRIA_PORT', '8091'))
MODEL_EMBED = os.environ.get('BIOMETRIA_MODEL_EMBED', '')
MODEL_LIVE = os.environ.get('BIOMETRIA_MODEL_LIVE', '')
MOVE_MIN = float(os.environ.get('BIOMETRIA_MOVE_MIN', '1.5'))  # variação média entre quadros (0 a 255) para contar movimento

_embed_sess = None
_live_sess = None
_detector = None
DEVICE = 'cpu'


def load_models():
    """Carrega os modelos uma vez. Usa GPU (CUDA) se o onnxruntime tiver."""
    global _embed_sess, _live_sess, _detector, DEVICE
    if STUB:
        DEVICE = 'stub'
        return
    import cv2
    import onnxruntime as ort
    providers = [p for p in ort.get_available_providers() if p in ('CUDAExecutionProvider', 'CPUExecutionProvider')]
    DEVICE = 'cuda' if 'CUDAExecutionProvider' in providers else 'cpu'
    if not MODEL_EMBED or not os.path.exists(MODEL_EMBED):
        raise SystemExit('BIOMETRIA_MODEL_EMBED aponta para um arquivo que não existe.')
    _embed_sess = ort.InferenceSession(MODEL_EMBED, providers=providers)
    if MODEL_LIVE and os.path.exists(MODEL_LIVE):
        _live_sess = ort.InferenceSession(MODEL_LIVE, providers=providers)
    _detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def decode_image(b64):
    """Base64 -> imagem BGR (OpenCV) ou bytes, se o modo stub estiver ligado."""
    raw = base64.b64decode(b64)
    if STUB:
        return raw
    import cv2
    import numpy as np
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('imagem inválida')
    return img


def stub_embedding(raw):
    """Vetor de 512 números derivado do conteúdo: mesma imagem, mesmo vetor. Só para testes."""
    h = hashlib.sha512(raw).digest() * 8
    vals = [((b - 127.5) / 127.5) for b in h[:512]]
    norm = sum(v * v for v in vals) ** 0.5 or 1.0
    return [v / norm for v in vals]


def find_face(img):
    import cv2
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = _detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None, 0
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])  # maior rosto
    return (x, y, w, h), len(faces)


def embed(img):
    import cv2
    import numpy as np
    box, n = find_face(img)
    if box is None:
        return None, 0
    x, y, w, h = box
    crop = cv2.resize(img[y:y + h, x:x + w], (112, 112))
    blob = ((crop[:, :, ::-1].astype(np.float32) - 127.5) / 127.5).transpose(2, 0, 1)[None]
    vec = _embed_sess.run(None, {_embed_sess.get_inputs()[0].name: blob})[0][0]
    vec = vec / (np.linalg.norm(vec) or 1.0)
    return vec.tolist(), n


def liveness(img):
    """Prova de vida. Sem modelo de prova de vida, recusa (nunca aprova no escuro)."""
    if _live_sess is None:
        return False, 0.0
    import cv2
    import numpy as np
    box, _ = find_face(img)
    if box is None:
        return False, 0.0
    x, y, w, h = box
    crop = cv2.resize(img[y:y + h, x:x + w], (128, 128))
    blob = (crop[:, :, ::-1].astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
    out = _live_sess.run(None, {_live_sess.get_inputs()[0].name: blob})[0]
    score = float(np.ravel(out)[-1])
    return score >= 0.5, round(score, 4)


# Foto do documento: tem que dar para ler (nítida, boa resolução) e não pode ter reflexo.
# Os limites são de ajuste (variáveis de ambiente); calibrar com documentos reais.
DOC_SHARP_MIN = float(os.environ.get('BIOMETRIA_DOC_SHARP_MIN', '80'))   # variância do Laplaciano
DOC_GLARE_MAX = float(os.environ.get('BIOMETRIA_DOC_GLARE_MAX', '0.03'))  # fração de pixels estourados
DOC_MIN_SIDE = int(os.environ.get('BIOMETRIA_DOC_MIN_SIDE', '600'))       # menor lado, em pixels


def doc_quality(img):
    """Devolve { legivel, motivo }. Recusa com o motivo para o cliente tirar a foto de novo."""
    borrada = 'Foto do documento borrada. Tire de novo, com a câmera parada e boa luz.'
    reflexo = 'Há reflexo sobre o documento. Tire a foto sem luz direta nem flash, em outro ângulo.'
    if STUB:
        if b'DOC-BORRADO' in img:
            return {'legivel': False, 'motivo': borrada}
        if b'DOC-REFLEXO' in img:
            return {'legivel': False, 'motivo': reflexo}
        return {'legivel': True, 'motivo': None}
    import cv2
    import numpy as np
    h, w = img.shape[:2]
    if min(h, w) < DOC_MIN_SIDE:
        return {'legivel': False, 'motivo': 'Foto do documento com resolução baixa. Aproxime o celular e tire de novo.'}
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < DOC_SHARP_MIN:
        return {'legivel': False, 'motivo': borrada}
    if float(np.mean(gray >= 250)) > DOC_GLARE_MAX:
        return {'legivel': False, 'motivo': reflexo}
    return {'legivel': True, 'motivo': None}


def read_video_frames(raw, max_frames=12):
    """Quadros em tons de cinza e pequenos, espaçados ao longo do vídeo."""
    import cv2
    import numpy as np
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=True) as f:
        f.write(raw)
        f.flush()
        cap = cv2.VideoCapture(f.name)
        todos = []
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            todos.append(cv2.resize(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY), (160, 120)).astype(np.float32))
        cap.release()
    if len(todos) <= max_frames:
        return todos
    idx = np.linspace(0, len(todos) - 1, max_frames).astype(int)
    return [todos[i] for i in idx]


def movement_of(raw):
    """Quanto a cena muda de um quadro para o outro. Foto parada na frente da câmera fica perto de zero."""
    import numpy as np
    quadros = read_video_frames(raw)
    if len(quadros) < 2:
        return 0.0
    return float(np.mean([np.mean(np.abs(quadros[i + 1] - quadros[i])) for i in range(len(quadros) - 1)]))


def scan(videos, photos):
    """Scan completo. Sem prova de vida (modelo) o resultado é 'não vivo': nunca aprova no escuro."""
    import numpy as np
    if STUB:
        lives = [b'IMPRESSA' not in p for p in photos]
        mov = [0.0 if b'PARADA' in v else 5.0 for v in videos]
        emb = np.mean([stub_embedding(p) for p in photos], axis=0)
        return {'live': all(lives), 'movement': max(mov) >= MOVE_MIN, 'embedding': emb.tolist(), 'faces': len(photos)}
    lives = []
    embs = []
    for raw in photos:
        img = decode_image(base64.b64encode(raw).decode())
        live, _ = liveness(img)
        lives.append(live)
        e, _ = embed(img)
        if e:
            embs.append(np.array(e, dtype=np.float32))
    movs = [movement_of(v) for v in videos]
    media = None
    if embs:
        m = np.mean(embs, axis=0)
        media = (m / (np.linalg.norm(m) or 1.0)).tolist()
    return {'live': len(lives) == 2 and all(lives), 'movement': max(movs) >= MOVE_MIN, 'embedding': media, 'faces': len(embs)}


class Handler(BaseHTTPRequestHandler):
    server_version = 'realys-biometria/0.1'

    def log_message(self, fmt, *args):  # log mais curto, no journal do systemd
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
        if n > 15 * 1024 * 1024:
            raise ValueError('imagem grande demais')
        return json.loads(self.rfile.read(n) or b'{}')

    def do_GET(self):
        if self.path.rstrip('/') == '/health':
            return self.send_json(200, {'ok': True, 'model': 'stub' if STUB else os.path.basename(MODEL_EMBED), 'device': DEVICE})
        self.send_json(404, {'error': 'não encontrado'})

    def do_POST(self):
        try:
            body = self.read_json()
            if self.path.rstrip('/') == '/scan':
                pass
            else:
                img = decode_image(body['image'])
            if self.path.rstrip('/') == '/embed':
                if STUB:
                    return self.send_json(200, {'embedding': stub_embedding(img), 'faces': 1})
                vec, n = embed(img)
                return self.send_json(200, {'embedding': vec, 'faces': n})
            if self.path.rstrip('/') == '/scan':
                videos = [base64.b64decode(v) for v in body.get('videos', [])]
                photos = [base64.b64decode(p) for p in body.get('photos', [])]
                if len(videos) != 2 or len(photos) != 2:
                    return self.send_json(400, {'error': 'o scan precisa de 2 vídeos e 2 fotos'})
                return self.send_json(200, scan(videos, photos))
            if self.path.rstrip('/') == '/doc-quality':
                return self.send_json(200, doc_quality(img))
            if self.path.rstrip('/') == '/liveness':
                if STUB:
                    impressa = b'FOTO-IMPRESSA' in img
                    return self.send_json(200, {'live': not impressa, 'score': 0.1 if impressa else 0.9})
                live, score = liveness(img)
                return self.send_json(200, {'live': live, 'score': score})
            self.send_json(404, {'error': 'não encontrado'})
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            self.send_json(400, {'error': str(e)})
        except Exception as e:  # erro do modelo: o servidor Node manda para revisão humana
            self.send_json(500, {'error': 'falha no modelo: ' + type(e).__name__})


if __name__ == '__main__':
    load_models()
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serviço biométrico no ar em 127.0.0.1:{PORT} (dispositivo: {DEVICE})', flush=True)
    srv.serve_forever()
